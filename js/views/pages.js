// Merkliste, Hilfe und Bildquellen.
import { icon } from '../icons.js';
import * as D from '../data.js';
import * as S from '../store.js';
import { esc, card, emptyState, $ } from '../ui.js';
import { aiAvailable } from '../api.js';

export function saved(el) {
  function draw() {
    const list = S.saved().map(D.get).filter(Boolean);
    const sum = list.reduce((s, p) => s + (p.uvp || 0), 0);
    el.innerHTML = `<div class="wrap">
      <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Merkliste</nav>
      <div class="cat-head"><h1 style="margin:0">Merkliste <span class="muted" style="font-size:.6em">${list.length}</span></h1>
      ${list.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${list.length >= 2 ? `<button class="btn red sm" id="s-cmp">${icon('compare', { size: 14 })} ${Math.min(list.length, S.MAX_COMPARE)} vergleichen</button>` : ''}<button class="btn ghost sm" id="s-print">Drucken / als PDF</button></div>` : ''}</div>
      ${list.length ? `<p class="muted small">Deine Merkliste wird nur lokal auf diesem Gerät gespeichert. Zeig sie im Markt einfach vor – wir beraten dich gern. Summe der UVPs: ${esc(D.price(sum))}</p><div class="grid">${list.map(card).join('')}</div>`
        : emptyState('Deine Merkliste ist leer', `Tippe bei einem Gerät auf ${icon('heart', { size: 16 })}, um es dir zu merken. Die Liste bleibt auf diesem Gerät gespeichert.`, '<a class="btn red" href="#/geraete">Geräte ansehen</a>', 'heart')}
    </div>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b?.id === 's-cmp') { S.setCompare(S.saved().filter((id) => D.get(id)).slice(0, S.MAX_COMPARE)); location.hash = '#/vergleich'; }
    if (b?.id === 's-print') window.print();
  });
  const off = S.onChange((k) => { if (k === 'saved') draw(); });
  draw();
  return off;
}

const FAQ = [
  ['Was bedeutet „UVP“?', 'Die unverbindliche Preisempfehlung des Herstellers zum Marktstart in Deutschland. Im Markt und auf saturn.de ist der tatsächliche Preis oft niedriger – nutze dafür „Live-Preis prüfen“ in der Detailansicht oder frag unser Team.'],
  ['Woher stammen die technischen Daten?', 'Aus den offiziellen Datenblättern der Hersteller, ergänzt um Datenbanken wie GSMArena. Werte, die nicht vollständig bestätigt sind, sind mit * markiert. Die Quellen stehen in jeder Detailansicht unter „Datenquellen“.'],
  ['Wie funktioniert der Berater?', 'Du beantwortest sechs kurze Fragen. Daraus berechnen wir mit festen Regeln eine Rangliste und zeigen, warum ein Gerät passt – und wo es Abstriche gibt. Es werden keine persönlichen Daten gespeichert oder übertragen.'],
  ['Was passiert mit meinen Chat-Nachrichten?', 'Ist die KI aktiv, werden deine Nachrichten zur Beantwortung an Google Gemini gesendet. Gib bitte keine persönlichen Daten ein. Ohne KI-Verbindung antwortet der Chat lokal aus dem Katalog.'],
  ['Wo werden Merkliste und Vergleich gespeichert?', 'Nur im Browser auf deinem Gerät (localStorage). Du kannst sie jederzeit leeren, indem du die Einträge entfernst oder die Website-Daten löschst.'],
  ['Kann ich die Geräte ausprobieren?', 'Ja – die meisten Modelle findest du bei Saturn in der Altmarkt-Galerie Dresden. Die Verfügbarkeit einzelner Farben und Speichergrößen kann variieren.'],
];

export function help(el) {
  const ai = aiAvailable();
  el.innerHTML = `<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Hilfe</nav>
    <div class="help-layout">
      <article class="prose">
        <h1>Hilfe & Infos</h1>
        <p>Dieser Smartphone-Berater zeigt ${D.all().length} aktuelle Modelle von ${D.brands().length} Marken mit Herstellerdaten, Produktbildern und unverbindlichen Preisempfehlungen.</p>
        <h2>So nutzt du die App</h2>
        <ol>
          <li><b>Smartphones:</b> Filtere nach Marke, Preis, Größe und Ausstattung und sortiere nach dem, was dir wichtig ist.</li>
          <li><b>Details:</b> Wähle Farbe und Speicher, sieh dir alle technischen Daten an und prüfe den aktuellen Preis.</li>
          <li><b>Vergleich:</b> Stelle bis zu ${S.MAX_COMPARE} Geräte nebeneinander – die besten Werte sind grün markiert.</li>
          <li><b>Berater:</b> Sechs Fragen, danach bekommst du deine persönliche Rangliste mit Begründung.</li>
          <li><b>Chat:</b> Stell freie Fragen ${ai ? 'an die KI' : '(derzeit im Offline-Modus mit Antworten aus dem Katalog)'}.</li>
        </ol>
        <h2>Häufige Fragen</h2>
        <div class="faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      </article>
      <aside class="side" aria-label="Gut zu wissen">
        <h3>${icon('info', { size: 18 })} Gut zu wissen</h3>
        <p style="margin:0"><b>KI-Status:</b> <span class="status ${ai ? 'on' : 'off'}">${ai ? 'KI aktiv' : 'Offline'}</span></p>
        <p style="margin:0">${ai ? 'Chat und Live-Preis nutzen Google Gemini. KI-Antworten können Fehler enthalten.' : 'Ohne KI-Verbindung funktionieren Katalog, Vergleich, Berater und Merkliste vollständig. Der Chat antwortet dann mit festen Regeln aus dem Katalog.'}</p>
        <p style="margin:0"><b>Preise:</b> Alle Angaben sind UVPs der Hersteller ohne Gewähr. Verbindlich ist der Preis im Markt bzw. auf saturn.de.</p>
        <p style="margin:0"><b>Bilder:</b> Herstellerbilder und Wikimedia Commons – <a href="#/bildquellen">alle Bildquellen</a>.</p>
        <a class="btn red sm" href="#/berater">${icon('sparkles', { size: 14 })} Berater starten</a>
      </aside>
    </div></div>`;
}

function parseSources(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line)) continue;
    const c = line.split('|').slice(1, -1).map((x) => x.trim());
    if (c.length < 3 || /^(datei|file|bild)/i.test(c[0])) continue;
    rows.push(c);
  }
  return rows;
}
const linkOrText = (s) => (/^https?:\/\//.test(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener nofollow">${esc(s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}${s.length > 70 ? '…' : ''}</a>` : esc(s));

export async function sources(el) {
  el.innerHTML = `<div class="wrap"><nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Bildquellen</nav>
    <article class="prose" style="max-width:none"><h1>Bildquellen</h1>
    <p>Die Produktbilder stammen aus Pressebereichen und Produktseiten der Hersteller sowie von Wikimedia Commons. Sie werden lokal ausgeliefert (kein Hotlinking). Die Rechte liegen bei den jeweiligen Rechteinhabern; Lizenzen und Urheber siehe Tabelle.</p>
    <div id="src-body">${icon('spinner', { cls: 'spin' })} Lade Bildquellen …</div></article></div>`;
  const body = $('#src-body', el);
  try {
    const r = await fetch('/api/image-sources');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = parseSources(await r.text());
    if (!rows.length) { body.innerHTML = '<p class="muted">Noch keine Bildquellen erfasst.</p>'; return; }
    body.innerHTML = `<p class="small muted">${rows.length} Bilder</p><div style="overflow-x:auto"><table class="src-tbl"><thead><tr><th>Bild</th><th>Gerät</th><th>Quelle</th><th>Lizenz / Urheber</th></tr></thead><tbody>${rows.map((c) => {
      const file = c[0].replace(/[`\s]/g, '').split('/').pop();
      const safe = /^[\w.-]+\.webp$/i.test(file) ? `img/phones/${file}` : null;
      return `<tr><td>${safe ? `<img src="${esc(safe)}" alt="" loading="lazy">` : ''}</td><td><b>${esc(c[1])}</b><br><span class="small muted">${esc(file)}</span></td><td>${linkOrText(c[2])}</td><td>${esc(c.slice(4).join(' ') || c[3] || '')}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  } catch (e) {
    body.innerHTML = `<p>Die Bildquellen konnten nicht geladen werden (${esc(e.message)}). Sie stehen auch in <code>data/image_sources.md</code> im Projekt.</p>`;
  }
}
