# Iron Dominion 1936

A grand strategy game of the Second World War, in the browser. Play on the original **Europe** map (31 nations) or the **world** map (70 nations) — pick it on the main menu. Lead any nation from 1936 (or 1939, 1941, 1944) to 1950 — alone against the AI, in hot-seat with friends on one device, or online with a room code.

**Play:** open `index.html` through any static web server (GitHub Pages works as is). Opening the file directly from disk works for single player, but sounds and online play need a server.

## What's in the war
- **Two maps.** The original Europe map (234 provinces, the European war) is the default. The optional **world map** has 687 provinces on every continent in the style of the great strategy tables: terrain-shaded nation colours with mountain relief, crisp vector provinces that stay sharp at any zoom, rivers, lakes, sea lanes and curved country names. It wraps around the globe, has terrain, political, supply and resistance map modes, and clouds drift over it when you zoom out. Each map keeps its own saves, and the game reopens on the map you last played; online rooms switch joining players to the host's map. A radar-scope loading screen covers startup and map switches.
- **On the world map, the Pacific and Asian wars**: Japan, China, Manchukuo, the Communist Chinese, Mongolia and Siam; the Marco Polo Bridge, the Tripartite Pact, Indochina and Pearl Harbor. Britain's dominions and the Raj fight beside it; colonies rally to the Allies when their homeland falls. The United States is a full nation with its own army and fleets.
- **Armies** of infantry, artillery, mountain troops, armor and paratroopers; **air wings** that fight for superiority over every battle in range and bomb factories; **fleets** that sail two sea zones a month, contest the sea lanes, escort convoys, raid shipping and make landings possible.
- **Fighting from allied soil**: march or ship armies into an ally's provinces and they stay there as an expeditionary force under your command — the Americans in Britain, the Germans in Italy — defending beside their hosts and drawing their supply.
- **Convoys and overseas invasions**: ship an army up to four sea zones (five with Amphibious Doctrine) — New York to Normandy, San Francisco to Hawaii — and it comes ashore at month end. Enemy ships and U-boats on the route sink part of it; your battle squadrons escort it and add sealift. The route, the odds and the risk show before you commit, and convoys at sea can be recalled.
- **Fronts and army orders**: group a sector of your border into a front, give it Hold, Advance or Encircle and a general, and its divisions carry out the order every month — reserves march up from the interior and the front line moves with the fighting. Lines are drawn on the map in each front's colour.
- **Generals** with traits and promotions, **supply lines** from depots, entrenchment, veterancy, winter and mud.
- **Oil and steel**, a world market, blockades, stability and war weariness, occupation resistance and partisans. Ships, aircraft and tanks burn oil (half in peacetime); a dry tank weakens them in proportion to the shortfall, and idle ships can be decommissioned.
- **Diplomacy**: alliances fight each other's defensive wars, and **Call to war** asks your allies into a war you are fighting (human allies get to answer). Pacts, guarantees, ultimatums, peace terms; Japan joins the Axis without fighting Britain until Pearl Harbor, and a neutrality pact keeps Tokyo and Moscow apart.
- **A system of its own for each great power** (Plans → the nation's tab): Germany's War Economy (four mobilisation levels, the last needing total war); Soviet **evacuation** of threatened factories beyond the Urals; Britain's **Atlantic Lifeline** of convoyed imports and escort groups; American **mobilisation** that ramps with war and tension, plus Lend-Lease to one friend; Japan's **Oil Clock** and a fleet laid up at anchor; Italy's **regime support** and the armistice that switches sides; France's **Union Sacrée** and the option to fight on from Algiers instead of Vichy; China's **total resistance** and the United Front with the Communists.
- **National focus branches** for every great power, including the USA (Two-Ocean Navy, Liberty Ships, Arsenal of Democracy) and Japan (Kantai Kessen, Fuel Reserve, Kwantung Army, Southern Operation).
- **Strategy cards** (one a month; discard the ones you don't want), **spies**, **operations** with objectives, timed **research** in four branches, a **national focus tree** with branches for the great powers, alternate-history **Destiny** decisions (45 formable nations on the world map — Gran Colombia, the Arab Federation, the Danubian Federation, Benelux, the Great Qing, a free India and more — whose lands become your heartland when you form them), ~50 historical events, peace treaties, pacts, guarantees and ultimatums.
- **Situation reports** every January and July: six months of gains and losses, the sectors where you are outnumbered, fuel and supply warnings, and three recommendations from the chief of staff that jump you to the right place.
- **Secret agendas**, medals, a career rank, a daily challenge, an end-of-war timelapse and an **online leaderboard** (no account needed: post your score from the end screen, browse by map or today's challenge).
- **Install it as an app**: in Chrome or Edge, use the install icon in the address bar (or "Add to Home screen" on a phone). It opens in its own window and keeps working offline once loaded.

## Multiplayer
Host-authoritative over WebRTC (PeerJS, vendored in `js/vendor`), or between tabs of one browser for testing. Modes: Grand Campaign, Team War, Blitz (1939–42), Co-op. Simultaneous turns: everyone plans, attacks are queued and resolved together (armies that march into each other fight a meeting engagement). Dropped players are taken over by the AI until they rejoin.

## Online leaderboard setup (Google Firebase)
The leaderboard is off until it is connected to a Firestore database. It costs nothing on Firebase's free tier and needs no player accounts.
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) (Analytics can stay off).
2. **Build → Firestore Database → Create database** (production mode, any region).
3. **Firestore → Rules**: paste the contents of `firestore.rules` from this repo and **Publish**. They let anyone read the board and add one well-formed score, and nobody edit or delete one.
4. **Project settings → General → Your apps → Web (</>)**: register an app and copy `projectId` and `apiKey` into `js/net/leaderboard-config.js`. The web API key is a public identifier, not a secret; the rules protect the data.
5. Push to `main`. Scores appear under **Leaderboard** on the main menu. To clear spam, delete documents in the `scores` collection from the Firebase console.

## Code
- `js/core/` — the simulation, DOM-free (it reports through `Hooks`). Runs in Node for tests.
- `js/ui/` — rendering, effects, sound, panels, menus. `js/net/` — multiplayer.
- `data/map-europe.js` — the original Europe map; `data/map.js` — the world map, generated by `tools/worldmap/build.js` from Natural Earth data (see that file). `index.html` loads one of them, and the matching renderer (`js/ui/render-europe.js` or `js/ui/render.js`), from the menu choice. `assets/sfx/`, `assets/sounds/` — sound effects; `assets/music/` — music.
- `manifest.webmanifest`, `sw.js`, `icons/` — installable app (network-first service worker; the cache is only used offline).
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

The map-mode sound (`assets/sounds/map`) was generated with [ElevenLabs](https://elevenlabs.io) sound effects.

Map geography: [Natural Earth](https://www.naturalearthdata.com) (public domain), built into `data/map.js` by `tools/worldmap/build.js`.

Multiplayer networking: [PeerJS](https://peerjs.com) (MIT).
