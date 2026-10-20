'use strict';
// Offline only: hash-check all 16 pinned files before evaluating a minimal subset.
const fs=require('fs'),path=require('path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.join(root,'tests/fixtures/game-v2');
const COMMIT='018e986f4c12f414dfa84193ee35b2959b1e325c';
function validateSources(dir=fixture){
 const source=JSON.parse(fs.readFileSync(path.join(dir,'SOURCE.json'),'utf8'));
 assert.equal(source.commit,COMMIT);assert.equal(Object.keys(source.files).length,16);
 for(const [file,hash] of Object.entries(source.files)){
  assert(/^js\/[a-z-]+\/[a-z-]+\.js$/.test(file),'Unexpected fixture path');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex'),hash,'Source hash: '+file);
 }
 return source;
}
const REQUIRED=['data/pokedex','data/types','data/upgrades','data/moves','data/sprites-meta','core/sprites','systems/stats','systems/judgment','world/tiles','world/world','entities/player'];
function createRuntime(extra=[]){
 const source=validateSources();
 // No host objects/callbacks, require, process, DOM, timers, browser or network APIs.
 const context=vm.createContext(Object.create(null),{name:'pinned-offline-tier-model',codeGeneration:{strings:false,wasm:false}});
 const run=code=>vm.runInContext(code,context,{timeout:10000});
 run('globalThis.G={U:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},Weather:{speedFor:()=>1,mult:()=>1}};');
 for(const file of [...REQUIRED,...extra]){
  assert(['systems/combat','systems/hazards'].includes(file)||REQUIRED.includes(file));
  new vm.Script(fs.readFileSync(path.join(fixture,'js',file+'.js'),'utf8'),{filename:file+'.js'}).runInContext(context,{timeout:10000});
 }
 return {context,run,source};
}
const GEOMETRY={enemyProjectileRadius:7,referencePlayerRadius:14.08,fluxModel:'uniform-straight-projectile-linear-flux-only',hoverTraversalBonus:false,areaSquaredCorrection:false,actualHpOrHitProbability:false,bossZoneRule:'zoneRadius + 0.6 * playerRadius (not projectile correction)',pureHazardCaveat:'30+ percent-maxHP pure damage bypasses generic EHP; not modeled as survivability.'};
function generate(){
 const {run,source}=createRuntime();
 const out=JSON.parse(run(`(function(){
 const perks=G.Upgrades.perks(Object.fromEntries(G.Upgrades.LIST.map(u=>[u.id,u.max])));
 const judgment=G.Judgment;const active=v=>{G.Judgment={active:v,capSpd:judgment.capSpd};};
 const liquid=(kind,types)=>{G.Tiles.BIOMES[0].liquid=kind;return G.World.liquidEffect(types);};
 const nominal=(id,lvl)=>{const m=G.Moves.instance(id,lvl),o={};for(const k of Object.keys(m)){if(!['def','t','name','desc','icon'].includes(k))o[k]=m[k];}o.evolved=false;return o;};
 const moves=Object.fromEntries(G.Moves.ALL.map(m=>[m.id,{lv1:nominal(m.id,1),lv5:nominal(m.id,5)}]));
 const species=[],results=[];
 for(const mon of G.DEX){
 active(false);const pl=new G.Player(mon,perks),pool=G.Moves.poolFor(mon);
 const has=cat=>pool.some(id=>{const m=G.Moves.BY_ID[id];return m.cat===cat&&m.dmg>0&&mon.types.includes(m.type);});
 const m={...mon,hasOwnPhysicalMove:has('physical'),hasOwnSpecialMove:has('special'),playerRadius:pl.r,playerScale:pl.scale,hoverVisual:G.Sprites.hovers(mon.dex),movePool:pool};
 m.waterSlow=liquid('water',mon.types).slow||1;m.swampSlow=liquid('swamp',mon.types).slow||1;
 for(const kind of ['lava','poison','spark'])m[kind+'Immune']=!liquid(kind,mon.types).dmg;
 species.push(m);const hp=pl.maxHp,speed=pl.spd;active(true);const speedJudgment=pl.spd;active(false);
 const phy=pl.atkFor({cat:'physical',type:mon.types[0]}),spa=pl.atkFor({cat:'special',type:mon.types[0]}),crit=1+pl.critChance*.5;
 const ehpPhysical=hp/((1-pl.reduction)*G.Stats.taken(mon,'physical')),ehpSpecial=hp/((1-pl.reduction)*G.Stats.taken(mon,'special'));
 const common=G.Moves.instance('tackle',5);
 const r={dex:mon.dex,hp,speed,speedJudgment,phy,spa,offenseIndex:Math.max(has('physical')?phy:0,has('special')?spa:0)*crit/pl.cdMul,ehpPhysical,ehpSpecial,commonMoveDps:common.dmg*pl.atkFor(common)*crit/Math.max(.05,common.cd*pl.cdMul),hitRadius:pl.r,playerScale:pl.scale,hoverVisual:m.hoverVisual,projectileCollisionWidth:2*(pl.r+7),exposureEhpPhysical:ehpPhysical*(14.08+7)/(pl.r+7),exposureEhpSpecial:ehpSpecial*(14.08+7)/(pl.r+7),mobilityRatio:speed/(pl.r+7),mobilityJudgmentRatio:speedJudgment/(pl.r+7)};
 pl.inLiquid=true;for(const kind of ['water','swamp']){liquid(kind,mon.types);active(false);r[kind+'Speed']=pl.spd;active(true);r[kind+'SpeedJudgment']=pl.spd;}results.push(r);
 }active(false);return JSON.stringify({perks,moves,species,results,commonMove:{id:'tackle',level:5,evolved:false,damage:moves.tackle.lv5.dmg,cooldown:moves.tackle.lv5.cd}});})()`));
 assert.equal(out.species.length,966);assert.equal(out.species.find(m=>m.dex===150).playerRadius,14.08);
 assert.equal(out.species.find(m=>m.dex===7).waterSlow,1);assert.equal(out.species.find(m=>m.dex===1).waterSlow,.6);assert.equal(out.species.find(m=>m.dex===1).swampSlow,.45);
 const model={version:'fullmax-hitbox-v2',sourceCommit:source.commit,sourceURL:source.url,license:'Original game data: PolyForm Noncommercial 1.0.0; see licenses/GAME-LICENSE-NONCOMMERCIAL.md',perks:out.perks,commonMove:out.commonMove,geometry:GEOMETRY,moveParametersNote:'Original Lv1/Lv5 unevolved nominal parameters only; not actual DPS.',moves:out.moves,species:out.species};
 const reference={sourceCommit:source.commit,method:'Executed SHA-256-validated original Player, Stats, Moves, Upgrades, Sprites, Judgment and World in restricted offline Node VM. Neutral weather, no items/run buffs/melee reduction/account data. Geometry is a linear-flux model only.',geometry:GEOMETRY,results:out.results};
 return {model,reference};
}
if(require.main===module){const {model,reference}=generate();for(const [file,data] of [['data/tier-model.json',model],['tests/fixtures/tier-player-reference.json',reference]])fs.writeFileSync(path.join(root,file),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({version:model.version,species:model.species.length,moves:Object.keys(model.moves).length,sourceCommit:model.sourceCommit}));}
module.exports={generate,createRuntime,validateSources,GEOMETRY};
