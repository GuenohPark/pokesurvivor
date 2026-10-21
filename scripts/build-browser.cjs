'use strict';
// Retained legacy browser entry. Same payload and bootstrap as the unified distribution.
const fs=require('fs'),path=require('path'),{buildBody}=require('./bundle-common.cjs');const root=path.resolve(__dirname,'..'),pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const header=`// ==UserScript==
// @name PokéSurvivor 한국어 · Firefox 브라우저 시험판
// @namespace pokesurvivor-ko-browser
// @version ${pkg.browserScriptVersion}
// @description 기존 브라우저 설치 호환용. 공통 엔진 DOM·Canvas, 실기기 실행 영역 확인 필요.
// @match https://pokesurvivor.com/*
// @match https://www.pokesurvivor.com/*
// @homepageURL https://github.com/GuenohPark/pokesurvivor
// @supportURL https://github.com/GuenohPark/pokesurvivor/issues
// @updateURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-browser.meta.js
// @downloadURL https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor-ko-browser.user.js
// @noframes
// @run-at document-start
// @sandbox raw
// @inject-into page
// @grant none
// ==/UserScript==
`;
const output=header+buildBody({channel:'legacy-browser',canvas:true});new Function(output);fs.writeFileSync(path.join(root,'dist/pokesurvivor-ko-browser.user.js'),output);fs.writeFileSync(path.join(root,'dist/pokesurvivor-ko-browser.meta.js'),header);console.log({browserVersion:pkg.browserScriptVersion,bytes:Buffer.byteLength(output),sharedBootstrap:true});
