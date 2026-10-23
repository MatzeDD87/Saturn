// Startseite: Canva-Hero, Promo-Kacheln, Einstiege nach Bedarf, Kategorien, Marken, Neuheiten, Quiz-Teaser, Im Markt.
import { icon } from '../icons.js';
import * as D from '../data.js';
import { esc, card } from '../ui.js';

const PROMO = [
  ['finden', 'Finde dein Smartphone – in 60 Sekunden zur passenden Empfehlung', '#/berater'],
  ['vergleichen', 'Vergleichen – bis zu 3 Geräte nebeneinander', '#/vergleich'],
  ['beratung', 'Beratung im Markt – Altmarkt-Galerie Dresden', '#/start', 'im-markt'],
  ['tarif', 'Tarif & Trade-in – Altgerät eintauschen, Tarif finden', '#/start', 'im-markt'],
];
const CATS = [
  ['foldables', 'Foldables', '#/geraete?feat=fold'],
  ['kamera', 'Kamera-Handys', '#/geraete?nutzung=camera&sort=kamera'],
  ['preis', 'Preis-Tipps', '#/geraete?max=400&sort=preis_ab'],
];
const ENTRY = [
  ['camera', 'Beste Kamera', 'Tele, Nachtfotos, Video', '#/geraete?nutzung=camera&sort=kamera'],
  ['battery', 'Langer Akku', 'Locker durch den Tag', '#/geraete?nutzung=battery&sort=akku'],
  ['euro', 'Bis 400 €', 'Solide & günstig', '#/geraete?max=400&sort=preis_ab'],
  ['fold', 'Foldables', 'Falt- & Klapphandys', '#/geraete?feat=fold'],
  ['ruler', 'Kompakt', 'Gut für eine Hand', '#/geraete?groesse=kompakt'],
  ['leaf', 'Lange Updates', '7 Jahre und mehr', '#/geraete?feat=upd7'],
];

export function render(el) {
  const phones = D.all();
  const newest = [...phones].sort((a, b) => String(b.release).localeCompare(String(a.release))).slice(0, 8);
  const value = phones.filter((p) => p.uvp && p.uvp <= 600).sort((a, b) => D.recommendScore(b) - D.recommendScore(a)).slice(0, 4);
  const minP = Math.min(...phones.map((p) => p.uvp || Infinity));

  el.innerHTML = `<div class="wrap">
    <section class="hero-banner">
      <h1 class="sr-only">Dein neues Smartphone – Smartphone-Beratung Saturn Dresden Altmarkt-Galerie</h1>
      <a href="#/berater" class="hero-pic" aria-label="Berater starten">
        <picture>
          <source media="(max-width:640px)" srcset="img/ui/hero-mobile.webp" width="810" height="1080">
          <img src="img/ui/hero-desktop.webp" srcset="img/ui/hero-desktop-1200.webp 1200w, img/ui/hero-desktop.webp 1920w" sizes="(max-width:1280px) 100vw, 1232px" width="1920" height="960" alt="" fetchpriority="high">
        </picture>
      </a>
      <div class="hero-bar">
        <p><b>${phones.length} aktuelle Modelle</b> von ${D.brands().length} Marken${Number.isFinite(minP) ? ` ab ${esc(D.price(minP))}` : ''} – vergleichen, merken und im Markt persönlich beraten lassen.</p>
        <div class="hero-cta">
          <a class="btn red" href="#/berater">${icon('sparkles', { size: 18 })} Berater starten</a>
          <a class="btn ghost" href="#/geraete">Alle Smartphones</a>
        </div>
      </div>
    </section>

    <div class="promo">${PROMO.map(([f, t, href, scroll]) => `<a class="promo-tile" href="${href}"${scroll ? ` data-scroll="${scroll}"` : ''}><img src="img/ui/tile-${f}.webp" width="600" height="600" alt="${esc(t)}" loading="lazy"></a>`).join('')}</div>

    <div class="usp">
      <div>${icon('check')} Echte Herstellerdaten</div>
      <div>${icon('compare')} Bis zu 3 Geräte vergleichen</div>
      <div>${icon('chat')} KI-Beratung im Chat</div>
      <div>${icon('store')} Vor Ort ausprobieren</div>
    </div>

    <div class="sec-h"><h2 style="margin:0">Was ist dir wichtig?</h2></div>
    <div class="tiles">${ENTRY.map(([ic, t, s, href]) => `<a class="tile" href="${href}">${icon(ic, { size: 26 })}<b>${t}</b><span>${s}</span></a>`).join('')}</div>

    <div class="sec-h"><h2 style="margin:0">Entdecken</h2></div>
    <div class="cats">${CATS.map(([f, t, href]) => `<a class="cat-tile" href="${href}"><img src="img/ui/cat-${f}.webp" width="960" height="540" alt="${esc(t)}" loading="lazy"></a>`).join('')}</div>

    <div class="sec-h"><h2 style="margin:0">Marken</h2></div>
    <div class="brands">${D.brands().map((b) => `<a class="chip" href="#/geraete?marke=${encodeURIComponent(b)}">${esc(b)} <span class="muted">${phones.filter((p) => p.brand === b).length}</span></a>`).join('')}</div>

    <div class="sec-h"><h2 style="margin:0">Neu im Sortiment</h2><a href="#/geraete?sort=neu">Alle Neuheiten ›</a></div>
    <div class="rail">${newest.map(card).join('')}</div>

    <section class="quiz-teaser">
      <div><h2 style="margin:0 0 4px">Unsicher? Mach den Smartphone-Check.</h2>
      <p class="muted" style="margin:0">6 kurze Fragen, danach bekommst du deine Top-Empfehlungen – mit Begründung, warum sie zu dir passen.</p></div>
      <a class="btn red" href="#/berater">${icon('sparkles', { size: 18 })} Finde dein Smartphone</a>
    </section>

    ${value.length ? `<div class="sec-h"><h2 style="margin:0">Starke Geräte bis 600 €</h2><a href="#/geraete?max=600">Mehr anzeigen ›</a></div>
    <div class="rail">${value.map(card).join('')}</div>` : ''}

    <section class="in-store" id="im-markt" tabindex="-1">
      <div>
        <h2 style="margin:0 0 6px">${icon('store', { size: 22 })} Im Markt: Saturn Dresden Altmarkt-Galerie</h2>
        <p class="muted" style="margin:0 0 10px">Merkliste speichern, im Markt vorzeigen und die Favoriten direkt in die Hand nehmen. Unser Team hilft dir bei der Auswahl, beim Datenumzug und bei der Einrichtung.</p>
      </div>
      <div class="in-store-grid">
        <div><b>${icon('chat', { size: 18 })} Persönliche Beratung</b><span>Geräte live vergleichen, Fragen klären, Zubehör finden.</span></div>
        <div><b>${icon('euro', { size: 18 })} Tarif & Vertrag</b><span>Smartphone mit oder ohne Vertrag – wir zeigen dir passende Tarife.</span></div>
        <div><b>${icon('compare', { size: 18 })} Trade-in</b><span>Altgerät mitbringen, Restwert prüfen lassen und beim Neukauf anrechnen (Konditionen im Markt erfragen).</span></div>
      </div>
      <div class="hero-cta"><a class="btn red" href="#/merkliste">${icon('heart', { size: 18 })} Zur Merkliste</a><a class="btn ghost" href="#/chat">Frage stellen</a></div>
    </section>
  </div>`;
  el.querySelectorAll('[data-scroll]').forEach((a) => a.addEventListener('click', (e) => {
    const t = el.querySelector('#' + a.dataset.scroll); if (!t) return;
    e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.focus({ preventScroll: true });
  }));
}
