// Leaderboard UI against a mocked Firestore REST API (no network needed). OUT=<dir> for screenshots.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.PW ? undefined : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W || 1440), height:+(process.env.H || 900) } });
  const errs = [], posted = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const fields = o => { const f = {}; for (const k in o) f[k] = typeof o[k] === 'number' ? { integerValue:String(o[k]) } : { stringValue:o[k] }; return { fields:f }; };
  const db = [{ name:'Rommel fan', tag:'GER', nation:'Germany', score:412, share:31, result:'victory', sc:'1936', map:'world', diff:'hard', mode:'sp', year:1944, medals:12, kills:880 },
              { name:'Churchill', tag:'ENG', nation:'United Kingdom', score:288, share:14, result:'time', sc:'1939', map:'europe', diff:'normal', mode:'sp', year:1950, medals:8, kills:410 }];
  await page.route('https://firestore.googleapis.com/**', async route => {
    const req = route.request();
    if (req.url().includes(':runQuery')) return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(db.map(d => ({ document:fields(d) }))) });
    const body = JSON.parse(req.postData()); posted.push(body);
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ name:'x', ...body }) });
  });
  await page.goto('http://localhost:8765/index.html?map=world'); await page.waitForTimeout(1500);
  // not configured: a clear message
  await page.click('[data-go="lb"]'); await page.waitForTimeout(300);
  console.log('  unconfigured:', (await page.evaluate(() => $('#modal').innerText)).includes('not set up'));
  await page.evaluate(() => closeModal());
  await page.evaluate(() => { LEADERBOARD_CONFIG.projectId = 'test-project'; LEADERBOARD_CONFIG.apiKey = 'k'; });
  await page.click('[data-go="lb"]'); await page.waitForTimeout(600);
  console.log('  rows:', await page.evaluate(() => document.querySelectorAll('.lbt tr').length - 1));
  if (OUT) await page.screenshot({ path:`${OUT}/lb-board.png` });
  await page.click('[data-lbf="europe"]'); await page.waitForTimeout(400);
  console.log('  europe rows:', await page.evaluate(() => document.querySelectorAll('.lbt tr').length - 1));
  await page.evaluate(() => closeModal());
  // finish a game and post
  await page.evaluate(() => { startGame({ humans:{ FRA:{ name:'You' } }, diff:'normal', scenario:1939, mode:'sp', seed:5, noIntro:true }); G.inbox[ME] = []; closeModal(); G.over = { type:'time', winners:[], reason:'Test end.' }; showEnd(); });
  await page.waitForTimeout(600);
  await page.fill('#lbName', 'Tester'); await page.click('[data-lbpost]'); await page.waitForTimeout(500);
  if (OUT) await page.screenshot({ path:`${OUT}/lb-end.png` });
  console.log('  posted:', posted.length, posted[0] && Object.keys(posted[0].fields).join(','), posted[0] && posted[0].fields.name.stringValue, 'button:', await page.evaluate(() => $('[data-lbpost]').textContent));
  console.log(errs.length ? errs.join('\n') : '   NO ERRORS');
  await browser.close();
  process.exit(errs.length || posted.length !== 1 ? 1 : 0);
})();
