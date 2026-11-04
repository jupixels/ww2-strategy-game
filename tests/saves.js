// Save slots and undo (single player). Needs the server (python3 -m http.server 8765). OUT=<dir> for screenshots, MAP=world.
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const OUT = process.env.OUT, MAP = process.env.MAP === 'world' ? 'world' : 'europe';
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.PW ? undefined : '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
  const page = await browser.newPage({ viewport:{ width:+(process.env.W || 1440), height:+(process.env.H || 900) } });
  const errs = []; let fails = 0;
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const ok = (name, c, info = '') => { console.log((c ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); if (!c) fails++; };
  const close = async () => { for (let i = 0; i < 8; i++) { const b = await page.$('#modal .choice:not([data-a]), #modal [data-done], #modal [data-n]'); if (!b) break; await b.click(); await page.waitForTimeout(120); } };
  await page.goto(`http://localhost:8765/index.html?map=${MAP}`); await page.waitForTimeout(1500);
  // a save from before slots existed is adopted as the first slot
  await page.evaluate(() => { localStorage.clear(); newGame({ humans:{ ITA:{ name:'You' } }, diff:'normal', scenario:1936, mode:'sp', seed:3 }); localStorage.setItem(SAVE_KEY, serial()); G = null; showStart(); });
  ok('old save becomes a slot', await page.evaluate(() => Slots.list().length === 1 && Slots.list()[0].tag === 'ITA'));
  // campaign 1: Germany
  await page.evaluate(() => startGame({ humans:{ GER:{ name:'You' } }, diff:'normal', scenario:1936, mode:'sp', seed:11 })); await page.waitForTimeout(500); await close();
  ok('no undo before anything happened', await page.evaluate(() => $('#undoBtn').hidden));
  await page.evaluate(() => Ctl.act({ c:'buildN', k:'inf', pid:homeProv(ME), n:1 }));
  ok('undo offered for this month', await page.evaluate(() => !$('#undoBtn').hidden && /this month/.test($('#undoBtn').textContent)));
  const pp0 = await page.evaluate(() => { Ctl.act({ c:'buildN', k:'inf', pid:homeProv(ME), n:1 }); return nat(ME).pp; });
  await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900); await close();
  await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900); await close();
  const before = await page.evaluate(() => ({ m:G.m, acts:Undo.acts, label:$('#undoBtn small').textContent }));
  ok('undo label matches (event choices count as moves)', before.m === 2 && before.label === (before.acts ? 'this month' : 'last month'), JSON.stringify(before));
  // the first undo of a ranked campaign asks
  await page.click('#undoBtn'); await page.waitForTimeout(200);
  ok('first undo asks (leaderboard warning)', await page.evaluate(() => !$('#modal').hidden && /leaderboard/.test($('#modal').innerText)));
  if (OUT) await page.screenshot({ path:`${OUT}/undo-ask.png` });
  await page.click('#modal [data-go]'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ m:G.m, acts:Undo.acts, bad:G.rec && G.rec.bad }));
  ok('undone, campaign unranked', after.m === (before.acts ? 2 : 1) && after.acts === 0 && after.bad === 'undo', JSON.stringify(after));
  for (let k = 0; k < 4 && await page.evaluate(() => G.m > 0); k++) { await page.keyboard.press('Control+z'); await page.waitForTimeout(250); }
  ok('Ctrl+Z steps back to January without asking again', await page.evaluate(() => G.m === 0 && $('#modal').hidden));
  ok('back at the start: the builds are undone too', await page.evaluate(p => nat(ME).pp > p, pp0));
  ok('nothing older to undo', await page.evaluate(() => $('#undoBtn').hidden));
  // a copy, then campaign 2: France
  await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900); await close();
  await page.evaluate(() => { saveCopy(); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => startGame({ humans:{ FRA:{ name:'You' } }, diff:'hard', scenario:1939, mode:'sp', seed:12 })); await page.waitForTimeout(500); await close();
  await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900); await close();
  await page.waitForTimeout(1500); // let the gzipped copies land
  const L = await page.evaluate(() => Slots.list().map(s => `${s.tag} ${s.m}/${s.y}`));
  ok('four slots: France, Germany ×2, Italy', L.length === 4 && L[0].startsWith('FRA') && L.filter(x => x.startsWith('GER')).length === 2 && L.some(x => x.startsWith('ITA')), JSON.stringify(L));
  const sizes = await page.evaluate(() => Slots.list().map(s => (localStorage.getItem(slotKey(s.id)) || '').length));
  ok('slots are stored compressed', sizes.every(n => n > 0 && n < 120000), JSON.stringify(sizes));
  // reload: Continue resumes France; Saved campaigns opens Germany
  await page.reload(); await page.waitForTimeout(2000);
  await page.evaluate(() => closeModal());
  ok('Continue shows the newest campaign', await page.evaluate(() => /France/.test($('[data-go="cont"]').textContent)));
  await page.click('[data-go="slots"]'); await page.waitForTimeout(300);
  if (OUT) await page.screenshot({ path:`${OUT}/slots.png` });
  const n = await page.evaluate(() => document.querySelectorAll('.slot').length);
  ok('saved campaigns list', n === 4, n + ' rows');
  const gi = await page.evaluate(() => [...document.querySelectorAll('.slot')].findIndex(r => /Germany/.test(r.innerText) && /not ranked/.test(r.innerText)));
  await page.click(`.slot:nth-child(${gi + 1}) [data-open]`); await page.waitForTimeout(800); await close();
  const g = await page.evaluate(() => ({ me:ME, m:G.m, y:G.y, bad:G.rec && G.rec.bad, start:$('#start').hidden }));
  ok('opened the German campaign from its slot', g.me === 'GER' && g.start && g.bad === 'undo', JSON.stringify(g));
  await page.evaluate(() => Ctl.endTurn()); await page.waitForTimeout(900); await close();
  await page.evaluate(() => Ctl.toMenu()); await page.waitForTimeout(300);
  ok('playing it makes it the newest', await page.evaluate(() => Slots.list()[0].tag === 'GER'));
  // delete needs two clicks
  await page.click('[data-go="slots"]'); await page.waitForTimeout(300);
  await page.click('.slot:last-child [data-del]'); await page.waitForTimeout(100);
  ok('delete asks first', await page.evaluate(() => document.querySelectorAll('.slot').length === 4));
  await page.click('.slot:last-child [data-del]'); await page.waitForTimeout(200);
  ok('deleted', await page.evaluate(() => document.querySelectorAll('.slot').length === 3 && Slots.list().length === 3));
  // hot-seat and the tutorial keep their own saves and no undo
  await page.evaluate(() => startGame({ humans:{ GER:{ name:'A' }, ENG:{ name:'B' } }, diff:'normal', scenario:1936, mode:'hot' })); await page.waitForTimeout(400);
  await page.evaluate(() => { $('#passGo').click(); return Ctl.endTurn(); }); await page.waitForTimeout(300);
  const hs = await page.evaluate(() => ({ undo:$('#undoBtn').hidden, save:!!loadSaved(SAVE_KEY + '-hot'), slots:Slots.list().length }));
  ok('hot-seat: no undo, own save', hs.undo && hs.save && hs.slots === 3, JSON.stringify(hs));
  console.log(errs.length ? errs.join('\n') : '   NO ERRORS');
  await browser.close();
  process.exit(errs.length || fails ? 1 : 0);
})();
