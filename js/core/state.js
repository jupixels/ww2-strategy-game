'use strict';
/* ================= GAME STATE ================= */
const nat = t => G.nat[t];
const A = t => !!(G.nat[t] && G.nat[t].alive);
const O = name => G.prov[ID[name]].o;
const wkey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const W = (a, b) => G.warSet.has(wkey(a, b));
function facOf(t) { for (const k in G.facs) if (G.facs[k].m.includes(t)) return k; return null; }
const friendly = (a, b) => a === b || (!!a && !!facOf(a) && facOf(a) === facOf(b));
const isAxis = t => facOf(t) === 'AXIS';
const isAllied = t => facOf(t) === 'ALLIES';
const natName = t => G.nat[t] ? G.nat[t].name : t;
const natColor = t => G.nat[t] ? G.nat[t].color : '#888';
const dateStr = () => MONTHS_L[G.m] + ' ' + G.y;
const ymNum = (y, m) => y * 12 + m;
const nowNum = () => ymNum(G.y, G.m);
const isHuman = t => !!(G.humans && G.humans[t]);
const humanTags = () => Object.keys(G.humans || {});
const hasTech = (t, k) => !!(G.nat[t] && G.nat[t].tech[k]);
const isWinter = () => G.m === 11 || G.m <= 1;
const isMud = () => G.m === 2 || G.m === 3 || G.m === 9 || G.m === 10;

/* ---------- unit stacks ---------- */
const emptyLand = () => ({ inf:0, art:0, mtn:0, arm:0, par:0 });
const landN = u => u.inf + u.art + u.mtn + u.arm + u.par;
const unitsAt = p => landN(p.u);
const readyAt = p => landN(p.r);
function addLand(p, k, n, ready) { p.u[k] += n; if (ready) p.r[k] += n; }
function clampReady(p) { for (const k of LAND) { if (p.u[k] < 0) p.u[k] = 0; p.r[k] = clamp(p.r[k], 0, p.u[k]); } }
function clearLand(p) { p.u = emptyLand(); p.r = emptyLand(); }
// remove n units from a stack object, infantry first-ish, randomised by weight
function takeLosses(u, n) {
  const out = emptyLand(); let left = Math.min(n, landN(u));
  const W8 = { inf:1.3, art:1, mtn:1.1, arm:0.75, par:1 };
  while (left > 0) {
    let tot = 0; for (const k of LAND) tot += u[k] * W8[k];
    if (tot <= 0) break;
    let r = rnd() * tot;
    for (const k of LAND) { r -= u[k] * W8[k]; if (r <= 0 && u[k] > 0) { u[k]--; out[k]++; left--; break; } }
  }
  return out;
}
// take a portion of a stack's ready units: 'all' | 'half' | 'one' | explicit {k:n}
function portion(p, amt) {
  const o = emptyLand();
  if (amt && typeof amt === 'object') { for (const k of LAND) o[k] = clamp(amt[k] | 0, 0, p.r[k]); return o; }
  if (amt === 'one') { for (const k of ['inf','mtn','art','par','arm']) if (p.r[k] > 0) { o[k] = 1; break; } return o; }
  for (const k of LAND) o[k] = amt === 'half' ? Math.ceil(p.r[k] / 2) : p.r[k];
  return o;
}
function moveLand(from, to, part) {
  for (const k of LAND) { const n = Math.min(part[k], from.u[k]); from.u[k] -= n; from.r[k] = Math.max(0, from.r[k] - n); to.u[k] += n; }
  // veterancy blends by size
  const a = landN(part), b = landN(to.u) - a;
  if (a > 0) { to.xp = b > 0 ? (to.xp * b + from.xp * a) / (a + b) : from.xp; to.dig = b > 0 ? Math.min(to.dig, 1) : 0; }
  if (!unitsAt(from)) { from.dig = 0; from.xp = 0; }
}

/* ---------- new game ---------- */
function newNation(t) {
  const d = NATDEF[t];
  const n = { tag:t, name:d.n, adj:d.a, color:d.c, ide:d.i, alive:!d.off && t !== 'VIC', pp:30, mp:d.mp || 10, pol:30, oil:10, steel:10,
    stab:d.stab || 55, ww:0, tech:{}, rs:[], slots:2, focus:null, done:[], intel:0, nextAtk:1, bonus:1,
    capital:d.cap ? ID[d.cap] : -1, dec:[], fx:{}, hand:[], played:0, spies:1, spyBusy:0, spyOk:0, genSlots:d.major ? 3 : 1,
    ops:null, totalWar:0, major:!!d.major, nprov0:0, rocket:false, bombCd:0, imports:0, guar:[], agendas:[],
    st:{ kills:0, losses:0, won:0, lost:0, caps:0, nav:0, air:0 }, aid:0 };
  for (const k of d.tech || []) n.tech[k] = 1;
  if (d.major) n.spies = 2;
  return n;
}
function newGame(opts) {
  // opts: {humans:{TAG:{name}}, diff, scenario, mode:'sp'|'hot'|'mp', gm, seed}
  const seed = opts.seed != null ? opts.seed >>> 0 : (Math.random() * 4294967296) >>> 0;
  G = { v:4, seed, rs:seed, mode:opts.mode || 'sp', gm:opts.gm || 'grand', sc:opts.scenario || 1936, diff:opts.diff || 'normal',
    humans:opts.humans || {}, turn:0, y:1936, m:0, tension:8, prov:[], nat:{}, wars:[], warStart:{}, truce:{}, pacts:{},
    facs:{ AXIS:{n:'Axis',lead:'GER',m:['GER']}, ALLIES:{n:'Allies',lead:'ENG',m:['ENG','FRA']}, COMINTERN:{n:'Comintern',lead:'SOV',m:['SOV']} },
    fleet:{}, gens:[], genId:1, ev:{}, flags:{}, log:[], news:[], inbox:{}, hist:[], over:false, orders:[], daily:opts.daily || null };
  for (const z in SEA) G.fleet[z] = {};
  for (const t in NATDEF) G.nat[t] = newNation(t);
  for (const p of PROV) {
    G.prov.push({ o:p.owner0, core:p.owner0, u:emptyLand(), r:emptyLand(), air:{ ftr:0, bmb:0 }, ad:0, fort:START_FORTS[p.name] || 0, fac:p.fac0, dig:0, xp:0, res:0, smoke:0, burn:0, sup:1 });
    G.nat[p.owner0].nprov0++;
  }
  for (const t in NATDEF) placeStartingForces(t);
  addLandAt('Gibraltar', 'inf', 2); addLandAt('Malta', 'inf', 1); addLandAt('Strasbourg', 'inf', 3); addLandAt('Metz', 'inf', 3); addLandAt('Viipuri', 'inf', 2);
  rebuildWarSet();
  for (const t in G.nat) { const n = G.nat[t]; n.pp = Math.round(income(t) * 1.5); n.oil = 15 + oilIncome(t) * 3; n.steel = 15 + steelIncome(t) * 3; }
  for (const t of humanTags()) { if (G.diff === 'easy') nat(t).pp += 60; else nat(t).pp += 20; }
  if (G.sc !== 1936) applyScenario(G.sc);
  if (G.gm === 'blitz' && G.sc < 1939) applyScenario(1939);
  for (const t in G.nat) if (G.nat[t].alive) { drawCards(t, 2); }
  for (const t of humanTags()) assignAgendas(t);
  resetReady(); updateSupply();
  recordHistory();
  log(`${humanTags().length === 1 ? `You lead <b>${natName(humanTags()[0])}</b>.` : 'The war begins.'} ${SCENARIOS[G.sc].d}`);
  Hooks.emit('newgame', {});
  return G;
}
const START_FORTS = { Strasbourg:3, Metz:3, Sudetenland:2, Viipuri:2, Sevastopol:2, Gibraltar:3, Malta:2, Bern:2, Leningrad:1, Moscow:1, Saarbrücken:1, Brussels:1, Istanbul:1, Bratislava:1, Brno:1 };
function addLandAt(name, k, n) { G.prov[ID[name]].u[k] += n; }
function placeStartingForces(t) {
  const d = NATDEF[t]; if (!d.u) return;
  const mine = PROV.filter(p => p.owner0 === t);
  if (!mine.length) return;
  const border = p => p.adj.some(j => PROV[j].owner0 !== t);
  const cap = ID[d.cap];
  let left = d.u.inf || 0;
  for (const p of mine) if (left > 0 && (p.vp >= 2 || border(p) || mine.length < 4)) { G.prov[p.id].u.inf++; left--; }
  const wsum = sum(mine, p => p.vp + (border(p) ? 3 : 0) + 0.5);
  let guard = 0;
  while (left > 0 && guard++ < 5000) {
    let r = rnd() * wsum;
    for (const p of mine) { r -= p.vp + (border(p) ? 3 : 0) + 0.5; if (r <= 0) { G.prov[p.id].u.inf++; left--; break; } }
  }
  // artillery and mountaineers spread over the strongest border stacks, armor at the capital
  const strong = mine.filter(border).sort((a, b) => G.prov[b.id].u.inf - G.prov[a.id].u.inf);
  const spread = (k, n, pool) => { for (let i = 0; i < n; i++) G.prov[(pool[i % pool.length] || PROV[cap]).id].u[k]++; };
  if (d.u.art) spread('art', d.u.art, strong.length ? strong : mine);
  if (d.u.mtn) spread('mtn', d.u.mtn, mine.filter(p => 'mh'.includes(p.ter)).concat(strong));
  if (d.u.par) spread('par', d.u.par, [PROV[cap]]);
  if (d.u.arm) G.prov[cap].u.arm += d.u.arm;
  if (d.u.ftr) G.prov[cap].air.ftr += d.u.ftr;
  if (d.u.bmb) G.prov[cap].air.bmb += d.u.bmb;
  if (d.navy) for (const z in d.navy) { const [c, s] = d.navy[z]; addFleet(z, t, 'cap', c); addFleet(z, t, 'sub', s); }
}
function addFleet(z, t, k, n) {
  if (!n) return;
  const f = G.fleet[z][t] || (G.fleet[z][t] = { cap:0, sub:0, mv:0 });
  f[k] += n;
}
function fleetOf(z, t) { return G.fleet[z][t] || { cap:0, sub:0, mv:0 }; }

function rebuildWarSet() { G.warSet = new Set(G.wars); }
function resetReady() {
  for (const p of G.prov) { for (const k of LAND) p.r[k] = p.u[k]; p.ad = 0; }
  for (const z in G.fleet) for (const t in G.fleet[z]) G.fleet[z][t].mv = 0;
  for (const t in G.nat) { G.nat[t].rocket = false; G.nat[t].imports = 0; }
}
function log(txt) { G.log.unshift({ d:MONTHS[G.m] + ' ' + G.y, txt }); if (G.log.length > 120) G.log.length = 120; }
function tension(n) { G.tension = clamp(G.tension + n, 0, 100); }
function news(txt) { G.news.unshift(txt); if (G.news.length > 10) G.news.length = 10; Hooks.emit('news', txt); }
function owned(t) { const r = []; for (let i = 0; i < NP; i++) if (G.prov[i].o === t) r.push(i); return r; }
function divisions(t) { const o = emptyLand(); for (const p of G.prov) if (p.o === t) for (const k of LAND) o[k] += p.u[k]; return o; }
function airOf(t) { let f = 0, b = 0; for (const p of G.prov) if (p.o === t) { f += p.air.ftr; b += p.air.bmb; } return { ftr:f, bmb:b }; }
function navyOf(t) { let c = 0, s = 0; for (const z in G.fleet) { const f = G.fleet[z][t]; if (f) { c += f.cap; s += f.sub; } } return { cap:c, sub:s }; }
let _tvp = 0; function totalVP() { return _tvp || (_tvp = sum(PROV, p => p.vp)); }
function vpOf(t) { let s = 0; for (let i = 0; i < NP; i++) if (G.prov[i].o === t) s += PROV[i].vp; return s; }
function capitalOk(t) { const n = nat(t); return n.capital >= 0 && G.prov[n.capital] && G.prov[n.capital].o === t; }
function homeProv(t) { const n = nat(t); return capitalOk(t) ? n.capital : (owned(t).sort((a, b) => PROV[b].vp - PROV[a].vp)[0] ?? -1); }
function recordHistory() {
  // one character per province: index into the nation list. Feeds the timelapse and the score graphs.
  const tags = Object.keys(NATDEF);
  let s = ''; for (const p of G.prov) s += String.fromCharCode(48 + tags.indexOf(p.o));
  const vp = {}; for (const t in G.nat) if (G.nat[t].alive) { const v = vpOf(t); if (v) vp[t] = v; }
  G.hist.push({ t:G.turn, y:G.y, m:G.m, o:s, vp });
}
