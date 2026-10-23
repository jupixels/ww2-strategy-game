'use strict';
/* ================= INPUT ================= */
const ptrs = new Map(); let dragging = false, downAt = null, pinch0 = null;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  downAt = [e.clientX, e.clientY, cam.x, cam.y]; dragging = false; camAnim = null; drift = false;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d:Math.hypot(a[0] - b[0], a[1] - b[1]), z:cam.z }; }
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) { if (G && !$('#start').hidden) return; hover(e); return; }
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch0.z * d / pinch0.d / cam.z); dragging = true; return; }
  const dx = e.clientX - downAt[0], dy = e.clientY - downAt[1];
  if (!dragging && Math.hypot(dx, dy) > 6) { dragging = true; cv.classList.add('drag'); hideTip(); }
  if (dragging) { cam.x = downAt[2] - dx / cam.z; cam.y = downAt[3] - dy / cam.z; clampCam(); camMovedTotal += 30; }
});
const endPtr = e => {
  const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null;
  cv.classList.remove('drag');
  if (was && !dragging && ptrs.size === 0 && e.type === 'pointerup') click(e.clientX, e.clientY, e.button === 2, e.shiftKey);
  if (ptrs.size === 0) dragging = false;
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); camAnim = null; zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016)); }, { passive:false });
function zoomAt(sx, sy, f) { camMovedTotal += 25; const r = cv.getBoundingClientRect(); const [wx, wy] = s2w(sx - r.left, sy - r.top); cam.z *= f; clampCam(); const [nx, ny] = s2w(sx - r.left, sy - r.top); cam.x += wx - nx; cam.y += wy - ny; clampCam(); staticDirty = true; }
function pickAt(sx, sy) { const r = cv.getBoundingClientRect(); const [wx, wy] = s2w(sx - r.left, sy - r.top); const gx = Math.floor(wx / GS), gy = Math.floor(wy / GS); if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return -1; return GRIDD[gy * GW + gx]; }
function click(sx, sy, right, shift) {
  if (!G || G.preview || !$('#start').hidden || busy || !$('#modal').hidden || !$('#pass').hidden || timelapseOwners) return;
  // fleets first: their markers sit on the sea
  if (selFleet) { const z = zoneAt(sx, sy); if (z && fleetTargetsSet.has(z)) { Ctl.act({ c:'fleet', from:selFleet.z, to:z, part:selFleet.part }); const f = G.fleet[z][ME]; if (f) selectFleet(z); return; } }
  const fb = fleetAt(sx, sy);
  if (fb && !pickMode) { SFX.click(); if (selFleet && selFleet.z === fb.z) clearSelection(); else selectFleet(fb.z); return; }
  const id = pickAt(sx, sy);
  if (pickMode) { pickClick(id); return; }
  if (sel && id >= 0 && targets.has(id) && !(shift && G.prov[id].o === ME)) { execOrder(id); return; }
  if (right) return;
  if (id < 0) { clearSelection(); return; }
  if (shift && sel && G.prov[id].o === ME && G.prov[sel.id].o === ME) { SFX.click(); select(id, true); return; }
  if (sel && sel.id === id && !sel.multi) { clearSelection(); return; }
  SFX.click(); select(id);
}
cv.addEventListener('pointerleave', hideTip);
const CAM_KEYS = new Set(['w','a','s','d','q','e','arrowleft','arrowright','arrowup','arrowdown','shift']);
window.addEventListener('keydown', e => {
  if (!G || G.preview || !$('#start').hidden) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (!$('#modal').hidden) { if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) { const b = $('#modal .choice'); if (b) { e.preventDefault(); b.click(); } } if (e.key === 'Escape' && !$('#modal .paper')) closeModal(); return; }
  if (!$('#pass').hidden) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#passGo').click(); } return; }
  const k = e.key.toLowerCase();
  if (CAM_KEYS.has(k) && !e.ctrlKey && !e.metaKey && !e.altKey) { KEYS.add(k); drift = false; if (k.startsWith('arrow')) e.preventDefault(); return; }
  if (e.key === ' ') { e.preventDefault(); if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); Ctl.endTurn(); }
  else if (e.key === 'Escape') { if (pickMode) endPick(); else if (tab) openTab(tab); else clearSelection(); }
  else if (e.key === '+' || e.key === '=') zoomAt(innerWidth / 2, innerHeight / 2, 1.25);
  else if (e.key === '-' || e.key === '_') zoomAt(innerWidth / 2, innerHeight / 2, 0.8);
  else if (k === 'n') nextArmy();
  else if (k === 'm') cycleMapMode();
  else if (k === 'h' || e.key === '?') showHelp();
  else if (k === 'c' && ME) centerOn(homeProv(ME), Math.max(cam.z, 1.1));
  else if (k === 't' && (Ctl.mode === 'host' || Ctl.mode === 'client')) toggleChat(true);
  else if (/^[1-8]$/.test(e.key)) openTab(['army','industry','focus','tech','dip','intel','dec','log'][+e.key - 1]);
});
window.addEventListener('keyup', e => { KEYS.delete(e.key.toLowerCase()); if (e.key === 'Shift') KEYS.delete('shift'); });
window.addEventListener('blur', () => KEYS.clear());
$$('.tab').forEach(b => b.onclick = () => openTab(b.dataset.tab));
$('#endTurn').onclick = () => { SFX.init(); $('#endTurn').blur(); Ctl.endTurn(); };
$('#nextArmy').onclick = () => { SFX.init(); nextArmy(); };
$('#bHelp').onclick = () => showHelp();
$('#zIn').onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, 1.3);
$('#zOut').onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 1.3);
$('#zMode').onclick = () => cycleMapMode();
$('#bSound').onclick = () => { SFX.init(); const on = SFX.toggle(); $('#bSound').classList.toggle('off', !on); };
$('#bMusic').onclick = () => { SFX.init(); const on = SFX.toggleMusic(); $('#bMusic').classList.toggle('off', !on); };
$('#bMenu').onclick = () => { if (Ctl.mode === 'host' || Ctl.mode === 'client') confirmBox('Leave the match?', Ctl.mode === 'host' ? 'You are hosting: everyone will be disconnected. The game is saved on this device.' : 'You can rejoin with the same code.', 'Leave', () => Ctl.toMenu()); else Ctl.toMenu(); };
$('#bMusic').classList.toggle('off', !SFX.music);
$('#bSound').classList.toggle('off', !SFX.on);
function cycleMapMode() {
  mapMode = mapMode === 'pol' ? 'sup' : mapMode === 'sup' ? 'res' : 'pol';
  rebuildOverlay(); SFX.click();
  $('#zMode').textContent = { pol:'◐', sup:'⛟', res:'✊' }[mapMode];
  toast({ pol:'◐', sup:'⛟', res:'✊' }[mapMode], { pol:'Political map', sup:'Supply map', res:'Resistance map' }[mapMode], { pol:'Nations and alliances.', sup:'Green: full supply · yellow to red: stretched · dark red: cut off.', res:'Occupied provinces, redder where resistance runs high.' }[mapMode], '');
}
/* minimap */
{
  const mm = $('#mini'); let down = false;
  const go = e => { const r = mm.getBoundingClientRect(); cam.x = (e.clientX - r.left) / r.width * WW; cam.y = (e.clientY - r.top) / r.height * WH; camAnim = null; drift = false; clampCam(); };
  mm.addEventListener('pointerdown', e => { down = true; mm.setPointerCapture(e.pointerId); go(e); });
  mm.addEventListener('pointermove', e => { if (down) go(e); });
  mm.addEventListener('pointerup', () => down = false);
  mm.addEventListener('pointercancel', () => down = false);
}
