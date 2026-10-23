'use strict';
/* ================= TUTORIAL ================= */
const TUT = [
  { h:'Welcome, Commander', b:'This drill teaches you to command <b>Germany</b> in January 1936 — armies, air power, the navy, cards, spies and the home front. Follow the gold ring: each step finishes when you do it. Skip whenever you like.', next:'Begin' },
  { h:'Look around', b:'Pan with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or drag the map. Zoom with the wheel or <kbd>Q</kbd> / <kbd>E</kbd>. On a phone, drag and pinch.', done:() => camMovedTotal > 600, next:'Next' },
  { h:'Your treasury', b:'<b>Production</b> builds everything. <b>Manpower</b> fills divisions. <b>Politics</b> buys wars, pacts, cards and spies. <b>Oil</b> fuels tanks, planes and ships — run dry and they fight at 60%. <b>Steel</b> builds heavy equipment. <b>Stability</b> multiplies your output and falls as war weariness grows.', el:'#top .res', next:'Next' },
  { h:'Select Munich', b:'Click <b>Munich</b> in southern Germany — it is under the gold ring.', prov:'Munich', enter() { if (tab) openTab(tab); centerOn(ID['Munich'], 1.5); }, done:() => sel && sel.id === ID['Munich'] },
  { h:'The province dossier', b:'Terrain, victory points, industry and forts, the <b>supply</b> line, and every division stationed here by type: infantry, artillery, mountain troops, armor, paratroopers. A gold dot on a counter means those troops can still act this month.', el:'#card', next:'Next' },
  { h:'Raise a division', b:'Under <b>Raise forces here</b>, press <b>Infantry</b>. Hold <kbd>Shift</kbd> to raise five. Artillery cracks forts, armor rules the plains, aircraft need a city, ships need a coastal home port. New troops can act next month.', el:'#card [data-build="inf"]', done:() => G.tut.recruited, enter() { if (!sel || sel.id !== ID['Munich']) select(ID['Munich']); } },
  { h:'Move your troops', b:'With Munich selected, neighbouring provinces glow <span class="tg">green</span>. Click one to march there. <b>All / Half / One</b> sets how many go. Troops that stay put dig in and defend better each month.', prov:'Nuremberg', done:() => G.tut.moved },
  { h:'Pick a fight', b:'Austria is small and alone. Open the <b>World</b> panel and press <b>War</b> beside Austria. The same panel offers pacts, guarantees, alliances — and peace treaties once you are at war.', el:'.tab[data-tab="dip"]', done:() => W('GER', 'AUS') },
  { h:'Attack!', b:'Select a German province touching Austria — <b>Munich</b> has troops — then click a <span class="tr">red</span> province. Hover first: the tooltip shows the odds and <b>every factor</b> behind them (terrain, forts, air, supply, generals). Above 1.3:1 is a good bet. <kbd>Shift</kbd>-click more of your provinces to strike together.', prov:'Innsbruck', enter() { if (tab) openTab(tab); const m = G.prov[ID['Munich']]; if (m.o === 'GER' && readyAt(m) < 3) { m.u.inf += 4; m.r.inf += 4; addFloat(ID['Munich'], '+4 reinforcements', '#f0cd7f'); markDirty(false); } select(ID['Munich']); centerOn(ID['Munich'], 1.4); }, done:() => G.tut.attacked },
  { h:'Supply lines', b:'Armies draw supply from your capital, home cities and ports. Push too far and they weaken; get cut off and they starve. Press <kbd>M</kbd> (or the ◐ button) for the <b>supply map</b>. Press it again later for resistance in occupied land.', el:'#zMode', done:() => mapMode === 'sup', next:'Next' },
  { h:'Generals', b:'Open <b>Army</b> and press <b>Appoint a general</b>. Guderian, Rommel, Zhukov… each has a trait, leads the army in his province, and earns promotions by winning. The panel also lists every army, filterable by ready, front line or low supply.', el:'.tab[data-tab="army"]', enter() { if (mapMode !== 'pol') cycleMapMode(); }, done:() => G.gens.some(g => g.tag === 'GER') },
  { h:'Air power', b:'Berlin\'s airfield holds fighters and bombers. Fighters within range win <b>air superiority</b> — up to ±30% in every battle. Bombers support attacks and raid factories. With Berlin selected, press <b>Bomb raid</b> and pick an enemy province (if Austria has already surrendered, just read on).', prov:'Berlin', next:'Next', enter() { if (tab) openTab(tab); select(ID['Berlin']); centerOn(ID['Berlin'], 1.3); }, done:() => G.tut.raided },
  { h:'The navy', b:'Fleets fight for control of the sea zones. Control decides naval landings, sea supply and convoys; submarines strangle enemy trade. Click the German fleet in the <b>North Sea</b>, then a ringed neighbouring zone to sail.', next:'Next', enter() { clearSelection(); centerXY(SEA.NSE.x, SEA.NSE.y, 1.3); }, done:() => G.tut.sailed },
  { h:'Strategy cards', b:'Your hand sits at the bottom of the screen. You draw a card each month and may play one: Blitzkrieg, Scorched Earth, Codebreakers, Lend-Lease convoys… Click a card and play it.', el:'#hand', next:'Next', done:() => nat('GER').played > 0 },
  { h:'Spies', b:'Open <b>Intel</b>. Agents map enemy armies, sabotage factories, steal technology and stage coups. Send one to <b>Map their army</b> on any rival — France, say. The same panel tracks your <b>operations</b>: pick objectives on an enemy province to get +15% attacking them.', el:'.tab[data-tab="intel"]', next:'Next', done:() => G.tut.spied },
  { h:'National Focus', b:'Open <b>Focus</b> and start a project. The tree has a shared trunk and a branch only Germany can take. Always keep one running.', el:'.tab[data-tab="focus"]', done:() => !!nat('GER').focus },
  { h:'Research', b:'Open <b>Research</b> and start a project. Laboratories work in parallel and each project takes months: tanks, radar, jets, synthetic oil — and in 1944, the Bomb.', el:'.tab[data-tab="tech"]', done:() => nat('GER').rs.length > 0 },
  { h:'Industry and the home front', b:'Open <b>Industry</b>: your oil and steel income, the world market for imports, Total War, convoy losses and your fleets. Keep stability up — low stability cuts production and makes nations surrender sooner.', el:'.tab[data-tab="industry"]', done:() => tab === 'industry', next:'Next' },
  { h:'End the month', b:'Press <b>End Month</b> or <kbd>Space</kbd>. Every other nation moves, fleets clash, supply and stability update, and you draw a new card.', el:'#endTurn', enter() { if (tab) openTab(tab); }, done:() => G.turn >= 1 },
  { h:'History by newspaper', b:'Crises arrive as front pages, often with a choice; enemies may send peace offers or ultimatums the same way. Open <b>Destiny</b> to see your <b>secret agendas</b> — bonus objectives that score at the end — and alternate-history decisions.', el:'.tab[data-tab="dec"]', next:'Next' },
  { h:'You have the basics', b:'<ul class="tips">' + TIPS.slice(0, 5).map(t => `<li>${t}</li>`).join('') + '</ul>When you are ready, try other start dates, <b>hot-seat</b> with friends, an <b>online room</b>, or the <b>daily challenge</b>. Press <kbd>H</kbd> any time for the field manual.', next:'Finish' },
];
function startTutorial() {
  startGame({ humans:{ GER:{ name:'You' } }, diff:'easy', scenario:1936, mode:'sp', seed:1936, noIntro:true });
  G.tutGame = true; G.tut = { i:0 }; nat('GER').pol += 120;
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
