'use strict';
/* ================= MULTIPLAYER =================
   Host-authoritative: the host runs the one true simulation. Clients send commands; the host executes them
   and broadcasts the (gzipped) game state plus the effects players should see. Two transports:
   'p2p' — PeerJS over the internet, rooms identified by a short code (nothing to host);
   'local' — BroadcastChannel between tabs of the same browser, for testing and same-device play. */
const NET_PREFIX = 'iron-dominion-v4-';
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length:5 }, () => CODE_ABC[(Math.random() * CODE_ABC.length) | 0]).join('');
const myToken = (() => { try { let t = localStorage.getItem('idom-token'); if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('idom-token', t); } return t; } catch (e) { return Math.random().toString(36).slice(2); } })();

function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js'; s.onload = () => res(); s.onerror = () => rej(new Error('Could not load the networking library')); document.head.appendChild(s); });
}
function makeTransport(kind, code, isHost, h) {
  // h: {msg(from, data), peer(id), leave(id), open(), error(err)}
  if (kind === 'local') {
    const ch = new BroadcastChannel(NET_PREFIX + code), me = isHost ? 'host' : 'c' + Math.random().toString(36).slice(2, 9);
    const peers = new Set();
    ch.onmessage = e => {
      const m = e.data; if (!m || m.to && m.to !== me && m.to !== '*') return; if (m.from === me) return;
      if (m.k === 'hi' && isHost) { peers.add(m.from); h.peer(m.from); return; }
      if (m.k === 'bye') { peers.delete(m.from); h.leave(m.from); return; }
      if (m.k === 'ping' && isHost) { ch.postMessage({ k:'pong', from:me, to:m.from }); return; }
      if (m.k === 'pong' && !isHost) { if (!this_.opened) { this_.opened = true; h.open(); } return; }
      if (m.k === 'msg') h.msg(m.from, m.d);
    };
    const this_ = { me, opened:false,
      send(to, d) { ch.postMessage({ k:'msg', from:me, to, d }); },
      broadcast(d) { ch.postMessage({ k:'msg', from:me, to:'*', d }); },
      close() { try { ch.postMessage({ k:'bye', from:me }); ch.close(); } catch (e) {} },
    };
    if (isHost) setTimeout(() => h.open(), 0);
    else { ch.postMessage({ k:'hi', from:me, to:'host' }); ch.postMessage({ k:'ping', from:me, to:'host' }); setTimeout(() => { if (!this_.opened) h.error(new Error('No game with that code is open in this browser.')); }, 2500); }
    window.addEventListener('beforeunload', () => this_.close());
    return this_;
  }
  // p2p
  const conns = new Map(); let peer, hostConn = null;
  const t = { me:null,
    send(to, d) { const c = isHost ? conns.get(to) : hostConn; if (c && c.open) try { c.send(d); } catch (e) {} },
    broadcast(d) { for (const c of conns.values()) if (c.open) try { c.send(d); } catch (e) {} },
    close() { try { peer && peer.destroy(); } catch (e) {} },
  };
  loadPeerJS().then(() => {
    peer = isHost ? new window.Peer(NET_PREFIX + code, { debug:0 }) : new window.Peer(undefined, { debug:0 });
    peer.on('open', id => {
      t.me = id;
      if (isHost) { h.open(); return; }
      hostConn = peer.connect(NET_PREFIX + code, { reliable:true });
      hostConn.on('open', () => h.open());
      hostConn.on('data', d => h.msg('host', d));
      hostConn.on('close', () => h.leave('host'));
      hostConn.on('error', e => h.error(e));
    });
    peer.on('connection', c => {
      c.on('open', () => { conns.set(c.peer, c); h.peer(c.peer); });
      c.on('data', d => h.msg(c.peer, d));
      c.on('close', () => { conns.delete(c.peer); h.leave(c.peer); });
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
    peer.on('error', e => {
      const msg = e.type === 'unavailable-id' ? 'That room code is already in use. Try again.' : e.type === 'peer-unavailable' ? 'No game found with that code. Check it and try again.' : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Could not reach the matchmaking server. Check your connection, or try "This device".' : 'Connection problem: ' + (e.type || e.message);
      h.error(new Error(msg));
    });
  }).catch(e => h.error(e));
  return t;
}
async function gz(str) {
  if (!window.CompressionStream) return { raw:str };
  const s = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
  return { z:new Uint8Array(await new Response(s).arrayBuffer()) };
}
async function ungz(m) {
  if (m.raw) return m.raw;
  const s = new Blob([m.z]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(s).text();
}

const Net = {
  role:null, kind:'p2p', code:null, tr:null, started:false,
  players:[],       // host: [{id, name, tag, token, away}]
  settings:{ gm:'grand', scenario:1936, diff:'normal', timer:0, agendas:true },
  myId:null, evq:[], pending:false, chat:[], timerIv:null, hbIv:null, lastHost:0, onLobby:null, onError:null,
  host(kind, name, onReady) {
    this.close(); this.role = 'host'; this.kind = kind; this.code = genCode(); this.started = false; this.chat = [];
    this.players = [{ id:'host', name:name || 'Host', tag:null, token:myToken, host:true }];
    this.tr = makeTransport(kind, this.code, true, {
      open:() => { onReady && onReady(this.code); this.lobbyChanged(); this.startHeartbeat(); },
      peer:id => {},
      leave:id => this.dropped(id),
      msg:(from, d) => this.onHostMsg(from, d),
      error:e => { this.onError && this.onError(e.message); },
    });
  },
  join(kind, code, name, onOk) {
    this.close(); this.role = 'client'; this.kind = kind; this.code = code.toUpperCase().trim(); this.started = false; this.chat = [];
    this.tr = makeTransport(kind, this.code, false, {
      open:() => { this.send({ t:'hello', name, token:myToken }); onOk && onOk(); this.startHeartbeat(); },
      peer:() => {}, leave:() => { if (this.role === 'client') { toast('!', 'Disconnected from the host', 'The host left or the connection dropped. Rejoin with the same code to continue.', 'war'); this.onError && this.onError('Disconnected from the host.'); } },
      msg:(from, d) => this.onClientMsg(d),
      error:e => { this.onError && this.onError(e.message); },
    });
    try { sessionStorage.setItem('idom-last', JSON.stringify({ kind, code:this.code, name })); } catch (e) {}
  },
  close() { if (this.tr) this.tr.close(); this.tr = null; this.role = null; clearInterval(this.timerIv); this.timerIv = null; clearInterval(this.hbIv); this.hbIv = null; document.body.classList.remove('mp'); },
  startHeartbeat() {
    clearInterval(this.hbIv); this.lastHost = Date.now();
    this.hbIv = setInterval(() => {
      const now = Date.now();
      if (this.role === 'client') { this.send({ t:'hb' }); if (now - this.lastHost > 15000 && !this.warned) { this.warned = true; toast('!', 'Lost contact with the host', 'Waiting for them to come back…', 'war'); } }
      else if (this.role === 'host') { this.broadcast({ t:'hb' }); for (const p of this.players) if (p.id !== 'host' && !p.away && p.seen && now - p.seen > 12000) this.dropped(p.id); }
    }, 3000);
  },
  send(m) { if (this.tr) this.tr.send('host', m); },
  sendTo(id, m) { if (id === 'host') return; if (this.tr) this.tr.send(id, m); },
  broadcast(m) { if (this.tr) this.tr.broadcast(m); },
  /* ---------- host side ---------- */
  lobbyChanged() {
    const L = { t:'lobby', code:this.code, players:this.players.map(p => ({ id:p.id, name:p.name, tag:p.tag, host:!!p.host, away:!!p.away })), settings:this.settings, started:this.started };
    this.broadcast(L); this.onLobby && this.onLobby(L);
  },
  onHostMsg(from, d) {
    if (!d || !d.t) return;
    let p = this.players.find(x => x.id === from);
    if (p) p.seen = Date.now();
    if (d.t === 'hb') return;
    if (d.t === 'hello') {
      // a returning player gets their nation back
      const back = this.players.find(x => x.token === d.token && x.id !== 'host');
      if (back) { back.id = from; back.away = false; back.name = d.name || back.name; p = back; if (G && back.tag && G.humans[back.tag]) { G.humans[back.tag].away = false; notify('*', '↺', `${back.name} is back`, `${natName(back.tag)} is under human command again.`, ''); } }
      else { if (this.players.length >= 9) { this.sendTo(from, { t:'denied', why:'The room is full.' }); return; } p = { id:from, name:(d.name || 'Player').slice(0, 20), tag:null, token:d.token, seen:Date.now() }; this.players.push(p); }
      p.seen = Date.now();
      this.sendTo(from, { t:'welcome', id:from, tag:p.tag });
      this.lobbyChanged();
      if (this.started) this.pushState(true);
      this.sysChat(`${p.name} joined.`);
      return;
    }
    if (!p) return;
    if (d.t === 'pick' && !this.started) { if (d.tag && this.players.some(x => x !== p && x.tag === d.tag)) return; p.tag = d.tag || null; this.lobbyChanged(); return; }
    if (d.t === 'chat') { this.relayChat(p.name, String(d.text || '').slice(0, 200), p.tag); return; }
    if (!this.started || !G || !p.tag) return;
    if (d.t === 'cmd') {
      if (G.ready && G.ready[p.tag] && d.c.c !== 'answer') return;
      const r = doCommand(p.tag, d.c, 'queue');
      if (r && !r.ok && r.why) this.sendTo(from, { t:'toast', ic:'✕', title:r.why });
      if (r && r.move) this.evq.push(['move', { ...r.move, t:p.tag }]);
      if (r && r.queued) this.sendTo(from, { t:'toast', ic:'➶', title:`Attack on ${PROV[r.queued.to].name} planned`, body:'It goes in when the month ends.' });
      if (r && r.result) this.sendTo(from, { t:'toast', ic:r.result === 'refused' ? '✕' : '✓', title:`${natName(d.c.tag)}: ${{ accepted:'Accepted!', refused:'Refused.', sent:'Proposal sent.' }[r.result]}` });
      if (r && r.spy) this.sendTo(from, { t:'toast', ic:r.spy.ok ? '✓' : '✕', title:r.spy.ok ? 'Operation succeeded' : 'Operation failed', body:r.spy.msg });
      if (r && r.raid) this.evq.push(['raid', { t:p.tag, from:d.c.from, to:d.c.to, ...r.raid }]);
      checkVictory();
      markDirty(true); renderAll();
      this.pushState();
      return;
    }
    if (d.t === 'ready') { G.ready = G.ready || {}; G.ready[p.tag] = !!d.v; this.checkReady(); this.pushState(); renderAll(); return; }
  },
  dropped(id) {
    const p = this.players.find(x => x.id === id); if (!p) return;
    if (!this.started) { this.players = this.players.filter(x => x !== p); this.lobbyChanged(); this.sysChat(`${p.name} left.`); return; }
    p.away = true;
    if (G && p.tag && G.humans[p.tag]) { G.humans[p.tag].away = true; notify('*', '⚠', `${p.name} disconnected`, `The AI takes over ${natName(p.tag)} until they return.`, 'war'); }
    this.sysChat(`${p.name} disconnected — AI takes over.`);
    this.checkReady(); this.pushState(); renderAll();
  },
  startMatch() {
    const humans = {};
    for (const p of this.players) if (p.tag) humans[p.tag] = { name:p.name };
    if (!Object.keys(humans).length) { toast('!', 'Nobody has picked a nation', '', 'war'); return; }
    const S = this.settings;
    newGame({ humans, diff:S.diff, scenario:S.gm === 'blitz' ? 1939 : +S.scenario, mode:'mp', gm:S.gm });
    if (!S.agendas) for (const t of humanTags()) nat(t).agendas = [];
    if (S.gm === 'coop') coopAlign();
    if (S.gm === 'team') teamAlign();
    G.ready = {}; G.timer = +S.timer || 0; G.deadline = G.timer ? Date.now() + G.timer * 1000 : 0;
    this.started = true;
    const me = this.players.find(p => p.id === 'host');
    Ctl.mode = me.tag ? 'host' : 'host'; Ctl.setMe(me.tag);
    this.lobbyChanged();
    startPlay(true);
    this.pushState(true);
    this.startTimer();
  },
  startTimer() {
    clearInterval(this.timerIv);
    this.timerIv = setInterval(() => {
      if (!G || !this.started || this.role !== 'host') return;
      renderMP();
      if (G.timer && G.deadline && Date.now() > G.deadline && !busy && !G.over) this.resolve();
    }, 1000);
  },
  checkReady() {
    if (!G || busy || G.over) return;
    const hs = activeHumans(); if (!hs.length) return;
    if (hs.every(t => G.ready && G.ready[t])) this.resolve();
  },
  async resolve() {
    if (busy) return;
    // unanswered decisions take their first option; newspapers are simply filed
    for (const t of humanTags()) for (const it of [...inboxOf(t)]) answer(t, it.uid, it.type === 'decision' ? 0 : 0);
    await Ctl.runMonth();
    G.ready = {}; G.deadline = G.timer ? Date.now() + G.timer * 1000 : 0;
    this.pushState(true); renderAll();
  },
  pushState(now) {
    if (this.role !== 'host' || !this.started) return;
    if (this.pending && !now) return;
    this.pending = true;
    const go = async () => {
      this.pending = false;
      if (G) G.tleft = G.deadline ? Math.max(0, Math.round((G.deadline - Date.now()) / 1000)) : 0;
      const pack = await gz(serial());
      const ev = this.evq; this.evq = [];
      this.broadcast({ t:'state', ...pack, ev, players:this.players.map(p => ({ name:p.name, tag:p.tag, away:!!p.away })) });
    };
    if (now) go(); else setTimeout(go, 120);
  },
  sysChat(text) { this.relayChat('', text, null); },
  relayChat(name, text, tag) { const m = { t:'chat', name, text, tag }; this.chat.push(m); if (this.chat.length > 80) this.chat.shift(); this.broadcast(m); onChat(m); },
  /* ---------- client side ---------- */
  async onClientMsg(d) {
    if (!d || !d.t) return;
    this.lastHost = Date.now(); if (this.warned) { this.warned = false; toast('✓', 'Host reconnected', '', ''); }
    if (d.t === 'hb') return;
    if (d.t === 'welcome') { this.myId = d.id; return; }
    if (d.t === 'denied') { this.onError && this.onError(d.why); return; }
    if (d.t === 'lobby') { this.code = d.code; this.settings = d.settings; this.players = d.players; this.onLobby && this.onLobby(d); return; }
    if (d.t === 'chat') { this.chat.push(d); if (this.chat.length > 80) this.chat.shift(); onChat(d); return; }
    if (d.t === 'toast') { toast(d.ic || '•', d.title || '', d.body || '', d.kind || ''); return; }
    if (d.t === 'state') {
      const txt = await ungz(d);
      const g = JSON.parse(txt);
      const first = !this.started;
      const me = this.players.find(p => p.id === this.myId);
      const tag = me ? me.tag : null;
      adopt(g);
      if (d.players) this.roster = d.players;
      if (first) { this.started = true; Ctl.mode = tag ? 'client' : 'watch'; Ctl.setMe(tag && G.humans[tag] ? tag : null); startPlay(true); }
      else { if (ME && !G.humans[ME]) { const nt = Object.keys(G.humans).find(t => G.humans[t].name === (me && me.name)); Ctl.setMe(nt || null); } markDirty(true); }
      if (sel) { computeTargets(); rebuildOverlay(); }
      if (selFleet) selectFleet(selFleet.z);
      for (const [type, data] of d.ev || []) clientEvent(type, data);
      renderAll(); flushInbox();
      if (G.over && !$('#modal .final')) setTimeout(() => flushInbox().then(showEnd), 500);
    }
  },
};
function clientEvent(type, data) {
  if (type === 'toast') { if (data.to === '*' || data.to === ME) toast(data.ic, data.title, data.body, data.kind); }
  else if (type === 'sfx') { if (data.to === '*' || data.to === ME) SFX.play(data.name, data.arg); }
  else if (type === 'battle') { animBattle(data); showBattleReport(data); }
  else if (type === 'naval') navalFX(data.zone);
  else if (type === 'raid') animBattle({ tid:data.to, from:[data.from], a:data.t, d:G.prov[data.to].o, raid:data });
  else if (type === 'move') { addArrow(data.from, data.to, data.kind === 'naval' ? 'naval' : 'move'); slideUnits(data.from, data.to, data.t, data.part && data.part.arm > data.part.inf ? 'arm' : 'inf'); }
  else if (type === 'month') Ctl.afterMonth(data);
}
// host forwards what clients should see or hear
Hooks.on('*', (type, data) => {
  if (Net.role !== 'host' || !Net.started) return;
  if (['toast', 'sfx', 'battle', 'naval', 'month'].includes(type)) Net.evq.push([type, data]);
});
/* ---------- team set-ups ---------- */
function coopAlign() {
  // every human joins the first human's side; the AI coalition opposite is tougher (see diffMul)
  const hs = humanTags(); const lead = hs[0]; let fk = facOf(lead);
  if (!fk) { G.facs.COOP = { n:'The Coalition', lead, m:[lead] }; fk = 'COOP'; }
  for (const t of hs.slice(1)) if (facOf(t) !== fk) joinFaction(t, fk, true);
}
function teamAlign() {
  // Team War: three fixed blocs. Unaligned human picks join the bloc that matches their ideology
  for (const t of humanTags()) { if (facOf(t)) continue; const i = nat(t).ide; const fk = i === 'F' ? 'AXIS' : i === 'C' ? 'COMINTERN' : 'ALLIES'; if (G.facs[fk]) joinFaction(t, fk, true); }
  G.flags.teamLock = 1;
}

/* ---------- in-game multiplayer bar and chat ---------- */
function renderMP() {
  const el = $('#mpbar'); if (!G || !(Ctl.mode === 'host' || Ctl.mode === 'client' || Ctl.mode === 'watch')) { el.hidden = true; return; }
  el.hidden = false;
  const ready = G.ready || {};
  const tl = Net.role === 'host' ? (G.deadline ? Math.max(0, Math.round((G.deadline - Date.now()) / 1000)) : 0) : G.tleft || 0;
  el.querySelector('.mpl').innerHTML = humanTags().map(t => `<span class="mpp ${ready[t] ? 'rd' : ''} ${G.humans[t].away ? 'aw' : ''} ${G.humans[t].dead ? 'dd' : ''}" title="${esc(G.humans[t].name || '')}">${flagImg(t)}<b>${esc((G.humans[t].name || natName(t)).slice(0, 10))}</b>${G.humans[t].dead ? '✝' : G.humans[t].away ? '⚠' : ready[t] ? '✓' : '…'}</span>`).join('');
  el.querySelector('.mpt').textContent = G.timer ? `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}` : '';
  el.querySelector('.mpc').textContent = Net.code || '';
}
function onChat(m) {
  const log = $('#chatLog'); if (!log) return;
  const div = document.createElement('div'); div.className = 'cm' + (m.name ? '' : ' sys');
  div.innerHTML = m.name ? `${m.tag ? flagImg(m.tag) : ''}<b>${esc(m.name)}</b> ${esc(m.text)}` : esc(m.text);
  log.appendChild(div); log.scrollTop = log.scrollHeight;
  if ($('#chat').hidden && m.name) { const b = $('#chatBtn'); b.classList.add('new'); toast('✉', m.name, m.text, ''); }
  const lc = $('#lobbyChat'); if (lc) { const d2 = div.cloneNode(true); lc.appendChild(d2); lc.scrollTop = lc.scrollHeight; }
}
function toggleChat(open) { const c = $('#chat'); c.hidden = open === undefined ? !c.hidden : !open; $('#chatBtn').classList.remove('new'); if (!c.hidden) setTimeout(() => $('#chatIn').focus(), 30); }
function sendChat(text) { text = text.trim(); if (!text) return; if (Net.role === 'host') { const me = Net.players.find(p => p.id === 'host'); Net.relayChat(me.name, text, me.tag); } else Net.send({ t:'chat', text }); }
$('#chatBtn').onclick = () => toggleChat();
$('#chatIn').addEventListener('keydown', e => { if (e.key === 'Enter') { sendChat(e.target.value); e.target.value = ''; } if (e.key === 'Escape') toggleChat(false); e.stopPropagation(); });
