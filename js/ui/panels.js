'use strict';
/* ================= COMMAND PANELS ================= */
let outFilter = 'ready';
function openTab(t) {
  tab = tab === t ? null : t;
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  hoverNat = null; rebuildOverlay(); staticDirty = true;
  renderDrawer(); SFX.click();
}
const dh = (title, sub) => `<div class="dh"><div><h2>${title}</h2><p>${sub}</p></div><button class="ibtn" data-closetab aria-label="Close">✕</button></div><div class="db">`;
const kv = items => `<div class="kv">${items.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
function renderDrawer() {
  const el = $('#drawer');
  if (!G || !tab || !ME || !A(ME)) { el.hidden = true; return; }
  el.hidden = false;
  const pl = ME, n = nat(pl), act = Ctl.canAct();
  let h = '';
  if (tab === 'army') {
    const d = divisions(pl), air = airOf(pl), navy = navyOf(pl);
    let ready = 0; for (const p of G.prov) if (p.o === pl) ready += readyAt(p);
    h = dh('High Command', 'Every army, airfield and general under your command.');
    h += kv([[iconSvg('inf') + d.inf, 'Infantry'], [iconSvg('art', 'art') + d.art, 'Artillery'], [iconSvg('arm', 'arm') + d.arm, 'Armor'], [iconSvg('mtn', 'mtn') + d.mtn, 'Mountain'], [iconSvg('par', 'par') + d.par, 'Airborne'], [ready, 'Ready'], [iconSvg('ftr') + air.ftr, 'Fighters'], [iconSvg('bmb') + air.bmb, 'Bombers'], [iconSvg('cap') + navy.cap + ' · ' + navy.sub, 'Ships · subs']]);
    // generals
    const gens = G.gens.filter(g => g.tag === pl), why = canHire(pl);
    h += `<div class="sect">Generals · ${gens.length}/${n.genSlots}</div>`;
    h += gens.map(g => `<div class="row" data-goto="${g.pid}"><div><h4>${iconSvg('gen')}${esc(g.name)} <span class="lv">${'★'.repeat(g.lv)}</span></h4><p>${TRAITS[g.tr].n} — ${TRAITS[g.tr].d} At <b>${esc(PROV[g.pid] ? PROV[g.pid].name : '—')}</b>.</p></div></div>`).join('') || '<div class="hint">No generals yet. A general leads the army in his province and earns promotions by winning.</div>';
    const ros = rosterFor(pl);
    if (act && gens.length < n.genSlots) h += `<div class="row"><div><h4>Appoint a general</h4><p>${ros.length ? ros.map(r => `${esc(r[0])} (${TRAITS[r[1]].n})`).slice(0, 3).join(', ') : 'A capable officer from the ranks'} — posted to your biggest army.</p></div><div><button class="btn gold" data-hire ${why ? `disabled title="${esc(why)}"` : ''}>25 pol</button></div></div>`;
    // outliner
    h += `<div class="sect">Armies</div><div class="seg filt">${[['ready','Ready'],['front','At the front'],['sup','Low supply'],['all','All']].map(([k, l]) => `<button class="${outFilter === k ? 'on' : ''}" data-filt="${k}">${l}</button>`).join('')}</div>`;
    const stacks = owned(pl).filter(i => unitsAt(G.prov[i])).filter(i => {
      const p = G.prov[i];
      if (outFilter === 'ready') return readyAt(p) > 0;
      if (outFilter === 'front') return PROV[i].adj.some(j => W(pl, G.prov[j].o));
      if (outFilter === 'sup') return p.sup < 1;
      return true;
    }).sort((a, b) => unitsAt(G.prov[b]) - unitsAt(G.prov[a]));
    h += stacks.slice(0, 60).map(i => { const p = G.prov[i], g = genAt(i, pl); return `<div class="row orow" data-goto="${i}"><div><h4>${esc(PROV[i].name)}${g ? ' ' + iconSvg('gen') : ''}</h4><p class="ounits">${LAND.filter(k => p.u[k]).map(k => iconSvg(k, k) + p.u[k]).join(' ')}${p.sup < 1 ? ` · <span class="tr">supply ${Math.round(p.sup * 100)}%</span>` : ''}${p.dig ? ` · dug in ${p.dig}` : ''}</p></div><div>${readyAt(p) ? `<span class="chip ally">${readyAt(p)} ready</span>` : ''}</div></div>`; }).join('') || '<div class="hint">Nothing matches.</div>';
    h += `<div class="sect">Field manual</div><div class="hint">Select a province, then click a highlighted neighbour. <b>Shift-click</b> several of your provinces to strike one target together. Defenders with nowhere to retreat are <b>encircled and destroyed</b>. Armies far from depots lose strength — watch the supply truck.</div>`;
  } else if (tab === 'industry') {
    const oi = oilIncome(pl), ou = oilUpkeep(pl);
    h = dh('Industry', 'Factories, fuel, steel and the world market.');
    h += kv([[iconSvg('pp') + '+' + income(pl), 'Production'], [iconSvg('mp') + '+' + mpIncome(pl) + 'k', 'Manpower'], [iconSvg('oil') + (oi - ou >= 0 ? '+' : '') + Math.round(oi - ou), 'Oil net'], [iconSvg('steel') + '+' + steelIncome(pl), 'Steel'], [owned(pl).reduce((s, i) => s + G.prov[i].fac, 0), 'Factories'], [Math.round(n.stab) + '%', 'Stability']]);
    const bl = blockaded(pl);
    h += `<div class="sect">World market</div><div class="row"><div><h4>${iconSvg('oil')}Import oil</h4><p>3 oil for ${IMPORT_PRICE * 3} production. ${n.imports}/${IMPORT_MAX} bought this month.${bl ? ' <b class="tr">Blockaded!</b>' : ''}</p></div><div><button class="btn" data-imp="oil" ${act && !canImport(pl, 'oil') ? '' : 'disabled'}>Buy</button></div></div>
      <div class="row"><div><h4>${iconSvg('steel')}Import steel</h4><p>3 steel for ${IMPORT_PRICE * 3} production.</p></div><div><button class="btn" data-imp="steel" ${act && !canImport(pl, 'steel') ? '' : 'disabled'}>Buy</button></div></div>`;
    h += `<div class="row"><div><h4>Total War Economy</h4><p>+20% production for 12 months. Requires being at war.</p></div><div><button class="btn ${n.totalWar ? '' : 'gold'}" data-tw ${!act || n.totalWar || !enemiesOf(pl).length || n.pol < 30 ? 'disabled' : ''}>${n.totalWar ? n.totalWar + ' mo' : '30 pol'}</button></div></div>`;
    h += `<div class="sect">Home front</div><div class="hint">Stability <b>${Math.round(n.stab)}%</b> multiplies production by ${stabMul(n).toFixed(2)}. War weariness ${Math.round(n.ww || 0)} grows with your losses and drags stability down; victories, peace, propaganda and focuses lift it. Below 20% your troops defend worse and nations near collapse surrender sooner.</div>`;
    if (n.raid > 0.01) h += `<div class="hint"><b class="tr">Convoy raiding</b>: enemy submarines cost you ${Math.round(n.raid * 100)}% of production. Escort with battle squadrons in your coastal waters.</div>`;
    h += `<div class="sect">Resources you hold</div><div class="req">${owned(pl).filter(i => PROV[i].oil || PROV[i].steel).map(i => `<span class="ok">${PROV[i].oil ? iconSvg('oil') + PROV[i].oil : iconSvg('steel') + PROV[i].steel} ${esc(PROV[i].name)}</span>`).join('') || '<span>None — you depend on imports</span>'}</div>`;
    h += `<div class="sect">Fleets</div>`;
    const fl = Object.keys(G.fleet).filter(z => G.fleet[z][pl]);
    h += fl.map(z => { const f = G.fleet[z][pl]; return `<div class="row" data-zone="${z}"><div><h4>${iconSvg('anchor')}${esc(SEA[z].n)}</h4><p>${f.cap} battle squadrons · ${f.sub} submarines · ${{ free:'open water', ours:'we control it', contested:'contested', enemy:'enemy waters' }[seaControl(z, pl)]}</p></div><div>${f.mv ? '' : '<span class="chip ally">ready</span>'}</div></div>`; }).join('') || '<div class="hint">No navy. Build battle squadrons or submarines in a coastal home province.</div>';
  } else if (tab === 'focus') {
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
  } else if (tab === 'tech') {
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
  } else if (tab === 'dec') {
    h = dh('Destiny', 'Alternate history for those who hold the right cities.');
    if (n.agendas && n.agendas.length) {
      h += `<div class="sect">Secret agendas</div>`;
      h += n.agendas.map(a => `<div class="row ${a.st === 'done' ? 'active' : a.st === 'failed' ? 'done' : ''}"><div><h4>${a.st === 'done' ? '✓ ' : a.st === 'failed' ? '✕ ' : ''}${esc(agendaText(a))}</h4><p>${a.pts * 10} points${agendaProgress(pl, a) ? ' · ' + agendaProgress(pl, a) : ''}${G.mode === 'mp' ? ' · only you can see this' : ''}</p></div></div>`).join('');
    }
    let any = false;
    h += `<div class="sect">Destiny decisions</div>`;
    for (const D of DECISIONS) {
      const st = decisionState(pl, D); if (!st) continue; any = true;
      const req = D.need === '60%' ? `<div class="req"><span class="${st.ok ? 'ok' : ''}">${Math.round((st.pct || 0) * 100)}% of 60% victory points</span></div>` : `<div class="req">${D.need.map((nm, k) => `<span class="${st.have && st.have[k] ? 'ok' : ''}">${esc(nm)}</span>`).join('')}</div>`;
      h += `<div class="row ${st.done ? 'done' : st.ok ? 'active' : ''}"><div><h4>${esc(D.n)}</h4><p>${esc(D.d)}</p>${st.done ? '' : req}</div><div>${st.done ? '<span class="chip ally">Enacted</span>' : `<button class="btn ${st.ok ? 'gold' : ''}" data-dec="${D.k}" ${st.ok && n.pol >= 50 && act ? '' : 'disabled'}>50 pol</button>`}</div></div>`;
    }
    if (!any) h += `<div class="hint">No destiny decisions for your nation.</div>`;
  } else if (tab === 'log') {
    const s = n.st;
    h = dh('War Ledger', `${esc(n.name)}, ${dateStr()} · score ${scoreOf(pl)}`);
    h += kv([[s.won, 'Victories'], [s.lost, 'Defeats'], [s.caps, 'Captures'], [s.kills, 'Enemy losses'], [s.losses, 'Our losses'], [s.nav, 'Naval wins'], [medalsOf(pl).length + '/' + Object.keys(ACH).length, 'Medals'], [n.played, 'Cards played'], [scoreOf(pl), 'Score']]);
    h += `<div class="sect">Share of Europe</div><canvas id="vpGraph" class="graph"></canvas><div class="legendrow" id="vpLegend"></div>`;
    h += `<div class="sect">Medals</div><div class="req">${Object.entries(ACH).map(([k, a]) => `<span class="${medalsOf(pl).includes(k) ? 'ok' : ''}" title="${esc(a.d)}">${medalsOf(pl).includes(k) ? '✪ ' : ''}${a.n}</span>`).join('')}</div>`;
    h += `<div class="sect">Dispatches</div>${G.log.slice(0, 50).map(l => `<div class="logline"><time>${l.d}</time>${l.txt}</div>`).join('')}`;
  }
  h += `</div>`;
  el.innerHTML = h;
  wireDrawer(el, pl, n);
  if (tab === 'log') drawVPGraph($('#vpGraph'), $('#vpLegend'));
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
