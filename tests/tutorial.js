const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:1440, height:900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(() => startTutorial()); await page.waitForTimeout(500);
  const step = () => page.evaluate(() => G.tut ? G.tut.i + ':' + TUT[G.tut.i].h : 'DONE');
  const wait = async (ms = 500) => page.waitForTimeout(ms);
  const doStep = {
    'Look around': () => page.evaluate(() => { camMovedTotal = 1000; }),
    'Select Munich': () => page.evaluate(() => select(ID['Munich'])),
    'Raise a division': () => page.click('#card [data-build="inf"]'),
    'Move your troops': () => page.evaluate(() => { const to = [...targets].find(([j, k]) => k === 'move')[0]; execOrder(to); }),
    'Pick a fight': async () => { await page.click('.tab[data-tab="dip"]'); await wait(200); await page.click('[data-war="AUS"]'); },
    'Attack!': () => page.evaluate(() => { const to = [...targets].find(([j, k]) => k === 'attack')[0]; execOrder(to); }),
    'Supply lines': () => page.click('#zMode'),
    'Generals': async () => { await page.click('.tab[data-tab="army"]'); await wait(200); await page.click('[data-hire]'); },
    'Air power': async () => { await page.click('#card [data-act="raid"]'); await wait(200); await page.evaluate(() => pickClick(pickMode.ids[0])); },
    'The navy': () => page.evaluate(() => { selectFleet('NSE'); Ctl.act({ c:'fleet', from:'NSE', to:fleetTargets('NSE', ME)[0], part:'all' }); }),
    'Strategy cards': () => page.evaluate(() => { const k = nat(ME).hand.find(c => !canPlay(ME, c) && CARDS[c].tgt === 'none'); Ctl.act({ c:'card', k }); }),
    'Spies': async () => { await page.click('.tab[data-tab="intel"]'); await wait(200); await page.click('[data-spy="reveal"]'); await wait(200); await page.click('#modal [data-t]'); },
    'National Focus': async () => { await page.click('.tab[data-tab="focus"]'); await wait(200); await page.click('[data-focus]:not([disabled])'); },
    'Research': async () => { await page.click('.tab[data-tab="tech"]'); await wait(200); await page.click('[data-tech]:not([disabled])'); },
    'Industry and the home front': () => page.click('.tab[data-tab="industry"]'),
    'End the month': async () => { await page.evaluate(() => Ctl.endTurn()); await wait(1500); for (let i = 0; i < 6; i++) { const b = await page.$('#modal .choice'); if (b) { await b.click(); await wait(200); } } },
  };
  let last = '', guard = 0;
  while (guard++ < 40) {
    for (let i = 0; i < 4; i++) { const b = await page.$('#modal .choice'); if (b) { await b.click(); await wait(250); } }
    const s = await step(); if (s === 'DONE') break;
    const name = s.split(':').slice(1).join(':');
    if (s === last) { console.log('STUCK at', s, await page.evaluate(() => JSON.stringify({ tut:G.tut, modal:!document.querySelector('#modal').hidden, modalTxt:document.querySelector('#modal').innerText.slice(0,120), sel:sel && sel.id, targets:[...targets] }))); break; }
    last = s; process.stdout.write(s + ' → ');
    if (doStep[name]) { try { await doStep[name](); } catch (e) { console.log('\n action failed:', e.message.split('\n')[0]); } await wait(700); }
    if ((await step()) === s) { const nb = await page.$('#tut [data-tnext]:not([hidden])'); if (nb) { await nb.click(); await wait(300); } }
    console.log('ok');
  }
  console.log('final', await step());
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await browser.close();
})();
