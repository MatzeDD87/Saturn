// MAX – der Berater im Katalog-Modus (ohne KI-Schlüssel).
// Regelbasiert, aber mit Gedächtnis: Budget, Marke, System und Wunsch bleiben über das Gespräch erhalten.
// Antworten sind reiner Text mit **fett** und internen Links der Form [Text](#/route).
import * as D from './data.js';

export const NAME = 'MAX';

const fresh = () => ({ budget: null, brand: null, os: null, need: null, last: [], offset: 0 });
let ctx = fresh();
export const reset = () => { ctx = fresh(); };
export const context = () => ({ ...ctx, last: [...ctx.last] });

// ---------- Erkennung ----------
const NEEDS = [
  ['fold', /fold|falt|klapp|flip/, 'Foldables'],
  ['camera', /kamera|foto|zoom|tele\b|telezoom|bilder|selfie/, 'Fotos'],
  ['video', /video|filmen|vlog|tiktok|reels/, 'Videos'],
  ['battery', /akku|laufzeit|batterie|ausdauer|lange durch/, 'lange Akkulaufzeit'],
  ['gaming', /gam|zock|spiele|(?<!preis[- ])leistung|schnellste|power/, 'Gaming'],
  ['senior', /\boma\b|\bopa\b|senior|großeltern|eltern|mutter|vater|\bmama\b|\bpapa\b|einfache bedienung|einfach zu bedienen/, 'einfache Bedienung'],
  ['kids', /kind|schul|teen|jugend|tochter|sohn|erstes handy/, 'Kinder & Jugendliche'],
  ['compact', /kompakt|klein|handlich|eine hand/, 'kompakte Größe'],
  ['updates', /update|nachhaltig|langlebig|lange halten|reparier/, 'lange Updates'],
  ['business', /business|arbeit|beruf|dienst|büro/, 'Arbeit & Business'],
  ['value', /günstig|billig|preiswert|preis-leistung|preis leistung|sparen|einsteiger/, 'Preis-Leistung'],
];
const needLabel = (k) => NEEDS.find((n) => n[0] === k)?.[2] || 'dich';

const norm = (s) => String(s).toLowerCase().replace(/[().,!?„“"']/g, ' ').replace(/\s+/g, ' ').trim();
const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function aliases(p) {
  const n = norm(p.name);
  const set = new Set([norm(p.fullName), n, n.replace(/ 5g$/, ''), n.replace(/^galaxy /, ''), n.replace(/^galaxy /, '').replace(/ 5g$/, ''), n.replace(/ gen /, ' ')]);
  if (p.brand === 'Nothing') set.add(`nothing ${n}`);
  return [...set].filter((a) => a.length >= 3 && !/^\d+$/.test(a));
}

// Findet genannte Geräte (längste Bezeichnung zuerst) und gibt den Resttext ohne Gerätenamen zurück.
function findDevices(text) {
  let rest = ` ${norm(text)} `;
  const table = D.all().flatMap((p) => aliases(p).map((a) => [a, p])).sort((a, b) => b[0].length - a[0].length);
  const hits = [];
  for (const [a, p] of table) {
    const re = new RegExp(`(^|[^a-z0-9äöüß])${rx(a)}(?![a-z0-9äöüß+])`);
    const m = re.exec(rest);
    if (!m) continue;
    if (!hits.some((h) => h.p.id === p.id)) hits.push({ p, at: m.index });
    rest = rest.slice(0, m.index + m[1].length) + ' '.repeat(a.length) + rest.slice(m.index + m[1].length + a.length);
  }
  return { devices: hits.sort((a, b) => a.at - b.at).map((h) => h.p), rest };
}

function parseBudget(t) {
  const m = /(?:bis|unter|max(?:imal)?|höchstens|budget(?: von| ist| liegt bei)?|für|um die|circa|ca|etwa|so)\s*(\d{2,4})\s*(?:€|euro|eur)?(?![a-z0-9])/.exec(t)
    || /(\d{2,4})\s*(?:€|euro|eur)\b/.exec(t) || /(\d{2,4})\s*€/.exec(t);
  if (!m) return null;
  const v = Number(m[1]);
  return v >= 50 && v <= 5000 ? v : null;
}

// ---------- Bausteine ----------
const link = (p) => `[**${p.fullName}**](#/geraet/${p.id})`;
const eur = (p) => D.price(p.uvp);
const has = (p, tag) => p.tags.includes(tag);

function reason(p, need) {
  const c = p.camera, bits = [];
  switch (need) {
    case 'camera': case 'video':
      if (c.main_mp) bits.push(`${c.main_mp} MP`);
      if (D.hasTele(p)) bits.push(`${D.num(D.teleFactor(p))}x Tele`);
      if (c.ultrawide_mp) bits.push('Ultraweitwinkel');
      break;
    case 'battery':
      if (p.battery_mah) bits.push(`${D.num(p.battery_mah)} mAh`);
      if (p.charging.wired_w) bits.push(`lädt mit ${p.charging.wired_w} W`);
      break;
    case 'gaming':
      if (p.chip) bits.push(p.chip);
      if (p.display.hz) bits.push(`${p.display.hz} Hz`);
      break;
    case 'compact':
      if (p.display.size_in) bits.push(D.inch(p.display.size_in));
      if (p.weight_g) bits.push(`${p.weight_g} g`);
      break;
    case 'fold':
      if (p.display.size_in) bits.push(`${D.inch(p.display.size_in)} aufgeklappt`);
      if (p.cover_display_in) bits.push(`${D.inch(p.cover_display_in)} außen`);
      break;
    case 'updates': case 'senior':
      if (p.updates_years) bits.push(`${p.updates_years} Jahre Updates`);
      if (p.display.size_in) bits.push(D.inch(p.display.size_in));
      break;
    default:
      if (p.display.size_in) bits.push(D.inch(p.display.size_in));
      if (p.battery_mah) bits.push(`${D.num(p.battery_mah)} mAh`);
      if (p.updates_years) bits.push(`${p.updates_years} J. Updates`);
  }
  return bits.join(', ');
}

const by = (...fns) => (a, b) => { for (const f of fns) { const d = f(b) - f(a); if (d) return d; } return 0; };
function rank(pool, need) {
  const rec = (p) => D.recommendScore(p);
  const sorters = {
    camera: by((p) => D.cameraScore(p)),
    video: by((p) => +has(p, 'video'), (p) => D.cameraScore(p)),
    battery: by((p) => p.battery_mah || 0),
    gaming: by((p) => +has(p, 'gaming'), (p) => p.display.hz || 0, rec),
    senior: by((p) => +has(p, 'senior'), (p) => p.updates_years || 0, (p) => -(p.uvp || 0)),
    kids: by(rec),
    compact: by((p) => -(p.display.size_in || 9)),
    updates: by((p) => p.updates_years || 0, (p) => +has(p, 'sustainable'), rec),
    business: by((p) => +has(p, 'business'), rec),
    value: by((p) => +has(p, 'value'), rec),
    fold: by(rec),
  };
  let list = [...pool];
  if (need === 'fold') list = list.filter((p) => p.foldable);
  if (need === 'compact') list = list.filter((p) => !p.foldable || (p.cover_display_in || 9) < 6);
  if (need === 'kids') list = list.filter((p) => p.uvp && p.uvp <= Math.min(ctx.budget || 500, 500));
  return list.sort(sorters[need] || by(rec));
}

function filtered({ ignoreBudget = false } = {}) {
  return D.all().filter((p) => (ignoreBudget || !ctx.budget || (p.uvp && p.uvp <= ctx.budget))
    && (!ctx.brand || p.brand === ctx.brand) && (!ctx.os || p.os === ctx.os));
}

function describe() {
  const parts = [];
  if (ctx.need) parts.push(`für **${needLabel(ctx.need)}**`);
  if (ctx.brand) parts.push(`von ${ctx.brand}`);
  else if (ctx.os) parts.push(ctx.os === 'iOS' ? 'mit iOS' : 'mit Android');
  if (ctx.budget) parts.push(`bis ${D.price(ctx.budget)}`);
  return parts.join(' ');
}

function followChips() {
  const c = [];
  if (!ctx.budget) c.push('Bis 500 €', 'Bis 900 €'); else c.push('Etwas günstiger');
  if (!ctx.need) c.push('Beste Kamera', 'Langer Akku');
  if (!ctx.os && !ctx.brand) c.push('Nur Android', 'Nur iPhone');
  if (ctx.last.length >= 2) c.push('Die Top 3 vergleichen');
  c.push('Weitere zeigen');
  return c.slice(0, 5);
}

function recommend() {
  let list = rank(filtered(), ctx.need);
  let note = '';
  if (!list.length && ctx.brand && rank(D.all(), ctx.need).some((p) => p.brand !== ctx.brand)) {
    note = `Von ${ctx.brand} habe ich dafür nichts Passendes im Katalog, deshalb schaue ich bei allen Marken. `;
    ctx.brand = null; ctx.os = null;
    list = rank(filtered(), ctx.need);
  }
  if (!list.length) {
    const wider = rank(filtered({ ignoreBudget: true }), ctx.need).sort((x, y) => (x.uvp || 9e9) - (y.uvp || 9e9));
    if (!wider.length) {
      ctx.last = [];
      return { text: 'Für diese Kombination finde ich im Katalog nichts. Sollen wir die Marke oder das System offen lassen?', chips: ['Marke egal', 'System egal', 'Neu anfangen'] };
    }
    note += `Bis ${D.price(ctx.budget)} habe ich dafür leider nichts – los geht es ab ${eur(wider[0])}. Das sind die günstigsten Treffer:`;
    list = wider;
  }
  if (note) note = `${note.trim()}\n`;
  if (ctx.offset >= list.length) ctx.offset = 0;
  const top = list.slice(ctx.offset, ctx.offset + 3);
  ctx.last = top.map((p) => p.id);
  const lines = top.map((p, i) => `${ctx.offset + i + 1}. ${link(p)} – ${eur(p)}${reason(p, ctx.need) ? ` · ${reason(p, ctx.need)}` : ''}`);
  const d = describe();
  const intro = note || (ctx.offset ? 'Hier sind die nächsten Kandidaten:\n' : `${d ? `Alles klar, ${d}` : 'Das sind gerade meine Favoriten'} – die würde ich mir ansehen:\n`);
  let tip = '';
  if (!ctx.offset && !note && top[0].pitch) tip = `\n\nMein Tipp: ${top[0].name}. ${top[0].pitch}`;
  let ask = '';
  if (!ctx.budget && !/leider nichts/.test(note)) ask = '\n\nWie viel möchtest du ungefähr ausgeben? Dann grenze ich das genauer ein.';
  else if (!ctx.need) ask = '\n\nWas ist dir am wichtigsten – Kamera, Akku, Größe oder einfach ein guter Preis?';
  return { text: `${intro}${lines.join('\n')}${tip}${ask}`, chips: followChips() };
}

function single(p, t) {
  ctx.last = [p.id];
  const c = p.camera, d = p.display;
  let body;
  if (/akku|laufzeit|laden|batterie/.test(t)) {
    body = `Akku: ${D.unit(p.battery_mah, 'mAh')}${p.charging.wired_w ? `, lädt per Kabel mit bis zu ${p.charging.wired_w} W` : ''}${p.charging.wireless_w ? `, kabellos mit ${p.charging.wireless_w} W` : ''}.${p.charging.note ? ` ${p.charging.note}.` : ''}`;
  } else if (/kamera|foto|zoom|tele|selfie/.test(t)) {
    body = `Kamera: ${c.summary || `${c.main_mp || '?'} MP Hauptkamera`}.${D.hasTele(p) ? ` Tele: ${c.tele_zoom || `${D.num(D.teleFactor(p))}x`}.` : ' Ein echtes Tele-Objektiv fehlt.'}`;
  } else if (/display|bildschirm|größe|gross|groß|zoll/.test(t)) {
    body = `Display: ${D.inch(d.size_in)}${d.type ? `, ${d.type}` : ''}${d.hz ? `, ${d.hz} Hz` : ''}${d.peak_nits ? `, bis ${D.num(d.peak_nits)} Nits` : ''}.${p.foldable && p.cover_display_in ? ` Außendisplay: ${D.inch(p.cover_display_in)}.` : ''}`;
  } else if (/preis|kostet|kosten|teuer|uvp/.test(t)) {
    const sp = D.storagePrices(p).filter((s) => s.uvp);
    body = `UVP: ${sp.length ? sp.map((s) => `${D.storageLabel(s.gb)} ${D.price(s.uvp)}`).join(' · ') : eur(p)}. Das ist der Herstellerpreis zum Marktstart – im Markt und online ist es oft günstiger.`;
  } else if (/update|wie lange|support/.test(t)) {
    body = `Updates: ${p.updates_years ? `${p.updates_years} Jahre` : 'keine Herstellerangabe'}.${p.updates_note ? ` ${p.updates_note}.` : ''}`;
  } else if (/farbe/.test(t)) {
    body = `Farben: ${p.colors.map((x) => x.name).join(', ') || 'keine Angabe'}.`;
  } else if (/speicher|\bgb\b|\bram\b/.test(t)) {
    body = `Speicher: ${D.list(p.storage_gb, 'storage')}, Arbeitsspeicher: ${D.list(p.ram_gb, 'GB')}.`;
  } else if (/wasser|\bip\d|robust|gewicht|schwer/.test(t)) {
    body = `Schutzklasse: ${D.text(p.ip)}, Gewicht: ${D.unit(p.weight_g, 'g')}.`;
  } else {
    const facts = [D.inch(d.size_in) + (d.hz ? ` mit ${d.hz} Hz` : ''), c.main_mp ? `${c.main_mp} MP${D.hasTele(p) ? ` + ${D.num(D.teleFactor(p))}x Tele` : ''}` : null,
      p.battery_mah ? `${D.num(p.battery_mah)} mAh` : null, p.updates_years ? `${p.updates_years} Jahre Updates` : null].filter(Boolean).join(' · ');
    body = `${p.pitch || ''}\n${facts}\nUVP ab ${eur(p)}${p.highlights.length ? `\nHighlights: ${p.highlights.join(', ')}` : ''}`;
  }
  return { text: `${link(p)}\n${body.trim()}`, chips: [`Kamera vom ${p.name}?`, `Akku vom ${p.name}?`, 'Günstigere Alternative', 'Neu anfangen'] };
}

function versus(a, b) {
  ctx.last = [a.id, b.id];
  const rows = [];
  const cmp = (label, va, vb, fmt, lowerWins = false) => {
    if (va == null || vb == null || va === vb) return;
    const w = (va > vb) !== lowerWins ? a : b, l = w === a ? b : a;
    rows.push(`• ${label}: Vorteil ${w.name} (${fmt(w)} gegen ${fmt(l)})`);
    return w;
  };
  cmp('Preis', a.uvp, b.uvp, eur, true);
  const camA = D.cameraScore(a), camB = D.cameraScore(b);
  if (Math.abs(camA - camB) > 0.4) { const w = camA > camB ? a : b, l = w === a ? b : a; rows.push(`• Kamera: Vorteil ${w.name} (${reason(w, 'camera')} gegen ${reason(l, 'camera')})`); }
  else rows.push('• Kamera: ungefähr gleichauf');
  cmp('Akku', a.battery_mah, b.battery_mah, (p) => `${D.num(p.battery_mah)} mAh`);
  cmp('Updates', a.updates_years, b.updates_years, (p) => `${p.updates_years} J.`);
  cmp('Gewicht', a.weight_g, b.weight_g, (p) => `${p.weight_g} g`, true);
  const sys = a.os !== b.os ? `\n\nDie größte Frage ist das System: ${a.name} läuft mit ${a.os}, ${b.name} mit ${b.os}. Wenn du schon Apps, Uhr oder Kopfhörer aus einer Welt hast, bleib am besten dort.` : '';
  return { text: `${link(a)} oder ${link(b)}? So sehe ich das:\n${rows.join('\n')}${sys}\n\n[Alle Daten nebeneinander ansehen](#/vergleich?ids=${a.id},${b.id})`,
    chips: [`Mehr zum ${a.name}`, `Mehr zum ${b.name}`, 'Neu anfangen'] };
}

const SERVICE = [
  [/tarif|vertrag|mit vertrag|ohne vertrag|sim-karte|prepaid/, 'Jedes Gerät gibt es mit oder ohne Vertrag. Welcher Tarif passt, hängt vor allem von deinem Datenverbrauch und dem Netz bei dir zu Hause ab – das klärst du am besten im Markt, weil sich die Angebote laufend ändern. Bring dafür deine letzte Rechnung mit, dann sieht man sofort, was du wirklich brauchst.'],
  [/trade|altgerät|altes handy|alte handy|inzahlung|eintausch|ankauf/, 'Dein altes Handy kannst du beim Neukauf in Zahlung geben. Den Wert prüft das Team im Markt – er hängt von Modell und Zustand ab, eine Summe nenne ich hier deshalb nicht. Mein Tipp: vorher Daten sichern, aus „Mein Gerät finden“ abmelden und das Handy zurücksetzen.'],
  [/datenumzug|daten übertragen|daten umziehen|daten mitnehmen|umzug|übertragen|whatsapp/, 'Der Umzug klappt heute gut: iPhone zu iPhone per Schnellstart, Android zu Android per Kabel oder Google-Backup, zu Samsung mit Smart Switch. Zwischen iPhone und Android geht es auch, nur WhatsApp braucht dabei den Kabel-Weg. Wer das nicht selbst machen möchte, kann es im Markt erledigen lassen (Konditionen dort erfragen).'],
  [/garantie|gewährleistung|versicher|schutzbrief|displayschaden/, 'Auf Neugeräte hast du zwei Jahre gesetzliche Gewährleistung. Sturz- und Displayschäden deckt die nicht ab – dafür gibt es zusätzliche Schutzpakete, deren Bedingungen du im Markt erfragen solltest. Eine gute Hülle und ein Schutzglas sind die günstigste Versicherung.'],
  [/zubehör|hülle|panzerglas|schutzglas|netzteil|ladegerät|kopfhörer/, 'Zum neuen Handy würde ich immer eine Hülle und ein Schutzglas nehmen. Achte außerdem aufs Netzteil: Bei vielen Geräten liegt nur noch das Kabel bei. Die Ladeleistung in Watt steht bei jedem Gerät in den technischen Daten.'],
  [/öffnungszeit|filiale|adresse|wo ist|wo finde|nächste[rn]? markt|marktfinder|anfahrt/, 'Öffnungszeiten und Adressen stehen im Marktfinder auf mediamarkt.de und saturn.de. Dort siehst du auch, welcher Markt bei dir in der Nähe ist. Im Markt kannst du die Geräte in die Hand nehmen – deine [Merkliste](#/merkliste) kannst du einfach vorzeigen.'],
  [/lieferung|abholen|abholung|lager|vorrätig|verfügbar/, 'Lagerbestände sehe ich hier nicht – die App kennt nur die Gerätedaten. Ob ein Modell in deiner Wunschfarbe da ist, zeigen mediamarkt.de und saturn.de beim jeweiligen Markt, oder du fragst direkt vor Ort.'],
];

const HELP = 'Sag mir einfach, was dir wichtig ist – zum Beispiel „Kamera bis 600 €“, „größter Akku von Samsung“, „Handy für meine Oma“ oder „iPhone 17 oder Pixel 11“. Budget, Marke und Wunsch merke ich mir, du kannst also Schritt für Schritt verfeinern.';

export function greeting(ai) {
  return `Hi, ich bin ${NAME}, dein Smartphone-Berater. Ich kenne alle ${D.all().length} Geräte im Katalog${ai ? '' : ' und antworte gerade direkt aus den Gerätedaten (ohne KI-Verbindung)'}. Wofür brauchst du dein neues Handy – und wie viel möchtest du ungefähr ausgeben?`;
}
export const START_CHIPS = ['Beste Kamera bis 800 €', 'Größter Akku', 'iPhone 17 oder Galaxy S26?', 'Handy für meine Oma', 'Welche Foldables gibt es?'];

// ---------- Hauptfunktion ----------
export function reply(input) {
  const raw = String(input || '').trim();
  if (!raw) return { text: HELP, chips: START_CHIPS };
  const { devices, rest } = findDevices(raw);
  const t = rest.trim();

  if (/neu anfangen|von vorn|nochmal von|zurücksetzen|reset/.test(t)) {
    reset();
    return { text: 'Okay, alles auf Anfang. Wofür brauchst du das Handy, und was darf es kosten?', chips: START_CHIPS };
  }
  if (devices.length >= 2) return versus(devices[0], devices[1]);
  if (devices.length === 1 && /günstiger|billiger|alternative/.test(t)) {
    const p = devices[0];
    ctx.budget = Math.max(80, Math.round((p.uvp || 600) * 0.8)); ctx.os = p.os; ctx.brand = null; ctx.offset = 0;
    return recommend();
  }
  if (devices.length === 1) return single(devices[0], t);

  if (/vergleich/.test(t) && ctx.last.length >= 2) {
    return { text: `Gern – hier stehen sie nebeneinander: [Vergleich öffnen](#/vergleich?ids=${ctx.last.slice(0, 3).join(',')})`, chips: followChips().filter((c) => !/vergleichen/.test(c)) };
  }
  for (const [re, answer] of SERVICE) if (re.test(t)) return { text: answer, chips: ['Beste Kamera bis 800 €', 'Größter Akku', 'Gutes Handy bis 400 €'] };
  if (/esim/.test(t)) {
    const n = D.all().filter(D.hasEsim).length;
    return { text: `${n} von ${D.all().length} Geräten im Katalog unterstützen eSIM. Du findest sie über den Filter im [Katalog](#/geraete?feat=esim); bei jedem Gerät steht es auch in den technischen Daten.`, chips: START_CHIPS.slice(0, 3) };
  }

  // Filter aus der Nachricht übernehmen
  let changed = false;
  const budget = parseBudget(t);
  if (budget) { ctx.budget = budget; changed = true; }
  else if (/budget egal|geld spielt keine|preis egal|egal was es kostet/.test(t)) { ctx.budget = null; changed = true; }
  else if (/günstiger|billiger|weniger ausgeben|zu teuer/.test(t)) {
    const cheapest = Math.min(...ctx.last.map((id) => D.get(id)?.uvp || Infinity));
    const base = ctx.budget || (Number.isFinite(cheapest) ? cheapest : 600);
    ctx.budget = Math.max(80, Math.round(base * 0.8 / 10) * 10); changed = true;
  } else if (/teurer|darf mehr|besseres|hochwertiger/.test(t)) { ctx.budget = ctx.budget ? Math.round(ctx.budget * 1.4 / 10) * 10 : null; changed = true; }

  const FAMILY = [[/\b(poco|redmi)\b/, 'Xiaomi'], [/\bpixel\b/, 'Google'], [/\bgalaxy\b/, 'Samsung'], [/\b(moto|razr)\b/, 'Motorola'], [/\bxperia\b/, 'Sony']];
  const brand = D.brands().find((b) => new RegExp(`(^|[^a-zäöü])${rx(b.toLowerCase())}(?![a-zäöü])`).test(t))
    || FAMILY.find(([re, b]) => re.test(t) && D.brands().includes(b))?.[1];
  if (brand) { ctx.brand = brand; ctx.os = null; changed = true; }
  else if (/marke egal|egal welche marke|andere marke/.test(t)) { ctx.brand = null; changed = true; }
  if (/iphone|\bios\b|apple/.test(t) && !/android/.test(t)) { ctx.os = 'iOS'; if (ctx.brand && ctx.brand !== 'Apple') ctx.brand = null; changed = true; }
  else if (/android/.test(t) && !/iphone/.test(t)) { ctx.os = 'Android'; if (ctx.brand === 'Apple') ctx.brand = null; changed = true; }
  else if (/system egal|egal ob/.test(t)) { ctx.os = null; changed = true; }

  const need = NEEDS.find(([, re]) => re.test(t.replace(/(etwas |noch )?(günstiger\w*|billiger\w*)/g, ' ')));
  if (need) { ctx.need = need[0]; changed = true; }

  if (changed) { ctx.offset = 0; return recommend(); }
  if (/weitere|andere|mehr davon|noch welche|nächste|sonst noch/.test(t) && ctx.last.length) { ctx.offset += 3; return recommend(); }

  if (/^(hallo|hi|hey|moin|servus|guten (tag|morgen|abend)|na)\b/.test(t) && t.split(' ').length <= 4) {
    return { text: `Hallo! Schön, dass du da bist. ${HELP}`, chips: START_CHIPS };
  }
  if (/danke|super|top|perfekt|klasse/.test(t) && t.split(' ').length <= 6) {
    return { text: 'Gern! Wenn du magst, pack deine Favoriten auf die Merkliste – die kannst du im Markt einfach vorzeigen.', chips: ctx.last.length >= 2 ? ['Die Top 3 vergleichen', 'Neu anfangen'] : START_CHIPS.slice(0, 3) };
  }
  if (/wer bist du|was bist du|was kannst du|bist du (eine )?ki|hilfe|wie funktioniert/.test(t)) {
    return { text: `Ich bin ${NAME}, der Berater in dieser App. ${HELP} Preise sind immer die UVP der Hersteller; Lagerbestände und Aktionen kenne ich nicht.`, chips: START_CHIPS };
  }
  if (/empfehl|empfiehl|was würdest du|welches handy|welches smartphone|such|brauche|beraten|tipp/.test(t)) return recommend();

  return { text: `Da bin ich mir nicht sicher, was du meinst. ${HELP}`, chips: START_CHIPS };
}
