'use strict';
/* ================= SOUND =================
   Built on sfx.js from the game-sounds library (js/vendor/sfx.js). Samples: the original Iron Dominion set
   (assets/sfx) plus CC0 Kenney.nl sounds from the game-sounds library (assets/sounds).
   Gunfire and the air-raid siren have no library match and stay synthesized, as does the war-room music. */
const SFX = (() => {
  let lib = null, on = true, music = false, drone = null;
  let vol = { sfx:0.8, music:0.5 };
  try { const s = localStorage.getItem('idom-sound'); if (s) { const o = JSON.parse(s); on = o.on !== false; if (o.vol) vol = Object.assign(vol, o.vol); music = !!o.music; } } catch (e) {}
  const persist = () => { try { localStorage.setItem('idom-sound', JSON.stringify({ on, vol, music })); } catch (e) {} };
  const S = (...f) => f.map(x => 'sounds/' + x + '.mp3');
  const BANK = {
    // the original set, supplied by the user
    click:{ src:['sfx/click.mp3'], volume:0.18 }, drum:{ src:['sfx/drum.mp3'], volume:0.8 }, thump:{ src:['sfx/thump.mp3'], volume:0.55 },
    boom_small:{ src:['sfx/boom_small.mp3'], volume:0.75 }, boom_big:{ src:['sfx/boom_big.mp3'], volume:0.95 }, alarm:{ src:['sfx/alarm.mp3'], volume:0.6 },
    fanfare:{ src:['sfx/fanfare.mp3'], volume:0.75 }, medal:{ src:['sfx/medal.mp3'], volume:0.7 }, typewriter:{ src:['sfx/typewriter.mp3'], volume:0.6 },
    // game-sounds library
    artillery:{ src:S('scifi/explosion_crunch_01', 'scifi/explosion_crunch_02', 'scifi/explosion_crunch_03', 'scifi/explosion_crunch_04'), volume:0.5 },
    nuke:{ src:S('scifi/explosion_deep_01', 'scifi/explosion_deep_02'), volume:0.6 },
    plane:{ src:S('scifi/engine_small_02', 'scifi/engine_small_04'), volume:0.5 },
    tank:{ src:S('scifi/engine_low_02', 'scifi/engine_low_04'), volume:0.5 },
    ship:{ src:S('impacts/bell_heavy_03', 'impacts/bell_heavy_04'), volume:0.5 },
    radio:{ src:S('scifi/computer_02'), volume:0.3 },
    card:{ src:S('tabletop/card_place_01', 'tabletop/card_place_02', 'tabletop/card_place_03', 'tabletop/card_place_04'), volume:0.8 },
    draw:{ src:S('tabletop/card_slide_01', 'tabletop/card_slide_02', 'tabletop/card_slide_03'), volume:0.7 },
    shuffle:{ src:S('tabletop/card_shuffle_01'), volume:0.7 },
    coins:{ src:S('rpg/coins_01', 'rpg/coins_02'), volume:0.7 },
    paper:{ src:S('rpg/book_flip_01', 'rpg/book_flip_02', 'rpg/book_flip_03'), volume:0.8 },
    error:{ src:S('ui/error_01', 'ui/error_03'), volume:0.45 },
    open:{ src:S('ui/open_02', 'ui/open_03', 'ui/open_04'), volume:0.4 },
    close:{ src:S('ui/close_01', 'ui/close_02', 'ui/close_03'), volume:0.4 },
    build:{ src:S('rpg/metal_latch_01'), volume:0.55 },
    factory:{ src:S('impacts/plate_heavy_01'), volume:0.6 },
    fort:{ src:S('impacts/wood_heavy_01'), volume:0.55 },
    stinger:{ src:S('jingles/jingle_hit_04'), volume:0.45 },
    victory:{ src:S('jingles/jingle_hit_02'), volume:0.5 },
    defeat:{ src:S('jingles/jingle_hit_06'), volume:0.5 },
    confirm:{ src:S('ui/confirm_01'), volume:0.4 },
  };
  function init() {
    if (lib || !window.SFX) return;
    try { lib = new window.SFX({ base:'assets/' }); lib.load(BANK); apply(); if (music && on) setTimeout(() => { music = false; api.toggleMusic(); }, 300); } catch (e) { lib = null; }
  }
  function apply() { if (!lib) return; lib.setVolume('master', on ? 0.85 : 0); lib.setVolume('sfx', vol.sfx); lib.setVolume('ui', vol.sfx); lib.setVolume('music', vol.music); }
  const ready = () => on && lib;
  const has = k => lib && lib.buffers[k] && lib.buffers[k].length;
  const play = (k, o) => { if (ready() && has(k)) lib.play(k, o); };
  // long engine recordings are cut short with a fade so a flyover is a pass, not a drone
  const pass = (k, secs, o) => { if (!ready() || !has(k)) return; const h = lib.loop(k, o); if (h) setTimeout(() => h.stop(0.8), secs * 1000); };
  function synth(fn) { if (!ready()) return; const ac = lib.ctx; if (ac.state !== 'running') ac.resume(); fn(ac, ac.currentTime, lib.buses.sfx); }
  function noise(ac, dur) { const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; return s; }
  function env(ac, node, t, a, d, peak, bus) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); node.connect(g); g.connect(bus); return g; }
  const api = {
    init, get on() { return on; }, get music() { return music; }, get vol() { return vol; },
    setVol(k, v) { vol[k] = v; apply(); persist(); },
    toggle() { on = !on; apply(); persist(); if (!on && music) this.toggleMusic(); return on; },
    play(name, arg) { if (this[name]) this[name](arg); },
    click() { play('click', { vary:0.06, bus:'ui', cooldown:0.04 }); },
    boom(big) { play(big ? 'boom_big' : 'boom_small', { vary:0.1, cooldown:0.12 }); },
    thump() { play('thump'); },
    drum() { play('drum'); },
    alarm() { play('alarm', { cooldown:1 }); },
    fanfare() { play('fanfare', { cooldown:0.5 }); },
    medal() { play('medal', { cooldown:0.4 }); },
    type() { play('typewriter', { cooldown:0.3 }); play('paper', { delay:0.05 }); },
    artillery() { for (let i = 0; i < 3; i++) play('artillery', { vary:0.08, delay:i * 0.18, cooldown:0 }); },
    cannon() { play('artillery', { vary:0.1, rate:0.8 }); },
    nuke() { play('nuke', { cooldown:1 }); },
    plane() { pass('plane', 2.2, { volume:0.8, fadeIn:0.6 }); },
    tank() { pass('tank', 1.4, { volume:0.8, fadeIn:0.25 }); },
    ship() { play('ship', { cooldown:0.6 }); },
    radio() { pass('radio', 1.1, { volume:0.7, fadeIn:0.05 }); },
    card() { play('card', { vary:0.05 }); },
    draw() { play('draw', { vary:0.05 }); },
    shuffle() { play('shuffle'); },
    coins() { play('coins', { vary:0.05 }); },
    paper() { play('paper'); },
    error() { play('error', { bus:'ui' }); },
    open() { play('open', { bus:'ui', cooldown:0.08 }); },
    close() { play('close', { bus:'ui', cooldown:0.08 }); },
    build() { play('build', { vary:0.08 }); },
    factory() { play('factory'); },
    fort() { play('fort'); },
    stinger() { play('stinger', { cooldown:0.6 }); },
    confirm() { play('confirm', { bus:'ui' }); },
    victory() { play('victory'); setTimeout(() => play('fanfare'), 700); },
    defeat() { play('defeat'); },
    // no recorded match in the library for these two: synthesized
    gunfire() { synth((ac, t, bus) => { for (let i = 0; i < 16; i++) { const n = noise(ac, 0.05); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 700; f.Q.value = 1.2; n.connect(f); const tt = t + i * 0.05 + Math.random() * 0.03; env(ac, f, tt, 0.002, 0.045, 0.12, bus); n.start(tt); } }); },
    siren() { synth((ac, t, bus) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(700, t + 1.2); o.frequency.linearRampToValueAtTime(300, t + 2.4); env(ac, o, t, 0.2, 2.2, 0.08, bus); o.start(t); o.stop(t + 2.6); }); },
    toggleMusic() {
      init(); if (!lib) return false;
      music = !music; persist();
      if (music && on) startDrone(); else stopDrone();
      return music;
    },
  };
  // the war-room score: a slow procedural drone with distant drums (the library has no music)
  function startDrone() {
    if (drone) return;
    const ac = lib.ctx; if (ac.state !== 'running') ac.resume();
    const g = ac.createGain(); g.gain.value = 0.0001; g.connect(lib.buses.music); g.gain.exponentialRampToValueAtTime(0.16, ac.currentTime + 3);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(g);
    const chords = [[110, 130.8, 164.8], [98, 123.5, 146.8], [87.3, 110, 130.8], [82.4, 98, 123.5], [110, 130.8, 164.8], [116.5, 146.8, 174.6], [98, 123.5, 146.8], [82.4, 103.8, 123.5]];
    const oscs = [0, 1, 2, 3, 4, 5].map(i => { const o = ac.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.detune.value = (i - 2.5) * 4; o.connect(lp); o.start(); return o; });
    let step = 0;
    const tick = () => { const ch = chords[step++ % chords.length]; oscs.forEach((o, i) => o.frequency.setTargetAtTime(ch[i % 3] * (i > 2 ? 2 : 1), ac.currentTime, 1.6)); if (step % 2 === 0) { const t = ac.currentTime; [0, 0.5, 1, 1.25].forEach(d => { const n = noise(ac, 0.15); const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; n.connect(f); env(ac, f, t + d, 0.01, 0.25, 0.22, lib.buses.music); n.start(t + d); }); } };
    tick(); const iv = setInterval(tick, 6000);
    drone = { g, oscs, iv };
  }
  function stopDrone() {
    if (!drone) return; const d = drone; drone = null; clearInterval(d.iv);
    d.g.gain.exponentialRampToValueAtTime(0.0001, lib.ctx.currentTime + 1.2); setTimeout(() => d.oscs.forEach(o => { try { o.stop(); } catch (e) {} }), 1400);
  }
  return api;
})();
