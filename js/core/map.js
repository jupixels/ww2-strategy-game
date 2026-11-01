'use strict';
/* ================= MAP STRUCTURES ================= */
// The world wraps east–west: WW is the circumference in world units.
const WW = MAP.W, WH = MAP.H, GW = MAP.GW, GH = MAP.GH, GS = MAP.S;
const PROV = MAP.prov.map((a, i) => ({ id:i, name:a[0], x:a[1], y:a[2], owner0:a[3], vp:a[4], fac0:a[5], ter:a[6], coast:!!a[7], area:a[8], cx:a[9], cy:a[10],
  lat:a[11], zones:a[12] ? a[12].split(' ') : [], col:!!a[13], oil:a[14] || 0, steel:a[15] || 0, adj:[] }));
MAP.adj.forEach(([a, b]) => { PROV[a].adj.push(b); PROV[b].adj.push(a); });
const ID = {}; PROV.forEach(p => ID[p.name] = p.id);
const NP = PROV.length;
// province raster: >= 0 province, -1 lake or open water, <= -2 sea zone (index -2 - v into MAP.seas)
const GRID = new Int16Array(GW * GH);
{ let k = 0; const r = MAP.rle; for (let i = 0; i < r.length; i += 2) { GRID.fill(r[i] - 1, k, k + r[i + 1]); k += r[i + 1]; } }
const SEA_IDS = MAP.seas.map(s => s[0]);

for (const p of PROV) if (!p.zones.length) p.coast = false; // lake shores are not sea coasts
const ZONE_PROVS = {}; for (const z in SEA) ZONE_PROVS[z] = PROV.filter(p => p.zones.includes(z)).map(p => p.id);
for (const k in RESOURCES) for (const nm in RESOURCES[k]) if (ID[nm] != null) PROV[ID[nm]][k] = RESOURCES[k][nm];

// weather regions: the far north and the continental interiors freeze in winter and drown in mud in spring and autumn
const EASTERN = new Set(['SOV','FIN','POL','EST','LAT','LIT','ROM','MON','MAN']);
for (const p of PROV) {
  p.cold = p.ter === 't' || EASTERN.has(p.owner0) && p.lat > 45.7 || p.lat > 59.7 || (p.owner0 === 'CAN' && p.lat > 48);
  p.muddy = EASTERN.has(p.owner0) && p.ter !== 'u' && p.lat > 45.7 || p.ter === 's';
  p.hot = p.ter === 'd' || p.ter === 'j';
}
// the legacy provinces are the European theatre (Europe, North Africa, the Middle East)
const inEurope = t => NATDEF[t] && NATDEF[t].cap != null && ID[NATDEF[t].cap] < MAP.nlegacy;
// distance in provinces (BFS), cached per source
const HOPS = new Map();
function hops(a) {
  if (HOPS.has(a)) return HOPS.get(a);
  const d = new Int16Array(NP).fill(999), q = [a]; d[a] = 0;
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of PROV[i].adj) if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } }
  HOPS.set(a, d); return d;
}
// straight-line distance the short way round the globe
const wrapDX = dx => { dx = Math.abs(dx) % WW; return dx > WW / 2 ? WW - dx : dx; };
const dist = (a, b) => Math.hypot(wrapDX(PROV[a].x - PROV[b].x), PROV[a].y - PROV[b].y);
