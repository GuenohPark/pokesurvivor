// Shared visual-only names on altar stone steps. Native props/effects are untouched.
(function () {
'use strict';
const names = Object.freeze(['분노', '질주', '자석', '신속함']);
function allowedLocation(loc, win) {
  try {
    const u = new URL(loc.href);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
      ['pokesurvivor.com', 'www.pokesurvivor.com'].includes(u.hostname) && ['/', '/index.html', '/dev.html'].includes(u.pathname) &&
      !/(?:auth|login|sign.?in|token|callback|password|session|(?:[?&#]|^)code(?:=|%3d))/i.test(u.search + u.hash) && (!win || win.top === win.self);
  } catch (_) { return false; }
}
function labelFor(p) {
  return p && p.type === 'altar' && Number.isInteger(p.kind) && p.kind >= 0 && p.kind < names.length ? (p.used ? '사용함' : names[p.kind]) : '';
}
function paintLabel(ctx, p, P = 2) {
  const label = labelFor(p);
  if (!label || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(P) || P <= 0) return false;
  ctx.save();
  try {
    // Native altar art is 18x27: its bottom stone step is x1..16/y21..25.
    ctx.font = 'bold ' + (4.5 * P) + 'px "Pixelify", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = P * 0.6; ctx.lineJoin = 'round';
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#202226'; ctx.fillStyle = p.used ? '#e0ded8' : '#fff2cb';
    // Pixelify/Galmuri's middle baseline sits above the visible glyph center.
    const y = p.y - 2.5 * P + 2;
    ctx.strokeText(label, p.x, y, 15 * P);
    ctx.fillText(label, p.x, y, 15 * P);
    return true;
  } finally { ctx.restore(); }
}
function method(object, key) {
  const d = object && Object.getOwnPropertyDescriptor(object, key);
  return !!d && d.writable === true && typeof d.value === 'function';
}
function createAdapter(options) {
  const state = {status:'waiting-game', enabled:true};
  let installed = null, rejected = null, disposed = false;
  function detach() {
    if (installed && installed.world.drawProp === installed.wrapper) installed.world.drawProp = installed.original;
    installed = null;
  }
  function refresh() {
    if (disposed) return state;
    if (!state.enabled) { detach(); state.status = 'disabled'; return state; }
    if (!options.isAllowed()) { detach(); state.status = 'suspended-route'; return state; }
    let game, world, P;
    try { game = options.getGame(); world = game && game.World; P = game && game.Sprites && game.Sprites.PX; }
    catch (_) { state.status = 'unsupported-renderer'; return state; }
    if (installed) {
      if (installed.world === world && world.drawProp === installed.wrapper) return state;
      const replaced = installed.world === world && world.drawProp !== installed.wrapper;
      detach();
      if (replaced) { rejected = world; state.status = 'unsupported-renderer'; return state; }
    }
    if (!world || P == null) { state.status = 'waiting-game'; return state; }
    if (world === rejected || !Number.isFinite(P) || P <= 0 || !method(world, 'drawProp')) { state.status = 'unsupported-renderer'; return state; }
    const original = world.drawProp;
    const record = {world, original, wrapper:null};
    record.wrapper = function (...args) {
      // Always render exactly once. Native errors retain their original behavior.
      const result = Reflect.apply(original, this, args);
      if (disposed || !state.enabled || !options.isAllowed() || rejected === world) return result;
      try {
        if (paintLabel(args[0], args[1], P)) state.status = 'active';
      } catch (_) {
        // A label/font/context issue must never break the game's own rendering.
        rejected = world; state.status = 'unsupported-renderer';
      }
      return result;
    };
    world.drawProp = record.wrapper; installed = record;
    state.status = 'registered-awaiting-render';
    return state;
  }
  return {state, refresh,
    setEnabled(value) { state.enabled = !!value; return refresh(); },
    dispose() { detach(); disposed = true; state.status = 'disposed'; }
  };
}
if (typeof module !== 'undefined' && module.exports) { module.exports = {labelFor, paintLabel, createAdapter, allowedLocation}; return; }
if (typeof window === 'undefined' || typeof document === 'undefined' || !allowedLocation(location, window)) return;
const boot = globalThis.__PSKO_BOOT;
let controller = globalThis.__PSKO_ALTAR_LABEL;
if (!controller) {
  let lastHref = '', permitted = false;
  const isAllowed = () => {
    if (lastHref !== location.href) { lastHref = location.href; permitted = allowedLocation(location, window); }
    return permitted && window.top === window.self;
  };
  controller = createAdapter({getGame:() => globalThis.G, isAllowed});
  globalThis.__PSKO_ALTAR_LABEL = controller;
  let attempts = 0;
  const ready = function () {
    const current = controller.refresh();
    if (current.status === 'waiting-game' && ++attempts < 120) window.setTimeout(ready, 250);
  };
  ready();
  if (!boot) for (const name of ['pageshow', 'popstate', 'hashchange']) window.addEventListener(name, () => controller.refresh());
}
if (boot) { boot.altarLabels = controller; boot.registerFeature('altar-labels', () => controller.refresh()); }
})();
