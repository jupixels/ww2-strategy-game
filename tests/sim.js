// AI-vs-AI campaigns from every start date, checking for crashes and invariants.
const { load } = require('./load');
const api = load();
const years = (process.argv[2] || '1936,1939,1941,1944').split(',').map(Number);
const months = +(process.argv[3] || 60);
const seed = +(process.argv[4] || 7);
for (const sc of years) {
  const t0 = Date.now();
  api.newGame({ humans:{}, scenario:sc, seed, diff:'normal' });
  const G = api.G; let battles = 0, naval = 0;
  for (let i = 0; i < months && !G.over; i++) {
    const out = api.endMonth(); battles += out.battles.length; naval += out.naval.length;
    for (const p of G.prov) for (const k in p.u) if (p.u[k] < 0 || !Number.isFinite(p.u[k]) || p.r[k] > p.u[k]) throw new Error(`bad stack ${api.PROV[G.prov.indexOf(p)].name} ${JSON.stringify(p.u)} r=${JSON.stringify(p.r)} turn ${G.turn}`);
    for (const t in G.nat) { const n = G.nat[t]; if (!Number.isFinite(n.pp) || !Number.isFinite(n.oil)) throw new Error('bad nation ' + t + JSON.stringify({pp:n.pp,oil:n.oil})); }
  }
  const alive = Object.keys(G.nat).filter(t => G.nat[t].alive);
  const top = alive.map(t => [t, api.vpOf(t)]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, v]) => `${t}:${v}`).join(' ');
  const d = t => { const x = api.divisions(t); return Object.values(x).reduce((a, b) => a + b, 0); };
  console.log(`[${sc}] ${G.y}-${G.m + 1} ${Date.now() - t0}ms battles=${battles} naval=${naval} alive=${alive.length} | ${top} | div GER ${d('GER')} SOV ${d('SOV')} ENG ${d('ENG')} | wars ${G.wars.length} | ${api.serial().length >> 10}KB`);
  console.log('   news:', G.news.slice(0, 6).join(' / '));
}
