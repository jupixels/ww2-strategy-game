// Determinism check for leaderboard verification: play a scripted single-player campaign through doCommand,
// save and reload halfway, then rebuild it from the record alone and compare the result.
// node tests/replay.js [TAG] [scenario] [months]   (MAP=world for the world map)
const { load } = require('./load');
const tag = process.argv[2] || 'GER', sc = +(process.argv[3] || 1939), months = +(process.argv[4] || 40);
const fp = api => api.eval(`JSON.stringify({ turn:G.turn, own:G.prov.map(p => p.o).join(''), u:G.prov.map(p => landN(p.u)).join(','), sc:scoreOf('${tag}'), pp:Math.round(nat('${tag}').pp), rs:G.rs, over:G.over && G.over.type })`);
// a crude player: build, research, focus, play cards, attack at good odds, ship convoys, answer the mail
function playMonth(api, rng) {
  const cmds = api.eval(`(() => { const t = '${tag}', n = nat(t), out = [];
    if (!A(t)) return out;
    const h = homeProv(t); if (h >= 0) out.push({ c:'buildN', k:'inf', pid:h, n:2 });
    const tk = TECHS.find(T => !techState(t, T.k)); if (tk) out.push({ c:'research', k:tk.k });
    const fk = focusFor(t, n.major).find(f => !focusState(t, f.k)); if (fk) out.push({ c:'focus', k:fk.k });
    const cd = n.hand.find(c => !canPlay(t, c) && CARDS[c].tgt === 'none'); if (cd) out.push({ c:'card', k:cd }); else if (n.hand.length) out.push({ c:'discard', k:n.hand[0] });
    for (const i of armiesOf(t).slice(0, 6)) for (const [j, k] of targetsFor(t, i)) { if (k === 'attack') { out.push({ c:'attack', from:[i], to:j, amt:'half' }); break; } if (k === 'invade') { out.push({ c:'ship', from:i, to:j, amt:'half' }); break; } }
    for (const it of inboxOf(t)) out.push({ c:'answer', uid:it.uid, choice:it.type === 'decision' ? 1 : 0 });
    if (SIGS[t]) out.push({ c:'sig', op:SIG_OPS[t][0], lv:1 });
    return out; })()`);
  for (const c of cmds) { api.doCommand(tag, c, 'instant'); api.eval('checkVictory()'); }
}
let api = load();
api.newGame({ humans:{ [tag]:{ name:'Tester' } }, scenario:sc, seed:12345, diff:'normal', mode:'sp' });
api.eval(`introNews('${tag}')`);
for (let m = 0; m < months && !api.G.over; m++) {
  playMonth(api);
  if (m === Math.floor(months / 2)) { // save and reload into a fresh engine, as the browser does
    const saved = api.serial(); api = load(); api.eval(`G = ${saved}; rebuildWarSet();`);
  }
  api.endMonth();
}
playMonth(api); // commands in the final month, before the score is taken
const live = fp(api), rec = JSON.parse(api.eval('JSON.stringify(G.rec)'));
console.log(`played ${tag} ${sc}: ${rec.c.length} commands over ${api.G.turn} months, score ${api.eval(`scoreOf('${tag}')`)}, rated ${api.eval(`ratedScore('${tag}')`)}, record ${Math.round(JSON.stringify(rec).length / 1024)} KB`);
const api2 = load();
api2.eval(`replayGame(${JSON.stringify(rec)}, ${api.G.turn})`);
const again = fp(api2);
const ok = live === again;
console.log(ok ? 'REPLAY MATCHES' : 'REPLAY DIFFERS');
if (!ok) { const a = JSON.parse(live), b = JSON.parse(again); for (const k in a) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log('  differs:', k, String(a[k]).slice(0, 80), '|', String(b[k]).slice(0, 80)); }
process.exit(ok ? 0 : 1);
