'use strict';
/* ================= HUD ================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const fmt = v => { v = Math.floor(v); return Math.abs(v) >= 10000 ? Math.round(v / 1000) + 'k' : String(v); };
function toast(ic, title, body, kind, onclick) {
  const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
  el.innerHTML = `<div class="ic">${esc(ic)}</div><div><b>${esc(title)}</b><span>${esc(body)}</span></div>`;
  if (onclick) { el.style.cursor = 'pointer'; el.onclick = onclick; }
  $('#toasts').prepend(el);
  while ($('#toasts').children.length > 4) $('#toasts').lastChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, kind === 'medal' ? 5200 : 4200);
}
Hooks.on('toast', d => { if (d.to === '*' || d.to === ME) toast(d.ic, d.title, d.body, d.kind); });
Hooks.on('sfx', d => { if (d.to === '*' || d.to === ME) SFX.play(d.name === 'boom' ? 'boom' : d.name, d.arg); });
Hooks.on('dirty', d => markDirty(d.owners));
let tab = null;
function renderAll() { if (!G) return; renderTop(); renderCard(); renderDrawer(); renderTicker(); renderDots(); renderActions(); renderHand(); renderMP(); document.body.classList.toggle('sheet', !$('#card').hidden || !$('#drawer').hidden); }
const statHTML = (ic, v, inc, cls = '') => `${iconSvg(ic, 'si ' + cls)}<span>${v}</span>${inc != null ? `<small class="${inc < 0 ? 'neg' : ''}">${inc >= 0 ? '+' : ''}${inc}</small>` : ''}`;
function renderTop() {
  const t = ME;
  if (!t || !A(t)) { $('#natName').textContent = t ? natName(t) + ' (fallen)' : 'Observer'; $('#natSub').textContent = dateStr(); return; }
  const n = nat(t), d = divisions(t);
  $('#emb').innerHTML = flagImg(t, 'embflag');
  $('#natName').textContent = n.name;
  const fk = facOf(t);
  $('#natSub').textContent = `${IDEO[n.ide]} · ${fk ? G.facs[fk].n : 'Unaligned'}${enemiesOf(t).length ? ' · At war' : ''}`;
  const oilNet = Math.round(oilIncome(t) - oilUpkeep(t));
  $('#sPP').innerHTML = statHTML('pp', fmt(n.pp), income(t));
  $('#sMP').innerHTML = statHTML('mp', fmt(n.mp) + 'k', mpIncome(t));
  $('#sPol').innerHTML = statHTML('pol', fmt(n.pol), 2 + (n.stab > 70 ? 1 : 0));
  $('#sOil').innerHTML = statHTML('oil', fmt(n.oil), oilNet, n.oil <= 0 ? 'bad' : '');
  $('#sSteel').innerHTML = statHTML('steel', fmt(n.steel), steelIncome(t));
  $('#sStab').innerHTML = statHTML('stab', Math.round(n.stab) + '%', null, n.stab < 30 ? 'bad' : '');
  $('#sDiv').innerHTML = `${iconSvg('inf', 'si')}<span>${landN(d)}</span>${d.arm ? `<small style="color:var(--brass-hi)">${d.arm} armor</small>` : ''}`;
  $('#sDom').textContent = Math.round(vpOf(t) / totalVP() * 100) + '%';
  $('#sTen').style.width = G.tension + '%'; $('#sTenN').textContent = Math.round(G.tension) + '%';
  $('#sStab').title = `Stability ${Math.round(n.stab)}%. War weariness ${Math.round(n.ww || 0)}. Production ×${stabMul(n).toFixed(2)}.`;
  $('#sOil').title = `Oil: +${oilIncome(t)} income, −${oilUpkeep(t)} upkeep (tanks, aircraft, ships).${n.oil <= 0 ? ' FUEL SHORTAGE: mechanised forces at 60%.' : ''}`;
  $('#sDate').textContent = MONTHS[G.m] + ' ' + G.y;
  $('#sSeason').textContent = (isWinter() ? 'Winter · ' : isMud() ? 'Mud season · ' : '') + 'Turn ' + (G.turn + 1);
}
function renderDots() {
  if (!ME || !A(ME)) return;
  const n = nat(ME);
  $('#dotFocus').hidden = !!n.focus || !focusFor(ME, n.major).some(f => !focusState(ME, f.k));
  $('#dotTech').hidden = !(n.rs.length < n.slots && TECHS.some(T => !techState(ME, T.k)));
  $('#dotDec').hidden = !DECISIONS.some(D => { const s = decisionState(ME, D); return s && s.ok && !s.done && n.pol >= 50; });
  $('#dotIntel').hidden = !(freeSpies(ME) > 0 && enemiesOf(ME).length && n.pol >= SPY_COST);
}
function renderTicker() {
  const items = G.news.length ? G.news : ['EUROPE HOLDS ITS BREATH', 'LEAGUE OF NATIONS MEETS IN GENEVA'];
  const s = items.map(x => '◆ ' + x).join('      ');
  const el = $('#tickText'); if (el.textContent !== s) { el.textContent = s; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
}

/* ---------- cards in hand ---------- */
function renderHand() {
  const el = $('#hand'); if (!ME || !A(ME) || !Ctl.canAct()) { el.hidden = true; return; }
  const n = nat(ME); el.hidden = !n.hand.length;
  el.innerHTML = n.hand.map((k, i) => { const C = CARDS[k], why = canPlay(ME, k); return `<button class="card ${why ? 'off' : ''} ${C.ide ? 'ide' : ''}" data-card="${i}" title="${esc(C.n + ': ' + C.d + (why ? ' — ' + why : ''))}"><span class="cic">${C.ic}</span><b>${esc(C.n)}</b><em>${C.cost ? C.cost + ' pol' : 'free'}</em></button>`; }).join('');
  el.querySelectorAll('[data-card]').forEach(b => b.onclick = () => openCard(n.hand[+b.dataset.card]));
}
function openCard(k) {
  const C = CARDS[k], why = canPlay(ME, k);
  SFX.card();
  const m = $('#modal'); m.hidden = false;
  m.innerHTML = `<div class="cardbig" role="dialog" aria-modal="true"><div class="cbic">${C.ic}</div><h3>${esc(C.n)}</h3><p>${esc(C.d)}</p>
    <div class="cbmeta">${C.cost ? `${C.cost} politics` : 'Free to play'} · one card per month${C.ide ? ` · ${IDEO[C.ide]} only` : ''}</div>
    <div class="acts" style="justify-content:center"><button class="btn" data-x>Keep it</button><button class="btn gold" data-play ${why ? 'disabled title="' + esc(why) + '"' : ''}>${C.tgt === 'none' ? 'Play' : 'Choose target'}</button></div>${why ? `<p class="hint" style="text-align:center">${esc(why)}</p>` : ''}</div>`;
  m.querySelector('[data-x]').onclick = closeModal;
  m.onclick = e => { if (e.target === m) closeModal(); };
  const pb = m.querySelector('[data-play]');
  if (pb) pb.onclick = () => {
    closeModal();
    if (C.tgt === 'none') { Ctl.act({ c:'card', k }); return; }
    const tg = cardTargets(ME, k);
    if (typeof tg[0] === 'number') startPick({ kind:'card', k, ids:tg, label:`${C.n}: pick a province` });
    else pickNation(tg, `${C.n}: choose a nation`, t => Ctl.act({ c:'card', k, target:t }));
  };
}
function pickNation(list, title, cb) {
  const m = $('#modal'); m.hidden = false;
  m.innerHTML = `<div class="helpcard" style="width:min(460px,100%)" role="dialog" aria-modal="true"><div class="hh"><h2 style="font-size:22px">${esc(title)}</h2><button class="ibtn" data-x aria-label="Close">✕</button></div>
    <div class="hb" style="grid-template-columns:1fr;gap:6px">${list.map(t => `<button class="row natpick" data-t="${t}"><div><h4>${flagImg(t)} ${esc(natName(t))}</h4><p>${IDEO[nat(t).ide]}${facOf(t) ? ' · ' + G.facs[facOf(t)].n : ''}</p></div></button>`).join('')}</div></div>`;
  m.querySelector('[data-x]').onclick = closeModal;
  m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { closeModal(); cb(b.dataset.t); });
}
/* ---------- picking a target on the map ---------- */
function startPick(p) {
  clearSelection(); pickMode = p; rebuildOverlay();
  $('#pickBar').hidden = false; $('#pickBar span').textContent = p.label;
  if (p.ids && p.ids.length) { const near = p.ids.slice().sort((a, b) => Math.hypot(PROV[a].x - cam.x, PROV[a].y - cam.y) - Math.hypot(PROV[b].x - cam.x, PROV[b].y - cam.y))[0]; const [sx, sy] = w2s(PROV[near].x, PROV[near].y); if (!onScreen(sx, sy, -80)) centerOn(near); }
}
function endPick() { pickMode = null; $('#pickBar').hidden = true; rebuildOverlay(); }
function pickClick(id) {
  const p = pickMode; if (!p) return false;
  if (id < 0 || !p.ids.includes(id)) { SFX.click(); return true; }
  if (p.kind === 'card') { endPick(); Ctl.act({ c:'card', k:p.k, target:id }); }
  else if (p.kind === 'raid') { endPick(); Ctl.act({ c:'raid', from:p.from, to:id }); }
  else if (p.kind === 'rocket') { endPick(); Ctl.act({ c:'rocket', to:id }); }
  else if (p.kind === 'bomb') { endPick(); Ctl.act({ c:'bomb', to:id }); }
  else if (p.kind === 'spy') { endPick(); Ctl.act({ c:'spy', op:p.op, target:id }); }
  else if (p.kind === 'ops') {
    const i = p.sel.indexOf(id); if (i >= 0) p.sel.splice(i, 1); else if (p.sel.length < 4) p.sel.push(id);
    $('#pickBar span').textContent = `Operation objectives: ${p.sel.map(j => PROV[j].name).join(', ') || 'none yet'} (up to 4)`;
    $('#pickGo').hidden = !p.sel.length; rebuildOverlay(); SFX.click();
    return true;
  }
  return true;
}
$('#pickCancel').onclick = () => { endPick(); SFX.click(); };
$('#pickGo').onclick = () => { const p = pickMode; if (p && p.kind === 'ops') { endPick(); Ctl.act({ c:'ops', targets:p.sel }); } };

/* ---------- selection & orders ---------- */
function computeTargets() {
  targets = new Map();
  if (!sel || !ME || !Ctl.canAct()) return;
  const srcs = [sel.id, ...(sel.multi || [])];
  for (const s of srcs) for (const [j, k] of targetsFor(ME, s)) { const cur = targets.get(j); if (!cur || (k === 'attack' && cur !== 'attack')) targets.set(j, k); }
}
function select(id, add) {
  if (id == null || id < 0) { clearSelection(); return; }
  selFleet = null; fleetTargetsSet = new Set();
  if (add && sel && G.prov[id].o === ME && sel.id !== id) { sel.multi = sel.multi || new Set(); if (sel.multi.has(id)) sel.multi.delete(id); else sel.multi.add(id); }
  else sel = { id, amt:sel && sel.amt || 'all' };
  computeTargets(); rebuildOverlay(); staticDirty = true; renderCard(); if (tab === 'army') renderDrawer();
  $('#legend').hidden = !targets.size; hoverId = -1;
}
function clearSelection() { sel = null; selFleet = null; fleetTargetsSet = new Set(); targets = new Map(); rebuildOverlay(); staticDirty = true; renderCard(); $('#legend').hidden = true; hoverId = -1; }
function selectFleet(z) {
  sel = null; targets = new Map();
  selFleet = { z, part:selFleet && selFleet.part || 'all' };
  const f = G.fleet[z][ME];
  fleetTargetsSet = new Set(f && !f.mv && Ctl.canAct() ? fleetTargets(z, ME) : []);
  rebuildOverlay(); staticDirty = true; renderCard();
}
function execOrder(to) {
  const kind = targets.get(to); if (!kind) return;
  const srcs = [sel.id, ...(sel.multi || [])].filter(s => targetsFor(ME, s).get(to));
  SFX.click();
  if (kind === 'move' || kind === 'naval') {
    for (const s of srcs) { const k = targetsFor(ME, s).get(to); if (k === 'move' || k === 'naval') Ctl.act({ c:'move', from:s, to, amt:sel.amt }); }
    if (G.tut) G.tut.moved = 1;
  } else {
    const atk = srcs.filter(s => { const k = targetsFor(ME, s).get(to); return k === 'attack' || k === 'land' || k === 'para'; });
    Ctl.act({ c:'attack', from:atk, to, amt:sel.amt });
    if (G.tut) G.tut.attacked = 1;
  }
  if (!sel) return;
  const p = G.prov[sel.id];
  if (!readyAt(p) && G.prov[to].o === ME && readyAt(G.prov[to]) > 0 && !sel.multi) select(to); else select(sel.id);
}
function oddsFor(srcs, to, kind) {
  const u = emptyLand(); for (const s of srcs) { const part = kind === 'para' ? { ...emptyLand(), par:G.prov[s].r.par } : portion(G.prov[s], sel ? sel.amt : 'all'); for (const k of LAND) u[k] += part[k]; }
  const T = G.prov[to]; if (!unitsAt(T)) return { odds:Infinity, af:[], df:[] };
  const af = [], df = [];
  const atk = attackValue(ME, u, to, { naval:kind === 'land', para:kind === 'para', from:srcs[0] }, af);
  const def = defenseValue(to, u, ME, df);
  return { odds:atk / def, af, df };
}
const battleOdds = (from, to, kind) => oddsFor(sel && (sel.multi || sel.id === from) ? [sel.id, ...(sel.multi || [])].filter(s => targetsFor(ME, s).get(to) === kind || (kind === 'attack' && targetsFor(ME, s).get(to) === 'attack')) : [from], to, kind);
function factorList(list) { return list.filter(([l, m]) => l !== 'Troops' && l !== 'Difficulty' && l !== 'National spirit').map(([l, m]) => `<span class="${m >= 1 ? 'up' : 'dn'}">${esc(l)} ${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%</span>`).join(''); }

/* ---------- the province dossier ---------- */
const unitRow = (u, vis) => LAND.filter(k => !vis || u[k]).map(k => `<span title="${UNIT[k].pl}">${iconSvg(k, k)}<b>${vis ? u[k] : '?'}</b></span>`).join('') || '<span class="hint">No troops</span>';
function renderCard() {
  const el = $('#card');
  if (!G || (!sel && !selFleet)) { el.hidden = true; return; }
  if (selFleet) return renderFleetCard(el);
  el.hidden = false;
  const i = sel.id, p = G.prov[i], P = PROV[i], pl = ME, n = pl && A(pl) ? nat(pl) : null, on = nat(p.o);
  const mine = p.o === pl, vis = !pl || visibleTo(pl, i), war = pl && W(pl, p.o);
  const canAct = Ctl.canAct() && !!n;
  const rel = mine ? '<span class="chip ally">Yours</span>' : war ? '<span class="chip war">At war</span>' : pl && friendly(pl, p.o) ? '<span class="chip ally">Ally</span>' : pl && pactWith(pl, p.o) ? '<span class="chip">Pact</span>' : '<span class="chip">Neutral</span>';
  const cap = on && on.capital === i;
  const g = vis ? genAt(i, p.o) : null;
  let h = `<div class="ch">${flagImg(p.o, 'chflag')}<div style="min-width:0"><h3>${esc(P.name)}${cap ? ' <span style="color:var(--brass-hi);font-size:20px">★</span>' : ''}</h3>
    <div class="o">${esc(on ? on.name : '—')}${p.core !== p.o && G.nat[p.core] ? ` · occupied ${esc(G.nat[p.core].adj)} land` : ''} &nbsp;${rel}</div></div>
    <button class="ibtn x" data-close aria-label="Close">✕</button></div><div class="cb">
    <div class="facts"><div><span>Terrain</span><b>${TER[P.ter].n}</b></div><div><span>Victory</span><b>${P.vp}</b></div><div><span>Industry</span><b>${p.fac}</b></div><div><span>Fort</span><b>${'▮'.repeat(p.fort) || '—'}</b></div></div>`;
  const extras = [];
  if (P.oil) extras.push(`${iconSvg('oil')} ${P.oil} oil`);
  if (P.steel) extras.push(`${iconSvg('steel')} ${P.steel} steel`);
  if (vis && (mine || (pl && friendly(pl, p.o)))) extras.push(`${iconSvg('sup')} ${p.sup >= 1 ? 'Full supply' : p.sup > 0 ? `Supply ${Math.round(p.sup * 100)}%` : '<b class="tr">Cut off</b>'}`);
  if (p.core !== p.o && p.res > 0) extras.push(`${iconSvg('flame')} Resistance ${Math.round(p.res)}%`);
  if (vis && p.dig) extras.push(`Dug in ${p.dig}`);
  if (vis && p.xp >= 0.5) extras.push(`${'★'.repeat(Math.floor(p.xp)) || '☆'} veterans`);
  if (P.zones.length) extras.push(`${iconSvg('anchor')} ${P.zones.map(z => SEA[z].n).join(', ')}`);
  if (extras.length) h += `<div class="extras">${extras.map(x => `<span>${x}</span>`).join('')}</div>`;
  h += `<div class="units"><div class="u">${unitRow(p.u, vis)}</div>`;
  if (mine && canAct) h += `<div class="seg" role="group" aria-label="Order size">${['all','half','one'].map(a => `<button class="${sel.amt === a ? 'on' : ''}" data-amt="${a}">${a}</button>`).join('')}</div>`;
  h += `</div>`;
  if (g) h += `<div class="gen">${iconSvg('gen')}<div><b>${esc(g.name)}</b> <span class="lv">${'★'.repeat(g.lv)}</span><p>${TRAITS[g.tr].n}: ${TRAITS[g.tr].d}</p></div></div>`;
  if ((p.air.ftr || p.air.bmb) && vis) h += `<div class="airbase">${iconSvg('ftr')} ${p.air.ftr} fighters &nbsp; ${iconSvg('bmb')} ${p.air.bmb} bombers${mine && p.ad ? ' · flown this month' : ''}</div>`;
  if (mine && canAct) {
    const ready = readyAt(p);
    if (sel.multi && sel.multi.size) h += `<div class="hint"><b>${sel.multi.size + 1} provinces selected.</b> Click a highlighted province to move or attack with all of them. Shift-click to add or remove.</div>`;
    else if (ready) {
      const att = [...targets].filter(([, k]) => k === 'attack' || k === 'land' || k === 'para');
      h += `<div class="hint"><b>${ready} ready.</b> Click <span class="tg">green</span> to move, <span class="tr">red</span> to attack${P.coast ? ', <span style="color:#8ccbf0">blue</span> to sail or land' : ''}${p.r.par ? ', <span style="color:#d6a8ff">violet</span> to drop paratroopers' : ''}. Shift-click your provinces to attack together.</div>`;
      if (att.length) h += `<div class="req">${att.slice(0, 6).map(([j, k]) => { const o = battleOdds(i, j, k).odds; return `<span class="${o >= 1.3 ? 'ok' : ''}">${esc(PROV[j].name)} ${o === Infinity ? 'empty' : o.toFixed(1) + ':1'}</span>`; }).join('')}</div>`;
    } else if (unitsAt(p)) h += `<div class="hint">These divisions have already acted this month.</div>`;
    else h += `<div class="hint">No troops here. Raise some or march them in.</div>`;
    h += `<div class="sect">Raise forces here</div><div class="build">`;
    for (const k of ['inf','art','mtn','arm','par','ftr','bmb','cap','sub']) {
      const why = canBuild(pl, k, i); const c = unitCost(pl, k);
      if (why && /Research|Needs a coastal|need a city/.test(why) && !['inf'].includes(k)) continue;
      h += `<button class="bbtn" data-build="${k}" ${why ? `disabled title="${esc(why)}"` : `title="${esc(UNIT[k].n + ': ' + UNIT[k].d)}"`}>${iconSvg(k, k)}<b>${UNIT[k].n}</b><small>${c.pp}${iconSvg('pp')}${c.mp ? ` ${c.mp}k` : ''}${c.st ? ` ${c.st}${iconSvg('steel')}` : ''}${c.oil ? ` ${c.oil}${iconSvg('oil')}` : ''}</small></button>`;
    }
    h += `</div><div class="acts">
      <button class="btn" data-act="fac" ${canFactory(pl, i) ? `disabled title="${esc(canFactory(pl, i))}"` : ''}>${iconSvg('fac')} Factory<small>${factoryCost(p.fac)}⚙ 3 steel</small></button>
      <button class="btn" data-act="fort" ${canFort(pl, i) ? `disabled title="${esc(canFort(pl, i))}"` : ''}>${iconSvg('fort')} Fort<small>${fortCost(p.fort)}⚙ 2 steel</small></button>
      ${p.air.bmb && !p.ad ? `<button class="btn red" data-act="raid">${iconSvg('bmb')} Bomb raid</button>` : ''}
      ${G.gens.some(x => x.tag === pl && x.pid !== i) && !g ? `<button class="btn" data-act="postgen">${iconSvg('gen')} Post a general<small>5 pol</small></button>` : ''}</div>`;
  } else if (n && canAct) {
    const acts = [];
    if (war && n.tech.rocket) acts.push(`<button class="btn red" data-act="rocket" ${!n.rocket && rocketTargets(pl).includes(i) ? '' : 'disabled'}>${iconSvg('rocket')} V-weapon<small>${n.rocket ? 'used' : 'free'}</small></button>`);
    if (war && n.tech.bomb) acts.push(`<button class="btn red" data-act="bomb" ${canBomb(pl) || !rocketTargets(pl).includes(i) ? 'disabled title="' + esc(canBomb(pl) || 'Out of range') + '"' : ''}>${iconSvg('atom')} The Bomb<small>150⚙</small></button>`);
    if (war) { const inOps = n.ops && n.ops.tg.includes(i); acts.push(`<button class="btn" data-act="ops" ${n.ops ? 'disabled' : ''}>${iconSvg('target')} ${inOps ? 'Objective' : 'Plan operation'}<small>${n.ops ? 'Op ' + esc(n.ops.name) : '10 pol'}</small></button>`); }
    if (!war && !friendly(pl, p.o) && A(p.o)) {
      const why = canDeclare(pl, p.o);
      acts.push(`<button class="btn red" data-act="war" ${why ? `disabled title="${esc(why)}"` : ''}>Declare war<small>${warCost(pl, p.o)} pol</small></button>`);
      const dw = canDemand(pl, p.o); if (dw !== 'Unavailable') acts.push(`<button class="btn" data-act="demand" ${dw ? `disabled title="${esc(dw)}"` : ''}>Demand land<small>30 pol</small></button>`);
    }
    if (war && !vis) h += `<div class="hint">Enemy strength unknown. Move next to it, send a spy, or research Radar.</div>`;
    if (acts.length) h += `<div class="acts">${acts.join('')}</div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  el.querySelector('[data-close]').onclick = () => clearSelection();
  el.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { sel.amt = b.dataset.amt; SFX.click(); renderCard(); });
  el.querySelectorAll('[data-build]').forEach(b => b.onclick = e => { const k = b.dataset.build; const many = e.shiftKey ? 5 : 1; SFX.click(); Ctl.act({ c:'buildN', k, pid:i, n:many }); if (G.tut) G.tut.recruited = 1; addFloat(i, `+${many} ${UNIT[k].n}`, '#f0cd7f'); });
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => cardAction(b.dataset.act));
}
function cardAction(act) {
  const pl = ME, i = sel.id, p = G.prov[i];
  SFX.click();
  if (act === 'fac') { Ctl.act({ c:'factory', pid:i }); addFloat(i, '+1 Factory', '#f0cd7f'); }
  else if (act === 'fort') { Ctl.act({ c:'fort', pid:i }); addFloat(i, 'Fortified', '#f0cd7f'); }
  else if (act === 'war') { Ctl.act({ c:'declare', tag:p.o }); }
  else if (act === 'demand') { Ctl.act({ c:'demand', tag:p.o }); }
  else if (act === 'rocket') { Ctl.act({ c:'rocket', to:i }); }
  else if (act === 'bomb') { confirmBox('Drop the Bomb?', `${PROV[i].name} will be wiped from the map. World tension will soar.`, 'Drop it', () => Ctl.act({ c:'bomb', to:i })); }
  else if (act === 'raid') { const ids = raidTargets(pl, i); if (ids.length) startPick({ kind:'raid', from:i, ids, label:'Bomb raid: choose an enemy province in range' }); else toast('✕', 'No targets in range', '', ''); }
  else if (act === 'ops') { const ids = []; for (let j = 0; j < NP; j++) if (W(pl, G.prov[j].o) && PROV[j].adj.some(k => friendly(G.prov[k].o, pl))) ids.push(j); startPick({ kind:'ops', ids, sel:[i], label:`Operation objectives: ${PROV[i].name} (up to 4)` }); $('#pickGo').hidden = false; }
  else if (act === 'postgen') { const gs = G.gens.filter(x => x.tag === pl && x.pid !== i); pickList(gs.map(x => ({ id:x.id, t:x.name, s:`${TRAITS[x.tr].n} · at ${PROV[x.pid] ? PROV[x.pid].name : '—'}` })), 'Post which general here?', id => Ctl.act({ c:'postgen', id, pid:i })); }
}
function renderFleetCard(el) {
  el.hidden = false;
  const z = selFleet.z, S = SEA[z], ctl = ME ? seaControl(z, ME) : 'free';
  const mine = ME && G.fleet[z][ME];
  const ctlTxt = { free:'Open water', ours:'Under our control', contested:'Contested', enemy:'Enemy controlled' }[ctl];
  let h = `<div class="ch"><div class="sw" style="background:#2a5f80"></div><div><h3>${esc(S.n)}</h3><div class="o">${ctlTxt}${Object.keys(STRAITS).filter(k => k.includes(z)).map(k => ` · ${STRAITS[k]} strait`).join('')}</div></div><button class="ibtn x" data-close aria-label="Close">✕</button></div><div class="cb">`;
  const list = Object.keys(G.fleet[z]).filter(t => G.fleet[z][t].cap + G.fleet[z][t].sub > 0);
  h += list.length ? list.map(t => { const f = G.fleet[z][t]; return `<div class="units"><div class="u">${flagImg(t)}<b style="font-size:15px">${esc(natName(t))}</b></div><div class="u"><span>${iconSvg('cap')}<b>${f.cap}</b></span><span>${iconSvg('sub')}<b>${f.sub}</b></span></div></div>`; }).join('') : '<div class="hint">No fleets here.</div>';
  if (mine && Ctl.canAct()) {
    h += mine.mv ? '<div class="hint">This fleet has already sailed this month.</div>' : `<div class="hint">Click a <span style="color:#8ccbf0">ringed</span> sea zone to sail there. Entering a zone with enemy ships starts a naval battle. Capital ships escort convoys and bombard coasts; submarines raid enemy shipping.</div>
      <div class="seg">${['all','half'].map(a => `<button class="${selFleet.part === a ? 'on' : ''}" data-part="${a}">${a}</button>`).join('')}</div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  el.querySelector('[data-close]').onclick = () => clearSelection();
  el.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { selFleet.part = b.dataset.part; renderCard(); });
}
function confirmBox(title, body, yes, cb) {
  const m = $('#modal'); m.hidden = false;
  m.innerHTML = `<div class="cardbig" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><p>${esc(body)}</p><div class="acts" style="justify-content:center"><button class="btn" data-n>Cancel</button><button class="btn red" data-y>${esc(yes)}</button></div></div>`;
  m.querySelector('[data-n]').onclick = closeModal; m.querySelector('[data-y]').onclick = () => { closeModal(); cb(); };
}
function pickList(items, title, cb) {
  const m = $('#modal'); m.hidden = false;
  m.innerHTML = `<div class="helpcard" style="width:min(460px,100%)" role="dialog" aria-modal="true"><div class="hh"><h2 style="font-size:22px">${esc(title)}</h2><button class="ibtn" data-x aria-label="Close">✕</button></div>
    <div class="hb" style="grid-template-columns:1fr;gap:6px">${items.map(it => `<button class="row natpick" data-id="${it.id}"><div><h4>${esc(it.t)}</h4><p>${esc(it.s || '')}</p></div></button>`).join('')}</div></div>`;
  m.querySelector('[data-x]').onclick = closeModal;
  m.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { closeModal(); cb(isNaN(+b.dataset.id) ? b.dataset.id : +b.dataset.id); });
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; m.onclick = null; if (typeof itemResolve === 'function') { const r = itemResolve; itemResolve = null; r(); } }

/* ---------- action bar ---------- */
let armyCycle = 0;
function readyStacks() {
  const r = []; if (!ME) return r;
  for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o === ME && readyAt(p) > 0) r.push(i); }
  const front = i => PROV[i].adj.some(j => W(ME, G.prov[j].o)) ? 1 : 0;
  return r.sort((a, b) => front(b) - front(a) || readyAt(G.prov[b]) - readyAt(G.prov[a]));
}
function nextArmy() {
  if (!G || busy || !Ctl.canAct()) return;
  const r = readyStacks(); if (!r.length) { toast('✓', 'All armies have their orders', 'Press End Month when you are ready.', ''); return; }
  const id = r[armyCycle++ % r.length];
  select(id); centerOn(id, Math.max(cam.z, 1.3)); SFX.click();
}
function renderActions() {
  if (!G) return;
  const r = readyStacks(), b = $('#nextArmy');
  const atWar = ME && enemiesOf(ME).length > 0;
  b.hidden = !r.length || !Ctl.canAct();
  let units = 0; for (const i of r) units += readyAt(G.prov[i]);
  b.querySelector('b').textContent = units;
  b.querySelector('small').textContent = `${r.length} stack${r.length > 1 ? 's' : ''}${atWar ? ' · at war' : ''}`;
  b.classList.toggle('hot', !!atWar && r.some(i => PROV[i].adj.some(j => W(ME, G.prov[j].o))));
  const box = ME ? inboxOf(ME) : [];
  $('#inboxBtn').hidden = !box.length; $('#inboxBtn b').textContent = box.length;
  const et = $('#endTurn');
  const lbl = Ctl.endLabel();
  et.querySelector('.l1').textContent = lbl[0]; $('#etSub').textContent = lbl[1];
  et.classList.toggle('waiting', !!lbl[2]);
}

/* ---------- tooltips ---------- */
let hoverId = -1;
const tipEl = $('#tip');
function hover(e) {
  if (!G || G.preview || dragging) return;
  const fb = fleetAt(e.clientX, e.clientY);
  if (fb) { const f = fb.f; tipEl.innerHTML = `<b>${esc(natName(fb.t))} fleet</b><span>${esc(SEA[fb.z].n)} · ${f.cap} battle squadrons · ${f.sub} submarines</span>`; tipEl.hidden = false; placeTip(e.clientX, e.clientY); hoverId = -2; cv.style.cursor = 'pointer'; return; }
  const zt = selFleet && zoneAt(e.clientX, e.clientY);
  if (zt && fleetTargetsSet.has(zt)) { tipEl.innerHTML = `<b>${esc(SEA[zt].n)}</b><em class="good">Sail here</em>`; tipEl.hidden = false; placeTip(e.clientX, e.clientY); cv.style.cursor = 'pointer'; hoverId = -3; return; }
  const id = pickAt(e.clientX, e.clientY);
  if (id !== hoverId) {
    hoverId = id;
    const k = id >= 0 ? targets.get(id) : null;
    cv.style.cursor = pickMode ? (id >= 0 && pickMode.ids.includes(id) ? 'crosshair' : 'not-allowed') : k ? (k === 'move' || k === 'naval' ? 'pointer' : 'crosshair') : id >= 0 ? 'pointer' : 'grab';
    if (id < 0) { hideTip(); return; }
    const p = G.prov[id], P = PROV[id], vis = !ME || visibleTo(ME, id);
    let h = `<b>${esc(P.name)}</b><span>${flagImg(p.o, 'tflag')} ${esc(natName(p.o))}${p.core !== p.o && G.nat[p.core] ? ' · occupied' : ''}</span>`;
    h += `<span>${TER[P.ter].n}${P.vp ? ' · ' + P.vp + ' VP' : ''}${p.fort ? ' · fort ' + p.fort : ''}${P.oil ? ' · oil' : ''}${P.steel ? ' · steel' : ''}</span>`;
    if (vis && unitsAt(p)) h += `<span class="tunits">${LAND.filter(k2 => p.u[k2]).map(k2 => iconSvg(k2, k2) + p.u[k2]).join(' ')}</span>`;
    if (k === 'attack' || k === 'land' || k === 'para') {
      const o = battleOdds(sel.id, id, k);
      h += `<em class="${o.odds >= 1.3 ? 'good' : o.odds >= 1 ? 'even' : 'bad'}">${o.odds === Infinity ? 'Undefended — walk in' : 'Attack odds ' + o.odds.toFixed(2) + ':1'}${k === 'land' ? ' · naval landing' : k === 'para' ? ' · airdrop' : ''}</em>`;
      if (o.odds !== Infinity) h += `<div class="fac"><i>Us</i>${factorList(o.af)}</div><div class="fac"><i>Them</i>${factorList(o.df)}</div>`;
    }
    else if (k) h += `<em class="good">${k === 'naval' ? 'Sail here' : 'Move here'}</em>`;
    else if (pickMode && pickMode.ids.includes(id)) h += `<em class="even">Click to target</em>`;
    tipEl.innerHTML = h; tipEl.hidden = false;
  }
  if (id >= 0) placeTip(e.clientX, e.clientY);
}
function placeTip(x, y) { const w = tipEl.offsetWidth, h = tipEl.offsetHeight; tipEl.style.transform = `translate(${Math.min(x + 16, innerWidth - w - 8)}px,${Math.min(y + 18, innerHeight - h - 8)}px)`; }
function hideTip() { hoverId = -1; if (tipEl) tipEl.hidden = true; }
