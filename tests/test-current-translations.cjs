'use strict';
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const fixture=read('tests/fixtures/current-game-translations.json'),locale=read('data/dictionary.ko.json'),names=read('data/official-names.ko.json');
const create=new Function(fs.readFileSync(path.join(root,'src/runtime-core.js'),'utf8')+';return createPokesurvivorKorean;')();
const api=create({version:read('package.json').version,entries:locale.entries,...names});
assert.equal(new Set(locale.entries.map(e=>e.id)).size,locale.entries.length,'unique entry IDs');
for(const e of locale.entries){assert(e.id!=null);if(e.argKinds){assert.equal(e.argKinds.length,(e.es.match(/\{x\}/g)||[]).length);assert(e.argKinds.every(k=>['general','move','type','form','save-data'].includes(k)));}}
let checks=0;const changed=(s,kind='general')=>{assert.equal(typeof s,'string');const result=api.translate(s,kind);assert.notEqual(result,s,'untranslated: '+s);assert(/[가-힣]/.test(result)||result==='PC','no Korean: '+s);checks++;return result;};
for(const[es,en]of Object.entries(fixture.english))for(const s of [es,en])if(s!=='Google')changed(s);
assert.equal(api.translate('Google'),'Google','brand remains literal');
// Text-only wording change: preserve native locale keys and the original action.
const quitEntry=locale.entries.find(e=>e.id===383);
assert.deepEqual([quitEntry.es,quitEntry.en,quitEntry.ko],['Abandonar run','Quit run','도망치다']);
for(const text of ['Abandonar run','Quit run','도망치다']){assert.equal(api.translate(text),'도망치다');checks++;}
for(const move of fixture.moves){for(const s of [move.name,move.english])changed(s,'move');changed(move.desc);for(const s of move.upgrades)changed(s);if(move.evolution){changed(move.evolution.name,'move');changed(fixture.english[move.evolution.name],'move');changed(move.evolution.text);}}
for(const item of fixture.items){changed(item.name);changed(item.desc);}
for(const[input,expected]of [['Hyper Beam','파괴광선'],['Energy Ball','에너지볼'],['Night Slash','깜짝베기'],['Voltio Cruel','와일드볼트'],['Volt Tackle','볼트태클'],['Swarm','벌레의알림'],['Psychic + Hyper Beam','사이코키네시스 + 파괴광선']]){assert.equal(api.translate(input,'move'),expected);checks++;}
for(const[input,expected]of [['Choose: Psychic','선택: 사이코키네시스'],['Elegir: Psíquico','선택: 사이코키네시스'],['Mewtwo will start with Psychic','뮤츠의 시작 기술: 사이코키네시스'],['Mewtwo empezará con Psíquico','뮤츠의 시작 기술: 사이코키네시스'],['Single type: +20% damage with its Normal-type moves','단일 타입: 노말타입 기술의 피해량 +20%'],['Monotipo: +20 % de daño con sus ataques de tipo Psíquico','단일 타입: 에스퍼타입 기술의 피해량 +20%'],['Type','타입'],['Mewtwo (compañero) · 90 niveles','뮤츠 (파트너) · 강화 90단계'],['Zapdos · 70 niveles','썬더 · 강화 70단계'],['뮤츠 (파트너) · 90 niveles','뮤츠 (파트너) · 강화 90단계']]){assert.equal(api.translate(input),expected);checks++;}
// Runtime text-node context: move keybinding option must not become a type name.
const option={tagName:'OPTION',closest:q=>q.includes('#upg-list .bind-slot option')?option:null,matches:()=>false};
const node={nodeType:3,parentElement:option,nodeValue:'Psychic'};api.walk(node);assert.equal(node.nodeValue,'사이코키네시스');checks++;
const title='PokéSurvivor – Free online Pokémon survival game (Survivor.io style)';assert.equal(api.translate(api.translate(title)),api.translate(title));checks++;
assert.equal(fixture.moves.length,103);assert.equal(fixture.moves.filter(m=>m.evolution).length,97);
const report={passed:true,checks,sourceCommit:fixture.source.commit,englishPairs:Object.keys(fixture.english).length,baseMoves:103,evolvedLabels:97,moveAndItemDescriptions:114,upgradeStages:412,knownOriginalLocaleIdentityConflicts:1,scope:'Saved current source catalogue and dictionary, not a promise that every dynamically constructed game string or Safari Canvas is translated.'};
fs.writeFileSync(path.join(root,'tests/reports/current-translations.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
