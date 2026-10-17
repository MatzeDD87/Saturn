import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Gemeinsame Logik mit dem Frontend (u. a. der Preis-Prompt) aus public/logic.js laden
const logicCtx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'public', 'logic.js'), 'utf8'), logicCtx);
const { PRICE_PROMPT } = logicCtx.MMSLogic;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

export const app = express();
// Hinter einem Reverse-Proxy (nginx, Render, …) TRUST_PROXY setzen, sonst teilen sich alle Clients die Proxy-IP
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Einfaches Rate-Limit pro IP, damit der Proxy nicht missbraucht wird
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const entry = hits.get(req.ip) || { n: 0, t: now };
  if (now - entry.t > RATE_WINDOW_MS) { entry.n = 0; entry.t = now; }
  entry.n++;
  hits.set(req.ip, entry);
  if (entry.n > RATE_MAX) return res.status(429).json({ error: 'Zu viele Anfragen – bitte kurz warten.' });
  next();
}
// Abgelaufene Einträge regelmäßig entfernen, damit die Map nicht unbegrenzt wächst
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of hits) if (now - entry.t > RATE_WINDOW_MS) hits.delete(ip);
}, RATE_WINDOW_MS).unref();

async function gemini(body) {
  if (!GEMINI_API_KEY) throw Object.assign(new Error('GEMINI_API_KEY fehlt auf dem Server'), { status: 503 });
  try {
    const { data } = await axios.post(GEMINI_URL, body, {
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      timeout: 30_000
    });
    return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    throw Object.assign(new Error(msg), { status: 502 });
  }
}

const isText = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ai: Boolean(GEMINI_API_KEY), model: GEMINI_MODEL });
});

app.post('/api/chat', rateLimit, async (req, res) => {
  const { system, messages } = req.body || {};
  const valid = isText(system, 12_000) && Array.isArray(messages) && messages.length > 0 && messages.length <= 30 &&
    messages.every(m => (m.role === 'user' || m.role === 'model') && isText(m.parts?.[0]?.text, 4000));
  if (!valid) return res.status(400).json({ error: 'Ungültige Anfrage' });
  try {
    const text = await gemini({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.parts[0].text }] })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 700, thinkingConfig: { thinkingBudget: 0 } }
    });
    res.json({ text });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/price', rateLimit, async (req, res) => {
  const { name } = req.body || {};
  if (!isText(name, 120)) return res.status(400).json({ error: 'Ungültiger Gerätename' });
  try {
    const text = await gemini({
      contents: [{ role: 'user', parts: [{ text: PRICE_PROMPT(name) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } }
    });
    res.json({ text });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Nur beim direkten Start lauschen – Tests importieren `app` ohne Port
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    console.log(`Smartphone-Berater läuft auf http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) console.warn('Hinweis: GEMINI_API_KEY nicht gesetzt – KI-Funktionen sind deaktiviert.');
  });
}
