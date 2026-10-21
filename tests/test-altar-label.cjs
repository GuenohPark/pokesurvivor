'use strict';
// Source-only, offline synthetic renderer tests. No game, accounts, saves or deployment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const fixture = path.join(__dirname, 'fixtures/altar-current');
const modulePath = path.join(__dirname, '../src/altar-label-ui.js');
const tests = [];
let U;
function test(name, fn) { tests.push({name, fn}); }
function prop(extra = {}) { return {type:'altar', kind:0, used:false, x:80, y:100, r:9, flat:false, flash:0, wiggle:0, hp:34, maxHp:34, charge:1, open:0, ...extra}; }
const keys = ['font','textAlign','textBaseline','fillStyle','strokeStyle','lineWidth','globalAlpha','globalCompositeOperation','shadowColor','shadowBlur','shadowOffsetX','shadowOffsetY'];
function canvas(options = {}) {
  const trace = [], stack = [];
  const ctx = {font:'13px sans-serif', textAlign:'left', textBaseline:'alphabetic', fillStyle:'#123456', strokeStyle:'#654321', lineWidth:7, globalAlpha:0.73, globalCompositeOperation:'source-over', shadowColor:'#111', shadowBlur:2, shadowOffsetX:3, shadowOffsetY:4};
  const state = () => Object.fromEntries(keys.map(k => [k, ctx[k]]));
  const methods = ['save','restore','beginPath','arc','ellipse','fill','stroke','drawImage','strokeText','fillText'];
  for (const method of methods) ctx[method] = function (...args) {
    assert.equal(this, ctx, method + ' receiver');
    trace.push({method, args:args.map(a => a && typeof a === 'object' ? {width:a.width,height:a.height} : a), state:state()});
    if (options.throwMethod === method) throw options.error;
    if (method === 'save') stack.push(state());
    if (method === 'restore') { assert.ok(stack.length, 'balanced restore'); Object.assign(ctx,stack.pop()); }
  };
  return {ctx, trace, stack, state};
}
function game(options = {}) {
  const forbiddenReads = [], calls = [], sprites = [];
  const G = {Tiles:{T:16, propSprite(...args) { sprites.push(args); return {width:32,height:48}; }}, Sprites:{PX:2}, FX:{twinkle() {}}, U:{rand:(a,b)=>(a+b)/2}};
  for (const key of ['DB','Game','stats','Stats','player','Player','Save','Storage','Account','User','Profile','localStorage']) Object.defineProperty(G,key,{get() { forbiddenReads.push(key); throw new Error('Forbidden G.'+key); }});
  const realm = vm.createContext({G});
  vm.runInContext(fs.readFileSync(path.join(fixture,'world.js'),'utf8'),realm,{filename:'genuine-world.js'});
  const genuine = G.World.drawProp, result = {native:true};
  G.World.drawProp = function (...args) {
    calls.push({receiver:this,args});
    if (options.error) throw options.error;
    const returned = Reflect.apply(genuine,this,args);
    return options.nativeReturn ? returned : result;
  };
  return {G,genuine,native:G.World.drawProp,result,calls,sprites,forbiddenReads};
}
function adapter(g, extra = {}) { const a = U.createAdapter({getGame:()=>g.G,isAllowed:()=>true,...extra}); a.setEnabled(true); a.refresh(); return a; }
function render(g,p=prop(),c=canvas(),...extra) { const result=g.G.World.drawProp(c.ctx,p,0.4,...extra); return {...c,result}; }
const labels = trace => trace.filter(c => ['strokeText','fillText'].includes(c.method));
const nativeTrace = trace => trace.filter(c => !['strokeText','fillText'].includes(c.method));

test('genuine world and full tiles fixture pinned hashes and license',()=>{
  const m=JSON.parse(fs.readFileSync(path.join(fixture,'SOURCE.json'),'utf8'));
  assert.equal(m.commit,'3c9641c9e782cf74afbde490f39cd60adf59e32b');
  assert.match(m.license,/PolyForm Noncommercial/); assert.match(m.licenseUrl,/polyformproject\.org\/licenses\/noncommercial\/1\.0\.0/);
  assert.match(m.licenseNotice,/Copyright 2026 JPTER78/); assert.ok(fs.existsSync(path.resolve(fixture,m.localLicense)));
  const expected={'world.js':'6be04594a131583f41d94a20848f8cc33182ec682486098de55fbde368d10d7f','tiles.js':'d0117658a3da9384c6866d84cd7e7777562d756c7762e2c09d5c63c917d35cb5'};
  for(const name of Object.keys(expected)) {
    const bytes=fs.readFileSync(path.join(fixture,name));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected[name]);
    assert.equal(m.files[name].sha256,expected[name]); assert.ok(m.files[name].url.includes(m.commit));
    // Optional independent published-source capture supplied by the parent, never network in tests.
    if(process.env.ALTAR_CURRENT_SOURCE_DIR) assert.deepEqual(bytes,fs.readFileSync(path.join(process.env.ALTAR_CURRENT_SOURCE_DIR,name)),name+' current published source');
  }
});
test('module exposes pure helpers and adapter without browser',()=>{ U=require(modulePath); for(const k of ['labelFor','paintLabel','createAdapter','allowedLocation']) assert.equal(typeof U[k],'function',k); });
test('four altar kinds and used names',()=>{ for(const [kind,name] of ['분노','질주','자석','신속함'].entries()) { assert.equal(U.labelFor(prop({kind})),name); assert.equal(U.labelFor(prop({kind,used:true})),'사용함'); } assert.equal(U.labelFor(prop({used:1})),'사용함'); });
test('malformed props and out-of-range or noninteger kinds are ignored',()=>{
  for(const p of [null,undefined,{},false,0,'altar',...[-1,4,1.1,NaN,Infinity,'0',null,undefined,true].map(kind=>prop({kind}))]) assert.equal(U.labelFor(p),'');
  for(const type of ['tree','grass','rock','chest','spring','bigchest','trap','altarx',null]) assert.equal(U.labelFor(prop({type})),'');
});
test('paintLabel exact text position width font and state restoration at multiple scales',()=>{
  for(const P of [1,2,3]) { const c=canvas(), before=c.state(), p=prop({kind:3}); assert.equal(U.paintLabel(c.ctx,p,P),true);
    assert.deepEqual(labels(c.trace).map(e=>e.method),['strokeText','fillText']);
    for(const e of labels(c.trace)) { assert.deepEqual(e.args,['신속함',p.x,p.y-2.5*P+2,15*P]); assert.match(e.state.font,new RegExp('(?:^|\\s)'+(4.5*P).toString().replace('.','\\.')+'px')); assert.match(e.state.font,/Pixelify/); assert.equal(e.state.textAlign,'center'); }
    assert.ok(c.trace.every(e=>['save','restore','strokeText','fillText'].includes(e.method)),'labels only, no shapes or mechanics'); assert.equal(c.trace[0].method,'save'); assert.equal(c.trace.at(-1).method,'restore'); assert.deepEqual(c.state(),before); assert.equal(c.stack.length,0);
  }
  const c=canvas(); assert.equal(U.paintLabel(c.ctx,prop()),true); assert.deepEqual(labels(c.trace)[0].args,['분노',80,97,30]);
});
test('used paint is dim grey and unused paint warm cream',()=>{
  function rgb(style) { const s=style.trim(); if(/^#[0-9a-f]{6}$/i.test(s)) return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)); if(/^#[0-9a-f]{3}$/i.test(s)) return [1,2,3].map(i=>parseInt(s[i]+s[i],16)); const m=s.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/); assert.ok(m,'supported color '+style); return m.slice(1,4).map(Number); }
  const a=canvas(),b=canvas(); U.paintLabel(a.ctx,prop()); U.paintLabel(b.ctx,prop({used:true}));
  const warm=rgb(labels(a.trace).find(x=>x.method==='fillText').state.fillStyle), grey=rgb(labels(b.trace).find(x=>x.method==='fillText').state.fillStyle);
  assert.ok(warm[0]>=warm[1] && warm[1]>warm[2],'warm cream'); assert.ok(Math.max(...grey)-Math.min(...grey)<35,'dim grey'); assert.ok(grey.reduce((a,b)=>a+b)<warm.reduce((a,b)=>a+b),'used is dimmer');
});
test('invalid label coordinates or scale do not touch canvas',()=>{
  for(const bad of [undefined,null,NaN,Infinity,-Infinity,'80',{},true]) for(const key of ['x','y']) { const c=canvas(); assert.equal(U.paintLabel(c.ctx,prop({[key]:bad})),false); assert.equal(c.trace.length,0); }
  for(const P of [0,-1,NaN,Infinity,null,'2',true]) { const c=canvas(); assert.equal(U.paintLabel(c.ctx,prop(),P),false); assert.equal(c.trace.length,0); }
  for(const p of [null,{},prop({type:'tree'}),prop({kind:4})]) { const c=canvas(); assert.equal(U.paintLabel(c.ctx,p),false); assert.equal(c.trace.length,0); }
});
test('nonaltars short circuit without reading other prop fields',()=>{
  const p=new Proxy({type:'tree'},{get(t,k){if(k!=='type')throw Error('Nonaltar field read '+String(k));return t[k];}}),c=canvas();
  assert.equal(U.labelFor(p),''); assert.equal(U.paintLabel(c.ctx,p),false); assert.equal(c.trace.length,0);
});
test('allowed routes are direct HTTPS com only, not auth or frames',()=>{
  for(const host of ['pokesurvivor.com','www.pokesurvivor.com']) for(const route of ['/','/index.html','/dev.html']) assert.equal(U.allowedLocation(new URL('https://'+host+route)),true);
  for(const url of ['http://pokesurvivor.com/','https://pokesurvivor.net/','https://pokesurvivor.com.evil.test/','https://pokesurvivor.com:444/','https://user:pass@pokesurvivor.com/','https://pokesurvivor.com/login','https://pokesurvivor.com/?code=synthetic','https://pokesurvivor.com/#token=synthetic','https://pokesurvivor.com/?auth=1']) assert.equal(U.allowedLocation(new URL(url)),false,url);
  assert.equal(U.allowedLocation(null),false); assert.equal(U.allowedLocation(new URL('https://pokesurvivor.com/'),{top:{},self:{}}),false);
});
test('missing realm waits without installation and later registers',()=>{
  let G; const a=U.createAdapter({getGame:()=>G,isAllowed:()=>true}); a.setEnabled(true); a.refresh(); assert.equal(a.state.status,'waiting-game'); const g=game(); G=g.G; a.refresh(); assert.equal(a.state.status,'registered-awaiting-render'); a.dispose(); assert.equal(G.World.drawProp,g.native);
});
test('registration activates only on eligible successful native altar render',()=>{
  const g=game(),a=adapter(g); assert.equal(a.state.status,'registered-awaiting-render'); render(g,prop({type:'tree'})); assert.notEqual(a.state.status,'active'); render(g,prop({kind:99})); assert.notEqual(a.state.status,'active'); const r=render(g); assert.equal(a.state.status,'active'); assert.equal(labels(r.trace).length,2); a.dispose();
});
test('genuine native altar canvas operations unchanged and label appended after sprite',()=>{
  for(const used of [false,true]) for(let kind=0;kind<4;kind++) {
    const g=game(),control=game(),a=adapter(g),p=prop({kind,used}),c=canvas(),baseline=render(control,p),actual=render(g,p,c);
    const firstText=actual.trace.findIndex(e=>e.method==='strokeText'); assert.ok(firstText>actual.trace.findIndex(e=>e.method==='drawImage'));
    const labelStart=firstText-1; assert.equal(actual.trace[labelStart].method,'save'); assert.deepEqual(actual.trace.slice(0,labelStart),baseline.trace,'native prefix byte-equivalent');
    assert.deepEqual(actual.state(),baseline.state()); assert.equal(actual.stack.length,0); assert.deepEqual(g.sprites,control.sprites); a.dispose();
  }
});
test('genuine nonaltar renderer traces remain exactly native',()=>{
  for(const type of ['tree','grass','rock','chest','spring','bigchest','trap']) { const g=game(),control=game(),a=adapter(g),p=prop({type,flat:type==='spring'||type==='trap'}); const actual=render(g,p),baseline=render(control,p); assert.deepEqual(actual.trace,baseline.trace,type); assert.deepEqual(actual.state(),baseline.state()); a.dispose(); }
});
test('original receives identical receiver arguments and returns identity exactly once',()=>{
  const g=game(),a=adapter(g),c=canvas(),p=prop(),receiver={synthetic:true},extra={extra:true};
  assert.equal(g.G.World.drawProp.call(receiver,c.ctx,p,0.9,extra,17),g.result); assert.equal(g.calls.length,1); const call=g.calls[0]; assert.equal(call.receiver,receiver); assert.deepEqual(call.args,[c.ctx,p,0.9,extra,17]); a.dispose();
});
test('native return undefined is preserved',()=>{const g=game({nativeReturn:true}),a=adapter(g); assert.equal(render(g).result,undefined); assert.equal(g.calls.length,1);a.dispose();});
test('native errors propagate identity exactly once and never paint',()=>{
  const error=new Error('native draw error'),g=game({error}),a=adapter(g),c=canvas(); assert.throws(()=>render(g,prop(),c),e=>e===error); assert.equal(g.calls.length,1); assert.equal(labels(c.trace).length,0); assert.notEqual(a.state.status,'active'); a.dispose();
});
test('genuine native canvas failure is not swallowed or retried',()=>{
  const error=new Error('native sprite failure'),g=game(),a=adapter(g),c=canvas({throwMethod:'drawImage',error}); assert.throws(()=>render(g,prop({used:true}),c),e=>e===error); assert.equal(g.calls.length,1); assert.equal(labels(c.trace).length,0); a.dispose();
});
test('own stroke/fill errors contained and canvas restored after native draw',()=>{
  for(const method of ['strokeText','fillText']) { const g=game(),control=game(),a=adapter(g),p=prop(),baseline=render(control,p),c=canvas({throwMethod:method,error:new Error('label failure')}); assert.equal(render(g,p,c).result,g.result); assert.equal(g.calls.length,1); assert.deepEqual(c.state(),baseline.state()); assert.equal(c.stack.length,0); a.dispose(); }
});
test('frozen prop and original JSON unchanged across repeated native and label renders',()=>{
  for(const used of [false,true]) { const p=Object.freeze(prop({kind:3,used})),before=JSON.stringify(p),g=game(),a=adapter(g); render(g,p);render(g,p);render(g,p);assert.equal(JSON.stringify(p),before);a.dispose(); }
});
test('adapter never reads G.DB Game player save or stats even when traps throw',()=>{
  const g=game(),a=adapter(g); render(g);render(g,prop({used:true}));a.refresh();a.setEnabled(false);a.setEnabled(true);render(g);a.dispose(); assert.deepEqual(g.forbiddenReads,[]);
});
test('inactive route never reads game on construction refresh disable or dispose',()=>{
  let reads=0;const a=U.createAdapter({getGame(){reads++;throw Error('Inactive game read');},isAllowed:()=>false});a.setEnabled(true);a.refresh();a.setEnabled(false);a.refresh();a.dispose();assert.equal(reads,0);
});
test('route suspension bypasses labels without getGame reads and can resume',()=>{
  let allowed=true,reads=0;const g=game(),control=game(),a=adapter(g,{isAllowed:()=>allowed,getGame(){reads++;return g.G;}});render(g);allowed=false;const before=reads;assert.deepEqual(render(g).trace,render(control).trace);a.refresh();assert.equal(reads,before);assert.match(a.state.status,/suspended|inactive/);allowed=true;a.refresh();assert.equal(labels(render(g).trace).length,2);a.dispose();
});
test('disable restores exact native behavior and refresh dispose are idempotent',()=>{
  const g=game(),control=game(),a=adapter(g),wrapped=g.G.World.drawProp;a.refresh();a.refresh();assert.equal(g.G.World.drawProp,wrapped);render(g);a.setEnabled(false);assert.equal(a.state.status,'disabled');assert.deepEqual(render(g).trace,render(control).trace);a.setEnabled(true);a.refresh();assert.equal(labels(render(g).trace).length,2);a.dispose();a.dispose();assert.equal(g.G.World.drawProp,g.native);a.refresh();assert.equal(g.G.World.drawProp,g.native);
});
test('third party replacement is never clobbered or wrapped by refresh or dispose',()=>{
  const g=game(),a=adapter(g);render(g);const replacement=function(){return 'third-party';};g.G.World.drawProp=replacement;a.refresh();a.setEnabled(false);a.setEnabled(true);a.refresh();a.dispose();assert.equal(g.G.World.drawProp,replacement);
});
test('new World realm detaches old wrapper before registering new renderer',()=>{
  let current=game();const old=current;const a=adapter(current,{getGame:()=>current.G});render(old);current=game();a.refresh();assert.equal(old.G.World.drawProp,old.native);assert.equal(a.state.status,'registered-awaiting-render');assert.equal(labels(render(current).trace).length,2);a.dispose();assert.equal(current.G.World.drawProp,current.native);
});
test('nonwritable accessor inherited and nonfunction renderer safely unsupported',()=>{
  for(const shape of ['readonly','accessor','inherited','nonfunction']) { const g=game();let reads=0;const w=g.G.World;
    if(shape==='readonly')Object.defineProperty(w,'drawProp',{value:g.native,writable:false});
    if(shape==='accessor')Object.defineProperty(w,'drawProp',{get(){reads++;return g.native;},configurable:true});
    if(shape==='inherited'){delete w.drawProp;Object.setPrototypeOf(w,{drawProp:g.native});}
    if(shape==='nonfunction')w.drawProp=17;
    const before=Object.getOwnPropertyDescriptor(w,'drawProp'),a=adapter(g);assert.match(a.state.status,/unsupported/);assert.equal(reads,0);assert.deepEqual(Object.getOwnPropertyDescriptor(w,'drawProp'),before);a.dispose();assert.equal(reads,0);
  }
});
test('invalid or missing Sprites.PX cannot install renderer',()=>{
  for(const P of [undefined,null,0,-1,NaN,Infinity,'2',true]){const g=game();g.G.Sprites.PX=P;const a=adapter(g);assert.equal(g.G.World.drawProp,g.native);assert.notEqual(a.state.status,'active');a.dispose();}
  for(const missing of ['World','Sprites']){const g=game();delete g.G[missing];const a=adapter(g);assert.notEqual(a.state.status,'active');if(missing!=='World')assert.equal(g.G.World.drawProp,g.native);a.dispose();}
});
test('adapter uses finite positive native sprite scale rather than fixed two',()=>{const g=game();g.G.Sprites.PX=3;const a=adapter(g),r=render(g);assert.deepEqual(labels(r.trace)[0].args,['분노',80,94.5,45]);a.dispose();});
test('captured stale wrapper after disposal delegates native once without label',()=>{const g=game(),a=adapter(g),wrapped=g.G.World.drawProp,c=canvas();a.dispose();assert.equal(wrapped(c.ctx,prop(),0.2),g.result);assert.equal(g.calls.length,1);assert.equal(labels(c.trace).length,0);});

let passed=0;const failures=[];
for(const {name,fn} of tests){try{fn();passed++;console.log('PASS '+name);}catch(error){failures.push({name,error:error.stack||String(error)});console.error('FAIL '+name+'\n'+(error.stack||error));}}
const report={passed:failures.length===0,checks:tests.length,passedCount:passed,failedCount:failures.length,scope:'Source-only offline VM with genuine pinned world.js and full tiles.js fixture, synthetic props and canvas. No browser, accounts, game/player/save/stat reads, installation or deployment.',sourceCommit:'3c9641c9e782cf74afbde490f39cd60adf59e32b',failures};
fs.mkdirSync(path.join(__dirname,'reports'),{recursive:true});fs.writeFileSync(path.join(__dirname,'reports/altar-label-tests.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Altar label: ${passed}/${tests.length} passed; ${failures.length} failed.`);if(failures.length)process.exitCode=1;
