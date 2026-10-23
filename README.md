# Iron Dominion 1936

A grand strategy game of the Second World War in Europe, in the browser. Lead any of 31 nations from 1936 (or 1939, 1941, 1944) to 1950 — alone against the AI, in hot-seat with friends on one device, or online with a room code.

**Play:** open `index.html` through any static web server (GitHub Pages works as is). Opening the file directly from disk works for single player, but sounds and online play need a server.

## What's in the war
- **Armies** of infantry, artillery, mountain troops, armor and paratroopers; **air wings** that fight for superiority over every battle in range and bomb factories; **fleets** that contest 11 sea zones, escort convoys, raid shipping and make landings possible.
- **Generals** with traits and promotions, **supply lines** from depots, entrenchment, veterancy, winter and mud.
- **Oil and steel**, a world market, blockades, stability and war weariness, occupation resistance and partisans.
- **Strategy cards** (one a month), **spies**, **operations** with objectives, timed **research** in four branches, a **national focus tree** with branches for the great powers, alternate-history **Destiny** decisions, ~50 historical events, peace treaties, pacts, guarantees and ultimatums.
- **Secret agendas**, medals, a career rank, a daily challenge and an end-of-war timelapse.

## Multiplayer
Host-authoritative over WebRTC (PeerJS, vendored in `js/vendor`), or between tabs of one browser for testing. Modes: Grand Campaign, Team War, Blitz (1939–42), Co-op. Simultaneous turns: everyone plans, attacks are queued and resolved together (armies that march into each other fight a meeting engagement). Dropped players are taken over by the AI until they rejoin.

## Code
- `js/core/` — the simulation, DOM-free (it reports through `Hooks`). Runs in Node for tests.
- `js/ui/` — rendering, effects, sound, panels, menus. `js/net/` — multiplayer.
- `data/map.js` — map geometry. `assets/sfx/`, `assets/sounds/` — sound effects; `assets/music/` — music.
- `tests/` — `node tests/sim.js` runs AI-vs-AI campaigns from every start date; the Playwright scripts drive the real page (`tests/play.js`, `tests/mp.js`, `tests/hot.js`).

## Credits
Sound effects: the original Iron Dominion set, plus CC0 sounds by [Kenney.nl](https://kenney.nl) from the game-sounds library (`assets/sounds`), played through its `sfx.js`.

Real recordings (`assets/sounds/ww2`, trimmed and levelled):
- Battle ambience: "Distant WW2 Gunfire Kent" by [Cheeseheadburger](https://freesound.org/people/Cheeseheadburger/sounds/170478/), CC BY 4.0
- Machine gun: "warfare_gunshots_machine_gun_burst_001" by [soundscalpel.com](https://freesound.org/people/soundscalpel.com/sounds/110622/), CC BY 3.0
- Warplane: "P-47 Flyby" by [Fight2FlyPhoto](https://freesound.org/people/Fight2FlyPhoto/sounds/143560/), CC BY 3.0
- Tank: "Sherman E8 (Easy 8) tank driving" by [nicStage](https://freesound.org/people/nicStage/sounds/368671/), CC BY 4.0
- Radio: "morse static" by [ERH](https://freesound.org/people/ERH/sounds/34418/), CC BY 4.0
- Rifle: Mosin-Nagant from "Gunshot Sounds" by [Tabasco](https://opengameart.org/content/gunshot-sounds), CC0
- Artillery and howitzers by [qubodup](https://freesound.org/people/qubodup/sounds/182822/) ([1](https://freesound.org/people/qubodup/sounds/161343/), [2](https://freesound.org/people/qubodup/sounds/161341/)), from US government footage, CC0
- Air-raid siren: "Air raid siren (Prague)" by [nooly](https://freesound.org/people/nooly/sounds/382611/), CC0
- Ship horn: "Fog Horn" by [qubodup](https://freesound.org/people/qubodup/sounds/181949/), CC0

Music (`assets/music`): "Lament of the War" by [Cethiel](https://opengameart.org/content/laments-of-the-war) and "Call to War" by [Umplix](https://opengameart.org/content/call-to-war), both CC0.

Multiplayer networking: [PeerJS](https://peerjs.com) (MIT).
