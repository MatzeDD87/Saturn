// Gemeinsame UI-Bausteine: Escaping, Bilder mit Platzhalter, Produktkarte, Toast.
import { icon } from './icons.js';
import * as D from './data.js';
import * as S from './store.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function placeholder(label = 'Bild folgt') {
  return `<div class="ph" role="img" aria-label="${esc(label)}"><div>${icon('image', { size: 32 })}${esc(label)}</div></div>`;
}

// Bild mit automatischem Platzhalter (siehe Fehler-Listener in main.js).
export function img(src, alt, { eager = false, cls = '' } = {}) {
  if (!src) return placeholder('Bild folgt');
  return `<img src="${esc(src)}" alt="${esc(alt)}" class="${cls}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-fallback>`;
}

export function installImageFallback() {
  document.addEventListener('error', (e) => {
    const el = e.target;
    if (el?.tagName === 'IMG' && el.hasAttribute('data-fallback')) {
      el.removeAttribute('data-fallback');
      el.outerHTML = placeholder('Bild nicht verfügbar');
    }
  }, true);
}

export function badgeHtml(p, max = 2) {
  return D.badges(p).slice(0, max).map((b) => `<span class="badge ${b.cls}">${esc(b.label)}</span>`).join('');
}

export function swatches(p, max = 6) {
  const c = p.colors.slice(0, max);
  const more = p.colors.length - c.length;
  return `<div class="swatches" aria-label="${p.colors.length} Farben">${c.map((x) =>
    `<span class="sw" style="background:${safeHex(x.hex)}" title="${esc(x.name)}"></span>`).join('')}${more > 0 ? `<span class="small muted">+${more}</span>` : ''}</div>`;
}
export const safeHex = (h) => (/^#[0-9a-f]{3,8}$/i.test(h || '') ? h : '#cccccc');

export function priceHtml(p, label = 'UVP ab') {
  return `<div class="price"><small>${label}</small>${esc(D.price(p.uvp))}</div>`;
}

export function card(p) {
  const saved = S.isSaved(p.id), cmp = S.inCompare(p.id);
  const d = p.display;
  const tele = D.hasTele(p) ? ` · ${esc(teleShort(p))} Tele` : '';
  return `<article class="card" data-id="${esc(p.id)}">
    <a class="card-media" href="#/geraet/${esc(p.id)}" tabindex="-1" aria-hidden="true">${img(p.images[0], p.fullName)}</a>
    <div class="card-badges">${badgeHtml(p)}</div>
    <div class="card-acts">
      <button class="icon-btn" data-act="save" data-id="${esc(p.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Von Merkliste entfernen' : 'Auf die Merkliste'}: ${esc(p.fullName)}" title="Merken">${icon('heart', { size: 18 })}</button>
      <button class="icon-btn" data-act="compare" data-id="${esc(p.id)}" aria-pressed="${cmp}" aria-label="${cmp ? 'Aus Vergleich entfernen' : 'Zum Vergleich hinzufügen'}: ${esc(p.fullName)}" title="Vergleichen">${icon('compare', { size: 18 })}</button>
    </div>
    <div class="card-body">
      <div class="card-brand">${esc(p.brand)}</div>
      <h3 class="card-name"><a href="#/geraet/${esc(p.id)}">${esc(p.name)}</a></h3>
      <ul class="specs-mini">
        <li>${icon('display', { size: 14 })}<span>${esc(D.inch(d.size_in))}${p.foldable && p.cover_display_in ? ` / ${esc(D.inch(p.cover_display_in))} außen` : ''}${d.hz ? ` · ${d.hz} Hz` : ''}</span></li>
        <li>${icon('camera', { size: 14 })}<span>${p.camera.main_mp ? `${p.camera.main_mp} MP` : D.NA}${tele}</span></li>
        <li>${icon('battery', { size: 14 })}<span>${esc(D.unit(p.battery_mah, 'mAh'))}${p.charging.wired_w ? ` · ${p.charging.wired_w} W` : ''}</span></li>
        <li>${icon('refresh', { size: 14 })}<span>${p.updates_years ? `${p.updates_years} J. Updates` : 'Updates k. A.'}</span></li>
      </ul>
      ${swatches(p)}
      <div class="card-foot">${priceHtml(p)}</div>
    </div>
  </article>`;
}

export function teleShort(p) {
  const f = D.teleFactor(p);
  return f ? `${D.num(f)}x` : '';
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

export function emptyState(title, textHtml, actionsHtml = '', ico = 'search') {
  return `<div class="empty">${icon(ico, { size: 40 })}<h2>${esc(title)}</h2><p class="muted" style="margin:0">${textHtml}</p>${actionsHtml ? `<div class="hero-cta" style="justify-content:center">${actionsHtml}</div>` : ''}</div>`;
}

export function loading(n = 8) {
  return `<div class="grid" aria-busy="true" aria-label="Geräte werden geladen">${'<div class="skel"></div>'.repeat(n)}</div>`;
}

// Aktionen auf Karten (Merken / Vergleichen) – global per Delegation.
export function handleCardAction(btn) {
  const id = btn.dataset.id;
  const p = D.get(id);
  if (!p) return;
  if (btn.dataset.act === 'save') {
    const on = S.toggleSaved(id);
    toast(on ? `${p.name} gemerkt` : `${p.name} von der Merkliste entfernt`);
  } else if (btn.dataset.act === 'compare') {
    const r = S.toggleCompare(id);
    if (r === 'full') toast(`Maximal ${S.MAX_COMPARE} Geräte im Vergleich – entferne zuerst eins.`);
    else toast(r === 'added' ? `${p.name} zum Vergleich hinzugefügt` : `${p.name} aus dem Vergleich entfernt`);
  }
}

export function syncCardButtons(root = document) {
  for (const b of $$('[data-act="save"]', root)) {
    const on = S.isSaved(b.dataset.id); b.setAttribute('aria-pressed', on);
  }
  for (const b of $$('[data-act="compare"]', root)) {
    const on = S.inCompare(b.dataset.id); b.setAttribute('aria-pressed', on);
  }
}
