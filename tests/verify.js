// Runs the leaderboard verifier (functions/verify.js) on locally played weekly-challenge campaigns: an honest
// submission must pass, a doctored score or doctored moves must fail. node functions/sync.js first.
const { load } = require('./load'), zlib = require('zlib');
const { verify } = require('../functions/verify');
// the first weekly challenge from the given week on that is played on this map (MAP=world or Europe)
let api = load(), key = null, W = null;
const want = process.env.MAP === 'world' ? 'world' : 'europe';
for (let w = +(process.argv[2] || 45); w < 99 && !key; w++) { const k = `2026-W${w}`, s = JSON.parse(api.eval(`JSON.stringify(weeklySpec('${k}'))`)); if (s.map === want) { key = k; W = s; } }
const tag = W.tag;
api.newGame({ humans:{ [tag]:{ name:'Tester' } }, scenario:W.sc, seed:W.seed, diff:'hard', mode:'sp', daily:key });
api.eval(`introNews('${tag}')`);
const play = () => { const cmds = api.eval(`(() => { const t = humanTags()[0], n = nat(t), out = []; if (!A(t)) return out;
  const h = homeProv(t); if (h >= 0) out.push({ c:'buildN', k:'inf', pid:h, n:2 });
  const tk = TECHS.find(T => !techState(t, T.k)); if (tk) out.push({ c:'research', k:tk.k });
  const fk = focusFor(t, n.major).find(f => !focusState(t, f.k)); if (fk) out.push({ c:'focus', k:fk.k });
  if (!frontsOf(t).length && enemiesOf(t).length) out.push({ c:'front', op:'auto' });
  for (const f of frontsOf(t)) out.push({ c:'front', op:'order', id:f.id, order:'advance' });
  for (const it of inboxOf(t)) out.push({ c:'answer', uid:it.uid, choice:it.type === 'decision' ? 1 : 0 });
  return out.map(c => [t, c]); })()`); for (const [t, c] of cmds) { api.doCommand(t, c, 'instant'); api.eval('checkVictory()'); } };
let guard = 0;
while (!api.G.over && guard++ < 200) { play(); api.endMonth(); }
const t = api.eval('humanTags()[0]'), card = JSON.parse(api.eval(`JSON.stringify(scoreCard('${t}'))`));
const rec = JSON.parse(api.eval('JSON.stringify({ ...G.rec, end:G.turn })'));
const pack = r => zlib.gzipSync(JSON.stringify(r)).toString('base64');
const sub = { name:'Tester', rec:pack(rec), claim:card.score, tag, map:W.map, week:key, v:'1' };
console.log(`${key}: ${W.tag} ${W.sc} on ${W.map}, ${rec.c.length} moves, ${api.G.turn} months, rated ${card.score}, record ${Math.round(sub.rec.length / 1024)} KB gzipped`);
let fails = 0;
const expect = (name, s, good) => { if (good === 'either') { try { verify(s); console.log('ok   ' + name + ' → accepted (same outcome)'); } catch (e) { console.log('ok   ' + name + ' → refused: ' + e.message); } return; } const t0 = Date.now(); try { const r = verify(s); console.log((good ? 'ok   ' : 'FAIL ') + name + ` → accepted, score ${r.score} (${Date.now() - t0} ms)`); if (!good) fails++; } catch (e) { console.log((good ? 'FAIL ' : 'ok   ') + name + ` → refused: ${e.message}`); if (good) fails++; } };
expect('honest submission', sub, true);
expect('inflated score', { ...sub, claim:card.score + 50 }, false);
const r2 = JSON.parse(JSON.stringify(rec)); r2.c = r2.c.filter(([, , c]) => c.c !== 'front' && c.c !== 'focus'); expect('moves removed', { ...sub, rec:pack(r2) }, api.G.turn < 24 ? 'either' : false);
const r3 = JSON.parse(JSON.stringify(rec)); r3.o.seed = (r3.o.seed + 1) >>> 0; expect('different dice for the weekly', { ...sub, rec:pack(r3) }, false);
const r4 = JSON.parse(JSON.stringify(rec)); r4.o.build = 'old'; expect('older game version', { ...sub, rec:pack(r4) }, false);
// a build still in the verifier's archive (functions/builds/index.json) is replayed with its own code
{ const fs = require('fs'), f = require('path').join(__dirname, '../functions/builds/index.json'), keep = fs.readFileSync(f, 'utf8'), ix = JSON.parse(keep);
  try { ix.builds.push({ ...ix.builds[0], id:'archivedtest' }); fs.writeFileSync(f, JSON.stringify(ix)); const r5 = JSON.parse(JSON.stringify(rec)); r5.o.build = 'archivedtest'; expect('game from an archived build', { ...sub, rec:pack(r5) }, true); }
  finally { fs.writeFileSync(f, keep); } }
expect('garbage record', { ...sub, rec:'aGVsbG8=' }, false);
console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
