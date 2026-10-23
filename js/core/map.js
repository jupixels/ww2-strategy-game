'use strict';
/* ================= MAP STRUCTURES ================= */
const WW = MAP.W, WH = MAP.H, GW = MAP.GW, GH = MAP.GH, GS = MAP.S;
const PROV = MAP.prov.map((a, i) => ({ id:i, name:a[0], x:a[1], y:a[2], owner0:a[3], vp:a[4], fac0:a[5], ter:a[6], coast:!!a[7], area:a[8], cx:a[9], cy:a[10], adj:[], zones:[], oil:0, steel:0 }));
MAP.adj.forEach(([a, b]) => { PROV[a].adj.push(b); PROV[b].adj.push(a); });
const ID = {}; PROV.forEach(p => ID[p.name] = p.id);
const NP = PROV.length;
const GRID = new Int16Array(GW * GH);
{ let k = 0; const r = MAP.rle; for (let i = 0; i < r.length; i += 2) { GRID.fill(r[i] - 1, k, k + r[i + 1]); k += r[i + 1]; } }

// sea zones each coastal province touches
for (const z in COAST_ZONES) for (const nm of COAST_ZONES[z].split(' ')) { const id = ID[nm.replace(/_/g, ' ')]; if (id != null && !PROV[id].zones.includes(z)) PROV[id].zones.push(z); }
for (const p of PROV) if (!p.zones.length) p.coast = false; // lake shores are not sea coasts
const ZONE_PROVS = {}; for (const z in SEA) ZONE_PROVS[z] = PROV.filter(p => p.zones.includes(z)).map(p => p.id);
for (const k in RESOURCES) for (const nm in RESOURCES[k]) if (ID[nm] != null) PROV[ID[nm]][k] = RESOURCES[k][nm];

// weather regions: the far north and the east freeze in winter and drown in mud in spring and autumn
const EASTERN = new Set(['SOV','FIN','POL','EST','LAT','LIT','ROM']);
for (const p of PROV) {
  p.cold = p.ter === 't' || EASTERN.has(p.owner0) && p.y < 900 || p.y < 470;
  p.muddy = EASTERN.has(p.owner0) && p.ter !== 'u' && p.y < 900 || p.ter === 's';
  p.hot = p.ter === 'd';
}
// distance in provinces (BFS), cached per source
const HOPS = new Map();
function hops(a) {
  if (HOPS.has(a)) return HOPS.get(a);
  const d = new Int16Array(NP).fill(999), q = [a]; d[a] = 0;
  while (q.length) { const i = q.shift(); for (const j of PROV[i].adj) if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } }
  HOPS.set(a, d); return d;
}
const dist = (a, b) => Math.hypot(PROV[a].x - PROV[b].x, PROV[a].y - PROV[b].y);
