// Trip data — all stops, used by signup buttons & pack/grab calculator
window.TRIP = {
  meta: {
    dates: "2026.05.14 – 05.20",
    title: "清邁 × 曼谷",
    titleEn: "Chiang Mai × Bangkok",
    subtitle: "就曰設計 × 朋棚創作 2026 員工旅遊",
    subtitleEn: "Annual Studio Retreat",
    departISO: "2026-05-14T07:30:00+08:00",
    crew: 9
  },
  stops: [
    // ───── Day 1 ─────
    { id:"d1-arrival",     day:1, time:"10:20", title:"清邁國際機場落地",         titleEn:"Chiang Mai International — Arrival",        kind:"航班 · Arrival",   skipJoin:true },
    { id:"d1-eastin",      day:1, time:"11:00", title:"Eastin Tan Hotel",            titleEn:"Hotel Check-in",                            kind:"住宿 · Hotel",     skipJoin:true },
    { id:"d1-baankang",    day:1, time:"13:00", title:"Baan Kang Wat 藝術村",        titleEn:"Baan Kang Wat Artist Village",              kind:"景點 · Village",   grab:80 },
    { id:"d1-no39",        day:1, time:"15:00", title:"No.39 Café",                  titleEn:"Lakeside Treehouse Café",                   kind:"咖啡 · Café",      grab:0 },
    { id:"d1-graph",       day:1, time:"16:30", title:"GRAPH Contemporary",          titleEn:"Riverside Coffee & Gallery",                kind:"藝廊 · Gallery",   grab:120 },
    { id:"d1-nimman",      day:1, time:"19:30", title:"尼曼路自由晚餐",              titleEn:"Nimman Free Dinner",                        kind:"自由 · Free time", grab:0, free:true },

    // ───── Day 2 ─────
    { id:"d2-kaomai",      day:2, time:"08:10", title:"Kaomai Lanna Resort",         titleEn:"UNESCO Heritage Tobacco Barns",             kind:"建築 · Heritage",  grab:450 },
    { id:"d2-rongbom",     day:2, time:"10:00", title:"Café Rong Bom",               titleEn:"Tobacco Barn Café",                         kind:"咖啡 · Café",      grab:0 },
    { id:"d2-taocha",      day:2, time:"11:00", title:"Tao Cha 茶屋",                 titleEn:"Tao Cha Tea House",                         kind:"茶 · Tea",         grab:0 },
    { id:"d2-kaomai-lunch",day:2, time:"12:00", title:"Kaomai 餐廳午餐",              titleEn:"Lunch at Kaomai",                           kind:"用餐 · Lunch",     grab:0 },
    { id:"d2-weave",       day:2, time:"15:00", title:"Weave Artisan Society",       titleEn:"Reclaimed Ice Factory · Artisans",          kind:"工藝 · Artisan",   grab:530 },
    { id:"d2-huenphen",    day:2, time:"19:00", title:"Huen Phen Nimman 員工聚餐",   titleEn:"Studio Dinner · Northern Thai",             kind:"聚餐 · Dinner",    grab:0, highlight:true },
    { id:"d2-wualai",      day:2, time:"21:00", title:"Wualai 銀器街夜間散步",        titleEn:"Wualai Silver Lane Walk",                   kind:"夜間 · Night",     grab:70 },

    // ───── Day 3 ─────
    { id:"d3-maiiam",      day:3, time:"10:00", title:"MAIIAM 當代美術館",            titleEn:"MAIIAM Contemporary Art Museum",            kind:"美術館 · Museum",  grab:220 },
    { id:"d3-sankamphaeng",day:3, time:"14:00", title:"San Kamphaeng 手工藝街",       titleEn:"San Kamphaeng Craft Street",                kind:"工藝 · Craft",     grab:80 },
    { id:"d3-watumong",    day:3, time:"15:30", title:"Wat Umong 地下隧道森林廟",     titleEn:"Forest Tunnel Temple",                      kind:"寺廟 · Temple",    grab:150 },
    { id:"d3-sense-spa",   day:3, time:"17:00", title:"Sense Massage & Spa Nimman",   titleEn:"Sense Spa · Nimman",                        kind:"SPA · Spa",        grab:80, spa:"sense" },

    // ───── Day 4 ─────
    { id:"d4-phalat",      day:4, time:"07:00", title:"Wat Pha Lat 叢林秘境寺廟",     titleEn:"Misty Jungle Temple",                       kind:"晨拍 · Sunrise",   grab:100 },
    { id:"d4-maya",        day:4, time:"10:00", title:"MAYA Lifestyle Mall",          titleEn:"MAYA Mall · Cool-Down Day",                 kind:"購物 · Shopping",  grab:0 },
    { id:"d4-wualai-mkt",  day:4, time:"18:00", title:"Wualai 週六銀器夜市",          titleEn:"Saturday Walking Street",                   kind:"夜市 · Market",    grab:70 },

    // ───── Day 5 ─────
    { id:"d5-airport",     day:5, time:"09:00", title:"清邁機場 · 各自登機",          titleEn:"Departure Day",                             kind:"航班 · Departure", skipJoin:true },

    // ───── Ryan Bangkok ─────
    { id:"r1-dib",         day:6, time:"14:30", title:"Dib Bangkok",                  titleEn:"Bangkok's Major New Contemporary Museum",   kind:"美術館 · Museum",  grab:350, ryan:true },
    { id:"r2-ortorkor",    day:7, time:"09:00", title:"Or Tor Kor Market",            titleEn:"Premier Fresh Market",                      kind:"市場 · Market",    grab:180, ryan:true },
    { id:"r2-erawan",      day:7, time:"11:00", title:"四面佛 Erawan Shrine",         titleEn:"Erawan Shrine",                             kind:"宗教 · Shrine",    grab:150, ryan:true },
    { id:"r2-80below",     day:7, time:"12:30", title:"80below @ Siam Paragon",       titleEn:"Live Oyster Bar",                           kind:"用餐 · Lunch",     grab:0,   ryan:true },
    { id:"r2-oasis",       day:7, time:"14:30", title:"Oasis Spa Ekkamai",            titleEn:"Oasis Spa Ekkamai",                         kind:"SPA · Spa",        grab:120, ryan:true, spa:"oasis" },
    { id:"r3-fbt",         day:8, time:"12:00", title:"Fewer Better Things",          titleEn:"Curated Menswear & Goods",                  kind:"選物 · Boutique",  grab:80,  ryan:true }
  ],
  // photo URLs — Unsplash, mood references
  photos: {
    cover:        "https://images.unsplash.com/photo-1598935898639-81586f7d2129?w=1400&q=80&auto=format&fit=crop", // chiang mai temple mist
    "d1-baankang":"https://images.unsplash.com/photo-1528181304800-259b08848526?w=1000&q=80&auto=format&fit=crop", // wooden village
    "d1-no39":    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=80&auto=format&fit=crop", // cafe wood
    "d1-graph":   "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1000&q=80&auto=format&fit=crop", // industrial cafe
    "d2-kaomai":  "https://images.unsplash.com/photo-1604147495798-57beb5d6af73?w=1000&q=80&auto=format&fit=crop", // brick barn
    "d2-rongbom": "images/rongbom.jpg", // tobacco barn cafe with red umbrella
    "d2-taocha":  "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1000&q=80&auto=format&fit=crop", // tea
    "d2-weave":   "images/weave.jpg", // reclaimed ice factory artisan space
    "d2-huenphen":"https://images.unsplash.com/photo-1559314809-0d155014e29e?w=1000&q=80&auto=format&fit=crop", // thai food
    "d2-wualai":  "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=1000&q=80&auto=format&fit=crop", // night market
    "d3-maiiam":  "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1000&q=80&auto=format&fit=crop", // mirror art museum
    "d3-sankamphaeng":"https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1000&q=80&auto=format&fit=crop", // craft
    "d3-watumong":"https://images.unsplash.com/photo-1552550049-db097c9480d1?w=1000&q=80&auto=format&fit=crop", // forest temple
    "d3-sense-spa":"https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&q=80&auto=format&fit=crop", // spa
    "d4-phalat":  "https://images.unsplash.com/photo-1528181304800-259b08848526?w=1000&q=80&auto=format&fit=crop", // misty temple
    "d4-maya":    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1000&q=80&auto=format&fit=crop", // mall
    "d4-wualai-mkt":"https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?w=1000&q=80&auto=format&fit=crop", // night market thailand
    "r1-dib":     "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1000&q=80&auto=format&fit=crop",
    "r2-ortorkor":"https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1000&q=80&auto=format&fit=crop",
    "r2-erawan":  "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1000&q=80&auto=format&fit=crop",
    "r2-80below": "https://images.unsplash.com/photo-1606851094291-6efae152bb87?w=1000&q=80&auto=format&fit=crop",
    "r2-oasis":   "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1000&q=80&auto=format&fit=crop",
    "r3-fbt":     "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1000&q=80&auto=format&fit=crop",
    senseSpa:     "https://images.unsplash.com/photo-1591343395082-e120087004b4?w=1000&q=80&auto=format&fit=crop",
    oasisSpa:     "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1000&q=80&auto=format&fit=crop"
  },
  descriptions: {
    "d1-baankang":"蘭納木造建築群環抱著一條石板小徑，工作室一間連著一間：陶藝、織品、皮件、手作香氛。週一公休，今天必去。",
    "d1-no39":   "人工湖中央的木造小屋，遠看像是 DJ 台，近看像是樹屋。下午陽光斜斜地照進湖面，慢慢喝杯 Latte。",
    "d1-graph":  "河邊的舊倉庫改建為精品咖啡，牆上掛著本地插畫家的限量印刷品；單品手沖配著自家烘焙的可頌。",
    "d2-kaomai": "1955 年的煙草烘乾倉庫群，2018 年獲得 UNESCO 亞太文化遺產獎。47 萊（rai）的老樹園區裡，磚牆與大樹交錯。",
    "d2-rongbom":"雙聯式煙草倉改建的咖啡廳，挑高的紅磚拱頂與斑駁的工業遺跡是建築層次最強的一棟。",
    "d2-taocha": "得獎花草茶室，自種季節花材，從泡製到品飲都是嗅覺體驗。可單點下午茶套組。",
    "d2-weave":  "廢棄製冰廠改建的工藝聚落，職人工作室、小藝廊與咖啡共生。17:30 打烊，要趕時間。",
    "d2-huenphen":"清邁最知名的泰北老字號，必點：豬肉咖哩、北方香腸、豬皮脆片、米線咖哩。已訂位 9 人。",
    "d2-wualai": "銀器職人世代聚集的老街，沒有夜市攤但有些零星小店與酒吧；夜風涼爽，慢慢走完一圈。",
    "d3-maiiam": "泰國唯一的東南亞當代藝術館，鏡面馬賽克外觀映出周圍的稻田與天光；倉庫展間與設計選品店。",
    "d3-sankamphaeng":"木雕、陶瓷、絲織等工藝師現場工作，可看製作過程，也可帶走小物。",
    "d3-watumong":"14 世紀蘭納王所建，山丘下的地下冥想隧道：苔蘚、蝙蝠、烏龜魚池。20 銖門票，清邁最冷門最獨特的廟。",
    "d3-sense-spa":"Nimman 區評價最高的正規 Spa，獨立包廂、冷氣、專業油壓。已訂位 17:00。",
    "d4-phalat": "半山腰的叢林寺廟，苔蘚石階、潺潺小溪、晨霧穿透樹冠。6:00 開放，早去人極少。",
    "d4-maya":   "全館冷氣，B1 在地小吃食堂、4F 美食餐廳、頂樓清邁山景露台。輕鬆補眠日。",
    "d4-wualai-mkt":"在地銀器職人的傳統鎚打工藝、手作市集、街邊小食。週六限定 17:00–22:00。",
    "r1-dib":    "泰國首座大型國際當代藝術館，2025 年底開幕，11 個展廳、戶外雕塑花園；當期展《(In)visible Presence》探索記憶與感官。",
    "r2-ortorkor":"曼谷最高品質的生鮮市場，進口水果、新鮮香料、視覺震撼。早上去最好。",
    "r2-erawan": "市中心十字路口的四面佛，買鮮花線香套組，跟著在地人的節奏參拜。",
    "r2-80below":"Siam Paragon B1 的活體海鮮生蠔吧，推薦 Gillardeau 品種，搭一杯 Chablis 白酒。",
    "r2-oasis":  "Soi Ekkamai 21 的傳統泰式美學 Spa，私人獨立包廂，距 Thonglor 10 分鐘。",
    "r3-fbt":    "Sukhumvit 31 的男裝選物店，老闆親自介紹每個品牌的故事；同時也是生活選品的好地方。"
  },
  facts: {
    "d1-baankang":{ open:"週二–日 10:00–18:00", price:"免費", duration:"≈ 2h", note:"週一公休" },
    "d1-no39":    { open:"每日 09:00–18:00", price:"飲品 ≈ 100 銖", duration:"≈ 1h" },
    "d1-graph":   { open:"每日 09:00–17:00", price:"飲品 ≈ 150 銖", duration:"≈ 1h" },
    "d2-kaomai":  { open:"全年無休", price:"免費入園", duration:"≈ 4h", note:"園區內可餐飲" },
    "d2-rongbom": { open:"每日 08:30–18:00", price:"飲品 ≈ 120 銖", duration:"≈ 1h" },
    "d2-taocha":  { open:"每日 09:00–18:00", price:"茶 ≈ 200 銖", duration:"≈ 1h" },
    "d2-weave":   { open:"每日 09:00–17:30", price:"免費", duration:"≈ 1.5h" },
    "d2-huenphen":{ open:"19:00", price:"≈ 400 銖／人", duration:"≈ 2h", note:"已訂位 9 人" },
    "d2-wualai":  { open:"夜晚自由時段", price:"自費", duration:"≈ 1h" },
    "d3-maiiam":  { open:"週一・三–日 10:00–18:00", price:"200 銖", duration:"≈ 2h", note:"週二公休" },
    "d3-sankamphaeng":{ open:"白天時段", price:"自費", duration:"≈ 1h" },
    "d3-watumong":{ open:"每日 04:00–20:00", price:"20 銖", duration:"≈ 1.5h" },
    "d3-sense-spa":{ open:"每日 11:00–22:00", price:"≈ 1,000 銖／60 min", duration:"60–90 min", note:"已訂位" },
    "d4-phalat":  { open:"每日 06:00–17:30", price:"免費", duration:"≈ 1.5h", note:"晨霧最美" },
    "d4-maya":    { open:"每日 10:00–22:00", price:"自費", duration:"自由" },
    "d4-wualai-mkt":{ open:"週六 17:00–22:00", price:"免費", duration:"≈ 2h" },
    "r1-dib":     { open:"週四–一 10:00–19:00", price:"700 銖", duration:"≈ 2.5h", note:"需線上預購" },
    "r2-ortorkor":{ open:"每日 08:00–18:00", price:"免費", duration:"≈ 1.5h" },
    "r2-erawan":  { open:"每日 06:00–22:00", price:"免費", duration:"≈ 30 min" },
    "r2-80below": { open:"每日 10:00–22:00", price:"≈ 1,500 銖／人", duration:"≈ 1.5h" },
    "r2-oasis":   { open:"每日 10:00–00:00", price:"≈ 2,500 銖／2h", duration:"≈ 2h" },
    "r3-fbt":     { open:"週三–日 12:00–19:00", price:"自費", duration:"≈ 1h" }
  }
};
