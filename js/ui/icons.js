'use strict';
/* ================= ICONS =================
   One stencil-style silhouette set, drawn both as inline SVG (UI) and as pre-rendered sprites (map canvas).
   inf and arm are the original user-supplied artwork; the rest match their weight. */
function gearPath(cx, cy, r1, r2, teeth) {
  let d = ''; const n = teeth * 2;
  for (let i = 0; i <= n * 2; i++) {
    const a = i / (n * 2) * Math.PI * 2, r = (Math.floor(i / 2) % 2) ? r2 : r1;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2);
  }
  return d + 'Z M' + (cx + 3.2) + ' ' + cy + 'a3.2 3.2 0 1 0 -6.4 0a3.2 3.2 0 1 0 6.4 0Z';
}
function starPathD(cx, cy, r, ri) { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? ri : r; d += (k ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(2) + ' ' + (cy + Math.sin(a) * q).toFixed(2); } return d + 'Z'; }
const B24 = [0, 0, 24, 24];
const ICONS = {
  inf:{ d:"M21,17h-2v-0.4238281C20.7626953,15.8024292,22,14.0450439,22,12v2c0,0.5522461,0.4472656,1,1,1   s1-0.4477539,1-1V8c0-2.7568359-2.2431641-5-5-5h-6c-2.7568359,0-5,2.2431641-5,5v6c0,0.5522461,0.4472656,1,1,1s1-0.4477539,1-1   v-2c0,2.0450439,1.2373047,3.8024292,3,4.5761719V17h-2c-2.7568359,0-5,2.2431641-5,5v6c0,0.5522461,0.4472656,1,1,1h14   c0.5527344,0,1-0.4477539,1-1s-0.4472656-1-1-1h-5.5859375l4-4H22c0.3466797,0,0.6679688-0.1796875,0.8505859-0.4741211   c0.1826172-0.2949219,0.1992188-0.6630859,0.0439453-0.9731445l-1.2376099-2.4752197C22.9953003,19.37854,24,20.5719604,24,22v6   c0,0.5522461,0.4472656,1,1,1s1-0.4477539,1-1v-6C26,19.2431641,23.7568359,17,21,17z M10,8c0-1.6542969,1.3457031-3,3-3h6   c1.6542969,0,3,1.3457031,3,3v2H10V8z M12,12h8c0,1.6542969-1.3457031,3-3,3h-2C13.3457031,15,12,13.6542969,12,12z M17,17   v0.7636719l-1,2l-1-2V17H17z M13.3818359,19l1.5,3l-0.2697754,0.5395508l-2.057373-1.371582   C12.390625,21.0585938,12.1972656,21,12,21h-0.3818359l1-2H13.3818359z M8,22c0-1.4280396,1.0046997-2.62146,2.3430786-2.9224854   l-1.2376099,2.4752197c-0.1552734,0.3100586-0.1386719,0.6782227,0.0439453,0.9731445C9.3320313,22.8203125,9.6533203,23,10,23   h1.6972656l2.0134277,1.3422852L12.3818359,27H8V22z M19,21c-0.265625,0-0.5195313,0.1054688-0.7070313,0.2929688   l-1.6425781,1.6425781L18.6181641,19h0.7636719l1,2H19z", box:[8, 3, 18, 26], nz:1 },
  arm:{ d:"M39.18,21.67A6.47,6.47,0,0,0,39,20H64.08v-3h-27a6.37,6.37,0,0,0-3.28-1.59V13.92s.06,0,.06-.07a3.19,3.19,0,0,0-3.2-3.15H17.38V16A6.32,6.32,0,0,0,14,21.67s0,0,0,.07a9.71,9.71,0,0,1,1.21-.07Z M57.84,39.2v-.05a7.22,7.22,0,0,0,6-7.1V32a7.23,7.23,0,0,0-7.19-7.3H15.23A7.34,7.34,0,0,0,7.92,32v.06A7.22,7.22,0,0,0,14,39.15v.05a6.17,6.17,0,0,0,6.16,6.1H51.8a6,6,0,0,0,6-6.1ZM41.09,42.13a3.07,3.07,0,1,1,3.08-3.07A3.06,3.06,0,0,1,41.09,42.13ZM27.62,39.06a3.08,3.08,0,1,1,3.07,3.07A3.07,3.07,0,0,1,27.62,39.06Zm-10.4,0a3.08,3.08,0,1,1,3.07,3.07A3.07,3.07,0,0,1,17.22,39.06Zm34.27,3.07a3.07,3.07,0,1,1,3.08-3.07A3.06,3.06,0,0,1,51.49,42.13Z", box:[7.9, 10.7, 56.2, 34.6], nz:1 },
  art:{ d:"M1.5 14.2 L13.6 11.5 L22.4 5.6 L23.4 7.1 L15.3 13.3 L15.6 15.2 L12.2 16 Z M9 13.6a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Z M9 16.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M1 19.5 L5 17.5 L5.6 18.8 L1.6 20.8Z", box:[0.5, 5, 23.5, 18.4] },
  mtn:{ d:"M0.5 21 L8.5 6.5 L12.4 13.5 L15.6 9.2 L23.5 21 Z M8.5 6.5 L10.6 10.3 L9.4 9.6 L8.4 11 L7.4 9.7 L6.3 10.5 Z", box:[0, 6, 24, 15.5] },
  par:{ d:"M12 1.5C6.2 1.5 1.5 5.4 1.5 10.2c1.6-1.2 3.4-1.2 5 0 1.6-1.2 3.4-1.2 5.5 0 2.1-1.2 3.9-1.2 5.5 0 1.6-1.2 3.4-1.2 5 0C22.5 5.4 17.8 1.5 12 1.5Z M2.3 10.8 L11 18 L10.2 18.8 L1.5 11.6Z M21.7 10.8 L13 18 L13.8 18.8 L22.5 11.6Z M11.4 10.5h1.2v7h-1.2Z M12 16.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z M10.4 19.6h3.2l.6 3.4h-4.4Z", box:[1.5, 1.5, 21, 21.5] },
  ftr:{ d:"M12 1.5 L13.3 6.6 L22.5 10.6 L22.5 12.6 L13.4 11.3 L12.9 17.2 L16 19.4 L16 20.9 L12 19.9 L8 20.9 L8 19.4 L11.1 17.2 L10.6 11.3 L1.5 12.6 L1.5 10.6 L10.7 6.6 Z", box:[1.5, 1.5, 21, 19.5] },
  bmb:{ d:"M12 1 L13.2 6.8 L23.5 9.6 L23.5 11.8 L13.3 10.8 L12.9 17.4 L16.4 19.7 L16.4 21.3 L12 20.2 L7.6 21.3 L7.6 19.7 L11.1 17.4 L10.7 10.8 L0.5 11.8 L0.5 9.6 L10.8 6.8 Z M4.4 8.1h1.8v3.6H4.4Z M17.8 8.1h1.8v3.6h-1.8Z M7.7 7.3h1.8v3.8H7.7Z M14.5 7.3h1.8v3.8h-1.8Z", box:[0.5, 1, 23, 20.4] },
  cap:{ d:"M0.5 14.5 H23.5 L20.8 19 H3.4 Z M6 14.5 V12.4 H8.6 V10 H10.4 V6.5 H12.2 V10 H14.4 V12.4 H17.5 V14.5 Z M2.6 12.7 H6.1 V13.6 H2.6 Z M17.6 12.7 H21.5 V13.6 H17.6 Z M11 4.2h.6v2.4H11Z", box:[0.5, 4, 23, 15.2] },
  sub:{ d:"M1 14.2c0-1.8 4.2-2.9 11-2.9s11 1.1 11 2.9-4.2 2.9-11 2.9-11-1.1-11-2.9Z M9.4 11.6 L10.2 8.2 H13.6 L14.8 11.6 Z M11.6 8.3 V5.6 H12.4 V8.3 Z M21.6 12.6 L23.6 11 V17.4 L21.6 15.8 Z", box:[1, 5.5, 22.7, 11.8] },
  gen:{ d:starPathD(12, 12.5, 11, 4.6), box:[1, 1.5, 22, 21] },
  fac:{ d:"M1.5 21.5 V10.5 L6.8 13.6 V10.5 L12.1 13.6 V10.5 L17.4 13.6 V3 H21.8 V21.5 Z M4.2 16h2.6v2.6H4.2Z M9.4 16h2.6v2.6H9.4Z M14.6 16h2.6v2.6h-2.6Z", box:[1.5, 3, 20.3, 18.5] },
  fort:{ d:"M2 21.5 V11.8 H4.6 V8.8 H7.6 V11.8 H10.2 V8.8 H13.8 V11.8 H16.4 V8.8 H19.4 V11.8 H22 V21.5 H14.6 V17.2 A2.6 2.6 0 0 0 9.4 17.2 V21.5 Z", box:[2, 8.8, 20, 12.7] },
  oil:{ d:"M12 1.8C12 1.8 4.6 10.3 4.6 15.4a7.4 7.4 0 0 0 14.8 0C19.4 10.3 12 1.8 12 1.8Z M8.4 15.6a1.1 1.1 0 0 1 2.2 0 1.6 1.6 0 0 0 1.6 1.6 1.1 1.1 0 0 1 0 2.2 3.8 3.8 0 0 1-3.8-3.8Z", box:[4.6, 1.8, 14.8, 21] },
  steel:{ d:"M3.5 16.5 L6.7 8.5 H17.3 L20.5 16.5 Z M1.5 18.3 H22.5 V21.3 H1.5 Z M8 10h8l.6 1.6H7.4Z", box:[1.5, 8.5, 21, 12.8] },
  pp:{ d:gearPath(12, 12, 10.5, 8, 8), box:[1.5, 1.5, 21, 21] },
  mp:{ d:"M12 2.4a4.1 4.1 0 1 1 0 8.2 4.1 4.1 0 0 1 0-8.2Z M3.3 21.6c0-5 3.9-8.9 8.7-8.9s8.7 3.9 8.7 8.9Z", box:[3.3, 2.4, 17.4, 19.2] },
  pol:{ d:"M5 2h2.2v20H5Z M7.2 3.2h12.6l-3.2 4.3 3.2 4.3H7.2Z", box:[5, 2, 14.8, 20] },
  stab:{ d:"M12 1.8 L20.4 5 V11.2c0 5.4-3.6 9.4-8.4 11.2C7.2 20.6 3.6 16.6 3.6 11.2V5Z M12 5.2 L7 7.1V11c0 3.4 2 6.1 5 7.6Z", box:[3.6, 1.8, 16.8, 20.6] },
  sup:{ d:"M1 6.5h12.4v9.6H1Z M14.2 9.5h4.6l3.6 3.6v3h-8.2Z M5.2 15.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z M17.6 15.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z", box:[1, 6.5, 21.4, 13.9] },
  spy:{ d:"M2.5 12.8h19v1.9h-19Z M6.8 12.8 8.5 5.4l3.5 1.6 3.5-1.6 1.7 7.4Z M7.6 16.2a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z M16.4 16.2a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8Z M10.4 18.4h3.2v1.1h-3.2Z", box:[2.5, 5.4, 19, 16.6] },
  card:{ d:"M6 1.8h12a2 2 0 0 1 2 2v16.4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3.8a2 2 0 0 1 2-2Z M12 6.6 15.4 12 12 17.4 8.6 12Z", box:[4, 1.8, 16, 20.4] },
  flame:{ d:"M12 1.6c.9 4.2 6.4 6.5 6.4 12.6a6.4 6.4 0 0 1-12.8 0c0-3.2 2-5.4 2-5.4s.2 3.4 2.4 3.6c-.6-5.2 2-7.6 2-10.8Z", box:[5.6, 1.6, 12.8, 19.4] },
  medal:{ d:"M7 1.5h4l1 5h-4Z M13 1.5h4l-2 5h-3Z M12 7.6a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4Z", box:[4.8, 1.5, 14.4, 20.5] },
  anchor:{ d:"M12 1.6a2.6 2.6 0 0 1 1 5V9h3.4v2H13v8.1c2.6-.4 4.6-2.2 5.2-4.5l-1.6.3 2.6-3.6 2 4-1.4-.3c-.8 4-4.3 6.9-7.8 6.9s-7-2.9-7.8-6.9l-1.4.3 2-4 2.6 3.6-1.6-.3c.6 2.3 2.6 4.1 5.2 4.5V11H7.6V9H11V6.6a2.6 2.6 0 0 1 1-5Z", box:[2.8, 1.6, 18.4, 20.3] },
  target:{ d:"M12 1.5a10.5 10.5 0 1 1 0 21 10.5 10.5 0 0 1 0-21Z M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2Z M12 7.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z M12 9.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z", box:[1.5, 1.5, 21, 21] },
  rocket:{ d:"M12 1c3 2.6 4.4 6.6 4.4 11.4l2.4 3.6v4.4l-3.2-2.2h-7.2l-3.2 2.2V16l2.4-3.6C7.6 7.6 9 3.6 12 1Z M12 7a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 12 7Z M10.4 19.4h3.2L12 23Z", box:[5.2, 1, 13.6, 22] },
  atom:{ d:"M12 9.9a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Z M12 2c2.4 0 4 4.5 4 10s-1.6 10-4 10-4-4.5-4-10 1.6-10 4-10Zm0 1.8c-1 0-2.2 3.4-2.2 8.2s1.2 8.2 2.2 8.2 2.2-3.4 2.2-8.2-1.2-8.2-2.2-8.2Z", box:[8, 2, 8, 20] },
};
const iconSvg = (k, cls = '') => { const I = ICONS[k] || ICONS.card, b = I.box; return `<svg class="uicon ${cls}" viewBox="${b[0]} ${b[1]} ${b[2]} ${b[3]}" fill="currentColor" fill-rule="${I.nz ? 'nonzero' : 'evenodd'}" aria-hidden="true"><path d="${I.d}"/></svg>`; };
const ICON_PATH = {}; for (const k in ICONS) ICON_PATH[k] = new Path2D(ICONS[k].d);
const iconSprites = {};
// white silhouettes pre-rendered at device resolution, so each counter is one cheap blit
function iconSprite(k, hCss, color = '#fff') {
  const key = k + hCss + color + '@' + DPR;
  if (iconSprites[key]) return iconSprites[key];
  const b = ICONS[k].box, s = hCss / b[3], wCss = b[2] * s;
  const c = mkCanvas(Math.ceil(wCss * DPR) + 2, Math.ceil(hCss * DPR) + 2), x = c.getContext('2d');
  x.setTransform(s * DPR, 0, 0, s * DPR, (1 - b[0] * s) * DPR, (1 - b[1] * s) * DPR);
  x.fillStyle = color; x.fill(ICON_PATH[k], ICONS[k].nz ? 'nonzero' : 'evenodd');
  return (iconSprites[key] = { c, w:wCss, h:hCss });
}
function drawIcon(c, k, hCss, x, y, color) { const S = iconSprite(k, hCss, color); c.drawImage(S.c, x - 1 / DPR, y - 1 / DPR, S.c.width / DPR, S.c.height / DPR); return S.w; }
const UNIT_ICON = { inf:'inf', art:'art', mtn:'mtn', arm:'arm', par:'par', ftr:'ftr', bmb:'bmb', cap:'cap', sub:'sub' };

/* ================= FLAGS ================= */
// period flags, simplified to read at 20 pixels
function paintFlag(c, tag, x, y, w, h) {
  const n = G && G.nat[tag], d = NATDEF[tag] || {}, F = d.flag || { t:'h', c:[n ? n.color : '#888'] };
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const stripes = (cols, vert, wts) => { const W8 = wts || cols.map(() => 1), tot = W8.reduce((a, b) => a + b, 0); let o = 0; cols.forEach((col, i) => { c.fillStyle = col; const s = W8[i] / tot; if (vert) c.fillRect(x + o * w, y, s * w + 0.5, h); else c.fillRect(x, y + o * h, w, s * h + 0.5); o += s; }); };
  switch (F.t) {
    case 'h': stripes(F.c, false, F.w); break;
    case 'v': stripes(F.c, true, F.w); break;
    case 'nordic': { c.fillStyle = F.c[0]; c.fillRect(x, y, w, h); const t = h * 0.26, cx = x + w * 0.36; c.fillStyle = F.c[1]; c.fillRect(cx - t / 2, y, t, h); c.fillRect(x, y + h / 2 - t / 2, w, t); if (F.c[2]) { const t2 = t * 0.5; c.fillStyle = F.c[2]; c.fillRect(cx - t2 / 2, y, t2, h); c.fillRect(x, y + h / 2 - t2 / 2, w, t2); } break; }
    case 'uk': { c.fillStyle = '#012169'; c.fillRect(x, y, w, h); c.lineCap = 'butt';
      c.strokeStyle = '#fff'; c.lineWidth = h * 0.22; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke();
      c.strokeStyle = '#c8102e'; c.lineWidth = h * 0.08; c.stroke();
      c.fillStyle = '#fff'; c.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); c.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
      c.fillStyle = '#c8102e'; c.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); c.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2); break; }
    case 'sov': c.fillStyle = '#cc0000'; c.fillRect(x, y, w, h); starAt(c, x + w * 0.2, y + h * 0.27, h * 0.15, '#ffd700'); c.fillStyle = '#ffd700'; c.fillRect(x + w * 0.12, y + h * 0.48, w * 0.16, h * 0.08); break;
    case 'tur': { c.fillStyle = '#e30a17'; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w * 0.38, y + h / 2, h * 0.27, 0, 7); c.fill(); c.fillStyle = '#e30a17'; c.beginPath(); c.arc(x + w * 0.43, y + h / 2, h * 0.215, 0, 7); c.fill(); starAt(c, x + w * 0.6, y + h / 2, h * 0.12, '#fff'); break; }
    case 'swiss': c.fillStyle = '#da291c'; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.fillRect(x + w / 2 - h * 0.1, y + h * 0.2, h * 0.2, h * 0.6); c.fillRect(x + w / 2 - h * 0.3, y + h * 0.4, h * 0.6, h * 0.2); break;
    case 'cze': c.fillStyle = '#fff'; c.fillRect(x, y, w, h / 2); c.fillStyle = '#d7141a'; c.fillRect(x, y + h / 2, w, h / 2); c.fillStyle = '#11457e'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.5, y + h / 2); c.lineTo(x, y + h); c.fill(); break;
    case 'gre': { for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#fff' : '#0d5eaf'; c.fillRect(x, y + i * h / 9, w, h / 9 + 0.5); } c.fillStyle = '#0d5eaf'; c.fillRect(x, y, h * 5 / 9, h * 5 / 9); c.fillStyle = '#fff'; c.fillRect(x + h * 2 / 9, y, h / 9, h * 5 / 9); c.fillRect(x, y + h * 2 / 9, h * 5 / 9, h / 9); break; }
    case 'usa': { for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#fff' : '#b22234'; c.fillRect(x, y + i * h / 13, w, h / 13 + 0.5); } c.fillStyle = '#3c3b6e'; c.fillRect(x, y, w * 0.4, h * 7 / 13); c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.fillRect(x + w * (0.05 + i * 0.09), y + h * (0.07 + j * 0.15), Math.max(0.6, w * 0.025), Math.max(0.6, w * 0.025)); break; }
    default: c.fillStyle = n ? n.color : '#888'; c.fillRect(x, y, w, h);
  }
  // nations that rebranded through a Destiny decision fly their new colours on a band
  if (n && n.dec && n.dec.length && n.color !== d.c) { c.fillStyle = n.color; c.fillRect(x, y + h * 0.78, w, h * 0.22); }
  c.restore();
}
function starAt(c, x, y, r, col) { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fillStyle = col; c.fill(); }
const flagCache = {};
function flagURL(tag) {
  const n = G && G.nat[tag], key = tag + (n ? n.color : '');
  if (flagCache[key]) return flagCache[key];
  const c = mkCanvas(60, 40), x = c.getContext('2d'); paintFlag(x, tag, 0, 0, 60, 40);
  return (flagCache[key] = c.toDataURL());
}
const flagImg = (tag, cls = 'flag') => `<img class="${cls}" src="${flagURL(tag)}" alt="">`;
const flagSprites = {};
function flagSprite(tag) {
  const n = G && G.nat[tag], key = tag + (n ? n.color : '') + DPR;
  if (flagSprites[key]) return flagSprites[key];
  const w = 18, h = 12, c = mkCanvas(Math.ceil(w * DPR), Math.ceil(h * DPR)), x = c.getContext('2d');
  x.scale(DPR, DPR); paintFlag(x, tag, 0, 0, w, h);
  return (flagSprites[key] = c);
}
