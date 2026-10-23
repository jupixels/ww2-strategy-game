'use strict';
/* ================= STATIC GAME DATA ================= */
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_L = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TER = {
  p:{n:'Plains',d:1.0}, f:{n:'Forest',d:1.25}, h:{n:'Hills',d:1.3}, m:{n:'Mountains',d:1.6},
  d:{n:'Desert',d:1.0}, u:{n:'Urban',d:1.35}, s:{n:'Marsh',d:1.35}, t:{n:'Tundra',d:1.2}
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
  cap:{n:'Capital ships', pl:'Battle squadrons', pp:50, mp:4, st:8, oil:3, up:0.2, d:'Control the sea lanes, escort landings, bombard coasts.'},
  sub:{n:'Submarines', pl:'U-boat flotillas',   pp:20, mp:2,  st:2, oil:1, up:0.05, d:'Raid enemy convoys and cut their income.'},
};
const AIR_RANGE = 430;   // world units an air wing can reach from its base
const PARA_RANGE = 2;    // provinces

/* ---------- nations ---------- */
const NATDEF = {
  GER:{n:'Germany',a:'German',c:'#5f6973',i:'F',cap:'Berlin',major:1,stab:70,stars:2,
       u:{inf:38,arm:4,art:6,ftr:6,bmb:4},navy:{NSE:[2,4],BAL:[1,1]},tech:['inf1','art1','arm1','ftr1','bmb1','ind1','cap1','sub1','mobile'],
       flag:{t:'h',c:['#151515','#f2f2f2','#d02a2a']},
       brief:'The Reich is rearming fast. Ruthless, industrial and surrounded. Strike before the encirclement closes.'},
  ENG:{n:'United Kingdom',a:'British',c:'#b4464a',i:'D',cap:'London',major:1,stab:75,stars:2,
       u:{inf:24,arm:1,art:4,ftr:6,bmb:3},navy:{ATL:[5,2],NSE:[3,1],WMD:[2,0],EMD:[2,1]},tech:['inf1','art1','ftr1','bmb1','ind1','cap1','sub1'],
       flag:{t:'uk'},
       brief:'An island empire spread from Belfast to Cairo. The Channel protects you; the colonies stretch you thin.'},
  FRA:{n:'France',a:'French',c:'#3e66ad',i:'D',cap:'Paris',major:1,stab:55,stars:3,
       u:{inf:44,arm:2,art:8,ftr:4,bmb:2},navy:{ATL:[3,3],WMD:[3,3]},tech:['inf1','art1','arm1','ind1','cap1','sub1','depth'],
       flag:{t:'v',c:['#24479a','#f2f2f2','#d6282e']},
       brief:'The largest army in the West sits behind the Maginot Line. Can it move faster than 1940?'},
  ITA:{n:'Italy',a:'Italian',c:'#4d8b4c',i:'F',cap:'Rome',major:1,stab:60,stars:3,
       u:{inf:30,arm:1,art:4,mtn:2,ftr:5,bmb:3},navy:{WMD:[3,4],EMD:[3,4]},tech:['inf1','art1','mtn','ftr1','bmb1','cap1','sub1'],
       flag:{t:'v',c:['#2a8a3a','#f2f2f2','#d02a2a']},
       brief:'Mussolini dreams of Mare Nostrum. Libya, the Alps and the Balkans all lie within reach.'},
  SOV:{n:'Soviet Union',a:'Soviet',c:'#8f2b2b',i:'C',cap:'Moscow',major:1,stab:65,stars:1,
       u:{inf:90,arm:6,art:8,ftr:6,bmb:4},navy:{BAL:[1,3],BLK:[1,3],ARC:[0,1]},tech:['art1','arm1','ind1','ftr1','bmb1','sub1','mass'],
       flag:{t:'sov'},
       brief:'A vast land of endless manpower and harsh winters. Slow to wake, impossible to stop once roused.'},
  POL:{n:'Poland',a:'Polish',c:'#c46b95',i:'N',cap:'Warsaw',stab:60,stars:4,u:{inf:26,art:2,ftr:2},flag:{t:'h',c:['#f2f2f2','#dc143c']},tech:['inf1'],brief:'Squeezed between two giants. Survive 1939 and rewrite history.'},
  SPA:{n:'Spain',a:'Spanish',c:'#d6a63a',i:'N',cap:'Madrid',stab:35,stars:4,u:{inf:16,ftr:1},navy:{ATL:[1,1]},flag:{t:'h',c:['#c8102e','#f2c200','#6b2c86']},brief:'A civil war is coming. Pick a side, then pick a target.'},
  TUR:{n:'Turkey',a:'Turkish',c:'#3d9a90',i:'N',cap:'Ankara',stab:60,stars:3,u:{inf:18,mtn:2,ftr:1},navy:{BLK:[1,1]},flag:{t:'tur'},brief:'Guardian of the Straits. Revive the Ottoman glory if you dare.'},
  SWE:{n:'Sweden',a:'Swedish',c:'#58a4d4',i:'D',cap:'Stockholm',stab:75,stars:4,u:{inf:9,ftr:1},navy:{BAL:[1,0]},tech:['ind1'],flag:{t:'nordic',c:['#2a6bb0','#f2c200']},brief:'Iron ore and neutrality. Or the Kalmar Union reborn?'},
  NOR:{n:'Norway',a:'Norwegian',c:'#b06e58',i:'D',cap:'Oslo',stab:70,stars:5,u:{inf:5},flag:{t:'nordic',c:['#ba0c2f','#f2f2f2','#1d3f8a']}},
  FIN:{n:'Finland',a:'Finnish',c:'#d9d6c6',i:'D',cap:'Helsinki',stab:70,stars:5,u:{inf:9,mtn:1},tech:['inf1'],flag:{t:'nordic',c:['#f2f2f2','#1d3f8a']},brief:'Small, snowbound and very hard to kill.'},
  DEN:{n:'Denmark',a:'Danish',c:'#a8456a',i:'D',cap:'Copenhagen',stab:70,stars:5,u:{inf:3},flag:{t:'nordic',c:['#c8102e','#f2f2f2']}},
  HOL:{n:'Netherlands',a:'Dutch',c:'#e0893a',i:'D',cap:'Amsterdam',stab:70,stars:5,u:{inf:8,ftr:1},flag:{t:'h',c:['#ae1c28','#f2f2f2','#21468b']}},
  BEL:{n:'Belgium',a:'Belgian',c:'#cdb94a',i:'D',cap:'Brussels',stab:65,stars:5,u:{inf:10,art:1},flag:{t:'v',c:['#151515','#f2d200','#e02a2a']}},
  SWI:{n:'Switzerland',a:'Swiss',c:'#9c3d4f',i:'D',cap:'Bern',stab:85,stars:4,u:{inf:7,mtn:2},tech:['mtn'],flag:{t:'swiss'},brief:'A mountain fortress. Nobody attacks the Swiss. Yet.'},
  CZE:{n:'Czechoslovakia',a:'Czechoslovak',c:'#4ea0a6',i:'D',cap:'Prague',stab:60,stars:4,u:{inf:16,art:2,arm:1,ftr:1},tech:['inf1','art1','arm1'],flag:{t:'cze'},brief:'Škoda works, mountain forts, and a deadly appointment in Munich.'},
  AUS:{n:'Austria',a:'Austrian',c:'#e1d6bc',i:'N',cap:'Vienna',stab:45,stars:5,u:{inf:5},flag:{t:'h',c:['#c8102e','#f2f2f2','#c8102e']}},
  HUN:{n:'Hungary',a:'Hungarian',c:'#a87b50',i:'N',cap:'Budapest',stab:55,stars:4,u:{inf:8,ftr:1},flag:{t:'h',c:['#ce2939','#f2f2f2','#477050']}},
  ROM:{n:'Romania',a:'Romanian',c:'#c4ad3a',i:'N',cap:'Bucharest',stab:50,stars:4,u:{inf:16,ftr:1},flag:{t:'v',c:['#002b7f','#fcd116','#ce1126']},brief:'Oil fields everyone wants.'},
  YUG:{n:'Yugoslavia',a:'Yugoslav',c:'#6a5aae',i:'N',cap:'Belgrade',stab:45,stars:4,u:{inf:16},flag:{t:'h',c:['#21468b','#f2f2f2','#c8102e']}},
  BUL:{n:'Bulgaria',a:'Bulgarian',c:'#5c8a3c',i:'N',cap:'Sofia',stab:55,stars:4,u:{inf:8},flag:{t:'h',c:['#f2f2f2','#00966e','#d62612']}},
  GRE:{n:'Greece',a:'Greek',c:'#79b3da',i:'N',cap:'Athens',stab:55,stars:4,u:{inf:10,mtn:1},flag:{t:'gre'},brief:'Byzantium sleeps beneath Constantinople. Wake it.'},
  ALB:{n:'Albania',a:'Albanian',c:'#9a5a8a',i:'N',cap:'Tirana',stab:45,stars:5,u:{inf:2},flag:{t:'h',c:['#e41e20']}},
  IRE:{n:'Ireland',a:'Irish',c:'#7bbf5c',i:'D',cap:'Dublin',stab:70,stars:5,u:{inf:3},flag:{t:'v',c:['#169b62','#f2f2f2','#ff883e']}},
  ICE:{n:'Iceland',a:'Icelandic',c:'#8eb0c6',i:'D',cap:'Reykjavík',stab:80,stars:5,u:{inf:1},flag:{t:'nordic',c:['#02529c','#f2f2f2','#dc1e35']}},
  EST:{n:'Estonia',a:'Estonian',c:'#5e80a2',i:'N',cap:'Tallinn',stab:60,stars:5,u:{inf:3},flag:{t:'h',c:['#0072ce','#151515','#f2f2f2']}},
  LAT:{n:'Latvia',a:'Latvian',c:'#8b6b4c',i:'N',cap:'Riga',stab:60,stars:5,u:{inf:3},flag:{t:'h',c:['#9e3039','#f2f2f2','#9e3039'],w:[2,1,2]}},
  LIT:{n:'Lithuania',a:'Lithuanian',c:'#b9a24e',i:'N',cap:'Kaunas',stab:60,stars:5,u:{inf:3},flag:{t:'h',c:['#fdb913','#006a44','#c1272d']}},
  IRQ:{n:'Iraq',a:'Iraqi',c:'#c09060',i:'N',cap:'Baghdad',stab:40,stars:5,u:{inf:4},flag:{t:'h',c:['#151515','#f2f2f2','#2a8a3a']}},
  PER:{n:'Iran',a:'Iranian',c:'#9b70c2',i:'N',cap:'Tehran',stab:55,stars:4,u:{inf:8},flag:{t:'h',c:['#239f40','#f2f2f2','#da0000']}},
  SAU:{n:'Saudi Arabia',a:'Saudi',c:'#7d9c4c',i:'N',cap:'Riyadh',stab:60,stars:5,u:{inf:4},flag:{t:'h',c:['#106b3a']}},
  POR:{n:'Portugal',a:'Portuguese',c:'#2e7a51',i:'N',cap:'Lisbon',stab:65,stars:5,u:{inf:5},flag:{t:'v',c:['#046a38','#da291c'],w:[2,3]}},
  VIC:{n:'Vichy France',a:'Vichy',c:'#8794b8',i:'F',cap:'Marseille',stab:40,stars:5,hidden:1,flag:{t:'v',c:['#24479a','#f2f2f2','#d6282e']}},
  USA:{n:'United States',a:'American',c:'#4a6fa0',i:'D',off:1,hidden:1,flag:{t:'usa'}},
};
const MAJORS = ['GER','ENG','FRA','ITA','SOV'];

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
};
const GEN_NAMES = ['Col. Varga','Gen. Novak','Gen. Petrov','Gen. Haas','Gen. Moreau','Gen. Silva','Gen. Kowal','Gen. Dimitrov','Gen. Lindqvist','Gen. Rossi','Gen. Brennan','Gen. Popescu'];
const GEN_TRAITS = Object.keys(TRAITS);

/* ---------- technology: four branches, timed research in parallel slots ---------- */
const BRANCHES = { land:'Land Warfare', air:'Air & Naval', doc:'Doctrine', ind:'Industry & Science' };
const TECHS = [
  {k:'inf1', b:'land', n:'Improved Rifles',       y:1936, m:3, d:'+15% infantry, mountain and airborne strength.'},
  {k:'art1', b:'land', n:'Field Artillery',       y:1936, m:3, d:'Unlocks artillery divisions.'},
  {k:'mtn',  b:'land', n:'Mountain Warfare',      y:1936, m:3, d:'Unlocks mountain divisions.'},
  {k:'arm1', b:'land', n:'Light Tanks',           y:1936, m:4, d:'Unlocks armored divisions.'},
  {k:'arm2', b:'land', n:'Medium Tanks',          y:1938, m:4, req:'arm1', d:'+0.5 armor strength.'},
  {k:'inf2', b:'land', n:'Semi-Automatic Weapons',y:1939, m:4, req:'inf1', d:'+15% infantry strength.'},
  {k:'para', b:'land', n:'Airborne Troops',       y:1938, m:4, req:'inf1', d:'Unlocks paratroopers.'},
  {k:'art2', b:'land', n:'Rocket Artillery',      y:1941, m:4, req:'art1', d:'+30% artillery strength.'},
  {k:'arm3', b:'land', n:'Heavy Tanks',           y:1941, m:5, req:'arm2', d:'+0.5 armor strength, +0.3 armor defense.'},
  {k:'inf3', b:'land', n:'Assault Rifles',        y:1943, m:5, req:'inf2', d:'+15% infantry strength.'},
  {k:'ftr1', b:'air',  n:'Monoplane Fighters',    y:1936, m:3, d:'Unlocks fighter wings.'},
  {k:'bmb1', b:'air',  n:'Medium Bombers',        y:1936, m:3, d:'Unlocks bomber wings.'},
  {k:'radar',b:'air',  n:'Radar',                 y:1938, m:4, d:'See every enemy unit. Fighters defend at +25%.'},
  {k:'ftr2', b:'air',  n:'Advanced Fighters',     y:1940, m:4, req:'ftr1', d:'+30% fighter strength.'},
  {k:'bmb2', b:'air',  n:'Strategic Bombers',     y:1941, m:4, req:'bmb1', d:'Bomb raids hit twice as hard, +range.'},
  {k:'jet',  b:'air',  n:'Jet Engines',           y:1944, m:6, req:'ftr2', d:'+60% fighter strength.'},
  {k:'cap1', b:'air',  n:'Capital Ships',         y:1936, m:4, d:'Unlocks battle squadrons.'},
  {k:'sub1', b:'air',  n:'Submarines',            y:1936, m:3, d:'Unlocks submarine flotillas.'},
  {k:'sub2', b:'air',  n:'Wolfpack Tactics',      y:1940, m:4, req:'sub1', d:'Submarines raid twice as effectively.'},
  {k:'carrier',b:'air',n:'Carrier Aviation',      y:1941, m:5, req:'cap1', d:'+40% capital ship strength; fleets give air cover to landings.'},
  {k:'depth',b:'doc',  n:'Defense in Depth',      y:1936, m:3, d:'+10% defense everywhere.'},
  {k:'mobile',b:'doc', n:'Mobile Warfare',        y:1936, m:3, d:'Armor attacks at +10%.'},
  {k:'blitz',b:'doc',  n:'Blitzkrieg',            y:1938, m:4, req:'mobile', d:'Armor can attack again after a crushing win.'},
  {k:'mass', b:'doc',  n:'Mass Assault',          y:1936, m:3, d:'Infantry costs 25% less production and manpower.'},
  {k:'grand',b:'doc',  n:'Grand Battleplan',      y:1938, m:4, req:'depth', d:'Dug-in troops get double entrenchment bonus.'},
  {k:'combined',b:'doc',n:'Combined Arms',        y:1941, m:5, req:'mobile', d:'+15% attack for armies mixing armor, artillery and infantry.'},
  {k:'amph', b:'doc',  n:'Amphibious Doctrine',   y:1940, m:4, d:'Naval landings fight at 75% instead of 50%.'},
  {k:'ind1', b:'ind',  n:'Assembly Lines',        y:1936, m:4, d:'+10% production.'},
  {k:'ind2', b:'ind',  n:'Mass Production',       y:1938, m:4, req:'ind1', d:'+10% production.'},
  {k:'synth',b:'ind',  n:'Synthetic Oil',         y:1938, m:4, d:'+4 oil every month.'},
  {k:'ind3', b:'ind',  n:'Automation',            y:1942, m:5, req:'ind2', d:'+15% production.'},
  {k:'rocket',b:'ind', n:'Rocketry',              y:1941, m:5, d:'One free V-weapon strike every month.'},
  {k:'atom', b:'ind',  n:'Nuclear Physics',       y:1942, m:6, d:'Opens the road to the Bomb.'},
  {k:'bomb', b:'ind',  n:'The Bomb',              y:1944, m:8, req:'atom', d:'One atomic strike every six months.'},
];
const TECH = {}; TECHS.forEach(t => TECH[t.k] = t);
const techCost = T => 25 + T.m * 12 + Math.max(0, T.y - 1936) * 4;

/* ---------- national focus: shared tree plus national branches ---------- */
// col/row place each focus in the tree view; req links to its parent
const FOCUS = [
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
  {k:'min_neut',   minor:1,     col:5,row:0, n:'Armed Neutrality', m:3, d:'+1 fort everywhere on the border, +10 stability.'},
  {k:'min_army',   minor:1,     col:5,row:1, req:'min_neut', n:'Modernise the Army', m:4, d:'+4 artillery divisions; Improved Rifles researched.'},
  {k:'min_patron', minor:1,     col:5,row:2, req:'min_army', n:'Seek a Patron', m:2, d:'+60 production of foreign aid, +30 politics.'},
];
const FOC = {}; FOCUS.forEach(f => FOC[f.k] = f);
const focusFor = (t, major) => FOCUS.filter(f => f.who ? f.who.includes(t) : f.minor ? !major : true);

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
  {k:'caesar',who:null,n:'Masters of Europe',name:null,color:null,need:'60%',d:'Hold 60% of Europe\'s victory points to crown your dominion.'},
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
// x,y: where the fleet marker sits. Straits: passage between two zones closes to anyone at war with the strait's owner.
const SEA = {
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
};
const STRAITS = { 'ATL|WMD':'Gibraltar', 'BLK|EMD':'Istanbul', 'EMD|IND':'Cairo', 'BAL|NSE':'Copenhagen' };
const SEAKEY = (a, b) => a < b ? a + '|' + b : b + '|' + a;
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
