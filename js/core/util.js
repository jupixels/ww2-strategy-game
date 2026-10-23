'use strict';
/* ================= CORE UTILITIES =================
   The simulation (js/core/*) never touches the DOM. It reports what happened through Hooks,
   which the UI (single player), the network host (multiplayer) or the test runner listen to. */
let G = null;

// seeded RNG (mulberry32) whose state lives inside G, so a game replays identically from its seed
function rnd() {
  if (!G) return Math.random();
  let t = (G.rs = (G.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = n => (rnd() * n) | 0;
const pickR = a => a[(rnd() * a.length) | 0];
const shuffleR = a => { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rr = v => { const f = Math.floor(v); return f + (rnd() < v - f ? 1 : 0); };
const sum = (a, f = x => x) => a.reduce((s, x) => s + f(x), 0);
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const Hooks = {
  L: {},
  on(type, fn) { (this.L[type] || (this.L[type] = [])).push(fn); },
  emit(type, data) { const l = this.L[type]; if (l) for (const f of l) { try { f(data); } catch (e) { console.error(e); } } const a = this.L['*']; if (a) for (const f of a) { try { f(type, data); } catch (e) { console.error(e); } } },
};
// notifications: `to` is a nation tag, or '*' for everyone
function notify(to, ic, title, body, kind) { Hooks.emit('toast', { to, ic, title, body, kind:kind || '' }); }
function sfx(name, to = '*', arg) { Hooks.emit('sfx', { name, to, arg }); }
