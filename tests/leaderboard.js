// End-to-end leaderboard test without the internet: a mock Firestore (page.route) stores submissions and runs the
// real verifier (functions/verify.js) on them, as the Cloud Function would. The game is played in the browser
// through the real UI, so this also proves the browser's record replays to the same score in Node.
// Needs the server (python3 -m http.server 8765) and `node functions/sync.js`. OUT=<dir> for screenshots.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const zlib = require('zlib');
const { verify } = require('../functions/verify');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.PW ? undefined : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W || 1440), height:+(process.env.H || 900) } });
  const errs = [], log = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const enc = o => { const f = {}; for (const k in o) { const v = o[k]; f[k] = v == null ? { nullValue:null } : typeof v === 'number' ? { integerValue:String(v) } : typeof v === 'boolean' ? { booleanValue:v } : { stringValue:String(v) }; } return f; };
  const dec = f => { const o = {}; for (const k in f) { const v = f[k]; o[k] = 'integerValue' in v ? +v.integerValue : 'stringValue' in v ? v.stringValue : 'timestampValue' in v ? v.timestampValue : 'booleanValue' in v ? v.booleanValue : null; } return o; };
  const P = 'projects/test-project/databases/(default)/documents';
  const scores = { a1:{ name:'Rommel fan', tag:'GER', nation:'Germany', score:412, share:31, result:'victory', sc:'1936', map:'europe', diff:'hard', year:1944, medals:12, kills:880 },
                   a2:{ name:'Pilsudski', tag:'POL', nation:'Poland', score:3, share:2, result:'defeat', sc:'1939', map:'europe', diff:'normal', year:1939, medals:0, kills:12 } };
  const subs = {}; let nid = 0;
  await page.route('https://firestore.googleapis.com/**', async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname;
    const json = (o, status = 200) => route.fulfill({ status, contentType:'application/json', body:JSON.stringify(o) });
    if (p.endsWith(':runQuery')) {
      const q = JSON.parse(req.postData()).structuredQuery, w = q.where && q.where.fieldFilter;
      let rows = Object.entries(scores).filter(([, s]) => !w || s[w.field.fieldPath] === w.value.stringValue).sort((a, b) => b[1].score - a[1].score).slice(0, q.limit);
      log.push('query ' + (w ? w.field.fieldPath + '=' + w.value.stringValue : 'all'));
      return json(rows.map(([id, s]) => ({ document:{ name:`${P}/scores/${id}`, fields:enc(s) } })));
    }
    if (req.method() === 'POST' && p.endsWith('/submissions')) {
      const id = 's' + (++nid), sub = dec(JSON.parse(req.postData()).fields); subs[id] = sub;
      // the Cloud Function's job, done right here
      try { const card = verify(sub); scores[id] = { ...card, name:sub.name, verified:true }; log.push(`verified ${id}: ${card.score}`); }
      catch (e) { sub.status = 'rejected'; sub.why = e.message; log.push(`rejected ${id}: ${e.message}`); }
      return json({ name:`${P}/submissions/${id}`, fields:enc(sub) });
    }
    const m = p.match(/\/(scores|submissions)\/([^/]+)$/);
    if (m) { const d = (m[1] === 'scores' ? scores : subs)[m[2]]; return d ? json({ name:`${P}/${m[1]}/${m[2]}`, fields:enc(d) }) : json({ error:{ message:'not found' } }, 404); }
    return json({ error:{ message:'unexpected ' + p } }, 400);
  });
  await page.goto('http://localhost:8765/index.html?map=europe'); await page.waitForTimeout(1500);
  await page.click('[data-go="lb"]'); await page.waitForTimeout(300);
  console.log('  unconfigured message:', (await page.evaluate(() => $('#modal').innerText)).includes('not connected'));
  await page.evaluate(() => { closeModal(); LEADERBOARD_CONFIG.projectId = 'test-project'; LEADERBOARD_CONFIG.apiKey = 'k'; });
  await page.click('[data-go="lb"]'); await page.waitForTimeout(500);
  console.log('  overall rows:', await page.evaluate(() => document.querySelectorAll('.lbt tr').length - 1));
  await page.click('[data-lbf="nation"]'); await page.waitForTimeout(400);
  await page.selectOption('[data-lbn]', 'POL'); await page.waitForTimeout(400);
  console.log('  Poland rows:', await page.evaluate(() => document.querySelectorAll('.lbt tr').length - 1));
  if (OUT) await page.screenshot({ path:`${OUT}/lb-board.png` });
  await page.evaluate(() => closeModal());
  // play Poland in 1939 through the real UI until it falls
  await page.evaluate(() => startGame({ humans:{ POL:{ name:'You' } }, diff:'normal', scenario:1939, mode:'sp', seed:77 }));
  await page.waitForTimeout(600);
  const close = async () => { for (let i = 0; i < 8; i++) { const b = await page.$('#modal .choice:not([data-a]), #modal [data-done], #modal [data-n]'); if (!b) break; await b.click(); await page.waitForTimeout(150); } };
  for (let m = 0; m < 30; m++) {
    await close();
    if (await page.evaluate(() => !!G.over)) break;
    await page.evaluate(() => { const t = ME; if (!A(t)) return; const h = homeProv(t); Ctl.act({ c:'buildN', k:'inf', pid:h, n:2 }); const fk = focusFor(t, false).find(f => !focusState(t, f.k)); if (fk) Ctl.act({ c:'focus', k:fk.k }); if (!frontsOf(t).length) Ctl.act({ c:'front', op:'auto' }); });
    await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => { if (!$('#lbName')) { closeModal(); showEnd(); } });
  await page.waitForTimeout(400);
  console.log('  game over:', await page.evaluate(() => JSON.stringify(G.over && G.over.type)), 'moves', await page.evaluate(() => G.rec && G.rec.c.length));
  await page.fill('#lbName', 'Tester'); await page.click('[data-lbpost]');
  await page.waitForFunction(() => /Verified|Try again|Still/.test($('[data-lbpost]').textContent), null, { timeout:60000 });
  const res = await page.evaluate(() => ({ btn:$('[data-lbpost]').textContent, st:$('#lbSt').innerText }));
  console.log('  post:', JSON.stringify(res));
  if (OUT) await page.screenshot({ path:`${OUT}/lb-end.png` });
  console.log('  server:', log.filter(l => /verified|rejected/.test(l)).join(' / '));
  console.log(errs.length ? errs.join('\n') : '   NO ERRORS');
  await browser.close();
  process.exit(errs.length || !/Verified/.test(res.btn) ? 1 : 0);
})();
