'use strict';
/* ================= RENDER =================
   Everything static is baked once; ownership is painted into a low-res raster incrementally (only provinces
   that changed), and a full-world composite is rebuilt only when the map changes. While the camera moves we
   blit that composite; once it rests at high zoom, one crisp vector pass replaces it. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let ME = null;            // the nation this screen belongs to (null = spectator)
const cv = $('#map'), ctx = cv.getContext('2d');
const stat = document.createElement('canvas'), sctx = stat.getContext('2d');
let VW = 1, VH = 1, DPR = 1;
const cam = { x:WW * 0.47, y:WH * 0.42, z:1 };
let staticDirty = true, ownersDirty = true, busy = false;
let sel = null;               // {id, amt, multi:Set}
let selFleet = null;          // {z}
let targets = new Map();      // id -> kind
let fleetTargetsSet = new Set();
let mapMode = 'pol';          // pol | sup | res
let pickMode = null;          // {kind:'card'|'raid'|'ops'|'spy', ...} — choosing a target on the map
const PAPER = [233, 222, 191];
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const FONT_MAP = "'Cormorant SC',Georgia,serif", FONT_BODY = "'Barlow Semi Condensed','Arial Narrow',sans-serif", FONT_DISP = "'Big Shoulders Stencil Display',Impact,sans-serif";
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function pathFrom(rings, close) { const p = new Path2D(); for (const r of rings) { p.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); if (close) p.closePath(); } return p; }
const landPath = pathFrom(MAP.land, true);
const coastPath = pathFrom(MAP.land.filter(r => !(r.length === 8 && r[0] === -40)), true);
const lakePath = pathFrom(MAP.lakes, true);
const gratPath = pathFrom(MAP.grat, false);
const addLine = (P, pts) => { P.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) P.lineTo(pts[i], pts[i + 1]); };

// dilated id grid for rendering & picking
const GRIDD = new Int16Array(GRID);
for (let pass = 0; pass < 3; pass++) {
  const src = new Int16Array(GRIDD);
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const i = y * GW + x; if (src[i] >= 0) continue;
    const v = src[i - 1] >= 0 ? src[i - 1] : src[i + 1] >= 0 ? src[i + 1] : src[i - GW] >= 0 ? src[i - GW] : src[i + GW];
    if (v >= 0) GRIDD[i] = v;
  }
}
// horizontal pixel runs per province: [y, x0, x1, ...]
const RUNS = [];
{
  const tmp = Array.from({ length:NP }, () => []);
  for (let y = 0; y < GH; y++) { let x = 0; while (x < GW) { const id = GRIDD[y * GW + x]; if (id < 0) { x++; continue; } let x1 = x; while (x1 + 1 < GW && GRIDD[y * GW + x1 + 1] === id) x1++; tmp[id].push(y, x, x1); x = x1 + 1; } }
  for (let i = 0; i < NP; i++) RUNS.push(Int32Array.from(tmp[i]));
}
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) & 0xffff) / 0xffff; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
// relief shading (baked once)
const SHADE = new Float32Array(GW * GH);
{
  const AMP = { m:1, h:0.42, f:0.16, t:0.2, u:0.06, s:0.05, p:0.08, d:0.22 };
  const amp = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) { const id = GRIDD[i]; amp[i] = id >= 0 ? AMP[PROV[id].ter] : 0.1; }
  const blur = (a, r) => {
    const t = new Float32Array(a.length);
    for (let y = 0; y < GH; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * GW + clamp(x, 0, GW - 1)]; for (let x = 0; x < GW; x++) { t[y * GW + x] = s / (2 * r + 1); s += a[y * GW + Math.min(GW - 1, x + r + 1)] - a[y * GW + Math.max(0, x - r)]; } }
    for (let x = 0; x < GW; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[clamp(y, 0, GH - 1) * GW + x]; for (let y = 0; y < GH; y++) { a[y * GW + x] = s / (2 * r + 1); s += t[Math.min(GH - 1, y + r + 1) * GW + x] - t[Math.max(0, y - r) * GW + x]; } }
  };
  blur(amp, 6); blur(amp, 6);
  const h = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const i = y * GW + x; const a = amp[i]; if (a < 0.01) continue; let n = 0, f = 1 / 26, w = 1, ws = 0; for (let o = 0; o < 3; o++) { const r = vnoise(x * f, y * f); n += (1 - Math.abs(2 * r - 1)) * w; ws += w; f *= 2.1; w *= 0.5; } h[i] = a * n / ws; }
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) { const i = y * GW + x; SHADE[i] = clamp((h[i - GW - 1] - h[i + GW + 1]) * 3.2 + (hash(x, y) - 0.5) * 0.03, -0.32, 0.3); }
}
// ocean bathymetry (baked once)
const oceanCv = mkCanvas(GW, GH);
{
  const dist = new Uint8Array(GW * GH).fill(255); const q = new Int32Array(GW * GH); let qh = 0, qt = 0;
  const tc = mkCanvas(GW, GH).getContext('2d');
  tc.scale(1 / GS, 1 / GS); tc.fillStyle = '#fff'; tc.fill(landPath, 'evenodd');
  const ld = tc.getImageData(0, 0, GW, GH).data;
  for (let i = 0; i < GW * GH; i++) if (GRID[i] >= 0 || ld[i * 4] > 128) { dist[i] = 0; q[qt++] = i; }
  while (qh < qt) { const i = q[qh++], d = dist[i]; if (d >= 90) continue; const x = i % GW;
    if (x > 0 && dist[i - 1] > d + 1) { dist[i - 1] = d + 1; q[qt++] = i - 1; } if (x < GW - 1 && dist[i + 1] > d + 1) { dist[i + 1] = d + 1; q[qt++] = i + 1; }
    if (i >= GW && dist[i - GW] > d + 1) { dist[i - GW] = d + 1; q[qt++] = i - GW; } if (i + GW < GW * GH && dist[i + GW] > d + 1) { dist[i + GW] = d + 1; q[qt++] = i + GW; } }
  const oc = oceanCv.getContext('2d'); const img = oc.createImageData(GW, GH); const D = img.data;
  const shallow = [64, 118, 138], mid = [33, 75, 99], deep = [16, 40, 60];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x, d = dist[i]; const t = Math.min(1, Math.pow(d / 70, 0.55));
    const c = t < 0.4 ? shallow.map((v, k) => v + (mid[k] - v) * t / 0.4) : mid.map((v, k) => v + (deep[k] - v) * (t - 0.4) / 0.6);
    const nz = (vnoise(x / 18, y / 18) - 0.5) * 14 + (hash(x, y) - 0.5) * 4;
    let k = 1; if (d === 7 || d === 19 || d === 38) k = 0.86; if (d > 0 && d < 3) k = 1.12;
    D[i * 4] = clamp(c[0] * k + nz, 0, 255); D[i * 4 + 1] = clamp(c[1] * k + nz, 0, 255); D[i * 4 + 2] = clamp(c[2] * k + nz * 1.2, 0, 255); D[i * 4 + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
}
const paperCv = mkCanvas(256, 256);
{ const pc = paperCv.getContext('2d'); const img = pc.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const n = vnoise(x / 9, y / 9) * 0.5 + vnoise(x / 2.5, y / 2.5) * 0.3 + Math.random() * 0.2; const v = 200 + n * 55; const i = (y * 256 + x) * 4; img.data[i] = v; img.data[i + 1] = v * 0.96; img.data[i + 2] = v * 0.86; img.data[i + 3] = 255; } pc.putImageData(img, 0, 0); }
// terrain glyphs
const DECOR = new Path2D();
PROV.forEach((p, i) => {
  const L = MAP.decor[i], P = DECOR;
  for (let k = 0; k < L.length; k += 2) {
    const x = L[k], y = L[k + 1], j = hash(x, y);
    if (p.ter === 'm') { const s = 7 + j * 4; P.moveTo(x - s, y + s * 0.5); P.lineTo(x - s * 0.15, y - s * 0.7); P.lineTo(x + s * 0.35, y + s * 0.05); P.lineTo(x + s * 0.6, y - s * 0.3); P.lineTo(x + s * 1.1, y + s * 0.5); }
    else if (p.ter === 'h') { P.moveTo(x - 7, y + 2); P.quadraticCurveTo(x - 2, y - 5, x + 3, y + 2); P.moveTo(x + 1, y + 1); P.quadraticCurveTo(x + 5, y - 3, x + 9, y + 2); }
    else if (p.ter === 'f') { for (const [dx, dy] of [[0, 0], [6, 3], [-5, 4]]) { P.moveTo(x + dx + 2.8, y + dy - 2); P.arc(x + dx, y + dy - 2, 2.8, 0, Math.PI * 2); P.moveTo(x + dx, y + dy + 0.8); P.lineTo(x + dx, y + dy + 3.5); } }
    else if (p.ter === 'd') { P.moveTo(x - 8, y); P.quadraticCurveTo(x - 4, y - 3.5, x, y); P.moveTo(x + 2, y + 4); P.quadraticCurveTo(x + 6, y + 0.5, x + 10, y + 4); }
    else if (p.ter === 's') { for (const dx of [-5, 0, 5]) { P.moveTo(x + dx - 2.5, y + 2); P.lineTo(x + dx + 2.5, y + 2); P.moveTo(x + dx, y + 2); P.lineTo(x + dx, y - 2); } }
    else if (p.ter === 't') { P.moveTo(x - 6, y); P.lineTo(x - 2, y - 2); P.lineTo(x + 2, y); P.lineTo(x + 6, y - 2); }
  }
});
// ownership raster (grid resolution), painted per province
const ownerCv = mkCanvas(GW, GH), ownerCtx = ownerCv.getContext('2d'), ownerImg = ownerCtx.createImageData(GW, GH);
const painted = new Array(NP).fill('');
const overCv = mkCanvas(GW, GH), overCtx = overCv.getContext('2d');
const fogCv = mkCanvas(GW, GH), fogCtx = fogCv.getContext('2d');
const wxCv = mkCanvas(GW, GH), wxCtx = wxCv.getContext('2d');
const COARSE = matchMedia('(pointer: coarse)').matches;
const WS = COARSE ? 1.5 : 2;
const worldCv = mkCanvas(Math.round(WW * WS), Math.round(WH * WS)), worldCtx = worldCv.getContext('2d');
const world1 = mkCanvas(WW, WH), world1Ctx = world1.getContext('2d');
let innerPath = new Path2D(), natPath = new Path2D(), frontMine = new Path2D(), frontOther = new Path2D(), hasFront = false, selPath = null, playerPath = new Path2D();
let labels = [], worldVersion = 0, worldBuilt = false, fogKey = '', wxKey = '';
const provTint = id => 0.94 + hash(id, 7) * 0.12;
let paperPat = null;
let timelapseOwners = null; // when set, paint these owners instead of the live ones
const ownerOf = i => timelapseOwners ? timelapseOwners[i] : G.prov[i].o;
function paintOwners(force) {
  const cols = {};
  const col = t => cols[t] || (cols[t] = (() => { const c = hexRGB(natColor(t)); return c.map((v, k) => PAPER[k] + (v - PAPER[k]) * 0.62); })());
  const D = ownerImg.data;
  let bx0 = GW, by0 = GH, bx1 = -1, by1 = -1;
  for (let id = 0; id < NP; id++) {
    const p = G.prov[id], o = ownerOf(id);
    const occ = !timelapseOwners && p.core !== o && A(p.core);
    const key = o + natColor(o) + (occ ? p.core + natColor(p.core) : '') + (o === ME ? '*' : '');
    if (!force && painted[id] === key) continue;
    painted[id] = key;
    const tt = provTint(id), c0 = col(o), c = [c0[0] * tt, c0[1] * tt, c0[2] * tt], cc = occ ? col(p.core) : null;
    const R = RUNS[id];
    for (let k = 0; k < R.length; k += 3) {
      const y = R[k], xa = R[k + 1], xb = R[k + 2];
      if (y < by0) by0 = y; if (y > by1) by1 = y; if (xa < bx0) bx0 = xa; if (xb > bx1) bx1 = xb;
      for (let x = xa; x <= xb; x++) { const i = y * GW + x, o4 = i * 4, s = 1 + SHADE[i]; const cl = cc && ((x + y) >> 2) % 3 === 0 ? cc : c; D[o4] = cl[0] * s; D[o4 + 1] = cl[1] * s; D[o4 + 2] = cl[2] * s; D[o4 + 3] = 255; }
    }
  }
  if (bx1 < 0) return null;
  ownerCtx.putImageData(ownerImg, 0, 0, bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1);
  return [bx0 * GS, by0 * GS, (bx1 + 1) * GS, (by1 + 1) * GS];
}
function rebuildOwners() {
  ownersDirty = false;
  const box = paintOwners(!worldBuilt);
  innerPath = new Path2D(); natPath = new Path2D(); frontMine = new Path2D(); frontOther = new Path2D(); playerPath = new Path2D(); hasFront = false;
  for (const [a, b, pts] of MAP.borders) {
    const oa = ownerOf(a), ob = ownerOf(b);
    addLine(oa === ob ? innerPath : natPath, pts);
    if (!timelapseOwners && oa !== ob && W(oa, ob)) { hasFront = true; addLine(ME && (friendly(oa, ME) || friendly(ob, ME)) ? frontMine : frontOther, pts); }
    if (ME && (oa === ME) !== (ob === ME)) addLine(playerPath, pts);
  }
  computeLabels();
  rebuildFog(); rebuildWeather();
  if (!worldBuilt) buildWorld(null);
  else if (box) buildWorld([box[0] - 24, box[1] - 24, box[2] + 24, box[3] + 24]);
}
function paintMap(c, rect) {
  c.save();
  if (rect) { c.beginPath(); c.rect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]); c.clip(); }
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(oceanCv, 0, 0, WW, WH);
  c.strokeStyle = 'rgba(190,220,235,.09)'; c.lineWidth = 0.8; c.stroke(gratPath);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(160,205,215,.10)'; c.lineWidth = 18; c.stroke(coastPath);
  c.strokeStyle = 'rgba(170,215,220,.12)'; c.lineWidth = 8; c.stroke(coastPath);
  c.strokeStyle = 'rgba(200,230,230,.16)'; c.lineWidth = 3; c.stroke(coastPath);
  c.fillStyle = 'rgb(222,209,174)'; c.fill(landPath, 'evenodd');
  c.save(); c.clip(landPath, 'evenodd');
  c.drawImage(ownerCv, 0, 0, WW, WH);
  if (!paperPat) paperPat = c.createPattern(paperCv, 'repeat');
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.38; c.fillStyle = paperPat;
  if (rect) c.fillRect(rect[0], rect[1], rect[2] - rect[0], rect[3] - rect[1]); else c.fillRect(0, 0, WW, WH);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.lineWidth = 0.7; c.strokeStyle = 'rgba(48,34,18,.3)'; c.stroke(DECOR);
  c.restore();
  c.fillStyle = 'rgba(44,96,122,.95)'; c.fill(lakePath, 'evenodd');
  strokeLines(c);
  c.restore();
}
function strokeLines(c) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(48,34,20,.30)'; c.lineWidth = 0.6; c.stroke(innerPath);
  c.strokeStyle = 'rgba(250,240,215,.35)'; c.lineWidth = 2.6; c.stroke(natPath);
  c.strokeStyle = 'rgba(32,22,12,.85)'; c.lineWidth = 1.25; c.stroke(natPath);
  c.strokeStyle = 'rgba(42,30,18,.8)'; c.lineWidth = 0.9; c.stroke(coastPath);
  c.strokeStyle = 'rgba(42,30,18,.55)'; c.lineWidth = 0.6; c.stroke(lakePath);
  c.strokeStyle = 'rgba(236,196,114,.65)'; c.lineWidth = 1.7; c.setLineDash([4.5, 3]); c.stroke(playerPath); c.setLineDash([]);
}
function buildWorld(rect) {
  const c = worldCtx;
  c.setTransform(WS, 0, 0, WS, 0, 0);
  if (rect) rect = [Math.max(0, rect[0]), Math.max(0, rect[1]), Math.min(WW, rect[2]), Math.min(WH, rect[3])];
  paintMap(c, rect);
  const R = rect || [0, 0, WW, WH];
  world1Ctx.imageSmoothingEnabled = true; world1Ctx.imageSmoothingQuality = 'high';
  world1Ctx.drawImage(worldCv, R[0] * WS, R[1] * WS, (R[2] - R[0]) * WS, (R[3] - R[1]) * WS, R[0], R[1], R[2] - R[0], R[3] - R[1]);
  worldBuilt = true; worldVersion++;
}
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
      if (C !== home && !(C.area >= 1500 && C.area >= home.area * 0.5)) continue;
      const { area, comp } = C;
      let sx = 0, sy = 0; for (const k of comp) { sx += PROV[k].cx * PROV[k].area; sy += PROV[k].cy * PROV[k].area; }
      let x = sx / area, y = sy / area;
      const gi = Math.round(y / GS) * GW + Math.round(x / GS);
      if (!(GRID[gi] >= 0 && ownerOf(GRID[gi]) === t)) { const b = comp.reduce((b, k) => PROV[k].area > PROV[b].area ? k : b, comp[0]); x = PROV[b].cx; y = PROV[b].cy; }
      const nm = G.nat[t].name.toUpperCase();
      labels.push({ t, x, y, nm, fs:clamp(Math.sqrt(area) * GS * 0.95 / (nm.length * 0.78), 9, C === home ? 64 : 40) });
    }
  }
}
/* fog of war: provinces you cannot see are hatched over */
function rebuildFog() {
  if (!G) return;
  const vis = PROV.map((p, i) => !ME || timelapseOwners ? 1 : visibleTo(ME, i) ? 1 : 0).join('');
  if (vis === fogKey) return; fogKey = vis;
  fogCtx.clearRect(0, 0, GW, GH);
  if (!ME || timelapseOwners) return;
  const c = mkCanvas(8, 8), x = c.getContext('2d');
  x.fillStyle = 'rgba(20,24,28,.11)'; x.fillRect(0, 0, 8, 8); x.strokeStyle = 'rgba(20,24,28,.17)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 8); x.lineTo(8, 0); x.stroke();
  fogCtx.fillStyle = fogCtx.createPattern(c, 'repeat');
  for (let i = 0; i < NP; i++) if (vis[i] === '0') { const R = RUNS[i]; for (let k = 0; k < R.length; k += 3) fogCtx.fillRect(R[k + 1], R[k], R[k + 2] - R[k + 1] + 1, 1); }
}
/* weather: snow on cold provinces in winter, mud in spring and autumn */
function rebuildWeather() {
  if (!G) return;
  const key = G.m + (timelapseOwners ? 'x' : '');
  if (key === wxKey) return; wxKey = key;
  wxCtx.clearRect(0, 0, GW, GH);
  if (timelapseOwners) return;
  const snow = isWinter(), mud = isMud();
  if (!snow && !mud) return;
  for (let i = 0; i < NP; i++) {
    const P = PROV[i]; let col = null;
    if (snow && P.cold) col = 'rgba(245,250,255,.34)'; else if (mud && P.muddy) col = 'rgba(96,70,40,.16)';
    if (!col) continue; wxCtx.fillStyle = col; const R = RUNS[i]; for (let k = 0; k < R.length; k += 3) wxCtx.fillRect(R[k + 1], R[k], R[k + 2] - R[k + 1] + 1, 1);
  }
}
// selection/target overlay painted with striped patterns, run by run
const OVPAT = {};
function stripePat(r, g, b, a) {
  const c = mkCanvas(6, 6), x = c.getContext('2d');
  x.fillStyle = `rgba(${r},${g},${b},${a})`; x.fillRect(0, 0, 6, 6);
  x.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, a * 1.7)})`; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(-1, 7); x.lineTo(7, -1); x.moveTo(5, 7); x.lineTo(7, 5); x.moveTo(-1, 1); x.lineTo(1, -1); x.stroke();
  return overCtx.createPattern(c, 'repeat');
}
function overlayPats() {
  if (OVPAT.sel) return OVPAT;
  Object.assign(OVPAT, { sel:stripePat(255, 240, 200, 0.38), move:stripePat(110, 205, 95, 0.6), attack:stripePat(225, 70, 40, 0.58), naval:stripePat(90, 166, 214, 0.6), land:stripePat(90, 166, 214, 0.6), para:stripePat(190, 120, 230, 0.6), hover:stripePat(255, 236, 170, 0.5), pick:stripePat(255, 200, 80, 0.55) });
  return OVPAT;
}
let hoverNat = null, overlayOn = false;
function fillProv(id, pat) { const R = RUNS[id]; overCtx.fillStyle = pat; for (let k = 0; k < R.length; k += 3) overCtx.fillRect(R[k + 1], R[k], R[k + 2] - R[k + 1] + 1, 1); }
function fillProvSolid(id, col) { overCtx.fillStyle = col; const R = RUNS[id]; for (let k = 0; k < R.length; k += 3) overCtx.fillRect(R[k + 1], R[k], R[k + 2] - R[k + 1] + 1, 1); }
function rebuildOverlay() {
  const P = overlayPats();
  overCtx.clearRect(0, 0, GW, GH);
  overlayOn = !!(sel || hoverNat || mapMode !== 'pol' || pickMode);
  if (!G) return;
  if (mapMode === 'sup') for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (ME && !friendly(p.o, ME)) continue; const s = p.sup; fillProvSolid(i, s >= 1 ? 'rgba(90,170,80,.45)' : s >= 0.75 ? 'rgba(190,190,70,.5)' : s > 0.4 ? 'rgba(220,140,50,.55)' : s > 0 ? 'rgba(220,90,40,.6)' : 'rgba(200,30,30,.7)'); }
  if (mapMode === 'res') for (let i = 0; i < NP; i++) { const p = G.prov[i]; if (p.core === p.o) continue; fillProvSolid(i, `rgba(210,60,30,${0.12 + p.res / 140})`); }
  if (hoverNat) for (let i = 0; i < NP; i++) if (G.prov[i].o === hoverNat) fillProv(i, P.hover);
  if (pickMode) for (const id of pickMode.ids || []) fillProv(id, P.pick);
  if (sel) { fillProv(sel.id, P.sel); if (sel.multi) for (const id of sel.multi) fillProv(id, P.sel); for (const [id, k] of targets) fillProv(id, P[k]); }
  selPath = null;
  if (sel) { selPath = new Path2D(); const S = sel.multi ? new Set([sel.id, ...sel.multi]) : new Set([sel.id]); for (const [a, b, pts] of MAP.borders) if (S.has(a) !== S.has(b)) addLine(selPath, pts); }
  staticDirty = true;
}
function markDirty(owners) { staticDirty = true; if (owners) ownersDirty = true; }

/* ================= CAMERA ================= */
const shake = { amp:0, t0:0, x:0, y:0 };
const w2s = (x, y) => [(x - cam.x) * cam.z + VW / 2, (y - cam.y) * cam.z + VH / 2];
const s2w = (x, y) => [(x - VW / 2) / cam.z + cam.x, (y - VH / 2) / cam.z + cam.y];
function clampCam() {
  const minZ = Math.max(VW / WW, VH / WH) * 0.9;
  cam.z = clamp(cam.z, Math.max(0.35, minZ), 4.5);
  const hw = VW / 2 / cam.z, hh = VH / 2 / cam.z;
  cam.x = clamp(cam.x, Math.min(hw - 60, WW / 2), Math.max(WW - hw + 60, WW / 2));
  cam.y = clamp(cam.y, Math.min(hh - 60, WH / 2), Math.max(WH - hh + 60, WH / 2));
}
let camAnim = null, drift = false;
function centerOn(pid, z) { if (pid == null || pid < 0) return; camAnim = { x0:cam.x, y0:cam.y, z0:cam.z, x1:PROV[pid].x, y1:PROV[pid].y, z1:z || cam.z, t0:performance.now(), dur:800 }; }
function centerXY(x, y, z) { camAnim = { x0:cam.x, y0:cam.y, z0:cam.z, x1:x, y1:y, z1:z || cam.z, t0:performance.now(), dur:800 }; }
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = cv.clientWidth || innerWidth; VH = cv.clientHeight || innerHeight;
  cv.width = stat.width = Math.round(VW * DPR); cv.height = stat.height = Math.round(VH * DPR);
  clampCam(); staticDirty = true;
}

/* ================= DRAW ================= */
// camera shake only offsets the final composite, so the expensive static layer is never redrawn for it
function worldT(c, shaken) { const sx = shaken ? shake.x : 0, sy = shaken ? shake.y : 0; c.setTransform(DPR * cam.z, 0, 0, DPR * cam.z, DPR * (VW / 2 - cam.x * cam.z + sx), DPR * (VH / 2 - cam.y * cam.z + sy)); }
const viewCv = mkCanvas(1, 1), viewCtx = viewCv.getContext('2d');
let viewInfo = null;
const VIEW_MARGIN = 0.35;
function needsViewCache() { return cam.z * DPR > WS * 1.08; }
function viewCovers() {
  if (!viewInfo || viewInfo.z !== cam.z || viewInfo.ver !== worldVersion) return false;
  const [x0, y0] = s2w(0, 0), [x1, y1] = s2w(VW, VH);
  return x0 >= viewInfo.x0 && y0 >= viewInfo.y0 && x1 <= viewInfo.x0 + viewInfo.w / cam.z && y1 <= viewInfo.y0 + viewInfo.h / cam.z;
}
function renderViewCache() {
  const w = Math.round(VW * (1 + 2 * VIEW_MARGIN)), h = Math.round(VH * (1 + 2 * VIEW_MARGIN));
  if (viewCv.width !== Math.round(w * DPR) || viewCv.height !== Math.round(h * DPR)) { viewCv.width = Math.round(w * DPR); viewCv.height = Math.round(h * DPR); }
  const [x0, y0] = s2w(-VW * VIEW_MARGIN, -VH * VIEW_MARGIN);
  const c = viewCtx, z = cam.z;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#10283b'; c.fillRect(0, 0, viewCv.width, viewCv.height);
  c.setTransform(DPR * z, 0, 0, DPR * z, -x0 * DPR * z, -y0 * DPR * z);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(worldCv, 0, 0, WW, WH);
  strokeLines(c);
  viewInfo = { x0, y0, z, w, h, ver:worldVersion };
}
let lastMode = 'fast';
function drawStatic(allowCache) {
  if (!G) return;
  if (ownersDirty) rebuildOwners();
  staticDirty = false;
  const c = sctx, z = cam.z;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#10283b'; c.fillRect(0, 0, stat.width, stat.height);
  c.imageSmoothingEnabled = true;
  if (needsViewCache() && allowCache && !viewCovers()) renderViewCache();
  if (needsViewCache() && viewCovers()) { const [sx, sy] = w2s(viewInfo.x0, viewInfo.y0); c.drawImage(viewCv, Math.round(sx * DPR), Math.round(sy * DPR)); lastMode = 'crisp'; }
  else { const ratio = z * DPR, small = ratio <= 1.05; c.imageSmoothingQuality = allowCache && ratio < 0.8 ? 'high' : 'low'; worldT(c); c.drawImage(small ? world1 : worldCv, 0, 0, WW, WH); lastMode = needsViewCache() || (!allowCache && ratio < 0.8) ? 'fast' : 'crisp'; }
  c.imageSmoothingQuality = 'low';
  worldT(c);
  c.save(); c.clip(landPath, 'evenodd'); c.drawImage(wxCv, 0, 0, WW, WH); c.drawImage(fogCv, 0, 0, WW, WH); c.restore();
  if (overlayOn) c.drawImage(overCv, 0, 0, WW, WH);
  if (selPath) { c.strokeStyle = 'rgba(255,236,170,.95)'; c.lineWidth = 2.6 / z; c.stroke(selPath); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const ls = 'letterSpacing' in c;
  for (const L of labels) {
    const sz = L.fs * z; if (sz < 8) continue;
    const a = clamp(1.4 - sz / 70, 0, 0.62); if (a <= 0.02) continue;
    c.font = `700 ${L.fs}px ${FONT_MAP}`; if (ls) c.letterSpacing = (L.fs * 0.28) + 'px';
    c.fillStyle = `rgba(36,24,12,${a})`; c.fillText(L.nm, L.x, L.y);
  }
  if (ls) c.letterSpacing = '0px';
  // sea zone names, faint, when zoomed out
  if (z < 1.3) { c.font = `italic 600 ${15}px ${FONT_MAP}`; c.fillStyle = 'rgba(200,225,235,.28)'; for (const k in SEA) { const S = SEA[k]; c.fillText(S.n.toUpperCase(), S.x, S.y - 30); } }
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (timelapseOwners) return;
  drawCities(c);
  drawCounters(c);
  drawFleets(c);
}
function onScreen(x, y, m = 40) { return x > -m && y > -m && x < VW + m && y < VH + m; }
function drawCities(c) {
  const z = cam.z;
  c.textAlign = 'left'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (let i = 0; i < NP; i++) {
    const P = PROV[i], p = G.prov[i]; const [x, y] = w2s(P.x, P.y); if (!onScreen(x, y)) continue;
    const isCap = A(p.o) && nat(p.o).capital === i;
    if (isCap) star(c, x, y, z > 0.8 ? 6.5 : 5, '#1d150b', '#f2d27e');
    else if (P.vp >= 4) { c.fillStyle = '#1d150b'; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = '#efe3c4'; c.fillRect(x - 1.6, y - 1.6, 3.2, 3.2); }
    else if (z > 0.75) { c.fillStyle = '#2a1e10'; c.fillRect(x - 1.6, y - 1.6, 3.2, 3.2); }
    const show = isCap ? z > 0.6 : P.vp >= 5 ? z > 0.95 : P.vp >= 2 ? z > 1.5 : z > 2.1;
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
      const w = Math.round(c.measureText(txt).width + iw + 9), x = Math.round(sx - w / 2), y = Math.round(sy + 5);
      c.fillStyle = darkOf(col); c.fillRect(x, y, w, 13);
      c.lineWidth = 1; c.strokeStyle = stroke; c.strokeRect(x + 0.5, y + 0.5, w - 1, 12);
      drawIcon(c, k, ih, x + 3, y + (13 - ih) / 2);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(txt, x + 5 + iw, y + 7);
      continue;
    }
    // [soldier] n  [gun] n  [tank] n
    const segs = [];
    const infN = p.u.inf + p.u.mtn + p.u.par;
    if (!vis) segs.push(['inf', '?']);
    else { if (infN) segs.push([p.u.mtn > p.u.inf ? 'mtn' : p.u.par > p.u.inf ? 'par' : 'inf', String(infN)]); if (p.u.art) segs.push(['art', String(p.u.art)]); if (p.u.arm) segs.push(['arm', String(p.u.arm)]); }
    const IH = { inf:12, mtn:10, par:12, art:9, arm:9 };
    let w = 6; for (const [k, t] of segs) w += iconSprite(k, IH[k]).w + 3 + c.measureText(t).width + 6;
    w = Math.round(w); const h = 17;
    const x = Math.round(sx - w / 2), y = Math.round(sy + 6);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 1, y + 2, w, h);
    c.fillStyle = darkOf(col); c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x, y, w, 1);
    c.lineWidth = 1; c.strokeStyle = stroke; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    let cx2 = x + 5; c.textAlign = 'left';
    for (const [k, t] of segs) { cx2 += drawIcon(c, k, IH[k], cx2, y + (h - IH[k]) / 2) + 3; c.fillStyle = '#fff'; c.fillText(t, cx2, y + 9); cx2 += c.measureText(t).width + 6; }
    if (mine && readyAt(p) > 0) { c.beginPath(); c.arc(x + w, y, 3.4, 0, 7); c.fillStyle = '#f0cd7f'; c.fill(); c.strokeStyle = '#1b1407'; c.stroke(); }
    const g = vis && G.gens.find(q => q.pid === i && q.tag === p.o);
    if (g) { star(c, x, y, 5, '#1b1407', g.lv >= 3 ? '#fff4c2' : '#f0cd7f'); }
    if (vis && p.sup < 1 && (mine || ally)) drawIcon(c, 'sup', 8, x + w + 3, y + 5, p.sup ? '#f0b050' : '#ff5a3a');
    if (z > 1.1 && vis) {
      let bx = x + 2;
      if (p.fort > 0) { c.fillStyle = '#21170b'; for (let k = 0; k < p.fort; k++) { c.fillRect(bx, y + h + 2, 4, 3); bx += 5; } bx += 2; }
      if (p.dig > 0) { c.fillStyle = '#5a4a2a'; for (let k = 0; k < p.dig; k++) { c.fillRect(bx, y + h + 3, 3, 2); bx += 4; } bx += 2; }
      if (p.xp >= 1) { for (let k = 0; k < Math.floor(p.xp); k++) { star(c, bx + 3, y + h + 4, 2.6, 'rgba(0,0,0,.6)', '#f0cd7f'); bx += 6; } }
    }
  }
}
// fleets sit at the sea-zone markers
const FLEET_SLOTS = {};
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
  if (cam.z < 0.42) return;
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
    if (mine && !f.mv) { c.beginPath(); c.arc(bx + w, by, 3.2, 0, 7); c.fillStyle = '#f0cd7f'; c.fill(); }
    b.w = w; b.h = h; b.bx = bx; b.by = by;
  }
}
function fleetAt(sx, sy) {
  const r = cv.getBoundingClientRect(); sx -= r.left; sy -= r.top;
  for (const b of fleetBoxes()) { c2: { const w = 60, h = 16; if (Math.abs(sx - b.x) < w / 2 + 4 && Math.abs(sy - b.y) < h / 2 + 3) return b; } }
  return null;
}
function zoneAt(sx, sy) {
  const r = cv.getBoundingClientRect(); sx -= r.left; sy -= r.top;
  for (const z in SEA) { const [x, y] = w2s(SEA[z].x, SEA[z].y); if (Math.hypot(sx - x, sy - y) < 28) return z; }
  return null;
}
