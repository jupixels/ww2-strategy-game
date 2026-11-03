'use strict';
/* ================= RENDER =================
   A world map in the style of a modern grand-strategy table: terrain-shaded nation colours, relief, rivers, sea lanes,
   curved country names. The world wraps east–west. Everything static is painted into 512-pixel tiles at seven zoom
   levels and cached: a terrain raster underneath, provinces as crisp vector shapes on top, fine ground grain when zoomed
   in. A capture only invalidates the tiles it touches. Counters, cities and labels are drawn over the tiles. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let ME = null;            // the nation this screen belongs to (null = spectator)
const cv = $('#map'), ctx = cv.getContext('2d');
const stat = document.createElement('canvas'), sctx = stat.getContext('2d');
let VW = 1, VH = 1, DPR = 1;
const cam = { x:0, y:0, z:1 };
let staticDirty = true, ownersDirty = true, busy = false;
let sel = null;               // {id, amt, multi:Set}
let selFleet = null;          // {z}
let targets = new Map();      // id -> kind
let fleetTargetsSet = new Set();
let mapMode = 'pol';          // pol | ter | sup | res
let pickMode = null;          // {kind:'card'|'raid'|'ops'|'spy', ...} — choosing a target on the map
const PAPER = [196, 186, 150];   // the neutral land tone nation colours are mixed into
const OCEAN = '#173f5c';
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FONT_MAP = "'Cormorant SC',Georgia,serif", FONT_BODY = "'Barlow Semi Condensed','Arial Narrow',sans-serif", FONT_DISP = "'Big Shoulders Stencil Display',Impact,sans-serif";
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const N = GW * GH;
const wrapX = x => ((x % WW) + WW) % WW;
const gx2 = x => ((x % GW) + GW) % GW;
// world x of the copy of x nearest to `ref` (the camera, or the other end of an arrow)
const nearX = (x, ref = cam.x) => x + WW * Math.round((ref - x) / WW);

/* ================= STATIC DATA ================= */
// province raster dilated a few cells into the water, so fills reach the vector coastline it is clipped to
const GRIDD = new Int16Array(N);
for (let i = 0; i < N; i++) GRIDD[i] = GRID[i] >= 0 ? GRID[i] : -1;
for (let pass = 0; pass < 3; pass++) {
  const src = new Int16Array(GRIDD);
  for (let y = 1; y < GH - 1; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x; if (src[i] >= 0) continue;
    const l = y * GW + (x + GW - 1) % GW, r = y * GW + (x + 1) % GW;
    const v = src[l] >= 0 ? src[l] : src[r] >= 0 ? src[r] : src[i - GW] >= 0 ? src[i - GW] : src[i + GW];
    if (v >= 0) GRIDD[i] = v;
  }
}
function runsOf(get, count) {
  const tmp = Array.from({ length:count }, () => []);
  for (let y = 0; y < GH; y++) { let x = 0; while (x < GW) { const id = get(y * GW + x); if (id < 0) { x++; continue; } let x1 = x; while (x1 + 1 < GW && get(y * GW + x1 + 1) === id) x1++; tmp[id].push(y, x, x1); x = x1 + 1; } }
  return tmp.map(a => Int32Array.from(a));
}
// horizontal pixel runs per province [y, x0, x1, ...] and per sea zone
const RUNS = runsOf(i => GRIDD[i], NP);
const ZRUNS = runsOf(i => GRID[i] <= -2 ? -2 - GRID[i] : -1, SEA_IDS.length);
const BIO = new Uint8Array(N);
{ let k = 0; const r = MAP.bio; for (let i = 0; i < r.length; i += 2) { BIO.fill(r[i], k, k + r[i + 1]); k += r[i + 1]; } }
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) & 0xffff) / 0xffff; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }

/* relief: an elevation guess from the terrain (mountains high and ridged, plains flat), lit from the north-west.
   Computed at half the grid resolution and sampled back up. */
const HW = GW >> 1, HH = GH >> 1;
const SHADE = new Float32Array(HW * HH);
{
  const AMP = [0, 0.06, 0.16, 0.45, 1, 0.22, 0.04, 0.2, 0.18, 0.35, 0.08];
  const amp = new Float32Array(HW * HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) amp[y * HW + x] = AMP[BIO[(y * 2) * GW + x * 2]];
  const blur = (a, r) => {
    const t = new Float32Array(a.length);
    for (let y = 0; y < HH; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * HW + ((x + HW) % HW)]; for (let x = 0; x < HW; x++) { t[y * HW + x] = s / (2 * r + 1); s += a[y * HW + (x + r + 1) % HW] - a[y * HW + (x - r + HW) % HW]; } }
    for (let x = 0; x < HW; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[clamp(y, 0, HH - 1) * HW + x]; for (let y = 0; y < HH; y++) { a[y * HW + x] = s / (2 * r + 1); s += t[Math.min(HH - 1, y + r + 1) * HW + x] - t[Math.max(0, y - r) * HW + x]; } }
  };
  blur(amp, 3); blur(amp, 3);
  const h = new Float32Array(HW * HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) { const i = y * HW + x; const a = amp[i]; if (a < 0.01) continue; let n = 0, f = 1 / 13, w = 1, ws = 0; for (let o = 0; o < 4; o++) { const r = vnoise(x * f, y * f); n += (1 - Math.abs(2 * r - 1)) * w; ws += w; f *= 2.1; w *= 0.5; } h[i] = a * n / ws; }
  for (let y = 1; y < HH - 1; y++) for (let x = 0; x < HW; x++) { const i = y * HW + x; SHADE[i] = clamp((h[i - HW - 1 + (x ? 0 : HW)] - h[i + HW + (x < HW - 1 ? 1 : 1 - HW)]) * 3.4, -0.36, 0.32); }
}
// bilinear, so the half-resolution relief never shows its blocks
const shadeAt = (gx, gy) => {
  const fx = gx / 2 - 0.25, fy = clamp(gy / 2 - 0.25, 0, HH - 1.001), x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const a = (x0 + HW) % HW, b = (x0 + 1) % HW, r0 = y0 * HW, r1 = Math.min(HH - 1, y0 + 1) * HW;
  return (SHADE[r0 + a] * (1 - tx) + SHADE[r0 + b] * tx) * (1 - ty) + (SHADE[r1 + a] * (1 - tx) + SHADE[r1 + b] * tx) * ty;
};
// terrain colours per cell (the land under the nation colours)
const TERR = new Uint8ClampedArray(N * 3);
{
  //            -   plains        forest       hills          mountains      desert         marsh         tundra         jungle       ice            steppe
  const BC = [[0,0,0],[150,158,96],[78,108,62],[152,140,100],[132,122,108],[214,190,140],[104,122,94],[164,162,140],[56,98,52],[236,240,244],[182,170,114]];
  for (let y = 0; y < GH; y++) {
    const lat = Math.abs(y / GH - 0.36);
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x, b = BIO[i]; if (!b) continue;
      const c = BC[b], n = (vnoise(x / 11, y / 11) - 0.5) * 22 + (vnoise(x / 3.2, y / 3.2) - 0.5) * 8, s = 1 + shadeAt(x, y);
      let r = c[0] + n, g = c[1] + n, bb = c[2] + n * 0.7;
      if (b === 4) { const sn = clamp((shadeAt(x, y) - 0.06) * 5 + (vnoise(x / 2.3, y / 2.3) - 0.5), 0, 1); r += 58 * sn; g += 60 * sn; bb += 66 * sn; }   // snow on the sunlit ridges
      if (b === 2 || b === 1) { r += lat * 30; bb += lat * 10; }                                  // paler toward the poles
      TERR[i * 3] = r * s; TERR[i * 3 + 1] = g * s; TERR[i * 3 + 2] = bb * s;
    }
  }
}
// ocean: deep blue with lighter shelves near the coasts (half resolution)
const oceanCv = mkCanvas(HW, HH);
{
  const dist = new Uint8Array(HW * HH).fill(255), q = new Int32Array(HW * HH); let qh = 0, qt = 0;
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) { const i = y * HW + x; if (GRID[(y * 2) * GW + x * 2] >= 0 || GRID[(y * 2) * GW + x * 2] === -1 && BIO[(y * 2) * GW + x * 2]) { dist[i] = 0; q[qt++] = i; } }
  while (qh < qt) { const i = q[qh++], d = dist[i]; if (d >= 60) continue; const x = i % HW;
    const l = i - x + (x + HW - 1) % HW, r = i - x + (x + 1) % HW;
    for (const j of [l, r, i - HW, i + HW]) if (j >= 0 && j < HW * HH && dist[j] > d + 1) { dist[j] = d + 1; q[qt++] = j; } }
  const oc = oceanCv.getContext('2d'); const img = oc.createImageData(HW, HH); const D = img.data;
  const shallow = [70, 132, 150], mid = [36, 88, 118], deep = [20, 54, 84];
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
    const i = y * HW + x, d = dist[i]; const t = Math.min(1, Math.pow(d / 45, 0.6));
    const c = t < 0.35 ? shallow.map((v, k) => v + (mid[k] - v) * t / 0.35) : mid.map((v, k) => v + (deep[k] - v) * (t - 0.35) / 0.65);
    const nz = (vnoise(x / 14, y / 14) - 0.5) * 12 + (hash(x, y) - 0.5) * 3, pole = Math.max(0, Math.abs(y / HH - 0.42) - 0.3) * 60;
    D[i * 4] = c[0] + nz + pole * 0.6; D[i * 4 + 1] = c[1] + nz + pole * 0.7; D[i * 4 + 2] = c[2] + nz * 1.2 + pole * 0.5; D[i * 4 + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
}

/* ================= VECTOR LAYERS, BUCKETED ================= */
// Lines are cut into per-bucket pieces (300×300 world units) so a tile only strokes geometry near it; a segment lives
// in the bucket of its first point, and tiles look one bucket beyond their edges. Filled shapes (land, lakes) are
// clipped to each bucket, so a tile's clip path holds only local pieces of the continents.
const BW = 300, BCOLS = Math.ceil(WW / BW), BROWS = Math.ceil(WH / BW);
const bkey = (cx, cy) => cx * 64 + cy;
function bucketize(lines, close) {
  const B = new Map();
  const seg = (k, pts, a, b) => { let P = B.get(k); if (!P) B.set(k, P = new Path2D()); P.moveTo(pts[a], pts[a + 1]); for (let i = a + 2; i <= b; i += 2) P.lineTo(pts[i], pts[i + 1]); };
  for (let pts of lines) {
    if (close) pts = pts.concat(pts[0], pts[1]);
    let a = 0, k = bkey(Math.floor(pts[0] / BW), Math.floor(pts[1] / BW));
    for (let i = 2; i < pts.length; i += 2) {
      const k2 = bkey(Math.floor(pts[i] / BW), Math.floor(pts[i + 1] / BW));
      if (k2 !== k) { seg(k, pts, a, i); a = i; k = k2; }
    }
    if (a < pts.length - 2) seg(k, pts, a, pts.length - 2);
  }
  return B;
}
// clip a closed ring to an axis-aligned rect (Sutherland–Hodgman)
function clipRing(r, x0, y0, x1, y1) {
  let p = r;
  const pass = (inside, cut) => { const o = [], n = p.length / 2; for (let i = 0; i < n; i++) { const ax = p[i * 2], ay = p[i * 2 + 1], j = (i + 1) % n, bx = p[j * 2], by = p[j * 2 + 1], ia = inside(ax, ay), ib = inside(bx, by); if (ia) o.push(ax, ay); if (ia !== ib) o.push(...cut(ax, ay, bx, by)); } p = o; };
  pass((x) => x >= x0, (ax, ay, bx, by) => [x0, ay + (by - ay) * (x0 - ax) / (bx - ax)]); if (p.length < 6) return null;
  pass((x) => x <= x1, (ax, ay, bx, by) => [x1, ay + (by - ay) * (x1 - ax) / (bx - ax)]); if (p.length < 6) return null;
  pass((x, y) => y >= y0, (ax, ay, bx, by) => [ax + (bx - ax) * (y0 - ay) / (by - ay), y0]); if (p.length < 6) return null;
  pass((x, y) => y <= y1, (ax, ay, bx, by) => [ax + (bx - ax) * (y1 - ay) / (by - ay), y1]);
  return p.length >= 6 ? p : null;
}
function bucketFill(rings) {
  const B = new Map();
  for (const r of rings) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) { if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < y0) y0 = r[i + 1]; if (r[i + 1] > y1) y1 = r[i + 1]; }
    for (let cx = Math.floor(x0 / BW); cx <= Math.floor(x1 / BW); cx++) for (let cy = Math.max(0, Math.floor(y0 / BW)); cy <= Math.floor(y1 / BW); cy++) {
      const inBox = x0 >= cx * BW && x1 <= (cx + 1) * BW && y0 >= cy * BW && y1 <= (cy + 1) * BW;
      const p = inBox ? r : clipRing(r, cx * BW, cy * BW, (cx + 1) * BW, (cy + 1) * BW); if (!p) continue;
      const k = bkey(cx, cy); let P = B.get(k); if (!P) B.set(k, P = new Path2D());
      P.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) P.lineTo(p[i], p[i + 1]); P.closePath();
    }
  }
  return B;
}
// call f(path) for every bucket path of layer B near world rect R
function eachBucket(B, R, f) {
  for (let cx = Math.floor(R[0] / BW) - 1; cx <= Math.floor(R[2] / BW) + 1; cx++) for (let cy = Math.max(0, Math.floor(R[1] / BW) - 1); cy <= Math.floor(R[3] / BW) + 1; cy++) { const P = B.get(bkey(cx, cy)); if (P) f(P); }
}
// the filled pieces covering rect R as one path (pieces from different buckets never overlap, so even-odd holds)
function joined(B, R, P = new Path2D(), off = 0) {
  const m = off ? new DOMMatrix([1, 0, 0, 1, off, 0]) : undefined;
  for (let cx = Math.floor(R[0] / BW); cx <= Math.floor(R[2] / BW); cx++) for (let cy = Math.max(0, Math.floor(R[1] / BW)); cy <= Math.floor(R[3] / BW); cy++) { const q = B.get(bkey(cx, cy)); if (q) P.addPath(q, m); }
  return P;
}
const LAND_B = bucketize(MAP.land, true), LAKE_B = bucketize(MAP.lakes, true);
const LAND_F = bucketFill(MAP.land), LAKE_F = bucketFill(MAP.lakes);
const SEA_B = bucketize(MAP.seaBorders.map(b => b[2]), false);
const RIVER_B = [bucketize(MAP.rivers.filter(r => r[0] <= 3).map(r => r[1]), false), bucketize(MAP.rivers.filter(r => r[0] > 3).map(r => r[1]), false)];
/* ================= PROVINCE SHAPES ================= */
// Every province is a vector shape linked from the shared boundary chains in MAP.borders (side -1 is open sea), so
// neighbours meet exactly and fills stay crisp at any zoom. The land raster underneath only carries terrain.
const PPATH = [], PBOX = [], RBOX = [];   // RBOX: one box per ring (islands can sit on both sides of the date line)
{
  const byP = Array.from({ length:NP }, () => []);
  for (const [a, b, pts] of MAP.borders) { if (a >= 0) byP[a].push(pts); if (b >= 0) byP[b].push(pts); }
  const key = (x, y) => Math.round(wrapX(x) * 10) % (WW * 10) + ',' + Math.round(y * 10);
  const rev = s => { const o = []; for (let i = s.length - 2; i >= 0; i -= 2) o.push(s[i], s[i + 1]); return o; };
  for (let p = 0; p < NP; p++) {
    const segs = byP[p], used = new Uint8Array(segs.length), ends = new Map(), P = new Path2D(), rb = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    segs.forEach((s, k) => { for (const i of [0, s.length - 2]) { const kk = key(s[i], s[i + 1]); let L = ends.get(kk); if (!L) ends.set(kk, L = []); L.push(k); } });
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue; used[k] = 1;
      const ring = segs[k].slice(), sk = key(ring[0], ring[1]);
      for (let guard = 0; guard < 5000; guard++) {
        const ek = key(ring[ring.length - 2], ring[ring.length - 1]); if (ek === sk && ring.length > 4) break;
        const j = (ends.get(ek) || []).find(q => !used[q]); if (j == null) break;
        used[j] = 1; let s = segs[j]; if (key(s[0], s[1]) !== ek) s = rev(s);
        const dx = WW * Math.round((ring[ring.length - 2] - s[0]) / WW);
        for (let i = 2; i < s.length; i += 2) ring.push(s[i] + dx, s[i + 1]);
      }
      P.moveTo(ring[0], ring[1]);
      let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity;
      for (let i = 0; i < ring.length; i += 2) { const x = ring[i], y = ring[i + 1]; if (i) P.lineTo(x, y); if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
      P.closePath(); rb.push([a0 - 2, b0 - 2, a1 + 2, b1 + 2]);
      x0 = Math.min(x0, a0); x1 = Math.max(x1, a1); y0 = Math.min(y0, b0); y1 = Math.max(y1, b1);
    }
    PPATH[p] = P; PBOX[p] = [x0 - 2, y0 - 2, x1 + 2, y1 + 2]; RBOX[p] = rb;
  }
}
// provinces per bucket, for tiles
const PROV_B = new Map(), PBW = 100, pkey = (cx, cy) => cx * 128 + cy;
RBOX.forEach((rs, p) => { for (const b of rs) for (let cx = Math.floor(b[0] / PBW); cx <= Math.floor(b[2] / PBW); cx++) for (let cy = Math.max(0, Math.floor(b[1] / PBW)); cy <= Math.floor(b[3] / PBW); cy++) { const k = pkey(cx, cy); let L = PROV_B.get(k); if (!L) PROV_B.set(k, L = []); if (L[L.length - 1] !== p) L.push(p); } });
function provsIn(R) { const S = new Set(); for (let cx = Math.floor(R[0] / PBW); cx <= Math.floor(R[2] / PBW); cx++) for (let cy = Math.max(0, Math.floor(R[1] / PBW)); cy <= Math.floor(R[3] / PBW); cy++) { const L = PROV_B.get(pkey(cx, cy)); if (L) for (const p of L) S.add(p); } return S; }
// borders between provinces, trimmed to land, for the per-frame overlays (selection outline, front lines)
const LAND_BORDERS = [];
{
  const onLand = (x, y) => { let n = 0; for (const [dx, dy] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) if (gridAt(x + dx, y + dy, GRID) >= 0) n++; return n >= 2; };
  for (const [a, b, pts] of MAP.borders) {
    if (a < 0 || b < 0) continue;
    let run = [];
    const flush = () => { if (run.length >= 4) LAND_BORDERS.push([a, b, run]); run = []; };
    for (let i = 0; i < pts.length; i += 2) { if (onLand(pts[i], pts[i + 1])) run.push(pts[i], pts[i + 1]); else flush(); }
    flush();
  }
}
let INNER_B = new Map(), NAT_B = new Map(), PLAYER_B = new Map();

/* ================= TERRAIN RASTER & OWNERSHIP ================= */
const polCv = mkCanvas(GW, GH), polCtx = polCv.getContext('2d');
{ // terrain colours, carried a few cells out to sea so the coastline clip never shows the raster's edge
  const img = polCtx.createImageData(GW, GH), D = img.data, src = Int32Array.from({ length:N }, (_, i) => BIO[i] ? i : -1);
  for (let pass = 0; pass < 4; pass++) { const s0 = src.slice(); for (let y = 1; y < GH - 1; y++) for (let x = 0; x < GW; x++) { const i = y * GW + x; if (s0[i] >= 0) continue; const v = [y * GW + (x + 1) % GW, y * GW + (x + GW - 1) % GW, i - GW, i + GW].map(j => s0[j]).find(j => j >= 0); if (v != null) src[i] = v; } }
  for (let i = 0; i < N; i++) { const j = src[i]; if (j < 0) continue; D[i * 4] = TERR[j * 3]; D[i * 4 + 1] = TERR[j * 3 + 1]; D[i * 4 + 2] = TERR[j * 3 + 2]; D[i * 4 + 3] = 255; }
  polCtx.putImageData(img, 0, 0);
}
// fine grain laid over the land when zoomed in, so close-ups read as ground rather than stretched pixels
const DETAIL = mkCanvas(256, 256);
{
  const c = DETAIL.getContext('2d'), img = c.createImageData(256, 256), D = img.data;
  const tile = (x, y, f) => vnoise((x % 256) * f, (y % 256) * f);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    // periodic noise: blend the four wrapped copies so the pattern tiles seamlessly
    const u = x / 256, v = y / 256, smp = f => tile(x, y, f) * (1 - u) * (1 - v) + tile(x + 256, y, f) * u * (1 - v) + tile(x, y + 256, f) * (1 - u) * v + tile(x + 256, y + 256, f) * u * v;
    const n = smp(1 / 24) * 0.45 + smp(1 / 9) * 0.3 + smp(1 / 3.5) * 0.17 + hash(x, y) * 0.08, g = clamp(128 + (n - 0.5) * 150, 0, 255), i = (y * 256 + x) * 4;
    D[i] = D[i + 1] = D[i + 2] = g; D[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}
const overCv = mkCanvas(HW, HH), overCtx = overCv.getContext('2d');   // sea-zone highlights only
let frontMine = new Path2D(), frontOther = new Path2D(), hasFront = false, selPath = null;
let labels = [], worldVersion = 0, worldBuilt = false, fogKey = '', wxKey = '', FOGGED = new Uint8Array(NP), WXCOL = new Array(NP).fill(null);
let timelapseOwners = null; // when set, paint these owners instead of the live ones
const ownerOf = i => timelapseOwners ? timelapseOwners[i] : G.prov[i].o;
const painted = new Array(NP).fill('');
const FILL_A = { pol:0.62, ter:0, sup:0.2, res:0.3 };
const rgba = (hex, a) => { const c = hexRGB(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
// a province's tiles must repaint: its box, and the copies one world-width away
function invalidateBox(id) { for (const b of RBOX[id]) for (const o of [0, -WW, WW]) invalidateTiles([b[0] + o, b[1], b[2] + o, b[3]]); }
function paintOwners(force) {
  let n = 0;
  for (let id = 0; id < NP; id++) {
    const p = G.prov[id], o = ownerOf(id), occ = !timelapseOwners && p.core !== o && A(p.core);
    const key = mapMode + o + natColor(o) + (occ ? p.core + natColor(p.core) : '');
    if (!force && painted[id] === key) continue;
    painted[id] = key; n++;
    if (!force) invalidateBox(id);
  }
  return n;
}
function rebuildOwners() {
  ownersDirty = false;
  const force = !worldBuilt;
  paintOwners(force);
  const inner = [], natl = [], mine = [];
  frontMine = new Path2D(); frontOther = new Path2D(); hasFront = false;
  const add = (P, pts) => { P.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) P.lineTo(pts[i], pts[i + 1]); };
  for (const [a, b, pts] of MAP.borders) {
    if (a < 0 || b < 0) continue;
    const oa = ownerOf(a), ob = ownerOf(b);
    (oa === ob ? inner : natl).push(pts);
    if (ME && (oa === ME) !== (ob === ME)) mine.push(pts);
  }
  for (const [a, b, pts] of LAND_BORDERS) { const oa = ownerOf(a), ob = ownerOf(b); if (!timelapseOwners && oa !== ob && W(oa, ob)) { hasFront = true; add(ME && (friendly(oa, ME) || friendly(ob, ME)) ? frontMine : frontOther, pts); } }
  INNER_B = bucketize(inner, false); NAT_B = bucketize(natl, false); PLAYER_B = bucketize(mine, false);
  computeLabels();
  rebuildFog(); rebuildWeather();
  if (force) invalidateTiles(null);
  worldBuilt = true; worldVersion++;
}

/* ================= TILES ================= */
// level lv draws at s = 2^lv pixels per world unit; tiles are square in world units and divide the circumference evenly
const LV_MIN = -2, LV_MAX = 4;
const TILES = new Map(); let tileClock = 0;
const TILE_CAP = matchMedia('(pointer: coarse)').matches ? 48 : 110;
const tileWorld = lv => WW / Math.max(1, Math.round(WW * Math.pow(2, lv) / 512));
function invalidateTiles(R) {
  if (!R) { TILES.clear(); return; }
  for (const [k, t] of TILES) { const r = t.rect; const hit = r[0] < R[2] && r[2] > R[0] && r[1] < R[3] && r[3] > R[1]; if (hit) TILES.delete(k); }
}
function paintWorld(c, R, s) {
  // R: world rect; s: pixels per world unit (line widths stay a constant number of pixels)
  const px = 1 / s;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const gx0 = Math.max(0, Math.floor(R[0] / GS) - 1), gy0 = Math.max(0, Math.floor(R[1] / GS) - 1), gx1 = Math.min(GW, Math.ceil(R[2] / GS) + 1), gy1 = Math.min(GH, Math.ceil(R[3] / GS) + 1);
  c.drawImage(oceanCv, gx0 / 2, gy0 / 2, (gx1 - gx0) / 2, (gy1 - gy0) / 2, gx0 * GS, gy0 * GS, (gx1 - gx0) * GS, (gy1 - gy0) * GS);
  const offs = [0]; if (R[0] < 60) offs.push(-WW); if (R[2] > WW - 60) offs.push(WW);
  c.lineJoin = 'round'; c.lineCap = 'round';
  for (const off of offs) {
    const Q = [R[0] - off, R[1], R[2] - off, R[3]];
    c.save(); c.translate(off, 0);
    if (s >= 0.4) { c.strokeStyle = 'rgba(190,225,240,.16)'; c.lineWidth = 1 * px; c.setLineDash([4 * px, 3 * px]); eachBucket(SEA_B, Q, P => c.stroke(P)); c.setLineDash([]); }
    // shallow-water rim along the coast
    c.strokeStyle = 'rgba(150,205,215,.13)'; c.lineWidth = 9 * px + 4; eachBucket(LAND_B, Q, P => c.stroke(P));
    c.strokeStyle = 'rgba(175,220,225,.16)'; c.lineWidth = 3 * px + 1.5; eachBucket(LAND_B, Q, P => c.stroke(P));
    c.restore();
  }
  // land: terrain, then nation colours as vector shapes, all clipped to the coastline
  c.save();
  const clip = new Path2D(); for (const off of offs) joined(LAND_F, [R[0] - off, R[1], R[2] - off, R[3]], clip, off);
  c.clip(clip, 'evenodd');
  c.drawImage(polCv, gx0, gy0, gx1 - gx0, gy1 - gy0, gx0 * GS, gy0 * GS, (gx1 - gx0) * GS, (gy1 - gy0) * GS);
  if (s >= 1) { // ground grain at two scales, fading in as you zoom
    const a = clamp((s - 1) / 3, 0, 1);
    c.globalCompositeOperation = 'overlay';
    for (const [k, al] of [[0.25, 0.5], [0.07, 0.38]]) { const pat = c.createPattern(DETAIL, 'repeat'); pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0])); c.fillStyle = pat; c.globalAlpha = a * al; c.fillRect(R[0], R[1], R[2] - R[0], R[3] - R[1]); }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  }
  const fa = FILL_A[mapMode] ?? 0.62;
  for (const off of offs) {
    const Q = [R[0] - off, R[1], R[2] - off, R[3]], ids = provsIn(Q);
    c.save(); c.translate(off, 0);
    for (const id of ids) {
      const p = G.prov[id], o = ownerOf(id);
      if (fa) { c.fillStyle = rgba(natColor(o), fa); c.fill(PPATH[id], 'evenodd'); }
      // occupied land shows its rightful owner in stripes
      if (fa && !timelapseOwners && p.core !== o && A(p.core)) { c.fillStyle = stripeFill(c, natColor(p.core), s); c.fill(PPATH[id], 'evenodd'); }
      if (WXCOL[id]) { c.fillStyle = WXCOL[id]; c.fill(PPATH[id], 'evenodd'); }
      if (FOGGED[id]) { c.fillStyle = hatchFill(c, s); c.fill(PPATH[id], 'evenodd'); }
    }
    if (s >= 0.4) {
      c.strokeStyle = 'rgba(58,118,156,.95)';
      c.lineWidth = (s >= 4 ? 3 : s >= 1 ? 2.2 : 1.5) * px; eachBucket(RIVER_B[0], Q, P => c.stroke(P));
      if (s >= 0.9) { c.lineWidth = (s >= 4 ? 2 : 1.3) * px; eachBucket(RIVER_B[1], Q, P => c.stroke(P)); }
    }
    if (s >= 0.4) { c.strokeStyle = s >= 4 ? 'rgba(30,22,14,.5)' : 'rgba(30,22,14,.36)'; c.lineWidth = (s >= 8 ? 1.4 : s >= 4 ? 1.1 : 0.75) * px; eachBucket(INNER_B, Q, P => c.stroke(P)); }
    // national borders: a soft light halo under a dark line
    const bw = s >= 8 ? 2.4 : s >= 4 ? 1.9 : 1.5;
    c.strokeStyle = 'rgba(245,236,210,.32)'; c.lineWidth = bw * 2.1 * px; eachBucket(NAT_B, Q, P => c.stroke(P));
    c.strokeStyle = 'rgba(24,16,8,.88)'; c.lineWidth = bw * px; eachBucket(NAT_B, Q, P => c.stroke(P));
    if (ME && !timelapseOwners) { c.strokeStyle = 'rgba(236,196,114,.75)'; c.lineWidth = 1.8 * px; c.setLineDash([5 * px, 3.5 * px]); eachBucket(PLAYER_B, Q, P => c.stroke(P)); c.setLineDash([]); }
    c.restore();
  }
  c.restore();
  for (const off of offs) {
    const Q = [R[0] - off, R[1], R[2] - off, R[3]];
    c.save(); c.translate(off, 0);
    c.fillStyle = 'rgb(52,104,132)'; c.fill(joined(LAKE_F, Q), 'evenodd');
    c.strokeStyle = 'rgba(28,24,18,.75)'; c.lineWidth = 1 * px; eachBucket(LAND_B, Q, P => c.stroke(P));
    c.strokeStyle = 'rgba(28,30,30,.5)'; c.lineWidth = 0.7 * px; eachBucket(LAKE_B, Q, P => c.stroke(P));
    c.restore();
  }
}
// patterns sized in screen pixels whatever the zoom: s is the canvas scale (pixels per world unit)
const PATCV = {};
function patCanvas(key, draw) { if (!PATCV[key]) { const c = mkCanvas(8, 8); draw(c.getContext('2d')); PATCV[key] = c; } return PATCV[key]; }
function stripeFill(c, col, s) {
  const cv2 = patCanvas('st' + col, x => { x.strokeStyle = rgba(col, 0.9); x.lineWidth = 2.6; x.beginPath(); for (const o of [-8, 0, 8]) { x.moveTo(o, 8); x.lineTo(o + 8, 0); } x.stroke(); });
  const p = c.createPattern(cv2, 'repeat'); p.setTransform(new DOMMatrix([1 / s, 0, 0, 1 / s, 0, 0])); return p;
}
function hatchFill(c, s) {
  const cv2 = patCanvas('fog', x => { x.fillStyle = 'rgba(16,20,26,.16)'; x.fillRect(0, 0, 8, 8); x.strokeStyle = 'rgba(16,20,26,.22)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.stroke(); });
  const p = c.createPattern(cv2, 'repeat'); p.setTransform(new DOMMatrix([1 / s, 0, 0, 1 / s, 0, 0])); return p;
}
function renderTile(lv, tx, ty) {
  const s = Math.pow(2, lv), T = tileWorld(lv), px = Math.ceil(T * s);
  const x0 = tx * T, y0 = ty * T, R = [x0, y0, x0 + T, Math.min(WH, y0 + T)];
  const t = TILES.get(lv + '|' + tx + '|' + ty) || { cv:mkCanvas(px, Math.ceil((R[3] - R[1]) * s)) };
  const c = t.cv.getContext('2d');
  c.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
  c.save(); c.beginPath(); c.rect(R[0], R[1], R[2] - R[0], R[3] - R[1]); c.clip();
  paintWorld(c, R, s);
  c.restore();
  t.rect = R; t.used = ++tileClock; t.lv = lv;
  TILES.set(lv + '|' + tx + '|' + ty, t);
  if (TILES.size > TILE_CAP) { let old = null; for (const [k, v] of TILES) if (!old || v.used < old[1].used) old = [k, v]; if (old) TILES.delete(old[0]); }
  return t;
}
// draw the visible tiles; returns true if any were missing (they are rendered progressively)
function drawTiles(c, budgetMs) {
  const sz = cam.z * DPR, lv = clamp(Math.round(Math.log2(sz) + 0.1), LV_MIN, LV_MAX), s = Math.pow(2, lv), T = tileWorld(lv), nx = Math.round(WW / T), ny = Math.ceil(WH / T);
  const [wx0, wy0] = s2w(0, 0), [wx1, wy1] = s2w(VW, VH);
  const t0 = performance.now(); let missing = false;
  const k = sz / s;   // tile pixels → screen pixels
  for (let ty = Math.max(0, Math.floor(wy0 / T)); ty <= Math.min(ny - 1, Math.floor(wy1 / T)); ty++) for (let tx = Math.floor(wx0 / T); tx <= Math.floor(wx1 / T); tx++) {
    const ix = ((tx % nx) + nx) % nx, key = lv + '|' + ix + '|' + ty;
    let t = TILES.get(key);
    if (!t && performance.now() - t0 < budgetMs) t = renderTile(lv, ix, ty);
    const sx = (tx * T - cam.x) * cam.z * DPR + VW * DPR / 2, sy = (ty * T - cam.y) * cam.z * DPR + VH * DPR / 2;
    if (t) { t.used = ++tileClock; c.drawImage(t.cv, Math.floor(sx), Math.floor(sy), Math.ceil(t.cv.width * k) + 1, Math.ceil(t.cv.height * k) + 1); continue; }
    missing = true;
    // stand-in: any cached tile from another level covering this spot, stretched
    for (const d of [-1, 1, -2, 2]) {
      const l2 = lv + d; if (l2 < LV_MIN || l2 > LV_MAX) continue;
      const T2 = tileWorld(l2), n2 = Math.round(WW / T2), wx = wrapX(tx * T + T / 2), wy = ty * T + T / 2;
      const t2 = TILES.get(l2 + '|' + Math.floor(wx / T2) % n2 + '|' + Math.floor(wy / T2)); if (!t2) continue;
      const s2 = Math.pow(2, l2), ox = Math.floor(wx / T2) * T2, oy = Math.floor(wy / T2) * T2;
      const X = wrapX(tx * T), Y = ty * T, qx = Math.max(ox, X), qy = Math.max(oy, Y), qw = Math.min(X + T, ox + T2) - qx, qh = Math.min(Y + T, oy + T2) - qy;
      if (qw <= 0 || qh <= 0) continue;
      c.drawImage(t2.cv, (qx - ox) * s2, (qy - oy) * s2, qw * s2, qh * s2, Math.floor(sx + (qx - wrapX(tx * T)) * sz), Math.floor(sy + (qy - ty * T) * sz), Math.ceil(qw * sz) + 1, Math.ceil(qh * sz) + 1);
      break;
    }
  }
  return missing;
}

/* ================= LABELS: country names along the lie of the land ================= */
function computeLabels() {
  labels = [];
  const seen = new Uint8Array(NP), comps = {};
  for (let i = 0; i < NP; i++) {
    if (seen[i]) continue; const t = ownerOf(i); if (!G.nat[t] || (!timelapseOwners && !A(t))) continue;
    const st = [i], comp = []; seen[i] = 1;
    while (st.length) { const k = st.pop(); comp.push(k); for (const j of PROV[k].adj) if (!seen[j] && ownerOf(j) === t) { seen[j] = 1; st.push(j); } }
    (comps[t] || (comps[t] = [])).push({ area:sum(comp, k => PROV[k].area), comp });
  }
  for (const t in comps) {
    const cap = nat(t).capital;
    const list = comps[t].sort((a, b) => b.area - a.area);
    const home = list.find(c => c.comp.includes(cap)) || list[0];
    for (const C of list) {
      if (C !== home && !(C.area >= 2500 && C.area >= home.area * 0.35)) continue;
      // principal axis of the provinces (area-weighted, the short way round the globe)
      const ref = PROV[C.comp[0]].cx; let W8 = 0, mx = 0, my = 0;
      const pts = C.comp.map(k => { const P = PROV[k]; return [nearX(P.cx, ref), P.cy, P.area]; });
      for (const [x, y, w] of pts) { W8 += w; mx += x * w; my += y * w; } mx /= W8; my /= W8;
      let sxx = 0, syy = 0, sxy = 0; for (const [x, y, w] of pts) { sxx += (x - mx) ** 2 * w; syy += (y - my) ** 2 * w; sxy += (x - mx) * (y - my) * w; }
      sxx /= W8; syy /= W8; sxy /= W8;
      let ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
      // round countries read level; only long thin ones follow their axis
      const tr = sxx + syy, det = sxx * syy - sxy * sxy, d = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + d, l2 = Math.max(1e-6, tr / 2 - d);
      ang = clamp(ang * clamp((Math.sqrt(l1 / l2) - 1.3) / 1.5, 0, 1), -0.55, 0.55);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // extent along the axis and a gentle bend: fit v = a·u² over the provinces
      let umin = 0, umax = 0, su4 = 0, su2v = 0;
      for (const [x, y, w] of pts) { const u = (x - mx) * ca + (y - my) * sa, v = -(x - mx) * sa + (y - my) * ca; umin = Math.min(umin, u); umax = Math.max(umax, u); su4 += u ** 4 * w; su2v += u * u * v * w; }
      const cell = Math.sqrt(C.area) * GS;
      const len = Math.max(cell * 0.9, Math.min((umax - umin) + cell * 0.5, cell * 2.6)) * 0.82;
      let bend = su4 > 0 ? su2v / su4 : 0;
      bend = clamp(bend, -0.25 / len, 0.25 / len);
      const nm = G.nat[t].name.toUpperCase();
      const fs = clamp(len / (nm.length * 0.78 + 1), 7, C === home ? 120 : 70);
      // the centre must sit on the country itself
      let x = mx, y = my; const gi = Math.round(y / GS) * GW + gx2(Math.round(x / GS));
      if (!(GRID[gi] >= 0 && ownerOf(GRID[gi]) === t)) { const b = C.comp.reduce((b, k) => PROV[k].area > PROV[b].area ? k : b, C.comp[0]); x = nearX(PROV[b].cx, mx); y = PROV[b].cy; }
      labels.push({ t, x:wrapX(x), y, nm, fs, ang, bend, len:Math.min(len, nm.length * fs * 1.05) });
    }
  }
}
function drawLabels(c, z) {
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const L of labels) {
    const sz = L.fs * z; if (sz < 7) continue;
    const a = clamp(1.25 - sz / 150, 0, 0.62); if (a <= 0.02) continue;
    const x = nearX(L.x);
    c.font = `700 ${L.fs}px ${FONT_MAP}`;
    const n = L.nm.length, ws = L.ws || (L.ws = [...L.nm].map(ch => c.measureText(ch).width)), tw = ws.reduce((p, q) => p + q, 0);
    const gap = n > 1 ? Math.max(0, (L.len - tw) / (n - 1)) : 0, total = tw + gap * (n - 1);
    c.save(); c.translate(x, L.y); c.rotate(L.ang);
    c.fillStyle = `rgba(28,20,10,${a})`; c.strokeStyle = `rgba(240,232,210,${a * 0.35})`; c.lineWidth = L.fs * 0.06;
    let u = -total / 2;
    for (let i = 0; i < n; i++) {
      const cu = u + ws[i] / 2, v = L.bend * cu * cu, slope = Math.atan(2 * L.bend * cu);
      c.save(); c.translate(cu, v); c.rotate(slope); c.strokeText(L.nm[i], 0, 0); c.fillText(L.nm[i], 0, 0); c.restore();
      u += ws[i] + gap;
    }
    c.restore();
  }
}
/* fog of war: provinces you cannot see are hatched over (baked into the tiles) */
function rebuildFog() {
  if (!G) return;
  const vis = PROV.map((p, i) => !ME || timelapseOwners ? 1 : visibleTo(ME, i) ? 1 : 0).join('');
  if (vis === fogKey) return;
  for (let i = 0; i < NP; i++) { const f = vis[i] === '0' ? 1 : 0; if (f !== FOGGED[i]) { FOGGED[i] = f; if (worldBuilt) invalidateBox(i); } }
  fogKey = vis;
}
/* weather: snow on cold provinces in winter, mud in spring and autumn */
function rebuildWeather() {
  if (!G) return;
  const key = G.m + (timelapseOwners ? 'x' : '');
  if (key === wxKey) return; wxKey = key;
  const snow = !timelapseOwners && isWinter(), mud = !timelapseOwners && isMud();
  for (let i = 0; i < NP; i++) {
    const P = PROV[i], col = snow && P.cold ? 'rgba(245,250,255,.42)' : mud && P.muddy ? 'rgba(96,70,40,.2)' : null;
    if (col !== WXCOL[i]) { WXCOL[i] = col; if (worldBuilt) invalidateBox(i); }
  }
}
// selection, targets and map-mode colours: a list of province fills drawn as vectors over the tiles
const OVPAT = {};
function stripeCanvas(r, g, b, a) {
  const c = mkCanvas(6, 6), x = c.getContext('2d');
  x.fillStyle = `rgba(${r},${g},${b},${a})`; x.fillRect(0, 0, 6, 6);
  x.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, a * 1.7)})`; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(-1, 7); x.lineTo(7, -1); x.moveTo(5, 7); x.lineTo(7, 5); x.moveTo(-1, 1); x.lineTo(1, -1); x.stroke();
  return c;
}
function overlayPats() {
  if (OVPAT.sel) return OVPAT;
  Object.assign(OVPAT, { sel:stripeCanvas(255, 240, 200, 0.38), move:stripeCanvas(110, 205, 95, 0.6), attack:stripeCanvas(225, 70, 40, 0.58), naval:stripeCanvas(90, 166, 214, 0.6), land:stripeCanvas(90, 166, 214, 0.6), para:stripeCanvas(190, 120, 230, 0.6), convoy:stripeCanvas(120, 214, 220, 0.42), invade:stripeCanvas(236, 150, 58, 0.55), hover:stripeCanvas(255, 236, 170, 0.5), pick:stripeCanvas(255, 200, 80, 0.55), sea:stripeCanvas(150, 210, 245, 0.32) });
  return OVPAT;
}
let hoverNat = null, overlayOn = false, OVL = [], seaOn = false;
function rebuildOverlay() {
  const P = overlayPats();
  OVL = []; overCtx.clearRect(0, 0, HW, HH); seaOn = false;
  overlayOn = !!(sel || selFleet || hoverNat || mapMode === 'sup' || mapMode === 'res' || pickMode);
  if (!G) return;
  if (mapMode === 'sup') for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (ME && !friendly(p.o, ME)) continue; const s = p.sup; OVL.push([i, s >= 1 ? 'rgba(90,170,80,.5)' : s >= 0.75 ? 'rgba(190,190,70,.55)' : s > 0.4 ? 'rgba(220,140,50,.6)' : s > 0 ? 'rgba(220,90,40,.65)' : 'rgba(200,30,30,.75)']); }
  if (mapMode === 'res') for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core === p.o) continue; OVL.push([i, `rgba(210,60,30,${0.15 + p.res / 130})`]); }
  if (hoverNat) for (let i = 0; i < NP; i++) if (G.prov[i].o === hoverNat) OVL.push([i, P.hover]);
  if (pickMode) for (const id of pickMode.ids || []) OVL.push([id, P.pick]);
  if (selFleet) { overCtx.fillStyle = overCtx.createPattern(P.sea, 'repeat'); for (const z of fleetTargetsSet) { const k = SEA_IDS.indexOf(z); if (k < 0) continue; const R = ZRUNS[k]; for (let q = 0; q < R.length; q += 3) overCtx.fillRect(R[q + 1] / 2, R[q] / 2, (R[q + 2] - R[q + 1] + 1) / 2, 0.5); seaOn = true; } }
  if (sel) { OVL.push([sel.id, P.sel]); if (sel.multi) for (const id of sel.multi) OVL.push([id, P.sel]); for (const [id, k] of targets) OVL.push([id, P[k]]); }
  selPath = null;
  if (sel) { selPath = new Path2D(); const S = sel.multi ? new Set([sel.id, ...sel.multi]) : new Set([sel.id]); for (const [a, b, pts] of LAND_BORDERS) if (S.has(a) !== S.has(b)) { selPath.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) selPath.lineTo(pts[i], pts[i + 1]); } }
  staticDirty = true;
}
// draw the overlay fills for the visible provinces, clipped to land
function drawOverlay(c, off) {
  if (!OVL.length) return;
  const [a, b] = s2w(0, 0), [d, e] = s2w(VW, VH), V = [a - off, b, d - off, e], sc = DPR * cam.z;
  c.save(); c.clip(joined(LAND_F, V), 'evenodd');
  for (const [id, st] of OVL) {
    const B = PBOX[id]; if (B[2] < V[0] || B[0] > V[2] || B[3] < V[1] || B[1] > V[3]) continue;
    if (typeof st === 'string') c.fillStyle = st; else { const p = c.createPattern(st, 'repeat'); p.setTransform(new DOMMatrix([1 / sc, 0, 0, 1 / sc, 0, 0])); c.fillStyle = p; }
    c.fill(PPATH[id], 'evenodd');
  }
  c.restore();
}
function markDirty(owners) { staticDirty = true; if (owners) ownersDirty = true; }
function setMapMode(m) { mapMode = m; painted.fill(''); TILES.clear(); ownersDirty = true; rebuildOverlay(); staticDirty = true; }

/* ================= CAMERA ================= */
const shake = { amp:0, t0:0, x:0, y:0 };
const w2s = (x, y) => [(nearX(x) - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2];
const s2w = (x, y) => [(x - VW / 2) / cam.z + cam.x, (y - VH / 2) / cam.z + cam.y];
// province id under a world point (wrapping), on land
function gridAt(wx, wy, grid = GRIDD) { const gx = gx2(Math.floor(wx / GS)), gy = Math.floor(wy / GS); if (gy < 0 || gy >= GH) return -1; return grid[gy * GW + gx]; }
function clampCam() {
  const minZ = Math.max(VW / WW * 1.02, VH / WH * 0.9);
  cam.z = clamp(cam.z, Math.max(0.12, minZ), 10);
  const hh = VH / 2 / cam.z;
  cam.y = clamp(cam.y, Math.min(hh - 80, WH / 2), Math.max(WH - hh + 80, WH / 2));
  if (!camAnim) cam.x = wrapX(cam.x);
}
let camAnim = null, drift = false;
function animTo(x, y, z, dur = 800) { camAnim = { x0:cam.x, y0:cam.y, z0:cam.z, x1:nearX(x), y1:y, z1:z || cam.z, t0:performance.now(), dur }; }
function centerOn(pid, z) { if (pid == null || pid < 0) return; animTo(PROV[pid].x, PROV[pid].y, z); }
function centerXY(x, y, z) { animTo(x, y, z); }
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = cv.clientWidth || innerWidth; VH = cv.clientHeight || innerHeight;
  cv.width = stat.width = Math.round(VW * DPR); cv.height = stat.height = Math.round(VH * DPR);
  clampCam(); staticDirty = true;
}
// the horizontal copies of the world that are on screen, as offsets for world-space drawing
function wrapOffsets() { const [x0] = s2w(0, 0), [x1] = s2w(VW, VH); const o = [0]; if (x0 < 0) o.push(-WW); if (x1 > WW) o.push(WW); return o; }

/* ================= DRAW ================= */
// camera shake only offsets the final composite, so the expensive static layer is never redrawn for it
function worldT(c, shaken, off = 0) { const sx = shaken ? shake.x : 0, sy = shaken ? shake.y : 0; c.setTransform(DPR * cam.z, 0, 0, DPR * cam.z, DPR * (VW / 2 - (cam.x - off) * cam.z + sx), DPR * (VH / 2 - cam.y * cam.z + sy)); }
let lastMode = 'fast';
function drawStatic(allowCache) {
  if (!G) return;
  if (ownersDirty) rebuildOwners();
  staticDirty = false;
  const c = sctx, z = cam.z;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = OCEAN; c.fillRect(0, 0, stat.width, stat.height);
  const missing = drawTiles(c, allowCache ? 14 : 5);
  lastMode = missing ? 'fast' : 'crisp';
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
  for (const off of wrapOffsets()) {
    worldT(c, false, off);
    if (seaOn) c.drawImage(overCv, 0, 0, WW, WH);
    drawOverlay(c, off);
    if (selPath) { c.strokeStyle = 'rgba(255,236,170,.95)'; c.lineWidth = 2.6 / z; c.lineJoin = 'round'; c.stroke(selPath); }
  }
  worldT(c);
  drawLabels(c, z);
  if (z < 1.3 && z > 0.18) { // sea names, faint
    c.font = `italic 600 ${z < 0.5 ? 26 : 16}px ${FONT_MAP}`; c.fillStyle = `rgba(205,228,238,${z < 0.5 ? 0.32 : 0.26})`; c.textAlign = 'center';
    for (const k in SEA) { const S = SEA[k]; c.fillText(S.n.toUpperCase(), nearX(S.x), S.y - (z < 0.5 ? 0 : 30)); }
  }
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (timelapseOwners) return;
  drawCities(c);
  drawCounters(c);
  drawFleets(c);
  drawConvoys(c);
}
function onScreen(x, y, m = 40) { return x > -m && y > -m && x < VW + m && y < VH + m; }
function drawCities(c) {
  const z = cam.z;
  c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (let i = 0; i < NP; i++) {
    const P = PROV[i], p = G.prov[i];
    if (z < 0.42 && P.vp < 10) continue;
    const [x, y] = w2s(P.x, P.y); if (!onScreen(x, y)) continue;
    const isCap = A(p.o) && nat(p.o).capital === i;
    if (isCap) star(c, x, y, z > 0.8 ? 6.5 : 5, '#1d150b', '#f2d27e');
    else if (P.vp >= 4) { c.beginPath(); c.arc(x, y, 3.4, 0, 7); c.fillStyle = '#efe3c4'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#1d150b'; c.stroke(); }
    else if (z > 0.75) { c.beginPath(); c.arc(x, y, 1.9, 0, 7); c.fillStyle = '#2a1e10'; c.fill(); }
    const show = isCap ? z > 0.5 : P.vp >= 5 ? z > 0.85 : P.vp >= 2 ? z > 1.4 : z > 2.1;
    if (show) { c.font = `${isCap ? 700 : 600} ${isCap ? 14 : 12.5}px ${FONT_MAP}`; c.lineWidth = 3; c.strokeStyle = 'rgba(240,230,205,.85)'; c.strokeText(P.name, x + 7, y - 1); c.fillStyle = '#21170b'; c.fillText(P.name, x + 7, y - 1); }
    if (z > 1.25 && (P.oil || P.steel)) { const k = P.oil ? 'oil' : 'steel'; c.globalAlpha = 0.85; drawIcon(c, k, 9, x - 14, y - 15, P.oil ? '#1a1410' : '#3a3f45'); c.globalAlpha = 1; }
    if (p.res >= 40 && p.core !== p.o && z > 0.8) drawIcon(c, 'flame', 10, x - 15, y - 3, p.res >= 75 ? '#ff5a2a' : '#d98a3a');
    if (ME && nat(ME) && nat(ME).ops && nat(ME).ops.tg.includes(i)) drawIcon(c, 'target', 16, x - 8, y - 26, '#ffcf5a');
  }
}
function star(c, x, y, r, stroke, fill) {
  c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath();
  c.fillStyle = fill; c.fill(); c.lineWidth = 1.4; c.strokeStyle = stroke; c.stroke();
}
const darkCache = {};
const darkOf = col => darkCache[col] || (darkCache[col] = shade(col, -0.18));
function shade(hex, k) { const c = hexRGB(hex); return `rgb(${c.map(v => clamp(Math.round(v * (1 + k)), 0, 255)).join(',')})`; }
const sliding = new Map(); // province -> time until which its counter is hidden while units slide in
// unit counters: flag, unit symbols and strengths, a readiness bar underneath
function drawCounters(c) {
  const z = cam.z; if (z < 0.45) return;
  const now = performance.now();
  const compact = z < 0.85;
  c.font = `700 ${compact ? 10.5 : 11.5}px ${FONT_BODY}`; c.textBaseline = 'middle';
  for (let i = 0; i < NP; i++) {
    const p = G.prov[i], P = PROV[i];
    const [sx, sy] = w2s(P.x, P.y); if (!onScreen(sx, sy)) continue;
    const mine = p.o === ME, war = ME && W(ME, p.o), ally = ME && !mine && friendly(p.o, ME);
    const vis = !ME || visibleTo(ME, i);
    // airfields
    if ((p.air.ftr || p.air.bmb) && z > 0.8 && (vis || !ME)) {
      const ax = Math.round(sx - 8), ay = Math.round(sy - 27);
      c.fillStyle = 'rgba(12,18,22,.82)'; const txt = (p.air.ftr ? p.air.ftr : '') + (p.air.bmb ? (p.air.ftr ? '·' : '') + p.air.bmb : '');
      const tw = c.measureText(txt).width + 18; c.fillRect(ax - 2, ay - 1, tw, 13); c.strokeStyle = mine ? '#f0cd7f' : 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.strokeRect(ax - 1.5, ay - 0.5, tw - 1, 12);
      drawIcon(c, p.air.ftr ? 'ftr' : 'bmb', 10, ax, ay + 0.5, p.ad ? '#888' : '#cfe3ff'); c.fillStyle = '#dfeaf5'; c.textAlign = 'left'; c.fillText(txt, ax + 13, ay + 6);
    }
    const tot = unitsAt(p); if (!tot) continue;
    if (sliding.has(i) && sliding.get(i) > now) continue;
    if (compact && !mine && !war && !ally) continue;
    if (!vis && !war) continue;
    const col = natColor(p.o);
    const stroke = mine ? '#f0cd7f' : war ? '#ff8a6a' : ally ? '#9fd68f' : 'rgba(10,8,5,.8)';
    if (compact) {
      const txt = vis ? String(tot) : '?';
      const k = vis && p.u.arm * 2 > tot ? 'arm' : 'inf', ih = k === 'arm' ? 7 : 9, iw = iconSprite(k, ih).w;
      const w = Math.round(c.measureText(txt).width + iw + 22), x = Math.round(sx - w / 2), y = Math.round(sy + 5);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 1, y + 2, w, 13);
      c.fillStyle = darkOf(col); c.fillRect(x, y, w, 13);
      c.drawImage(flagSprite(p.o), x + 2, y + 2.5, 12, 8);
      c.lineWidth = 1; c.strokeStyle = stroke; c.strokeRect(x + 0.5, y + 0.5, w - 1, 12);
      drawIcon(c, k, ih, x + 16, y + (13 - ih) / 2);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(txt, x + 18 + iw, y + 7);
      continue;
    }
    // [flag] [soldier] n  [gun] n  [tank] n — drawn once into a sprite keyed by everything it shows
    const segs = [];
    const infN = p.u.inf + p.u.mtn + p.u.par;
    if (!vis) segs.push(['inf', '?']);
    else { if (infN) segs.push([p.u.mtn > p.u.inf ? 'mtn' : p.u.par > p.u.inf ? 'par' : 'inf', String(infN)]); if (p.u.art) segs.push(['art', String(p.u.art)]); if (p.u.arm) segs.push(['arm', String(p.u.arm)]); }
    const g = vis && G.gens.find(q => q.pid === i && q.tag === p.o);
    const d = { o:p.o, col, stroke, segs, rd:vis ? Math.round(readyAt(p) / tot * 8) / 8 : 1, sup:p.sup, dot:mine && readyAt(p) > 0, gen:g ? (g.lv >= 3 ? 2 : 1) : 0,
      supIc:vis && p.sup < 1 && (mine || ally) ? (p.sup ? 1 : 2) : 0, extra:z > 1.1 && vis ? [p.fort, p.dig, Math.floor(p.xp)] : null };
    const sp = counterSprite(d), x = Math.round(sx - sp.w / 2), y = Math.round(sy + 6);
    c.drawImage(sp.cv, x - CPAD, y - CPAD, sp.cv.width / DPR, sp.cv.height / DPR);
  }
}
// counter sprites: padding around the box leaves room for the general's star, the supply icon and the fort pips
const CPAD = 7, CSPR = new Map();
function counterSprite(d) {
  const key = JSON.stringify(d) + DPR + natColor(d.o);
  let s = CSPR.get(key); if (s) return s;
  const m = sctx; m.font = `700 11.5px ${FONT_BODY}`;
  const IH = { inf:12, mtn:10, par:12, art:9, arm:9 };
  let w = 22; for (const [k, t] of d.segs) w += iconSprite(k, IH[k]).w + 3 + m.measureText(t).width + 6;
  w = Math.round(w); const h = 17;
  const cv2 = mkCanvas(Math.ceil((w + CPAD * 2 + 10) * DPR), Math.ceil((h + CPAD * 2 + 8) * DPR)), c = cv2.getContext('2d');
  c.scale(DPR, DPR); c.translate(CPAD, CPAD); c.font = m.font; c.textBaseline = 'middle';
  const x = 0, y = 0;
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 1, y + 2, w, h + 3);
  c.fillStyle = darkOf(d.col); c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x, y, w, 1);
  c.drawImage(flagSprite(d.o), x + 3, y + 3, 16, 11);
  c.lineWidth = 1; c.strokeStyle = d.stroke; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // readiness and supply, like an organisation bar
  c.fillStyle = 'rgba(10,10,10,.85)'; c.fillRect(x, y + h, w, 3);
  c.fillStyle = d.sup >= 1 ? '#7fc66a' : d.sup > 0.5 ? '#d8c25a' : '#e0663a'; c.fillRect(x + 1, y + h + 0.5, Math.max(2, (w - 2) * (0.35 + 0.65 * d.rd)), 2);
  let cx2 = x + 22; c.textAlign = 'left';
  for (const [k, t] of d.segs) { cx2 += drawIcon(c, k, IH[k], cx2, y + (h - IH[k]) / 2) + 3; c.fillStyle = '#fff'; c.fillText(t, cx2, y + 9); cx2 += c.measureText(t).width + 6; }
  if (d.dot) { c.beginPath(); c.arc(x + w, y, 3.4, 0, 7); c.fillStyle = '#f0cd7f'; c.fill(); c.strokeStyle = '#1b1407'; c.stroke(); }
  if (d.gen) star(c, x, y, 5, '#1b1407', d.gen === 2 ? '#fff4c2' : '#f0cd7f');
  if (d.supIc) drawIcon(c, 'sup', 8, x + w + 3, y + 5, d.supIc === 1 ? '#f0b050' : '#ff5a3a');
  if (d.extra) {
    const [fort, dig, xp] = d.extra; let bx = x + 2;
    if (fort > 0) { c.fillStyle = '#21170b'; for (let k = 0; k < fort; k++) { c.fillRect(bx, y + h + 5, 4, 3); bx += 5; } bx += 2; }
    if (dig > 0) { c.fillStyle = '#5a4a2a'; for (let k = 0; k < dig; k++) { c.fillRect(bx, y + h + 6, 3, 2); bx += 4; } bx += 2; }
    for (let k = 0; k < xp; k++) { star(c, bx + 3, y + h + 7, 2.6, 'rgba(0,0,0,.6)', '#f0cd7f'); bx += 6; }
  }
  s = { cv:cv2, w };
  if (CSPR.size > 800) CSPR.clear();
  CSPR.set(key, s); return s;
}
// fleets sit at the sea-zone markers
function fleetBoxes() {
  const out = [];
  for (const z in SEA) {
    const list = Object.keys(G.fleet[z]).filter(t => { const f = G.fleet[z][t]; return f && f.cap + f.sub > 0; });
    list.sort((a, b) => (b === ME) - (a === ME));
    list.forEach((t, k) => { const [x, y] = w2s(SEA[z].x, SEA[z].y + k * 17 / cam.z); out.push({ z, t, x, y, f:G.fleet[z][t] }); });
  }
  return out;
}
function drawFleets(c) {
  if (cam.z < 0.3) return;
  c.font = `700 11px ${FONT_BODY}`; c.textBaseline = 'middle'; c.textAlign = 'left';
  // targets for the selected fleet
  if (selFleet) for (const z of fleetTargetsSet) { const [x, y] = w2s(SEA[z].x, SEA[z].y); c.beginPath(); c.arc(x, y, 18, 0, 7); c.strokeStyle = 'rgba(140,200,240,.9)'; c.lineWidth = 2; c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]); }
  for (const b of fleetBoxes()) {
    const { z, t, x, y, f } = b; if (!onScreen(x, y)) continue;
    const mine = t === ME, war = ME && W(ME, t);
    const txt = (f.cap ? f.cap : '') + (f.sub ? (f.cap ? ' · ' : '') + f.sub + 's' : '');
    const w = Math.round(c.measureText(txt).width + 30), h = 16, bx = Math.round(x - w / 2), by = Math.round(y - h / 2);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(bx + 1, by + 2, w, h);
    c.fillStyle = darkOf(natColor(t)); c.fillRect(bx, by, w, h);
    c.drawImage(flagSprite(t), bx + 2, by + 3, 12, 8 * 1.25);
    drawIcon(c, f.cap ? 'cap' : 'sub', 9, bx + 15, by + 3.5, '#e7f2fa');
    c.fillStyle = '#fff'; c.fillText(txt, bx + 27, by + 8.5);
    c.lineWidth = selFleet && selFleet.z === z && mine ? 2 : 1; c.strokeStyle = mine ? '#f0cd7f' : war ? '#ff8a6a' : 'rgba(150,200,230,.5)'; c.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
    if (mine && fleetReady(f)) { c.beginPath(); c.arc(bx + w, by, 3.2, 0, 7); c.fillStyle = f.mv ? '#b89a5a' : '#f0cd7f'; c.fill(); }
    b.w = w; b.h = h; b.bx = bx; b.by = by;
  }
}
function fleetAt(sx, sy) {
  const r = cv.getBoundingClientRect(); sx -= r.left; sy -= r.top;
  for (const b of fleetBoxes()) { const w = 60, h = 16; if (Math.abs(sx - b.x) < w / 2 + 4 && Math.abs(sy - b.y) < h / 2 + 3) return b; }
  return null;
}
// the sea zone under the cursor: its water, or (near a coast) the closest fleet marker
function zoneAt(sx, sy) {
  const r = cv.getBoundingClientRect(); sx -= r.left; sy -= r.top;
  const [wx, wy] = s2w(sx, sy), v = gridAt(wx, wy, GRID);
  if (v <= -2) return SEA_IDS[-2 - v];
  for (const z in SEA) { const [x, y] = w2s(SEA[z].x, SEA[z].y); if (Math.hypot(sx - x, sy - y) < 28) return z; }
  return null;
}
// small whole-world picture for the minimap
const miniCv = mkCanvas(360, Math.round(360 * WH / WW));
let miniVer = -1;
function miniSource() {
  if (miniVer === worldVersion) return miniCv;
  const m = miniCv.getContext('2d'); m.imageSmoothingEnabled = true; m.imageSmoothingQuality = 'high';
  m.drawImage(oceanCv, 0, 0, miniCv.width, miniCv.height); m.drawImage(polCv, 0, 0, miniCv.width, miniCv.height);
  m.save(); m.scale(miniCv.width / WW, miniCv.height / WH);
  for (let i = 0; i < NP; i++) { m.fillStyle = rgba(natColor(ownerOf(i)), 0.75); m.fill(PPATH[i], 'evenodd'); }
  m.restore();
  miniVer = worldVersion; return miniCv;
}
