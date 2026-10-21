// DOM-only, read-only Pokemon name badges. The builder replaces PSKO_TIER_DATA.
(function () {
'use strict';
function allowedLocation(location) {
  return !!location && location.protocol === 'https:' &&
    /^(www\.)?pokesurvivor\.com$/.test(location.hostname || '') &&
    (!location.port || location.port === '443') &&
    ['/', '/index.html', '/dev.html'].includes(location.pathname) &&
    !/(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test((location.search || '') + (location.hash || '')) &&
    !(location.username || location.password);
}
function parseDex(value) {
  const text = String(value == null ? '' : value).replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xff10));
  const match = text.match(/(?:^|[^0-9])([0-9]{1,4})(?![0-9])/);
  const number = match ? Number(match[1]) : 0;
  return number > 0 && number <= 9999 ? number : null;
}
function tierLabel(rating) { return ({ S: 'S', 'A+': 'A+', OFFENSE: '화력' })[rating && rating.grade] || ''; }
function badgeTitle(rating) {
  const label = ({ S: 'S 후보', 'A+': 'A+ 후보', OFFENSE: '화력 특화 후보' })[rating && rating.grade];
  return label ? '풀강화 기준 비공식 잠정 ' + label + (rating.reason ? ' · ' + String(rating.reason) : '') : '미평가 · 아직 평가 자료가 없습니다. 낮은 등급을 뜻하지 않습니다.';
}
function knownName(value) { return !!String(value || '').trim() && !/[?？]/.test(String(value)); }
function normalizeName(value) { return String(value == null ? '' : value).normalize('NFC').trim().toLowerCase(); }
function buildNameLookup(species) {
  const names = new Map();
  for (const [key, mon] of Object.entries(species || {})) {
    const dex = Number(key);
    if (!Number.isInteger(dex) || dex <= 0 || !mon) continue;
    for (const name of [mon.name, mon.ko]) {
      if (!knownName(name)) continue;
      const normalized = normalizeName(name);
      names.set(normalized, names.has(normalized) && names.get(normalized) !== dex ? null : dex);
    }
  }
  return names;
}
// Never consume our own badge text, SVG titles, or accessibility-only icon text.
// Native name text nodes and icon nodes are never rewritten or replaced.
function nativeText(root) {
  if (!root) return '';
  if (root.nodeType === 3) return root.nodeValue || '';
  if (root.nodeType !== 1) return '';
  if (root.matches('.psko-tier-badge, svg, [aria-hidden="true"], [role="img"], .sr-only, .visually-hidden')) return '';
  return Array.from(root.childNodes || []).map(nativeText).join('');
}
function detailDex(value) {
  const match = String(value || '').match(/(?:\bNo\.?|\bN[º°]|번호)\s*([0-9０-９]{1,4})(?![0-9０-９])/i);
  return match ? parseDex(match[1]) : null;
}
function formatNumber(value) { return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '자료 없음'; }
const utils = { allowedLocation, parseDex, tierLabel, badgeTitle, knownName, detailDex, formatNumber, normalizeName, buildNameLookup, nativeText };
if (typeof document === 'undefined') {
  if (typeof module !== 'undefined' && module.exports) module.exports = utils;
  return;
}
if (!allowedLocation(window.location)) return;
const DATA=PSKO_TIER_DATA;
const OWN = 'data-psko-own';
for (const id of ['psko-tier-detail', 'psko-tier-legend', 'psko-tier-style']) {
  const old = document.getElementById(id); if (old) old.remove();
}
if (document.getElementById('psko-tier-badge-style')) return;
function node(tag, text, className) {
  const element = document.createElement(tag);
  element.setAttribute(OWN, ''); element.setAttribute('translate', 'no');
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
const style = node('style'); style.id = 'psko-tier-badge-style';
style.textContent = '.psko-tier-badge{display:inline-block;position:static;box-sizing:border-box;vertical-align:baseline;font:inherit;font-size:10px;font-weight:600;line-height:1.2;padding:1px 3px;margin:0 0 0 4px;color:#f4d275;background:#202c3b;border:1px solid #806b3e;border-radius:3px;white-space:nowrap}.psko-tier-badge[data-tier="OFFENSE"]{color:#a9d9ef}.psko-tier-badge[data-tier="UNRATED"]{color:#bac0c8;background:#272c33;border-color:#606872}';
(document.head || document.documentElement).appendChild(style);
const names = buildNameLookup(DATA.species);
const nameSelector = [
  '#dex-grid .cell > b', '#dex-detail .center h3', '#menu-partner-name',
  '#pull-results .pcard > b', '#lobby-members .lob-card > small',
  '#over-caught > div > small', '#goals-body .leg-cell > small',
  '#goals-body .fav-slot > b', '#fav-grid .cell > b', '#prof-favs .fav-slot > b',
  '#psko-search-results .psko-pokemon-name'
].join(', ');
const rootSelector = ['dex-grid', 'dex-detail', 'menu-partner-name', 'pull-results', 'lobby-members', 'over-caught', 'goals-body', 'fav-grid', 'prof-favs', 'psko-search-results', 'upg-mon', 'rk-dl', 'rk-poke', 'rk-clear'].map(id => '#' + id).join(', ');
const optionSelector = '#upg-mon option, #rk-dl option';
const hosts = new Set();
const optionLabels = new WeakMap();
const adjacentBadges = new WeakMap();
// A trusted visible label without an exact identity is unassessed, never rated.
const UNASSESSED = Symbol('unassessed visible name');
function ratingFor(dex) { return dex === UNASSESSED ? null : DATA.ratings && DATA.ratings[dex]; }
function nameDex(text) { return knownName(text) ? names.get(normalizeName(text)) || null : null; }
function dexFor(name) {
  let text = nativeText(name).trim();
  if (name.matches('#over-caught > div > small')) text = text.replace(/\s*·[\s\S]*$/, '').trim();
  const dex = nameDex(text);
  if (name.matches('#dex-grid .cell > b') && name.parentElement.matches('.locked')) return null;
  if (name.matches('#dex-detail .center h3')) {
    const grid = document.getElementById('dex-grid');
    const selected = grid && grid.querySelector('.cell.on');
    if (selected && selected.matches('.locked')) return null;
  }
  if (name.matches('#psko-search-results .psko-pokemon-name')) {
    const key = name.getAttribute('data-psko-dex');
    if (!/^\d+$/.test(key || '') || Number(key) !== dex) return null;
    return dex;
  }
  return dex || (knownName(text) ? UNASSESSED : null);
}
function isOurs(target) {
  const el = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(el && el.closest && el.closest('.psko-tier-badge, #psko-tier-badge-style'));
}
function decorate(name, dex, adjacent) {
  let badge = null;
  const scope = adjacent ? name.parentElement : name;
  const previous = adjacentBadges.get(name);
  if (previous && (!dex || !scope || name.nextElementSibling !== previous)) {
    previous.remove(); adjacentBadges.delete(name);
  }
  if (!scope) { hosts.delete(name); return; }
  // Only tier UI nodes are ours, not the Korean search module's owned wrapper.
  scope.querySelectorAll('.psko-tier-badge').forEach(existing => {
    const correct = adjacent ? name.nextElementSibling === existing : existing.parentElement === name;
    if (dex && correct && !badge) badge = existing;
    else if (!adjacent || correct) existing.remove();
  });
  if (!dex) { hosts.delete(name); return; }
  if (!badge) {
    badge = node('span', '', 'psko-tier-badge');
    if (adjacent) name.after(badge); else name.appendChild(badge);
  }
  if (adjacent) adjacentBadges.set(name, badge);
  hosts.add(name);
  const rating = ratingFor(dex), label = tierLabel(rating) || '미평가';
  if (badge.textContent !== label) badge.textContent = label;
  for (const [key, value] of [['data-tier', tierLabel(rating) ? rating.grade : 'UNRATED'], ['title', badgeTitle(rating)], ['aria-label', badgeTitle(rating)]]) {
    if (badge.getAttribute(key) !== value) badge.setAttribute(key, value);
  }
}
function decorateOption(option) {
  const current = option.getAttribute('label');
  let saved = optionLabels.get(option);
  if (!saved || current !== saved.last) saved = { original: current, last: current };
  const value = option.value;
  const dex = option.closest('#upg-mon') ? (/^\d+$/.test(value) && DATA.species && DATA.species[Number(value)] ? Number(value) : null) : nameDex(value);
  const label = dex ? (saved.original == null ? nativeText(option) || value : saved.original) + ' [' + (tierLabel(ratingFor(dex)) || '미평가') + ']' : saved.original;
  if (current !== label) {
    if (label == null) option.removeAttribute('label'); else option.setAttribute('label', label);
  }
  saved.last = label; optionLabels.set(option, saved);
}
function render() {
  if(globalThis.__PSKO_BOOT?.isAllowed&&!globalThis.__PSKO_BOOT.isAllowed())return;
  // Remove stale badges when a once-safe host is moved out of its whitelist.
  for (const host of Array.from(hosts)) {
    if (!document.documentElement.contains(host) || (!host.matches(nameSelector) && !host.matches('#rk-poke'))) decorate(host, null, adjacentBadges.has(host));
  }
  document.querySelectorAll(nameSelector).forEach(name => decorate(name, dexFor(name), false));
  document.querySelectorAll(optionSelector).forEach(decorateOption);
  const rank = document.getElementById('rk-poke');
  if (rank) decorate(rank, nameDex(rank.value), true);
}
let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => { queued = false; render(); });
}
// Delegation survives remounts and never changes an input's value or native handlers.
for (const type of ['input', 'change']) document.addEventListener(type, event => {
  if (event.target && event.target.id === 'rk-poke') schedule();
});
document.addEventListener('click', event => {
  const target = event.target && event.target.closest && event.target.closest('#rk-clear');
  if (target) schedule();
});
function relevant(target, attributes) {
  const el = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(el && el.closest && (el.matches(rootSelector) || el.closest(nameSelector + ', ' + optionSelector) || el.closest('#dex-grid, #dex-detail') || (attributes && !el.matches('html, body') && Array.from(hosts).some(host => el.contains(host)))));
}
function containsScope(target) {
  return !!(target && target.nodeType === 1 && (target.matches(rootSelector + ', ' + nameSelector + ', ' + optionSelector) || target.querySelector(rootSelector + ', ' + nameSelector + ', ' + optionSelector)));
}
const observer = new MutationObserver(records => {
  if (records.some(record => {
    if (isOurs(record.target)) return false;
    if (record.type === 'childList') {
      const changed = [...record.addedNodes, ...record.removedNodes];
      if (changed.length && changed.every(isOurs)) return false;
      return relevant(record.target) || changed.some(containsScope);
    }
    return relevant(record.target, record.type === 'attributes');
  })) schedule();
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'id', 'value', 'data-psko-dex'] });
render();
globalThis.__PSKO_BOOT?.registerFeature('tiers',()=>{observer.disconnect();observer.observe(document.documentElement,{ childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'id', 'value', 'data-psko-dex'] });if(!document.getElementById(style.id))(document.head||document.documentElement).appendChild(style);render();});
})();
