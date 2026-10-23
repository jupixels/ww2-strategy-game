'use strict';
/* ================= TUTORIAL ================= */
const TUT = [
  { h:'Welcome, Commander', b:'This drill teaches the basics with <b>Germany</b> in January 1936. Follow the gold ring — each step finishes when you do it. Skip whenever you like.', next:'Begin' },
  { h:'Look around', b:'Pan with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or drag the map. Zoom with the wheel or <kbd>Q</kbd> / <kbd>E</kbd>. On a phone, drag and pinch.', done:() => camMovedTotal > 600, next:'Next' },
  { h:'Your treasury', b:'<b>Production</b> builds everything. <b>Manpower</b> fills divisions. <b>Politics</b> buys wars, pacts and cards. <b>Oil</b> fuels tanks, planes and ships — run dry and they fight at 60%. <b>Steel</b> builds heavy kit. <b>Stability</b> multiplies your output.', el:'#top .res', next:'Next' },
  { h:'Select Munich', b:'Click <b>Munich</b> in southern Germany — it is under the gold ring.', prov:'Munich', enter() { if (tab) openTab(tab); centerOn(ID['Munich'], 1.5); }, done:() => sel && sel.id === ID['Munich'] },
  { h:'The province dossier', b:'Terrain, victory points, industry, forts, supply and the divisions stationed here. A gold dot on a counter means those troops can still act this month.', el:'#card', next:'Next' },
  { h:'Raise a division', b:'Press <b>Infantry</b> under "Raise forces here". Hold <kbd>Shift</kbd> to raise five. New troops can act from next month.', el:'#card [data-build="inf"]', done:() => G.tut.recruited, enter() { if (!sel || sel.id !== ID['Munich']) select(ID['Munich']); } },
  { h:'Move your troops', b:'With Munich selected, your neighbouring provinces glow <span class="tg">green</span>. Click one to march there. <b>All / Half / One</b> sets how many go.', prov:'Nuremberg', done:() => G.tut.moved },
  { h:'Pick a fight', b:'Austria is small and alone. Open the <b>World</b> panel and press <b>War</b> beside Austria. Democracies pay more politics to start wars until world tension passes 50%.', el:'.tab[data-tab="dip"]', done:() => W('GER', 'AUS') },
  { h:'Attack!', b:'Select a German province touching Austria — <b>Munich</b> has troops — then click a <span class="tr">red</span> province. Hover first: the tooltip shows the odds and every factor behind them. Above 1.3:1 is a good bet. <kbd>Shift</kbd>-click more of your provinces to attack together.', prov:'Innsbruck', enter() { if (tab) openTab(tab); const m = G.prov[ID['Munich']]; if (m.o === 'GER' && readyAt(m) < 3) { m.u.inf += 4; m.r.inf += 4; addFloat(ID['Munich'], '+4 reinforcements', '#f0cd7f'); markDirty(false); } select(ID['Munich']); centerOn(ID['Munich'], 1.4); }, done:() => G.tut.attacked },
  { h:'Strategy cards', b:'Your hand sits at the bottom of the screen. Each month you draw a card and may play one: surprise attacks, scorched earth, codebreakers, convoys. Click a card to read it.', el:'#hand', next:'Next' },
  { h:'National Focus', b:'Open <b>Focus</b> and start a project. The tree has a shared trunk and a branch only your nation can take. Always keep one running.', el:'.tab[data-tab="focus"]', done:() => !!nat(ME).focus },
  { h:'Research', b:'Open <b>Research</b> and start a project. Laboratories work in parallel and each project takes months. Rockets, radar, jets — and in 1944, the Bomb.', el:'.tab[data-tab="tech"]', done:() => nat(ME).rs.length > 0 },
  { h:'End the month', b:'Press <b>End Month</b> or <kbd>Space</kbd>. Every other nation moves, fleets clash at sea, supply and stability update, and your troops are ready again.', el:'#endTurn', enter() { if (tab) openTab(tab); }, done:() => G.turn >= 1 },
  { h:'More to explore', b:'<b>Industry</b>: oil, steel, the world market and your fleets. <b>Intel</b>: spies and operations. <b>Destiny</b>: secret agendas and alternate history. Press <kbd>M</kbd> to see the supply map.', next:'Next' },
  { h:'You have the basics', b:'<ul class="tips">' + TIPS.slice(0, 5).map(t => `<li>${t}</li>`).join('') + '</ul>Finish Austria, then decide what kind of Germany you lead. Press <kbd>H</kbd> any time for the field manual.', next:'Finish' },
];
function startTutorial() {
  startGame({ humans:{ GER:{ name:'You' } }, diff:'easy', scenario:1936, mode:'sp', seed:1936 });
  G.tutGame = true; G.tut = { i:0 };
  const m = G.prov[ID['Munich']]; m.u.inf = Math.max(m.u.inf, 6); m.u.arm = Math.max(m.u.arm, 1); m.r = { ...m.u };
  G.inbox.GER = []; shownUids.clear();
  camMovedTotal = 0;
  tutShow();
}
function tutShow() {
  const el = $('#tut');
  if (!G || !G.tut) { el.hidden = true; return; }
  const s = TUT[G.tut.i]; if (!s) { el.hidden = true; return; }
  el.hidden = false;
  el.querySelector('.tstep').textContent = `Tutorial · ${G.tut.i + 1} of ${TUT.length}`;
  el.querySelector('h4').textContent = s.h;
  el.querySelector('.tbody').innerHTML = s.b;
  el.querySelector('.tprog i').style.width = ((G.tut.i) / (TUT.length - 1) * 100) + '%';
  const nb = el.querySelector('[data-tnext]');
  nb.hidden = !s.next; nb.textContent = s.next || '';
  nb.classList.toggle('gold', !s.done);
  el.querySelector('.twait').hidden = !s.done;
  if (s.enter) { try { s.enter(); } catch (e) {} }
  tutRingKey = '';
}
function tutAdvance() {
  if (!G || !G.tut) return;
  G.tut.i++;
  SFX.medal();
  if (G.tut.i >= TUT.length) { G.tut = null; $('#tut').hidden = true; $('#tutRing').hidden = true; toast('✪', 'Tutorial complete', 'The war is yours to win. Press H for the field manual.', 'medal'); Ctl.save(); return; }
  tutShow(); Ctl.save();
}
let tutRingKey = '';
function tutTick() {
  const ring = $('#tutRing');
  if (!G || !G.tut || !$('#start').hidden) { if (!ring.hidden) ring.hidden = true; return; }
  const s = TUT[G.tut.i]; if (!s) return;
  if (s.done && $('#modal').hidden) { let ok = false; try { ok = s.done(); } catch (e) {} if (ok) { tutAdvance(); return; } }
  let r = null;
  if (s.el) { const t = document.querySelector(s.el); if (t && t.offsetParent !== null) { const b = t.getBoundingClientRect(); if (b.width) r = [b.left - 6, b.top - 6, b.width + 12, b.height + 12, 12]; } }
  else if (s.prov && ID[s.prov] != null) { const [x, y] = w2s(PROV[ID[s.prov]].x, PROV[ID[s.prov]].y); r = [x - 30, y - 30, 60, 60, 30]; }
  const key = r ? r.map(v => Math.round(v)).join(',') : 'none';
  if (key === tutRingKey) return; tutRingKey = key;
  if (!r) { ring.hidden = true; return; }
  ring.hidden = false;
  Object.assign(ring.style, { transform:`translate(${r[0]}px,${r[1]}px)`, width:r[2] + 'px', height:r[3] + 'px', borderRadius:r[4] + 'px' });
}
$('#tut [data-tnext]').onclick = () => tutAdvance();
$('#tut [data-tskip]').onclick = () => { if (G) { G.tut = null; Ctl.save(); } $('#tut').hidden = true; $('#tutRing').hidden = true; toast('?', 'Tutorial skipped', 'Press H any time for controls and tips.', ''); };
