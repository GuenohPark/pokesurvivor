'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');const json=n=>JSON.parse(read(n));const write=(n,s)=>{const file=path.join(root,n);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,s);};
const version=json('package.json').version;const locale=json('data/dictionary.ko.json');const names=json('data/official-names.ko.json');
const data={version,capturedAt:'2026-10-19',entries:locale.entries,names:names.names,types:names.types};
const factory=read('src/runtime-core.js');const notice='// Translation data: PokéSurvivor by JPTER78, PolyForm Noncommercial 1.0.0.\n// Official-name data: PokéAPI contributors, BSD-3-Clause.\n/*\n'+read('licenses/GAME-LICENSE-NONCOMMERCIAL.md').replace(/\*\//g,'* /')+'\n'+read('licenses/PokeAPI-LICENSE.md').replace(/\*\//g,'* /')+'\n*/\n';
const header=`// ==UserScript==
// @name PokéSurvivor 한국어 메뉴 시험판
// @namespace pokesurvivor-ko-local-test
// @version ${version}
// @description 포켓몬·기술·아이템·능력치·설명·UI 한국어 번역. Userscripts는 DOM 전용, Canvas는 별도 확장 필요.
// @match https://pokesurvivor.org/*
// @match https://www.pokesurvivor.org/*
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @homepageURL https://github.com/GuenohPark/pokesurvivor
// @supportURL https://github.com/GuenohPark/pokesurvivor/issues
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-menu.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-menu.user.js
// @run-at document-end
// @inject-into content
// @grant none
// ==/UserScript==
`;
const serialized=JSON.stringify(data);
const search=read('src/search-korean.js').replace('SEARCH_SPECIES',JSON.stringify(json('data/search-species.json')));
const main=header+notice+read('assets/font-install.js')+'\n(function(){\n'+factory+'\nconst DATA='+serialized+';\nconst api=createPokesurvivorKorean(DATA);globalThis.__PSKO=api;api.installDOM();document.documentElement.dataset.pskoMode="dom-only";\n})();\n'+read('src/tips-ui.js')+'\n'+search;
const page=notice+'(function(){\n'+factory+'\nconst api=createPokesurvivorKorean('+serialized+');globalThis.__PSKO_PAGE=api;api.installCanvas();\n})();\n';
const background=notice+String.raw`'use strict';
const ext=globalThis.browser||globalThis.chrome;
const DATA=${serialized};
const installNative=function(data){
${factory}
const api=createPokesurvivorKorean(data);globalThis.__PSKO_PAGE=api;return api.installCanvas();
};
ext.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message?.type!=='PSKO_INSTALL_MAIN'||!sender.tab?.id||!/^https:\/\/(www\.)?pokesurvivor\.(com|org)\//i.test(sender.url||''))return false;
 ext.scripting.executeScript({target:{tabId:sender.tab.id,frameIds:[sender.frameId||0]},world:'MAIN',func:installNative,args:[DATA]})
 .then(result=>respond({ok:!!result?.[0]?.result?.ok})).catch(error=>respond({ok:false,error:String(error.message||error)}));
 return true;
});
`;
for(const [name,code] of [['dist/pokesurvivor-ko-menu.user.js',main],['extension/extension-main.js',page],['extension/extension-background.js',background]]){new Function(code);write(name,code);}
write('dist/pokesurvivor-ko-menu.meta.js',header);
const manifest=json('extension/manifest.json');manifest.version=version;write('extension/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Built v${version}: ${data.entries.length} translation entries, ${json('data/search-species.json').length} species; Userscript ${Buffer.byteLength(main)} bytes.`);

// Stable bootstrap: checks bundle metadata itself, independent of manager update UI.
const loaderVersion=json('package.json').autoLoaderVersion||'0.1.0';
const loaderHeader=`// ==UserScript==
// @name PokéSurvivor 한국어 자동 업데이트
// @namespace pokesurvivor-ko-auto
// @version ${loaderVersion}
// @description 접속 시 GitHub 버전 확인, 새 번역팩만 다운로드, 오프라인 캐시와 플레이 중 교체 방지.
// @match https://pokesurvivor.org/*
// @match https://www.pokesurvivor.org/*
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @homepageURL https://github.com/GuenohPark/pokesurvivor
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-auto.user.js
// @run-at document-end
// @inject-into content
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.xmlHttpRequest
// @connect raw.githubusercontent.com
// ==/UserScript==
`;
const loader=loaderHeader+'\n'+read('src/auto-loader-core.js')+'\n'+read('src/auto-loader-entry.js');new Function(loader);write('dist/pokesurvivor-ko-auto.user.js',loader);write('dist/pokesurvivor-ko-auto.meta.js',loaderHeader);
console.log(`Built automatic loader v${loaderVersion}: ${Buffer.byteLength(loader)} bytes.`);

// Keep installed v0.1.0 loaders and userscript managers on root URLs working.
for(const file of ['pokesurvivor-ko-auto.user.js','pokesurvivor-ko-auto.meta.js','pokesurvivor-ko-menu.user.js','pokesurvivor-ko-menu.meta.js'])write(file,read('dist/'+file));
// The unpacked extension must not depend on files outside its directory.
write('extension/pokesurvivor-ko-menu.user.js',main);
for(const file of ['GAME-LICENSE-NONCOMMERCIAL.md','Galmuri-LICENSE.txt','PokeAPI-LICENSE.md'])write('extension/licenses/'+file,read('licenses/'+file));
require('./package-extension.cjs').packageExtension();
