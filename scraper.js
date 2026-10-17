// Preis-Scraper: holt die Online-Preise aller Geräte aus public/logic.js von saturn.de (oder mediamarkt.de)
// und schreibt sie nach data/prices.json. Der Server stellt die Datei unter /api/prices bereit.
//
//   npm run scrape                      alle Geräte, saturn.de
//   npm run scrape -- --shop=mediamarkt
//   npm run scrape -- --only=s25u,ip17
//   Weitere Optionen: --out=pfad/prices.json --urls=pfad/product-urls.json
//
// Umgebungsvariablen: CHROME_PATH (eigener Chrome/Chromium), SHOP_BASE_URL (z. B. für Tests), SCRAPE_DELAY_MS
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { SHOPS, searchPath, pickProduct, extractOffer, robotsAllows } from './scraper/lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const shopKey = args.shop || 'saturn';
const shop = SHOPS[shopKey];
if (!shop) {
  console.error(`Unbekannter Shop "${shopKey}". Erlaubt: ${Object.keys(SHOPS).join(', ')}`);
  process.exit(2);
}
const base = (process.env.SHOP_BASE_URL || shop.base).replace(/\/$/, '');
const outFile = path.resolve(__dirname, args.out || 'data/prices.json');
const urlsFile = path.resolve(__dirname, args.urls || 'data/product-urls.json');
const delayMs = Number(process.env.SCRAPE_DELAY_MS ?? 3000);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pause = () => sleep(delayMs + Math.random() * delayMs * 0.5);
const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };

// Gerätedaten aus dem Frontend laden (gleiche Quelle wie App und Server)
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'public', 'logic.js'), 'utf8'), ctx);
const only = typeof args.only === 'string' ? args.only.split(',').map(s => s.trim()) : null;
const devices = ctx.MMSLogic.DEVICES.filter(d => !only || only.includes(d.id));
if (only) {
  const unknown = only.filter(id => !devices.some(d => d.id === id));
  if (unknown.length) console.warn(`Unbekannte Geräte-IDs ignoriert: ${unknown.join(', ')}`);
}

// Fest hinterlegte Produkt-URLs haben Vorrang vor der Suche (zuverlässiger, weniger Seitenaufrufe)
const pinned = readJson(urlsFile, {})[shopKey] || {};
const previous = readJson(outFile, { items: {} });

async function loadRobots() {
  try {
    const r = await fetch(base + '/robots.txt', { signal: AbortSignal.timeout(15_000) });
    return r.ok ? await r.text() : '';
  } catch {
    console.warn('robots.txt nicht erreichbar – fahre mit Vorsicht fort.');
    return '';
  }
}

async function scrapeDevice(page, d, robots) {
  let url = pinned[d.id], via = 'hinterlegte URL';
  if (!url) {
    const sp = searchPath(d.n);
    if (!robotsAllows(robots, sp)) throw new Error('Suche laut robots.txt nicht erlaubt – Produkt-URL in data/product-urls.json hinterlegen');
    await page.goto(base + sp, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('a[href*="/product/"]', { timeout: 15_000 }).catch(() => {});
    const links = await page.$$eval('a[href*="/product/"]', as => as.map(a => ({
      href: a.href,
      text: [a.innerText, a.getAttribute('aria-label'), a.title].filter(Boolean).join(' ')
    })));
    const hit = pickProduct(links, d.n);
    if (!hit) throw new Error(links.length ? 'Kein passendes Gerät in den Suchergebnissen' : 'Keine Suchergebnisse (evtl. Bot-Schutz)');
    url = hit.href;
    via = 'Suche';
    await pause();
  }
  const productPath = new URL(url, base).pathname;
  if (!robotsAllows(robots, productPath)) throw new Error('Produktseite laut robots.txt nicht erlaubt');

  const res = await page.goto(new URL(url, base).href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
  const offer = extractOffer(await page.content());
  if (!offer) throw new Error('Kein Preis auf der Produktseite gefunden (evtl. Bot-Schutz)');
  return { ...offer, url: page.url(), via };
}

async function main() {
  console.log(`Preis-Scraper · ${shop.label}${process.env.SHOP_BASE_URL ? ` (${base})` : ''} · ${devices.length} Geräte\n`);
  const robots = await loadRobots();

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROME_PATH || undefined,
    args: process.getuid?.() === 0 ? ['--no-sandbox'] : []
  });
  const items = { ...previous.items };
  let ok = 0;
  try {
    const page = await browser.newPage();
    // Headless-Kennung aus dem User-Agent entfernen und deutsche Seiten anfordern
    const ua = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
    await page.setUserAgent(ua);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' });
    await page.setViewport({ width: 1280, height: 900 });

    for (const [i, d] of devices.entries()) {
      const now = new Date().toISOString();
      try {
        const r = await scrapeDevice(page, d, robots);
        items[d.id] = {
          ok: true, price: r.price, currency: r.currency, availability: r.availability,
          productName: r.name, url: r.url, via: r.via, checkedAt: now
        };
        ok++;
        const diff = r.price - d.pNum;
        console.log(`✓ ${d.n.padEnd(28)} ${r.price.toFixed(2).padStart(9)} €  ${diff ? `(${diff > 0 ? '+' : ''}${diff.toFixed(2)} ggü. Marktpreis)` : '(= Marktpreis)'}  [${r.via}]`);
      } catch (e) {
        // Letzten erfolgreichen Preis behalten, Fehler dazuschreiben
        items[d.id] = { ...(previous.items?.[d.id] || {}), ok: false, error: e.message, failedAt: now };
        console.log(`✗ ${d.n.padEnd(28)} ${e.message}`);
      }
      if (i < devices.length - 1) await pause();
    }
  } finally {
    await browser.close();
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ updatedAt: new Date().toISOString(), shop: shopKey, source: shop.label, items }, null, 2) + '\n');
  console.log(`\n${ok}/${devices.length} Preise aktualisiert → ${path.relative(process.cwd(), outFile)}`);
  if (devices.length && ok === 0) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
