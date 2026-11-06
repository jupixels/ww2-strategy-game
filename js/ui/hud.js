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
// phone layout: hide the card hand whenever the dossier or a drawer is open, however it was opened
const syncSheet = () => document.body.classList.toggle('sheet', !$('#card').hidden || !$('#drawer').hidden);
for (const id of ['#card', '#drawer']) new MutationObserver(syncSheet).observe($(id), { attributes:true, attributeFilter:['hidden'] });
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
  { const b = oilBreakdown(t); $('#sOil').title = `Oil: +${oilIncome(t)} income, −${oilUpkeep(t)} upkeep (ships ${b.navy.toFixed(1)}, aircraft ${b.air.toFixed(1)}, tanks ${b.arm.toFixed(1)}${b.peace ? '; halved in peacetime' : ''}). Moving troops costs no oil.${n.oil <= 0 ? ` FUEL SHORTAGE: mechanised forces at ${Math.round(fuelMul(t) * 100)}%.` : ''}`; }
  { const P = typeof paceInfo === 'function' ? paceInfo() : null, w = $('#sPaceW'); w.hidden = !P;
    if (P) { const v = $('#sPace'); v.textContent = P.txt; v.className = 'v ' + (P.cls || ''); w.title = P.tip; } }
  $('#sDate').textContent = MONTHS[G.m] + ' ' + G.y;
  $('#sSeason').textContent = (isWinter() ? 'Winter · ' : isMud() ? 'Mud season · ' : '') + 'Turn ' + (G.turn + 1);
}
function renderDots() {
  if (!ME || !A(ME)) return;
  const n = nat(ME);
  $('#dotPlans').hidden = !(!n.focus && focusFor(ME, n.major).some(f => !focusState(ME, f.k)));
  $('#dotTech').hidden = !(n.rs.length < n.slots && TECHS.some(T => !techState(ME, T.k)));
  $('#dotLog').hidden = !DECISIONS.some(D => { const s = decisionState(ME, D); return s && s.ok && !s.done && n.pol >= 50; });
  $('#dotArmy').hidden = true;
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
    <div class="acts" style="justify-content:center"><button class="btn red" data-discard title="Throw it away: frees a slot in your hand, +${DISCARD_POL} politics">Discard</button><button class="btn" data-x>Keep it</button><button class="btn gold" data-play ${why ? 'disabled title="' + esc(why) + '"' : ''}>${C.tgt === 'none' ? 'Play' : 'Choose target'}</button></div>${why ? `<p class="hint" style="text-align:center">${esc(why)}</p>` : ''}</div>`;
  m.querySelector('[data-x]').onclick = closeModal;
  m.querySelector('[data-discard]').onclick = () => { closeModal(); if (Ctl.act({ c:'discard', k })?.ok !== false) { SFX.paper(); toast('✕', `${C.n} discarded`, `+${DISCARD_POL} politics. A new card arrives next month.`, ''); } };
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
  if (tab) openTab(tab); // picking happens on the map: close the full-screen panel
  clearSelection(); pickMode = p; rebuildOverlay(); document.body.classList.add('picking');
  $('#pickBar').hidden = false; $('#pickBar span').textContent = p.label;
  if (p.ids && p.ids.length) { const near = p.ids.slice().sort((a, b) => Math.hypot(PROV[a].x - cam.x, PROV[a].y - cam.y) - Math.hypot(PROV[b].x - cam.x, PROV[b].y - cam.y))[0]; const [sx, sy] = w2s(PROV[near].x, PROV[near].y); if (!onScreen(sx, sy, -80)) centerOn(near); }
}
function endPick() { document.body.classList.remove('picking'); pickMode = null; $('#pickBar').hidden = true; rebuildOverlay(); }
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
$('#pickCancel').onclick = () => { endPick(); $('#pickGo').textContent = 'Launch'; SFX.click(); };
$('#pickGo').onclick = () => {
  const p = pickMode; if (!p) return;
  if (p.kind === 'ops') { endPick(); Ctl.act({ c:'ops', targets:p.sel }); }
};

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
  if (add && sel && stackOf(id, ME) && sel.id !== id) { sel.multi = sel.multi || new Set(); if (sel.multi.has(id)) sel.multi.delete(id); else sel.multi.add(id); }
  else sel = { id, amt:sel && sel.amt || 'all' };
  computeTargets(); rebuildOverlay(); staticDirty = true; renderCard(); if (tab === 'army') renderDrawer();
  hoverId = -1;
}
function clearSelection() { sel = null; selFleet = null; fleetTargetsSet = new Set(); targets = new Map(); rebuildOverlay(); staticDirty = true; renderCard(); hoverId = -1; }
function selectFleet(z) {
  sel = null; targets = new Map();
  selFleet = { z, part:selFleet && selFleet.part || 'all' };
  const f = G.fleet[z][ME];
  fleetTargetsSet = new Set(fleetReady(f) && Ctl.canAct() ? fleetTargets(z, ME) : []);
  rebuildOverlay(); staticDirty = true; renderCard();
}
function execOrder(to) {
  const kind = targets.get(to); if (!kind) return;
  const srcs = [sel.id, ...(sel.multi || [])].filter(s => targetsFor(ME, s).get(to));
  SFX.click();
  if (kind === 'convoy' || kind === 'invade') {
    let sent = 0;
    for (const s of srcs) { const k = targetsFor(ME, s).get(to); if (k === 'convoy' || k === 'invade') { const r = Ctl.act({ c:'ship', from:s, to, amt:sel.amt }); if (r && r.ok !== false) sent++; } }
    if (G.tut) G.tut.shipped = 1;
  } else if (kind === 'move' || kind === 'naval') {
    for (const s of srcs) { const k = targetsFor(ME, s).get(to); if (k === 'move' || k === 'naval') Ctl.act({ c:'move', from:s, to, amt:sel.amt }); }
    if (G.tut) G.tut.moved = 1;
  } else {
    const atk = srcs.filter(s => { const k = targetsFor(ME, s).get(to); return k === 'attack' || k === 'land' || k === 'para'; });
    Ctl.act({ c:'attack', from:atk, to, amt:sel.amt });
    if (G.tut) G.tut.attacked = 1;
  }
  if (!sel) return;
  const p = stackOf(sel.id, ME) || G.prov[sel.id], T = stackOf(to, ME);
  if (!readyAt(p) && T && readyAt(T) > 0 && !sel.multi) select(to); else select(sel.id);
}
function oddsFor(srcs, to, kind) {
  const u = emptyLand(); for (const s of srcs) { const S = stackOf(s, ME) || G.prov[s]; const part = kind === 'para' ? { ...emptyLand(), par:S.r.par } : portion(S, sel ? sel.amt : 'all'); for (const k of LAND) u[k] += part[k]; }
  const T = G.prov[to]; if (!forcesAt(T)) return { odds:Infinity, af:[], df:[] };
  const af = [], df = [];
  const atk = attackValue(ME, u, to, { naval:kind === 'land', para:kind === 'para', from:srcs[0] }, af);
  const def = defenseValue(to, u, ME, df);
  return { odds:atk / def, af, df };
}
const battleOdds = (from, to, kind) => oddsFor(sel && (sel.multi || sel.id === from) ? [sel.id, ...(sel.multi || [])].filter(s => targetsFor(ME, s).get(to) === kind || (kind === 'attack' && targetsFor(ME, s).get(to) === 'attack')) : [from], to, kind);
function factorList(list) { return list.filter(([l, m]) => l !== 'Troops' && l !== 'Difficulty' && l !== 'National spirit').map(([l, m]) => `<span class="${m >= 1 ? 'up' : 'dn'}">${esc(l)} ${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%</span>`).join(''); }

/* ---------- the province dossier ---------- */
// a key to the highlighted targets: only the kinds actually on the map right now
const KEY = { move:['#79b46c','Move'], attack:['#d0502f','Attack'], naval:['#5aa6d6','Sail'], land:['#5aa6d6','Land'], convoy:['#78d6dc','Convoy'], invade:['#ec963a','Invade'], para:['#be78e6','Airdrop'] };
function targetKey() { const ks = [...new Set(targets.values())]; if (!ks.length) return ''; const seen = new Set(); return `<div class="tkey">${ks.map(k => KEY[k]).filter(x => x && !seen.has(x[1]) && seen.add(x[1])).map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`; }
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
  const gts = guestTags(p), myG = pl ? guestOf(i, pl) : null;
  h += `<div class="units"><div class="u">${unitRow(p.u, vis)}</div>`;
  if ((mine || myG) && canAct) h += `<div class="seg" role="group" aria-label="Order size">${['all','half','one'].map(a => `<button class="${sel.amt === a ? 'on' : ''}" data-amt="${a}">${a}</button>`).join('')}</div>`;
  h += `</div>`;
  if (gts.length && vis) h += `<div class="sect">${myG && gts.length === 1 ? 'Your expeditionary force' : 'Allied forces here'}</div>` + gts.map(gt => `<div class="units"><div class="u">${flagImg(gt)}<b style="font-size:14px">${esc(natName(gt))}</b></div><div class="u">${unitRow(p.g[gt].u, true)}</div></div>`).join('');
  if (g) h += `<div class="gen">${iconSvg('gen')}<div><b>${esc(g.name)}</b> <span class="lv">${'★'.repeat(g.lv)}</span><p>${TRAITS[g.tr].n}: ${TRAITS[g.tr].d}</p></div></div>`;
  if ((p.air.ftr || p.air.bmb) && vis) h += `<div class="airbase">${iconSvg('ftr')} ${p.air.ftr} fighters &nbsp; ${iconSvg('bmb')} ${p.air.bmb} bombers${mine && p.ad ? ' · flown this month' : ''}</div>`;
  if (!mine && myG && canAct) {
    const ready = readyAt(myG);
    h += ready ? `<div class="hint"><b>${ready} of your divisions ready</b> in ${esc(natName(p.o))}'s territory. They fight beside your ally and draw its supply.</div>` + targetKey() : '<div class="hint">Your expeditionary force has acted this month.</div>';
  }
  if (mine && canAct) {
    const ready = readyAt(p);
    if (sel.multi && sel.multi.size) h += `<div class="hint"><b>${sel.multi.size + 1} provinces selected.</b> Click a highlighted province to move or attack with all of them. Shift-click to add or remove.</div>`;
    else if (ready) {
      const att = [...targets].filter(([, k]) => k === 'attack' || k === 'land' || k === 'para');
      h += `<div class="hint"><b>${ready} ready.</b> Click a highlighted province. Shift-click more of yours to strike together.</div>` + targetKey();
      if (P.coast && [...targets.values()].some(k => k === 'convoy' || k === 'invade')) h += `<div class="extras"><span>${iconSvg('anchor')} Sealift ${liftLeft(pl)}/${sealift(pl)} this month · range ${convoyHops(pl)} sea zones</span></div>`;
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
  el.querySelectorAll('[data-build]').forEach(b => b.onclick = e => { const k = b.dataset.build; const many = e.shiftKey ? 5 : 1; k === 'arm' ? SFX.tank() : AIR.includes(k) ? SFX.plane() : NAVY.includes(k) ? SFX.ship() : SFX.build(); Ctl.act({ c:'buildN', k, pid:i, n:many }); if (G.tut) G.tut.recruited = 1; addFloat(i, `+${many} ${UNIT[k].n}`, '#f0cd7f'); });
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => cardAction(b.dataset.act));
}
function cardAction(act) {
  const pl = ME, i = sel.id, p = G.prov[i];
  SFX.click();
  if (act === 'fac') { Ctl.act({ c:'factory', pid:i }); addFloat(i, '+1 Factory', '#f0cd7f'); SFX.factory(); }
  else if (act === 'fort') { Ctl.act({ c:'fort', pid:i }); addFloat(i, 'Fortified', '#f0cd7f'); SFX.fort(); }
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
  if (ME) {
    const risk = Math.round(convoyRisk(z, ME) * 100);
    h += `<div class="extras"><span>${iconSvg('anchor')} Convoys crossing here: ${risk ? `about ${risk}% lost to enemy ships` : 'safe'}</span></div>`;
  }
  if (mine && Ctl.canAct()) {
    const left = FLEET_MOVES - (mine.mv || 0), up = mine.cap * UNIT.cap.up + mine.sub * UNIT.sub.up;
    h += !fleetReady(mine) ? '<div class="hint">This fleet has sailed as far as it can this month.</div>' : `<div class="hint">Click a <span style="color:#8ccbf0">ringed</span> sea zone to sail there — <b>${left} move${left > 1 ? 's' : ''} left</b> this month. Entering a zone with enemy ships starts a battle and ends the voyage. Battle squadrons escort convoys and landings, bombard coasts and add sealift; submarines sink enemy convoys and trade.</div>`;
    h += `<div class="seg">${['all','half'].map(a => `<button class="${selFleet.part === a ? 'on' : ''}" data-part="${a}">${a}</button>`).join('')}</div>`;
    h += `<div class="acts"><button class="btn" data-scrap title="Breaks up the selected ships for steel and stops their oil upkeep (${up.toFixed(1)} oil a month at war for the whole fleet)">Decommission ${selFleet.part}<small>+steel · saves oil</small></button></div>`;
  }
  h += `</div>`;
  el.innerHTML = h;
  el.querySelector('[data-close]').onclick = () => clearSelection();
  el.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { selFleet.part = b.dataset.part; renderCard(); });
  const sb = el.querySelector('[data-scrap]'); if (sb) sb.onclick = () => confirmBox('Decommission ships?', `Break up ${selFleet.part === 'half' ? 'half of' : 'all of'} this fleet in the ${S.n}. You get back 3 steel per battle squadron and 1 per submarine, and stop paying their oil.`, 'Decommission', () => { Ctl.act({ c:'scrap', z, part:selFleet.part }); selectFleet(z); });
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
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; m.onclick = null; m.classList.remove('over'); if (typeof itemResolve === 'function') { const r = itemResolve; itemResolve = null; r(); } }

/* ---------- action bar ---------- */
let armyCycle = 0;
function readyStacks() {
  const r = []; if (!ME) return r;
  for (const i of armiesOf(ME)) if (readyAt(stackOf(i, ME)) > 0) r.push(i);
  const front = i => PROV[i].adj.some(j => W(ME, G.prov[j].o)) ? 1 : 0;
  return r.sort((a, b) => front(b) - front(a) || readyAt(stackOf(b, ME)) - readyAt(stackOf(a, ME)));
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
  renderUndo();
  $('#inboxBtn').hidden = !box.length; $('#inboxBtn b').textContent = box.length;
  const et = $('#endTurn');
  const lbl = Ctl.endLabel();
  et.querySelector('.l1').textContent = lbl[0]; $('#etSub').textContent = lbl[1];
  et.classList.toggle('waiting', !!lbl[2]);
}

/* ---------- expeditionary forces on the map ---------- */
// small flag-and-number tabs under a province's counter, one per allied army standing there
function drawGuests(c, i, sx, sy) {
  const p = G.prov[i]; if (!p.g || cam.z < 0.45) return;
  const gts = guestTags(p); if (!gts.length) return;
  if (ME && !friendly(ME, p.o) && !visibleTo(ME, i)) return;
  c.save(); c.font = `700 10px ${FONT_BODY}`; c.textBaseline = 'middle'; c.textAlign = 'left';
  let x = Math.round(sx - gts.length * 17), y = Math.round(sy + (cam.z < 0.85 ? 20 : 24));
  for (const gt of gts) {
    const txt = String(landN(p.g[gt].u)), w = Math.round(c.measureText(txt).width + 19);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 1, y + 1, w, 12);
    c.fillStyle = darkOf(natColor(gt)); c.fillRect(x, y, w, 12);
    c.drawImage(flagSprite(gt), x + 2, y + 2, 11, 8);
    c.lineWidth = 1; c.strokeStyle = gt === ME ? '#f0cd7f' : ME && W(ME, gt) ? '#ff8a6a' : '#9fd68f'; c.strokeRect(x + 0.5, y + 0.5, w - 1, 11);
    c.fillStyle = '#fff'; c.fillText(txt, x + 15, y + 6.5);
    if (gt === ME && readyAt(p.g[gt])) { c.beginPath(); c.arc(x + w, y, 2.6, 0, 7); c.fillStyle = '#f0cd7f'; c.fill(); }
    x += w + 3;
  }
  c.restore();
}

/* ---------- convoys at sea ---------- */
// dashed routes from port through each sea zone to the landing, for the nation on this screen
function drawConvoys(c) {
  if (!G || !ME || cam.z < 0.25) return;
  const L = (G.convoys || []).filter(v => v.t === ME); if (!L.length) return;
  const toS = (x, y) => [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2];
  const now = performance.now();
  c.save(); c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const v of L) {
    const pts = [[PROV[v.from].x, PROV[v.from].y], ...v.route.map(z => [SEA[z].x, SEA[z].y]), [PROV[v.to].x, PROV[v.to].y]];
    let px = nearX(pts[0][0]); const S = pts.map(([x, y], i) => { if (i) px = nearX(x, px); return toS(px, y); });
    const col = v.kind === 'invade' ? '236,150,58' : '120,214,220';
    c.setLineDash([7, 6]); c.lineDashOffset = -(now / 60) % 13;
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 4; c.beginPath(); S.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    c.strokeStyle = `rgba(${col},.95)`; c.lineWidth = 2.2; c.stroke();
    c.setLineDash([]);
    const [ex, ey] = S[S.length - 1]; c.beginPath(); c.arc(ex, ey, 5, 0, 7); c.fillStyle = `rgba(${col},.95)`; c.fill();
    const [mx, my] = S[Math.max(1, S.length - 2)];
    const txt = String(landN(v.u)); c.font = `700 11px ${FONT_BODY}`; const w = c.measureText(txt).width + 22;
    c.fillStyle = 'rgba(10,20,26,.85)'; c.fillRect(mx - w / 2, my - 9, w, 16); c.strokeStyle = `rgba(${col},.9)`; c.lineWidth = 1; c.strokeRect(mx - w / 2 + 0.5, my - 8.5, w - 1, 15);
    drawIcon(c, 'cap', 9, mx - w / 2 + 3, my - 5, '#e7f2fa'); c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(txt, mx - w / 2 + 15, my);
  }
  c.restore();
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
    cv.style.cursor = pickMode ? (id >= 0 && pickMode.ids.includes(id) ? 'crosshair' : 'not-allowed') : k ? (k === 'move' || k === 'naval' || k === 'convoy' ? 'pointer' : 'crosshair') : id >= 0 ? 'pointer' : 'grab';
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
    else if (k === 'convoy' || k === 'invade') {
      const v = convoyInfo(ME, sel.id, id);
      if (v) {
        const nDiv = Math.min(landN(portion(stackOf(sel.id, ME), sel.amt)), liftLeft(ME)), risk = Math.round(v.risk * 100);
        if (k === 'invade') { const o = oddsFor([sel.id], id, 'land'); h += `<em class="${o.odds >= 1.3 ? 'good' : o.odds >= 1 ? 'even' : 'bad'}">Overseas invasion · ${o.odds === Infinity ? 'undefended shore' : 'odds now ' + o.odds.toFixed(2) + ':1'}</em>`; }
        else h += `<em class="good">Convoy here</em>`;
        h += `<span>${nDiv} division${nDiv === 1 ? '' : 's'} sail via ${v.route.map(z => SEA[z].n).join(' → ')}. Lands at the end of the month.</span>`;
        h += `<span class="${risk >= 10 ? 'bad' : ''}">${risk ? `Enemy ships on the route: about ${risk}% may be sunk. Escort with battle squadrons.` : 'No enemy ships on the route.'}</span>`;
      }
    }
    else if (k) h += `<em class="good">${k === 'naval' ? 'Sail here' : 'Move here'}</em>`;
    else if (pickMode && pickMode.ids.includes(id)) h += `<em class="even">Click to target</em>`;
    tipEl.innerHTML = h; tipEl.hidden = false;
  }
  if (id >= 0) placeTip(e.clientX, e.clientY);
}
function placeTip(x, y) { const w = tipEl.offsetWidth, h = tipEl.offsetHeight; tipEl.style.transform = `translate(${Math.min(x + 16, innerWidth - w - 8)}px,${Math.min(y + 18, innerHeight - h - 8)}px)`; }
function hideTip() { hoverId = -1; if (tipEl) tipEl.hidden = true; }
