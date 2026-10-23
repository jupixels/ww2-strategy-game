'use strict';
/* ================= SOUND =================
   Built on sfx.js from the game-sounds library (js/vendor/sfx.js). Samples: the original Iron Dominion set (assets/sfx),
   Kenney.nl CC0 sounds (assets/sounds/<category>), and real WW2-style field recordings plus two orchestral tracks from the
   library's ww2/ and music/ families (assets/sounds/ww2, assets/music). Credits for those are in the README.
   Effects are decoded up front by sfx.js; music is streamed through <audio> elements (the tracks are minutes long, and
   decoding them would cost tens of MB of memory) and routed into the same music bus so the volume slider still works. */
const SFX = (() => {
  let lib = null, on = true, music = false;
  let vol = { sfx:0.8, music:0.5 };
  try { const s = localStorage.getItem('idom-sound'); if (s) { const o = JSON.parse(s); on = o.on !== false; if (o.vol) vol = Object.assign(vol, o.vol); music = !!o.music; } } catch (e) {}
  const persist = () => { try { localStorage.setItem('idom-sound', JSON.stringify({ on, vol, music })); } catch (e) {} };
  const S = (...f) => f.map(x => 'sounds/' + x + '.mp3');
  const W = (name, n) => S(...Array.from({ length:n }, (_, i) => `ww2/${name}_0${i + 1}`));
  const BANK = {
    // the original set, supplied by the user
    click:{ src:['sfx/click.mp3'], volume:0.18 }, drum:{ src:['sfx/drum.mp3'], volume:0.8 }, thump:{ src:['sfx/thump.mp3'], volume:0.55 },
    boom_small:{ src:['sfx/boom_small.mp3'], volume:0.75 }, boom_big:{ src:['sfx/boom_big.mp3'], volume:0.95 }, alarm:{ src:['sfx/alarm.mp3'], volume:0.6 },
    fanfare:{ src:['sfx/fanfare.mp3'], volume:0.75 }, medal:{ src:['sfx/medal.mp3'], volume:0.7 }, typewriter:{ src:['sfx/typewriter.mp3'], volume:0.6 },
    // real recordings (game-sounds ww2/ family)
    battle:{ src:W('battle_distant', 4), volume:0.75 },
    rifle:{ src:W('rifle_shot', 4), volume:0.32 },
    mg:{ src:W('mg_burst', 2), volume:0.4 },
    artillery:{ src:W('artillery', 6), volume:0.6 },
    howitzer:{ src:W('howitzer', 2), volume:0.45 },
    siren:{ src:S('ww2/air_raid_siren_01'), volume:0.4 },
    flyby:{ src:S('ww2/plane_flyby_01'), volume:0.7 },
    plane:{ src:S('ww2/plane_pass_01'), volume:0.55 },
    tank:{ src:W('tank_rumble', 2), volume:0.45 },
    ship:{ src:S('ww2/ship_horn_01'), volume:0.4 },
    radio:{ src:S('ww2/radio_morse_02'), volume:0.3 },
    signal:{ src:S('ww2/radio_morse_01'), volume:0.6 },
    // Kenney.nl (game-sounds library)
    card:{ src:S('tabletop/card_place_01', 'tabletop/card_place_02', 'tabletop/card_place_03', 'tabletop/card_place_04'), volume:0.8 },
    draw:{ src:S('tabletop/card_slide_01', 'tabletop/card_slide_02', 'tabletop/card_slide_03'), volume:0.7 },
    shuffle:{ src:S('tabletop/card_shuffle_01'), volume:0.7 },
    coins:{ src:S('rpg/coins_01', 'rpg/coins_02'), volume:0.7 },
    paper:{ src:S('rpg/book_flip_01', 'rpg/book_flip_02', 'rpg/book_flip_03'), volume:0.8 },
    error:{ src:S('ui/error_01', 'ui/error_03'), volume:0.45 },
    // drawer tabs: a mechanical war-room switch (one fixed click to open, a lower click to close)
    open:{ src:S('ui/switch_04'), volume:0.35 },
    close:{ src:S('ui/switch_alt_02', 'ui/switch_alt_03'), volume:0.6 },
    build:{ src:S('rpg/metal_latch_01'), volume:0.55 },
    factory:{ src:S('impacts/plate_heavy_01'), volume:0.6 },
    fort:{ src:S('impacts/wood_heavy_01'), volume:0.55 },
    stinger:{ src:S('jingles/jingle_hit_04'), volume:0.45 },
    victory:{ src:S('jingles/jingle_hit_02'), volume:0.5 },
    defeat:{ src:S('jingles/jingle_hit_06'), volume:0.5 },
    confirm:{ src:S('ui/confirm_01'), volume:0.4 },
  };
  // a playlist that alternates the two tracks; both are written to loop cleanly
  const MUSIC = [{ src:'assets/music/war_lament_01.mp3', volume:0.55 }, { src:'assets/music/call_to_war_01.mp3', volume:0.5 }];
  function init() {
    if (lib || !window.SFX) return;
    try { lib = new window.SFX({ base:'assets/' }); lib.load(BANK); apply(); if (music && on) setTimeout(() => { music = false; api.toggleMusic(); }, 300); } catch (e) { lib = null; }
  }
  function apply() { if (!lib) return; lib.setVolume('master', on ? 0.85 : 0); lib.setVolume('sfx', vol.sfx); lib.setVolume('ui', vol.sfx); lib.setVolume('music', vol.music); }
  const ready = () => on && lib;
  const has = k => lib && lib.buffers[k] && lib.buffers[k].length;
  const play = (k, o) => { if (ready() && has(k)) return lib.play(k, o); };
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
    // a land battle: the distant front crackling, a few close rifle cracks, sometimes a machine-gun burst.
    // Many battles resolve at once at month end, so the bed has a long cooldown and the layers stay sparse.
    gunfire() {
      if (!play('battle', { vary:0.05, cooldown:1.6, pan:(Math.random() - 0.5) * 0.6 })) return;
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) play('rifle', { vary:0.08, delay:0.15 + i * 0.35 + Math.random() * 0.25, cooldown:0, volume:0.6 + Math.random() * 0.4, pan:(Math.random() - 0.5) * 1.2 });
      if (Math.random() < 0.55) play('mg', { vary:0.05, delay:0.4 + Math.random() * 0.8, cooldown:0, pan:(Math.random() - 0.5) * 0.8 });
    },
    artillery() { for (let i = 0; i < 3; i++) play('artillery', { vary:0.07, delay:i * 0.32 + Math.random() * 0.15, cooldown:0, pan:(Math.random() - 0.5) * 0.8 }); },
    cannon() { play('howitzer', { vary:0.08, cooldown:0.3 }); play('artillery', { vary:0.08, delay:0.25, cooldown:0, volume:0.6 }); },
    // no real recording of an atomic blast: the howitzer and a far artillery shot slowed right down underneath the big boom
    nuke() { play('howitzer', { rate:0.45, vary:0, cooldown:0, volume:1.6 }); play('artillery', { rate:0.5, vary:0, delay:0.1, cooldown:0, volume:1.2 }); },
    plane() { play('plane', { vary:0.05, cooldown:1.5 }); },
    flyby() { play('flyby', { vary:0.05, cooldown:3 }); },
    tank() { play('tank', { vary:0.05, cooldown:1.2 }); },
    ship() { play('ship', { vary:0.03, cooldown:1.5 }); },
    radio() { play('radio', { vary:0.02, cooldown:0.8 }); },
    signal() { play('signal', { vary:0, cooldown:2 }); },
    siren() { play('siren', { vary:0, cooldown:20 }); },
    card() { play('card', { vary:0.05 }); },
    draw() { play('draw', { vary:0.05 }); },
    shuffle() { play('shuffle'); },
    coins() { play('coins', { vary:0.05 }); },
    paper() { play('paper'); },
    error() { play('error', { bus:'ui' }); },
    open() { play('open', { bus:'ui', cooldown:0.08, vary:0 }); },
    close() { play('close', { bus:'ui', cooldown:0.08 }); },
    build() { play('build', { vary:0.08 }); },
    factory() { play('factory'); },
    fort() { play('fort'); },
    stinger() { play('stinger', { cooldown:0.6 }); },
    confirm() { play('confirm', { bus:'ui' }); },
    victory() { play('victory'); setTimeout(() => play('fanfare'), 700); },
    defeat() { play('defeat'); },
    toggleMusic() {
      init(); if (!lib) return false;
      music = !music; persist();
      if (music && on) startMusic(); else stopMusic();
      return music;
    },
  };
  // ---- streamed music ----
  let tracks = null, cur = -1, playing = false;
  function setupTracks() {
    const ac = lib.ctx;
    tracks = MUSIC.map(m => {
      const el = new Audio(m.src); el.preload = 'none';
      const g = ac.createGain(); g.gain.value = 0.0001;
      try { ac.createMediaElementSource(el).connect(g); g.connect(lib.buses.music); } catch (e) { el.volume = m.volume; }
      el.addEventListener('ended', () => { if (playing) next(); });
      return { el, g, volume:m.volume };
    });
  }
  function fade(t, to, secs) { const ac = lib.ctx, now = ac.currentTime; t.g.gain.cancelScheduledValues(now); t.g.gain.setValueAtTime(Math.max(0.0001, t.g.gain.value), now); t.g.gain.exponentialRampToValueAtTime(Math.max(0.0001, to), now + secs); }
  function next() {
    cur = (cur + 1) % tracks.length;
    const t = tracks[cur]; t.el.currentTime = 0;
    fade(t, t.volume, 2.5);
    const p = t.el.play(); if (p && p.catch) p.catch(() => {});
  }
  function startMusic() {
    if (playing) return;
    if (lib.ctx.state !== 'running') lib.ctx.resume();
    if (!tracks) setupTracks();
    playing = true;
    if (cur >= 0 && tracks[cur].el.currentTime > 0 && !tracks[cur].el.ended) { const t = tracks[cur]; fade(t, t.volume, 1.5); const p = t.el.play(); if (p && p.catch) p.catch(() => {}); }
    else next();
  }
  function stopMusic() {
    if (!playing || !tracks) { playing = false; return; }
    playing = false;
    const t = tracks[cur]; fade(t, 0.0001, 1.2);
    setTimeout(() => { if (!playing) t.el.pause(); }, 1300);
  }
  return api;
})();
