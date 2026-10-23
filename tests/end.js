const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:1280, height:800 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => { startGame({ humans:{ GER:{ name:'You' } }, scenario:1939, mode:'sp', seed:3, noIntro:true }); });
  // a peace offer from Poland
  await page.evaluate(() => { sendDecision('GER', { kind:'peace', from:'POL', terms:'terms', winner:'GER' }); flushInbox(); });
  await page.waitForTimeout(600); if (OUT) await page.screenshot({ path:OUT + '/e1-peace.png' });
  await page.click('#modal .choice[data-k="1"]'); await page.waitForTimeout(400);
  console.log('war with POL after accepting:', await page.evaluate(() => W('GER', 'POL')));
  // run 18 months quickly, then force the end
  await page.evaluate(() => { for (let i = 0; i < 18; i++) endMonth(); G.over = { type:'victory', winners:['GER'], reason:'Test victory.' }; showEnd(); });
  await page.waitForTimeout(800); if (OUT) await page.screenshot({ path:OUT + '/e2-end.png' });
  await page.click('#modal .choice[data-a="lapse"]'); await page.waitForTimeout(1500);
  if (OUT) await page.screenshot({ path:OUT + '/e3-lapse.png' });
  await page.waitForTimeout(4500);
  console.log('lapse finished, modal back:', await page.evaluate(() => !!document.querySelector('#modal .final')), 'career', await page.evaluate(() => localStorage.getItem('idom-profile')));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await browser.close();
})();
