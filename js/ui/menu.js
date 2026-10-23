'use strict';
/* ================= MAIN MENU & SETUP ================= */
let pick = 'GER', pickDiff = 'normal', pickSc = 1936;
const aliveCache = {};
function aliveAt(sc) {
  if (aliveCache[sc]) return aliveCache[sc];
  const keep = G, keepHooks = Hooks.L; Hooks.L = {};
  try { newGame({ humans:{}, scenario:sc, seed:sc }); aliveCache[sc] = Object.keys(G.nat).filter(t => G.nat[t].alive && !NATDEF[t].off); }
  catch (e) { console.error(e); aliveCache[sc] = Object.keys(NATDEF).filter(t => !NATDEF[t].hidden); }
  G = keep; Hooks.L = keepHooks; if (G) rebuildWarSet();
  return aliveCache[sc];
}
const stars = k => '◆'.repeat(6 - k) + '◇'.repeat(k - 1);
function previewWorld() {
  if (!G || !G.preview) { Hooks.L.toast = Hooks.L.toast; newGame({ humans:{}, seed:42 }); G.preview = true; ME = null; adopt(G); }
  drift = true;
}
function hideGameUI() {
  ['#top', '#rail', '#ticker', '#actions', '#zoomCtl', '#legend', '#miniWrap', '#tut', '#mpbar', '#hand', '#report', '#chat', '#pickBar', '#lapse', '#pass'].forEach(s => { const e = $(s); if (e) e.hidden = true; }); hideTip();
  $('#card').hidden = true; $('#drawer').hidden = true; tab = null; sel = null; selFleet = null; pickMode = null;
}
function showStart() {
  hideGameUI();
  const st = $('#start'); st.hidden = false;
  previewWorld();
  const p = profile(), rk = rankOf(p.xp || 0);
  const saved = loadSaved(), savedHot = loadSaved(SAVE_KEY + '-hot'), savedMp = loadSaved(SAVE_KEY + '-mp');
  const inGame = G && !G.preview && !G.over;
  st.innerHTML = `<div class="menu">
    <div class="brand"><div class="eye">A grand strategy game · Europe 1936–1950</div>
      <h1>Iron Dominion<em>1936</em></h1>
      <p>Lead any nation through the Second World War — alone against the AI, around one screen with friends, or online. Follow history's script, or tear it up.</p>
      <div class="rank">${iconSvg('medal')}<div><b>${esc(rk.n)}</b><span>${p.games || 0} campaigns · ${p.wins || 0} victories${p.best ? ' · best score ' + p.best : ''}${rk.next ? ` · ${rk.next - (p.xp || 0)} xp to next rank` : ''}</span></div></div>
    </div>
    <div class="mbtns">
      ${inGame && Ctl.mode !== 'client' && Ctl.mode !== 'watch' ? `<button class="mbtn gold" data-go="back"><b>Return to the war</b><span>${esc(ME ? natName(ME) : '')}, ${MONTHS_L[G.m]} ${G.y}</span></button>` : ''}
      ${saved && !inGame ? `<button class="mbtn gold" data-go="cont"><b>Continue</b><span>${esc(saved.nat[Object.keys(saved.humans)[0]] ? saved.nat[Object.keys(saved.humans)[0]].name : '')}, ${MONTHS_L[saved.m]} ${saved.y}</span></button>` : ''}
      <button class="mbtn" data-go="camp"><b>${iconSvg('gen')} Campaign</b><span>Choose a nation and a start date: 1936, 1939, 1941 or 1944</span></button>
      <button class="mbtn" data-go="mp"><b>${iconSvg('pol')} Multiplayer</b><span>Online rooms with a code: Grand Campaign, Team War, Blitz, Co-op</span></button>
      <button class="mbtn" data-go="hot"><b>${iconSvg('mp')} Hot-seat</b><span>2–6 players take turns on this device</span></button>
      <button class="mbtn" data-go="daily"><b>${iconSvg('target')} Daily challenge</b><span>${esc(dailyBrief().line)}</span></button>
      <button class="mbtn" data-go="tut"><b>${iconSvg('card')} Tutorial</b><span>Learn to command in five minutes</span></button>
      ${savedHot ? `<button class="mbtn small" data-go="conthot"><b>Continue hot-seat</b><span>${MONTHS_L[savedHot.m]} ${savedHot.y} · ${Object.keys(savedHot.humans).length} players</span></button>` : ''}
      ${savedMp ? `<button class="mbtn small" data-go="contmp"><b>Re-host saved online game</b><span>${MONTHS_L[savedMp.m]} ${savedMp.y} · ${Object.keys(savedMp.humans).length} players</span></button>` : ''}
    </div></div>`;
  st.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    SFX.init(); SFX.click();
    const g = b.dataset.go;
    if (g === 'back') startPlay(false);
    else if (g === 'cont') { Ctl.mode = 'sp'; adopt(saved); Ctl.setMe(Object.keys(G.humans)[0]); startPlay(false); if (G.tut) tutShow(); }
    else if (g === 'conthot') { Ctl.mode = 'hot'; adopt(savedHot); startPlay(false); passScreen(G.hs || activeHumans()[0]); }
    else if (g === 'contmp') showHost(savedMp);
    else if (g === 'camp') showCampaign();
    else if (g === 'mp') showMultiplayer();
    else if (g === 'hot') showHotseat();
    else if (g === 'daily') showDaily();
    else if (g === 'tut') startTutorial();
  });
}
function scenarioPicker(cur) {
  return `<div class="scen">${Object.entries(SCENARIOS).map(([y, S]) => `<button class="sc ${+y === +cur ? 'on' : ''}" data-sc="${y}"><b>${y}</b><span>${esc(S.n)}</span></button>`).join('')}</div><div class="brief" id="scBrief">${esc(SCENARIOS[cur].d)}</div>`;
}
function nationPicker(sc, cur, taken = {}) {
  const alive = new Set(aliveAt(sc));
  const majors = MAJORS.filter(t => alive.has(t)).concat(alive.has('VIC') ? ['VIC'] : []);
  const minors = Object.keys(NATDEF).filter(t => !majors.includes(t) && alive.has(t));
  return `<div class="majors">${majors.map(t => `<button class="mj ${cur === t ? 'on' : ''} ${taken[t] ? 'taken' : ''}" data-pick="${t}" style="--c:${NATDEF[t].c}" ${taken[t] ? 'disabled' : ''}>${flagImg(t, 'mjflag')}<b>${NATDEF[t].n}</b><span>${IDEO[NATDEF[t].i]}${taken[t] ? ' · ' + esc(taken[t]) : ''}</span><span class="stars">Difficulty ${stars(NATDEF[t].stars || 3)}</span></button>`).join('')}</div>
    <div class="minors">${minors.map(t => `<button class="mn ${cur === t ? 'on' : ''}" data-pick="${t}" ${taken[t] ? `disabled title="${esc(taken[t])}"` : ''}>${flagImg(t)}${NATDEF[t].n}</button>`).join('')}</div>`;
}
function backBtn() { return `<button class="btn back" data-back>← Back</button>`; }
function wireBack(st) { st.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { SFX.click(); Net.close(); showStart(); }); }
function camHi(t) { if (G && G.preview && NATDEF[t] && NATDEF[t].cap) { hoverNat = t; rebuildOverlay(); const c = PROV[ID[NATDEF[t].cap]]; camAnim = { x0:cam.x, y0:cam.y, z0:cam.z, x1:c.x + (VW > 820 ? -VW * 0.18 / cam.z : 0), y1:c.y, z1:cam.z, t0:performance.now(), dur:1200 }; } }

/* ---------- single-player campaign ---------- */
function showCampaign() {
  const st = $('#start');
  if (!aliveAt(pickSc).includes(pick)) pick = aliveAt(pickSc)[0];
  st.innerHTML = `<div class="setup">${backBtn()}<h2>New campaign</h2>
    <div class="sect">Start date</div>${scenarioPicker(pickSc)}
    <div class="sect">Nation</div><div id="np">${nationPicker(pickSc, pick)}</div>
    <div class="brief" id="brief"></div>
    <div class="diff"><label>Difficulty</label><div class="seg">${[['easy','Recruit'],['normal','Regular'],['hard','Veteran']].map(([k, l]) => `<button class="${pickDiff === k ? 'on' : ''}" data-diff="${k}">${l}</button>`).join('')}</div></div>
    <div class="go"><button class="btn gold" id="bBegin">Begin campaign</button></div></div>`;
  const brief = () => { const d = NATDEF[pick]; $('#brief').textContent = `${d.n.toUpperCase()} — ${d.brief || 'A small nation in a dangerous neighbourhood. Survive, then surprise everyone.'}`; };
  const wire = () => {
    st.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { pick = b.dataset.pick; st.querySelectorAll('[data-pick]').forEach(x => x.classList.toggle('on', x.dataset.pick === pick)); brief(); camHi(pick); SFX.click(); });
  };
  st.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { pickSc = +b.dataset.sc; st.querySelectorAll('[data-sc]').forEach(x => x.classList.toggle('on', x === b)); $('#scBrief').textContent = SCENARIOS[pickSc].d; if (!aliveAt(pickSc).includes(pick)) pick = aliveAt(pickSc).includes('GER') ? 'GER' : aliveAt(pickSc)[0]; $('#np').innerHTML = nationPicker(pickSc, pick); wire(); brief(); SFX.click(); });
  st.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { pickDiff = b.dataset.diff; st.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); SFX.click(); });
  wire(); brief(); camHi(pick); wireBack(st);
  $('#bBegin').onclick = () => startGame({ humans:{ [pick]:{ name:'You' } }, diff:pickDiff, scenario:pickSc, mode:'sp' });
}

/* ---------- hot-seat ---------- */
let hotPlayers = [{ name:'Player 1', tag:'GER' }, { name:'Player 2', tag:'ENG' }];
function showHotseat() {
  const st = $('#start');
  const alive = aliveAt(pickSc);
  const opts = sel => Object.keys(NATDEF).filter(t => alive.includes(t)).map(t => `<option value="${t}" ${t === sel ? 'selected' : ''}>${NATDEF[t].n}</option>`).join('');
  st.innerHTML = `<div class="setup">${backBtn()}<h2>Hot-seat</h2><p class="hint">Players take turns on this device; the map hides between turns so nobody sees the others' plans. Everyone else is AI.</p>
    <div class="sect">Start date</div>${scenarioPicker(pickSc)}
    <div class="sect">Players</div><div class="hplist">${hotPlayers.map((p, i) => `<div class="hp"><input value="${esc(p.name)}" data-hn="${i}" maxlength="20" aria-label="Player name"><select data-ht="${i}" aria-label="Nation">${opts(p.tag)}</select>${hotPlayers.length > 2 ? `<button class="ibtn" data-hx="${i}" aria-label="Remove">✕</button>` : ''}</div>`).join('')}</div>
    ${hotPlayers.length < 6 ? '<button class="btn" id="hAdd">+ Add player</button>' : ''}
    <div class="diff"><label>AI difficulty</label><div class="seg">${[['easy','Recruit'],['normal','Regular'],['hard','Veteran']].map(([k, l]) => `<button class="${pickDiff === k ? 'on' : ''}" data-diff="${k}">${l}</button>`).join('')}</div></div>
    <div class="go"><button class="btn gold" id="bBegin">Begin</button></div><div class="hint" id="hErr"></div></div>`;
  wireBack(st);
  st.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { pickSc = +b.dataset.sc; const al = aliveAt(pickSc); hotPlayers.forEach(p => { if (!al.includes(p.tag)) p.tag = al.find(t => !hotPlayers.some(q => q.tag === t)); }); showHotseat(); });
  st.querySelectorAll('[data-hn]').forEach(i => i.oninput = () => { hotPlayers[+i.dataset.hn].name = i.value; });
  st.querySelectorAll('[data-ht]').forEach(s => s.onchange = () => { hotPlayers[+s.dataset.ht].tag = s.value; camHi(s.value); });
  st.querySelectorAll('[data-hx]').forEach(b => b.onclick = () => { hotPlayers.splice(+b.dataset.hx, 1); showHotseat(); });
  st.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { pickDiff = b.dataset.diff; st.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('on', x === b)); });
  if ($('#hAdd')) $('#hAdd').onclick = () => { const free = alive.find(t => !hotPlayers.some(p => p.tag === t) && NATDEF[t].major) || alive.find(t => !hotPlayers.some(p => p.tag === t)); hotPlayers.push({ name:'Player ' + (hotPlayers.length + 1), tag:free }); showHotseat(); };
  $('#bBegin').onclick = () => {
    const tags = hotPlayers.map(p => p.tag);
    if (new Set(tags).size !== tags.length) { $('#hErr').textContent = 'Each player needs a different nation.'; return; }
    const humans = {}; hotPlayers.forEach(p => humans[p.tag] = { name:p.name || 'Player' });
    startGame({ humans, diff:pickDiff, scenario:pickSc, mode:'hot' });
  };
}

/* ---------- daily challenge ---------- */
function dailyBrief() {
  const d = new Date(), key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, h = hashStr('idom' + key);
  const sc = [1936, 1939, 1939, 1941, 1936, 1944][h % 6];
  const pool = ['GER','ENG','FRA','ITA','SOV','POL','SPA','TUR','SWE','FIN','ROM','YUG','GRE','HUN','CZE'].filter(t => aliveAt(sc).includes(t));
  const tag = pool[(h >>> 4) % pool.length];
  return { key, sc, tag, seed:h, line:`Today: ${NATDEF[tag].n}, ${SCENARIOS[sc].n} (${sc}) — same map and dice for everyone` };
}
function showDaily() {
  const D = dailyBrief(), p = profile(), best = p.daily && p.daily[D.key];
  const st = $('#start');
  st.innerHTML = `<div class="setup">${backBtn()}<h2>Daily challenge</h2>
    <div class="daily">${flagImg(D.tag, 'bigflag')}<div><b>${esc(NATDEF[D.tag].n)}</b><span>${esc(SCENARIOS[D.sc].n)} · ${D.sc} · Veteran difficulty</span><p>${esc(NATDEF[D.tag].brief || SCENARIOS[D.sc].d)}</p></div></div>
    <p class="hint">Everyone gets the same nation, start date and random seed today. Play until 1950 (or until you win) and beat your best score.${best ? ` Your best today: <b>${best}</b>.` : ''}</p>
    <div class="go"><button class="btn gold" id="bBegin">Accept the challenge</button></div></div>`;
  wireBack(st); camHi(D.tag);
  $('#bBegin').onclick = () => startGame({ humans:{ [D.tag]:{ name:'You' } }, diff:'hard', scenario:D.sc, mode:'sp', seed:D.seed, daily:D.key });
}

/* ---------- multiplayer ---------- */
let netKind = 'p2p', myName = (() => { try { return localStorage.getItem('idom-name') || ''; } catch (e) { return ''; } })();
const saveName = n => { myName = n; try { localStorage.setItem('idom-name', n); } catch (e) {} };
function showMultiplayer() {
  const st = $('#start');
  st.innerHTML = `<div class="setup">${backBtn()}<h2>Multiplayer</h2>
    <div class="modes">${Object.entries(MODES).map(([k, M]) => `<div class="mode"><b>${M.icon} ${esc(M.n)}</b><span>${esc(M.d)}</span></div>`).join('')}</div>
    <div class="sect">Your name</div><input id="mName" class="tin" maxlength="20" placeholder="Commander" value="${esc(myName)}">
    <div class="sect">Connection</div><div class="seg">${[['p2p','Internet'],['local','This device (tabs)']].map(([k, l]) => `<button class="${netKind === k ? 'on' : ''}" data-kind="${k}">${l}</button>`).join('')}</div>
    <p class="hint">Internet rooms connect players directly through a free matchmaking service — nothing to install or host. A few strict school or office networks block this.</p>
    <div class="mpgo"><button class="btn gold" id="bHost">Host a game</button><div class="join"><input id="mCode" class="tin code" maxlength="5" placeholder="CODE" aria-label="Room code"><button class="btn" id="bJoin">Join</button></div></div>
    <div class="hint" id="mErr"></div></div>`;
  wireBack(st);
  st.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { netKind = b.dataset.kind; st.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bHost').onclick = () => { saveName($('#mName').value.trim() || 'Host'); showHost(); };
  $('#bJoin').onclick = () => { saveName($('#mName').value.trim() || 'Player'); const c = $('#mCode').value.trim(); if (c.length < 4) { $('#mErr').textContent = 'Enter the room code from the host.'; return; } showJoin(c); };
  $('#mCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('#bJoin').click(); e.stopPropagation(); });
}
function lobbyHTML(L, isHost) {
  const S = L.settings, taken = {}; for (const p of L.players) if (p.tag) taken[p.tag] = p.name;
  const me = isHost ? L.players.find(p => p.host) : L.players.find(p => p.id === Net.myId);
  const link = location.origin + location.pathname + '?join=' + L.code + (netKind === 'local' ? '&local=1' : '');
  const sc = S.gm === 'blitz' ? 1939 : +S.scenario;
  const seg = (k, vals) => `<div class="seg">${vals.map(([v, l]) => `<button class="${String(S[k]) === String(v) ? 'on' : ''}" ${isHost ? `data-set="${k}:${v}"` : 'disabled'}>${l}</button>`).join('')}</div>`;
  return `<div class="setup lobby">${backBtn()}<h2>${isHost ? 'Your room' : 'Lobby'}</h2>
    <div class="codebox"><span>Room code</span><b>${esc(L.code)}</b><button class="btn" data-copy="${esc(link)}">Copy invite link</button></div>
    <div class="lcols"><div>
      <div class="sect">Players</div><div class="plist">${L.players.map(p => `<div class="pl">${p.tag ? flagImg(p.tag) : '<i class="noflag"></i>'}<b>${esc(p.name)}${p.host ? ' ★' : ''}</b><span>${p.tag ? esc(NATDEF[p.tag].n) : 'choosing…'}${p.away ? ' · away' : ''}</span></div>`).join('')}</div>
      <div class="sect">Mode</div>${seg('gm', Object.entries(MODES).map(([k, M]) => [k, M.n]))}
      <p class="hint">${esc(MODES[S.gm].d)}</p>
      ${S.gm !== 'blitz' ? `<div class="sect">Start date</div>${seg('scenario', Object.keys(SCENARIOS).map(y => [y, y]))}` : ''}
      <div class="sect">AI difficulty</div>${seg('diff', [['easy','Recruit'],['normal','Regular'],['hard','Veteran']])}
      <div class="sect">Turn timer</div>${seg('timer', [[0,'Off'],[60,'1 min'],[120,'2 min'],[300,'5 min']])}
      <div class="sect">Secret agendas</div>${seg('agendas', [[true,'On'],[false,'Off']])}
    </div><div>
      <div class="sect">Your nation</div><div id="np">${nationPicker(sc, me && me.tag, Object.fromEntries(Object.entries(taken).filter(([t]) => !me || me.tag !== t)))}</div>
      <button class="btn" data-spec>${me && me.tag ? 'Spectate instead' : 'Spectating'}</button>
      <div class="sect">Chat</div><div class="lchat" id="lobbyChat">${Net.chat.map(m => `<div class="cm ${m.name ? '' : 'sys'}">${m.name ? `<b>${esc(m.name)}</b> ` : ''}${esc(m.text)}</div>`).join('')}</div><input id="lobbyChatIn" class="tin" placeholder="Say something…" maxlength="200">
    </div></div>
    <div class="go">${isHost ? `<button class="btn gold" id="bStart" ${L.players.some(p => p.tag) ? '' : 'disabled'}>Start the war</button>` : '<span class="hint">Waiting for the host to start…</span>'}</div><div class="hint" id="mErr"></div></div>`;
}
function wireLobby(isHost) {
  const st = $('#start');
  wireBack(st);
  st.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.copy); toast('✓', 'Invite link copied', b.dataset.copy, ''); } catch (e) { prompt('Copy this link', b.dataset.copy); } });
  st.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { const [k, v] = b.dataset.set.split(':'); Net.settings[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; Net.lobbyChanged(); SFX.click(); });
  const pickTag = t => { if (isHost) { Net.players.find(p => p.host).tag = t; Net.lobbyChanged(); } else Net.send({ t:'pick', tag:t }); camHi(t); SFX.click(); };
  st.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => pickTag(b.dataset.pick));
  const sp = st.querySelector('[data-spec]'); if (sp) sp.onclick = () => pickTag(null);
  const ci = $('#lobbyChatIn'); if (ci) ci.addEventListener('keydown', e => { if (e.key === 'Enter') { sendChat(ci.value); ci.value = ''; } e.stopPropagation(); });
  if (isHost && $('#bStart')) $('#bStart').onclick = () => Net.startMatch();
}
function showHost(saved) {
  const st = $('#start');
  st.innerHTML = `<div class="setup">${backBtn()}<h2>Opening a room…</h2><p class="hint">Contacting the matchmaking service.</p><div class="hint" id="mErr"></div></div>`; wireBack(st);
  Net.onError = msg => { const e = $('#mErr'); if (e) e.textContent = msg; else toast('!', msg, '', 'war'); };
  Net.onLobby = L => { if (Net.started) return; const ci = $('#lobbyChatIn'), keepFocus = ci && document.activeElement === ci, val = ci ? ci.value : ''; st.innerHTML = lobbyHTML(L, true); wireLobby(true); if (keepFocus) { $('#lobbyChatIn').value = val; $('#lobbyChatIn').focus(); } };
  Net.host(netKind, myName || 'Host', code => {
    if (saved) {
      // re-hosting a saved online game: players reclaim their nations by joining with the new code
      Net.resumeSave = saved;
      toast('✓', `Room ${code} open`, 'Players join with the new code and pick their old nations, then press Start.', 'medal');
    }
  });
  Net.startMatchOrig = Net.startMatchOrig || Net.startMatch;
  Net.startMatch = function () {
    if (this.resumeSave) {
      const g = this.resumeSave; this.resumeSave = null;
      adopt(g); for (const t of humanTags()) G.humans[t].away = !this.players.some(p => p.tag === t);
      G.ready = {}; G.deadline = G.timer ? Date.now() + G.timer * 1000 : 0;
      this.started = true; Ctl.mode = 'host'; Ctl.setMe(this.players.find(p => p.host).tag);
      this.lobbyChanged(); startPlay(false); this.pushState(true); this.startTimer(); return;
    }
    return Net.startMatchOrig.call(this);
  };
}
function showJoin(code) {
  if (new URLSearchParams(location.search).get('local')) netKind = 'local';
  const st = $('#start'); st.hidden = false; hideGameUI(); previewWorld();
  if (!myName) { st.innerHTML = `<div class="setup">${backBtn()}<h2>Join room ${esc(code)}</h2><div class="sect">Your name</div><input id="mName" class="tin" maxlength="20" placeholder="Commander"><div class="go"><button class="btn gold" id="bJoin2">Join</button></div></div>`; wireBack(st); $('#bJoin2').onclick = () => { saveName($('#mName').value.trim() || 'Player'); showJoin(code); }; return; }
  st.innerHTML = `<div class="setup">${backBtn()}<h2>Joining ${esc(code.toUpperCase())}…</h2><p class="hint">Connecting to the host.</p><div class="hint" id="mErr"></div></div>`; wireBack(st);
  Net.onError = msg => { const e = $('#mErr'); if (e) e.textContent = msg; else toast('!', msg, '', 'war'); };
  Net.onLobby = L => { if (Net.started) return; const ci = $('#lobbyChatIn'), keepFocus = ci && document.activeElement === ci, val = ci ? ci.value : ''; st.innerHTML = lobbyHTML(L, false); wireLobby(false); if (keepFocus) { $('#lobbyChatIn').value = val; $('#lobbyChatIn').focus(); } };
  Net.join(netKind, code, myName);
}
