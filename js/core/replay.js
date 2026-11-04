'use strict';
/* ================= RECORDING AND REPLAY =================
   A single-player campaign is fully determined by its start options, its seed and the commands the player gave.
   newGame() starts G.rec = { o:start options, c:[[turn, tag, command], …], intro }; doCommand() appends to it.
   replayGame() rebuilds the game from scratch — the leaderboard's verifier uses it to recompute a posted score.
   Anything that changes G outside doCommand marks the record unverifiable (G.rec.bad). */
function recStart(opts) {
  if ((opts.mode || 'sp') !== 'sp' || !opts.humans || Object.keys(opts.humans).length !== 1) return null;
  const o = { humans:opts.humans, diff:opts.diff || 'normal', scenario:opts.scenario || 1936, gm:opts.gm || 'grand', seed:G.seed, daily:opts.daily || null, map:G.map, v:REC_VERSION, build:typeof GAME_BUILD !== 'undefined' ? GAME_BUILD : null };
  return { o:JSON.parse(JSON.stringify(o)), c:[], intro:0 };
}
const REC_VERSION = 1;
function recCommand(t, c) {
  const R = G.rec; if (!R || R.bad || !isHuman(t)) return;
  R.c.push([G.turn, t, JSON.parse(JSON.stringify(c))]);
}
const recBad = why => { if (G.rec) G.rec.bad = why; };
// the opening newspaper is part of the record: it takes an inbox id
function introNews(t) {
  const n = nat(t);
  if (G.rec) G.rec.intro = 1;
  sendNews(t, { title:'A New Year Dawns', head:`${n.name} Prepares for the Storm`, dek:`${dateStr()}: the cabinet meets as ${REALM} ${G.y >= 1939 ? 'burns' : 'slides toward war'}`, text:`${NATDEF[t].brief || SCENARIOS[G.sc].d} Select a province to command its armies, pick a National Focus, start research and play your cards. Press End Month when done.${n.agendas && n.agendas.length ? ' You have been handed secret agendas — see the Ledger.' : ''}`, plate:t });
}
// rebuild a recorded game up to the start of `turn` (or until the record runs out); returns G
function replayGame(rec, turn) {
  newGame({ ...JSON.parse(JSON.stringify(rec.o)), mode:'sp' });
  G.rec = null;
  const tag = Object.keys(rec.o.humans)[0];
  if (rec.intro) introNews(tag);
  const cmds = rec.c; let k = 0, guard = 0;
  const end = turn != null ? turn : cmds.length ? cmds[cmds.length - 1][0] : 0;
  while (guard++ < 2000) {
    while (k < cmds.length && cmds[k][0] === G.turn) { const [, t, c] = cmds[k++]; doCommand(t, c, 'instant'); checkVictory(); }
    if (G.turn >= end) break;
    if (k < cmds.length && cmds[k][0] < G.turn) return null; // out of order: not a real record
    endMonth();
  }
  return G;
}
// what the board shows for a game: recomputed from the state, never taken from the client
function scoreCard(t) {
  const n = nat(t), o = G.over || {};
  const raw = Math.max(0, scoreOf(t) | 0);
  return { tag:t, nation:n.name.slice(0, 40), raw, score:ratedScore(t, raw), share:Math.round(vpOf(t) / totalVP() * 100),
    result:o.type === 'victory' && o.winners.includes(t) ? 'victory' : o.type === 'defeat' || !A(t) ? 'defeat' : 'time',
    sc:String(G.sc), map:G.map || (WORLD ? 'world' : 'europe'), diff:G.diff, year:G.y, turn:G.turn, medals:medalsOf(t).length, kills:n.st.kills | 0, won:n.st.won | 0, lost:n.st.lost | 0,
    week:G.daily ? String(G.daily) : null };
}
// a result judged against what was expected of that nation, difficulty and start: Poland holding out beats Germany coasting
const DIFF_MUL = { easy:0.7, normal:1, hard:1.3 };
const SC_MUL = { 1936:1, 1939:1, 1941:1.05, 1944:1.1 };
function nationMul(t) { const s = NATDEF[t] ? NATDEF[t].stars || 3 : 3; return 0.75 + 0.25 * s; }
function ratedScore(t, raw) { return Math.round((raw != null ? raw : scoreOf(t)) * nationMul(t) * (DIFF_MUL[G.diff] || 1) * (SC_MUL[G.sc] || 1)); }

/* ---------- the weekly challenge, from its key alone (the verifier checks a weekly record against this) ---------- */
// two weeks in three go to a great power; the rest to a smaller nation with a story of its own
const WEEKLY_POOL = {
  world:{ great:['GER','SOV','ENG','USA','JAP','ITA','FRA','CHI'], minor:['POL','FIN','GRE','YUG','SIA','ETH','HOL','ROM','TUR','AST','RAJ','BRA'] },
  europe:{ great:['GER','SOV','ENG','ITA','FRA'], minor:['POL','FIN','GRE','YUG','ROM','TUR','SWE','HUN','CZE','SPA','BEL'] },
};
// nations already gone by a start date — the same on both maps, so a brief never changes after a map switch
const WEEKLY_GONE = { 1936:[], 1939:['CZE','AUS','ETH'], 1941:['CZE','AUS','ETH','POL','FRA','NOR','DEN','HOL','BEL','YUG','GRE'], 1944:['CZE','AUS','ETH','POL','FRA','NOR','DEN','HOL','BEL','YUG','GRE'] };
// The schedule is a pure function of the week key, so every week is already queued, years ahead, with no server.
// From WEEKLY_EPOCH on, each week re-rolls (salt 1, 2, …) until its nation differs from the last three weeks'
// and its map + start date from last week's, so the challenge never repeats back to back.
const WEEKLY_EPOCH = '2026-W45', WEEK_MS = 7 * 86400000;
function weekMonday(key) {                       // 'YYYY-Www' → UTC ms of that ISO week's Monday
  const m = /^(\d{4})-W(\d{2})$/.exec(key); if (!m) return NaN;
  const j4 = Date.UTC(+m[1], 0, 4), dow = new Date(j4).getUTCDay() || 7;
  return j4 - (dow - 1) * 86400000 + (+m[2] - 1) * WEEK_MS;
}
function weekKeyAt(ms) {                         // UTC ms inside a week → its key
  const t = new Date(ms), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
function weeklyRoll(key, salt) {
  const h = hashStr('idom-week' + key + (salt ? '#' + salt : '')), map = (h >>> 3) % 2 ? 'world' : 'europe';
  const sc = [1936, 1939, 1939, 1941, 1936, 1944][h % 6];
  const P = WEEKLY_POOL[map], ok = t => NATDEF[t] && !WEEKLY_GONE[sc].includes(t);
  const great = P.great.filter(ok), pool = (h >>> 9) % 3 < 2 && great.length ? great : P.minor.filter(ok);
  return { key, sc, tag:pool[(h >>> 5) % pool.length], map, seed:h, endY:Math.min(1950, sc + 6), diff:'hard' };
}
const WEEKLY_CACHE = {};
function weeklySpec(key) {
  if (WEEKLY_CACHE[key]) return WEEKLY_CACHE[key];
  const e = weekMonday(WEEKLY_EPOCH), k = weekMonday(key);
  if (!(k > e)) return weeklyRoll(key, 0);
  const prev = [];
  for (let ms = e; ms <= k; ms += WEEK_MS) {
    const wk = weekKeyAt(ms); let D = WEEKLY_CACHE[wk];
    if (!D) {
      for (let salt = 0; salt < 16; salt++) {
        D = weeklyRoll(wk, salt);
        const last = prev[prev.length - 1];
        if (!prev.slice(-3).some(p => p.tag === D.tag) && !(last && last.map === D.map && last.sc === D.sc)) break;
      }
      WEEKLY_CACHE[wk] = D;
    }
    prev.push(D);
  }
  return WEEKLY_CACHE[key];
}
// the next n challenges after this one
function weeklyNext(key, n) { const out = [], k = weekMonday(key); for (let i = 1; i <= n; i++) out.push(weeklySpec(weekKeyAt(k + i * WEEK_MS))); return out; }
