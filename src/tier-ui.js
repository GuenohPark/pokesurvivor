// DOM-only, read-only Pokédex reference. The builder replaces PSKO_TIER_DATA.
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
  return ({ S: 'S 후보', 'A+': 'A+ 후보', OFFENSE: '화력 특화' })[rating && rating.grade] || '미평가';
}
function formatNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '자료 없음';
}
const utils = { allowedLocation, parseDex, tierLabel, formatNumber };
if (typeof document === 'undefined') {
  if (typeof module !== 'undefined' && module.exports) module.exports = utils;
  return;
}
if (!allowedLocation(window.location)) return;
const DATA=PSKO_TIER_DATA;
const OWN = 'data-psko-own';
// A DOM sentinel also prevents duplicate observers when the script is injected twice.
if (document.getElementById('psko-tier-style')) return;
function node(tag, text, className) {
  const element = document.createElement(tag);
  element.setAttribute(OWN, ''); element.setAttribute('translate', 'no');
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
const style = node('style'); style.id = 'psko-tier-style';
style.textContent = '#psko-tier-legend,#psko-tier-detail{box-sizing:border-box;font:inherit;font-size:12px;line-height:1.6;color:#e4e7ed;background:#172131;border:1px solid #ad8c43;padding:8px 10px;margin:8px 0;text-align:left;overflow-wrap:anywhere;min-width:0}#psko-tier-legend a,#psko-tier-detail summary{color:#f4d275}#psko-tier-detail h4{font:inherit;font-weight:bold;color:#f4d275;margin:0 0 5px}#psko-tier-detail p{margin:4px 0}#psko-tier-detail dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2px 10px;margin:7px 0}#psko-tier-detail dt,#psko-tier-detail dd{margin:0}#psko-tier-detail dd{text-align:right}#psko-tier-detail details{margin-top:6px}#psko-tier-detail summary{cursor:pointer}#dex-grid .psko-tier-badge{display:block;position:static;box-sizing:border-box;max-width:100%;font:inherit;font-size:10px;line-height:1.4;padding:1px 3px;margin:3px 0 0;color:#f4d275;background:#202c3b;border:1px solid #806b3e;white-space:normal;pointer-events:none}#dex-grid .psko-tier-badge[data-tier="OFFENSE"]{color:#a9d9ef}#dex-grid .psko-tier-badge[data-tier="UNRATED"]{color:#b7bec7;border-color:#535f70}@media(max-width:480px){#psko-tier-detail,#psko-tier-legend{font-size:11px;padding:7px}#dex-grid .psko-tier-badge{font-size:9px}}';
(document.head || document.documentElement).appendChild(style);
function ratingFor(dex) { return DATA.ratings && DATA.ratings[dex]; }
function owns(target) {
  const element = target && (target.nodeType === 1 ? target : target.parentElement);
  return !!(element && element.closest && element.closest('[' + OWN + ']'));
}
function addLegend(grid) {
  let legend = document.getElementById('psko-tier-legend');
  if (!legend) {
    legend = node('aside'); legend.id = 'psko-tier-legend';
    legend.addEventListener('click', event => event.stopPropagation());
    legend.appendChild(node('span', '풀강화 잠정 티어 · 미평가는 하위 등급이 아닙니다 '));
    const link = node('a', '평가 문서');
    link.href = 'https://github.com/GuenohPark/pokesurvivor/blob/main/docs/TIERS.md';
    link.target = '_blank'; link.rel = 'noopener noreferrer'; legend.appendChild(link);
  }
  if (grid.previousElementSibling !== legend) grid.before(legend);
}
function decorateCards(grid) {
  grid.querySelectorAll('.cell').forEach(cell => {
    const number = cell.querySelector('.no');
    const dex = parseDex(number && number.textContent);
    const rating = ratingFor(dex);
    let badge = cell.querySelector('.psko-tier-badge');
    if (!badge) { badge = node('span', '', 'psko-tier-badge'); cell.appendChild(badge); }
    const label = tierLabel(rating);
    if (badge.textContent !== label) badge.textContent = label;
    const grade = label === '미평가' ? 'UNRATED' : rating.grade;
    if (badge.getAttribute('data-tier') !== grade) badge.setAttribute('data-tier', grade);
  });
}
let lastPanel = null;
let lastKey = '';
function updateDetail() {
  const detail = document.getElementById('dex-detail');
  const center = detail && detail.querySelector('.center');
  const heading = center && center.querySelector('h3');
  const selected = document.querySelector('#dex-grid .cell.on .no');
  const fallback = center && center.querySelector('div');
  const dex = parseDex(selected && selected.textContent) || parseDex(fallback && fallback.textContent);
  const name = heading ? heading.textContent.trim() : '';
  let panel = document.getElementById('psko-tier-detail');
  // Never disclose species statistics behind a hidden/unknown Pokédex heading.
  if (!center || !name || /[?？]/.test(name) || !dex) {
    if (panel) panel.remove(); lastPanel = null; lastKey = ''; return;
  }
  const key = String(dex) + ':' + name;
  if (panel && panel === lastPanel && key === lastKey && center.nextElementSibling === panel) return;
  if (panel) panel.remove();
  panel = node('section'); panel.id = 'psko-tier-detail';
  // Native summary is keyboard-operable and toggles closed without selecting a card.
  panel.addEventListener('click', event => event.stopPropagation());
  panel.addEventListener('keydown', event => event.stopPropagation());
  panel.setAttribute('aria-label', '풀강화 잠정 티어 참고');
  const rating = ratingFor(dex);
  const stats = DATA.species && DATA.species[dex];
  panel.appendChild(node('h4', '풀강화 잠정 티어 · ' + tierLabel(rating)));
  panel.appendChild(node('p', rating && rating.reason ? rating.reason : '미평가 = 하위 등급 아님'));
  if (stats) {
    const list = node('dl');
    const entries = [['풀강화 시작 HP', stats.hp], ['일반 이동속도', stats.speed], ['30분 이후 이동속도', stats.speedJudgment], ['정규화 화력 지수 (계수, DPS 아님)', stats.offenseIndex]];
    entries.forEach(([label, value]) => { list.appendChild(node('dt', label)); list.appendChild(node('dd', formatNumber(value))); });
    panel.appendChild(list);
  } else panel.appendChild(node('p', '상세 수치 자료 없음'));
  panel.appendChild(node('p', '현재 계정의 실제 강화 수치는 사용하지 않습니다. 풀강화 기준의 잠정 분석이며 전투를 시뮬레이션하지 않았습니다.'));
  const criteria = node('details'); criteria.appendChild(node('summary', '평가 기준'));
  criteria.appendChild(node('p', String(DATA.conditions || '평가 조건 자료 없음')));
  criteria.appendChild(node('p', '데이터 버전: ' + String(DATA.version || '미지정') + ' · 소스 커밋: ' + String(DATA.sourceCommit || '미지정') + (DATA.sourceVersion ? ' · 소스 버전: ' + String(DATA.sourceVersion) : '')));
  panel.appendChild(criteria);
  center.after(panel); lastPanel = panel; lastKey = key;
}
function render() {
  const grid = document.getElementById('dex-grid');
  if (grid) { addLegend(grid); decorateCards(grid); }
  else { const legend = document.getElementById('psko-tier-legend'); if (legend) legend.remove(); }
  updateDetail();
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
