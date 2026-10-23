// Detailansicht: Galerie, Farben, Speicher/UVP, Live-Preis (Gemini), Datenblatt, ähnliche Geräte.
import { icon } from '../icons.js';
import * as D from '../data.js';
import * as S from '../store.js';
import { esc, img, placeholder, card, safeHex, emptyState, toast, $, $$ } from '../ui.js';
import { SPEC_GROUPS, unc, UNC_MARK } from '../specs.js';
import { aiAvailable, checkPrice } from '../api.js';

export function render(el, { params }) {
  const p = D.get(params[0]);
  if (!p) {
    el.innerHTML = `<div class="wrap">${emptyState('Gerät nicht gefunden', 'Dieses Modell gibt es (nicht mehr) im Katalog.', '<a class="btn red" href="#/geraete">Zum Katalog</a>')}</div>`;
    return;
  }
  document.title = `${p.fullName} · Smartphone Berater`;
  const sizes = D.storagePrices(p);
  let gi = 0, ci = Math.max(0, p.colors.findIndex((c) => c.name === p.image_colors[0])), si = 0;

  const similar = D.all().filter((x) => x.id !== p.id && x.uvp && p.uvp && Math.abs(x.uvp - p.uvp) <= Math.max(200, p.uvp * 0.25))
    .sort((a, b) => (a.brand === p.brand) - (b.brand === p.brand) || Math.abs(a.uvp - p.uvp) - Math.abs(b.uvp - p.uvp)).slice(0, 4);

  const kf = [
    ['display', D.inch(p.display.size_in), p.display.hz ? `${p.display.hz} Hz ${p.display.type?.split(' ')[0] || ''}` : 'Display'],
    ['chip', p.chip ? p.chip.replace(/^(Qualcomm|MediaTek|Google|Apple|Samsung)\s+/i, '') : D.NA, 'Prozessor'],
    ['camera', p.camera.main_mp ? `${p.camera.main_mp} MP` : D.NA, D.hasTele(p) ? `Tele ${D.teleFactor(p)}x` : 'ohne Tele'],
    ['battery', D.unit(p.battery_mah, 'mAh'), p.charging.wired_w ? `${p.charging.wired_w} W Laden` : 'Akku'],
    ['refresh', p.updates_years ? `${p.updates_years} Jahre` : D.NA, 'Updates'],
    ['shield', D.text(p.ip), 'Schutz'],
  ];
  const links = D.shopLinks(p);

  el.innerHTML = `<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › <a href="#/geraete">Smartphones</a> › <a href="#/geraete?marke=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a> › ${esc(p.name)}</nav>
    <div class="detail">
      <section class="gallery" aria-label="Bilder">
        <div class="g-main" id="g-main"></div>
        <div class="g-thumbs" id="g-thumbs">${p.images.length > 1 ? p.images.map((src, i) => `<button data-gi="${i}" aria-label="Bild ${i + 1}">${img(src, '')}</button>`).join('') : ''}</div>
        <p class="g-cap">Bildquelle siehe <a href="#/bildquellen">Bildquellen</a>. Abbildung ähnlich, Farbe kann abweichen.</p>
      </section>
      <section class="buybox">
        <div><div class="card-brand">${esc(p.brand)}</div><h1>${esc(p.name)}</h1>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${D.badges(p).map((b) => `<span class="badge ${b.cls}">${esc(b.label)}</span>`).join('')}<span class="badge">${esc(D.releaseLabel(p.release))}</span></div></div>
        ${p.pitch ? `<p class="pitch">${esc(p.pitch)}</p>` : ''}
        ${p.highlights.length ? `<ul class="hl">${p.highlights.map((h) => `<li>${icon('check', { size: 18 })}<span>${esc(h)}</span></li>`).join('')}</ul>` : ''}
        ${p.colors.length ? `<div><div class="opt-l">Farbe: <span id="c-name"></span></div><div class="colors">${p.colors.map((c, i) =>
          `<button data-ci="${i}" style="background:${safeHex(c.hex)}" aria-label="${esc(c.name)}" title="${esc(c.name)}"></button>`).join('')}</div></div>` : ''}
        ${sizes.length ? `<div><div class="opt-l">Speicher</div><div class="stor">${sizes.map((s, i) =>
          `<button data-si="${i}"><span>${esc(D.storageLabel(s.gb))}</span><small>${s.uvp ? esc(D.price(s.uvp)) : 'UVP k. A.'}</small></button>`).join('')}</div></div>` : ''}
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div class="price" id="d-price"></div>
          <div style="display:flex;gap:8px">
            <button class="icon-btn" data-act="save" data-id="${esc(p.id)}" aria-pressed="${S.isSaved(p.id)}" aria-label="Merken">${icon('heart')}</button>
            <button class="icon-btn" data-act="compare" data-id="${esc(p.id)}" aria-pressed="${S.inCompare(p.id)}" aria-label="Vergleichen">${icon('compare')}</button>
          </div>
        </div>
        <div class="buy-row">
          <a class="btn red" href="${esc(links.saturn)}" target="_blank" rel="noopener">${icon('external', { size: 16 })} Bei saturn.de ansehen</a>
          <a class="btn ghost" href="${esc(links.mediamarkt)}" target="_blank" rel="noopener">mediamarkt.de</a>
        </div>
        <div class="pricebox" id="pricebox">
          <b>${icon('tag', { size: 16 })} Aktueller Marktpreis</b>
          <p class="muted small" style="margin:4px 0 8px">Die UVP ist der Herstellerpreis. Im Markt und online ist es oft günstiger.</p>
          <button class="btn ghost sm" id="price-btn">${icon('search', { size: 16 })} Live-Preis prüfen</button>
          <div class="res small" id="price-res" aria-live="polite"></div>
        </div>
        <div class="keyfacts">${kf.map(([ic, v, l]) => `<div class="kf">${icon(ic, { size: 20 })}<div><b>${esc(v)}</b>${esc(l)}</div></div>`).join('')}</div>
      </section>
    </div>

    <section class="spec-sec" aria-labelledby="dt">
      <h2 id="dt" style="margin-top:14px">Technische Daten</h2>
      <table class="spec-tbl"><tbody>${SPEC_GROUPS.map(([g, rows]) =>
        `<tr class="grp"><th colspan="2" scope="colgroup">${esc(g)}</th></tr>` + rows.map(([l, fn, key]) =>
          `<tr><th scope="row">${esc(l)}</th><td>${esc(fn(p))}${unc(p, key) ? ' ' + UNC_MARK : ''}</td></tr>`).join('')).join('')}</tbody></table>
      ${p.uncertain.some((u) => u !== 'colors.hex') ? `<p class="small muted"><span class="uns-mark">*</span> Wert nicht vollständig vom Hersteller bestätigt (z. B. aus Testberichten oder Datenbanken) – bitte im Markt gegenprüfen.</p>` : ''}
      ${p.sources?.length ? `<details class="small"><summary>Datenquellen (${p.sources.length})</summary><ul class="srcs">${p.sources.map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(u)}</a></li>`).join('')}</ul></details>` : ''}
    </section>

    ${similar.length ? `<div class="sec-h"><h2 style="margin:0">Ähnliche Preisklasse</h2></div><div class="rail">${similar.map(card).join('')}</div>` : ''}
  </div>`;

  const main = $('#g-main', el);
  function drawGallery() {
    main.innerHTML = (p.images.length ? img(p.images[gi], `${p.fullName}${p.image_colors[gi] ? ' in ' + p.image_colors[gi] : ''}`, { eager: true }) : placeholder('Produktbild folgt')) +
      (p.images.length > 1 ? `<button class="icon-btn g-nav prev" data-g="-1" aria-label="Vorheriges Bild">${icon('left')}</button><button class="icon-btn g-nav next" data-g="1" aria-label="Nächstes Bild">${icon('right')}</button>` : '');
    $$('[data-gi]', el).forEach((b) => b.setAttribute('aria-current', Number(b.dataset.gi) === gi));
  }
  function drawOpts() {
    $$('[data-ci]', el).forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.ci) === ci));
    if ($('#c-name', el)) $('#c-name', el).textContent = p.colors[ci]?.name || '';
    $$('[data-si]', el).forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.si) === si));
    const pr = sizes[si]?.uvp ?? p.uvp;
    $('#d-price', el).innerHTML = `<small>UVP${sizes[si] ? ' · ' + esc(D.storageLabel(sizes[si].gb)) : ''}</small>${esc(D.price(pr))}`;
  }
  drawGallery(); drawOpts();

  const pbtn = $('#price-btn', el);
  if (!aiAvailable()) { pbtn.disabled = true; $('#price-res', el).textContent = 'Live-Preisabfrage ist gerade nicht verfügbar (keine KI-Verbindung). Nutze die Links zu saturn.de oder frag im Markt.'; }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.g) { gi = (gi + Number(b.dataset.g) + p.images.length) % p.images.length; drawGallery(); }
    else if (b.dataset.gi) { gi = Number(b.dataset.gi); drawGallery(); }
    else if (b.dataset.ci) {
      ci = Number(b.dataset.ci);
      const j = p.image_colors.findIndex((n) => n && n === p.colors[ci].name);
      if (j >= 0) { gi = j; drawGallery(); }
      drawOpts();
    } else if (b.dataset.si) { si = Number(b.dataset.si); drawOpts(); }
    else if (b.id === 'price-btn') {
      const res = $('#price-res', el);
      b.disabled = true; res.innerHTML = `${icon('spinner', { cls: 'spin', size: 16 })} Suche aktuellen Preis bei Saturn …`;
      try {
        const r = await checkPrice(`${p.brand} ${p.name}`);
        res.innerHTML = r.gefunden && r.preis
          ? `<b style="font-size:18px">${esc(r.preis)}</b> <span class="muted">· ${esc(r.quelle)}</span>${r.hinweis ? `<br><span class="muted">${esc(r.hinweis)}</span>` : ''}<br><span class="muted">KI-Recherche ohne Gewähr – maßgeblich ist der Preis im Markt bzw. auf saturn.de.</span>`
          : 'Kein aktueller Preis gefunden. Schau direkt auf saturn.de oder frag im Markt.';
      } catch (err) { res.textContent = `Preisabfrage fehlgeschlagen: ${err.message}`; toast('Preisabfrage fehlgeschlagen'); }
      b.disabled = false;
    }
  });
}
