// Chat mit MAX. Mit KI-Schlüssel antwortet Gemini über server.js, sonst der Katalog-Berater aus max.js.
import { icon } from '../icons.js';
import * as D from '../data.js';
import * as MAX from '../max.js';
import { esc, $, toast } from '../ui.js';
import { aiAvailable, chat } from '../api.js';

const msgs = [];
let chips = MAX.START_CHIPS;
let speak = false;

// Antworttext -> HTML: interne Links [Text](#/route), **fett**, bei KI-Antworten zusätzlich Gerätenamen verlinken.
export function toHtml(text, auto = false) {
  const links = [];
  let h = esc(text).replace(/\[([^\]\n]+)\]\((#\/[\w/?=,&%.\-]*)\)/g, (m, label, href) => { links.push(`<a href="${href}">${label}</a>`); return `\u0000${links.length - 1}\u0000`; });
  if (auto) {
    const names = D.all().map((p) => [p, p.name]).sort((a, b) => b[1].length - a[1].length);
    const used = new Set();
    for (const [p, n] of names) {
      if (used.size > 8) break;
      const re = new RegExp(`(^|[^\\w>\u0000])(${esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w<+])`, 'i');
      if (!re.test(h)) continue;
      h = h.replace(re, (m, pre, name) => { links.push(`<a href="#/geraet/${p.id}">${name}</a>`); return `${pre}\u0000${links.length - 1}\u0000`; });
      used.add(p.id);
    }
  }
  h = h.replace(/\u0000(\d+)\u0000/g, (m, i) => links[Number(i)]);
  return h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
const plain = (text) => text.replace(/\[([^\]\n]+)\]\(#\/[^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/^[•\d.]+\s/gm, '');

function say(text) {
  if (!speak || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plain(text));
    u.lang = 'de-DE';
    window.speechSynthesis.speak(u);
  } catch { /* Sprachausgabe nicht verfügbar */ }
}

export function render(el, r) {
  const ai = aiAvailable();
  if (!msgs.length) msgs.push({ role: 'model', text: MAX.greeting(ai) });
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSpeak = 'speechSynthesis' in window;

  el.innerHTML = `<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › ${MAX.NAME}</nav>
    <section class="chat" aria-label="Beratung mit ${MAX.NAME}">
      <div class="chat-top">
        <div class="max-id"><span class="max-av" aria-hidden="true">${icon('sparkles', { size: 20 })}</span>
          <div><b>${MAX.NAME} · dein Smartphone-Berater</b><div class="small muted">${ai ? 'KI-Antworten können Fehler enthalten – Preise bitte im Markt prüfen.' : 'Katalog-Modus: Antworten direkt aus den Gerätedaten'}</div></div></div>
        <div class="chat-tools">
          <span class="status ${ai ? 'on' : 'off'}">${ai ? 'KI aktiv' : 'Katalog-Modus'}</span>
          ${canSpeak ? `<button class="icon-btn" id="chat-speak" aria-pressed="${speak}" aria-label="Antworten vorlesen" title="Antworten vorlesen">${icon('volume', { size: 18 })}</button>` : ''}
          <button class="icon-btn" id="chat-reset" aria-label="Gespräch neu beginnen" title="Neu beginnen">${icon('refresh', { size: 18 })}</button>
        </div></div>
      <div class="msgs" id="msgs" aria-live="polite"></div>
      <div class="sugg" id="sugg"></div>
      <form class="chat-in" id="chat-f"><label class="sr-only" for="chat-i">Nachricht an ${MAX.NAME}</label>
        ${Rec ? `<button type="button" class="btn ghost" id="chat-mic" aria-label="Frage einsprechen" title="Einsprechen">${icon('mic', { size: 18 })}</button>` : ''}
        <input id="chat-i" maxlength="1000" autocomplete="off" placeholder="Frag ${MAX.NAME} etwas zu Smartphones …">
        <button class="btn red" aria-label="Senden">${icon('send', { size: 18 })}</button></form>
    </section></div>`;
  const box = $('#msgs', el), input = $('#chat-i', el), sugg = $('#sugg', el);
  let busy = false;

  function draw(typing) {
    box.innerHTML = msgs.map((m) => (m.role === 'user'
      ? `<div class="msg me">${esc(m.text)}</div>`
      : `<div class="msg bot">${toHtml(m.text, !!m.ai)}</div>`)).join('')
      + (typing ? `<div class="msg bot">${icon('spinner', { cls: 'spin', size: 16 })} ${MAX.NAME} schreibt …</div>` : '');
    sugg.innerHTML = chips.map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('');
    box.scrollTop = box.scrollHeight;
  }
  async function send(text) {
    text = String(text || '').trim().slice(0, 1000);
    if (!text || busy) return;
    busy = true; msgs.push({ role: 'user', text }); input.value = ''; draw(true);
    const local = MAX.reply(text); // hält das Gesprächsgedächtnis auch im KI-Modus aktuell
    let answer = local.text, fromAi = false;
    if (aiAvailable()) {
      try {
        const hist = msgs.slice(-12).filter((m, i) => !(i === 0 && m.role === 'model')).map((m) => ({ role: m.role, text: plain(m.text).slice(0, 1000) }));
        answer = (await chat(hist)).text; fromAi = true;
      } catch (e) { answer = `${local.text}\n\n(Die KI ist gerade nicht erreichbar, deshalb kommt diese Antwort aus dem Katalog. ${e.message})`; }
    }
    chips = local.chips?.length ? local.chips : MAX.START_CHIPS;
    msgs.push({ role: 'model', text: answer, ai: fromAi });
    busy = false; draw(false); say(answer);
    if (matchMedia('(pointer:fine)').matches) input.focus();
  }

  $('#chat-f', el).addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  sugg.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) send(b.dataset.s); });
  $('#chat-reset', el).addEventListener('click', () => {
    if (busy) return;
    MAX.reset(); msgs.length = 0; chips = MAX.START_CHIPS;
    msgs.push({ role: 'model', text: MAX.greeting(aiAvailable()) });
    if (canSpeak) window.speechSynthesis.cancel();
    draw(false);
  });
  $('#chat-speak', el)?.addEventListener('click', (e) => {
    speak = !speak; e.currentTarget.setAttribute('aria-pressed', speak);
    if (!speak) window.speechSynthesis.cancel();
    toast(speak ? `${MAX.NAME} liest Antworten jetzt vor` : 'Vorlesen ausgeschaltet');
  });
  let rec = null;
  $('#chat-mic', el)?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (rec) { rec.stop(); return; }
    try {
      rec = new Rec(); rec.lang = 'de-DE'; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onresult = (ev) => { const said = ev.results?.[0]?.[0]?.transcript; if (said) send(said); };
      rec.onerror = (ev) => { toast(ev.error === 'not-allowed' ? 'Mikrofon ist nicht freigegeben' : 'Das habe ich nicht verstanden'); };
      rec.onend = () => { rec = null; btn.classList.remove('rec'); };
      btn.classList.add('rec'); rec.start();
    } catch { rec = null; btn.classList.remove('rec'); toast('Spracheingabe ist hier nicht verfügbar'); }
  });

  draw(false);
  const q = new URLSearchParams(r?.query || '').get('q');
  if (q) { history.replaceState(null, '', '#/chat'); send(q); }
  return () => { if (rec) rec.stop(); if (canSpeak) window.speechSynthesis.cancel(); };
}
