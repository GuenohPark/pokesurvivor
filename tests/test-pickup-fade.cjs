'use strict';
// Offline only. Genuine pinned render/update code, synthetic entities, no accounts,
// browser, network, saves, deployment, or installation assertions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const fixture = path.join(__dirname, 'fixtures/pickup-current');
const modulePath = path.join(__dirname, '../src/pickup-fade-ui.js');
const tests = [];
function test(name, fn) { tests.push({name, fn}); }
function near(a, b, detail = '') { assert.ok(Math.abs(a - b) < 1e-12, `${detail}: ${a} != ${b}`); }
function plain(x) { return JSON.parse(JSON.stringify(x)); }
function pickup(kind = 'xp', x = 20, y = 0, extra = {}) {
  return {kind, x, y, pulled: true, vx: 0, vy: 0, t: 0.4, value: 5, ...extra};
}
let U;
function game(entries = [], opts = {}) {
  let cursor = 0, current = -1;
  const calls = [], seesCalls = [];
  const G = {
    Coop: {active: false, isHost: false},
    U: {rand: (a, b) => (a + b) / 2, dist2: (x, y, xx, yy) => (x - xx) ** 2 + (y - yy) ** 2,
      damp: (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt)},
    Game: {player: opts.focus || {x: 0, y: 0}},
    Camera: {sees(...args) {
      assert.equal(this, G.Camera, 'Camera.sees native receiver');
      current = cursor++;
      seesCalls.push({args, index: current});
      if (opts.onSees) opts.onSees(current, args);
      return !opts.culled?.includes(current);
    }}
  };
  for (const forbidden of ['Account', 'Save', 'Storage', 'User', 'Profile', 'localStorage']) {
    Object.defineProperty(G, forbidden, {get() { throw new Error('Forbidden game field: ' + forbidden); }});
  }
  const document = {createElement(tag) {
    assert.equal(tag, 'canvas');
    return {width: 0, height: 0, getContext() { return {fillRect() {}}; }};
  }};
  const realm = vm.createContext({G, document, Math: Object.assign(Object.create(Math), {random: () => 0.5})});
  for (const name of ['icons.js', 'pickup.js']) vm.runInContext(fs.readFileSync(path.join(fixture, name), 'utf8'), realm, {filename: name});
  G.Pickups.all().push(...entries.map(p => ({...p})));
  const original = G.Pickups.draw;
  const result = {native: true};
  G.Pickups.draw = function (...args) {
    const saved = [cursor, current]; cursor = 0; current = -1;
    calls.push({receiver: this, args});
    try { original.apply(this, args); return result; }
    finally { [cursor, current] = saved; }
  };
  const native = G.Pickups.draw, sees = G.Camera.sees;
  function context(options = {}) {
    const trace = [], writes = [];
    let alpha = options.alpha ?? 1;
    const ctx = {fillStyle: '', imageSmoothingEnabled: true};
    Object.defineProperty(ctx, 'globalAlpha', {configurable: true, get() { return alpha; }, set(v) { alpha = v; writes.push(v); }});
    for (const method of ['beginPath', 'ellipse', 'fill', 'arc', 'moveTo', 'lineTo', 'closePath', 'drawImage', 'fillRect']) {
      ctx[method] = function (...args) {
        assert.equal(this, ctx, 'Canvas method must retain native receiver: ' + method);
        if (options.throwMethod === method) throw options.error;
        trace.push({method, args: args.map(a => typeof a === 'object' && a !== null ? {width: a.width, height: a.height} : a), alpha, style: ctx.fillStyle, index: current});
      };
    }
    return {ctx, trace, writes};
  }
  return {G, native, sees, calls, seesCalls, result, context};
}
function adapter(g, extra = {}) {
  const a = U.createAdapter({getGame: () => g.G, isAllowed: () => true, ...extra});
  a.setEnabled(true); a.refresh();
  return a;
}
function render(g, ctx = g.context()) { const result = g.G.Pickups.draw(ctx.ctx); return {...ctx, result}; }
function expectedTrace(trace, entries, focus = {x: 0, y: 0}) {
  return trace.map(v => ({...v, alpha: v.alpha * U.opacityFor(entries[v.index], focus)}));
}
function tracesNear(actual, expected) {
  assert.equal(actual.length, expected.length, 'same number of canvas operations');
  for (let i = 0; i < actual.length; i++) {
    near(actual[i].alpha, expected[i].alpha, 'canvas op ' + i);
    assert.deepEqual({...actual[i], alpha: 1}, {...expected[i], alpha: 1}, 'canvas op ' + i);
  }
}

test('pinned genuine fixture hashes, commit, and license provenance', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(fixture, 'SOURCE.json'), 'utf8'));
  assert.equal(manifest.commit, '3c9641c9e782cf74afbde490f39cd60adf59e32b');
  assert.match(manifest.licenseUrl, /^https:\/\/polyformproject\.org\/licenses\/noncommercial\/1\.0\.0\/?$/);
  for (const name of ['pickup.js', 'icons.js']) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(fixture, name))).digest('hex'), manifest.files[name].sha256);
    assert.ok(manifest.files[name].url.includes(manifest.commit));
  }
  assert.equal(manifest.files['pickup.js'].sha256, '9b481659231b30d3c4127655635a94317c53ffcbacc077ad41f87e1e71dacf93');
  assert.equal(manifest.files['icons.js'].sha256, 'e52ecda71acd1f5bc4988c47956b36f9ebcf8f55560e5f44e584194910f2c0ec');
});
test('module exports agreed API without a browser', () => {
  U = require(modulePath);
  for (const name of ['opacityFor', 'createAdapter', 'allowedLocation']) assert.equal(typeof U[name], 'function', name);
  assert.ok(U.constants && typeof U.constants === 'object');
});
test('opacity smoothstep endpoints, midpoint, monotonicity, and clamp', () => {
  for (const kind of ['xp', 'xpBig', 'coin', 'heal']) {
    near(U.opacityFor(pickup(kind, 0), {x: 0, y: 0}), 0.2);
    near(U.opacityFor(pickup(kind, 20), {x: 0, y: 0}), 0.2);
    near(U.opacityFor(pickup(kind, 80), {x: 0, y: 0}), 0.6);
    near(U.opacityFor(pickup(kind, 50), {x: 0, y: 0}), 0.325);
    near(U.opacityFor(pickup(kind, 140), {x: 0, y: 0}), 1);
    near(U.opacityFor(pickup(kind, 10000), {x: 0, y: 0}), 1);
    let previous = 0;
    for (let x = 0; x <= 200; x++) { const value = U.opacityFor(pickup(kind, x), {x: 0, y: 0}); assert.ok(value >= previous); previous = value; }
    near(U.opacityFor(pickup(kind, 48, 64), {x: 0, y: 0}), 0.6);
  }
});
test('strict pulled true and non-target kinds stay fully opaque', () => {
  for (const pulled of [false, undefined, null, 0, 1, 'true']) assert.equal(U.opacityFor(pickup('xp', 0, 0, {pulled}), {x: 0, y: 0}), 1);
  for (const kind of ['magnet', 'bomb', 'ticket', 'ticket10', 'item', 'unknown']) assert.equal(U.opacityFor(pickup(kind, 0), {x: 0, y: 0}), 1);
});
test('invalid or missing coordinates and missing objects fail opaque', () => {
  for (const bad of [undefined, null, NaN, Infinity, -Infinity, '20', {}, true]) {
    assert.equal(U.opacityFor({...pickup(), x: bad}, {x: 0, y: 0}), 1);
    assert.equal(U.opacityFor({...pickup(), y: bad}, {x: 0, y: 0}), 1);
    assert.equal(U.opacityFor(pickup(), {x: bad, y: 0}), 1);
    assert.equal(U.opacityFor(pickup(), {x: 0, y: bad}), 1);
  }
  for (const p of [null, undefined, {}]) assert.equal(U.opacityFor(p, {x: 0, y: 0}), 1);
  for (const focus of [null, undefined, {}]) assert.equal(U.opacityFor(pickup(), focus), 1);
});
test('allowedLocation confines direct HTTPS game routes and excludes auth', () => {
  for (const host of ['pokesurvivor.com', 'www.pokesurvivor.com']) for (const route of ['/', '/index.html', '/dev.html']) assert.equal(U.allowedLocation(new URL('https://' + host + route)), true);
  for (const url of ['http://pokesurvivor.com/', 'https://pokesurvivor.net/', 'https://pokesurvivor.com.evil.test/', 'https://pokesurvivor.com:444/', 'https://user:pass@pokesurvivor.com/', 'https://pokesurvivor.com/login', 'https://pokesurvivor.com/?code=synthetic', 'https://pokesurvivor.com/#token=synthetic', 'https://pokesurvivor.com/?auth=1']) assert.equal(U.allowedLocation(new URL(url)), false, url);
  assert.equal(U.allowedLocation(null), false);
});
test('missing game is waiting-game and never installs', () => {
  const a = U.createAdapter({getGame: () => undefined, isAllowed: () => true});
  assert.equal(a.state.status, 'waiting-game'); a.setEnabled(true); a.refresh();
  assert.equal(a.state.status, 'waiting-game'); a.dispose(); a.dispose();
});
test('inactive route never touches getGame even through enabled/refresh/dispose', () => {
  let reads = 0;
  const a = U.createAdapter({getGame: () => { reads++; throw new Error('Inactive game read'); }, isAllowed: () => false});
  a.setEnabled(true); a.refresh(); a.setEnabled(false); a.refresh(); a.dispose();
  assert.equal(reads, 0);
});
test('empty draws do not activate probe; nonempty first draw preserves native alpha', () => {
  const g = game(), a = adapter(g);
  render(g); assert.notEqual(a.state.status, 'active');
  g.G.Pickups.all().push(pickup());
  const control = game([pickup()]);
  const native = render(control), probe = render(g);
  assert.deepEqual(probe.trace, native.trace);
  assert.equal(a.state.status, 'active'); assert.equal(probe.ctx.globalAlpha, 1);
  assert.equal(g.G.Camera.sees, g.sees); a.dispose();
});
test('genuine renderer all layers fade, including native icon drawImage', () => {
  const entries = ['xp', 'xpBig', 'coin', 'heal'].map((k, i) => pickup(k, 20 + i * 20));
  const control = game(entries), g = game(entries), a = adapter(g);
  const baseline = render(control);
  assert.deepEqual(render(g).trace, baseline.trace);
  const faded = render(g);
  tracesNear(faded.trace, expectedTrace(baseline.trace, entries));
  for (let i = 0; i < entries.length; i++) {
    const fills = faded.trace.filter(c => c.index === i && (c.method === 'fill' || c.method === 'drawImage'));
    const f = U.opacityFor(entries[i], {x: 0, y: 0});
    near(fills[0].alpha, 0.28 * f, 'shadow'); near(fills[1].alpha, 0.3 * f, 'glow'); near(fills[2].alpha, f, 'body');
  }
  assert.ok(faded.trace.some(c => c.method === 'drawImage'), 'genuine icons.js draws body');
  assert.equal(faded.ctx.globalAlpha, 1); assert.equal(g.G.Camera.sees, g.sees); a.dispose();
});
test('stationary and every non-target pickup have exact native trace', () => {
  const entries = [pickup('xp', 20, 0, {pulled: false}), ...['magnet', 'bomb', 'ticket', 'ticket10', 'item'].map(k => pickup(k, 20, 0, k === 'item' ? {value: 'star'} : {}))];
  const control = game(entries), g = game(entries), a = adapter(g); render(g);
  assert.deepEqual(render(g).trace, render(control).trace); a.dispose();
});
test('overlapping entries use list index rather than coordinates', () => {
  const entries = [pickup('xp'), pickup('coin', 20, 0, {pulled: false}), pickup('heal')];
  const control = game(entries), g = game(entries), a = adapter(g); render(g);
  tracesNear(render(g).trace, expectedTrace(render(control).trace, entries)); a.dispose();
});
test('culled entries still advance probe and fade cursor', () => {
  const entries = [pickup('xp', 20), pickup('coin', 80), pickup('xpBig', 110), pickup('heal', 140)];
  const control = game(entries, {culled: [0, 2]}), g = game(entries, {culled: [0, 2]}), a = adapter(g);
  assert.deepEqual(render(g).trace, render(control).trace); assert.equal(a.state.status, 'active');
  tracesNear(render(g).trace, expectedTrace(render(control).trace, entries));
  assert.deepEqual(g.seesCalls.slice(-4).map(c => c.args), entries.map(p => [p.x, p.y, 30])); a.dispose();
});
test('native draw receiver, complete arguments, return identity, and exactly one call', () => {
  const g = game([pickup()]), a = adapter(g), receiver = {synthetic: true};
  const extra = {extra: true}, c = g.context();
  assert.equal(g.G.Pickups.draw.call(receiver, c.ctx, extra, 17), g.result);
  assert.equal(g.calls.length, 1); assert.equal(g.calls[0].receiver, receiver);
  assert.equal(g.calls[0].args.length, 3); assert.equal(g.calls[0].args[1], extra); assert.equal(g.calls[0].args[2], 17);
  assert.notEqual(g.calls[0].args[0], c.ctx, 'scoped Canvas context Proxy');
  assert.equal(g.G.Camera.sees, g.sees); a.dispose();
});
test('native errors propagate identically and scoped camera/alpha cleanup survives', () => {
  const g = game([pickup()]), a = adapter(g); render(g);
  const error = new Error('synthetic canvas failure'), c = g.context({throwMethod: 'fill', error});
  assert.throws(() => g.G.Pickups.draw(c.ctx), e => e === error);
  assert.equal(g.G.Camera.sees, g.sees);
  // The shadow alpha was the last logical assignment before this exception.
  near(c.ctx.globalAlpha, 0.28, 'restore last logical alpha rather than faded alpha');
  assert.equal(g.calls.length, 2); a.dispose(); assert.equal(g.G.Pickups.draw, g.native);
});
test('native camera error propagates and camera wrapper is restored', () => {
  let fail = false; const error = new Error('synthetic camera failure');
  const g = game([pickup()], {onSees() { if (fail) throw error; }}), a = adapter(g); render(g); fail = true;
  assert.throws(() => render(g), e => e === error); assert.equal(g.G.Camera.sees, g.sees); a.dispose();
});
test('frozen native pickup data and JSON remain unchanged by probe or fade', () => {
  const g = game([pickup(), pickup('coin', 80)]), list = g.G.Pickups.all();
  list.forEach(Object.freeze); Object.freeze(list);
  const before = JSON.stringify(list), a = adapter(g);
  render(g); render(g); render(g);
  assert.equal(JSON.stringify(list), before); a.dispose();
});
test('focus proxy permits only x and y; adapter never reads player account or stats', () => {
  const focus = new Proxy({x: 0, y: 0}, {get(target, key) { if (key !== 'x' && key !== 'y') throw new Error('Forbidden focus property: ' + String(key)); return target[key]; }, ownKeys() { throw new Error('Focus enumeration forbidden'); }});
  const g = game([pickup()], {focus}), a = adapter(g); render(g);
  const faded = render(g); assert.equal(a.state.status, 'active'); near(faded.trace.find(c => c.method === 'fill').alpha, 0.056); a.dispose();
});
test('nonfinite focus keeps native trace until a valid successful probe', () => {
  const g = game([pickup()], {focus: {x: NaN, y: 0}}), control = game([pickup()]), a = adapter(g);
  assert.deepEqual(render(g).trace, render(control).trace); assert.notEqual(a.state.status, 'active');
  g.G.Game.player.x = 0; assert.deepEqual(render(g).trace, render(control).trace); assert.equal(a.state.status, 'active'); a.dispose();
});
test('inactive route after activation delegates native unfaded without data reads', () => {
  let allowed = true, reads = 0;
  const entries = [pickup()], g = game(entries), control = game(entries);
  const a = adapter(g, {getGame() { reads++; return g.G; }, isAllowed: () => allowed}); render(g); render(g);
  allowed = false; const oldReads = reads;
  const oldAll = g.G.Pickups.all;
  g.G.Pickups.all = () => { throw new Error('Inactive pickup inspection'); };
  g.G.Game.player = new Proxy({}, {get() { throw new Error('Inactive focus inspection'); }});
  assert.deepEqual(render(g).trace, render(control).trace); a.refresh();
  assert.equal(reads, oldReads); g.G.Pickups.all = oldAll; a.dispose();
});
test('disabling is immediately unfaded; disposal and refresh are idempotent', () => {
  const entries = [pickup()], g = game(entries), control = game(entries), a = adapter(g);
  const wrapped = g.G.Pickups.draw; a.refresh(); a.refresh(); assert.equal(g.G.Pickups.draw, wrapped);
  render(g); a.setEnabled(false); assert.deepEqual(render(g).trace, render(control).trace);
  a.dispose(); a.dispose(); assert.equal(g.G.Pickups.draw, g.native); assert.equal(g.G.Camera.sees, g.sees);
});
test('third-party draw replacement is never overwritten by refresh or dispose', () => {
  const g = game([pickup()]), a = adapter(g); render(g);
  const replacement = function () { return 'third-party'; };
  g.G.Pickups.draw = replacement; a.refresh(); a.setEnabled(false); a.setEnabled(true); a.refresh(); a.dispose();
  assert.equal(g.G.Pickups.draw, replacement);
});
test('nonwritable or accessor renderer properties are rejected without installation', () => {
  for (const [target, key] of [['Pickups', 'draw'], ['Pickups', 'all'], ['Camera', 'sees']]) {
    for (const kind of ['readonly', 'accessor']) {
      const g = game([pickup()]), value = g.G[target][key]; let reads = 0;
      Object.defineProperty(g.G[target], key, kind === 'readonly' ? {value, writable: false} : {get() { reads++; return value; }, configurable: true});
      const a = adapter(g); assert.equal(g.G.Pickups.draw, target === 'Pickups' && key === 'draw' ? value : g.native, `${target}.${key} ${kind} must prevent install`);
      // Inspecting descriptors must not invoke an accessor. The equality above
      // itself reads draw once only in that accessor case.
      assert.equal(reads, kind === 'accessor' && target === 'Pickups' && key === 'draw' ? 1 : 0); a.dispose();
    }
  }
});
test('missing Game or renderer shape does not install', () => {
  for (const mutate of [G => { delete G.Game; }, G => { G.Pickups.all = null; }, G => { G.Camera.sees = null; }]) {
    const g = game([pickup()]); mutate(g.G); const a = adapter(g); assert.equal(g.G.Pickups.draw, g.native); a.dispose();
  }
});
test('probe mismatch in camera x/y/margin/order is unsupported and unfaded', () => {
  for (const shape of ['x', 'y', 'margin', 'reverse', 'missing', 'extra']) {
    const entries = [pickup('xp', 20), pickup('coin', 80)], g = game(entries), control = game(entries);
    const bad = function (ctx) {
      let list = g.G.Pickups.all(); if (shape === 'reverse') list = [...list].reverse();
      for (const p of list) if (shape !== 'missing') g.G.Camera.sees(p.x + (shape === 'x' ? 1 : 0), p.y + (shape === 'y' ? 1 : 0), shape === 'margin' ? 31 : 30);
      if (shape === 'extra') g.G.Camera.sees(1, 2, 30);
      ctx.globalAlpha = 1; ctx.fillRect(0, 0, 1, 1);
    };
    g.G.Pickups.draw = bad; const a = adapter(g); const first = render(g);
    assert.equal(a.state.status, 'unsupported-renderer', shape); assert.equal(first.trace[0].alpha, 1);
    assert.equal(render(g).trace[0].alpha, 1); a.dispose(); assert.equal(g.G.Pickups.draw, bad);
    assert.equal(control.G.Pickups.all().length, 2);
  }
});
test('renderer mismatch after activation suspends all subsequent fading', () => {
  const entries = [pickup()], g = game(entries), a = adapter(g); render(g); render(g);
  const all = g.G.Pickups.all; g.G.Pickups.all = () => [pickup('xp', 999)];
  render(g); assert.equal(a.state.status, 'unsupported-renderer'); g.G.Pickups.all = all;
  assert.deepEqual(render(g).trace, render(game(entries)).trace); a.dispose();
});
test('reentrant native draw does not corrupt outer cursor, camera cleanup, or future fade', () => {
  let nested = false, perform = false, g;
  g = game([pickup('xp', 20), pickup('coin', 80)], {onSees() {
    if (perform && !nested) { nested = true; try { render(g); } finally { nested = false; } }
  }});
  const a = adapter(g); render(g); perform = true; render(g); perform = false;
  assert.equal(g.G.Camera.sees, g.sees);
  assert.notEqual(a.state.status, 'unsupported-renderer');
  const entries = plain(g.G.Pickups.all());
  tracesNear(render(g).trace, expectedTrace(render(game(entries)).trace, entries)); a.dispose();
});
test('original update/collection physics and synthetic currency equal separate control', () => {
  const entries = [pickup('coin', 2, 0, {value: 7}), pickup('xp', 50), pickup('heal', 10), pickup('magnet', 180, 0, {pulled: false}), pickup('ticket', 250, 0, {pulled: false})];
  const control = game(entries), g = game(entries), a = adapter(g);
  const player = () => ({x: 0, y: 0, magnet: 100, dead: false, hp: 30, coins: 0, xp: 0});
  const p1 = player(), p2 = player(), collected1 = [], collected2 = [];
  function collect(out) { return (p, pl) => { out.push(plain(p)); if (p.kind === 'coin') pl.coins += p.value; if (p.kind === 'xp') pl.xp += p.value; if (p.kind === 'heal') pl.hp += 10; }; }
  for (let i = 0; i < 40; i++) {
    render(g);
    g.G.Pickups.update(1 / 60, p1, collect(collected1)); control.G.Pickups.update(1 / 60, p2, collect(collected2));
    assert.deepEqual(plain(g.G.Pickups.all()), plain(control.G.Pickups.all()), 'physics frame ' + i);
    assert.deepEqual(collected1, collected2); assert.deepEqual(p1, p2);
  }
  assert.ok(collected1.length >= 3); assert.equal(p1.coins, 7); a.dispose();
});

test('automatic content-realm fallback is bounded and keeps existing DOM untouched', () => {
  const timers=[], events=[], w={setTimeout(fn){timers.push(fn);},addEventListener(n){events.push(n);}};w.top=w;w.self=w;
  const document=new Proxy({},{get(){throw Error('Fade must not touch DOM content');}});
  const ctx=vm.createContext({URL,window:w,location:new URL('https://pokesurvivor.com/'),document});
  const source=fs.readFileSync(modulePath,'utf8');vm.runInContext(source,ctx);
  const first=ctx.__PSKO_PICKUP_FADE;assert.equal(first.state.status,'waiting-game');
  vm.runInContext(source,ctx);assert.equal(ctx.__PSKO_PICKUP_FADE,first);assert.equal(timers.length,1);
  let calls=0;while(timers.length){assert(++calls<121);timers.shift()();}
  assert.equal(calls,119);assert.equal(first.state.status,'waiting-game');assert.deepEqual(events,['pageshow','popstate','hashchange']);
});
test('automatic boot registration is singleton and shared source reaches every runtime', () => {
  const g=game([pickup()]), features=new Map(), boot={registerFeature(n,fn){if(features.has(n))return false;features.set(n,fn);return true;}};
  const w={setTimeout(){throw Error('Ready renderer needs no startup retry');},addEventListener(){throw Error('Common boot already owns events');}};w.top=w;w.self=w;
  const ctx=vm.createContext({URL,window:w,location:new URL('https://pokesurvivor.com/'),document:{},G:g.G,__PSKO_BOOT:boot});
  const source=fs.readFileSync(modulePath,'utf8');vm.runInContext(source,ctx);const wrapped=g.G.Pickups.draw;
  vm.runInContext(source,ctx);features.get('pickup-fade')();assert.equal(features.size,1);assert.equal(g.G.Pickups.draw,wrapped);assert.equal(boot.pickupFade,ctx.__PSKO_PICKUP_FADE);
  boot.pickupFade.dispose();assert.equal(g.G.Pickups.draw,g.native);
  for(const name of ['dist/pokesurvivor.user.js','dist/pokesurvivor-ko-menu.user.js','dist/pokesurvivor-ko-browser.user.js','extension/extension-main.js','extension/extension-background.js','chrome-extension/content-main.js'])assert(fs.readFileSync(path.join(__dirname,'..',name),'utf8').includes(source),name+' exact shared source');
});
test('automatic excluded routes and child frames never read game or DOM', () => {
  const source=fs.readFileSync(modulePath,'utf8');for(const href of ['https://pokesurvivor.org/','https://pokesurvivor.com/__/auth/handler','https://pokesurvivor.com/?code=private','https://accounts.google.com/']){
    const w={};w.top=w;w.self=w;const trap=new Proxy({},{get(){throw Error('Excluded page touched');}}),ctx=vm.createContext({URL,window:w,location:new URL(href),document:trap});Object.defineProperty(ctx,'G',{get(){throw Error('Excluded game read');}});vm.runInContext(source,ctx);assert.equal(ctx.__PSKO_PICKUP_FADE,undefined);
  }
  const ctx=vm.createContext({URL,window:{top:{},self:{}},document:{},location:new URL('https://pokesurvivor.com/')});Object.defineProperty(ctx,'G',{get(){throw Error('Iframe game read');}});vm.runInContext(source,ctx);assert.equal(ctx.__PSKO_PICKUP_FADE,undefined);
});

let passed = 0;
const failures = [];
for (const {name, fn} of tests) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (error) { failures.push({name, error: error.stack || String(error)}); console.error('FAIL ' + name + '\n' + (error.stack || error)); }
}
const report = {passed: failures.length === 0, checks: tests.length, passedCount: passed, failedCount: failures.length,
  scope: 'Offline genuine pinned pickup.js/icons.js; synthetic game/focus/canvas only. No browser, account, save, live game, installation or deployment.',
  sourceCommit: '3c9641c9e782cf74afbde490f39cd60adf59e32b', failures};
const reportDir = path.join(__dirname, 'reports');
if (fs.existsSync(reportDir)) fs.writeFileSync(path.join(reportDir, 'pickup-fade-tests.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Pickup fade: ${passed}/${tests.length} passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
