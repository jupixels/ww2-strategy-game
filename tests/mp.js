// Two tabs: host + client over the local transport. Lobby, start, commands, ready-up, month resolution, chat.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT;
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:800 } });
  const A = await ctx.newPage(), B = await ctx.newPage();
  const errs = [];
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' PAGEERROR: ' + e.message + ' ' + (e.stack||'').split('\n')[1])); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(n + ' ' + m.text()); }); }
  await A.goto('http://localhost:8765/index.html'); await B.goto('http://localhost:8765/index.html');
  await A.waitForTimeout(1200);
  await A.evaluate(() => { netKind = 'local'; myName = 'Alice'; showHost(); });
  await A.waitForTimeout(500);
  const code = await A.evaluate(() => Net.code);
  console.log('code', code);
  await B.evaluate(code => { netKind = 'local'; myName = 'Bob'; showJoin(code); }, code);
  await B.waitForTimeout(800);
  await A.evaluate(() => { Net.players.find(p => p.host).tag = 'GER'; Net.settings.gm = 'grand'; Net.lobbyChanged(); });
  await B.evaluate(() => Net.send({ t:'pick', tag:'POL' }));
  await A.waitForTimeout(400);
  if (OUT) await B.screenshot({ path:OUT + '/mp-lobby.png' });
  console.log('lobby players', await A.evaluate(() => JSON.stringify(Net.players.map(p => [p.name, p.tag]))));
  await A.evaluate(() => Net.startMatch());
  await A.waitForTimeout(1200);
  console.log('B state', await B.evaluate(() => JSON.stringify({ mode:Ctl.mode, me:ME, date:G && dateStr(), humans:G && Object.keys(G.humans) })));
  // close newspapers
  for (const p of [A, B]) for (let i = 0; i < 4; i++) { const b = await p.$('#modal .choice'); if (b) { await b.click(); await p.waitForTimeout(250); } }
  // Germany declares war on Poland; Bob raises troops; both queue attacks
  await A.evaluate(() => { nat('GER').pol += 100; Ctl.act({ c:'declare', tag:'POL' }); });
  await A.waitForTimeout(400);
  await B.evaluate(() => { Ctl.act({ c:'buildN', k:'inf', pid:ID['Warsaw'], n:2 }); });
  await B.waitForTimeout(400);
  console.log('B sees war:', await B.evaluate(() => enemiesOf('POL').join(',')), ' Warsaw inf:', await A.evaluate(() => G.prov[ID['Warsaw']].u.inf));
  const q = await A.evaluate(() => { for (const i of owned('GER')) for (const [j, k] of targetsFor('GER', i)) if (k === 'attack' && G.prov[j].o === 'POL') { const r = Ctl.act({ c:'attack', from:[i], to:j, amt:'all' }); return [PROV[i].name, PROV[j].name, !!(r && r.queued), G.orders.length]; } });
  console.log('host queued attack', JSON.stringify(q));
  await B.evaluate(() => { for (const i of owned('POL')) for (const [j, k] of targetsFor('POL', i)) if (k === 'attack') { Ctl.act({ c:'attack', from:[i], to:j, amt:'half' }); return; } });
  await B.waitForTimeout(500);
  console.log('orders on host', await A.evaluate(() => G.orders.map(o => o.t + ':' + PROV[o.to].name).join(' ')));
  await B.evaluate(() => sendChat('Good luck, Alice!'));
  await A.waitForTimeout(300);
  console.log('host chat', await A.evaluate(() => Net.chat.map(m => m.name + ': ' + m.text).join(' | ')));
  // ready up
  await A.evaluate(() => Ctl.endTurn()); await A.waitForTimeout(300);
  console.log('ready after host', await B.evaluate(() => JSON.stringify(G.ready)));
  await B.evaluate(() => Ctl.endTurn()); await B.waitForTimeout(2500);
  console.log('after month A', await A.evaluate(() => dateStr() + ' ready=' + JSON.stringify(G.ready) + ' orders=' + G.orders.length));
  console.log('after month B', await B.evaluate(() => dateStr() + ' me=' + ME + ' canAct=' + Ctl.canAct()));
  if (OUT) { await A.screenshot({ path:OUT + '/mp-host.png' }); await B.screenshot({ path:OUT + '/mp-client.png' }); }
  // disconnect: client tab closes -> AI takeover
  await B.close(); await A.waitForTimeout(800);
  console.log('after drop', await A.evaluate(() => JSON.stringify(G.humans)));
  console.log(errs.length ? errs.join('\n') : 'NO ERRORS');
  await browser.close();
})();
