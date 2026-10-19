'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');const root=__dirname;const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const locale=JSON.parse(read('dictionary.ko.json')),names=JSON.parse(read('official-names.ko.json'));const version=JSON.parse(read('package.json')).version;
const data={version,entries:locale.entries,names:names.names,types:names.types};const factory=new Function(read('runtime-core.js')+';return createPokesurvivorKorean;')();const api=factory(data);
let placeholders=0;for(const r of data.entries){assert(r.ko&&r.es);const n=(r.ko.match(/\{x\}/g)||[]).length;for(const k of ['es','en'])if(r[k])assert.strictEqual((r[k].match(/\{x\}/g)||[]).length,n,'placeholder mismatch: '+r[k]);placeholders+=n;}
const tests=[];const check=(input,kind,expected)=>{const actual=api.translate(input,kind);assert.strictEqual(actual,expected,input+' / '+kind);tests.push({input,kind,expected,actual});};
for(const [name,ko] of Object.entries(data.names.species))check(name,'general',ko);
for(const [name,ko] of Object.entries({...data.names.moves,...data.names.gameSpecificTerms}))check(name,'move',ko);
for(const [name,ko] of Object.entries(data.names.items))check(name,'general',ko);
for(const [name,ko] of Object.entries(data.types))check(name,'type',ko);
for(const [name,kind,ko] of [['Psychic','general','에스퍼'],['Psychic','move','사이코키네시스'],['Normal','general','보통'],['Normal','form','일반'],['Normal','type','노말'],['Save','general','저장'],['Save','save-data','저장 데이터'],['Sp. Atk','general','특수공격'],['Sp. Def','general','특수방어']])check(name,kind,ko);
const descriptions=JSON.parse(read('description-tests.json'));for(const r of descriptions){const result=api.translate(r.source);assert.notStrictEqual(result,r.source,'untranslated description: '+r.id);assert(/[가-힣]/.test(result));}
const search=JSON.parse(read('search-species.json'));assert.strictEqual(search.length,966);assert.strictEqual(new Set(search.map(p=>p.dex)).size,966);assert(search.every(p=>p.en&&p.ko));
for(const file of ['pokesurvivor-ko-menu.user.js','extension-main.js','extension-background.js','extension-content.js'])new Function(read(file));
const meta=read('pokesurvivor-ko-menu.meta.js');assert(meta.includes('@version '+version));assert(meta.includes('@match https://pokesurvivor.org/*'));assert(meta.includes('@match https://pokesurvivor.com/*'));assert(meta.includes('@inject-into content'));
const report={version,translationEntries:data.entries.length,placeholderCount:placeholders,emptyTranslations:0,nameAndContextAssertions:tests.length,descriptions:descriptions.length,searchSpecies:search.length,syntaxFiles:4,result:'passed',limits:['Browser/phone runtime behavior is not proven by these unit tests.','Stock iPhone Userscripts does not install the Canvas hook.','Custom Safari extension needs conversion, signing and actual-device validation.']};fs.writeFileSync(path.join(root,'translation-tests.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
