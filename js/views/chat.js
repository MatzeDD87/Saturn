// KI-Chat (Gemini über server.js). Ohne KI: regelbasierte Antworten direkt aus dem Katalog.
import { icon } from '../icons.js';
import * as D from '../data.js';
import { esc, $ } from '../ui.js';
import { aiAvailable, chat } from '../api.js';

const msgs = [];
const SUGG = ['Bestes Kamera-Handy bis 800 €?', 'Welches hat den größten Akku?', 'iPhone 17 oder Galaxy S26?', 'Gutes Handy für meine Oma', 'Welche Foldables gibt es?'];

function linkify(t) {
  let h = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const names = D.all().map((p) => [p, p.name]).sort((a, b) => b[1].length - a[1].length);
  const used = new Set();
  for (const [p, n] of names) {
    if (used.size > 8) break;
    const re = new RegExp(`(^|[^\\w>])(${esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w<+])`, 'i');
    if (re.test(h) && !used.has(p.id)) { h = h.replace(re, `$1<a href="#/geraet/${p.id}">$2</a>`); used.add(p.id); }
  }
  return h;
}

const fmt = (p) => `• ${p.fullName} – ${D.price(p.uvp)}${p.display.size_in ? `, ${D.inch(p.display.size_in)}` : ''}${p.battery_mah ? `, ${D.num(p.battery_mah)} mAh` : ''}${D.hasTele(p) ? `, ${D.teleFactor(p)}x Tele` : ''}`;

export function localAnswer(q) {
  const t = q.toLowerCase();
  const all = D.all();
  const m = t.match(/(?:bis|unter|max\.?|höchstens|<)\s*(\d{2,4})/);
  let pool = m ? all.filter((p) => p.uvp && p.uvp <= Number(m[1])) : all;
  const brand = D.brands().find((b) => t.includes(b.toLowerCase()));
  if (brand) pool = pool.filter((p) => p.brand === brand);
  if (/iphone|ios|apple/.test(t) && !/android/.test(t)) pool = pool.filter((p) => p.os === 'iOS');
  if (/android/.test(t) && !/iphone/.test(t)) pool = pool.filter((p) => p.os === 'Android');

  const found = all.filter((p) => t.includes(p.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)
    .filter((p, i, arr) => !arr.slice(0, i).some((o) => o.name.toLowerCase().includes(p.name.toLowerCase())));
  if (found.length >= 2) {
    const [a, b] = found;
    return `Kurzvergleich:\n${fmt(a)}\n${fmt(b)}\n\nDen kompletten Vergleich siehst du hier: [Vergleich öffnen]\n` + `#/vergleich?ids=${a.id},${b.id}`;
  }
  if (found.length === 1) {
    const p = found[0];
    return `${p.fullName}: ${p.pitch || ''}\n${fmt(p)}\nHighlights: ${p.highlights.join(', ') || '–'}\nUpdates: ${p.updates_years ? p.updates_years + ' Jahre' : 'k. A.'}`;
  }
  if (!pool.length) return 'Dazu habe ich im Katalog leider kein passendes Gerät gefunden. Versuch es mit einem höheren Budget oder einer anderen Marke.';
  const top = (arr, n = 3) => arr.slice(0, n).map(fmt).join('\n');
  if (/kamera|foto|zoom|tele/.test(t)) return `Für Fotos würde ich mir diese ansehen:\n${top([...pool].sort((a, b) => D.cameraScore(b) - D.cameraScore(a)))}`;
  if (/akku|laufzeit|batterie/.test(t)) return `Die größten Akkus${m ? ` bis ${m[1]} €` : ''}:\n${top([...pool].sort((a, b) => (b.battery_mah || 0) - (a.battery_mah || 0)))}`;
  if (/fold|falt|klapp|flip/.test(t)) { const f = pool.filter((p) => p.foldable); return f.length ? `Faltbare Modelle:\n${top(f, 6)}` : 'Aktuell kein Foldable in dieser Auswahl.'; }
  if (/oma|opa|senior|eltern|einfach/.test(t)) return `Für einfache Bedienung mit großem Display und langen Updates:\n${top([...pool].sort((a, b) => (b.tags.includes('senior') - a.tags.includes('senior')) || (b.updates_years || 0) - (a.updates_years || 0) || (a.uvp || 0) - (b.uvp || 0)))}`;
  if (/kind|schul|teen|jugend/.test(t)) return `Gut für Kinder & Jugendliche (robust, nicht zu teuer):\n${top([...pool].filter((p) => p.uvp && p.uvp <= 500).sort((a, b) => D.recommendScore(b) - D.recommendScore(a)))}`;
  if (/gam|spiel|leistung/.test(t)) return `Für Gaming (schneller Chip, hohe Bildrate):\n${top([...pool].sort((a, b) => (b.tags.includes('gaming') - a.tags.includes('gaming')) || (b.display.hz || 0) - (a.display.hz || 0)))}`;
  if (/kompakt|klein|handlich/.test(t)) return `Kompakte Modelle:\n${top([...pool].filter((p) => !p.foldable).sort((a, b) => (a.display.size_in || 9) - (b.display.size_in || 9)))}`;
  if (/update|lange|nachhaltig/.test(t)) return `Mit den längsten Updates:\n${top([...pool].sort((a, b) => (b.updates_years || 0) - (a.updates_years || 0)))}`;
  if (/günstig|billig|preiswert|preis-leistung/.test(t) || m) return `Gute Wahl${m ? ` bis ${m[1]} €` : ''}:\n${top([...pool].sort((a, b) => D.recommendScore(b) - D.recommendScore(a)))}`;
  if (/markt|filiale|adresse|öffnung|wo /.test(t)) return 'Du findest uns im Saturn in der Altmarkt-Galerie Dresden. Aktuelle Öffnungszeiten stehen auf saturn.de – dort kannst du die Geräte auch direkt ausprobieren.';
  return `Ich helfe dir gern bei der Auswahl! Frag z. B. nach „Kamera bis 600 €“, „größter Akku“, „Samsung“ oder „iPhone 17 vs. Pixel 11“.\nDerzeit beliebt:\n${top([...pool].sort((a, b) => D.recommendScore(b) - D.recommendScore(a)))}`;
}

export function render(el) {
  const ai = aiAvailable();
  if (!msgs.length) msgs.push({ role: 'model', text: ai
    ? `Hallo! Ich bin der Smartphone-Berater für Saturn in der Altmarkt-Galerie. Ich kenne alle ${D.all().length} Geräte im Katalog. Wofür brauchst du dein neues Handy?`
    : `Hallo! Die KI-Verbindung ist gerade nicht aktiv – ich antworte deshalb mit festen Regeln direkt aus dem Katalog (${D.all().length} Geräte). Frag z. B. nach Budget, Kamera, Akku oder einer Marke.` });

  el.innerHTML = `<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Chat</nav>
    <section class="chat" aria-label="Beratungs-Chat">
      <div class="chat-top"><div><b>Smartphone-Chat</b><div class="small muted">${ai ? 'KI-Antworten können Fehler enthalten – Preise bitte im Markt prüfen.' : 'Offline-Modus: regelbasierte Antworten aus dem Katalog'}</div></div>
        <span class="status ${ai ? 'on' : 'off'}">${ai ? 'KI aktiv' : 'Offline'}</span></div>
      <div class="msgs" id="msgs" aria-live="polite"></div>
      <div class="sugg" id="sugg">${SUGG.map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="chat-in" id="chat-f"><label class="sr-only" for="chat-i">Nachricht</label>
        <input id="chat-i" maxlength="1000" autocomplete="off" placeholder="Frag etwas zu Smartphones …">
        <button class="btn red" aria-label="Senden">${icon('send', { size: 18 })}</button></form>
    </section></div>`;
  const box = $('#msgs', el), input = $('#chat-i', el);
  let busy = false;

  function draw(typing) {
    box.innerHTML = msgs.map((m) => {
      let h = linkify(m.text).replace(/\[Vergleich öffnen\]\n#\/vergleich\?ids=([\w,-]+)/, '<a href="#/vergleich?ids=$1">Vergleich öffnen</a>');
      return `<div class="msg ${m.role === 'user' ? 'me' : 'bot'}">${h}</div>`;
    }).join('') + (typing ? `<div class="msg bot">${icon('spinner', { cls: 'spin', size: 16 })} schreibt …</div>` : '');
    box.scrollTop = box.scrollHeight;
  }
  async function send(text) {
    text = text.trim().slice(0, 1000);
    if (!text || busy) return;
    busy = true; msgs.push({ role: 'user', text }); input.value = ''; draw(true);
    let answer;
    if (aiAvailable()) {
      try {
        const hist = msgs.slice(-12).filter((m, i, a) => !(i === 0 && m.role === 'model'));
        answer = (await chat(hist)).text;
      } catch (e) { answer = `${localAnswer(text)}\n\n(KI gerade nicht erreichbar – Antwort aus dem Katalog. ${e.message})`; }
    } else answer = localAnswer(text);
    msgs.push({ role: 'model', text: answer }); busy = false; draw(false); input.focus();
  }
  $('#chat-f', el).addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  $('#sugg', el).addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) send(b.dataset.s); });
  draw(false);
}
