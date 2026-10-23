const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  page.on('console', m => console.log('console.' + m.type() + ': ' + m.text()));
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,5).join('\n')));
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(process.argv[2]);
  console.log('RESULT:', typeof r === 'string' ? r : JSON.stringify(r));
  await browser.close();
})();
