// Katalog mit Filter- und Sortierleiste. Filterzustand steckt im Hash (#/geraete?marke=Apple&max=800 …).
import { icon } from '../icons.js';
import * as D from '../data.js';
import { esc, card, emptyState, $, $$ } from '../ui.js';

export const USES = {
  camera: 'Fotografie', video: 'Video', battery: 'Akku-Ausdauer', gaming: 'Gaming', everyday: 'Alltag',
  value: 'Preis-Leistung', compact: 'Kompakt', business: 'Business', senior: 'Einfache Bedienung', sustainable: 'Nachhaltig',
};
const FEATURES = {
  fold: ['Faltbar', (p) => p.foldable],
  tele: ['Teleobjektiv', D.hasTele],
  esim: ['eSIM', D.hasEsim],
  wireless: ['Kabellos laden', (p) => p.charging.wireless_w > 0],
  ip68: ['IP68 wasserdicht', (p) => /IP6[89]/i.test(p.ip || '')],
  g5: ['5G', (p) => p.five_g === true],
  upd7: ['7+ Jahre Updates', (p) => p.updates_years >= 7],
  neu: ['Neu (≤ 8 Monate)', D.isNew],
};
const SIZES = { kompakt: 'Kompakt (< 6,3″)', mittel: 'Mittel', gross: 'Groß (> 6,7″)' };
export const SORTS = {
  empf: ['Empfehlung', (a, b) => D.recommendScore(b) - D.recommendScore(a)],
  preis_auf: ['Preis aufsteigend', (a, b) => (a.uvp ?? 1e9) - (b.uvp ?? 1e9)],
  preis_ab: ['Preis absteigend', (a, b) => (b.uvp ?? -1) - (a.uvp ?? -1)],
  neu: ['Neueste zuerst', (a, b) => String(b.release).localeCompare(String(a.release))],
  akku: ['Größter Akku', (a, b) => (b.battery_mah ?? 0) - (a.battery_mah ?? 0)],
  display: ['Größtes Display', (a, b) => (b.display.size_in ?? 0) - (a.display.size_in ?? 0)],
  kamera: ['Kamera', (a, b) => D.cameraScore(b) - D.cameraScore(a)],
  leicht: ['Leichteste zuerst', (a, b) => (a.weight_g ?? 1e9) - (b.weight_g ?? 1e9)],
};

const MULTI = ['marke', 'os', 'groesse', 'feat', 'nutzung'];
function readState(query) {
  const q = new URLSearchParams(query || '');
  const s = { q: q.get('q') || '', sort: SORTS[q.get('sort')] ? q.get('sort') : 'empf', max: Number(q.get('max')) || null };
  for (const k of MULTI) s[k] = (q.get(k) || '').split(',').filter(Boolean);
  return s;
}
function writeState(s) {
  const q = new URLSearchParams();
  if (s.q) q.set('q', s.q);
  for (const k of MULTI) if (s[k].length) q.set(k, s[k].join(','));
  if (s.max) q.set('max', s.max);
  if (s.sort !== 'empf') q.set('sort', s.sort);
  const qs = q.toString();
  history.replaceState(null, '', `#/geraete${qs ? '?' + qs : ''}`);
}

export function filterPhones(list, s) {
  const words = s.q.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((p) =>
    (!words.length || words.every((w) => p.searchText.includes(w))) &&
    (!s.marke.length || s.marke.includes(p.brand)) &&
    (!s.os.length || s.os.includes(p.os)) &&
    (!s.groesse.length || s.groesse.includes(D.sizeClass(p))) &&
    (!s.max || (p.uvp != null && p.uvp <= s.max)) &&
    s.feat.every((f) => FEATURES[f]?.[1](p)) &&
    (!s.nutzung.length || s.nutzung.some((t) => p.tags.includes(t))));
}

const chips = (key, entries, s) => entries.map(([v, label, n]) =>
  `<button type="button" class="chip" data-f="${key}" data-v="${esc(v)}" aria-pressed="${s[key].includes(v)}">${esc(label)}${n != null ? ` <span class="muted">${n}</span>` : ''}</button>`).join('');

export function render(el, { query }) {
  const phones = D.all();
  let s = readState(query);
  const maxUvp = Math.ceil(Math.max(...phones.map((p) => p.uvp || 0), 500) / 100) * 100;

  const brandCounts = D.brands().map((b) => [b, b, phones.filter((p) => p.brand === b).length]);
  el.innerHTML = `<div class="wrap">
    <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Smartphones</nav>
    <div class="cat-head"><div><h1 style="margin:0">Smartphones</h1><p class="muted small" style="margin:0">${phones.length} aktuelle Modelle von ${D.brands().length} Marken · Preise = unverbindliche Preisempfehlung (UVP) der Hersteller</p></div></div>
    <div class="cat-layout">
      <aside class="filters" id="filters" aria-label="Filter">
        <div class="filters-top"><h2 style="margin:0;font-size:18px">Filter</h2><button class="icon-btn" data-close aria-label="Filter schließen">${icon('close')}</button></div>
        <fieldset><legend>Marke</legend><div class="f-opts">${chips('marke', brandCounts, s)}</div></fieldset>
        <fieldset><legend>Betriebssystem</legend><div class="f-opts">${chips('os', [['iOS', 'iOS (Apple)'], ['Android', 'Android']], s)}</div></fieldset>
        <fieldset><legend><label for="f-max">Preis bis</label></legend><div class="range">
          <input type="range" id="f-max" min="100" max="${maxUvp}" step="50" value="${s.max || maxUvp}">
          <output id="f-max-out" for="f-max">${s.max ? `bis ${D.price(s.max)}` : 'Alle Preise'}</output></div></fieldset>
        <fieldset><legend>Bildschirmgröße</legend><div class="f-opts">${chips('groesse', Object.entries(SIZES), s)}</div></fieldset>
        <fieldset><legend>Ausstattung</legend>${Object.entries(FEATURES).map(([k, [label, fn]]) =>
          `<label class="check"><input type="checkbox" data-f="feat" data-v="${k}" ${s.feat.includes(k) ? 'checked' : ''}> ${esc(label)} <span class="muted small">(${phones.filter(fn).length})</span></label>`).join('')}</fieldset>
        <fieldset><legend>Wofür nutzt du es?</legend><div class="f-opts">${chips('nutzung', Object.entries(USES), s)}</div></fieldset>
        <div class="filters-foot"><button class="btn ghost sm" data-reset>Zurücksetzen</button><button class="btn red sm" data-close id="f-apply">Ergebnisse zeigen</button></div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <section aria-labelledby="res-count">
        <div class="toolbar">
          <span class="count" id="res-count" aria-live="polite"></span>
          <button class="btn ghost sm filter-open" id="f-open" aria-controls="filters">${icon('filter', { size: 16 })} Filter <span id="f-n"></span></button>
          <label class="sr-only" for="sort">Sortieren</label>
          <select id="sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}" ${k === s.sort ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div class="active-f" id="active-f"></div>
        <div id="results"></div>
      </section>
    </div></div>`;

  const panel = $('#filters', el), scrim = $('#scrim', el);
  const openPanel = (on) => { panel.classList.toggle('open', on); scrim.classList.toggle('show', on); document.body.style.overflow = on ? 'hidden' : ''; if (on) $('[data-close]', panel).focus(); };

  function update() {
    writeState(s);
    const list = filterPhones(phones, s).sort(SORTS[s.sort][1]);
    $('#res-count', el).textContent = `${list.length} ${list.length === 1 ? 'Gerät' : 'Geräte'}`;
    $('#f-apply', el).textContent = `${list.length} Ergebnisse zeigen`;
    const act = [];
    if (s.q) act.push(['q', s.q, `„${s.q}“`]);
    for (const k of MULTI) for (const v of s[k]) act.push([k, v, k === 'feat' ? FEATURES[v]?.[0] : k === 'groesse' ? SIZES[v] : k === 'nutzung' ? USES[v] : v]);
    if (s.max) act.push(['max', s.max, `bis ${D.price(s.max)}`]);
    $('#f-n', el).textContent = act.length ? `(${act.length})` : '';
    $('#active-f', el).innerHTML = act.map(([k, v, l]) => `<button data-rm="${k}" data-v="${esc(v)}" aria-label="Filter ${esc(l)} entfernen">${esc(l)} ${icon('close', { size: 14 })}</button>`).join('') +
      (act.length > 1 ? `<button data-reset>Alle entfernen</button>` : '');
    $('#results', el).innerHTML = list.length ? `<div class="grid">${list.map(card).join('')}</div>` :
      emptyState('Keine passenden Geräte', 'Mit diesen Filtern gibt es leider kein Modell. Entferne einzelne Filter oder setze alle zurück.', '<button class="btn red" data-reset>Filter zurücksetzen</button>');
  }

  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) { if (e.target === scrim) openPanel(false); return; }
    if (t.matches('.chip[data-f]')) {
      const k = t.dataset.f, v = t.dataset.v;
      s[k] = s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v];
      t.setAttribute('aria-pressed', s[k].includes(v)); update();
    } else if (t.hasAttribute('data-rm')) {
      const k = t.dataset.rm;
      if (k === 'q') s.q = ''; else if (k === 'max') s.max = null; else s[k] = s[k].filter((x) => x !== t.dataset.v);
      syncControls(); update();
    } else if (t.hasAttribute('data-reset')) {
      s = readState(''); syncControls(); update();
    } else if (t.id === 'f-open') openPanel(true);
    else if (t.hasAttribute('data-close')) openPanel(false);
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'sort') { s.sort = t.value; update(); }
    else if (t.matches('input[data-f="feat"]')) { s.feat = t.checked ? [...s.feat, t.dataset.v] : s.feat.filter((x) => x !== t.dataset.v); update(); }
  });
  const range = $('#f-max', el);
  range.addEventListener('input', () => {
    const v = Number(range.value);
    s.max = v >= maxUvp ? null : v;
    $('#f-max-out', el).textContent = s.max ? `bis ${D.price(s.max)}` : 'Alle Preise';
    update();
  });
  const onKey = (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) openPanel(false); };
  document.addEventListener('keydown', onKey);

  function syncControls() {
    for (const b of $$('.chip[data-f]', el)) b.setAttribute('aria-pressed', s[b.dataset.f].includes(b.dataset.v));
    for (const c of $$('input[data-f="feat"]', el)) c.checked = s.feat.includes(c.dataset.v);
    range.value = s.max || maxUvp;
    $('#f-max-out', el).textContent = s.max ? `bis ${D.price(s.max)}` : 'Alle Preise';
    $('#sort', el).value = s.sort;
    const hs = document.querySelectorAll('.hdr-search input');
    hs.forEach((i) => { i.value = s.q; });
  }
  update();
  return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
}
