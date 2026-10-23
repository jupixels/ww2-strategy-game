'use strict';
/* ================= WAR & ALLIANCES ================= */
function setWar(a, b) {
  if (a === b || friendly(a, b) || !A(a) && a !== 'USA' || !A(b) && b !== 'USA') return;
  const k = wkey(a, b); if (G.warSet.has(k)) return;
  G.wars.push(k); G.warSet.add(k); G.warStart[k] = G.turn;
  delete G.pacts[k];
}
function endWar(a, b) { const k = wkey(a, b); G.wars = G.wars.filter(x => x !== k); G.warSet.delete(k); }
function enemiesOf(t) { const r = []; for (const k of G.wars) { const [a, b] = k.split('|'); if (a === t) r.push(b); else if (b === t) r.push(a); } return r; }
function membersOf(fk) { return fk && G.facs[fk] ? G.facs[fk].m.filter(t => A(t) || t === 'USA' && G.flags.usa) : []; }
const sideOf = t => facOf(t) ? membersOf(facOf(t)) : [t];
const pactWith = (a, b) => (G.pacts[wkey(a, b)] || 0) > G.turn;
const truceWith = (a, b) => (G.truce[wkey(a, b)] || 0) > G.turn;
function warCost(a, b) {
  const n = nat(a);
  if (n.claims && n.claims.includes(b)) return 10;
  return n.ide === 'D' && G.tension < 50 && !enemiesOf(b).some(e => friendly(e, a)) ? 60 : 25;
}
function canDeclare(a, b) {
  if (!A(a) || !A(b) || a === b) return 'Unavailable';
  if (friendly(a, b)) return 'Allies';
  if (W(a, b)) return 'Already at war';
  if (truceWith(a, b)) return `Truce until ${MONTHS[(G.truce[wkey(a, b)]) % 12]}…`;
  if (nat(a).pol < warCost(a, b)) return `Needs ${warCost(a, b)} politics`;
  return '';
}
function declareWar(a, b, opts = {}) {
  if (!A(a) || !A(b) || friendly(a, b) || W(a, b)) return false;
  if (pactWith(a, b)) {
    delete G.pacts[wkey(a, b)];
    nat(a).stab = Math.max(0, nat(a).stab - 15); tension(6);
    news(`${natName(a).toUpperCase()} TEARS UP ITS PACT WITH ${natName(b).toUpperCase()}`);
    if (isHuman(a)) award(a, 'backstab');
    notify('*', '⚠', 'Backstab!', `${natName(a)} broke its non-aggression pact with ${natName(b)}.`, 'war');
  }
  delete G.truce[wkey(a, b)];
  // unaligned victims of Axis aggression may be guaranteed by the Allies
  if (!facOf(b) && G.flags.guarantee && G.facs.ALLIES && membersOf('ALLIES').length && !friendly(a, 'ENG') && isAxis(a) && !['IRQ','SAU','PER'].includes(b)) {
    joinFaction(b, 'ALLIES', true);
    news(`${natName(b)} placed under Allied protection`);
  }
  const sideB = sideOf(b);
  for (const y of sideB) setWar(a, y);
  // guarantors honour their word
  for (const x in G.nat) { const n = G.nat[x]; if (!n.alive || x === a || friendly(x, a) || W(x, a)) continue; if (n.guar.includes(b)) { for (const y of sideOf(x)) setWar(y, a); news(`${natName(x).toUpperCase()} HONOURS ITS GUARANTEE OF ${natName(b).toUpperCase()}`); } }
  tension((nat(a).major || nat(b).major ? 7 : 3) * (opts.half ? 0.5 : 1));
  if (!opts.quiet) {
    news(`${natName(a)} declares war on ${natName(b)}`);
    log(`<b>${natName(a)}</b> declared war on <b>${natName(b)}</b>.`);
    for (const h of humanTags()) if (h !== a && sideB.includes(h)) notify(h, '!', `${natName(a)} declares war`, h === b ? 'Your borders are under attack.' : `Your alliance is called to arms against ${natName(a)}.`, 'war');
  }
  sfx('alarm', a); for (const y of sideB) sfx('alarm', y);
  Hooks.emit('dirty', { owners:true });
  return true;
}
function joinFaction(t, fk, quiet) {
  const old = facOf(t); if (old === fk) return;
  if (old) leaveFaction(t);
  if (!G.facs[fk]) return;
  for (const m of G.facs[fk].m) endWar(t, m);
  G.facs[fk].m.push(t);
  syncFaction(fk);
  if (!quiet) { news(`${natName(t)} joins the ${G.facs[fk].n}`); log(`<b>${natName(t)}</b> joined the ${G.facs[fk].n}.`); }
  Hooks.emit('dirty', { owners:true });
}
function leaveFaction(t) {
  const fk = facOf(t); if (!fk) return;
  const f = G.facs[fk]; f.m = f.m.filter(x => x !== t);
  if (f.lead === t) f.lead = f.m.find(x => A(x)) || null;
  if (!f.lead) delete G.facs[fk];
}
function syncFaction(fk) {
  const ms = membersOf(fk); const en = new Set();
  for (const m of ms) for (const e of enemiesOf(m)) if (!ms.includes(e)) en.add(e);
  for (const m of ms) for (const e of en) setWar(m, e);
}
function canJoin(t, fk) {
  const n = nat(t), F = G.facs[fk]; if (!F) return 'Gone';
  if (facOf(t)) return 'Already in an alliance';
  if (F.lead === t) return '';
  if (membersOf(fk).some(m => W(m, t))) return 'At war with a member';
  if (!(nat(F.lead) && (nat(F.lead).ide === n.ide || G.tension >= 40))) return 'Needs matching ideology or 40% tension';
  if (n.pol < 20) return 'Needs 20 politics';
  return '';
}
function createFaction(t, name) {
  if (facOf(t) || nat(t).pol < 40) return false;
  const fk = 'F_' + t; nat(t).pol -= 40;
  G.facs[fk] = { n:name || `${nat(t).adj} Pact`, lead:t, m:[t] };
  news(`${natName(t).toUpperCase()} FOUNDS THE ${G.facs[fk].n.toUpperCase()}`);
  return true;
}
const setIde = (t, i) => { nat(t).ide = i; };

/* ================= WAR SCORE & PEACE ================= */
function armyPower(t) { const d = divisions(t); return d.inf + d.mtn * 1.1 + d.art * 1.2 + d.arm * 2.6 + d.par * 1.1 + 0.3 * sum(Object.values(airOf(t))); }
function sidePower(t) { return sum(sideOf(t), armyPower); }
function warScore(t, e) {
  // positive: t is winning. Occupation of each other's homelands, weighed by their size
  const st = new Set(sideOf(t)), se = new Set(sideOf(e));
  let eCore = 0, eHeld = 0, tCore = 0, tHeld = 0;
  for (let i = 0; i < NP; i++) {
    const p = G.prov[i], v = PROV[i].vp + 0.5;
    if (se.has(p.core)) { eCore += v; if (st.has(p.o)) eHeld += v; }
    if (st.has(p.core)) { tCore += v; if (se.has(p.o)) tHeld += v; }
  }
  return eHeld / Math.max(1, eCore) - tHeld / Math.max(1, tCore) + (nat(t).stab - nat(e).stab) / 400;
}
// who signs for a side: the faction leader, or the nation itself if unaligned
const signer = t => facOf(t) ? G.facs[facOf(t)].lead : t;
function canOfferPeace(t, e) {
  if (!W(t, e)) return 'Not at war';
  if (facOf(t) && signer(t) !== t) return 'Only your alliance leader can sign peace';
  return '';
}
function aiAcceptsPeace(e, t, terms) {
  const ws = warScore(e, t), dur = G.turn - (G.warStart[wkey(t, e)] || 0), n = nat(e);
  if (terms === 'white') return (ws < 0.06 && dur >= 4) || n.stab < 28 || (ws < 0.2 && dur > 30);
  return ws < -0.28 || n.stab < 18 || (ws < -0.15 && n.stab < 35);
}
function makePeace(a, b, terms) {
  const sa = sideOf(a), sb = sideOf(b);
  for (const x of sa) for (const y of sb) if (W(x, y)) { endWar(x, y); G.truce[wkey(x, y)] = G.turn + 12; }
  if (terms === 'white') {
    // occupied land goes home; troops standing on it are sent back
    for (let i = 0; i < NP; i++) {
      const p = G.prov[i];
      if ((sa.includes(p.o) && sb.includes(p.core)) || (sb.includes(p.o) && sa.includes(p.core))) {
        if (!A(p.core)) continue;
        const occ = p.o, home = homeProv(occ);
        if (home >= 0) for (const k of LAND) G.prov[home].u[k] += p.u[k];
        clearLand(p); p.o = p.core; p.u.inf = 1; p.res = 0;
      }
    }
  } else if (terms === 'terms') {
    for (const p of G.prov) if (sa.includes(p.o) && sb.includes(p.core)) { p.res = Math.max(p.res, 20); }
  }
  const head = terms === 'white' ? `${natName(a).toUpperCase()} AND ${natName(b).toUpperCase()} SIGN WHITE PEACE` : `${natName(b).toUpperCase()} CEDES TERRITORY TO ${natName(a).toUpperCase()}`;
  news(head); log(`<b>Peace</b> between ${natName(a)} and ${natName(b)} (${terms === 'white' ? 'status quo' : 'territory ceded'}).`);
  for (const h of [a, b]) if (isHuman(h)) award(h, 'peacemaker');
  for (const h of humanTags()) if (sa.includes(h) || sb.includes(h)) notify(h, '☮', 'Peace signed', head.charAt(0) + head.slice(1).toLowerCase() + '.', 'medal');
  Hooks.emit('dirty', { owners:true });
}
function offerPeace(t, e, terms) {
  if (canOfferPeace(t, e)) return 'refused';
  const s = signer(e);
  if (isHuman(s)) { sendDecision(s, { kind:'peace', from:t, terms, winner:t }); return 'sent'; }
  if (aiAcceptsPeace(s, t, terms)) { makePeace(t, s, terms); return 'accepted'; }
  return 'refused';
}

/* ================= PACTS, GUARANTEES, DEMANDS, AID ================= */
function canPact(t, o) { if (!A(o) || friendly(t, o) || W(t, o)) return 'Unavailable'; if (pactWith(t, o)) return 'Already signed'; if (nat(t).pol < 25) return 'Needs 25 politics'; return ''; }
function aiAcceptsPact(o, t) {
  const fearT = armyPower(t) / Math.max(1, armyPower(o));
  const busy = enemiesOf(o).length > 0;
  return (fearT > 0.6 || busy) && !(nat(o).ide === 'D' && nat(t).ide === 'F' && G.tension > 70) && rnd() < 0.85;
}
function signPact(a, b) { G.pacts[wkey(a, b)] = G.turn + 36; news(`${natName(a).toUpperCase()} AND ${natName(b).toUpperCase()} SIGN NON-AGGRESSION PACT`); log(`<b>Non-aggression pact</b>: ${natName(a)} and ${natName(b)}, for three years.`); }
function proposePact(t, o) {
  if (canPact(t, o)) return 'refused';
  nat(t).pol -= 25;
  if (isHuman(o)) { sendDecision(o, { kind:'pact', from:t }); return 'sent'; }
  if (aiAcceptsPact(o, t)) { signPact(t, o); return 'accepted'; }
  nat(t).pol += 15; return 'refused';
}
function canGuarantee(t, g) { const n = nat(t); if (!A(g) || g === t || facOf(g) || nat(g).major) return 'Only unaligned minors'; if (n.guar.includes(g)) return 'Already guaranteed'; if (W(t, g)) return 'At war'; if (n.pol < 20) return 'Needs 20 politics'; return ''; }
function guarantee(t, g) { if (canGuarantee(t, g)) return false; const n = nat(t); n.pol -= 20; n.guar.push(g); news(`${natName(t).toUpperCase()} GUARANTEES ${natName(g).toUpperCase()}`); tension(1); return true; }
function demandable(t, o) {
  // the target's provinces you claim: your old cores, or border provinces next to you
  const r = [];
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o !== o) continue; if (p.core === t || PROV[i].adj.some(j => G.prov[j].o === t)) r.push(i); }
  return r.sort((x, y) => (G.prov[y].core === t) - (G.prov[x].core === t) || PROV[x].vp - PROV[y].vp).slice(0, 2);
}
function canDemand(t, o) { if (!A(o) || friendly(t, o) || W(t, o)) return 'Unavailable'; if (!demandable(t, o).length) return 'No claims'; if (nat(t).pol < 30) return 'Needs 30 politics'; if (G.tension < 20) return 'World tension must be 20%+'; return ''; }
function aiAcceptsDemand(o, t) {
  if (facOf(o) && membersOf(facOf(o)).length > 1) return false;
  if (Object.values(G.nat).some(n => n.alive && n.guar.includes(o) && armyPower(n.tag) > armyPower(t) * 0.6)) return false;
  return armyPower(t) > armyPower(o) * 2.5;
}
function demand(t, o) {
  if (canDemand(t, o)) return 'refused';
  nat(t).pol -= 30; tension(3);
  const provs = demandable(t, o);
  if (isHuman(o)) { sendDecision(o, { kind:'demand', from:t, provs }); return 'sent'; }
  if (aiAcceptsDemand(o, t)) { cede(o, t, provs); return 'accepted'; }
  (nat(t).claims || (nat(t).claims = [])).push(o);
  news(`${natName(o).toUpperCase()} REJECTS ${natName(t).toUpperCase()}'S DEMANDS`);
  return 'refused';
}
function cede(from, to, provs) {
  for (const i of provs) { const p = G.prov[i]; if (p.o !== from) continue; relocate(i, from); p.o = to; p.u.inf = 1; p.res = p.core === to ? 0 : 10; }
  news(`${natName(from).toUpperCase()} CEDES ${provs.map(i => PROV[i].name.toUpperCase()).join(' AND ')} TO ${natName(to).toUpperCase()}`);
  checkCapitulation(from, to);
  Hooks.emit('dirty', { owners:true });
}
function relocate(pid, owner) {
  const p = G.prov[pid];
  const dest = PROV[pid].adj.filter(j => G.prov[j].o === owner);
  if (dest.length && unitsAt(p)) { const d = G.prov[dest[0]]; for (const k of LAND) d.u[k] += p.u[k]; }
  clearLand(p);
  for (const k of AIR) if (p.air[k]) { if (dest.length) G.prov[dest[0]].air[k] += p.air[k]; p.air[k] = 0; }
  displaceGeneral(pid, owner, dest.length ? dest[0] : -1);
}
function transfer(names, to, garrison = 1) {
  for (const nm of names) {
    const id = ID[nm]; if (id == null) continue; const p = G.prov[id]; if (p.o === to) continue;
    relocate(id, p.o); p.o = to; p.u.inf = garrison; p.res = p.core === to ? 0 : 10;
  }
  Hooks.emit('dirty', { owners:true });
}
function grab(to, names, from) { transfer(names.filter(n => O(n) === from), to, 2); }
function annex(d, w) {
  if (!A(d) || !A(w)) return;
  for (const p of G.prov) if (p.o === d) p.o = w;
  for (const p of G.prov) if (p.core === d) p.core = w;
  for (const z in G.fleet) if (G.fleet[z][d]) { const f = G.fleet[z][d]; addFleet(z, w, 'cap', f.cap); addFleet(z, w, 'sub', f.sub); delete G.fleet[z][d]; }
  G.gens.forEach(g => { if (g.tag === d) g.tag = w; });
  killNation(d, w);
  if (isHuman(d)) switchHuman(d, w, `${natName(d)} has been peacefully absorbed. You now lead ${natName(w)}.`);
}
function switchHuman(from, to, why) {
  if (!isHuman(from)) return;
  if (isHuman(to)) { G.humans[from].dead = true; Hooks.emit('defeated', { tag:from }); return; }
  G.humans[to] = G.humans[from]; delete G.humans[from];
  notify(to, '★', `You now lead ${natName(to)}`, why, 'medal');
  Hooks.emit('switch', { from, to });
}
function sendAid(t, to, kind, amt) {
  const n = nat(t); if (!friendly(t, to) || t === to || !A(to)) return false;
  if (n[kind] < amt) return false;
  n[kind] -= amt; nat(to)[kind] += amt; n.aid += amt;
  notify(to, '⚓', `Aid from ${natName(t)}`, `${amt} ${kind === 'pp' ? 'production' : kind === 'mp' ? 'k manpower' : kind} arrived.`, '');
  return true;
}

/* ================= INBOX: newspapers and decisions for human players ================= */
function sendNews(to, item) {
  for (const h of humanTags()) if (!G.humans[h].dead && (to === '*' || to === h)) pushInbox(h, { type:'news', ...item });
}
function sendDecision(to, item) { if (isHuman(to)) pushInbox(to, { type:'decision', ...item }); }
function pushInbox(h, item) { item.uid = (G.uid = (G.uid || 0) + 1); (G.inbox[h] || (G.inbox[h] = [])).push(item); Hooks.emit('inbox', { to:h }); }
function inboxOf(h) { return G.inbox[h] || []; }
// answer an inbox item: choice index for events, true/false for decisions
function answer(h, uid, choice) {
  const box = inboxOf(h), i = box.findIndex(x => x.uid === uid); if (i < 0) return false;
  const it = box[i]; box.splice(i, 1);
  if (it.type === 'event') resolveEvent(h, it, choice);
  else if (it.type === 'decision') resolveDecision(h, it, !!choice);
  Hooks.emit('dirty', { owners:true });
  return true;
}
function resolveDecision(h, it, yes) {
  if (it.kind === 'restore') { if (yes) restoreNation(it.tag, h); else log(`${natName(it.tag)} remains under ${natName(h)} administration.`); }
  else if (it.kind === 'peace') { const w = it.winner || it.from, l = w === it.from ? h : it.from; if (yes && W(it.from, h)) makePeace(w, l, it.terms); else notify(it.from, '✕', 'Peace refused', `${natName(h)} will fight on.`, 'war'); }
  else if (it.kind === 'pact') { if (yes && !W(it.from, h)) signPact(it.from, h); else notify(it.from, '✕', 'Pact refused', `${natName(h)} declined.`, ''); }
  else if (it.kind === 'demand') { if (yes) cede(h, it.from, it.provs.filter(i => G.prov[i].o === h)); else { (nat(it.from).claims || (nat(it.from).claims = [])).push(h); notify(it.from, '✕', 'Demands rejected', `${natName(h)} refuses. War with them now costs only 10 politics.`, 'war'); } }
  else if (it.kind === 'alliance') { if (yes && G.facs[it.fk]) joinFaction(h, it.fk); }
  else if (it.kind === 'invite') { if (yes && G.facs[it.fk] && !facOf(it.to)) joinFaction(it.to, it.fk); else notify(it.from, '✕', 'Invitation declined', '', ''); }
}
