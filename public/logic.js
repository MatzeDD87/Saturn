/* Reine Berater-Logik ohne DOM-Zugriff.
   Wird im Browser per <script src="logic.js"> geladen und von server.js sowie den Tests
   (test/*.test.js) über node:vm ausgeführt – deshalb bewusst ein klassisches Skript ohne import/export. */

/* ═══ MARKT-KONFIGURATION ═══ */
const STORE = { name:'Altmarkt-Galerie', city:'Dresden', service:'Startklar-Service', servicePrice:29 };

/* ═══ GERÄTE-DATENBANK ═══
   s = Berater-Einschätzung 0–10 (Basis für das Matching)
   cam: Hauptkamera · night: Nacht · zoom: Tele · video: Video · bat: Ausdauer
   charge: Ladetempo · perf: Leistung · value: Preis-Leistung · simple: einfache Bedienung */
const DEVICES = [
  { id:'s25u', brand:'Samsung', n:'Samsung Galaxy S25 Ultra', pNum:1449, stock:6, loc:'Gang 2 · Tisch S1', os:'android', size:6.9,
    display:'6,9" QHD+ Dynamic AMOLED 2X (120Hz)', chip:'Snapdragon 8 Elite for Galaxy',
    cam:'200 MP Haupt + 50 MP Ultraweit + 50 MP 5x Periskop', bat:'5.000 mAh · 45W Fast-Charge',
    acc:'Samsung 45W Power Adapter + Clear Magnet Case + Kalibrierung',
    h:['📸 200 MP Quad','🌙 Nightography AI','🖊️ S Pen inkl.','🔋 5.000 mAh'],
    d:'Die absolute Referenz für Zoom- & Nachtfotografie mit entspiegeltem Gorilla Armor Glas und integriertem S Pen.',
    s:{cam:10,night:10,zoom:10,video:9,bat:8,charge:7,perf:10,value:5,simple:5} },
  { id:'s25', brand:'Samsung', n:'Samsung Galaxy S25', pNum:899, stock:9, loc:'Gang 2 · Tisch S1', os:'android', size:6.2,
    display:'6,2" FHD+ Dynamic AMOLED 2X (120Hz)', chip:'Snapdragon 8 Elite',
    cam:'50 MP Triple-Kamera mit 3x optischem Tele', bat:'4.000 mAh · 25W + Qi2',
    acc:'Samsung 25W Adapter + Silicone Case + Panzerglas',
    h:['📸 50 MP Triple','🤖 Galaxy AI','⚡ SD 8 Elite','🪶 162g Kompakt'],
    d:'Maximale Flaggschiff-Performance und volle Galaxy AI im handlichen Kompaktformat.',
    s:{cam:8,night:8,zoom:7,video:8,bat:6,charge:5,perf:9,value:7,simple:7} },
  { id:'a56', brand:'Samsung', n:'Samsung Galaxy A56', pNum:479, stock:14, loc:'Gang 2 · Regal A3', os:'android', size:6.7,
    display:'6,7" FHD+ Super AMOLED (120Hz)', chip:'Exynos 1580 Octa-Core',
    cam:'50 MP Hauptsensor mit OIS + 12 MP Ultraweit', bat:'5.000 mAh · 45W Schnellladen',
    acc:'45W Schnellladegerät + Samsung Wallet Case',
    h:['📸 50 MP OIS','💧 IP67 Schutz','⚡ 45W Laden','🔄 6J Updates'],
    d:'Der Mittelklasse-Bestseller in Dresden: Metallrahmen, 45W-Schnellladen und starke Ausdauer.',
    s:{cam:7,night:6,zoom:4,video:6,bat:8,charge:7,perf:6,value:9,simple:8} },
  { id:'p10p', brand:'Google', n:'Google Pixel 10 Pro', pNum:1099, stock:4, loc:'Gang 3 · Tisch G1', os:'android', size:6.3,
    display:'6,3" Super Actua LTPO OLED (1-120Hz)', chip:'Google Tensor G5 + Titan M2',
    cam:'50 MP Haupt + 48 MP Ultraweit + 48 MP 5x Tele', bat:'4.850 mAh · 37W Fast-Charge',
    acc:'Google 45W USB-C Charger + Pixel Snap Case',
    h:['📸 50 MP Pro-Triple','🌙 Night Sight 3.0','🤖 Gemini Nano','🔄 7J Updates'],
    d:'Googles KI-Meisterstück mit der natürlichsten Porträt- und Nachtkamera auf dem Markt.',
    s:{cam:10,night:10,zoom:9,video:8,bat:7,charge:6,perf:8,value:6,simple:8} },
  { id:'p9a', brand:'Google', n:'Google Pixel 9a', pNum:499, stock:8, loc:'Gang 3 · Tisch G1', os:'android', size:6.3,
    display:'6,3" Actua OLED Display (120Hz)', chip:'Google Tensor G4',
    cam:'48 MP Dual-Pixel OIS + 13 MP Ultraweitwinkel', bat:'5.100 mAh · Adaptive Battery',
    acc:'30W USB-C Netzteil + Stoßfestes Clear Case',
    h:['📸 Beste Cam <500€','🌙 Night Sight','🔋 5.100 mAh','🔄 7J Updates'],
    d:'Unschlagbare Punktlandung unter 500 €: Gleiche Foto-Intelligenz wie die großen Pixel-Brüder.',
    s:{cam:8,night:8,zoom:3,video:6,bat:8,charge:4,perf:6,value:9,simple:9} },
  { id:'ip17pm', brand:'Apple', n:'iPhone 17 Pro Max', pNum:1449, stock:3, loc:'Gang 1 · Apple Shop', os:'ios', size:6.9,
    display:'6,9" Super Retina XDR ProMotion (120Hz)', chip:'Apple A19 Pro (3nm)',
    cam:'48 MP Fusion Triple-System + 5x Tetraprisma', bat:'4.750 mAh · MagSafe 25W',
    acc:'Apple 30W USB-C Power Adapter + MagSafe Clear Case',
    h:['🎬 4K120 / ProRes','📸 3x 48 MP Pro','⚡ A19 Pro Chip','🔋 Rekord-Akku'],
    d:'Die unangefochtene Nummer 1 für Video-Creator, iOS-Enthusiasten und maximale Wertstabilität.',
    s:{cam:10,night:9,zoom:9,video:10,bat:9,charge:5,perf:10,value:5,simple:9} },
  { id:'ip17', brand:'Apple', n:'iPhone 17', pNum:949, stock:7, loc:'Gang 1 · Apple Shop', os:'ios', size:6.1,
    display:'6,1" Super Retina XDR (120Hz ProMotion)', chip:'Apple A19 Bionic',
    cam:'48 MP Fusion Kamera mit 2x Tele-Qualität', bat:'Ganztages-Akku · MagSafe',
    acc:'20W/30W Apple USB-C Adapter + Silikon Case',
    h:['📱 Endlich 120Hz','📸 48 MP Fusion','⚡ A19 Chip','🍎 Apple Intelligence'],
    d:'Endlich mit flüssigem 120Hz ProMotion-Display – das rundeste Standard-iPhone seit Jahren.',
    s:{cam:8,night:7,zoom:5,video:9,bat:7,charge:5,perf:9,value:7,simple:10} },
  { id:'px7p', brand:'Xiaomi', n:'Xiaomi POCO X7 Pro', pNum:299, stock:11, loc:'Gang 4 · Regal X2', os:'android', size:6.67,
    display:'6,67" 1.5K CrystalRes AMOLED (120Hz)', chip:'MediaTek Dimensity 8400-Ultra',
    cam:'50 MP Sony OIS Kamera + 8 MP Ultraweit', bat:'6.000 mAh · 90W HyperCharge',
    acc:'Xiaomi 90W HyperCharge Adapter + Panzerglas',
    h:['🔋 6.000 mAh Akku','⚡ 90W Turbo-Charge','💪 Dimensity 8400','📱 120Hz AMOLED'],
    d:'Preis-Leistungs-Kracher unter 300 €: Riesiger 6.000-mAh-Akku und Flaggschiff-Tempo.',
    s:{cam:6,night:5,zoom:3,video:6,bat:10,charge:10,perf:8,value:10,simple:6} },
  { id:'rn15', brand:'Xiaomi', n:'Xiaomi Redmi Note 15', pNum:189, stock:15, loc:'Gang 4 · Regal X1', os:'android', size:6.67,
    display:'6,67" FHD+ AMOLED Display (120Hz)', chip:'Snapdragon 6 Gen Serie',
    cam:'108 MP hochauflösende Hauptkamera', bat:'5.100 mAh · 33W Fast-Charge',
    acc:'33W Schnelllader + Klapphülle Schwarz',
    h:['📱 120Hz AMOLED','🔋 5.100 mAh','📸 108 MP Sensor','💰 Unter 200 €'],
    d:'Brillantes AMOLED-Display und großer Akku für kleines Budget.',
    s:{cam:6,night:5,zoom:3,video:5,bat:8,charge:6,perf:5,value:9,simple:7} },
  { id:'e50n', brand:'Motorola', n:'Motorola Edge 50 Neo', pNum:399, stock:5, loc:'Gang 4 · Regal M1', os:'android', size:6.4,
    display:'6,4" pOLED LTPO (120Hz, 3000 Nits)', chip:'Dimensity 7300',
    cam:'50 MP Sony Lytia OIS + 10 MP 3x Tele', bat:'4.310 mAh · 68W TurboPower',
    acc:'68W Netzteil (im Karton!) + Schutzfolie',
    h:['🔋 Sparsames LTPO','⚡ 68W + Wireless','📸 Echter 3x Zoom','🎨 Pantone-Design'],
    d:'Kompakt, wasserdicht nach IP68, griffiges Vegan-Leder und echtes Teleobjektiv.',
    s:{cam:7,night:6,zoom:6,video:6,bat:6,charge:8,perf:6,value:8,simple:7} },
  { id:'me15', brand:'Motorola', n:'Motorola Moto E15', pNum:79, stock:12, loc:'Gang 4 · Einsteiger-Wand', os:'android', size:6.67,
    display:'6,67" HD+ IPS LCD (90Hz)', chip:'Helio G81 Extreme',
    cam:'32 MP KI-Kamera', bat:'5.200 mAh · 18W Laden',
    acc:'18W USB-C Netzteil + Buchhülle',
    h:['💰 Nur 79 €','🔋 5.200 mAh','📱 90Hz Großdisplay','🔊 Stereo-Speaker'],
    d:'Solides Einsteigergerät für WhatsApp, Telefonie, Online-Banking und den Alltag.',
    s:{cam:3,night:2,zoom:1,video:2,bat:8,charge:3,perf:2,value:8,simple:9} },
  { id:'hm8p', brand:'Honor', n:'Honor Magic 8 Pro', pNum:899, stock:2, loc:'Gang 3 · Tisch H1', os:'android', size:6.8,
    display:'6,8" LTPO Quad-Curved OLED (120Hz)', chip:'Snapdragon 8 Elite',
    cam:'200 MP Periskop-Tele + 50 MP Falcon-Cam', bat:'5.850 mAh Silizium-Carbon · 100W',
    acc:'Honor 100W SuperCharge Adapter + Schutzglas',
    h:['📸 200 MP Tele','🔋 5.850 mAh Si-C','⚡ 100W Laden','👁️ Augen-Schutz PWM'],
    d:'Hightech-Geheimtipp mit riesigem Silizium-Carbon-Akku und extrem schneller Auslösung.',
    s:{cam:9,night:9,zoom:10,video:8,bat:10,charge:10,perf:10,value:7,simple:6} }
];
const DB = Object.fromEntries(DEVICES.map(d => [d.id, d]));
const BRANDS = ['Alle', ...new Set(DEVICES.map(d => d.brand))];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n.toLocaleString('de-DE') + ' €';

const PRICE_PROMPT = n => `Aktueller Preis für "${n}" bei Saturn oder MediaMarkt Deutschland. Antworte NUR als reines JSON: {"preis":"XXX,XX €","quelle":"saturn.de / mediamarkt.de","hinweis":"Kurzer Verfügbarkeitshinweis","gefunden":true}. Wenn du keinen Preis findest: {"gefunden":false}`;

const BUDGET = { u200:[0,200], m500:[200,500], o950:[500,950], p:[900,Infinity], egal:[0,Infinity] };
const S_LABEL = { cam:'Starke Hauptkamera', night:'Top bei Nacht', zoom:'Starker Zoom', video:'Video-Referenz', bat:'Großer Akku',
  charge:'Sehr schnelles Laden', perf:'Flaggschiff-Leistung', value:'Top Preis-Leistung', simple:'Einfache Bedienung' };

/* ═══ MATCHING ═══ */
const OS_PENALTY = 10;
function weights(a){
  switch(a.prio){
    case 'kamera': return ({ nacht:{night:3,zoom:2,cam:2}, video:{video:3,cam:2,perf:1}, allround:{cam:2.5,simple:1,value:1.5} })[a.kamera];
    case 'akku':   return ({ ausdauer:{bat:3,perf:1,value:1}, alltag:{bat:2.5,simple:1.5,value:1}, laden:{charge:3,bat:1.5} })[a.akku];
    case 'preis':  return {value:3,cam:1,bat:1,perf:1};
    case 'leistung': return {perf:3,charge:1,bat:1,video:.5};
    default:       return {simple:3,bat:1.5,value:1.5};
  }
}

function scoreDevice(d, a, stockOf = defaultStock){
  const w = weights(a);
  let sum = 0, tw = 0;
  for(const k in w){ sum += w[k] * d.s[k]; tw += w[k]; }
  let sc = sum / tw;
  const pos = [], neg = [];
  Object.keys(w).sort((x, y) => w[y] - w[x]).forEach(k => { if(d.s[k] >= 8 && pos.length < 2) pos.push(S_LABEL[k]); });

  const [lo, hi] = BUDGET[a.budget] || BUDGET.egal;
  if(d.pNum > hi){ sc -= 2 + (d.pNum - hi) / hi * 8; neg.push(`${fmt(d.pNum - hi)} über Budget`); }
  else if(d.pNum < lo){ sc -= 1.2; }
  else if(a.budget !== 'egal'){ pos.push('Passt ins Budget'); }

  // Der OS-Wunsch ist praktisch ein Ausschlusskriterium: der Malus übersteigt die gesamte Score-Skala (0–10)
  if(a.os === 'ios' && d.os !== 'ios'){ sc -= OS_PENALTY; neg.push('Android statt iOS'); }
  if(a.os === 'android' && d.os === 'ios'){ sc -= OS_PENALTY; neg.push('iOS statt Android'); }

  if(a.size === 'kompakt'){ if(d.size <= 6.4){ sc += .8; pos.push('Kompaktes Format'); } else { sc -= 1; neg.push(`Groß (${String(d.size).replace('.', ',')}")`); } }
  if(a.size === 'gross'){ if(d.size >= 6.7){ sc += .8; pos.push('Großes Display'); } else sc -= .6; }

  const st = stockOf(d);
  if(st === 0){ sc -= 2.5; neg.push('Aktuell nicht vorrätig'); }
  else if(st < 3) neg.push(`Nur noch ${st}x im Markt`);

  return { d, sc, match: Math.max(1, Math.min(99, Math.round(sc * 10))), pos, neg };
}

function recommend(a, stockOf = defaultStock){ return DEVICES.map(d => scoreDevice(d, a, stockOf)).sort((x, y) => y.sc - x.sc); }

/* ═══ LIVE-PREISCHECK ═══ */
function parsePrice(t){
  try{
    const m = t.match(/\{[\s\S]*\}/);
    if(m){ const j = JSON.parse(m[0]); if(j.gefunden !== false && j.preis) return j; if(j.gefunden === false) return null; }
  }catch{}
  const m = t.match(/\d{1,2}\.\d{3}(,\d{2})?\s*€|\d{2,4}(,\d{2})?\s*€/);
  return m ? { preis:m[0], quelle:'Live-Suche', hinweis:'' } : null;
}
const priceNum = s => parseFloat(String(s).replace(/[^\d,]/g, '').replace(',', '.'));

function fmtMsg(t){
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[\*\-]\s+/gm, '• ')
    .replace(/\n/g, '<br>');
}

const defaultStock = d => d.stock;

/* ═══ GESCRAPTE ONLINE-PREISE (data/prices.json) ═══ */
const SCRAPED_MAX_AGE_H = 36;
// Liefert den gespeicherten Preis nur, wenn er erfolgreich ermittelt wurde und nicht zu alt ist
function freshScraped(entry, now = Date.now(), maxAgeH = SCRAPED_MAX_AGE_H){
  if(!entry || !Number.isFinite(entry.price) || !entry.checkedAt) return null;
  const age = now - Date.parse(entry.checkedAt);
  if(!(age >= 0) || age > maxAgeH * 3600e3) return null;
  return entry;
}
// Nur http(s)-Links aus externen Daten übernehmen
const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : null;
const priceDiffText = (price, ref) => {
  const diff = Math.round(price - ref);
  return diff === 0 ? null : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))} ggü. Marktpreis ${fmt(ref)}`;
};

globalThis.MMSLogic = { STORE, DEVICES, DB, BRANDS, BUDGET, S_LABEL, PRICE_PROMPT,
  esc, fmt, weights, scoreDevice, recommend, parsePrice, priceNum, fmtMsg, freshScraped, safeUrl, priceDiffText, SCRAPED_MAX_AGE_H };
