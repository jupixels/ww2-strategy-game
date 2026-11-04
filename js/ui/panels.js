'use strict';
/* ================= COMMAND PANELS ================= */
let outFilter = 'ready';
// six drawers; three of them hold sub-pages
const SUBS = {
  army:[['fronts','Fronts'],['armies','Armies'],['generals','Generals'],['convoys','Convoys']],
  plans:[['focus','National focus'],['tech','Research'],['nation','Nation']],
  log:[['ledger','Ledger'],['dec','Destiny']],
};
const subTab = { army:'fronts', plans:'focus', log:'ledger' };
const TAB_ALIAS = { nation:['plans','nation'], focus:['plans','focus'], tech:['plans','tech'], dec:['log','dec'], generals:['army','generals'], convoys:['army','convoys'], fronts:['army','fronts'], armies:['army','armies'] };
function openTab(t) {
  if (TAB_ALIAS[t]) { const [m, s2] = TAB_ALIAS[t]; if (tab === m && subTab[m] === s2) { tab = null; } else { tab = m; subTab[m] = s2; } $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); hoverNat = null; rebuildOverlay(); staticDirty = true; renderDrawer(); tab ? SFX.open() : SFX.close(); return; }
  tab = tab === t ? null : t;
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  hoverNat = null; rebuildOverlay(); staticDirty = true;
  renderDrawer(); tab ? SFX.open() : SFX.close();
}
const dh = (title, sub) => `<div class="dh"><div><h2>${title}</h2><p>${sub}</p></div><button class="ibtn" data-closetab aria-label="Close">✕</button></div><div class="db">`;
const kv = items => `<div class="kv">${items.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
/* ---------- national signature systems ---------- */
const meter = (v, max, cls) => `<div class="meter ${cls || ''}"><i style="width:${clamp(v / max, 0, 1) * 100}%"></i></div>`;
function sigPanel(pl, n, act) {
  const s = sigOf(pl); let h = '';
  const btn = (op, label, extra, gold) => { const why = canSig(pl, op, extra || {}); return `<button class="btn ${gold && !why ? 'gold' : ''}" data-sig='${JSON.stringify({ op, ...(extra || {}) })}' ${why || !act ? `disabled title="${esc(why)}"` : ''}>${label}</button>`; };
  if (pl === 'GER') {
    h += `<div class="sect">Mobilisation of industry</div>`;
    h += ECO_LEVELS.map((L, k) => `<div class="row ${s.eco === k ? 'active' : ''}"><div><h4>${k}. ${L.n}</h4><p>${k ? `+${Math.round(L.pp * 100)}% production · +${Math.round(L.mp * 100)}% manpower · stability ${L.stab}` : 'No extra output, no strain on the home front.'}</p></div><div>${s.eco === k ? '<span class="chip ally">Current</span>' : btn('eco', k > (s.eco || 0) ? `Raise<small>${10 * k} pol</small>` : 'Lower', { lv:k }, k > (s.eco || 0))}</div></div>`).join('');
  } else if (pl === 'SOV') {
    const c = evacCandidates(pl);
    h += `<div class="sect">Factories in danger</div>` + (c.length ? c.slice(0, 8).map(i => `<div class="row"><div><h4>${esc(PROV[i].name)}</h4><p>${G.prov[i].fac} factories within two provinces of the enemy.</p></div><div>${btn('evac', 'Evacuate<small>5 pol</small>', { pid:i }, true)}</div></div>`).join('') : '<div class="hint">No factory is threatened yet. When the enemy comes within two provinces of one west of the Urals, you can ship it east.</div>');
    if (s.evac.length) h += `<div class="sect">Trains heading east</div>` + s.evac.map(e => `<div class="row"><div><h4>${e.n} factor${e.n > 1 ? 'ies' : 'y'} → ${esc(PROV[e.to].name)}</h4><p>Back in production in ${e.at - G.turn} month${e.at - G.turn > 1 ? 's' : ''}.</p></div></div>`).join('');
  } else if (pl === 'ENG') {
    const L = lifeline(pl);
    h += `<div class="sect">Convoys getting through</div><div class="row"><div><h4>${Math.round(L * 100)}% of the lifeline</h4>${meter(L, 1, L < 0.5 ? 'bad' : '')}<p>Worth up to +10 production, +5 oil and +3 steel every month. Enemy control of the North Atlantic, the Channel or Biscay, and U-boat raiding, cut it.</p></div></div>`;
    h += `<div class="row"><div><h4>Escort groups</h4><p>Destroyers and escort carriers halve the losses to U-boats for six months.${s.escort ? ` <b>${s.escort} months left.</b>` : ''}</p></div><div>${btn('escort', 'Form<small>20 pol</small>', {}, true)}</div></div>`;
  } else if (pl === 'USA') {
    h += `<div class="sect">Mobilisation</div><div class="row"><div><h4>${Math.round(s.mob)}% mobilised</h4>${meter(s.mob, 100)}<p>Production ×${sigIncomeMul(pl).toFixed(2)}. Rises 6 points a month at war, slowly with world tension in peace.</p></div></div>`;
    h += `<div class="sect">Lend-Lease</div><div class="row"><div><h4>${s.ll ? 'Supplying ' + esc(natName(s.ll)) : 'Nobody supplied'}</h4><p>Costs us 8 production a month; they get 14 production and 3 oil.</p></div><div>${s.ll ? btn('ll', 'Stop', { to:null }) : ''}</div></div>`;
    const cands = Object.keys(G.nat).filter(t => A(t) && t !== pl && !NATDEF[t].off && !canSig(pl, 'll', { to:t }) && (nat(t).major || t === 'CHI')).slice(0, 6);
    h += cands.filter(t => t !== s.ll).map(t => `<div class="row"><div><h4>${flagImg(t)} ${esc(natName(t))}</h4><p>${enemiesOf(t).length ? 'At war with ' + enemiesOf(t).filter(A).slice(0, 2).map(natName).join(', ') : 'At peace'}</p></div><div>${btn('ll', 'Supply<small>10 pol</small>', { to:t }, true)}</div></div>`).join('');
  } else if (pl === 'JAP') {
    const m = oilMonths(pl);
    h += `<div class="sect">Fuel</div><div class="row"><div><h4>${m === Infinity ? 'The tanks are filling' : m === 0 ? '<span class="tr">The tanks are empty</span>' : `${m} months of fuel left`}</h4>${meter(m === Infinity ? 24 : m, 24, m < 6 ? 'bad' : '')}<p>${G.flags.embargo ? 'The American embargo is in force: almost no oil comes in.' : 'America still sells us oil — until we provoke an embargo.'} The Dutch Indies (Palembang, Balikpapan), Brunei and Burma hold the oil we need.</p></div></div>`;
    h += `<div class="row"><div><h4>Fleet ${s.anchor ? 'at anchor' : 'at sea'}</h4><p>Laying the fleet up cuts its oil by 60% but it fights at 60% strength until it sails again.</p></div><div>${btn('anchor', s.anchor ? 'Put to sea' : 'Lay up', {}, false)}</div></div>`;
  } else if (pl === 'ITA') {
    h += `<div class="sect">The regime</div><div class="row"><div><h4>${Math.round(s.reg)}% support</h4>${meter(s.reg, 100, s.reg < 35 ? 'bad' : '')}<p>Rises with victories and peace; falls with defeats and with enemy troops on Italian soil. Below 30% production suffers.</p></div></div>`;
    h += `<div class="row"><div><h4>Depose the Duce</h4><p>The king dismisses Mussolini and signs an armistice: Italy leaves the Axis and joins the Allies — and Germany invades.</p></div><div>${btn('armistice', 'Sign', {}, true)}</div></div>`;
  } else if (pl === 'FRA') {
    h += `<div class="row ${s.union ? 'active' : ''}"><div><h4>Union Sacrée</h4><p>Once per war: +20 stability now and +10% defence for a year.${s.union ? ` <b>${s.union} months left.</b>` : ''}</p></div><div>${s.unionUsed ? '<span class="chip">Called</span>' : btn('union', 'Call<small>25 pol</small>', {}, true)}</div></div>`;
    h += `<div class="row ${s.exile ? 'active' : ''}"><div><h4>Fight on from Algiers</h4><p>${s.fled ? 'The government sits in Algiers.' : s.exile ? '<b>Ready.</b> If Paris falls the government flies to Algiers instead of signing an armistice: no Vichy, and the Empire fights on.' : 'Prepare the government to leave for North Africa if Paris falls.'}</p></div><div>${s.fled ? '' : btn('exile', s.exile ? 'Cancel' : 'Prepare<small>15 pol</small>', {}, !s.exile)}</div></div>`;
  } else if (pl === 'CHI') {
    let occ = 0; for (const p of G.prov) if (p.core === 'CHI' && p.o !== 'CHI' && friendly(p.o, 'JAP')) occ++;
    h += `<div class="sect">Behind Japanese lines</div><div class="row"><div><h4>${occ} occupied provinces</h4><p>Resistance in occupied China rises 3 points a month faster while we fight Japan; at 85% the partisans strike.</p></div></div>`;
    h += `<div class="row"><div><h4>The United Front</h4><p>Make common cause with the Communists: they join our war and our alliance, +10 stability.</p></div><div>${s.ufront ? '<span class="chip ally">Formed</span>' : btn('ufront', 'Form<small>30 pol</small>', {}, true)}</div></div>`;
  }
  return h;
}

/* ---------- fronts ---------- */
const FRONT_COLORS = ['#f0cd7f','#79c0e8','#e8836b','#9fd68f','#c79be8','#e8c36b','#6be0c8','#e86bb0'];
const frontColor = (t, f) => FRONT_COLORS[frontsOf(t).indexOf(f) % FRONT_COLORS.length] || FRONT_COLORS[0];
function frontsPanel(pl, n, act) {
  const fs = frontsOf(pl), gens = G.gens.filter(g => g.tag === pl);
  let h = '';
  if (!fs.length) h += `<div class="hint">A <b>front</b> is a stretch of your border with an order. At the end of every month its divisions that are still ready <b>hold</b>, <b>advance</b> or try to <b>encircle</b> the enemy on their own, reserves march up from the interior, and the general you assign takes the strongest army. You only step in for the big pushes — anything you move by hand that month is left alone.</div>`;
  for (const f of fs) {
    const st = frontStats(pl, f), col = frontColor(pl, f), g = f.gid != null ? gens.find(x => x.id === f.gid) : null, L = f.last;
    h += `<div class="front" style="--fc:${col}"><div class="fhead"><i class="fsw"></i><h4 data-fname="${f.id}" title="Rename">${esc(f.name)}</h4><span class="fst">${st.line ? `${st.line} on the line` : '<i>quiet</i>'} · ${st.div} div${st.ready !== st.div ? ` (${st.ready} ready)` : ''} · facing ~${st.foe}</span></div>
      <div class="seg ford">${Object.keys(FRONT_ORDERS).map(o => `<button class="${f.o === o ? 'on' : ''}" data-ford="${f.id}:${o}" title="${esc(FRONT_ORDERS[o].d)}" ${act ? '' : 'disabled'}>${FRONT_ORDERS[o].n}</button>`).join('')}</div>
      <div class="frow"><label>${iconSvg('gen')}<select data-fgen="${f.id}" ${act ? '' : 'disabled'}><option value="">No general</option>${gens.map(x => `<option value="${x.id}" ${g && g.id === x.id ? 'selected' : ''}>${esc(x.name)} · ${TRAITS[x.tr].n} ${'★'.repeat(x.lv)}</option>`).join('')}</select></label>
        <button class="chipbtn ${f.pull ? 'on' : ''}" data-fpull="${f.id}" title="Idle divisions from the interior march to this front" ${act ? '' : 'disabled'}>Reserves ${f.pull ? 'on' : 'off'}</button></div>
      ${L && (L.attacks || L.moved) ? `<p class="flast">Last month: ${L.attacks ? `${L.attacks} attack${L.attacks > 1 ? 's' : ''}, ${L.won} won${L.taken.length ? `, took ${L.taken.slice(0, 3).map(i => esc(PROV[i].name)).join(', ')}${L.taken.length > 3 ? '…' : ''}` : ''}` : 'no attacks'}${L.moved ? ` · ${L.moved} divisions moved up` : ''}.</p>` : ''}
      <div class="fbtns"><button class="btn" data-fshow="${f.id}">Show</button><button class="btn" data-fedit="${f.id}" ${act ? '' : 'disabled'}>Edit area</button><button class="btn red" data-fdel="${f.id}" ${act ? '' : 'disabled'}>Disband</button></div></div>`;
  }
  h += `<div class="acts fnew"><button class="btn gold" data-fauto ${act && fs.length < FRONT_MAX ? '' : 'disabled'} title="One front for each enemy you border, on Hold">Auto-assign fronts</button><button class="btn" data-fnew ${act && fs.length < FRONT_MAX ? '' : 'disabled'} title="Click your provinces on the map to draw a front">Draw a front</button></div>`;
  if (fs.length) h += `<div class="hint">Front lines are drawn on the map in each front's colour. Select any province to add it to a front or take it out.</div>`;
  return h;
}
function startFrontPick(pl, f) {
  const ids = []; for (let i = 0; i < NP; i++) if (frontable(pl, i)) ids.push(i);
  startPick({ kind:'front', ids, sel:f ? f.z.filter(i => frontable(pl, i)) : ids.filter(i => touchesEnemy(pl, i) && !frontAt(pl, i)).slice(0, 0), fid:f ? f.id : null, label:'' });
  updateFrontPickBar(); $('#pickGo').hidden = false; $('#pickGo').textContent = f ? 'Save front' : 'Create front';
  if (tab) openTab(tab);
}
function updateFrontPickBar() { const p = pickMode; if (!p || p.kind !== 'front') return; $('#pickBar span').textContent = `${p.fid ? 'Edit front' : 'New front'}: click your provinces · ${p.sel.length} chosen`; }
function renderDrawer() {
  const el = $('#drawer');
  if (!G || !tab || !ME || !A(ME)) { el.hidden = true; return; }
  el.hidden = false;
  const pl = ME, n = nat(pl), act = Ctl.canAct();
  let h = '';
  const view = tab === 'plans' ? subTab.plans : tab === 'log' ? subTab.log : tab === 'army' ? 'army' : tab;
  const av = subTab.army;
  if (tab === 'army' && av === 'fronts') {
    h = dh('High Command', 'Fronts carry out standing orders at the end of every month.');
    h += frontsPanel(pl, n, act);
  } else if (tab === 'army') {
    const d = divisions(pl), air = airOf(pl), navy = navyOf(pl);
    let ready = 0; for (const i of armiesOf(pl)) ready += readyAt(stackOf(i, pl));
    h = dh('High Command', 'Every army, airfield and general under your command.');
    if (av === 'armies') h += kv([[iconSvg('inf') + d.inf, 'Infantry'], [iconSvg('art', 'art') + d.art, 'Artillery'], [iconSvg('arm', 'arm') + d.arm, 'Armor'], [iconSvg('mtn', 'mtn') + d.mtn, 'Mountain'], [iconSvg('par', 'par') + d.par, 'Airborne'], [ready, 'Ready'], [iconSvg('ftr') + air.ftr, 'Fighters'], [iconSvg('bmb') + air.bmb, 'Bombers'], [iconSvg('cap') + navy.cap + ' · ' + navy.sub, 'Ships · subs']]);
    // generals
    const gens = G.gens.filter(g => g.tag === pl), why = canHire(pl);
    if (av === 'generals') {
    h += `<div class="sect">Generals · ${gens.length}/${n.genSlots}</div>`;
    h += gens.map(g => `<div class="row" data-goto="${g.pid}"><div><h4>${iconSvg('gen')}${esc(g.name)} <span class="lv">${'★'.repeat(g.lv)}</span></h4><p>${TRAITS[g.tr].n} — ${TRAITS[g.tr].d} At <b>${esc(PROV[g.pid] ? PROV[g.pid].name : '—')}</b>.</p></div></div>`).join('') || '<div class="hint">No generals yet. A general leads the army in his province and earns promotions by winning.</div>';
    const ros = rosterFor(pl);
    if (act && gens.length < n.genSlots) h += `<div class="row"><div><h4>Appoint a general</h4><p>${ros.length ? ros.map(r => `${esc(r[0])} (${TRAITS[r[1]].n})`).slice(0, 3).join(', ') : 'A capable officer from the ranks'} — posted to your biggest army.</p></div><div><button class="btn gold" data-hire ${why ? `disabled title="${esc(why)}"` : ''}>25 pol</button></div></div>`;
    }
    // outliner
    const cvs = convoysOf(pl);
    if (av === 'convoys') {
    h += `<div class="sect">Convoys at sea · sealift ${liftLeft(pl)}/${sealift(pl)} left this month</div>`;
    h += cvs.length ? cvs.map(v => `<div class="row orow" data-goto="${v.to}"><div><h4>${iconSvg('anchor')}${esc(PROV[v.from].name)} → ${esc(PROV[v.to].name)}</h4><p class="ounits">${LAND.filter(k => v.u[k]).map(k => iconSvg(k, k) + v.u[k]).join(' ')} · ${v.kind === 'invade' ? '<span class="tr">invasion</span>' : 'reinforcement'} · via ${v.route.map(z => esc(SEA[z].n)).join(', ')} · ~${Math.round(routeRisk(v.route, pl) * 100)}% risk</p></div><div><button class="btn" data-unship="${v.id}" ${act ? '' : 'disabled'} title="Bring them back to port, ready to act">Recall</button></div></div>`).join('')
      : `<div class="hint">Select an army in a port: <span style="color:#86dde2">teal</span> provinces across the sea take a convoy, <span style="color:#f0a25a">orange</span> ones an overseas invasion. Convoys cross up to ${convoyHops(pl)} sea zones and land at the end of the month. Every battle squadron adds 2 divisions of sealift and escorts convoys in its waters.</div>`;
    const fl = Object.keys(G.fleet).filter(z => G.fleet[z][pl]);
    h += `<div class="sect">Fleets</div>` + (fl.map(z => { const f = G.fleet[z][pl]; return `<div class="row" data-zone="${z}"><div><h4>${iconSvg('anchor')}${esc(SEA[z].n)}</h4><p>${f.cap} battle squadrons · ${f.sub} submarines · ${{ free:'open water', ours:'we control it', contested:'contested', enemy:'enemy waters' }[seaControl(z, pl)]}</p></div><div>${fleetReady(f) ? `<span class="chip ally">${FLEET_MOVES - (f.mv || 0)} moves</span>` : ''}</div></div>`; }).join('') || '<div class="hint">No navy. Build battle squadrons or submarines in a coastal home province.</div>');
    }
    if (av === 'armies') {
    h += `<div class="sect">Armies</div><div class="seg filt">${[['ready','Ready'],['front','At the front'],['sup','Low supply'],['all','All']].map(([k, l]) => `<button class="${outFilter === k ? 'on' : ''}" data-filt="${k}">${l}</button>`).join('')}</div>`;
    const stacks = armiesOf(pl).filter(i => {
      const p = stackOf(i, pl);
      if (outFilter === 'ready') return readyAt(p) > 0;
      if (outFilter === 'front') return PROV[i].adj.some(j => W(pl, G.prov[j].o));
      if (outFilter === 'sup') return G.prov[i].sup < 1;
      return true;
    }).sort((a, b) => landN(stackOf(b, pl).u) - landN(stackOf(a, pl).u));
    h += stacks.slice(0, 60).map(i => { const p = stackOf(i, pl), g = genAt(i, pl); return `<div class="row orow" data-goto="${i}"><div><h4>${esc(PROV[i].name)}${g ? ' ' + iconSvg('gen') : ''}</h4><p class="ounits">${LAND.filter(k => p.u[k]).map(k => iconSvg(k, k) + p.u[k]).join(' ')}${G.prov[i].sup < 1 ? ` · <span class="tr">supply ${Math.round(G.prov[i].sup * 100)}%</span>` : ''}${G.prov[i].o !== pl ? ` · in ${esc(natName(G.prov[i].o))}` : ''}${p.dig ? ` · dug in ${p.dig}` : ''}</p></div><div>${readyAt(p) ? `<span class="chip ally">${readyAt(p)} ready</span>` : ''}</div></div>`; }).join('') || '<div class="hint">Nothing matches.</div>';
    }
  } else if (tab === 'industry') {
    const oi = oilIncome(pl), ou = oilUpkeep(pl), ob = oilBreakdown(pl);
    h = dh('Industry', 'Factories, fuel, steel and the world market.');
    h += kv([[iconSvg('pp') + '+' + income(pl), 'Production'], [iconSvg('mp') + '+' + mpIncome(pl) + 'k', 'Manpower'], [iconSvg('oil') + (oi - ou >= 0 ? '+' : '') + Math.round(oi - ou), 'Oil net'], [iconSvg('steel') + '+' + steelIncome(pl), 'Steel'], [owned(pl).reduce((s, i) => s + G.prov[i].fac, 0), 'Factories'], [Math.round(n.stab) + '%', 'Stability']]);
    const bl = blockaded(pl);
    const mo = oi - ou < 0 && n.oil > 0 ? Math.floor(n.oil / (ou - oi)) : null;
    h += `<div class="sect">Fuel</div><div class="row"><div><h4>${iconSvg('oil')}Oil: ${Math.round(n.oil)} in the tanks</h4><p>Income <b class="tg">+${oi}</b> · ships −${ob.navy.toFixed(1)} · aircraft −${ob.air.toFixed(1)} · tanks −${ob.arm.toFixed(1)}${ob.peace ? ' · <i>peacetime: half upkeep</i>' : ''}.
      ${n.oil <= 0 ? `<b class="tr">Empty: mechanised forces fight at ${Math.round(fuelMul(pl) * 100)}% and sealift shrinks.</b>` : mo != null ? `<b class="tr">Dry in about ${mo} month${mo === 1 ? '' : 's'}.</b>` : 'Stock is growing.'} Marching and shipping troops costs no oil — only tanks, aircraft and ships burn it. Short? Import, capture oil fields, research Synthetic Oil or decommission ships you do not need.</p></div></div>`;
    h += `<div class="sect">World market</div><div class="row"><div><h4>${iconSvg('oil')}Import oil</h4><p>3 oil for ${IMPORT_PRICE * 3} production. ${n.imports}/${IMPORT_MAX} bought this month.${bl ? ' <b class="tr">Blockaded!</b>' : ''}</p></div><div><button class="btn" data-imp="oil" ${act && !canImport(pl, 'oil') ? '' : 'disabled'}>Buy</button></div></div>
      <div class="row"><div><h4>${iconSvg('steel')}Import steel</h4><p>3 steel for ${IMPORT_PRICE * 3} production.</p></div><div><button class="btn" data-imp="steel" ${act && !canImport(pl, 'steel') ? '' : 'disabled'}>Buy</button></div></div>`;
    h += `<div class="row"><div><h4>Total War Economy</h4><p>+20% production for 12 months. Requires being at war.</p></div><div><button class="btn ${n.totalWar ? '' : 'gold'}" data-tw ${!act || n.totalWar || !enemiesOf(pl).length || n.pol < 30 ? 'disabled' : ''}>${n.totalWar ? n.totalWar + ' mo' : '30 pol'}</button></div></div>`;
    h += `<div class="sect">Home front</div><div class="hint">Stability <b>${Math.round(n.stab)}%</b> multiplies production by ${stabMul(n).toFixed(2)}. War weariness ${Math.round(n.ww || 0)} grows with your losses and drags stability down; victories, peace, propaganda and focuses lift it. Below 20% your troops defend worse and nations near collapse surrender sooner.</div>`;
    if (n.raid > 0.01) h += `<div class="hint"><b class="tr">Convoy raiding</b>: enemy submarines cost you ${Math.round(n.raid * 100)}% of production. Escort with battle squadrons in your coastal waters.</div>`;
    h += `<div class="sect">Resources you hold</div><div class="req">${owned(pl).filter(i => PROV[i].oil || PROV[i].steel).map(i => `<span class="ok">${PROV[i].oil ? iconSvg('oil') + PROV[i].oil : iconSvg('steel') + PROV[i].steel} ${esc(PROV[i].name)}</span>`).join('') || '<span>None — you depend on imports</span>'}</div>`;
    h += `<div class="hint">Fleets and convoys are under <b>High Command → Convoys</b>.</div>`;
  } else if (view === 'focus') {
    h = dh('National Focus', 'One long-term project at a time. Each completes once.');
    const list = focusFor(pl, n.major), cols = Math.max(...list.map(f => f.col)) + 1, rows = Math.max(...list.map(f => f.row)) + 1;
    h += `<div class="ftree" style="grid-template-columns:repeat(${cols},minmax(130px,1fr));grid-template-rows:repeat(${rows},auto)">`;
    for (const f of list) {
      const st = focusState(pl, f.k), active = st === 'active', done = st === 'done';
      h += `<div class="fnode ${done ? 'done' : active ? 'active' : st ? 'locked' : 'open'} ${f.who || f.minor ? 'nat' : ''}" style="grid-column:${f.col + 1};grid-row:${f.row + 1}" title="${esc(f.d + (st && st !== 'done' && st !== 'active' ? ' — ' + st : ''))}">
        ${f.req ? '<i class="link"></i>' : ''}<h5>${esc(f.n)}</h5><p>${esc(f.d)}</p>
        ${active ? `<div class="prog"><i style="width:${(1 - n.focus.left / f.m) * 100}%"></i></div><small>${n.focus.left} mo left</small>` : done ? '<small>✓ Done</small>' : `<button class="btn ${st ? '' : 'gold'}" data-focus="${f.k}" ${st || !act ? 'disabled' : ''}>${f.m} months</button>`}</div>`;
    }
    h += `</div>`;
  } else if (view === 'tech') {
    h = dh('Research', `${n.rs.length}/${n.slots} laboratories busy. Projects take months; start several at once.`);
    if (n.rs.length) h += n.rs.map(r => { const T = TECH[r.k]; return `<div class="row active"><div><h4>${esc(T.n)}</h4><p>${esc(T.d)}</p><div class="prog"><i style="width:${(1 - r.left / T.m) * 100}%"></i></div><p>${Math.ceil(r.left)} month${r.left > 1 ? 's' : ''} left</p></div><div><button class="btn" data-cres="${r.k}" ${act ? '' : 'disabled'} title="Refunds half the cost">Cancel</button></div></div>`; }).join('');
    for (const b in BRANCHES) {
      h += `<div class="sect">${BRANCHES[b]}</div>`;
      for (const T of TECHS.filter(T => T.b === b)) {
        const st = techState(pl, T.k);
        if (st === 'active') continue;
        h += `<div class="row ${st === 'done' ? 'done' : ''}"><div><h4>${esc(T.n)} <small class="yr">${T.y}</small></h4><p>${esc(T.d)}${T.req ? ` <i>Needs ${esc(TECH[T.req].n)}.</i>` : ''}</p></div>
          <div>${st === 'done' ? '<span class="chip ally">Done</span>' : `<button class="btn ${st ? '' : 'gold'}" data-tech="${T.k}" ${st || !act ? `disabled title="${esc(st)}"` : ''}>${techCost(T)}⚙ · ${T.m}mo</button>`}</div></div>`;
      }
    }
  } else if (tab === 'dip') {
    h = dh('The World', 'Alliances, wars, pacts and peace. Hover a nation to find it.');
    if (G.act) {
      const AC = ACTS[G.act.k], fk = facOf(pl), dm = G.act.doom;
      h += `<div class="act"><h5>The second act · until ${ACT_END}</h5><h4>${esc(AC.n)}</h4><p>${esc(AC.d)}</p>
        ${G.act.k !== 'exhaust' ? `<div class="doom"><span>Doomsday Clock</span>${meter(dm, DOOM_MAX, dm >= 75 ? 'bad' : '')}<b>${G.act.ww3 ? 'Midnight' : `${Math.max(1, Math.round((DOOM_MAX - dm) / 8))} min to midnight`}</b></div>` : ''}
        <p class="small">${fk ? `Your bloc: <b>${esc(G.facs[fk].n)}</b> · ${blocVP(membersOf(fk))} VP${actBlocWinner() === fk ? ' · <b class="tg">the strongest bloc (+15 score)</b>' : ''}` : 'You belong to no bloc. Found or join one to compete for the world.'}</p></div>`;
      if (fk) { const tg = sphereTargets(pl).slice(0, 5); if (tg.length) h += `<div class="sect">Bring into the bloc · ${SPHERE_COST} politics</div>` + tg.map(o => { const why = canSphere(pl, o); return `<div class="row" data-hover="${o}"><div><h4>${flagImg(o)} ${esc(natName(o))}</h4><p>${IDEO[nat(o).ide]} · ${owned(o).length} prov</p></div><div><button class="btn" data-sphere="${o}" ${why || !act ? `disabled title="${esc(why)}"` : ''}>Court</button></div></div>`; }).join(''); }
    }
    h += `<div class="sect">Alliances</div>`;
    for (const fk in G.facs) {
      const F = G.facs[fk], ms = membersOf(fk); if (!ms.length) continue;
      const mine = ms.includes(pl), why = canJoin(pl, fk);
      h += `<div class="row"><div><h4>${esc(F.n)}</h4><div class="req">${ms.map(m => `<span>${flagImg(m)} ${esc(natName(m))}${F.lead === m ? ' ★' : ''}${isHuman(m) ? ' 👤' : ''}</span>`).join('')}</div></div>
        <div>${mine ? (F.lead === pl ? '<span class="chip ally">Leader</span>' : `<button class="btn" data-leave ${act ? '' : 'disabled'}>Leave</button>`) : `<button class="btn" data-join="${fk}" ${why || !act ? `disabled title="${esc(why)}"` : ''}>Join<small>20</small></button>`}</div></div>`;
    }
    if (!facOf(pl)) h += `<div class="row"><div><h4>Found an alliance</h4><p>Lead your own bloc and invite others into it.</p></div><div><button class="btn" data-found ${act && n.pol >= 40 ? '' : 'disabled'}>40 pol</button></div></div>`;
    h += `<div class="sect">Nations</div>`;
    const nbs = new Set(); for (const i of owned(pl)) for (const j of PROV[i].adj) nbs.add(G.prov[j].o);
    const list = Object.keys(G.nat).filter(t => t !== pl && A(t) && !NATDEF[t].off).sort((a, b) => W(pl, b) - W(pl, a) || isHuman(b) - isHuman(a) || nbs.has(b) - nbs.has(a) || vpOf(b) - vpOf(a));
    for (const t of list) {
      const o = nat(t), war = W(pl, t), al = friendly(pl, t), dv = divisions(t);
      const btns = [];
      if (act) {
        if (war) {
          const ws = warScore(pl, t), cp = canOfferPeace(pl, t);
          btns.push(`<button class="btn" data-peace="${t}:white" ${cp ? `disabled title="${esc(cp)}"` : ''}>White peace</button>`);
          btns.push(`<button class="btn gold" data-peace="${t}:terms" ${cp ? `disabled title="${esc(cp)}"` : `title="Keep the ${esc(o.adj)} land you occupy"`}>Demand terms</button>`);
          btns.unshift(`<span class="ws ${ws > 0.05 ? 'good' : ws < -0.05 ? 'bad' : ''}">War score ${ws > 0 ? '+' : ''}${Math.round(ws * 100)}</span>`);
          if (facOf(pl)) { const cw = canCallToWar(pl, t), ct = callTargets(pl, t); btns.push(`<button class="btn gold" data-call="${t}" ${cw ? `disabled title="${esc(cw)}"` : `title="Ask ${esc(ct.map(natName).join(', '))} to join this war"`}>Call to war${ct.length ? ` (${ct.length})` : ''}<small>${CALL_COST}</small></button>`); }
        } else if (al) {
          btns.push(`<button class="btn" data-aid="${t}:pp" ${n.pp >= 25 ? '' : 'disabled'}>Send 25⚙</button>`);
          btns.push(`<button class="btn" data-aid="${t}:oil" ${n.oil >= 10 ? '' : 'disabled'}>10 oil</button>`);
        } else {
          const wy = canDeclare(pl, t); btns.push(`<button class="btn red" data-war="${t}" ${wy ? `disabled title="${esc(wy)}"` : ''}>War<small>${warCost(pl, t)}</small></button>`);
          const py = canPact(pl, t); if (py !== 'Unavailable') btns.push(`<button class="btn" data-pact="${t}" ${py ? `disabled title="${esc(py)}"` : 'title="Three years of non-aggression"'}>${pactWith(pl, t) ? 'Pact ✓' : 'Pact<small>25</small>'}</button>`);
          const gy = canGuarantee(pl, t); if (!o.major && !facOf(t)) btns.push(`<button class="btn" data-guar="${t}" ${gy ? `disabled title="${esc(gy)}"` : 'title="If anyone attacks them, you go to war"'}>${n.guar.includes(t) ? 'Guaranteed' : 'Guarantee<small>20</small>'}</button>`);
          const fk = facOf(pl); if (fk && G.facs[fk].lead === pl && !facOf(t)) btns.push(`<button class="btn" data-invite="${t}" ${n.pol >= 15 ? '' : 'disabled'}>Invite<small>15</small></button>`);
        }
      }
      h += `<div class="row nat" data-hover="${t}"><div><h4>${flagImg(t)} ${esc(o.name)}${isHuman(t) ? ' <span class="chip">Player</span>' : ''}</h4><p>${IDEO[o.ide]}${facOf(t) ? ' · ' + G.facs[facOf(t)].n : ''} · ${owned(t).length} prov · ~${Math.max(1, Math.round(landN(dv) / 5) * 5)} div · stab ${Math.round(o.stab)}%${nbs.has(t) ? ' · Neighbour' : ''}${pactWith(pl, t) ? ' · Pact' : ''}${truceWith(pl, t) ? ' · Truce' : ''}</p></div>
        <div class="dbtns">${war ? '<span class="chip war">At war</span>' : al ? '<span class="chip ally">Ally</span>' : ''}${btns.join('')}</div></div>`;
    }
  } else if (tab === 'intel') {
    h = dh('Intelligence', `${n.spies} agents · ${freeSpies(pl)} free this month · ${n.spyOk || 0} successful operations`);
    h += `<div class="row"><div><h4>${iconSvg('spy')}Recruit an agent</h4><p>Each agent can run one operation a month.</p></div><div><button class="btn" data-hirespy ${act && !canHireSpy(pl) ? '' : 'disabled'} title="${esc(canHireSpy(pl))}">20 pol</button></div></div>`;
    h += `<div class="sect">Operations · ${SPY_COST} politics each</div>`;
    for (const k in SPY_OPS) { const S = SPY_OPS[k], why = canSpy(pl, k); h += `<div class="row"><div><h4>${esc(S.n)} <small class="yr">${Math.round(S.p * 100)}%</small></h4><p>${esc(S.d)}</p></div><div><button class="btn ${why ? '' : 'gold'}" data-spy="${k}" ${why || !act ? `disabled title="${esc(why)}"` : ''}>Send</button></div></div>`; }
    const rev = Object.keys(n.reveal || {}); if (rev.length || n.intel) h += `<div class="sect">Current intelligence</div><div class="req">${n.intel ? `<span class="ok">All enemies visible · ${n.intel} mo</span>` : ''}${rev.map(t => `<span class="ok">${esc(natName(t))} · ${n.reveal[t]} mo</span>`).join('')}${n.counter ? `<span class="ok">Counter-intelligence · ${n.counter} mo</span>` : ''}</div>`;
    h += `<div class="sect">Operation planning</div>`;
    if (n.ops) h += `<div class="row active"><div><h4>${iconSvg('target')}Operation ${esc(n.ops.name)}</h4><p>Objectives: ${n.ops.tg.map(i => `<b class="${friendly(G.prov[i].o, pl) ? 'tg' : ''}">${esc(PROV[i].name)}</b>`).join(', ')}. ${n.ops.left} months left. Attacks on objectives get +15%; take them all for +30 politics and +6 stability.</p></div><div><button class="btn" data-cancelops ${act ? '' : 'disabled'}>Cancel</button></div></div>`;
    else h += `<div class="hint">Select an enemy province and press <b>Plan operation</b> to pick up to four objectives.</div>`;
  } else if (view === 'nation') {
    if (!SIGS[pl]) { subTab.plans = 'focus'; return renderDrawer(); }
    h = dh(SIGS[pl].n, SIGS[pl].d);
    h += sigPanel(pl, n, act);
  } else if (view === 'dec') {
    h = dh('Destiny', 'Alternate history for those who hold the right cities.');
    if (n.agendas && n.agendas.length) {
      h += `<div class="sect">Secret agendas</div>`;
      h += n.agendas.map(a => `<div class="row ${a.st === 'done' ? 'active' : a.st === 'failed' ? 'done' : ''}"><div><h4>${a.st === 'done' ? '✓ ' : a.st === 'failed' ? '✕ ' : ''}${esc(agendaText(a))}</h4><p>${a.pts * 10} points${agendaProgress(pl, a) ? ' · ' + agendaProgress(pl, a) : ''}${G.mode === 'mp' ? ' · only you can see this' : ''}</p></div></div>`).join('');
    }
    let any = false;
    h += `<div class="sect">Destiny decisions</div>`;
    for (const D of DECISIONS) {
      const st = decisionState(pl, D); if (!st) continue; any = true;
      const req = typeof D.need === 'string' ? `<div class="req"><span class="${st.ok ? 'ok' : ''}">${Math.round((st.pct || 0) * 100)}% of ${D.need} victory points</span></div>` : `<div class="req">${D.need.map((nm, k) => `<span class="${st.have && st.have[k] ? 'ok' : ''}">${esc(nm)}</span>`).join('')}</div>`;
      h += `<div class="row ${st.done ? 'done' : st.ok ? 'active' : ''}"><div><h4>${esc(D.n)}</h4><p>${esc(D.d)}</p>${st.done ? '' : req}</div><div>${st.done ? '<span class="chip ally">Enacted</span>' : `<button class="btn ${st.ok ? 'gold' : ''}" data-dec="${D.k}" ${st.ok && n.pol >= 50 && act ? '' : 'disabled'}>50 pol</button>`}</div></div>`;
    }
    if (!any) h += `<div class="hint">No destiny decisions for your nation.</div>`;
  } else if (view === 'ledger') {
    const s = n.st;
    h = dh('War Ledger', `${esc(n.name)}, ${dateStr()} · score ${scoreOf(pl)}`);
    h += kv([[s.won, 'Victories'], [s.lost, 'Defeats'], [s.caps, 'Captures'], [s.kills, 'Enemy losses'], [s.losses, 'Our losses'], [s.nav, 'Naval wins'], [medalsOf(pl).length + '/' + Object.keys(ACH).length, 'Medals'], [n.played, 'Cards played'], [scoreOf(pl), 'Score']]);
    if (G.lastSR && G.lastSR[pl]) h += `<div class="row"><div><h4>Situation report · ${esc(G.lastSR[pl].to)}</h4><p>The chief of staff briefs you every January and July.</p></div><div><button class="btn" data-sr>Read</button></div></div>`;
    h += `<div class="sect">Share of ${REALM}</div><canvas id="vpGraph" class="graph"></canvas><div class="legendrow" id="vpLegend"></div>`;
    h += `<div class="sect">Medals</div><div class="req">${Object.entries(ACH).map(([k, a]) => `<span class="${medalsOf(pl).includes(k) ? 'ok' : ''}" title="${esc(a.d)}">${medalsOf(pl).includes(k) ? '✪ ' : ''}${a.n}</span>`).join('')}</div>`;
    h += `<div class="sect">Dispatches</div>${G.log.slice(0, 50).map(l => `<div class="logline"><time>${l.d}</time>${l.txt}</div>`).join('')}`;
  }
  h += `</div>`;
  if (SUBS[tab]) { const bar = `<div class="subtabs" role="tablist">${SUBS[tab].filter(([k]) => k !== 'nation' || SIGS[pl]).map(([k, l]) => [k, k === 'nation' ? SIGS[pl].n : l]).map(([k, l]) => `<button role="tab" class="${subTab[tab] === k ? 'on' : ''}" data-sub="${k}">${l}${k === 'focus' && !n.focus ? ' <i class="sdot"></i>' : k === 'tech' && n.rs.length < n.slots ? ' <i class="sdot"></i>' : k === 'fronts' && !frontsOf(pl).length && enemiesOf(pl).length ? ' <i class="sdot"></i>' : ''}</button>`).join('')}</div>`; h = h.replace('<div class="db">', bar + '<div class="db">'); }
  el.innerHTML = h;
  el.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => { subTab[tab] = b.dataset.sub; SFX.click(); renderDrawer(); });
  wireDrawer(el, pl, n);
  if (view === 'ledger') drawVPGraph($('#vpGraph'), $('#vpLegend'));
}
function wireDrawer(el, pl, n) {
  const on = (sel, f) => el.querySelectorAll(sel).forEach(b => b.onclick = e => { f(b, e); });
  on('[data-closetab]', () => openTab(tab));
  on('[data-goto]', b => { const i = +b.dataset.goto; if (i >= 0) { select(i); centerOn(i, Math.max(cam.z, 1.3)); } });
  on('[data-zone]', b => { const z = b.dataset.zone; centerXY(SEA[z].x, SEA[z].y, Math.max(cam.z, 1)); selectFleet(z); });
  on('[data-filt]', b => { outFilter = b.dataset.filt; renderDrawer(); });
  on('[data-hire]', () => { Ctl.act({ c:'hiregen' }); SFX.fanfare(); });
  on('[data-imp]', b => { Ctl.act({ c:'import', k:b.dataset.imp }); SFX.coins(); });
  on('[data-tw]', () => { Ctl.act({ c:'totalwar' }); SFX.fanfare(); });
  on('[data-focus]', b => { Ctl.act({ c:'focus', k:b.dataset.focus }); SFX.click(); });
  on('[data-tech]', b => { Ctl.act({ c:'research', k:b.dataset.tech }); SFX.click(); });
  on('[data-cres]', b => { Ctl.act({ c:'cancelres', k:b.dataset.cres }); });
  on('[data-join]', b => { Ctl.act({ c:'join', fk:b.dataset.join }); SFX.fanfare(); });
  on('[data-leave]', () => confirmBox('Leave your alliance?', 'You will stop fighting your allies\' wars — and they will stop fighting yours.', 'Leave', () => Ctl.act({ c:'leave' })));
  on('[data-found]', () => { const name = prompt('Name your alliance', `${nat(pl).adj} Pact`); if (name) Ctl.act({ c:'found', name:name.slice(0, 32) }); });
  on('[data-war]', b => Ctl.act({ c:'declare', tag:b.dataset.war }));
  on('[data-sphere]', b => Ctl.act({ c:'sphere', tag:b.dataset.sphere }));
  on('[data-call]', b => Ctl.act({ c:'calltowar', tag:b.dataset.call }));
  on('[data-fauto]', () => { const r = Ctl.act({ c:'front', op:'auto' }); if (r && r.ok) { SFX.signal(); toast('⚑', `${r.made} front${r.made > 1 ? 's' : ''} formed`, 'Each holds its sector. Switch a front to Advance or Encircle to go on the offensive.', 'medal'); } frontGeoVer++; renderDrawer(); });
  on('[data-fnew]', () => startFrontPick(pl, null));
  on('[data-sig]', b => { const c = JSON.parse(b.dataset.sig); const go = () => { const r = Ctl.act({ c:'sig', ...c }); if (r && r.ok) { SFX.confirm(); if (r.msg) toast('⚙', SIGS[pl].n, r.msg, ''); } renderDrawer(); renderTop(); }; if (c.op === 'armistice') confirmBox('Sign the armistice?', 'Italy leaves the Axis and joins the Allies. Germany will attack at once.', 'Sign', go); else go(); });
  on('[data-sr]', () => { openTab(tab); showReport({ ...G.lastSR[pl], uid:-1 }, () => {}); });
  on('[data-fedit]', b => startFrontPick(pl, frontById(pl, +b.dataset.fedit)));
  on('[data-ford]', b => { const [id, o] = b.dataset.ford.split(':'); Ctl.act({ c:'front', op:'order', id:+id, order:o }); SFX.click(); frontGeoVer++; renderDrawer(); });
  on('[data-fpull]', b => { Ctl.act({ c:'front', op:'pull', id:+b.dataset.fpull }); SFX.click(); renderDrawer(); });
  on('[data-fdel]', b => confirmBox('Disband this front?', 'Its armies stay where they are and wait for your orders.', 'Disband', () => { Ctl.act({ c:'front', op:'disband', id:+b.dataset.fdel }); frontGeoVer++; renderDrawer(); }));
  on('[data-fname]', b => { const f = frontById(pl, +b.dataset.fname); const nm = f && prompt('Name this front', f.name); if (nm) { Ctl.act({ c:'front', op:'rename', id:f.id, name:nm }); renderDrawer(); } });
  on('[data-fshow]', b => { const f = frontById(pl, +b.dataset.fshow); if (!f) return; const L = frontLine(pl, f).length ? frontLine(pl, f) : f.z; const c = L[Math.floor(L.length / 2)]; centerOn(c, Math.max(cam.z, WORLD ? 0.9 : 1.1)); hoverFront = f.id; setTimeout(() => { hoverFront = null; }, 2500); });
  el.querySelectorAll('[data-fgen]').forEach(sl => sl.onchange = () => { Ctl.act({ c:'front', op:'general', id:+sl.dataset.fgen, gid:sl.value === '' ? null : +sl.value }); SFX.click(); renderDrawer(); });
  on('[data-unship]', b => Ctl.act({ c:'unship', id:+b.dataset.unship }));
  on('[data-pact]', b => Ctl.act({ c:'pact', tag:b.dataset.pact }));
  on('[data-guar]', b => Ctl.act({ c:'guarantee', tag:b.dataset.guar }));
  on('[data-invite]', b => Ctl.act({ c:'invite', tag:b.dataset.invite }));
  on('[data-peace]', b => { const [t, terms] = b.dataset.peace.split(':'); Ctl.act({ c:'peace', tag:t, terms }); });
  on('[data-aid]', b => { const [t, k] = b.dataset.aid.split(':'); Ctl.act({ c:'aid', to:t, kind:k, amt:k === 'pp' ? 25 : 10 }); SFX.coins(); });
  on('[data-hirespy]', () => Ctl.act({ c:'hirespy' }));
  on('[data-spy]', b => {
    const op = b.dataset.spy, S = SPY_OPS[op];
    if (S.tgt === 'none') return Ctl.act({ c:'spy', op });
    const tg = spyTargets(pl, op);
    if (S.tgt === 'prov' || S.tgt === 'occ') startPick({ kind:'spy', op, ids:tg, label:`${S.n}: choose a province` });
    else pickNation(tg, S.n, t => Ctl.act({ c:'spy', op, target:t }));
  });
  on('[data-cancelops]', () => Ctl.act({ c:'cancelops' }));
  on('[data-dec]', b => Ctl.act({ c:'decision', k:b.dataset.dec }));
  el.querySelectorAll('[data-hover]').forEach(r => {
    r.onmouseenter = () => { hoverNat = r.dataset.hover; rebuildOverlay(); };
    r.onmouseleave = () => { hoverNat = null; rebuildOverlay(); };
    const h4 = r.querySelector('h4'); h4.style.cursor = 'pointer'; h4.onclick = () => { const c = nat(r.dataset.hover).capital; centerOn(c, Math.max(cam.z, 1.1)); };
  });
}
function drawVPGraph(cvs, leg) {
  if (!cvs || !G.hist.length) return;
  const w = cvs.clientWidth || 340, h = 150; cvs.width = w * DPR; cvs.height = h * DPR; cvs.style.height = h + 'px';
  const c = cvs.getContext('2d'); c.scale(DPR, DPR);
  const tags = [...new Set([ME, ...humanTags(), ...MAJORS])].filter(t => G.nat[t]);
  const tot = totalVP(), H = G.hist, maxV = Math.max(0.2, ...H.flatMap(r => tags.map(t => (r.vp[t] || 0) / tot)));
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const y = 6 + (h - 20) * k / 4; c.beginPath(); c.moveTo(28, y); c.lineTo(w - 4, y); c.stroke(); c.fillStyle = 'rgba(200,210,214,.6)'; c.font = '10px ' + FONT_BODY; c.fillText(Math.round(maxV * (1 - k / 4) * 100) + '%', 0, y + 3); }
  const X = i => 28 + (w - 34) * (H.length > 1 ? i / (H.length - 1) : 0), Y = v => 6 + (h - 20) * (1 - v / maxV);
  for (const t of tags) {
    c.strokeStyle = natColor(t); c.lineWidth = t === ME ? 2.6 : 1.5; c.beginPath();
    H.forEach((r, i) => { const v = (r.vp[t] || 0) / tot; i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); }); c.stroke();
  }
  c.fillStyle = 'rgba(200,210,214,.6)'; c.fillText(`${MONTHS[H[0].m]} ${H[0].y}`, 28, h - 2); const last = H[H.length - 1]; const lt = `${MONTHS[last.m]} ${last.y}`; c.fillText(lt, w - 4 - c.measureText(lt).width, h - 2);
  leg.innerHTML = tags.map(t => `<span><i style="background:${natColor(t)}"></i>${esc(natName(t))}</span>`).join('');
}
