// Vergleich von bis zu 3 Geräten mit Hervorhebung der Bestwerte.
import { icon } from '../icons.js';
import * as D from '../data.js';
import * as S from '../store.js';
import { esc, img, emptyState, $ } from '../ui.js';
import { SPEC_GROUPS, unc, UNC_MARK } from '../specs.js';

export function render(el, { query }) {
  const q = new URLSearchParams(query || '');
  if (q.get('ids')) {
    S.setCompare(q.get('ids').split(',').filter((id) => D.get(id)));
    history.replaceState(null, '', '#/vergleich');
  }
  let onlyDiff = false;

  function draw() {
    const list = S.compare().map(D.get).filter(Boolean);
    if (!list.length) {
      el.innerHTML = `<div class="wrap"><h1>Vergleich</h1>${emptyState('Noch nichts im Vergleich',
        `Tippe in der Geräteliste auf ${icon('compare', { size: 16 })}, um bis zu ${S.MAX_COMPARE} Smartphones nebeneinanderzustellen.`,
        '<a class="btn red" href="#/geraete">Geräte auswählen</a><a class="btn ghost" href="#/berater">Berater starten</a>', 'compare')}</div>`;
      return;
    }
    const cols = list.length;
    const head = list.map((p) => `<th scope="col"><div class="cmp-head">
        <a href="#/geraet/${esc(p.id)}">${p.images[0] ? img(p.images[0], p.fullName) : '<div class="ph"></div>'}</a>
        <span class="card-brand">${esc(p.brand)}</span><a href="#/geraet/${esc(p.id)}" style="font-weight:800;text-decoration:none">${esc(p.name)}</a>
        <span class="price" style="font-size:18px">${esc(D.price(p.uvp))}</span>
        <button class="btn ghost sm" data-rm="${esc(p.id)}" aria-label="${esc(p.name)} entfernen">${icon('trash', { size: 14 })} Entfernen</button></div></th>`).join('')
      + (cols < S.MAX_COMPARE ? `<th scope="col"><a class="cmp-add" href="#/geraete">${icon('plus', { size: 28 })}Gerät hinzufügen</a></th>` : '');

    let body = '';
    for (const [g, rows] of SPEC_GROUPS) {
      let rowsHtml = '';
      for (const [label, fn, key, dir, val] of rows) {
        const vals = list.map(fn);
        if (onlyDiff && cols > 1 && vals.every((v) => v === vals[0])) continue;
        let best = new Set();
        if (dir && val && cols > 1) {
          const nums = list.map((p) => { const v = val(p); return Number.isFinite(v) && v > 0 ? v : null; });
          const valid = nums.filter((v) => v != null);
          if (valid.length > 1 && new Set(valid).size > 1) {
            const b = dir > 0 ? Math.max(...valid) : Math.min(...valid);
            nums.forEach((v, i) => { if (v === b) best.add(i); });
          }
        }
        rowsHtml += `<tr><th scope="row">${esc(label)}</th>${list.map((p, i) => `<td class="${best.has(i) ? 'best' : ''}">${esc(vals[i])}${unc(p, key) ? ' ' + UNC_MARK : ''}</td>`).join('')}${cols < S.MAX_COMPARE ? '<td></td>' : ''}</tr>`;
      }
      if (rowsHtml) body += `<tr class="grp"><th colspan="${S.MAX_COMPARE + 1}" scope="colgroup">${esc(g)}</th></tr>${rowsHtml}`;
    }
    el.innerHTML = `<div class="wrap">
      <nav class="crumbs" aria-label="Brotkrumen"><a href="#/start">Start</a> › Vergleich</nav>
      <div class="cat-head"><h1 style="margin:0">Vergleich <span class="muted" style="font-size:.6em">${cols} von ${S.MAX_COMPARE}</span></h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="check"><input type="checkbox" id="diff" ${onlyDiff ? 'checked' : ''}> Nur Unterschiede</label>
        <button class="btn ghost sm" id="clear">${icon('trash', { size: 14 })} Alle entfernen</button></div></div>
      <p class="small muted">${icon('star', { size: 14 })} Grün markiert = bester Wert in dieser Zeile (z. B. größter Akku, niedrigster Preis). <span class="uns-mark">*</span> = nicht vollständig bestätigt.</p>
      <div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"><span class="sr-only">Merkmal</span></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.rm) { S.toggleCompare(b.dataset.rm); }
    else if (b.id === 'clear') { S.setCompare([]); }
  });
  el.addEventListener('change', (e) => { if (e.target.id === 'diff') { onlyDiff = e.target.checked; draw(); } });
  const off = S.onChange((k) => { if (k === 'compare') draw(); });
  draw();
  return off;
}
