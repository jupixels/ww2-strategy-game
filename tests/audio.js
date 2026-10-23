// Checks the sound bank: every sample decodes, every SFX call runs without errors, and the streamed music plays.
// sfx.js reports any sample that fails to decode as a console warning, which counts as an error here.
// Needs the local server (python3 -m http.server 8765).
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args:['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errs = [], missing = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('response', r => { if (/\/assets\//.test(r.url()) && r.status() >= 400) missing.push(r.status() + ' ' + r.url()); });
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(800);
  await page.mouse.click(10, 10);
  await page.evaluate(() => { try { localStorage.removeItem('idom-sound'); } catch (e) {} SFX.init(); });
  await page.waitForTimeout(4000);
  const res = await page.evaluate(async () => {
    const calls = ['click', 'boom', 'thump', 'drum', 'alarm', 'fanfare', 'medal', 'type', 'gunfire', 'artillery', 'cannon', 'nuke', 'plane', 'flyby',
      'tank', 'ship', 'radio', 'signal', 'siren', 'card', 'draw', 'shuffle', 'coins', 'paper', 'error', 'open', 'close', 'build', 'factory', 'fort',
      'stinger', 'confirm', 'victory', 'defeat'];
    const bad = [];
    for (const c of calls) { try { SFX[c](c === 'boom'); } catch (e) { bad.push(c + ': ' + e.message); } }
    return { bad };
  });
  const on = await page.evaluate(() => SFX.toggleMusic());
  await page.waitForTimeout(3500);
  // the <audio> elements are not in the DOM, so check that a music file was actually fetched
  const playing = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /assets\/music\//.test(n)));
  const off = await page.evaluate(() => SFX.toggleMusic());
  await page.waitForTimeout(1500);
  console.log('sound calls failing:', res.bad.length ? res.bad : 'none');
  console.log('music on:', on, 'music requested:', playing.map(n => n.split('/').pop()), 'music off again:', off === false);
  console.log('missing assets:', missing.length ? missing : 'none');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await browser.close();
  process.exit(errs.length || missing.length || res.bad.length || !playing.length ? 1 : 0);
})();
