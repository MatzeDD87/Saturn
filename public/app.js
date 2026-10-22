(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  var euro = function (n) { return n.toLocaleString('de-DE') + ' €'; };

  // Datengetriebenes Quiz
  var STEPS = [
    { key:'use', title:'Wofür nutzt du dein Handy?', sub:'Wähle, was dir am wichtigsten ist.', opts:[
      { v:'allround', ic:'⭐', t:'Alles ein bisschen', s:'Social Media, Fotos, Alltag' },
      { v:'kamera', ic:'📸', t:'Fotos & Videos', s:'Die beste Kamera' },
      { v:'gaming', ic:'🎮', t:'Gaming & Leistung', s:'Schnell und ausdauernd' },
      { v:'senioren', ic:'👵', t:'Einfach & zuverlässig', s:'Telefonieren, WhatsApp' } ] },
    { key:'budget', title:'Wie viel willst du ausgeben?', sub:'Ungefähr reicht.', opts:[
      { v:'low', ic:'💶', t:'Bis 300 €', s:'Günstig' },
      { v:'mid', ic:'💳', t:'300 – 700 €', s:'Mittelklasse' },
      { v:'high', ic:'💎', t:'Über 700 €', s:'Flaggschiff' } ] },
    { key:'os', title:'iPhone oder Android?', sub:'Kein Problem, wenn es dir egal ist.', opts:[
      { v:'ios', ic:'🍎', t:'iPhone', s:'Apple iOS' },
      { v:'android', ic:'🤖', t:'Android', s:'Samsung, Google & Co.' },
      { v:'egal', ic:'🤷', t:'Egal', s:'Hauptsache passend' } ] }
  ];
  var BUDGETS = ['low', 'mid', 'high'];
  var step = 0, ans = {};

  function renderStep() {
    var s = STEPS[step];
    $('result').hidden = true; $('quiz').hidden = false;
    $('quiz').innerHTML =
      '<div class="progress" aria-label="Schritt ' + (step + 1) + ' von ' + STEPS.length + '">' +
      STEPS.map(function (_, i) { return '<i class="' + (i <= step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="q"><h2>' + esc(s.title) + '</h2><p>' + esc(s.sub) + '</p><div class="opts">' +
      s.opts.map(function (o) { return '<button type="button" class="opt" data-v="' + o.v + '"><span class="ic" aria-hidden="true">' + o.ic +
        '</span><span><b>' + esc(o.t) + '</b><small>' + esc(o.s) + '</small></span></button>'; }).join('') +
      '</div>' + (step ? '<button type="button" class="back" id="back">← Zurück</button>' : '') + '</div>';
    $('quiz').querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () { ans[s.key] = b.dataset.v; step++; step < STEPS.length ? renderStep() : showResult(); });
    });
    if (step) $('back').addEventListener('click', function () { step--; renderStep(); });
    var first = $('quiz').querySelector('.opt'); if (first) first.focus({ preventScroll: true });
  }

  function score(p) {
    var sc = 0;
    if (ans.os !== 'egal' && p.os !== ans.os) return -1;
    if (p.use.indexOf(ans.use) === 0) sc += 3; else if (p.use.indexOf(ans.use) > 0) sc += 2;
    var d = Math.abs(BUDGETS.indexOf(p.budget) - BUDGETS.indexOf(ans.budget));
    sc += d === 0 ? 4 : d === 1 ? 1 : -3;
    return sc;
  }

  function card(p, top) {
    return '<article class="card' + (top ? ' top' : '') + '"><div class="row">' + window.PHONE_SVG(p.colors[0], p.colors[1]) +
      '<div>' + (top ? '<span class="badge">Beste Wahl für dich</span>' : '') + '<h3>' + esc(p.name) + '</h3>' +
      '<div class="price">' + euro(p.price) + '</div><small style="color:var(--mut)">Richtpreis</small></div></div>' +
      '<ul class="feat">' + p.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
      '<div class="actions"><button type="button" class="btn primary" data-price="' + p.id + '">Live-Preis prüfen</button>' +
      '<a class="btn" target="_blank" rel="noopener" href="https://www.saturn.de/de/search.html?query=' + encodeURIComponent(p.name) + '">Auf saturn.de</a></div>' +
      '<div class="lp" id="lp-' + p.id + '" hidden></div></article>';
  }

  function showList(list, title) {
    $('quiz').hidden = true; var r = $('result'); r.hidden = false;
    r.innerHTML = '<h2 style="margin-bottom:12px">' + esc(title) + '</h2>' +
      (list.length ? list.map(function (p, i) { return card(p, title.indexOf('Empfehlung') === 0 && i === 0); }).join('')
        : '<p>Leider kein passendes Gerät. Probier andere Antworten oder frag den KI-Chat.</p>') +
      '<button type="button" class="btn" id="restart">↺ Neu starten</button>';
    $('restart').addEventListener('click', goHome);
    r.querySelectorAll('[data-price]').forEach(function (b) { b.addEventListener('click', function () { livePrice(b); }); });
    window.scrollTo({ top: 0 });
  }

  function showResult() {
    var list = window.PHONES.map(function (p) { return { p: p, s: score(p) }; })
      .filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s || a.p.price - b.p.price; })
      .slice(0, 3).map(function (x) { return x.p; });
    showList(list, 'Empfehlungen für dich');
  }

  async function livePrice(btn) {
    var p = window.PHONES.find(function (x) { return x.id === btn.dataset.price; });
    var box = $('lp-' + p.id), link = 'https://www.saturn.de/de/search.html?query=' + encodeURIComponent(p.name);
    btn.disabled = true; btn.textContent = 'Suche…'; box.hidden = false; box.textContent = 'Preis wird gesucht…';
    try {
      var r = await fetch('/api/price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: p.name }) });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Fehler');
      box.innerHTML = d.gefunden && d.preis
        ? '<div class="note">KI-Schätzung via Google-Suche – ohne Gewähr</div><div class="val">' + esc(d.preis) + '</div>' +
          (d.hinweis ? '<div class="note">' + esc(d.hinweis) + '</div>' : '') + '<a target="_blank" rel="noopener" href="' + link + '">Preis auf saturn.de prüfen →</a>'
        : 'Kein Preis gefunden. <a target="_blank" rel="noopener" href="' + link + '">Auf saturn.de nachsehen →</a>';
      btn.textContent = 'Erneut prüfen';
    } catch (e) {
      box.innerHTML = esc(e.message) + ' <a target="_blank" rel="noopener" href="' + link + '">Auf saturn.de nachsehen →</a>';
      btn.textContent = 'Nochmal versuchen';
    }
    btn.disabled = false;
  }

  // Navigation
  function setNav(id) { document.querySelectorAll('.nb').forEach(function (n) { var on = n.id === id; n.classList.toggle('on', on); on ? n.setAttribute('aria-current', 'page') : n.removeAttribute('aria-current'); }); }
  function closeChat() { $('chat').hidden = true; }
  function goHome() { closeChat(); setNav('navHome'); step = 0; ans = {}; renderStep(); }
  $('navHome').addEventListener('click', goHome);
  $('navAll').addEventListener('click', function () { closeChat(); setNav('navAll'); showList(window.PHONES.slice().sort(function (a, b) { return a.price - b.price; }), 'Alle Geräte'); });
  $('navChat').addEventListener('click', function () { setNav('navChat'); $('chat').hidden = false; $('chatInput').focus(); });
  $('chatClose').addEventListener('click', function () { closeChat(); setNav('navHome'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('chat').hidden) $('chatClose').click(); });

  // Chat
  var hist = [], busy = false;
  function addMsg(t, who) { var m = document.createElement('div'); m.className = 'cm ' + who; m.textContent = t; $('chatMsgs').appendChild(m); $('chatMsgs').scrollTop = 1e9; return m; }
  addMsg('Hey! 👋 Ich bin dein KI-Berater von Saturn Dresden. Was suchst du?', 'b');
  async function send(text) {
    text = text.trim(); if (!text || busy) return;
    busy = true; $('chatSend').disabled = true; $('chatQuick').hidden = true;
    addMsg(text, 'u'); hist.push({ role: 'user', text: text }); hist = hist.slice(-20);
    var t = addMsg('…', 'b');
    try {
      var r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: hist }) });
      var d = await r.json(); if (!r.ok) throw new Error(d.error);
      t.textContent = d.text; hist.push({ role: 'model', text: d.text.slice(0, 1000) });
    } catch (e) { t.textContent = (e.message || 'Verbindungsfehler') + ' 🔄'; hist.pop(); }
    busy = false; $('chatSend').disabled = false; $('chatInput').focus();
  }
  $('chatForm').addEventListener('submit', function (e) { e.preventDefault(); var v = $('chatInput').value; $('chatInput').value = ''; send(v); });
  document.querySelectorAll('.chip').forEach(function (c) { c.addEventListener('click', function () { send(c.textContent); }); });

  renderStep();
})();
