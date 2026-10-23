'use strict';
/* ================= VISUAL EFFECTS ================= */
const FX = [], PARTS = [];
const MAX_PARTS = 520;
const SPR = {};
function glowSprite() {
  if (SPR.glow) return SPR.glow;
  const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.4, 'rgba(255,150,50,.65)'); g.addColorStop(1, 'rgba(255,90,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (SPR.glow = c);
}
function puffSprite(dark) {
  const k = dark ? 'pd' : 'pl'; if (SPR[k]) return SPR[k];
  const c = mkCanvas(48, 48), x = c.getContext('2d'), g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
  const col = dark ? '38,34,32' : '74,68,62';
  g.addColorStop(0, `rgba(${col},.9)`); g.addColorStop(0.6, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 48, 48); return (SPR[k] = c);
}
function cloudSprite() {
  if (SPR.cl) return SPR.cl;
  const c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,235,200,.95)'); g.addColorStop(0.55, 'rgba(210,160,120,.6)'); g.addColorStop(1, 'rgba(120,100,90,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (SPR.cl = c);
}
const now_ = () => performance.now();
function part(p) { if (PARTS.length < MAX_PARTS) PARTS.push(p); }
function addArrow(from, to, kind, delay = 0) { FX.push({ type:'arrow', from, to, kind, t0:now_() + delay, dur:650 }); }
function addFloat(pid, text, color, delay = 0, big) { FX.push({ type:'float', x:PROV[pid].x, y:PROV[pid].y, text, color, t0:now_() + delay, dur:big ? 2600 : 1700, big }); }
function addShake(amp, dur = 400) { shake.amp = Math.max(shake.amp, amp); shake.until = Math.max(shake.until || 0, now_() + dur); }
function burst(pid, big, delay = 0) {
  const t0 = now_() + delay, P = PROV[pid];
  const n = big ? 34 : 18;
  for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * (big ? 1.7 : 1); part({ x:P.x, y:P.y, vx:Math.cos(a) * s, vy:Math.sin(a) * s - 0.3, t0, life:500 + Math.random() * 500, kind:'spark' }); }
  for (let k = 0; k < (big ? 12 : 6); k++) { const a = Math.random() * Math.PI * 2, s = Math.random() * 0.35; part({ x:P.x + Math.cos(a) * 4, y:P.y + Math.sin(a) * 4, vx:Math.cos(a) * s, vy:Math.sin(a) * s - 0.18, t0:t0 + 80, life:1300 + Math.random() * 900, kind:'smoke', r0:4, r1:big ? 20 : 14 }); }
  for (let k = 0; k < (big ? 8 : 4); k++) { const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random(); part({ x:P.x, y:P.y, vx:Math.cos(a) * s, vy:Math.sin(a) * s - 0.9, g:0.0028, t0, life:700 + Math.random() * 400, kind:'debris' }); }
  FX.push({ type:'flash', x:P.x, y:P.y, t0, dur:420, big });
  FX.push({ type:'ring', x:P.x, y:P.y, t0, dur:big ? 700 : 450, r:big ? 46 : 28, col:'255,220,160' });
  setTimeout(() => addShake(big ? 6 : 2.5, big ? 450 : 250), Math.max(0, delay));
}
// gunfire around a battlefield: muzzle flashes and tracers from the attackers' side
function firefight(tid, fromId, dur, delay, heavy, light) {
  const t0 = now_() + delay, P = PROV[tid], F = fromId != null && fromId >= 0 ? PROV[fromId] : { x:P.x - 60, y:P.y - 40 };
  const ang = Math.atan2(P.y - F.y, P.x - F.x);
  for (let k = 0; k < (light ? 6 : heavy ? 22 : 12); k++) {
    const t = t0 + Math.random() * dur, side = Math.random() < 0.6;
    const ox = (Math.random() - 0.5) * 26, oy = (Math.random() - 0.5) * 26;
    const sx = P.x - Math.cos(ang) * (side ? 22 : -6) + ox, sy = P.y - Math.sin(ang) * (side ? 22 : -6) + oy;
    FX.push({ type:'tracer', x0:sx, y0:sy, x1:sx + Math.cos(ang + (side ? 0 : Math.PI)) * 22 + (Math.random() - 0.5) * 6, y1:sy + Math.sin(ang + (side ? 0 : Math.PI)) * 22 + (Math.random() - 0.5) * 6, t0:t, dur:160 });
    FX.push({ type:'muzzle', x:sx, y:sy, t0:t, dur:90 });
  }
}
// artillery: shells arc in and burst
function barrage(tid, fromId, n, delay) {
  const P = PROV[tid], F = fromId != null && fromId >= 0 ? PROV[fromId] : { x:P.x - 80, y:P.y - 60 };
  for (let k = 0; k < n; k++) {
    const t0 = now_() + delay + k * 90 + Math.random() * 60;
    const tx = P.x + (Math.random() - 0.5) * 34, ty = P.y + (Math.random() - 0.5) * 30;
    FX.push({ type:'shell', x0:F.x + (Math.random() - 0.5) * 10, y0:F.y, x1:tx, y1:ty, t0, dur:420 });
    FX.push({ type:'flash', x:tx, y:ty, t0:t0 + 420, dur:220, small:true });
    setTimeout(() => { for (let j = 0; j < 3; j++) part({ x:tx, y:ty, vx:(Math.random() - 0.5) * 0.4, vy:-0.15 - Math.random() * 0.2, t0:now_(), life:900 + Math.random() * 600, kind:'smoke', r0:2, r1:9 }); }, Math.max(0, t0 + 420 - now_()));
  }
}
function nearestAirbase(t, pid) {
  let best = -1, bd = 1e9;
  for (let i = 0; i < NP; i++) { const q = G.prov[i]; if (!friendly(q.o, t) || !(q.air.ftr || q.air.bmb)) continue; const d = dist(i, pid); if (d < bd && d <= AIR_RANGE * 1.3) { bd = d; best = i; } }
  return best;
}
function flyover(t, fromId, tid, kind, delay, count = 3) {
  const F = PROV[fromId], T = PROV[tid];
  for (let k = 0; k < count; k++) {
    const off = (k - (count - 1) / 2) * 12;
    const dx = T.x - F.x, dy = T.y - F.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    FX.push({ type:'plane', x0:F.x + nx * off, y0:F.y + ny * off, x1:T.x + nx * off + dx / L * 40, y1:T.y + ny * off + dy / L * 40, t0:now_() + delay + k * 70, dur:1100 + L * 1.2, kind, col:natColor(t), bombs:kind === 'bmb' ? { x:T.x, y:T.y } : null });
  }
}
function landingCraft(fromId, tid, delay) {
  const F = PROV[fromId] || null, T = PROV[tid];
  const fx = F ? F.x : T.x - 120, fy = F ? F.y : T.y - 90;
  for (let k = 0; k < 4; k++) FX.push({ type:'boat', x0:fx + (Math.random() - 0.5) * 30, y0:fy + (Math.random() - 0.5) * 30, x1:T.x + (Math.random() - 0.5) * 20, y1:T.y + (Math.random() - 0.5) * 20, t0:now_() + delay + k * 90, dur:1100 });
}
function rocketArc(fromXY, tid, delay) {
  const T = PROV[tid];
  FX.push({ type:'rocket', x0:fromXY[0], y0:fromXY[1], x1:T.x, y1:T.y, t0:now_() + delay, dur:1300 });
}
function atomic(tid, delay = 0) {
  const P = PROV[tid], t0 = now_() + delay;
  FX.push({ type:'nukeflash', t0, dur:1800 });
  for (let k = 0; k < 3; k++) FX.push({ type:'ring', x:P.x, y:P.y, t0:t0 + k * 180, dur:2200, r:150 + k * 60, col:'255,240,210', w:4 });
  // stem and cap of the mushroom cloud
  for (let k = 0; k < 60; k++) part({ x:P.x + (Math.random() - 0.5) * 8, y:P.y, vx:(Math.random() - 0.5) * 0.05, vy:-0.08 - Math.random() * 0.05, t0:t0 + 200 + k * 25, life:2600 + Math.random() * 1500, kind:'cloud', r0:5, r1:16, hot:1 });
  for (let k = 0; k < 70; k++) { const a = Math.random() * Math.PI * 2; part({ x:P.x + Math.cos(a) * 6, y:P.y - 70 + Math.sin(a) * 4, vx:Math.cos(a) * (0.03 + Math.random() * 0.06), vy:Math.sin(a) * 0.02 - 0.02, t0:t0 + 1200 + Math.random() * 500, life:3500 + Math.random() * 2000, kind:'cloud', r0:10, r1:30, hot:1 }); }
  setTimeout(() => addShake(16, 1400), Math.max(0, delay));
}
function captureFX(pid, oldOwner, newOwner, fromId, delay) {
  const P = PROV[pid], F = fromId != null && fromId >= 0 ? PROV[fromId] : P;
  const oc = hexRGB(natColor(oldOwner)).map((v, k) => Math.round(PAPER[k] + (v - PAPER[k]) * 0.62));
  FX.push({ type:'wipe', pid, col:oc, ox:F.x + (P.x - F.x) * 0.45, oy:F.y + (P.y - F.y) * 0.45, t0:now_() + delay, dur:900, R:Math.sqrt(P.area) * GS * 1.8 + 40 });
  FX.push({ type:'flag', pid, tag:newOwner, t0:now_() + delay + 350, dur:2600 });
}
function slideUnits(from, to, owner, kind, delay = 0) {
  if (from == null || from < 0) return;
  const k = kind || 'inf';
  FX.push({ type:'slide', from, to, owner, k, t0:now_() + delay, dur:620 });
  sliding.set(to, now_() + delay + 620);
}
function navalFX(z, delay = 0) {
  const S = SEA[z]; const t0 = now_() + delay;
  for (let k = 0; k < 18; k++) { const t = t0 + Math.random() * 1400, x = S.x + (Math.random() - 0.5) * 70, y = S.y + (Math.random() - 0.5) * 40; FX.push({ type:'muzzle', x, y, t0:t, dur:110 }); FX.push({ type:'splash', x:S.x + (Math.random() - 0.5) * 80, y:S.y + (Math.random() - 0.5) * 50, t0:t + 300, dur:600 }); }
}
function fireworks(n = 30) {
  for (let k = 0; k < n; k++) { const t0 = now_() + k * 140, x = Math.random() * VW, y = VH * (0.15 + Math.random() * 0.4), col = ['255,210,120', '255,120,90', '160,220,255', '200,255,170'][k % 4]; for (let j = 0; j < 28; j++) { const a = j / 28 * Math.PI * 2, s = 1.2 + Math.random(); part({ sx:x, sy:y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, g:0.002, t0, life:1100 + Math.random() * 400, kind:'spark2', col }); } }
}
function animBattle(r, delay = 0, light) {
  if (!r) return;
  const to = r.tid;
  if (r.rocket != null || r.bomb != null) {
    const src = r.a ? owned(r.a).sort((x, y) => dist(x, to) - dist(y, to))[0] : null;
    if (r.bomb != null) { atomic(to, delay); setTimeout(() => { SFX.boom(true); setTimeout(() => SFX.boom(true), 450); }, delay); addFloat(to, r.surrender ? 'Unconditional surrender' : `Atomic strike −${r.bomb}`, '#fff', delay + 900, true); return; }
    rocketArc(src != null ? [PROV[src].x, PROV[src].y] : [PROV[to].x - 200, PROV[to].y], to, delay);
    burst(to, true, delay + 1300); setTimeout(() => SFX.boom(true), delay + 1300);
    addFloat(to, `V-weapon −${r.rocket}`, '#ffb7a3', delay + 1500);
    return;
  }
  if (r.raid) { const from = r.from && r.from[0]; if (from != null && from >= 0) flyover(r.a, from, to, 'bmb', delay, 4); burst(to, false, delay + 1300); addFloat(to, r.raid.fac ? 'Factory destroyed' : 'Bombed', '#ffd08a', delay + 1500); setTimeout(() => SFX.boom(false), delay + 1300); return; }
  const kind = r.naval ? 'naval' : r.para ? 'para' : r.walk ? 'move' : 'attack';
  const main = r.from && r.from[0];
  for (const f of r.from || []) { if (f >= 0) addArrow(f, to, kind === 'para' ? 'naval' : kind, delay); else FX.push({ type:'arrow', from:null, fromXY:[PROV[to].x - 120, PROV[to].y - 90], to, kind:'naval', t0:now_() + delay, dur:900 }); }
  if (r.naval) landingCraft(main, to, delay);
  if (r.para && main >= 0) flyover(r.a, main, to, 'ftr', delay, 3);
  if (r.air && r.air.fa > 0 && !r.walk) { const ab = nearestAirbase(r.a, to); if (ab >= 0) flyover(r.a, ab, to, r.air.ba > 0 ? 'bmb' : 'ftr', delay, 3); }
  if (!r.walk) {
    const heavy = r.al + r.dl > 6;
    firefight(to, main, 900, delay + 250, heavy, light);
    if (r.au && r.au.art && !light) barrage(to, main, Math.min(8, 3 + r.au.art), delay + 150);
    burst(to, heavy, delay + 700); setTimeout(() => SFX.boom(heavy), delay + 700);
    setTimeout(() => SFX.gunfire && SFX.gunfire(), delay + 250);
  }
  if (r.win) {
    const k = r.au ? (r.au.arm > r.au.inf ? 'arm' : 'inf') : 'inf';
    if (main >= 0) slideUnits(main, to, r.a, k, delay + (r.walk ? 0 : 900));
    captureFX(to, r.d, r.liberated || r.a, main, delay + (r.walk ? 250 : 1100));
  }
  const txt = r.walk ? 'Occupied' : r.win ? (r.kessel ? `Encircled ${r.kessel}!` : r.liberated ? 'Liberated' : r.meeting ? 'Field victory' : 'Captured') : 'Repulsed';
  addFloat(to, txt, r.win ? '#f0cd7f' : '#ffb7a3', delay + 1150);
  if (!r.walk && (r.al || r.dl)) addFloat(to, `−${r.dl} / −${r.al}`, '#fff', delay + 1450);
  if (r.win && r.blitz) addFloat(to, 'BREAKTHROUGH', '#9fe08c', delay + 1750);
}
function animBattles(list) {
  const vis = list.filter(r => { const [x, y] = w2s(PROV[r.tid].x, PROV[r.tid].y); return onScreen(x, y, 0) || r.d === ME || r.a === ME; });
  vis.sort((a, b) => (b.d === ME || b.a === ME) - (a.d === ME || a.a === ME));
  vis.slice(0, 14).forEach((r, i) => animBattle(r, i * 220, !(r.d === ME || r.a === ME) && i > 3));
}

/* ---------- ambient: smoke over battlefields, burning cities, weather ---------- */
let lastAmbientSpawn = 0;
function ambientSpawn(now) {
  if (now - lastAmbientSpawn < 110 || !G || timelapseOwners || PARTS.length > 320) return;
  lastAmbientSpawn = now;
  const [x0, y0] = s2w(-40, -40), [x1, y1] = s2w(VW + 40, VH + 40);
  for (let i = 0; i < NP; i++) {
    const p = G.prov[i]; if (!p.smoke && !p.burn) continue;
    const P = PROV[i]; if (P.x < x0 || P.x > x1 || P.y < y0 || P.y > y1) continue;
    if (Math.random() < (p.burn ? 0.55 : 0.3)) part({ x:P.x + (Math.random() - 0.5) * 10, y:P.y + (Math.random() - 0.5) * 6, vx:0.02 + Math.random() * 0.04, vy:-0.05 - Math.random() * 0.05, t0:now, life:2600 + Math.random() * 1600, kind:'smoke', r0:2, r1:p.burn ? 13 : 9, dark:p.burn ? 1 : 0 });
    if (p.burn && Math.random() < 0.5) part({ x:P.x + (Math.random() - 0.5) * 8, y:P.y + (Math.random() - 0.5) * 5, vx:(Math.random() - 0.5) * 0.03, vy:-0.04 - Math.random() * 0.05, t0:now, life:700 + Math.random() * 500, kind:'ember' });
  }
}
const WX = Array.from({ length:170 }, () => ({ x:Math.random(), y:Math.random(), s:0.5 + Math.random() * 1.6, v:0.3 + Math.random() * 0.7 }));
function drawWeather(c, now, dt) {
  if (!G || timelapseOwners || drift) return;
  const snow = isWinter(), rain = isMud(); if (!snow && !rain) return;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.beginPath();
  for (const s of WX) {
    s.y += s.v * (rain ? 0.0009 : 0.00004 * 30) * dt; s.x += rain ? 0.00012 * dt : Math.sin(now / 1000 + s.v * 10) * 0.0003;
    if (s.y > 1) { s.y = 0; s.x = Math.random(); } if (s.x > 1) s.x = 0;
    const x = s.x * VW, y = s.y * VH;
    const [wx, wy] = s2w(x, y); const gx = Math.floor(wx / GS), gy = Math.floor(wy / GS);
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
    const id = GRIDD[gy * GW + gx]; if (id < 0) continue;
    if (snow && !PROV[id].cold) continue; if (!snow && !PROV[id].muddy) continue;
    if (snow) { c.moveTo(x + s.s, y); c.arc(x, y, s.s, 0, 7); } else { c.moveTo(x, y); c.lineTo(x - 2, y + 9); }
  }
  if (snow) { c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); } else { c.strokeStyle = 'rgba(190,210,230,.35)'; c.lineWidth = 1; c.stroke(); }
}

/* ---------- the frame loop ---------- */
const KEYS = new Set();
const prevCam = { x:0, y:0, z:0 };
let lastMove = 0, lastAmbient = 0, lastT = 0, camMovedTotal = 0, miniVersion = -1;
function frame(now) {
  requestAnimationFrame(frame);
  if (!G) return;
  const dt = Math.min(50, now - (lastT || now)); lastT = now;
  if (camAnim) {
    const k = clamp((now - camAnim.t0) / camAnim.dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
    cam.x = camAnim.x0 + (camAnim.x1 - camAnim.x0) * e; cam.y = camAnim.y0 + (camAnim.y1 - camAnim.y0) * e; cam.z = camAnim.z0 + (camAnim.z1 - camAnim.z0) * e;
    clampCam(); if (k >= 1) camAnim = null;
  }
  if (KEYS.size) {
    const sp = (KEYS.has('shift') ? 1500 : 750) * dt / 1000 / cam.z;
    let dx = 0, dy = 0;
    if (KEYS.has('a') || KEYS.has('arrowleft')) dx -= sp; if (KEYS.has('d') || KEYS.has('arrowright')) dx += sp;
    if (KEYS.has('w') || KEYS.has('arrowup')) dy -= sp; if (KEYS.has('s') || KEYS.has('arrowdown')) dy += sp;
    if (dx || dy) { camAnim = null; cam.x += dx; cam.y += dy; camMovedTotal += Math.hypot(dx, dy) * cam.z; }
    if (KEYS.has('q') || KEYS.has('e')) { const f = Math.exp((KEYS.has('e') ? 1 : -1) * dt / 650); zoomAt(innerWidth / 2, innerHeight / 2, f); camMovedTotal += 4; }
    clampCam();
  }
  if (drift) { cam.x += Math.sin(now / 9000) * 0.25; cam.y += Math.cos(now / 11000) * 0.12; clampCam(); }
  if (shake.amp) { if (now > (shake.until || 0)) { shake.amp = 0; shake.x = shake.y = 0; } else { shake.amp *= 0.96; shake.x = (Math.random() - 0.5) * shake.amp; shake.y = (Math.random() - 0.5) * shake.amp; } }
  if (cam.x !== prevCam.x || cam.y !== prevCam.y || cam.z !== prevCam.z) { prevCam.x = cam.x; prevCam.y = cam.y; prevCam.z = cam.z; staticDirty = true; lastMove = now; }
  const moving = now - lastMove < 140;
  let redraw = false;
  if (staticDirty) { drawStatic(!moving && !drift); redraw = true; }
  else if (lastMode === 'fast' && !moving && !drift) { drawStatic(true); redraw = true; }
  ambientSpawn(now);
  const busyFx = FX.length || PARTS.length || shake.amp;
  const ambient = hasFront || sel || selFleet || isWinter() || isMud() || G.orders.length;
  if (!redraw && !busyFx) { if (!ambient || now - lastAmbient < 40) { tutTick(); return; } }
  lastAmbient = now;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (shake.amp) { ctx.fillStyle = '#10283b'; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.drawImage(stat, Math.round(shake.x * DPR), Math.round(shake.y * DPR));
  worldT(ctx, true);
  const z = cam.z;
  if (hasFront && !timelapseOwners) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const off = -(now / 60) % 12;
    ctx.strokeStyle = 'rgba(200,60,35,.16)'; ctx.lineWidth = 6 / z; ctx.stroke(frontOther);
    ctx.strokeStyle = 'rgba(230,70,35,.28)'; ctx.lineWidth = 8 / z; ctx.stroke(frontMine);
    ctx.setLineDash([7 / z, 5 / z]); ctx.lineDashOffset = off / z;
    ctx.strokeStyle = 'rgba(215,80,50,.7)'; ctx.lineWidth = 1.8 / z; ctx.stroke(frontOther);
    ctx.strokeStyle = 'rgba(255,110,70,.95)'; ctx.lineWidth = 2.4 / z; ctx.stroke(frontMine);
    ctx.setLineDash([]);
  }
  // queued multiplayer orders
  if (G.orders.length) for (const o of G.orders) if (o.t === ME) for (const s of o.srcs) drawPlannedArrow(ctx, s.id, o.to, o.kind, z, now);
  if (sel) { const P = PROV[sel.id], k = (now % 1400) / 1400; ctx.beginPath(); ctx.arc(P.x, P.y, (8 + k * 26) / z, 0, 7); ctx.strokeStyle = `rgba(255,224,150,${1 - k})`; ctx.lineWidth = 2 / z; ctx.stroke(); }
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i]; const k = (now - f.t0) / f.dur; if (k < 0) continue; if (k > 1) { FX.splice(i, 1); continue; }
    drawFX(ctx, f, k, z, now);
  }
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i]; const age = now - p.t0; if (age < 0) continue; const k = age / p.life; if (k > 1) { PARTS.splice(i, 1); continue; }
    if (p.kind === 'spark2') { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); const x = p.sx + p.vx * age * 0.12, y = p.sy + p.vy * age * 0.12 + p.g * age * age * 0.12; ctx.fillStyle = `rgba(${p.col},${1 - k})`; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); worldT(ctx, true); continue; }
    const px = p.x + p.vx * age * 0.072 / (p.kind === 'smoke' || p.kind === 'cloud' || p.kind === 'ember' ? 1 : z), py = p.y + p.vy * age * 0.072 / (p.kind === 'smoke' || p.kind === 'cloud' || p.kind === 'ember' ? 1 : z) + (p.g ? p.g * age * age * 0.05 / z : 0);
    if (p.kind === 'spark') { ctx.fillStyle = `rgba(255,${200 - k * 150 | 0},${80 - k * 80 | 0},${1 - k})`; ctx.fillRect(px - 1 / z, py - 1 / z, 2.4 / z, 2.4 / z); }
    else if (p.kind === 'debris') { ctx.fillStyle = `rgba(40,30,20,${1 - k})`; ctx.fillRect(px - 1 / z, py - 1 / z, 2 / z, 2 / z); }
    else if (p.kind === 'ember') { ctx.fillStyle = `rgba(255,${150 + Math.random() * 80 | 0},60,${(1 - k) * 0.9})`; ctx.fillRect(px - 0.8, py - 0.8, 1.8, 1.8); }
    else if (p.kind === 'cloud') { const r = p.r0 + (p.r1 - p.r0) * Math.sqrt(k); ctx.globalAlpha = 0.6 * (1 - k); ctx.drawImage(cloudSprite(), px - r, py - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    else { const r = ((p.r0 || 4) + ((p.r1 || 14) - (p.r0 || 4)) * k) / (p.r1 ? 1 : z) * 1.3; ctx.globalAlpha = (p.dark ? 0.5 : 0.4) * (1 - k); ctx.drawImage(puffSprite(p.dark), px - r, py - r, r * 2, r * 2); ctx.globalAlpha = 1; }
  }
  drawWeather(ctx, now, dt);
  // the atomic flash washes over the whole screen
  const nf = FX.find(f => f.type === 'nukeflash' && now >= f.t0);
  if (nf) { const k = (now - nf.t0) / nf.dur; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,250,235,${Math.max(0, 1 - k * 1.4) * 0.92})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  drawMinimap();
  tutTick();
}
function drawPlannedArrow(c, from, to, kind, z, now) {
  const a = [PROV[from].x, PROV[from].y], b = [PROV[to].x, PROV[to].y];
  const col = kind === 'land' || kind === 'para' ? '120,180,230' : '230,90,50';
  c.setLineDash([8 / z, 6 / z]); c.lineDashOffset = -(now / 40) / z;
  c.strokeStyle = `rgba(${col},.95)`; c.lineWidth = 3 / z; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  c.save(); c.translate(b[0], b[1]); c.rotate(ang); c.beginPath(); c.moveTo(4 / z, 0); c.lineTo(-8 / z, 6 / z); c.lineTo(-8 / z, -6 / z); c.closePath(); c.fillStyle = `rgba(${col},1)`; c.fill(); c.restore();
}
function drawFX(c, f, k, z, now) {
  switch (f.type) {
    case 'arrow': drawArrow(c, f, k, z); break;
    case 'flash': { const r = (f.small ? 10 : f.big ? 40 : 26) * (0.4 + k) / (f.small ? 1 : z); c.globalAlpha = 0.95 * (1 - k); c.drawImage(glowSprite(), f.x - r, f.y - r, r * 2, r * 2); c.globalAlpha = 1; break; }
    case 'ring': { c.beginPath(); c.arc(f.x, f.y, f.r * Math.pow(k, 0.6), 0, 7); c.strokeStyle = `rgba(${f.col},${0.7 * (1 - k)})`; c.lineWidth = (f.w || 2) / z * (1 - k * 0.5); c.stroke(); break; }
    case 'muzzle': { const s = 4 / Math.max(0.7, z); c.fillStyle = `rgba(255,236,150,${1 - k})`; c.fillRect(f.x - s / 2, f.y - s / 2, s, s); break; }
    case 'tracer': { const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k, bx = f.x0 + (f.x1 - f.x0) * Math.max(0, k - 0.35), by = f.y0 + (f.y1 - f.y0) * Math.max(0, k - 0.35); c.strokeStyle = 'rgba(255,220,120,.95)'; c.lineWidth = 1.2 / z; c.beginPath(); c.moveTo(bx, by); c.lineTo(x, y); c.stroke(); break; }
    case 'shell': { const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 50; c.fillStyle = 'rgba(30,25,20,.9)'; c.beginPath(); c.arc(x, y, 1.6 / Math.max(0.8, z), 0, 7); c.fill(); break; }
    case 'splash': { c.strokeStyle = `rgba(220,240,255,${0.8 * (1 - k)})`; c.lineWidth = 1.2 / z; c.beginPath(); c.arc(f.x, f.y, 2 + k * 9, 0, 7); c.stroke(); break; }
    case 'plane': {
      const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k, ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0) + Math.PI / 2;
      const s = (f.kind === 'bmb' ? 15 : 12) / Math.max(0.8, z);
      c.save(); c.translate(x + 6 / z, y + 8 / z); c.rotate(ang); c.globalAlpha = 0.25 * Math.min(1, (1 - k) * 4); c.fillStyle = '#000'; c.scale(s / 24, s / 24); c.translate(-12, -12); c.fill(ICON_PATH[f.kind], 'evenodd'); c.restore();
      c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = Math.min(1, (1 - k) * 4, k * 6); c.scale(s / 24, s / 24); c.translate(-12, -12); c.fillStyle = shade(f.col, 0.25); c.fill(ICON_PATH[f.kind], 'evenodd'); c.lineWidth = 1.2; c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke(ICON_PATH[f.kind]); c.restore();
      if (f.bombs && !f.dropped && Math.hypot(x - f.bombs.x, y - f.bombs.y) < 30) { f.dropped = 1; for (let j = 0; j < 4; j++) FX.push({ type:'flash', x:f.bombs.x + (Math.random() - 0.5) * 30, y:f.bombs.y + (Math.random() - 0.5) * 30, t0:now + 200 + j * 90, dur:260, small:true }); }
      break;
    }
    case 'boat': { const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k, ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0); c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = 'rgba(230,240,245,.45)'; c.beginPath(); c.moveTo(-14 / z, -3 / z); c.lineTo(-4 / z, 0); c.lineTo(-14 / z, 3 / z); c.fill(); c.fillStyle = '#4b5a50'; c.fillRect(-4 / z, -2 / z, 8 / z, 4 / z); c.restore(); break; }
    case 'rocket': {
      const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 160;
      part({ x, y, vx:0, vy:-0.01, t0:now, life:900, kind:'smoke', r0:2, r1:7 });
      c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(x, y, 3 / Math.max(0.8, z), 0, 7); c.fill(); break;
    }
    case 'slide': {
      const a = PROV[f.from], b = PROV[f.to], e = 1 - Math.pow(1 - k, 3);
      const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
      c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0); const [sx, sy] = w2s(x, y);
      c.fillStyle = darkOf(natColor(f.owner)); c.fillRect(sx - 11, sy + 2, 22, 15); c.strokeStyle = '#f0cd7f'; c.lineWidth = 1; c.strokeRect(sx - 10.5, sy + 2.5, 21, 14);
      drawIcon(c, f.k, f.k === 'arm' ? 8 : 11, sx - (f.k === 'arm' ? 8 : 4.5), sy + (f.k === 'arm' ? 5.5 : 4)); c.restore(); break;
    }
    case 'wipe': {
      const R = RUNS[f.pid], r = f.R * (1 - Math.pow(1 - k, 2)), r2 = r * r;
      c.fillStyle = `rgba(${f.col[0]},${f.col[1]},${f.col[2]},.92)`;
      const ox = f.ox / GS, oy = f.oy / GS, rr2 = r2 / (GS * GS);
      for (let q = 0; q < R.length; q += 3) {
        const y = R[q], xa = R[q + 1], xb = R[q + 2], dy = y - oy, h2 = rr2 - dy * dy;
        if (h2 <= 0) { c.fillRect(xa * GS, y * GS, (xb - xa + 1) * GS, GS); continue; }
        const hw = Math.sqrt(h2), cx0 = ox - hw, cx1 = ox + hw;
        if (xa < cx0) c.fillRect(xa * GS, y * GS, (Math.min(xb + 1, cx0) - xa) * GS, GS);
        if (xb + 1 > cx1) { const s = Math.max(xa, cx1); c.fillRect(s * GS, y * GS, (xb + 1 - s) * GS, GS); }
      }
      break;
    }
    case 'flag': {
      const P = PROV[f.pid]; c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0); const [sx, sy] = w2s(P.x, P.y);
      const rise = Math.min(1, k * 5), fade = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1; c.globalAlpha = fade;
      const top = sy - 6 - 26 * rise; c.strokeStyle = '#2a2116'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx, sy - 4); c.lineTo(sx, top); c.stroke();
      const fs = flagSprite(f.tag), wv = Math.sin(now / 120) * 1.5;
      c.drawImage(fs, sx + 1, top + wv * 0.3, 18, 12 + wv * 0.5); c.restore(); break;
    }
    case 'float': {
      c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
      const [x, y] = w2s(f.x, f.y); const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, k - 0.6) / 0.4;
      c.globalAlpha = a; c.font = `800 ${f.big ? 24 : f.text.length > 12 ? 15 : 17}px ${FONT_DISP}`; c.textAlign = 'center';
      c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = 'rgba(10,10,10,.75)'; c.strokeText(f.text.toUpperCase(), x, y - 22 - k * 26);
      c.fillStyle = f.color; c.fillText(f.text.toUpperCase(), x, y - 22 - k * 26); c.restore(); break;
    }
  }
}
function drawArrow(c, f, k, z) {
  const a = f.from != null ? [PROV[f.from].x, PROV[f.from].y] : f.fromXY, b = [PROV[f.to].x, PROV[f.to].y];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const mx = (a[0] + b[0]) / 2 - dy * 0.22, my = (a[1] + b[1]) / 2 + dx * 0.22;
  const e = 1 - Math.pow(1 - Math.min(1, k * 1.25), 3);
  const col = f.kind === 'attack' ? '208,80,47' : f.kind === 'naval' ? '90,166,214' : f.kind === 'para' ? '190,120,230' : '121,180,108';
  const pt = t => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * my + t * t * b[1]];
  const fade = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
  c.beginPath(); for (let t = 0; t <= e + 0.001; t += 0.05) { const p = pt(Math.min(t, e)); t === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1]); }
  c.lineCap = 'round'; c.strokeStyle = `rgba(20,14,8,${0.45 * fade})`; c.lineWidth = 9 / z; c.stroke();
  c.strokeStyle = `rgba(${col},${fade})`; c.lineWidth = 5 / z; c.stroke();
  const p1 = pt(e), p0 = pt(Math.max(0, e - 0.04)); const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  c.save(); c.translate(p1[0], p1[1]); c.rotate(ang); c.beginPath(); c.moveTo(9 / z, 0); c.lineTo(-7 / z, 8 / z); c.lineTo(-7 / z, -8 / z); c.closePath();
  c.fillStyle = `rgba(${col},${fade})`; c.fill(); c.lineWidth = 1.5 / z; c.strokeStyle = `rgba(20,14,8,${0.6 * fade})`; c.stroke(); c.restore();
}
// minimap: downscaled world composite plus the current view rectangle
const miniEl = $('#mini'), miniCtx = miniEl ? miniEl.getContext('2d') : null;
const miniBase = mkCanvas(240, Math.round(240 * WH / WW));
let miniKey = '';
function drawMinimap() {
  if (!miniCtx || miniEl.offsetParent === null) return;
  const mw = miniBase.width, mh = miniBase.height;
  if (miniEl.width !== mw * DPR) { miniEl.width = mw * DPR; miniEl.height = mh * DPR; miniVersion = -1; }
  if (miniVersion !== worldVersion) { const m = miniBase.getContext('2d'); m.imageSmoothingQuality = 'high'; m.drawImage(world1, 0, 0, mw, mh); miniVersion = worldVersion; miniKey = ''; }
  const key = cam.x.toFixed(1) + cam.y.toFixed(1) + cam.z.toFixed(3) + miniVersion;
  if (key === miniKey) return; miniKey = key;
  const c = miniCtx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.drawImage(miniBase, 0, 0);
  const s = mw / WW, [x0, y0] = s2w(0, 0), [x1, y1] = s2w(VW, VH);
  c.strokeStyle = '#f0cd7f'; c.lineWidth = 1.5; c.strokeRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
  c.fillStyle = 'rgba(240,205,127,.12)'; c.fillRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
}
// newspaper plate: a grayscale map photo
function renderPlate(canvas, pid) {
  const w = canvas.width = canvas.clientWidth * 2 || 1100, h = canvas.height = canvas.clientHeight * 2 || 240;
  const c = canvas.getContext('2d'); const P = PROV[pid] || PROV[0]; const z = 1.6;
  if (ownersDirty) rebuildOwners();
  c.setTransform(z, 0, 0, z, w / 2 - P.x * z, h / 2 - P.y * z);
  c.drawImage(worldCv, 0, 0, WW, WH);
  c.setTransform(1, 0, 0, 1, 0, 0);
  star(c, w / 2, h / 2, 12, '#000', '#fff');
}
