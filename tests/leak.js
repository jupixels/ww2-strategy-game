const { load } = require('./load');
const api = load();
api.newGame({ humans:{}, scenario:1941, seed:7 });
api.eval(`
var __tot = t => { let s = 0; for (const p of G.prov) if (p.o === t) s += landN(p.u); return s; };
var __wrap = (name) => { const f = globalThis[name] || eval(name); return f; };
`);
// instrument: measure SOV+GER totals around each AI nation's turn and other phases
api.eval(`
const _ai = aiTurn;
aiTurn = function(t, b) { const g0 = __tot('GER'), s0 = __tot('SOV'); const n0 = b.length; _ai(t, b); const g1 = __tot('GER'), s1 = __tot('SOV');
  let dl = 0, al = 0; for (const r of b.slice(n0)) { if (r.d==='SOV') dl += r.dl||0; if (r.a==='SOV') al += r.al||0; if (r.d==='GER') dl+=0; }
  if (s1 - s0 < -3 || g1 - g0 < -3) console.log('  ', t, 'GER', g1-g0, 'SOV', s1-s0, 'battleLossSOV', dl+al, 'battles', b.length-n0); };
const _th = tickHomeFront; const _tr = tickResistance; const _rs = resetReady;
`);
for (let i = 0; i < 3; i++) { console.log('month', i); api.endMonth(); }
