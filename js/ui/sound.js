'use strict';
/* ================= SOUND =================
   Recorded samples from assets/sfx, decoded once; every sound falls back to a synthesized version
   until (or unless) its sample is ready. */
const SFX = (() => {
  let ac = null, master = null, sfxBus = null, musBus = null, on = true, music = false, musicNodes = null, musicEl = null;
  let vol = { sfx:0.8, music:0.5 };
  try { const s = localStorage.getItem('idom-sound'); if (s) { const o = JSON.parse(s); on = o.on !== false; if (o.vol) vol = Object.assign(vol, o.vol); music = !!o.music; } } catch (e) {}
  const persist = () => { try { localStorage.setItem('idom-sound', JSON.stringify({ on, vol, music })); } catch (e) {} };
  const BUF = {}, LIVE = {};
  // name -> [files to try in order]; a sound may have several variants that play at random
  const FILES = {
    click:['click'], drum:['drum'], thump:['thump'], boom_small:['boom_small'], boom_big:['boom_big'], alarm:['alarm'], fanfare:['fanfare'], medal:['medal'], typewriter:['typewriter'],
    gunfire:['gunfire'], artillery:['artillery'], plane:['plane'], tank:['tank'], ship:['ship_horn'], radio:['radio'], siren:['siren'], card:['card'], coins:['coins'], paper:['paper'], cannon:['cannon'], victory:['victory'], defeat:['defeat'], march:['march'],
  };
  const MIX = { click:0.18, drum:0.8, thump:0.55, boom_small:0.75, boom_big:0.95, alarm:0.6, fanfare:0.75, medal:0.7, typewriter:0.6, gunfire:0.5, artillery:0.7, plane:0.45, tank:0.5, ship:0.55, radio:0.45, siren:0.5, card:0.5, coins:0.5, paper:0.5, cannon:0.7, victory:0.8, defeat:0.8, march:0.6 };
  const MAXV = { boom_small:4, boom_big:3, click:3, gunfire:2, artillery:2, plane:2 };
  function loadSamples() {
    for (const k in FILES) for (const f of FILES[k]) {
      fetch('assets/sfx/' + f + '.mp3').then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (!b) return; return ac.decodeAudioData(b).then(d => { (BUF[k] || (BUF[k] = [])).push(d); }); }).catch(() => {});
    }
  }
  function sample(k, jitter = 0, gain = 1) {
    const list = BUF[k]; if (!list || !list.length) return false;
    if (ac.state === 'suspended') ac.resume();
    if ((LIVE[k] || 0) >= (MAXV[k] || 6)) return true;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = list[(Math.random() * list.length) | 0]; if (jitter) s.playbackRate.value = 1 + (Math.random() * 2 - 1) * jitter;
    g.gain.value = (MIX[k] || 1) * gain; s.connect(g); g.connect(sfxBus);
    LIVE[k] = (LIVE[k] || 0) + 1; s.onended = () => { LIVE[k]--; };
    s.start(); return true;
  }
  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.8; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
      musBus = ac.createGain(); musBus.gain.value = vol.music; musBus.connect(master);
      loadSamples();
      if (music && on) setTimeout(() => { music = false; api.toggleMusic(); }, 300);
    } catch (e) { ac = null; }
  }
  function noise(dur) { const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; }
  function env(node, t, a, d, peak, bus) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); node.connect(g); g.connect(bus || sfxBus); return g; }
  function tone(f, t, d, type = 'sine', peak = 0.2, bus) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; env(o, t, 0.01, d, peak, bus); o.start(t); o.stop(t + d + 0.05); return o; }
  const ok = () => on && ac && ac.state !== 'closed';
  const api = {
    init, get on() { return on; }, get music() { return music; }, get vol() { return vol; },
    setVol(k, v) { vol[k] = v; if (k === 'sfx' && sfxBus) sfxBus.gain.value = v; if (k === 'music' && musBus) musBus.gain.value = v; if (musicEl) musicEl.volume = v * 0.6; persist(); },
    toggle() { on = !on; persist(); if (!on && music) this.toggleMusic(); return on; },
    play(name, arg) { if (this[name]) this[name](arg); },
    click() { if (!ok()) return; if (sample('click', 0.06)) return; tone(1400, ac.currentTime, 0.04, 'square', 0.012); },
    boom(big) { if (!ok()) return; if (sample(big ? 'boom_big' : 'boom_small', 0.1)) return; const t = ac.currentTime; const n = noise(1.2); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(big ? 900 : 600, t); f.frequency.exponentialRampToValueAtTime(60, t + 1); n.connect(f); env(f, t, 0.005, big ? 1.1 : 0.7, big ? 0.9 : 0.55); n.start(t); const o = ac.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.5); env(o, t, 0.005, 0.5, 0.5); o.start(t); o.stop(t + 0.6); },
    thump() { if (!ok()) return; if (sample('thump', 0.04)) return; const t = ac.currentTime; const o = ac.createOscillator(); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.3); env(o, t, 0.005, 0.35, 0.35); o.start(t); o.stop(t + 0.4); },
    drum() { if (!ok()) return; if (sample('drum', 0)) return; const t = ac.currentTime; for (let i = 0; i < 9; i++) { const n = noise(0.08); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8; n.connect(f); env(f, t + i * 0.055, 0.003, 0.07, 0.12 + i * 0.02); n.start(t + i * 0.055); } },
    alarm() { if (!ok()) return; if (sample('alarm', 0)) return; const t = ac.currentTime; [0, 0.35].forEach(d => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t + d); o.frequency.linearRampToValueAtTime(330, t + d + 0.3); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200; o.connect(f); env(f, t + d, 0.03, 0.3, 0.12); o.start(t + d); o.stop(t + d + 0.4); }); },
    fanfare() { if (!ok()) return; if (sample('fanfare', 0)) return; const t = ac.currentTime; [[392, 0], [523, 0.14], [659, 0.28], [784, 0.42], [659, 0.62], [784, 0.76]].forEach(([f, d], i) => tone(f, t + d, i === 5 ? 0.7 : 0.16, 'triangle', 0.13)); },
    medal() { if (!ok()) return; if (sample('medal', 0)) return; const t = ac.currentTime; [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.07, 0.6, 'sine', 0.08)); },
    type() { if (!ok()) return; if (sample('typewriter', 0)) return; const t = ac.currentTime; for (let i = 0; i < 14; i++) { const n = noise(0.03); const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; n.connect(f); env(f, t + i * (0.045 + Math.random() * 0.04), 0.002, 0.025, 0.12); n.start(t + i * 0.06); } },
    gunfire() { if (!ok()) return; if (sample('gunfire', 0.08)) return; const t = ac.currentTime; for (let i = 0; i < 16; i++) { const n = noise(0.05); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 700; f.Q.value = 1.2; n.connect(f); const tt = t + i * 0.05 + Math.random() * 0.03; env(f, tt, 0.002, 0.045, 0.16); n.start(tt); } },
    artillery() { if (!ok()) return; if (sample('artillery', 0.08)) return; for (let i = 0; i < 3; i++) setTimeout(() => api.boom(false), i * 180); },
    plane() { if (!ok()) return; if (sample('plane', 0.06)) return; const t = ac.currentTime; const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(95, t + 1.2); o.frequency.linearRampToValueAtTime(60, t + 2.2); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; o.connect(f); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + 2.2); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 2.3); },
    tank() { if (!ok()) return; if (sample('tank', 0.05)) return; const t = ac.currentTime; const o = ac.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(42, t); o.frequency.linearRampToValueAtTime(55, t + 0.8); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; o.connect(f); env(f, t, 0.15, 0.9, 0.12); o.start(t); o.stop(t + 1.2); },
    ship() { if (!ok()) return; if (sample('ship', 0)) return; const t = ac.currentTime; [0, 0.03].forEach(d => tone(110 + d * 400, t + d, 1.2, 'sawtooth', 0.05)); },
    radio() { if (!ok()) return; if (sample('radio', 0.04)) return; const t = ac.currentTime; const n = noise(0.6); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 3; n.connect(f); env(f, t, 0.01, 0.55, 0.08); n.start(t); for (let i = 0; i < 5; i++) tone(700 + (i % 2) * 300, t + 0.1 + i * 0.09, 0.05, 'square', 0.03); },
    siren() { if (!ok()) return; if (sample('siren', 0)) return; const t = ac.currentTime; const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(700, t + 1.2); o.frequency.linearRampToValueAtTime(300, t + 2.4); env(o, t, 0.2, 2.2, 0.09); o.start(t); o.stop(t + 2.6); },
    card() { if (!ok()) return; if (sample('card', 0.05)) return; const t = ac.currentTime; const n = noise(0.12); const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3000; n.connect(f); env(f, t, 0.005, 0.1, 0.12); n.start(t); tone(880, t + 0.05, 0.12, 'triangle', 0.05); },
    coins() { if (!ok()) return; if (sample('coins', 0.05)) return; const t = ac.currentTime; for (let i = 0; i < 4; i++) tone(1800 + Math.random() * 900, t + i * 0.05, 0.15, 'triangle', 0.04); },
    paper() { if (!ok()) return; if (sample('paper', 0.05)) return; const t = ac.currentTime; const n = noise(0.25); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 4000; n.connect(f); env(f, t, 0.02, 0.2, 0.06); n.start(t); },
    cannon() { if (!ok()) return; if (sample('cannon', 0.06)) return; api.boom(false); },
    victory() { if (!ok()) return; if (sample('victory', 0)) return; api.fanfare(); setTimeout(() => api.fanfare(), 900); },
    defeat() { if (!ok()) return; if (sample('defeat', 0)) return; const t = ac.currentTime; [[392, 0], [349, 0.4], [311, 0.8], [262, 1.2]].forEach(([f, d]) => tone(f, t + d, 0.6, 'triangle', 0.12)); },
    toggleMusic() {
      init(); if (!ac) return false;
      music = !music; persist();
      if (music && on) {
        if (ac.state === 'suspended') ac.resume();
        // a recorded track if the library has one, otherwise a slow procedural war-room drone
        if (!musicEl) { musicEl = new Audio(); musicEl.loop = true; musicEl.src = 'assets/music/theme.mp3'; musicEl.volume = vol.music * 0.6; musicEl.addEventListener('error', () => { musicEl = null; if (music) startDrone(); }); }
        if (musicEl) musicEl.play().catch(() => { musicEl = null; startDrone(); });
      } else {
        if (musicEl) musicEl.pause();
        if (musicNodes) { const m = musicNodes; musicNodes = null; clearInterval(m.iv); m.g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2); setTimeout(() => m.oscs.forEach(o => { try { o.stop(); } catch (e) {} }), 1400); }
        music = false;
      }
      return music;
    },
  };
  function startDrone() {
    if (musicNodes) return;
    const g = ac.createGain(); g.gain.value = 0.0001; g.connect(musBus); g.gain.exponentialRampToValueAtTime(0.14, ac.currentTime + 3);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g);
    const chords = [[110, 130.8, 164.8], [98, 123.5, 146.8], [87.3, 110, 130.8], [82.4, 98, 123.5], [110, 130.8, 164.8], [116.5, 146.8, 174.6], [98, 123.5, 146.8], [82.4, 103.8, 123.5]];
    const oscs = [0, 1, 2, 3, 4, 5].map(i => { const o = ac.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.detune.value = (i - 2.5) * 4; o.connect(lp); o.start(); return o; });
    let step = 0;
    const tick = () => { const ch = chords[step++ % chords.length]; oscs.forEach((o, i) => o.frequency.setTargetAtTime(ch[i % 3] * (i > 2 ? 2 : 1), ac.currentTime, 1.6)); if (step % 2 === 0) { const t = ac.currentTime; [0, 0.5, 1, 1.25].forEach(d => { const n = noise(0.15); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; n.connect(f); env(f, t + d, 0.01, 0.25, 0.22, musBus); n.start(t + d); }); } };
    tick(); const iv = setInterval(tick, 6000);
    musicNodes = { g, oscs, iv };
  }
  return api;
})();
