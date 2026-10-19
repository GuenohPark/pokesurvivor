// Node built-ins only. Fake DOM tests are executable but do not test browser layout.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../src/tier-ui.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const { allowedLocation, parseDex, tierLabel, formatNumber } = require(sourcePath);
const location = value => new URL(value);
for (const host of ['pokesurvivor.com', 'www.pokesurvivor.com']) {
  for (const route of ['/', '/index.html', '/dev.html']) assert.equal(allowedLocation(location('https://' + host + route)), true);
}
for (const url of ['http://pokesurvivor.com/', 'https://pokesurvivor.com.evil.test/', 'https://evil.test/', 'https://pokesurvivor.com/auth', 'https://pokesurvivor.com:444/', 'https://pokesurvivor.com/?authorization=secret', 'https://pokesurvivor.com/#/signin', 'https://pokesurvivor.com/play', 'https://pokesurvivor.com/index.html/extra', 'https://pokesurvivor.com/?token=secret', 'https://pokesurvivor.com/#auth', 'https://pokesurvivor.com/?code=secret', 'https://user:pass@pokesurvivor.com/']) assert.equal(allowedLocation(location(url)), false, url);
assert.equal(allowedLocation(null), false);
for (const [text, dex] of [['001 ★', 1], ['Nº 150 · Kanto', 150], ['No. 025', 25], ['번호 ００６ 즐겨찾기', 6], ['도감 번호 1025', 1025], ['???', null], ['', null], ['000', null], ['10000', null]]) assert.equal(parseDex(text), dex, text);
assert.equal(tierLabel({grade: 'S', label: 'do not trust'}), 'S 후보');
assert.equal(tierLabel({grade: 'A+'}), 'A+ 후보');
assert.equal(tierLabel({grade: 'OFFENSE'}), '화력 특화');
assert.equal(tierLabel({grade: 'B'}), '미평가');
assert.equal(tierLabel(null), '미평가');
assert.equal(formatNumber(1.2345), '1.23');
assert.equal(formatNumber(0), '0');
assert.equal(formatNumber(Infinity), '자료 없음');
assert.equal(formatNumber('<img>'), '자료 없음');
class Element {
  constructor(tag) { this.tagName = tag.toLowerCase(); this.nodeType = 1; this.attrs = {}; this.children = []; this.parentElement = null; this.value = ''; }
  get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
  get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
  get textContent() { return this.value + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.value = String(v); this.children.forEach(c => { c.parentElement = null; }); this.children = []; }
  get previousElementSibling() { if (!this.parentElement) return null; const siblings = this.parentElement.children; return siblings[siblings.indexOf(this) - 1] || null; }
  get nextElementSibling() { if (!this.parentElement) return null; const siblings = this.parentElement.children; return siblings[siblings.indexOf(this) + 1] || null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.hasOwn(this.attrs, k) ? this.attrs[k] : null; }
  addEventListener() {}
  appendChild(child) { child.remove(); this.children.push(child); child.parentElement = this; return child; }
  remove() { if (!this.parentElement) return; const p = this.parentElement; p.children.splice(p.children.indexOf(this), 1); this.parentElement = null; }
  before(child) { const parent = this.parentElement; child.remove(); parent.children.splice(parent.children.indexOf(this), 0, child); child.parentElement = parent; }
  after(child) { const parent = this.parentElement; child.remove(); parent.children.splice(parent.children.indexOf(this) + 1, 0, child); child.parentElement = parent; }
  matches(selector) {
    if (selector.startsWith('[')) return this.getAttribute(selector.slice(1, -1)) !== null;
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return selector.slice(1).split('.').every(c => this.className.split(/\s+/).includes(c));
    return this.tagName === selector;
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement && this.parentElement.closest(selector); }
  querySelectorAll(selector) {
    const parts = selector.split(' '), all = [];
    const visit = el => { for (const child of el.children) { if (child.matches(parts[parts.length - 1])) { let p = child.parentElement, i = parts.length - 2; while (p && i >= 0) { if (p.matches(parts[i])) i--; p = p.parentElement; } if (i < 0) all.push(child); } visit(child); } };
    visit(this); return all;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
class Document {
  constructor() { this.documentElement = new Element('html'); this.head = this.createElement('head'); this.body = this.createElement('body'); this.documentElement.appendChild(this.head); this.documentElement.appendChild(this.body); }
  createElement(tag) { return new Element(tag); }
  getElementById(id) { return this.documentElement.querySelector('#' + id); }
  querySelector(selector) { return this.documentElement.querySelector(selector); }
  querySelectorAll(selector) { return this.documentElement.querySelectorAll(selector); }
}
const document = new Document();
const make = (tag, parent, attrs = {}, text = '') => { const n = document.createElement(tag); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); n.textContent = text; parent.appendChild(n); return n; };
const grid = make('div', document.body, {id: 'dex-grid'});
function card(dex, selected) { const n = make('div', grid, {class: 'cell' + (selected ? ' on' : '')}); make('span', n, {class: 'no'}, dex); make('span', n, {}, '???'); return n; }
const first = card('001 ★', true), second = card('002', false);
let detail = make('div', document.body, {id: 'dex-detail'});
let center = make('div', detail, {class: 'center'});
make('div', center, {}, 'Nº 001 · Kanto');
let heading = make('h3', center, {}, '???');
const action = make('button', detail, {}, 'Original action');
let callback, observerCount = 0, frames = [];
const data = {sourceVersion: 'v-source', version: 'test', sourceCommit: 'abc123', conditions: '<b>조건은 텍스트</b>', ratings: {1: {grade: 'S', reason: '<img onerror=bad>분석 근거'}, 2: {grade: 'OFFENSE', reason: '화력'}}, species: {1: {ko: '이상해씨', hp: 500, speed: 160, speedJudgment: 137.5, offenseIndex: 1.25}}};
const context = vm.createContext({document, window: {location: location('https://pokesurvivor.com/dev.html'), requestAnimationFrame: fn => frames.push(fn)}, MutationObserver: class { constructor(cb) { callback = cb; observerCount++; } observe() {} }, PSKO_TIER_DATA: data });
const run = () => vm.runInContext(source, context);
const mutation = (target, extra = {}) => callback([{type: 'childList', target, addedNodes: [], removedNodes: [], ...extra}]);
const flush = () => { const queue = frames; frames = []; queue.forEach(fn => fn()); };
run();
assert.equal(observerCount, 1);
assert.equal(document.querySelectorAll('.psko-tier-badge').length, 2);
assert.equal(first.querySelector('.psko-tier-badge').textContent, 'S 후보');
assert.equal(document.getElementById('psko-tier-detail'), null, 'unknown species must not disclose stats');
heading.textContent = '이상해씨'; mutation(heading); mutation(grid); assert.equal(frames.length, 1, 'batch into one frame'); flush();
const panel = document.getElementById('psko-tier-detail');
assert.equal(center.nextElementSibling, panel);
assert.equal(panel.nextElementSibling, action, 'original action buttons remain');
assert.match(panel.textContent, /500/); assert.match(panel.textContent, /137.5/); assert.match(panel.textContent, /계수, DPS 아님/); assert.match(panel.textContent, /현재 계정의 실제 강화 수치/); assert.match(panel.textContent, /<img onerror=bad>/); assert.equal(panel.querySelector('img'), null);
assert.match(panel.textContent, /abc123/); assert.match(panel.textContent, /v-source/); assert.match(panel.textContent, /<b>조건은 텍스트<\/b>/);
mutation(grid); flush(); assert.equal(document.getElementById('psko-tier-detail'), panel, 'idempotent panel rendering');
mutation(panel); assert.equal(frames.length, 0, 'ignore owned target');
mutation(first, {addedNodes: [first.querySelector('.psko-tier-badge')]}); assert.equal(frames.length, 0, 'ignore owned insertions');
const hud = make('div', document.body, {id: 'hud'}, '00:01');
mutation(hud); mutation(hud, {type: 'attributes'}); mutation(document.body, {addedNodes: [hud]}); assert.equal(frames.length, 0, 'HUD/game changes must not schedule a dex scan');
const third = card('003', false); mutation(grid, {addedNodes: [third]}); flush(); assert.equal(third.querySelector('.psko-tier-badge').textContent, '미평가', 'lazy-loaded cards');
first.className = 'cell'; second.className = 'cell on'; heading.textContent = '???'; mutation(second, {type: 'attributes'}); flush(); assert.equal(document.getElementById('psko-tier-detail'), null, 'selection must remove stale stats');
heading.textContent = '이상해풀'; mutation(heading); flush(); assert.match(document.getElementById('psko-tier-detail').textContent, /화력 특화/);
second.className = 'cell'; center.querySelector('div').textContent = '번호 ００３ · 관동'; heading.textContent = '이상해꽃'; mutation(center); flush(); assert.match(document.getElementById('psko-tier-detail').textContent, /미평가 = 하위 등급 아님/, 'detail number fallback');
detail.remove(); mutation(document.body, {removedNodes: [detail]}); flush(); assert.equal(document.getElementById('psko-tier-detail'), null);
detail = make('div', document.body, {id: 'dex-detail'}); center = make('div', detail, {class: 'center'}); make('div', center, {}, 'No. 001'); heading = make('h3', center, {}, '이상해씨'); mutation(document.body, {addedNodes: [detail]}); flush(); assert.ok(document.getElementById('psko-tier-detail'), 'remount');
run(); assert.equal(observerCount, 1, 'duplicate injection adds no observer'); assert.equal(document.querySelectorAll('.psko-tier-badge').length, 3); assert.equal(document.querySelectorAll('#psko-tier-legend').length, 1);
for (const n of document.querySelectorAll('[data-psko-own]')) { assert.equal(n.getAttribute('translate'), 'no'); for (const child of n.children) assert.notEqual(child.getAttribute('data-psko-own'), null, 'inserted descendants marked'); }
const link = document.getElementById('psko-tier-legend').querySelector('a'); assert.equal(link.rel, 'noopener noreferrer'); assert.equal(link.target, '_blank');
// An unsupported route must never mount or create an observer.
let deniedObservers = 0;
const deniedDocument = new Document();
vm.runInNewContext(source, {document: deniedDocument, window: {location: location('https://pokesurvivor.com/auth')}, MutationObserver: class { constructor() { deniedObservers++; } }});
assert.equal(deniedObservers, 0); assert.equal(deniedDocument.getElementById('psko-tier-style'), null);
// Static checks supplement the executable fake-DOM tests, not browser verification.
for (const pattern of [/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|eval)\b/, /\bG\s*\./, /\.innerHTML\s*=/, /window\.top/, /window\.parent/]) assert.equal(pattern.test(source), false, 'forbidden API: ' + pattern);
assert.equal((source.match(/new MutationObserver/g) || []).length, 1);
assert.match(source, /const DATA=PSKO_TIER_DATA;/);
console.log('tier-ui: pure utility, executable fake-DOM lifecycle/idempotence, and static safety checks passed (not a browser/layout test)');

const built=require('node:fs').readFileSync(require('node:path').join(__dirname,'../dist/pokesurvivor-ko-menu.user.js'),'utf8');
assert(!built.includes('const DATA=PSKO_TIER_DATA;'),'bundled tier data placeholder must be replaced, not its comment');
