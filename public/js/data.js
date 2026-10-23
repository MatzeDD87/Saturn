// Produktdaten laden, normalisieren und formatieren.
export const NA = 'k. A.';
export const BRAND_ORDER = ['Apple', 'Samsung', 'Google', 'Xiaomi', 'OnePlus', 'Motorola', 'Nothing', 'Sony',
  'Honor', 'Oppo', 'Fairphone', 'HMD'];

let phones = [];
let byId = new Map();
let status = 'idle'; // idle | loading | ready | error
let pending = null;

export const getStatus = () => status;
export const all = () => phones;
export const get = (id) => byId.get(id);
export const isSample = () => phones.length > 0 && phones.every((p) => p.sample);

export function loadPhones() {
  if (pending) return pending;
  status = 'loading';
  pending = fetch('data/phones.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((list) => {
      if (!Array.isArray(list)) throw new Error('Ungültiges Datenformat');
      phones = list.filter((p) => p && p.id && p.name).map(normalize);
      byId = new Map(phones.map((p) => [p.id, p]));
      status = 'ready';
      return phones;
    })
    .catch((e) => { status = 'error'; pending = null; throw e; });
  return pending;
}

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const numOrNull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function normalize(raw) {
  const p = { ...raw };
  p.display = obj(raw.display);
  p.camera = obj(raw.camera);
  p.charging = obj(raw.charging);
  p.colors = arr(raw.colors).filter((c) => c && c.name);
  p.images = arr(raw.images).filter((s) => typeof s === 'string' && s);
  p.image_colors = arr(raw.image_colors);
  p.ram_gb = arr(raw.ram_gb).filter(Number.isFinite);
  p.storage_gb = arr(raw.storage_gb).filter(Number.isFinite).sort((a, b) => a - b);
  p.highlights = arr(raw.highlights).filter(Boolean);
  p.tags = arr(raw.tags);
  p.uncertain = arr(raw.uncertain);
  p.uvp = numOrNull(raw.uvp);
  p.uvp_by_storage = obj(raw.uvp_by_storage);
  p.fullName = `${p.brand} ${p.name}`;
  p.searchText = [p.brand, p.name, p.chip, p.os, ...p.tags, p.camera.summary].filter(Boolean).join(' ').toLowerCase();
  return p;
}

// ---------- Ableitungen ----------
export const hasTele = (p) => !!(p.camera.tele_mp || p.camera.tele_zoom);
export const hasEsim = (p) => /esim/i.test(p.esim || '');
export const teleFactor = (p) => { const m = String(p.camera.tele_zoom || '').match(/(\d+(?:[.,]\d+)?)\s*x/i); return m ? parseFloat(m[1].replace(',', '.')) : hasTele(p) ? 2 : 0; };
export function sizeClass(p) {
  const s = p.display.size_in;
  if (!s) return null;
  return s < 6.3 ? 'kompakt' : s > 6.7 ? 'gross' : 'mittel';
}
export function monthsSince(release) {
  const m = /^(\d{4})-(\d{2})/.exec(release || '');
  if (!m) return null;
  const now = new Date();
  return (now.getFullYear() - +m[1]) * 12 + (now.getMonth() + 1 - +m[2]);
}
export const isNew = (p) => { const m = monthsSince(p.release); return m != null && m >= 0 && m <= 8; };

export function badges(p) {
  const b = [];
  if (isNew(p)) b.push({ cls: 'new', label: 'Neu' });
  if (p.foldable) b.push({ cls: 'fold', label: 'Foldable' });
  if (p.updates_years >= 7) b.push({ cls: 'upd', label: `${p.updates_years} J. Updates` });
  if (hasEsim(p)) b.push({ cls: 'esim', label: 'eSIM' });
  return b;
}

export const isUncertain = (p, key) => {
  if (!key || !p.uncertain.length) return false;
  const leaf = key.split('.').pop();
  const root = key.split('.')[0];
  return p.uncertain.some((u) => u === key || u === leaf || u === root);
};

// Kamera-Punktzahl (grob, nur für Sortierung/Quiz): Hauptsensor, Tele, Tag, Preisklasse.
export function cameraScore(p) {
  let s = 0;
  s += Math.min(p.camera.main_mp || 0, 200) / 200 * 2;
  s += Math.min(teleFactor(p), 10) * 0.45;
  if (p.camera.ultrawide_mp) s += 0.6;
  if (p.tags.includes('camera')) s += 2;
  if (p.uvp) s += Math.min(p.uvp, 1500) / 1500 * 1.5;
  return s;
}

// Empfehlungs-Punktzahl für die Standardsortierung.
export function recommendScore(p) {
  const age = monthsSince(p.release);
  let s = 0;
  s += age == null ? 0 : Math.max(0, 18 - age) / 18 * 3;
  s += (p.updates_years || 0) / 7 * 2;
  s += Math.min(p.tags.length, 4) * 0.25;
  s += p.images.length ? 0.5 : 0;
  if (p.uvp) s += p.uvp > 300 && p.uvp < 1300 ? 0.8 : 0.3;
  return s;
}

// ---------- Formatierung ----------
const nf = new Intl.NumberFormat('de-DE');
export const num = (n, digits) => (Number.isFinite(n) ? (digits != null ? n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : nf.format(n)) : NA);
export const price = (n) => (Number.isFinite(n) ? `${nf.format(Math.round(n))} €` : NA);
export const storageLabel = (gb) => (gb >= 1024 ? `${num(gb / 1024)} TB` : `${gb} GB`);
export const inch = (n) => (Number.isFinite(n) ? `${num(n)}″` : NA);
export const cm = (n) => (Number.isFinite(n) ? `${num(Math.round(n * 2.54 * 10) / 10)} cm` : '');
export const unit = (n, u) => (Number.isFinite(n) ? `${num(n)} ${u}` : NA);
export const list = (a, u) => (a && a.length ? `${a.map((x) => (u === 'storage' ? storageLabel(x) : num(x))).join(' / ')}${u && u !== 'storage' ? ' ' + u : ''}` : NA);
export const yesNo = (v) => (v == null ? NA : v ? 'Ja' : 'Nein');
export const text = (v) => (v == null || v === '' ? NA : String(v));
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export function releaseLabel(r) {
  const m = /^(\d{4})-(\d{2})/.exec(r || '');
  return m ? `${MONTHS[+m[2] - 1]} ${m[1]}` : NA;
}

export function storagePrices(p) {
  const entries = Object.entries(p.uvp_by_storage)
    .map(([gb, eur]) => [Number(gb), numOrNull(eur)])
    .filter(([gb, eur]) => gb > 0 && eur);
  const map = new Map(entries);
  const sizes = [...new Set([...p.storage_gb, ...map.keys()])].sort((a, b) => a - b);
  return sizes.map((gb) => ({ gb, uvp: map.get(gb) ?? null }));
}

export const brands = () => {
  const set = [...new Set(phones.map((p) => p.brand))];
  return set.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
};
const rank = (b) => { const i = BRAND_ORDER.indexOf(b); return i === -1 ? 99 : i; };

export const shopLinks = (p) => {
  const q = encodeURIComponent(p.fullName);
  return {
    saturn: `https://www.saturn.de/de/search.html?query=${q}`,
    mediamarkt: `https://www.mediamarkt.de/de/search.html?query=${q}`,
  };
};
