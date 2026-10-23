// Plays a few months through the real UI code paths and reports errors.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W||1440), height:+(process.env.H||900) } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/404|Failed to load resource/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,6).join('\n')));
  await page.goto('http://localhost:8765/index.html'); await page.waitForTimeout(1500);
  const sc = +(process.env.SC || 1936), tag = process.env.TAG || 'GER';
  await page.evaluate(([sc, tag]) => startGame({ humans:{ [tag]:{ name:'You' } }, diff:'normal', scenario:sc, mode:'sp', seed:5 }), [sc, tag]);
  await page.waitForTimeout(800);
  const close = async () => { for (let i = 0; i < 8; i++) { const b = await page.$('#modal .choice'); if (!b) break; await b.click(); await page.waitForTimeout(250); } };
  await close();
  const log = r => console.log('  ', JSON.stringify(r).slice(0, 300));
  // a scripted month of actions through Ctl.act
  log(await page.evaluate(() => {
    const out = [];
    const me = ME, n = nat(me);
    const cap = homeProv(me);
    out.push(['build', Ctl.act({ c:'buildN', k:'inf', pid:cap, n:3 })?.ok]);
    const tk = TECHS.find(T => !techState(me, T.k)); if (tk) out.push(['research', Ctl.act({ c:'research', k:tk.k })?.ok]);
    const fk = focusFor(me, n.major).find(f => !focusState(me, f.k)); if (fk) out.push(['focus', Ctl.act({ c:'focus', k:fk.k })?.ok]);
    const enemyNb = (() => { for (const i of owned(me)) for (const j of PROV[i].adj) { const o = G.prov[j].o; if (o !== me && !friendly(o, me) && !nat(o).major) return o; } })();
    if (enemyNb && !enemiesOf(me).length) { n.pol += 100; out.push(['declare ' + enemyNb, Ctl.act({ c:'declare', tag:enemyNb })?.ok]); }
    // attack the weakest adjacent enemy province from the strongest stack
    let best = null;
    for (const i of owned(me)) { const ts = targetsFor(me, i); for (const [j, k] of ts) if (k === 'attack') { const s = readyAt(G.prov[i]) - unitsAt(G.prov[j]); if (!best || s > best.s) best = { i, j, s }; } }
    if (best) { const r = Ctl.act({ c:'attack', from:[best.i], to:best.j, amt:'all' }); out.push(['attack ' + PROV[best.j].name, r && r.ok, r && r.battle && r.battle.win]); }
    const k = n.hand.find(c => !canPlay(me, c) && CARDS[c].tgt === 'none'); if (k) out.push(['card ' + k, Ctl.act({ c:'card', k })?.ok]);
    out.push(['spy', Ctl.act({ c:'spy', op:'counter' })?.ok]);
    out.push(['import', Ctl.act({ c:'import', k:'oil' })?.ok]);
    const z = Object.keys(G.fleet).find(z => G.fleet[z][me]); if (z) { const to = fleetTargets(z, me)[0]; out.push(['fleet ' + z + '>' + to, Ctl.act({ c:'fleet', from:z, to, part:'all' })?.ok]); }
    out.push(['hiregen', Ctl.act({ c:'hiregen' })?.ok]);
    return out;
  }));
  await page.waitForTimeout(2500);
  if (OUT) await page.screenshot({ path:OUT + '/p1-actions.png' });
  for (let m = 0; m < +(process.env.MONTHS || 6); m++) {
    await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(400); await close();
    await page.waitForTimeout(300);
  }
  if (OUT) await page.screenshot({ path:OUT + '/p2-months.png' });
  log(await page.evaluate(() => ({ date:dateStr(), over:G.over, wars:enemiesOf(ME), vp:vpOf(ME), inbox:inboxOf(ME).length, fx:FX.length, parts:PARTS.length })));
  // frame time
  const ft = await page.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); const f = () => { if (++n < 60) requestAnimationFrame(f); else res((performance.now() - t0) / 60); }; requestAnimationFrame(f); }));
  console.log('   avg frame ms', ft.toFixed(1));
  console.log(errs.length ? errs.slice(0, 20).join('\n') : '   NO ERRORS');
  await browser.close();
})();
