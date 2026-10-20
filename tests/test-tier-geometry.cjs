'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {createRuntime,GEOMETRY}=require('../scripts/import-tier-model.cjs'),{rows,data}=require('../scripts/build-tier-data.cjs');
const by=new Map(rows.map(r=>[r.dex,r]));let checks=0;
function near(a,b,msg){assert(Math.abs(a-b)<1e-9,msg+': '+a+' vs '+b);checks++;}
for(const [dex,r] of [[150,14.08],[289,14.08],[796,10.56],[25,17.6],[382,18],[383,18],[486,18],[493,18],[890,18]])near(by.get(dex).hitRadius,r,'actual player radius '+dex);
const {run}=createRuntime(['systems/combat','systems/hazards']);
const original=JSON.parse(run(`(function(){
 let checks=0;const ok=(v,msg)=>{if(!v)throw Error(msg);checks++;};
 G.U.dist2=(x,y,a,b)=>(x-a)**2+(y-b)**2;
 const noop=()=>{};G.FX={burst:noop,ring:noop,beam:noop,dmgText:noop};
 G.Audio={sfx:noop};G.Camera={sees:()=>false,kick:noop};G.Pad={rumble:noop};G.Coop={isHost:false};
 G.EnemyMgr={all:()=>[],queryCircle:()=>[]};G.World.projectileBlock=()=>false;
 let shots=[];G.Projectiles={all:()=>shots,clearOrbs:noop};
 const perks=G.Upgrades.perks(Object.fromEntries(G.Upgrades.LIST.map(u=>[u.id,u.max])));
 for(const mon of G.DEX){
  const p=new G.Player(mon,perks),hurt=p.hurt;let hits=0;p.hurt=()=>hits++;
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   for(const epsilon of [-1e-6,1e-6]){
    const distance=p.r+7+epsilon;shots=[{friendly:false,x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,r:7,dmg:10,cat:'physical'}];
    hits=0;G.Combat.resolve(0,p,0);ok(hits===(epsilon<0?1:0),mon.dex+' original projectile boundary');
    ok(shots.length===(epsilon<0?0:1),mon.dex+' projectile removal');
   }
  }
  // Exact axial equality is excluded by the original strict < comparison.
  shots=[{friendly:false,x:p.r+7,y:0,r:7,dmg:10}];hits=0;G.Combat.resolve(0,p,0);ok(hits===0,'exact collision equality');
  const h={kind:'zone',x:0,y:0,r:40,delay:0,dmg:10};
  for(const epsilon of [-1e-6,0,1e-6]){
   p.x=40+p.r*.6+epsilon;p.y=0;ok(G.Hazards.inside(h,p.x,p.y,p.r)===(epsilon<0),'original zone 0.6 boundary');
   G.Game={player:p};hits=0;G.Hazards.clear();G.Hazards.add(h);G.Hazards.update(0);ok(hits===(epsilon<0?1:0),'original hazard update boundary');
  }
  // A position accepted by a full-radius correction must be outside zone's .6 radius.
  ok(!G.Hazards.inside(h,40+p.r*.8,0,p.r),'zone is not projectile correction');
  p.hurt=hurt;p.x=0;p.y=0;p.invuln=0;const hp=p.hp;
  G.Game={player:p};G.Hazards.clear();G.Hazards.add({...h,pct:.4,dmg:1,pure:true});G.Hazards.update(0);
  ok(Math.abs((hp-p.hp)-p.maxHp*.4)<1e-9,'percent maxHP pure hazard bypasses defense/reduction');
 }
 return JSON.stringify({checks,species:G.DEX.length});})()`));
checks+=original.checks;assert.equal(original.species,966);
// The pinned normal enemy firing path supplies r:7. No runtime enemy AI is needed.
const enemy=fs.readFileSync(path.join(__dirname,'fixtures/game-v2/js/entities/enemy.js'),'utf8');assert(/dmg: this\.shotDmg\(\) \* k, r: 7, life: 2\.4, friendly: false/.test(enemy));checks++;
for(const r of rows){const d=r.hitRadius+7,ref=14.08+7;near(r.projectileCollisionWidth,2*d,'linear width');near(r.exposureEhpPhysical/r.ehpPhysical,ref/d,'linear exposure physical');near(r.exposureEhpSpecial/r.ehpSpecial,ref/d,'linear exposure special');near(r.mobilityRatio,r.speed/d,'mobility');near(r.mobilityJudgmentRatio,r.speedJudgment/d,'post30 mobility');assert.equal(r.hoverTraversalBonus,false);checks++;}
const x=by.get(796);assert(Math.abs(x.exposureEhpPhysical/x.ehpPhysical-((14.08+7)/(x.hitRadius+7))**2)>.01,'reject squared-area correction');checks++;
assert.equal(GEOMETRY.areaSquaredCorrection,false);assert.equal(GEOMETRY.actualHpOrHitProbability,false);assert.equal(GEOMETRY.hoverTraversalBonus,false);assert(GEOMETRY.pureHazardCaveat.includes('bypasses generic EHP'));checks+=4;
const oldLarge=by.get(890);assert.notEqual(oldLarge.playerScale,oldLarge.hitRadius);checks++;
const hover=rows.find(r=>r.hoverVisual&&!r.types.includes('water'));assert(hover);near(hover.waterSpeed,hover.speed*.6,'visual hover does not remove water slowdown');near(hover.swampSpeed,hover.speed*.45,'visual hover does not remove swamp slowdown');
assert(data.conditions.includes('직선 투사체 플럭스'));checks++;
console.log(JSON.stringify({passed:true,checks,species:966,combat:'Original Combat.resolve and Hazards.inside/update at controlled real positions',limits:'No simulation, weighted aggregate ranking, actual hit probability, account state or DOM.'}));
