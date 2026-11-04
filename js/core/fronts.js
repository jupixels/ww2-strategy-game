'use strict';
/* ================= FRONTS AND ARMY ORDERS =================
   A front is a stretch of your own (or allied-garrisoned) land facing an enemy: n.fronts = [{id, name, z, o, gid, pull}].
   z is the front's zone (province ids; it grows as the front advances), o its order — 'hold', 'advance' or
   'encircle' — gid the general in command, pull whether it draws reserves from the interior.
   At the end of the month, every division in the zone that is still ready carries out the order, using the
   same movement and attack code the AI uses. Armies you moved or attacked with yourself are left alone. */
const FRONT_MAX = 8;
const FRONT_ORDERS = {
  hold:    { n:'Hold',     d:'Dig in and shift troops to wherever the enemy masses. Attacks only at overwhelming odds.' },
  advance: { n:'Advance',  d:'Attack every enemy province the front can take at good odds, and follow up.' },
  encircle:{ n:'Encircle', d:'Armor-led thrusts at the flanks of enemy salients, to cut off and destroy whole armies.' },
};
const FRONT_NAMES = ['Army Group North','Army Group Centre','Army Group South','Western Front','Eastern Front','Southern Front','Northern Front','Coastal Army','Mountain Front','Desert Army','Reserve Front','Steppe Front'];
const frontsOf = t => (nat(t) && nat(t).fronts) || [];
const frontById = (t, id) => frontsOf(t).find(f => f.id === id) || null;
const frontAt = (t, pid) => frontsOf(t).find(f => f.z.includes(pid)) || null;
// provinces that can belong to a front: your own, or an ally's where your expeditionary force stands
const frontable = (t, i) => G.prov[i].o === t || !!(G.prov[i].g && G.prov[i].g[t]);
const touchesEnemy = (t, i) => PROV[i].adj.some(j => W(t, G.prov[j].o));
function frontLine(t, f) { return f.z.filter(i => frontable(t, i) && touchesEnemy(t, i)); }
function frontStats(t, f) {
  const line = frontLine(t, f); let div = 0, ready = 0, foe = 0; const seen = new Set();
  for (const i of f.z) { const S = stackOf(i, t); if (S) { div += landN(S.u); ready += readyAt(S); } }
  for (const i of line) for (const j of PROV[i].adj) if (W(t, G.prov[j].o) && !seen.has(j)) { seen.add(j); foe += forcesAt(G.prov[j]); }
  return { line:line.length, div, ready, foe, provs:f.z.filter(i => frontable(t, i)).length };
}
function canCreateFront(t, pids) {
  if (frontsOf(t).length >= FRONT_MAX) return `At most ${FRONT_MAX} fronts`;
  const ok = [...new Set(pids)].filter(i => G.prov[i] && frontable(t, i));
  if (!ok.length) return 'Pick provinces you hold';
  return '';
}
function createFront(t, pids, name, order) {
  if (canCreateFront(t, pids)) return null;
  const n = nat(t); n.fronts = n.fronts || [];
  const z = [...new Set(pids)].filter(i => frontable(t, i));
  for (const f of n.fronts) f.z = f.z.filter(i => !z.includes(i));   // a province belongs to one front
  n.fronts = n.fronts.filter(f => f.z.length);
  const used = new Set(n.fronts.map(f => f.name));
  const f = { id:(n.fid = (n.fid || 0) + 1), name:(name || FRONT_NAMES.find(x => !used.has(x)) || `Front ${n.fid}`).slice(0, 28), z, o:FRONT_ORDERS[order] ? order : 'hold', gid:null, pull:true, last:null };
  n.fronts.push(f);
  return f;
}
// one front per enemy you border: the quick way to get started
function autoFronts(t) {
  const n = nat(t), made = [];
  const groups = {};
  for (const i of armiesOf(t).concat(owned(t))) {
    if (!frontable(t, i) || frontAt(t, i)) continue;
    const foes = PROV[i].adj.map(j => G.prov[j].o).filter(o => W(t, o));
    if (!foes.length) continue;
    const k = foes.sort()[0]; (groups[k] || (groups[k] = new Set())).add(i);
  }
  for (const e of Object.keys(groups).sort((a, b) => groups[b].size - groups[a].size)) {
    if (frontsOf(t).length >= FRONT_MAX) break;
    const used = new Set(frontsOf(t).map(x => x.name)); let nm = `${nat(e).adj} Front`; for (let k = 2; used.has(nm); k++) nm = `${nat(e).adj} Front ${k}`;
    const f = createFront(t, [...groups[e]], nm, 'hold'); if (f) made.push(f);
  }
  return made;
}
function frontCommand(t, c) {
  if (c.op === 'create') { const f = createFront(t, Array.isArray(c.pids) ? c.pids.filter(Number.isInteger) : [], typeof c.name === 'string' ? c.name : null, c.order); return f ? { ok:true, front:f } : { ok:false, why:canCreateFront(t, c.pids || []) }; }
  if (c.op === 'auto') { const m = autoFronts(t); return m.length ? { ok:true, made:m.length } : { ok:false, why:'No unassigned provinces face an enemy' }; }
  const f = frontById(t, c.id); if (!f) return { ok:false, why:'No such front' };
  switch (c.op) {
    case 'order': if (!FRONT_ORDERS[c.order]) return { ok:false }; f.o = c.order; return { ok:true };
    case 'general': {
      if (c.gid == null) { f.gid = null; return { ok:true }; }
      const g = G.gens.find(x => x.id === c.gid && x.tag === t); if (!g) return { ok:false };
      for (const o of frontsOf(t)) if (o.gid === g.id) o.gid = null;
      f.gid = g.id; postFrontGeneral(t, f); return { ok:true };
    }
    case 'pull': f.pull = !f.pull; return { ok:true };
    case 'rename': f.name = String(c.name || f.name).slice(0, 28); return { ok:true };
    case 'edit': {
      const add = (Array.isArray(c.add) ? c.add : []).filter(i => Number.isInteger(i) && G.prov[i] && frontable(t, i)), rem = new Set(Array.isArray(c.rem) ? c.rem : []);
      for (const o of frontsOf(t)) if (o !== f) o.z = o.z.filter(i => !add.includes(i));
      f.z = [...new Set(f.z.filter(i => !rem.has(i)).concat(add))];
      nat(t).fronts = frontsOf(t).filter(o => o.z.length);
      return { ok:true };
    }
    case 'disband': nat(t).fronts = frontsOf(t).filter(o => o !== f); return { ok:true };
  }
  return { ok:false };
}
// the commanding general goes to the strongest stack on the front line
function postFrontGeneral(t, f) {
  const g = f.gid != null ? G.gens.find(x => x.id === f.gid && x.tag === t) : null;
  if (!g) { f.gid = null; return; }
  const line = frontLine(t, f).filter(i => stackOf(i, t));
  if (!line.length) return;
  const best = line.sort((a, b) => landN(stackOf(b, t).u) - landN(stackOf(a, t).u))[0];
  if (g.pid !== best && !genAt(best, t)) g.pid = best;
}
// distance through land t may stand on, from a set of start provinces
function bfsFrom(t, starts, okFn) {
  const d = new Int16Array(NP).fill(99), q = [];
  for (const i of starts) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of PROV[i].adj) if (d[j] > d[i] + 1 && okFn(j)) { d[j] = d[i] + 1; q.push(j); } }
  return d;
}
const standable = t => j => G.prov[j].o === t || friendly(G.prov[j].o, t) && A(G.prov[j].o);
function moveUnits(t, from, to, part) {
  if (!landN(part)) return false;
  const S = stackOf(from, t), T = G.prov[to].o === t ? G.prov[to] : guestOf(to, t, true);
  if (!S || !T) return false;
  moveLand(S, T, part); if (!landN(S.u)) moveGeneral(from, to, t);
  cleanGuests(G.prov[from]);
  return true;
}
// what a stack can spare: keep two divisions in the capital
function spare(t, i, S, amt) { const part = portion(S, amt || 'all'); if (i === nat(t).capital) part.inf = Math.max(0, part.inf - 2); return part; }
function pocketScore(t, j) {
  // how surrounded an enemy province is: share of its neighbours that are ours or our allies'
  const adj = PROV[j].adj; if (!adj.length) return 0;
  return adj.filter(k => friendly(G.prov[k].o, t)).length / adj.length;
}
function frontAttacks(t, f, out, rep) {
  const enc = f.o === 'encircle', hold = f.o === 'hold';
  const need = hold ? 3 : enc ? 1.2 : 1.3;
  const n = nat(t), tried = new Set();
  let guard = 0;
  while (guard++ < 24) {
    const line = frontLine(t, f).filter(i => { const S = stackOf(i, t); return S && readyAt(S) > 0; });
    let best = null;
    for (const i of line) for (const j of PROV[i].adj) {
      if (!W(t, G.prov[j].o) || tried.has(j)) continue;
      const srcs = PROV[j].adj.filter(k => f.z.includes(k) && stackOf(k, t) && readyAt(stackOf(k, t)) > 0);
      const sum0 = emptyLand();
      for (const k of srcs) { const part = spare(t, k, stackOf(k, t)); const other = PROV[k].adj.some(x => x !== j && W(t, G.prov[x].o)); if (other && part.inf > 0) part.inf--; for (const kk of LAND) sum0[kk] += part[kk]; }
      if (!landN(sum0)) continue;
      const T = G.prov[j];
      const odds = forcesAt(T) ? attackValue(t, sum0, j, { from:srcs[0] }) / Math.max(0.3, defenseValue(j, sum0, t)) : 9;
      let sc = odds * (1 + PROV[j].vp * 0.08 + (A(T.o) && nat(T.o).capital === j ? 0.4 : 0));
      if (enc) sc *= 1 + 2 * pocketScore(t, j) + (sum0.arm > 0 ? 0.3 : 0);
      if (n.ops && n.ops.tg.includes(j)) sc *= 1.3;
      if (odds >= need && (!best || sc > best.sc)) best = { j, srcs, sc, odds };
    }
    if (!best) break;
    tried.add(best.j);
    const srcs = [];
    for (const k of best.srcs) { const part = spare(t, k, stackOf(k, t)); const other = PROV[k].adj.some(x => x !== best.j && W(t, G.prov[x].o)); if (other && part.inf > 0) part.inf--; if (landN(part)) srcs.push({ id:k, u:part, o:t }); }
    if (!srcs.length) continue;
    const r = battle(srcs, best.j, { front:true });
    out.push(r); rep.attacks++;
    if (r.win) { rep.won++; rep.taken.push(best.j); if (!f.z.includes(best.j)) f.z.push(best.j); }
    // encirclement: armor that won big strikes again
    if (r.win && r.blitz && enc) {
      const B = G.prov[best.j]; const nxt = PROV[best.j].adj.filter(j => W(t, G.prov[j].o)).sort((a, b) => pocketScore(t, b) - pocketScore(t, a))[0];
      if (nxt != null && B.r.arm > 0 && attackValue(t, { ...emptyLand(), arm:B.r.arm }, nxt, { from:best.j }) > defenseValue(nxt, null, t) * 1.2) {
        const r2 = battle([{ id:best.j, u:{ ...emptyLand(), arm:B.r.arm }, o:t }], nxt, { front:true }); out.push(r2); rep.attacks++;
        if (r2.win) { rep.won++; rep.taken.push(nxt); if (!f.z.includes(nxt)) f.z.push(nxt); }
      }
    }
  }
}
function runFront(t, f, out) {
  const rep = { attacks:0, won:0, taken:[], moved:0 };
  // provinces lost to the enemy leave the front; the land behind them joins it, so the front falls back
  const lost = f.z.filter(i => !frontable(t, i));
  f.z = f.z.filter(i => frontable(t, i));
  for (const i of lost) for (const j of PROV[i].adj) if (frontable(t, j) && !f.z.includes(j) && !frontAt(t, j)) f.z.push(j);
  if (!f.z.length) { f.last = rep; return rep; }
  postFrontGeneral(t, f);
  const line = frontLine(t, f);
  if (!line.length) { f.last = { ...rep, quiet:true }; return f.last; }
  const toLine = bfsFrom(t, line, j => f.z.includes(j));
  // interior troops of the zone move up to the line
  for (const i of f.z) {
    if (toLine[i] === 0 || toLine[i] >= 99) continue;
    const S = stackOf(i, t); if (!S || !readyAt(S)) continue;
    const nb = PROV[i].adj.filter(j => f.z.includes(j) && toLine[j] < toLine[i] && frontable(t, j));
    if (nb.length) { const part = spare(t, i, S); if (moveUnits(t, i, nb[0], part)) rep.moved += landN(part); }
  }
  // reserves: idle stacks in the interior that belong to no front march toward this one
  if (f.pull) {
    const all = frontsOf(t), inFront = i => all.some(o => o.z.includes(i));
    const d = bfsFrom(t, line, standable(t));
    for (const i of armiesOf(t)) {
      if (inFront(i) || touchesEnemy(t, i) || d[i] >= 99 || d[i] === 0) continue;
      const S = stackOf(i, t); if (!S || readyAt(S) < 1) continue;
      // the nearest front takes them
      if (all.some(o => o !== f && o.pull && frontLine(t, o).length && bfsDist(t, o, i) < d[i])) continue;
      const nb = PROV[i].adj.filter(j => d[j] < d[i] && standable(t)(j));
      if (!nb.length) continue;
      const part = spare(t, i, S, 'all'); if (PROV[i].vp >= 6 && part.inf > 0) part.inf--;
      const to = nb.find(j => f.z.includes(j)) ?? nb[0];
      if (moveUnits(t, i, to, part)) { rep.moved += landN(part); if (frontable(t, to) && d[to] <= 1 && !f.z.includes(to) && !inFront(to)) f.z.push(to); }
    }
  }
  frontAttacks(t, f, out, rep);
  // balance the line: spare troops shift toward the most threatened sectors
  for (const i of frontLine(t, f)) {
    const S = stackOf(i, t); if (!S || readyAt(S) < 3) continue;
    const nb = PROV[i].adj.filter(j => f.z.includes(j) && frontable(t, j) && touchesEnemy(t, j) && threatAt(t, j) > threatAt(t, i) + 3);
    if (nb.length) { const j = nb.sort((a, b) => threatAt(t, b) - threatAt(t, a))[0]; const part = spare(t, i, S, 'half'); if (moveUnits(t, i, j, part)) rep.moved += landN(part); }
  }
  f.last = rep;
  return rep;
}
const _bfsCache = {};
function bfsDist(t, f, i) { const k = G.seed + ':' + G.turn + t + f.id + ':' + G.prov.reduce((s, p, i) => p.o === t ? s + i : s, 0); if (!_bfsCache[k]) { for (const x in _bfsCache) delete _bfsCache[x]; _bfsCache[k] = bfsFrom(t, frontLine(t, f), standable(t)); } return _bfsCache[k][i]; }
// month end, for every human nation that is at the table
function runFronts(out) {
  for (const t of humanTags()) {
    if (!liveHuman(t) || !A(t)) continue;
    const fs = frontsOf(t); if (!fs.length) continue;
    const tot = { attacks:0, won:0, taken:0 };
    for (const f of fs.slice()) { const r = runFront(t, f, out); tot.attacks += r.attacks; tot.won += r.won; tot.taken += r.taken.length; }
    nat(t).fronts = fs.filter(f => f.z.some(i => frontable(t, i)));
    if (tot.attacks) notify(t, '⚑', 'The fronts report', `${tot.attacks} attack${tot.attacks > 1 ? 's' : ''}, ${tot.won} won, ${tot.taken} province${tot.taken === 1 ? '' : 's'} taken.`, tot.won ? 'medal' : '');
  }
}
