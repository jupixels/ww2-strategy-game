'use strict';
/* ================= GAME CONTROLLER =================
   mode: 'sp' single player · 'hot' hot-seat on one device · 'host' / 'client' online · 'watch' spectating.
   Every action goes through Ctl.act(command): run locally (sp, hot, host) or sent to the host (client). */
const SAVE_KEY = 'iron-dominion-v4';
const Ctl = {
  mode:'sp',
  canAct() {
    if (!G || G.preview || !ME || !A(ME) || G.over || busy) return false;
    if (this.mode === 'watch') return false;
    if (this.mode === 'hot' && G.hs !== ME) return false;
    if ((this.mode === 'host' || this.mode === 'client') && G.ready && G.ready[ME]) return false;
    return true;
  },
  queueMode() { return this.mode === 'host' || this.mode === 'client' ? 'queue' : 'instant'; },
  act(c) {
    if (!this.canAct() && c.c !== 'answer') return null;
    if (this.mode === 'client') { Net.send({ t:'cmd', c }); return null; }
    const r = doCommand(ME, c, this.queueMode());
    this.after(c, r);
    if (this.mode === 'host') Net.pushState();
    return r;
  },
  after(c, r) {
    if (!r) return;
    if (!r.ok && r.why) { toast('✕', r.why, '', ''); SFX.error(); }
    if (c.c === 'declare' && r.ok) SFX.stinger();
    if (c.c === 'answer' && r.ok) SFX.confirm();
    if (r.queued) { toast('➶', `Attack on ${PROV[r.queued.to].name} planned`, 'It goes in when the month ends. Click the arrow\'s source to change orders.', ''); SFX.radio(); }
    if (r.result) { const t = c.tag; const msg = { accepted:'Accepted!', refused:'Refused.', sent:'Proposal sent — awaiting their answer.' }[r.result]; toast(r.result === 'refused' ? '✕' : '✓', `${natName(t)}: ${msg}`, '', r.result === 'accepted' ? 'medal' : ''); }
    if (r.spy) toast(r.spy.ok ? '✓' : '✕', r.spy.ok ? 'Operation succeeded' : 'Operation failed', r.spy.msg, r.spy.ok ? 'medal' : 'war');
    if (c.c === 'card' && r.ok) { SFX.card(); toast(CARDS[c.k].ic, `${CARDS[c.k].n} played`, CARDS[c.k].d, ''); }
    if (c.c === 'fleet' && r.ok) SFX.ship();
    if (G.tut) { if (r.raid) G.tut.raided = 1; if (c.c === 'fleet' && r.ok) G.tut.sailed = 1; if (c.c === 'spy' && r.ok) G.tut.spied = 1; }
    if (r.raid) { animBattle({ tid:c.to, from:[c.from], a:ME, d:G.prov[c.to].o, raid:r.raid }); SFX.plane(); }
    if (c.c === 'research' && r.ok) SFX.click();
    if (c.c === 'ops' && r.ok) { const n = nat(ME); toast('⌖', `Operation ${n.ops.name}`, `Objectives: ${n.ops.tg.map(i => PROV[i].name).join(', ')}. Four months to take them.`, 'medal'); SFX.radio(); }
    if (r.ok && (c.c === 'move' || c.c === 'attack' || c.c === 'declare' || c.c === 'peace' || c.c === 'card' || c.c === 'answer' || c.c === 'fleet' || c.c === 'decision')) markDirty(true); else markDirty(false);
    if (r.move) { addArrow(r.move.from, r.move.to, r.move.kind === 'naval' ? 'naval' : 'move'); slideUnits(r.move.from, r.move.to, ME, r.move.part.arm > r.move.part.inf ? 'arm' : 'inf'); if (r.move.part.arm) SFX.tank(); }
    if (sel) { computeTargets(); rebuildOverlay(); }
    if (selFleet) selectFleet(selFleet.z);
    checkVictory();
    renderAll();
    flushInbox().then(() => { if (G && G.over) showEnd(); });
    this.save();
  },
  endLabel() {
    if (this.mode === 'hot') return ['END TURN', `${natName(G.hs)} · Space`];
    if (this.mode === 'host' || this.mode === 'client') { const r = G.ready || {}; const hs = activeHumans(); const n = hs.filter(t => r[t]).length; return r[ME] ? ['WAITING', `${n}/${hs.length} ready`, 1] : ['READY', `${n}/${hs.length} ready · Space`]; }
    if (this.mode === 'watch') return ['WATCHING', 'Spectator'];
    return ['END MONTH', G.y >= 1949 && G.m >= 6 && !G.flags.endless ? 'Final months' : 'Space'];
  },
  async endTurn() {
    if (!G || G.over || busy || G.preview) return;
    if (inboxOf(ME || '').some(x => x.type !== 'news') && this.mode !== 'sp') { shownUids.clear(); flushInbox(); toast('!', 'Decisions are waiting', 'Answer them before you end your turn.', 'war'); return; }
    if (this.mode === 'client') { Net.send({ t:'ready', v:!(G.ready && G.ready[ME]) }); return; }
    if (this.mode === 'host') { G.ready = G.ready || {}; G.ready[ME] = !G.ready[ME]; Net.checkReady(); Net.pushState(); renderAll(); return; }
    if (this.mode === 'hot') {
      const order = activeHumans(), i = order.indexOf(G.hs);
      if (i < order.length - 1) { G.hs = order[i + 1]; this.save(); passScreen(G.hs); return; }
      await this.runMonth();
      G.hs = activeHumans()[0]; this.save();
      if (!G.over && G.hs) passScreen(G.hs);
      return;
    }
    await this.runMonth();
  },
  async runMonth() {
    busy = true; $('#endTurn').classList.add('busy');
    clearSelection(); endPick();
    SFX.drum();
    await new Promise(r => setTimeout(r, 30));
    let out;
    try { out = endMonth(); } catch (err) { console.error(err); toast('!', 'Something went wrong', String(err.message || err), 'war'); out = { battles:[], naval:[] }; }
    this.afterMonth(out);
    busy = false; $('#endTurn').classList.remove('busy');
    renderAll();
    return out;
  },
  afterMonth(out) {
    markDirty(true); fogKey = ''; wxKey = '';
    renderAll();
    animBattles(out.battles || []);
    for (const nb of out.naval || []) navalFX(nb.zone);
    SFX.thump(); if (ME && A(ME) && nat(ME).hand.length) setTimeout(() => SFX.draw(), 600);
    monthReport(out);
    if (G.over) { this.save(); setTimeout(() => flushInbox().then(showEnd), 600); }
    else { this.save(); flushInbox(); }
  },
  save() {
    if (!G || G.preview || this.mode === 'client' || this.mode === 'watch') return;
    const key = G.tutGame ? SAVE_KEY + '-tutorial' : this.mode === 'hot' ? SAVE_KEY + '-hot' : this.mode === 'host' ? SAVE_KEY + '-mp' : SAVE_KEY;
    try { localStorage.setItem(key, serial()); } catch (e) {}
  },
  setMe(t) { ME = t; ownersDirty = true; fogKey = ''; painted.fill(''); markDirty(true); renderAll(); },
  toMenu() { this.save(); if (this.mode === 'host' || this.mode === 'client') Net.close(); showStart(); },
};
const activeHumans = () => humanTags().filter(t => A(t) && !G.humans[t].dead && !G.humans[t].away);
function serial() { const o = Object.assign({}, G); delete o.warSet; return JSON.stringify(o); }
function loadSaved(key = SAVE_KEY) { try { const s = localStorage.getItem(key); if (!s) return null; const g = JSON.parse(s); return g && g.v === 4 ? g : null; } catch (e) { return null; } }
function adopt(g) { G = g; rebuildWarSet(); ownersDirty = true; staticDirty = true; painted.fill(''); fogKey = ''; wxKey = ''; }

// instant battles (single player, hot-seat, scripted D-Day) animate as they happen
Hooks.on('battle', r => { if (Ctl.mode === 'client') return; animBattle(r); showBattleReport(r); });
Hooks.on('naval', r => { if (busy) return; navalFX(r.zone); });
Hooks.on('switch', d => { if (ME === d.from) Ctl.setMe(d.to); });
Hooks.on('capture', () => { ownersDirty = true; });

/* ---------- hot-seat: hand the device over ---------- */
function passScreen(t) {
  clearSelection(); if (tab) openTab(tab);
  const el = $('#pass'); el.hidden = false;
  el.innerHTML = `<div class="passcard">${flagImg(t, 'passflag')}<div class="eye">Hot-seat · ${MONTHS_L[G.m]} ${G.y}</div><h2>Pass to ${esc(natName(t))}</h2><p>${esc(G.humans[t].name || '')} — no peeking at the others' maps.</p><button class="btn gold" id="passGo">I'm ready — show my map</button></div>`;
  $('#passGo').onclick = () => { el.hidden = true; Ctl.setMe(t); centerOn(homeProv(t), Math.max(cam.z, 1.1)); SFX.click(); shownUids.clear(); flushInbox(); };
}

/* ---------- starting a game ---------- */
function startGame(opts) {
  SFX.init(); setTimeout(() => SFX.shuffle(), 400);
  newGame(opts);
  if (opts.mode === 'hot') { G.hs = activeHumans()[0]; }
  Ctl.mode = opts.mode || 'sp';
  Ctl.setMe(opts.mode === 'hot' ? G.hs : opts.me || humanTags()[0] || null);
  startPlay(!opts.noIntro);
  if (Ctl.mode === 'hot') passScreen(G.hs);
}
function startPlay(fresh) {
  drift = false; hoverNat = null; sel = null; targets = new Map();
  $('#start').hidden = true;
  ['#top', '#rail', '#ticker', '#actions', '#zoomCtl', '#miniWrap'].forEach(s => $(s).hidden = false);
  $('#mpbar').hidden = !(Ctl.mode === 'host' || Ctl.mode === 'client' || Ctl.mode === 'watch');
  document.body.classList.toggle('mp', !$('#mpbar').hidden);
  ownersDirty = true; fogKey = ''; wxKey = ''; rebuildOverlay(); markDirty(true);
  if (ME) centerOn(homeProv(ME), VW < 820 ? 1.15 : 1.25);
  renderAll();
  if (fresh && ME && Ctl.mode !== 'hot') {
    Ctl.save();
    const n = nat(ME);
    sendNews(ME, { title:'A New Year Dawns', head:`${n.name} Prepares for the Storm`, dek:`${dateStr()}: the cabinet meets as Europe ${G.y >= 1939 ? 'burns' : 'slides toward war'}`, text:`${NATDEF[ME].brief || SCENARIOS[G.sc].d} Select a province to command its armies, pick a National Focus, start research and play your cards. Press ${Ctl.mode === 'sp' ? 'End Month' : 'Ready'} when done.${n.agendas && n.agendas.length ? ' You have been handed secret agendas — see the Destiny panel.' : ''}`, plate:ME });
    flushInbox();
  } else if (ME && Ctl.mode !== 'hot') { shownUids.clear(); flushInbox(); }
}

/* ---------- boot ---------- */
$$('[data-icon]').forEach(el => { el.innerHTML = iconSvg(el.dataset.icon, el.dataset.icon); });
function boot() {
  resize();
  showStart();
  requestAnimationFrame(frame);
  // joining from a shared link: ?join=CODE
  const q = new URLSearchParams(location.search);
  if (q.get('join')) setTimeout(() => showJoin(q.get('join')), 200);
}
window.addEventListener('resize', resize);
try { document.fonts && document.fonts.ready.then(() => { staticDirty = true; }); } catch (e) {}
document.addEventListener('pointerdown', () => SFX.init(), { once:true });
boot();
