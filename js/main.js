// Einstieg: Daten laden, Hash-Router, globale Interaktionen (Merken/Vergleichen, Suche, Vergleichsleiste).
import { icon } from './icons.js';
import * as D from './data.js';
import * as S from './store.js';
import { esc, $, $$, toast, loading, emptyState, installImageFallback, handleCardAction, syncCardButtons } from './ui.js';
import { checkStatus } from './api.js';
import * as home from './views/home.js';
import * as catalog from './views/catalog.js';
import * as detail from './views/detail.js';
import * as compare from './views/compare.js';
import * as quiz from './views/quiz.js';
import * as chatView from './views/chat.js';
import * as pages from './views/pages.js';

const ROUTES = {
  start: [home.render, 'Start'],
  geraete: [catalog.render, 'Smartphones'],
  geraet: [detail.render, null],
  vergleich: [compare.render, 'Vergleich'],
  berater: [quiz.render, 'Berater'],
  chat: [chatView.render, 'Chat'],
  merkliste: [pages.saved, 'Merkliste'],
  hilfe: [pages.help, 'Hilfe'],
  bildquellen: [pages.sources, 'Bildquellen'],
};
const NAV = [['start', 'home', 'Start'], ['geraete', 'grid', 'Smartphones'], ['berater', 'sparkles', 'Berater'], ['vergleich', 'compare', 'Vergleich'], ['chat', 'chat', 'Chat'], ['merkliste', 'heart', 'Merkliste'], ['hilfe', 'help', 'Hilfe']];

let cleanup = null;
let lastRoute = '';

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const [name, ...params] = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: ROUTES[name] ? name : (name ? '404' : 'start'), params, query };
}

function route() {
  const r = parseHash();
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* egal */ } }
  cleanup = null;
  const fresh = document.createElement('div');
  $('#view').replaceWith(fresh); fresh.id = 'view';
  for (const a of $$('.nav a')) a.toggleAttribute('aria-current', a.dataset.r === r.name || (r.name === 'geraet' && a.dataset.r === 'geraete'));
  for (const a of $$('.nav a[aria-current]')) a.setAttribute('aria-current', 'page');
  if (r.name === '404') {
    fresh.innerHTML = `<div class="wrap">${emptyState('Seite nicht gefunden', 'Diese Adresse gibt es nicht.', '<a class="btn red" href="#/start">Zur Startseite</a>')}</div>`;
  } else {
    const [fn, title] = ROUTES[r.name];
    document.title = `${title ? title + ' · ' : ''}Smartphone Berater · Saturn Dresden`;
    cleanup = fn(fresh, r) || null;
    if (r.name === 'geraete') $$('.hdr-search input').forEach((i) => { i.value = new URLSearchParams(r.query).get('q') || ''; });
  }
  const key = `${r.name}/${r.params.join('/')}`;
  if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; }
  $('#main').focus({ preventScroll: true });
}

function drawTray() {
  const ids = S.compare();
  const tray = $('#tray');
  const onCompare = parseHash().name === 'vergleich';
  tray.hidden = !ids.length || onCompare;
  if (tray.hidden) return;
  tray.innerHTML = `<div class="thumbs">${ids.map((id) => { const p = D.get(id); return p?.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : '<span></span>'; }).join('')}</div>
    <b>${ids.length}/${S.MAX_COMPARE} im Vergleich</b><a class="btn red sm" href="#/vergleich">Vergleichen</a>`;
}
function drawCounts() {
  const s = S.saved().length, c = S.compare().length;
  $('#cnt-saved').textContent = s; $('#cnt-saved').hidden = !s;
  $('#cnt-cmp').textContent = c; $('#cnt-cmp').hidden = !c;
}

function buildChrome() {
  $('#nav').innerHTML = NAV.map(([r, ic, l]) => `<a href="#/${r}" data-r="${r}">${icon(ic, { size: 18 })}${l}</a>`).join('');
  $$('[data-ico]').forEach((n) => { n.innerHTML = icon(n.dataset.ico, { size: Number(n.dataset.size) || 22 }); });
  for (const f of $$('.hdr-search')) {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('input', f).value.trim();
      location.hash = `#/geraete${q ? '?q=' + encodeURIComponent(q) : ''}`;
      if (parseHash().name === 'geraete') route();
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (b) { e.preventDefault(); handleCardAction(b); }
  });
  S.onChange(() => { drawCounts(); drawTray(); syncCardButtons(); });
}

async function boot() {
  installImageFallback();
  buildChrome();
  drawCounts();
  $('#view').innerHTML = `<div class="wrap">${loading(8)}</div>`;
  const [res] = await Promise.allSettled([D.loadPhones(), checkStatus()]);
  if (res.status === 'rejected') {
    $('#view').innerHTML = `<div class="wrap">${emptyState('Daten konnten nicht geladen werden', `Bitte lade die Seite neu. (${esc(res.reason?.message || 'Fehler')})`, '<a class="btn red" href="./">Neu laden</a>', 'info')}</div>`;
    return;
  }
  S.prune(new Set(D.all().map((p) => p.id)));
  drawCounts();
  $('#ftr-count').textContent = `${D.all().length} Geräte · ${D.brands().join(', ')}`;
  window.addEventListener('hashchange', () => { route(); drawTray(); });
  route(); drawTray();
}
boot();
