'use strict';
/* ================= AI ================= */
function frontDistance(t, enemies) {
  const d = new Int16Array(NP).fill(99); const q = [];
  for (let i = 0; i < NP; i++) if (G.prov[i].o === t && PROV[i].adj.some(j => enemies.has(G.prov[j].o))) { d[i] = 0; q.push(i); }
  while (q.length) { const i = q.shift(); for (const j of PROV[i].adj) if (G.prov[j].o === t && d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } }
  return d;
}
const RESEARCH_PRIO = {
  GER:['arm2','blitz','ind2','ftr2','radar','arm3','inf2','synth','rocket','combined','bmb2','jet','sub2','inf3','art2','atom','bomb'],
  ENG:['radar','ind2','ftr2','cap1','carrier','amph','arm1','arm2','inf2','bmb2','sub2','depth','jet','atom','bomb','inf3'],
  FRA:['depth','grand','arm2','ind2','ftr1','inf2','radar','ftr2','art2','combined','inf3'],
  ITA:['ind2','arm1','inf1','mobile','inf2','ftr2','radar','sub2','arm2','amph','synth','inf3'],
  SOV:['inf1','ind2','inf2','arm2','ftr2','grand','combined','arm3','art2','radar','ind3','inf3','jet','atom','bomb'],
  _:['inf1','ind1','art1','inf2','ind2','depth','ftr1','arm1','radar','mtn','grand','inf3','synth'],
};
function aiResearch(t) {
  const n = nat(t);
  const prio = (RESEARCH_PRIO[t] || RESEARCH_PRIO._).concat(TECHS.map(T => T.k));
  let guard = 0;
  while (n.rs.length < n.slots && guard++ < 6) {
    const k = prio.find(k => TECH[k] && !techState(t, k));
    if (!k || n.pp < techCost(TECH[k]) + (enemiesOf(t).length ? 30 : 10)) break;
    startResearch(t, k);
  }
}
function aiFocus(t) {
  const n = nat(t); if (n.focus) return;
  const avail = focusFor(t, n.major).filter(f => !focusState(t, f.k));
  if (!avail.length) return;
  const atWar = enemiesOf(t).length > 0;
  const score = f => (f.who || f.minor ? 3 : 0) + (atWar && ['mil_mob','air_min','pol_unity','mil_mech'].includes(f.k) ? 2 : 0) + (!atWar && ['ind_plan','ind_shadow','res_univ','ind_steel'].includes(f.k) ? 2 : 0) + rnd() * 2;
  startFocus(t, avail.sort((a, b) => score(b) - score(a))[0].k);
}
function aiCards(t, enemies, fd) {
  const n = nat(t); if (!n.hand.length || n.playedThis) return;
  const atWar = enemies.size > 0;
  const want = k => {
    switch (k) {
      case 'convoy': return 3;
      case 'propag': return n.pol < 40 ? 3 : 1;
      case 'mobilize': return n.mp < 30 ? 3 : atWar ? 1.5 : 0.3;
      case 'rally': return n.stab < 45 ? 3 : 0.5;
      case 'breakthru': return n.rs.length ? 1.5 : 0;
      case 'blitz': return atWar && divisions(t).arm >= 4 ? 2.5 : 0;
      case 'surprise': case 'march': return atWar ? 2 : 0;
      case 'codebreak': case 'maginot': case 'scorched': return atWar ? 1.5 : 0;
      case 'human': return atWar ? 2.5 : 0;
      case 'weather': return atWar && (isWinter() || isMud()) ? 2 : 0;
      case 'wolfpack': return atWar && navyOf(t).sub >= 4 ? 2 : 0;
      case 'airraid': case 'commando': case 'fifth': case 'sabotage': return atWar ? 1.2 : 0;
      case 'fortress': return atWar ? 1 : 0.4;
      case 'partisans': return 2;
      case 'peace': return atWar && n.stab < 35 ? 3 : 0;
      case 'coup': return 0.6;
      case 'falseflag': return !atWar && (n.ide === 'F' || n.ide === 'C') && G.y >= 1939 && n.major ? 0.8 : 0;
    }
    return 0.5;
  };
  const best = n.hand.map(k => [k, want(k) * (0.7 + rnd() * 0.6)]).filter(([k, w]) => w > 1 && !canPlay(t, k)).sort((a, b) => b[1] - a[1])[0];
  if (!best) return;
  const k = best[0], tg = cardTargets(t, k);
  let target = null;
  if (CARDS[k].tgt === 'none') target = null;
  else if (k === 'fortress') target = fd ? tg.filter(i => fd[i] === 0).sort((a, b) => threatAt(t, b) - threatAt(t, a))[0] ?? tg[0] : tg[0];
  else if (k === 'airraid' || k === 'commando' || k === 'fifth') target = tg.sort((a, b) => G.prov[b].fac + G.prov[b].fort * 2 - G.prov[a].fac - G.prov[a].fort * 2)[0];
  else if (k === 'falseflag') { const weak = tg.filter(o => !nat(o).major && !facOf(o)); target = weak.length ? pickR(weak) : null; }
  else target = pickR(tg);
  if (CARDS[k].tgt !== 'none' && target == null) return;
  playCard(t, k, target);
}
function aiBuild(t, atWar, fd, enemies, mine) {
  const n = nat(t);
  const d = divisions(t), total = landN(d);
  const cap = atWar ? 1e9 : mine.length * 2.5 + (n.major ? 30 : 4) + (G.tension / 10) * (n.major ? 4 : 1);
  const reserve = atWar ? 0 : 20;
  const air = airOf(t), navy = navyOf(t);
  const home = homeProv(t);
  // air force: majors keep roughly one fighter wing per six divisions
  if (n.tech.ftr1 && home >= 0 && air.ftr < total / (n.major ? 6 : 12) && canAfford(n, unitCost(t, 'ftr'), 1) && n.pp - reserve > 40) build(t, 'ftr', home);
  if (n.tech.bmb1 && n.major && home >= 0 && air.bmb < total / 12 && n.pp - reserve > 60) build(t, 'bmb', home);
  // navy: coastal powers maintain a fleet
  if (n.major && (n.tech.cap1 || n.tech.sub1)) {
    const port = mine.find(i => PROV[i].coast && G.prov[i].core === t && PROV[i].zones.length);
    const capWant = { ENG:16, ITA:8, FRA:8, GER:4, SOV:3 }[t] || 2, subWant = { GER:14, ITA:10, ENG:4, SOV:8, FRA:6 }[t] || 2;
    if (port != null && n.pp - reserve > 90) {
      if (n.tech.cap1 && navy.cap < capWant && rnd() < 0.35) build(t, 'cap', port);
      else if (n.tech.sub1 && navy.sub < subWant && rnd() < 0.45) build(t, 'sub', port);
    }
  }
  let have = total, guard = 0;
  while (guard++ < 40 && have < cap && n.pp - reserve >= unitCost(t, 'inf').pp && n.mp >= unitCost(t, 'inf').mp) {
    have++;
    let k = 'inf';
    const r = rnd();
    if (n.tech.arm1 && r < 0.25 && n.oil > 10 && canAfford(n, unitCost(t, 'arm'))) k = 'arm';
    else if (n.tech.art1 && r < 0.42 && canAfford(n, unitCost(t, 'art'))) k = 'art';
    else if (n.tech.para && r < 0.47 && d.par < 6 && canAfford(n, unitCost(t, 'par'))) k = 'par';
    let place;
    if (atWar) {
      const front = mine.filter(i => fd[i] === 0 && G.prov[i].sup);
      if (front.length) place = front.reduce((b, i) => { const th = threatAt(t, i) + PROV[i].vp * 0.5 + rnd() * 2; return th > b[0] ? [th, i] : b; }, [-1e9, front[0]])[1];
      else place = home >= 0 ? home : mine[0];
    } else {
      const border = mine.filter(i => PROV[i].adj.some(j => G.prov[j].o !== t));
      const pool = border.length ? border : mine;
      place = pool[(rnd() * pool.length) | 0];
      if (rnd() < 0.3 && home >= 0) place = home;
    }
    if (k === 'inf' && n.tech.mtn && 'mh'.includes(PROV[place].ter) && rnd() < 0.5) k = 'mtn';
    if (!build(t, k, place)) { if (k === 'inf' || !build(t, 'inf', place)) break; }
  }
  // peacetime industry
  for (let g = 0; g < 4 && n.pp > (atWar ? 260 : 90) && rnd() < (atWar ? 0.5 : 0.45); g++) {
    const c = mine.filter(i => G.prov[i].core === t && G.prov[i].fac < 6 && G.prov[i].sup);
    if (c.length) { const i = c[(rnd() * c.length) | 0]; if (n.pp >= factoryCost(G.prov[i].fac) + 30) buildFactory(t, i); }
  }
  // fuel and steel from the market when short
  for (let g = 0; g < 4; g++) { if (n.oil < 15 && oilIncome(t) < oilUpkeep(t) + 3 && !canImport(t, 'oil') && n.pp > 40) doImport(t, 'oil'); if (n.steel < 8 && !canImport(t, 'steel') && n.pp > 60) doImport(t, 'steel'); }
}
function aiNavy(t) {
  for (const z in G.fleet) {
    const f = G.fleet[z][t]; if (!f || f.mv) continue;
    const mine = fleetPower(f, t);
    let hostile = 0; for (const o in G.fleet[z]) if (W(o, t)) hostile += fleetPower(G.fleet[z][o], o);
    if (hostile > mine * 1.4) { const safe = fleetTargets(z, t).find(z2 => seaControl(z2, t) !== 'enemy'); if (safe) moveFleet(t, z, safe, 'all'); continue; }
    // hunt a weaker enemy squadron next door, or bring subs to enemy shipping lanes
    let best = null;
    for (const z2 of fleetTargets(z, t)) {
      let h = 0; for (const o in G.fleet[z2]) if (W(o, t)) h += fleetPower(G.fleet[z2][o], o);
      const enemyCoast = ZONE_PROVS[z2].some(i => W(t, G.prov[i].o));
      const sc = (h > 0 && h < mine * 0.7 ? 3 : 0) + (f.sub > f.cap && enemyCoast && h < mine ? 1.5 : 0) + rnd() * 0.5;
      if (sc > 1.4 && (!best || sc > best[0])) best = [sc, z2];
    }
    if (best && rnd() < 0.6) moveFleet(t, z, best[1], f.cap > 2 && rnd() < 0.5 ? 'half' : 'all');
  }
}
function aiTurn(t, battles) {
  const n = nat(t); if (!n.alive) return;
  const enemies = new Set(enemiesOf(t).filter(e => A(e)));
  const mine = owned(t); if (!mine.length) return;
  const atWar = enemies.size > 0;
  aiFocus(t);
  if (G.turn % 2 === (t.charCodeAt(0) % 2) || atWar) aiResearch(t);
  if (n.genSlots > G.gens.filter(g => g.tag === t).length && n.pol >= (atWar ? 30 : 60) && rnd() < 0.3) hireGeneral(t);
  const fd = atWar ? frontDistance(t, enemies) : null;
  aiCards(t, enemies, fd);
  if (n.spies - n.spyBusy > 0 && n.pol > 50 && rnd() < 0.2) {
    const foes = [...enemies]; if (foes.length) { const o = pickR(foes); if (rnd() < 0.5) spyOp(t, 'reveal', o); else { const ps = spyTargets(t, 'sabotage').filter(i => G.prov[i].o === o); if (ps.length) spyOp(t, 'sabotage', pickR(ps)); } }
  }
  if (atWar && !n.totalWar && n.pol > 60 && n.major && rnd() < 0.2) { n.pol -= 30; n.totalWar = 12; }
  // special weapons: rockets at the biggest enemy stack in range; the Bomb at most every six months
  if (atWar && n.tech.rocket && !n.rocket) {
    const tg = rocketTargets(t).sort((x, y) => unitsAt(G.prov[y]) - unitsAt(G.prov[x]))[0];
    if (tg != null && unitsAt(G.prov[tg]) >= 4) { const vic = G.prov[tg].o; const k = fireRocket(t, tg); battles.push({ tid:tg, from:[], a:t, d:vic, rocket:k }); notify(vic, '✸', 'Rocket strike on ' + PROV[tg].name, `${n.name} destroyed ${k} divisions.`, 'war'); }
  }
  if (atWar && n.tech.bomb && !canBomb(t) && rnd() < 0.25) {
    const tg = rocketTargets(t).filter(i => PROV[i].vp < 10).sort((x, y) => unitsAt(G.prov[y]) - unitsAt(G.prov[x]))[0];
    if (tg != null && unitsAt(G.prov[tg]) >= 10) { const vic = G.prov[tg].o; const r = dropBomb(t, tg); battles.push({ tid:tg, from:[], a:t, d:vic, bomb:r.killed }); news(`ATOMIC BOMB DROPPED ON ${PROV[tg].name.toUpperCase()}`); notify(vic, '☢', 'Atomic strike on ' + PROV[tg].name, `${r.killed} divisions were wiped out.`, 'war'); }
  }
  aiBuild(t, atWar, fd, enemies, mine);
  aiNavy(t);
  if (!atWar) return;
  // strategic bombing from airfields that aren't needed to support a battle this month
  for (const i of mine) { const q = G.prov[i]; if (q.air.bmb >= 2 && !q.ad && rnd() < 0.5) { const tg = raidTargets(t, i).filter(j => G.prov[j].fac > 0).sort((a, b) => G.prov[b].fac - G.prov[a].fac)[0]; if (tg != null) { const r = airRaid(t, i, tg); battles.push({ tid:tg, from:[i], a:t, d:G.prov[tg].o, raid:r }); } } }
  // operations: majors pick objectives along the front
  if (n.major && !n.ops && n.pol >= 25 && rnd() < 0.25) {
    const cands = [];
    for (const i of mine) if (fd[i] === 0) for (const j of PROV[i].adj) if (enemies.has(G.prov[j].o) && !cands.includes(j)) cands.push(j);
    const tg = cands.sort((a, b) => PROV[b].vp - PROV[a].vp + (unitsAt(G.prov[a]) - unitsAt(G.prov[b])) * 0.2).slice(0, 3);
    if (tg.length) launchOperation(t, tg);
  }
  const order = mine.filter(i => readyAt(G.prov[i]) > 0).sort((a, b) => fd[a] - fd[b]);
  const aggression = (n.major ? 1.05 : 1.2) * (n.stab < 30 ? 1.15 : 1);
  // amphibious gambles by big coastal stacks
  if (n.major && G.y >= 1940 && (n.tech.amph || n.tech.blitz) && rnd() < 0.08) {
    for (const i of order) {
      const p = G.prov[i]; if (!PROV[i].coast || readyAt(p) < 14) continue;
      let best = null;
      for (const [j, k] of navalTargets(i, t)) { if (k !== 'land') continue; const part = portion(p, 'all'); part.inf = Math.max(0, part.inf - 3); const o = attackValue(t, part, j, { naval:true, from:i }) / Math.max(0.3, defenseValue(j, part, t)); if (o > 2.2 && (!best || PROV[j].vp > PROV[best].vp)) best = j; }
      if (best != null) { const part = portion(p, 'all'); part.inf = Math.max(0, part.inf - 3); const r = battle([{ id:i, u:part }], best, { naval:true }); battles.push(r); if (r.win) news(`${n.adj.toUpperCase()} TROOPS STORM THE BEACHES AT ${PROV[best].name.toUpperCase()}`); break; }
    }
  }
  // paratroopers drop behind the lines when the odds are good
  for (const i of order) {
    const p = G.prov[i]; if (!p.r.par) continue;
    const tg = paraTargets(t, i).map(j => [j, attackValue(t, { ...emptyLand(), par:p.r.par }, j, { para:true, from:i }) / Math.max(0.3, unitsAt(G.prov[j]) ? defenseValue(j, null, t) : 0.01)]).filter(x => x[1] > 1.6).sort((a, b) => PROV[b[0]].vp - PROV[a[0]].vp)[0];
    if (tg) battles.push(battle([{ id:i, u:{ ...emptyLand(), par:p.r.par } }], tg[0], { para:true }));
  }
  for (const i of order) {
    const p = G.prov[i]; if (p.o !== t || readyAt(p) === 0) continue;
    if (fd[i] === 0) {
      const targets = PROV[i].adj.filter(j => enemies.has(G.prov[j].o));
      let best = null;
      for (const j of targets) {
        const T = G.prov[j];
        const helpers = PROV[j].adj.filter(k => k !== i && G.prov[k].o === t && readyAt(G.prov[k]) > 0);
        const sumU = portion(p, 'all');
        for (const k of helpers) { const hp = portion(G.prov[k], 'all'); if (hp.inf > 0) hp.inf--; for (const kk of LAND) sumU[kk] += hp[kk]; }
        const atk = attackValue(t, sumU, j, { from:i });
        const def = unitsAt(T) === 0 ? 0.01 : defenseValue(j, sumU, t);
        const odds = atk / def;
        const obj = n.ops && n.ops.tg.includes(j) ? 1.3 : 1;
        const score = odds * obj * (1 + PROV[j].vp * 0.08 + (A(T.o) && j === nat(T.o).capital ? 0.4 : 0));
        if (odds >= aggression && (!best || score > best.score)) best = { j, helpers, score, odds };
      }
      if (best) {
        const otherThreat = PROV[i].adj.filter(j => enemies.has(G.prov[j].o) && j !== best.j).reduce((s, j) => s + unitsAt(G.prov[j]), 0);
        const keep = otherThreat > 0 ? Math.min(p.r.inf, Math.ceil(otherThreat / 3)) : 0;
        const part = portion(p, 'all'); part.inf = Math.max(0, part.inf - keep);
        const srcs = [{ id:i, u:part }];
        if (best.odds < 3) for (const k of best.helpers) { const hp = portion(G.prov[k], 'all'); if (hp.inf > 0) hp.inf--; if (landN(hp)) srcs.push({ id:k, u:hp }); }
        if (!landN(srcs[0].u)) continue;
        const r = battle(srcs, best.j);
        battles.push(r);
        if (r.win && r.blitz) {
          const B = G.prov[best.j];
          const nxt = PROV[best.j].adj.find(j => enemies.has(G.prov[j].o) && attackValue(t, { ...emptyLand(), arm:B.r.arm }, j, { from:best.j }) > defenseValue(j, null, t) * 1.3);
          if (nxt != null && B.r.arm > 0) battles.push(battle([{ id:best.j, u:{ ...emptyLand(), arm:B.r.arm } }], nxt));
        }
      } else if (unitsAt(p) > 3) {
        // no good attack: shift spare troops along the front to where the threat is greatest
        const nb = PROV[i].adj.filter(j => G.prov[j].o === t && fd[j] === 0 && threatAt(t, j) > threatAt(t, i) + 3);
        if (nb.length) { const j = nb.sort((a, b) => threatAt(t, b) - threatAt(t, a))[0]; const part = portion(p, 'half'); moveLand(p, G.prov[j], part); }
      }
    } else if (fd[i] < 99) {
      // march toward the front, preferring the sector under most pressure
      const nb = PROV[i].adj.filter(j => G.prov[j].o === t && fd[j] < fd[i]);
      if (nb.length) {
        const j = nb.length > 1 && rnd() < 0.7 ? nb.sort((a, b) => threatAt(t, b) - threatAt(t, a))[0] : pickR(nb);
        const part = portion(p, 'all'); if (PROV[i].vp >= 6 && part.inf > 0) part.inf--;
        if (landN(part)) { moveLand(p, G.prov[j], part); if (!unitsAt(p)) moveGeneral(i, j, t); }
      }
    }
  }
}
function aiDiplomacy() {
  // dictatorships pick new fights from 1942 on
  if (G.y >= 1942) for (const t of ['GER','ITA','SOV','VIC','SPA','TUR']) {
    if (isHuman(t) || !A(t)) continue;
    const n = nat(t); if (n.ide !== 'F' && n.ide !== 'C') continue;
    if (enemiesOf(t).length || rnd() > 0.04) continue;
    const nbs = new Set(); for (const i of owned(t)) for (const j of PROV[i].adj) { const o = G.prov[j].o; if (o !== t && A(o) && !friendly(o, t) && !pactWith(o, t) && !truceWith(o, t)) nbs.add(o); }
    const list = [...nbs].filter(o => !nat(o).major || rnd() < 0.3);
    if (list.length) declareWar(t, pickR(list));
  }
  for (const t in G.nat) {
    if (!A(t) || isHuman(t) || NATDEF[t].off) continue;
    const n = nat(t);
    for (const e of enemiesOf(t)) {
      if (!A(e) || signer(t) !== t || signer(e) !== e) continue;
      const dur = G.turn - (G.warStart[wkey(t, e)] || 0);
      // losing AIs sue for peace with human players
      if (isHuman(e) && dur >= 4 && rnd() < 0.12) {
        const ws = warScore(t, e);
        if (ws < -0.3 || n.stab < 20) sendDecision(e, { kind:'peace', from:t, terms:'terms', winner:e });
        else if (ws < 0.03 && dur > 10 && n.stab < 45) sendDecision(e, { kind:'peace', from:t, terms:'white', winner:t });
      }
      // stalemated wars between AI nations end quietly
      if (!isHuman(e) && dur > 20 && !n.major && !nat(e).major && Math.abs(warScore(t, e)) < 0.08 && rnd() < 0.05) makePeace(t, e, 'white');
    }
    // threatened minors seek protection
    if (!n.major && !facOf(t) && G.tension > 45 && rnd() < 0.03) {
      const fk = Object.keys(G.facs).find(k => G.facs[k].lead && nat(G.facs[k].lead).ide === n.ide && !membersOf(k).some(m => W(m, t)));
      if (fk && !humanTags().some(h => W(h, t))) joinFaction(t, fk);
    }
  }
}
