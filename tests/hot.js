const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W||1280), height:+(process.env.H||800) }, isMobile:!!process.env.MOBILE, hasTouch:!!process.env.MOBILE, deviceScaleFactor:process.env.MOBILE ? 2 : 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(1500);
  if (OUT) await page.screenshot({ path:OUT + '/h0-menu.png' });
  await page.evaluate(() => showHotseat()); await page.waitForTimeout(300);
  if (OUT) await page.screenshot({ path:OUT + '/h1-setup.png' });
  await page.click('#bBegin'); await page.waitForTimeout(800);
  if (OUT) await page.screenshot({ path:OUT + '/h2-pass.png' });
  const seq = [];
  for (let k = 0; k < 4; k++) {
    await page.click('#passGo'); await page.waitForTimeout(500);
    for (let i = 0; i < 5; i++) { const b = await page.$('#modal .choice'); if (b) { await b.click(); await page.waitForTimeout(200); } }
    seq.push(await page.evaluate(() => ME + '@' + dateStr()));
    if (k === 0 && OUT) { await page.evaluate(() => { select(homeProv(ME)); }); await page.waitForTimeout(400); await page.screenshot({ path:OUT + '/h3-turn.png' }); await page.evaluate(() => clearSelection()); }
    await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900);
  }
  console.log('sequence', seq.join(' → '));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await browser.close();
})();
