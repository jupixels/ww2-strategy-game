'use strict';
/* ================= SEA CONTROL ================= */
function fleetPower(f, t) { if (!f) return 0; const n = nat(t); const fuel = n && n.oil <= 0 ? 0.6 : 1; return (f.cap * 3 * (n && n.tech.carrier ? 1.4 : 1) + f.sub * 0.6) * fuel; }
// returns 'free' | 'ours' | 'contested' | 'enemy' from t's point of view
function seaControl(z, t) {
  let fs = 0, hs = 0;
  for (const o in G.fleet[z]) { const p = fleetPower(G.fleet[z][o], o); if (!p) continue; if (friendly(o, t)) fs += p; else if (W(o, t)) hs += p; }
  if (!hs) return fs ? 'ours' : 'free';
  if (!fs) return 'enemy';
  return hs > fs * 1.3 ? 'enemy' : fs > hs * 1.3 ? 'ours' : 'contested';
}
function passable(za, zb, t) { const s = STRAITS[SEAKEY(za, zb)]; if (!s) return true; const o = O(s); return !W(t, o); }
// zones a land force at a coastal province can sail through: its own zones plus one hop beyond
function sailZones(pid, t) {
  const r = new Set();
  for (const z of PROV[pid].zones) { if (seaControl(z, t) === 'enemy') continue; r.add(z); for (const z2 of SEA[z].adj) if (passable(z, z2, t) && seaControl(z2, t) !== 'enemy') r.add(z2); }
  return r;
}
function navalTargets(pid, t) {
  const out = new Map(); if (!PROV[pid].coast) return out;
  const zs = sailZones(pid, t);
  for (const z of zs) for (const j of ZONE_PROVS[z]) {
    if (j === pid || PROV[pid].adj.includes(j) || out.has(j) || dist(pid, j) > 760) continue;
    const o = G.prov[j].o;
    if (o === t) out.set(j, 'naval'); else if (W(t, o)) out.set(j, 'land');
  }
  return out;
}
function fleetTargets(z, t) { return SEA[z].adj.filter(z2 => passable(z, z2, t)); }

/* ================= SUPPLY ================= */
// Supply is graded: full near depots (capitals, home cities, long-held big cities and friendly ports),
// thinner the further an army is from them, and zero when cut off.
const supLevel = d => d <= 3 ? 1 : d <= 5 ? 0.8 : d <= 7 ? 0.6 : 0.45;
function updateSupply() {
  const groups = {};
  for (const t in G.nat) if (A(t)) { const g = facOf(t) || t; (groups[g] || (groups[g] = [])).push(t); }
  const D = new Int16Array(NP).fill(999);
  for (const g in groups) {
    const ms = new Set(groups[g]); const ok = i => ms.has(G.prov[i].o);
    const q = [];
    const seed = i => { if (ok(i) && D[i] > 0) { D[i] = 0; q.push(i); } };
    for (const t of ms) if (capitalOk(t)) seed(nat(t).capital);
    for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (!ok(i)) continue; if ((p.core === p.o && PROV[i].vp >= 4) || (PROV[i].vp >= 5 && G.turn - (p.ht || 0) >= 6 && p.res < 40)) seed(i); }
    const flood = () => { while (q.length) { const i = q.shift(); for (const j of PROV[i].adj) if (ok(j) && D[j] > D[i] + 1) { D[j] = D[i] + 1; q.push(j); } } };
    flood();
    // ports: well-supplied coastal provinces push supply across zones the enemy does not control
    const any = groups[g][0];
    const seaOk = new Set(), zq = [];
    for (let i = 0; i < NP; i++) if (D[i] <= 2 && ok(i) && PROV[i].coast && (G.prov[i].core === G.prov[i].o || PROV[i].vp >= 2)) for (const z of PROV[i].zones) if (!seaOk.has(z) && seaControl(z, any) !== 'enemy') { seaOk.add(z); zq.push(z); }
    while (zq.length) { const z = zq.shift(); for (const z2 of SEA[z].adj) if (!seaOk.has(z2) && passable(z, z2, any) && seaControl(z2, any) !== 'enemy') { seaOk.add(z2); zq.push(z2); } }
    for (const z of seaOk) for (const i of ZONE_PROVS[z]) if (ok(i) && D[i] > 2 && PROV[i].vp >= 1) { D[i] = 2; q.push(i); }
    flood();
  }
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; p.sup = !A(p.o) ? 1 : D[i] >= 999 ? 0 : supLevel(D[i]); }
}

/* ================= AIR ================= */
function airPower(sideOf, pid, kind) {
  // kind: 'ftr' | 'bmb'. sideOf(tag) -> true for the nations that count
  let s = 0; const P = PROV[pid];
  for (let i = 0; i < NP; i++) {
    const q = G.prov[i]; const v = q.air[kind]; if (!v || !sideOf(q.o)) continue;
    const n = nat(q.o); const range = AIR_RANGE * (kind === 'bmb' && n.tech.bmb2 ? 1.3 : 1);
    if (Math.hypot(PROV[i].x - P.x, PROV[i].y - P.y) > range) continue;
    let m = 1; if (kind === 'ftr') m *= 1 + (n.tech.ftr2 ? 0.3 : 0) + (n.tech.jet ? 0.6 : 0);
    if (n.oil <= 0) m *= 0.6;
    s += v * m;
  }
  return s;
}
function airBalance(a, d, pid) {
  const fa = airPower(t => friendly(t, a), pid, 'ftr'), fd = airPower(t => friendly(t, d), pid, 'ftr') * (hasTech(d, 'radar') ? 1.25 : 1);
  const share = fa + fd > 0 ? fa / (fa + fd) : 0.5;
  const ba = airPower(t => friendly(t, a), pid, 'bmb'), bd = airPower(t => friendly(t, d), pid, 'bmb');
  return { fa, fd, share, ba, bd };
}

/* ================= GENERALS ================= */
const genAt = (pid, t) => G.gens.find(g => g.pid === pid && g.tag === t) || null;
function rosterFor(t) {
  const used = new Set(G.gens.map(g => g.name));
  const list = (GENERALS[t] || []).filter(([nm, , y]) => !used.has(nm) && G.y >= y);
  return list;
}
function canHire(t) { const n = nat(t); if (G.gens.filter(g => g.tag === t).length >= n.genSlots) return 'No free general slots'; if (n.pol < 25) return 'Needs 25 politics'; return ''; }
function hireGeneral(t, free, pick) {
  const n = nat(t); if (!free && canHire(t)) return null;
  if (G.gens.filter(g => g.tag === t).length >= n.genSlots && !free) return null;
  const ros = rosterFor(t);
  let name, tr;
  if (pick && ros.find(r => r[0] === pick)) [name, tr] = ros.find(r => r[0] === pick);
  else if (ros.length) [name, tr] = ros[0];
  else { name = pickR(GEN_NAMES.filter(x => !G.gens.some(g => g.name === x))) || 'Gen. Unknown'; tr = pickR(GEN_TRAITS); }
  if (!free) n.pol -= 25;
  // posted to the biggest army
  const mine = owned(t).sort((x, y) => unitsAt(G.prov[y]) - unitsAt(G.prov[x]));
  const pid = mine.find(i => !genAt(i, t)) ?? homeProv(t);
  const g = { id:G.genId++, name, tag:t, tr, pid, lv:1, xp:0 };
  G.gens.push(g);
  return g;
}
function genBonus(g, kind, ter, u) {
  if (!g) return 1;
  let m = 1 + 0.05 * (g.lv - 1);
  const T = g.tr;
  if (kind === 'atk') { if (T === 'offensive') m *= 1.15; if (T === 'panzer' && u && u.arm > 0) m *= 1 + 0.2 * u.arm / Math.max(1, landN(u)) * 2; }
  if (kind === 'def') { if (T === 'defensive') m *= 1.2; if (T === 'urban' && ter === 'u') m *= 1.25; }
  if (T === 'desert' && ter === 'd') m *= 1.25;
  if (T === 'mountain' && 'mh'.includes(ter)) m *= 1.2;
  if (T === 'winter' && 'ft'.includes(ter)) m *= 1.15;
  return m;
}
function genXP(g, n) { if (!g) return; g.xp += n; const lv = g.xp >= 8 ? 3 : g.xp >= 3 ? 2 : 1; if (lv > g.lv) { g.lv = lv; notify(g.tag, '★', `${g.name} promoted`, `Now rank ${lv}: +${(lv - 1) * 5}% in every battle.`, 'medal'); if (lv === 3) award(g.tag, 'general'); } }
function fixGenerals() { G.gens = G.gens.filter(g => A(g.tag)); for (const g of G.gens) if (!G.prov[g.pid] || G.prov[g.pid].o !== g.tag) { const h = homeProv(g.tag); if (h >= 0 && !genAt(h, g.tag)) g.pid = h; else { const alt = owned(g.tag).find(i => !genAt(i, g.tag)); if (alt != null) g.pid = alt; } } }
// a general whose army leaves goes with it; one whose province falls retreats or is captured
function moveGeneral(from, to, t) { const g = genAt(from, t); if (g && !genAt(to, t)) g.pid = to; }
function displaceGeneral(pid, t, retreatTo) {
  const g = genAt(pid, t); if (!g) return;
  if (retreatTo != null && retreatTo >= 0 && !genAt(retreatTo, t)) { g.pid = retreatTo; return; }
  const alt = PROV[pid].adj.find(j => G.prov[j].o === t && !genAt(j, t));
  if (alt != null && rnd() < 0.75) { g.pid = alt; return; }
  G.gens = G.gens.filter(x => x !== g);
  notify(t, '!', `${g.name} captured`, `Your general was taken prisoner at ${PROV[pid].name}.`, 'war');
  news(`${g.name.toUpperCase()} TAKEN PRISONER`);
}

/* ================= COMBAT ================= */
const WINTER_LANDS = new Set(['SOV','FIN']);
function unitStrength(n, u, attacking, ter, opts = {}) {
  const T = n.tech, infMul = 1 + 0.15 * ((T.inf1 ? 1 : 0) + (T.inf2 ? 1 : 0) + (T.inf3 ? 1 : 0));
  const rough = 'mfsu'.includes(ter), hilly = 'mh'.includes(ter);
  const fuel = n.oil <= 0 ? 0.6 : 1;
  let s = 0;
  s += u.inf * infMul;
  s += u.mtn * infMul * (attacking ? 1.0 : 1.1) * (hilly ? (attacking ? 1.5 : 1.3) : 1);
  s += u.par * infMul * (attacking ? 1.2 : 0.9);
  s += u.art * (attacking ? 1.5 : 0.9) * (T.art2 ? 1.3 : 1);
  const armA = (2.6 + (T.arm2 ? 0.5 : 0) + (T.arm3 ? 0.5 : 0)) * (T.mobile ? 1.1 : 1) * (rough ? 0.6 : 1) * (opts.blitz ? 1.25 : 1);
  const armD = 1.8 + (T.arm2 ? 0.3 : 0) + (T.arm3 ? 0.3 : 0);
  s += u.arm * (attacking ? armA : armD) * fuel * (opts.mud ? 0.8 : 1);
  if (attacking && T.combined && u.arm > 0 && u.art > 0 && u.inf > 0) s *= 1.15;
  if (n.tag === 'SOV' && G.flags.purge && G.y < 1942) s *= 0.8;
  return s;
}
function defenseValue(pid, atkUnits, atkTag, detail) {
  const p = G.prov[pid], P = PROV[pid], n = nat(p.o);
  const f = detail || [];
  let s = unitStrength(n, p.u, false, P.ter);
  if (unitsAt(p) > 0 && P.vp >= 8) s += 1.5;
  f.push(['Troops', s]);
  const mul = (label, m) => { if (Math.abs(m - 1) > 0.005) { s *= m; f.push([label, m]); } };
  mul(TER[P.ter].n, TER[P.ter].d);
  const artShare = atkUnits && landN(atkUnits) ? atkUnits.art / landN(atkUnits) : 0;
  mul('Forts', 1 + 0.25 * p.fort * (1 - 0.6 * artShare));
  mul('Dug in', 1 + p.dig * (n.tech.grand ? 0.1 : 0.05));
  mul('Veterancy', 1 + 0.08 * p.xp);
  mul('Doctrine', n.tech.depth ? 1.1 : 1);
  mul('Capital', n.capital === pid ? 1.25 : 1);
  mul('General', genBonus(genAt(pid, p.o), 'def', P.ter));
  mul(p.sup ? 'Supply' : 'Out of supply', 0.75 + 0.25 * p.sup);
  mul('Low stability', n.stab < 20 ? 0.9 : 1);
  if (G.flags.gpw && p.o === 'SOV' && p.core === 'SOV' && G.y < 1944) mul('Not one step back', 1.15);
  mul('Hold the line', n.fx.maginot ? 1.2 : 1);
  mul('Codebreakers', n.fx.codebreak ? 1.1 : 1);
  if (atkTag && nat(atkTag).fx.fifth === pid) mul('Fifth column', 0.5);
  mul('Difficulty', diffMul(p.o, 'cb'));
  mul('National spirit', n.bonus);
  return s;
}
// srcs: [{id, u:{inf..}}] or a virtual source {id:-1, o, u}
function attackValue(t, u, pid, opts, detail) {
  const n = nat(t), P = PROV[pid], d = G.prov[pid], f = detail || [];
  const mud = isMud() && P.muddy && !n.fx.weather;
  let s = unitStrength(n, u, true, P.ter, { blitz:!!n.fx.blitz, mud });
  f.push(['Troops', s]);
  const mul = (label, m) => { if (Math.abs(m - 1) > 0.005) { s *= m; f.push([label, m]); } };
  const ab = airBalance(t, d.o, pid);
  mul('Air superiority', 1 + 0.3 * (2 * ab.share - 1));
  mul('Bombers', 1 + Math.min(0.3, 0.03 * ab.ba * ab.share) - Math.min(0.2, 0.02 * ab.bd * (1 - ab.share)));
  if (opts.naval) { const g = opts.from >= 0 ? genAt(opts.from, t) : null; mul('Naval landing', g && g.tr === 'amphib' ? 1 : n.tech.amph ? 0.75 : 0.5); }
  if (opts.para) mul('Airdrop', 0.85);
  if (P.coast && !opts.meeting) { let caps = 0; for (const z of P.zones) caps = Math.max(caps, sum(Object.keys(G.fleet[z]).filter(o => friendly(o, t)), o => G.fleet[z][o].cap)); mul('Naval bombardment', 1 + Math.min(0.25, 0.05 * caps)); }
  const winterProof = WINTER_LANDS.has(t) || n.fx.weather || (opts.from >= 0 && genAt(opts.from, t) && genAt(opts.from, t).tr === 'winter');
  if (isWinter() && P.cold && !winterProof) mul('Winter', 0.65);
  if (mud && !winterProof) mul('Mud', 0.8);
  if (opts.from >= 0) { const sp = G.prov[opts.from]; mul('Veterancy', 1 + 0.08 * sp.xp); if (sp.sup < 1) { const g = genAt(opts.from, t); if (!(g && g.tr === 'logistics')) mul(sp.sup ? 'Supply lines' : 'Out of supply', 0.55 + 0.45 * sp.sup); } mul('General', genBonus(genAt(opts.from, t), 'atk', P.ter, u)); }
  if (n.fx.march && (P.vp >= 5 || (A(d.o) && nat(d.o).capital === pid))) mul('March on the capital', 1.3);
  if (n.ops && n.ops.tg.includes(pid)) mul('Operation ' + n.ops.name, 1.15);
  if (A(d.o) && nat(d.o).fx.scorched) mul('Scorched earth', 0.8);
  if (n.nextAtk && n.nextAtk !== 1) mul('Surprise', n.nextAtk);
  mul('Doctrine', n.tech.doc3 ? 1.1 : 1);
  mul('Difficulty', diffMul(t, 'cb'));
  mul('National spirit', n.bonus);
  if (opts.meeting) mul('Meeting engagement', 1);
  return s;
}
function battle(srcs, tid, opts = {}) {
  const a = srcs[0].id >= 0 ? G.prov[srcs[0].id].o : srcs[0].o;
  const an = nat(a), T = G.prov[tid], d = T.o, P = PROV[tid];
  const au = emptyLand();
  for (const s of srcs) { for (const k of LAND) au[k] += s.u[k]; if (s.id >= 0) { const sp = G.prov[s.id]; for (const k of LAND) { sp.u[k] -= s.u[k]; sp.r[k] = Math.max(0, sp.r[k] - s.u[k]); } clampReady(sp); } }
  const res = { a, d, tid, from:srcs.map(s => s.id), win:false, walk:false, r:0, al:0, dl:0, kessel:0, blitz:false, naval:!!opts.naval, para:!!opts.para, af:[], df:[], au:{ ...au }, du:{ ...T.u } };
  const mainFrom = srcs[0].id;
  const g = mainFrom >= 0 ? genAt(mainFrom, a) : null;
  if (unitsAt(T) === 0) {
    res.win = res.walk = true;
    capture(tid, a, au, res, mainFrom);
    return res;
  }
  const ab = airBalance(a, d, tid);
  res.air = ab;
  let atk = attackValue(a, au, tid, { naval:opts.naval, para:opts.para, from:mainFrom, meeting:opts.meeting }, res.af);
  const def = Math.max(0.3, opts.meeting ? unitStrength(nat(d), T.u, false, 'p') : defenseValue(tid, au, a, res.df));
  const roll = 0.85 + rnd() * 0.3, roll2 = 0.85 + rnd() * 0.3;
  an.nextAtk = 1;
  const r = atk * roll / (def * roll2); res.r = r; res.odds = atk / def;
  const dLoss = clamp(0.16 * r, 0.05, 0.85), aLoss = clamp(0.16 / r, 0.04, 0.7);
  const dl = takeLosses(T.u, rr(unitsAt(T) * dLoss)), al = takeLosses(au, rr(landN(au) * aLoss));
  clampReady(T);
  res.al = landN(al); res.dl = landN(dl); res.alU = al; res.dlU = dl;
  an.lm = (an.lm || 0) + res.al; if (A(d)) nat(d).lm = (nat(d).lm || 0) + res.dl;
  // air war
  if (ab.fa > 0 && ab.share > 0.7) { an.st.air++; if (isHuman(a)) award(a, 'ace'); }
  if (r > 1 && landN(au) > 0) {
    res.win = true;
    // defenders fall back or are encircled
    const back = PROV[tid].adj.filter(j => { const o = G.prov[j].o; return o === d || (friendly(o, d) && A(o)); });
    let retreatTo = -1;
    if (unitsAt(T) > 0) {
      if (back.length && !opts.para) {
        back.sort((x, y) => (G.prov[y].o === d) - (G.prov[x].o === d) || unitsAt(G.prov[y]) - unitsAt(G.prov[x]));
        const bp = G.prov[back[0]]; retreatTo = back[0];
        if (bp.o === d) { for (const k of LAND) bp.u[k] += T.u[k]; } else { res.dl += unitsAt(T); }
      } else { res.kessel = unitsAt(T); res.dl += res.kessel; }
    }
    clearLand(T);
    displaceGeneral(tid, d, retreatTo);
    res.blitz = (an.tech.blitz || an.fx.blitz) && au.arm > 0 && r >= 2;
    G.prov[tid].xp = Math.min(3, (mainFrom >= 0 ? G.prov[mainFrom].xp : 0) + 0.35);
    if (g) { genXP(g, 1); g.pid = tid; }
    capture(tid, a, au, res, mainFrom);
  } else {
    // repulsed: survivors return, split by each source's share
    const tot = sum(srcs, s => landN(s.u)) || 1;
    const left = { ...au };
    srcs.forEach((s, i) => {
      const last = i === srcs.length - 1, sh = landN(s.u) / tot, part = emptyLand();
      for (const k of LAND) { part[k] = last ? left[k] : Math.min(left[k], Math.round(au[k] * sh)); left[k] -= part[k]; }
      const home = s.id >= 0 && G.prov[s.id].o === a ? s.id : homeProv(a);
      if (home >= 0 && G.prov[home].o === a && !opts.para) for (const k of LAND) G.prov[home].u[k] += part[k];
    });
    T.xp = Math.min(3, T.xp + 0.25);
    const dg = genAt(tid, d); if (dg) genXP(dg, 1);
  }
  an.st.kills += res.dl; an.st.losses += res.al; res.win ? an.st.won++ : an.st.lost++;
  if (A(d)) { const dn = nat(d); dn.st.kills += res.al; dn.st.losses += res.dl; }
  for (const t2 of [a, d]) if (A(t2)) nat(t2).lmSeen = 1;
  T.smoke = 2;
  if (isHuman(a) && res.win && !res.walk) award(a, 'first');
  return res;
}
function capture(tid, a, u, res, from) {
  const T = G.prov[tid], prev = T.o, P = PROV[tid];
  let newOwner = a;
  if (T.core !== a && A(T.core) && friendly(a, T.core) && T.core !== prev) newOwner = T.core; // liberation
  // air wings caught on the ground fly to a nearby friendly field, or are lost
  for (const k of AIR) if (T.air[k]) { const alt = PROV[tid].adj.find(j => G.prov[j].o === prev); if (alt != null) G.prov[alt].air[k] += T.air[k]; T.air[k] = 0; }
  if (A(prev) && nat(prev).fx.scorched) T.fac = 0;
  T.o = newOwner; T.u = { ...u }; T.r = emptyLand(); T.ht = G.turn;
  if (res && res.blitz) T.r.arm = u.arm;
  T.dig = 0;
  if (newOwner !== a && res) res.liberated = newOwner;
  if (T.fort > 0 && !(res && res.walk)) T.fort--;
  T.res = T.core === newOwner ? 0 : Math.max(T.res, 15);
  if (P.vp >= 4 && !(res && res.walk)) T.burn = 2;
  displaceGeneral(tid, prev, -1);
  if (newOwner !== a && from >= 0) { /* liberators hand the province over and their troops stay as guests */ }
  Hooks.emit('capture', { tid, from:prev, to:newOwner });
  const an = nat(a); an.st.caps++;
  if (isHuman(a)) {
    if (P.name === 'Paris' && a !== 'FRA') award(a, 'paris');
    if (P.name === 'London') award(a, 'london');
    if (P.name === 'Moscow') award(a, 'moscow');
    if (P.name === 'Gibraltar') award(a, 'rock');
    if (P.name === 'Bern') award(a, 'swiss');
    if (res && res.kessel >= 5) award(a, 'kessel');
    if (owned(a).filter(i => PROV[i].oil).length >= 4) award(a, 'oilbaron');
  }
  if (P.vp >= 8) news(`${P.name.toUpperCase()} FALLS TO ${nat(a).adj.toUpperCase()} FORCES`);
  if (an.ops && an.ops.tg.includes(tid)) checkOperation(a);
  checkRestore(tid, a);
  checkCapitulation(prev, a);
}
function checkCapitulation(d, w) {
  if (!A(d) || d === w) return;
  const n = nat(d), mine = owned(d);
  if (!mine.length) return capitulate(d, w);
  let coreVP = 0, holdVP = 0;
  for (let i = 0; i < NP; i++) if (G.prov[i].core === d) { coreVP += PROV[i].vp + 0.5; if (G.prov[i].o === d) holdVP += PROV[i].vp + 0.5; }
  const capLost = !capitalOk(d);
  const small = n.nprov0 <= 4;
  const thr = (d === 'SOV' ? 0.3 : 0.45) + (n.stab < 25 ? 0.15 : 0);
  if (capLost && (small || holdVP / Math.max(1, coreVP) < thr)) return capitulate(d, w);
  if (capLost) {
    const best = mine.sort((x, y) => PROV[y].vp - PROV[x].vp)[0];
    n.capital = best; n.stab = Math.max(0, n.stab - 10);
    notify(d, '!', 'The capital has fallen', `Your government relocates to ${PROV[best].name}.`, 'war');
    news(`${n.name.toUpperCase()} GOVERNMENT FLEES TO ${PROV[best].name.toUpperCase()}`);
  }
}
function capitulate(d, w) {
  const n = nat(d); if (!n.alive) return;
  const wn = nat(w), k = wkey(d, w);
  if (isHuman(w) && G.warStart[k] != null && G.turn - G.warStart[k] <= 3) award(w, 'blitz');
  if (isHuman(w) && !wn.major && n.major) award(w, 'underdog');
  let vichy = false;
  if (d === 'FRA' && isAxis(w) && !G.flags.vichy && owned('FRA').length > 2) {
    vichy = true; G.flags.vichy = 1;
    const v = nat('VIC'); v.alive = true; v.pp = 20; v.mp = 20; v.oil = 10; v.steel = 10;
    for (const p of G.prov) if (p.o === 'FRA') { p.o = 'VIC'; p.u.inf = Math.ceil(p.u.inf / 2); p.u.arm = 0; p.u.art = 0; clampReady(p); }
    v.capital = O('Marseille') === 'VIC' ? ID['Marseille'] : owned('VIC')[0];
    v.tech = { ...n.tech };
    for (const z in G.fleet) if (G.fleet[z].FRA) { G.fleet[z].VIC = G.fleet[z].FRA; delete G.fleet[z].FRA; }
    if (isHuman('FRA')) { G.humans.VIC = G.humans.FRA; delete G.humans.FRA; Hooks.emit('switch', { from:'FRA', to:'VIC' }); }
  } else {
    for (const p of G.prov) if (p.o === d) {
      const back = p.core !== d && A(p.core) && friendly(p.core, w) ? p.core : w;
      p.o = back; if (back === w) clearLand(p); p.u.arm = 0; clampReady(p);
      for (const kk of AIR) p.air[kk] = 0;
      p.res = p.core === back ? 0 : Math.max(p.res, 25);
    }
    // the navy is scuttled or seized
    for (const z in G.fleet) if (G.fleet[z][d]) { const f = G.fleet[z][d]; if (rnd() < 0.5) addFleet(z, w, 'cap', Math.floor(f.cap / 2)); delete G.fleet[z][d]; }
  }
  G.gens = G.gens.filter(g => g.tag !== d || vichy);
  if (vichy) G.gens.forEach(g => { if (g.tag === 'FRA') g.tag = 'VIC'; });
  killNation(d, w);
  const head = vichy ? 'FRANCE SIGNS ARMISTICE — VICHY REGIME FORMED' : `${n.name.toUpperCase()} CAPITULATES`;
  news(head);
  log(`<b>${n.name}</b> capitulated to <b>${wn.name}</b>.`);
  sendNews('*', { title:vichy ? 'France Falls' : `${n.name} Capitulates`, head,
    dek: vichy ? 'Marshal Pétain signs the armistice in the forest of Compiègne; the south becomes the Vichy state' : `${wn.adj} columns parade through the streets of ${PROV[n.capital] ? PROV[n.capital].name : 'the capital'}`,
    text: vichy ? 'The Third Republic is dead. Northern France and the coast are occupied, while a rump French state governs the south and the colonies from a spa town in the Auvergne.' : `After a hopeless struggle the ${n.adj} government has laid down its arms. Its lands pass to ${wn.name}. Refugees crowd the roads; the victors count their spoils.`,
    plate:d });
  sfx('fanfare');
  if (isHuman(d) && !vichy) humanDefeated(d);
}
function killNation(d, w) {
  const n = nat(d); n.alive = false;
  for (const k of [...G.wars]) { const [a, b] = k.split('|'); if (a === d || b === d) endWar(a, b); }
  leaveFaction(d);
  Hooks.emit('dirty', { owners:true });
}
function humanDefeated(d) { G.humans[d].dead = true; Hooks.emit('defeated', { tag:d }); }
// a fallen nation's capital retaken by a friendly democracy or the Comintern can be restored as an ally
function checkRestore(tid, a) {
  const T = G.prov[tid], c = T.core;
  if (!c || c === a || A(c) || c === 'VIC' || NATDEF[c].off) return;
  if (NATDEF[c].cap !== PROV[tid].name) return;
  const fk = facOf(a); if (!fk) return;
  if (isHuman(a)) { sendDecision(a, { kind:'restore', tag:c, pid:tid }); return; }
  if (nat(a).ide === 'D' || nat(a).ide === 'C' || rnd() < 0.3) restoreNation(c, a);
}
function restoreNation(c, by) {
  const n = nat(c); if (n.alive) return;
  n.alive = true; n.pp = 30; n.mp = 30; n.oil = 10; n.steel = 10; n.stab = 50;
  for (let i = 0; i < NP; i++) {
    const p = G.prov[i]; if (p.core !== c || !friendly(p.o, by)) continue;
    // the liberators' armies step back onto their own soil if they can; otherwise they stay on as the new army
    const back = PROV[i].adj.find(j => G.prov[j].o === p.o);
    if (back != null && unitsAt(p)) { for (const k of LAND) G.prov[back].u[k] += p.u[k]; displaceGeneral(i, p.o, back); clearLand(p); }
    for (const k of AIR) if (p.air[k] && back != null) { G.prov[back].air[k] += p.air[k]; p.air[k] = 0; }
    p.o = c; p.r = emptyLand(); p.res = 0; if (!unitsAt(p)) p.u.inf = 2;
  }
  n.capital = ID[NATDEF[c].cap];
  const fk = facOf(by); if (fk) joinFaction(c, fk, true);
  news(`${n.name.toUpperCase()} RESTORED`);
  log(`<b>${n.name}</b> was restored to independence by <b>${natName(by)}</b>.`);
  if (isHuman(by)) award(by, 'liberator');
  Hooks.emit('dirty', { owners:true });
}

/* ================= OPERATIONS ================= */
const OP_NAMES = ['Thunderclap','Iron Gate','Sickle','Blue','Typhoon','Citadel','Bagration','Torch','Husky','Avalanche','Dragoon','Market','Cobra','Uranus','Mars','Seelöwe','Felix','Marita','Sunflower','Anvil','Hammer','Polar Star','Spring Awakening','Nordwind','Saturn','Kutuzov','Crusader','Compass','Battleaxe','Jupiter'];
function launchOperation(t, targets) {
  const n = nat(t); if (n.ops || !targets.length || n.pol < 10) return false;
  n.pol -= 10; n.ops = { name:pickR(OP_NAMES), tg:targets.slice(0, 4), left:4 };
  log(`<b>Operation ${n.ops.name}</b> launched: ${n.ops.tg.map(i => PROV[i].name).join(', ')}.`);
  return true;
}
function checkOperation(t) {
  const n = nat(t); if (!n.ops) return;
  if (n.ops.tg.every(i => friendly(G.prov[i].o, t))) {
    n.pol += 30; n.stab = Math.min(100, n.stab + 6);
    notify(t, '★', `Operation ${n.ops.name} succeeds`, 'Every objective taken: +30 politics, +6 stability.', 'medal'); sfx('fanfare', t);
    news(`OPERATION ${n.ops.name.toUpperCase()} A TRIUMPH`);
    n.ops = null;
  }
}

/* ================= SPECIAL WEAPONS & AIR RAIDS ================= */
function rocketTargets(t) {
  const mine = owned(t);
  return G.prov.map((p, i) => i).filter(i => W(t, G.prov[i].o) && mine.some(j => Math.hypot(PROV[i].x - PROV[j].x, PROV[i].y - PROV[j].y) < 520));
}
function fireRocket(t, tid) {
  const n = nat(t), p = G.prov[tid];
  n.rocket = true;
  const k = Math.max(1, Math.round(unitsAt(p) * 0.3));
  const lost = takeLosses(p.u, k); clampReady(p);
  if (p.fort) p.fort--;
  if (p.fac > 0 && rnd() < 0.4) p.fac--;
  p.smoke = 2;
  if (A(p.o)) nat(p.o).stab = Math.max(0, nat(p.o).stab - 2);
  return landN(lost);
}
function canBomb(t) { const n = nat(t); if (!n.tech.bomb) return 'Research The Bomb'; if (n.bombCd) return `Ready in ${n.bombCd} months`; if (n.pp < 150) return 'Needs 150 production'; return ''; }
function dropBomb(t, tid) {
  const n = nat(t), p = G.prov[tid], d = p.o;
  n.bombCd = 6; n.pp -= 150;
  const killed = unitsAt(p);
  clearLand(p); p.fac = Math.max(0, p.fac - 3); p.fort = 0; p.burn = 6; p.smoke = 6;
  for (const k of AIR) p.air[k] = 0;
  tension(25);
  if (A(d)) nat(d).stab = Math.max(0, nat(d).stab - 20);
  if (A(d) && nat(d).capital === tid) {
    let coreVP = 0, holdVP = 0;
    for (let i = 0; i < NP; i++) if (G.prov[i].core === d) { coreVP += PROV[i].vp; if (G.prov[i].o === d) holdVP += PROV[i].vp; }
    if (holdVP / Math.max(1, coreVP) < 0.75 || !nat(d).major) { p.o = t; Hooks.emit('dirty', { owners:true }); capitulate(d, t); return { killed, surrender:true }; }
  }
  return { killed, surrender:false };
}
function raidTargets(t, from) {
  const q = G.prov[from]; if (q.o !== t || !q.air.bmb || q.ad) return [];
  const range = AIR_RANGE * (hasTech(t, 'bmb2') ? 1.3 : 1);
  return G.prov.map((p, i) => i).filter(i => W(t, G.prov[i].o) && dist(from, i) <= range);
}
function airRaid(t, from, tid) {
  const q = G.prov[from], p = G.prov[tid], d = p.o;
  q.ad = 1;
  const fa = airPower(x => friendly(x, t), tid, 'ftr'), fd = airPower(x => friendly(x, d), tid, 'ftr') * (hasTech(d, 'radar') ? 1.25 : 1);
  const esc = fa + fd > 0 ? fa / (fa + fd) : 1;
  const power = q.air.bmb * (hasTech(t, 'bmb2') ? 2 : 1) * (0.4 + 0.6 * esc);
  const lost = Math.min(q.air.bmb, rr(q.air.bmb * 0.3 * (1 - esc)));
  q.air.bmb -= lost;
  let fac = 0, kills = 0;
  if (p.fac > 0 && rnd() < clamp(0.15 + 0.06 * power, 0, 0.9)) { p.fac--; fac = 1; }
  if (rnd() < 0.08 * power) { kills = landN(takeLosses(p.u, 1)); clampReady(p); }
  if (p.fort > 0 && rnd() < 0.05 * power) p.fort--;
  p.smoke = Math.max(p.smoke, 1);
  if (A(d)) nat(d).stab = Math.max(0, nat(d).stab - 1);
  return { fac, kills, lost, esc };
}
function paraTargets(t, from) {
  const p = G.prov[from]; if (p.o !== t || !p.r.par) return [];
  const h = hops(from);
  return G.prov.map((x, i) => i).filter(i => h[i] === PARA_RANGE && W(t, G.prov[i].o));
}

/* ================= NAVAL WAR ================= */
function navalBattle(z, a, b) {
  const fa = G.fleet[z][a], fb = G.fleet[z][b]; if (!fa || !fb) return null;
  const pa = fleetPower(fa, a) * (0.8 + rnd() * 0.4), pb = fleetPower(fb, b) * (0.8 + rnd() * 0.4);
  if (pa + pb <= 0) return null;
  const lose = (f, mine, theirs) => { const k = clamp(0.4 * theirs / (mine + theirs), 0.05, 0.6); const c = Math.min(f.cap, rr(f.cap * k)), s = Math.min(f.sub, rr(f.sub * k * 1.2)); f.cap -= c; f.sub -= s; return c + s; };
  const la = lose(fa, pa, pb), lb = lose(fb, pb, pa);
  const win = pa >= pb ? a : b;
  nat(win).st.nav++;
  if (isHuman(win)) award(win, 'admiral');
  for (const [t, f] of [[a, fa], [b, fb]]) if (f.cap + f.sub <= 0) delete G.fleet[z][t];
  // the loser's survivors withdraw to a friendly neighbouring zone
  const lo = win === a ? b : a, lf = G.fleet[z][lo];
  if (lf) { const alt = SEA[z].adj.find(z2 => passable(z, z2, lo) && seaControl(z2, lo) !== 'enemy'); if (alt) { addFleet(alt, lo, 'cap', lf.cap); addFleet(alt, lo, 'sub', lf.sub); delete G.fleet[z][lo]; } }
  const r = { zone:z, a, b, la, lb, win };
  Hooks.emit('naval', r);
  if (isHuman(a) || isHuman(b)) for (const t of [a, b]) if (isHuman(t)) notify(t, '⚓', `Naval battle in the ${SEA[z].n}`, `${win === t ? 'Victory' : 'Defeat'}: we lost ${t === a ? la : lb} ships, the enemy ${t === a ? lb : la}.`, win === t ? 'medal' : 'war');
  return r;
}
function moveFleet(t, from, to, part) {
  const f = G.fleet[from][t]; if (!f || f.mv) return false;
  if (!SEA[from].adj.includes(to) || !passable(from, to, t)) return false;
  const c = part === 'half' ? Math.ceil(f.cap / 2) : f.cap, s = part === 'half' ? Math.ceil(f.sub / 2) : f.sub;
  f.cap -= c; f.sub -= s;
  addFleet(to, t, 'cap', c); addFleet(to, t, 'sub', s); G.fleet[to][t].mv = 1;
  if (f.cap + f.sub <= 0) delete G.fleet[from][t];
  // engage anyone hostile waiting there
  for (const o of Object.keys(G.fleet[to])) if (o !== t && W(o, t)) navalBattle(to, t, o);
  return true;
}
function convoyRaids() {
  for (const t in G.nat) {
    const n = nat(t); if (!n.alive) { n.raid = 0; continue; }
    const mine = owned(t); if (!mine.length) { n.raid = 0; continue; }
    const coastal = mine.filter(i => PROV[i].coast); const share = coastal.length / mine.length;
    const zs = new Set(); for (const i of coastal) for (const z of PROV[i].zones) zs.add(z);
    let pr = 0;
    for (const z of zs) {
      let subs = 0, esc = 0;
      for (const o in G.fleet[z]) { const f = G.fleet[z][o]; if (W(o, t)) subs += f.sub * (hasTech(o, 'sub2') ? 2 : 1) * (nat(o).fx.wolfpack ? 3 : 1); else if (friendly(o, t)) esc += f.cap; }
      pr += Math.max(0, subs - esc * 0.8);
    }
    n.raid = clamp(pr * 0.018, 0, 0.3) * share;
  }
}
