'use strict';
/* ================= ORDERS =================
   Every player action is a command object run through doCommand(tag, cmd). Single player and hot-seat
   run it locally; online, clients send commands to the host, which runs them and broadcasts the result.
   In simultaneous multiplayer, attacks are queued as orders and resolved together at month end. */

// what the army at `pid` can do: Map(provinceId -> 'move'|'attack'|'naval'|'land'|'para')
function targetsFor(t, pid) {
  const r = new Map(), p = G.prov[pid];
  if (!p || p.o !== t || readyAt(p) === 0) return r;
  for (const j of PROV[pid].adj) { const o = G.prov[j].o; if (o === t) r.set(j, 'move'); else if (W(t, o)) r.set(j, 'attack'); }
  if (PROV[pid].coast) for (const [j, k] of navalTargets(pid, t)) if (!r.has(j)) r.set(j, k);
  if (p.r.par > 0) for (const j of paraTargets(t, pid)) if (!r.has(j)) r.set(j, 'para');
  return r;
}
function execMove(t, from, to, amt) {
  const k = targetsFor(t, from).get(to);
  if (k !== 'move' && k !== 'naval') return null;
  const p = G.prov[from], T = G.prov[to];
  const part = portion(p, amt); if (!landN(part)) return null;
  const all = landN(part) >= readyAt(p) && readyAt(p) === unitsAt(p);
  moveLand(p, T, part);
  if (all || !unitsAt(p)) moveGeneral(from, to, t);
  return { kind:k, from, to, part };
}
function execAttack(t, froms, to, amt, kindHint) {
  // froms: one or several source provinces attacking the same target together
  froms = [].concat(froms);
  const srcs = [];
  let kind = null;
  for (const f of froms) {
    const k = targetsFor(t, f).get(to);
    if (!k || k === 'move' || k === 'naval') continue;
    if (k === 'para') { const p = G.prov[f]; const part = emptyLand(); part.par = amt === 'one' ? 1 : amt === 'half' ? Math.ceil(p.r.par / 2) : p.r.par; srcs.push({ id:f, u:part }); kind = kind || 'para'; continue; }
    const part = portion(G.prov[f], amt); if (!landN(part)) continue;
    srcs.push({ id:f, u:part }); if (!kind || k === 'attack') kind = k;
  }
  if (!srcs.length) return null;
  const r = battle(srcs, to, { naval:kind === 'land', para:kind === 'para' });
  r.kind = kind;
  // blitz: a crushing armored win frees the tanks to strike again (handled by ready flags in capture)
  return r;
}
// queue an attack for simultaneous resolution: units are reserved (no longer ready) but stay put until month end
function queueAttack(t, froms, to, amt) {
  froms = [].concat(froms);
  const srcs = []; let kind = null;
  for (const f of froms) {
    const k = targetsFor(t, f).get(to);
    if (!k || k === 'move' || k === 'naval') continue;
    const p = G.prov[f];
    const part = k === 'para' ? { ...emptyLand(), par:amt === 'one' ? 1 : p.r.par } : portion(p, amt);
    if (!landN(part)) continue;
    for (const kk of LAND) p.r[kk] -= part[kk];
    srcs.push({ id:f, u:part }); if (!kind || k === 'attack') kind = k;
  }
  if (!srcs.length) return null;
  const o = { id:(G.oid = (G.oid || 0) + 1), t, srcs, to, kind };
  G.orders.push(o);
  return o;
}
function cancelOrder(t, id) {
  const i = G.orders.findIndex(o => o.id === id && o.t === t); if (i < 0) return false;
  const o = G.orders[i]; G.orders.splice(i, 1);
  for (const s of o.srcs) { const p = G.prov[s.id]; if (p.o === t) for (const k of LAND) p.r[k] = Math.min(p.u[k], p.r[k] + s.u[k]); }
  return true;
}
function resolveOrders() {
  const out = [];
  if (!G.orders.length) return out;
  const orders = shuffleR(G.orders.slice()); G.orders = [];
  // meeting engagements: two armies ordered into each other's province clash in the open field
  const skip = new Set();
  for (const a of orders) for (const b of orders) {
    if (a === b || skip.has(a.id) || skip.has(b.id) || !W(a.t, b.t)) continue;
    if (a.srcs.some(s => s.id === b.to) && b.srcs.some(s => s.id === a.to)) {
      const sa = sum(a.srcs, s => landN(s.u)) * (0.8 + rnd() * 0.4), sb = sum(b.srcs, s => landN(s.u)) * (0.8 + rnd() * 0.4);
      const [win, lose] = sa >= sb ? [a, b] : [b, a];
      skip.add(lose.id); win.meeting = true;
      Hooks.emit('meeting', { a:win.t, b:lose.t, at:win.to });
    }
  }
  // round-robin by player so nobody always strikes first
  const byT = {}; for (const o of orders) if (!skip.has(o.id)) (byT[o.t] || (byT[o.t] = [])).push(o);
  const tags = shuffleR(Object.keys(byT));
  let left = true;
  while (left) {
    left = false;
    for (const t of tags) {
      const o = byT[t].shift(); if (!o) continue; left = true;
      if (!A(t)) continue;
      const srcs = [];
      for (const s of o.srcs) { const p = G.prov[s.id]; if (p.o !== t) continue; const u = emptyLand(); for (const k of LAND) u[k] = Math.min(s.u[k], p.u[k]); if (landN(u)) srcs.push({ id:s.id, u }); }
      if (!srcs.length) continue;
      if (!W(t, G.prov[o.to].o)) { if (G.prov[o.to].o === t && o.kind !== 'para') { for (const s of srcs) moveLand(G.prov[s.id], G.prov[o.to], s.u); } continue; }
      // reserved units were un-readied when queued; battle() expects them ready, so restore that first
      for (const s of srcs) for (const k of LAND) G.prov[s.id].r[k] += s.u[k];
      const r = battle(srcs, o.to, { naval:o.kind === 'land', para:o.kind === 'para', meeting:o.meeting });
      r.kind = o.kind; r.meeting = o.meeting; out.push(r);
    }
  }
  return out;
}

/* ---------- command dispatcher ---------- */
function doCommand(t, c, mode) {
  // mode: 'instant' (single player / hot-seat) or 'queue' (simultaneous multiplayer)
  if (!G || G.over && G.over.final || !A(t)) return { ok:false, why:'Not available' };
  const n = nat(t), q = mode === 'queue';
  const R = (ok, extra) => Object.assign({ ok:!!ok }, extra || {});
  switch (c.c) {
    case 'move': { const r = execMove(t, c.from, c.to, c.amt); return R(r, { move:r }); }
    case 'attack': {
      if (q) { const o = queueAttack(t, c.from, c.to, c.amt); return R(o, { queued:o }); }
      const r = execAttack(t, c.from, c.to, c.amt); if (r) Hooks.emit('battle', r); return R(r, { battle:r });
    }
    case 'cancel': return R(cancelOrder(t, c.id));
    case 'build': { const ok = build(t, c.k, c.pid, c.zone); return R(ok); }
    case 'buildN': { let made = 0; for (let i = 0; i < c.n; i++) if (build(t, c.k, c.pid, c.zone)) made++; return R(made, { made }); }
    case 'factory': return R(buildFactory(t, c.pid));
    case 'fort': return R(buildFort(t, c.pid));
    case 'import': return R(doImport(t, c.k));
    case 'research': return R(startResearch(t, c.k));
    case 'cancelres': cancelResearch(t, c.k); return R(true);
    case 'focus': return R(startFocus(t, c.k));
    case 'card': return R(playCard(t, c.k, c.target));
    case 'spy': { const r = spyOp(t, c.op, c.target); return R(r, { spy:r }); }
    case 'hirespy': return R(hireSpy(t));
    case 'hiregen': return R(hireGeneral(t, false, c.name));
    case 'postgen': { const g = G.gens.find(x => x.id === c.id && x.tag === t); if (!g || G.prov[c.pid].o !== t || genAt(c.pid, t) || n.pol < 5) return R(false); n.pol -= 5; g.pid = c.pid; return R(true); }
    case 'declare': { const why = canDeclare(t, c.tag); if (why) return R(false, { why }); n.pol -= warCost(t, c.tag); declareWar(t, c.tag); return R(true); }
    case 'join': { const why = canJoin(t, c.fk); if (why) return R(false, { why }); n.pol -= 20; joinFaction(t, c.fk); return R(true); }
    case 'found': return R(createFaction(t, c.name));
    case 'leave': if (!facOf(t)) return R(false); leaveFaction(t); for (const e of enemiesOf(t)) if (!W(t, e)) endWar(t, e); return R(true);
    case 'invite': { const fk = facOf(t); if (!fk || G.facs[fk].lead !== t || facOf(c.tag) || W(t, c.tag) || n.pol < 15) return R(false); n.pol -= 15;
      if (isHuman(c.tag)) { sendDecision(c.tag, { kind:'invite', fk, from:t, to:c.tag }); return R(true, { sent:true }); }
      const ok = nat(c.tag).ide === n.ide || G.tension > 50 && rnd() < 0.5 || enemiesOf(c.tag).some(e => W(e, t)); if (ok) joinFaction(c.tag, fk); return R(true, { accepted:ok }); }
    case 'peace': return R(true, { result:offerPeace(t, c.tag, c.terms) });
    case 'pact': return R(true, { result:proposePact(t, c.tag) });
    case 'guarantee': return R(guarantee(t, c.tag));
    case 'demand': return R(true, { result:demand(t, c.tag) });
    case 'aid': return R(sendAid(t, c.to, c.kind, c.amt));
    case 'decision': return R(enactDecision(t, c.k));
    case 'totalwar': if (n.totalWar > 0 || !enemiesOf(t).length || n.pol < 30) return R(false); n.pol -= 30; n.totalWar = 12; return R(true);
    case 'ops': return R(launchOperation(t, c.targets));
    case 'cancelops': n.ops = null; return R(true);
    case 'raid': { if (!raidTargets(t, c.from).includes(c.to)) return R(false); const r = airRaid(t, c.from, c.to); Hooks.emit('raid', { t, from:c.from, to:c.to, ...r }); return R(true, { raid:r }); }
    case 'rocket': { if (!n.tech.rocket || n.rocket || !rocketTargets(t).includes(c.to)) return R(false); const k = fireRocket(t, c.to); award(t, 'v2'); Hooks.emit('battle', { tid:c.to, from:[], a:t, d:G.prov[c.to].o, rocket:k }); return R(true, { killed:k }); }
    case 'bomb': { if (canBomb(t) || !rocketTargets(t).includes(c.to)) return R(false); const vic = G.prov[c.to].o; const r = dropBomb(t, c.to); award(t, 'bomb'); news(`ATOMIC BOMB DROPPED ON ${PROV[c.to].name.toUpperCase()}`); Hooks.emit('battle', { tid:c.to, from:[], a:t, d:vic, bomb:r.killed, surrender:r.surrender }); return R(true, { bomb:r }); }
    case 'fleet': return R(moveFleet(t, c.from, c.to, c.part));
    case 'answer': return R(answer(t, c.uid, c.choice));
  }
  return R(false, { why:'Unknown command' });
}
