// Loads the simulation core into a sandbox for headless tests.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CORE = ['data/map.js','js/core/util.js','js/core/data.js','js/core/map.js','js/core/state.js','js/core/economy.js','js/core/military.js','js/core/diplomacy.js','js/core/systems.js','js/core/events.js','js/core/orders.js','js/core/ai.js','js/core/scenario.js','js/core/turn.js'];
function load() {
  const ctx = vm.createContext({ console, Math, JSON, Date, Set, Map, Int16Array, Int32Array, Uint8Array, Float32Array, Object, Array, String, Number });
  let src = CORE.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^'use strict';/m, '')).join('\n;\n');
  src += '\n;globalThis.__api = { get G(){ return G; }, newGame, endMonth, doCommand, Hooks, nat, A, owned, vpOf, totalVP, PROV, ID, NP, divisions, enemiesOf, facOf, scoreOf, airOf, navyOf, targetsFor, humanTags, inboxOf, answer, serial:()=>JSON.stringify(G, (k,v)=> k==="warSet"?undefined:v) };';
  vm.runInContext(src, ctx, { filename:'core.js' });
  ctx.__api.eval = code => vm.runInContext(code, ctx);
  return ctx.__api;
}
module.exports = { load };
