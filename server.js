import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { readFileSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GU = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const PHONES_FILE = new URL('./public/data/phones.json', import.meta.url);
const SOURCES_FILE = new URL('./data/image_sources.md', import.meta.url);

const SYSTEM_BASE = 'Du bist Smartphone-Berater im Saturn Altmarkt-Galerie Dresden. Deutsch, per Du, kompetent. Max 3-4 Sätze. ' +
  'Preise sind UVP bzw. Richtpreise ohne Gewähr, keine Lagerbestände oder Aktionen erfinden. ' +
  'Empfiehl vorrangig Geräte aus dem SORTIMENT; für Verfügbarkeit verweise auf die Kolleginnen und Kollegen im Markt.\n';
const SYSTEM_MAX = 6000;

// --- Sortiment für den Chat-Prompt aus public/data/phones.json (wird bei Dateiänderung neu gebaut) ---
const num = (n) => (Number.isFinite(n) ? n.toLocaleString('de-DE') : null);
function phoneLine(p, detail) {
  const parts = [`${p.brand} ${p.name}`, p.uvp ? `${num(p.uvp)}€` : 'Preis k.A.', p.os];
  if (detail >= 1) {
    if (p.display?.size_in) parts.push(`${num(p.display.size_in)}"${p.foldable ? ' faltbar' : ''}`);
    if (p.camera?.main_mp) parts.push(`${p.camera.main_mp}MP${p.camera.tele_mp ? '+Tele' + (p.camera.tele_zoom ? ' ' + String(p.camera.tele_zoom).replace(/\s*optisch/i, '') : '') : ''}`);
    if (p.battery_mah) parts.push(`${p.battery_mah}mAh`);
  }
  if (detail >= 2) {
    if (p.updates_years) parts.push(`${p.updates_years}J Updates`);
    if (p.chip) parts.push(p.chip);
  }
  return parts.join(', ');
}
function buildSystem(phones) {
  for (const detail of [2, 1, 0]) {
    const text = SYSTEM_BASE + 'SORTIMENT (UVP): ' + phones.map((p) => phoneLine(p, detail)).join('; ');
    if (text.length <= SYSTEM_MAX) return text;
  }
  return (SYSTEM_BASE + 'SORTIMENT (UVP): ' + phones.map((p) => phoneLine(p, 0)).join('; ')).slice(0, SYSTEM_MAX);
}
let system = SYSTEM_BASE, systemMtime = 0;
function getSystem() {
  try {
    const m = statSync(PHONES_FILE).mtimeMs;
    if (m !== systemMtime) {
      const phones = JSON.parse(readFileSync(PHONES_FILE, 'utf8'));
      if (!Array.isArray(phones)) throw new Error('phones.json ist kein Array');
      system = buildSystem(phones);
      systemMtime = m;
    }
  } catch (e) { console.warn('Sortiment konnte nicht geladen werden:', e.message); }
  return system;
}
getSystem();
console.log(`Chat-Prompt: ${system.length} Zeichen`);

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use('/img', express.static('public/img', { maxAge: '7d', fallthrough: false }));
app.use(express.static('public', { maxAge: 0 }));

const aiLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte kurz warten.' } });
const infoLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte kurz warten.' } });
app.use(['/api/chat', '/api/price'], aiLimit);
app.use('/api/', infoLimit);

async function gemini(body) {
  if (!KEY) throw Object.assign(new Error('GEMINI_API_KEY fehlt auf dem Server.'), { status: 503 });
  const r = await fetch(GU, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
  if (!r.ok) throw Object.assign(new Error('KI-Dienst nicht erreichbar.'), { status: 502 });
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}

app.get('/api/status', (req, res) => res.json({ ai: !!KEY }));

app.get('/api/image-sources', async (req, res) => {
  res.type('text/plain; charset=utf-8').set('Cache-Control', 'no-cache');
  try { res.send(await readFile(SOURCES_FILE, 'utf8')); }
  catch { res.send('# Bildquellen\n\nDie Bildquellen werden mit `npm run build:data` erzeugt und sind noch nicht vorhanden.'); }
});

app.post('/api/chat', async (req, res) => {
  const hist = req.body?.history;
  if (!Array.isArray(hist) || hist.length === 0 || hist.length > 20) return res.status(400).json({ error: 'Ungültige Anfrage.' });
  const contents = [];
  for (const m of hist) {
    if (!m || !['user', 'model'].includes(m.role) || typeof m.text !== 'string' || !m.text.trim() || m.text.length > 1000)
      return res.status(400).json({ error: 'Ungültige Nachricht.' });
    contents.push({ role: m.role, parts: [{ text: m.text }] });
  }
  try {
    const text = await gemini({ systemInstruction: { parts: [{ text: getSystem() }] }, contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 } });
    res.json({ text: text || 'Versuch es bitte nochmal!' });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/price', async (req, res) => {
  const name = req.body?.name;
  if (typeof name !== 'string' || !/^[\p{L}\p{N} .+\-()]{2,80}$/u.test(name)) return res.status(400).json({ error: 'Ungültiger Produktname.' });
  try {
    const t = await gemini({ contents: [{ role: 'user', parts: [{ text:
      `Aktueller Preis "${name}" bei Saturn Deutschland. Antworte NUR als JSON: {"preis":"XXX €","quelle":"saturn.de","hinweis":"kurz","gefunden":true}` }] }],
      tools: [{ google_search: {} }], generationConfig: { temperature: 0.1, maxOutputTokens: 300 } });
    let p;
    try { p = JSON.parse(t.replace(/```json|```/g, '').trim()); }
    catch { const m = t.match(/\d{1,4}(?:[.,]\d{2})?\s*€/); p = m ? { preis: m[0], gefunden: true } : { gefunden: false }; }
    res.json({ gefunden: !!p.gefunden, preis: String(p.preis || '').slice(0, 20),
      quelle: String(p.quelle || 'Google-Suche').slice(0, 60), hinweis: String(p.hinweis || '').slice(0, 160) });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.use('/api/', (req, res) => res.status(404).json({ error: 'Nicht gefunden.' }));

app.listen(PORT, () => console.log(`Smartphone Berater läuft auf http://localhost:${PORT}`));
