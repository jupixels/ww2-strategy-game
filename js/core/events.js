'use strict';
/* ================= HISTORICAL EVENTS =================
   actor: the nation that decides. If it is a human, they get `opts`; if a human is among `tgt` and the actor is AI,
   they get `topts`; otherwise the AI takes opts[0] and everyone reads about it. Option functions receive the chooser. */
const at = (t, name) => { const id = ID[name]; return id != null && G.prov[id].o === t; };
const frontOf = (t, e) => owned(t).filter(i => PROV[i].adj.some(j => G.prov[j].o === e));
function reinforce(t, where, u) {
  let id = typeof where === 'string' ? ID[where] : where;
  if (id == null || G.prov[id].o !== t) id = homeProv(t);
  if (id < 0) return;
  for (const k in u) G.prov[id].u[k] += u[k];
}
const EVENTS = [
  { id:'rhine', y:1936, m:2, actor:'GER', cond:() => A('GER') && O('Cologne') === 'GER',
    title:'Troops Enter the Rhineland', dek:'German battalions cross the Rhine bridges at dawn while Paris and London file protests',
    text:'In open defiance of Versailles and Locarno, the Wehrmacht has reoccupied the demilitarised Rhineland. Officers carried sealed orders to withdraw at the first sign of French resistance. None came.',
    opts:[{ t:'March in', e:'+1 fort on the Rhine, +20 politics', f(){ ['Cologne','Essen','Saarbrücken'].forEach(n => { const p = G.prov[ID[n]]; if (p.o === 'GER') p.fort++; }); nat('GER').pol += 20; tension(4); } },
          { t:'Hold back', e:'+5 stability', f(){ nat('GER').stab += 5; } }] },
  { id:'ethiopia', y:1936, m:4, actor:'ITA', cond:() => A('ITA'),
    title:'Victory in Abyssinia', dek:'Marshal Badoglio enters Addis Ababa; the King of Italy becomes an Emperor',
    text:'The League of Nations protests, imposes half-hearted sanctions and then quietly lifts them. In Rome the crowds cheer a new empire in the Horn of Africa.',
    opts:[{ t:'Proclaim the Empire', e:'+10 stability, +20 politics, tension rises', f(){ const n = nat('ITA'); n.stab += 10; n.pol += 20; tension(3); } },
          { t:'Keep it quiet', e:'+40 production', f(){ nat('ITA').pp += 40; } }] },
  { id:'spain', y:1936, m:6, actor:'SPA', cond:() => A('SPA') && enemiesOf('SPA').length === 0,
    title:'Civil War in Spain', dek:'Generals rise in Morocco; Madrid hands rifles to the workers',
    text:'The Republic and the Nationalists are tearing Spain apart. Volunteers pour in from across Europe, and foreign air forces test their newest bombers over Spanish towns. Whoever wins will inherit a ruined country.',
    opts:[{ t:'Back the Nationalists', e:'Spain turns Fascist · production halved until April 1939', f(){ setIde('SPA','F'); G.flags.spain = ymNum(1939, 3); } },
          { t:'Defend the Republic', e:'Spain turns Communist · production halved until April 1939', f(){ setIde('SPA','C'); G.flags.spain = ymNum(1939, 3); } }] },
  { id:'olympics', y:1936, m:7, actor:'GER', cond:() => A('GER') && O('Berlin') === 'GER',
    title:'The Berlin Olympics', dek:'Jesse Owens wins four gold medals in front of the regime\'s cameras',
    text:'For two weeks the banners come down and the city shows its friendliest face to the world. Foreign visitors leave impressed. The rearmament continues behind the stadium walls.',
    opts:[{ t:'Show the world a new Germany', e:'+8 stability, tension eases', f(){ nat('GER').stab += 8; tension(-3); } }] },
  { id:'axis', y:1936, m:10, actor:'ITA', cond:() => A('ITA') && A('GER') && !W('ITA','GER') && !facOf('ITA') && facOf('GER') === 'AXIS',
    title:'The Rome–Berlin Axis', dek:'Mussolini announces an axis around which all of Europe will now revolve',
    text:'Count Ciano returns from Germany with a signed protocol. Rome and Berlin pledge to coordinate their foreign policy and to stand together against Bolshevism and the old democracies.',
    opts:[{ t:'Sign with Berlin', e:'Italy joins the Axis', f(){ joinFaction('ITA','AXIS'); } }, { t:'Keep a free hand', e:'Italy stays independent', f(){} }] },
  { id:'abdication', y:1936, m:11, actor:'ENG', cond:() => A('ENG'),
    title:'The King Abdicates', dek:'Edward VIII gives up the throne for the woman he loves',
    text:'"I have found it impossible to carry the heavy burden of responsibility without the help and support of the woman I love." His brother becomes George VI, a shy man with a stammer.',
    opts:[{ t:'God save King George', e:'+5 stability', f(){ nat('ENG').stab += 5; } }] },
  { id:'purge', y:1937, m:5, actor:'SOV', cond:() => A('SOV'),
    title:'The Great Purge', dek:'Marshal Tukhachevsky and seven generals shot as "enemies of the people"',
    text:'The NKVD works through the officer corps with a list. Three of five marshals, most army commanders and tens of thousands of officers vanish. The survivors learn never to show initiative.',
    opts:[{ t:'Purge the officer corps', e:'Red Army fights at −20% until 1942 · +60 politics', f(){ G.flags.purge = 1; nat('SOV').pol += 60; } },
          { t:'Spare the generals', e:'Lose 30 politics and 10 stability; the army keeps its brains', f(){ const n = nat('SOV'); n.pol = Math.max(0, n.pol - 30); n.stab -= 10; } }] },
  { id:'anschluss', y:1938, m:2, actor:'GER', tgt:['AUS'], cond:() => A('GER') && A('AUS') && !W('GER','AUS') && O('Munich') === 'GER' && O('Vienna') === 'AUS',
    title:'Anschluss', dek:'German troops are greeted with flowers on the road to Vienna',
    text:'Chancellor Schuschnigg\'s plebiscite never takes place. Under threat of invasion he resigns, and by nightfall the frontier posts are gone. Austria is now a province of the Reich.',
    opts:[{ t:'Annex Austria', e:'Austria joins Germany', f(){ annex('AUS','GER'); tension(6); } }, { t:'Respect the border', e:'Austria stays independent', f(){} }],
    topts:[{ t:'Submit to Berlin', e:'Austria is annexed — you continue as Germany', f(){ annex('AUS','GER'); tension(6); } }, { t:'Resist!', e:'War with Germany', f(){ declareWar('GER','AUS', { quiet:false }); } }] },
  { id:'munich', y:1938, m:8, actor:'GER', tgt:['CZE'], cond:() => A('GER') && A('CZE') && !W('GER','CZE') && O('Sudetenland') === 'CZE',
    title:'Peace for Our Time', dek:'Chamberlain flies home from Munich waving a piece of paper',
    text:'Britain, France and Italy have agreed that the German-speaking Sudetenland will be handed to the Reich. Czechoslovakia was not invited to the conference. Its border forts are surrendered without a shot.',
    opts:[{ t:'Demand the Sudetenland', e:'Gain the Sudetenland peacefully', f(){ transfer(['Sudetenland'],'GER'); tension(8); } }, { t:'Not yet', e:'Ask again in three months', retry:3, f(){} }],
    topts:[{ t:'Accept the Munich Agreement', e:'Lose the Sudetenland', f(){ transfer(['Sudetenland'],'GER'); tension(8); } },
           { t:'Mobilise and fight', e:'War with Germany — France may stand with you', f(){ if (rnd() < 0.65 && A('FRA')) joinFaction('CZE', facOf('FRA') || 'ALLIES'); declareWar('GER','CZE'); } }] },
  { id:'prague', y:1939, m:2, actor:'GER', tgt:['CZE'], cond:() => A('GER') && A('CZE') && !W('GER','CZE') && O('Sudetenland') === 'GER',
    title:'German Tanks in Prague', dek:'Bohemia and Moravia become a "protectorate"; Hungary seizes Ruthenia',
    text:'Six months after Munich the rest of Czechoslovakia is swallowed whole. The Škoda works now build tanks for the Wehrmacht. In London, appeasement dies overnight: Britain begins guaranteeing the small nations of Europe.',
    opts:[{ t:'Occupy Bohemia', e:'Annex Czechoslovakia · Allies start guaranteeing minors', f(){ if (A('HUN')) transfer(['Ruthenia'],'HUN'); annex('CZE','GER'); tension(10); G.flags.guarantee = 1; } }, { t:'Not yet', e:'Ask again in three months', retry:3, f(){} }],
    topts:[{ t:'Submit', e:'Annexed — you continue as Germany', f(){ if (A('HUN')) transfer(['Ruthenia'],'HUN'); annex('CZE','GER'); tension(10); G.flags.guarantee = 1; } }, { t:'Fight to the last', e:'War with Germany', f(){ G.flags.guarantee = 1; declareWar('GER','CZE'); } }] },
  { id:'albania', y:1939, m:3, actor:'ITA', tgt:['ALB'], cond:() => A('ITA') && A('ALB') && !W('ITA','ALB'),
    title:'Italy Lands in Albania', dek:'King Zog flees to Greece with the national treasury',
    text:'Italian troops come ashore at Durrës on Good Friday. Resistance collapses within days and King Victor Emmanuel adds another crown to his collection.',
    opts:[{ t:'Invade', e:'Annex Albania', f(){ annex('ALB','ITA'); tension(4); } }, { t:'Leave Albania be', e:'Nothing changes', f(){} }],
    topts:[{ t:'Accept the inevitable', e:'Annexed — you continue as Italy', f(){ annex('ALB','ITA'); } }, { t:'To the mountains!', e:'War with Italy', f(){ declareWar('ITA','ALB'); } }] },
  { id:'guarantee', y:1939, m:3, actor:'ENG', tgt:['POL'], cond:() => A('ENG') && A('POL') && !facOf('POL') && facOf('ENG') && !W('ENG','POL') && !W('POL','GER'),
    title:'Britain Guarantees Poland', dek:'Chamberlain tells the Commons: Britain will stand by Poland',
    text:'Having watched Prague fall, London draws a line in the sand. Any attack on Polish independence will be met by Britain and France. Whether they can actually help Warsaw is another question.',
    opts:[{ t:'Guarantee Poland', e:'Poland joins your alliance', f(){ joinFaction('POL', facOf('ENG')); G.flags.guarantee = 1; } }, { t:'No continental commitments', e:'Poland stands alone', f(){} }],
    topts:[{ t:'Accept the guarantee', e:'Join the Allies', f(){ joinFaction('POL', facOf('ENG')); G.flags.guarantee = 1; } }, { t:'Stand alone', e:'Stay unaligned', f(){} }] },
  { id:'pact', y:1939, m:7, actor:'GER', tgt:['SOV'], cond:() => A('GER') && A('SOV') && !W('GER','SOV'),
    title:'The Molotov–Ribbentrop Pact', dek:'Sworn enemies sign a pact of non-aggression; a secret protocol divides Eastern Europe',
    text:'The world wakes to photographs of Stalin toasting Ribbentrop in the Kremlin. Publicly it is a non-aggression treaty. Privately, Poland, the Baltic states and Bessarabia have been carved into spheres of influence.',
    opts:[{ t:'Sign the pact', e:'Spheres of influence agreed with Moscow', f(){ G.flags.pact = 1; G.pacts[wkey('GER','SOV')] = G.turn + 22; } }, { t:'Refuse', e:'No deal with Stalin', f(){} }],
    topts:[{ t:'Sign', e:'Free hand in the Baltics, eastern Poland and Bessarabia', f(){ G.flags.pact = 1; G.pacts[wkey('GER','SOV')] = G.turn + 22; } }, { t:'Refuse', e:'No deal with Hitler', f(){} }] },
  { id:'weiss', y:1939, m:8, actor:'GER', cond:() => A('GER') && A('POL') && !W('GER','POL'),
    title:'Germany Invades Poland', dek:'The battleship Schleswig-Holstein opens fire on the Westerplatte at 04:45',
    text:'Without a declaration of war, German armies cross into Poland from three sides. Britain and France issue ultimatums that expire unanswered. The Second World War has begun.',
    opts:[{ t:'Fall Weiss: invade', e:'War with Poland and its guarantors', f(){ declareWar('GER','POL'); } }, { t:'Not yet', e:'Ask again in three months', retry:3, f(){} }] },
  { id:'sovpol', y:1939, m:8, actor:'SOV', cond:() => A('SOV') && A('POL') && G.flags.pact && W('GER','POL') && !W('SOV','POL'),
    title:'The Red Army Crosses into Poland', dek:'Moscow announces it is "protecting" Ukrainians and Belarusians',
    text:'With the Polish army fighting for its life in the west, Soviet columns roll across the undefended eastern border. The secret protocol is being carried out to the letter.',
    opts:[{ t:'Claim eastern Poland', e:'Take Wilno, Brest-Litovsk and Lwów', f(){ grab('SOV', ['Wilno','Brest-Litovsk','Lwów'], 'POL'); tension(4); } }, { t:'Stay out', e:'Nothing changes', f(){} }] },
  { id:'ore', y:1939, m:9, actor:'SWE', cond:() => A('SWE') && A('GER') && A('ENG') && W('GER','ENG') && !W('SWE','GER'),
    title:'Swedish Iron Ore', dek:'Ore trains roll from Kiruna to Narvik as both sides court Stockholm',
    text:'German steel mills run on Swedish ore. London demands an embargo; Berlin hints that a refusal would be "regrettable". The Swedish cabinet must choose its customer.',
    opts:[{ t:'Keep selling to Germany', e:'+80 production; Germany +40 steel', f(){ nat('SWE').pp += 80; nat('GER').steel += 40; } },
          { t:'Embargo Germany', e:'+30 politics, Britain grateful; Germany angered', f(){ nat('SWE').pol += 30; if (A('ENG')) nat('ENG').steel += 20; tension(2); } }] },
  { id:'winter', y:1939, m:10, actor:'SOV', tgt:['FIN'], cond:() => A('SOV') && A('FIN') && !W('SOV','FIN') && O('Viipuri') === 'FIN' && O('Leningrad') === 'SOV',
    title:'The Winter War', dek:'Soviet bombers strike Helsinki; the Red Army attacks across the Karelian Isthmus',
    text:'Moscow demanded a buffer around Leningrad; Helsinki refused. Now half a million Soviet soldiers march into the snow against ski troops who know every tree in the forest.',
    opts:[{ t:'Attack Finland', e:'War with Finland', f(){ declareWar('SOV','FIN'); G.flags.winter = 1; } }, { t:'Leave Finland alone', e:'Nothing changes', f(){} }] },
  { id:'winterpeace', y:1940, m:2, actor:'SOV', tgt:['FIN'], cond:() => G.flags.winter && W('SOV','FIN') && A('FIN') && O('Helsinki') === 'FIN',
    title:'The Moscow Peace Treaty', dek:'Finland cedes Karelia but keeps its independence',
    text:'The Red Army has paid a terrible price in the snow. Both sides are ready to end it: Finland gives up Viipuri, and the Soviet Union stops at the new border.',
    opts:[{ t:'Make peace', e:'Annex Viipuri, end the war', f(){ endWar('SOV','FIN'); G.truce[wkey('SOV','FIN')] = G.turn + 14; transfer(['Viipuri'].filter(n => O(n) === 'FIN'), 'SOV'); } }, { t:'Fight on', e:'The war continues', f(){} }],
    topts:[{ t:'Accept the terms', e:'Cede Viipuri for peace', f(){ endWar('SOV','FIN'); G.truce[wkey('SOV','FIN')] = G.turn + 14; transfer(['Viipuri'].filter(n => O(n) === 'FIN'), 'SOV'); } }, { t:'Never!', e:'The war continues', f(){} }] },
  { id:'weser', y:1940, m:3, actor:'GER', cond:() => A('GER') && W('GER','ENG') && A('NOR') && A('DEN') && !W('GER','NOR'),
    title:'Operation Weserübung', dek:'German troops land in Oslo and cross into Denmark before breakfast',
    text:'To secure the iron ore routes from Sweden, the Reich strikes north. Copenhagen surrenders within hours. In Norway, the King escapes into the mountains and the fight goes on.',
    opts:[{ t:'Strike north', e:'War with Denmark and Norway', f(){ declareWar('GER','DEN'); declareWar('GER','NOR'); } }, { t:'Not now', e:'Ask again in two months', retry:2, f(){} }] },
  { id:'gelb', y:1940, m:4, actor:'GER', cond:() => A('GER') && A('FRA') && W('GER','FRA') && (A('HOL') || A('BEL')) && !W('GER','BEL') && !W('GER','HOL'),
    title:'Fall Gelb', dek:'Panzers pour through the Ardennes; paratroopers seize the Belgian forts',
    text:'The phoney war is over. While the Allies rush north into Belgium, German armored divisions slip through forests everyone thought were impassable to tanks.',
    opts:[{ t:'Through the Low Countries', e:'War with the Netherlands and Belgium', f(){ if (A('HOL')) declareWar('GER','HOL'); if (A('BEL')) declareWar('GER','BEL'); } }, { t:'Not yet', e:'Ask again in two months', retry:2, f(){} }] },
  { id:'dunkirk', y:1940, m:4, actor:'ENG', cond:() => A('ENG') && A('GER') && W('ENG','GER') && isAxis(O('Paris')) && O('London') === 'ENG',
    title:'The Miracle of Dunkirk', dek:'Destroyers, ferries and pleasure boats bring 338,000 men home across the Channel',
    text:'With the Allied armies cut off on the beaches, every vessel that can float sails for Dunkirk. The army leaves its guns behind, but the men come home to fight another day.',
    opts:[{ t:'Operation Dynamo', e:'+6 infantry at London, +10 stability', f(){ reinforce('ENG', 'London', { inf:6 }); nat('ENG').stab += 10; } },
          { t:'Leave a rearguard', e:'+40 politics, the army is lost', f(){ nat('ENG').pol += 40; } }] },
  { id:'itawar', y:1940, m:5, actor:'ITA', cond:() => A('ITA') && isAxis('ITA') && A('GER') && (W('GER','FRA') || W('GER','ENG')) && A('ENG') && !W('ITA','ENG'),
    title:'Italy Declares War', dek:'Mussolini addresses the crowd from the balcony of the Palazzo Venezia',
    text:'"The hour of irrevocable decisions has struck." Sensing a quick victory, Italy joins the war against Britain and France. Its generals warn that the army will not be ready until 1942.',
    opts:[{ t:'Join the war', e:'War with Britain and France', f(){ ['ENG','FRA'].forEach(t => A(t) && declareWar('ITA', t)); } }, { t:'Stay non-belligerent', e:'Ask again in three months', retry:3, f(){} }] },
  { id:'baltic', y:1940, m:5, actor:'SOV', tgt:['EST','LAT','LIT'], cond:() => A('SOV') && G.flags.pact && (A('EST') || A('LAT') || A('LIT')),
    title:'The Baltic States Absorbed', dek:'Rigged elections deliver 99% for union with the USSR',
    text:'Soviet garrisons arrive, then new governments, then a request to join the Soviet Union. Romania is ordered to hand over Bessarabia within 48 hours, and complies.',
    opts:[{ t:'Annex the Baltics and Bessarabia', e:'Annex Estonia, Latvia, Lithuania; take Bessarabia', f(){ balticGrab(); } }, { t:'Leave them', e:'Nothing changes', f(){} }],
    topts:[{ t:'Submit', e:'Annexed — you continue as the Soviet Union', f(){ balticGrab(); } }, { t:'Resist', e:'War with the Soviet Union', f(who){ declareWar('SOV', who); } }] },
  { id:'britain', y:1940, m:7, actor:'GER', tgt:['ENG'], cond:() => A('GER') && A('ENG') && W('GER','ENG') && O('London') === 'ENG',
    title:'The Battle of Britain', dek:'The Luftwaffe sends its bombers against the airfields of southern England',
    text:'Day after day the contrails knot above Kent. Radar stations track every raid; young pilots fly four sorties before dinner. If the RAF breaks, the invasion barges wait in the Channel ports.',
    opts:[{ t:'Adlerangriff: attack!', e:'An air war over England decides who rules the Channel skies', f(){ battleOfBritain(); } }, { t:'Turn east instead', e:'+20 politics', f(){ nat('GER').pol += 20; } }],
    topts:[{ t:'Never was so much owed…', e:'The air battle is fought over England', f(){ battleOfBritain(); } }] },
  { id:'greece', y:1940, m:9, actor:'ITA', tgt:['GRE'], cond:() => A('ITA') && A('GRE') && !W('ITA','GRE') && O('Tirana') === 'ITA',
    title:'Italy Invades Greece', dek:'"Ochi!" — Prime Minister Metaxas rejects the ultimatum with one word',
    text:'Italian divisions march out of Albania into the Pindus mountains in autumn rain. The Greeks counter-attack and push them back over the border.',
    opts:[{ t:'Attack from Albania', e:'War with Greece', f(){ declareWar('ITA','GRE'); } }, { t:'Not now', e:'Ask again in three months', retry:3, f(){} }] },
  { id:'tripartite', y:1940, m:10, actor:'HUN', cond:() => facOf('GER') === 'AXIS' && A('HUN') && !facOf('HUN') && !W('HUN','GER'),
    title:'Hungary Joins the Tripartite Pact', dek:'Budapest signs in Vienna, hoping for Transylvania',
    text:'Regent Horthy has chosen his side. The pact promises territorial revisions — and drags Hungary into a war it cannot win alone.',
    opts:[{ t:'Sign the pact', e:'Join the Axis', f(){ joinFaction('HUN','AXIS'); } }, { t:'Stay out', e:'Remain unaligned', f(){} }] },
  { id:'romaxis', y:1940, m:10, actor:'ROM', cond:() => facOf('GER') === 'AXIS' && A('ROM') && !facOf('ROM') && !W('ROM','GER'),
    title:'Romania Joins the Axis', dek:'General Antonescu seizes power and invites German troops in to guard the oil',
    text:'Stripped of Bessarabia and Transylvania, Romania seeks protection from Berlin. German divisions arrive to guard the Ploiești oil fields.',
    opts:[{ t:'Join the Axis', e:'Axis membership', f(){ joinFaction('ROM','AXIS'); } }, { t:'Stay out', e:'Remain unaligned', f(){} }] },
  { id:'lendlease', y:1941, m:2, actor:'ENG', cond:() => A('ENG') && !G.flags.usa && enemiesOf('ENG').some(isAxis),
    title:'The Lend-Lease Act', dek:'Congress lets the President lend arms to any nation vital to American defense',
    text:'"We must be the great arsenal of democracy." Convoys of tanks, trucks, aircraft and oil begin crossing the Atlantic — if the U-boats let them through.',
    opts:[{ t:'Accept American aid', e:'+100 production, +25 oil, +25 steel', f(){ const n = nat('ENG'); n.pp += 100; n.oil += 25; n.steel += 25; } }] },
  { id:'bulaxis', y:1941, m:2, actor:'BUL', cond:() => facOf('GER') === 'AXIS' && A('BUL') && !facOf('BUL') && !W('BUL','GER'),
    title:'Bulgaria Joins the Axis', dek:'Sofia signs; German columns cross the Danube on pontoon bridges',
    text:'Tsar Boris III hesitates for months, but with the Wehrmacht already on his doorstep the choice is made for him.',
    opts:[{ t:'Join the Axis', e:'Axis membership', f(){ joinFaction('BUL','AXIS'); } }, { t:'Stay out', e:'Remain unaligned', f(){} }] },
  { id:'yugo', y:1941, m:3, actor:'GER', cond:() => A('GER') && A('YUG') && !W('GER','YUG') && !W('GER','SOV') && !facOf('YUG'),
    title:'Operation Punishment', dek:'The Luftwaffe bombs Belgrade on Palm Sunday',
    text:'A coup in Belgrade overthrows the pro-Axis government. Berlin\'s answer is swift: Yugoslavia and Greece are to be crushed before summer.',
    opts:[{ t:'Invade Yugoslavia and Greece', e:'War with Yugoslavia and Greece', f(){ declareWar('GER','YUG'); if (A('GRE') && !W('GER','GRE')) declareWar('GER','GRE'); } }, { t:'Not now', e:'Ask again in two months', retry:2, f(){} }] },
  { id:'iraq', y:1941, m:3, actor:'IRQ', cond:() => A('IRQ') && !facOf('IRQ') && A('GER') && A('ENG') && W('ENG','GER'),
    title:'Coup in Baghdad', dek:'Rashid Ali seizes power and asks Berlin for aircraft',
    text:'The Golden Square officers have overthrown the Regent. RAF Habbaniya is besieged, and German planes are on their way through Vichy Syria.',
    opts:[{ t:'Turn to the Axis', e:'Iraq becomes Fascist and joins the Axis', f(){ setIde('IRQ','F'); if (G.facs.AXIS) joinFaction('IRQ','AXIS'); } }, { t:'Stay neutral', e:'+20 politics', f(){ nat('IRQ').pol += 20; } }] },
  { id:'barbarossa', y:1941, m:5, actor:'GER', tgt:['SOV'], cond:() => A('GER') && A('SOV') && !W('GER','SOV') && G.y >= 1941,
    title:'Operation Barbarossa', dek:'Three million men pour across the border from the Baltic to the Black Sea',
    text:'The pact is torn up at 03:15. The largest invasion in history begins along a front of 2,900 kilometres. Soviet aircraft are destroyed on their runways by the hundred. Moscow is ordered to fight for every metre.',
    opts:[{ t:'Unleash Barbarossa', e:'War with the Soviet Union', f(){ barbarossa(); } }, { t:'Not yet', e:'Ask again in three months', retry:3, f(){} }],
    topts:[{ t:'The Great Patriotic War', e:'Fight for the Motherland · +15 stability', f(){ barbarossa(); nat('SOV').stab += 15; } }] },
  { id:'bluediv', y:1941, m:6, actor:'SPA', cond:() => A('SPA') && nat('SPA').ide === 'F' && W('GER','SOV') && !W('SPA','GER') && !facOf('SPA'),
    title:'The Blue Division', dek:'Spanish volunteers board trains for the Eastern Front',
    text:'Franco will not enter the war, but he will repay the Condor Legion. Eighteen thousand volunteers in blue shirts march east to fight "Bolshevism".',
    opts:[{ t:'Send the volunteers', e:'Germany gains 4 divisions on the Eastern Front', f(){ const f = frontOf('GER','SOV'); reinforce('GER', f.length ? f[0] : 'Berlin', { inf:4 }); nat('SPA').mp = Math.max(0, nat('SPA').mp - 20); } }, { t:'Stay home', e:'+10 stability', f(){ nat('SPA').stab += 10; } }] },
  { id:'iran', y:1941, m:7, actor:'SOV', tgt:['PER'], cond:() => A('PER') && A('SOV') && W('SOV','GER') && isAllied('SOV') && A('ENG') && !W('SOV','PER'),
    title:'Operation Countenance', dek:'British and Soviet troops enter Iran to secure the oil and a supply road',
    text:'The Shah has been too friendly with Berlin. In three days the Iranian army is overwhelmed; a new Shah is installed, and Lend-Lease trucks start rolling north to the Caspian.',
    opts:[{ t:'Occupy northern Iran', e:'Take Tabriz; Britain takes Shiraz', f(){ grab('SOV', ['Tabriz'], 'PER'); if (A('ENG')) grab('ENG', ['Shiraz'], 'PER'); } }, { t:'Leave Iran alone', e:'Nothing changes', f(){} }],
    topts:[{ t:'Accept occupation', e:'Lose Tabriz and Shiraz', f(){ grab('SOV', ['Tabriz'], 'PER'); if (A('ENG')) grab('ENG', ['Shiraz'], 'PER'); } }, { t:'Resist', e:'War with the Soviet Union and Britain', f(){ declareWar('SOV','PER'); } }] },
  { id:'siberia', y:1941, m:10, actor:'SOV', cond:() => A('SOV') && W('GER','SOV') && at('SOV','Moscow'),
    title:'The Siberian Divisions', dek:'Fresh troops from the Far East detrain in Moscow in white winter coats',
    text:'A spy in Tokyo reports that Japan will strike south, not north. Stalin strips the Manchurian border: eighteen divisions, a thousand tanks and fifteen hundred aircraft head west across the steppe.',
    opts:[{ t:'Bring them west', e:'+14 infantry, 4 tanks and 6 fighter wings at Moscow', f(){ reinforce('SOV','Moscow',{ inf:14, arm:4 }); const m = G.prov[ID['Moscow']]; if (m.o === 'SOV') m.air.ftr += 6; nat('SOV').stab += 10; } }] },
  { id:'usa', y:1941, m:11, actor:'USA', cond:() => !G.flags.usa && G.facs.ALLIES && membersOf('ALLIES').some(m => enemiesOf(m).some(e => isAxis(e))),
    title:'America Enters the War', dek:'Japanese carriers strike Pearl Harbor; Germany declares war on the United States',
    text:'"A date which will live in infamy." The sleeping giant is awake. American factories turn to bombers and tanks, and Lend-Lease convoys begin crossing the Atlantic to every Allied port.',
    opts:[{ t:'Arsenal of Democracy', e:'USA joins the Allies · Lend-Lease begins', f(){ usaJoin(); } }] },
  { id:'stalingrad', y:1942, m:10, actor:'SOV', cond:() => A('SOV') && W('GER','SOV') && at('SOV','Stalingrad') && PROV[ID['Stalingrad']].adj.concat(ID['Stalingrad']).some(j => isAxis(G.prov[j].o) || hops(ID['Stalingrad'])[j] <= 2 && isAxis(G.prov[j].o)),
    title:'Operation Uranus', dek:'Two Soviet fronts break the Romanian lines and close a ring around Stalingrad',
    text:'For three months the city has been fought over house by house. Now the trap is sprung: the Sixth Army is surrounded on the Volga, and the Red Army learns how to win.',
    opts:[{ t:'Spring the trap', e:'+10 infantry and 4 tanks at Stalingrad · next attack +30%', f(){ reinforce('SOV','Stalingrad',{ inf:10, arm:4 }); nat('SOV').nextAtk = 1.3; nat('SOV').stab += 8; } }, { t:'Hold the city', e:'+2 forts at Stalingrad', f(){ const p = G.prov[ID['Stalingrad']]; p.fort = Math.min(3, p.fort + 2); } }] },
  { id:'torch', y:1942, m:10, actor:'USA', cond:() => G.flags.usa && A('VIC'),
    title:'Operation Torch', dek:'American and British troops land in Morocco and Algeria',
    text:'Vichy\'s African empire switches sides after a few days of fighting. Germany answers by occupying the rest of France.',
    opts:[{ t:'Land in North Africa', e:'Vichy collapses', f(){ torch(); } }] },
  { id:'kursk', y:1943, m:6, actor:'GER', cond:() => A('GER') && A('SOV') && W('GER','SOV') && frontOf('GER','SOV').length > 0,
    title:'Operation Citadel', dek:'Two thousand tanks gather around the Kursk salient',
    text:'Hitler wants one more summer offensive. The new Tigers and Panthers are ready, but Soviet engineers have spent months digging minefields eight lines deep. Attack, or wait for them to come?',
    opts:[{ t:'Launch Citadel', e:'+4 tanks on the Eastern Front, next attack +35%', f(){ const f = frontOf('GER','SOV'); reinforce('GER', f.length ? f[0] : 'Berlin', { arm:4 }); nat('GER').nextAtk = 1.35; } },
          { t:'Elastic defense', e:'Eastern Front digs in two levels deeper', f(){ for (const i of frontOf('GER','SOV')) G.prov[i].dig = Math.min(4, G.prov[i].dig + 2); } }] },
  { id:'italyfalls', y:1943, m:6, actor:'ITA', cond:() => A('ITA') && isAxis('ITA') && !isHuman('ITA') && A('GER') && (O('Sicily') !== 'ITA' || ['Tripoli','Benghazi','Tobruk'].every(n => O(n) !== 'ITA')) && enemiesOf('ITA').some(isAllied),
    title:'Mussolini Deposed', dek:'The Grand Council votes against the Duce; Italy changes sides',
    text:'The King has the dictator arrested as he leaves the palace. Within weeks Italy signs an armistice with the Allies and declares war on its former partner. The Germans pour south over the Brenner.',
    opts:[{ t:'Italy switches sides', e:'Italy joins the Allies', f(){ italySwitch(); } }] },
  { id:'dday', y:1944, m:5, actor:'USA', cond:() => G.flags.usa && A('ENG') && isAxis(O('Normandy')) && O('London') === 'ENG',
    title:'D-Day', dek:'The largest seaborne invasion in history lands in Normandy',
    text:'Before dawn 7,000 vessels cross the Channel. Paratroopers drop behind the beaches; by nightfall 150,000 men are ashore. The liberation of Western Europe has begun.',
    opts:[{ t:'Storm the beaches', e:'Allied invasion of Normandy', f(){ dday(); } }] },
  { id:'bagration', y:1944, m:5, actor:'SOV', cond:() => A('SOV') && W('GER','SOV') && isAxis(O('Minsk')),
    title:'Operation Bagration', dek:'On the third anniversary of Barbarossa the Red Army smashes Army Group Centre',
    text:'Partisans cut the railways the night before. Then a hurricane of artillery, and a hundred and sixty divisions advance on a front of a thousand kilometres.',
    opts:[{ t:'Launch Bagration', e:'+8 tanks and +10 infantry at the front; Blitzkrieg for two months', f(){ const f = frontOf('SOV','GER'); reinforce('SOV', f.length ? f[0] : 'Moscow', { inf:10, arm:8 }); nat('SOV').fx.blitz = 2; } }] },
  { id:'warsaw', y:1944, m:7, actor:'POL', cond:() => !A('POL') && isAxis(O('Warsaw')) && PROV[ID['Warsaw']].adj.some(j => G.prov[j].o === 'SOV' || isAllied(G.prov[j].o)),
    title:'The Warsaw Uprising', dek:'The Home Army rises as the Red Army reaches the Vistula',
    text:'At five in the afternoon, "W-hour", forty thousand fighters of the Polish underground attack German positions across the city. They hope for help from across the river.',
    opts:[{ t:'Rise up', e:'Warsaw explodes in revolt', f(){ const p = G.prov[ID['Warsaw']]; p.res = 100; partisanStrike(ID['Warsaw'], 6); } }] },
  { id:'romswitch', y:1944, m:7, actor:'ROM', cond:() => A('ROM') && isAxis('ROM') && A('SOV') && W('ROM','SOV') && ['Bessarabia','Iași','Constanța','Odessa'].some(n => O(n) === 'SOV'),
    title:'King Michael\'s Coup', dek:'The young King arrests Antonescu and turns Romania\'s guns on Germany',
    text:'With the Red Army at the gates of Moldavia, the palace acts. A ceasefire with Moscow is broadcast at ten at night; by morning Romanian troops are fighting the Germans in Bucharest.',
    opts:[{ t:'Switch sides', e:'Romania joins the Allies and fights Germany', f(){ switchSides('ROM'); } }, { t:'Fight to the end', e:'+10 stability', f(){ nat('ROM').stab += 10; } }] },
  { id:'finpeace', y:1944, m:8, actor:'FIN', cond:() => A('FIN') && A('SOV') && W('FIN','SOV') && G.y >= 1944,
    title:'The Moscow Armistice', dek:'Finland accepts Soviet terms and turns against the Germans in Lapland',
    text:'Marshal Mannerheim, now President, signs the armistice. Viipuri is lost again, and the German troops in the north must be driven out.',
    opts:[{ t:'Accept the armistice', e:'Peace with the Soviets; lose Viipuri', f(){ endWar('FIN','SOV'); leaveFaction('FIN'); for (const e of enemiesOf('FIN')) endWar('FIN', e); transfer(['Viipuri'].filter(n => O(n) === 'FIN'), 'SOV'); G.truce[wkey('FIN','SOV')] = G.turn + 36; } }, { t:'Fight on', e:'+10 stability', f(){ nat('FIN').stab += 10; } }] },
  { id:'bulswitch', y:1944, m:8, actor:'BUL', cond:() => A('BUL') && isAxis('BUL') && A('SOV') && W('SOV','GER') && owned('SOV').some(i => PROV[i].adj.some(j => G.prov[j].o === 'BUL')),
    title:'Bulgaria Changes Sides', dek:'The Fatherland Front takes power as Soviet tanks cross the Danube',
    text:'Bulgaria never went to war with the Soviet Union. Now Moscow declares war anyway, and within days a new government in Sofia joins the Allies.',
    opts:[{ t:'Join the Allies', e:'Bulgaria fights Germany', f(){ switchSides('BUL'); } }, { t:'Stay loyal', e:'War with the Soviet Union', f(){ declareWar('SOV','BUL'); } }] },
  { id:'bulge', y:1944, m:11, actor:'GER', cond:() => A('GER') && W('GER','ENG') && ['Brussels','Lille','Paris','Normandy','Antwerp'].some(n => isAllied(O(n))),
    title:'Wacht am Rhein', dek:'Panzers burst out of the snowbound Ardennes',
    text:'Under low cloud that grounds the Allied air forces, three German armies strike for Antwerp. It is the Reich\'s last great gamble in the West.',
    opts:[{ t:'Gamble everything', e:'+6 tanks at Cologne, next attack +40%, no winter penalty', f(){ reinforce('GER','Cologne',{ arm:6 }); nat('GER').nextAtk = 1.4; nat('GER').fx.weather = 1; } }, { t:'Save the reserves', e:'+3 forts on the Rhine', f(){ ['Cologne','Essen','Saarbrücken'].forEach(n => { const p = G.prov[ID[n]]; if (p.o === 'GER') p.fort = Math.min(3, p.fort + 1); }); } }] },
  { id:'turkey', y:1945, m:1, actor:'TUR', cond:() => A('TUR') && !facOf('TUR') && G.flags.usa && G.facs.ALLIES,
    title:'Turkey Declares War', dek:'Ankara joins the Allies in time for the peace conference',
    text:'Neutral for five years, Turkey now declares war on Germany — just early enough to earn a seat at the founding of the United Nations.',
    opts:[{ t:'Join the Allies', e:'Turkey enters the war', f(){ joinFaction('TUR','ALLIES'); } }, { t:'Stay neutral', e:'+20 stability', f(){ nat('TUR').stab += 20; } }] },
  { id:'trinity', y:1945, m:6, actor:'USA', cond:() => G.flags.usa,
    title:'Trinity: The Atomic Age', dek:'A blinding light over the New Mexico desert',
    text:'"Now I am become Death, the destroyer of worlds." The Manhattan Project has worked. The Allies now hold a weapon that can erase a city in a single flash.',
    opts:[{ t:'The world will not be the same', e:'The Allied leader gains The Bomb', f(){ const L = G.facs.ALLIES && G.facs.ALLIES.lead; [L, ...humanTags().filter(isAllied)].forEach(t => { if (t && A(t)) grantTech(t, 'bomb'); }); tension(15); } }] },
];
const EVENT_BY_ID = {}; EVENTS.forEach(e => EVENT_BY_ID[e.id] = e);

function balticGrab() {
  for (const t of ['EST','LAT','LIT']) if (A(t) && !facOf(t)) annex(t, 'SOV');
  if (A('ROM') && O('Bessarabia') === 'ROM') grab('SOV', ['Bessarabia'], 'ROM');
  tension(5);
}
function barbarossa() {
  declareWar('GER','SOV');
  G.flags.gpw = 1; if (!isHuman('SOV')) { nat('SOV').stab += 15; nat('SOV').mp += 80; }
  for (const t of membersOf('AXIS')) if (t !== 'GER' && !isHuman(t) && ['ROM','HUN','ITA'].includes(t)) setWar(t, 'SOV');
  if (A('FIN') && !facOf('FIN') && !isHuman('FIN')) { joinFaction('FIN','AXIS', true); setWar('FIN','SOV'); }
  if (facOf('SOV') !== 'ALLIES' && G.facs.ALLIES && membersOf('ALLIES').some(m => W(m,'GER'))) { joinFaction('SOV','ALLIES'); news('THE GRAND ALLIANCE: MOSCOW JOINS THE ALLIES'); }
  tension(10);
}
function usaJoin() {
  G.flags.usa = 1; nat('USA').alive = true;
  if (!G.facs.ALLIES) G.facs.ALLIES = { n:'Allies', lead:'USA', m:[] };
  G.facs.ALLIES.m.push('USA');
  syncFaction('ALLIES');
  for (const t of membersOf('AXIS')) setWar('USA', t);
  addFleet('ATL', 'USA', 'cap', 6); addFleet('ATL', 'USA', 'sub', 2);
  for (const h of humanTags()) if (isAllied(h)) notify(h, '★', 'Lend-Lease begins', 'American convoys add production, oil and steel every month, and an expeditionary force will reach your shores.', 'medal');
}
function torch() {
  const africa = ['Rabat','Marrakesh','Oran','Algiers','Constantine','Tunis','Ouargla','In Salah','Damascus','Aleppo'];
  const to = A('ENG') ? 'ENG' : membersOf('ALLIES').find(t => t !== 'USA');
  if (to) transfer(africa.filter(n => O(n) === 'VIC'), to, 2);
  if (A('GER')) { for (const p of G.prov) if (p.o === 'VIC') { p.o = 'GER'; p.u.inf = Math.max(1, p.u.inf); } }
  else if (to) for (const p of G.prov) if (p.o === 'VIC') p.o = to;
  if (isHuman('VIC')) switchHuman('VIC', A('GER') && !isHuman('GER') ? 'GER' : to, 'Vichy France is no more.');
  if (A('VIC')) killNation('VIC', 'GER');
  Hooks.emit('dirty', { owners:true });
}
function italySwitch() { switchSides('ITA'); }
function switchSides(t) {
  for (const e of enemiesOf(t)) endWar(t, e);
  leaveFaction(t);
  if (G.facs.ALLIES) joinFaction(t, 'ALLIES', true);
  if (A('GER')) setWar('GER', t);
  for (const a of membersOf('AXIS')) setWar(a, t);
  syncFaction('ALLIES');
  news(`${natName(t).toUpperCase()} JOINS THE ALLIES`);
  Hooks.emit('dirty', { owners:true });
}
function dday() {
  if (isHuman('ENG')) {
    const p = G.prov[ID['Plymouth']].o === 'ENG' ? ID['Plymouth'] : nat('ENG').capital;
    G.prov[p].u.inf += 10; G.prov[p].u.arm += 4; G.prov[p].u.par += 2;
    addFleet('CHN', 'ENG', 'cap', 4);
    notify('ENG', '★', 'Overlord is ready', `10 infantry, 4 armored and 2 airborne divisions wait for your order in ${PROV[p].name}. Land them in France!`, 'medal');
    return;
  }
  addFleet('CHN', 'USA', 'cap', 4);
  const r = battle([{ id:-1, o:A('ENG') ? 'ENG' : 'USA', u:{ ...emptyLand(), inf:12, arm:5, par:2 } }], ID['Normandy'], { naval:true });
  Hooks.emit('battle', r);
}
function battleOfBritain() {
  const L = ID['London'];
  const ger = airPower(t => friendly(t, 'GER'), L, 'ftr') + 0.6 * airPower(t => friendly(t, 'GER'), L, 'bmb');
  const eng = airPower(t => friendly(t, 'ENG'), L, 'ftr') * (hasTech('ENG','radar') ? 1.5 : 1.15);
  const gerWins = ger * (0.8 + rnd() * 0.4) > eng * (0.8 + rnd() * 0.4);
  const cull = (t, k) => { for (const p of G.prov) if (p.o === t && dist(G.prov.indexOf(p), L) < AIR_RANGE * 1.2) { p.air.ftr -= Math.round(p.air.ftr * k); p.air.bmb -= Math.round(p.air.bmb * k); } };
  if (gerWins) { cull('ENG', 0.45); cull('GER', 0.2); nat('ENG').stab -= 12; nat('ENG').pp = Math.max(0, nat('ENG').pp - 50); news('THE RAF BREAKS — GERMANY RULES THE CHANNEL SKIES'); }
  else { cull('GER', 0.4); cull('ENG', 0.15); nat('GER').stab -= 6; nat('ENG').stab += 10; news('THE FEW HOLD: LUFTWAFFE DEFEATED OVER ENGLAND'); }
}
function partisanStrike(pid, strength) {
  const p = G.prov[pid], core = p.core;
  const def = Math.max(0.5, unitStrength(nat(p.o), p.u, false, PROV[pid].ter));
  const win = strength * (0.8 + rnd() * 0.5) > def;
  if (win) {
    const occ = p.o; relocate(pid, occ);
    if (A(core) && W(core, occ)) { p.o = core; p.u.inf = 2; p.res = 0; }
    else if (!A(core) && NATDEF[core] && !NATDEF[core].off) { restorePartisans(core, pid, occ); }
    else { p.res = 40; }
    news(`PARTISANS SEIZE ${PROV[pid].name.toUpperCase()}`);
    if (isHuman(core)) award(core, 'partisan');
    Hooks.emit('dirty', { owners:true });
  } else { const l = takeLosses(p.u, rr(unitsAt(p) * 0.2)); clampReady(p); p.res = Math.max(20, p.res - 30); }
  p.smoke = 2;
  Hooks.emit('partisans', { pid, win });
  return win;
}
// a successful uprising in a fallen nation's capital brings the nation back, at war with its occupier
function restorePartisans(core, pid, occ) {
  if (NATDEF[core].cap !== PROV[pid].name) { G.prov[pid].res = 40; return; }
  const n = nat(core); n.alive = true; n.pp = 20; n.mp = 20; n.stab = 60; n.capital = pid;
  G.prov[pid].o = core; G.prov[pid].u.inf = 3; G.prov[pid].res = 0;
  if (A(occ)) { const enemyFac = facOf(occ); const alt = Object.keys(G.facs).find(k => k !== enemyFac && membersOf(k).some(m => W(m, occ))); if (alt) joinFaction(core, alt, true); setWar(core, occ); }
  news(`${n.name.toUpperCase()} RISES AGAIN`);
}

/* ---------- dispatch ---------- */
function checkEvents() {
  for (const e of EVENTS) {
    const st = G.ev[e.id];
    if (st === 1) continue;
    if (st && st.wait > G.turn) continue;
    if (nowNum() < ymNum(e.y, e.m)) continue;
    let ok = false; try { ok = e.cond(); } catch (err) { ok = false; }
    if (!ok) continue;
    G.ev[e.id] = 1;
    const actorHuman = liveHuman(e.actor);
    const tgtHuman = !actorHuman && e.tgt && e.topts && e.tgt.find(t => liveHuman(t));
    if (actorHuman) pushInbox(e.actor, { type:'event', id:e.id, side:'a' });
    else if (tgtHuman) pushInbox(tgtHuman, { type:'event', id:e.id, side:'t' });
    else { try { e.opts[0].f(e.actor); } catch (err) { console.error(err); } news(e.title.toUpperCase()); log(`<b>${e.title}</b>.`); sendNews('*', { title:e.title, head:e.title, dek:e.dek, text:e.text, plate:e.actor, ev:e.id }); }
  }
}
function resolveEvent(h, it, k) {
  const e = EVENT_BY_ID[it.id]; if (!e) return;
  const opts = it.side === 't' ? e.topts : e.opts, o = opts[clamp(k | 0, 0, opts.length - 1)];
  try { o.f(h); } catch (err) { console.error(err); }
  if (o.retry) G.ev[e.id] = { wait:G.turn + o.retry };
  log(`<b>${e.title}</b> — ${o.t}.`);
  news(e.title.toUpperCase());
  // everyone else reads about it
  for (const x of humanTags()) if (x !== h && !o.retry) pushInbox(x, { type:'news', title:e.title, head:e.title, dek:e.dek, text:e.text + ` (${natName(h)}: ${o.t}.)`, plate:e.actor });
}

/* ---------- anecdotes: small surprises for human players ---------- */
const ANECDOTES = [
  {n:'Wojtek the Bear enlists',w:['POL','ENG'],y:1940,d:'A Syrian brown bear joins an artillery company, carrying shells and drinking beer. Morale soars: +20 politics, +5 stability.',f:n=>{n.pol+=20;n.stab+=5;}},
  {n:'Enigma has been broken',w:['ENG','FRA','POL'],y:1940,war:'GER',d:'Codebreakers at Bletchley Park read the enemy\'s mail. Every enemy army is revealed for a year.',f:n=>{n.intel=Math.max(n.intel,12);}},
  {n:'Operation Mincemeat',w:['ENG'],y:1943,d:'A corpse with fake plans washes ashore in Spain. The enemy guards the wrong beaches. +60 production in saved effort.',f:n=>{n.pp+=60;}},
  {n:'The Ghost Army',w:['ENG','USA','FRA'],y:1944,d:'Inflatable tanks and sound trucks fool enemy recon. Your next attack lands at +30%.',f:n=>{n.nextAtk=1.3;}},
  {n:'The Night Witches',w:['SOV'],y:1941,d:'Female bomber pilots in wooden biplanes terrorise the enemy at night. +3 bomber wings at the capital.',f:(n,t)=>{const h=homeProv(t);if(h>=0)G.prov[h].air.bmb+=3;}},
  {n:'A bagpiper with a longbow',w:['ENG'],y:1940,d:'An officer storms a position armed with a claymore, a longbow and bagpipes. Your next attack lands at +25%.',f:n=>{n.nextAtk=1.25;}},
  {n:'The Mannerheim Line holds',w:['FIN'],y:1939,d:'Snow-camouflaged ski troops vanish into the forests. +1 fort in Viipuri.',f:(n,t)=>{const p=G.prov[ID['Viipuri']];if(p.o===t)p.fort=Math.min(3,p.fort+1);}},
  {n:'Spies in Lisbon',w:null,y:1939,d:'Every embassy in neutral Lisbon is selling secrets. +30 political power and a new spy.',f:n=>{n.pol+=30;n.spies++;}},
  {n:'Frequency-hopping patent',w:['ENG','FRA','SOV'],y:1941,d:'A film star and a composer patent a jam-proof radio torpedo. Your research jumps ahead by a month.',f:n=>{n.rs.forEach(r=>r.left=Math.max(0.01,r.left-1));}},
  {n:'A very harsh winter',w:null,y:1940,d:'Frost shatters engines and rifles; fronts freeze. +30k manpower.',f:n=>{n.mp+=30;}},
  {n:'Volunteer pilots arrive',w:null,y:1937,d:'Idealists from across the world sign up for your air force. +3 fighter wings.',f:(n,t)=>{const h=homeProv(t);if(h>=0)G.prov[h].air.ftr+=3;}},
  {n:'The Swiss gold vaults',w:['SWI'],y:1937,d:'Bankers in Bern quietly lend at excellent rates. +80 production.',f:n=>{n.pp+=80;}},
  {n:'Oil strike!',w:null,y:1938,d:'Geologists find a new field. +25 oil.',f:n=>{n.oil+=25;}},
  {n:'Scrap metal drive',w:null,y:1939,d:'Railings, pots and pans are melted down for the war effort. +20 steel, +3 stability.',f:n=>{n.steel+=20;n.stab+=3;}},
  {n:'A defector crosses the lines',w:null,y:1940,d:'An enemy staff officer brings maps and codes. Your next attack lands at +20%, and a new card is dealt.',f:(n,t)=>{n.nextAtk=1.2;drawCards(t,1);}},
];
