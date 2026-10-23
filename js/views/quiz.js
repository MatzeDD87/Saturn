// Berater-Quiz „Finde dein Smartphone": 6 Fragen -> gewichtete Rangliste mit Begründungen.
import { icon } from '../icons.js';
import * as D from '../data.js';
import * as S from '../store.js';
import { esc, img, emptyState, toast, $ } from '../ui.js';

const Q = [
  { k: 'budget', t: 'Wie viel möchtest du ausgeben?', s: 'Wir orientieren uns an der UVP – im Markt ist es oft günstiger.', o: [
    ['300', 'euro', 'Bis 300 €', 'Einsteiger & Zweitgerät'], ['500', 'euro', 'Bis 500 €', 'Solide Mittelklasse'],
    ['800', 'euro', 'Bis 800 €', 'Obere Mittelklasse'], ['1300', 'euro', 'Bis 1.300 €', 'Flaggschiff'], ['any', 'star', 'Egal', 'Das Beste zählt']] },
  { k: 'os', t: 'iPhone oder Android?', s: 'Wenn du schon Apple-Geräte nutzt, ist iOS oft bequemer.', o: [
    ['iOS', 'apple', 'iPhone (iOS)', 'Apple-Ökosystem'], ['Android', 'android', 'Android', 'Große Auswahl'], ['any', 'check', 'Egal', 'Offen für beides']] },
  { k: 'prio', multi: 2, t: 'Was ist dir am wichtigsten?', s: 'Wähle bis zu zwei Punkte.', o: [
    ['camera', 'camera', 'Fotos', 'Tele, Nacht, Porträt'], ['battery', 'battery', 'Akku', 'Lange Laufzeit'],
    ['gaming', 'gamepad', 'Leistung & Gaming', 'Schneller Chip, hohe Hz'], ['video', 'video', 'Video & Social', 'Gute Front- und Videokamera'],
    ['value', 'tag', 'Preis-Leistung', 'Viel fürs Geld'], ['longterm', 'leaf', 'Lange Nutzung', 'Viele Updates, robust']] },
  { k: 'size', t: 'Welche Größe passt zu dir?', s: '', o: [
    ['kompakt', 'ruler', 'Kompakt', 'Unter 6,3″ – gut für eine Hand'], ['mittel', 'display', 'Mittel', '6,3–6,7″'],
    ['gross', 'display', 'Groß', 'Über 6,7″ – viel Bildschirm'], ['fold', 'fold', 'Faltbar', 'Foldable oder Flip'], ['any', 'check', 'Egal', '']] },
  { k: 'user', t: 'Wer nutzt das Smartphone?', s: 'Hilft uns bei der Gewichtung.', o: [
    ['me', 'user', 'Ich selbst', 'Alltag, Freizeit'], ['business', 'briefcase', 'Beruflich', 'Mails, Termine, Akku'],
    ['senior', 'senior', 'Eltern / Großeltern', 'Einfach & robust'], ['kid', 'seedling', 'Kind / Jugendliche', 'Günstig & stabil']] },
  { k: 'extras', multi: 4, t: 'Sonst noch Wünsche?', s: 'Optional – mehrere möglich.', o: [
    ['esim', 'sim', 'eSIM', ''], ['wireless', 'bolt', 'Kabellos laden', ''], ['ip68', 'water', 'Wasserdicht (IP68)', ''],
    ['tele', 'camera', 'Zoom-Kamera', ''], ['light', 'weight', 'Leicht (unter 190 g)', ''], ['none', 'close', 'Keine', '']] },
];

const st = { step: 0, a: {} };

export function score(p, a) {
  const why = [], con = [];
  let s = 0;
  const budget = a.budget && a.budget !== 'any' ? Number(a.budget) : null;
  if (a.os && a.os !== 'any' && p.os !== a.os) return null;
  if (budget && (p.uvp == null || p.uvp > budget * 1.12)) return null;
  if (a.size === 'fold' && !p.foldable) return null;
  if (budget && p.uvp) {
    if (p.uvp <= budget) { s += 2 + (p.uvp / budget) * 2; why.push(`Im Budget: UVP ${D.price(p.uvp)}`); }
    else { s += 0.5; con.push(`Knapp über Budget (UVP ${D.price(p.uvp)})`); }
  } else if (p.uvp) s += Math.min(p.uvp, 1500) / 1500 * 2;

  const prio = a.prio || [];
  const tele = D.teleFactor(p);
  if (prio.includes('camera')) {
    const c = D.cameraScore(p); s += c * 1.2;
    if (tele >= 3) why.push(`Starke Kamera mit ${D.num(tele)}x-Tele`); else if (p.tags.includes('camera')) why.push('Ausgezeichnete Kamera für die Preisklasse');
    else if (!D.hasTele(p)) con.push('Kein optisches Tele');
  }
  if (prio.includes('battery')) {
    const b = p.battery_mah || 0; s += Math.max(0, (b - 3500) / 500);
    if (b >= 5500) why.push(`Großer Akku mit ${D.num(b)} mAh`); else if (b && b < 4500) con.push(`Akku eher klein (${D.num(b)} mAh)`);
    if (p.charging.wired_w >= 65) why.push(`Schnellladen mit ${p.charging.wired_w} W`);
  }
  if (prio.includes('gaming')) {
    s += (p.display.hz >= 144 ? 2 : p.display.hz >= 120 ? 1 : 0) + (p.tags.includes('gaming') ? 2.5 : 0) + (Math.max(0, ...p.ram_gb) >= 12 ? 1 : 0);
    if (p.tags.includes('gaming')) why.push(`Viel Leistung (${p.chip || 'Top-Chip'})`);
    if (p.display.hz >= 144) why.push(`${p.display.hz}-Hz-Display für flüssiges Gaming`);
    if (p.display.hz && p.display.hz < 120) con.push(`Nur ${p.display.hz} Hz`);
  }
  if (prio.includes('video')) {
    s += (p.tags.includes('video') ? 3 : 0) + ((p.camera.front_mp || 0) >= 32 ? 1 : 0);
    if (p.tags.includes('video')) why.push('Sehr gute Videoaufnahmen');
    if ((p.camera.front_mp || 0) >= 32) why.push(`${p.camera.front_mp}-MP-Frontkamera für Selfies & Calls`);
  }
  if (prio.includes('value')) {
    s += p.tags.includes('value') ? 3 : 0;
    if (p.uvp) s += Math.max(0, (1000 - p.uvp) / 300);
    if (p.tags.includes('value')) why.push('Sehr gutes Preis-Leistungs-Verhältnis');
  }
  if (prio.includes('longterm') || a.user === 'senior') {
    const u = p.updates_years || 0; s += u / 2 + (p.tags.includes('sustainable') ? 1.5 : 0);
    if (u >= 6) why.push(`${u} Jahre Software-Updates`); else if (u && u < 4) con.push(`Nur ${u} Jahre Updates`);
    if (p.tags.includes('sustainable')) why.push('Reparierbar / nachhaltig gebaut');
  }
  if (a.user === 'business') { s += (p.tags.includes('business') ? 2 : 0) + (D.hasEsim(p) ? 0.5 : 0); if (p.tags.includes('business')) why.push('Ideal für Beruf & Produktivität'); }
  if (a.user === 'senior') { s += p.tags.includes('senior') ? 2.5 : 0; if (p.display.size_in >= 6.5) { s += 1; why.push('Großes, gut lesbares Display'); } if (p.foldable) s -= 2; }
  if (a.user === 'kid') { if (p.uvp && p.uvp <= 450) s += 2; if (/IP6[5-9]/.test(p.ip || '')) { s += 1; why.push(`Robust (${p.ip})`); } if (p.foldable) s -= 3; }

  const sc = D.sizeClass(p);
  if (a.size && a.size !== 'any' && a.size !== 'fold') {
    if (p.foldable) s -= 1.5;
    else if (sc === a.size) { s += 2; why.push(`Passende Größe: ${D.inch(p.display.size_in)}`); }
    else { s -= 1.5; con.push(`Größe ${D.inch(p.display.size_in)} statt ${a.size}`); }
  }
  if (a.size === 'fold') { s += 3; why.push(p.cover_display_in ? `Faltbar mit ${D.inch(p.cover_display_in)}-Außendisplay` : 'Faltbares Design'); }

  const ex = (a.extras || []).filter((x) => x !== 'none');
  const feat = { esim: [D.hasEsim(p), 'eSIM'], wireless: [p.charging.wireless_w > 0, 'Kabelloses Laden'], ip68: [/IP6[89]/.test(p.ip || ''), 'Wasserdicht nach ' + (p.ip || 'IP68')], tele: [D.hasTele(p), 'Zoom-Kamera'], light: [p.weight_g && p.weight_g < 190, `Leicht: ${p.weight_g} g`] };
  for (const x of ex) { const [ok, l] = feat[x]; if (ok) { s += 1.2; why.push(l); } else { s -= 1; con.push(`Ohne ${{ esim: 'eSIM', wireless: 'kabelloses Laden', ip68: 'IP68', tele: 'Tele', light: 'Leichtgewicht' }[x]}`); } }

  s += D.recommendScore(p) * 0.6;
  if (D.isNew(p)) why.push(`Neu seit ${D.releaseLabel(p.release)}`);
  return { p, s, why: [...new Set(why)].slice(0, 4), con: [...new Set(con)].slice(0, 2) };
}

export function rank(a, n = 5) {
  const r = D.all().map((p) => score(p, a)).filter(Boolean).sort((x, y) => y.s - x.s);
  if (!r.length) return [];
  const top = r[0].s, low = Math.min(...r.slice(0, n).map((x) => x.s));
  return r.slice(0, n).map((x) => ({ ...x, match: Math.round(72 + 26 * (top === low ? 1 : (x.s - low) / (top - low))) }));
}

export function render(el) {
  function draw() {
    if (st.step >= Q.length) return result();
    const q = Q[st.step];
    const cur = st.a[q.k];
    const sel = (v) => (q.multi ? (cur || []).includes(v) : cur === v);
    el.innerHTML = `<div class="wrap quiz">
      <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Berater</nav>
      <div class="q-card">
        <p class="small muted" style="margin:0">Finde dein Smartphone · Frage ${st.step + 1} von ${Q.length}</p>
        <div class="q-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.length}" aria-valuenow="${st.step + 1}"><i style="width:${((st.step + 1) / Q.length) * 100}%"></i></div>
        <h1 id="q-t" tabindex="-1" style="font-size:clamp(22px,3vw,30px)">${esc(q.t)}</h1>
        ${q.s ? `<p class="muted">${esc(q.s)}</p>` : ''}
        <div class="q-opts" role="group" aria-labelledby="q-t">${q.o.map(([v, ic, l, sub]) =>
          `<button class="q-opt" data-v="${v}" aria-pressed="${sel(v)}">${icon(ic, { size: 26 })}<div><b>${esc(l)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div></button>`).join('')}</div>
        <div class="q-nav">
          <button class="btn ghost" data-nav="back" ${st.step === 0 ? 'disabled' : ''}>${icon('left', { size: 16 })} Zurück</button>
          ${q.multi ? `<button class="btn red" data-nav="next">${st.step === Q.length - 1 ? 'Ergebnis zeigen' : 'Weiter'} ${icon('right', { size: 16 })}</button>` : ''}
        </div>
      </div></div>`;
    $('#q-t', el).focus({ preventScroll: true });
  }

  function result() {
    const r = rank(st.a);
    if (!r.length) {
      el.innerHTML = `<div class="wrap quiz">${emptyState('Kein Gerät passt genau', 'Mit dieser Kombination (z. B. Budget + System + Größe) finden wir kein Modell. Probier ein etwas höheres Budget oder „Egal“ bei der Größe.',
        '<button class="btn red" data-nav="restart">Neu starten</button><a class="btn ghost" href="#/geraete">Alle Geräte</a>')}</div>`;
      return;
    }
    const summary = [st.a.budget === 'any' ? 'Budget offen' : `bis ${D.price(Number(st.a.budget))}`, st.a.os === 'any' ? 'iOS oder Android' : st.a.os,
      ...(st.a.prio || []).map((x) => Q[2].o.find((o) => o[0] === x)?.[2])].filter(Boolean).join(' · ');
    el.innerHTML = `<div class="wrap quiz">
      <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Berater › Ergebnis</nav>
      <h1 id="r-t" tabindex="-1">Deine Empfehlungen</h1>
      <p class="muted">Dein Profil: ${esc(summary)}</p>
      <div class="rec">${r.map((x, i) => `<article class="rec-item ${i === 0 ? 'top' : ''}">
        <span class="rec-rank" aria-label="Platz ${i + 1}">${i + 1}</span>
        <a class="rec-media" href="#/geraet/${esc(x.p.id)}">${img(x.p.images[0], x.p.fullName)}</a>
        <div><div class="card-brand">${esc(x.p.brand)}${i === 0 ? ' · <span style="color:var(--red)">Beste Wahl</span>' : ''}</div>
          <h2 style="margin:2px 0;font-size:20px"><a href="#/geraet/${esc(x.p.id)}" style="text-decoration:none">${esc(x.p.name)}</a></h2>
          <div style="display:flex;gap:12px;align-items:baseline;flex-wrap:wrap"><span class="price" style="font-size:20px">${esc(D.price(x.p.uvp))}</span><span class="match">${x.match} % passend</span></div>
          <ul class="why">${x.why.map((w) => `<li>${icon('check', { size: 15 })}<span>${esc(w)}</span></li>`).join('')}${x.con.map((w) => `<li class="con">${icon('info', { size: 15 })}<span>${esc(w)}</span></li>`).join('')}</ul></div>
        <div class="rec-act"><a class="btn red sm" href="#/geraet/${esc(x.p.id)}">Details</a>
          <button class="btn ghost sm" data-act="save" data-id="${esc(x.p.id)}" aria-pressed="${S.isSaved(x.p.id)}">${icon('heart', { size: 14 })} Merken</button></div>
      </article>`).join('')}</div>
      <div class="hero-cta" style="margin-top:18px">
        <button class="btn red" data-nav="compare">${icon('compare', { size: 16 })} Top 3 vergleichen</button>
        <button class="btn ghost" data-nav="restart">${icon('refresh', { size: 16 })} Neu starten</button>
        <a class="btn ghost" href="#/chat">${icon('chat', { size: 16 })} Fragen im Chat</a>
      </div>
      <p class="small muted" style="margin-top:14px">Die Empfehlung basiert auf Herstellerdaten und festen Regeln, nicht auf Tests. Lass dich im Markt in der Altmarkt-Galerie gern persönlich beraten.</p>
    </div>`;
    el.dataset.top = r.slice(0, 3).map((x) => x.p.id).join(',');
    $('#r-t', el).focus({ preventScroll: true });
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const q = Q[st.step];
    if (b.classList.contains('q-opt')) {
      const v = b.dataset.v;
      if (q.multi) {
        let cur = st.a[q.k] || [];
        if (v === 'none') cur = cur.includes('none') ? [] : ['none'];
        else {
          cur = cur.filter((x) => x !== 'none');
          cur = cur.includes(v) ? cur.filter((x) => x !== v) : cur.length >= q.multi ? (toast(`Maximal ${q.multi} Punkte wählbar`), cur) : [...cur, v];
        }
        st.a[q.k] = cur; draw();
      } else { st.a[q.k] = v; st.step++; draw(); }
    } else if (b.dataset.nav === 'back') { st.step = Math.max(0, st.step - 1); draw(); }
    else if (b.dataset.nav === 'next') { st.step++; draw(); }
    else if (b.dataset.nav === 'restart') { st.step = 0; st.a = {}; draw(); }
    else if (b.dataset.nav === 'compare') { S.setCompare(el.dataset.top.split(',')); location.hash = '#/vergleich'; }
  });
  draw();
}
