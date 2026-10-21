'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path');const root=path.resolve(__dirname,'..');const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const locale=JSON.parse(read('data/dictionary.ko.json')),names=JSON.parse(read('data/official-names.ko.json'));const version=JSON.parse(read('package.json')).version;
const data={version,entries:locale.entries,names:names.names,types:names.types};const factory=new Function(read('src/runtime-core.js')+';return createPokesurvivorKorean;')();const api=factory(data);
let placeholders=0;for(const r of data.entries){assert(r.ko&&r.es);const n=(r.ko.match(/\{x\}/g)||[]).length;for(const k of ['es','en'])if(r[k])assert.strictEqual((r[k].match(/\{x\}/g)||[]).length,n,'placeholder mismatch: '+r[k]);placeholders+=n;}
const tests=[];const check=(input,kind,expected)=>{const actual=api.translate(input,kind);assert.strictEqual(actual,expected,input+' / '+kind);tests.push({input,kind,expected,actual});};
for(const [name,ko] of Object.entries(data.names.species))check(name,'general',ko);
for(const [name,ko] of Object.entries({...data.names.moves,...data.names.gameSpecificTerms}))check(name,'move',ko);
for(const [name,ko] of Object.entries(data.names.items))check(name,'general',ko);
for(const [name,ko] of Object.entries(data.types))check(name,'type',ko);
for(const [name,kind,ko] of [['Psychic','general','에스퍼'],['Psychic','move','사이코키네시스'],['Normal','general','보통'],['Normal','form','일반'],['Normal','type','노말'],['Save','general','저장'],['Save','save-data','저장 데이터'],['Sp. Atk','general','특수공격'],['Sp. Def','general','특수방어']])check(name,kind,ko);
const descriptions=JSON.parse(read('tests/fixtures/description-tests.json'));for(const r of descriptions){const result=api.translate(r.source);assert.notStrictEqual(result,r.source,'untranslated description: '+r.id);assert(/[가-힣]/.test(result));}
const search=JSON.parse(read('data/search-species.json'));assert.strictEqual(search.length,966);assert.strictEqual(new Set(search.map(p=>p.dex)).size,966);assert(search.every(p=>p.en&&p.ko));
for(const file of ['dist/pokesurvivor-ko-menu.user.js','extension/extension-main.js','extension/extension-background.js','extension/extension-content.js','dist/pokesurvivor-ko-auto.user.js'])new Function(read(file));
const meta=read('dist/pokesurvivor-ko-menu.meta.js');assert(meta.includes('@version '+version));assert(!meta.includes('pokesurvivor.org'));assert(meta.includes('@noframes'));assert(meta.includes('@match https://pokesurvivor.com/*'));assert(meta.includes('@inject-into content'));

// Relocation invariants: legacy URLs, dist metadata, and a self-contained extension.
let layoutAssertions=0;const layout=(condition,message)=>{assert(condition,message);layoutAssertions++;};
const pkg=JSON.parse(read('package.json'));
for(const stem of ['pokesurvivor-ko-auto','pokesurvivor-ko-menu']){
 const expectedVersion=stem.endsWith('-auto')?pkg.autoLoaderVersion:version;
 for(const suffix of ['user.js','meta.js']){
  const file=stem+'.'+suffix,code=read('dist/'+file);
  layout(read(file)===code,'legacy root alias must be a full copy: '+file);
  layout(code.includes('@version '+expectedVersion+'\n'),'metadata version: '+file);
  for(const [field,ext]of [['updateURL','meta.js'],['downloadURL','user.js']])layout(code.includes('@'+field+' https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/'+stem+'.'+ext),'dist metadata URL: '+file);
 }
}
layout(read('src/auto-loader-entry.js').includes("const BASE='https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/';"),'automatic loader bundle base must target dist');
layout(read('extension/pokesurvivor-ko-menu.user.js')===read('dist/pokesurvivor-ko-menu.user.js'),'extension must contain a full local patch');
const manifest=JSON.parse(read('extension/manifest.json'));
layout(manifest.version===version,'extension version');
const extensionScripts=[manifest.background.service_worker,...manifest.content_scripts.flatMap(r=>r.js)];
for(const file of extensionScripts){layout(!file.includes('/')&&!file.includes('..'),'extension scripts must use sibling names');layout(fs.existsSync(path.join(root,'extension',file)),'extension resource exists: '+file);}
layout(!read('extension/extension-content.js').includes('../dist'),'extension content script must not use external dist');
for(const file of ['GAME-LICENSE-NONCOMMERCIAL.md','Galmuri-LICENSE.txt','PokeAPI-LICENSE.md'])layout(read('extension/licenses/'+file)===read('licenses/'+file),'extension license copy: '+file);
layout(read('extension/LICENSE')===require('../scripts/package-extension.cjs').extensionLicense(read('LICENSE')),'extension license');
const expectedRootFiles=['.gitignore','LICENSE','README.md','package.json','pokesurvivor-ko-auto.meta.js','pokesurvivor-ko-auto.user.js','pokesurvivor-ko-menu.meta.js','pokesurvivor-ko-menu.user.js'].sort();
layout(JSON.stringify(fs.readdirSync(root).filter(f=>fs.statSync(path.join(root,f)).isFile()).sort())===JSON.stringify(expectedRootFiles),'no other flat source files');

const report={version,translationEntries:data.entries.length,placeholderCount:placeholders,emptyTranslations:0,nameAndContextAssertions:tests.length,descriptions:descriptions.length,searchSpecies:search.length,syntaxFiles:5,layoutAssertions,result:'passed',limits:['Browser/phone runtime behavior is not proven by these unit tests.','Stock iPhone Userscripts does not install the Canvas hook.','Custom Safari extension needs conversion, signing and actual-device validation.']};fs.writeFileSync(path.join(root,'tests/reports/translation-tests.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
