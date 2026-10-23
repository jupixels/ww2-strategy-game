const { load } = require('./load');
const api = load();
api.newGame({ humans:{}, scenario:1941, seed:7 });
api.eval(`
var __tot = t => { let s = 0; for (const p of G.prov) if (p.o === t) s += landN(p.u); return s; };
const _b = battle;
battle = function(srcs, tid, opts) { const a = srcs[0].id >= 0 ? G.prov[srcs[0].id].o : srcs[0].o, d = G.prov[tid].o;
  const a0 = __tot(a), d0 = __tot(d); const r = _b(srcs, tid, opts); const a1 = __tot(a), d1 = __tot(d);
  const ea = a1 - a0 + r.al, ed = d1 - d0 + r.dl;
  if (ea !== 0 || ed !== 0) console.log('LEAK battle', a, '->', PROV[tid].name, d, 'attackerDelta', a1-a0, 'al', r.al, 'defDelta', d1-d0, 'dl', r.dl, 'win', r.win, 'kessel', r.kessel, r.liberated||'', r.para?'para':'', r.naval?'naval':'');
  return r; };
const _ml = moveLand;
moveLand = function(from, to, part) { const t = from.o, t0 = __tot(t); _ml(from, to, part); const t1 = __tot(t); if (t1 !== t0) console.log('LEAK move', t, t1 - t0, 'dest owner', to.o); };
`);
for (let i = 0; i < 3; i++) api.endMonth();
