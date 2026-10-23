const { load } = require('./load');
const api = load();
api.newGame({ humans:{}, scenario:+(process.argv[2]||1941), seed:+(process.argv[3]||7) }); const G = api.G;
const d = t => Object.values(api.divisions(t)).reduce((a,b)=>a+b,0);
const cities = ['Minsk','Kiev','Smolensk','Leningrad','Moscow','Kharkov','Stalingrad'];
for (let i = 0; i < 14; i++) {
  const out = api.endMonth();
  let gw=0, gl=0, sw=0, sl=0, sdl=0, gal=0, sal=0, gdl=0;
  for (const r of out.battles) { if (r.a==='GER'&&r.d==='SOV'){ r.win?gw++:gl++; sdl+=r.dl; gal+=r.al;} if (r.a==='SOV'&&r.d==='GER'){ r.win?sw++:sl++; gdl+=r.dl; sal+=r.al; } }
  const sov = G.prov.filter(p=>p.o==='SOV'); const front = sov.filter((p,i)=>api.PROV[G.prov.indexOf(p)].adj.some(j=>G.prov[j].o==='GER'||api.enemiesOf('SOV').includes(G.prov[j].o)));
  console.log(`${G.y}-${G.m+1} GER ${d('GER')} SOV ${d('SOV')} sovFront ${front.reduce((a,p)=>a+Object.values(p.u).reduce((x,y)=>x+y,0),0)}/${front.length}prov | GERatk w${gw} l${gl} sovLoss${sdl} gerLoss${gal} | SOVatk w${sw} l${sl} | stab ${Math.round(G.nat.SOV.stab)} pp ${Math.round(G.nat.SOV.pp)} mp ${Math.round(G.nat.SOV.mp)} | ${cities.map(c=>c[0]+c[1]+':'+G.prov[api.ID[c]].o).join(' ')}`);
  if (!G.nat.SOV.alive) break;
}
