'use strict';
/* ================= SAVE SLOTS AND UNDO (single player) =================
   Every single-player campaign has its own slot (G.slot). The one being played is also written raw to SAVE_KEY
   on every save, synchronously, so closing the tab never loses a move; each slot keeps a gzipped copy (written a
   moment later) and a line in the index slotIndex() for the menu. Up to SLOT_MAX campaigns are kept.
   Undo keeps the state at the start of the last few months in memory. Using it takes the campaign off the
   leaderboard (the record could no longer be replayed honestly), so the first undo asks. */
const SLOT_MAX = 12, slotIndex = () => SAVE_KEY + '-slots', slotKey = id => SAVE_KEY + '-slot-' + id; // SAVE_KEY comes from main.js
const Slots = {
  list() { try { const a = JSON.parse(localStorage.getItem(slotIndex()) || '[]'); return Array.isArray(a) ? a.sort((x, y) => y.at - x.at) : []; } catch (e) { return []; } },
  put(list) { try { localStorage.setItem(slotIndex(), JSON.stringify(list.slice(0, SLOT_MAX))); } catch (e) {} },
  meta(g) {
    const t = Object.keys(g.humans)[0], n = g.nat[t];
    return { id:g.slot, tag:t, nation:n ? n.name : t, y:g.y, m:g.m, sc:g.sc, diff:g.diff, weekly:g.daily || null, over:!!g.over, at:Date.now(), bad:!!(g.rec && g.rec.bad) };
  },
  touch(g) {
    let L = this.list().filter(s => s.id !== g.slot); L.unshift(this.meta(g));
    for (const s of L.slice(SLOT_MAX)) this.drop(s.id, true);
    this.put(L);
  },
  timers:{},
  // the gzipped copy, debounced so a burst of orders compresses once
  store(g) {
    const id = g.slot; clearTimeout(this.timers[id]);
    const text = JSON.stringify(Object.assign({}, g, { warSet:undefined }));
    this.timers[id] = setTimeout(async () => { try { localStorage.setItem(slotKey(id), await gzip64(text)); } catch (e) {} }, 1200);
  },
  async read(id) {
    const live = loadSaved(); if (live && live.slot === id) return live;
    const s = localStorage.getItem(slotKey(id)); if (!s) return null;
    try { const g = JSON.parse(s[0] === '{' ? s : await gunzip64(s)); return g && g.v === 4 && g.prov && g.prov.length === NP ? g : null; } catch (e) { return null; }
  },
  drop(id, keepIndex) {
    try { localStorage.removeItem(slotKey(id)); const live = loadSaved(); if (live && live.slot === id) localStorage.removeItem(SAVE_KEY); } catch (e) {}
    if (!keepIndex) this.put(this.list().filter(s => s.id !== id));
  },
  newId() { return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); },
  // a save from before slots existed becomes the first slot
  migrate() {
    const live = loadSaved(); if (!live || live.slot) return;
    live.slot = this.newId();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(live)); localStorage.setItem(slotKey(live.slot), JSON.stringify(live)); } catch (e) {}
    this.touch(live); this.store(live); // compressed a moment later
  },
};
// called by Ctl.save() for single-player campaigns
function saveSlot() {
  if (!G.slot) G.slot = Slots.newId();
  try { localStorage.setItem(SAVE_KEY, serial()); } catch (e) {}
  Slots.touch(G); Slots.store(G);
}
async function openSlot(id) {
  const g = await Slots.read(id);
  if (!g) { toast('✕', 'That save could not be read', 'It may be from an older version of the game.', ''); Slots.drop(id); showStart(); return; }
  Ctl.mode = 'sp'; adopt(g); Ctl.setMe(Object.keys(G.humans)[0]); startPlay(false); if (G.tut) tutShow();
}
function saveCopy() {
  if (!G || G.preview || Ctl.mode !== 'sp' || G.tutGame) return;
  const copy = JSON.parse(serial()); copy.slot = Slots.newId();
  try { localStorage.setItem(slotKey(copy.slot), JSON.stringify(copy)); } catch (e) {}
  Slots.touch(copy); Slots.store(copy);
  Slots.touch(G); // the campaign being played stays the newest
  toast('✓', 'Copy saved', `${natName(Object.keys(G.humans)[0])}, ${MONTHS_L[G.m]} ${G.y} — find it under Saved campaigns.`, '');
}
function showSlots() {
  const st = $('#start'), L = Slots.list();
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
  st.innerHTML = `<div class="setup">${backBtn()}<h2>Saved campaigns</h2>
    <p class="hint">Every single-player campaign saves itself as you play. Up to ${SLOT_MAX} are kept on this device, per map; the oldest goes first.</p>
    <div class="slots">${L.length ? L.map(s => `<div class="slot">${NATDEF[s.tag] ? flagImg(s.tag, 'slflag') : ''}<div><b>${esc(String(s.nation))}</b><span>${MONTHS_L[s.m] || ''} ${s.y} · from ${s.sc} · ${esc(String(s.diff))}${s.weekly ? ' · weekly ' + esc(String(s.weekly)) : ''}${s.over ? ' · finished' : ''}${s.bad ? ' · not ranked' : ''} · saved ${ago(s.at)}</span></div>
      <button class="btn gold" data-open="${esc(s.id)}">Play</button><button class="btn" data-del="${esc(s.id)}" title="Delete this save">Delete</button></div>`).join('') : '<p class="hint">No saved campaigns on this map yet.</p>'}</div></div>`;
  wireBack(st);
  st.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { SFX.click(); openSlot(b.dataset.open); });
  st.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (b.dataset.sure) { SFX.click(); Slots.drop(b.dataset.del); if (G && G.slot === b.dataset.del && !G.preview) G.slot = null; showSlots(); return; }
    b.dataset.sure = 1; b.textContent = 'Sure?'; b.classList.add('warn');
  });
}

/* ---------- undo ---------- */
const Undo = {
  snaps:[], acts:0, asked:false,
  reset() { this.snaps = []; this.acts = 0; this.asked = false; if (this.on()) this.snap(); },
  on() { return Ctl.mode === 'sp' && G && !G.preview && !G.tutGame; },
  snap() { this.snaps.push({ s:serial(), y:G.y, m:G.m }); if (this.snaps.length > 6) this.snaps.shift(); this.acts = 0; },
  can() { return this.on() && !G.over && !busy && (this.acts > 0 || this.snaps.length > 1); },
  label() { return this.acts > 0 ? 'this month' : 'last month'; },
  run() {
    if (!this.can()) return;
    const ranked = G.rec && !G.rec.bad;
    if (ranked && !this.asked) { this.confirm(); return; }
    if (this.acts === 0) this.snaps.pop();
    const S = this.snaps[this.snaps.length - 1]; if (!S) return;
    const me = ME; clearSelection(); endPick();
    const slot = G.slot; adopt(JSON.parse(S.s)); G.slot = slot; recBad('undo'); this.acts = 0; // same campaign, same slot
    Ctl.setMe(me); shownUids.clear(); Ctl.save(); renderAll();
    SFX.click(); toast('↺', `Back to the start of ${MONTHS_L[S.m]} ${S.y}`, ranked ? 'This campaign no longer counts for the leaderboard.' : '', '');
  },
  confirm() {
    const m = $('#modal'); m.hidden = false;
    m.innerHTML = `<div class="helpcard" role="dialog" aria-modal="true" style="max-width:460px"><div class="hh"><h2>Undo?</h2><button class="ibtn" data-x aria-label="Close">✕</button></div>
      <p style="padding:6px 18px;margin:8px 0">Undoing takes this campaign off the leaderboard${G.daily ? ' and out of the weekly challenge' : ''}: a posted score has to be played straight through. You can keep undoing for the rest of the campaign.</p>
      <div class="hf"><button class="btn" data-x>Keep playing</button><button class="btn gold" data-go>Undo ${this.label()}</button></div></div>`;
    m.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeModal());
    m.querySelector('[data-go]').onclick = () => { closeModal(); this.asked = true; this.run(); };
  },
};
function renderUndo() {
  const b = $('#undoBtn'); if (!b) return;
  const ok = Undo.can(); b.hidden = !ok;
  if (ok) { b.querySelector('small').textContent = Undo.label(); b.title = `Undo ${Undo.label()} (Ctrl+Z)`; }
}
