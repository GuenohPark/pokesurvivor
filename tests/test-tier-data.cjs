'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),{data,rows,csv}=require('../scripts/build-tier-data.cjs');
const {generate,createRuntime}=require('../scripts/import-tier-model.cjs');
const ref=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/tier-player-reference.json'))),model=JSON.parse(fs.readFileSync(path.join(root,'data/tier-model.json')));
let checks=0;function eq(a,b,msg){assert.deepEqual(a,b,msg);checks++;}function near(a,b,msg){assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-9,msg+': '+a+' vs '+b);checks++;}
const original=generate(); // Re-execute all 966 original Players, not two copied formulas.
eq(model,original.model,'model reproducible from hash-validated originals');eq(ref,original.reference,'reference reproducible from original runtime');
eq(generate(),original,'deterministic importer');
eq(data.version,'fullmax-hitbox-v2','model version');eq(data.sourceCommit,ref.sourceCommit,'source commit');eq(rows.length,966,'species count');eq(Object.keys(data.ratings).length,14,'only assessed candidates');
for(const [k,v]of Object.entries({hp:80,atkMul:1.4,spdMul:1.24,cdMul:.76,dmgReduce:.16,regen:1,crit:.3,startMoves:2}))eq(model.perks[k],v,'max '+k);
const refs=new Map(original.reference.results.map(r=>[r.dex,r]));
for(const r of rows){const o=refs.get(r.dex);assert(o);checks++;
 for(const key of ['hp','speed','speedJudgment','phy','spa','offenseIndex','ehpPhysical','ehpSpecial','commonMoveDps','hitRadius','playerScale','projectileCollisionWidth','exposureEhpPhysical','exposureEhpSpecial','mobilityRatio','mobilityJudgmentRatio','waterSpeed','swampSpeed','waterSpeedJudgment','swampSpeedJudgment'])near(r[key],o[key],r.dex+' '+key);
 eq(r.hoverVisual,o.hoverVisual,'visual hover');eq(r.hoverTraversalBonus,false,'no hover traversal advantage');eq(data.species[r.dex].ko,r.ko,'Korean name');
 for(const k of ['hitRadius','projectileCollisionWidth','exposureEhpPhysical','exposureEhpSpecial','mobilityRatio','mobilityJudgmentRatio','waterSpeed','swampSpeed','waterSpeedJudgment','swampSpeedJudgment'])near(data.species[r.dex][k],r[k],'UI geometry '+k);
 const m=model.species.find(m=>m.dex===r.dex);for(const [key,cat] of [['hasOwnPhysicalMove','physical'],['hasOwnSpecialMove','special']])eq(r[key],m.movePool.some(id=>{const move=model.moves[id].lv1;return move.cat===cat&&move.dmg>0&&m.types.includes(move.type);}),r.dex+' real damage category');
}
for(const [grade,count]of [['S',3],['A+',10],['OFFENSE',1]])eq(Object.values(data.ratings).filter(x=>x.grade===grade).length,count,'declared grade coverage '+grade);
eq(Object.keys(data.ratings).filter(k=>data.ratings[k].grade==='S').map(Number).sort((a,b)=>a-b),[150,289,796],'declared S candidates');for(const dex of [382,383,486,493,890])eq(data.ratings[dex].grade,'A+','former S reassessed '+dex);
eq(data.ratings['1'],undefined,'unassessed is not fabricated low tier');eq(rows.find(r=>r.dex===807).hasOwnPhysicalMove,false,'respect real Electric move categories');near(data.species['150'].hp,198,'Mewtwo HP');near(data.species['150'].speedJudgment,138.73,'Mewtwo post30 speed');near(data.species['289'].hp,218,'Slaking HP');
eq(csv.charCodeAt(0),0xfeff,'UTF8 BOM for Windows Excel');eq(csv.trim().split('\r\n').length,967,'CSV rows including header');assert(csv.includes('MODEL_ONLY_notActualHP_hitProbability'));checks++;
for(const text of ['실제 DPS가 아닙니다','미평가는 하위 등급','0.6×플레이어','최대 HP 비례 순수 피해','승률 검증은 하지']){assert(data.conditions.includes(text),text);checks++;}
const {run}=createRuntime();eq(JSON.parse(run('JSON.stringify([typeof require,typeof process,typeof fetch,typeof document,typeof window,typeof localStorage,typeof WebSocket])')),Array(7).fill('undefined'),'runtime privacy boundary');assert.throws(()=>run('Function("return process")()'),/Code generation from strings disallowed/);checks++;
console.log(JSON.stringify({passed:true,checks,species:rows.length,assessed:14,reference:'Original game Player/Stats/Upgrades/Moves/World execution in isolated VM',limits:['Static neutral values and linear flux proxy only, not survival simulation, actual DPS or measured winrate.','No player save data or account state used.']}));
