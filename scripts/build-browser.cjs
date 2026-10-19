'use strict';
// Standalone page-world userscript for real browsers, not a WebView auth bypass.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).browserScriptVersion || '0.1.0';
const source = fs.readFileSync(path.join(root, 'dist/pokesurvivor-ko-menu.user.js'), 'utf8');
const end = source.indexOf('// ==/UserScript==');
if (end < 0) throw new Error('Missing source metadata');
let body = source.slice(source.indexOf('\n', end) + 1);
const needle = 'api.installDOM();document.documentElement.dataset.pskoMode="dom-only";';
if (body.split(needle).length !== 2) throw new Error('Unexpected source DOM entry');
body = body.replace(needle, 'api.installDOM();globalThis.__PSKO_PAGE=api;const canvas=api.installCanvas();document.documentElement.dataset.pskoMode=canvas.ok?"browser-page-dom-canvas":"browser-page-dom-only";globalThis.__PSKO_BROWSER_VERSION="'+version+'";');
const header = `// ==UserScript==
// @name PokéSurvivor 한국어 · Firefox 브라우저 시험판
// @namespace pokesurvivor-ko-browser
// @version ${version}
// @description 실제 브라우저 페이지에서 DOM·Canvas 한국어 번역. Firefox Android + Tampermonkey용 실기기 미검증 시험판.
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @match https://pokesurvivor.org/*
// @match https://www.pokesurvivor.org/*
// @homepageURL https://github.com/GuenohPark/pokesurvivor
// @supportURL https://github.com/GuenohPark/pokesurvivor/issues
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-browser.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-browser.user.js
// @run-at document-start
// @sandbox raw
// @inject-into page
// @grant none
// ==/UserScript==
`;
const wrapper = String.raw`
(function(){
'use strict';
const here=new URL(location.href);
if(here.protocol!=='https:' || here.username || here.password || (here.port && here.port!=='443') || !['pokesurvivor.com','www.pokesurvivor.com','pokesurvivor.org','www.pokesurvivor.org'].includes(here.hostname)) return;
if(globalThis.__PSKO_BROWSER_VERSION==='${version}') return;
function start(){
${body}
}
if(document.documentElement) start();
else {
 const wait=new MutationObserver(()=>{if(document.documentElement){wait.disconnect();start();}});
 wait.observe(document,{childList:true});
}
})();
`;
const output = header + wrapper;
new Function(output);
fs.writeFileSync(path.join(root,'dist/pokesurvivor-ko-browser.user.js'), output);
fs.writeFileSync(path.join(root,'dist/pokesurvivor-ko-browser.meta.js'), header);
console.log(JSON.stringify({version,bytes:Buffer.byteLength(output),canvasEntry:true,grant:'none',world:'page/raw'}));
