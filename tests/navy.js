// Drives the convoy / invasion / call-to-arms UI on the world map and saves screenshots.
// Needs the server: python3 -m http.server 8765. OUT=<dir> for screenshots.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.PW ? undefined : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W || 1440), height:+(process.env.H || 900) } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/404|Failed to load resource/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
  await page.goto('http://localhost:8765/index.html?map=world'); await page.waitForTimeout(1500);
  await page.evaluate(() => startGame({ humans:{ USA:{ name:'You' } }, diff:'normal', scenario:1941, mode:'sp', seed:5, noIntro:true }));
  await page.waitForTimeout(800);
  const close = async () => { for (let i = 0; i < 8; i++) { const b = await page.$('#modal .choice, #modal [data-y], #modal [data-n]'); if (!b) break; await b.click(); await page.waitForTimeout(250); } };
  await close();
  const shot = async n => { if (OUT) await page.screenshot({ path:`${OUT}/${n}.png` }); };
  // war with Germany, a big army in New York
  const prep = await page.evaluate(() => {
    nat('USA').pol = 300; Ctl.act({ c:'declare', tag:'GER' });
    const ny = ID['New York']; G.prov[ny].u.inf += 10; G.prov[ny].u.arm += 4; resetReady();
    select(ny); centerOn(ny, 0.6); renderAll();
    return { war:W('USA','GER'), targets:[...targets].filter(([j, k]) => k === 'invade').length, convoy:[...targets].filter(([j, k]) => k === 'convoy').length, lift:liftLeft('USA') };
  });
  console.log('  prep', JSON.stringify(prep));
  await close();
  await page.waitForTimeout(600); await shot('n1-targets');
  // hover Normandy for the tooltip
  await page.evaluate(() => { const p = PROV[ID['Normandy']]; centerXY(p.x + 250, p.y, 0.7); });
  await page.waitForTimeout(1200);
  const xy = await page.evaluate(() => { const p = PROV[ID['Normandy']]; const r = cv.getBoundingClientRect(); const [x, y] = w2s(p.x, p.y); return [x + r.left, y + r.top]; });
  await page.mouse.move(xy[0] - 5, xy[1] - 5); await page.mouse.move(xy[0], xy[1]); await page.waitForTimeout(500);
  const tip = await page.evaluate(() => $('#tip').hidden ? null : $('#tip').innerText);
  console.log('  tooltip:', (tip || '').replace(/\n/g, ' | '));
  await shot('n2-tooltip');
  const shipped = await page.evaluate(() => { execOrder(ID['Normandy']); return (G.convoys || []).map(c => [PROV[c.from].name, PROV[c.to].name, landN(c.u), c.route.join('>')]); });
  console.log('  convoys', JSON.stringify(shipped));
  await page.evaluate(() => { const p = PROV[ID['Normandy']]; centerXY(p.x - 600, p.y - 50, 0.45); clearSelection(); });
  await page.waitForTimeout(600); await shot('n3-route');
  await page.evaluate(() => openTab('army')); await page.waitForTimeout(400); await shot('n4-army');
  await page.evaluate(() => openTab('industry')); await page.waitForTimeout(400); await shot('n5-industry');
  // fleet card
  await page.evaluate(() => { openTab('industry'); const z = Object.keys(G.fleet).find(z => G.fleet[z].USA); centerXY(SEA[z].x, SEA[z].y, 1); selectFleet(z); });
  await page.waitForTimeout(400); await shot('n6-fleet');
  // diplomacy: join the Allies, then call them in against Japan
  const dip = await page.evaluate(() => { clearSelection(); Ctl.act({ c:'join', fk:'ALLIES' }); nat('USA').pol = 300; Ctl.act({ c:'declare', tag:'JAP' }); openTab('dip'); return { fac:facOf('USA'), call:canCallToWar('USA', 'JAP'), btn:!!document.querySelector('[data-call]') }; });
  console.log('  diplomacy', JSON.stringify(dip));
  await close();
  await page.waitForTimeout(400); await shot('n7-dip');
  await page.evaluate(() => { const b = document.querySelector('[data-call]:not([disabled])'); if (b) b.click(); });
  await page.waitForTimeout(500); await shot('n8-called');
  await close();
  // end the month: the convoy lands
  await page.evaluate(() => { if (tab) openTab(tab); Ctl.endTurn(); }); await page.waitForTimeout(3500); await close(); await page.waitForTimeout(1500); await close();
  const after = await page.evaluate(() => ({ date:dateStr(), convoys:(G.convoys || []).length, normandy:G.prov[ID['Normandy']].o }));
  console.log('  after', JSON.stringify(after));
  await shot('n9-after');
  console.log(errs.length ? errs.slice(0, 20).join('\n') : '   NO ERRORS');
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
