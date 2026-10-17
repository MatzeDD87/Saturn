import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pickProduct, extractOffer, robotsAllows, parsePriceValue, searchPath } from '../scraper/lib.js';

const link = (text, id = Math.random().toString(36).slice(2)) => ({ href: `https://www.saturn.de/de/product/_${id}.html`, text });

describe('pickProduct', () => {
  test('überspringt Zubehör und andere Varianten', () => {
    const links = [
      link('Hülle für Samsung Galaxy S25'),
      link('SAMSUNG Galaxy S25 Ultra 5G 256 GB Titanium'),
      link('SAMSUNG Galaxy S25+ 5G 256 GB Navy'),
      link('SAMSUNG Galaxy S25 Edge 256 GB'),
      link('SAMSUNG Galaxy S25 5G 128 GB Navy Dual SIM', 'hit')
    ];
    assert.equal(pickProduct(links, 'Samsung Galaxy S25').href, 'https://www.saturn.de/de/product/_hit.html');
  });

  test('findet die gewünschte Variante, wenn sie im Namen steht', () => {
    const links = [link('APPLE iPhone 17 256 GB Schwarz'), link('APPLE iPhone 17 Pro Max 256 GB Silber', 'pm')];
    assert.equal(pickProduct(links, 'iPhone 17 Pro Max').href, 'https://www.saturn.de/de/product/_pm.html');
  });

  test('"Pixel 10 Pro" trifft nicht "Pixel 10 Pro XL"', () => {
    assert.equal(pickProduct([link('GOOGLE Pixel 10 Pro XL 256 GB')], 'Google Pixel 10 Pro'), null);
  });

  test('ignoriert Links ohne /product/ und liefert null ohne Treffer', () => {
    assert.equal(pickProduct([{ href: 'https://www.saturn.de/de/category/handys', text: 'Google Pixel 9a' }], 'Google Pixel 9a'), null);
    assert.equal(pickProduct([], 'Google Pixel 9a'), null);
  });

  test('Groß-/Kleinschreibung und Sonderzeichen spielen keine Rolle', () => {
    assert.ok(pickProduct([link('XIAOMI POCO X7 Pro – 512GB, Schwarz')], 'Xiaomi POCO X7 Pro'));
  });
});

describe('extractOffer', () => {
  const ld = obj => `<html><head><script type="application/ld+json">${JSON.stringify(obj)}</script></head></html>`;

  test('liest Preis und Verfügbarkeit aus schema.org Product', () => {
    const o = extractOffer(ld({ '@context': 'https://schema.org', '@type': 'Product', name: 'Galaxy S25',
      offers: { '@type': 'Offer', price: '899.00', priceCurrency: 'EUR', availability: 'https://schema.org/InStock' } }));
    assert.deepEqual({ ...o }, { name: 'Galaxy S25', price: 899, currency: 'EUR', availability: 'lieferbar' });
  });

  test('findet Product in @graph und Angebote als Liste bzw. AggregateOffer', () => {
    assert.equal(extractOffer(ld({ '@graph': [{ '@type': 'BreadcrumbList' }, { '@type': 'Product', offers: [{ price: 479 }] }] })).price, 479);
    assert.equal(extractOffer(ld({ '@type': ['Product'], offers: { '@type': 'AggregateOffer', lowPrice: '1449' } })).price, 1449);
  });

  test('überspringt kaputtes JSON-LD und fällt auf Meta-Tags zurück', () => {
    const html = '<script type="application/ld+json">{kaputt</script><meta itemprop="price" content="949.00">';
    assert.equal(extractOffer(html).price, 949);
  });

  test('ohne Preisangabe null', () => {
    assert.equal(extractOffer('<html><body>Bitte bestätigen Sie, dass Sie kein Roboter sind.</body></html>'), null);
    assert.equal(extractOffer(ld({ '@type': 'Product', offers: { price: 0 } })), null);
  });
});

describe('parsePriceValue', () => {
  test('deutsches und schema.org-Format', () => {
    assert.equal(parsePriceValue('1.449,00 €'), 1449);
    assert.equal(parsePriceValue('1449.00'), 1449);
    assert.equal(parsePriceValue('899,99'), 899.99);
    assert.equal(parsePriceValue(299), 299);
    assert.ok(Number.isNaN(parsePriceValue(null)));
  });
});

describe('robotsAllows', () => {
  const robots = `
User-agent: Googlebot
Disallow: /

User-agent: *
Disallow: /de/checkout
Disallow: /*?sort=
Allow: /de/checkout/info
`;
  test('wendet nur die Regeln für * an', () => {
    assert.equal(robotsAllows(robots, '/de/product/_x.html'), true);
    assert.equal(robotsAllows(robots, '/de/checkout/cart'), false);
  });
  test('längste Regel gewinnt, Platzhalter werden unterstützt', () => {
    assert.equal(robotsAllows(robots, '/de/checkout/info'), true);
    assert.equal(robotsAllows(robots, '/de/handys.html?sort=price'), false);
    assert.equal(robotsAllows(robots, '/de/search.html?query=x&sort=price'), true);
  });
  test('leere robots.txt erlaubt alles', () => {
    assert.equal(robotsAllows('', '/de/search.html'), true);
  });
  test('Suchpfad wird korrekt kodiert', () => {
    assert.equal(searchPath('Galaxy S25+'), '/de/search.html?query=Galaxy%20S25%2B');
  });
});
