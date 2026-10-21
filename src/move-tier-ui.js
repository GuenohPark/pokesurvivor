// Read-only base-move badges. Builder replaces the exact DATA sentinel below.
(function () {
'use strict';
function allowedLocation(loc) {
  return !!loc && loc.protocol === 'https:' && /^(www\.)?pokesurvivor\.com$/.test(loc.hostname || '') &&
    (!loc.port || loc.port === '443') && ['/', '/index.html', '/dev.html'].includes(loc.pathname) &&
    !/(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test((loc.search || '') + (loc.hash || '')) && !(loc.username || loc.password);
}
function normalize(value) { return String(value == null ? '' : value).normalize('NFC').trim().toLowerCase(); }
function known(value) { return !!normalize(value) && !/[?？]/.test(String(value)); }
function lookup(items, aliases) {
  const map = new Map();
  for (const [id, item] of Object.entries(items || {})) for (const name of aliases(item)) {
    if (!known(name)) continue;
    const key = normalize(name); map.set(key, map.has(key) && map.get(key) !== id ? null : id);
  }
  return map;
}
function nativeText(root) {
  if (!root) return '';
  if (root.nodeType === 3) return root.nodeValue || '';
  if (root.nodeType !== 1 || root.matches('.psko-move-badge, .psko-tier-badge, svg, [aria-hidden="true"], [role="img"], .sr-only, .visually-hidden')) return '';
  return Array.from(root.childNodes || []).map(nativeText).join('');
}
function isBuff(move) { return !!move && (move.kind === 'buff' || ['patk', 'satk', 'spd', 'def', 'regen'].includes(move.stat)); }
function directDamage(move) { return !!move && !isBuff(move) && typeof move.dmg === 'number' && move.dmg > 0; }
// Exact source G.Stats.fit semantics, independent of the neutral role grade.
function fit(mon, cat) {
  if (!mon || !cat || mon.pa == null) return 1;
  return (cat === 'special' ? mon.sa : mon.pa) / mon.atk;
}
function monoBonus(mon, move, multiplier = 1.2) {
  return directDamage(move) && mon && Array.isArray(mon.types) && mon.types.length === 1 && mon.types[0] === move.type ? multiplier : 1;
}
function attackCoefficient(mon, move, attackMultiplier = 1.4, monoMultiplier = 1.2) {
  if (!directDamage(move) || !mon || !['physical', 'special'].includes(move.cat)) return null;
  const side = move.cat === 'special' ? mon.sa : mon.pa;
  return typeof side === 'number' && Number.isFinite(side) ? side * attackMultiplier * monoBonus(mon, move, monoMultiplier) : null;
}
function fitLabel(mon, move) {
  if (!move || !mon) return '';
  if (isBuff(move)) return ({patk: '물리지원', satk: '특수지원', spd: '이동지원', def: '방어지원', regen: '회복지원'})[move.stat] || '';
  if (!directDamage(move) || !['physical', 'special'].includes(move.cat) || !Number.isFinite(mon.pa) || !Number.isFinite(mon.sa)) return '';
  if (mon.pa === mon.sa) return '균형형';
  return (move.cat === 'physical' ? '물리' : '특수') + ((move.cat === 'special' ? mon.sa > mon.pa : mon.pa > mon.sa) ? '적합' : '보조');
}
function roleLabel(move) {
  if (!move) return '미평가';
  const valid = x => ['S', 'A', 'B', '지원S', '지원A'].includes(x);
  if (move.wave === move.boss && /^지원[SA]$/.test(move.wave)) return move.wave;
  const labels = [];
  if (valid(move.wave)) labels.push('다' + move.wave);
  if (valid(move.boss)) labels.push('보' + move.boss);
  return labels.join('·') || '미평가';
}
function badgeInfo(mon, move, data = {}) {
  if (!move) return {text: '미평가', title: '미평가 · 알려진 기본 기술 자료가 없습니다. 낮은 등급을 뜻하지 않습니다.'};
  const label = fitLabel(mon, move), parts = [
    (move.ko || move.en || move.es || move.id) + ' · ' + roleLabel(move),
    'Lv5·영구강화 완료 가정의 비공식 잠정 중립 역할 추천 (다: 다수전, 보: 보스). 현재 플레이어 강화 상태가 아니며 실측 승률이 아닙니다.'
  ];
  if (label) parts.push(label);
  if (directDamage(move) && ['physical', 'special'].includes(move.cat)) {
    const coefficient = attackCoefficient(mon, move, data.attackMultiplier, data.monoMultiplier);
    if (coefficient != null && Number.isFinite(fit(mon, move.cat))) parts.push('직접피해 적합비 ' + fit(mon, move.cat).toFixed(3) + ' · 공격계수 ' + Number(coefficient.toFixed(3)) + ' (종족 공격능력 ×' + (data.attackMultiplier || 1.4) + ' ×단일타입 ' + monoBonus(mon, move, data.monoMultiplier) + ')');
    if (monoBonus(mon, move, data.monoMultiplier) > 1) parts.push('단일 타입 일치 직접피해 +20%');
  }
  if (isBuff(move) && mon && ((move.stat === 'patk' && mon.pa < mon.sa) || (move.stat === 'satk' && mon.sa < mon.pa))) parts.push('이 포켓몬의 약한 공격 쪽 지원입니다. 역할 등급은 변경하지 않습니다.');
  parts.push('독 비례피해·군중제어(CC)·회복은 직접피해 적합비로 환산하지 않습니다. 메뉴의 기본 기술 기준이며 런중 진화 상태는 추정하지 않습니다.');
  for (const key of ['condition', 'note', 'why']) if (move[key]) parts.push(String(move[key]));
  if (data.conditions) parts.push(typeof data.conditions === 'string' ? data.conditions : JSON.stringify(data.conditions));
  if (data.sourceCommit) parts.push('역할평가 소스 ' + data.sourceCommit);
  if (data.contextSourceCommit) parts.push('종별 적합도 확인 소스 ' + data.contextSourceCommit);
  return {text: roleLabel(move) + (label ? ' · ' + label : ''), title: parts.join('\n')};
}
const utils = {allowedLocation, normalize, lookup, nativeText, isBuff, directDamage, fit, monoBonus, attackCoefficient, fitLabel, roleLabel, badgeInfo};
if (typeof document === 'undefined') {
  if (typeof module !== 'undefined' && module.exports) module.exports = utils;
  return;
}
if (!allowedLocation(window.location)) return;
const DATA=PSKO_MOVE_DATA;
if (document.getElementById('psko-move-badge-style')) return;
const speciesNames = lookup(DATA.species, mon => [mon.name, mon.ko]);
const moveNames = lookup(DATA.moves, move => move.aliases || [move.es, move.en, move.ko]);
const badgeSelector = '.psko-move-badge';
const hostSelector = '#upg-list .ban-moves button[data-id], #upg-list button[data-start], #dex-detail p b.gold, #dex-detail .move-icons > span';
const optionSelector = '#upg-list .bind-slot select[data-slot] option';
const roots = '#upg-list, #upg-mon, #dex-detail, #dex-grid';
const hosts = new Set(), options = new Map();
function node(tag) { const n = document.createElement(tag); n.setAttribute('data-psko-own', ''); n.setAttribute('translate', 'no'); return n; }
const style = node('style'); style.id = 'psko-move-badge-style';
style.textContent = '.psko-move-badge{display:inline-block;position:static;vertical-align:baseline;margin-left:3px;padding:1px 3px;border:1px solid #667c88;border-radius:3px;background:#202c3b;color:#bedde7;font:600 9px/1.2 sans-serif;white-space:nowrap}.move-icons>span>.psko-move-badge{font-size:8px;padding:0 2px}';
(document.head || document.documentElement).appendChild(style);
function visible(el) {
  if (!el) return false;
  for (let p = el; p; p = p.parentElement) {
    if (p.getAttribute('hidden') !== null || p.getAttribute('aria-hidden') === 'true' || p.matches('.hidden') || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(p.getAttribute('style') || '')) return false;
  }
  return typeof el.getClientRects !== 'function' || el.getClientRects().length > 0;
}
function upgradeMon() {
  const select = document.getElementById('upg-mon');
  return select && /^\d+$/.test(select.value) ? DATA.species[Number(select.value)] || null : null;
}
function dexMon() {
  if (document.querySelector('#dex-grid .cell.on.locked')) return null;
  const heading = document.querySelector('#dex-detail .center h3');
  if (!visible(heading)) return null;
  const text = nativeText(heading), id = known(text) && speciesNames.get(normalize(text));
  if (!id) return null;
  const center = heading.closest('.center'), match = nativeText(center).match(/(?:\bNo\.?|\bN[º°]|번호)\s*([0-9０-９]{1,4})(?![0-9０-９])/i);
  if (match && Number(match[1].replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xff10))) !== Number(id)) return null;
  return DATA.species[id] || null;
}
function namedMove(text) { const id = known(text) && moveNames.get(normalize(text)); return id ? DATA.moves[id] : null; }
function resolveMove(host) {
  if (host.matches('#upg-list .ban-moves button[data-id]')) return DATA.moves[host.getAttribute('data-id')] || null;
  if (host.matches('#upg-list button[data-start]')) {
    // Only source-established translated Choose prefixes; never infer from a nickname.
    const match = nativeText(host).trim().match(/^(?:선택:|Choose:|Elegir:)\s*(.+)$/);
    return match ? namedMove(match[1]) : null;
  }
  return namedMove(host.matches('#dex-detail .move-icons > span') ? host.getAttribute('title') : nativeText(host));
}
function decorate(host, mon) {
  let badge = null;
  host.querySelectorAll(badgeSelector).forEach(n => { if (mon && n.parentElement === host && !badge) badge = n; else n.remove(); });
  if (!mon) { hosts.delete(host); return; }
  if (!badge) { badge = node('span'); badge.className = 'psko-move-badge'; host.appendChild(badge); }
  hosts.add(host);
  const info = badgeInfo(mon, resolveMove(host), DATA);
  if (badge.textContent !== info.text) badge.textContent = info.text;
  for (const [key, value] of [['title', info.title], ['aria-label', info.text]]) if (badge.getAttribute(key) !== value) badge.setAttribute(key, value);
}
function decorateOption(option, mon) {
  const current = option.getAttribute('label');
  let saved = options.get(option);
  if (!saved || current !== saved.last) saved = {original: current, last: current};
  let label = saved.original;
  if (mon && option.value) label = (saved.original == null ? nativeText(option) : saved.original) + ' [' + badgeInfo(mon, DATA.moves[option.value] || null, DATA).text + ']';
  if (current !== label) { if (label == null) option.removeAttribute('label'); else option.setAttribute('label', label); }
  saved.last = label;
  if (mon && option.value) options.set(option, saved); else options.delete(option);
}
function isDexStart(host) {
  if (!host.matches('#dex-detail p b.gold')) return false;
  const paragraph = host.parentElement;
  if (!paragraph || !paragraph.matches('p')) return false;
  let prefix = '';
  for (const child of Array.from(paragraph.childNodes || [])) {
    if (child === host) return /^(?:Empieza con|Starts with|시작 기술)$/.test(prefix.replace(/\s+/g, ' ').trim());
    prefix += nativeText(child);
  }
  return false;
}
function render() {
  const upg = upgradeMon(), dex = dexMon();
  for (const host of Array.from(hosts)) if (!document.documentElement.contains(host) || !host.matches(hostSelector)) decorate(host, null);
  document.querySelectorAll(hostSelector).forEach(host => {
    const mon = host.closest('#upg-list') ? upg : host.matches('#dex-detail p b.gold') && !isDexStart(host) ? null : dex;
    decorate(host, mon);
  });
  for (const option of Array.from(options.keys())) if (!document.documentElement.contains(option) || !option.matches(optionSelector)) decorateOption(option, null);
  document.querySelectorAll(optionSelector).forEach(option => decorateOption(option, upg));
}
let queued = false;
function schedule() { if (!queued) { queued = true; window.requestAnimationFrame(() => { queued = false; render(); }); } }
document.addEventListener('change', event => { if (event.target && event.target.id === 'upg-mon') schedule(); });
function isOurs(target) {
  const el = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(el && el.closest && el.closest('.psko-move-badge, #psko-move-badge-style'));
}
function inScope(target, ancestors = false) {
  const el = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(el && el.closest && (el.closest(roots) || (ancestors && (el.querySelector(roots) || Array.from(hosts).some(host => el.contains(host)) || Array.from(options.keys()).some(option => el.contains(option))))));
}
function containsScope(n) { return !!(n && n.nodeType === 1 && (n.matches(roots) || n.querySelector(roots))); }
const observer = new MutationObserver(records => {
  if (records.some(record => {
    if (isOurs(record.target)) return false;
    if (record.type === 'attributes' && record.attributeName === 'label') {
      const saved = options.get(record.target);
      if (saved && saved.last === record.target.getAttribute('label')) return false;
    }
    if (record.type === 'childList') {
      const changed = [...record.addedNodes, ...record.removedNodes];
      if (changed.length && changed.every(isOurs)) return false;
      return inScope(record.target) || changed.some(containsScope);
    }
    return inScope(record.target, record.type === 'attributes');
  })) schedule();
});
observer.observe(document.documentElement, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'id', 'value', 'title', 'label', 'hidden', 'aria-hidden', 'style', 'data-id', 'data-start', 'data-slot']});
render();
})();
