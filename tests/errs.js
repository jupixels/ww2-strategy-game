const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,5).join('\n')));
  await page.goto('http://localhost:8765/' + (process.argv[2] || 'index.html'));
  await page.waitForTimeout(3000);
  console.log(errs.join('\n') || 'NO ERRORS');
  await browser.close();
})();
