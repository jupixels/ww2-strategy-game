const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(1500);
  await page.evaluate(() => startGame({ humans:{ SOV:{ name:'You' } }, diff:'normal', scenario:1941, mode:'sp', seed:5 }));
  await page.waitForTimeout(500);
  await page.evaluate(() => { closeModal(); for (const it of [...inboxOf(ME)]) answer(ME, it.uid, 0); });
  const measure = () => page.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); const f = () => { if (++n < 90) requestAnimationFrame(f); else res(((performance.now() - t0) / 90).toFixed(1) + 'ms fx=' + FX.length + ' parts=' + PARTS.length); }; requestAnimationFrame(f); }));
  console.log('idle', await measure());
  await page.evaluate(() => { Ctl.runMonth(); });
  await page.waitForTimeout(300);
  console.log('battle anims', await measure());
  await page.waitForTimeout(5000);
  console.log('after 5s', await measure());
  // breakdown of a static redraw
  console.log(await page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 10; i++) drawStatic(true); return 'drawStatic ' + ((performance.now() - t0) / 10).toFixed(1) + 'ms'; }));
  await browser.close();
})();
