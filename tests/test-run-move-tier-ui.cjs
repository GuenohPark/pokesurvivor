'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=path.join(__dirname,'../src/move-tier-ui.js'),source=fs.readFileSync(file,'utf8'),U=require(file);
class Text {
  constructor(value) { this.nodeType = 3; this.nodeValue = value; this.parentElement = null; }
  get textContent() { return this.nodeValue; } set textContent(value) { this.nodeValue = String(value); }
  remove() { if (this.parentElement) this.parentElement.childNodes.splice(this.parentElement.childNodes.indexOf(this), 1); this.parentElement = null; }
}
function simple(el, selector) {
  const attrs = [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
  for (const [,key,value] of attrs) if (value === undefined ? el.getAttribute(key) === null : el.getAttribute(key) !== value) return false;
  selector = selector.replace(/\[[^\]]+\]/g, '');
  const id = selector.match(/#([\w-]+)/); if (id && el.id !== id[1]) return false;
  for (const [,cls] of selector.matchAll(/\.([\w-]+)/g)) if (!el.className.split(/\s+/).includes(cls)) return false;
  const tag = selector.match(/^[\w-]+/); return !tag || el.tagName === tag[0].toLowerCase();
}
function matches(el, selector) {
  return selector.split(',').some(part => {
    const bits = part.trim().replace(/\s*>\s*/g, ' > ').split(/\s+/);
    let i = bits.length - 1, current = el;
    if (!simple(current, bits[i--])) return false;
    while (i >= 0) {
      if (bits[i] === '>') { current = current.parentElement; i--; if (!current || !simple(current, bits[i--])) return false; }
      else { current = current.parentElement; while (current && !simple(current, bits[i])) current = current.parentElement; if (!current) return false; i--; }
    }
    return true;
  });
}
class Element {
  constructor(tag) { this.tagName = tag.toLowerCase(); this.nodeType = 1; this.attrs = {}; this.childNodes = []; this.parentElement = null; this.inputValue = undefined; this.selectedIndex = -1; }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
  get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
  get value() { return this.inputValue === undefined ? this.getAttribute('value') || '' : this.inputValue; } set value(v) { this.inputValue = String(v); }
  get textContent() { return this.childNodes.map(c => c.textContent).join(''); }
  set textContent(v) { this.childNodes.forEach(c => { c.parentElement = null; }); this.childNodes = []; if (String(v)) this.appendChild(new Text(String(v))); }
  get nextElementSibling() { if (!this.parentElement) return null; const siblings = this.parentElement.children; return siblings[siblings.indexOf(this) + 1] || null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.hasOwn(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(child) { child.remove(); this.childNodes.push(child); child.parentElement = this; return child; }
  remove() { if (!this.parentElement) return; const p = this.parentElement; p.childNodes.splice(p.childNodes.indexOf(this), 1); this.parentElement = null; }
  after(child) { const parent = this.parentElement; child.remove(); parent.childNodes.splice(parent.childNodes.indexOf(this) + 1, 0, child); child.parentElement = parent; }
  matches(selector) { return matches(this, selector); }
  closest(selector) { return this.matches(selector) ? this : this.parentElement && this.parentElement.closest(selector); }
  contains(node) { return this === node || this.children.some(child => child.contains(node)); }
  querySelectorAll(selector) { const all = []; const visit = el => { for (const child of el.children) { if (child.matches(selector)) all.push(child); visit(child); } }; visit(this); return all; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
class Document {
  constructor() { this.documentElement = new Element('html'); this.head = this.createElement('head'); this.body = this.createElement('body'); this.documentElement.appendChild(this.head); this.documentElement.appendChild(this.body); this.listeners = {}; }
  createElement(tag) { return new Element(tag); }
  getElementById(id) { return this.documentElement.querySelector('#' + id); }
  querySelector(selector) { return this.documentElement.querySelector(selector); }
  querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector); }
  addEventListener(type, cb) { (this.listeners[type] ||= []).push(cb); }
  event(type, target) { for (const cb of this.listeners[type] || []) cb({target}); }
}

// Deliberately offline: no game globals, account, save, player or live network.
const tests=[];
function test(name,fn){tests.push([name,fn]);}
const svg=shape=>'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">'+shape+'</svg>');
const data={
  sourceCommit:'offline-run-fixture',conditions:'neutral',attackMultiplier:1.4,monoMultiplier:1.2,
  roleIcons:{wave:svg('<path d="M1 6h10"/>'),boss:svg('<circle cx="6" cy="6" r="4"/>')},
  species:{1:{name:'Specialmon',ko:'특수몬',types:['normal'],pa:40,sa:100,atk:100}},
  moves:{
    beam:{id:'beam',es:'Rayo',en:'Beam',ko:'빔',aliases:['Rayo','Beam','빔'],type:'normal',cat:'special',kind:'shot',dmg:10,wave:'A',boss:'S'},
    hit:{id:'hit',es:'Golpe',en:'Hit',ko:'타격',aliases:['Golpe','Hit','타격'],type:'normal',cat:'physical',kind:'melee',dmg:20,wave:'B',boss:'A'},
    rival:{id:'rival',aliases:['Rival','Shared base'],type:'normal',cat:'physical',kind:'melee',dmg:15,wave:'B',boss:'B'},
    duplicate:{id:'duplicate',aliases:['Duplicate','Shared base'],type:'normal',cat:'physical',kind:'melee',dmg:15,wave:'B',boss:'B'}
  },
  evolutions:{
    beam:{id:'beam',baseId:'beam',stage:'evolved',es:'Superrayo',en:'Super Beam',ko:'슈퍼빔',aliases:['Superrayo','Super Beam','슈퍼빔'],type:'normal',cat:'special',kind:'shot',dmg:30,wave:'S',boss:'A'},
    hit:{id:'hit',baseId:'hit',stage:'evolved',es:'Supergolpe',en:'Super Hit',ko:'슈퍼타격',aliases:['Supergolpe','Super Hit','슈퍼타격'],type:'normal',cat:'physical',kind:'melee',dmg:40,wave:'A',boss:'S'}
  }
};
const before=JSON.stringify(data);

function harness(){
  const document=new Document(),make=(tag,parent,attrs={},text='')=>{const el=document.createElement(tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);el.textContent=text;parent.appendChild(el);return el;};
  const root=id=>make('div',document.body,{id});
  const level=root('scr-levelup'),cards=make('div',level,{id:'cards'}),bond=root('scr-bond'),bondCards=make('div',bond,{id:'bond-cards'});
  let observer,observerCount=0,observed,observedRoot,frames=[];
  const window={location:new URL('https://pokesurvivor.com/'),requestAnimationFrame:fn=>{frames.push(fn);return frames.length;}};
  const context=vm.createContext({document,window,PSKO_MOVE_DATA:data,MutationObserver:class{
    constructor(cb){observer=cb;observerCount++;}
    observe(el,opt){observedRoot=el;observed=opt;}
    disconnect(){}
  }});
  const run=()=>vm.runInContext(source,context);
  const mutation=(target,extra={})=>{assert.equal(typeof observer,'function','one runtime observer is installed');observer([{type:'childList',target,addedNodes:[],removedNodes:[],...extra}]);};
  const flush=()=>{const queued=frames;frames=[];queued.forEach(fn=>fn());assert.equal(frames.length,0,'render does not self-schedule');};
  const card=(parent,title,tag,classes='card',index=1)=>{
    const el=make('div',parent,{class:classes,'data-sfx':'none','data-test-index':String(index)});
    const ico=make('div',el,{class:'ico'}),icon=make('svg',ico,{role:'img'},'native-icon');
    const txt=make('div',el,{class:'txt'}),nm=make('div',txt,{class:'nm'},title+' '),native=nm.childNodes[0];
    const chip=make('span',nm,{class:'tag-chip'},tag),ds=make('div',txt,{class:'ds'},'Native description');
    const key=make('div',el,{class:'key'},String(index));let clicks=0;const onclick=()=>clicks++;el.onclick=onclick;
    return {el,nm,native,chip,ico,icon,txt,ds,key,onclick,get clicks(){return clicks;}};
  };
  return {document,make,root,level,cards,bond,bondCards,card,run,mutation,flush,
    get observerCount(){return observerCount;},get observed(){return observed;},get observedRoot(){return observedRoot;},get frames(){return frames;}};
}
const badge=host=>host.querySelector('.psko-move-badge');
function expectBadge(host,label){const b=badge(host);assert.ok(b,'runtime name has a badge');assert.equal(b.parentElement,host,'badge stays inside .nm');assert.equal(b.textContent,label);assert.equal(host.querySelectorAll('.psko-move-badge').length,1);return b;}
function expectNative(c,title,tag,index){
  assert.equal(c.nm.childNodes[0],c.native,'native title Text node retained');assert.equal(c.native.textContent,title+' ');
  assert.equal(c.chip.parentElement,c.nm);assert.equal(c.chip.textContent,tag);assert.equal(c.icon.parentElement,c.ico);assert.equal(c.icon.textContent,'native-icon');
  assert.equal(c.ds.textContent,'Native description');assert.equal(c.key.textContent,String(index));assert.equal(c.el.getAttribute('data-test-index'),String(index));assert.equal(c.el.getAttribute('data-sfx'),'none');assert.equal(c.el.onclick,c.onclick);
}
function expectRoles(b,move){
  const roles=b.querySelectorAll('.psko-move-role');assert.equal(roles.length,2,'one visual role chip for each rating');
  for(const role of ['wave','boss']){
    const nodes=roles.filter(n=>n.getAttribute('data-role')===role);assert.equal(nodes.length,1,'unique '+role+' chip');
    const images=nodes[0].querySelectorAll('img');assert.equal(images.length,1,'one decorative role icon');
    assert.equal(images[0].getAttribute('alt'),'');assert.equal(images[0].getAttribute('src'),data.roleIcons[role]);
    assert.match(images[0].getAttribute('src'),/^data:image\/svg\+xml,/);assert.doesNotMatch(images[0].getAttribute('src'),/^https?:/i);
    assert.ok(nodes[0].textContent.includes(move[role]),'role chip contains its own grade');
  }
  assert.doesNotMatch(b.textContent,/적합|보조|균형형|공격계수|특수몬/,'runtime badge never infers a species');
}

test('lookup: multilingual base/new, base or evolved upgrades and bond, exact evolution pairs',()=>{
  assert.equal(typeof U.createRunLookup,'function');const lookup=U.createRunLookup(data);
  assert.equal(typeof lookup,'function');
  for(const name of ['Rayo','Beam','빔','  bEaM  ']){
    assert.equal(lookup(name,'new'),data.moves.beam);assert.equal(lookup(name,'up'),data.moves.beam);assert.equal(lookup(name,'bond'),data.moves.beam);assert.equal(lookup(name,'pause'),data.moves.beam);
  }
  for(const name of ['Superrayo','Super Beam','슈퍼빔']){
    assert.equal(lookup(name,'new'),null,'new cards cannot name evolved records');assert.equal(lookup(name,'evo'),null,'destination alone is not a verified transition');
    assert.equal(lookup(name,'up'),data.evolutions.beam);assert.equal(lookup(name,'bond'),data.evolutions.beam);assert.equal(lookup(name,'pause'),data.evolutions.beam);
  }
  for(const title of ['Rayo → Superrayo','Beam → Super Beam','빔 → 슈퍼빔',' Beam  →  슈퍼빔 '])assert.equal(lookup(title,'evo'),data.evolutions.beam,title);
  for(const title of ['Hit → Super Beam','Beam → Super Hit','Beam → Beam','Beam → Missing','Missing → Super Beam','Beam → Super Beam → Super Hit'])assert.equal(lookup(title,'evo'),null,title);
  for(const kind of ['new','up','evo','bond','pause'])for(const text of ['',null,undefined,'Unknown','Beam evolved','Shared base','???'])assert.equal(lookup(text,kind),null,String(text)+' / '+kind);
  assert.equal(lookup('Beam','stat'),null);assert.equal(lookup('Beam → Super Beam','up'),null);
});

test('lookup: collisions are neutral and evolution requires an unambiguous source and pair',()=>{
  assert.equal(typeof U.createRunLookup,'function');
  const shared={...data,evolutions:{
    beam:{...data.evolutions.beam,aliases:['Shared evolved']},hit:{...data.evolutions.hit,aliases:['Shared evolved']}
  }};
  const resolve=U.createRunLookup(shared);
  assert.equal(resolve('Shared evolved','up'),null);assert.equal(resolve('Shared evolved','bond'),null);
  assert.equal(resolve('Beam → Shared evolved','evo'),shared.evolutions.beam,'base/destination pair can disambiguate a shared destination');
  assert.equal(resolve('Hit → Shared evolved','evo'),shared.evolutions.hit);
  const cross={...data,evolutions:{...data.evolutions,beam:{...data.evolutions.beam,aliases:['Beam','Super Beam']}}};
  const crossLookup=U.createRunLookup(cross);
  assert.equal(crossLookup('Beam','up'),null,'base/evolved alias collision is ambiguous');assert.equal(crossLookup('Beam','bond'),null);
  assert.equal(crossLookup('Beam','new'),cross.moves.beam,'new context only considers base records');
  const badSource={...data,moves:{...data.moves,hit:{...data.moves.hit,aliases:['Beam','Hit']}}};
  assert.equal(U.createRunLookup(badSource)('Beam → Super Beam','evo'),null,'ambiguous base cannot verify a pair');
  assert.equal(JSON.stringify(data),before,'lookup does not mutate source data');
});

test('card kind: strict multilingual new/upgrade/evolution tags and bond context',()=>{
  assert.equal(typeof U.runCardKind,'function');
  for(const tag of ['Nuevo · Normal','New · Normal','신규 · 노말','새 기술 · 노말'])assert.equal(U.runCardKind(tag,false,false),'new',tag);
  for(const tag of ['Nv.1 > 2','Lv.1 > 2','Nv.4 > 5','Lv.4 > 5'])assert.equal(U.runCardKind(tag,false,false),'up',tag);
  for(const tag of ['EVOLUCIÓN','EVOLUTION','진화']){assert.equal(U.runCardKind(tag,true,false),'evo');assert.equal(U.runCardKind(tag,false,false),null,'tag alone is not evo');}
  for(const tag of ['EVOLUCIÓN!','EVOLUTION BONUS','진화 가능','EVO','Nv.2','Normal','Newish · Normal','Nuevo','HP +10','Item',''])assert.equal(U.runCardKind(tag,false,false),null,tag);
  for(const tag of ['Normal','EVOLUTION','New · Normal','Lv.3',''])assert.equal(U.runCardKind(tag,false,true),'bond','trusted bond container supplies context');
});

test('DOM: only established run move cards receive compact neutral or graded role badges',()=>{
  const h=harness(),beam=h.card(h.cards,'Beam','Nuevo · Normal','card',1),up=h.card(h.cards,'Super Beam','Lv.1 > 2','card',2),evo=h.card(h.cards,'빔 → 슈퍼빔','진화','card evo',3);
  const unknown=h.card(h.cards,'Unknown','New · Normal'),ambiguous=h.card(h.cards,'Shared base','New · Normal'),destination=h.card(h.cards,'Super Beam','EVOLUTION','card evo');
  const wrongPair=h.card(h.cards,'Hit → Super Beam','EVOLUTION','card evo'),baseOnly=h.card(h.cards,'Super Beam','New · Normal');
  const stat=h.card(h.cards,'Beam','HP +10'),item=h.card(h.cards,'Beam','Item'),fakeEvo=h.card(h.cards,'Beam → Super Beam','EVOLUTION');
  const outside=h.card(h.root('unrelated'),'Beam','New · Normal'),nested=h.card(h.make('div',h.cards),'Beam','New · Normal');
  const bond=h.card(h.bondCards,'슈퍼빔','Nv.3'),bondUnknown=h.card(h.bondCards,'Unknown','Nv.3');
  h.run();expectRoles(expectBadge(beam.nm,'다A·보S'),data.moves.beam);expectRoles(expectBadge(up.nm,'다S·보A'),data.evolutions.beam);expectRoles(expectBadge(evo.nm,'다S·보A'),data.evolutions.beam);expectRoles(expectBadge(bond.nm,'다S·보A'),data.evolutions.beam);
  for(const c of [unknown,ambiguous,destination,wrongPair,baseOnly,bondUnknown]){const b=expectBadge(c.nm,'미평가');assert.doesNotMatch(b.textContent,/다[ASB]|보[ASB]/);}
  for(const c of [stat,item,fakeEvo,outside,nested])assert.equal(badge(c.el),null,'stat/item/unverified/out-of-scope names stay untouched');
  expectNative(beam,'Beam','Nuevo · Normal',1);expectNative(up,'Super Beam','Lv.1 > 2',2);expectNative(evo,'빔 → 슈퍼빔','진화',3);
  assert.equal(U.runNameText(beam.nm).trim(),'Beam','.tag-chip and own badge excluded from native title');
  beam.el.onclick();assert.equal(beam.clicks,1);assert.equal(h.observerCount,1);assert.equal(h.observedRoot,h.document.documentElement);assert.equal(h.observed.characterData,true);
  assert.equal(JSON.stringify(data),before);
});

test('DOM: multilingual tag/title translation and native chip edits re-resolve without species state',()=>{
  const h=harness(),c=h.card(h.cards,'Rayo','Nuevo · Normal');h.run();expectBadge(c.nm,'다A·보S');
  for(const [title,tag,label]of [['빔','새 기술 · 노말','다A·보S'],['Superrayo','Nv.1 > 2','다S·보A'],['슈퍼빔','Lv.2 > 3','다S·보A'],['Missing','신규 · 노말','미평가']]){
    c.native.nodeValue=title+' ';c.chip.textContent=tag;h.mutation(c.nm);h.flush();expectBadge(c.nm,label);
    assert.equal(U.runNameText(c.nm).trim(),title);assert.equal(c.chip.textContent,tag);
  }
  c.native.nodeValue='Beam → Super Beam ';c.chip.textContent='EVOLUTION';c.el.className='card evo';h.mutation(c.el,{type:'attributes',attributeName:'class'});h.flush();expectBadge(c.nm,'다S·보A');
  c.chip.textContent='EVOLUTION BONUS';h.mutation(c.chip);h.flush();assert.equal(badge(c.nm),null,'non-exact evolution tag removes stale badge');
  c.chip.textContent='EVOLUCIÓN';h.mutation(c.chip);h.flush();expectBadge(c.nm,'다S·보A');
});

test('DOM: co-op done/picked, reroll and bond step rebuilds preserve native handlers and clear detached hosts',()=>{
  const h=harness(),first=h.card(h.cards,'Beam','New · Normal'),other=h.card(h.cards,'Hit','Lv.1 > 2','card',2);h.run();
  h.cards.className='done';first.el.className='card picked';h.mutation(h.cards,{type:'attributes',attributeName:'class'});h.mutation(first.el,{type:'attributes',attributeName:'class'});h.flush();expectBadge(first.nm,'다A·보S');expectBadge(other.nm,'다B·보A');
  const prior=badge(first.nm);h.mutation(first.nm);h.mutation(other.nm);assert.equal(h.frames.length,1,'multiple native mutations coalesce');h.flush();assert.equal(badge(first.nm),prior);
  first.el.remove();other.el.remove();const replacement=h.card(h.cards,'Super Beam','Nv.2 > 3');h.mutation(h.cards,{addedNodes:[replacement.el],removedNodes:[first.el,other.el]});h.flush();
  assert.equal(badge(first.nm),null,'detached reroll host cleaned');assert.equal(badge(other.nm),null);expectBadge(replacement.nm,'다S·보A');replacement.el.onclick();assert.equal(replacement.clicks,1);
  const step1=h.card(h.bondCards,'Beam','Nv.4');h.mutation(h.bondCards,{addedNodes:[step1.el]});h.flush();expectBadge(step1.nm,'다A·보S');
  step1.el.remove();const step2=h.card(h.bondCards,'Super Beam','Nv.4','card bond');h.mutation(h.bondCards,{removedNodes:[step1.el],addedNodes:[step2.el]});h.flush();assert.equal(badge(step1.nm),null);expectBadge(step2.nm,'다S·보A');
  step2.el.remove();h.mutation(h.bondCards,{removedNodes:[step2.el]});h.flush();assert.equal(badge(step2.nm),null);
});

test('DOM: hide/reopen and move-to-stat/item/scope changes remove stale badges and restore safely',()=>{
  const h=harness(),c=h.card(h.cards,'Beam','New · Normal');h.run();expectBadge(c.nm,'다A·보S');
  for(const [attribute,value]of [['class','hidden'],['style','display:none'],['hidden',''],['aria-hidden','true']]){
    h.level.setAttribute(attribute,value);h.mutation(h.level,{type:'attributes',attributeName:attribute});h.flush();assert.equal(badge(c.nm),null,'hidden run screen has no badge: '+attribute);
    h.level.removeAttribute(attribute);h.mutation(h.level,{type:'attributes',attributeName:attribute});h.flush();expectBadge(c.nm,'다A·보S');
  }
  for(const tag of ['HP +10','Item','Nv.1','Normal']){
    c.chip.textContent=tag;h.mutation(c.chip);h.flush();assert.equal(badge(c.nm),null,'stale move badge removed on type change');
    c.chip.textContent='New · Normal';h.mutation(c.chip);h.flush();expectBadge(c.nm,'다A·보S');
  }
  c.el.className='not-a-card';h.mutation(c.el,{type:'attributes',attributeName:'class'});h.flush();assert.equal(badge(c.nm),null);
  c.el.className='card';h.mutation(c.el,{type:'attributes',attributeName:'class'});h.flush();expectBadge(c.nm,'다A·보S');
  h.make('div',h.document.body,{id:'elsewhere'}).appendChild(c.el);h.mutation(h.cards,{removedNodes:[c.el]});h.flush();assert.equal(badge(c.nm),null,'moved out-of-scope host cleaned');
  h.cards.appendChild(c.el);h.mutation(h.cards,{addedNodes:[c.el]});h.flush();expectBadge(c.nm,'다A·보S');expectNative(c,'Beam','New · Normal',1);
});

test('DOM: badge mutations ignored, unrelated UI inert, duplicate execution adds no observer/listener',()=>{
  const h=harness(),c=h.card(h.cards,'Beam','New · Normal');h.run();const b=expectBadge(c.nm,'다A·보S');
  h.mutation(b);h.mutation(c.nm,{addedNodes:[b]});for(const n of b.childNodes)h.mutation(n,{type:'characterData'});assert.equal(h.frames.length,0,'own rendering does not rescan');
  const unrelated=h.make('button',h.root('hud'),{},'Beam');h.mutation(unrelated);h.mutation(h.document.body,{addedNodes:[unrelated]});assert.equal(h.frames.length,0);
  const listeners=Object.fromEntries(Object.entries(h.document.listeners).map(([name,list])=>[name,list.length]));
  const count=h.document.querySelectorAll('.psko-move-badge').length;h.run();assert.equal(h.observerCount,1);assert.deepEqual(Object.fromEntries(Object.entries(h.document.listeners).map(([name,list])=>[name,list.length])),listeners);
  assert.equal(h.document.querySelectorAll('.psko-move-badge').length,count);assert.equal(badge(c.nm),b);c.el.onclick();assert.equal(c.clicks,1);assert.equal(JSON.stringify(data),before);
});

test('regression: existing menu/dex fit text and selected state remain separate from run-neutral badges',()=>{
  const h=harness(),select=h.make('select',h.document.body,{id:'upg-mon'});select.value='1';select.selectedIndex=0;
  const upg=h.root('upg-list'),ban=h.make('div',upg,{class:'ban-moves'}),button=h.make('button',ban,{'data-id':'beam',title:'Native title'},'Rayo'),native=button.childNodes[0];
  const bind=h.make('div',upg,{class:'bind-slot'}),slot=h.make('select',bind,{'data-slot':'1'});slot.value='beam';slot.selectedIndex=1;
  const empty=h.make('option',slot,{value:''},'Libre'),option=h.make('option',slot,{value:'beam',label:'Original label'},'Native Beam');
  h.make('div',h.root('dex-grid'),{class:'cell on'});const detail=h.root('dex-detail'),center=h.make('div',detail,{class:'center'});h.make('div',center,{},'No. 001');h.make('h3',center,{},'Specialmon');
  const p=h.make('p',detail,{},'Starts with '),gold=h.make('b',p,{class:'gold'},'Beam'),icons=h.make('div',detail,{class:'move-icons'}),icon=h.make('span',icons,{title:'Beam'},'x');
  const run=h.card(h.cards,'Beam','New · Normal');h.run();
  for(const host of [button,gold,icon])assert.equal(badge(host).textContent,'다A·보S · 특수적합');expectBadge(run.nm,'다A·보S');
  assert.equal(button.childNodes[0],native);assert.equal(button.getAttribute('title'),'Native title');assert.equal(icon.getAttribute('title'),'Beam');assert.equal(option.textContent,'Native Beam');assert.equal(option.getAttribute('label'),'Original label [다A·보S · 특수적합]');assert.equal(slot.value,'beam');assert.equal(slot.selectedIndex,1);assert.equal(empty.getAttribute('label'),null);
  select.value='unknown';h.document.event('change',select);h.flush();assert.equal(badge(button),null);assert.equal(option.getAttribute('label'),'Original label');expectBadge(run.nm,'다A·보S');
});

test('pause: only exact move-name first cells gain neutral badges, without reading stats or levels',()=>{
  const h=harness(),pause=h.root('scr-pause'),summary=h.make('div',pause,{id:'pause-sum'}),table=h.make('table',summary,{class:'sum-moves'});
  const row=(name,level)=>{
    const tr=h.make('tr',table),td=h.make('td',tr),icon=h.make('img',td,{src:'data:image/svg+xml,native',alt:''});
    const title=new Text(' '+name+' ');td.appendChild(title);const small=h.make('small',td,{},level);
    const cat=h.make('td',tr),tag=h.make('span',cat,{class:'tag-chip'},'Beam'),damage=h.make('td',tr,{class:'num'},'Beam'),dps=h.make('td',tr,{class:'num'},'Super Beam');
    return {tr,td,icon,title,small,cat,tag,damage,dps};
  };
  const base=row('Beam','Nv.1'),evolved=row('Super Beam','Lv.5'),unknown=row('Unknown','Nv.2'),ambiguous=row('Shared base','Nv.3');
  const unrelated=h.make('b',h.make('div',summary,{class:'sum-stats'}),{},'Beam'),item=h.make('b',h.make('p',summary,{class:'sub'}),{},'Beam');
  const otherTable=h.make('table',summary),wrong=h.make('td',h.make('tr',otherTable),{},'Beam');
  const unstructured=h.make('td',h.make('tr',table),{},'Beam');
  h.run();expectRoles(expectBadge(base.td,'다A·보S'),data.moves.beam);expectRoles(expectBadge(evolved.td,'다S·보A'),data.evolutions.beam);expectBadge(unknown.td,'미평가');expectBadge(ambiguous.td,'미평가');
  for(const r of [base,evolved,unknown,ambiguous]){
    assert.equal(r.td.childNodes[0],r.icon);assert.equal(r.td.childNodes[1],r.title);assert.equal(r.small.parentElement,r.td);assert.equal(r.icon.getAttribute('src'),'data:image/svg+xml,native');
    for(const cell of [r.cat,r.damage,r.dps])assert.equal(badge(cell),null,'category, damage and DPS columns are not move names');
  }
  assert.equal(base.small.textContent,'Nv.1');for(const el of [unrelated,item,wrong,unstructured])assert.equal(badge(el),null,'stats/items/other tables stay untouched');
  base.title.nodeValue=' 슈퍼빔 ';h.mutation(base.title,{type:'characterData'});h.flush();expectBadge(base.td,'다S·보A');
  base.small.textContent='Nv.999';base.damage.textContent='999,999';h.mutation(base.small);h.mutation(base.damage);h.flush();expectBadge(base.td,'다S·보A');
  pause.className='hidden';h.mutation(pause,{type:'attributes',attributeName:'class'});h.flush();assert.equal(badge(base.td),null);pause.className='';h.mutation(pause,{type:'attributes',attributeName:'class'});h.flush();expectBadge(base.td,'다S·보A');
  base.tr.remove();h.mutation(table,{removedNodes:[base.tr]});h.flush();assert.equal(badge(base.td),null,'detached pause names cleaned');
});

test('safety: source stays DOM-only, role visuals contain no remotely fetched image URLs',()=>{
  for(const pattern of [/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|eval)\b/,/\.innerHTML\s*=/,/window\.(?:parent|top)/,/\b(?:G\.Game|G\.DB|player|save)\s*\./])assert.equal(pattern.test(source),false,String(pattern));
  assert.equal((source.match(/new MutationObserver/g)||[]).length,1);assert.ok(source.includes('const DATA=PSKO_MOVE_DATA;'));
  const h=harness(),c=h.card(h.cards,'Beam','New · Normal');h.run();expectRoles(expectBadge(c.nm,'다A·보S'),data.moves.beam);
  for(const image of h.document.querySelectorAll('.psko-move-badge img'))assert.match(image.getAttribute('src'),/^data:image\/svg\+xml,/);
  assert.equal(JSON.stringify(data),before);
});

let failures=0;
for(const [name,fn]of tests){try{fn();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}
console.log(`run-move-tier-ui: ${tests.length-failures}/${tests.length} offline groups passed (fake DOM only; no live game/account/save/player access)`);
if(failures)process.exitCode=1;
