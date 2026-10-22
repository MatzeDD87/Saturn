import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GU = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM = 'Du bist Smartphone-Berater im Saturn Altmarkt-Galerie Dresden. Deutsch, per Du, kompetent. Max 3-4 Sätze.\n' +
  'SORTIMENT: Galaxy S25 Ultra 1.449€, S25 899€, iPhone 17 Pro Max 1.449€, iPhone 17 949€, Pixel 10 Pro 1.099€, Honor Magic 8 Pro 899€, Galaxy A56 479€, Pixel 9a 499€, POCO X7 Pro 299€, Edge 50 Neo 399€, Moto E15 79€, Redmi Note 15 189€';

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static('public'));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte kurz warten.' } }));

async function gemini(body) {
  if (!KEY) throw Object.assign(new Error('GEMINI_API_KEY fehlt auf dem Server.'), { status: 503 });
  const r = await fetch(GU, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, body: JSON.stringify(body) });
  if (!r.ok) throw Object.assign(new Error('KI-Dienst nicht erreichbar.'), { status: 502 });
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
}

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
    const text = await gemini({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 } });
    res.json({ text: text || 'Versuch es bitte nochmal!' });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

app.post('/api/price', async (req, res) => {
  const name = req.body?.name;
  if (typeof name !== 'string' || !/^[\p{L}\p{N} .+\-()]{2,60}$/u.test(name)) return res.status(400).json({ error: 'Ungültiger Produktname.' });
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

app.listen(PORT, () => console.log(`Saturn AI-Pilot läuft auf http://localhost:${PORT}`));
