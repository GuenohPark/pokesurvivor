'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm'),crypto=require('crypto');
const source=fs.readFileSync(path.join(__dirname,'../assets/font-install.js'),'utf8');
const script=new vm.Script(source,{filename:'font-install.js'});
const styleId='ps-ko-pixel-font';
const koreanRange='U+1100-11FF,U+3130-318F,U+A960-A97F,U+AC00-D7AF,U+D7B0-D7FF';
// SHA-256 of decoded WOFF2 bytes from the original flat release/font-install.js.
// Keep the baseline portable: no dependency on an external checkout or network.
const originalFontHashes=[
 'f467d1b10e6b88dfa8399c9f93b38c7643e050abfe4fc15800ac0b000f5a57d6',
 '8643094f395aa2dbad6bc4385cc043314801eaec2e759d549435ec8ac4f2d078'
];
function fontHashes(text){
 return [...text.matchAll(/url\(data:font\/woff2;base64,([^)]*)\)/g)].map(m=>
  crypto.createHash('sha256').update(Buffer.from(m[1],'base64')).digest('hex'));
}
function fixture({coarse=false,mode='modern',existing=false}={}){
 const styles=[],created=[],medias=[];let adds=0,removes=0;
 const host={appendChild(style){assert(!styles.includes(style));styles.push(style);}};
 if(existing)styles.push({id:styleId,textContent:'/* Previous installation without size-adjust. */',dataset:{}});
 const document={head:host,documentElement:host,
  getElementById(id){return styles.find(s=>s.id===id)||null;},
  createElement(tag){assert.strictEqual(tag,'style','no DOM wrappers');created.push(tag);return {id:'',textContent:'',dataset:{}};}};
 const context=vm.createContext({document});
 if(mode!=='absent')context.matchMedia=query=>{
  assert.strictEqual(query,'(pointer: coarse)','use primary pointer, not viewport or any-pointer');
  const listeners=new Set(),media={matches:coarse};
  const add=listener=>{assert(!listeners.has(listener));listeners.add(listener);adds++;};
  const remove=listener=>{assert(listeners.delete(listener),'remove the exact old listener');removes++;};
  if(mode==='modern'){
   media.addEventListener=(type,listener)=>{assert.strictEqual(type,'change');add(listener);};
   media.removeEventListener=(type,listener)=>{assert.strictEqual(type,'change');remove(listener);};
  }else if(mode==='legacy'){
   media.addListener=add;media.removeListener=remove;
  }
  medias.push({media,listeners});return media;
 };
 return {context,styles,created,run(){script.runInContext(context);},
  change(value){coarse=value;for(const {media,listeners}of medias){media.matches=value;for(const fn of [...listeners])fn({matches:value});}},
  stats(){return {adds,removes,active:medias.reduce((n,m)=>n+m.listeners.size,0)};}};
}
function check(f,scale){
 assert.strictEqual(f.styles.length,1,'reuse one style element');
 const style=f.styles[0],css=style.textContent;
 assert.strictEqual(style.id,styleId);
 assert.strictEqual(style.dataset.pskoKoreanFontScale,String(scale));
 const faces=[...css.matchAll(/@font-face\{([^{}]*)\}/g)].map(m=>m[1]);
 assert.strictEqual(faces.length,2,'normal and bold faces');
 assert.strictEqual(css.replace(/@font-face\{[^{}]*\}/g,'').trim(),'','no global CSS override');
 assert.deepStrictEqual(faces.map(face=>face.match(/font-weight:([^;]+);/)[1]),['400 550','551 900']);
 for(const face of faces){
  assert(face.includes("font-family:'Pixelify';"));
  assert(face.includes('font-style:normal;'));
  assert(face.includes('font-display:swap;'));
  assert.deepStrictEqual([...face.matchAll(/size-adjust:([^;]+);/g)].map(m=>m[1]),[scale+'%']);
  assert.strictEqual(face.match(/unicode-range:([^;]+);/)[1],koreanRange,'preserve Korean-only ranges');
  assert(!/font-size:|transform:|zoom:/.test(face),'no layout/font-size override');
 }
 assert.deepStrictEqual(fontHashes(css),originalFontHashes,'rendered font bytes unchanged');
 return css;
}
assert.deepStrictEqual(fontHashes(source),originalFontHashes,'embedded font bytes unchanged');
let scenarios=0;
for(const mode of ['modern','legacy']){
 const f=fixture({coarse:true,mode});f.run();const mobile=check(f,90);
 f.change(false);const desktop=check(f,100);
 assert.strictEqual(mobile.replace(/size-adjust:90%;/g,''),desktop.replace(/size-adjust:100%;/g,''),'only size-adjust changes');
 f.change(true);check(f,90);f.change(false);check(f,100);
 const style=f.styles[0];
 for(let i=0;i<5;i++){f.run();check(f,100);assert.strictEqual(f.styles[0],style);assert.strictEqual(f.stats().active,1);}
 assert.deepStrictEqual(f.stats(),{adds:6,removes:5,active:1});
 assert.strictEqual(f.created.length,1);
 f.change(true);check(f,90);
 delete f.context.matchMedia;f.run();check(f,100);
 assert.deepStrictEqual(f.stats(),{adds:6,removes:6,active:0},'cleanup when matchMedia disappears');
 f.change(true);check(f,100);scenarios++;
}
for(const options of [{coarse:false},{mode:'absent'},{coarse:true,mode:'static'}]){
 const f=fixture(options);f.run();check(f,options.coarse?90:100);scenarios++;
}
const old=fixture({coarse:true,existing:true});const oldStyle=old.styles[0];old.run();check(old,90);
assert.strictEqual(old.styles[0],oldStyle,'upgrade old style in place');assert.strictEqual(old.created.length,0);
old.run();check(old,90);assert.strictEqual(old.stats().active,1);scenarios++;
// Explicitly ensure every Unicode range excludes ASCII Latin letters and digits.
for(const range of koreanRange.split(',')){
 const [start,end]=range.slice(2).split('-').map(n=>parseInt(n,16));
 for(const cp of [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'].map(c=>c.codePointAt(0)))
  assert(cp<start||cp>end,'Latin/digits must retain their original font');
}
console.log(JSON.stringify({result:'passed',scenarios,fontFaces:2,coarseScale:90,fineAndMissingMediaScale:100,modernAndLegacyMediaChanges:true,reinjectionCleanup:true,originalFontBytesPreserved:true,koreanOnly:true},null,2));
