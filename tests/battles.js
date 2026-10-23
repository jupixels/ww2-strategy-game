const { load } = require('./load');
const api = load();
const [sc, months, seed] = [+(process.argv[2]||1941), +(process.argv[3]||8), +(process.argv[4]||7)];
api.newGame({ humans:{}, scenario:sc, seed }); const G = api.G;
for (let i = 0; i < months; i++) {
  const out = api.endMonth(); const T = {};
  for (const r of out.battles) { if (r.rocket!=null||r.raid||r.bomb!=null) continue; const k = r.a; const x = T[k] || (T[k] = {n:0,w:0,al:0,dl:0,kes:0,walk:0,odds:[]}); x.n++; if (r.win) x.w++; if (r.walk) x.walk++; x.al += r.al; x.dl += r.dl; x.kes += r.kessel; if (r.odds) x.odds.push(r.odds); }
  console.log(`${G.y}-${G.m+1}`, Object.entries(T).filter(([k,x])=>x.n>2).map(([k,x]) => `${k}: n${x.n} w${x.w} walk${x.walk} al${x.al} dl${x.dl} kes${x.kes} odds~${(x.odds.reduce((a,b)=>a+b,0)/Math.max(1,x.odds.length)).toFixed(2)}`).join(' | '));
  const d = t => Object.values(api.divisions(t)).reduce((a,b)=>a+b,0);
  console.log('   GER', d('GER'), 'SOV', d('SOV'), 'SOV sup0', G.prov.filter(p=>p.o==='SOV'&&!p.sup).length, 'GER supAvg', (G.prov.filter(p=>p.o==='GER').reduce((a,p)=>a+p.sup,0)/G.prov.filter(p=>p.o==='GER').length).toFixed(2));
}
