// Visual-only pickup fade. One shared module; no collection or progression hooks.
(function () {
'use strict';
const constants = Object.freeze({near:20, far:140, minimum:0.2});
const kinds = new Set(['xp', 'xpBig', 'coin', 'heal']);
function allowedLocation(loc, win) {
  try {
    const u = new URL(loc.href);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
      ['pokesurvivor.com', 'www.pokesurvivor.com'].includes(u.hostname) && ['/', '/index.html', '/dev.html'].includes(u.pathname) &&
      !/(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test(u.search + u.hash) && (!win || win.top === win.self);
  } catch (_) { return false; }
}
function opacityFor(p, focus) {
  if (!p || p.pulled !== true || !kinds.has(p.kind) || !focus ||
      ![p.x, p.y, focus.x, focus.y].every(Number.isFinite)) return 1;
  const t = Math.max(0, Math.min(1, (Math.hypot(p.x - focus.x, p.y - focus.y) - constants.near) / (constants.far - constants.near)));
  return constants.minimum + (1 - constants.minimum) * t * t * (3 - 2 * t);
}
function writableMethod(object, key) {
  const d = object && Object.getOwnPropertyDescriptor(object, key);
  return !!d && typeof d.value === 'function' && d.writable === true;
}
function createAdapter(options) {
  const state = {status:'waiting-game', enabled:true, contractVerified:false};
  const contexts = new WeakMap();
  let installed = null, disposed = false, drawing = null, rejected = null;
  const active = () => !disposed && state.enabled && options.isAllowed();
  function detach() {
    if (installed && installed.pickups.draw === installed.wrapper) installed.pickups.draw = installed.original;
    installed = null;
    state.contractVerified = false;
  }
  function contextView(target) {
    let entry = contexts.get(target);
    if (entry) return entry;
    entry = {frame:null, methods:new Map(), proxy:null};
    entry.proxy = new Proxy(target, {
      get(object, key) {
        const frame = entry.frame;
        if (key === 'globalAlpha' && frame) return frame.alpha;
        const value = Reflect.get(object, key, object);
        if (typeof value !== 'function') return value;
        const cached = entry.methods.get(key);
        if (cached && cached.original === value) return cached.bound;
        const bound = function (...args) {
          const f = entry.frame;
          if (f && key === 'save') {
            const result = Reflect.apply(value, object, args); f.stack.push(f.alpha); return result;
          }
          if (f && key === 'restore') {
            const result = Reflect.apply(value, object, args);
            f.alpha = f.stack.length ? f.stack.pop() : object.globalAlpha;
            object.globalAlpha = f.alpha * f.factor;
            return result;
          }
          return Reflect.apply(value, object, args);
        };
        entry.methods.set(key, {original:value, bound});
        return bound;
      },
      set(object, key, value) {
        const frame = entry.frame;
        if (key === 'globalAlpha' && frame) {
          // The native renderer uses finite numeric alpha. Unexpected assignments
          // disable attenuation rather than changing Canvas coercion semantics.
          if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
            frame.valid = false; frame.factor = 1;
            object.globalAlpha = frame.alpha;
            const result = Reflect.set(object, key, value, object);
            frame.alpha = object.globalAlpha;
            return result;
          }
          frame.alpha = value;
          return Reflect.set(object, key, value * frame.factor, object);
        }
        return Reflect.set(object, key, value, object);
      }
    });
    contexts.set(target, entry);
    return entry;
  }
  function install(game, pickups, camera) {
    const original = pickups.draw;
    const record = {game, pickups, camera, original, wrapper:null};
    record.wrapper = function (...args) {
      if (!active()) return Reflect.apply(original, this, args);
      if (drawing) {
        // A nested native render must not advance the outer pickup cursor.
        const outer = drawing, currentSees = outer.camera.sees;
        const forwarded = args.slice(), shared = args[0] === outer.target || args[0] === outer.entry.proxy;
        if (shared) { forwarded[0] = outer.target; outer.target.globalAlpha = outer.alpha; }
        outer.camera.sees = outer.sees;
        try { return Reflect.apply(original, this, forwarded); }
        finally {
          if (outer.camera.sees === outer.sees) outer.camera.sees = currentSees;
          else outer.valid = false;
          if (shared) { outer.alpha = outer.target.globalAlpha; outer.target.globalAlpha = outer.alpha * outer.factor; }
        }
      }
      if (!installed || installed !== record || rejected === pickups || !writableMethod(camera, 'sees')) return Reflect.apply(original, this, args);
      let list, target, focus, sees, entry, usable = false;
      try {
        list = pickups.all(); target = args[0];
        if (Array.isArray(list) && list.length && target && typeof target === 'object' && Number.isFinite(target.globalAlpha)) {
          // Only the local avatar's render coordinates are copied. Never enumerate it.
          const player = game.Game.player;
          if (player) {
            focus = {x:player.x, y:player.y};
            if (Number.isFinite(focus.x) && Number.isFinite(focus.y)) {
              sees = camera.sees; entry = contextView(target); usable = true;
            }
          }
        }
      } catch (_) { rejected = pickups; state.status = 'unsupported-renderer'; }
      // Keep the native invocation outside preparation's catch: never retry drawing.
      if (!usable) return Reflect.apply(original, this, args);
      const frame = {target, camera, sees, entry, alpha:target.globalAlpha, factor:1, stack:[], valid:true, cursor:0, length:list.length, probe:!state.contractVerified};
      const scopedSees = function (...values) {
        const p = list[frame.cursor++];
        if (!p || values.length !== 3 || values[0] !== p.x || values[1] !== p.y || values[2] !== 30) frame.valid = false;
        frame.factor = frame.valid && !frame.probe ? opacityFor(p, focus) : 1;
        // Changing pickup changes effective alpha, not the native logical alpha.
        target.globalAlpha = frame.alpha * frame.factor;
        return Reflect.apply(sees, this, values);
      };
      try { camera.sees = scopedSees; } catch (_) {
        rejected = pickups; state.status = 'unsupported-renderer';
        return Reflect.apply(original, this, args);
      }
      entry.frame = frame; drawing = frame;
      let completed = false;
      try {
        const forwarded = args.slice(); forwarded[0] = entry.proxy;
        const result = Reflect.apply(original, this, forwarded);
        completed = true;
        return result;
      } finally {
        if (camera.sees === scopedSees) camera.sees = sees;
        else frame.valid = false;
        // Native draw's final reset must not inherit the final pickup's factor.
        target.globalAlpha = frame.alpha;
        entry.frame = null; drawing = null;
        if (completed && frame.valid && frame.cursor === frame.length && list.length === frame.length) {
          state.contractVerified = true; state.status = 'active';
        } else {
          rejected = pickups; state.contractVerified = false; state.status = 'unsupported-renderer';
        }
      }
    };
    pickups.draw = record.wrapper;
    installed = record;
    state.status = 'registered-awaiting-render';
  }
  function refresh() {
    if (disposed) return state;
    if (!state.enabled) { detach(); state.status = 'disabled'; return state; }
    if (!options.isAllowed()) { detach(); state.status = 'suspended-route'; return state; }
    const game = options.getGame();
    const pickups = game && game.Pickups, camera = game && game.Camera;
    if (installed) {
      if (installed.pickups === pickups && installed.camera === camera && pickups.draw === installed.wrapper) return state;
      const replaced = installed.pickups === pickups && pickups.draw !== installed.wrapper;
      detach();
      if (replaced) { rejected = pickups; state.status = 'unsupported-renderer'; return state; }
    }
    if (!game || !game.Game || !pickups || !camera) { state.status = 'waiting-game'; return state; }
    if (rejected === pickups || !writableMethod(pickups, 'all') || !writableMethod(pickups, 'draw') || !writableMethod(camera, 'sees')) {
      state.status = 'unsupported-renderer'; return state;
    }
    if (typeof Proxy !== 'function') { state.status = 'unsupported-realm'; return state; }
    install(game, pickups, camera);
    return state;
  }
  return {
    state, refresh,
    setEnabled(value) { state.enabled = !!value; return refresh(); },
    dispose() { detach(); disposed = true; state.status = 'disposed'; }
  };
}
if (typeof module !== 'undefined' && module.exports) { module.exports = {opacityFor, createAdapter, allowedLocation, constants}; return; }
if (typeof window === 'undefined' || typeof document === 'undefined' || !allowedLocation(location, window)) return;
const boot = globalThis.__PSKO_BOOT;
let controller = globalThis.__PSKO_PICKUP_FADE;
if (!controller) {
  controller = createAdapter({getGame:() => globalThis.G, isAllowed:() => allowedLocation(location, window)});
  globalThis.__PSKO_PICKUP_FADE = controller;
  // Bounded startup retry only. No per-frame polling, state persistence or code loading.
  let attempts = 0;
  const ready = function () {
    const current = controller.refresh();
    if (current.status === 'waiting-game' && ++attempts < 120) window.setTimeout(ready, 250);
  };
  ready();
  if (!boot) for (const name of ['pageshow', 'popstate', 'hashchange']) window.addEventListener(name, () => controller.refresh());
}
if (boot) {
  boot.pickupFade = controller;
  boot.registerFeature('pickup-fade', () => controller.refresh());
}
})();
