import { test, describe, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const KEY = 'test-key-123';

async function start(query) {
  const { app } = await import(`../server.js?${query}`);
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

// Jede IP bekommt ihr eigenes Rate-Limit-Konto; so beeinflussen sich die Tests nicht
let ipCounter = 0;
const post = (url, path, body, ip = `10.0.0.${++ipCounter}`) =>
  fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(body) });

const geminiReply = text => ({ data: { candidates: [{ content: { parts: [{ text }] } }] } });

describe('Server mit API-Key', () => {
  let srv, axiosPost;
  before(async () => {
    process.env.GEMINI_API_KEY = KEY;
    process.env.TRUST_PROXY = '1';
    srv = await start('withkey');
  });
  after(() => { srv.server.close(); delete process.env.GEMINI_API_KEY; delete process.env.TRUST_PROXY; });
  beforeEach(() => {
    axiosPost?.mock.restore();
    axiosPost = mock.method(axios, 'post', async () => geminiReply('Hallo aus dem Test'));
  });

  test('GET /api/health meldet aktive KI', async () => {
    const j = await (await fetch(srv.url + '/api/health')).json();
    assert.equal(j.ok, true);
    assert.equal(j.ai, true);
  });

  test('liefert die Oberfläche und logic.js aus', async () => {
    assert.equal((await fetch(srv.url + '/')).status, 200);
    const r = await fetch(srv.url + '/logic.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /javascript/);
  });

  test('POST /api/chat leitet an Gemini weiter und gibt den Text zurück', async () => {
    const r = await post(srv.url, '/api/chat', { system: 'Du bist ein Berater.', messages: [{ role: 'user', parts: [{ text: 'Hi' }] }] });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).text, 'Hallo aus dem Test');
    const [, body, opts] = axiosPost.mock.calls[0].arguments;
    assert.equal(body.systemInstruction.parts[0].text, 'Du bist ein Berater.');
    assert.equal(opts.headers['x-goog-api-key'], KEY);
  });

  for (const [name, body] of [
    ['falsche Rolle', { system: 's', messages: [{ role: 'system', parts: [{ text: 'x' }] }] }],
    ['zu viele Nachrichten', { system: 's', messages: Array.from({ length: 31 }, () => ({ role: 'user', parts: [{ text: 'x' }] })) }],
    ['zu lange Nachricht', { system: 's', messages: [{ role: 'user', parts: [{ text: 'x'.repeat(4001) }] }] }],
    ['fehlender System-Prompt', { messages: [{ role: 'user', parts: [{ text: 'x' }] }] }],
    ['leere Nachrichtenliste', { system: 's', messages: [] }]
  ]) {
    test(`POST /api/chat lehnt ungültige Anfrage ab: ${name}`, async () => {
      assert.equal((await post(srv.url, '/api/chat', body)).status, 400);
      assert.equal(axiosPost.mock.callCount(), 0);
    });
  }

  test('POST /api/price nutzt den gemeinsamen Prompt aus logic.js und Google-Suche', async () => {
    const r = await post(srv.url, '/api/price', { name: 'iPhone 17' });
    assert.equal(r.status, 200);
    const [, body] = axiosPost.mock.calls[0].arguments;
    assert.match(body.contents[0].parts[0].text, /Aktueller Preis für "iPhone 17"/);
    assert.deepEqual(body.tools, [{ google_search: {} }]);
  });

  test('POST /api/price lehnt leere und zu lange Namen ab', async () => {
    assert.equal((await post(srv.url, '/api/price', { name: '' })).status, 400);
    assert.equal((await post(srv.url, '/api/price', { name: 'x'.repeat(121) })).status, 400);
  });

  test('Gemini-Fehler wird als 502 weitergegeben, ohne den Key preiszugeben', async () => {
    axiosPost.mock.mockImplementation(async () => {
      throw Object.assign(new Error('boom'), { response: { data: { error: { message: 'Quota exceeded' } } } });
    });
    const r = await post(srv.url, '/api/price', { name: 'Pixel 9a' });
    assert.equal(r.status, 502);
    const text = await r.text();
    assert.match(text, /Quota exceeded/);
    assert.ok(!text.includes(KEY));
  });

  test('Rate-Limit: 31. Anfrage pro Minute wird mit 429 abgelehnt, andere IPs bleiben frei', async () => {
    const ip = '192.168.1.1';
    for (let i = 0; i < 30; i++) assert.equal((await post(srv.url, '/api/price', {}, ip)).status, 400);
    assert.equal((await post(srv.url, '/api/price', {}, ip)).status, 429);
    assert.equal((await post(srv.url, '/api/price', {}, '192.168.1.2')).status, 400);
  });
});

describe('Server ohne API-Key', () => {
  let srv;
  before(async () => { delete process.env.GEMINI_API_KEY; srv = await start('nokey'); });
  after(() => srv.server.close());

  test('GET /api/health meldet KI als inaktiv', async () => {
    assert.equal((await (await fetch(srv.url + '/api/health')).json()).ai, false);
  });

  test('KI-Endpunkte antworten mit 503', async () => {
    const r = await post(srv.url, '/api/price', { name: 'iPhone 17' });
    assert.equal(r.status, 503);
  });
});
