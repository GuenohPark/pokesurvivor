'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{buildBody}=require('./bundle-common.cjs');const root=path.resolve(__dirname,'..'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const header=`// ==UserScript==
// @name PokéSurvivor 한국어 패치 · 통합
// @namespace https://github.com/GuenohPark/pokesurvivor/unified
// @version ${pkg.version}
// @description PC·Android Firefox·iPhone Safari의 Tampermonkey용 공통 패치. DOM 번역·검색·폰트·잠정 추천 배지, Canvas는 페이지 실행 영역에 따라 제한.
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @noframes
// @run-at document-start
// @grant none
// @sandbox raw
// @homepageURL https://guenohpark.github.io/pokesurvivor/
// @supportURL https://github.com/GuenohPark/pokesurvivor/issues
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor.user.js
// @license PolyForm-Noncommercial-1.0.0
// ==/UserScript==
`;
const notice='// Source/translation data: Copyright2026 JPTER78, PolyForm Noncommercial1.0.0.\n// Official names: PokeAPI BSD-3-Clause. Font: Galmuri SIL OFL1.1. Full notices in LICENSE/docs/THIRD-PARTY-NOTICES.md and included font source.\n';const code=header+notice+buildBody({channel:'unified-tampermonkey',canvas:true});new Function(code);fs.writeFileSync(path.join(root,'dist/pokesurvivor.user.js'),code);fs.writeFileSync(path.join(root,'dist/pokesurvivor.meta.js'),header);
function walk(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const inputs=['package.json',...['src','data','assets','scripts','licenses','tests/fixtures'].flatMap(walk)].filter(f=>/\.(?:js|cjs|json|md|txt)$/.test(f));const bundles=['dist/pokesurvivor.user.js','dist/pokesurvivor.meta.js','dist/pokesurvivor-ko-menu.user.js','dist/pokesurvivor-ko-browser.user.js'];const manifest={version:pkg.version,browserVersion:pkg.browserScriptVersion,chromeVersion:pkg.chromeExtensionVersion,inputs:Object.fromEntries(inputs.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))])),bundles:Object.fromEntries(bundles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))])),permissions:'@grant none; no runtime download, no remote JS, no account/storage/cookie APIs',canvas:'Hook registration in current realm only, actual page-world installation is not proven by the marker.'};fs.writeFileSync(path.join(root,'dist/pokesurvivor-build.json'),JSON.stringify(manifest,null,2)+'\n');console.log({unifiedVersion:pkg.version,bytes:Buffer.byteLength(code),inputs:inputs.length});
