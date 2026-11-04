'use strict';
/* ================= NATIONAL SIGNATURE SYSTEMS =================
   Each great power (and China) has one system of its own, shown in Plans → the nation's tab and driven through
   doCommand({c:'sig', op, ...}). State lives in n.sig. sigTick(t) runs every month for every nation; the AI
   takes its national actions in aiSignature(t).
   GER war economy · SOV factory evacuation · ENG Atlantic lifeline · USA mobilisation & Lend-Lease
   JAP the oil clock & fleet at anchor · ITA regime support & the armistice · FRA Union Sacrée & fighting on
   from Algiers · CHI guerrilla war & the United Front */
const SIGS = {
  GER:{ n:'War Economy', d:'How hard the Reich drives its factories. Each level adds production and manpower but drags stability; the last needs total war.' },
  SOV:{ n:'Evacuation', d:'Dismantle threatened factories and ship them east of the Urals. They are lost for two months, then rebuilt out of reach.' },
  ENG:{ n:'Atlantic Lifeline', d:'Food, fuel and arms from the Empire and America arrive by convoy every month — unless the U-boats or enemy fleets cut the sea lanes.' },
  USA:{ n:'Arsenal of Democracy', d:'American industry wakes slowly. Mobilisation grows with war and world tension, and Lend-Lease can supply one friend every month.' },
  JAP:{ n:'The Oil Clock', d:'Japan has almost no oil of its own. Watch the months of fuel left; lay the fleet up at anchor to stretch them, and seize the oil of the south.' },
  ITA:{ n:'Regime Support', d:'Victories prop up the regime; defeats and enemy boots on Italian soil erode it. When it collapses the king can depose the Duce and change sides.' },
  FRA:{ n:'The Republic in Danger', d:'The Third Republic is fragile. A Union Sacrée rallies the nation once; if the worst happens, the government can fight on from Algiers instead of signing an armistice.' },
  CHI:{ n:'Total Resistance', d:'Occupied China never stops fighting: resistance rises fast behind Japanese lines. A United Front with the Communists brings them into your war.' },
};
const ECO_LEVELS = [
  { n:'Peacetime economy', pp:0, mp:0, stab:0 },
  { n:'Rearmament', pp:0.1, mp:0.05, stab:-3 },
  { n:'War economy', pp:0.2, mp:0.12, stab:-7 },
  { n:'Total war (Speer)', pp:0.35, mp:0.2, stab:-13 },
];
const LIFELINE_ZONES = ['NAT','WAT','CHN','ATL','MAC'];
function sigOf(t) {
  const n = nat(t); if (!SIGS[t]) return null;
  if (!n.sig) n.sig = { eco:t === 'GER' ? 1 : 0, mob:0, reg:70, evac:[], ll:null, anchor:0, union:0, exile:0, front:0, escort:0 };
  return n.sig;
}
/* ---------- effects read by the economy and combat ---------- */
function sigIncomeMul(t) {
  const s = G.nat[t] && G.nat[t].sig; if (!s) return 1;
  if (t === 'GER') return 1 + ECO_LEVELS[s.eco || 0].pp;
  if (t === 'USA') return 0.85 + 0.45 * (s.mob || 0) / 100;
  if (t === 'ITA') return s.reg < 30 ? 0.85 : 1;
  return 1;
}
function sigStabMod(t) { const s = G.nat[t] && G.nat[t].sig; if (!s) return 0; if (t === 'GER') return ECO_LEVELS[s.eco || 0].stab; return 0; }
function sigIncomeAdd(t) {
  const s = G.nat[t] && G.nat[t].sig; if (!s) return 0;
  if (t === 'ENG') return Math.round(10 * lifeline(t));
  if (t === 'USA' && s.ll) return -8;
  return 0;
}
// share of the Atlantic convoys getting through: enemy control or raiders in the lifeline zones cut it
function lifeline(t) {
  if (!WORLD && !SEA.ATL) return 1;
  const zs = LIFELINE_ZONES.filter(z => SEA[z]); if (!zs.length) return 1;
  let ok = 0; for (const z of zs) { const c = seaControl(z, t); ok += c === 'enemy' ? 0 : c === 'contested' ? 0.5 : 1; }
  const s = G.nat[t] && G.nat[t].sig, raid = (nat(t).raid || 0) * (s && s.escort > 0 ? 0.5 : 1);
  return clamp(ok / zs.length - raid * 2, 0, 1);
}
const anchored = t => !!(G.nat[t] && G.nat[t].sig && G.nat[t].sig.anchor);
function oilMonths(t) { const net = oilIncome(t) - oilUpkeep(t), o = nat(t).oil; return net >= 0 ? Infinity : o <= 0 ? 0 : Math.floor(o / -net); }
/* ---------- monthly tick ---------- */
function sigTick(t) {
  const n = nat(t), s = sigOf(t); if (!s || !n.alive) return;
  const atWar = enemiesOf(t).length > 0;
  if (t === 'GER') { n.mp += Math.round(mpIncome(t) * ECO_LEVELS[s.eco || 0].mp); }
  if (t === 'USA') { s.mob = clamp((s.mob || 0) + (atWar ? 6 : G.tension > 60 ? 1.5 : G.tension > 40 ? 0.5 : 0), 0, 100); if (s.ll && (!A(s.ll) || W('USA', s.ll))) s.ll = null; if (s.ll) { nat(s.ll).pp += 14; nat(s.ll).oil += 3; } }
  if (t === 'ENG') { const L = lifeline(t); n.oil += Math.round(5 * L); n.steel += Math.round(3 * L); if (s.escort > 0) s.escort--; s.last = Math.round(L * 100); }
  if (t === 'SOV') {
    for (const e of s.evac) if (e.at === G.turn) { const p = G.prov[e.to]; if (p && p.o === 'SOV') p.fac += e.n; else { const h = homeProv('SOV'); if (h >= 0) G.prov[h].fac += e.n; } }
    s.evac = s.evac.filter(e => e.at > G.turn);
  }
  if (t === 'ITA') {
    const st = n.st, w = st.won - (s.w0 || 0), l = st.lost - (s.l0 || 0); s.w0 = st.won; s.l0 = st.lost;
    let occ = 0; for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core === 'ITA' && p.o !== 'ITA' && W('ITA', p.o)) occ++; }
    s.reg = clamp(s.reg + (w > l ? 2 : w < l ? -2 : 0.5) - occ * 2 - (n.stab < 40 ? 1.5 : 0) + (!atWar ? 1 : 0), 0, 100);
  }
  if (t === 'CHI' && W('CHI', 'JAP')) for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core === 'CHI' && friendly(p.o, 'JAP')) p.res = Math.min(100, p.res + 3); }
  if (s.union > 0) s.union--;
  if (t === 'JAP') s.clock = oilMonths(t) === Infinity ? null : oilMonths(t);
}
// factories within two provinces of the enemy, west of the Urals
function evacCandidates(t) {
  const r = [];
  for (const i of owned(t)) { const p = G.prov[i]; if (p.fac <= 0 || p.core !== t || PROV[i].x > (PROV[ID['Kazan']] ? PROV[ID['Kazan']].x : 1e9)) continue; const h = hops(i); let near = false; for (let j = 0; j < NP && !near; j++) if (h[j] <= 2 && W(t, G.prov[j].o)) near = true; if (near) r.push(i); }
  return r.sort((a, b) => G.prov[b].fac - G.prov[a].fac);
}
const EVAC_DEST = ['Sverdlovsk','Perm','Ufa','Kuibyshev','Omsk','Novosibirsk','Kazan'];
const SIG_OPS = { GER:['eco'], SOV:['evac'], ENG:['escort'], USA:['ll'], JAP:['anchor'], ITA:['armistice'], FRA:['union','exile'], CHI:['ufront'] };
function canSig(t, op, c) {
  if (!SIG_OPS[t] || !SIG_OPS[t].includes(op)) return 'Not a power of this nation';
  const n = nat(t), s = sigOf(t); if (!s) return 'No national system';
  const atWar = enemiesOf(t).length > 0;
  switch (op) {
    case 'eco': { const lv = c.lv | 0; if (lv < 0 || lv > 3) return 'Unknown level'; if (lv === 3 && !(n.totalWar > 0 || G.y >= 1942 || W('GER', 'SOV'))) return 'Total war needs 1942, war with Russia or a Total War economy'; if (lv > (s.eco || 0) && n.pol < 10 * lv) return `Needs ${10 * lv} politics`; return ''; }
    case 'evac': { if (!evacCandidates(t).includes(c.pid)) return 'Not a threatened factory'; if (n.pol < 5) return 'Needs 5 politics'; return ''; }
    case 'escort': if (s.escort > 0) return `Escorts at sea for ${s.escort} more months`; if (n.pol < 20) return 'Needs 20 politics'; if (!navyOf(t).cap) return 'Needs battle squadrons'; return '';
    case 'll': if (c.to == null) return ''; if (!A(c.to) || c.to === t || W(t, c.to) || nat(c.to).ide === 'F' && !friendly(t, c.to)) return 'Only friendly, non-fascist nations'; if (n.pol < 10) return 'Needs 10 politics'; return '';
    case 'anchor': return '';
    case 'armistice': if (s.reg >= 35) return `Regime support must fall below 35% (now ${Math.round(s.reg)}%)`; if (!isAxis(t)) return 'Only while in the Axis'; if (!G.facs.ALLIES) return 'No one to surrender to'; return '';
    case 'union': if (s.unionUsed) return 'Already called'; if (!atWar) return 'Only at war'; if (n.pol < 25) return 'Needs 25 politics'; return '';
    case 'exile': if (n.pol < 15 && !s.exile) return 'Needs 15 politics'; return '';
    case 'ufront': if (s.ufront) return 'Already formed'; if (!A('PRC') || W('CHI', 'PRC')) return 'The Communists are not available'; if (!W('CHI', 'JAP')) return 'Only during the war with Japan'; if (n.pol < 30) return 'Needs 30 politics'; return '';
  }
  return 'Unknown';
}
function sigCommand(t, c) {
  const why = canSig(t, c.op, c); if (why) return { ok:false, why };
  const n = nat(t), s = sigOf(t);
  switch (c.op) {
    case 'eco': { const lv = c.lv | 0; if (lv > (s.eco || 0)) n.pol -= 10 * lv; s.eco = lv; return { ok:true }; }
    case 'evac': {
      const p = G.prov[c.pid], k = Math.min(p.fac, 3);
      const dest = EVAC_DEST.map(nm => ID[nm]).filter(i => i != null && G.prov[i].o === t).sort((a, b) => G.prov[a].fac - G.prov[b].fac)[0];
      if (dest == null) return { ok:false, why:'Nowhere safe to send them' };
      n.pol -= 5;
      p.fac -= k; s.evac.push({ to:dest, n:k, at:G.turn + 2 });
      return { ok:true, msg:`${k} factor${k > 1 ? 'ies' : 'y'} leave ${PROV[c.pid].name} for ${PROV[dest].name}; back in production in two months.` };
    }
    case 'escort': n.pol -= 20; s.escort = 6; return { ok:true };
    case 'll': if (c.to != null && c.to !== s.ll) n.pol -= 10; s.ll = c.to || null; return { ok:true };
    case 'anchor': s.anchor = s.anchor ? 0 : 1; return { ok:true };
    case 'armistice': italianArmistice(t); return { ok:true };
    case 'union': n.pol -= 25; s.unionUsed = 1; s.union = 12; n.stab = Math.min(100, n.stab + 20); n.stabB = (n.stabB || 0) + 5; news('UNION SACRÉE: FRANCE CLOSES RANKS'); return { ok:true };
    case 'exile': if (!s.exile) n.pol -= 15; s.exile = s.exile ? 0 : 1; return { ok:true };
    case 'ufront': n.pol -= 30; s.ufront = 1; if (!facOf('PRC')) { if (facOf('CHI')) joinFaction('PRC', facOf('CHI'), true); } for (const e of enemiesOf('CHI')) if (!W('PRC', e) && !friendly('PRC', e)) setWar('PRC', e); n.stab = Math.min(100, n.stab + 10); nat('PRC').pp += 30; news('THE SECOND UNITED FRONT: NATIONALISTS AND COMMUNISTS FIGHT TOGETHER'); return { ok:true };
  }
  return { ok:false };
}
function italianArmistice(t) {
  news('THE KING DEPOSES MUSSOLINI — ITALY SIGNS AN ARMISTICE');
  switchSides(t);
  const s = sigOf(t); s.reg = 55; nat(t).stab = Math.min(100, nat(t).stab + 10);
  sendNews('*', { title:'Italy Changes Sides', head:'Armistice of Cassibile', dek:'The Grand Council votes the Duce out; Badoglio signs with the Allies', text:'Church bells ring in Rome. Within hours German divisions pour over the Brenner to disarm their former allies, and Italy becomes a battlefield.', plate:t });
}
// France falls: with the exile plan set, the government flies to Algiers and fights on
function frenchExile(d, w) {
  const s = G.nat.FRA && G.nat.FRA.sig; if (d !== 'FRA' || !s || !s.exile) return false;
  const alg = ['Algiers','Oran','Tunis','Rabat','Dakar'].map(nm => ID[nm]).find(i => i != null && G.prov[i].o === 'FRA');
  if (alg == null) return false;
  const n = nat('FRA'); n.capital = alg; n.stab = Math.max(n.stab, 45); s.exile = 0; s.fled = 1;
  news('THE FRENCH GOVERNMENT FLIES TO ALGIERS AND FIGHTS ON');
  notify('FRA', '⚑', 'France fights on', `The government has reached ${PROV[alg].name}. The Empire and the fleet fight on.`, 'medal');
  return true;
}
/* ---------- the AI's national decisions ---------- */
function aiSignature(t) {
  const n = nat(t), s = sigOf(t); if (!s || !n.alive) return;
  const atWar = enemiesOf(t).length > 0;
  if (t === 'GER') { const want = W('GER', 'SOV') && G.y >= 1942 ? 3 : atWar ? 2 : G.y >= 1938 ? 1 : 0; if (want > (s.eco || 0) && !canSig(t, 'eco', { lv:want })) sigCommand(t, { op:'eco', lv:want }); }
  if (t === 'SOV') { for (const i of evacCandidates(t).slice(0, 2)) if (!canSig(t, 'evac', { pid:i }) && G.prov[i].fac >= 2 && rnd() < 0.6) sigCommand(t, { op:'evac', pid:i }); }
  if (t === 'ENG' && (n.raid || 0) > 0.05 && !canSig(t, 'escort', {})) sigCommand(t, { op:'escort' });
  if (t === 'USA' && !s.ll && G.y >= 1940) { const to = ['ENG', 'SOV', 'CHI'].find(x => A(x) && enemiesOf(x).some(isAxis) && !canSig(t, 'll', { to:x })); if (to) sigCommand(t, { op:'ll', to }); }
  if (t === 'CHI' && !canSig(t, 'ufront', {}) && rnd() < 0.3) sigCommand(t, { op:'ufront' });
  if (t === 'FRA' && atWar && !s.unionUsed && n.stab < 50 && !canSig(t, 'union', {})) sigCommand(t, { op:'union' });
}
