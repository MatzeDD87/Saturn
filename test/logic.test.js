import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from './load-logic.js';

const L = loadLogic();
const { DEVICES, DB, BUDGET } = L;
const SCORE_KEYS = ['cam', 'night', 'zoom', 'video', 'bat', 'charge', 'perf', 'value', 'simple'];
const top = (answers, stockOf) => Array.from(L.recommend(answers, stockOf).slice(0, 2), r => r.d.id);

describe('Gerätedaten', () => {
  test('IDs sind eindeutig', () => {
    assert.equal(new Set(DEVICES.map(d => d.id)).size, DEVICES.length);
  });

  test('jedes Gerät hat alle Pflichtfelder', () => {
    for (const d of DEVICES) {
      for (const f of ['id', 'brand', 'n', 'loc', 'display', 'chip', 'cam', 'bat', 'acc', 'd']) {
        assert.ok(typeof d[f] === 'string' && d[f].length > 0, `${d.id}: Feld "${f}" fehlt`);
      }
      assert.ok(Array.isArray(d.h) && d.h.length > 0, `${d.id}: Highlights fehlen`);
      assert.ok(['ios', 'android'].includes(d.os), `${d.id}: os ungültig`);
      assert.ok(d.size >= 5 && d.size <= 8, `${d.id}: Displaygröße unplausibel`);
    }
  });

  test('Preis und Bestand sind ganze Zahlen ≥ 0', () => {
    for (const d of DEVICES) {
      assert.ok(Number.isInteger(d.pNum) && d.pNum > 0, `${d.id}: Preis`);
      assert.ok(Number.isInteger(d.stock) && d.stock >= 0, `${d.id}: Bestand`);
    }
  });

  test('alle Berater-Scores existieren und liegen zwischen 0 und 10', () => {
    for (const d of DEVICES) {
      for (const k of SCORE_KEYS) {
        assert.ok(Number.isFinite(d.s[k]) && d.s[k] >= 0 && d.s[k] <= 10, `${d.id}: s.${k} = ${d.s[k]}`);
      }
    }
  });
});

describe('Empfehlungen (entsprechen dem ursprünglichen Entscheidungsbaum)', () => {
  const cases = [
    ['Kamera · Nacht & Zoom · High-End', { prio: 'kamera', kamera: 'nacht', budget: 'p', os: 'egal', size: 'egal' }, ['s25u', 'p10p']],
    ['Kamera · Nacht & Zoom · bis 500 €', { prio: 'kamera', kamera: 'nacht', budget: 'm500', os: 'egal', size: 'egal' }, ['p9a']],
    ['Kamera · Video · High-End', { prio: 'kamera', kamera: 'video', budget: 'p', os: 'egal', size: 'egal' }, ['ip17pm', 's25u']],
    ['Akku · Ausdauer · bis 500 €', { prio: 'akku', akku: 'ausdauer', budget: 'm500', os: 'egal', size: 'egal' }, ['px7p']],
    ['Preis · unter 200 €', { prio: 'preis', budget: 'u200', os: 'egal', size: 'egal' }, ['rn15', 'me15']],
    ['Preis · 200–500 €', { prio: 'preis', budget: 'm500', os: 'egal', size: 'egal' }, ['px7p', 'p9a']],
    ['Einfach · iOS · kompakt', { prio: 'einfach', budget: 'egal', os: 'ios', size: 'kompakt' }, ['ip17']]
  ];
  for (const [name, answers, expected] of cases) {
    test(name, () => {
      assert.deepEqual(top(answers).slice(0, expected.length), expected);
    });
  }
});

describe('Matching-Regeln', () => {
  // Alle Antwortkombinationen, die der Fragebogen erzeugen kann
  const combos = [];
  const sub = { kamera: ['nacht', 'video', 'allround'], akku: ['ausdauer', 'alltag', 'laden'] };
  for (const prio of ['kamera', 'akku', 'preis', 'leistung', 'einfach']) {
    for (const s of sub[prio] || [undefined]) {
      for (const budget of Object.keys(BUDGET)) {
        for (const os of ['ios', 'android', 'egal']) {
          for (const size of ['kompakt', 'gross', 'egal']) {
            combos.push({ prio, ...(s && { [prio]: s }), budget, os, size });
          }
        }
      }
    }
  }

  test('jede Antwortkombination liefert gültige Scores (kein NaN) im Bereich 1–99', () => {
    for (const a of combos) {
      for (const r of L.recommend(a)) {
        assert.ok(Number.isFinite(r.sc), `NaN-Score für ${JSON.stringify(a)}`);
        assert.ok(r.match >= 1 && r.match <= 99, `match ${r.match} für ${JSON.stringify(a)}`);
      }
    }
  });

  test('Ergebnis ist absteigend nach Score sortiert', () => {
    for (const a of combos) {
      const r = L.recommend(a);
      for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].sc >= r[i].sc);
    }
  });

  test('bei iOS-Wunsch gewinnt ein iPhone, sobald eines ins Budget passt', () => {
    for (const a of combos.filter(c => c.os === 'ios')) {
      const [lo, hi] = BUDGET[a.budget];
      const iphoneFits = DEVICES.some(d => d.os === 'ios' && d.pNum >= lo && d.pNum <= hi);
      if (iphoneFits) assert.equal(L.recommend(a)[0].d.os, 'ios', JSON.stringify(a));
    }
  });

  test('bei Android-Wunsch steht nie ein iPhone auf Platz 1', () => {
    for (const a of combos.filter(c => c.os === 'android')) {
      assert.equal(L.recommend(a)[0].d.os, 'android', JSON.stringify(a));
    }
  });

  test('iOS unter 200 €: Kompromiss wird klar benannt', () => {
    const best = L.recommend({ prio: 'preis', budget: 'u200', os: 'ios', size: 'egal' })[0];
    assert.equal(best.d.os, 'android');
    assert.ok(best.neg.includes('Android statt iOS'));
  });

  test('Gerät über Budget wird mit Differenz markiert', () => {
    const r = L.scoreDevice(DB.s25u, { prio: 'preis', budget: 'm500', os: 'egal', size: 'egal' });
    assert.ok(r.neg.includes(`${L.fmt(1449 - 500)} über Budget`));
  });

  test('Gerät ohne Bestand fällt hinter vorrätige Alternativen und wird markiert', () => {
    const answers = { prio: 'kamera', kamera: 'nacht', budget: 'p', os: 'egal', size: 'egal' };
    const stockOf = d => (d.id === 's25u' ? 0 : d.stock);
    const r = L.recommend(answers, stockOf);
    assert.notEqual(r[0].d.id, 's25u');
    assert.ok(r.find(x => x.d.id === 's25u').neg.includes('Aktuell nicht vorrätig'));
  });

  test('geringer Bestand erscheint als Hinweis', () => {
    const r = L.scoreDevice(DB.hm8p, { prio: 'preis', budget: 'egal', os: 'egal', size: 'egal' });
    assert.ok(r.neg.includes('Nur noch 2x im Markt'));
  });
});

describe('Live-Preis parsen', () => {
  test('reines JSON', () => {
    assert.deepEqual(L.parsePrice('{"preis":"1.449,00 €","quelle":"saturn.de","hinweis":"","gefunden":true}').preis, '1.449,00 €');
  });
  test('JSON in Markdown-Codeblock', () => {
    assert.equal(L.parsePrice('```json\n{"preis":"299,00 €","gefunden":true}\n```').preis, '299,00 €');
  });
  test('gefunden:false ergibt null', () => {
    assert.equal(L.parsePrice('{"gefunden":false}'), null);
  });
  test('Freitext mit Tausenderpunkt', () => {
    assert.equal(L.parsePrice('Das Gerät kostet aktuell 1.449,00 € bei Saturn.').preis, '1.449,00 €');
  });
  test('Freitext ohne Preis ergibt null', () => {
    assert.equal(L.parsePrice('Leider keine Informationen gefunden.'), null);
  });
  test('priceNum wandelt deutsche Preisangaben in Zahlen', () => {
    assert.equal(L.priceNum('1.449,00 €'), 1449);
    assert.equal(L.priceNum('299 €'), 299);
    assert.equal(L.priceNum('899,99 €'), 899.99);
  });
});

describe('Ausgabe-Escaping', () => {
  test('esc entschärft HTML-Sonderzeichen', () => {
    assert.equal(L.esc(`<img src=x onerror="alert('x')">&`), '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
    assert.equal(L.esc(null), '');
  });
  test('fmtMsg escaped KI-Antworten, bevor Formatierung angewendet wird', () => {
    const out = L.fmtMsg('**Tipp:** <script>alert(1)</script>\n* Punkt');
    assert.ok(!out.includes('<script>'));
    assert.ok(out.includes('<b>Tipp:</b>'));
    assert.ok(out.includes('<br>• Punkt'));
  });
});
