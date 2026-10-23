# CLAUDE.md — Iron Dominion 1936

Browser grand-strategy game of WWII Europe (1936–1950). Static site, no build step, served by GitHub Pages from `main`. Single player, hot-seat, and online multiplayer (PeerJS). See `README.md` for the player-facing overview.

## Working with the owner
- Push finished, tested work **straight to `main`** (the owner asked for this; the live site updates from it). Ship in playable steps, never leave `main` broken.
- Fix bugs you come across and improve features as you go — the owner has given creative freedom, but propose large new directions before building them.
- **When you add or change a player-facing system, update the tutorial** (`js/ui/tutorial.js`), the field manual tips (`TIPS` in `js/ui/inbox.js`) and the README feature list.
- Audio must come from the owner's sound library **jupixels/game-sounds** (Kenney CC0) via its `sfx.js` — see "Sound" below. Don't synthesize new effects unless the library has nothing that fits, and say so.

## Run and test
```bash
python3 -m http.server 8765            # then open http://localhost:8765 (fetch/audio/multiplayer need a server)
node tests/sim.js 1936,1939,1941,1944 168 7   # AI-vs-AI campaigns: crashes, invariants, who wins
node tests/trace.js 1941 60 7 GER,SOV,ENG     # month-by-month national stats
node tests/play.js | tests/mp.js | tests/hot.js | tests/tutorial.js | tests/end.js   # Playwright, needs the server running
```
Playwright scripts use `/opt/npm-tools/node_modules/playwright` and Chromium at `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`; adjust the paths if your environment differs. Env: `SC=1941 TAG=SOV MONTHS=4 node tests/play.js`, `OUT=<dir>` saves screenshots, `MOBILE=1 W=390 H=844` for phone layout. Before pushing, at minimum run `sim.js` and `play.js`, plus `mp.js` if you touched networking and `tutorial.js` if you touched the UI or tutorial. Missing-sound 404s are not errors; page errors are.

## Architecture
Classic `<script>` files sharing one global scope, loaded in the order listed in `index.html` (order matters — later files use earlier globals). No modules, no bundler.

- `data/map.js` — generated map geometry (`MAP`: 234 provinces, adjacency, borders, RLE id raster). Don't hand-edit.
- `js/core/` — **the simulation. Must stay DOM-free** so it runs in Node (`tests/load.js` concatenates these files into a VM).
  - `util.js` seeded `rnd()` (state in `G.rs`), `Hooks` event bus, `notify()`/`sfx()`.
  - `data.js` all static catalogs: `NATDEF`, `UNIT`, `TECHS`, `FOCUS`, `CARDS`, `GENERALS`, `SEA`, `RESOURCES`, `ACH`, `SCENARIOS`, `MODES`.
  - `map.js` `PROV`/`ID`/sea zones/resources/weather flags. `state.js` `G`, accessors, unit-stack helpers, `newGame()`.
  - `economy.js` income, oil/steel, building, research, focus. `military.js` sea control, supply, air, generals, `battle()`, capture/capitulation, naval war. `diplomacy.js` war, factions, peace, pacts, inbox. `systems.js` medals, visibility, cards, spies, home front, agendas, decisions. `events.js` historical events. `orders.js` **`doCommand(tag, cmd, mode)`** — the single entry point for every player action. `ai.js`, `scenario.js` (1939/41/44 starts replay history), `turn.js` `endMonth()` + victory.
- `js/ui/` — `render.js` (canvas map, counters, fog, weather), `icons.js` (SVG icons + flags), `fx.js` (VFX + frame loop), `sound.js`, `hud.js` (top bar, dossier, cards, selection, tooltips), `panels.js` (8 drawer tabs), `inbox.js` (newspapers/decisions, reports, end screen, timelapse, help), `input.js`, `tutorial.js`, `menu.js` (menus, setup, lobby), `main.js` (**`Ctl` controller**, save/load, boot).
- `js/net/net.js` — multiplayer. `js/vendor/` — `peerjs.min.js`, `sfx.js` (third-party; don't edit).

### Core rules (break these and multiplayer, saves or tests break)
1. **All state lives in `G` and must be plain JSON** (it is saved to localStorage and sent over the network). No functions, Sets, or class instances in `G` (`G.warSet` is rebuilt by `rebuildWarSet()` and stripped by `serial()`). Events in the inbox are referenced by id, not by object.
2. **Every player action goes through `Ctl.act({c:...})` → `doCommand()`**. Add new actions as a `case` in `doCommand` with validation, never by mutating `G` from UI code. The UI calls `Ctl.act`; the host runs client commands through the same function.
3. **Core code uses `rnd()`, UI code uses `Math.random()`** (keeps games reproducible from `G.seed`; the daily challenge depends on it).
4. **Core never touches the DOM.** It reports with `Hooks.emit(...)`/`notify(to, …)`/`sfx(name, to)`. `to` is a nation tag or `'*'`; the UI shows it only if `to === ME`. The MP host forwards selected hooks to clients (`Hooks.on('*')` in `net.js`).
5. Humans: `G.humans[tag] = {name, dead?, away?}`. Use `isHuman()`, `liveHuman()` (not dead, not away — away players are run by the AI). `ME` is the nation this screen shows (`null` = spectator). Never assume a single player.
6. Save format is versioned (`G.v = 4`, key `iron-dominion-v4`). If you change `G`'s shape incompatibly, bump the version or migrate in `adopt()`.

### Controller modes (`Ctl.mode`)
`sp` single player · `hot` hot-seat (sequential, `G.hs` = whose turn, pass screen hides the map) · `host` / `client` online (simultaneous: attacks are **queued** as `G.orders` and resolved in `resolveOrders()` at month end; armies ordered into each other fight a meeting engagement) · `watch` spectator. `Ctl.canAct()` gates input.

### Multiplayer protocol (`net.js`)
Host-authoritative. Transports: `'p2p'` (PeerJS, room id `iron-dominion-v4-<CODE>`) and `'local'` (BroadcastChannel between tabs — use this for tests). Client→host: `hello{name,token}`, `pick`, `cmd`, `ready`, `chat`, `hb`. Host→client: `welcome`, `lobby`, `state` (gzipped `G` + queued effects `ev`), `toast`, `chat`, `hb`. Heartbeats every 3 s; silent players are marked away after 12 s and the AI takes over; rejoining with the same `localStorage` token reclaims the nation. Host drop pauses the game (no host migration yet). Real internet play through the PeerJS cloud server has **not** been verified from the dev sandbox.

## How to add things
- **Unit type:** `UNIT` + `LAND`/`AIR`/`NAVY` in `data.js`, strength in `unitStrength()` (`military.js`), icon in `icons.js`, counter/dossier display, AI build mix in `aiBuild()`.
- **Tech / focus / card / spy op / decision / achievement:** add to its catalog in `data.js` (or `SPY_OPS` in `systems.js`), then its effect in `grantTech`-consumers / `completeFocus()` / `playCard()` / `spyOp()` / `enactDecision()`, and teach the AI to use it (`ai.js`).
- **Historical event:** append to `EVENTS` in `events.js` (`actor`, optional `tgt` + `topts`, `cond`, `opts[{t,e,f(chooser)}]`). Option functions must only mutate `G` through core helpers. If it predates a later start date, `applyScenario()` marks it done automatically.
- **Nation:** `NATDEF` needs `mp` (manpower — a past bug left every nation at 10k), `stab`, `u`, `flag`, `cap`; its provinces come from the map data.

## Balance notes
Tune with `tests/sim.js` / `trace.js` across several seeds. Current shape (seeds 3, 7): from 1936/1939 the Axis usually falls by ~1945; from 1941 the Eastern Front swings back and forth (graded supply, "Not one step back", General Winter, Siberian divisions); occasional Axis wins are fine. Key levers: loss rates in `battle()`, `supLevel()`, `OIL_BASE`, scenario `bolster()` numbers, AI `aggression`, partisan rates in `tickResistance()`.

## UI notes
- Look: dark "situation room" palette in `css/game.css` (original) + `css/revamp.css` (additions). Fonts: Big Shoulders Stencil (display), Barlow Semi Condensed (body), Cormorant SC (map), Special Elite (newspaper).
- Performance: static map layer is cached; only redraw it when `staticDirty`. Camera shake offsets the composite, never forces a static redraw. Use the cached glow/puff sprites in `fx.js`, keep particles under `MAX_PARTS`, and keep 60 fps during big battles (check with the frame timer in `tests/play.js`).
- Modals: close them with `closeModal()` — it also releases the newspaper queue (`flushInbox`), which otherwise stalls.
- Phone layout (≤820 px) is a supported target: rail moves to the bottom, resource labels hide, the card hand hides while a sheet is open. Check `MOBILE=1` screenshots after UI changes.

## Sound
`js/ui/sound.js` wraps `window.SFX` from `js/vendor/sfx.js` (copied unchanged from jupixels/game-sounds `lib/sfx.js`). Library files used live in `assets/sounds/<category>/` (copy only the MP3s you use, using `sounds.json` volumes as a guide); the original set is `assets/sfx/`. Library: `git clone --depth 1 https://github.com/jupixels/game-sounds` — read its `CATALOG.md` "Quick picks" first. Gunfire, siren and the music drone are synthesized because the library has no match. Credit Kenney.nl in the README when adding sounds.

## Ideas not yet built
Host migration and a "test connection" check for online play; end-of-month war report and single-player undo; mass AI-balance tuning per nation; PWA/offline install and save slots; online daily-challenge leaderboard (needs a backend); postwar peace conference; accessibility (colour-blind palette, text size, key rebinding); recorded music.
