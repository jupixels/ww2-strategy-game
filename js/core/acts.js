'use strict';
/* ================= THE SECOND ACT =================
   When the great powers stop fighting each other (or in 1946, whatever happens), the world the war left behind
   decides what comes next. G.act = { k, y0, ... } holds the act; the game then runs to 1955.
     coldwar   the victors split into a Western and an Eastern bloc: spheres of influence, the Doomsday Clock
     reich     the Axis rules a continent: resistance everywhere, the Reich and Japan drift into a cold war of
               their own, America leads what is left of the free world
     redtide   the Red Army dominates: the Free World huddles together, satellites turn restless
     american  only America is left standing: the empires break up and the Pax Americana is tested
     exhaust   1946 and the great powers still fight with nobody winning: armistice conferences, war-weariness
   Every act opens with a peace conference and brings decolonisation. Humans read about it in a front page and in
   the World panel; blocs compete for minors with "Bring into the bloc" (doCommand 'sphere'). */
const ACT_END = 1955;
const ACTS = {
  coldwar: { n:'The Cold War', short:'Two blocs, one bomb away from war',
    d:'The wartime alliance is over. Washington and Moscow divide the world into blocs. Win the neutrals to your side, race for the Bomb — and keep the Doomsday Clock from striking midnight.' },
  reich:   { n:'The Long Night', short:'The Axis rules, the free world resists',
    d:'The Axis has won its war. Now it must hold what it took: resistance smoulders in every occupied land, Berlin and Tokyo eye each other across Asia, and America arms what is left of the free world.' },
  redtide: { n:'The Red Tide', short:'Moscow dominates; the free world closes ranks',
    d:'The Red Army stands over half the world. The remaining democracies huddle together, while in the satellites, national communists dream of breaking with Moscow.' },
  american:{ n:'The American Century', short:'One superpower, crumbling empires',
    d:'Only America is left as a great power. The old empires cannot hold their colonies, and every rival is tempted to test the new order.' },
  exhaust: { n:'The Exhausted World', short:'An endless war no one is winning',
    d:'The war grinds on into its second decade of misery. Armies are bled white, home fronts are cracking, and statesmen gather to seek an armistice that nobody is sure they want.' },
};
const DOOM_MAX = 100;
const majorsAlive = () => MAJORS.filter(t => A(t));
function majorWar() { const ms = majorsAlive(); for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (W(ms[i], ms[j])) return true; return false; }
function blocVP(tags) { return sum(tags.filter(A), vpOf); }
function classifyWorld() {
  const axis = ['GER','ITA','JAP'].filter(t => A(t) && isAxis(t)), west = ['ENG','FRA','USA'].filter(t => A(t) && nat(t).ide !== 'F' && nat(t).ide !== 'C');
  const sov = A('SOV') && nat('SOV').ide === 'C', tot = totalVP();
  if (majorWar()) return 'exhaust';
  if (axis.length && blocVP(membersOf('AXIS')) > tot * 0.3) return 'reich';
  if (sov && (!west.length || vpOf('SOV') > 1.5 * blocVP(west))) return 'redtide';
  if (sov && west.length) return 'coldwar';
  if (A('USA')) return 'american';
  return 'coldwar';
}
function checkSecondAct() {
  if (G.act) return tickAct();
  if (G.gm === 'blitz' || G.daily || G.y < 1943) return;
  const quiet = !majorWar();
  G.flags.quiet = quiet ? (G.flags.quiet || 0) + 1 : 0;
  if (G.flags.quiet >= 3 && G.y >= 1944 || nowNum() >= ymNum(1946, 0)) startAct(classifyWorld());
}
function startAct(k) {
  const A0 = ACTS[k]; if (!A0) return;
  G.act = { k, y0:G.y, m0:G.m, doom:k === 'coldwar' ? 25 : k === 'redtide' ? 30 : 15, peaks:0, conf:0 };
  peaceConference();
  if (k === 'coldwar') {
    // the Grand Alliance splits: Moscow and the communists form their own bloc
    const east = Object.keys(G.nat).filter(t => A(t) && nat(t).ide === 'C' && !NATDEF[t].off);
    for (const t of east) if (facOf(t) && facOf(t) !== 'EAST') leaveFaction(t);
    G.facs.EAST = { n:'Eastern Bloc', lead:'SOV', m:east.filter(t => t !== 'SOV') };
    G.facs.EAST.m.unshift('SOV');
    delete G.facs.COMINTERN;
    westernBloc();
  } else if (k === 'reich') {
    // the victors fall out: Japan goes its own way in Asia
    if (A('JAP') && isAxis('JAP') && A('GER')) { leaveFaction('JAP'); G.facs.SPHERE = { n:'Co-Prosperity Sphere', lead:'JAP', m:['JAP', ...(A('MAN') && isAxis('MAN') ? ['MAN'] : [])] }; if (A('MAN') && facOf('MAN') === 'AXIS') { const f = G.facs.AXIS; f.m = f.m.filter(x => x !== 'MAN'); } news('BERLIN AND TOKYO DIVIDE THE WORLD — AND DISTRUST EACH OTHER'); }
    westernBloc('Free World');
    G.act.doom = 20;
  } else if (k === 'redtide') {
    westernBloc('Free World');
    const sov = facOf('SOV'); if (sov && G.facs[sov]) G.facs[sov].n = 'Soviet Bloc';
  } else if (k === 'american') {
    westernBloc('Pax Americana');
  } else if (k === 'exhaust') {
    G.act.doom = 10;
  }
  news(`${A0.n.toUpperCase()}`);
  log(`<b>The second act begins: ${A0.n}.</b> ${A0.short}.`);
  sendNews('*', { title:A0.n, head:A0.n, dek:A0.short, text:A0.d + ' The war years are over: the story now runs to ' + ACT_END + '. Open the World panel to see your bloc and the Doomsday Clock.', plate:k === 'reich' ? 'GER' : k === 'redtide' ? 'SOV' : 'USA' });
  Hooks.emit('dirty', { owners:true });
}
// the democracies close ranks under American (or British) leadership
function westernBloc(name) {
  const lead = A('USA') && nat('USA').ide === 'D' ? 'USA' : A('ENG') && nat('ENG').ide === 'D' ? 'ENG' : null; if (!lead) return;
  if (!G.facs.ALLIES) G.facs.ALLIES = { n:'Allies', lead, m:[lead] };
  const F = G.facs.ALLIES; F.n = name || 'Western Alliance'; F.lead = lead;
  if (!F.m.includes(lead)) { leaveFaction(lead); F.m.push(lead); }
  // communists leave it
  F.m = F.m.filter(t => !A(t) || nat(t).ide !== 'C');
}
// the peace conference: occupied nations are restored by democracies and communists, kept by the rest
function peaceConference() {
  const restored = [];
  for (let i = 0; i < NP; i++) {
    const p = G.prov[i], c = p.core; if (!c || A(c) || NATDEF[c].off || c === 'VIC' || NATDEF[c].cap !== PROV[i].name) continue;
    const by = p.o; if (!A(by) || isHuman(by)) continue;
    if (nat(by).ide === 'D' || nat(by).ide === 'C' || rnd() < 0.25) { restoreNation(c, by); restored.push(c); }
  }
  for (const h of humanTags()) if (A(h)) {
    const held = []; for (let i = 0; i < NP; i++) { const p = G.prov[i], c = p.core; if (p.o === h && c && c !== h && !A(c) && !NATDEF[c].off && c !== 'VIC' && NATDEF[c].cap === PROV[i].name) held.push(c); }
    if (held.length) sendDecision(h, { kind:'conference', tags:[...new Set(held)] });
  }
  if (restored.length) news(`PEACE CONFERENCE RESTORES ${restored.slice(0, 3).map(natName).join(', ').toUpperCase()}${restored.length > 3 ? ' AND OTHERS' : ''}`);
}
function resolveConference(h, it, yes) {
  if (yes) { for (const c of it.tags) restoreNation(c, h); nat(h).stab = Math.min(100, nat(h).stab + 10); nat(h).pol += 30; }
  else { for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o === h && it.tags.includes(p.core)) p.res = Math.max(p.res, 40); } }
}
/* ---------- each month of the act ---------- */
function tickAct() {
  const a = G.act; if (!a) return;
  const bombs = Object.keys(G.nat).filter(t => A(t) && nat(t).tech.bomb).length;
  // the Doomsday Clock: tension, bombs and border wars between the blocs push it on; quiet years pull it back
  if (a.k !== 'exhaust') {
    const blocWar = Object.keys(G.facs).some(f => membersOf(f).some(m => enemiesOf(m).some(e => G.facs[facOf(e)] && facOf(e) !== f && G.facs[facOf(e)].lead && nat(G.facs[facOf(e)].lead).major)));
    if (!majorWar()) tension(-0.8); // peace slowly lowers world tension
    // the clock drifts toward where the world stands, and crises jolt it
    const target = 18 + Math.min(3, bombs) * 8 + (blocWar ? 15 : 0) + (G.tension - 50) * 0.2;
    a.doom = clamp(a.doom + (target - a.doom) * 0.07 + (rnd() - 0.5) * 2, 0, DOOM_MAX);
    if (rnd() < 0.05) { const up = rnd() < 0.6, k = up ? pickR(['Berlin Crisis','Strait Crisis','Spy Plane Shot Down','Border Clash']) : pickR(['Summit in Geneva','The Thaw','Hotline Agreed']); a.doom = clamp(a.doom + (up ? 9 : -9), 0, DOOM_MAX); news((up ? 'CRISIS: ' : 'THAW: ') + k.toUpperCase()); }
    if (a.doom >= DOOM_MAX && !a.ww3) worldWarThree();
    if (a.doom >= 75 && !a.warned) { a.warned = 1; news('THE DOOMSDAY CLOCK STANDS AT TWO MINUTES TO MIDNIGHT'); for (const h of humanTags()) notify(h, '☢', 'Two minutes to midnight', 'Tension between the blocs is near breaking point. Lower it — make pacts, avoid border wars — or the world goes to war again.', 'war'); }
  }
  // the bloc leaders court the neutrals
  for (const fk of Object.keys(G.facs)) {
    const L = G.facs[fk].lead; if (!L || !A(L) || isHuman(L) || !nat(L).major) continue;
    if (rnd() < 0.12) { const tg = sphereTargets(L)[0]; if (tg) bringIntoBloc(L, tg); }
  }
  if (a.k === 'reich' || a.k === 'redtide') for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core !== p.o && A(p.o) && (a.k === 'reich' ? isAxis(p.o) || facOf(p.o) === 'SPHERE' : nat(p.o).ide === 'C')) p.res = Math.min(100, p.res + 1.5); }
  if (a.k === 'redtide' && G.m === 6 && rnd() < 0.5) titoSplit();
  if (a.k === 'exhaust') {
    for (const t of majorsAlive()) if (enemiesOf(t).some(e => nat(e).major)) { const n = nat(t); n.ww = Math.min(60, (n.ww || 0) + 1.5); }
    if (G.m === 0 || G.m === 6) armisticeConference();
    if (!majorWar() && !a.settled) { a.settled = 1; const k = classifyWorld(); if (k !== 'exhaust') { news('THE GUNS FALL SILENT AT LAST'); G.act = null; startAct(k); return; } }
  }
  decolonise();
  if (G.y >= 1949 && !a.bombRace) { a.bombRace = 1; for (const t of majorsAlive()) if (!nat(t).tech.atom && !nat(t).tech.bomb) nat(t).rs.length < nat(t).slots && startResearch(t, 'atom'); }
}
function worldWarThree() {
  const a = G.act; a.ww3 = 1;
  const blocs = Object.keys(G.facs).filter(f => G.facs[f].lead && A(G.facs[f].lead) && nat(G.facs[f].lead).major).sort((x, y) => blocVP(membersOf(y)) - blocVP(membersOf(x)));
  if (blocs.length < 2) return;
  declareWar(G.facs[blocs[1]].lead, G.facs[blocs[0]].lead);
  news('MIDNIGHT: THE BLOCS GO TO WAR');
  sendNews('*', { title:'World War Three', head:'Midnight', dek:'The Doomsday Clock has struck twelve', text:'Diplomacy has failed. Across the old fronts and the new borders the blocs mobilise for the war everyone feared. There may be no third act.', plate:G.facs[blocs[0]].lead });
}
// bring an unaligned minor into your bloc: politics, ideology, proximity and its fear of your rivals decide
function sphereTargets(t) {
  const fk = facOf(t); if (!fk) return [];
  return Object.keys(G.nat).filter(o => A(o) && !NATDEF[o].off && !nat(o).major && !facOf(o) && !W(o, t) && !isHuman(o)).map(o => {
    let s = (nat(o).ide === nat(t).ide ? 2 : nat(o).ide === 'N' ? 1 : 0) + (owned(o).some(i => PROV[i].adj.some(j => friendly(G.prov[j].o, t))) ? 1.5 : 0) + rnd();
    return [o, s];
  }).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
const SPHERE_COST = 25;
function canSphere(t, o) { if (!G.act) return 'Only after the war'; if (!facOf(t)) return 'Lead or join a bloc first'; if (!A(o) || facOf(o) || nat(o).major || W(t, o)) return 'Unavailable'; if (nat(t).pol < SPHERE_COST) return `Needs ${SPHERE_COST} politics`; return ''; }
function bringIntoBloc(t, o) {
  if (canSphere(t, o)) return 'refused';
  nat(t).pol -= SPHERE_COST;
  const fk = facOf(t), ide = nat(o).ide === nat(t).ide, near = owned(o).some(i => PROV[i].adj.some(j => friendly(G.prov[j].o, t)));
  const p = 0.25 + (ide ? 0.35 : 0) + (near ? 0.2 : 0) - (nat(o).ide !== 'N' && !ide ? 0.3 : 0);
  if (rnd() < p) { joinFaction(o, fk, true); news(`${natName(o).toUpperCase()} JOINS THE ${G.facs[fk].n.toUpperCase()}`); if (G.act) G.act.doom = Math.min(DOOM_MAX, G.act.doom + 1); return 'accepted'; }
  return 'refused';
}
// national communists break with Moscow
function titoSplit() {
  const sov = facOf('SOV'); if (!sov) return;
  const c = membersOf(sov).filter(t => t !== 'SOV' && !isHuman(t) && !nat(t).major);
  if (!c.length) return;
  const t = pickR(c); leaveFaction(t);
  news(`${natName(t).toUpperCase()} BREAKS WITH MOSCOW`);
}
// the armistice conference: white peace offered between exhausted great powers
function armisticeConference() {
  G.act.conf++;
  for (const t of majorsAlive()) for (const e of enemiesOf(t)) {
    if (!nat(e).major || t > e) continue;
    const ht = isHuman(signer(t)) ? signer(t) : isHuman(signer(e)) ? signer(e) : null;
    if (ht) { const other = ht === signer(t) ? signer(e) : signer(t); if (!inboxOf(ht).some(x => x.kind === 'peace' && x.from === other)) sendDecision(ht, { kind:'peace', from:other, terms:'white', winner:other }); }
    else if (Math.abs(warScore(t, e)) < 0.15 || rnd() < 0.35) makePeace(t, e, 'white');
  }
  news('ARMISTICE CONFERENCE CONVENES IN GENEVA');
}
// the empires break up: colonies rise, India and others walk out
function decolonise() {
  if (G.y < 1946) return;
  for (let i = 0; i < NP; i++) {
    const P = PROV[i], p = G.prov[i];
    if (!P.col || !A(p.o) || nat(p.o).ide === 'C' && G.act.k !== 'american') continue;
    if (inEurope(p.o) || ['USA','JAP','SOV'].includes(p.o)) p.res = Math.min(100, p.res + (G.act.k === 'american' ? 1.5 : 0.8));
  }
  if (A('RAJ') && facOf('RAJ') && !isHuman('RAJ') && G.y >= 1947 && !G.flags.indep) {
    G.flags.indep = 1; leaveFaction('RAJ'); setIde('RAJ', 'N'); nat('RAJ').stab = Math.max(nat('RAJ').stab, 55);
    news('INDIA WINS ITS INDEPENDENCE');
    sendNews('*', { title:'Indian Independence', head:'A Tryst with Destiny', dek:'At the stroke of midnight, India awakes to life and freedom', text:'The British Raj is no more. The new India leaves the alliance and charts its own course between the blocs.', plate:'RAJ' });
  }
}
const actEndTurn = () => G.gm === 'blitz' ? ymNum(1942, 2) : G.act ? ymNum(ACT_END, 0) : ymNum(1950, 0);
// score at the end: members of the bloc that holds the most of the world
function actBlocWinner() {
  if (!G.act) return null;
  const fs = Object.keys(G.facs).filter(f => membersOf(f).length);
  return fs.sort((a, b) => blocVP(membersOf(b)) - blocVP(membersOf(a)))[0] || null;
}
