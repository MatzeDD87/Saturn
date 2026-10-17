// Kompletter Scraper-Lauf mit echtem Chrome gegen einen lokalen Shop-Nachbau.
// Wird übersprungen, wenn kein Chrome/Chromium gefunden wird (CHROME_PATH setzen).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/usr/bin/chromium', '/usr/bin/google-chrome']
  .find(p => p && fs.existsSync(p));

const product = (name, price) => `<!doctype html><title>${name}</title>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name,
  offers: { '@type': 'Offer', price: String(price), priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } })}</script>
<h1>${name}</h1>`;

// Suchergebnisse werden wie im echten Shop per JavaScript nachgeladen
const searchPage = results => `<!doctype html><div id="r"></div><script>
setTimeout(() => { document.getElementById('r').innerHTML = ${JSON.stringify(
  results.map(([slug, text]) => `<a href="/de/product/_${slug}.html"><span>${text}</span></a>`).join(''))}; }, 300);
</script>`;

const SEARCH = {
  'Samsung Galaxy S25': [
    ['huelle', 'Hülle für Samsung Galaxy S25'],
    ['s25-ultra', 'SAMSUNG Galaxy S25 Ultra 5G 256 GB'],
    ['s25-plus', 'SAMSUNG Galaxy S25+ 5G 256 GB'],
    ['s25', 'SAMSUNG Galaxy S25 5G 128 GB Navy']
  ],
  'Motorola Moto E15': []
};
const PRODUCTS = {
  s25: product('SAMSUNG Galaxy S25 5G 128 GB Navy', '849.00'),
  's25-ultra': product('SAMSUNG Galaxy S25 Ultra', '1299.00'),
  // Produktseite ohne JSON-LD, nur mit Meta-Tag
  ip17: '<!doctype html><meta itemprop="price" content="929.00"><h1>APPLE iPhone 17</h1>'
};

let server, base, tmp;
before(async () => {
  const shop = express();
  shop.get('/robots.txt', (req, res) => res.type('text').send('User-agent: *\nDisallow: /de/checkout\n'));
  shop.get('/de/search.html', (req, res) => res.send(searchPage(SEARCH[req.query.query] || [])));
  shop.get('/de/product/:slug', (req, res) => {
    const html = PRODUCTS[req.params.slug.replace(/^_/, '').replace(/\.html$/, '')];
    html ? res.send(html) : res.status(404).send('nicht gefunden');
  });
  server = shop.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scrape-'));
});
after(() => { server?.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

test('Scraper ermittelt Preise, filtert Varianten und behält alte Preise bei Fehlern', { skip: !CHROME && 'kein Chrome gefunden', timeout: 120_000 }, async () => {
  const out = path.join(tmp, 'prices.json');
  const urls = path.join(tmp, 'urls.json');
  fs.writeFileSync(urls, JSON.stringify({ saturn: { ip17: `${base}/de/product/_ip17.html` } }));
  // Alter Preis für den Moto E15 muss erhalten bleiben, wenn die neue Suche scheitert
  fs.writeFileSync(out, JSON.stringify({ items: { me15: { ok: true, price: 79, checkedAt: '2026-01-01T00:00:00.000Z' } } }));

  const stdout = await new Promise((resolve, reject) => {
    execFile(process.execPath, ['scraper.js', '--only=s25,ip17,me15', `--out=${out}`, `--urls=${urls}`], {
      cwd: path.resolve(import.meta.dirname, '..'),
      env: { ...process.env, CHROME_PATH: CHROME, SHOP_BASE_URL: base, SCRAPE_DELAY_MS: '0' },
      timeout: 110_000
    }, (err, so, se) => (err && err.code !== 0 && !so ? reject(new Error(se || err.message)) : resolve(so)));
  });

  const data = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(data.shop, 'saturn');

  assert.equal(data.items.s25.ok, true, stdout);
  assert.equal(data.items.s25.price, 849);
  assert.match(data.items.s25.url, /_s25\.html$/);
  assert.equal(data.items.s25.via, 'Suche');
  assert.equal(data.items.s25.availability, 'lieferbar');

  assert.equal(data.items.ip17.price, 929);
  assert.equal(data.items.ip17.via, 'hinterlegte URL');

  assert.equal(data.items.me15.ok, false);
  assert.match(data.items.me15.error, /Keine Suchergebnisse/);
  assert.equal(data.items.me15.price, 79);
  assert.equal(data.items.me15.checkedAt, '2026-01-01T00:00:00.000Z');

  assert.match(stdout, /2\/3 Preise aktualisiert/);
});
