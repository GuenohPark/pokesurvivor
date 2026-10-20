'use strict';
// Offline full-permanent-upgrade model. Inputs are pinned game data, never player saves.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const model=read('data/tier-model.json'),rated=read('data/tier-ratings.json'),names=read('data/official-names.ko.json').names.species,p=model.perks;
assert.equal(model.species.length,966);assert.equal(new Set(model.species.map(x=>x.dex)).size,966);
const crit=1+p.crit*.5,guard=v=>Math.max(.78,Math.min(1.25,Math.pow(75/Math.max(5,v||75),.35))),rows=[];
const cap=s=>s<=130?s:130+(s-130)*.25;
const species={};
for(const m of model.species){const hp=m.hp+p.hp,speed=m.spd*p.spdMul,speedJudgment=speed<=130?speed:130+(speed-130)*.25,mono=m.types.length===1?1.2:1,phy=m.pa*p.atkMul*mono,spa=m.sa*p.atkMul*mono;
 const offenseIndex=Math.max(m.hasOwnPhysicalMove?phy:0,m.hasOwnSpecialMove?spa:0)*crit/p.cdMul;
 const ehpPhysical=hp/((1-p.dmgReduce)*guard(m.df)),ehpSpecial=hp/((1-p.dmgReduce)*guard(m.sd));
 const normalPhysical=m.pa*p.atkMul*(m.types.length===1&&m.types[0]==='normal'?1.2:1);
 const commonMoveDps=model.commonMove.damage*normalPhysical*crit/Math.max(.05,model.commonMove.cooldown*p.cdMul);
 assert([hp,speed,speedJudgment,offenseIndex,ehpPhysical,ehpSpecial,commonMoveDps].every(Number.isFinite));assert(names[m.name],'Missing Korean species name: '+m.name);
 const hitRadius=m.playerRadius,den=hitRadius+model.geometry.enemyProjectileRadius,refDen=model.geometry.referencePlayerRadius+model.geometry.enemyProjectileRadius;
 const geometry={hitRadius,playerScale:m.playerScale,hoverVisual:m.hoverVisual,hoverTraversalBonus:false,projectileCollisionWidth:2*den,exposureEhpPhysical:ehpPhysical*refDen/den,exposureEhpSpecial:ehpSpecial*refDen/den,mobilityRatio:speed/den,mobilityJudgmentRatio:speedJudgment/den,waterSpeed:speed*m.waterSlow,swampSpeed:speed*m.swampSlow,waterSpeedJudgment:cap(speed*m.waterSlow),swampSpeedJudgment:cap(speed*m.swampSlow),waterSlow:m.waterSlow,swampSlow:m.swampSlow,lavaImmune:m.lavaImmune,poisonImmune:m.poisonImmune,sparkImmune:m.sparkImmune};
 species[m.dex]={ko:names[m.name],hp,speed,speedJudgment,offenseIndex,ehpPhysical,ehpSpecial,...geometry};rows.push({...geometry,dex:m.dex,name:m.name,ko:names[m.name],types:m.types,hp,speed,speedJudgment,phy,spa,offenseIndex,ehpPhysical,ehpSpecial,commonMoveDps,hasOwnPhysicalMove:m.hasOwnPhysicalMove,hasOwnSpecialMove:m.hasOwnSpecialMove});
}
const conditions='모든 영구 강화 최대치 기준의 소스 잠재력 평가입니다. 실제 계정 강화·코인·저장 데이터는 읽거나 변경하지 않습니다. 아이템·런 성장·일시 버프 없음, 중립 날씨·상성·마른 지형을 가정했습니다. 표준화 공격계수는 학습 가능한 자기 타입 공격을 동일 기본위력·주기로 비교하고 치명타 기대값과 쿨다운을 반영한 값이며, 기술 범위·관통·명중률을 포함한 실제 DPS가 아닙니다. 중립 유효체력은 아이템·버프·근접기 활성 감소 없이 계산합니다. hitRadius는 실제 플레이어 충돌 반경이며 시각 배율과 다릅니다. exposureEhpPhysical/Special은 반경 7의 일반 적 탄환에 대한 균일 직선 투사체 플럭스의 선형 폭 보정 모델일 뿐 실제 HP·피격확률이 아닙니다(기준 반경 14.08, 면적 제곱 보정 아님). mobilityRatio도 속도/(반경+7) 모델입니다. 보스 원형 장판은 장판 반경+0.6×플레이어 반경으로 충돌하므로 같은 보정을 적용하지 않습니다. 30분 이후 최대 HP 비례 순수 피해는 일반 EHP를 우회합니다. 부유 표시는 시각 정보일 뿐 플레이어 비행·지형 통과·감속 면제 보너스는 없습니다. 물/늪 감속을 먼저 적용한 뒤 30분 이후 속도 상한을 적용합니다. 랭킹의 강화 상태는 알 수 없어 참고로만 사용했습니다. 전체 전투 시뮬레이션이나 승률 검증은 하지 않았으며, 미평가는 하위 등급을 뜻하지 않습니다.';
const data={version:model.version,sourceCommit:model.sourceCommit,conditions,geometry:model.geometry,ratings:rated.ratings,species};

const cols=['도감번호','한국어명','원본명','타입','풀강화시작HP','평상시속도_중립날씨','30분이후속도_중립날씨','자기타입물리공격배율_학습가능여부별도','자기타입특수공격배율_학습가능여부별도','동일기본위력주기_자기타입화력계수_치명기대포함_DPS아님','물리유효체력_중립상성_종별방어반영','특수유효체력_중립상성_종별방어반영','공통Lv5미진화몸통박치기_상시명중가정_이론단일적DPS','자기타입물리기술학습가능','자기타입특수기술학습가능','잠정평가'];
const n=v=>+v.toFixed(4),quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const geometryCols=['hitRadius','playerScale','hoverVisual','hoverTraversalBonus','projectileCollisionWidth','exposureEhpPhysical','exposureEhpSpecial','mobilityRatio','mobilityJudgmentRatio','waterSpeed','swampSpeed','waterSpeedJudgment','swampSpeedJudgment','waterSlow','swampSlow','lavaImmune','poisonImmune','sparkImmune'];
cols.push(...geometryCols.map(k=>['exposureEhpPhysical','exposureEhpSpecial','mobilityRatio','mobilityJudgmentRatio'].includes(k)?k+'_uniformStraightProjectileFlux_MODEL_ONLY_notActualHP_hitProbability':k));
const csv=[cols,...rows.map(r=>[r.dex,r.ko,r.name,r.types.join('/'),r.hp,n(r.speed),n(r.speedJudgment),n(r.phy),n(r.spa),n(r.offenseIndex),n(r.ehpPhysical),n(r.ehpSpecial),n(r.commonMoveDps),r.hasOwnPhysicalMove,r.hasOwnSpecialMove,rated.ratings[r.dex]?.label||'미평가',...geometryCols.map(k=>typeof r[k]==='number'?n(r[k]):r[k])])].map(r=>r.map(quote).join(',')).join('\r\n');
if(require.main===module){fs.writeFileSync(path.join(root,'data/tier-ui.json'),JSON.stringify(data)+'\n');fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/pokesurvivor-full-upgrade-stats.csv'),'\uFEFF'+csv+'\r\n');}
if(require.main===module)console.log(JSON.stringify({version:data.version,species:rows.length,assessed:Object.keys(rated.ratings).length,sourceCommit:data.sourceCommit}));
module.exports={data,rows,csv:'\uFEFF'+csv+'\r\n'};
