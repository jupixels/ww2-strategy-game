'use strict';
/* ================= ONLINE LEADERBOARD =================
   Scores go to Cloud Firestore through its REST API: no SDK, no login. Anyone can read the board; each finished
   campaign can post one entry. Configure js/net/leaderboard-config.js and publish firestore.rules. */
const LB = {
  ok() { return typeof LEADERBOARD_CONFIG !== 'undefined' && !!LEADERBOARD_CONFIG.projectId && !!LEADERBOARD_CONFIG.apiKey; },
  base() { return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(LEADERBOARD_CONFIG.projectId)}/databases/(default)/documents`; },
  // plain object <-> Firestore field encoding
  enc(o) { const f = {}; for (const k in o) { const v = o[k]; if (v == null) continue; if (k === 'at') f[k] = { timestampValue:v }; else if (typeof v === 'number' && Number.isInteger(v)) f[k] = { integerValue:String(v) }; else if (typeof v === 'number') f[k] = { doubleValue:v }; else f[k] = { stringValue:String(v) }; } return { fields:f }; },
  dec(d) { const o = {}; const f = (d && d.fields) || {}; for (const k in f) { const v = f[k]; o[k] = v.integerValue != null ? +v.integerValue : v.doubleValue != null ? v.doubleValue : v.timestampValue || v.stringValue; } return o; },
  async post(entry) {
    if (!this.ok()) throw new Error('The leaderboard is not set up yet');
    const r = await fetch(`${this.base()}/scores?key=${encodeURIComponent(LEADERBOARD_CONFIG.apiKey)}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(this.enc(entry)) });
    if (!r.ok) throw new Error(`The leaderboard refused the score (${r.status})`);
    return true;
  },
  async top(n = 200) {
    if (!this.ok()) throw new Error('The leaderboard is not set up yet');
    const q = { structuredQuery:{ from:[{ collectionId:'scores' }], orderBy:[{ field:{ fieldPath:'score' }, direction:'DESCENDING' }], limit:n } };
    const r = await fetch(`${this.base()}:runQuery?key=${encodeURIComponent(LEADERBOARD_CONFIG.apiKey)}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(q) });
    if (!r.ok) throw new Error(`Could not reach the leaderboard (${r.status})`);
    const rows = await r.json();
    return rows.filter(x => x.document).map(x => this.dec(x.document));
  },
};
// the entry for the nation on this screen, from a finished game
function leaderboardEntry(name) {
  const t = ME, n = nat(t), o = G.over || {};
  return { name:String(name || 'Commander').replace(/[<>]/g, '').trim().slice(0, 20) || 'Commander', tag:t, nation:n.name.slice(0, 40), score:Math.max(0, Math.min(3000, scoreOf(t) | 0)),
    share:Math.round(vpOf(t) / totalVP() * 100), result:o.type === 'victory' && o.winners.includes(t) ? 'victory' : o.type === 'defeat' || !A(t) ? 'defeat' : 'time',
    sc:String(G.sc), map:G.map || (WORLD ? 'world' : 'europe'), diff:G.diff, mode:G.mode, year:G.y, medals:medalsOf(t).length, kills:n.st.kills | 0, won:n.st.won | 0, lost:n.st.lost | 0,
    daily:G.daily ? String(G.daily.key || G.daily) : null, v:'1', at:new Date().toISOString() };
}
let lbFilter = 'all';
async function showLeaderboard(back) {
  const m = $('#modal'); m.hidden = false; m.classList.add('over'); // above the main menu too
  const frame = body => `<div class="helpcard lb" role="dialog" aria-modal="true"><div class="hh"><h2>Leaderboard</h2><button class="ibtn" data-x aria-label="Close">✕</button></div>
    <div class="subtabs">${[['all','All campaigns'],['world','World map'],['europe','Europe map'],['daily','Today\'s challenge']].map(([k, l]) => `<button class="${lbFilter === k ? 'on' : ''}" data-lbf="${k}">${l}</button>`).join('')}</div><div class="lbb">${body}</div></div>`;
  const wire = () => { m.querySelector('[data-x]').onclick = () => { closeModal(); if (back) back(); }; m.querySelectorAll('[data-lbf]').forEach(b => b.onclick = () => { lbFilter = b.dataset.lbf; showLeaderboard(back); }); };
  if (!LB.ok()) { m.innerHTML = frame(`<p class="hint">The online leaderboard is not set up on this copy of the game yet. The owner connects it to a free Google Firebase project (see the README) — no player accounts are needed.</p>`); wire(); return; }
  m.innerHTML = frame('<p class="hint">Fetching the scores…</p>'); wire();
  try {
    let rows = await LB.top(200);
    const today = typeof dailyBrief === 'function' ? dailyBrief().key : null;
    if (lbFilter === 'world' || lbFilter === 'europe') rows = rows.filter(r => r.map === lbFilter);
    if (lbFilter === 'daily') rows = rows.filter(r => r.daily && r.daily === String(today));
    const res = { victory:'Victory', time:'Survived', defeat:'Defeated' };
    const body = rows.length ? `<table class="lbt"><tr><th>#</th><th>Commander</th><th>Nation</th><th>Score</th><th>Result</th><th class="hm">Campaign</th><th class="hm">Kills</th><th class="hm">Medals</th></tr>${rows.slice(0, 100).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${G && G.nat && G.nat[r.tag] || NATDEF[r.tag] ? flagImg(r.tag) : ''} ${esc(r.nation)}</td><td><b>${r.score}</b></td><td class="${r.result}">${res[r.result] || ''} · ${r.share}%</td><td class="hm">${esc(r.map === 'world' ? 'World' : 'Europe')} ${esc(r.sc)}–${r.year} · ${esc(r.diff)}</td><td class="hm">${r.kills}</td><td class="hm">${r.medals}</td></tr>`).join('')}</table>` : '<p class="hint">No scores here yet. Finish a campaign and post yours.</p>';
    if (!m.hidden) { m.innerHTML = frame(body); wire(); }
  } catch (err) { if (!m.hidden) { m.innerHTML = frame(`<p class="hint">${esc(err.message || 'Could not reach the leaderboard.')}</p>`); wire(); } }
}
// the end screen's "post your score" box
function leaderboardPostBox() {
  if (!ME || !G.over || G.lbPosted || Ctl.mode === 'client' || Ctl.mode === 'watch' || G.tutGame) return '';
  const def = (G.humans[ME] && G.humans[ME].name && G.humans[ME].name !== 'You') ? G.humans[ME].name : (localStorage.getItem('idom-lbname') || '');
  return `<div class="lbpost"><input id="lbName" maxlength="20" placeholder="Your name for the leaderboard" value="${esc(def)}"><button class="btn gold" data-lbpost ${LB.ok() ? '' : 'disabled title="The leaderboard is not set up yet"'}>Post score ${scoreOf(ME)}</button><button class="btn" data-lbview>Leaderboard</button></div>`;
}
function wireLeaderboardPost(m, back) {
  const b = m.querySelector('[data-lbpost]'), v = m.querySelector('[data-lbview]');
  if (v) v.onclick = () => { showLeaderboard(back); };
  if (!b) return;
  b.onclick = async () => {
    const name = (m.querySelector('#lbName').value || '').trim(); if (!name) { m.querySelector('#lbName').focus(); return; }
    b.disabled = true; b.textContent = 'Posting…';
    try { await LB.post(leaderboardEntry(name)); G.lbPosted = 1; localStorage.setItem('idom-lbname', name); Ctl.save(); b.textContent = 'Posted ✓'; SFX.confirm(); }
    catch (err) { b.disabled = false; b.textContent = 'Try again'; toast('✕', 'Score not posted', err.message || '', 'war'); }
  };
}
