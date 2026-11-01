// Recovers the conic projection of the legacy Europe map (tools/worldmap/legacy_map.js) from its graticule:
// parallels are concentric circles, meridians are rays from their centre. Writes oldproj.json.
const fs = require('fs'), path = require('path');
const OLD = require(path.resolve(process.argv[2] || path.join(__dirname, 'legacy_map.js')));
const ptsOf = l => { const r = []; for (let i = 0; i < l.length; i += 2) r.push([l[i], l[i + 1]]); return r; };
// meridian lines: intersect them pairwise for the apex
const mer = OLD.grat.slice(0, 11).map(l => { const p = ptsOf(l); return [p[0], p[p.length - 1]]; });
let sx = 0, sy = 0, n = 0;
for (let i = 0; i < 11; i++) for (let j = i + 3; j < 11; j++) {
  const [[x1, y1], [x2, y2]] = mer[i], [[x3, y3], [x4, y4]] = mer[j];
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4), t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  sx += x1 + t * (x2 - x1); sy += y1 + t * (y2 - y1); n++;
}
const CX = sx / n, CY = sy / n;
const ang = ([x, y]) => Math.atan2(x - CX, y - CY);
const merAng = mer.map(([a, b]) => (ang(a) + ang(b)) / 2);
const LONS = merAng.map((_, i) => -30 + 10 * i);
const N = (merAng[10] - merAng[0]) / (LONS[10] - LONS[0]);           // radians of map angle per degree of longitude
const LON0 = LONS[0] - merAng[0] / N;
const radii = OLD.grat.slice(11).map(l => { const p = ptsOf(l); return p.reduce((s, q) => s + Math.hypot(q[0] - CX, q[1] - CY), 0) / p.length; });
const LATS = radii.map((_, i) => 20 + 10 * i);
// Lambert conformal: rho = F * tan(pi/4 - phi/2)^k ; fit k, F by log-linear least squares
const X = LATS.map(l => Math.log(Math.tan(Math.PI / 4 - l * Math.PI / 360))), Y = radii.map(Math.log);
const mx = X.reduce((a, b) => a + b) / 6, my = Y.reduce((a, b) => a + b) / 6;
const K = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / X.reduce((s, x) => s + (x - mx) ** 2, 0), F = Math.exp(my - K * mx);
const rho = lat => F * Math.pow(Math.tan(Math.PI / 4 - lat * Math.PI / 360), K);
const fwd = (lon, lat) => { const a = (lon - LON0) * N, r = rho(lat); return [CX + r * Math.sin(a), CY + r * Math.cos(a)]; };
const inv = (x, y) => { const r = Math.hypot(x - CX, y - CY), a = Math.atan2(x - CX, y - CY); return [LON0 + a / N, (Math.PI / 2 - 2 * Math.atan(Math.pow(r / F, 1 / K))) * 180 / Math.PI]; };
console.log({ CX, CY, N, LON0, K, F, radii: radii.map(r => r.toFixed(1)), fitRad: LATS.map(l => rho(l).toFixed(1)) });
let e = 0; OLD.grat.slice(11).forEach((l, i) => ptsOf(l).forEach(([x, y]) => { e = Math.max(e, Math.abs(inv(x, y)[1] - LATS[i])); })); console.log('max parallel err deg', e.toFixed(4));
for (const [nm, lon, lat] of [['Moscow', 37.62, 55.75], ['Cairo', 31.24, 30.04], ['London', -0.13, 51.5], ['Madrid', -3.7, 40.42], ['Berlin', 13.4, 52.52], ['Reykjavík', -21.9, 64.15], ['Baku', 49.87, 40.41], ['Gibraltar', -5.35, 36.14], ['Malta', 14.4, 35.9]]) {
  const p = OLD.prov.find(q => q[0] === nm); const [lo, la] = inv(p[1], p[2]); const f = fwd(lon, lat); console.log(nm.padEnd(10), 'est', lo.toFixed(2), la.toFixed(2), 'true', lon, lat, ' px off', (f[0] - p[1]).toFixed(1), (f[1] - p[2]).toFixed(1));
}
fs.writeFileSync(path.join(__dirname, 'oldproj.json'), JSON.stringify({ CX, CY, N, LON0, K, F }));
