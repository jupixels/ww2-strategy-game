// Choosing exactly which units go: troops (pick counters), ships (fleet pick), planes (rebase). Needs the server.
// OUT=<dir> for screenshots, MAP=world, MOBILE=1.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT, MAP = process.env.MAP === 'world' ? 'world' : 'europe', MOB = !!process.env.MOBILE;
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.PW ? undefined : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:MOB ? 390 : 1440, height:MOB ? 844 : 900 }, isMobile:MOB, hasTouch:MOB });
  const errs = []; let fails = 0;
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  const ok = (name, c, info = '') => { console.log((c ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); if (!c) fails++; };
  await page.goto(`http://localhost:8765/index.html?map=${MAP}`); await page.waitForTimeout(1500);
  await page.evaluate(() => { localStorage.clear(); startGame({ humans:{ GER:{ name:'You' } }, diff:'normal', scenario:1939, mode:'sp', seed:4, noIntro:true }); closeModal(); });
  await page.waitForTimeout(400);
  // a German stack with infantry and something else, next to another German province
  const pick = await page.evaluate(() => {
    for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o !== 'GER' || p.r.inf < 4) continue;
      const j = PROV[i].adj.find(j => G.prov[j].o === 'GER'); if (j == null) continue;
      select(i); if (!targets.has(j)) continue; return { i, j, inf:p.r.inf, art:p.r.art, arm:p.r.arm, destInf:G.prov[j].u.inf }; }
    return null;
  });
  ok('found a stack to split', !!pick, JSON.stringify(pick));
  await page.click('#card [data-amt="pick"]'); await page.waitForTimeout(150);
  ok('pick shows counters', await page.evaluate(() => !!document.querySelector('#card .upick') && typeof sel.amt === 'object'));
  if (OUT) await page.screenshot({ path:`${OUT}/units-pick.png` });
  // keep 2 infantry, nothing else
  await page.evaluate(() => { for (const k of LAND) sel.amt[k] = 0; sel.amt.inf = 0; renderCard(); });
  await page.click('#card [data-step="land:inf:1"]'); await page.click('#card [data-step="land:inf:1"]'); await page.waitForTimeout(100);
  const chosen = await page.evaluate(() => ({ ...sel.amt }));
  ok('counters set exactly 2 infantry', chosen.inf === 2 && chosen.art === 0 && chosen.arm === 0, JSON.stringify(chosen));
  await page.evaluate(j => execOrder(j), pick.j); await page.waitForTimeout(300);
  const after = await page.evaluate(([i, j]) => ({ src:G.prov[i].u.inf, dst:G.prov[j].u.inf, srcArt:G.prov[i].u.art }), [pick.i, pick.j]);
  ok('exactly 2 infantry moved, the rest stayed', after.dst === pick.destInf + 2 && after.src === pick.inf - 2 && after.srcArt === pick.art, JSON.stringify(after));
  // the counters can't exceed what is ready
  await page.evaluate(i => select(i), pick.i); await page.click('#card [data-amt="pick"]'); await page.waitForTimeout(100);
  for (let k = 0; k < 3; k++) await page.click('#card [data-step="land:inf:1"]').catch(() => {});
  ok('counter stops at the ready count', await page.evaluate(i => sel.amt.inf <= G.prov[i].r.inf, pick.i));
  // ships: pick 1 battle squadron
  const fl = await page.evaluate(() => { for (const z in G.fleet) { const f = G.fleet[z].GER; if (f && f.cap >= 2 && fleetReady(f) && fleetTargets(z, 'GER').length) return { z, cap:f.cap, sub:f.sub, to:fleetTargets(z, 'GER')[0] }; } return null; });
  if (fl) {
    await page.evaluate(z => selectFleet(z), fl.z); await page.waitForTimeout(100);
    await page.click('#card [data-part="pick"]'); await page.waitForTimeout(100);
    await page.evaluate(() => { selFleet.part = { cap:1, sub:0 }; renderCard(); });
    if (OUT) await page.screenshot({ path:`${OUT}/units-fleet.png` });
    await page.evaluate(f => Ctl.act({ c:'fleet', from:f.z, to:f.to, part:selFleet.part }), fl); await page.waitForTimeout(150);
    const fa = await page.evaluate(f => ({ left:G.fleet[f.z].GER ? G.fleet[f.z].GER.cap : 0, there:G.fleet[f.to].GER ? G.fleet[f.to].GER.cap : 0, subsLeft:G.fleet[f.z].GER ? G.fleet[f.z].GER.sub : 0 }), fl);
    ok('exactly 1 battle squadron sailed', fa.left === fl.cap - 1 && fa.subsLeft === fl.sub, JSON.stringify(fa));
  } else console.log('skip ships: no German fleet with 2+ squadrons');
  // planes: rebase 1 fighter
  const air = await page.evaluate(() => { for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.o === 'GER' && p.air.ftr >= 2 && !p.ad && rebaseTargets('GER', i).length) return { i, ftr:p.air.ftr, to:rebaseTargets('GER', i)[0] }; } return null; });
  ok('found an airfield with fighters', !!air);
  if (air) {
    await page.evaluate(i => select(i), air.i); await page.waitForTimeout(100);
    await page.click('#card [data-airopen]'); await page.waitForTimeout(100);
    ok('rebase counters shown', await page.evaluate(() => !!document.querySelector('#card [data-group="air"]') && !!document.querySelector('#card [data-act="rebase"]')));
    await page.evaluate(() => { sel.air = { ftr:1, bmb:0 }; renderCard(); });
    if (OUT) await page.screenshot({ path:`${OUT}/units-air.png` });
    await page.click('#card [data-act="rebase"]'); await page.waitForTimeout(150);
    ok('rebase starts a map pick', await page.evaluate(() => pickMode && pickMode.kind === 'rebase'));
    const before = await page.evaluate(t => G.prov[t].air.ftr, air.to);
    await page.evaluate(t => pickClick(t), air.to); await page.waitForTimeout(150);
    const ar = await page.evaluate(([i, t]) => ({ from:G.prov[i].air.ftr, to:G.prov[t].air.ftr, flown:G.prov[t].ad }), [air.i, air.to]);
    ok('one fighter wing rebased', ar.from === air.ftr - 1 && ar.to === before + 1 && ar.flown === 1, JSON.stringify(ar));
    ok('bad rebase refused (too far)', await page.evaluate(i => { let far = -1; for (let j = 0; j < NP; j++) if (G.prov[j].o === 'GER' && dist(i, j) > REBASE_RANGE) { far = j; break; } return far < 0 || Ctl.act({ c:'rebase', from:i, to:far, ftr:1, bmb:0 }).ok === false; }, air.i));
  }
  // the order is recorded for leaderboard replays
  ok('orders recorded', await page.evaluate(() => G.rec && G.rec.c.some(([, , c]) => c.c === 'move' && typeof c.amt === 'object')));
  console.log(errs.length ? errs.join('\n') : '   NO ERRORS');
  await browser.close();
  process.exit(errs.length || fails ? 1 : 0);
})();
