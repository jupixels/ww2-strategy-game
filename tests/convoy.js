// Headless checks for sea transport (convoys, invasions), fleet moves, oil upkeep and the call to arms.
// MAP=world node tests/convoy.js
const { load } = require('./load');
const api = load();
const ev = s => api.eval(s);
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const WORLD = ev('WORLD');

if (WORLD) {
  // 1. America crosses the Atlantic: New York to Normandy is an overseas invasion
  api.newGame({ humans:{ USA:{ name:'p' } }, scenario:1941, seed:5 });
  ev(`nat('USA').pol = 200; declareWar('USA','GER');`);
  ok(ev(`W('USA','GER')`), 'USA at war with Germany');
  ev(`G.prov[ID['New York']].u.inf += 10; G.prov[ID['New York']].u.arm += 4; resetReady();`);
  const k = ev(`targetsFor('USA', ID['New York']).get(ID['Normandy'])`);
  ok(k === 'invade', `New York -> Normandy is an invasion (got ${k})`);
  const info = ev(`JSON.stringify(convoyInfo('USA', ID['New York'], ID['Normandy']))`);
  console.log('     route', info);
  const lift = ev(`liftLeft('USA')`);
  const r = api.doCommand('USA', { c:'ship', from:ev(`ID['New York']`), to:ev(`ID['Normandy']`), amt:'all' }, 'instant');
  ok(r.ok && r.convoy, 'convoy ships');
  ok(ev(`landN(G.convoys[0].u)`) <= lift, 'convoy respects sealift');
  ok(ev(`liftLeft('USA')`) === Math.max(0, lift - ev(`landN(G.convoys[0].u)`)), 'sealift is spent');
  const out = api.endMonth();
  ok(ev(`G.convoys.length`) === 0, 'convoy resolved at month end');
  ok((out.convoys || []).some(c => c.t === 'USA' && c.battle), 'landing battle fought on arrival');
  ok(out.battles.some(b => b.a === 'USA' && b.tid === ev(`ID['Normandy']`)), 'battle reported for animation');

  // 2. a reinforcement convoy into one's own port, then recall
  api.newGame({ humans:{ ENG:{ name:'p' } }, scenario:1939, seed:5 });
  ev(`G.prov[ID['London']].u.inf += 6; resetReady();`);
  const tg = ev(`[...targetsFor('ENG', ID['London'])].filter(([j,k]) => k === 'convoy').map(([j]) => PROV[j].name).slice(0, 12).join(', ')`);
  console.log('     London convoy targets:', tg);
  const dest = ev(`[...targetsFor('ENG', ID['London'])].find(([j,k]) => k === 'convoy' && PROV[j].name === 'Alexandria') ? ID['Alexandria'] : [...targetsFor('ENG', ID['London'])].find(([j,k]) => k === 'convoy')[0]`);
  const before = ev(`unitsAt(G.prov[${dest}])`);
  const r2 = api.doCommand('ENG', { c:'ship', from:ev(`ID['London']`), to:dest, amt:'half' }, 'instant');
  ok(r2.ok, 'reinforcement convoy ships to ' + ev(`PROV[${dest}].name`));
  const n = ev(`landN(G.convoys[0].u)`);
  const r3 = api.doCommand('ENG', { c:'unship', id:ev(`G.convoys[0].id`) }, 'instant');
  ok(r3.ok && ev(`G.convoys.length`) === 0, 'recall works');
  api.doCommand('ENG', { c:'ship', from:ev(`ID['London']`), to:dest, amt:'half' }, 'instant');
  const o2 = api.endMonth();
  const rep = (o2.convoys || []).find(c => c.t === 'ENG');
  ok(rep && (rep.landed || rep.sunk), 'convoy arrived: ' + JSON.stringify(rep));
  ok(ev(`unitsAt(G.prov[${dest}])`) >= before, 'troops are ashore');

  // 3. fleets sail two zones a month
  const z = ev(`Object.keys(G.fleet).find(z => G.fleet[z].ENG && G.fleet[z].ENG.cap > 0)`);
  const z2 = ev(`fleetTargets('${z}', 'ENG').find(x => !Object.keys(G.fleet[x]).some(o => W(o,'ENG')))`);
  ok(api.doCommand('ENG', { c:'fleet', from:z, to:z2, part:'all' }, 'instant').ok, `fleet ${z} -> ${z2}`);
  const z3 = ev(`fleetTargets('${z2}', 'ENG').find(x => !Object.keys(G.fleet[x]).some(o => W(o,'ENG')))`);
  ok(api.doCommand('ENG', { c:'fleet', from:z2, to:z3, part:'all' }, 'instant').ok, `second move ${z2} -> ${z3}`);
  ok(!api.doCommand('ENG', { c:'fleet', from:z3, to:z2, part:'all' }, 'instant').ok, 'third move refused');

  // 4. Japan's oil, the Tripartite Pact and the neutrality pact
  api.newGame({ humans:{}, scenario:1936, seed:5 });
  ok(ev(`oilIncome('JAP') >= oilUpkeep('JAP')`), `Japan is not bleeding oil in 1936 (${ev(`oilIncome('JAP')`)} vs ${ev(`oilUpkeep('JAP')`)})`);
  api.newGame({ humans:{}, scenario:1941, seed:5 });
  ok(ev(`isAxis('JAP') && !W('JAP','ENG') && !W('JAP','SOV')`), '1941: Japan in the Axis but at peace with Britain and the USSR');
  ok(ev(`!W('GER','CHI')`), '1941: Germany does not inherit the war in China');
  ev(`pearlHarbor(); usaJoin();`);
  ok(ev(`W('JAP','USA') && W('JAP','ENG') && !W('JAP','SOV')`), 'Pearl Harbor: war with America and Britain, not the USSR');
}

// 5. call to arms
api.newGame({ humans:{ ENG:{ name:'p' } }, scenario:1936, seed:5 });
ev(`nat('ENG').pol = 300; G.tension = 70; declareWar('ENG','ITA');`);
ok(ev(`W('ENG','ITA') && !W('FRA','ITA')`), 'attacker\'s allies do not join by themselves');
ok(!ev(`canCallToWar('ENG','ITA')`), 'call to war available: ' + ev(`canCallToWar('ENG','ITA')`));
const cr = api.doCommand('ENG', { c:'calltowar', tag:'ITA' }, 'instant');
ok(cr.ok && cr.call, 'call sent: ' + JSON.stringify(cr.call));
ok(ev(`!!canCallToWar('ENG','ITA')`), 'cooldown after calling');
// human ally gets a decision
api.newGame({ humans:{ FRA:{ name:'p' } }, scenario:1936, seed:5 });
ev(`nat('ENG').pol = 300; declareWar('ENG','ITA'); callToWar('ENG','ITA');`);
const item = api.inboxOf('FRA').find(x => x.kind === 'calltowar');
ok(!!item, 'human ally receives a call to arms');
if (item) { api.answer('FRA', item.uid, 1); ok(ev(`W('FRA','ITA')`), 'accepting the call means war'); }

// 6. oil: peacetime upkeep is halved and an empty tank no longer means a flat 60%
api.newGame({ humans:{}, scenario:1936, seed:5 });
const pe = ev(`oilUpkeep('ENG')`); ev(`declareWar('GER','POL')`);
ok(ev(`oilUpkeep('ENG')`) === pe, 'neutral nation keeps peacetime upkeep');
ev(`nat('GER').oil = 0; nat('GER').fuel = fuelLevel('GER');`);
ok(ev(`fuelMul('GER')`) > 0.6, `graded fuel penalty (${ev(`fuelMul('GER').toFixed(2)`)})`);

// 7. expeditionary forces in allied territory
api.newGame({ humans:{ GER:{ name:'p' } }, scenario:1939, seed:5 });
const it = ev(`(() => { for (const i of owned('GER')) for (const j of PROV[i].adj) if (G.prov[j].o === 'ITA' && G.prov[i].u.inf >= 2) return [i, j]; return null; })()`);
ok(ev(`isAxis('ITA')`), 'Italy is an ally in 1939');
if (it) {
  ev(`resetReady()`);
  ok(ev(`targetsFor('GER', ${it[0]}).get(${it[1]})`) === 'move', 'can march into an ally\'s province');
  const mv = api.doCommand('GER', { c:'move', from:it[0], to:it[1], amt:'one' }, 'instant');
  ok(mv.ok && ev(`guestOf(${it[1]}, 'GER') && landN(guestOf(${it[1]}, 'GER').u)`) === 1, 'troops stand there as guests');
  ok(ev(`divisions('GER').inf`) >= 1 && ev(`armiesOf('GER').includes(${it[1]})`), 'guests count as our army');
  // defend together: an attack on the province hits host and guests
  ev(`G.prov[${it[1]}].g.GER.u.inf = 6; G.prov[${it[1]}].u.inf = 1;`);
  const enemy = ev(`(() => { for (const j of PROV[${it[1]}].adj) if (!friendly(G.prov[j].o, 'GER')) return G.prov[j].o; return null; })()`);
  if (enemy) {
    const d0 = ev(`defenseValue(${it[1]}, null, '${enemy}')`); ev(`G.prov[${it[1]}].g.GER.u.inf = 0`); const d1 = ev(`defenseValue(${it[1]}, null, '${enemy}')`); ev(`G.prov[${it[1]}].g.GER.u.inf = 6`);
    ok(d0 > d1 * 2, `guests add to the defence (${d0.toFixed(1)} vs ${d1.toFixed(1)})`);
  }
  // leaving the alliance sends them home at month end
  ev(`leaveFaction('ITA'); for (const e of enemiesOf('ITA')) endWar('ITA', e); resetReady();`);
  ok(!ev(`guestOf(${it[1]}, 'GER')`), 'guests go home when the alliance breaks');
}
if (WORLD) {
  api.newGame({ humans:{ USA:{ name:'p' } }, scenario:1941, seed:5 });
  ev(`G.facs.ALLIES.m.push('USA'); G.prov[ID['New York']].u.inf += 6; resetReady();`);
  ok(ev(`targetsFor('USA', ID['New York']).get(ID['London'])`) === 'convoy', 'convoy to an ally\'s port (London)');
  api.doCommand('USA', { c:'ship', from:ev(`ID['New York']`), to:ev(`ID['London']`), amt:'all' }, 'instant');
  api.endMonth();
  ok(ev(`!!guestOf(ID['London'], 'USA')`), 'American troops are in Britain: ' + ev(`JSON.stringify(guestOf(ID['London'], 'USA') && guestOf(ID['London'], 'USA').u)`));
}

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
