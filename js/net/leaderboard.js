'use strict';
/* ================= ONLINE LEADERBOARD =================
   Cloud Firestore through its REST API: no SDK, no login.
   - A finished single-player campaign posts a *submission*: the player's name, the claimed score and the whole
     game record (start options, seed, every command — see js/core/replay.js), gzipped.
   - The Cloud Function in functions/ replays the record from scratch, recomputes the score and, if it matches,
     writes the entry to `scores`. Clients can read `scores` but never write it, so only replayed games appear.
   - Boards: overall, world map, Europe map, this week's challenge, and one per nation. Scores are rated:
     the raw score times the nation's difficulty, the game difficulty and the start date (ratedScore()). */
const LB = {
  ok() { return typeof LEADERBOARD_CONFIG !== 'undefined' && !!LEADERBOARD_CONFIG.projectId && !!LEADERBOARD_CONFIG.apiKey; },
  base() { return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(LEADERBOARD_CONFIG.projectId)}/databases/(default)/documents`; },
  key() { return 'key=' + encodeURIComponent(LEADERBOARD_CONFIG.apiKey); },
  enc(o) { const f = {}; for (const k in o) { const v = o[k]; if (v == null) f[k] = { nullValue:null }; else if (k === 'at') f[k] = { timestampValue:v }; else if (typeof v === 'number' && Number.isInteger(v)) f[k] = { integerValue:String(v) }; else if (typeof v === 'number') f[k] = { doubleValue:v }; else if (typeof v === 'boolean') f[k] = { booleanValue:v }; else f[k] = { stringValue:String(v) }; } return { fields:f }; },
  dec(d) { const o = {}; const f = (d && d.fields) || {}; for (const k in f) { const v = f[k]; o[k] = 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'timestampValue' in v ? v.timestampValue : 'stringValue' in v ? v.stringValue : null; } if (d && d.name) o.id = d.name.split('/').pop(); return o; },
  async req(path, body) {
    const r = await fetch(`${this.base()}${path}${path.includes('?') ? '&' : '?'}${this.key()}`, body ? { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) } : {});
    if (r.status === 404) return null;
    if (!r.ok) { let msg = ''; try { msg = (await r.json()).error.message; } catch (e) {} throw new Error(`The leaderboard said no (${r.status})${msg ? ': ' + msg.slice(0, 140) : ''}`); }
    return r.json();
  },
  // top entries of a board: filter is null or [field, value]
  async top(filter, n = 200) {
    const q = { from:[{ collectionId:'scores' }], orderBy:[{ field:{ fieldPath:'score' }, direction:'DESCENDING' }], limit:n };
    if (filter) q.where = { fieldFilter:{ field:{ fieldPath:filter[0] }, op:'EQUAL', value:{ stringValue:filter[1] } } };
    const rows = await this.req(':runQuery', { structuredQuery:q });
    return (rows || []).filter(x => x.document).map(x => this.dec(x.document));
  },
  async submit(sub) { const d = await this.req('/submissions', this.enc(sub)); return d && d.name.split('/').pop(); },
  async get(col, id) { const d = await this.req(`/${col}/${id}`); return d ? this.dec(d) : null; },
};
async function gzip64(text) {
  if (typeof CompressionStream === 'undefined') throw new Error('This browser cannot compress the game record');
  const buf = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
async function gunzip64(b64) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot play back replays');
  const bin = atob(b64), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
// a verified campaign's film: { tags, months:[[y, m, owners, turn]…], pace:[rated score at the start of each turn], tag, map, sc }
const FILMS = {};
async function lbFilm(id) {
  if (FILMS[id]) return FILMS[id];
  const d = await LB.get('replays', id); if (!d || typeof d.data !== 'string') return null;
  return (FILMS[id] = JSON.parse(await gunzip64(d.data)));
}
// can this campaign go on the board? Only single-player games whose record is intact.
function lbEligible() {
  if (!G || !ME || !G.over) return 'The campaign is not over';
  if (Ctl.mode !== 'sp') return 'Only single-player campaigns can be verified';
  if (G.tutGame) return 'Tutorials do not count';
  if (!G.rec) return 'This campaign was started before verification existed';
  if (G.rec.bad) return 'This campaign changed hands, so it cannot be replayed';
  return '';
}
const RES_TXT = { victory:'Victory', time:'Survived', defeat:'Defeated' };
let lbFilter = 'all', lbNation = null;
function lbBoard(f, nation) {
  if (f === 'world' || f === 'europe') return ['map', f];
  if (f === 'week') return ['week', weeklyBrief().key];
  if (f === 'nation') return ['tag', nation || 'GER'];
  return null;
}
async function showLeaderboard(back) {
  const m = $('#modal'); m.hidden = false; m.classList.add('over'); // above the main menu too
  if (!lbNation) lbNation = ME && NATDEF[ME] ? ME : 'GER';
  const nations = Object.keys(NATDEF).filter(t => !NATDEF[t].hidden && !NATDEF[t].off).sort((a, b) => NATDEF[a].n.localeCompare(NATDEF[b].n));
  const tabs = [['all','Overall'],['world','World map'],['europe','Europe map'],['week','This week'],['nation','By nation']];
  const wk = weeklyBrief();
  const frame = body => `<div class="helpcard lb" role="dialog" aria-modal="true"><div class="hh"><h2>Leaderboard</h2><button class="ibtn" data-x aria-label="Close">✕</button></div>
    <div class="subtabs">${tabs.map(([k, l]) => `<button class="${lbFilter === k ? 'on' : ''}" data-lbf="${k}">${l}</button>`).join('')}</div>
    <div class="lbb">${lbFilter === 'nation' ? `<div class="lbsel"><select data-lbn>${nations.map(t => `<option value="${t}" ${t === lbNation ? 'selected' : ''}>${esc(NATDEF[t].n)}</option>`).join('')}</select><span class="hint">Best campaigns as one nation</span></div>` : ''}
    ${lbFilter === 'week' ? `<p class="hint">${esc(wk.line)}. Resets every Monday.</p>` : ''}${body}
    ${scoreHelpHTML()}
    <p class="hint lbfoot">Every entry was replayed move by move on the server before it was accepted. Press ▶ to watch any of them.</p></div></div>`;
  const wire = () => {
    m.querySelector('[data-x]').onclick = () => { closeModal(); if (back) back(); };
    m.querySelectorAll('[data-lbf]').forEach(b => b.onclick = () => { lbFilter = b.dataset.lbf; showLeaderboard(back); });
    const sl = m.querySelector('[data-lbn]'); if (sl) sl.onchange = () => { lbNation = sl.value; showLeaderboard(back); };
  };
  if (!LB.ok()) { m.innerHTML = frame(`<p class="hint">The online leaderboard is not connected on this copy of the game yet.</p>`); wire(); return; }
  m.innerHTML = frame('<p class="hint">Fetching the scores…</p>'); wire();
  try {
    const rows = await LB.top(lbBoard(lbFilter, lbNation), 100);
    const mine = G && G.lbPosted && G.lbPosted.id;
    const body = rows.length ? `<table class="lbt"><tr><th>#</th><th>Commander</th><th>Nation</th><th>Score</th><th>Result</th><th class="hm">Campaign</th><th class="hm">Kills</th><th class="hm">Medals</th><th></th></tr>${rows.map((r, i) => `<tr class="${r.id === mine ? 'me' : ''}"><td>${i + 1}</td><td>${esc(String(r.name || ''))}</td><td>${typeof r.tag === 'string' && NATDEF[r.tag] ? flagImg(r.tag) : ''} ${esc(String(r.nation || ''))}</td><td><b>${Number(r.score) | 0}</b></td><td class="${RES_TXT[r.result] ? r.result : ''}">${RES_TXT[r.result] || ''} · ${Number(r.share) | 0}%</td><td class="hm">${r.map === 'world' ? 'World' : 'Europe'} ${Number(r.sc) | 0}–${Number(r.year) | 0} · ${esc(String(r.diff || ''))}${r.week ? ' · weekly' : ''}</td><td class="hm">${Number(r.kills) | 0}</td><td class="hm">${Number(r.medals) | 0}</td><td><button class="ibtn lbw" data-watch="${i}" title="Watch this campaign month by month" aria-label="Watch">${iconSvg('play')}</button></td></tr>`).join('')}</table>` : '<p class="hint">No scores here yet. Finish a campaign and post yours.</p>';
    if (!m.hidden) {
      m.innerHTML = frame(body); wire();
      m.querySelectorAll('[data-watch]').forEach(b => b.onclick = () => { SFX.click(); lbWatch(rows[+b.dataset.watch], back); });
    }
  } catch (err) { if (!m.hidden) { m.innerHTML = frame(`<p class="hint">${esc(err.message || 'Could not reach the leaderboard.')}</p>`); wire(); } }
}
// where a verified entry stands on the boards that matter to it
async function lbStanding(entry) {
  const boards = [['Overall', null], [entry.nation, ['tag', entry.tag]]];
  if (entry.week) boards.push(['This week', ['week', entry.week]]);
  const out = [];
  for (const [label, f] of boards) {
    try {
      const rows = await LB.top(f, 200), i = rows.findIndex(r => r.id === entry.id);
      if (i < 0) { out.push({ label, txt:'outside the top 200' }); continue; }
      const above = rows[i - 1];
      out.push({ label, rank:i + 1, of:rows.length, gap:above ? (above.score - entry.score) : 0, who:above ? above.name : null });
    } catch (e) { /* a missing index or a network blip: skip that board */ }
  }
  return out;
}
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th','st','nd','rd'][n % 10] || 'th');
function standingHTML(st) {
  return st.map(s => s.rank ? `<span><b>${ord(s.rank)}</b> ${esc(s.label)}${s.who ? ` · ${s.gap} behind ${esc(s.who)}` : ' · <b class="tg">top of the board</b>'}</span>` : `<span>${esc(s.label)}: ${esc(s.txt)}</span>`).join('');
}
// the end screen's "post your score" box
function leaderboardPostBox() {
  if (!ME || !G.over || Ctl.mode === 'client' || Ctl.mode === 'watch' || G.tutGame) return '';
  const why = lbEligible(), raw = scoreOf(ME), rated = ratedScore(ME, raw);
  const def = (G.humans[ME] && G.humans[ME].name && G.humans[ME].name !== 'You') ? G.humans[ME].name : (localStorage.getItem('idom-lbname') || '');
  if (G.lbPosted && G.lbPosted.st) return `<div class="lbpost done"><div class="lbst">${standingHTML(G.lbPosted.st)}</div><button class="btn" data-lbview>Leaderboard</button></div>`;
  return `<div class="lbpost"><div class="lbscore"><b>${rated}</b><span>rated score · ${raw} × ${(nationMul(ME) * (DIFF_MUL[G.diff] || 1) * (SC_MUL[G.sc] || 1)).toFixed(2)} for ${esc(nat(ME).name)}, ${esc(G.diff)}, ${G.sc}</span></div>
    <input id="lbName" maxlength="20" placeholder="Your name" value="${esc(def)}"><button class="btn gold" data-lbpost ${why || !LB.ok() ? `disabled title="${esc(why || 'The leaderboard is not connected yet')}"` : ''}>Post</button><button class="btn" data-lbview>Leaderboard</button>
    ${why ? `<p class="hint lbwhy">${esc(why)}.</p>` : ''}<div class="lbst" id="lbSt"></div></div>`;
}
function wireLeaderboardPost(m, back) {
  const b = m.querySelector('[data-lbpost]'), v = m.querySelector('[data-lbview]');
  if (v) v.onclick = () => { if (G && G.daily) lbFilter = 'week'; showLeaderboard(back); };
  if (!b) return;
  b.onclick = async () => {
    const name = (m.querySelector('#lbName').value || '').replace(/[<>]/g, '').trim().slice(0, 20); if (!name) { m.querySelector('#lbName').focus(); return; }
    const st = m.querySelector('#lbSt'), say = t => { if (st) st.innerHTML = t; };
    b.disabled = true; b.textContent = 'Posting…';
    try {
      localStorage.setItem('idom-lbname', name);
      const card = scoreCard(ME);
      const rec = await gzip64(JSON.stringify({ ...G.rec, end:G.turn }));
      const id = await LB.submit({ name, rec, claim:card.score, tag:ME, map:card.map, week:card.week, v:String(REC_VERSION), at:new Date().toISOString() });
      b.textContent = 'Verifying…'; say('<span>The server is replaying your campaign move by move…</span>');
      let entry = null, rejected = null;
      for (let k = 0; k < 40 && !entry && !rejected; k++) {
        await new Promise(r => setTimeout(r, k < 5 ? 1500 : 3000));
        entry = await LB.get('scores', id);
        if (!entry) { const s = await LB.get('submissions', id); if (s && s.status === 'rejected') rejected = s.why || 'it did not replay to the same result'; }
      }
      if (rejected) throw new Error(`The score was not accepted: ${rejected}`);
      if (card.week) { const p = profile(); p.posted = p.posted || {}; (p.posted[card.week] = p.posted[card.week] || []).push(id); for (const k of Object.keys(p.posted).sort().slice(0, -8)) delete p.posted[k]; try { localStorage.setItem('idom-profile', JSON.stringify(p)); } catch (e) {} }
      if (!entry) { say('<span>Still being verified — check the leaderboard in a minute.</span>'); b.textContent = 'Posted'; G.lbPosted = { id }; return; }
      const standing = await lbStanding(entry);
      G.lbPosted = { id, st:standing }; Ctl.save(); // display state only: not part of the simulation
      if (card.week) lbFetchPace(true);
      b.textContent = 'Verified ✓'; SFX.confirm(); say(standingHTML(standing));
    } catch (err) { b.disabled = false; b.textContent = 'Try again'; say(`<span class="tr">${esc(err.message || 'Could not post.')}</span>`); }
  };
}

/* ---------- how a score is made (weekly screen, leaderboard, end screen) ---------- */
function scoreHelpHTML(open) {
  return `<details class="scorehelp"${open ? ' open' : ''}><summary>How scoring works</summary>
    <ul><li><b>Territory</b> — your share of all victory points on the map, in percent (20% of the world = 20 points). Nothing if your nation is destroyed.</li>
    <li><b>Secret agendas</b> — 10 points each one completed (Ledger → Destiny).</li>
    <li><b>Medals</b> — 2 points each.</li>
    <li><b>Kills</b> — 1 point for every 10 enemy divisions destroyed.</li>
    <li><b>After the war</b> — 15 points for belonging to the strongest bloc in the second act.</li></ul>
    <p>The total is then <b>rated</b>: × 1.3 on Veteran (× 0.7 on Recruit), × up to 1.1 for a later start, and × 1 to 2 for how hard the nation is, so a small country played well can top the board. The weekly challenge is always Veteran.</p></details>`;
}

/* ---------- watching a campaign from the board ---------- */
async function lbWatch(row, back) {
  if (!row) return;
  if (row.map !== MAPKIND) { if (G && !G.preview && !G.over) Ctl.save(); switchMap(row.map, '?watch=' + encodeURIComponent(row.id)); return; }
  const m = $('#modal');
  try {
    const F = await lbFilm(row.id);
    if (!F || !F.months || !F.months.length) { toast('✕', 'No replay for this campaign', 'It was posted before replays were kept.', ''); return; }
    closeModal(); m.classList.remove('over');
    const st = $('#start'), menuUp = !st.hidden; st.hidden = true;
    const idx = new Map(F.tags.map((t, i) => [i, t]));
    const frames = F.months.map(([y, mo, o, t]) => ({ y, m:mo, t, owners:[...o].map(ch => idx.get(ch.charCodeAt(0) - 48)) }));
    const who = `${String(row.name || 'Commander')} · ${String(row.nation || '')}`;
    playFilm(frames, f => `${MONTHS_L[f.m]} ${f.y} · ${who} · ${F.pace[f.t] != null ? F.pace[f.t] : row.score} pts`, F.tag, () => {
      if (menuUp) st.hidden = false;
      showLeaderboard(back);
    });
  } catch (err) { toast('✕', 'Could not load the replay', String(err.message || err), ''); }
}

/* ---------- the weekly pace line: the current #1's score at this point of their campaign ---------- */
let lbPace = null, lbPaceAt = 0;
async function lbFetchPace(force) {
  if (!G || !G.daily || !LB.ok() || G.preview) return;
  if (!force && lbPace && lbPace.key === G.daily && Date.now() - lbPaceAt < 10 * 60000) return;
  lbPaceAt = Date.now();
  try {
    const top = (await LB.top(['week', String(G.daily)], 1))[0];
    if (!top) { lbPace = { key:G.daily, none:true }; }
    else { const F = await lbFilm(top.id); lbPace = { key:G.daily, name:String(top.name || 'Commander'), score:Number(top.score) | 0, pace:F && F.pace || null, id:top.id }; }
    if (typeof renderTop === 'function' && G && !G.preview) renderTop();
  } catch (e) { /* offline: no pace line */ }
}
function paceInfo() {
  if (!G || !G.daily || !ME || !lbPace || lbPace.key !== G.daily) return null;
  const you = ratedScore(ME);
  if (lbPace.none) return { you, lead:null, txt:`${you}`, tip:'Nobody has posted this week yet: finish the campaign and the top spot is yours.' };
  const P = lbPace.pace, lead = P && P.length ? P[Math.min(G.turn, P.length - 1)] : lbPace.score;
  return { you, lead, txt:`${you} / ${lead}`, cls:you >= lead ? 'good' : 'bad',
    tip:`Your rated score now: ${you}. ${lbPace.name}, #1 this week, had ${lead} at this point of their campaign and finished on ${lbPace.score}.` };
}

/* ---------- last week's results, once at the start of each new week ---------- */
const prevWeekKey = key => weekKeyAt(weekMonday(key) - WEEK_MS);
async function lbLastWeekNews() {
  if (!LB.ok()) return;
  const p = profile(), cur = weeklyBrief().key;
  if (!p.games || p.seenWeek === cur) return;
  p.seenWeek = cur; try { localStorage.setItem('idom-profile', JSON.stringify(p)); } catch (e) {}
  const key = prevWeekKey(cur), D = weeklySpec(key);
  let rows; try { rows = await LB.top(['week', key], 200); } catch (e) { return; }
  if (!rows.length || !$('#modal').hidden || G && !G.preview) return;
  const mine = (p.posted && p.posted[key]) || [], my = rows.findIndex(r => mine.includes(r.id));
  const w = rows[0], m = $('#modal'); m.hidden = false; m.classList.add('over');
  m.innerHTML = `<div class="paper" role="dialog" aria-modal="true" aria-label="Last week's results"><div class="mast"><h5>The ${WORLD ? 'World' : 'European'} Dispatch</h5><span>Weekly challenge<br>${esc(key)}</span></div>
    <div class="head">${esc(String(w.name || 'Commander'))} Wins the Week</div>
    <p class="dek">${esc(NATDEF[D.tag] ? NATDEF[D.tag].n : D.tag)}, ${D.sc} — ${rows.length} commander${rows.length === 1 ? '' : 's'} took up the challenge</p>
    <ol class="lwk">${rows.slice(0, 3).map((r, i) => `<li><b>${ord(i + 1)}</b> ${esc(String(r.name || ''))} <span>${Number(r.score) | 0} pts · ${RES_TXT[r.result] || ''} · ${Number(r.share) | 0}%</span></li>`).join('')}</ol>
    <p class="copy" style="columns:1">${my >= 0 ? `You finished <b>${ord(my + 1)}</b> of ${rows.length} with ${rows[my].score} points${my ? `, ${rows[my - 1].score - rows[my].score} behind ${esc(String(rows[my - 1].name || ''))}` : ' — the best in the world'}.` : 'You did not post a score last week.'} This week: ${esc(weeklyBrief().line.replace(/^This week: /, ''))}.</p>
    <div class="choices"><button class="choice" data-a="watch"><span>Watch the winner</span><em>Their campaign, month by month</em></button><button class="choice" data-a="weekly"><span>This week's challenge</span><em>${esc(NATDEF[weeklyBrief().tag].n)}, ${weeklyBrief().sc}</em></button><button class="choice" data-a="x"><span>Close</span><em>Back to the war room</em></button></div></div>`;
  m.querySelectorAll('.choice').forEach(b => b.onclick = () => {
    const a = b.dataset.a; closeModal(); m.classList.remove('over');
    if (a === 'watch') lbWatch(w, null); else if (a === 'weekly') showWeekly();
  });
}
