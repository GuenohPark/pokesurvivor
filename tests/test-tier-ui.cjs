// Node built-ins only. Fake DOM tests verify behavior, not browser layout.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = path.join(__dirname, '../src/tier-ui.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const {allowedLocation, parseDex, tierLabel, badgeTitle, knownName, detailDex, formatNumber, normalizeName, buildNameLookup, nativeText} = require(sourcePath);
const location = value => new URL(value);
for (const host of ['pokesurvivor.com', 'www.pokesurvivor.com']) for (const route of ['/', '/index.html', '/dev.html']) assert.equal(allowedLocation(location('https://' + host + route)), true);
for (const url of ['http://pokesurvivor.com/', 'https://pokesurvivor.com.evil.test/', 'https://evil.test/', 'https://pokesurvivor.com/auth', 'https://pokesurvivor.com:444/', 'https://pokesurvivor.com/?authorization=secret', 'https://pokesurvivor.com/#/signin', 'https://pokesurvivor.com/play', 'https://pokesurvivor.com/index.html/extra', 'https://pokesurvivor.com/?token=secret', 'https://pokesurvivor.com/#auth', 'https://pokesurvivor.com/?code=secret', 'https://user:pass@pokesurvivor.com/']) assert.equal(allowedLocation(location(url)), false, url);
assert.equal(allowedLocation(null), false);
for (const [text, dex] of [['001 ★', 1], ['Nº 150 · Kanto', 150], ['No. 025', 25], ['번호 ００６ 즐겨찾기', 6], ['도감 번호 1025', 1025], ['???', null], ['', null], ['000', null], ['10000', null]]) assert.equal(parseDex(text), dex, text);
assert.equal(tierLabel({grade: 'S', label: 'do not trust'}), 'S');
assert.equal(tierLabel({grade: 'A+'}), 'A+'); assert.equal(tierLabel({grade: 'OFFENSE'}), '화력');
for (const rating of [null, {}, {grade: 'B'}]) {
  assert.equal(tierLabel(rating), ''); assert.match(badgeTitle(rating), /미평가/); assert.doesNotMatch(badgeTitle(rating), /후보|풀강화|잠정|B등급/);
}
assert.equal(badgeTitle({grade: 'S', reason: '<img>근거'}), '풀강화 기준 비공식 잠정 S 후보 · <img>근거');
for (const name of ['', ' ', '???', '？？？', '??? 이상해씨']) assert.equal(knownName(name), false);
assert.equal(knownName('이상해씨'), true);
for (const [text, dex] of [['Name No. 001 · Kanto', 1], ['번호 ００６', 6], ['Nº 150', 150], ['HP 500', null], ['No. 10000', null]]) assert.equal(detailDex(text), dex);
assert.equal(formatNumber(1.2345), '1.23'); assert.equal(formatNumber(Infinity), '자료 없음');
assert.equal(normalizeName(' E\u0301EVEE '), 'é evee'.replace(' ', ''));
const ambiguous = buildNameLookup({1: {name: 'Same', ko: '같음'}, 2: {name: 'Same', ko: '둘'}, 3: {name: 'same', ko: '셋'}});
assert.equal(ambiguous.get('same'), null); assert.equal(ambiguous.get('같음'), 1);
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
const document = new Document();
const make = (tag, parent, attrs = {}, text = '') => { const n = document.createElement(tag); for (const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); n.textContent = text; parent.appendChild(n); return n; };
const root = id => make('div', document.body, {id});
const grid = root('dex-grid');
function card(dex, name, cls = '') { const cell = make('div', grid, {class: 'cell ' + cls}); make('span', cell, {class: 'no'}, dex); make('b', cell, {}, name); return cell; }
const first = card('001 ★', 'Bulbasaur', 'on'), second = card('002', 'Ivysaur'), unrated = card('003', 'Venusaur');
const locked = card('001', 'Bulbasaur', 'locked'), unknown = card('001', '???'), fullUnknown = card('001', '？？？');
const detail = root('dex-detail'), center = make('div', detail, {class: 'center'});
make('div', center, {}, 'No. 001 · Kanto'); let heading = make('h3', center, {}, 'Bulbasaur');
const action = make('button', detail, {}, 'Original action'); let actionCalls = 0; action.onclick = () => actionCalls++;
const partner = make('div', document.body, {id: 'menu-partner-name'}, 'Bulbasaur ');
const partnerText = partner.childNodes[0]; const shiny = make('svg', partner, {role: 'img'}); make('title', shiny, {}, 'Shiny');
const pull = make('b', make('div', root('pull-results'), {class: 'pcard'}), {}, 'Charmander');
const lobby = make('div', root('lobby-members'), {class: 'lob-card'});
const nickname = make('b', lobby, {}, 'Bulbasaur'), lobbyName = make('small', lobby, {}, 'Ivysaur');
const caught = make('small', make('div', root('over-caught')), {}, 'Bulbasaur · ¡nuevo!');
const goals = root('goals-body');
const legend = make('small', make('div', goals, {class: 'leg-cell'}), {}, 'Bulbasaur');
const mystery = make('small', make('div', goals, {class: 'leg-cell'}), {}, '???');
const favorite = make('b', make('div', goals, {class: 'fav-slot'}), {}, 'Venusaur');
const favGrid = make('b', make('div', root('fav-grid'), {class: 'cell'}), {}, 'Charmander');
const profile = make('b', make('div', root('prof-favs'), {class: 'fav-slot'}), {}, 'Bulbasaur');
const search = make('div', root('psko-search-results'), {'data-psko-own': ''});
const searchName = make('span', search, {class: 'psko-pokemon-name', 'data-psko-dex': '1'}, '이상해씨');
make('small', search, {}, 'No. 001');
const upgrade = make('select', document.body, {id: 'upg-mon'});
const upgradeOption = make('option', upgrade, {value: '1'}, 'Bulbasaur (compañero) · 2 niveles');
const upgradeUnrated = make('option', upgrade, {value: '3'}, 'Venusaur');
const invalidOption = make('option', upgrade, {value: ''}, 'Choose');
upgrade.value = '1'; upgrade.selectedIndex = 0;
const datalist = make('datalist', document.body, {id: 'rk-dl'});
const rankOption = make('option', datalist, {value: 'Ivysaur'}), rankUnrated = make('option', datalist, {value: 'Venusaur'});
const rank = make('input', document.body, {id: 'rk-poke', value: 'Bulbasaur'});
const clear = make('button', document.body, {id: 'rk-clear'}, 'Clear'); clear.onclick = () => { rank.value = ''; };
const hud = make('div', document.body, {id: 'hud'}, '00:01'), user = make('b', document.body, {id: 'user-pill'}, 'Bulbasaur');
for (const id of ['psko-tier-style', 'psko-tier-detail', 'psko-tier-legend']) make('aside', document.body, {id}, 'old');
let callback, observerCount = 0, frames = [], observerOptions;
const data = {ratings: {1: {grade: 'S', reason: '<img onerror=bad>근거'}, 2: {grade: 'OFFENSE'}, 4: {grade: 'A+'}}, species: {1: {name: 'Bulbasaur', ko: '이상해씨'}, 2: {name: 'Ivysaur', ko: '이상해풀'}, 3: {name: 'Venusaur', ko: '이상해꽃'}, 4: {name: 'Charmander', ko: '파이리'}, 5: {name: 'Duplicate', ko: '중복1'}, 6: {name: 'Duplicate', ko: '중복2'}}};
const dataBefore = JSON.stringify(data);
const context = vm.createContext({document, window: {location: location('https://pokesurvivor.com/dev.html'), requestAnimationFrame: fn => frames.push(fn)}, MutationObserver: class { constructor(cb) { callback = cb; observerCount++; } observe(target, options) { observerOptions = options; } }, PSKO_TIER_DATA: data});
const run = () => vm.runInContext(source, context);
const mutation = (target, extra = {}) => callback([{type: 'childList', target, addedNodes: [], removedNodes: [], ...extra}]);
const flush = () => { const queue = frames; frames = []; queue.forEach(fn => fn()); };
const badge = node => node.querySelector('.psko-tier-badge');
const rankBadge = () => rank.nextElementSibling && rank.nextElementSibling.matches('.psko-tier-badge') ? rank.nextElementSibling : null;
const nativeNodes = [first.querySelector('b'), heading, partner, pull, lobbyName, caught, legend, favorite, favGrid, profile, searchName];
const before = nativeNodes.map(n => ({node: n, text: nativeText(n), children: [...n.childNodes]}));
run();
assert.equal(observerCount, 1); assert.equal(observerOptions.characterData, true);
assert.deepEqual(Array.from(observerOptions.attributeFilter), ['class', 'id', 'value', 'data-psko-dex']);
for (const [node, label] of [[first, 'S'], [second, '화력'], [unrated, '미평가'], [heading, 'S'], [partner, 'S'], [pull, 'A+'], [lobbyName, '화력'], [caught, 'S'], [legend, 'S'], [favorite, '미평가'], [favGrid, 'A+'], [profile, 'S'], [searchName, 'S']]) assert.equal(badge(node).textContent, label);
for (const n of [locked, unknown, fullUnknown, nickname, mystery, user, hud]) assert.equal(badge(n), null);
assert.equal(rankBadge().textContent, 'S'); assert.equal(rank.value, 'Bulbasaur');
for (const {node, text, children} of before) { assert.equal(nativeText(node), text); for (let i = 0; i < children.length; i++) assert.equal(node.childNodes[i], children[i], 'original native text/icon identity preserved'); assert.equal(badge(node).parentElement, node); }
assert.equal(partner.childNodes[0], partnerText); assert.equal(shiny.parentElement, partner); assert.equal(shiny.textContent, 'Shiny');
assert.equal(badge(first).getAttribute('title'), '풀강화 기준 비공식 잠정 S 후보 · <img onerror=bad>근거');
assert.equal(badge(first).getAttribute('title'), badge(first).getAttribute('aria-label'));
assert.equal(badge(unrated).getAttribute('data-tier'), 'UNRATED'); assert.match(badge(unrated).getAttribute('title'), /낮은 등급을 뜻하지/);
assert.equal(document.querySelector('img'), null);
assert.equal(upgradeOption.getAttribute('label'), 'Bulbasaur (compañero) · 2 niveles [S]');
assert.equal(upgradeUnrated.getAttribute('label'), 'Venusaur [미평가]');
assert.equal(upgradeOption.textContent, 'Bulbasaur (compañero) · 2 niveles'); assert.equal(upgradeOption.value, '1'); assert.equal(upgrade.value, '1'); assert.equal(upgrade.selectedIndex, 0);
assert.equal(rankOption.value, 'Ivysaur'); assert.equal(rankOption.textContent, ''); assert.equal(rankOption.getAttribute('label'), 'Ivysaur [화력]');
assert.equal(rankUnrated.getAttribute('label'), 'Venusaur [미평가]'); assert.equal(invalidOption.getAttribute('label'), null);
const initialCount = document.querySelectorAll('.psko-tier-badge').length, firstBadge = badge(first);
mutation(grid); mutation(heading); assert.equal(frames.length, 1); flush(); assert.equal(badge(first), firstBadge);
assert.equal(document.querySelectorAll('.psko-tier-badge').length, initialCount); assert.equal(upgradeOption.getAttribute('label').match(/\[S\]/g).length, 1);
mutation(firstBadge); mutation(firstBadge.childNodes[0], {type: 'characterData'}); mutation(firstBadge, {type: 'attributes'});
mutation(first.querySelector('b'), {addedNodes: [firstBadge]}); mutation(first.querySelector('b'), {removedNodes: [firstBadge]});
mutation(document.head, {addedNodes: [document.getElementById('psko-tier-badge-style')]});
assert.equal(frames.length, 0, 'only tier-owned badge/style mutations ignored');
for (const outside of [hud, user, nickname]) { mutation(outside); mutation(outside.childNodes[0], {type: 'characterData'}); mutation(outside, {type: 'attributes'}); mutation(document.body, {addedNodes: [outside]}); }
assert.equal(frames.length, 0, 'HUD and usernames, including same-species nicknames, do not scan');
partnerText.nodeValue = 'Venusaur '; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner).textContent, '미평가'); assert.equal(shiny.parentElement, partner);
partnerText.nodeValue = '??? '; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner), null);
partnerText.nodeValue = 'bUlBaSaUr '; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner).textContent, 'S');
partnerText.nodeValue = 'Duplicate'; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner).textContent, '미평가', 'ambiguous trusted label is neutral, never rated'); assert.equal(badge(partner).getAttribute('data-tier'), 'UNRATED');
partnerText.nodeValue = 'Bulbasaur prose'; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner).textContent, '미평가', 'no substring rating, trusted label remains neutral');
partnerText.nodeValue = 'Missing Translation'; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner).textContent, '미평가', 'missing-map trusted label remains neutral');
partnerText.nodeValue = ' '; mutation(partnerText, {type: 'characterData'}); flush(); assert.equal(badge(partner), null, 'empty trusted label is hidden');
for (const suffix of ['신규', '새로운 포켓몬', '새로 획득!', '¡nuevo!']) { caught.textContent = 'Bulbasaur · ' + suffix; mutation(caught); flush(); assert.equal(badge(caught).textContent, 'S', 'source-established status suffix: ' + suffix); assert.equal(nativeText(caught), 'Bulbasaur · ' + suffix); }
caught.textContent = '??? · 신규'; mutation(caught); flush(); assert.equal(badge(caught), null, 'status suffix does not expose unknown name');
partner.textContent = '이상해씨'.normalize('NFD'); mutation(partner); flush(); assert.equal(badge(partner).textContent, 'S', 'NFC matching');
first.className = 'cell on locked'; mutation(first, {type: 'attributes'}); flush(); assert.equal(badge(first), null); assert.equal(badge(heading), null);
first.className = 'cell on'; mutation(first, {type: 'attributes'}); flush(); assert.equal(badge(first).textContent, 'S');
heading.textContent = 'Venusaur'; mutation(heading); flush(); assert.equal(badge(heading).textContent, '미평가');
heading.textContent = '???'; mutation(heading); flush(); assert.equal(badge(heading), null);
const oldHeading = heading; heading.remove(); heading = make('h3', center, {}, '이상해풀'); mutation(center, {addedNodes: [heading], removedNodes: [oldHeading]}); flush(); assert.equal(badge(heading).textContent, '화력');
searchName.textContent = '이상해꽃'; searchName.setAttribute('data-psko-dex', '3'); mutation(searchName, {type: 'attributes'}); flush(); assert.equal(badge(searchName).textContent, '미평가', 'other module owned wrapper is not ignored');
const lateSearch = make('span', search, {class: 'psko-pokemon-name', 'data-psko-dex': '4'}, '파이리'); mutation(search, {addedNodes: [lateSearch]}); flush(); assert.equal(badge(lateSearch).textContent, 'A+');
lateSearch.textContent = 'Missing Translation'; mutation(lateSearch); flush(); assert.equal(badge(lateSearch), null, 'search stamped identity never uses missing-map fallback');
lateSearch.textContent = 'Duplicate'; lateSearch.setAttribute('data-psko-dex', '5'); mutation(lateSearch); flush(); assert.equal(badge(lateSearch), null, 'search stamped identity never uses ambiguous-name fallback');
lateSearch.textContent = '파이리'; lateSearch.setAttribute('data-psko-dex', '1'); mutation(lateSearch, {type: 'attributes'}); flush(); assert.equal(badge(lateSearch), null, 'invalid search identity is not decorated');
for (const [value, expected] of [['Venusaur', '미평가'], ['ivysaur', '화력'], ['Ivysaur extra', null], ['Missing Translation', null], ['???', null], ['Duplicate', null]]) { rank.value = value; document.event('input', rank); flush(); assert.equal(rank.value, value); assert.equal(rankBadge() && rankBadge().textContent, expected); }
rank.value = 'Bulbasaur'; document.event('change', rank); flush(); assert.equal(rankBadge().textContent, 'S');
clear.onclick(); document.event('click', clear); flush(); assert.equal(rank.value, ''); assert.equal(rankBadge(), null);
rank.inputValue = undefined; rank.setAttribute('value', 'Venusaur'); mutation(rank, {type: 'attributes'}); flush(); assert.equal(rankBadge().textContent, '미평가'); assert.equal(rank.value, 'Venusaur');
rank.value = ''; clear.className = 'hidden'; mutation(clear, {type: 'attributes'}); flush(); assert.equal(rankBadge(), null, 'native ranking tab clear class refreshes selected badge');
upgradeOption.setAttribute('value', '999'); mutation(upgradeOption, {type: 'attributes'}); flush(); assert.equal(upgradeOption.getAttribute('label'), null, 'restore original missing label on invalid dex');
upgradeOption.setAttribute('value', '2'); mutation(upgradeOption, {type: 'attributes'}); flush(); assert.equal(upgradeOption.getAttribute('label'), 'Bulbasaur (compañero) · 2 niveles [화력]');
upgradeOption.setAttribute('label', 'Translated option'); mutation(upgradeOption); flush(); assert.equal(upgradeOption.getAttribute('label'), 'Translated option [화력]');
const lateRoot = root('unused'); const lateName = make('div', lateRoot, {id: 'menu-partner-name'}, 'Charmander'); partner.remove(); mutation(document.body, {addedNodes: [lateRoot], removedNodes: [partner]}); flush(); assert.equal(badge(lateName).textContent, 'A+');
profile.parentElement.className = 'not-fav'; mutation(profile.parentElement, {type: 'attributes'}); flush(); assert.equal(badge(profile), null, 'remove badge when host leaves whitelist');
// Removing a rank input must not orphan its adjacent badge.
rank.value = 'Bulbasaur'; document.event('input', rank); flush(); const removedRankBadge = rankBadge();
rank.remove(); mutation(document.body, {removedNodes: [rank]}); flush(); assert.equal(removedRankBadge.parentElement, null);
const priorCount = document.querySelectorAll('.psko-tier-badge').length; run(); assert.equal(observerCount, 1); assert.equal(document.querySelectorAll('.psko-tier-badge').length, priorCount);
for (const id of ['psko-tier-style', 'psko-tier-detail', 'psko-tier-legend']) assert.equal(document.getElementById(id), null);
for (const tag of ['aside', 'section', 'details', 'summary', 'dl', 'a']) assert.equal(document.querySelector(tag), null);
action.onclick(); assert.equal(actionCalls, 1); assert.equal(JSON.stringify(data), dataBefore);
for (const url of ['https://pokesurvivor.com/auth', 'https://pokesurvivor.com/?token=secret', 'https://evil.test/']) {
  let deniedObservers = 0; const deniedDocument = new Document();
  vm.runInNewContext(source, {document: deniedDocument, window: {location: location(url)}, MutationObserver: class { constructor() { deniedObservers++; } }});
  assert.equal(deniedObservers, 0); assert.equal(deniedDocument.head.children.length, 0); assert.equal(deniedDocument.body.children.length, 0); assert.equal(Object.keys(deniedDocument.listeners).length, 0);
}
for (const pattern of [/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|eval)\b/, /\bG\s*\./, /\.innerHTML\s*=/, /window\.top/, /window\.parent/, /(?:rank|option)\.value\s*=/, /node\(['"](?:aside|section|details|summary|dl|a)['"]/]) assert.equal(pattern.test(source), false, 'forbidden API/UI: ' + pattern);
assert.equal((source.match(/new MutationObserver/g) || []).length, 1); assert.match(source, /const DATA=PSKO_TIER_DATA;/);
console.log('tier-ui: whitelist badges, neutral unassessed, native text/icons/inputs/options, scoped observer and auth guards passed (fake DOM, not browser layout)');
