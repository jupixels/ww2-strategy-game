'use strict';
/* ================= THE MONTHLY TURN ================= */
// Runs everything between "End Month" and the next planning phase. Returns what happened for the UI to animate.
function endMonth() {
  const out = { battles:[], naval:[], gained:{}, lost:{} };
  const before = {}; for (const h of humanTags()) before[h] = new Set(owned(h));
  const offNaval = Hooks.L.naval ? null : null;
  const navLog = r => out.naval.push(r); Hooks.on('naval', navLog);
  try {
    // 1. simultaneous multiplayer orders
    out.battles.push(...resolveOrders());
    // 2. the AI nations act
    const order = shuffleR(Object.keys(G.nat).filter(t => A(t) && !liveHuman(t) && !NATDEF[t].off));
    for (const t of order) aiTurn(t, out.battles);
    aiDiplomacy();
    // 3. American expeditionary force
    if (G.flags.usa && G.m % 3 === 0 && nowNum() < ymNum(1946, 0)) {
      const host = humanTags().find(isAllied) || (A('ENG') && isAllied('ENG') ? 'ENG' : membersOf('ALLIES').find(t => t !== 'USA'));
      if (host && A(host)) { const c = homeProv(host); if (c >= 0) { G.prov[c].u.inf += 2; G.prov[c].u.arm += 1; notify(host, '★', 'US Expeditionary Force arrives', `2 infantry and 1 armored division land at ${PROV[c].name}.`, 'medal'); } }
    }
    // 4. the war at sea
    for (const z in G.fleet) { const tags = Object.keys(G.fleet[z]); for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) if (W(tags[i], tags[j]) && G.fleet[z][tags[i]] && G.fleet[z][tags[j]]) navalBattle(z, tags[i], tags[j]); }
    convoyRaids();
    // 5. dig in: armies that did not move this month entrench
    for (const p of G.prov) { if (unitsAt(p) && readyAt(p) === unitsAt(p)) { const n = nat(p.o); p.dig = Math.min(n && n.tech.grand ? 4 : 3, p.dig + 1); } if (!unitsAt(p)) p.dig = 0; }
    // 6. the calendar turns
    G.turn++; G.m++; if (G.m > 11) { G.m = 0; G.y++; }
    for (const t in G.nat) {
      const n = G.nat[t]; if (!n.alive || NATDEF[t].off) continue;
      n.pp += income(t); n.mp += mpIncome(t); n.pol += 2 + (n.stab > 70 ? 1 : 0);
      n.oil = Math.min(999, n.oil + oilIncome(t) - oilUpkeep(t)); if (n.oil < -20) n.oil = -20;
      n.steel = Math.min(999, n.steel + steelIncome(t));
      if (n.oil <= 0 && isHuman(t)) notify(t, '⛽', 'Fuel shortage', 'Tanks, aircraft and ships fight at 60%. Import oil, capture oil fields or research Synthetic Oil.', 'war');
      if (n.intel > 0) n.intel--;
      if (n.reveal) for (const o in n.reveal) if (--n.reveal[o] <= 0) delete n.reveal[o];
      if (n.counter > 0) n.counter--;
      if (n.bombCd > 0) n.bombCd--;
      if (n.totalWar > 0) n.totalWar--;
      n.spyBusy = 0; n.playedThis = 0;
      for (const k in n.fx) { if (typeof n.fx[k] === 'number' && k !== 'fifth') { if (--n.fx[k] <= 0) delete n.fx[k]; } else delete n.fx[k]; }
      tickResearch(t);
      if (n.focus && --n.focus.left <= 0) completeFocus(t, n.focus.k);
      tickHomeFront(t);
      if (n.ops && --n.ops.left <= 0) { notify(t, '✕', `Operation ${n.ops.name} expires`, 'Not every objective was taken.', ''); n.ops = null; }
      drawCards(t, 1);
    }
    // 7. supply, attrition, occupation
    updateSupply();
    for (const p of G.prov) {
      if (p.smoke > 0) p.smoke--; if (p.burn > 0) p.burn--;
      // General Winter: armies far from home in the frozen east bleed men
      if (isWinter() && unitsAt(p) && A(p.o) && PROV[G.prov.indexOf(p)].cold && p.sup < 1 && !WINTER_LANDS.has(p.o) && !nat(p.o).fx.weather) { const l = takeLosses(p.u, rr(unitsAt(p) * 0.04)); nat(p.o).lm = (nat(p.o).lm || 0) + landN(l); }
      if (!p.sup && unitsAt(p) && A(p.o)) { const g = G.gens.find(x => x.pid === G.prov.indexOf(p) && x.tag === p.o); if (!(g && g.tr === 'logistics')) { const l = takeLosses(p.u, rr(unitsAt(p) * 0.1)); nat(p.o).lm = (nat(p.o).lm || 0) + landN(l); } }
    }
    tickResistance();
    fixGenerals();
    resetReady();
    // 8. anecdotes for human players
    for (const h of humanTags()) {
      if (G.humans[h].dead || !A(h) || rnd() > 0.16) continue;
      const n = nat(h);
      const cand = ANECDOTES.filter(a => G.y >= a.y && (!a.w || a.w.includes(h)) && !G.flags['an_' + h + a.n] && (!a.war || W(h, a.war)));
      if (cand.length) { const a = pickR(cand); G.flags['an_' + h + a.n] = 1; a.f(n, h); notify(h, '✉', a.n, a.d, ''); log(`<b>${a.n}.</b> ${a.d}`); }
    }
    if (G.y >= 1946) for (const h of humanTags()) if (A(h)) award(h, 'survive');
    // 9. history moves on
    checkEvents();
    for (const h of humanTags()) if (A(h)) tickAgendas(h, false);
    recordHistory();
    checkVictory();
    if (G.over) for (const h of humanTags()) if (A(h)) tickAgendas(h, true);
  } finally { const l = Hooks.L.naval; if (l) l.splice(l.indexOf(navLog), 1); }
  for (const h of humanTags()) { const now = new Set(owned(h)); out.gained[h] = [...now].filter(i => !before[h].has(i)); out.lost[h] = [...before[h]].filter(i => !now.has(i)); }
  Hooks.emit('month', out);
  return out;
}

/* ================= VICTORY ================= */
function teamOf(t) { return G.gm === 'team' || G.gm === 'coop' ? (facOf(t) || t) : t; }
function checkVictory() {
  if (G.over) return;
  const hs = humanTags();
  const alive = hs.filter(h => A(h) && !G.humans[h].dead);
  const share = t => vpOf(t) / totalVP();
  const caps = ['Berlin','London','Paris','Rome','Moscow'];
  const endTurn = G.gm === 'blitz' ? ymNum(1942, 2) : ymNum(1950, 0);
  if (!hs.length) { if (nowNum() >= endTurn) G.over = { type:'time', winners:[], reason:'Observer game over.' }; return; }
  if (!alive.length) { G.over = { type:'defeat', winners:[], reason:'Every human-led nation has fallen.' }; return; }
  if (G.gm === 'team' || G.gm === 'coop') {
    const teams = {}; for (const t in G.nat) if (A(t)) { const k = facOf(t) || t; (teams[k] || (teams[k] = [])).push(t); }
    for (const k in teams) {
      const s = sum(teams[k], share), hum = teams[k].filter(isHuman);
      if (!hum.length) continue;
      const rivals = Object.keys(teams).filter(x => x !== k && teams[x].some(m => nat(m).major));
      if (s >= 0.75 || (G.turn > 2 && !rivals.some(x => teams[x].some(m => W(m, teams[k][0]))) && caps.filter(c => friendly(O(c), hum[0])).length >= 4)) { G.over = { type:'victory', winners:hum, reason:`${G.facs[k] ? G.facs[k].n : natName(k)} controls Europe.` }; return; }
    }
  } else {
    for (const h of alive) if (share(h) >= 0.75 || caps.every(n => O(n) === h)) { G.over = { type:'victory', winners:[h], reason:`${natName(h)} rules Europe.` }; return; }
  }
  if (nowNum() >= endTurn && !G.flags.endless) {
    let best = null, bs = -1;
    if (G.gm === 'team' || G.gm === 'coop') { const ts = {}; for (const h of hs) { const k = teamOf(h); ts[k] = (ts[k] || 0) + scoreOf(h); } for (const k in ts) if (ts[k] > bs) { bs = ts[k]; best = k; } G.over = { type:'time', winners:hs.filter(h => teamOf(h) === best), reason:'The war ends. Highest team score wins.' }; }
    else { for (const h of hs) { const s = scoreOf(h); if (s > bs) { bs = s; best = h; } } G.over = { type:'time', winners:hs.length > 1 ? [best] : [], reason:hs.length > 1 ? `${natName(best)} finishes with the highest score.` : `The campaign ends. You hold ${Math.round(share(hs[0]) * 100)}% of Europe.` }; }
  }
}
