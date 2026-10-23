// Server-Anbindung (Gemini läuft ausschließlich über server.js – der Schlüssel bleibt auf dem Server).
let ai = false;
let checked = false;

export async function checkStatus() {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' });
    ai = r.ok && (await r.json()).ai === true;
  } catch { ai = false; }
  checked = true;
  return ai;
}
export const aiAvailable = () => ai;
export const statusChecked = () => checked;

async function post(url, body, timeoutMs = 30000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Serverfehler (${r.status})`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Zeitüberschreitung');
    throw e;
  } finally { clearTimeout(t); }
}

export const chat = (history) => post('/api/chat', { history });
export const checkPrice = (name) => post('/api/price', { name: name.replace(/[^\p{L}\p{N} .+\-()]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) });
