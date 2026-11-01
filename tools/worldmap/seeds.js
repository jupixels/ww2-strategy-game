// New provinces outside the legacy Europe map: one seed city each.
// name|lon|lat|owner|victory points|factories|flags
// flags: c = colony (reduced manpower), b = force a small island blob, t<x> = terrain override
const PROVS = `
# ---------- United States ----------
Washington|-77.04|38.9|USA|10|2
New York|-74.0|40.7|USA|12|4
Boston|-71.06|42.36|USA|4|1
Philadelphia|-75.16|39.95|USA|5|2
Pittsburgh|-79.99|40.44|USA|4|3
Buffalo|-78.88|42.89|USA|2|1
Detroit|-83.05|42.33|USA|6|4
Chicago|-87.63|41.88|USA|8|4
Cincinnati|-84.5|39.1|USA|2|1
Raleigh|-78.64|35.78|USA|1|1
Atlanta|-84.39|33.75|USA|3|1
Miami|-81.4|27.5|USA|2|0
New Orleans|-90.07|29.95|USA|3|1
Nashville|-86.78|36.16|USA|1|1
Memphis|-90.05|35.15|USA|1|1
Houston|-95.37|29.76|USA|3|1
Dallas|-96.8|32.78|USA|2|1
San Antonio|-99.5|29.0|USA|1|0
St. Louis|-90.2|38.63|USA|3|1
Kansas City|-94.58|39.1|USA|2|1
Oklahoma City|-97.52|35.47|USA|1|1
Minneapolis|-93.27|44.98|USA|3|1
Milwaukee|-88.4|44.5|USA|1|1
Omaha|-97.5|41.5|USA|1|0
Fargo|-99.5|47.0|USA|0|0
Denver|-104.99|39.74|USA|2|1
Billings|-108.5|45.78|USA|0|0
Salt Lake City|-111.89|40.76|USA|1|0
Boise|-116.2|43.6|USA|0|0
Albuquerque|-106.65|35.08|USA|0|0
El Paso|-104.5|31.5|USA|0|0
Phoenix|-112.07|33.45|USA|1|0
Reno|-118.5|39.5|USA|0|0
Los Angeles|-118.24|34.05|USA|5|2
San Francisco|-122.42|37.77|USA|5|1
Portland|-122.68|45.52|USA|1|1
Seattle|-122.33|47.6|USA|3|1
Spokane|-117.4|47.66|USA|0|0
Anchorage|-149.9|61.2|USA|1|0
Fairbanks|-147.7|64.84|USA|0|0
Nome|-162.0|65.5|USA|0|0
Juneau|-134.4|58.3|USA|0|0
Dutch Harbor|-166.54|53.89|USA|1|0|b
Honolulu|-157.86|21.31|USA|4|1|b
Midway|-177.37|28.21|USA|1|0|bc
Wake|166.6|19.3|USA|1|0|bc
Guam|144.79|13.44|USA|1|0|bc
Manila|120.98|14.6|USA|4|1|c
Visayas|123.9|10.3|USA|1|0|c
Davao|125.6|7.07|USA|1|0|c
Puerto Rico|-66.1|18.2|USA|1|0|c
# ---------- Canada and Newfoundland ----------
Ottawa|-75.7|45.42|CAN|5|1
Toronto|-79.38|43.65|CAN|4|3
Montreal|-73.57|45.5|CAN|4|2
Quebec|-71.2|47.5|CAN|1|0
Halifax|-63.57|44.65|CAN|2|1
Winnipeg|-97.14|49.9|CAN|2|1
Regina|-104.6|50.45|CAN|1|0
Edmonton|-113.5|53.55|CAN|1|0
Calgary|-114.07|51.05|CAN|1|0
Vancouver|-123.12|49.28|CAN|3|1
Prince Rupert|-128.0|55.5|CAN|0|0
Whitehorse|-135.05|62.0|CAN|0|0
Yellowknife|-114.37|62.45|CAN|0|0
Churchill|-94.17|58.77|CAN|0|0
Moosonee|-83.0|50.5|CAN|0|0
Ungava|-70.0|56.0|CAN|0|0
Frobisher Bay|-68.5|66.0|CAN|0|0
Baker Lake|-96.0|65.0|CAN|0|0
Cambridge Bay|-108.0|70.0|CAN|0|0
Arctic Islands|-90.0|76.0|CAN|0|0
St. John's|-56.0|48.5|ENG|1|0|c
Goose Bay|-61.0|53.5|ENG|0|0|c
# ---------- Greenland, Svalbard and Atlantic islands ----------
Godthåb|-49.0|64.0|DEN|1|0|c
Angmagssalik|-37.6|67.0|DEN|0|0|c
Thule|-55.0|77.0|DEN|0|0|c
Spitsbergen|15.6|78.2|NOR|0|0|c
Canary Islands|-15.5|28.1|SPA|1|0|c
Azores|-25.7|37.75|POR|0|0|bc
Cape Verde|-23.5|15.0|POR|0|0|bc
Bermuda|-64.75|32.3|ENG|0|0|bc
# ---------- Mexico, Central America, Caribbean ----------
Mexico City|-99.13|19.43|MEX|6|2
Guadalajara|-103.35|20.67|MEX|2|1
Monterrey|-100.32|25.67|MEX|2|1
Tampico|-97.86|22.25|MEX|1|0
Chihuahua|-106.08|28.63|MEX|1|0
Hermosillo|-110.96|29.07|MEX|0|0
Baja California|-113.5|28.5|MEX|0|0
Mérida|-89.62|20.0|MEX|1|0
Oaxaca|-96.72|17.06|MEX|0|0
Guatemala|-90.5|14.63|GUA|2|0
Belize|-88.7|17.25|ENG|0|0|c
Tegucigalpa|-87.2|14.07|HON|2|0
San Salvador|-89.2|13.7|ELS|2|0
Managua|-86.25|12.13|NIC|2|0
San José|-84.08|9.93|COS|2|0
Panama|-79.52|8.98|PAN|2|0
Havana|-82.37|22.6|CUB|3|0
Santiago de Cuba|-76.5|20.4|CUB|1|0
Port-au-Prince|-72.33|18.8|HAI|2|0
Santo Domingo|-70.2|18.8|DOM|2|0
Kingston|-77.3|18.1|ENG|1|0|c
Nassau|-77.35|25.06|ENG|0|0|bc
Trinidad|-61.3|10.5|ENG|1|0|c
# ---------- South America ----------
Bogotá|-74.07|4.71|COL|5|1
Medellín|-75.56|6.25|COL|1|0
Barranquilla|-74.8|10.5|COL|1|0
Leticia|-71.0|0.5|COL|0|0
Caracas|-66.9|10.0|VEN|4|0
Maracaibo|-71.64|10.0|VEN|2|0
Ciudad Bolívar|-63.55|6.5|VEN|0|0
Quito|-78.47|-0.18|ECU|3|0
Guayaquil|-79.9|-2.17|ECU|1|0
Lima|-77.04|-12.05|PRU|5|1
Arequipa|-71.54|-16.4|PRU|1|0
Iquitos|-73.25|-5.0|PRU|0|0
La Paz|-68.15|-16.5|BOL|4|0
Santa Cruz|-63.18|-17.8|BOL|1|0
Asunción|-57.58|-25.8|PAR|3|0
Gran Chaco|-60.5|-21.5|PAR|0|0
Montevideo|-56.16|-33.5|URG|4|1
Buenos Aires|-58.38|-34.6|ARG|10|3
Rosario|-61.5|-31.5|ARG|2|1
Córdoba|-64.18|-31.42|ARG|2|1
Mendoza|-68.84|-33.5|ARG|1|0
Tucumán|-65.2|-26.8|ARG|1|0
Bahía Blanca|-63.5|-38.5|ARG|1|0
Comodoro Rivadavia|-69.0|-45.5|ARG|0|0
Río Gallegos|-70.0|-50.5|ARG|0|0
Santiago|-70.65|-33.45|CHL|5|1
Antofagasta|-69.5|-23.65|CHL|1|0
Concepción|-72.5|-37.5|CHL|1|0
Puerto Montt|-72.94|-43.0|CHL|0|0
Punta Arenas|-71.5|-53.0|CHL|0|0
Rio de Janeiro|-43.2|-22.9|BRA|10|3
São Paulo|-47.63|-22.55|BRA|6|3
Belo Horizonte|-44.94|-18.92|BRA|2|1
Porto Alegre|-52.23|-29.03|BRA|2|1
Curitiba|-51.27|-25.43|BRA|1|0
Salvador|-40.5|-12.97|BRA|2|1
Recife|-37.88|-8.05|BRA|2|1
Fortaleza|-39.54|-5.0|BRA|1|0
Belém|-48.5|-3.0|BRA|1|0
Manaus|-61.0|-3.5|BRA|1|0
Cuiabá|-55.1|-13.6|BRA|0|0
Goiás|-49.1|-15.9|BRA|0|0
Porto Velho|-64.9|-9.76|BRA|0|0
Teresina|-44.8|-7.09|BRA|0|0
Boa Vista|-61.5|2.5|BRA|0|0
Georgetown|-58.7|5.8|ENG|1|0|c
Paramaribo|-55.6|4.6|HOL|1|0|c
Cayenne|-53.0|4.2|FRA|0|0|c
Falkland Islands|-59.0|-51.7|ENG|1|0|c
# ---------- West and Central Africa ----------
Dakar|-15.45|14.69|FRA|2|0|c
Atar|-11.5|19.5|FRA|0|0|c
Bamako|-8.0|12.65|FRA|1|0|c
Timbuktu|-3.0|17.5|FRA|0|0|c
Niamey|2.11|13.51|FRA|0|0|c
Agadez|8.5|18.5|FRA|0|0|c
Tamanrasset|5.52|23.2|FRA|0|0|c
Ouagadougou|-1.52|12.37|FRA|0|0|c
Abidjan|-5.0|6.8|FRA|1|0|c
Conakry|-11.7|10.0|FRA|1|0|c
Dahomey|2.3|8.5|FRA|0|0|c
Fort-Lamy|17.0|12.1|FRA|0|0|c
Faya-Largeau|19.1|17.9|FRA|0|0|c
Bangui|20.0|6.0|FRA|0|0|c
Brazzaville|15.28|-2.0|FRA|1|0|c
Libreville|11.0|-0.5|FRA|0|0|c
Douala|11.0|4.5|FRA|1|0|c
Garoua|13.4|9.0|FRA|0|0|c
Tananarive|47.0|-19.5|FRA|1|0|c
Diego Suarez|48.5|-14.0|FRA|1|0|c
Djibouti|42.6|11.6|FRA|1|0|c
Lagos|3.8|7.2|ENG|2|0|c
Kano|8.52|12.0|ENG|1|0|c
Port Harcourt|7.5|5.5|ENG|0|0|c
Accra|-1.0|6.5|ENG|1|0|c
Freetown|-12.0|8.48|ENG|1|0|c
Monrovia|-9.5|6.5|LIB|2|0
Bissau|-15.0|12.0|POR|0|0|c
Spanish Guinea|10.3|1.6|SPA|0|0|c
# ---------- East and Southern Africa ----------
Khartoum|32.53|15.6|ENG|2|0|c
Port Sudan|36.2|19.6|ENG|1|0|c
El Fasher|25.35|13.63|ENG|0|0|c
Dongola|30.5|19.5|ENG|0|0|c
Juba|31.6|6.0|ENG|0|0|c
Malakal|32.5|9.5|ENG|0|0|c
Addis Ababa|38.74|9.03|ETH|4|0
Gondar|37.47|12.6|ETH|1|0
Harar|42.12|9.31|ETH|1|0
Jimma|35.83|7.0|ETH|0|0
Ogaden|43.55|6.5|ETH|0|0
Asmara|38.93|15.33|ITA|2|0|c
Mogadishu|45.34|2.04|ITA|1|0|c
Bosaso|48.5|9.5|ITA|0|0|c
Berbera|45.0|10.0|ENG|0|0|c
Nairobi|36.82|-1.29|ENG|2|0|c
Mombasa|39.67|-3.5|ENG|1|0|c
Lodwar|36.0|3.0|ENG|0|0|c
Kampala|32.58|1.35|ENG|1|0|c
Dar es Salaam|38.5|-7.5|ENG|1|0|c
Tabora|32.8|-5.02|ENG|0|0|c
Léopoldville|15.3|-5.0|BEL|2|0|c
Coquilhatville|19.5|0.05|BEL|0|0|c
Stanleyville|25.19|1.0|BEL|1|0|c
Élisabethville|27.48|-10.66|BEL|1|0|c
Luluabourg|22.4|-5.9|BEL|0|0|c
Bukavu|28.86|-2.5|BEL|0|0|c
Luanda|14.23|-8.84|POR|1|0|c
Benguela|14.4|-12.58|POR|0|0|c
Luso|20.5|-11.8|POR|0|0|c
Moçâmedes|13.5|-16.2|POR|0|0|c
Lourenço Marques|32.58|-24.97|POR|1|0|c
Beira|34.84|-19.0|POR|1|0|c
Nampula|39.27|-14.12|POR|0|0|c
Salisbury|31.05|-17.83|ENG|1|0|c
Bulawayo|28.58|-20.15|ENG|0|0|c
Lusaka|27.28|-15.42|ENG|0|0|c
Kasama|31.2|-10.2|ENG|0|0|c
Zomba|34.5|-13.5|ENG|0|0|c
Bechuanaland|23.5|-22.0|ENG|0|0|c
Pretoria|28.19|-25.75|SAF|5|2
Cape Town|19.42|-33.0|SAF|4|1
Durban|30.52|-29.0|SAF|2|1
Bloemfontein|26.2|-29.1|SAF|1|0
Port Elizabeth|25.6|-33.0|SAF|1|0
Kimberley|22.76|-28.74|SAF|0|0
Windhoek|17.08|-22.56|SAF|1|0
Keetmanshoop|18.13|-26.58|SAF|0|0
# ---------- Arabia, Persia, Afghanistan ----------
Mecca|40.33|21.42|SAU|3|0
Abha|43.5|18.2|SAU|0|0
Rub al Khali|50.0|20.0|SAU|0|0
Sana'a|44.2|15.35|YEM|3|0
Aden|45.03|13.2|ENG|2|0|c
Mukalla|49.12|15.5|ENG|0|0|c
Muscat|57.8|23.0|OMN|2|0
Salalah|54.1|18.0|OMN|0|0
Trucial Coast|54.5|24.0|ENG|0|0|c
Kuwait|47.6|29.3|ENG|1|0|c
Bahrain|50.58|26.0|ENG|1|0|bc
Kerman|57.08|30.28|PER|0|0
Zahedan|61.0|28.0|PER|0|0
Kabul|69.17|34.53|AFG|3|0
Herat|62.2|34.35|AFG|1|0
Kandahar|65.7|31.6|AFG|1|0
Mazar-i-Sharif|67.1|36.7|AFG|0|0
# ---------- British Raj ----------
Delhi|77.2|28.61|RAJ|8|2
Bombay|73.88|19.08|RAJ|6|2
Calcutta|88.36|22.57|RAJ|6|2
Madras|79.27|13.08|RAJ|4|1
Karachi|67.5|25.5|RAJ|3|1
Lahore|74.34|31.55|RAJ|4|1
Peshawar|71.57|34.0|RAJ|1|0
Quetta|66.98|29.5|RAJ|1|0
Hyderabad|78.47|17.38|RAJ|2|0
Bangalore|77.0|12.5|RAJ|2|1
Nagpur|79.09|21.15|RAJ|1|0
Lucknow|80.95|26.85|RAJ|2|1
Jamshedpur|85.2|23.2|RAJ|1|2
Dacca|90.41|23.81|RAJ|2|0
Ahmedabad|72.57|23.02|RAJ|2|1
Jaipur|74.0|26.5|RAJ|1|0
Srinagar|76.0|34.08|RAJ|1|0
Shillong|93.5|26.0|RAJ|0|0
Cochin|76.6|9.93|RAJ|0|0
Bhopal|77.4|23.8|RAJ|0|0
Colombo|80.4|7.5|ENG|2|0|c
Port Blair|92.73|11.62|ENG|0|0|bc
Kathmandu|85.32|27.9|NEP|2|0
# ---------- South-east Asia and the Indies ----------
Rangoon|96.16|17.84|ENG|3|0|c
Mandalay|95.5|21.97|ENG|1|0|c
Myitkyina|97.4|25.38|ENG|0|0|c
Mergui|98.8|12.43|ENG|0|0|c
Bangkok|100.5|14.5|SIA|4|0
Chiang Mai|99.48|18.79|SIA|1|0
Khorat|103.1|15.5|SIA|0|0
Songkhla|100.6|7.2|SIA|0|0
Hanoi|105.85|21.03|FRA|3|0|c
Hué|107.0|16.46|FRA|1|0|c
Saigon|106.7|11.0|FRA|3|0|c
Phnom Penh|104.6|12.3|FRA|1|0|c
Vientiane|102.6|18.97|FRA|0|0|c
Kuala Lumpur|101.69|3.64|ENG|2|0|c
Singapore|103.82|1.35|ENG|5|1|bc
Kota Bharu|102.0|5.8|ENG|0|0|c
Kuching|111.35|1.8|ENG|0|0|c
Brunei|114.94|4.5|ENG|1|0|c
Sandakan|117.07|5.4|ENG|0|0|c
Balikpapan|116.3|0.0|HOL|1|0|c
Banjarmasin|114.59|-2.82|HOL|0|0|c
Pontianak|110.33|-0.53|HOL|0|0|c
Batavia|106.85|-6.5|HOL|5|1|c
Surabaya|112.75|-7.5|HOL|3|1|c
Palembang|104.25|-2.98|HOL|2|0|c
Medan|99.17|3.0|HOL|1|0|c
Padang|101.35|-0.6|HOL|0|0|c
Makassar|120.0|-3.5|HOL|1|0|c
Manado|124.0|0.8|HOL|0|0|c
Ambon|129.5|-3.0|HOL|0|0|c
Hollandia|139.5|-3.0|HOL|0|0|c
Merauke|139.4|-7.0|HOL|0|0|c
Kupang|121.0|-8.7|HOL|0|0|c
Dili|125.9|-8.8|POR|0|0|c
# ---------- China, Tibet, Sinkiang, Mongolia, Manchukuo ----------
Nanjing|118.8|32.06|CHI|6|1
Shanghai|121.2|31.23|CHI|8|3
Hangzhou|120.16|29.5|CHI|2|0
Peking|116.4|39.9|CHI|6|1
Tientsin|117.4|38.7|CHI|3|1
Taiyuan|112.55|37.87|CHI|2|1
Jinan|117.0|36.65|CHI|2|0
Tsingtao|120.38|36.5|CHI|2|1
Zhengzhou|113.65|34.75|CHI|1|0
Xuzhou|117.5|34.0|CHI|1|0
Xi'an|108.94|34.34|CHI|2|0
Lanzhou|103.83|36.06|CHI|1|0
Xining|99.0|36.62|CHI|0|0
Yinchuan|106.27|38.47|CHI|0|0
Baotou|109.84|41.2|CHI|0|0
Kalgan|114.88|41.3|CHI|1|0
Wuhan|114.3|30.59|CHI|4|2
Changsha|112.94|27.5|CHI|2|0
Nanchang|116.0|28.0|CHI|1|0
Fuzhou|118.8|26.08|CHI|1|0
Canton|113.26|23.13|CHI|5|1
Nanning|108.37|22.82|CHI|1|0
Guilin|110.29|25.27|CHI|1|0
Guiyang|106.71|26.58|CHI|1|0
Kunming|102.83|24.88|CHI|2|0
Chongqing|106.55|29.56|CHI|3|1
Chengdu|104.07|30.67|CHI|3|0
Yushu|97.0|33.0|CHI|0|0
Hainan|109.8|19.2|CHI|0|0
Hong Kong|114.17|22.3|ENG|3|1|bc
Yan'an|109.49|36.6|PRC|2|0
Lhasa|91.1|29.65|TIB|2|0
Chamdo|97.17|30.5|TIB|0|0
Ngari|81.5|32.5|TIB|0|0
Nagqu|90.0|33.5|TIB|0|0
Urumqi|87.6|43.8|SIK|2|0
Kashgar|76.5|39.47|SIK|1|0
Hami|93.5|42.0|SIK|0|0
Hotan|81.0|37.1|SIK|0|0
Ulan Bator|106.9|47.9|MON|3|0
Kobdo|92.64|47.5|MON|0|0
Choibalsan|113.5|48.07|MON|0|0
Dalanzadgad|104.4|43.57|MON|0|0
Hsinking|125.32|43.88|MAN|4|1
Mukden|123.43|41.8|MAN|4|2
Harbin|126.63|45.75|MAN|3|1
Qiqihar|123.97|47.35|MAN|1|0
Jehol|118.5|41.5|MAN|1|0
Hailar|119.7|49.2|MAN|0|0
Mudanjiang|130.0|44.58|MAN|0|0
Heihe|126.5|51.0|MAN|0|0
# ---------- Japan and its empire ----------
Tokyo|139.69|35.69|JAP|14|6
Osaka|135.5|34.69|JAP|8|5
Nagoya|137.0|35.4|JAP|4|3
Hiroshima|132.46|34.39|JAP|3|2
Fukuoka|130.6|33.59|JAP|3|3
Kagoshima|130.8|31.8|JAP|1|0
Sendai|140.87|38.27|JAP|2|1
Niigata|139.04|37.5|JAP|1|1
Aomori|140.74|40.5|JAP|1|0
Sapporo|142.35|43.36|JAP|2|1
Matsuyama|133.27|33.6|JAP|1|0
Kanazawa|136.66|36.4|JAP|1|0
Okinawa|127.88|26.41|JAP|1|0|b
Taihoku|121.16|24.5|JAP|3|1|c
Takao|120.6|22.9|JAP|1|0|c
Karafuto|142.73|47.96|JAP|1|0|c
Kuriles|148.5|45.5|JAP|0|0|bc
Iwo Jima|141.32|24.78|JAP|1|0|bc
Palau|134.48|7.34|JAP|1|0|bc
Saipan|145.75|15.18|JAP|1|0|bc
Truk|151.85|7.42|JAP|1|0|bc
Kwajalein|167.73|9.19|JAP|1|0|bc
Dairen|121.9|39.5|JAP|2|1|c
Keijo|127.2|37.37|JAP|3|1|c
Fusan|128.6|35.5|JAP|2|1|c
Heijo|125.75|39.02|JAP|2|1|c
Hamhung|127.53|39.92|JAP|1|0|c
Chongjin|129.3|41.8|JAP|0|0|c
# ---------- Soviet Asia ----------
Omsk|73.37|54.98|SOV|3|1
Novosibirsk|82.92|55.03|SOV|3|2
Tomsk|84.95|58.0|SOV|1|0
Barnaul|83.78|52.35|SOV|1|0
Tobolsk|68.25|58.2|SOV|0|0
Salekhard|69.0|66.0|SOV|0|0
Krasnoyarsk|92.87|56.01|SOV|2|1
Norilsk|88.2|70.0|SOV|0|0
Turukhansk|87.98|64.5|SOV|0|0
Tura|100.2|64.27|SOV|0|0
Khatanga|102.47|73.0|SOV|0|0
Kirensk|108.1|57.78|SOV|0|0
Irkutsk|103.28|52.8|SOV|2|1
Kyzyl|94.45|51.72|SOV|0|0
Ulan-Ude|108.6|52.83|SOV|1|0
Chita|115.5|52.03|SOV|1|0
Blagoveshchensk|127.53|51.5|SOV|1|0
Khabarovsk|134.07|48.48|SOV|2|1
Vladivostok|133.0|44.0|SOV|3|1
Komsomolsk|137.0|51.55|SOV|0|0
Yakutsk|129.73|62.03|SOV|1|0
Vilyuysk|118.6|63.75|SOV|0|0
Tiksi|126.87|71.0|SOV|0|0
Verkhoyansk|136.4|67.55|SOV|0|0
Srednekolymsk|153.7|67.45|SOV|0|0
Okhotsk|141.24|59.36|SOV|0|0
Magadan|150.8|61.57|SOV|1|0
Petropavlovsk|159.65|55.02|SOV|1|0
Anadyr|172.5|65.73|SOV|0|0
Chukotka|-175.0|67.5|SOV|0|0
Aleksandrovsk|142.65|51.9|SOV|0|0
Tashkent|69.24|41.3|SOV|3|1
Samarkand|65.96|39.65|SOV|1|0
Stalinabad|70.78|38.56|SOV|1|0
Frunze|74.6|42.4|SOV|1|0
Alma-Ata|77.95|44.24|SOV|2|0
Karaganda|73.1|49.8|SOV|1|1
Akmolinsk|70.43|52.13|SOV|0|0
Semipalatinsk|80.23|49.4|SOV|1|0
Kustanai|63.62|52.21|SOV|0|0
Dzhezkazgan|67.7|47.8|SOV|0|0
Kzyl-Orda|65.5|44.85|SOV|0|0
# ---------- Australia, New Zealand, Pacific ----------
Canberra|149.13|-35.28|AST|3|0
Sydney|151.0|-32.87|AST|6|2
Melbourne|144.96|-37.31|AST|5|2
Brisbane|152.03|-27.47|AST|3|1
Adelaide|138.6|-33.93|AST|2|1
Perth|116.86|-31.95|AST|2|0
Darwin|131.84|-13.46|AST|1|0
Townsville|145.82|-19.26|AST|1|0
Alice Springs|133.88|-23.7|AST|0|0
Kalgoorlie|122.47|-30.0|AST|0|0
Broome|124.24|-18.96|AST|0|0
Carnarvon|115.66|-24.88|AST|0|0
Longreach|143.25|-24.44|AST|0|0
Hobart|146.83|-42.38|AST|1|0
Port Moresby|146.5|-8.5|AST|1|0|c
Lae|145.5|-5.72|AST|0|0|c
Wewak|142.63|-4.0|AST|0|0|c
Rabaul|151.67|-5.2|AST|1|0|c
Guadalcanal|160.0|-9.5|ENG|1|0|c
Wellington|175.5|-40.0|NZL|3|0
Auckland|174.76|-37.3|NZL|3|1
Christchurch|172.0|-43.0|NZL|2|0
Dunedin|169.5|-45.6|NZL|0|0
Fiji|178.0|-17.8|ENG|1|0|bc
Nouméa|165.5|-21.5|FRA|1|0|c
Tahiti|-149.57|-17.65|FRA|0|0|bc
Samoa|-172.1|-13.6|NZL|0|0|bc
Tarawa|172.98|1.45|ENG|0|0|bc
`;
// Victory points / factories are tuned so the Americas and Asia matter without drowning Europe.
const RES = {
  oil:{ Houston:8, Dallas:4, 'Oklahoma City':4, 'Los Angeles':4, Maracaibo:6, Tampico:3, Trinidad:2, Palembang:5, Balikpapan:4, Brunei:2, Mandalay:2, Aleksandrovsk:2, Bahrain:2, Kuwait:2 },
  steel:{ Pittsburgh:8, Detroit:4, Chicago:4, Buffalo:2, Philadelphia:2, Toronto:3, Osaka:3, Fukuoka:3, Tokyo:2, Mukden:4, Wuhan:2, Jamshedpur:3, Sydney:2, Novosibirsk:3, Karaganda:2, Pretoria:3, 'Belo Horizonte':2, 'Élisabethville':2 },
};
// Sea zones: id, name, then one or more lon,lat seed points (the first is the fleet marker).
// Zones that exist on the legacy map keep their ids; their seeds pin them to their old waters.
const SEAS = `
ARC|Barents Sea|40,73|30,75|55,71
NOR|Norwegian Sea|2,67|-10,70|8,72
NSE|North Sea|3,56
CHN|English Channel|-2.5,50.2
ATL|Bay of Biscay|-10,45|-5,46|-12,38
BAL|Baltic Sea|18.5,56.5|20,59|21,63
WMD|Western Mediterranean|5,39|-2,37|10,41
EMD|Eastern Mediterranean|22,35|30,33.5|16,39
BLK|Black Sea|34,43.3
IND|Red Sea & Gulf|38.5,20.5|51,27|35,26
CAS|Caspian Sea|51,42
GRL|Greenland Sea|-15,76|-25,72|5,80
DST|Denmark Strait|-30,63|-35,60
NAT|North Atlantic|-35,48|-45,42|-25,52
LAB|Labrador Sea|-52,58|-58,62
HUD|Hudson Bay|-84,60|-78,57|-90,63
BAF|Baffin Bay|-65,73|-75,76
CAA|Canadian Arctic|-110,74|-125,72|-90,80
WAT|Western Atlantic|-68,36|-73,39|-62,42
GOM|Gulf of Mexico|-91,25
CAR|Caribbean Sea|-75,15|-82,18|-64,14
MAC|Central Atlantic|-28,28|-20,32|-40,30
CVA|Cape Verde Basin|-28,12|-22,18|-38,15
GUI|Gulf of Guinea|2,2|-10,4|8,-4
BRZ|Brazilian Coast|-30,-8|-35,-15|-38,0
SAT|South Atlantic|-20,-30|-40,-38|-10,-20
PAT|Argentine Sea|-60,-46|-55,-40
CAP|Cape of Good Hope|12,-36|20,-38|5,-28
WIO|Mozambique Channel|42,-18|46,-28|52,-10
ARB|Arabian Sea|63,15|52,13|70,8
BOB|Bay of Bengal|88,14|93,8|90,19
SIO|Indian Ocean|80,-20|70,-5|95,-30|60,-35
EIO|Eastern Indian Ocean|100,-15|108,-12|112,-28
JAV|Java Sea|112,-5|118,-7|106,-4
BAN|Banda Sea|127,-5|123,-2|132,-9
SCS|South China Sea|113,13|111,8|117,18
ECS|East China Sea|125,29|123,35|121,25
SOJ|Sea of Japan|135,40|131,38|139,44
OKH|Sea of Okhotsk|148,54|145,49|154,57
BER|Bering Sea|-177,58|178,60|-170,56
CHU|Chukchi Sea|-170,70|180,72|-160,72
ESB|East Siberian Sea|160,73|145,75|170,71
LAP|Laptev Sea|125,76|115,77|135,74
KAR|Kara Sea|70,74|80,76|60,72|95,77
PHS|Philippine Sea|133,18|128,12|138,25
NWP|Northwest Pacific|155,38|148,30|165,45|142,36
MIC|Caroline Islands|148,6|140,3|155,9
MAR|Marshall Islands|170,8|178,0|165,14
CPA|Central Pacific|-160,20|-150,26|-170,15|-155,10
NPA|North Pacific|-160,45|-170,48|-145,50|-150,38
GOA|Gulf of Alaska|-145,56|-135,54|-155,55
EPA|Eastern Pacific|-128,36|-125,45|-122,30
MPA|Mexican Pacific|-105,15|-95,12|-112,20|-85,5
SEP|Southeast Pacific|-85,-15|-78,-28|-95,-5|-80,-40
SOP|South Pacific|-140,-20|-160,-10|-120,-35|-100,-45|-175,-30
COR|Coral Sea|155,-15|150,-20|160,-8|152,-10
TAS|Tasman Sea|160,-38|155,-32|170,-45
GAB|Great Australian Bight|130,-38|120,-36|140,-42
`;
// links the coarse raster cannot see: canals and narrow straits (zone pairs), and land links (province pairs)
const SEA_LINKS = [['CAR', 'MPA', 'Panama'], ['IND', 'EMD', 'Cairo'], ['BLK', 'EMD', 'Istanbul'], ['BAL', 'NSE', 'Copenhagen'], ['ATL', 'WMD', 'Gibraltar'], ['JAV', 'EIO'], ['SCS', 'JAV'], ['BOB', 'SCS', 'Singapore']];
// short straits armies can cross like a river
const LAND_LINKS = [['Fukuoka', 'Hiroshima'], ['Aomori', 'Sapporo'], ['Matsuyama', 'Hiroshima'], ['Matsuyama', 'Osaka'], ['Singapore', 'Kuala Lumpur'], ['Wellington', 'Christchurch'],
  ['Visayas', 'Manila'], ['Visayas', 'Davao'], ['Palembang', 'Batavia'], ['St. John\'s', 'Goose Bay']];
module.exports = { PROVS, RES, SEAS, SEA_LINKS, LAND_LINKS };
