// Tests für den Katalog-Berater MAX (ohne Browser): node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const json = await readFile(new URL('../public/data/phones.json', import.meta.url), 'utf8');
globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(json) });
const D = await import('../public/js/data.js');
const MAX = await import('../public/js/max.js');
await D.loadPhones();

const ids = (text) => [...text.matchAll(/#\/geraet\/([\w-]+)/g)].map((m) => m[1]);
const ask = (q) => MAX.reply(q);

test('Katalog geladen, Namen ohne doppelte Marke', () => {
  assert.ok(D.all().length >= 40);
  for (const p of D.all()) assert.ok(!new RegExp(`^${p.brand} ${p.brand}\\b`, 'i').test(p.fullName), p.fullName);
});

test('Budget wird eingehalten', () => {
  MAX.reset();
  const r = ask('Beste Kamera bis 800 €');
  const found = ids(r.text);
  assert.equal(found.length, 3);
  for (const id of found) assert.ok(D.get(id).uvp <= 800, id);
  assert.equal(MAX.context().need, 'camera');
});

test('Gedächtnis: Marke kommt dazu, Budget und Wunsch bleiben', () => {
  MAX.reset();
  ask('Kamera bis 800 Euro');
  const r = ask('und von Samsung?');
  const found = ids(r.text);
  assert.ok(found.length >= 1);
  for (const id of found) { assert.equal(D.get(id).brand, 'Samsung'); assert.ok(D.get(id).uvp <= 800); }
  assert.equal(MAX.context().need, 'camera');
});

test('Günstiger senkt das Budget, Weitere zeigt andere Geräte', () => {
  MAX.reset();
  const a = ids(ask('größter Akku bis 600 €').text);
  const b = ids(ask('Weitere zeigen').text);
  assert.ok(b.length && !b.some((id) => a.includes(id)));
  ask('etwas günstiger');
  assert.ok(MAX.context().budget < 600);
});

test('Vergleich zweier genannter Geräte', () => {
  MAX.reset();
  const r = ask('iPhone 17 oder Galaxy S26?');
  assert.match(r.text, /#\/vergleich\?ids=iphone-17,/);
  assert.deepEqual(ids(r.text).slice(0, 1), ['iphone-17']);
});

test('Längster Gerätename gewinnt (Pro statt Basismodell)', () => {
  MAX.reset();
  const r = ask('Was kann das iPhone 17 Pro?');
  assert.equal(ids(r.text)[0], 'iphone-17-pro');
  const s = ask('Wie ist der Akku vom S26 Ultra?');
  assert.match(s.text, /mAh/);
  assert.equal(D.get(ids(s.text)[0]).name, 'Galaxy S26 Ultra');
});

test('Gerätenummern sind kein Budget', () => {
  MAX.reset();
  ask('Erzähl mir etwas zum Galaxy A57');
  assert.equal(MAX.context().budget, null);
});

test('Kein Treffer im Budget: ehrliche Antwort mit günstigstem Angebot', () => {
  MAX.reset();
  const r = ask('Foldable bis 300 €');
  assert.match(r.text, /leider nichts/);
  assert.ok(ids(r.text).every((id) => D.get(id).foldable));
});

test('Service-Fragen, Begrüßung, Neustart', () => {
  MAX.reset();
  assert.match(ask('Kann ich mein altes Handy in Zahlung geben?').text, /in Zahlung/);
  assert.match(ask('Hallo').text, /Hallo/);
  ask('Handy für meine Oma bis 400 €');
  assert.equal(MAX.context().need, 'senior');
  ask('Neu anfangen');
  assert.equal(MAX.context().budget, null);
  assert.equal(MAX.context().need, null);
});

test('Alle Vorschlags-Chips führen zu einer Antwort mit Geräten oder Link', () => {
  MAX.reset();
  for (const c of MAX.START_CHIPS) assert.match(ask(c).text, /#\//, c);
});
