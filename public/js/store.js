// Merkliste & Vergleichsauswahl (localStorage) mit einfachem Änderungs-Event.
export const MAX_COMPARE = 3;
const KEYS = { saved: 'sb.saved.v1', compare: 'sb.compare.v1' };
const listeners = new Set();

function read(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  catch { return []; }
}
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* privater Modus */ } }

const state = { saved: read(KEYS.saved), compare: read(KEYS.compare).slice(0, MAX_COMPARE) };

const emit = (what) => listeners.forEach((fn) => fn(what));
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const saved = () => [...state.saved];
export const isSaved = (id) => state.saved.includes(id);
export function toggleSaved(id) {
  state.saved = isSaved(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id];
  write(KEYS.saved, state.saved); emit('saved');
  return isSaved(id);
}

export const compare = () => [...state.compare];
export const inCompare = (id) => state.compare.includes(id);
/** @returns {'added'|'removed'|'full'} */
export function toggleCompare(id) {
  if (inCompare(id)) state.compare = state.compare.filter((x) => x !== id);
  else if (state.compare.length >= MAX_COMPARE) return 'full';
  else state.compare = [...state.compare, id];
  write(KEYS.compare, state.compare); emit('compare');
  return inCompare(id) ? 'added' : 'removed';
}
export function setCompare(ids) {
  state.compare = [...new Set(ids)].slice(0, MAX_COMPARE);
  write(KEYS.compare, state.compare); emit('compare');
}
// Unbekannte IDs (z. B. nach Datenaktualisierung) entfernen.
export function prune(validIds) {
  const ok = (id) => validIds.has(id);
  const s = state.saved.filter(ok), c = state.compare.filter(ok);
  if (s.length !== state.saved.length) { state.saved = s; write(KEYS.saved, s); }
  if (c.length !== state.compare.length) { state.compare = c; write(KEYS.compare, c); }
}
