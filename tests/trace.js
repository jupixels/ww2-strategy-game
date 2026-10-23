const { load } = require('./load');
const api = load();
const [sc, months, seed] = [+(process.argv[2]||1936), +(process.argv[3]||120), +(process.argv[4]||7)];
const watch = (process.argv[5]||'GER,SOV,ENG,FRA,ITA,POL').split(',');
api.newGame({ humans:{}, scenario:sc, seed });
const G = api.G;
let logIdx = 0;
for (let i = 0; i < months && !G.over; i++) {
  api.endMonth();
  if (G.m % 6 === 0) {
    const row = watch.map(t => { const n = G.nat[t]; if (!n.alive) return `${t}:dead`; const d = api.divisions(t); const tot = Object.values(d).reduce((a,b)=>a+b,0); return `${t}:vp${api.vpOf(t)} d${tot}(a${d.arm}) pp${Math.round(n.pp)} oil${Math.round(n.oil)} st${Math.round(n.stab)} ww${Math.round(n.ww)} f${api.facOf(t)||'-'} w${api.enemiesOf(t).length}`; }).join(' | ');
    console.log(`${G.y}-${String(G.m+1).padStart(2,'0')} ${row}`);
  }
}
console.log(G.log.slice(0, 60).reverse().map(l => l.d + ' ' + l.txt.replace(/<[^>]+>/g,'')).join('\n'));
