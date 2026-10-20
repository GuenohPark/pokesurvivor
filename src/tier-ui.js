// DOM-only, read-only Pokédex badges. The builder replaces PSKO_TIER_DATA.
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
function tierLabel(rating) {
  return ({ S: 'S', 'A+': 'A+', OFFENSE: '화력' })[rating && rating.grade] || '';
}
function badgeTitle(rating) {
  const label = ({ S: 'S 후보', 'A+': 'A+ 후보', OFFENSE: '화력 특화 후보' })[rating && rating.grade];
  return label ? '풀강화 기준 비공식 잠정 ' + label + (rating.reason ? ' · ' + String(rating.reason) : '') : '';
}
function knownName(value) { return !!String(value || '').trim() && !/[?？]/.test(String(value)); }
function detailDex(value) {
  const match = String(value || '').match(/(?:\bNo\.?|\bN[º°]|번호)\s*([0-9０-９]{1,4})(?![0-9０-９])/i);
  return match ? parseDex(match[1]) : null;
}
function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '자료 없음';
}
const utils = { allowedLocation, parseDex, tierLabel, badgeTitle, knownName, detailDex, formatNumber };
if (typeof document === 'undefined') {
  if (typeof module !== 'undefined' && module.exports) module.exports = utils;
  return;
}
if (!allowedLocation(window.location)) return;
const DATA=PSKO_TIER_DATA;
const OWN = 'data-psko-own';
// Remove obsolete reference panels, including when upgrading an already open page.
for (const id of ['psko-tier-detail', 'psko-tier-legend', 'psko-tier-style']) {
  const old = document.getElementById(id); if (old) old.remove();
}
// This sentinel is distinct from the former panel UI's sentinel.
if (document.getElementById('psko-tier-badge-style')) return;
function node(tag, text, className) {
  const element = document.createElement(tag);
  element.setAttribute(OWN, ''); element.setAttribute('translate', 'no');
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
const style = node('style'); style.id = 'psko-tier-badge-style';
style.textContent = '#dex-grid .cell>b{display:inline}#dex-detail .center h3{display:inline-block}#dex-grid .cell>.psko-tier-badge,#dex-detail .center h3+.psko-tier-badge{display:inline-block;position:static;box-sizing:border-box;vertical-align:baseline;font:inherit;font-size:10px;font-weight:600;line-height:1.2;padding:1px 3px;margin:0 0 0 4px;color:#f4d275;background:#202c3b;border:1px solid #806b3e;border-radius:3px;white-space:nowrap}#dex-grid .psko-tier-badge[data-tier="OFFENSE"],#dex-detail .psko-tier-badge[data-tier="OFFENSE"]{color:#a9d9ef}';
(document.head || document.documentElement).appendChild(style);
function ratingFor(dex) { return DATA.ratings && DATA.ratings[dex]; }
function cardName(cell) {
  return Array.from(cell.children).find(child => child.tagName.toLowerCase() === 'b') || null;
}
function owns(target) {
  const element = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(element && element.closest && element.closest('[' + OWN + ']'));
}
// Keep the native name and its text nodes untouched: the badge is a sibling.
function decorate(scope, name, rating) {
  const label = name && knownName(name.textContent) ? tierLabel(rating) : '';
  let badge = null;
  scope.querySelectorAll('.psko-tier-badge').forEach(existing => {
    if (label && !badge && existing.getAttribute(OWN) !== null && name.nextElementSibling === existing) badge = existing;
    else existing.remove();
  });
  if (!label) return;
  if (!badge) { badge = node('span', '', 'psko-tier-badge'); name.after(badge); }
  if (badge.textContent !== label) badge.textContent = label;
  for (const [key, value] of [['data-tier', rating.grade], ['title', badgeTitle(rating)], ['aria-label', badgeTitle(rating)]]) {
    if (badge.getAttribute(key) !== value) badge.setAttribute(key, value);
  }
}
function render() {
  const grid = document.getElementById('dex-grid');
  if (grid) grid.querySelectorAll('.cell').forEach(cell => {
    const number = cell.querySelector('.no');
    decorate(cell, cardName(cell), cell.matches('.locked') ? null : ratingFor(parseDex(number && number.textContent)));
  });
  const detail = document.getElementById('dex-detail');
  if (!detail) return;
  const center = detail.querySelector('.center');
  const heading = center && center.querySelector('h3');
  const selected = grid && grid.querySelector('.cell.on');
  const number = selected && selected.querySelector('.no');
  const dex = parseDex(number && number.textContent) || detailDex(center && center.textContent);
  const selectedName = selected && cardName(selected);
  const rating = selected && (selected.matches('.locked') || !selectedName || !knownName(selectedName.textContent)) ? null : ratingFor(dex);
  decorate(detail, heading, rating);
}
let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  window.requestAnimationFrame(() => { queued = false; render(); });
}
function isDexNode(target) {
  const element = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(element && element.closest && (element.closest('#dex-grid') || element.closest('#dex-detail')));
}
function containsDex(target) {
  return !!(target && target.nodeType === 1 &&
    (target.id === 'dex-grid' || target.id === 'dex-detail' ||
      (target.querySelector && (target.querySelector('#dex-grid') || target.querySelector('#dex-detail')))));
}
const observer = new MutationObserver(records => {
  if (records.some(record => {
    if (owns(record.target)) return false;
    if (record.type === 'childList') {
      const changed = [...record.addedNodes, ...record.removedNodes];
      if (changed.length && changed.every(owns)) return false;
    }
    if (isDexNode(record.target)) return true;
    return record.type === 'childList' &&
      [...record.addedNodes, ...record.removedNodes].some(containsDex);
  })) schedule();
});
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'id'] });
render();
})();
