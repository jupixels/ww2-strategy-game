'use strict';
/* ================= MEDALS ================= */
function award(t, k) {
  if (!isHuman(t) || !ACH[k]) return;
  const a = G.ach || (G.ach = {}); const m = a[t] || (a[t] = {});
  if (m[k] != null) return; m[k] = G.turn;
  notify(t, '✪', 'Medal: ' + ACH[k].n, ACH[k].d, 'medal'); sfx('medal', t);
  log(`${natName(t)} earns the <b>${ACH[k].n}</b> medal.`);
}
const medalsOf = t => Object.keys((G.ach && G.ach[t]) || {});

/* ================= VISIBILITY ================= */
function visibleTo(viewer, i) {
  const p = G.prov[i];
  if (friendly(p.o, viewer)) return true;
  const n = nat(viewer); if (!n) return true;
  if (n.intel > 0 || n.tech.radar || (n.reveal && n.reveal[p.o] > 0)) return true;
  return PROV[i].adj.some(j => friendly(G.prov[j].o, viewer));
}

/* ================= STRATEGY CARDS ================= */
function cardPool(t) {
  const n = nat(t);
  return Object.keys(CARDS).filter(k => { const C = CARDS[k]; if (C.ide && C.ide !== n.ide) return false; if (k === 'wolfpack' && !navyOf(t).sub) return false; if (k === 'human' && !n.major && n.ide !== 'C') return false; return true; });
}
function drawCards(t, k) {
  const n = nat(t); if (!n.alive) return;
  for (let i = 0; i < k && n.hand.length < HAND_MAX; i++) {
    const pool = cardPool(t), tot = sum(pool, c => CARDS[c].w);
    let r = rnd() * tot; for (const c of pool) { r -= CARDS[c].w; if (r <= 0) { n.hand.push(c); break; } }
  }
}
function cardTargets(t, k) {
  const C = CARDS[k], n = nat(t), r = [];
  if (C.tgt === 'own') { for (let i = 0; i < NP; i++) if (G.prov[i].o === t && G.prov[i].fort < 3) r.push(i); }
  else if (C.tgt === 'enemy') { for (let i = 0; i < NP; i++) if (W(t, G.prov[i].o) && visibleTo(t, i)) r.push(i); }
  else if (C.tgt === 'occ') { for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core === t && p.o !== t && !friendly(p.o, t)) r.push(i); } }
  else if (C.tgt === 'nation') {
    const nbs = new Set(); for (const i of owned(t)) for (const j of PROV[i].adj) nbs.add(G.prov[j].o);
    for (const o in G.nat) {
      if (!A(o) || o === t || NATDEF[o].off) continue;
      if (k === 'falseflag' && nbs.has(o) && !friendly(o, t) && !W(o, t) && !truceWith(t, o)) r.push(o);
      if (k === 'coup' && !nat(o).major && !facOf(o) && !W(o, t) && nat(o).ide !== n.ide) r.push(o);
      if (k === 'sabotage' && W(o, t)) r.push(o);
    }
  }
  else if (C.tgt === 'foe') { for (const o of enemiesOf(t)) if (A(o) && !facOf(o) && !isHuman(o)) r.push(o); }
  return r;
}
function canPlay(t, k) {
  const n = nat(t), C = CARDS[k];
  if (!n.hand.includes(k)) return 'Not in hand';
  if (n.pol < C.cost) return `Needs ${C.cost} politics`;
  if (C.tgt !== 'none' && !cardTargets(t, k).length) return 'No valid target';
  if (n.playedThis) return 'One card per month';
  return '';
}
function playCard(t, k, target) {
  const n = nat(t), C = CARDS[k];
  if (canPlay(t, k)) return false;
  if (C.tgt !== 'none' && !cardTargets(t, k).includes(target)) return false;
  n.pol -= C.cost; n.hand.splice(n.hand.indexOf(k), 1); n.played++; n.playedThis = 1;
  if (n.played >= 15) award(t, 'cards');
  const cap = homeProv(t);
  switch (k) {
    case 'blitz': n.fx.blitz = Math.max(n.fx.blitz || 0, 1); break;
    case 'surprise': n.nextAtk = 1.4; break;
    case 'scorched': n.fx.scorched = 1; break;
    case 'codebreak': n.intel = Math.max(n.intel, 6); n.fx.codebreak = 1; break;
    case 'partisans': { const p = G.prov[target]; p.res = Math.min(100, p.res + 50); if (unitsAt(p) <= 2) partisanStrike(target, 4); break; }
    case 'falseflag': declareWar(t, target, { half:true }); break;
    case 'convoy': n.pp += 60; n.oil += 15; n.steel += 10; break;
    case 'airraid': { const p = G.prov[target]; if (p.fac > 0) p.fac--; takeLosses(p.u, 1); clampReady(p); p.dig = 0; p.smoke = 2; break; }
    case 'propag': n.pol += 35; n.stab = Math.min(100, n.stab + 5); break;
    case 'fortress': G.prov[target].fort = Math.min(3, G.prov[target].fort + 2); break;
    case 'fifth': n.fx.fifth = target; break;
    case 'rally': n.stab = Math.min(100, n.stab + 12); for (const p of G.prov) if (p.o === t && unitsAt(p)) p.dig = Math.min(4, p.dig + 1); break;
    case 'mobilize': n.mp += 40; if (cap >= 0) G.prov[cap].u.inf += 4; break;
    case 'weather': n.fx.weather = 1; break;
    case 'wolfpack': n.fx.wolfpack = 1; break;
    case 'coup': { const fk = facOf(t); if (fk && (nat(target).ide === n.ide || G.tension > 30)) joinFaction(target, fk); else setIde(target, n.ide); news(`COUP IN ${natName(target).toUpperCase()}`); break; }
    case 'sabotage': { const o = nat(target); o.pp = Math.max(0, o.pp - 60); o.oil = Math.max(0, o.oil - 10); notify(target, '✂', 'Sabotage!', `${n.adj} agents wrecked our depots: −60 production, −10 oil.`, 'war'); break; }
    case 'breakthru': n.rs.forEach(r => r.left = Math.max(0.01, r.left - 2)); break;
    case 'human': { const f = owned(t).filter(i => PROV[i].adj.some(j => W(t, G.prov[j].o))); const at = f.length ? f.sort((a, b) => threatAt(t, b) - threatAt(t, a))[0] : cap; if (at >= 0) G.prov[at].u.inf += 8; break; }
    case 'maginot': n.fx.maginot = 1; break;
    case 'march': n.fx.march = 1; break;
    case 'peace': makePeace(t, target, 'white'); break;
  }
  if (isHuman(t) || n.major && rnd() < 0.3) log(`${n.name} plays <b>${C.n}</b>${target != null && C.tgt !== 'none' ? ' on ' + (typeof target === 'number' ? PROV[target].name : natName(target)) : ''}.`);
  Hooks.emit('card', { t, k, target });
  return true;
}
function threatAt(t, i) { return sum(PROV[i].adj.filter(j => W(t, G.prov[j].o)), j => unitsAt(G.prov[j])) - unitsAt(G.prov[i]); }

/* ================= ESPIONAGE ================= */
const SPY_OPS = {
  reveal:  {n:'Map their army',      p:0.8,  tgt:'nation', d:'See all of a nation\'s divisions for 6 months.'},
  sabotage:{n:'Sabotage a factory',  p:0.55, tgt:'prov',   d:'Destroy one factory in a foreign province.'},
  steal:   {n:'Steal technology',    p:0.4,  tgt:'nation', d:'Copy a technology they have and you lack.'},
  incite:  {n:'Incite resistance',   p:0.6,  tgt:'occ',    d:'Raise resistance by 40 in an enemy-occupied province.'},
  coup:    {n:'Stage a coup',        p:0.25, tgt:'minor',  d:'A neutral minor adopts your ideology.'},
  counter: {n:'Counter-intelligence',p:1,    tgt:'none',   d:'Enemy spy operations against you fail twice as often for 6 months.'},
};
const SPY_COST = 10;
const freeSpies = t => nat(t).spies - nat(t).spyBusy;
function spyTargets(t, op) {
  const S = SPY_OPS[op], r = [];
  if (S.tgt === 'nation') { for (const o in G.nat) if (A(o) && o !== t && !friendly(o, t) && !NATDEF[o].off && (op !== 'steal' || Object.keys(nat(o).tech).some(k => !nat(t).tech[k] && G.y >= TECH[k].y))) r.push(o); }
  else if (S.tgt === 'minor') { for (const o in G.nat) if (A(o) && !nat(o).major && !facOf(o) && nat(o).ide !== nat(t).ide && !NATDEF[o].off) r.push(o); }
  else if (S.tgt === 'prov') { for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.fac > 0 && !friendly(p.o, t) && A(p.o)) r.push(i); } }
  else if (S.tgt === 'occ') { for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core !== p.o && W(t, p.o)) r.push(i); } }
  return r;
}
function canSpy(t, op) { const n = nat(t); if (freeSpies(t) <= 0) return 'No free agents this month'; if (n.pol < SPY_COST) return `Needs ${SPY_COST} politics`; if (SPY_OPS[op].tgt !== 'none' && !spyTargets(t, op).length) return 'No targets'; return ''; }
function spyOp(t, op, target) {
  if (canSpy(t, op)) return null;
  const n = nat(t), S = SPY_OPS[op];
  if (S.tgt !== 'none' && !spyTargets(t, op).includes(target)) return null;
  n.pol -= SPY_COST; n.spyBusy++;
  const victim = typeof target === 'number' ? G.prov[target].o : target;
  const pOk = S.p * (victim && A(victim) && nat(victim).counter > 0 ? 0.5 : 1);
  const ok = rnd() < pOk;
  let msg = '';
  if (ok) {
    n.spyOk = (n.spyOk || 0) + 1; if (n.spyOk >= 5) award(t, 'spy');
    switch (op) {
      case 'reveal': (n.reveal || (n.reveal = {}))[target] = 6; msg = `${natName(target)}'s army is mapped for six months.`; break;
      case 'sabotage': G.prov[target].fac = Math.max(0, G.prov[target].fac - 1); G.prov[target].smoke = 1; msg = `A factory in ${PROV[target].name} burns.`; break;
      case 'steal': { const opts = Object.keys(nat(target).tech).filter(k => !n.tech[k] && G.y >= TECH[k].y); const k = pickR(opts); grantTech(t, k); msg = `Blueprints for ${TECH[k].n} reach our labs.`; break; }
      case 'incite': G.prov[target].res = Math.min(100, G.prov[target].res + 40); msg = `${PROV[target].name} seethes with resistance.`; break;
      case 'coup': setIde(target, n.ide); msg = `${natName(target)} now has a ${IDEO[n.ide].toLowerCase()} government.`; news(`COUP IN ${natName(target).toUpperCase()}`); break;
      case 'counter': n.counter = 6; msg = 'Our counter-intelligence is on alert for six months.'; break;
    }
  } else {
    const caught = rnd() < 0.35;
    if (caught) { n.spies = Math.max(0, n.spies - 1); tension(1); if (victim && A(victim)) notify(victim, '⌖', 'Spy caught', `A ${n.adj} agent was arrested.`, ''); }
    msg = caught ? 'The operation failed and our agent was caught.' : 'The operation failed; our agent got away.';
  }
  return { ok, msg };
}
function canHireSpy(t) { const n = nat(t); if (n.spies >= 6) return 'Network is at full strength'; if (n.pol < 20) return 'Needs 20 politics'; return ''; }
function hireSpy(t) { if (canHireSpy(t)) return false; nat(t).pol -= 20; nat(t).spies++; return true; }

/* ================= HOME FRONT ================= */
function tickHomeFront(t) {
  const n = nat(t); if (!n.alive) return;
  const atWar = enemiesOf(t).length > 0;
  const army = Math.max(10, landN(divisions(t)));
  const lm = n.lm || 0; n.lm = 0;
  if (atWar) n.ww = clamp((n.ww || 0) + (0.5 + 28 * lm / army) * (n.done.includes('pol_unity') ? 0.5 : 1), 0, 60);
  else n.ww = Math.max(0, (n.ww || 0) - 3);
  const base = (NATDEF[t].stab || 55) + (n.stabB || 0);
  const target = clamp(base - n.ww * 0.7, 5, 100);
  n.stab = clamp(n.stab + clamp(target - n.stab, -2.5, 2.5), 0, 100);
  if (n.stab < 15 && atWar && rnd() < 0.25) {
    n.pp = Math.round(n.pp * 0.9);
    const cores = owned(t).filter(i => G.prov[i].core === t); const p = cores.length ? G.prov[pickR(cores)] : null;
    if (p) p.res = Math.max(p.res, 30);
    notify(t, '!', 'Unrest at home', 'Strikes and riots: production falls by 10%. Win a victory or make peace.', 'war');
  }
}
function tickResistance() {
  for (let i = 0; i < NP; i++) {
    const p = G.prov[i]; if (p.core === p.o || !NATDEF[p.core] || NATDEF[p.core].off) { p.res = Math.max(0, p.res - 5); continue; }
    const garrison = p.u.inf + p.u.mtn + p.u.par * 0.5;
    let g = 1.5 + (A(p.core) && W(p.core, p.o) ? 2.5 : 0) + (!A(p.core) ? 1 : 0) + (G.y >= 1942 ? 1 : 0) - garrison * 3 + (A(p.o) && nat(p.o).stab < 30 ? 1.5 : 0);
    if (A(p.o) && friendly(p.o, p.core)) g = -10;
    p.res = clamp(p.res + g, 0, 100);
    if (p.res >= 85 && rnd() < 0.2) partisanStrike(i, 1 + p.res / 30);
  }
}

/* ================= SECRET AGENDAS ================= */
function assignAgendas(t) {
  const n = nat(t), pool = [];
  const startY = G.y, endY = G.gm === 'blitz' ? 1942 : 1945;
  const near = new Set(); for (const i of owned(t)) { const h = hops(i); for (let j = 0; j < NP; j++) if (h[j] <= 3 && G.prov[j].o !== t && PROV[j].vp >= 3) near.add(j); }
  const cand = shuffleR([...near]).slice(0, 3);
  for (const j of cand) pool.push({ k:'hold', pid:j, y:Math.min(endY, startY + (n.major ? 3 : 4)), pts:3 });
  pool.push({ k:'keepcap', pid:n.capital, pts:2 });
  pool.push({ k:'kills', need:n.major ? 60 : 20, pts:2 });
  pool.push({ k:'share', need:n.major ? 25 : 6, pts:3 });
  const D = DECISIONS.find(D => D.who && D.who.includes(t)); if (D) pool.push({ k:'destiny', dec:D.k, pts:4 });
  if (n.major && navyOf(t).cap) pool.push({ k:'navy', need:3, pts:2 });
  pool.push({ k:'oil', need:3, pts:2 });
  if (!n.major) pool.push({ k:'peace', y:Math.min(endY, 1944), pts:2 });
  const picks = []; const used = new Set();
  for (const a of shuffleR(pool)) { if (used.has(a.k)) continue; used.add(a.k); picks.push(a); if (picks.length >= 2) break; }
  n.agendas = picks.map(a => ({ ...a, st:'open' }));
}
function agendaText(a) {
  switch (a.k) {
    case 'hold': return `Hold ${PROV[a.pid].name} in January ${a.y}`;
    case 'keepcap': return `Never lose ${PROV[a.pid] ? PROV[a.pid].name : 'your capital'}`;
    case 'kills': return `Destroy ${a.need} enemy divisions`;
    case 'share': return `Hold ${a.need}% of Europe when the war ends`;
    case 'destiny': return `Enact "${DECISIONS.find(D => D.k === a.dec).n}"`;
    case 'navy': return `Win ${a.need} naval battles`;
    case 'oil': return `Control ${a.need} oil provinces when the war ends`;
    case 'peace': return `Be at peace in January ${a.y}`;
  }
  return '?';
}
function agendaProgress(t, a) {
  const n = nat(t);
  switch (a.k) {
    case 'kills': return `${n.st.kills}/${a.need}`;
    case 'share': return `${Math.round(vpOf(t) / totalVP() * 100)}%`;
    case 'navy': return `${n.st.nav}/${a.need}`;
    case 'oil': return `${owned(t).filter(i => PROV[i].oil).length}/${a.need}`;
  }
  return '';
}
function tickAgendas(t, final) {
  const n = nat(t); if (!n.agendas) return;
  for (const a of n.agendas) {
    if (a.st !== 'open') continue;
    const was = a.st;
    switch (a.k) {
      case 'hold': if (G.y >= a.y && G.m === 0) a.st = G.prov[a.pid].o === t ? 'done' : 'failed'; break;
      case 'keepcap': if (a.pid >= 0 && G.prov[a.pid].o !== t) a.st = 'failed'; else if (final) a.st = 'done'; break;
      case 'kills': if (n.st.kills >= a.need) a.st = 'done'; break;
      case 'share': if (final) a.st = vpOf(t) / totalVP() * 100 >= a.need ? 'done' : 'failed'; break;
      case 'destiny': if (n.dec.includes(a.dec)) a.st = 'done'; break;
      case 'navy': if (n.st.nav >= a.need) a.st = 'done'; break;
      case 'oil': if (final) a.st = owned(t).filter(i => PROV[i].oil).length >= a.need ? 'done' : 'failed'; break;
      case 'peace': if (G.y >= a.y && G.m === 0) a.st = enemiesOf(t).length ? 'failed' : 'done'; break;
    }
    if (a.st !== was) notify(t, a.st === 'done' ? '✓' : '✕', `Secret agenda ${a.st === 'done' ? 'complete' : 'failed'}`, agendaText(a), a.st === 'done' ? 'medal' : 'war');
  }
}
function scoreOf(t) {
  const n = nat(t);
  const ag = sum((n.agendas || []).filter(a => a.st === 'done'), a => a.pts);
  return Math.round(vpOf(t) / totalVP() * 100) * (A(t) ? 1 : 0) + ag * 10 + medalsOf(t).length * 2 + Math.round(n.st.kills / 10);
}

/* ================= DESTINY ================= */
function decisionState(t, D) {
  if (D.who && !D.who.includes(t)) return null;
  const n = nat(t); if (n.dec.includes(D.k)) return { done:true };
  if (D.need === '60%') { const s = vpOf(t) / totalVP(); return { pct:s, ok:s >= 0.6 }; }
  const have = D.need.map(nm => O(nm) === t);
  return { have, ok:have.every(Boolean) };
}
function enactDecision(t, k) {
  const D = DECISIONS.find(x => x.k === k); if (!D) return false;
  const n = nat(t), st = decisionState(t, D);
  if (!st || !st.ok || st.done || n.pol < 50) return false;
  n.pol -= 50; n.dec.push(D.k); n.bonus *= 1.15; n.pp += 100; n.stab = Math.min(100, n.stab + 15);
  if (D.name) { n.name = D.name; n.color = D.color; n.adj = D.name.split(' ').pop() === 'Empire' ? D.name.replace(' Empire', '') : n.adj; }
  award(t, 'empire');
  news(`${D.name ? D.name.toUpperCase() + ' PROCLAIMED' : 'A NEW MASTER OF EUROPE'}`);
  sendNews('*', { title:D.n, head:D.name ? `The ${D.name} Is Proclaimed` : 'Masters of Europe', dek:D.d, text:'Crowds fill the squares as heralds read the proclamation. Old maps are burned; cartographers work through the night. Its armies fight with new fire: +15% combat strength, +100 production, +15 stability.', plate:t });
  Hooks.emit('dirty', { owners:true });
  return true;
}
