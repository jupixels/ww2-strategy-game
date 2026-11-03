// Drives the Fronts UI and the reorganised drawers; saves screenshots with OUT=<dir>. MAP=world for the world map.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.PW ? undefined : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W || 1440), height:+(process.env.H || 900) } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/404|Failed to load resource/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 6).join('\n')));
  await page.goto('http://localhost:8765/index.html' + (process.env.MAP ? '?map=' + process.env.MAP : '')); await page.waitForTimeout(1500);
  const tag = process.env.TAG || 'GER', sc = +(process.env.SC || 1941);
  await page.evaluate(([tag, sc]) => startGame({ humans:{ [tag]:{ name:'You' } }, diff:'normal', scenario:sc, mode:'sp', seed:5, noIntro:true }), [tag, sc]);
  await page.waitForTimeout(800);
  const close = async () => { for (let i = 0; i < 8; i++) { const b = await page.$('#modal .choice, #modal [data-n], #modal [data-x]'); if (!b) break; await b.click(); await page.waitForTimeout(200); } };
  const shot = async n => { if (OUT) await page.screenshot({ path:`${OUT}/${n}.png` }); };
  await close();
  await page.click('.tab[data-tab="army"]'); await page.waitForTimeout(300); await shot('f1-empty');
  await page.click('[data-fauto]'); await page.waitForTimeout(400);
  const info = await page.evaluate(() => frontsOf(ME).map(f => [f.name, f.z.length, frontLine(ME, f).length]));
  console.log('  fronts', JSON.stringify(info));
  await page.evaluate(() => { const f = frontsOf(ME)[0]; Ctl.act({ c:'front', op:'order', id:f.id, order:'advance' }); const g = G.gens.find(x => x.tag === ME); if (g) Ctl.act({ c:'front', op:'general', id:f.id, gid:g.id }); renderDrawer(); const L = frontLine(ME, f); centerOn(L[Math.floor(L.length / 2)], WORLD ? 0.8 : 0.9); });
  await page.waitForTimeout(800); await shot('f2-panel');
  await page.evaluate(() => openTab('army')); await page.waitForTimeout(200);
  await page.evaluate(() => { const f = frontsOf(ME)[0]; select(frontLine(ME, f)[0]); }); await page.waitForTimeout(400); await shot('f3-dossier');
  await page.evaluate(() => { clearSelection(); openTab('plans'); }); await page.waitForTimeout(300); await shot('f4-plans');
  await page.click('[data-sub="tech"]'); await page.waitForTimeout(200);
  await page.evaluate(() => openTab('log')); await page.waitForTimeout(300); await page.click('[data-sub="dec"]'); await page.waitForTimeout(200); await shot('f5-destiny');
  await page.evaluate(() => { openTab('log'); startFrontPick(ME, null); const ids = frontLine(ME, frontsOf(ME)[0]).slice(0, 2); for (const i of ids) pickClick(i); }); await page.waitForTimeout(300); await shot('f6-paint');
  await page.click('#pickCancel');
  const vp0 = await page.evaluate(() => vpOf(ME));
  for (let m = 0; m < 3; m++) { await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(2500); await close(); }
  const after = await page.evaluate(() => ({ date:dateStr(), vp:vpOf(ME), fronts:frontsOf(ME).map(f => [f.name, f.o, f.last && f.last.attacks, f.last && f.last.won]) }));
  console.log('  vp', vp0, '->', JSON.stringify(after));
  await page.evaluate(() => openTab('army')); await page.waitForTimeout(300); await shot('f7-after');
  console.log(errs.length ? errs.slice(0, 20).join('\n') : '   NO ERRORS');
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
