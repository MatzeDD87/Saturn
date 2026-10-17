// Reine Hilfsfunktionen des Preis-Scrapers – ohne Browser und Netzwerk, damit sie testbar sind.

export const SHOPS = {
  saturn: { label: 'saturn.de', base: 'https://www.saturn.de' },
  mediamarkt: { label: 'mediamarkt.de', base: 'https://www.mediamarkt.de' }
};

export const searchPath = query => `/de/search.html?query=${encodeURIComponent(query)}`;

const norm = s => String(s || '').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

// Wörter, an denen man Zubehör statt eines Smartphones erkennt
const ACCESSORY = ['hülle', 'huelle', 'case', 'cover', 'bookcover', 'panzerglas', 'schutzglas', 'schutzfolie', 'folie',
  'displayschutz', 'ladegerät', 'ladegeraet', 'netzteil', 'adapter', 'kabel', 'tasche', 'armband', 'halterung',
  'powerbank', 'ladestation', 'stift', 'pen', 'kopfhörer', 'earbuds', 'buds', 'watch', 'tablet', 'pad', 'für', 'fuer'];

// Modell-Varianten: tauchen sie im Treffer auf, aber nicht im gesuchten Namen, ist es ein anderes Gerät
const VARIANTS = ['ultra', 'pro', 'max', 'plus', 'mini', 'fe', 'lite', 'neo', 'edge', 'air', 'fold', 'flip', 'xl'];

/**
 * Wählt aus den Produktlinks einer Suchergebnisseite das passende Smartphone.
 * links: [{ href, text }] in Seitenreihenfolge · name: z. B. "Samsung Galaxy S25 Ultra"
 * Liefert den ersten Link, der alle Namensbestandteile enthält und weder Zubehör noch eine andere Variante ist.
 */
export function pickProduct(links, name) {
  const want = norm(name).split(' ');
  const wantSet = new Set(want);
  for (const link of links) {
    if (!link?.href || !/\/product\//.test(link.href)) continue;
    const words = norm(link.text).split(' ');
    const set = new Set(words);
    if (!want.every(w => set.has(w))) continue;
    if (ACCESSORY.some(a => set.has(a))) continue;
    if (VARIANTS.some(v => set.has(v) && !wantSet.has(v))) continue;
    // "S25" darf nicht auf "S25 Edge"/"S25+" treffen: ein "+" direkt hinter dem Modell ist eine eigene Variante
    if (/\+/.test(link.text) && !/\+/.test(name)) continue;
    return link;
  }
  return null;
}

function* walkJsonLd(node) {
  if (Array.isArray(node)) { for (const n of node) yield* walkJsonLd(n); return; }
  if (!node || typeof node !== 'object') return;
  yield node;
  if (node['@graph']) yield* walkJsonLd(node['@graph']);
}

const isType = (node, type) => [].concat(node['@type'] || []).includes(type);

export function parsePriceValue(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const s = v.replace(/[^\d.,]/g, '');
  // "1.449,00" (deutsch) oder "1449.00" (schema.org)
  if (/,\d{1,2}$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return parseFloat(s.replace(/,/g, ''));
}

const AVAILABILITY = {
  InStock: 'lieferbar', OnlineOnly: 'nur online', LimitedAvailability: 'begrenzt verfügbar',
  PreOrder: 'vorbestellbar', OutOfStock: 'nicht lieferbar', SoldOut: 'ausverkauft', Discontinued: 'nicht mehr im Sortiment'
};

/**
 * Liest Preis und Verfügbarkeit aus den schema.org-Daten (JSON-LD) einer Produktseite.
 * Fallback: <meta itemprop="price"> bzw. product:price:amount.
 */
export function extractOffer(html) {
  const scripts = [...String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of scripts) {
    let data;
    try { data = JSON.parse(raw.trim()); } catch { continue; }
    for (const node of walkJsonLd(data)) {
      if (!isType(node, 'Product')) continue;
      for (const offer of [].concat(node.offers || [])) {
        const price = parsePriceValue(offer.price ?? offer.lowPrice);
        if (!Number.isFinite(price) || price <= 0) continue;
        const avKey = String(offer.availability || '').split('/').pop();
        return {
          name: node.name || null,
          price,
          currency: offer.priceCurrency || 'EUR',
          availability: AVAILABILITY[avKey] || null
        };
      }
    }
  }
  const meta = String(html).match(/<meta[^>]+(?:itemprop=["']price["']|property=["']product:price:amount["'])[^>]*content=["']([^"']+)["']/i);
  if (meta) {
    const price = parsePriceValue(meta[1]);
    if (Number.isFinite(price) && price > 0) return { name: null, price, currency: 'EUR', availability: null };
  }
  return null;
}

/** Minimaler robots.txt-Parser: Regeln für "User-agent: *" (Allow/Disallow, längste Regel gewinnt). */
export function robotsAllows(robotsTxt, path) {
  const rules = [];
  let applies = false, inGroup = false;
  for (const line of String(robotsTxt || '').split(/\r?\n/)) {
    const [k, ...rest] = line.replace(/#.*/, '').split(':');
    const key = k.trim().toLowerCase(), val = rest.join(':').trim();
    if (!key) continue;
    if (key === 'user-agent') {
      if (!inGroup) applies = false;
      inGroup = true;
      if (val === '*') applies = true;
    } else {
      inGroup = false;
      if (applies && (key === 'allow' || key === 'disallow') && val) rules.push({ allow: key === 'allow', val });
    }
  }
  const toRe = v => new RegExp('^' + v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
  let best = null;
  for (const r of rules) {
    if (toRe(r.val).test(path) && (!best || r.val.length > best.val.length || (r.val.length === best.val.length && r.allow))) best = r;
  }
  return best ? best.allow : true;
}
