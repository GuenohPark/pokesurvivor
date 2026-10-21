'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'dist/pokesurvivor-ko-browser.user.js'),'utf8');
const meta=fs.readFileSync(path.join(root,'dist/pokesurvivor-ko-browser.meta.js'),'utf8');
let assertions=0;function check(value,msg){assert(value,msg);assertions++;}
new Function(script);check(script.startsWith(meta),'Metadata matches full script');
for(const flag of ['@grant none','@sandbox raw','@inject-into page','@run-at document-start'])check(meta.includes(flag),flag);
check(!meta.includes('@match https://accounts.google.com'),'Never inject into Google login');
check(!meta.includes('firebaseapp.com'),'Never inject into Firebase auth helpers');
check(script.includes('api.installCanvas()'),'Canvas entry enabled');
check(!/signInWith(Popup|Redirect|Credential)|getRedirectResult|setUserAgentString/.test(script),'Do not replace authentication or spoof UA');
for(const href of ['https://pokesurvivor.org/','https://www.pokesurvivor.org/play/','https://accounts.google.com/','https://example.firebaseapp.com/__/auth/handler','http://pokesurvivor.com/','https://pokesurvivor.com.evil.example/','https://pokesurvivor.com:444/','https://user:pass@pokesurvivor.com/']){
 vm.runInNewContext(script,{URL,location:{href},window:(()=>{const w={};w.top=w;w.self=w;return w;})()},{timeout:1000});check(true,'Untrusted origin rejected without touching DOM');
}
let observed=false;vm.runInNewContext(script,{URL,location:{href:'https://pokesurvivor.com/'},document:{documentElement:null},MutationObserver:class{observe(target,opts){observed=opts.childList===true;}}},{timeout:1000});check(observed,'Wait safely for HTML root at document-start');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const locale=JSON.parse(fs.readFileSync(path.join(root,'data/dictionary.ko.json')));
const names=JSON.parse(fs.readFileSync(path.join(root,'data/official-names.ko.json')));
const calls=[];class CanvasRenderingContext2D{fillText(s){calls.push(s);}strokeText(s){calls.push(s);}measureText(s){calls.push(s);return {width:123};}}
const ctx={CanvasRenderingContext2D,document:{documentElement:{dataset:{}}},confirm:s=>s,alert:s=>s,data:{version:pkg.version,entries:locale.entries,names:names.names,types:names.types}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'src/runtime-core.js'),'utf8')+';const api=createPokesurvivorKorean(data);api.installCanvas();',ctx);
const canvas=new CanvasRenderingContext2D();canvas.fillText('Mewtwo');canvas.strokeText('Psychic');const measured=canvas.measureText('Mewtwo');
check(calls[0]==='뮤츠','Canvas fillText translates Pokémon');check(calls[1]==='사이코키네시스','Canvas strokeText translates moves');check(calls[2]==='뮤츠'&&measured.width===123,'measureText uses same translated string and preserves metrics result');
const report={result:'passed',assertions,browserScriptVersion:pkg.browserScriptVersion,translationVersion:pkg.version,bytes:Buffer.byteLength(script),limits:['Unit tests are not Android/Firefox runtime or Google login verification.','Actual MAIN-world installation must be verified in the browser; isolated/content-world execution is insufficient.']};
fs.writeFileSync(path.join(root,'tests/reports/browser-tests.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
