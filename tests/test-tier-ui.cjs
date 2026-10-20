// Node built-ins only. Fake DOM tests do not test browser layout.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../src/tier-ui.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const { allowedLocation, parseDex, tierLabel, badgeTitle, knownName, detailDex, formatNumber } = require(sourcePath);
const location = value => new URL(value);
for (const host of ['pokesurvivor.com', 'www.pokesurvivor.com']) {
  for (const route of ['/', '/index.html', '/dev.html']) assert.equal(allowedLocation(location('https://' + host + route)), true);
}
for (const url of ['http://pokesurvivor.com/', 'https://pokesurvivor.com.evil.test/', 'https://evil.test/', 'https://pokesurvivor.com/auth', 'https://pokesurvivor.com:444/', 'https://pokesurvivor.com/?authorization=secret', 'https://pokesurvivor.com/#/signin', 'https://pokesurvivor.com/play', 'https://pokesurvivor.com/index.html/extra', 'https://pokesurvivor.com/?token=secret', 'https://pokesurvivor.com/#auth', 'https://pokesurvivor.com/?code=secret', 'https://user:pass@pokesurvivor.com/']) assert.equal(allowedLocation(location(url)), false, url);
assert.equal(allowedLocation(null), false);
for (const [text, dex] of [['001 ★', 1], ['Nº 150 · Kanto', 150], ['No. 025', 25], ['번호 ００６ 즐겨찾기', 6], ['도감 번호 1025', 1025], ['???', null], ['', null], ['000', null], ['10000', null]]) assert.equal(parseDex(text), dex, text);
assert.equal(tierLabel({grade: 'S', label: 'do not trust'}), 'S');
assert.equal(tierLabel({grade: 'A+'}), 'A+');
assert.equal(tierLabel({grade: 'OFFENSE'}), '화력');
for (const rating of [null, {}, {grade: 'B'}]) { assert.equal(tierLabel(rating), ''); assert.equal(badgeTitle(rating), ''); }
assert.equal(badgeTitle({grade: 'S', reason: '<img>근거'}), '풀강화 기준 비공식 잠정 S 후보 · <img>근거');
for (const name of ['', ' ', '???', '？？？', '??? 이상해씨']) assert.equal(knownName(name), false);
assert.equal(knownName('이상해씨'), true);
for (const [text, dex] of [['Name No. 001 · Kanto', 1], ['번호 ００６', 6], ['Nº 150', 150], ['HP 500', null], ['No. 10000', null]]) assert.equal(detailDex(text), dex);
assert.equal(formatNumber(1.2345), '1.23');
assert.equal(formatNumber(Infinity), '자료 없음');
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
let grid = make('div', document.body, {id: 'dex-grid'});
function card(dex, name, extraClass = '') {
  const cell = make('div', grid, {class: 'cell ' + extraClass});
  make('span', cell, {class: 'no'}, dex);
  make('b', cell, {}, name);
  return cell;
}
const first = card('001 ★', 'Bulbasaur', 'on');
const second = card('002', 'Ivysaur');
const unknown = card('001', '???', 'locked');
const lockedVisible = card('001', 'Bulbasaur', 'locked');
const unrated = card('003', 'Venusaur');
const hidden = card('001', '？？？');
const aPlus = card('004', 'Charmander');
const notNative = make('div', grid, {class: 'cell'}); make('span', notNative, {class: 'no'}, '001'); make('span', notNative, {}, 'not a native name');
let detail = make('div', document.body, {id: 'dex-detail'});
let center = make('div', detail, {class: 'center'});
make('div', center, {}, 'No. 001 · Kanto');
let heading = make('h3', center, {}, 'Bulbasaur');
const action = make('button', detail, {}, 'Original action');
const originalFirstName = first.querySelector('b');
let actionCalls = 0;
action.onclick = () => actionCalls++;
// Simulate upgrading the old UI. Its sentinel must not prevent badges mounting.
for (const id of ['psko-tier-style', 'psko-tier-detail', 'psko-tier-legend']) make('aside', document.body, {id}, 'old UI');
make('span', first, {class: 'psko-tier-badge'}, 'S 후보');
let callback, observerCount = 0, frames = [], observerOptions;
const data = {sourceVersion: 'v-source', version: 'test', sourceCommit: 'abc123', conditions: 'Unused conditions', ratings: {1: {grade: 'S', reason: '<img onerror=bad>분석 근거'}, 2: {grade: 'OFFENSE', reason: '화력 근거'}, 4: {grade: 'A+', reason: 'A+ 근거'}}, species: {1: {ko: '이상해씨', hp: 500, speed: 160, speedJudgment: 137.5, offenseIndex: 1.25}}};
const dataBefore = JSON.stringify(data);
const context = vm.createContext({document, window: {location: location('https://pokesurvivor.com/dev.html'), requestAnimationFrame: fn => frames.push(fn)}, MutationObserver: class { constructor(cb) { callback = cb; observerCount++; } observe(target, options) { observerOptions = options; } }, PSKO_TIER_DATA: data });
const run = () => vm.runInContext(source, context);
const mutation = (target, extra = {}) => callback([{type: 'childList', target, addedNodes: [], removedNodes: [], ...extra}]);
const flush = () => { const queue = frames; frames = []; queue.forEach(fn => fn()); };
const badge = node => node.querySelector('.psko-tier-badge');
function noPanels() {
  for (const id of ['psko-tier-legend', 'psko-tier-detail', 'psko-tier-style']) assert.equal(document.getElementById(id), null, id);
  for (const tag of ['a', 'details', 'summary', 'dl', 'aside', 'section']) assert.equal(document.querySelector(tag), null, tag + ' must not be created');
}
run();
assert.equal(observerCount, 1);
assert.ok(document.getElementById('psko-tier-badge-style'));
assert.equal(observerOptions.characterData, true);
assert.deepEqual(Array.from(observerOptions.attributeFilter), ['class', 'id']);
assert.equal(document.querySelectorAll('.psko-tier-badge').length, 4);
assert.equal(badge(first).textContent, 'S');
assert.equal(badge(second).textContent, '화력');
assert.equal(badge(aPlus).textContent, 'A+');
for (const cell of [unknown, lockedVisible, unrated, hidden, notNative]) assert.equal(badge(cell), null);
assert.equal(originalFirstName.nextElementSibling, badge(first));
assert.equal(first.querySelector('b'), originalFirstName);
assert.equal(originalFirstName.textContent, 'Bulbasaur');
assert.equal(originalFirstName.children.length, 0, 'badge is outside original name');
assert.equal(heading.nextElementSibling, badge(detail));
assert.equal(heading.textContent, 'Bulbasaur');
assert.equal(heading.children.length, 0);
assert.equal(center.nextElementSibling, action, 'native detail layout/actions untouched');
assert.equal(badge(first).getAttribute('title'), '풀강화 기준 비공식 잠정 S 후보 · <img onerror=bad>분석 근거');
assert.equal(badge(first).getAttribute('aria-label'), badge(first).getAttribute('title'));
assert.equal(document.querySelector('img'), null, 'reason is text, never HTML');
assert.doesNotMatch(document.body.textContent, /500|137\.5|abc123|Unused conditions|분석 근거/);
noPanels();
const firstBadge = badge(first), detailBadge = badge(detail);
mutation(grid); mutation(heading); assert.equal(frames.length, 1, 'batch into one frame'); flush();
assert.equal(badge(first), firstBadge); assert.equal(badge(detail), detailBadge);
mutation(firstBadge); mutation(firstBadge, {type: 'attributes'});
mutation(first, {addedNodes: [firstBadge]}); mutation(first, {removedNodes: [firstBadge]});
assert.equal(frames.length, 0, 'badge writes do not create observer loops');
const hud = make('div', document.body, {id: 'hud'}, '00:01');
const auth = make('div', document.body, {id: 'auth'}, 'Login');
for (const outside of [hud, auth]) { mutation(outside); mutation(outside, {type: 'attributes'}); mutation(document.body, {addedNodes: [outside]}); }
assert.equal(frames.length, 0, 'HUD/auth changes do not schedule scans');
// Translation changes the original name only, never consuming badge text.
originalFirstName.textContent = '이상해씨'; heading.textContent = '이상해씨';
mutation(originalFirstName, {type: 'characterData'}); mutation(heading); flush();
assert.equal(originalFirstName.textContent, '이상해씨'); assert.equal(heading.textContent, '이상해씨');
assert.equal(badge(first), firstBadge); assert.equal(badge(detail), detailBadge);
const lazy = card('002', '이상해풀'); mutation(grid, {addedNodes: [lazy]}); flush(); assert.equal(badge(lazy).textContent, '화력');
// Locked/hidden or unassessed cards never retain stale badges.
first.className = 'cell locked'; mutation(first, {type: 'attributes'}); flush(); assert.equal(badge(first), null);
first.className = 'cell'; first.querySelector('b').textContent = '???'; mutation(first); flush(); assert.equal(badge(first), null);
second.className = 'cell on'; heading.textContent = '???'; mutation(second, {type: 'attributes'}); flush(); assert.equal(badge(detail), null);
heading.textContent = '이상해풀'; mutation(heading); flush(); assert.equal(badge(detail).textContent, '화력');
second.className = 'cell on locked'; mutation(second, {type: 'attributes'}); flush(); assert.equal(badge(detail), null);
second.className = 'cell'; center.querySelector('div').textContent = '번호 ００４ · 관동'; heading.textContent = '파이리'; mutation(center); flush(); assert.equal(badge(detail).textContent, 'A+', 'No. fallback without selection');
center.querySelector('div').textContent = 'HP 500'; mutation(center); flush(); assert.equal(badge(detail), null, 'do not mistake stats for a dex number');
center.querySelector('div').textContent = 'No. 003'; mutation(center); flush(); assert.equal(badge(detail), null, 'unrated detail');
// Heading replacement and whole-root remounts must recover without duplicates.
heading.remove(); heading = make('h3', center, {}, '이상해씨'); center.querySelector('div').textContent = 'No. 001'; mutation(center); flush();
assert.equal(heading.nextElementSibling, badge(detail)); assert.equal(detail.querySelectorAll('.psko-tier-badge').length, 1);
detail.remove(); mutation(document.body, {removedNodes: [detail]}); flush();
detail = make('div', document.body, {id: 'dex-detail'}); center = make('div', detail, {class: 'center'}); make('div', center, {}, 'No. 001'); heading = make('h3', center, {}, '이상해씨');
mutation(document.body, {addedNodes: [detail]}); flush(); assert.equal(heading.nextElementSibling, badge(detail));
const oldGrid = grid; oldGrid.remove(); grid = make('div', document.body, {id: 'dex-grid'}); const remounted = card('004', '파이리', 'on');
mutation(document.body, {removedNodes: [oldGrid], addedNodes: [grid]}); flush(); assert.equal(badge(remounted).textContent, 'A+');
run(); assert.equal(observerCount, 1, 'duplicate injection adds no observer');
assert.equal(document.querySelectorAll('.psko-tier-badge').length, 2);
noPanels();
for (const n of document.querySelectorAll('[data-psko-own]')) assert.equal(n.getAttribute('translate'), 'no');
action.onclick(); assert.equal(actionCalls, 1, 'native actions untouched');
assert.equal(JSON.stringify(data), dataBefore, 'data/account input unchanged');
for (const url of ['https://pokesurvivor.com/auth', 'https://pokesurvivor.com/?token=secret', 'https://evil.test/']) {
  let deniedObservers = 0;
  const deniedDocument = new Document();
  vm.runInNewContext(source, {document: deniedDocument, window: {location: location(url)}, MutationObserver: class { constructor() { deniedObservers++; } }});
  assert.equal(deniedObservers, 0); assert.equal(deniedDocument.head.children.length, 0); assert.equal(deniedDocument.body.children.length, 0);
}
for (const pattern of [/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|eval)\b/, /\bG\s*\./, /\.innerHTML\s*=/, /window\.top/, /window\.parent/, /addEventListener/, /node\(['"](?:aside|section|details|summary|dl|a)['"]/]) assert.equal(pattern.test(source), false, 'forbidden API/UI: ' + pattern);
assert.equal((source.match(/new MutationObserver/g) || []).length, 1);
assert.match(source, /const DATA=PSKO_TIER_DATA;/);
assert.match(source, /#dex-detail \.center h3\{display:inline-block\}/);
console.log('tier-ui: badge-only utilities, ownership, safe text, scoped lifecycle/idempotence and safety checks passed (fake DOM, not browser/layout test)');
