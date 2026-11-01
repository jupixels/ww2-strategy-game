// Builds data/map.js: the world map in a Miller projection that wraps east–west.
// Europe keeps the 234 legacy provinces (resampled from tools/worldmap/legacy_map.js through its fitted conic projection);
// everything else grows from the seed cities in seeds.js, constrained by modern borders (tidy colonial lines).
// Usage: node tools/worldmap/build.js <dir with Natural Earth 50m GeoJSON> [preview.png]
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const GEO = process.argv[2]; if (!GEO) { console.error('usage: build.js <geojson dir> [preview.png]'); process.exit(1); }
const OUT = path.join(__dirname, '..', '..', 'data', 'map.js');
const OLD = require('./legacy_map.js'), OP = require('./oldproj.json');
const { PROVS, RES, SEAS, SEA_LINKS, LAND_LINKS } = require('./seeds.js');
const LEGACY_SEA = { ARC:['NOR'], NOR:['ARC','NSE','ATL'], NSE:['NOR','CHN','BAL'], CHN:['NSE','ATL'], ATL:['NOR','CHN','WMD'], BAL:['NSE'], WMD:['ATL','EMD'], EMD:['WMD','BLK','IND'], BLK:['EMD'], IND:['EMD'], CAS:[] };
const LEGACY_COAST = {
  ARC:'Murmansk Arkhangelsk Naryan-Mar Pechora', NOR:'Reykjavík Bergen Trondheim Narvik Inverness',
  NSE:'Hamburg Essen Kiel Groningen Amsterdam Rotterdam Brussels Lille London Norwich Newcastle Inverness Jutland Oslo Gothenburg Bergen',
  CHN:'Normandy Brest Plymouth London Lille',
  ATL:'Glasgow Belfast Dublin Cork Cardiff Manchester Plymouth Brest Nantes Bordeaux Bilbao Galicia Porto Lisbon Seville Rabat Marrakesh Spanish_Sahara Reykjavík Gibraltar Tetuán',
  BAL:'Kiel Stettin Königsberg Bydgoszcz Danzig Copenhagen Malmö Stockholm Sundsvall Kiruna Oulu Tampere Helsinki Viipuri Leningrad Tallinn Riga Kaunas Pskov Novgorod',
  WMD:'Gibraltar Tetuán Granada Valencia Barcelona Zaragoza Marseille Toulouse Corsica Sardinia Algiers Oran Constantine Tunis Turin Florence Rome Naples Sicily Malta Tripoli Calabria',
  EMD:'Malta Sicily Calabria Bari Ancona Venice Trieste Split Zagreb Ljubljana Sarajevo Tirana Ioannina Athens Thessaloniki Crete Rhodes Izmir Antalya Adana Cyprus Aleppo Damascus Jerusalem Alexandria Cairo Benghazi Tobruk Tripoli Istanbul Siwa',
  BLK:'Istanbul Varna Constanța Bessarabia Odessa Sevastopol Krasnodar Rostov Trabzon Erzurum Ankara Tbilisi',
  IND:'Basra Shiraz Hofuf Medina Tabuk Cairo', CAS:'Baku Astrakhan Guryev Krasnovodsk Makhachkala Tehran Tabriz Grozny',
};
const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);

/* ---------- projection ---------- */
const SC = 20, LONW = -169, LATN = 82, LATS = -56, GS = 2;
const RAD = Math.PI / 180;
const mill = lat => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * RAD)) / RAD;
const YT = mill(LATN);
const W = 360 * SC, H = Math.ceil((YT - mill(LATS)) * SC / GS) * GS, GW = W / GS, GH = H / GS, N = GW * GH;
const wrapLon = lon => { let l = (lon - LONW) % 360; if (l < 0) l += 360; return l; };
const proj = (lon, lat) => [wrapLon(lon) * SC, (YT - mill(Math.max(LATS - 3, Math.min(LATN + 3, lat)))) * SC];
const unproj = (x, y) => { const m = (YT - y / SC) * RAD / 1.25; return [x / SC + LONW, (Math.atan(Math.exp(m)) - Math.PI / 4) / 0.4 / RAD]; };
// legacy conic
const oldFwd = (lon, lat) => { const a = (lon - OP.LON0) * OP.N, r = OP.F * Math.pow(Math.tan(Math.PI / 4 - lat * RAD / 2), OP.K); return [OP.CX + r * Math.sin(a), OP.CY + r * Math.cos(a)]; };
const oldInv = (x, y) => { const r = Math.hypot(x - OP.CX, y - OP.CY), a = Math.atan2(x - OP.CX, y - OP.CY); return [OP.LON0 + a / OP.N, (Math.PI / 2 - 2 * Math.atan(Math.pow(r / OP.F, 1 / OP.K))) / RAD]; };
log('world', W, H, 'grid', GW, GH);

/* ---------- helpers ---------- */
const load = f => JSON.parse(fs.readFileSync(path.join(GEO, f + '.geojson'), 'utf8')).features;
const polysOf = g => !g ? [] : g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
const linesOf = g => !g ? [] : g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
// project a lon/lat ring, unwrapping it across the seam so it stays continuous
function projRing(ring) {
  const out = []; let prev = null;
  for (const [lon, lat] of ring) { let [x, y] = proj(lon, lat); if (prev != null) { while (x - prev > W / 2) x -= W; while (prev - x > W / 2) x += W; } out.push(x, y); prev = x; }
  return out;
}
// scanline fill (even-odd over all rings) at grid cell centres; x wraps
function fillRings(rings, cb) {
  const edges = [];
  for (const r of rings) for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; const x0 = r[i] / GS, y0 = r[i + 1] / GS, x1 = r[j] / GS, y1 = r[j + 1] / GS; if (y0 !== y1) edges.push(y0 < y1 ? [x0, y0, x1, y1] : [x1, y1, x0, y0]); }
  if (!edges.length) return;
  let ymin = Infinity, ymax = -Infinity; for (const e of edges) { if (e[1] < ymin) ymin = e[1]; if (e[3] > ymax) ymax = e[3]; }
  const r0 = Math.max(0, Math.floor(ymin)), r1 = Math.min(GH - 1, Math.ceil(ymax));
  const buckets = Array.from({ length:r1 - r0 + 1 }, () => []);
  for (const e of edges) { const a = Math.max(r0, Math.ceil(e[1] - 0.5)), b = Math.min(r1, Math.floor(e[3] - 0.5)); for (let y = a; y <= b; y++) buckets[y - r0].push(e); }
  const xs = [];
  for (let y = r0; y <= r1; y++) {
    const yc = y + 0.5; xs.length = 0;
    for (const e of buckets[y - r0]) if (yc >= e[1] && yc < e[3]) xs.push(e[0] + (yc - e[1]) / (e[3] - e[1]) * (e[2] - e[0]));
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.ceil(xs[k] - 0.5), b = Math.floor(xs[k + 1] - 0.5); for (let x = a; x <= b; x++) cb(((x % GW) + GW) % GW, y); }
  }
}
const idx = (x, y) => y * GW + (((x % GW) + GW) % GW);
const cx = i => i % GW, cy = i => (i / GW) | 0;
function nb4(i, f) { const x = i % GW, y = (i / GW) | 0; f(y * GW + (x + 1) % GW); f(y * GW + (x + GW - 1) % GW); if (y > 0) f(i - GW); if (y < GH - 1) f(i + GW); }
function nb8(i, f) { const x = i % GW, y = (i / GW) | 0; for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= GH) continue; for (let dx = -1; dx <= 1; dx++) if (dx || dy) f(yy * GW + (x + dx + GW) % GW); } }
const wdx = (a, b) => { let d = Math.abs(a - b); return d > GW / 2 ? GW - d : d; };
const gdist = (x0, y0, x1, y1) => Math.hypot(wdx(x0, x1), y0 - y1);
function hash(x, y) { let h = (x | 0) * 374761393 + (y | 0) * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) & 0xffff) / 0xffff; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm = (x, y) => vnoise(x, y) * 0.6 + vnoise(x * 2.3, y * 2.3) * 0.3 + vnoise(x * 5.1, y * 5.1) * 0.1;
// Douglas–Peucker on a flat [x,y,...] array
function simplify(pts, tol) {
  const n = pts.length / 2; if (n < 3) return pts.slice();
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - pts[i * 2 + 1]) - (ax - pts[i * 2]) * (by - ay)) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  const o = []; for (let i = 0; i < n; i++) if (keep[i]) o.push(pts[i * 2], pts[i * 2 + 1]); return o;
}
const r1 = v => Math.round(v * 10) / 10;
// closed ring: split at the vertex farthest from the first, simplify both halves
function simplifyRing(r, tol) {
  const n = r.length / 2; let far = 0, fd = -1;
  for (let i = 1; i < n; i++) { const d = (r[i * 2] - r[0]) ** 2 + (r[i * 2 + 1] - r[1]) ** 2; if (d > fd) { fd = d; far = i; } }
  if (n < 4) return r.slice();
  const a = simplify(r.slice(0, far * 2 + 2), tol), b = simplify(r.slice(far * 2).concat(r.slice(0, 2)), tol);
  return a.slice(0, -2).concat(b.slice(0, -2));
}

/* ---------- land, lakes, countries, terrain regions ---------- */
const LAND = new Uint8Array(N);       // 1 land, 2 lake
const landRings = [];
for (const f of load('ne_50m_land')) for (const poly of polysOf(f.geometry)) {
  const rings = poly.map(projRing); fillRings(rings, (x, y) => { LAND[y * GW + x] = 1; });
  for (const r of rings) { const s = simplifyRing(r, 0.45); if (s.length >= 6) landRings.push(s.map(r1)); }
}
const RESERVOIR = /reservoir|res\.|kariba|volta|nasser|itaip|kremenchuk|bratsk|toktogul|kainji|tharthar|sakakawea|fort peck|mead|amistad|kyoga|gatun|ngum|smallwood|manicouagan|grande|aral|barsakelmes|razzaza|cabonga|baskatong|gouin|pipmuacan|falcon|millerton|shasta|wheeler|williston/i;
// the Aral Sea as it was before the Soviet irrigation schemes
const ARAL = [[58.2,45.6],[58.6,46.6],[59.6,46.8],[60.6,46.6],[61.4,46.3],[61.8,45.6],[61.2,44.9],[60.6,44.2],[59.9,43.6],[59.2,43.5],[58.6,43.9],[58.3,44.6]];
const lakeRings = [];
const lakes = load('ne_50m_lakes').filter(f => !RESERVOIR.test(f.properties.name || '') && (f.properties.scalerank == null || f.properties.scalerank <= 6));
const lakePolys = lakes.flatMap(f => polysOf(f.geometry)); lakePolys.push([ARAL.concat([ARAL[0]])]);
for (const poly of lakePolys) {
  const rings = poly.map(projRing); let area = 0; fillRings(rings, (x, y) => { const i = y * GW + x; if (LAND[i] === 1) { LAND[i] = 2; area++; } });
  for (const r of rings) { const s = simplifyRing(r, 0.45); if (s.length >= 6) lakeRings.push(s.map(r1)); }
}
log('land/lakes', landRings.length, lakeRings.length);
// modern countries, grouped where the 1936 map ignores a later border
const GROUP = { SDS:'SDN', SOL:'SOM', KAS:'IND', PAK:'IND', BGD:'IND', PSX:'ISR', CYN:'CYP', KOS:'SRB', SGP:'MYS', BRN:'MYS', RWA:'COD', BDI:'COD', LSO:'ZAF', SWZ:'ZAF', ESH:'SAH', BTN:'IND', TLS:'TLS', GUF:'GUF', ALD:'FIN', PRK:'KOR', HKG:'HKG', MAC:'CHN', ERI:'ERI', SAH:'SAH', ATF:'ATF' };
const COUNTRY = new Int16Array(N).fill(-1), CNAMES = [];
for (const f of load('ne_50m_admin_0_countries')) {
  let c = f.properties.ADM0_A3; c = GROUP[c] || c; let k = CNAMES.indexOf(c); if (k < 0) { k = CNAMES.length; CNAMES.push(c); }
  for (const poly of polysOf(f.geometry)) fillRings(poly.map(projRing), (x, y) => { COUNTRY[y * GW + x] = k; });
}
{ // every land cell gets the nearest country
  const q = []; for (let i = 0; i < N; i++) if (COUNTRY[i] >= 0) q.push(i);
  for (let h = 0; h < q.length; h++) { const i = q[h]; nb4(i, j => { if (COUNTRY[j] < 0) { COUNTRY[j] = COUNTRY[i]; q.push(j); } }); }
}
// biome per cell: 1 plains 2 forest 3 hills 4 mountains 5 desert 6 marsh 7 tundra 8 jungle 9 ice 10 steppe
const BIO = new Uint8Array(N);
const REG = new Uint8Array(N);
const regionCode = p => {
  const c = p.FEATURECLA, n = (p.NAME || '').toUpperCase();
  if (/PUNJAB/.test(n)) return 1; if (/CAATINGA/.test(n)) return 10; if (/WESTERN PLATEAU/.test(n)) return 5;
  if (/TIBET|PAMIR|ALTIPLANO/.test(n)) return 4;
  if (/MONGOLIAN PLATEAU|KAZAKH UPLAND|USTYURT|GREAT PLAINS|PAMPA|PATAGONIA|LLANO/.test(n)) return 10;
  if (c === 'Range/mtn') return 4; if (c === 'Desert') return 5; if (c === 'Tundra') return 7;
  if (c === 'Plateau' || c === 'Foothills') return 3; if (c === 'Wetlands' || c === 'Delta') return 6; if (c === 'Plain' || c === 'Lowland' || c === 'Basin') return 11;
  return 0;
};
const regs = load('ne_50m_geography_regions_polys').map(f => ({ code:regionCode(f.properties), f })).filter(r => r.code);
regs.sort((a, b) => (a.code === 4) - (b.code === 4)); // mountains paint last
for (const { code, f } of regs) for (const poly of polysOf(f.geometry)) fillRings(poly.map(projRing), (x, y) => { REG[y * GW + x] = code; });
const ICE = new Uint8Array(N);
for (const f of load('ne_50m_glaciated_areas')) for (const poly of polysOf(f.geometry)) fillRings(poly.map(projRing), (x, y) => { ICE[y * GW + x] = 1; });
log('countries', CNAMES.length, 'regions', regs.length);

/* ---------- legacy provinces resampled ---------- */
const OGW = OLD.GW, OGH = OLD.GH, OGRID = new Int16Array(OGW * OGH);
{ let k = 0; const r = OLD.rle; for (let i = 0; i < r.length; i += 2) { OGRID.fill(r[i] - 1, k, k + r[i + 1]); k += r[i + 1]; } }
const ONP = OLD.prov.length;
const PROVS_OUT = [];   // {name,x,y,owner,vp,fac,ter,coast,col,legacy,seedCell}
OLD.prov.forEach((a, i) => { const [lon, lat] = oldInv(a[1], a[2]); const [x, y] = proj(lon, lat); PROVS_OUT.push({ name:a[0], x, y, owner:a[3], vp:a[4], fac:a[5], ter:a[6], coast:a[7], legacy:i, lon, lat }); });
const ID = new Int16Array(N).fill(-1);
const INFRAME = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  if (LAND[i] !== 1) continue;
  const [lon, lat] = unproj((cx(i) + 0.5) * GS, (cy(i) + 0.5) * GS);
  const [ox, oy] = oldFwd(lon, lat);
  if (ox < 0 || oy < 0 || ox >= OLD.W || oy >= OLD.H) continue;
  INFRAME[i] = 1;
  const v = OGRID[Math.floor(oy / OLD.S) * OGW + Math.floor(ox / OLD.S)];
  if (v >= 0) ID[i] = v;
}
// in-frame land the old coastline missed: borrow the nearest legacy province within a few cells
{
  let front = []; for (let i = 0; i < N; i++) if (ID[i] >= 0) front.push(i);
  for (let pass = 0; pass < 6; pass++) { const nx = []; for (const i of front) nb4(i, j => { if (ID[j] < 0 && LAND[j] === 1 && INFRAME[j]) { ID[j] = ID[i]; nx.push(j); } }); front = nx; }
}
log('legacy cells', ID.reduce((s, v) => s + (v >= 0), 0));

/* ---------- new seeds ---------- */
const seeds = [];
for (const line of PROVS.split('\n')) {
  const s = line.trim(); if (!s || s[0] === '#') continue;
  const [name, lon, lat, owner, vp, fac, fl = ''] = s.split('|');
  if (PROVS_OUT.some(p => p.name === name) || seeds.some(p => p.name === name)) throw new Error('duplicate province ' + name);
  seeds.push({ name, lon:+lon, lat:+lat, owner, vp:+vp, fac:+fac, col:fl.includes('c') ? 1 : 0, blob:fl.includes('b'), ter:(fl.match(/t(\w)/) || [])[1] });
}
const blobRings = [];
for (const s of seeds) {
  const [x, y] = proj(s.lon, s.lat); s.x = x; s.y = y;
  let gx = Math.floor(x / GS), gy = Math.floor(y / GS);
  if (s.blob) { // islands too small for the coastline data
    let land = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (LAND[idx(gx + dx, gy + dy)] === 1) land++;
    if (land < 6) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) { const i = idx(gx + dx, gy + dy); LAND[i] = 1; COUNTRY[i] = COUNTRY[i] >= 0 ? COUNTRY[i] : 0; }
      const r = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; r.push(r1(x + Math.cos(a) * 4.6), r1(y + Math.sin(a) * 4.6)); } blobRings.push(r); s.forced = true; }
  }
  // snap onto land
  if (LAND[idx(gx, gy)] !== 1) { let best = null, bd = 1e9; for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) { const i = idx(gx + dx, gy + dy); if (gy + dy < 0 || gy + dy >= GH || LAND[i] !== 1) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [gx + dx, gy + dy]; } } if (!best) { console.warn('seed in the sea', s.name); continue; } [gx, gy] = best; s.x = (gx + 0.5) * GS; s.y = (gy + 0.5) * GS; }
  s.gx = ((gx % GW) + GW) % GW; s.gy = gy; s.cell = idx(gx, gy); s.country = COUNTRY[s.cell];
}
for (const s of seeds) if (s.blob && s.forced) { s.country = COUNTRY[s.cell]; }
// region list: legacy provinces first, then the seeds
const NL = ONP, regions = [];
PROVS_OUT.forEach((p, i) => { const g = [p.x / GS, p.y / GS]; regions.push({ gx:g[0], gy:g[1], country:-1 }); });
seeds.forEach(s => { PROVS_OUT.push({ name:s.name, x:s.x, y:s.y, owner:s.owner, vp:s.vp, fac:s.fac, ter:s.ter, col:s.col, lon:s.lon, lat:s.lat }); regions.push({ gx:s.gx, gy:s.gy, country:s.country, seed:s }); });
const NPR = PROVS_OUT.length;
// legacy provinces belong to the modern country most of their cells sit in
{ const cnt = new Map(); for (let i = 0; i < N; i++) if (ID[i] >= 0) { const k = ID[i] * 1000 + COUNTRY[i]; cnt.set(k, (cnt.get(k) || 0) + 1); }
  const best = new Map(); for (const [k, n] of cnt) { const p = Math.floor(k / 1000), c = k % 1000; if (!best.has(p) || best.get(p)[1] < n) best.set(p, [c, n]); }
  for (const [p, [c]] of best) regions[p].country = c; }
// release legacy cells that lie closer to a new seed of the same country (carves Siberia, Arabia, the Sahel)
{
  const near = seeds.map((s, k) => ({ s, k })).filter(({ s }) => { const [ox, oy] = oldFwd(s.lon, s.lat); return ox > -400 && oy > -400 && ox < OLD.W + 400 && oy < OLD.H + 400; });
  let released = 0;
  for (let i = 0; i < N; i++) {
    const p = ID[i]; if (p < 0) continue;
    const x = cx(i), y = cy(i), R = regions[p], dOwn = gdist(x, y, R.gx, R.gy);
    for (const { s } of near) if (s.country === COUNTRY[i] && gdist(x, y, s.gx, s.gy) < dOwn * 0.85) { ID[i] = -1; released++; break; }
  }
  log('released legacy cells', released, 'carving seeds', near.length);
}
for (const s of seeds) if (s.forced) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (dx * dx + dy * dy <= 5) { const i = idx(s.gx + dx, s.gy + dy); if (LAND[i] === 1) ID[i] = NL + seeds.indexOf(s); }

/* ---------- growth: noisy, connected Voronoi constrained by country ---------- */
{
  const hasRegion = new Uint8Array(CNAMES.length + 1); for (const r of regions) if (r.country >= 0) hasRegion[r.country] = 1;
  // binary heap of (key, cell, region)
  let HK = new Float32Array(1 << 20), HC = new Int32Array(1 << 20), HR = new Int16Array(1 << 20), hn = 0;
  const push = (k, c, r) => { if (hn >= HK.length) { const g = a => { const b = new a.constructor(a.length * 2); b.set(a); return b; }; HK = g(HK); HC = g(HC); HR = g(HR); } let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (HK[p] <= k) break; HK[i] = HK[p]; HC[i] = HC[p]; HR[i] = HR[p]; i = p; } HK[i] = k; HC[i] = c; HR[i] = r; };
  const pop = () => { const k = HK[0], c = HC[0], r = HR[0]; const lk = HK[--hn], lc = HC[hn], lr = HR[hn]; let i = 0; for (;;) { let m = 2 * i + 1; if (m >= hn) break; if (m + 1 < hn && HK[m + 1] < HK[m]) m++; if (HK[m] >= lk) break; HK[i] = HK[m]; HC[i] = HC[m]; HR[i] = HR[m]; i = m; } HK[i] = lk; HC[i] = lc; HR[i] = lr; return [k, c, r]; };
  const key = (i, r) => { const R = regions[r], x = cx(i), y = cy(i); return gdist(x, y, R.gx, R.gy) + 9 * (fbm((x + r * 37.1) / 17, (y + r * 19.7) / 17) - 0.5); };
  const ok = (j, r) => LAND[j] === 1 && ID[j] < 0 && (COUNTRY[j] === regions[r].country || !hasRegion[COUNTRY[j]]);
  for (let i = 0; i < N; i++) if (ID[i] >= 0) nb4(i, j => { if (ok(j, ID[i])) push(key(j, ID[i]), j, ID[i]); });
  seeds.forEach((s, k) => { const r = NL + k; if (ID[s.cell] < 0) { ID[s.cell] = r; } nb4(s.cell, j => { if (ok(j, r)) push(key(j, r), j, r); }); });
  while (hn) { const [, c, r] = pop(); if (ID[c] >= 0) continue; ID[c] = r; nb4(c, j => { if (ok(j, r)) push(key(j, r), j, r); }); }
  // islands nobody reached: nearest province across the water
  const lab = new Int16Array(ID); const q = []; for (let i = 0; i < N; i++) if (lab[i] >= 0) q.push(i);
  for (let h = 0; h < q.length; h++) { const i = q[h]; nb8(i, j => { if (lab[j] < 0) { lab[j] = lab[i]; q.push(j); } }); }
  let left = 0; for (let i = 0; i < N; i++) if (LAND[i] === 1 && ID[i] < 0) { ID[i] = lab[i]; left++; }
  log('grown; island cells by proximity', left);
}
// any legacy province squeezed out by the resampling keeps a small footprint
{ const area = new Int32Array(NPR); for (let i = 0; i < N; i++) if (ID[i] >= 0) area[ID[i]]++;
  PROVS_OUT.forEach((p, k) => { if (area[k] >= 3) return; const gx = Math.floor(p.x / GS), gy = Math.floor(p.y / GS); console.warn('stamping', p.name, area[k]); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = idx(gx + dx, gy + dy); LAND[i] = 1; ID[i] = k; } }); }

/* ---------- biome ---------- */
const OLDTER = { p:1, f:2, h:3, m:4, d:5, u:1, s:6, t:7 };
for (let i = 0; i < N; i++) {
  if (LAND[i] !== 1) continue;
  const y = cy(i), lat = unproj(0, (y + 0.5) * GS)[1], x = cx(i);
  let b = REG[i];
  if (ICE[i]) b = 9;
  else if (!b || b === 11) {
    const p = ID[i], legacy = p >= 0 && p < NL;
    const n = fbm(x / 9, y / 9);
    if (legacy) b = OLDTER[PROVS_OUT[p].ter] || 1;
    else if (Math.abs(lat) >= 64) b = 7;
    else if (lat >= 52) b = n > 0.32 ? 2 : 1;
    else if (Math.abs(lat) < 9) b = n > 0.25 ? 8 : 2;
    else if (Math.abs(lat) < 17) b = n > 0.62 ? 8 : 10;
    else b = n > 0.6 ? 2 : 1;
    if (b === 1 && !legacy && REG[i] !== 11 && n > 0.66) b = 2;
  }
  if (b === 11) b = 1;
  BIO[i] = b;
}
// province terrain for the new provinces: weighted majority of their cells
{
  const WT = [0, 1, 1.1, 1.2, 1.7, 1, 1.2, 1, 1.15, 1, 0.9], TER = [0, 'p', 'f', 'h', 'm', 'd', 's', 't', 'j', 't', 'p'];
  const cnt = Array.from({ length:NPR }, () => new Float64Array(11));
  for (let i = 0; i < N; i++) if (ID[i] >= NL) cnt[ID[i]][BIO[i]] += WT[BIO[i]];
  for (let k = NL; k < NPR; k++) { if (PROVS_OUT[k].ter) continue; let b = 1; for (let j = 1; j < 11; j++) if (cnt[k][j] > cnt[k][b]) b = j; PROVS_OUT[k].ter = TER[b]; }
}

/* ---------- sea zones ---------- */
const zones = [];
for (const line of SEAS.split('\n')) { const s = line.trim(); if (!s) continue; const [id, n, ...pts] = s.split('|'); zones.push({ id, n, pts:pts.map(p => p.split(',').map(Number)) }); }
const ZONE = new Int16Array(N).fill(-1);
{
  const q = [];
  zones.forEach((z, k) => {
    z.cells = [];
    for (const [lon, lat] of z.pts) {
      const [x, y] = proj(lon, lat); let gx = Math.floor(x / GS), gy = Math.floor(y / GS), found = null;
      for (let r = 0; r < 25 && !found; r++) for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const yy = gy + dy; if (yy < 0 || yy >= GH) continue; const i = idx(gx + dx, yy); if (!LAND[i]) { found = i; break; } }
      if (found == null) { console.warn('zone seed on land', z.id, lon, lat); continue; }
      if (ZONE[found] < 0) { ZONE[found] = k; q.push(found); }
      z.cells.push(found);
    }
    const m = z.cells[0]; z.x = (cx(m) + 0.5) * GS; z.y = (cy(m) + 0.5) * GS;
  });
  // grow by straight-line distance to the zone's nearest seed (connected through water), so borders run like HOI4's sea lanes
  const heap = []; const hpush = (k, c, z) => { heap.push([k, c, z]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= k) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
  const hpop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let m = 2 * i + 1; if (m >= heap.length) break; if (m + 1 < heap.length && heap[m + 1][0] < heap[m][0]) m++; if (heap[m][0] >= heap[i][0]) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
  const zkey = (i, z) => { const x = cx(i), y = cy(i); let d = 1e9; for (const s of zones[z].cells) d = Math.min(d, gdist(x, y, cx(s), cy(s))); return d + 14 * (fbm((x + z * 51) / 40, (y + z * 23) / 40) - 0.5); };
  for (const i of q) nb4(i, j => { if (!LAND[j] && ZONE[j] < 0) hpush(zkey(j, ZONE[i]), j, ZONE[i]); });
  while (heap.length) { const [, c, z] = hpop(); if (ZONE[c] >= 0) continue; ZONE[c] = z; nb4(c, j => { if (!LAND[j] && ZONE[j] < 0) hpush(zkey(j, z), j, z); }); }
  // the legacy fleet markers stay where they were
  const OLDSEA = { ARC:[1520,70], NOR:[900,260], NSE:[975,545], CHN:[790,722], ATL:[500,780], BAL:[1225,525], WMD:[900,1075], EMD:[1380,1262], BLK:[1565,940], IND:[1965,1395], CAS:[1890,805] };
  for (const z of zones) if (OLDSEA[z.id]) { const [lon, lat] = oldInv(...OLDSEA[z.id]); const [x, y] = proj(lon, lat); z.x = r1(x); z.y = r1(y); }
}
const zadj = zones.map(() => new Set());
for (let i = 0; i < N; i++) if (ZONE[i] >= 0) nb4(i, j => { if (ZONE[j] >= 0 && ZONE[j] !== ZONE[i]) zadj[ZONE[i]].add(ZONE[j]); });
const ZK = id => zones.findIndex(z => z.id === id);
for (const a in LEGACY_SEA) for (const b of LEGACY_SEA[a]) { zadj[ZK(a)].add(ZK(b)); zadj[ZK(b)].add(ZK(a)); }
for (const [a, b] of SEA_LINKS) { zadj[ZK(a)].add(ZK(b)); zadj[ZK(b)].add(ZK(a)); }
zadj[ZK('CAS')].clear(); for (const s of zadj) s.delete(ZK('CAS'));
// coastal zones of each province: sea cells within two cells of its land
const pz = Array.from({ length:NPR }, () => new Set());
for (let i = 0; i < N; i++) {
  const p = ID[i]; if (p < 0 || LAND[i] !== 1) continue;
  const x = cx(i), y = cy(i);
  for (let dy = -2; dy <= 2; dy++) { const yy = y + dy; if (yy < 0 || yy >= GH) continue; for (let dx = -2; dx <= 2; dx++) { const z = ZONE[yy * GW + (x + dx + GW) % GW]; if (z >= 0) pz[p].add(z); } }
}
const legacyZones = {}; for (const z in LEGACY_COAST) for (const nm of LEGACY_COAST[z].split(' ')) (legacyZones[nm.replace(/_/g, ' ')] || (legacyZones[nm.replace(/_/g, ' ')] = [])).push(z);
PROVS_OUT.forEach((p, k) => {
  let zs = [...pz[k]].map(z => zones[z].id);
  if (p.legacy != null) zs = [...new Set((legacyZones[p.name] || []).concat(zs.filter(z => !LEGACY_SEA[z])))];
  if (p.legacy != null && !p.coast) zs = zs.filter(z => !LEGACY_SEA[z]);
  p.zones = zs; p.coast = zs.length ? 1 : 0;
});
log('zones', zones.length);

/* ---------- adjacency ---------- */
const adj = new Set();
const ak = (a, b) => a < b ? a * 4096 + b : b * 4096 + a;
for (let i = 0; i < N; i++) { const a = ID[i]; if (a < 0 || LAND[i] !== 1) continue; nb4(i, j => { const b = ID[j]; if (b >= 0 && b !== a && LAND[j] === 1 && (a >= NL || b >= NL)) adj.add(ak(a, b)); }); }
for (const [a, b] of OLD.adj) adj.add(ak(a, b));
const PID = {}; PROVS_OUT.forEach((p, k) => PID[p.name] = k);
for (const [a, b] of LAND_LINKS) { if (PID[a] == null || PID[b] == null) throw new Error('land link ' + a + ' ' + b); adj.add(ak(PID[a], PID[b])); }

/* ---------- borders: trace cell edges between provinces, chain, smooth ---------- */
function traceBorders(lab, isPair) {
  // edges keyed by pair; vertices are grid corners (x in 0..GW, wrapping handled by unwrapping during chaining)
  const byPair = new Map();
  const add = (a, b, x0, y0, x1, y1) => { const k = ak(a, b); let L = byPair.get(k); if (!L) byPair.set(k, L = []); L.push(x0, y0, x1, y1); };
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x, a = lab[i]; if (a < 0) continue;
    const r = y * GW + (x + 1) % GW, b = lab[r]; if (b >= 0 && b !== a && isPair(a, b, i, r)) add(a, b, x + 1, y, x + 1, y + 1);
    if (y < GH - 1) { const d = i + GW, c = lab[d]; if (c >= 0 && c !== a && isPair(a, c, i, d)) add(a, c, x, y + 1, x + 1, y + 1); }
  }
  const out = [];
  for (const [k, L] of byPair) {
    const a = Math.floor(k / 4096), b = k % 4096;
    const vk = (x, y) => (x % GW) * 4096 + y; const nbr = new Map();
    const link = (u, v) => { (nbr.get(u) || (nbr.set(u, []), nbr.get(u))).push(v); };
    const segs = [];
    for (let s = 0; s < L.length; s += 4) { const u = vk(L[s], L[s + 1]), v = vk(L[s + 2], L[s + 3]); segs.push([u, v]); link(u, v); link(v, u); }
    const used = new Set(); const ek = (u, v) => u < v ? u + ':' + v : v + ':' + u;
    const walk = (start, next) => { const line = [start, next]; used.add(ek(start, next)); let prev = start, cur = next;
      for (;;) { const ns = (nbr.get(cur) || []).filter(n => !used.has(ek(cur, n))); if (ns.length !== 1 || (nbr.get(cur) || []).length > 2) break; prev = cur; cur = ns[0]; used.add(ek(prev, cur)); line.push(cur); if (cur === start) break; }
      return line; };
    // start at endpoints / junctions first, then loops
    const starts = [...nbr.keys()].filter(v => nbr.get(v).length !== 2);
    for (const s of starts.concat([...nbr.keys()])) for (const n of nbr.get(s)) if (!used.has(ek(s, n))) {
      const line = walk(s, n); const pts = []; let px = null;
      for (const v of line) { let x = Math.floor(v / 4096) * GS; const y = (v % 4096) * GS; if (px != null) { while (x - px > W / 2) x -= W; while (px - x > W / 2) x += W; } pts.push(x, y); px = x; }
      out.push([a, b, smoothLine(pts, line[0] === line[line.length - 1])]);
    }
  }
  return out;
}
function smoothLine(pts, closed) {
  let p = pts;
  for (let it = 0; it < 2; it++) { const q = closed ? [] : [p[0], p[1]]; const n = p.length / 2;
    for (let i = 0; i < n - 1; i++) { const x0 = p[i * 2], y0 = p[i * 2 + 1], x1 = p[i * 2 + 2], y1 = p[i * 2 + 3]; q.push(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25, x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75); }
    if (closed) q.push(q[0], q[1]); else q.push(p[p.length - 2], p[p.length - 1]); p = q; }
  return simplify(p, 0.35).map(r1);
}
const isLandLand = (a, b, i, j) => LAND[i] === 1 && LAND[j] === 1;
const borders = traceBorders(ID, isLandLand);
const seaBorders = traceBorders(ZONE, () => true).map(([a, b, pts]) => [zones[a].id, zones[b].id, pts]);
log('borders', borders.length, 'sea borders', seaBorders.length);

/* ---------- rivers ---------- */
const rivers = [];
for (const f of load('ne_50m_rivers_lake_centerlines')) {
  const rank = f.properties.scalerank; if (rank > 7) continue;
  for (const line of linesOf(f.geometry)) { const p = projRing(line); const s = simplify(p, 0.6).map(r1); if (s.length >= 4) rivers.push([rank, s]); }
}
log('rivers', rivers.length);

/* ---------- province stats & output ---------- */
const area = new Int32Array(NPR), sx = new Float64Array(NPR), sy = new Float64Array(NPR);
const ref = PROVS_OUT.map(p => p.x / GS);
for (let i = 0; i < N; i++) { const p = ID[i]; if (p < 0 || LAND[i] !== 1) continue; let x = cx(i) + 0.5; while (x - ref[p] > GW / 2) x -= GW; while (ref[p] - x > GW / 2) x += GW; area[p]++; sx[p] += x; sy[p] += cy(i) + 0.5; }
const resOf = (k, nm) => (RES[k] && RES[k][nm]) || 0;
const prov = PROVS_OUT.map((p, k) => {
  const lat = r1(p.lat); let ccx = sx[k] / area[k] * GS; ccx = ((ccx % W) + W) % W;
  return [p.name, r1(p.x), r1(p.y), p.owner, p.vp, p.fac, p.ter, p.coast, area[k], r1(ccx), r1(sy[k] / area[k] * GS), lat, p.zones.join(' '), p.col ? 1 : 0, resOf('oil', p.name), resOf('steel', p.name)];
});
// run-length rasters: provinces (>=0), sea zones (<= -2), lakes/unzoned water (-1); biomes
function rle(get) { const r = []; let v = get(0), n = 1; for (let i = 1; i < N; i++) { const w = get(i); if (w === v) n++; else { r.push(v, n); v = w; n = 1; } } r.push(v, n); return r; }
const gridRLE = rle(i => (LAND[i] === 1 ? ID[i] : ZONE[i] >= 0 ? -2 - ZONE[i] : -1) + 1);
const bioRLE = rle(i => LAND[i] === 1 ? BIO[i] : 0);
const MAPO = { W, H, S:GS, GW, GH, proj:{ SC, LONW, LATN, LATS, YT }, land:landRings.concat(blobRings), lakes:lakeRings, rivers, prov, adj:[...adj].map(k => [Math.floor(k / 4096), k % 4096]), borders, seaBorders,
  seas:zones.map((z, k) => [z.id, z.n, r1(z.x), r1(z.y), [...zadj[k]].map(j => zones[j].id).join(' ')]), rle:gridRLE, bio:bioRLE, nlegacy:NL };
const txt = '/* World map: provinces, borders, coasts, lakes, rivers, sea zones, province and biome rasters (RLE). Generated by tools/worldmap/build.js — do not edit. */\nconst MAP=' + JSON.stringify(MAPO) + ';\nif (typeof module !== "undefined") module.exports = MAP;\n';
fs.writeFileSync(OUT, txt);
log('wrote', OUT, (txt.length / 1e6).toFixed(2) + ' MB', 'provinces', NPR, 'adj', MAPO.adj.length, { land:JSON.stringify(MAPO.land).length, borders:JSON.stringify(borders).length, rle:JSON.stringify(gridRLE).length, bio:JSON.stringify(bioRLE).length, rivers:JSON.stringify(rivers).length, sea:JSON.stringify(seaBorders).length });
for (const s of seeds) if (area[PID[s.name]] < 12) console.warn('small province', s.name, area[PID[s.name]]);

/* ---------- optional preview ---------- */
if (process.argv[3]) {
  const crop = (process.env.CROP || '').split(',').map(Number); // grid x0,y0,x1,y1 at full resolution
  const SCL = crop.length === 4 ? 1 : 2, X0 = crop.length === 4 ? crop[0] : 0, Y0 = crop.length === 4 ? crop[1] : 0;
  const w = crop.length === 4 ? crop[2] - crop[0] : GW / SCL | 0, h = crop.length === 4 ? crop[3] - crop[1] : GH / SCL | 0, img = Buffer.alloc((w * 3 + 1) * h);
  const col = t => { let s = 0; for (const ch of t) s = s * 31 + ch.charCodeAt(0); return [60 + (s & 127) + 40, 60 + ((s >> 7) & 127) + 20, 60 + ((s >> 14) & 127)]; };
  const BC = [[0,0,0],[150,170,90],[60,110,50],[150,130,80],[120,110,100],[220,200,140],[90,120,100],[170,170,150],[30,90,40],[240,240,250],[180,170,100]];
  const mode = process.env.PREVIEW || 'owner';
  for (let y = 0; y < h; y++) { img[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) {
    const i = (Y0 + y * SCL) * GW + X0 + x * SCL, o = y * (w * 3 + 1) + 1 + x * 3; let c;
    if (LAND[i] === 1) { const p = ID[i]; c = mode === 'bio' ? BC[BIO[i]] : p < 0 ? [255, 0, 255] : col(PROVS_OUT[p].owner); if (mode !== 'bio') { const r = ID[i + 1], d = ID[i + GW]; if ((r >= 0 && r !== p) || (d >= 0 && d !== p)) c = [30, 25, 20]; } }
    else if (LAND[i] === 2) c = [70, 110, 160]; else { const z = ZONE[i]; c = z < 0 ? [20, 20, 40] : [20 + (z * 37) % 50, 50 + (z * 53) % 60, 100 + (z * 29) % 60]; }
    img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; } }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(process.argv[3], Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(img)), chunk('IEND', Buffer.alloc(0))]));
  log('preview', process.argv[3], w, h);
}
