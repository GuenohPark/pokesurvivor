'use strict';
const fs=require('fs'),path=require('path');const root=__dirname;
const read=n=>fs.readFileSync(path.join(root,n),'utf8');const json=n=>JSON.parse(read(n));const write=(n,s)=>fs.writeFileSync(path.join(root,n),s);
const version=json('package.json').version;const locale=json('dictionary.ko.json');const names=json('official-names.ko.json');
const data={version,capturedAt:'2026-10-19',entries:locale.entries,names:names.names,types:names.types};
const factory=read('runtime-core.js');const notice='// Translation data: PokéSurvivor by JPTER78, PolyForm Noncommercial 1.0.0.\n// Official-name data: PokéAPI contributors, BSD-3-Clause.\n/*\n'+read('GAME-LICENSE-NONCOMMERCIAL.md').replace(/\*\//g,'* /')+'\n'+read('PokeAPI-LICENSE.md').replace(/\*\//g,'* /')+'\n*/\n';
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
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/pokesurvivor-ko-menu.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/pokesurvivor-ko-menu.user.js
// @run-at document-end
// @inject-into content
// @grant none
// ==/UserScript==
`;
const serialized=JSON.stringify(data);
const search=read('search-korean.js').replace('SEARCH_SPECIES',JSON.stringify(json('search-species.json')));
const main=header+notice+read('font-install.js')+'\n(function(){\n'+factory+'\nconst DATA='+serialized+';\nconst api=createPokesurvivorKorean(DATA);globalThis.__PSKO=api;api.installDOM();document.documentElement.dataset.pskoMode="dom-only";\n})();\n'+read('tips-ui.js')+'\n'+search;
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
for(const [name,code] of [['pokesurvivor-ko-menu.user.js',main],['extension-main.js',page],['extension-background.js',background]]){new Function(code);write(name,code);}
write('pokesurvivor-ko-menu.meta.js',header);
const manifest=json('manifest.json');manifest.version=version;write('manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Built v${version}: ${data.entries.length} translation entries, ${json('search-species.json').length} species; Userscript ${Buffer.byteLength(main)} bytes.`);
