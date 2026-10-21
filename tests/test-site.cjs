'use strict';

// Pure Node: no network, browser, package dependencies, or generated files.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('site/install.js');
const html = read('site/index.html');
const css = read('site/style.css');
const workflow = read('.github/workflows/pages.yml');
let count = 0;
function test(name, fn) {
  fn();
  count++;
  console.log('ok ' + count + ' - ' + name);
}
function load(extra = {}) {
  const context = vm.createContext({ module: { exports: {} }, URL, ...extra });
  vm.runInContext(source, context, { filename: 'site/install.js', timeout: 1000 });
  return context.module.exports;
}
class Element {
  constructor(attrs = {}) {
    this.attrs = { ...attrs };
    this.listeners = {};
    this.hidden = false;
    this.textContent = '';
    this.focused = false;
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  focus() { this.focused = true; }
  fire(name, event = {}) { this.listeners[name]?.(event); }
}
function fakeDOM() {
  const keys = ['pc', 'android', 'iphone'];
  const tabs = keys.map(key => new Element({ 'data-platform-tab': key }));
  const panels = keys.map(key => new Element({ 'data-platform-panel': key }));
  const tablist = new Element();
  tablist.hidden = true;
  const advisory = new Element();
  const doc = {
    querySelectorAll(selector) {
      if (selector === '[data-platform-tab]') return tabs;
      if (selector === '[data-platform-panel]') return panels;
      throw Error('Unexpected selector: ' + selector);
    },
    querySelector(selector) {
      assert.equal(selector, '.platform-tabs');
      return tablist;
    },
    getElementById(id) {
      assert.equal(id, 'device-advisory');
      return advisory;
    }
  };
  return { doc, tabs, panels, tablist, advisory };
}
const api = load();

test('exports load in VM without document or navigator', () => {
  for (const name of ['detectPlatform', 'isSafeUrl', 'init']) assert.equal(typeof api[name], 'function');
  assert.equal(api.init(), null);
  assert.equal(api.detectPlatform(), 'pc');
});
test('PC, Android and iOS advisory detection', () => {
  assert.equal(api.detectPlatform({ userAgent: 'Windows NT 10.0 Chrome/130', platform: 'Win32' }), 'pc');
  assert.equal(api.detectPlatform({ userAgent: 'X11; Linux x86_64 Firefox/130' }), 'pc');
  assert.equal(api.detectPlatform({ userAgent: 'Linux; Android 14 Firefox/130' }), 'android');
  assert.equal(api.detectPlatform({ userAgent: 'iPhone OS 18_0 like Mac OS X' }), 'iphone');
  assert.equal(api.detectPlatform({ userAgent: 'iPad; CPU OS 17_0' }), 'iphone');
  assert.equal(api.detectPlatform({ userAgent: 'iPod touch' }), 'iphone');
});
test('desktop iPad uses Mac platform and multiple touch points', () => {
  assert.equal(api.detectPlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 }), 'iphone');
  assert.equal(api.detectPlatform({ userAgent: 'Macintosh Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 0 }), 'pc');
  assert.equal(api.detectPlatform({ platform: 'MacIntel', maxTouchPoints: 1 }), 'pc');
});
test('advice never mutates navigator', () => {
  const nav = Object.freeze({ userAgent: 'Android', platform: 'Linux', maxTouchPoints: 5 });
  api.detectPlatform(nav);
  assert.equal(nav.userAgent, 'Android');
});
test('automatic initialization updates tab ARIA and panel states', () => {
  const dom = fakeDOM();
  load({ document: dom.doc, navigator: { userAgent: 'Android' } });
  assert.equal(dom.tablist.hidden, false);
  assert.deepEqual(dom.tabs.map(tab => tab.getAttribute('aria-selected')), ['false', 'true', 'false']);
  assert.deepEqual(dom.tabs.map(tab => tab.getAttribute('tabindex')), ['-1', '0', '-1']);
  assert.deepEqual(dom.panels.map(panel => panel.hidden), [true, false, true]);
  dom.panels.forEach((panel, i) => {
    assert.equal(panel.getAttribute('role'), 'tabpanel');
    assert.equal(panel.getAttribute('aria-labelledby'), 'tab-' + ['pc', 'android', 'iphone'][i]);
  });
  assert.match(dom.advisory.textContent, /추천: Android/);
});
test('manual override works in either direction without changing install URL', () => {
  const dom = fakeDOM();
  const controller = api.init(dom.doc, { userAgent: 'iPhone' });
  dom.tabs[0].fire('click');
  assert.equal(controller.getPlatform(), 'pc');
  assert.match(dom.advisory.textContent, /직접 선택/);
  assert.deepEqual(dom.panels.map(panel => panel.hidden), [false, true, true]);
  dom.tabs[1].fire('click');
  assert.equal(controller.getPlatform(), 'android');
  dom.tabs[2].fire('click');
  assert.equal(controller.getPlatform(), 'iphone');
  assert.equal(controller.selectPlatform('javascript:alert(1)', true), false);
  assert.equal(controller.getPlatform(), 'iphone');
  assert.equal(api.INSTALL_URL, 'https://raw.githubusercontent.com/GuenohPark/pokesurvivor/main/dist/pokesurvivor.user.js');
});
test('keyboard arrows wrap and Home/End focus the active tab', () => {
  const dom = fakeDOM();
  const controller = api.init(dom.doc, {});
  let prevented = 0;
  const key = (index, value) => dom.tabs[index].fire('keydown', { key: value, preventDefault() { prevented++; } });
  key(0, 'ArrowLeft');
  assert.equal(controller.getPlatform(), 'iphone');
  assert.equal(dom.tabs[2].focused, true);
  key(2, 'ArrowRight');
  assert.equal(controller.getPlatform(), 'pc');
  key(0, 'End');
  assert.equal(controller.getPlatform(), 'iphone');
  key(2, 'Home');
  assert.equal(controller.getPlatform(), 'pc');
  key(0, 'Escape');
  assert.equal(prevented, 4);
});
test('incomplete DOM leaves progressive fallback untouched', () => {
  const dom = fakeDOM();
  dom.doc.querySelectorAll = () => [];
  assert.equal(api.init(dom.doc, {}), null);
  assert.equal(dom.tablist.hidden, true);
  assert.equal(dom.panels.some(panel => panel.hidden), false);
});
test('URL safety rejects executable, relative, credential and malformed input', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,x', 'http://example.com', '//evil.test', '/local', 'https://name:secret@example.com', 'https://example.com\\@evil.test', 'https://example.com\n', '', null, {}]) {
    assert.equal(api.isSafeUrl(value), false, String(value));
  }
  assert.equal(api.isSafeUrl(api.INSTALL_URL), true);
  assert.equal(api.isSafeUrl('https://www.tampermonkey.net/?browser=firefox'), true);
});
test('no-JS fallback keeps install link and all three guides visible', () => {
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<noscript>/);
  const anchor = html.match(/<a\b[^>]*class="button primary"[^>]*>/);
  assert.ok(anchor);
  assert.ok(anchor[0].includes('href="' + api.INSTALL_URL + '"'));
  const panels = [...html.matchAll(/<section\b[^>]*data-platform-panel="[^"]+"[^>]*>/g)];
  assert.equal(panels.length, 3);
  panels.forEach(panel => assert.doesNotMatch(panel[0], /\bhidden\b/));
  assert.match(html, /class="platform-tabs"[^>]*hidden/);
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});
test('all external links are HTTPS and new tabs have safe rel values', () => {
  for (const match of html.matchAll(/<a\b[^>]*>/g)) {
    const tag = match[0];
    const href = tag.match(/href="([^"]+)"/)?.[1];
    assert.ok(href);
    assert.ok(href === './' || href.startsWith('#') || api.isSafeUrl(href), href);
    if (tag.includes('target="_blank"')) {
      assert.match(tag, /rel="noopener noreferrer"/);
    }
  }
  for (const url of [
    'https://www.tampermonkey.net/',
    'https://apps.apple.com/app/tampermonkey/id6738342400',
    'https://play.google.com/store/apps/details?id=org.mozilla.firefox',
    'https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/',
    'https://www.tampermonkey.net/?browser=firefox'
  ]) assert.ok(html.includes('href="' + url + '"'), url);
  assert.match(html, /README\.md#chrome-/);
  assert.match(html, /README\.md#android-/);
  assert.match(html, /Chrome ZIP·수동 설치/);
  assert.match(html, /Android APK/);
});
test('local assets only, no remote code, tracking, storage or installed checks', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.match(scripts[0][1], /src="\.\/install\.js"/);
  assert.match(scripts[0][1], /\bdefer\b/);
  assert.equal(scripts[0][2], '');
  assert.match(html, /href="\.\/style\.css"/);
  assert.doesNotMatch(html, /\son\w+\s*=|<iframe|<form|<img|<link[^>]+(?:preconnect|dns-prefetch)/i);
  assert.doesNotMatch(css, /@import|url\s*\(/i);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|eval|Function)\s*\(|document\.cookie|localStorage|sessionStorage|chrome\.|browser\.|GM_info|unsafeWindow|navigator\.plugins|postMessage|innerHTML|outerHTML|document\.write/);
  assert.match(html, /Tampermonkey 설치 여부를 감지하지 않습니다/);
  assert.doesNotMatch(html, /Tampermonkey가 설치되어 있습니다|설치 확인 완료|설치가 감지/);
});
test('scope, honest limitations and accessibility remain explicit', () => {
  for (const text of [JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version, '@grant none', '@sandbox raw', 'document-start', 'CSP', 'fallback', '미검증', 'iOS 15', '일반 Safari 탭', 'PWA', '자동 로더', '백그라운드 중단', '판을 마친 뒤', '로그인·저장', 'iframe', '인증 페이지']) assert.ok(html.includes(text), text);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="tablist"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media\s*\(max-width: 767px\)/);
  assert.doesNotMatch(html + css + source, /—|\p{Extended_Pictographic}/u);
  assert.ok(fs.statSync(path.join(root, 'site/.nojekyll')).isFile(), 'The marker must exist; its content is irrelevant to Pages');
});
test('Pages uses trusted successful main runs and least-privilege deployment', () => {
  assert.match(workflow, /^name: Deploy installation page/m);
  assert.match(workflow, /workflows: \['Build and publish'\]/);
  assert.match(workflow, /types: \[completed\]/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/);
  assert.match(workflow, /workflow_run\.repository\.full_name == github\.repository/);
  assert.match(workflow, /workflow_run\.head_repository\.full_name == github\.repository/);
  assert.match(workflow, /workflow_run\.event == 'push'/);
  assert.match(workflow, /uses: actions\/checkout@v4\s+with:\s+ref: main\s+persist-credentials: false/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v3\s+with:\s+path: site\//);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /needs: build/);
  assert.match(workflow, /pages: write\s+id-token: write/);
  assert.match(workflow, /name: github-pages/);
  assert.equal((workflow.match(/pages: write/g) || []).length, 1);
  assert.doesNotMatch(workflow, /contents: write|pull_request_target|head_sha|download-artifact/);
});
console.log('\n' + count + ' installation page checks passed.');
