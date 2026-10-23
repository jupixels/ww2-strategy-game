'use strict';
/* ================= INBOX: newspapers, history's choices, offers ================= */
const shownUids = new Set();
let flushing = null;
function flushInbox() {
  if (flushing) return flushing;
  flushing = (async () => {
    while (G && ME && !G.over) {
      const it = inboxOf(ME).find(x => !shownUids.has(x.uid));
      if (!it || !$('#modal').hidden && !$('#modal .paper')) break;
      shownUids.add(it.uid);
      await showItem(it);
    }
  })().finally(() => { flushing = null; });
  return flushing;
}
function decisionText(it) {
  const f = it.from ? natName(it.from) : '';
  switch (it.kind) {
    case 'restore': return { head:`${natName(it.tag)} Can Be Free Again`, dek:`Our troops stand in ${PROV[it.pid].name}`, text:`The old government of ${natName(it.tag)} asks us to restore its independence. It would join our alliance and defend its own land — but we give up the provinces we hold there.`, yes:`Restore ${natName(it.tag)}`, no:'Keep the land' };
    case 'peace': return it.terms === 'white'
      ? { head:`${f} Proposes Peace`, dek:'Both sides would return to the borders before the war', text:`Envoys from ${f} arrive under a white flag. They offer an end to the fighting: every occupied province returns home, and neither side may attack the other for a year.`, yes:'Accept white peace', no:'Fight on' }
      : it.winner === ME ? { head:`${f} Sues for Peace`, dek:'They offer to cede the land we occupy', text:`${f} is beaten. Its delegates offer to sign over every province of theirs that we hold, in exchange for an end to the war.`, yes:'Accept their surrender of land', no:'Fight on to total victory' }
      : { head:`${f} Demands Our Surrender of Land`, dek:'They would keep everything they occupy', text:`${f} offers peace — on condition that every province of ours they hold becomes theirs.`, yes:'Sign the treaty', no:'Never' };
    case 'pact': return { head:`${f} Offers a Pact`, dek:'Three years of non-aggression', text:`The ${nat(it.from).adj} ambassador proposes a non-aggression pact. Breaking it later would cost stability and the trust of the world.`, yes:'Sign the pact', no:'Decline' };
    case 'demand': return { head:`${f} Issues an Ultimatum`, dek:`Hand over ${it.provs.map(i => PROV[i].name).join(' and ')}`, text:`${f} demands territory and hints at war if refused. Refusing gives them a cheap excuse to attack.`, yes:'Give in', no:'Refuse' };
    case 'invite': return { head:`An Invitation from ${f}`, dek:`Join the ${G.facs[it.fk] ? G.facs[it.fk].n : 'alliance'}`, text:`${f} invites us into its alliance. Members fight each other's defensive wars.`, yes:'Join', no:'Decline' };
  }
  return { head:'A Message', dek:'', text:'', yes:'Yes', no:'No' };
}
function showItem(it) {
  return new Promise(res => {
    const m = $('#modal'); m.hidden = false;
    let head, dek, text, opts, plate;
    if (it.type === 'event') { const e = EVENT_BY_ID[it.id]; head = e.title; dek = e.dek; text = e.text; opts = (it.side === 't' ? e.topts : e.opts).map((o, k) => ({ t:o.t, e:o.e, k })); plate = e.actor; }
    else if (it.type === 'decision') { const d = decisionText(it); head = d.head; dek = d.dek; text = d.text; opts = [{ t:d.yes, k:1 }, { t:d.no, k:0 }]; plate = it.from || it.tag || ME; }
    else { head = it.head || it.title; dek = it.dek; text = it.text; opts = null; plate = it.plate; }
    const plateId = G.nat[plate] && G.nat[plate].capital >= 0 ? G.nat[plate].capital : homeProv(ME);
    m.innerHTML = `<div class="paper" role="dialog" aria-modal="true" aria-label="${esc(head)}">
      <div class="mast"><h5>The European Dispatch</h5><span>${dateStr()}<br>${it.type === 'news' ? 'Late edition' : 'Cabinet briefing'} · 2d</span></div>
      <div class="head">${esc(head)}</div>
      ${dek ? `<p class="dek">${esc(dek)}</p>` : ''}
      <div class="plate"><canvas></canvas></div>
      <p class="copy">${esc(text || '')}</p>
      <div class="choices">${opts ? opts.map(o => `<button class="choice" data-k="${o.k}"><span>${esc(o.t)}</span><em>${esc(o.e || '')}</em></button>`).join('') : `<button class="choice" data-k="-1"><span>Continue</span><em>Turn the page</em></button>`}</div></div>`;
    requestAnimationFrame(() => { try { renderPlate(m.querySelector('.plate canvas'), plateId); } catch (err) {} });
    SFX.type();
    m.querySelectorAll('.choice').forEach(b => b.onclick = () => {
      SFX.click();
      const k = +b.dataset.k;
      m.hidden = true; m.innerHTML = '';
      Ctl.act({ c:'answer', uid:it.uid, choice:k < 0 ? 0 : k });
      res();
    });
    setTimeout(() => { const b = m.querySelector('.choice'); if (b) b.focus(); }, 60);
  });
}
$('#inboxBtn').onclick = () => { shownUids.clear(); flushInbox(); };

/* ================= REPORTS ================= */
let reportTimer = 0;
function showBattleReport(r) {
  if (!r || r.walk || r.rocket != null || r.bomb != null || r.raid) return;
  if (r.a !== ME && r.d !== ME) return;
  const el = $('#report'), mineAtk = r.a === ME;
  const row = (l, m) => `<span class="${m >= 1 ? 'up' : 'dn'}">${esc(l)} ${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%</span>`;
  const list = a => (a || []).filter(([l]) => l !== 'Troops' && l !== 'Difficulty' && l !== 'National spirit').map(([l, m]) => row(l, m)).join('') || '<span>—</span>';
  el.innerHTML = `<div class="rh"><b>${r.win ? (mineAtk ? 'Victory' : 'Defeat') : (mineAtk ? 'Repulsed' : 'Held')} at ${esc(PROV[r.tid].name)}</b><button class="ibtn" data-x aria-label="Close">✕</button></div>
    <div class="rb"><div class="side">${flagImg(r.a)} <b>${esc(natName(r.a))}</b><span>lost ${r.al}</span><div class="fac">${list(r.af)}</div></div>
    <div class="vs">${r.odds ? r.odds.toFixed(2) + ':1' : ''}</div>
    <div class="side">${flagImg(r.d)} <b>${esc(natName(r.d))}</b><span>lost ${r.dl}${r.kessel ? ` (${r.kessel} encircled)` : ''}</span><div class="fac">${list(r.df)}</div></div></div>`;
  el.hidden = false;
  el.querySelector('[data-x]').onclick = () => { el.hidden = true; };
  clearTimeout(reportTimer); reportTimer = setTimeout(() => { el.hidden = true; }, 7000);
}
function monthReport(out) {
  if (!ME || !A(ME) || !out.gained) return;
  const gained = out.gained[ME] || [], lost = out.lost[ME] || [];
  const held = out.battles.filter(r => r.d === ME && r.from && r.from.length && !r.win && !r.rocket && !r.raid).length;
  const won = out.battles.filter(r => r.a === ME && r.win).length;
  if (!gained.length && !lost.length && !held && !won) return;
  const list = a => a.slice(0, 4).map(i => PROV[i].name).join(', ') + (a.length > 4 ? ` +${a.length - 4}` : '');
  const parts = [];
  if (lost.length) parts.push('Lost ' + list(lost));
  if (gained.length) parts.push('Gained ' + list(gained));
  if (held) parts.push(`${held} attack${held > 1 ? 's' : ''} repelled`);
  toast(lost.length ? '!' : '✓', `${MONTHS_L[(G.m + 11) % 12]} report`, parts.join(' · ') + '.', lost.length ? 'war' : '', lost.length ? () => centerOn(lost[0], Math.max(cam.z, 1.2)) : null);
}

/* ================= END OF THE WAR ================= */
function showEnd() {
  const m = $('#modal'); m.hidden = false;
  const o = G.over, won = ME && o.winners.includes(ME), n = ME ? nat(ME) : null;
  const share = ME ? Math.round(vpOf(ME) / totalVP() * 100) : 0;
  const head = o.type === 'victory' ? (won ? `${n.name} Triumphant` : `${natName(o.winners[0])} Triumphant`) : o.type === 'defeat' ? (n ? `${n.name} Has Fallen` : 'The War Is Lost') : 'The Guns Fall Silent';
  const hs = humanTags().length ? humanTags() : [];
  const rows = hs.map(t => ({ t, s:scoreOf(t), ag:(nat(t).agendas || []) })).sort((a, b) => b.s - a.s);
  const multi = hs.length > 1;
  recordCareer(won, o.type);
  m.innerHTML = `<div class="paper final" role="dialog" aria-modal="true"><div class="mast"><h5>The European Dispatch</h5><span>${dateStr()}<br>Special edition</span></div>
    <div class="head">${esc(head)}</div><p class="dek">${esc(o.reason)}</p>
    ${multi ? `<table class="score"><tr><th></th><th>Nation</th><th>Europe</th><th>Agendas</th><th>Score</th></tr>${rows.map((r, i) => `<tr class="${o.winners.includes(r.t) ? 'win' : ''}"><td>${i + 1}</td><td>${flagImg(r.t)} ${esc(natName(r.t))} <small>${esc(G.humans[r.t] ? G.humans[r.t].name || '' : '')}</small></td><td>${Math.round(vpOf(r.t) / totalVP() * 100)}%</td><td>${r.ag.filter(a => a.st === 'done').length}/${r.ag.length}</td><td><b>${r.s}</b></td></tr>`).join('')}</table>`
    : n ? `<p class="copy" style="columns:1">Victories ${n.st.won}, defeats ${n.st.lost}, provinces captured ${n.st.caps}. Enemy divisions destroyed: ${n.st.kills}. Medals: ${medalsOf(ME).length} of ${Object.keys(ACH).length}. Final dominion: ${share}% of Europe. Score: <b>${scoreOf(ME)}</b>.</p>` : ''}
    ${n && n.agendas && n.agendas.length ? `<div class="agendas">${n.agendas.map(a => `<span class="${a.st}">${a.st === 'done' ? '✓' : '✕'} ${esc(agendaText(a))}</span>`).join('')}</div>` : ''}
    <div class="choices">
      <button class="choice" data-a="lapse"><span>Watch the war unfold</span><em>Timelapse of every month</em></button>
      ${o.type !== 'defeat' && !multi ? '<button class="choice" data-a="keep"><span>Keep playing</span><em>The map is still yours</em></button>' : ''}
      ${o.type === 'defeat' && !multi && ME && membersOf(facOf(ME) || '').some(t => t !== ME && A(t)) ? `<button class="choice" data-a="ally"><span>Fight on as an ally</span><em>Take command of a friendly nation</em></button>` : ''}
      <button class="choice" data-a="menu"><span>Main menu</span><em>Back to the war room</em></button></div></div>`;
  if (won) { SFX.victory(); fireworks(36); } else if (o.type === 'defeat') { SFX.defeat(); document.body.classList.add('defeated'); }
  m.querySelectorAll('.choice').forEach(b => b.onclick = () => {
    const a = b.dataset.a; m.hidden = true; m.innerHTML = ''; document.body.classList.remove('defeated');
    if (a === 'lapse') playTimelapse(() => showEnd());
    else if (a === 'keep') { G.over = false; G.flags.endless = 1; Ctl.save(); renderAll(); }
    else if (a === 'ally') { const al = membersOf(facOf(ME)).find(t => t !== ME && A(t)); G.over = false; G.humans[al] = { name:'You' }; delete G.humans[ME]; Ctl.setMe(al); Ctl.save(); renderAll(); }
    else Ctl.toMenu();
  });
}
/* ---------- career profile (local) ---------- */
function profile() { try { return JSON.parse(localStorage.getItem('idom-profile') || '{}'); } catch (e) { return {}; } }
function recordCareer(won, type) {
  if (!ME || G.flags.careerDone) return; G.flags.careerDone = 1;
  const p = profile(), n = nat(ME);
  const xp = Math.round(G.turn * 0.6 + n.st.won * 1.5 + n.st.caps + medalsOf(ME).length * 8 + (won ? 120 : 0) + (type === 'time' ? 30 : 0));
  p.xp = (p.xp || 0) + xp; p.games = (p.games || 0) + 1; if (won) p.wins = (p.wins || 0) + 1;
  p.best = Math.max(p.best || 0, scoreOf(ME));
  if (G.daily) { p.daily = p.daily || {}; p.daily[G.daily] = Math.max(p.daily[G.daily] || 0, scoreOf(ME)); }
  try { localStorage.setItem('idom-profile', JSON.stringify(p)); } catch (e) {}
  toast('★', `+${xp} career experience`, rankOf(p.xp).n + (rankOf(p.xp).next ? ` · ${rankOf(p.xp).next - p.xp} to next rank` : ''), 'medal');
}
function rankOf(xp = 0) { let r = RANKS[0], next = null; for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i][0]) { r = RANKS[i]; next = RANKS[i + 1] ? RANKS[i + 1][0] : null; } return { n:r[1], next }; }

/* ---------- timelapse ---------- */
function playTimelapse(done) {
  const tags = Object.keys(NATDEF), H = G.hist; if (!H.length) { done && done(); return; }
  const bar = $('#lapse'); bar.hidden = false;
  clearSelection(); const savedCam = { ...cam };
  centerXY(WW * 0.5, WH * 0.45, Math.max(VW / WW, VH / WH) * 1.05);
  let i = 0, stop = false;
  bar.querySelector('button').onclick = () => { stop = true; };
  const step = () => {
    if (stop || i >= H.length) { timelapseOwners = null; ownersDirty = true; fogKey = ''; wxKey = ''; markDirty(true); bar.hidden = true; Object.assign(cam, savedCam); done && done(); return; }
    const f = H[i++]; timelapseOwners = [...f.o].map(ch => tags[ch.charCodeAt(0) - 48]);
    bar.querySelector('b').textContent = `${MONTHS_L[f.m]} ${f.y}`;
    ownersDirty = true; staticDirty = true;
    setTimeout(step, H.length > 100 ? 110 : 220);
  };
  step();
}

/* ================= FIELD MANUAL ================= */
const TIPS = [
  'Attack with odds above <b>1.3:1</b> — hover a target to see the odds and every factor behind them.',
  '<b>Shift-click</b> several provinces to attack one target from all sides at once.',
  'Surround enemies before you strike: defenders with no friendly province behind them are <b>destroyed</b>.',
  'Armies far from a depot (capital, home city, or a big city held for six months) lose punch. Watch the supply truck on counters.',
  'Artillery shreds forts. Mountain troops own the hills. Armor is king on the plains but burns oil and stalls in mud.',
  'Fighters within range decide <b>air superiority</b> — worth up to ±30% in every battle.',
  'Never attack Russia or Finland in winter unless you are Russian or Finnish: attackers lose 35% and freeze.',
  'Control the sea: landings and sea supply need waters the enemy does not control. Submarines strangle island economies.',
  'One <b>strategy card</b> a month. Save Blitzkrieg for the big push and Scorched Earth for the retreat.',
  'Low stability cuts production and makes you surrender sooner. Win battles, make peace, or play propaganda.',
  'Spies can map an enemy army, sabotage factories, steal tech or stage coups in neutral countries.',
  'Losing? Offer peace from the World panel. Winning? Demand terms and keep what you hold.',
];
function showHelp() {
  if (!G || !$('#modal').hidden) return;
  const m = $('#modal'); m.hidden = false;
  const keys = [[['W','A','S','D'], 'Pan (arrows work too)'], [['Shift'], 'Hold to pan faster'], [['Wheel','Q','E'], 'Zoom'], [['Click'], 'Select a province or fleet, then a highlighted target'], [['Shift','Click'], 'Add provinces to the selection'], [['Right-click'], 'Send the selected army'], [['Space'], 'End the month / ready'], [['N'], 'Next army with orders'], [['C'], 'Centre on your capital'], [['M'], 'Cycle map mode: political, supply, resistance'], [['1','–','8'], 'Command panels'], [['Esc'], 'Close or deselect'], [['H'], 'This manual']];
  m.innerHTML = `<div class="helpcard" role="dialog" aria-modal="true" aria-label="Field manual">
    <div class="hh"><h2>Field Manual</h2><button class="ibtn" data-close aria-label="Close">✕</button></div>
    <div class="hb">
      <div><div class="sect">Controls</div><dl class="keys">${keys.map(([k, d]) => `<dt>${k.map(x => x === '–' ? '–' : `<kbd>${esc(x)}</kbd>`).join('')}</dt><dd>${d}</dd>`).join('')}</dl>
      <div class="sect">Sound</div><div class="vol"><label>Effects <input type="range" min="0" max="1" step="0.05" value="${SFX.vol.sfx}" data-vol="sfx"></label><label>Music <input type="range" min="0" max="1" step="0.05" value="${SFX.vol.music}" data-vol="music"></label></div></div>
      <div><div class="sect">How a month works</div><ol class="steps"><li>Move and attack with the divisions that still have a gold dot.</li><li>Spend production on divisions, aircraft, ships, factories and research; keep a National Focus running.</li><li>Play a strategy card, send spies, plan an operation.</li><li>Press End Month. Every other nation acts, fleets clash, supply and stability update, and history arrives by newspaper.</li></ol>
      <div class="sect">Tips</div><ul class="tips">${TIPS.map(t => `<li>${t}</li>`).join('')}</ul></div>
    </div>
    <div class="hf"><button class="btn" data-tut>Replay the tutorial</button><button class="btn gold" data-close>Back to the war</button></div></div>`;
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-vol]').forEach(r => r.oninput = () => SFX.setVol(r.dataset.vol, +r.value));
  m.querySelector('[data-tut]').onclick = () => { closeModal(); Ctl.save(); startTutorial(); };
  m.onclick = e => { if (e.target === m) closeModal(); };
}
