// Replays a leaderboard submission with the game's own simulation and returns the entry to publish, or throws
// an Error whose message says why it was refused. Pure Node: no Firebase here, so tests can call it directly.
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const BUILDS = path.join(__dirname, 'builds');
const index = () => JSON.parse(fs.readFileSync(path.join(BUILDS, 'index.json'), 'utf8'));
const TEXT = {}, SRC = {};
const text = f => TEXT[f] || (TEXT[f] = zlib.gunzipSync(fs.readFileSync(path.join(BUILDS, f))).toString('utf8'));
// the simulation exactly as it was in that build (the newest when build is not given)
function engine(map, build) {
  const all = index().builds, B = build ? all.find(b => b.id === build) : all[0];
  if (!B) return null;
  const key = B.id + '|' + map;
  if (!SRC[key]) SRC[key] = new vm.Script(text(B[map]) + '\n;\n' + text(B.core) + '\n;globalThis.__api = { get G(){ return G; } };', { filename:'core.js' });
  const ctx = vm.createContext({ console:{ log(){}, warn(){}, error(){} }, Math, JSON, Date, Set, Map, Int16Array, Int32Array, Uint8Array, Float32Array, Object, Array, String, Number });
  SRC[key].runInContext(ctx);
  return { ctx, ev:code => vm.runInContext(code, ctx, { timeout:240000 }) };
}
const no = msg => { throw new Error(msg); };
function verify(sub) {
  if (!sub || typeof sub.rec !== 'string' || sub.rec.length > 900000) no('the game record is missing or too large');
  let rec; try { rec = JSON.parse(zlib.gunzipSync(Buffer.from(sub.rec, 'base64'), { maxOutputLength:20e6 }).toString('utf8')); } catch (e) { no('the game record could not be read'); }
  if (!rec || !rec.o || !rec.o.humans || typeof rec.o.humans !== 'object' || Object.keys(rec.o.humans).length !== 1) no('the game record is malformed');
  if (!Array.isArray(rec.c) || rec.c.length > 60000 || !Number.isInteger(rec.end) || rec.end < 0 || rec.end > 240) no('the game record is malformed');
  if (rec.bad) no('the campaign changed hands');
  if (rec.o.map !== 'world' && rec.o.map !== 'europe' || rec.o.map !== sub.map) no('the map does not match');
  const E = engine(rec.o.map, rec.o.build); if (!E) no('the game has been updated too many times since this campaign was played');
  const { ctx, ev } = E;
  const tag0 = Object.keys(rec.o.humans)[0];
  if (!ev(`!!NATDEF[${JSON.stringify(tag0)}]`)) no('unknown nation');
  if ((rec.o.daily || null) !== (sub.week || null)) no('the weekly challenge does not match');
  if (rec.o.daily) {
    const W = JSON.parse(ev(`JSON.stringify(weeklySpec(${JSON.stringify(String(rec.o.daily))}))`));
    if (W.tag !== tag0 || W.sc !== rec.o.scenario || W.seed !== rec.o.seed || rec.o.diff !== W.diff || W.map !== rec.o.map || (rec.o.gm || 'grand') !== 'grand') no('this is not the weekly challenge it claims to be');
  }
  ctx.__rec = rec; ctx.__pace = [];
  // the rated score at the start of every month: the pace line the next players race against
  if (!ev('replayGame(__rec, __rec.end, t => { const h = humanTags()[0]; __pace[t] = h ? ratedScore(h) : 0; })')) no('the moves are out of order');
  if (!ev('!!G.over')) no('the campaign is not finished');
  const tag = ev('humanTags()[0]');
  const card = JSON.parse(ev(`JSON.stringify(scoreCard(${JSON.stringify(tag)}))`));
  if (card.score !== sub.claim) no(`it replayed to a score of ${card.score}, not ${sub.claim}`);
  // what "Watch" plays back: every month's map (one character per province, indexing tags) and the pace line
  const film = JSON.parse(ev(`JSON.stringify({ tags:Object.keys(NATDEF), months:G.hist.map(h => [h.y, h.m, h.o, h.t]) })`));
  film.pace = Array.from(ctx.__pace, v => v | 0); film.tag = tag; film.map = rec.o.map; film.sc = rec.o.scenario;
  return { ...card, build:ev('GAME_BUILD'), film };
}
module.exports = { verify };
