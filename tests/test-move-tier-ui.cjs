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
const data={sourceCommit:'fixture',conditions:'neutral',attackMultiplier:1.4,monoMultiplier:1.2,species:{1:{name:'Specialmon',ko:'특수몬',types:['normal'],pa:40,sa:100,atk:100},2:{name:'Physicalmon',ko:'물리몬',types:['normal','fire'],pa:100,sa:40,atk:100},3:{name:'Firemon',ko:'불몬',types:['fire'],pa:40,sa:100,atk:100}},moves:{beam:{id:'beam',ko:'빔',en:'Beam',es:'Rayo',aliases:['Rayo','Beam','빔'],type:'normal',cat:'special',kind:'shot',dmg:10,wave:'A',boss:'S'},hit:{id:'hit',ko:'타격',en:'Hit',aliases:['Hit','타격'],type:'normal',cat:'physical',kind:'melee',dmg:20,wave:'B',boss:'A'},buff:{id:'buff',ko:'명상',aliases:['명상'],type:'normal',cat:null,kind:'buff',stat:'satk',dmg:0,wave:'지원S',boss:'지원S'},fire:{id:'fire',aliases:['Fire'],type:'fire',cat:'special',kind:'shot',dmg:10,wave:'S',boss:'A'}}};
const s=data.species,m=data.moves;
assert.equal(U.fit(s[1],'physical'),.4);assert.equal(U.fit(s[1],'special'),1);assert.equal(U.fit(null,'special'),1);assert.equal(U.fit(s[1],null),1);
assert.equal(U.fitLabel(s[1],m.beam),'특수적합');assert.equal(U.fitLabel(s[2],m.beam),'특수보조');assert.equal(U.fitLabel(s[2],m.hit),'물리적합');assert.equal(U.fitLabel({...s[1],pa:100},m.hit),'균형형');
assert.equal(U.monoBonus(s[1],m.beam),1.2);assert.equal(U.monoBonus(s[2],m.beam),1);assert.equal(U.monoBonus(s[3],m.beam),1);assert.equal(U.monoBonus(s[3],m.fire),1.2);assert.equal(U.monoBonus(s[1],m.buff),1);
assert.equal(U.attackCoefficient(s[1],m.beam),168);assert.equal(U.attackCoefficient(s[2],m.beam),56);assert.equal(U.attackCoefficient(s[1],m.buff),null);
const poison={...m.beam,dmg:0,poison:.1};assert.equal(U.monoBonus(s[1],poison),1);assert.equal(U.attackCoefficient(s[1],poison),null);assert.equal(U.fitLabel(s[1],poison),'');
for(const [stat,label] of Object.entries({patk:'물리지원',satk:'특수지원',spd:'이동지원',def:'방어지원',regen:'회복지원'}))assert.equal(U.fitLabel(s[1],{...m.buff,stat}),label);
assert.equal(U.roleLabel(m.beam),'다A·보S');assert.equal(U.roleLabel(m.buff),'지원S');assert.equal(U.roleLabel(null),'미평가');assert.match(U.badgeInfo(s[2],m.buff,data).title,/약한 공격/);assert.match(U.badgeInfo(s[1],m.beam,data).title,/독 비례피해/);
const document=new Document(),make=(tag,parent,attrs={},text='')=>{const el=document.createElement(tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);el.textContent=text;parent.appendChild(el);return el;},root=id=>make('div',document.body,{id});
const select=make('select',document.body,{id:'upg-mon'});select.value='1';select.selectedIndex=0;
const upg=root('upg-list'),ban=make('div',upg,{class:'ban-moves'}),button=make('button',ban,{'data-id':'beam',title:'Original'},'Rayo'),text=button.childNodes[0],icon=make('svg',button,{role:'img'},'star');let calls=0;button.onclick=()=>calls++;
const randomSummary=make('button',upg,{'data-start2':''},'Choose: Random');
const secondStart=make('button',upg,{'data-start2':'1'},'Choose: Beam'),randomStart=make('button',ban,{'data-id':''},'Random');
const start=make('button',upg,{'data-start':'1'},'Choose: Beam'),unknown=make('button',ban,{'data-id':'unknown'},'Unknown');
const bind=make('div',upg,{class:'bind-slot'}),slot=make('select',bind,{'data-slot':'1'});slot.value='beam';slot.selectedIndex=1;
const empty=make('option',slot,{value:''},'Libre'),option=make('option',slot,{value:'beam',label:'Original label'},'Native Beam'),noLabel=make('option',slot,{value:'hit'},'Hit');
const cell=make('div',root('dex-grid'),{class:'cell on'}),detail=root('dex-detail'),center=make('div',detail,{class:'center'}),number=make('div',center,{},'No. 001'),heading=make('h3',center,{},'Specialmon');
make('span',heading,{class:'psko-tier-badge','data-psko-own':''},'S');make('svg',heading,{role:'img'},'Shiny');
const startParagraph=make('p',detail,{},'Empieza con ');
const specialGold=make('b',make('p',detail,{class:'sub center'},'Pega mejor con ataques '),{class:'gold'},'especiales');
const physicalGold=make('b',make('p',detail,{class:'sub center'},'Pega mejor con ataques '),{class:'gold'},'físicos');
const unrelatedGold=make('b',make('p',detail,{},'Unrelated '),{class:'gold'},'Beam');
const gold=make('b',startParagraph,{class:'gold'},'빔'),moveIcon=make('span',make('div',detail,{class:'move-icons'}),{title:'Beam'},'x'),iconText=moveIcon.childNodes[0],user=make('b',document.body,{},'Beam'),hud=make('button',root('cards'),{'data-id':'beam'},'Beam');
let observer,observerCount=0,frames=[],observed;
const context=vm.createContext({document,window:{location:new URL('https://pokesurvivor.com/'),requestAnimationFrame:fn=>frames.push(fn)},MutationObserver:class{constructor(cb){observer=cb;observerCount++;}observe(el,opt){observed=opt;}},PSKO_MOVE_DATA:data});
const run=()=>vm.runInContext(source,context),mutation=(target,extra={})=>observer([{type:'childList',target,addedNodes:[],removedNodes:[],...extra}]),flush=()=>{const queue=frames;frames=[];queue.forEach(fn=>fn());},badge=el=>el.querySelector('.psko-move-badge'),before=JSON.stringify(data);
run();assert.equal(badge(secondStart).textContent,badge(button).textContent);assert.equal(badge(randomStart),null,'Random is an action, not an unassessed move');assert.equal(badge(randomSummary),null,'Random summary is not a move');assert.equal(secondStart.getAttribute('data-start2'),'1');assert.equal(randomStart.getAttribute('data-id'),'');assert.ok(badge(secondStart).getAttribute('title').includes('성격·선택/숨겨진 특성·배운 TM'));assert.equal(observerCount,1);assert.equal(observed.characterData,true);assert.equal(badge(button).textContent,'다A·보S · 특수적합');assert.equal(badge(start).textContent,badge(button).textContent);assert.equal(badge(gold).textContent,badge(button).textContent);assert.equal(badge(moveIcon).textContent,badge(button).textContent);assert.equal(badge(unknown).textContent,'미평가');assert.equal(badge(user),null);assert.equal(badge(hud),null);
assert.match(badge(button).getAttribute('title'),/단일 타입.*20%/);assert.equal(button.childNodes[0],text);assert.equal(icon.parentElement,button);assert.equal(moveIcon.childNodes[0],iconText);assert.equal(button.getAttribute('title'),'Original');assert.equal(moveIcon.getAttribute('title'),'Beam');
assert.equal(option.getAttribute('label'),'Original label [다A·보S · 특수적합]');assert.equal(option.textContent,'Native Beam');assert.equal(option.value,'beam');assert.equal(empty.getAttribute('label'),null);assert.equal(slot.value,'beam');assert.equal(slot.selectedIndex,1);
select.value='2';document.event('change',select);flush();assert.equal(badge(button).textContent,'다A·보S · 특수보조');assert.doesNotMatch(badge(button).getAttribute('title'),/단일 타입 일치/);assert.equal(U.roleLabel(m.beam),'다A·보S');
select.value='3';document.event('change',select);flush();assert.doesNotMatch(badge(button).getAttribute('title'),/단일 타입 일치/);
select.value='1';document.event('change',select);flush();const prior=badge(button);mutation(button);mutation(button);assert.equal(frames.length,1);flush();assert.equal(badge(button),prior);
mutation(prior);mutation(button,{addedNodes:[prior]});mutation(prior.childNodes[0],{type:'characterData'});mutation(option,{type:'attributes',attributeName:'label'});assert.equal(frames.length,0);
assert.equal(prior.getAttribute('aria-label'),prior.textContent);
for(const prefix of ['Empieza con ', 'Starts with ', '시작 기술 ']){startParagraph.childNodes[0].nodeValue=prefix;mutation(startParagraph,{type:'characterData'});flush();assert.ok(badge(gold));assert.equal(badge(specialGold),null);assert.equal(badge(physicalGold),null);assert.equal(badge(unrelatedGold),null);}
gold.childNodes[0].nodeValue='Future start move';mutation(gold,{type:'characterData'});flush();assert.equal(badge(gold).textContent,'미평가');
startParagraph.childNodes[0].nodeValue='Unrelated ';mutation(startParagraph,{type:'characterData'});flush();assert.equal(badge(gold),null,'stale badge removed when paragraph ceases to be start context');
startParagraph.childNodes[0].nodeValue='시작 기술 ';gold.childNodes[0].nodeValue='빔';mutation(startParagraph);flush();assert.ok(badge(gold));
mutation(user);mutation(hud);mutation(document.body,{addedNodes:[user]});assert.equal(frames.length,0,'unrelated content does not queue scans');
const foreign=make('span',heading,{'data-psko-own':''},'');mutation(heading,{addedNodes:[foreign]});assert.equal(frames.length,1,'other modules owned nodes are not ignored');flush();
option.setAttribute('label','Translated');mutation(option,{type:'attributes',attributeName:'label'});flush();assert.equal(option.getAttribute('label'),'Translated [다A·보S · 특수적합]');
moveIcon.setAttribute('title','Hit');mutation(moveIcon,{type:'attributes',attributeName:'title'});flush();assert.equal(badge(moveIcon).textContent,'다B·보A · 물리보조');assert.equal(moveIcon.getAttribute('title'),'Hit');
for(const prefix of ['Elegir:','선택:','Choose:']){start.childNodes[0].nodeValue=prefix+' Rayo';mutation(start);flush();assert.equal(badge(start).textContent,'다A·보S · 특수적합');}
start.childNodes[0].nodeValue='Choose: Beam evolved';mutation(start);flush();assert.equal(badge(start).textContent,'미평가');
heading.childNodes[0].nodeValue='???';mutation(heading);flush();assert.equal(badge(gold),null);assert.equal(badge(moveIcon),null);assert.equal(gold.textContent,'빔');
heading.childNodes[0].nodeValue='특수몬';mutation(heading);flush();assert.ok(badge(gold));cell.className='cell on locked';mutation(cell,{type:'attributes'});flush();assert.equal(badge(gold),null);
cell.className='cell on';heading.setAttribute('hidden','');mutation(heading,{type:'attributes'});flush();assert.equal(badge(gold),null);heading.removeAttribute('hidden');mutation(heading,{type:'attributes'});flush();assert.ok(badge(gold));
heading.childNodes[0].nodeValue='Renamedmon';mutation(heading);flush();assert.equal(badge(gold),null);heading.childNodes[0].nodeValue='Specialmon';number.textContent='No. 002';mutation(number);flush();assert.equal(badge(gold),null);number.textContent='No. 001';mutation(number);flush();assert.ok(badge(gold));
select.value='unknown';document.event('change',select);flush();assert.equal(badge(button),null);assert.equal(option.getAttribute('label'),'Translated');assert.equal(noLabel.getAttribute('label'),null);assert.equal(empty.getAttribute('label'),null);
select.value='1';document.event('change',select);flush();ban.className='renamed';mutation(ban,{type:'attributes'});flush();assert.equal(badge(button),null);ban.className='ban-moves';mutation(ban,{type:'attributes'});flush();assert.ok(badge(button));
bind.className='renamed';mutation(bind,{type:'attributes'});flush();assert.equal(option.getAttribute('label'),'Translated');assert.equal(noLabel.getAttribute('label'),null);
button.childNodes[0].nodeValue='빔';mutation(button.childNodes[0],{type:'characterData'});flush();assert.equal(badge(button).textContent,'다A·보S · 특수적합');
const replacement=make('span',moveIcon.parentElement,{title:'Beam'},'new icon');const oldIcon=moveIcon;oldIcon.remove();mutation(replacement.parentElement,{addedNodes:[replacement],removedNodes:[oldIcon]});flush();assert.ok(badge(replacement));assert.equal(badge(oldIcon),null,'detached host cleaned');
const count=document.querySelectorAll('.psko-move-badge').length;run();assert.equal(observerCount,1);assert.equal(document.querySelectorAll('.psko-move-badge').length,count);button.onclick();assert.equal(calls,1);assert.equal(JSON.stringify(data),before);
for(const route of ['/','/index.html','/dev.html'])assert.equal(U.allowedLocation(new URL('https://pokesurvivor.com'+route)),true);
for(const url of ['http://pokesurvivor.com/','https://evil.test/','https://pokesurvivor.com.evil.test/','https://pokesurvivor.com:444/','https://pokesurvivor.com/auth','https://pokesurvivor.com/?token=x','https://pokesurvivor.com/?code=x','https://pokesurvivor.com/#signin','https://a:b@pokesurvivor.com/']){assert.equal(U.allowedLocation(new URL(url)),false,url);const doc=new Document();vm.runInNewContext(source,{document:doc,window:{location:new URL(url)}});assert.equal(doc.head.children.length,0);assert.equal(Object.keys(doc.listeners).length,0);}
for(const pattern of [/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|eval)\b/,/\.innerHTML\s*=/,/window\.(?:parent|top)/,/\.value\s*=/])assert.equal(pattern.test(source),false,String(pattern));
assert.equal((source.match(/new MutationObserver/g)||[]).length,1);assert.ok(source.includes('const DATA=PSKO_MOVE_DATA;'));
console.log('move-tier-ui: fit/mono, neutral grades, menu/dex scoping, native identity, restoration, idempotency and guards passed (fake DOM only)');
