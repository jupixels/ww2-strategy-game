'use strict';
/* ================= START DATES =================
   Later start dates replay the historical crises on the 1936 map, then move borders, armies and technology
   to where they stood on that date. */
function setOwner(t, names, garrison = 1) {
  for (const nm of names.split(',').map(s => s.trim()).filter(Boolean)) {
    const id = ID[nm]; if (id == null) { console.warn('scenario: unknown province', nm); continue; }
    const p = G.prov[id]; if (p.o === t) continue;
    clearLand(p); for (const k of AIR) p.air[k] = 0;
    p.o = t; p.u.inf = garrison; p.res = p.core === t ? 0 : 20;
  }
}
function scKill(d, heir) {
  const n = nat(d); if (!n.alive) return;
  for (const p of G.prov) if (p.o === d) p.o = heir;
  for (const z in G.fleet) delete G.fleet[z][d];
  G.gens = G.gens.filter(g => g.tag !== d);
  killNation(d, heir);
  if (isHuman(d)) switchHuman(d, heir, `${natName(d)} no longer exists in ${G.y}. You lead ${natName(heir)}.`);
}
function bolster(t, u) {
  if (!A(t)) return;
  const en = new Set(enemiesOf(t));
  let front = owned(t).filter(i => PROV[i].adj.some(j => en.has(G.prov[j].o)));
  if (!front.length) front = owned(t).filter(i => PROV[i].adj.some(j => G.prov[j].o !== t));
  if (!front.length) front = [homeProv(t)];
  front = front.filter(i => i >= 0);
  let k = 0;
  for (const kind in u) for (let i = 0; i < u[kind]; i++) G.prov[front[(k++) % front.length]].u[kind]++;
}
// shift a share of a nation's troops from the interior onto its fronts
function deployToFronts(t, frac) {
  const en = new Set(enemiesOf(t)); if (!en.size) return;
  const mine = owned(t), front = mine.filter(i => PROV[i].adj.some(j => en.has(G.prov[j].o)));
  if (!front.length) return;
  const pool = emptyLand();
  for (const i of mine) { if (front.includes(i)) continue; const p = G.prov[i]; for (const k of LAND) { const m = Math.floor(p.u[k] * frac); p.u[k] -= m; pool[k] += m; } }
  let x = 0; for (const k of LAND) for (let i = 0; i < pool[k]; i++) G.prov[front[(x++) % front.length]].u[k]++;
}
function techsByYear(t, count) {
  const n = nat(t), prio = (RESEARCH_PRIO[t] || RESEARCH_PRIO._).concat(TECHS.map(T => T.k));
  let c = 0; for (const k of prio) { if (c >= count) break; const T = TECH[k]; if (!T || n.tech[k] || T.y > G.y || (T.req && !n.tech[T.req])) continue; n.tech[k] = 1; c++; }
}
const runEv = (id, k = 0) => { const e = EVENT_BY_ID[id]; try { e.opts[k].f(e.actor); } catch (err) { console.error('scenario', id, err); } G.ev[id] = 1; };
function placeFleet(t, z, c, s) { if (!A(t) && t !== 'USA') return; addFleet(z, t, 'cap', c); addFleet(z, t, 'sub', s); }

function applyScenario(year) {
  if (year >= 1939) {
    ['rhine','ethiopia','olympics','abdication','axis','purge','anschluss','munich','prague','albania','guarantee','pact'].forEach(id => runEv(id));
    runEv('spain'); G.flags.spain = ymNum(1939, 3);
    G.y = 1939; G.m = 8; G.tension = 62;
    runEv('weiss');
    for (const t of MAJORS) { const n = nat(t); n.pp += 120; n.oil += 40; n.steel += 40; techsByYear(t, 5); owned(t).filter(i => G.prov[i].core === t).sort((a, b) => G.prov[b].fac - G.prov[a].fac).slice(0, 3).forEach(i => G.prov[i].fac++); }
    for (const t of ['POL','ROM','HUN','YUG','SWE','TUR','FIN','BUL','GRE']) if (A(t)) techsByYear(t, 2);
    // the Five-Year Plans: Soviet industry grew faster than anyone's in the late thirties
    owned('SOV').filter(i => G.prov[i].core === 'SOV').sort((a, b) => PROV[b].vp - PROV[a].vp).slice(0, 10).forEach(i => G.prov[i].fac++);
    nat('SOV').done.push('sov_5yr');
    bolster('GER', { inf:30, arm:6, art:6 }); bolster('POL', { inf:8 }); bolster('FRA', { inf:12, art:2 }); bolster('ENG', { inf:6 }); bolster('ITA', { inf:10 }); bolster('SOV', { inf:30, arm:4 });
    for (const t of ['GER','POL']) deployToFronts(t, 0.5);
    { const h = homeProv('GER'); G.prov[h].air.ftr += 6; G.prov[h].air.bmb += 4; }
    hireGeneral('GER', true, 'Heinz Guderian');
  }
  if (year >= 1941) {
    // Poland divided, Scandinavia and the West overrun, France split, Balkans conquered
    setOwner('GER', 'Warsaw,Kraków,Poznań,Bydgoszcz,Danzig,Lublin'); setOwner('SOV', 'Wilno,Brest-Litovsk,Lwów'); scKill('POL', 'GER');
    setOwner('SOV', 'Viipuri'); runEv('winter'); endWar('SOV','FIN'); runEv('winterpeace');
    setOwner('GER', 'Copenhagen,Jutland'); scKill('DEN', 'GER');
    setOwner('GER', 'Oslo,Bergen,Trondheim,Narvik'); scKill('NOR', 'GER');
    setOwner('GER', 'Amsterdam,Rotterdam,Groningen'); scKill('HOL', 'GER');
    setOwner('GER', 'Brussels,Antwerp'); scKill('BEL', 'GER');
    setOwner('GER', 'Paris,Lille,Normandy,Brest,Nantes,Bordeaux,Strasbourg,Metz,Dijon', 2);
    { const v = nat('VIC'); v.alive = true; v.pp = 30; v.mp = 30; v.oil = 15; v.steel = 15; v.tech = { ...nat('FRA').tech }; G.flags.vichy = 1;
      for (const p of G.prov) if (p.o === 'FRA') { p.o = 'VIC'; p.u.inf = Math.max(1, Math.ceil(p.u.inf / 3)); p.u.arm = 0; p.u.art = 0; }
      v.capital = ID['Marseille']; for (const z in G.fleet) if (G.fleet[z].FRA) { G.fleet[z].VIC = G.fleet[z].FRA; delete G.fleet[z].FRA; }
      const fh = isHuman('FRA'); for (const k of [...G.wars]) { const [a, b] = k.split('|'); if (a === 'FRA' || b === 'FRA') endWar(a, b); } leaveFaction('FRA'); nat('FRA').alive = false;
      if (fh) { G.humans.VIC = G.humans.FRA; delete G.humans.FRA; } }
    runEv('baltic');
    for (const t of ['EST','LAT','LIT']) if (A(t)) scKill(t, 'SOV');
    runEv('tripartite'); runEv('romaxis'); runEv('bulaxis');
    setOwner('GER', 'Belgrade,Zagreb'); setOwner('ITA', 'Split,Ljubljana,Sarajevo'); setOwner('BUL', 'Skopje'); scKill('YUG', 'GER');
    setOwner('GER', 'Athens,Thessaloniki,Crete'); setOwner('ITA', 'Ioannina'); scKill('GRE', 'GER');
    setOwner('ENG', 'Tobruk', 4); setOwner('ENG', 'Damascus,Aleppo', 2);
    for (const t of ['GER','ITA','HUN','ROM','BUL']) for (const e of enemiesOf(t)) if (!A(e)) endWar(t, e);
    for (const id of ['ore','dunkirk','itawar','britain','greece','lendlease','iraq','yugo','bluediv']) G.ev[id] = 1;
    G.flags.guarantee = 1;
    if (A('ITA') && A('ENG')) declareWar('ITA','ENG', { quiet:true });
    G.y = 1941; G.m = 5; G.tension = 85;
    for (const t of MAJORS) if (A(t)) { const n = nat(t); n.pp += 150; n.oil += 40; n.steel += 60; techsByYear(t, 5); }
    nat('ENG').pp += 100;
    ['Sverdlovsk','Perm','Kuibyshev','Ufa','Gorky','Kazan','Stalingrad','Moscow'].forEach(nm => { const p = G.prov[ID[nm]]; if (p.o === 'SOV') p.fac++; }); nat('SOV').done.push('sov_urals'); nat('SOV').pp += 150;
    barbarossa(); G.ev.barbarossa = 1;
    bolster('GER', { inf:24, arm:8, art:6 }); bolster('SOV', { inf:80, arm:8, art:8 }); bolster('ENG', { inf:10, arm:3 }); bolster('ITA', { inf:6 }); bolster('ROM', { inf:6 }); bolster('FIN', { inf:4 }); bolster('HUN', { inf:4 });
    for (const t of ['GER','SOV','ROM','FIN','HUN']) deployToFronts(t, 0.7);
    { const h = homeProv('GER'); G.prov[h].air.ftr += 8; G.prov[h].air.bmb += 6; }
    { const h = homeProv('SOV'); G.prov[h].air.ftr += 12; G.prov[h].air.bmb += 6; for (const nm of ['Kiev','Leningrad','Smolensk']) { const p = G.prov[ID[nm]]; if (p.o === 'SOV') p.air.ftr += 3; } }
    hireGeneral('GER', true, 'Erwin Rommel'); hireGeneral('SOV', true, 'Georgy Zhukov'); hireGeneral('ENG', true, 'Archibald Wavell');
  }
  if (year >= 1944) {
    usaJoin(); G.ev.usa = 1; runEv('torch'); G.ev.stalingrad = 1; G.ev.kursk = 1;
    // the tide has turned: the Red Army is back at its 1941 borders in the south, Italy has switched sides
    for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core === 'SOV' && p.o !== 'SOV') { clearLand(p); p.o = 'SOV'; p.u.inf = 2; p.res = 0; } }
    setOwner('GER', 'Minsk,Vitebsk,Mogilev,Pskov,Brest-Litovsk,Lwów,Wilno,Tallinn,Riga,Kaunas', 3);
    setOwner('ROM', 'Bessarabia', 3); setOwner('FIN', 'Viipuri,Petrozavodsk', 3);
    setOwner('ENG', 'Tripoli,Benghazi,Fezzan,Kufra,Algiers,Oran,Tunis,Rabat,Marrakesh,Constantine,Ouargla,In Salah,Corsica', 2);
    switchSides('ITA'); G.ev.italyfalls = 1;
    setOwner('GER', 'Milan,Turin,Venice,Florence,Ancona,Trieste,Tirana,Rhodes,Split,Ljubljana,Sarajevo,Ioannina', 3);
    setOwner('ENG', 'Sicily,Calabria,Sardinia', 3);
    setOwner('SOV', 'Tabriz'); setOwner('ENG', 'Shiraz');
    G.y = 1944; G.m = 5; G.tension = 95;
    for (const t of ['GER','ENG','SOV','ITA']) if (A(t)) { const n = nat(t); n.pp += 150; n.oil += 50; n.steel += 60; techsByYear(t, 6); }
    bolster('SOV', { inf:80, arm:24, art:16 }); bolster('GER', { inf:40, arm:10, art:6 }); bolster('ENG', { inf:20, arm:8, art:4 });
    for (const t of ['GER','SOV','ENG']) deployToFronts(t, 0.6);
    { const h = homeProv('ENG'); G.prov[h].air.ftr += 14; G.prov[h].air.bmb += 12; }
    { const h = homeProv('SOV'); G.prov[h].air.ftr += 10; G.prov[h].air.bmb += 6; }
    placeFleet('ENG', 'CHN', 6, 2); placeFleet('USA', 'CHN', 6, 0); placeFleet('ENG', 'WMD', 4, 2);
    hireGeneral('ENG', true, 'Bernard Montgomery'); hireGeneral('SOV', true, 'Konstantin Rokossovsky');
    dday(); G.ev.dday = 1;
  }
  // everything older than the start date has already happened
  for (const e of EVENTS) if (ymNum(e.y, e.m) < nowNum() && G.ev[e.id] == null) G.ev[e.id] = 1;
  for (const p of G.prov) p.sup = 1;
  fixGenerals();
  for (const t in G.nat) { const n = G.nat[t]; if (n.alive && n.capital >= 0 && G.prov[n.capital].o !== t) n.capital = homeProv(t); }
}
