// Drives the game in headless Chromium: menu, campaign start, some orders, end month. Screenshots + console errors.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT || '/tmp/shots';
(async () => {
  require('fs').mkdirSync(OUT, { recursive:true });
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W||1440), height:+(process.env.H||900) }, deviceScaleFactor:1 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n')));
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(2500);
  await page.screenshot({ path:OUT + '/01-menu.png' });
  const steps = (process.env.STEPS || 'camp').split(',');
  if (steps.includes('camp')) {
    await page.click('[data-go="camp"]'); await page.waitForTimeout(600);
    await page.screenshot({ path:OUT + '/02-campaign.png' });
    await page.click('#bBegin'); await page.waitForTimeout(1500);
    await page.screenshot({ path:OUT + '/03-start.png' });
    // dismiss newspaper
    for (let i = 0; i < 3; i++) { const b = await page.$('#modal .choice'); if (b) { await b.click(); await page.waitForTimeout(400); } }
    await page.screenshot({ path:OUT + '/04-map.png' });
    await page.evaluate(() => { select(ID['Munich']); centerOn(ID['Munich'], 1.6); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path:OUT + '/05-munich.png' });
    await page.evaluate(() => openTab('army')); await page.waitForTimeout(300); await page.screenshot({ path:OUT + '/06-army.png' });
    for (const t of ['industry','focus','tech','dip','intel','dec','log']) { await page.evaluate(t => openTab(t), t); await page.waitForTimeout(250); await page.screenshot({ path:OUT + `/07-${t}.png` }); }
    await page.evaluate(() => openTab(tab));
    for (let m = 0; m < +(process.env.MONTHS||3); m++) {
      await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(2200);
      for (let i = 0; i < 5; i++) { const b = await page.$('#modal .choice'); if (b) { await b.click(); await page.waitForTimeout(300); } }
    }
    await page.screenshot({ path:OUT + '/08-after.png' });
  }
  console.log(errs.length ? errs.slice(0, 30).join('\n') : 'NO CONSOLE ERRORS');
  await browser.close();
})();
