'use strict';
/* ================= ECONOMY, RESEARCH, FOCUS ================= */
const factoryCost = f => 40 + f * 10;
const fortCost = f => 25 * (f + 1);
function diffMul(t, kind) {
  const pl = isHuman(t), D = { easy:{pp:1.3, cb:1.1, ai:0.85, aipp:0.9}, normal:{pp:1, cb:1, ai:1, aipp:1}, hard:{pp:0.9, cb:1, ai:1.15, aipp:1.15} }[G.diff] || { pp:1, cb:1, ai:1, aipp:1 };
  if (kind === 'pp') return pl ? D.pp : D.aipp * (G.gm === 'coop' && enemyOfHumans(t) ? 1.15 : 1);
  return pl ? D.cb : D.ai * (G.gm === 'coop' && enemyOfHumans(t) ? 1.08 : 1);
}
function enemyOfHumans(t) { return humanTags().some(h => W(h, t)); }
const stabMul = n => 0.75 + 0.5 * n.stab / 100;
function income(t) {
  const n = nat(t); let s = 3;
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o === t) s += p.fac * (p.core === t ? 1 : 0.5 * (1 - p.res / 100)); }
  s *= 1 + (n.tech.ind1 ? 0.1 : 0) + (n.tech.ind2 ? 0.1 : 0) + (n.tech.ind3 ? 0.15 : 0);
  if (t === 'SPA' && G.flags.spain && nowNum() < G.flags.spain) s *= 0.5;
  if (n.totalWar > 0) s *= 1.2;
  s *= stabMul(n) * (1 - (n.raid || 0));
  s *= diffMul(t, 'pp');
  if (G.gm === 'blitz') s *= 1.5;
  if (G.flags.usa && isAllied(t) && t !== 'USA' && nowNum() < ymNum(1946, 0)) s += t === 'ENG' ? 14 : t === 'SOV' ? 12 : 4;
  return Math.max(1, Math.round(s));
}
function mpIncome(t) {
  let s = 0;
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o !== t) continue; s += p.core === t ? 0.9 + 0.3 * PROV[i].vp : 0.25; }
  if (nat(t).tech.mass) s *= 1.2;
  if (G.gm === 'blitz') s *= 1.4;
  return Math.round(s * (isHuman(t) && G.diff === 'easy' ? 1.3 : 1));
}
const OIL_BASE = { ENG:9, FRA:5, GER:4, ITA:3, SPA:2, VIC:2, SWE:2 };
function oilIncome(t) {
  const n = nat(t); let s = 2 + (OIL_BASE[t] || 0) * (blockadedCached(t) ? 0.3 : 1);
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o === t && PROV[i].oil) s += PROV[i].oil * (p.core === t ? 1 : 0.6 * (1 - p.res / 100)); }
  if (n.tech.synth) s += 4; if (n.done.includes('ind_synth')) s += 3; if (n.done.includes('ger_autarky')) s += 3;
  if (G.flags.usa && isAllied(t) && t !== 'USA') s += 3;
  return Math.round(s);
}
function steelIncome(t) {
  const n = nat(t); let s = 2;
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o === t && PROV[i].steel) s += PROV[i].steel * (p.core === t ? 1 : 0.6 * (1 - p.res / 100)); }
  if (n.done.includes('ind_steel')) s += 3; if (n.done.includes('ita_autarchia')) s += 2; if (n.done.includes('sov_urals')) s += 4;
  if (G.flags.usa && isAllied(t) && t !== 'USA') s += 3;
  return Math.round(s);
}
function oilUpkeep(t) {
  let s = 0;
  for (const p of G.prov) if (p.o === t) { s += p.u.arm * UNIT.arm.up + p.air.ftr * UNIT.ftr.up + p.air.bmb * UNIT.bmb.up; }
  for (const z in G.fleet) { const f = G.fleet[z][t]; if (f) s += f.cap * UNIT.cap.up + f.sub * UNIT.sub.up; }
  return Math.round(s * 10) / 10;
}
const fuelShort = t => nat(t).oil <= 0;

/* ---------- building ---------- */
function unitCost(t, k) {
  const U = UNIT[k], n = nat(t), c = { pp:U.pp, mp:U.mp, st:U.st, oil:U.oil };
  if (k === 'inf' && n.tech.mass) { c.pp = 6; c.mp = 8; }
  if (k === 'arm' && n.done.includes('ger_panzer')) c.pp = 19;
  return c;
}
function canAfford(n, c, times = 1) { return n.pp >= c.pp * times && n.mp >= c.mp * times && n.steel >= c.st * times && n.oil >= c.oil * times; }
function pay(n, c) { n.pp -= c.pp; n.mp -= c.mp; n.steel -= c.st; n.oil -= c.oil; }
function canBuild(t, k, pid) {
  const n = nat(t), U = UNIT[k], p = G.prov[pid], P = PROV[pid];
  if (!p || p.o !== t) return 'Not your province';
  if (U.need && !n.tech[U.need]) return `Research ${TECH[U.need].n} first`;
  if ((k === 'ftr' && !n.tech.ftr1) || (k === 'bmb' && !n.tech.bmb1) || (k === 'cap' && !n.tech.cap1) || (k === 'sub' && !n.tech.sub1)) return 'Research it first';
  if (LAND.includes(k) && !p.sup) return 'Out of supply';
  if (LAND.includes(k) && p.core !== t && p.res > 50) return 'Too much resistance here';
  if (AIR.includes(k) && P.vp < 2 && n.capital !== pid) return 'Air wings need a city (2+ VP)';
  if (NAVY.includes(k) && (!P.coast || p.core !== t)) return 'Needs a coastal home province';
  const c = unitCost(t, k);
  if (n.pp < c.pp) return 'Not enough production';
  if (n.mp < c.mp) return 'Not enough manpower';
  if (n.steel < c.st) return 'Not enough steel';
  if (n.oil < c.oil) return 'Not enough oil';
  return '';
}
function build(t, k, pid, zone) {
  if (canBuild(t, k, pid)) return false;
  const n = nat(t), p = G.prov[pid];
  pay(n, unitCost(t, k));
  if (LAND.includes(k)) p.u[k]++;
  else if (AIR.includes(k)) p.air[k]++;
  else addFleet(zone && PROV[pid].zones.includes(zone) ? zone : PROV[pid].zones[0], t, k, 1);
  return true;
}
function canFactory(t, pid) { const n = nat(t), p = G.prov[pid]; if (p.o !== t) return 'Not yours'; if (p.fac >= 8) return 'Maxed'; if (n.pp < factoryCost(p.fac)) return 'Not enough production'; if (n.steel < 3) return 'Needs 3 steel'; return ''; }
function buildFactory(t, pid) { if (canFactory(t, pid)) return false; const n = nat(t), p = G.prov[pid]; n.pp -= factoryCost(p.fac); n.steel -= 3; p.fac++; return true; }
function canFort(t, pid) { const n = nat(t), p = G.prov[pid]; if (p.o !== t) return 'Not yours'; if (p.fort >= 3) return 'Maxed'; if (n.pp < fortCost(p.fort)) return 'Not enough production'; if (n.steel < 2) return 'Needs 2 steel'; return ''; }
function buildFort(t, pid) { if (canFort(t, pid)) return false; const n = nat(t), p = G.prov[pid]; n.pp -= fortCost(p.fort); n.steel -= 2; p.fort++; return true; }
/* imports: production buys oil and steel on the world market, unless blockaded */
const IMPORT_MAX = 12, IMPORT_PRICE = 4;
const _blk = {}; function blockadedCached(t) { const k = G.turn + t; if (!(k in _blk)) _blk[k] = blockaded(t); return _blk[k]; }
function blockaded(t) {
  // a nation can trade by land with any neutral neighbour, or by sea through any zone the enemy does not control
  const mine = owned(t);
  for (const i of mine) for (const j of PROV[i].adj) { const o = G.prov[j].o; if (o !== t && A(o) && !W(t, o)) return false; }
  for (const i of mine) if (PROV[i].coast) for (const z of PROV[i].zones) if (seaControl(z, t) !== 'enemy') return false;
  return true;
}
function canImport(t, k) { const n = nat(t); if (n.imports >= IMPORT_MAX) return 'Market exhausted this month'; if (n.pp < IMPORT_PRICE * 3) return 'Not enough production'; if (blockaded(t)) return 'Blockaded'; return ''; }
function doImport(t, k) { if (canImport(t, k)) return false; const n = nat(t); n.pp -= IMPORT_PRICE * 3; n[k] += 3; n.imports += 3; return true; }

/* ---------- research: parallel slots, each project takes months ---------- */
function techState(t, k) {
  const n = nat(t), T = TECH[k];
  if (n.tech[k]) return 'done';
  if (n.rs.some(r => r.k === k)) return 'active';
  if (T.req && !n.tech[T.req]) return 'Needs ' + TECH[T.req].n;
  if (G.y < T.y) return 'Available in ' + T.y;
  if (n.rs.length >= n.slots) return 'All research slots busy';
  if (n.pp < techCost(T)) return 'Not enough production';
  return '';
}
function startResearch(t, k) { if (techState(t, k)) return false; const n = nat(t), T = TECH[k]; n.pp -= techCost(T); n.rs.push({ k, left:T.m }); return true; }
function cancelResearch(t, k) { const n = nat(t); const i = n.rs.findIndex(r => r.k === k); if (i < 0) return; n.pp += Math.round(techCost(TECH[k]) * 0.5); n.rs.splice(i, 1); }
function grantTech(t, k) { const n = nat(t); if (!TECH[k] || n.tech[k]) return; n.tech[k] = 1; n.rs = n.rs.filter(r => r.k !== k); }
function tickResearch(t) {
  const n = nat(t), sp = n.done.includes('sec_bureau') ? 1.3 : 1;
  for (const r of [...n.rs]) { r.left -= sp; if (r.left <= 0.001) { grantTech(t, r.k); notify(t, '⚗', 'Breakthrough: ' + TECH[r.k].n, TECH[r.k].d); sfx('medal', t); if (isHuman(t)) log(`${n.adj} scientists complete <b>${TECH[r.k].n}</b>.`); } }
}

/* ---------- national focus ---------- */
function focusState(t, k) {
  const n = nat(t), f = FOC[k];
  if (n.done.includes(k)) return 'done';
  if (n.focus && n.focus.k === k) return 'active';
  if (f.req && !n.done.includes(f.req)) return 'Needs ' + FOC[f.req].n;
  if (n.focus) return 'Another focus is running';
  return '';
}
function startFocus(t, k) { if (focusState(t, k)) return false; nat(t).focus = { k, left:FOC[k].m }; return true; }
function capOrFirst(t) { const h = homeProv(t); return h; }
function completeFocus(t, k) {
  const n = nat(t); n.done.push(k); n.focus = null;
  const cap = capOrFirst(t), C = cap >= 0 ? G.prov[cap] : null;
  const named = (nm, f) => { const id = ID[nm]; if (id != null && G.prov[id].o === t) f(G.prov[id], id); };
  const homeZone = () => { for (const i of owned(t)) if (PROV[i].coast && G.prov[i].core === t) return PROV[i].zones[0]; return null; };
  const borderProvs = () => owned(t).filter(i => PROV[i].adj.some(j => G.prov[j].o !== t));
  switch (k) {
    case 'ind_plan': owned(t).filter(i => G.prov[i].core === t).sort((a, b) => G.prov[b].fac - G.prov[a].fac).slice(0, 3).forEach(i => G.prov[i].fac++); break;
    case 'ind_shadow': n.pp += 60; break;
    case 'res_univ': n.slots++; break;
    case 'mil_mob': n.mp += 60; if (C) C.u.inf += 6; break;
    case 'mil_mech': grantTech(t, 'arm1'); if (C) C.u.arm += 3; break;
    case 'mil_staff': n.genSlots += 2; hireGeneral(t, true); break;
    case 'mil_fort': borderProvs().forEach(i => G.prov[i].fort = Math.min(3, G.prov[i].fort + 1)); break;
    case 'air_min': grantTech(t, 'ftr1'); if (C) C.air.ftr += 4; break;
    case 'nav_yard': { grantTech(t, 'cap1'); const z = homeZone(); if (z) addFleet(z, t, 'cap', 2); else n.pp += 80; break; }
    case 'pol_prop': n.pol += 50; n.stab = Math.min(100, n.stab + 10); n.stabB = (n.stabB || 0) + 5; break;
    case 'pol_intel': n.spies += 2; n.intel = 12; break;
    case 'pol_unity': n.stab = Math.min(100, n.stab + 15); n.stabB = (n.stabB || 0) + 10; break;
    case 'ger_lw': grantTech(t, 'ftr1'); grantTech(t, 'bmb1'); if (C) { C.air.ftr += 6; C.air.bmb += 4; } break;
    case 'ger_panzer': grantTech(t, 'arm2'); if (C) C.u.arm += 4; break;
    case 'ger_westwall': ['Cologne','Essen','Saarbrücken','Stuttgart','Frankfurt'].forEach(nm => named(nm, p => p.fort = Math.min(3, p.fort + 2))); break;
    case 'ger_planz': { const z = homeZone() || 'NSE'; addFleet(z, t, 'cap', 3); addFleet(z, t, 'sub', 6); grantTech(t, 'sub2'); break; }
    case 'eng_radar': grantTech(t, 'radar'); named('London', p => p.air.ftr += 4); break;
    case 'eng_rn': addFleet('ATL', t, 'cap', 2); addFleet('NSE', t, 'cap', 2); break;
    case 'eng_empire': n.mp += 40; named('Cairo', p => p.u.inf += 4); named('Gibraltar', p => p.u.inf += 2); named('Alexandria', p => p.u.inf += 2); break;
    case 'eng_rearm': ['Birmingham','Manchester','Glasgow','London'].forEach(nm => named(nm, p => p.fac++)); break;
    case 'fra_popfront': n.stab = Math.min(100, n.stab + 20); n.stabB = (n.stabB || 0) + 8; n.pol += 30; break;
    case 'fra_maginot': ['Lille','Metz','Strasbourg','Dijon'].forEach(nm => named(nm, p => p.fort = Math.min(3, p.fort + 2))); break;
    case 'fra_dgaulle': grantTech(t, 'arm1'); grantTech(t, 'arm2'); if (C) C.u.arm += 3; break;
    case 'fra_empire': named('Algiers', p => p.u.inf += 3); named('Rabat', p => p.u.inf += 2); named('Tunis', p => p.u.inf += 3); break;
    case 'ita_alpini': grantTech(t, 'mtn'); named('Turin', p => p.u.mtn += 2); named('Trieste', p => p.u.mtn += 2); break;
    case 'ita_mare': addFleet('WMD', t, 'cap', 2); addFleet('EMD', t, 'cap', 1); addFleet('EMD', t, 'sub', 4); break;
    case 'ita_africa': named('Tripoli', p => p.u.inf += 2); named('Tobruk', p => { p.u.inf += 4; p.u.arm += 2; }); break;
    case 'ita_autarchia': ['Milan','Turin','Rome'].forEach(nm => named(nm, p => p.fac++)); break;
    case 'sov_5yr': owned(t).filter(i => G.prov[i].core === t).sort((a, b) => PROV[b].vp - PROV[a].vp).slice(0, 4).forEach(i => G.prov[i].fac++); break;
    case 'sov_urals': ['Sverdlovsk','Perm','Kuibyshev','Ufa'].forEach(nm => named(nm, p => p.fac += 1)); break;
    case 'sov_deep': grantTech(t, 'combined'); grantTech(t, 'arm1'); if (C) C.u.arm += 4; break;
    case 'sov_stavka': named('Moscow', p => p.u.inf += 12); if (!capitalOk(t) && C) C.u.inf += 12; break;
    case 'min_neut': borderProvs().forEach(i => G.prov[i].fort = Math.min(3, G.prov[i].fort + 1)); n.stab = Math.min(100, n.stab + 10); break;
    case 'min_army': grantTech(t, 'inf1'); grantTech(t, 'art1'); if (C) C.u.art += 4; break;
    case 'min_patron': n.pp += 60; n.pol += 30; break;
  }
  notify(t, '◎', `Focus complete: ${FOC[k].n}`, FOC[k].d); sfx('fanfare', t);
}
