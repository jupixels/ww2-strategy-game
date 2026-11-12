'use strict';
/* ================= STATIC GAME DATA ================= */
// true on the world map, false on the original Europe map (the map data decides)
const WORLD = !!MAP.seas;
const REALM = WORLD ? 'the world' : 'Europe';
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TER = {
  p:{n:'Plains',d:1.0}, f:{n:'Forest',d:1.25}, h:{n:'Hills',d:1.3}, m:{n:'Mountains',d:1.6},
  d:{n:'Desert',d:1.0}, u:{n:'Urban',d:1.35}, s:{n:'Marsh',d:1.35}, t:{n:'Tundra',d:1.2}, j:{n:'Jungle',d:1.45}
};
const IDEO = {F:'Fascist',D:'Democratic',C:'Communist',N:'Non-aligned'};

/* ---------- units ---------- */
// land units live in provinces, air wings at airbases (provinces), fleets in sea zones
const LAND = ['inf','art','mtn','arm','par'];
const AIR = ['ftr','bmb'];
const NAVY = ['cap','sub'];
const UNIT = {
  inf:{n:'Infantry',  pl:'Infantry divisions', pp:8,  mp:10, st:0, oil:0, up:0,    atk:1.0, def:1.0, d:'The backbone of every army. Cheap and steady.'},
  art:{n:'Artillery', pl:'Artillery divisions', pp:12, mp:6,  st:2, oil:0, up:0,    atk:1.5, def:0.9, need:'art1', d:'Hits hard on the attack and grinds down forts.'},
  mtn:{n:'Mountaineers', pl:'Mountain divisions', pp:11, mp:10, st:0, oil:0, up:0, atk:1.0, def:1.1, need:'mtn', d:'+50% attack and +30% defense in mountains and hills.'},
  arm:{n:'Armor',     pl:'Armored divisions',   pp:22, mp:6,  st:3, oil:2, up:0.1,  atk:2.6, def:1.8, need:'arm1', d:'Spearheads. Weak in rough terrain and burns oil.'},
  par:{n:'Paratroopers', pl:'Airborne divisions', pp:16, mp:6, st:0, oil:1, up:0,  atk:1.2, def:0.9, need:'para', d:'Can drop on enemy provinces two steps away.'},
  ftr:{n:'Fighters',  pl:'Fighter wings',       pp:18, mp:2,  st:1, oil:1, up:0.08, d:'Win the skies: air superiority swings every battle in range.'},
  bmb:{n:'Bombers',   pl:'Bomber wings',        pp:24, mp:2,  st:2, oil:2, up:0.12, d:'Support attacks in range and bomb enemy factories.'},
  cap:{n:'Capital ships', pl:'Battle squadrons', pp:50, mp:4, st:8, oil:3, up:0.15, d:'Control the sea lanes, escort convoys and landings, bombard coasts. Each adds 2 divisions of sealift.'},
  sub:{n:'Submarines', pl:'U-boat flotillas',   pp:20, mp:2,  st:2, oil:1, up:0.05, d:'Raid enemy convoys and cut their income.'},
};
const AIR_RANGE = 430;   // world units an air wing can reach from its base
const PARA_RANGE = 2;    // provinces

/* ---------- nations ---------- */
const NATDEF = {
  GER:{n:'Germany',a:'German',c:'#5f6973',i:'F',mp:120,cap:'Berlin',major:1,stab:70,stars:2,
       u:{inf:38,arm:4,art:6,ftr:6,bmb:4},navy:{NSE:[2,4],BAL:[1,1]},tech:['inf1','art1','arm1','ftr1','bmb1','ind1','cap1','sub1','mobile'],
       flag:{t:'h',c:['#151515','#f2f2f2','#d02a2a']},
       brief:'The Reich is rearming fast. Ruthless, industrial and surrounded. Strike before the encirclement closes.'},
  ENG:{n:'United Kingdom',a:'British',c:'#b4464a',i:'D',mp:90,cap:'London',major:1,stab:75,stars:2,
       u:{inf:24,arm:1,art:4,ftr:6,bmb:3},navy:{ATL:[5,2],NSE:[3,1],WMD:[2,0],EMD:[2,1]},tech:['inf1','art1','ftr1','bmb1','ind1','cap1','sub1'],
       flag:{t:'uk'},
       brief:'An island empire spread from Belfast to Cairo. The Channel protects you; the colonies stretch you thin.'},
  FRA:{n:'France',a:'French',c:'#3e66ad',i:'D',mp:90,cap:'Paris',major:1,stab:55,stars:3,
       u:{inf:44,arm:2,art:8,ftr:4,bmb:2},navy:{ATL:[3,3],WMD:[3,3]},tech:['inf1','art1','arm1','ind1','cap1','sub1','depth'],
       flag:{t:'v',c:['#24479a','#f2f2f2','#d6282e']},
       brief:'The largest army in the West sits behind the Maginot Line. Can it move faster than 1940?'},
  ITA:{n:'Italy',a:'Italian',c:'#4d8b4c',i:'F',mp:90,cap:'Rome',major:1,stab:60,stars:3,
       u:{inf:30,arm:1,art:4,mtn:2,ftr:5,bmb:3},navy:{WMD:[3,4],EMD:[3,4]},tech:['inf1','art1','mtn','ftr1','bmb1','cap1','sub1'],
       flag:{t:'v',c:['#2a8a3a','#f2f2f2','#d02a2a']},
       brief:'Mussolini dreams of Mare Nostrum. Libya, the Alps and the Balkans all lie within reach.'},
  SOV:{n:'Soviet Union',a:'Soviet',c:'#8f2b2b',i:'C',mp:260,cap:'Moscow',major:1,stab:65,stars:1,
       u:{inf:90,arm:6,art:8,ftr:6,bmb:4},navy:{BAL:[1,3],BLK:[1,3],ARC:[0,1]},tech:['art1','arm1','ind1','ftr1','bmb1','sub1','mass'],
       flag:{t:'sov'},
       brief:'A vast land of endless manpower and harsh winters. Slow to wake, impossible to stop once roused.'},
  POL:{n:'Poland',a:'Polish',c:'#c46b95',i:'N',mp:70,cap:'Warsaw',stab:60,stars:4,u:{inf:26,art:2,ftr:2},flag:{t:'h',c:['#f2f2f2','#dc143c']},tech:['inf1'],brief:'Squeezed between two giants. Survive 1939 and rewrite history.'},
  SPA:{n:'Spain',a:'Spanish',c:'#d6a63a',i:'N',mp:50,cap:'Madrid',stab:35,stars:4,u:{inf:16,ftr:1},navy:{ATL:[1,1]},flag:{t:'h',c:['#c8102e','#f2c200','#6b2c86']},brief:'A civil war is coming. Pick a side, then pick a target.'},
  TUR:{n:'Turkey',a:'Turkish',c:'#3d9a90',i:'N',mp:70,cap:'Ankara',stab:60,stars:3,u:{inf:18,mtn:2,ftr:1},navy:{BLK:[1,1]},flag:{t:'tur'},brief:'Guardian of the Straits. Revive the Ottoman glory if you dare.'},
  SWE:{n:'Sweden',a:'Swedish',c:'#58a4d4',i:'D',mp:35,cap:'Stockholm',stab:75,stars:4,u:{inf:9,ftr:1},navy:{BAL:[1,0]},tech:['ind1'],flag:{t:'nordic',c:['#2a6bb0','#f2c200']},brief:'Iron ore and neutrality. Or the Kalmar Union reborn?'},
  NOR:{n:'Norway',a:'Norwegian',c:'#b06e58',i:'D',mp:20,cap:'Oslo',stab:70,stars:5,u:{inf:5},flag:{t:'nordic',c:['#ba0c2f','#f2f2f2','#1d3f8a']}},
  FIN:{n:'Finland',a:'Finnish',c:'#d9d6c6',i:'D',mp:30,cap:'Helsinki',stab:70,stars:5,u:{inf:9,mtn:1},tech:['inf1'],flag:{t:'nordic',c:['#f2f2f2','#1d3f8a']},brief:'Small, snowbound and very hard to kill.'},
  DEN:{n:'Denmark',a:'Danish',c:'#a8456a',i:'D',mp:15,cap:'Copenhagen',stab:70,stars:5,u:{inf:3},flag:{t:'nordic',c:['#c8102e','#f2f2f2']}},
  HOL:{n:'Netherlands',a:'Dutch',c:'#e0893a',i:'D',mp:30,cap:'Amsterdam',stab:70,stars:5,u:{inf:8,ftr:1},flag:{t:'h',c:['#ae1c28','#f2f2f2','#21468b']}},
  BEL:{n:'Belgium',a:'Belgian',c:'#cdb94a',i:'D',mp:30,cap:'Brussels',stab:65,stars:5,u:{inf:10,art:1},flag:{t:'v',c:['#151515','#f2d200','#e02a2a']}},
  SWI:{n:'Switzerland',a:'Swiss',c:'#9c3d4f',i:'D',mp:25,cap:'Bern',stab:85,stars:4,u:{inf:7,mtn:2},tech:['mtn'],flag:{t:'swiss'},brief:'A mountain fortress. Nobody attacks the Swiss. Yet.'},
  CZE:{n:'Czechoslovakia',a:'Czechoslovak',c:'#4ea0a6',i:'D',mp:45,cap:'Prague',stab:60,stars:4,u:{inf:16,art:2,arm:1,ftr:1},tech:['inf1','art1','arm1'],flag:{t:'cze'},brief:'Škoda works, mountain forts, and a deadly appointment in Munich.'},
  AUS:{n:'Austria',a:'Austrian',c:'#e1d6bc',i:'N',mp:20,cap:'Vienna',stab:45,stars:5,u:{inf:5},flag:{t:'h',c:['#c8102e','#f2f2f2','#c8102e']}},
  HUN:{n:'Hungary',a:'Hungarian',c:'#a87b50',i:'N',mp:30,cap:'Budapest',stab:55,stars:4,u:{inf:8,ftr:1},flag:{t:'h',c:['#ce2939','#f2f2f2','#477050']}},
  ROM:{n:'Romania',a:'Romanian',c:'#c4ad3a',i:'N',mp:45,cap:'Bucharest',stab:50,stars:4,u:{inf:16,ftr:1},flag:{t:'v',c:['#002b7f','#fcd116','#ce1126']},brief:'Oil fields everyone wants.'},
  YUG:{n:'Yugoslavia',a:'Yugoslav',c:'#6a5aae',i:'N',mp:45,cap:'Belgrade',stab:45,stars:4,u:{inf:16},flag:{t:'h',c:['#21468b','#f2f2f2','#c8102e']}},
  BUL:{n:'Bulgaria',a:'Bulgarian',c:'#5c8a3c',i:'N',mp:25,cap:'Sofia',stab:55,stars:4,u:{inf:8},flag:{t:'h',c:['#f2f2f2','#00966e','#d62612']}},
  GRE:{n:'Greece',a:'Greek',c:'#79b3da',i:'N',mp:30,cap:'Athens',stab:55,stars:4,u:{inf:10,mtn:1},flag:{t:'gre'},brief:'Byzantium sleeps beneath Constantinople. Wake it.'},
  ALB:{n:'Albania',a:'Albanian',c:'#9a5a8a',i:'N',mp:8,cap:'Tirana',stab:45,stars:5,u:{inf:2},flag:{t:'h',c:['#e41e20']}},
  IRE:{n:'Ireland',a:'Irish',c:'#7bbf5c',i:'D',mp:12,cap:'Dublin',stab:70,stars:5,u:{inf:3},flag:{t:'v',c:['#169b62','#f2f2f2','#ff883e']}},
  ICE:{n:'Iceland',a:'Icelandic',c:'#8eb0c6',i:'D',mp:3,cap:'Reykjavík',stab:80,stars:5,u:{inf:1},flag:{t:'nordic',c:['#02529c','#f2f2f2','#dc1e35']}},
  EST:{n:'Estonia',a:'Estonian',c:'#5e80a2',i:'N',mp:10,cap:'Tallinn',stab:60,stars:5,u:{inf:3},flag:{t:'h',c:['#0072ce','#151515','#f2f2f2']}},
  LAT:{n:'Latvia',a:'Latvian',c:'#8b6b4c',i:'N',mp:10,cap:'Riga',stab:60,stars:5,u:{inf:3},flag:{t:'h',c:['#9e3039','#f2f2f2','#9e3039'],w:[2,1,2]}},
  LIT:{n:'Lithuania',a:'Lithuanian',c:'#b9a24e',i:'N',mp:10,cap:'Kaunas',stab:60,stars:5,u:{inf:3},flag:{t:'h',c:['#fdb913','#006a44','#c1272d']}},
  IRQ:{n:'Iraq',a:'Iraqi',c:'#c09060',i:'N',mp:15,cap:'Baghdad',stab:40,stars:5,u:{inf:4},flag:{t:'h',c:['#151515','#f2f2f2','#2a8a3a']}},
  PER:{n:'Iran',a:'Iranian',c:'#9b70c2',i:'N',mp:30,cap:'Tehran',stab:55,stars:4,u:{inf:8},flag:{t:'h',c:['#239f40','#f2f2f2','#da0000']}},
  SAU:{n:'Saudi Arabia',a:'Saudi',c:'#7d9c4c',i:'N',mp:15,cap:'Riyadh',stab:60,stars:5,u:{inf:4},flag:{t:'h',c:['#106b3a']}},
  POR:{n:'Portugal',a:'Portuguese',c:'#2e7a51',i:'N',mp:20,cap:'Lisbon',stab:65,stars:5,u:{inf:5},flag:{t:'v',c:['#046a38','#da291c'],w:[2,3]}},
  VIC:{n:'Vichy France',a:'Vichy',c:'#8794b8',i:'F',mp:10,cap:'Marseille',stab:40,stars:5,hidden:1,flag:{t:'v',c:['#24479a','#f2f2f2','#d6282e']}},
  // ---- the wider world ----
  USA:{n:'United States',a:'American',c:'#6f93c4',i:'D',mp:200,cap:'Washington',major:1,stab:70,stars:2,
       u:{inf:26,art:4,arm:2,ftr:6,bmb:4},navy:{WAT:[4,2],EPA:[5,2],CPA:[4,2]},tech:['inf1','art1','ftr1','bmb1','ind1','cap1','sub1','amph'],
       flag:{t:'usa'},
       brief:'The arsenal of democracy, still asleep behind two oceans. Wake it early, or let the world come to you.'},
  JAP:{n:'Japan',a:'Japanese',c:'#d8c48c',i:'F',mp:130,cap:'Tokyo',major:1,stab:65,stars:2,
       u:{inf:24,art:4,arm:1,mtn:2,ftr:6,bmb:4},navy:{ECS:[4,2],PHS:[5,3],SOJ:[1,2]},tech:['inf1','art1','ftr1','bmb1','cap1','sub1','ind1','amph'],
       flag:{t:'disc',c:['#f4f1ea','#bc002d']},
       brief:'An island empire with a great navy and no oil. China is the prize; the Indies are the fuel.'},
  CHI:{n:'China',a:'Chinese',c:'#5b6b8c',i:'N',mp:300,cap:'Nanjing',stab:35,stars:3,u:{inf:40,art:2,ftr:1},tech:['inf1'],flag:{t:'chi'},brief:'A vast, divided republic with endless manpower and little industry. Hold on long enough and the world will come to your aid.'},
  PRC:{n:'Communist China',a:'Communist Chinese',c:'#b5392c',i:'C',mp:30,cap:"Yan'an",stab:70,stars:5,u:{inf:6},flag:{t:'h',c:['#c8102e']}},
  MAN:{n:'Manchukuo',a:'Manchurian',c:'#a06c4a',i:'F',mp:30,cap:'Hsinking',stab:40,stars:5,u:{inf:8},flag:{t:'h',c:['#f2c200','#c8102e','#151515','#f2f2f2','#2a6bb0'],w:[6,1,1,1,1]}},
  MON:{n:'Mongolia',a:'Mongolian',c:'#8c6a8e',i:'C',mp:10,cap:'Ulan Bator',stab:60,stars:5,u:{inf:4},flag:{t:'v',c:['#c4272f','#015197','#c4272f']}},
  SIK:{n:'Sinkiang',a:'Sinkiang',c:'#a8936a',i:'N',mp:15,cap:'Urumqi',stab:40,stars:5,u:{inf:4},flag:{t:'h',c:['#2a6bb0','#f2f2f2','#c8102e']}},
  TIB:{n:'Tibet',a:'Tibetan',c:'#cdb886',i:'N',mp:5,cap:'Lhasa',stab:60,stars:5,u:{inf:2},flag:{t:'disc',c:['#c8102e','#f2c200']}},
  SIA:{n:'Siam',a:'Siamese',c:'#4f8fb3',i:'N',mp:30,cap:'Bangkok',stab:55,stars:4,u:{inf:8,ftr:1},flag:{t:'h',c:['#a51931','#f4f5f8','#2d2a4a','#f4f5f8','#a51931'],w:[1,1,2,1,1]}},
  CAN:{n:'Canada',a:'Canadian',c:'#a83f3f',i:'D',mp:45,cap:'Ottawa',stab:75,stars:4,u:{inf:6,ftr:1},navy:{WAT:[1,1]},tech:['inf1','ind1'],flag:{t:'ens',c:['#c8102e']},brief:'A dominion of the Crown with farms, factories and a long Atlantic coast.'},
  AST:{n:'Australia',a:'Australian',c:'#3e7c6c',i:'D',mp:30,cap:'Canberra',stab:75,stars:4,u:{inf:6,ftr:1},navy:{TAS:[1,1]},tech:['inf1'],flag:{t:'ens',c:['#012169']},brief:'The far end of the Empire. If Singapore falls, Japan is on your doorstep.'},
  NZL:{n:'New Zealand',a:'New Zealand',c:'#2c5579',i:'D',mp:10,cap:'Wellington',stab:80,stars:5,u:{inf:2},flag:{t:'ens',c:['#012169']}},
  SAF:{n:'South Africa',a:'South African',c:'#b2774c',i:'D',mp:20,cap:'Pretoria',stab:60,stars:5,u:{inf:4},tech:['inf1'],flag:{t:'h',c:['#e8701a','#f2f2f2','#00247d']}},
  RAJ:{n:'British Raj',a:'Indian',c:'#d39a45',i:'D',mp:160,cap:'Delhi',stab:50,stars:4,u:{inf:16,art:1},tech:['inf1'],flag:{t:'ens',c:['#c8102e']},brief:'The jewel in the Crown: millions of soldiers, if the independence movement allows it.'},
  MEX:{n:'Mexico',a:'Mexican',c:'#5f8f46',i:'D',mp:40,cap:'Mexico City',stab:55,stars:4,u:{inf:8},flag:{t:'v',c:['#006847','#f2f2f2','#ce1126']}},
  GUA:{n:'Guatemala',a:'Guatemalan',c:'#4f9ec4',i:'N',mp:6,cap:'Guatemala',stab:50,stars:5,u:{inf:2},flag:{t:'v',c:['#4997d0','#f2f2f2','#4997d0']}},
  HON:{n:'Honduras',a:'Honduran',c:'#5aa0b8',i:'N',mp:5,cap:'Tegucigalpa',stab:45,stars:5,u:{inf:2},flag:{t:'h',c:['#0073cf','#f2f2f2','#0073cf']}},
  ELS:{n:'El Salvador',a:'Salvadoran',c:'#3c5fa8',i:'N',mp:5,cap:'San Salvador',stab:45,stars:5,u:{inf:2},flag:{t:'h',c:['#0f47af','#f2f2f2','#0f47af']}},
  NIC:{n:'Nicaragua',a:'Nicaraguan',c:'#6fa2d6',i:'N',mp:5,cap:'Managua',stab:45,stars:5,u:{inf:2},flag:{t:'h',c:['#0067c6','#f2f2f2','#0067c6']}},
  COS:{n:'Costa Rica',a:'Costa Rican',c:'#7f6aa8',i:'D',mp:4,cap:'San José',stab:65,stars:5,u:{inf:1},flag:{t:'h',c:['#002b7f','#f2f2f2','#ce1126','#f2f2f2','#002b7f'],w:[1,1,2,1,1]}},
  PAN:{n:'Panama',a:'Panamanian',c:'#9c4f6a',i:'D',mp:4,cap:'Panama',stab:55,stars:5,u:{inf:1},flag:{t:'v',c:['#f2f2f2','#d21034']}},
  CUB:{n:'Cuba',a:'Cuban',c:'#4a74a8',i:'N',mp:12,cap:'Havana',stab:45,stars:5,u:{inf:3},flag:{t:'h',c:['#002a8f','#f2f2f2','#002a8f','#f2f2f2','#002a8f']}},
  HAI:{n:'Haiti',a:'Haitian',c:'#7b5b9a',i:'N',mp:6,cap:'Port-au-Prince',stab:40,stars:5,u:{inf:2},flag:{t:'h',c:['#00209f','#d21034']}},
  DOM:{n:'Dominican Republic',a:'Dominican',c:'#c35b5b',i:'N',mp:6,cap:'Santo Domingo',stab:50,stars:5,u:{inf:2},flag:{t:'h',c:['#002d62','#ce1126']}},
  COL:{n:'Colombia',a:'Colombian',c:'#d9c045',i:'D',mp:25,cap:'Bogotá',stab:55,stars:5,u:{inf:5},flag:{t:'h',c:['#fcd116','#fcd116','#003893','#ce1126']}},
  VEN:{n:'Venezuela',a:'Venezuelan',c:'#b98a3c',i:'N',mp:18,cap:'Caracas',stab:50,stars:5,u:{inf:4},flag:{t:'h',c:['#f4c300','#00247d','#cf142b']}},
  ECU:{n:'Ecuador',a:'Ecuadorian',c:'#c4b25a',i:'N',mp:10,cap:'Quito',stab:40,stars:5,u:{inf:3},flag:{t:'h',c:['#ffdd00','#ffdd00','#034ea2','#ed1c24']}},
  PRU:{n:'Peru',a:'Peruvian',c:'#c26a6a',i:'N',mp:18,cap:'Lima',stab:50,stars:5,u:{inf:5},flag:{t:'v',c:['#d91023','#f2f2f2','#d91023']}},
  BOL:{n:'Bolivia',a:'Bolivian',c:'#a8a04c',i:'N',mp:10,cap:'La Paz',stab:40,stars:5,u:{inf:3},flag:{t:'h',c:['#d52b1e','#f9e300','#007934']}},
  PAR:{n:'Paraguay',a:'Paraguayan',c:'#6f86b8',i:'N',mp:8,cap:'Asunción',stab:45,stars:5,u:{inf:3},flag:{t:'h',c:['#d52b1e','#f2f2f2','#0038a8']}},
  URG:{n:'Uruguay',a:'Uruguayan',c:'#7fb0d8',i:'D',mp:6,cap:'Montevideo',stab:65,stars:5,u:{inf:2},flag:{t:'h',c:['#f2f2f2','#0038a8','#f2f2f2','#0038a8','#f2f2f2']}},
  ARG:{n:'Argentina',a:'Argentine',c:'#8fc3e3',i:'N',mp:40,cap:'Buenos Aires',stab:55,stars:4,u:{inf:8,ftr:1},navy:{PAT:[2,1]},flag:{t:'h',c:['#74acdf','#f2f2f2','#74acdf']}},
  CHL:{n:'Chile',a:'Chilean',c:'#b4456a',i:'D',mp:15,cap:'Santiago',stab:60,stars:5,u:{inf:4},navy:{SEP:[1,1]},flag:{t:'h',c:['#f2f2f2','#d52b1e']}},
  BRA:{n:'Brazil',a:'Brazilian',c:'#3f9e5a',i:'N',mp:80,cap:'Rio de Janeiro',stab:50,stars:4,u:{inf:12,ftr:1},navy:{BRZ:[1,0]},flag:{t:'bra'},brief:'A giant of coffee and rubber under the Estado Novo. Which way will Vargas lean?'},
  LIB:{n:'Liberia',a:'Liberian',c:'#8e6aa0',i:'N',mp:5,cap:'Monrovia',stab:45,stars:5,u:{inf:1},flag:{t:'h',c:['#bf0a30','#f2f2f2','#bf0a30','#f2f2f2','#bf0a30']}},
  ETH:{n:'Ethiopia',a:'Ethiopian',c:'#6e9a46',i:'N',mp:30,cap:'Addis Ababa',stab:40,stars:5,u:{inf:8},flag:{t:'h',c:['#078930','#fcdd09','#da121a']},brief:'The last free empire of Africa, already at war with Italy.'},
  YEM:{n:'Yemen',a:'Yemeni',c:'#9c7a5a',i:'N',mp:8,cap:"Sana'a",stab:50,stars:5,u:{inf:2},flag:{t:'h',c:['#c8102e']}},
  OMN:{n:'Oman',a:'Omani',c:'#b07a5f',i:'N',mp:4,cap:'Muscat',stab:55,stars:5,u:{inf:1},flag:{t:'h',c:['#c8102e']}},
  AFG:{n:'Afghanistan',a:'Afghan',c:'#7a8f5f',i:'N',mp:20,cap:'Kabul',stab:45,stars:5,u:{inf:4,mtn:1},flag:{t:'v',c:['#151515','#c8102e','#007a36']}},
  NEP:{n:'Nepal',a:'Nepalese',c:'#a65b6e',i:'N',mp:8,cap:'Kathmandu',stab:60,stars:5,u:{inf:2,mtn:1},flag:{t:'h',c:['#dc143c','#003893']}},
};
const MAJORS = ['GER','ENG','FRA','ITA','SOV','USA','JAP'];
// capitals of the great powers: hold them all to win outright
const WORLD_CAPS = WORLD ? ['Berlin','London','Paris','Rome','Moscow','Washington','Tokyo'] : ['Berlin','London','Paris','Rome','Moscow'];

/* ---------- generals ---------- */
const TRAITS = {
  panzer:   {n:'Panzer leader', d:'Armor in this army attacks at +20%.'},
  offensive:{n:'Aggressive',    d:'+15% attack.'},
  defensive:{n:'Defensive',     d:'+20% defense.'},
  desert:   {n:'Desert fox',    d:'+25% attack and defense in desert.'},
  winter:   {n:'Winter expert', d:'Ignores winter and mud; +15% in forest and tundra.'},
  mountain: {n:'Mountaineer',   d:'+20% attack and defense in mountains and hills.'},
  logistics:{n:'Quartermaster', d:'This army never suffers supply penalties.'},
  urban:    {n:'Street fighter',d:'+25% defense in cities.'},
  amphib:   {n:'Amphibious',    d:'Naval landings fight at full strength.'},
};
const GENERALS = {
  GER:[['Heinz Guderian','panzer',1936],['Erich von Manstein','offensive',1936],['Gerd von Rundstedt','logistics',1936],['Erwin Rommel','desert',1939],['Albert Kesselring','defensive',1940],['Walter Model','defensive',1941]],
  ENG:[['Archibald Wavell','desert',1936],['Harold Alexander','defensive',1936],['Bernard Montgomery','offensive',1939],['Richard O\'Connor','panzer',1940],['Miles Dempsey','amphib',1942]],
  FRA:[['Maurice Gamelin','defensive',1936],['Charles de Gaulle','panzer',1937],['Alphonse Juin','mountain',1939],['Jean de Lattre','offensive',1940],['Philippe Leclerc','amphib',1942]],
  ITA:[['Italo Balbo','desert',1936],['Giovanni Messe','defensive',1936],['Ugo Cavallero','logistics',1937],['Alessandro Pirzio Biroli','mountain',1938]],
  SOV:[['Georgy Zhukov','offensive',1936],['Konstantin Rokossovsky','panzer',1936],['Ivan Konev','winter',1938],['Vasily Chuikov','urban',1940],['Nikolai Vatutin','offensive',1941],['Aleksandr Vasilevsky','logistics',1942]],
  FIN:[['Carl Gustaf Mannerheim','winter',1936]], POL:[['Władysław Anders','offensive',1936],['Edward Rydz-Śmigły','defensive',1936]],
  SPA:[['Francisco Franco','offensive',1936],['Vicente Rojo','defensive',1936]], GRE:[['Alexandros Papagos','mountain',1936]],
  ROM:[['Ion Antonescu','defensive',1936]], TUR:[['Fevzi Çakmak','mountain',1936]], SWI:[['Henri Guisan','mountain',1936]],
  YUG:[['Draža Mihailović','mountain',1936]], HUN:[['Gusztáv Jány','defensive',1936]], CZE:[['Ludvík Krejčí','defensive',1936]],
  SWE:[['Olof Thörnell','winter',1936]], NOR:[['Otto Ruge','winter',1936]], BUL:[['Konstantin Lukash','defensive',1936]],
  USA:[['Douglas MacArthur','amphib',1936],['George Marshall','logistics',1936],['George Patton','panzer',1939],['Dwight Eisenhower','logistics',1941],['Omar Bradley','defensive',1942],['Alexander Vandegrift','amphib',1942]],
  JAP:[['Tomoyuki Yamashita','offensive',1936],['Masaharu Homma','amphib',1937],['Hitoshi Imamura','defensive',1938],['Tadamichi Kuribayashi','defensive',1941],['Renya Mutaguchi','offensive',1942]],
  CHI:[['Chiang Kai-shek','defensive',1936],['Bai Chongxi','offensive',1936],['Xue Yue','defensive',1937]], PRC:[['Zhu De','offensive',1936],['Peng Dehuai','offensive',1936]],
  CAN:[['Harry Crerar','defensive',1936]], AST:[['Thomas Blamey','defensive',1936]], NZL:[['Bernard Freyberg','offensive',1936]], RAJ:[['Claude Auchinleck','defensive',1936]],
  SAF:[['Dan Pienaar','desert',1936]], MAN:[['Zhang Jinghui','defensive',1936]], SIA:[['Plaek Phibunsongkhram','offensive',1936]], BRA:[['João Batista Mascarenhas','mountain',1936]],
  ETH:[['Ras Imru Haile Selassie','mountain',1936]], MEX:[['Lázaro Cárdenas','defensive',1936]],
};
const GEN_NAMES = ['Col. Varga','Gen. Novak','Gen. Petrov','Gen. Haas','Gen. Moreau','Gen. Silva','Gen. Kowal','Gen. Dimitrov','Gen. Lindqvist','Gen. Rossi','Gen. Brennan','Gen. Popescu'];
const GEN_TRAITS = Object.keys(TRAITS);

/* ---------- technology: nine branches, 1936–1954 (the post-war act runs to 1955), small steps paid month by month ----------
   Each tech's fx are modifiers summed per nation by tm(t, key) (state.js):
     inf/art/ftr/bmb/navy/sub  % strength of that arm      arm/armD  % armor attack / defense
     def/atk  % defense / attack everywhere (doctrine)      dig  +% per entrenchment level
     aa  % fighters when defending                          bmbR  % bomber range
     asw  cuts enemy submarine raiding on you               lift/hop  sealift divisions / convoy range
     ind  % production    oil/steel  per month    mp  % manpower    res  % research speed
     rkt  % V-weapon damage    bombcd  months off the atomic-strike cooldown
   The original 34 keys are kept (saves, focuses, events and starting techs use them); some also keep a special
   effect checked by name (unlocks, radar's sight, blitz, mass assault, grand battleplan, combined arms, amph,
   rocket, atom, bomb). */
const TECH_ROWS_DEF = [['inf','Infantry'],['arm','Armor'],['art','Artillery'],['ftr','Fighters'],['bmb','Bombers'],['nav','Navy'],['doc','Doctrine'],['ind','Industry'],['sci','Science']];
const TECHS = [
  // infantry
  {k:'inf1',     r:'inf', n:'Improved Rifles',          y:1936, m:3, fx:{inf:.05}},
  {k:'mtn',      r:'inf', n:'Mountain Warfare',         y:1936, m:3, d:'Unlocks mountain divisions.'},
  {k:'inf_mg',   r:'inf', n:'Light Machine Guns',       y:1937, m:3, req:'inf1', fx:{inf:.05}},
  {k:'para',     r:'inf', n:'Airborne Troops',          y:1938, m:3, req:'inf1', d:'Unlocks paratroopers.'},
  {k:'inf_mortar',r:'inf',n:'Infantry Mortars',         y:1938, m:2, fx:{inf:.04}},
  {k:'inf2',     r:'inf', n:'Semi-Automatic Weapons',   y:1939, m:3, req:'inf_mg', fx:{inf:.05}},
  {k:'inf_at',   r:'inf', n:'Anti-Tank Rifles',         y:1940, m:2, fx:{inf:.04}},
  {k:'inf_smg',  r:'inf', n:'Submachine Guns',          y:1941, m:3, req:'inf2', fx:{inf:.05}},
  {k:'inf_baz',  r:'inf', n:'Bazookas',                 y:1942, m:2, req:'inf_at', fx:{inf:.04}},
  {k:'inf3',     r:'inf', n:'Assault Rifles',           y:1943, m:3, req:'inf_smg', fx:{inf:.05}},
  {k:'inf_mech', r:'inf', n:'Mechanised Infantry',      y:1944, m:3, fx:{inf:.04}},
  {k:'inf_rcl',  r:'inf', n:'Recoilless Rifles',        y:1945, m:3, req:'inf_baz', fx:{inf:.04}},
  {k:'inf_radio',r:'inf', n:'Squad Radios',             y:1946, m:3, fx:{inf:.03}},
  {k:'inf_heli', r:'inf', n:'Helicopter Assault',       y:1948, m:3, req:'inf_mech', fx:{inf:.04}},
  {k:'inf_nv',   r:'inf', n:'Night Sights',             y:1950, m:3, fx:{inf:.03}},
  {k:'inf_armr', r:'inf', n:'Body Armour',              y:1952, m:3, fx:{inf:.03}},
  {k:'inf_atgm', r:'inf', n:'Anti-Tank Guided Missiles',y:1954, m:4, req:'inf_rcl', fx:{inf:.04, armD:.02}},
  // armor
  {k:'arm1',     r:'arm', n:'Light Tanks',              y:1936, m:3, d:'Unlocks armored divisions.'},
  {k:'arm_radio',r:'arm', n:'Tank Radios',              y:1937, m:3, req:'arm1', fx:{arm:.05}},
  {k:'arm2',     r:'arm', n:'Medium Tanks',             y:1938, m:3, req:'arm1', fx:{arm:.08, armD:.06}},
  {k:'arm_susp', r:'arm', n:'Torsion-Bar Suspension',   y:1939, m:2, fx:{arm:.05}},
  {k:'arm_gun',  r:'arm', n:'High-Velocity Tank Guns',  y:1940, m:3, req:'arm2', fx:{arm:.06, armD:.04}},
  {k:'arm3',     r:'arm', n:'Heavy Tanks',              y:1941, m:4, req:'arm2', fx:{arm:.08, armD:.1}},
  {k:'arm_slope',r:'arm', n:'Sloped Armour',            y:1942, m:3, fx:{armD:.08}},
  {k:'arm_td',   r:'arm', n:'Tank Destroyers',          y:1943, m:3, req:'arm_gun', fx:{arm:.06}},
  {k:'arm_late', r:'arm', n:'Late-War Medium Tanks',    y:1944, m:3, req:'arm3', fx:{arm:.05, armD:.05}},
  {k:'arm_mbt',  r:'arm', n:'Main Battle Tanks',        y:1946, m:4, req:'arm_late', fx:{arm:.06, armD:.06}},
  {k:'arm_stab', r:'arm', n:'Gun Stabilisers',          y:1948, m:3, fx:{arm:.04}},
  {k:'arm_apc',  r:'arm', n:'Armoured Personnel Carriers',y:1950,m:3, fx:{arm:.03, inf:.02}},
  {k:'arm_heat', r:'arm', n:'HEAT Ammunition',          y:1951, m:3, fx:{arm:.04}},
  {k:'arm_rng',  r:'arm', n:'Optical Rangefinders',     y:1953, m:3, req:'arm_stab', fx:{arm:.03, armD:.03}},
  // artillery
  {k:'art1',     r:'art', n:'Field Artillery',          y:1936, m:3, d:'Unlocks artillery divisions.'},
  {k:'art_obs',  r:'art', n:'Forward Observers',        y:1937, m:2, req:'art1', fx:{art:.05}},
  {k:'art_how',  r:'art', n:'Medium Howitzers',         y:1938, m:3, req:'art1', fx:{art:.05}},
  {k:'art_aa',   r:'art', n:'Anti-Aircraft Guns',       y:1939, m:2, fx:{aa:.05}},
  {k:'art_mot',  r:'art', n:'Motorised Artillery',      y:1940, m:3, req:'art_how', fx:{art:.05}},
  {k:'art2',     r:'art', n:'Rocket Artillery',         y:1941, m:3, req:'art1', fx:{art:.06}},
  {k:'art_sp',   r:'art', n:'Self-Propelled Guns',      y:1942, m:3, req:'art_mot', fx:{art:.05}},
  {k:'art_fdc',  r:'art', n:'Fire Direction Centres',   y:1943, m:2, fx:{art:.04}},
  {k:'art_raa',  r:'art', n:'Radar-Guided Flak',        y:1945, m:3, req:'art_aa', fx:{aa:.05}},
  {k:'art_hrl',  r:'art', n:'Heavy Rocket Launchers',   y:1947, m:3, req:'art2', fx:{art:.04}},
  {k:'art_msl',  r:'art', n:'Battlefield Missiles',     y:1950, m:4, fx:{art:.05}},
  {k:'art_cbr',  r:'art', n:'Counter-Battery Radar',    y:1952, m:3, fx:{art:.04}},
  {k:'art_sam',  r:'art', n:'Surface-to-Air Missiles',  y:1953, m:4, req:'art_raa', fx:{aa:.1}},
  // fighters
  {k:'ftr1',     r:'ftr', n:'Monoplane Fighters',       y:1936, m:3, d:'Unlocks fighter wings.'},
  {k:'ftr_gear', r:'ftr', n:'Retractable Landing Gear', y:1937, m:2, req:'ftr1', fx:{ftr:.08}},
  {k:'ftr_8gun', r:'ftr', n:'Eight-Gun Fighters',       y:1938, m:3, req:'ftr1', fx:{ftr:.08}},
  {k:'ftr_drop', r:'ftr', n:'Drop Tanks',               y:1939, m:2, fx:{ftr:.06}},
  {k:'ftr2',     r:'ftr', n:'Advanced Fighters',        y:1940, m:3, req:'ftr1', fx:{ftr:.12}},
  {k:'ftr_can',  r:'ftr', n:'Cannon Armament',          y:1941, m:3, req:'ftr2', fx:{ftr:.08}},
  {k:'ftr_turbo',r:'ftr', n:'Turbo-Superchargers',      y:1942, m:3, fx:{ftr:.1}},
  {k:'ftr_gyro', r:'ftr', n:'Gyro Gunsights',           y:1943, m:2, fx:{ftr:.08}},
  {k:'jet',      r:'ftr', n:'Jet Engines',              y:1944, m:4, req:'ftr2', fx:{ftr:.2}},
  {k:'ftr_swept',r:'ftr', n:'Swept Wings',              y:1946, m:3, req:'jet', fx:{ftr:.1}},
  {k:'ftr_ab',   r:'ftr', n:'Afterburners',             y:1948, m:3, req:'ftr_swept', fx:{ftr:.08}},
  {k:'ftr_aam',  r:'ftr', n:'Air-to-Air Missiles',      y:1950, m:4, fx:{ftr:.1}},
  {k:'ftr_ss',   r:'ftr', n:'Supersonic Fighters',      y:1952, m:4, req:'ftr_ab', fx:{ftr:.1}},
  {k:'ftr_aw',   r:'ftr', n:'All-Weather Interceptors', y:1954, m:3, req:'ftr_aam', fx:{ftr:.05, aa:.05}},
  // bombers
  {k:'bmb1',     r:'bmb', n:'Medium Bombers',           y:1936, m:3, d:'Unlocks bomber wings.'},
  {k:'bmb_sight',r:'bmb', n:'Precision Bombsights',     y:1937, m:3, req:'bmb1', fx:{bmb:.15}},
  {k:'bmb_dive', r:'bmb', n:'Dive Bombers',             y:1938, m:3, req:'bmb1', fx:{bmb:.1}},
  {k:'bmb_range',r:'bmb', n:'Long-Range Fuel Tanks',    y:1939, m:2, fx:{bmbR:.1}},
  {k:'bmb_4eng', r:'bmb', n:'Four-Engine Bombers',      y:1940, m:3, req:'bmb_sight', fx:{bmb:.1}},
  {k:'bmb2',     r:'bmb', n:'Strategic Bombers',        y:1941, m:4, req:'bmb1', fx:{bmb:.25, bmbR:.15}},
  {k:'bmb_nav',  r:'bmb', n:'Navigation Radar',         y:1942, m:3, fx:{bmb:.15}},
  {k:'bmb_path', r:'bmb', n:'Pathfinder Squadrons',     y:1943, m:2, fx:{bmb:.1}},
  {k:'bmb_vh',   r:'bmb', n:'Very Heavy Bombers',       y:1944, m:4, req:'bmb2', fx:{bmb:.15, bmbR:.05}},
  {k:'bmb_jet',  r:'bmb', n:'Jet Bombers',              y:1946, m:4, req:'bmb_vh', fx:{bmb:.15, bmbR:.1}},
  {k:'bmb_aar',  r:'bmb', n:'Aerial Refuelling',        y:1949, m:3, fx:{bmbR:.15}},
  {k:'bmb_strat',r:'bmb', n:'Intercontinental Jet Bombers',y:1952,m:4, req:'bmb_jet', fx:{bmb:.1, bmbR:.1}},
  {k:'bmb_ecm',  r:'bmb', n:'Electronic Countermeasures',y:1954, m:3, fx:{bmb:.1}},
  // navy
  {k:'cap1',     r:'nav', n:'Capital Ships',            y:1936, m:3, d:'Unlocks battle squadrons.'},
  {k:'sub1',     r:'nav', n:'Submarines',               y:1936, m:3, d:'Unlocks submarine flotillas.'},
  {k:'nav_fire', r:'nav', n:'Naval Fire Control',       y:1937, m:3, req:'cap1', fx:{navy:.06}},
  {k:'nav_sonar',r:'nav', n:'Sonar',                    y:1938, m:3, fx:{asw:.15}},
  {k:'nav_torp', r:'nav', n:'Improved Torpedoes',       y:1939, m:2, req:'sub1', fx:{sub:.2, navy:.03}},
  {k:'sub2',     r:'nav', n:'Wolfpack Tactics',         y:1940, m:3, req:'sub1', fx:{sub:.4}},
  {k:'amph',     r:'nav', n:'Amphibious Doctrine',      y:1940, m:3, d:'Naval landings fight at 75% instead of 50%; +1 convoy range, +4 sealift.'},
  {k:'carrier',  r:'nav', n:'Carrier Aviation',         y:1941, m:4, req:'cap1', fx:{navy:.2}},
  {k:'nav_radar',r:'nav', n:'Naval Radar',              y:1942, m:3, fx:{navy:.06, asw:.1}},
  {k:'nav_escort',r:'nav',n:'Escort Carriers',          y:1943, m:3, req:'carrier', fx:{asw:.15, lift:2}},
  {k:'nav_snork',r:'nav', n:'Snorkel Submarines',       y:1944, m:3, req:'sub2', fx:{sub:.2}},
  {k:'nav_lst',  r:'nav', n:'Tank Landing Ships',       y:1945, m:3, req:'amph', fx:{lift:3, hop:1}},
  {k:'nav_angle',r:'nav', n:'Angled Flight Decks',      y:1946, m:3, req:'carrier', fx:{navy:.05}},
  {k:'nav_fsub', r:'nav', n:'Fast Attack Submarines',   y:1948, m:4, req:'nav_snork', fx:{sub:.15}},
  {k:'nav_msl',  r:'nav', n:'Naval Missiles',           y:1950, m:4, fx:{navy:.06}},
  {k:'nav_heli', r:'nav', n:'Anti-Submarine Helicopters',y:1951, m:3, fx:{asw:.1}},
  {k:'nav_nsub', r:'nav', n:'Nuclear Submarines',       y:1954, m:5, req:'nav_fsub', fx:{sub:.2, navy:.03}},
  // doctrine
  {k:'depth',    r:'doc', n:'Defense in Depth',         y:1936, m:3, fx:{def:.05}},
  {k:'mobile',   r:'doc', n:'Mobile Warfare',           y:1936, m:3, fx:{arm:.1}},
  {k:'mass',     r:'doc', n:'Mass Assault',             y:1936, m:3, d:'Infantry costs 25% less production and manpower; +20% manpower.'},
  {k:'doc_staff',r:'doc', n:'General Staff Exercises',  y:1937, m:2, fx:{atk:.03}},
  {k:'blitz',    r:'doc', n:'Blitzkrieg',               y:1938, m:3, req:'mobile', d:'Armor can attack again after a crushing win.'},
  {k:'grand',    r:'doc', n:'Grand Battleplan',         y:1938, m:3, req:'depth', fx:{dig:.05}, d:'Troops can dig in one level deeper.'},
  {k:'doc_infil',r:'doc', n:'Infiltration Tactics',     y:1939, m:2, fx:{atk:.03}},
  {k:'doc_elast',r:'doc', n:'Elastic Defence',          y:1940, m:3, req:'depth', fx:{def:.04}},
  {k:'combined', r:'doc', n:'Combined Arms',            y:1941, m:3, req:'mobile', d:'+15% attack for armies mixing armor, artillery and infantry.'},
  {k:'doc_ops',  r:'doc', n:'Operational Art',          y:1942, m:3, req:'doc_staff', fx:{atk:.04}},
  {k:'doc_hedge',r:'doc', n:'Hedgehog Defence',         y:1943, m:2, fx:{def:.03, dig:.02}},
  {k:'doc_cas',  r:'doc', n:'Close Air Support',        y:1944, m:3, fx:{atk:.03}},
  {k:'doc_atom', r:'doc', n:'Atomic Battlefield',       y:1946, m:3, fx:{def:.03}},
  {k:'doc_net',  r:'doc', n:'Radio Command Nets',       y:1948, m:3, fx:{atk:.03}},
  {k:'doc_fwd',  r:'doc', n:'Forward Defence',          y:1950, m:3, fx:{def:.03}},
  {k:'doc_air',  r:'doc', n:'Air Mobility',             y:1951, m:3, req:'doc_net', fx:{atk:.03}},
  {k:'doc_pento',r:'doc', n:'Pentomic Divisions',       y:1953, m:3, req:'doc_atom', fx:{def:.02, atk:.02}},
  // industry
  {k:'ind1',     r:'ind', n:'Assembly Lines',           y:1936, m:3, fx:{ind:.05}},
  {k:'ind_tool', r:'ind', n:'Machine Tools',            y:1937, m:3, req:'ind1', fx:{ind:.05}},
  {k:'ind2',     r:'ind', n:'Mass Production',          y:1938, m:3, req:'ind1', fx:{ind:.05}},
  {k:'synth',    r:'ind', n:'Synthetic Oil',            y:1938, m:3, fx:{oil:3}},
  {k:'ind_conc', r:'ind', n:'Concentrated Industry',    y:1939, m:3, fx:{ind:.04}},
  {k:'ind_arc',  r:'ind', n:'Electric Arc Furnaces',    y:1940, m:3, fx:{steel:2}},
  {k:'ind_disp', r:'ind', n:'Dispersed Industry',       y:1941, m:3, fx:{ind:.04}},
  {k:'ind3',     r:'ind', n:'Automation',               y:1942, m:3, req:'ind2', fx:{ind:.06}},
  {k:'ind_crack',r:'ind', n:'Catalytic Cracking',       y:1942, m:2, req:'synth', fx:{oil:2}},
  {k:'ind_flow', r:'ind', n:'Flow Production',          y:1943, m:3, fx:{ind:.04}},
  {k:'ind_alloy',r:'ind', n:'Light Alloys',             y:1944, m:3, fx:{steel:2}},
  {k:'ind_recon',r:'ind', n:'Reconstruction',           y:1945, m:3, fx:{ind:.04, mp:.05}},
  {k:'ind_comp', r:'ind', n:'Electronic Computers',     y:1947, m:3, fx:{ind:.04, res:.1}},
  {k:'ind_nuke', r:'ind', n:'Nuclear Power',            y:1949, m:4, req:'atom', fx:{ind:.05}},
  {k:'ind_petro',r:'ind', n:'Petrochemicals',           y:1951, m:3, fx:{oil:2}},
  {k:'ind_nc',   r:'ind', n:'Numerical Control',        y:1953, m:3, req:'ind_comp', fx:{ind:.04}},
  // science
  {k:'sci_grant',r:'sci', n:'University Grants',        y:1936, m:3, fx:{res:.05}},
  {k:'sci_df',   r:'sci', n:'Radio Direction Finding',  y:1937, m:2, fx:{asw:.05, aa:.05}},
  {k:'radar',    r:'sci', n:'Radar',                    y:1938, m:3, fx:{aa:.15}, d:'See every enemy unit.'},
  {k:'sci_or',   r:'sci', n:'Operations Research',      y:1939, m:3, fx:{res:.1}},
  {k:'sci_pen',  r:'sci', n:'Penicillin',               y:1940, m:3, fx:{mp:.05}},
  {k:'rocket',   r:'sci', n:'Rocketry',                 y:1941, m:4, d:'One free V-weapon strike every month.'},
  {k:'atom',     r:'sci', n:'Nuclear Physics',          y:1942, m:4, d:'Opens the road to the Bomb.'},
  {k:'sci_prox', r:'sci', n:'Proximity Fuzes',          y:1943, m:3, fx:{aa:.1, art:.03}},
  {k:'bomb',     r:'sci', n:'The Bomb',                 y:1944, m:6, req:'atom', d:'One atomic strike every six months.'},
  {k:'sci_bal',  r:'sci', n:'Ballistic Missiles',       y:1945, m:4, req:'rocket', fx:{rkt:.5}},
  {k:'sci_trans',r:'sci', n:'Transistors',              y:1947, m:3, fx:{res:.1}},
  {k:'sci_dew',  r:'sci', n:'Early-Warning Radar',      y:1948, m:3, req:'radar', fx:{aa:.1}},
  {k:'sci_hbomb',r:'sci', n:'Thermonuclear Bomb',       y:1950, m:6, req:'bomb', fx:{bombcd:2}},
  {k:'sci_icbm', r:'sci', n:'Intercontinental Missiles',y:1953, m:5, req:'sci_bal', fx:{rkt:.5}},
  {k:'sci_sat',  r:'sci', n:'Artificial Satellites',    y:1954, m:4, req:'sci_icbm', fx:{res:.1}, d:'The first eyes in orbit.'},
];
const TECH = {}; TECHS.forEach(T => { TECH[T.k] = T; T.b = T.r; T.fx = T.fx || {}; });
// what each modifier means, for the tech cards ("+5% infantry strength")
const FX_TEXT = { inf:'infantry strength', arm:'armor attack', armD:'armor defense', art:'artillery strength', ftr:'fighter strength', bmb:'bomber power',
  bmbR:'bomber range', aa:'fighters defending', navy:'battle squadron strength', sub:'submarine raiding', asw:'less enemy submarine raiding',
  lift:'sealift', hop:'convoy range', def:'defense', atk:'attack', dig:'per entrenchment level', ind:'production', oil:'oil a month', steel:'steel a month',
  mp:'manpower', res:'research speed', rkt:'V-weapon damage', bombcd:'months off the atomic-strike cooldown' };
const FX_ABS = { oil:1, steel:1, lift:1, hop:1, bombcd:1 };
TECHS.forEach(T => {
  const f = Object.entries(T.fx).map(([k, v]) => FX_ABS[k] ? `+${v} ${FX_TEXT[k]}` : `+${Math.round(v * 100)}% ${FX_TEXT[k]}`).join(', ');
  T.d = [T.d, f ? f[0].toUpperCase() + f.slice(1) + '.' : ''].filter(Boolean).join(' ');
});
// paid in full when a project starts: 8 + 6 per month of work + 2 per year past 1936; industry (production %)
// techs ×1.3. Tuned Nov 2026 (was 10 + 7/month + 2/year) against recruiting (an infantry division = 8 production
// + 10k manpower) for a 75–140-division power in 1939: the median combat tech cost 13–22 production per division
// of strength it adds, now 11–18 (main infantry tech 8–12.5 → 7–11); industry techs, counted over two years of
// extra income, 3–9 → 3.5–10.5. A deeper cut tipped AI campaigns toward the Axis (18/24 seeds vs 8/24).
// Recruiting stays the better buy for small nations.
const techCost = T => Math.round((8 + T.m * 6 + Math.max(0, T.y - 1936) * 2) * (T.fx && T.fx.ind ? 1.3 : 1));
// what each AI power cares about when it picks research (weights per row)
const RESEARCH_W = {
  GER:{arm:3, ftr:2.5, doc:2, ind:2, inf:2, bmb:1.2, art:1.2, nav:1, sci:1.5},
  ENG:{nav:3, ftr:3, ind:2, sci:2, bmb:2, inf:1.5, arm:1.2, art:1, doc:1},
  FRA:{doc:2.5, inf:2, art:2, arm:1.5, ind:2, ftr:1.5, nav:1, bmb:.8, sci:1},
  ITA:{ind:2.5, inf:2, nav:2, arm:1.5, ftr:1.5, art:1, doc:1, bmb:1, sci:.8},
  SOV:{inf:2.5, arm:2.5, ind:2.5, art:2, doc:1.5, ftr:1.5, sci:1.2, bmb:.8, nav:.5},
  USA:{ind:3, nav:2.5, bmb:2.5, ftr:2.5, sci:2, arm:1.5, inf:1.5, art:1, doc:1},
  JAP:{nav:3, ftr:2.5, inf:2, ind:2, bmb:1.2, doc:1.2, art:1, arm:.8, sci:1},
  _:{inf:2.5, ind:2.5, art:1.5, doc:1.5, ftr:1, arm:1, sci:1, nav:.6, bmb:.5},
};
// the research an AI (or a later start date) picks next: older and favoured rows first
function techPick(t, avail) {
  const W = RESEARCH_W[t] || RESEARCH_W._, y = G.y;
  let best = null, bs = -1;
  for (const T of avail) { const s = (W[T.r] || 1) * (1 + Math.max(0, y - T.y) * 0.6) / T.m; if (s > bs) { bs = s; best = T; } }
  return best;
}

/* ---------- national focus: shared tree plus national branches ---------- */
// col/row place each focus in the tree view; req links to its parent
const FOCUS = [
  // post-war focuses (rows 4–5): open to everyone once the war years end and the second act begins
  {k:'pw_demob', post:1, col:0,row:4, n:'Demobilisation', m:3, d:'Send the conscripts home: +15 stability, war weariness falls by 20, +60k manpower.'},
  {k:'pw_recon', post:1, col:1,row:4, n:'Reconstruction', m:4, d:'+1 factory in your four least-built home provinces.'},
  {k:'pw_jet',   post:1, col:2,row:4, n:'The Jet Age', m:4, d:'Jet Engines and Swept Wings researched; +4 fighters at the capital.'},
  {k:'pw_nuke',  post:1, col:3,row:4, n:'Nuclear Programme', m:6, d:'Nuclear Physics researched — or The Bomb, if you already have it.'},
  {k:'pw_cia',   post:1, col:4,row:4, n:'Intelligence Agency', m:3, d:'+2 spies; every army in the world revealed for a year.'},
  {k:'pw_space', post:1, col:0,row:5, req:'pw_recon', n:'The Space Race', m:6, d:'+1 research slot; +40 politics.'},
  {k:'pw_aid',   post:1, col:1,row:5, req:'pw_recon', n:'Foreign Aid Programme', m:4, d:'Bring two neutral nations into your bloc (or +60 politics outside one).'},
  {k:'pw_arms',  post:1, col:2,row:5, req:'pw_jet', n:'Arms Race', m:4, d:'+6 armored divisions and +6 fighters at the capital. The Doomsday Clock moves forward.'},
  {k:'pw_detente',post:1,col:3,row:5, req:'pw_nuke', n:'Détente', m:4, d:'The Doomsday Clock moves back 15 minutes; +20 stability.'},
  {k:'pw_bases', post:1, col:4,row:5, req:'pw_cia', n:'Overseas Bases', m:4, d:'+3 battle squadrons in home waters and +2 convoy range.'},
  {k:'ind_plan',  col:0,row:0, n:'Industrial Expansion', m:4, d:'+1 factory in your three biggest industrial provinces.'},
  {k:'ind_steel', col:0,row:1, req:'ind_plan', n:'Steel Works', m:3, d:'+3 steel every month.'},
  {k:'ind_synth', col:0,row:2, req:'ind_steel', n:'Synthetic Fuel Plants', m:4, d:'+3 oil every month.'},
  {k:'ind_shadow',col:1,row:0, n:'Shadow Factories', m:3, d:'Hidden workshops deliver +60 production now.'},
  {k:'res_univ',  col:1,row:1, req:'ind_shadow', n:'Research Universities', m:4, d:'+1 research slot.'},
  {k:'sec_bureau',col:1,row:2, req:'res_univ', n:'Secret Weapons Bureau', m:5, d:'All research 30% faster.'},
  {k:'mil_mob',   col:2,row:0, n:'Mass Mobilisation', m:3, d:'+60k manpower and 6 infantry divisions at the capital.'},
  {k:'mil_mech',  col:2,row:1, req:'mil_mob', n:'Mechanised Corps', m:4, d:'Light Tanks researched and 3 armored divisions at the capital.'},
  {k:'mil_staff', col:2,row:2, req:'mil_mech', n:'Staff College', m:4, d:'+2 general slots; a free general.'},
  {k:'mil_fort',  col:3,row:0, n:'Border Fortifications', m:3, d:'+1 fort level in every border province.'},
  {k:'air_min',   col:3,row:1, req:'mil_fort', n:'Air Ministry', m:3, d:'+4 fighter wings at the capital.'},
  {k:'nav_yard',  col:3,row:2, req:'air_min', n:'Naval Dockyards', m:4, d:'+2 battle squadrons in home waters.'},
  {k:'pol_prop',  col:4,row:0, n:'Ministry of Propaganda', m:2, d:'+50 politics and +10 stability.'},
  {k:'pol_intel', col:4,row:1, req:'pol_prop', n:'Intelligence Service', m:3, d:'+2 spies; every enemy army revealed for 12 months.'},
  {k:'pol_unity', col:4,row:2, req:'pol_intel', n:'National Unity', m:3, d:'+15 stability; war weariness halved.'},
  // national branches (col 5)
  {k:'ger_lw',     who:['GER'], col:5,row:0, n:'Luftwaffe Expansion', m:3, d:'+6 fighters and +4 bombers.'},
  {k:'ger_panzer', who:['GER'], col:5,row:1, req:'ger_lw', n:'Panzerwaffe', m:4, d:'+4 armored divisions; Medium Tanks researched.'},
  {k:'ger_westwall',who:['GER'],col:5,row:2, req:'ger_panzer', n:'The Westwall', m:3, d:'+2 forts along the western border.'},
  {k:'ger_planz',  who:['GER'], col:5,row:3, req:'ger_westwall', n:'Plan Z', m:6, d:'+3 battle squadrons and +6 U-boat flotillas.'},
  {k:'eng_radar',  who:['ENG'], col:5,row:0, n:'Chain Home', m:3, d:'Radar researched; +4 fighters at London.'},
  {k:'eng_rn',     who:['ENG'], col:5,row:1, req:'eng_radar', n:'Royal Navy Rearmament', m:4, d:'+4 battle squadrons.'},
  {k:'eng_empire', who:['ENG'], col:5,row:2, req:'eng_rn', n:'Imperial Conference', m:3, d:'+40k manpower; Dominion divisions reach Cairo and Gibraltar.'},
  {k:'eng_rearm',  who:['ENG'], col:5,row:3, req:'eng_empire', n:'Rearmament White Paper', m:4, d:'+4 factories across Britain.'},
  {k:'fra_popfront',who:['FRA'],col:5,row:0, n:'Popular Front', m:2, d:'+20 stability, +30 politics.'},
  {k:'fra_maginot',who:['FRA'], col:5,row:1, req:'fra_popfront', n:'Extend the Maginot Line', m:4, d:'Forts along the Belgian border.'},
  {k:'fra_dgaulle',who:['FRA'], col:5,row:2, req:'fra_maginot', n:'Armoured Divisions', m:4, d:'Medium Tanks researched, +3 armored divisions.'},
  {k:'fra_empire', who:['FRA'], col:5,row:3, req:'fra_dgaulle', n:'Armée d\'Afrique', m:3, d:'+8 divisions in North Africa.'},
  {k:'ita_alpini', who:['ITA'], col:5,row:0, n:'Alpini Corps', m:3, d:'+4 mountain divisions.'},
  {k:'ita_mare',   who:['ITA'], col:5,row:1, req:'ita_alpini', n:'Mare Nostrum', m:4, d:'+3 battle squadrons, +4 submarines.'},
  {k:'ita_africa', who:['ITA'], col:5,row:2, req:'ita_mare', n:'Africa Settentrionale', m:3, d:'+6 divisions and 2 tanks in Libya.'},
  {k:'ita_autarchia',who:['ITA'],col:5,row:3, req:'ita_africa', n:'Autarchia', m:4, d:'+3 factories, +2 steel per month.'},
  {k:'sov_5yr',    who:['SOV'], col:5,row:0, n:'Five-Year Plan', m:4, d:'+1 factory in four provinces.'},
  {k:'sov_urals',  who:['SOV'], col:5,row:1, req:'sov_5yr', n:'Industry Beyond the Urals', m:4, d:'Factories and steel in the Urals, out of reach.'},
  {k:'sov_deep',   who:['SOV'], col:5,row:2, req:'sov_urals', n:'Deep Battle', m:4, d:'Combined Arms researched, +4 armored divisions.'},
  {k:'sov_stavka', who:['SOV'], col:5,row:3, req:'sov_deep', n:'Stavka Reserve', m:3, d:'+12 infantry divisions at Moscow.'},
  {k:'usa_newdeal', who:['USA'], col:5,row:0, n:'New Deal Works', m:3, d:'+1 factory in four industrial cities, +10 stability.'},
  {k:'usa_twoocean',who:['USA'], col:5,row:1, req:'usa_newdeal', n:'Two-Ocean Navy Act', m:4, d:'+3 battle squadrons in the Atlantic and +3 in the Pacific.'},
  {k:'usa_liberty', who:['USA'], col:5,row:2, req:'usa_twoocean', n:'Liberty Ships', m:4, d:'+12 sealift and one more sea zone of convoy range. Amphibious Doctrine researched.'},
  {k:'usa_arsenal', who:['USA'], col:5,row:3, req:'usa_liberty', n:'Arsenal of Democracy', m:4, d:'+4 factories, +30 steel, +30 oil.'},
  {k:'jap_kantai',  who:['JAP'], col:5,row:0, n:'Kantai Kessen', m:4, d:'+3 battle squadrons; Carrier Aviation researched.'},
  {k:'jap_fuel',    who:['JAP'], col:5,row:1, req:'jap_kantai', n:'Strategic Fuel Reserve', m:3, d:'+60 oil now and +3 oil a month from Manchurian shale.'},
  {k:'jap_southern',who:['JAP'], col:5,row:2, req:'jap_fuel', n:'Southern Operation', m:4, d:'+8 sealift and +4 infantry divisions at Tokyo for the push south.'},
  {k:'jap_kwantung',who:['JAP'], col:5,row:3, req:'jap_southern', n:'Kwantung Army', m:3, d:'+4 infantry and an armored division in Korea and Manchuria.'},
  {k:'min_neut',   minor:1,     col:5,row:0, n:'Armed Neutrality', m:3, d:'+1 fort everywhere on the border, +10 stability.'},
  {k:'min_army',   minor:1,     col:5,row:1, req:'min_neut', n:'Modernise the Army', m:4, d:'+4 artillery divisions; Improved Rifles researched.'},
  {k:'min_patron', minor:1,     col:5,row:2, req:'min_army', n:'Seek a Patron', m:2, d:'+60 production of foreign aid, +30 politics.'},
];
const FOC = {}; FOCUS.forEach(f => FOC[f.k] = f);
const focusFor = (t, major) => FOCUS.filter(f => (!f.post || (typeof G !== 'undefined' && G && G.act)) && (f.who ? f.who.includes(t) : f.minor ? !major : true));

/* ---------- alternate-history destiny decisions ---------- */
const DECISIONS = [
  {k:'roman',who:['ITA'],n:'Restore the Roman Empire',name:'Roman Empire',color:'#7b3a86',need:['Rome','Athens','Istanbul','Cairo','Tunis','Jerusalem'],d:'SPQR. The legions return to the old frontiers.'},
  {k:'hre',who:['GER','AUS'],n:'Revive the Holy Roman Empire',name:'Holy Roman Empire',color:'#b8962f',need:['Vienna','Berlin','Prague','Milan','Brussels','Amsterdam'],d:'Neither holy, nor Roman, nor an empire. But it is back.'},
  {k:'plc',who:['POL'],n:'Polish–Lithuanian Commonwealth',name:'The Commonwealth',color:'#b24b6d',need:['Warsaw','Kaunas','Riga','Minsk','Kiev'],d:'From the Baltic to the Black Sea, as in 1619.'},
  {k:'kalmar',who:['DEN','SWE','NOR'],n:'Proclaim the Kalmar Union',name:'Kalmar Union',color:'#2f6f9e',need:['Copenhagen','Stockholm','Oslo','Helsinki'],d:'Three crowns, one throne, one North.'},
  {k:'byz',who:['GRE'],n:'Byzantine Restoration',name:'Byzantine Empire',color:'#6b2c7a',need:['Athens','Istanbul','Izmir','Ankara'],d:'The Megali Idea fulfilled. Hagia Sophia rings its bells.'},
  {k:'otto',who:['TUR'],n:'Ottoman Revival',name:'Ottoman Empire',color:'#2c7a62',need:['Istanbul','Damascus','Baghdad','Cairo','Jerusalem','Medina'],d:'The Sublime Porte opens again.'},
  {k:'napo',who:['FRA','VIC'],n:'The Second Napoleonic Empire',name:'French Empire',color:'#2c4a94',need:['Paris','Berlin','Vienna','Madrid','Rome','Moscow'],d:'Finish what the Emperor started. Bring a coat this time.'},
  {k:'pax',who:['ENG'],n:'Pax Britannica',name:'British Empire',color:'#9e2f3c',need:['London','Paris','Berlin','Rome','Cairo'],d:'Rule Britannia. Europe joins the Empire.'},
  {k:'iberia',who:['SPA','POR'],n:'Unite Iberia',name:'Iberian Union',color:'#c48a2a',need:['Madrid','Lisbon','Barcelona','Gibraltar'],d:'One peninsula, one crown — and the Rock is ours.'},
  {k:'reich',who:['GER'],n:'Mitteleuropa',name:'Greater German Reich',color:'#4c545d',need:['Berlin','Vienna','Prague','Warsaw','Paris'],d:'The continent bends to Berlin.'},
  {k:'redstar',who:['SOV'],n:'Union of European Republics',name:'Union of Soviet Europe',color:'#a3201f',need:['Moscow','Berlin','Paris','Rome','Warsaw'],d:'Workers of the world have united — at bayonet point.'},
  {k:'balkan',who:['YUG','BUL','ROM'],n:'Balkan Federation',name:'Balkan Federation',color:'#5b4a9e',need:['Belgrade','Sofia','Bucharest','Athens','Tirana'],d:'One flag from the Danube to the Aegean.'},
  {k:'scand',who:['FIN'],n:'Greater Finland',name:'Greater Finland',color:'#c9c4a6',need:['Helsinki','Petrozavodsk','Murmansk','Tallinn'],d:'Karelia, the Kola and the Gulf are Finnish at last.'},
  {k:'sphere',who:['JAP'],n:'Greater East Asia Co-Prosperity Sphere',name:'Empire of Japan',color:'#c9a85a',need:['Tokyo','Nanjing','Manila','Singapore','Batavia'],d:'"Asia for the Asiatics" — under the Rising Sun.'},
  {k:'unify',who:['CHI','PRC'],n:'Unify China',name:'United China',color:'#4b5f88',need:['Nanjing','Peking','Canton','Hsinking','Urumqi','Lhasa'],d:'Every warlord, every province, every frontier under one flag.'},
  {k:'monroe',who:['USA'],n:'Pax Americana',name:'American Century',color:'#4f78b0',need:['Washington','London','Paris','Tokyo','Berlin'],d:'The New World remakes the Old.'},
  // ---- more formables: Europe ----
  {k:'benelux',who:['HOL','BEL'],n:'Form Benelux',name:'United Netherlands',color:'#d9893a',need:['Amsterdam','Brussels','Rotterdam','Antwerp'],absorb:['HOL','BEL'],d:'The Low Countries reunited under one crown, as in 1815.'},
  {k:'danube',who:['AUS','HUN','CZE'],n:'Danubian Federation',name:'Danubian Federation',color:'#c9b98a',need:['Vienna','Budapest','Prague','Bratislava'],absorb:['AUS','HUN','CZE'],d:'The old Habsburg lands, bound now by free consent instead of a crown.'},
  {k:'baltic',who:['EST','LAT','LIT'],n:'Baltic Union',name:'Baltic Union',color:'#6a8aa6',need:['Tallinn','Riga','Kaunas'],absorb:['EST','LAT','LIT'],d:'Three small nations decide they will not be swallowed one at a time.'},
  {k:'hungary',who:['HUN'],n:'Lands of the Holy Crown',name:'Kingdom of Greater Hungary',color:'#9a6a40',need:['Budapest','Bratislava','Cluj','Ruthenia','Zagreb'],d:'Trianon is torn up. The Crown of Saint Stephen rules the Carpathian Basin again.'},
  {k:'romania',who:['ROM'],n:'România Mare',name:'Greater Romania',color:'#c9a83a',need:['Bucharest','Bessarabia','Cluj','Odessa'],d:'All Romanians in one state, from the Dniester to the Tisza.'},
  {k:'bulgaria',who:['BUL'],n:'San Stefano Bulgaria',name:'Greater Bulgaria',color:'#4e7a34',need:['Sofia','Skopje','Thessaloniki','Varna'],d:'The borders of 1878, at last.'},
  {k:'ireland',who:['IRE'],n:'Unite Ireland',name:'Irish Republic',color:'#5aa848',need:['Dublin','Belfast','Cork'],absorb:['ENG'],d:'Thirty-two counties, one republic.'},
  {k:'yugo',who:['YUG'],n:'Greater Yugoslavia',name:'Federation of the South Slavs',color:'#5a4aa8',need:['Belgrade','Zagreb','Sofia','Tirana','Trieste'],d:'Every South Slav under one federal flag.'},
  {k:'switz',who:['SWI'],n:'The Alpine Confederation',name:'Alpine Confederation',color:'#a8445a',need:['Bern','Innsbruck','Milan','Turin'],d:'The Alps belong to those who live in them.'},
  // ---- more formables: the wider world ----
  {k:'colombia',who:['COL','VEN','ECU'],n:'Restore Gran Colombia',name:'Gran Colombia',color:'#d6b740',need:['Bogotá','Caracas','Quito','Panama'],absorb:['COL','VEN','ECU','PAN'],d:'Bolívar\'s dream, from the Orinoco to the Isthmus.'},
  {k:'plata',who:['ARG','URG','PAR'],n:'United Provinces of the River Plate',name:'United Provinces of South America',color:'#86bfe0',need:['Buenos Aires','Montevideo','Asunción','La Paz'],absorb:['ARG','URG','PAR','BOL'],d:'The old Viceroyalty of the River Plate, reborn as one republic.'},
  {k:'andes',who:['PRU','BOL','CHL'],n:'Andean Confederation',name:'Andean Confederation',color:'#b0605a',need:['Lima','La Paz','Santiago'],absorb:['PRU','BOL','CHL'],d:'Santa Cruz\'s confederation of 1836, this time made to last.'},
  {k:'brazil',who:['BRA'],n:'Empire of Brazil',name:'Empire of Brazil',color:'#2f8a4e',need:['Rio de Janeiro','São Paulo','Montevideo','Asunción','Buenos Aires'],d:'The giant of the south claims the whole continent\'s Atlantic coast.'},
  {k:'centam',who:['GUA','HON','ELS','NIC','COS'],n:'Federal Republic of Central America',name:'Central American Federation',color:'#4a8ec0',need:['Guatemala','Tegucigalpa','San Salvador','Managua','San José'],absorb:['GUA','HON','ELS','NIC','COS'],d:'Five sister republics become one again.'},
  {k:'mexico',who:['MEX'],n:'Restore the Mexican Empire',name:'Mexican Empire',color:'#4f8a3a',need:['Mexico City','Guatemala','Havana','Houston'],d:'From Texas to Guatemala, as in the days of Iturbide.'},
  {k:'arabia',who:['SAU','IRQ','YEM','OMN'],n:'The Arab Federation',name:'United Arab Kingdom',color:'#6f8f42',need:['Riyadh','Baghdad','Mecca',"Sana'a",'Damascus'],absorb:['SAU','IRQ','YEM','OMN'],d:'One Arab nation from the Gulf to the Levant.'},
  {k:'persia',who:['PER'],n:'Restore the Persian Empire',name:'Persian Empire',color:'#8a5ab0',need:['Tehran','Baghdad','Kabul','Baku'],d:'The Shahanshah\'s realm stretches again from the Caucasus to the Hindu Kush.'},
  {k:'durrani',who:['AFG'],n:'Durrani Empire',name:'Durrani Empire',color:'#6a7f4a',need:['Kabul','Lahore','Mashhad','Karachi'],d:'Ahmad Shah\'s empire returns: Khorasan, the Punjab and the road to the sea.'},
  {k:'india',who:['RAJ'],n:'A Free and United India',name:'Union of India',color:'#d89a3a',need:['Delhi','Bombay','Calcutta','Karachi','Rangoon','Colombo'],absorb:['ENG'],d:'The Raj passes into history; a free India rules the subcontinent.'},
  {k:'siam',who:['SIA'],n:'Greater Thailand',name:'Greater Thailand',color:'#4a8ab0',need:['Bangkok','Phnom Penh','Vientiane','Rangoon','Kuala Lumpur'],d:'All the Tai peoples in one kingdom.'},
  {k:'qing',who:['MAN'],n:'Restore the Great Qing',name:'Great Qing Empire',color:'#c9a03a',need:['Hsinking','Peking','Nanjing','Ulan Bator'],d:'The last emperor returns to the Forbidden City.'},
  {k:'mongol',who:['MON'],n:'The Great Mongol State',name:'Great Mongol State',color:'#8c5a9e',need:['Ulan Bator','Urumqi','Hsinking','Baotou'],d:'The steppe remembers Genghis Khan.'},
  {k:'turkestan',who:['SIK'],n:'East Turkestan',name:'Turkestan Republic',color:'#a8a06a',need:['Urumqi','Kashgar','Tashkent','Alma-Ata'],d:'The Silk Road cities under one free banner.'},
  {k:'tibet',who:['TIB'],n:'The Tibetan Empire',name:'Tibetan Empire',color:'#c9a86a',need:['Lhasa','Chengdu','Xining','Kathmandu'],d:'The empire of the Tibetan kings, from the Himalaya to the plains of Sichuan.'},
  {k:'austral',who:['AST','NZL'],n:'Federation of Australasia',name:'Australasian Federation',color:'#3e8a72',need:['Canberra','Wellington','Port Moresby'],absorb:['AST','NZL'],d:'The Tasman is a lake, not a border.'},
  {k:'canada',who:['CAN'],n:'Dominion from Sea to Sea',name:'Kingdom of Canada',color:'#b04444',need:['Ottawa',"St. John's",'Vancouver','Anchorage'],d:'Newfoundland and Alaska join the Dominion: a mari usque ad mare.'},
  {k:'ethiopia',who:['ETH'],n:'Solomonic Empire',name:'Ethiopian Empire',color:'#7aa046',need:['Addis Ababa','Asmara','Mogadishu','Khartoum','Djibouti'],d:'The Lion of Judah rules the Horn of Africa.'},
  {k:'safrica',who:['SAF'],n:'Union of Southern Africa',name:'Union of Southern Africa',color:'#c07c4a',need:['Pretoria','Salisbury','Windhoek','Lourenço Marques'],d:'From the Cape to the Zambezi.'},
  {k:'caribbean',who:['CUB','HAI','DOM'],n:'Antillean Confederation',name:'Antillean Confederation',color:'#5a7ab0',need:['Havana','Port-au-Prince','Santo Domingo','Kingston'],absorb:['CUB','HAI','DOM'],d:'Martí\'s dream of the Antilles as one free nation.'},
  {k:'liberia',who:['LIB'],n:'Free West Africa',name:'West African Union',color:'#8e6aa0',need:['Monrovia','Freetown','Abidjan','Accra','Lagos'],d:'Africa\'s oldest republic leads the coast to freedom.'},
  WORLD ? {k:'caesar',who:null,n:'Masters of the World',name:null,color:null,need:'45%',d:'Hold 45% of the world\'s victory points to crown your dominion.'}
        : {k:'caesar',who:null,n:'Masters of Europe',name:null,color:null,need:'60%',d:'Hold 60% of Europe\'s victory points to crown your dominion.'},
];

/* ---------- strategy cards ---------- */
// tgt: none | own (own province) | enemy (enemy province) | foe (nation at war) | any (any foreign province) | occ (occupied core province)
const CARDS = {
  blitz:    {n:'Blitzkrieg',          ic:'⚡', cost:20, tgt:'none', w:3, d:'This month your armor attacks at +25% and every crushing win allows a second strike.'},
  surprise: {n:'Surprise Attack',     ic:'✦', cost:10, tgt:'none', w:4, d:'Your next attack this month lands at +40%.'},
  scorched: {n:'Scorched Earth',      ic:'♨', cost:15, tgt:'none', w:2, d:'This month enemies attacking your land fight at −20%; provinces you lose are left without factories.'},
  codebreak:{n:'Codebreakers',        ic:'⌗', cost:10, tgt:'none', w:3, d:'Reveal every enemy army for 6 months; your troops defend at +10% this month.'},
  partisans:{n:'Partisan Uprising',   ic:'✊', cost:15, tgt:'occ',  w:3, d:'Your occupied homeland rises: resistance surges and 3 partisan divisions appear if the garrison is thin.'},
  falseflag:{n:'False Flag',          ic:'⚑', cost:0,  tgt:'nation',w:2, d:'Declare war on a neighbour at no political cost and half the tension.'},
  convoy:   {n:'Lend-Lease Convoy',   ic:'⚓', cost:0,  tgt:'none', w:3, d:'+60 production, +15 oil and +10 steel arrive by sea.'},
  airraid:  {n:'Air Raid',            ic:'✈', cost:10, tgt:'enemy',w:3, d:'Bomb an enemy province: destroy a factory and shake its garrison.'},
  propag:   {n:'Propaganda Blitz',    ic:'📣', cost:0,  tgt:'none', w:3, d:'+35 politics and +5 stability.'},
  fortress: {n:'Fortress Order',      ic:'▮', cost:10, tgt:'own',  w:3, d:'Raise a province\'s forts by two levels at once.'},
  fifth:    {n:'Fifth Column',        ic:'☍', cost:15, tgt:'enemy',w:2, d:'Agents inside an enemy province halve its defense this month.'},
  rally:    {n:'Rally the Nation',    ic:'★', cost:10, tgt:'none', w:3, d:'+12 stability; all your troops dig in one level deeper.'},
  commando: {n:'Commando Raid',       ic:'⚔', cost:10, tgt:'enemy',w:3, d:'Wreck an enemy province\'s forts and entrenchment, and kill a division.'},
  mobilize: {n:'General Mobilisation',ic:'⚙', cost:10, tgt:'none', w:3, d:'+40k manpower and 4 infantry divisions at the capital.'},
  weather:  {n:'Weather Window',      ic:'☀', cost:10, tgt:'none', w:2, d:'Ignore winter and mud penalties this month.'},
  wolfpack: {n:'Wolfpack',            ic:'≋', cost:10, tgt:'none', w:2, d:'Your submarines raid triple this month and dodge escorts.'},
  coup:     {n:'Diplomatic Coup',     ic:'♔', cost:30, tgt:'nation',w:2, d:'A neutral minor joins your alliance (or adopts your ideology).'},
  sabotage: {n:'Industrial Sabotage', ic:'✂', cost:15, tgt:'nation',w:2, d:'An enemy nation loses 60 production and 10 oil.'},
  breakthru:{n:'Secret Breakthrough', ic:'⚗', cost:15, tgt:'none', w:2, d:'Every research project jumps two months ahead.'},
  human:    {n:'Human Wave',          ic:'⚑', cost:5,  tgt:'none', ide:'C', w:3, d:'+8 infantry divisions on your most threatened front.'},
  maginot:  {n:'Hold the Line',       ic:'▣', cost:10, tgt:'none', ide:'D', w:3, d:'All your provinces defend at +20% this month.'},
  march:    {n:'March on the Capital',ic:'⚜', cost:15, tgt:'none', ide:'F', w:3, d:'Attacks on enemy capitals and cities with 5+ victory points get +30% this month.'},
  peace:    {n:'Peace Overture',      ic:'☮', cost:20, tgt:'foe', w:2, d:'Force an AI enemy outside any alliance to accept a white peace.'},
};
const HAND_MAX = 4;

/* ---------- sea zones ---------- */
// generated with the map (data/map.js): x,y is where the fleet marker sits; which provinces touch which zone is in MAP.prov.
// Straits: passage between two zones closes to anyone at war with the strait's owner.
const SEA = {};
if (WORLD) for (const [k, n, x, y, adj] of MAP.seas) SEA[k] = { n, x, y, adj:adj ? adj.split(' ') : [] };
else Object.assign(SEA, {
  ARC:{n:'Barents Sea',       x:1520, y:70,   adj:['NOR']},
  NOR:{n:'Norwegian Sea',     x:900,  y:260,  adj:['ARC','NSE','ATL']},
  NSE:{n:'North Sea',         x:975,  y:545,  adj:['NOR','CHN','BAL']},
  CHN:{n:'English Channel',   x:790,  y:722,  adj:['NSE','ATL']},
  ATL:{n:'Atlantic',          x:500,  y:780,  adj:['NOR','CHN','WMD']},
  BAL:{n:'Baltic Sea',        x:1225, y:525,  adj:['NSE']},
  WMD:{n:'Western Mediterranean', x:900, y:1075, adj:['ATL','EMD']},
  EMD:{n:'Eastern Mediterranean', x:1380, y:1262, adj:['WMD','BLK','IND']},
  BLK:{n:'Black Sea',         x:1565, y:940,  adj:['EMD']},
  IND:{n:'Red Sea & Gulf',    x:1965, y:1395, adj:['EMD']},
  CAS:{n:'Caspian Sea',       x:1890, y:805,  adj:[]},
});
const STRAITS = { 'ATL|WMD':'Gibraltar', 'BLK|EMD':'Istanbul', 'EMD|IND':'Cairo', 'BAL|NSE':'Copenhagen', 'CAR|MPA':'Panama', 'BOB|SCS':'Singapore' };
const SEAKEY = (a, b) => a < b ? a + '|' + b : b + '|' + a;
// which provinces touch which sea zone on the Europe map (the world map carries this in its data)
const COAST_ZONES = {
  ARC:'Murmansk Arkhangelsk Naryan-Mar Pechora',
  NOR:'Reykjavík Bergen Trondheim Narvik Inverness',
  NSE:'Hamburg Essen Kiel Groningen Amsterdam Rotterdam Brussels Lille London Norwich Newcastle Inverness Jutland Oslo Gothenburg Bergen',
  CHN:'Normandy Brest Plymouth London Lille',
  ATL:'Glasgow Belfast Dublin Cork Cardiff Manchester Plymouth Brest Nantes Bordeaux Bilbao Galicia Porto Lisbon Seville Rabat Marrakesh Spanish_Sahara Reykjavík Gibraltar Tetuán',
  BAL:'Kiel Stettin Königsberg Bydgoszcz Danzig Copenhagen Malmö Stockholm Sundsvall Kiruna Oulu Tampere Helsinki Viipuri Leningrad Tallinn Riga Kaunas Pskov Novgorod',
  WMD:'Gibraltar Tetuán Granada Valencia Barcelona Zaragoza Marseille Toulouse Corsica Sardinia Algiers Oran Constantine Tunis Turin Florence Rome Naples Sicily Malta Tripoli Calabria',
  EMD:'Malta Sicily Calabria Bari Ancona Venice Trieste Split Zagreb Ljubljana Sarajevo Tirana Ioannina Athens Thessaloniki Crete Rhodes Izmir Antalya Adana Cyprus Aleppo Damascus Jerusalem Alexandria Cairo Benghazi Tobruk Tripoli Istanbul Siwa',
  BLK:'Istanbul Varna Constanța Bessarabia Odessa Sevastopol Krasnodar Rostov Trabzon Erzurum Ankara Tbilisi',
  IND:'Basra Shiraz Hofuf Medina Tabuk Cairo',
  CAS:'Baku Astrakhan Guryev Krasnovodsk Makhachkala Tehran Tabriz Grozny',
};

/* ---------- strategic resources ---------- */
const RESOURCES = {
  oil:{ Bucharest:6, Baku:10, Grozny:4, Krasnodar:2, Mosul:3, Basra:3, Shiraz:4, Hofuf:2, Guryev:2 },
  steel:{ Essen:6, Metz:4, Breslau:3, Kraków:2, Kiruna:6, Bilbao:2, Dnepropetrovsk:4, Kharkov:2, Sverdlovsk:3, Birmingham:3, Manchester:2, Newcastle:2, Glasgow:2, Lille:2, Prague:2, Milan:2, Stalingrad:2, Brussels:2, Budapest:1, Lyon:1, Turin:1 },
};

/* ---------- achievements ---------- */
const ACH = {
  first:{n:'First Blood',d:'Win your first battle.'},
  kessel:{n:'Kesselschlacht',d:'Encircle and destroy 5+ divisions at once.'},
  paris:{n:'Paris in Springtime',d:'Capture Paris as a foreign power.'},
  london:{n:'Sea Lion',d:'Capture London.'},
  moscow:{n:'Bring a Coat',d:'Capture Moscow.'},
  rock:{n:'The Rock',d:'Capture Gibraltar.'},
  blitz:{n:'Lightning War',d:'Knock out a nation within 3 months of declaring war.'},
  underdog:{n:'David and Goliath',d:'As a minor nation, force a great power to capitulate.'},
  empire:{n:'Alternate History',d:'Enact a destiny decision.'},
  v2:{n:'Vengeance Weapon',d:'Launch a rocket strike.'},
  bomb:{n:'Destroyer of Worlds',d:'Use the Bomb.'},
  swiss:{n:'Not So Neutral',d:'Capture Bern. Nobody does that.'},
  admiral:{n:'Rule the Waves',d:'Win a naval battle.'},
  ace:{n:'Knights of the Air',d:'Win the skies over a battle with fighters you built.'},
  backstab:{n:'Backstab',d:'Break a non-aggression pact.'},
  liberator:{n:'Liberator',d:'Restore a fallen nation to independence.'},
  oilbaron:{n:'Black Gold',d:'Control four oil provinces at once.'},
  general:{n:'Field Marshal',d:'Promote a general to the highest rank.'},
  partisan:{n:'The Resistance',d:'Liberate a province through a partisan uprising.'},
  peacemaker:{n:'Peace in Our Time',d:'Sign a peace treaty.'},
  cards:{n:'Card Sharp',d:'Play 15 strategy cards.'},
  spy:{n:'Licence to Kill',d:'Pull off 5 successful spy operations.'},
  world:{n:'Conqueror',d:'Win the game.'},
  survive:{n:'Still Standing',d:'Reach 1946 undefeated.'},
};

/* ---------- start dates ---------- */
const SCENARIOS = {
  1936:{n:'The Gathering Storm', y:1936, m:0, d:'January 1936. Rearmament, appeasement and a world that still hopes for peace.'},
  1939:{n:'Blitzkrieg',          y:1939, m:8, d:'September 1939. Germany has invaded Poland; Britain and France are at war.'},
  1941:{n:'Barbarossa',          y:1941, m:5, d:'June 1941. France has fallen. Three million men stand on the Soviet border.'},
  1944:{n:'Overlord',            y:1944, m:5, d:'June 1944. The Allies are poised to land in France; the Red Army rolls west.'},
};

/* ---------- multiplayer modes ---------- */
const MODES = {
  grand:{n:'Grand Campaign', d:'Any nations, 1936–1950. Win alone or as an alliance.', icon:'◈'},
  team: {n:'Team War',       d:'Axis vs Allies vs Comintern. Teammates share vision, aid and victory.', icon:'⚔'},
  blitz:{n:'Blitz',          d:'A fast war from September 1939 to 1942, boosted income. Highest score wins.', icon:'⚡'},
  coop: {n:'Co-op',          d:'All players on one side against a tougher AI coalition.', icon:'☆'},
};

/* ---------- career ranks (local profile) ---------- */
const RANKS = [[0,'Private'],[40,'Corporal'],[120,'Sergeant'],[260,'Lieutenant'],[480,'Captain'],[800,'Major'],[1250,'Colonel'],[1900,'Brigadier'],[2800,'General'],[4000,'Field Marshal']];
