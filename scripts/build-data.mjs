#!/usr/bin/env node
// Merges the researched device files (data/parts/*.json) into public/data/phones.json
// and the image source tables (data/parts/*.sources.md) into data/image_sources.md.
// Usage: npm run build:data   (no dependencies, Node >= 18)
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = join(ROOT, 'data', 'parts');
const PUBLIC = join(ROOT, 'public');
const OUT_JSON = join(PUBLIC, 'data', 'phones.json');
const OUT_SOURCES = join(ROOT, 'data', 'image_sources.md');

const BRAND_ORDER = ['Apple', 'Samsung', 'Google', 'Xiaomi', 'OnePlus', 'Motorola', 'Nothing', 'Sony',
  'Honor', 'Oppo', 'Fairphone', 'HMD'];
const REQUIRED = { id: 'string', brand: 'string', name: 'string', os: 'string' };
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let warnings = 0;
const warn = (msg) => { warnings++; console.warn(`  ! ${msg}`); };
const exists = (p) => access(p).then(() => true, () => false);

function validate(d, file) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) { warn(`${file}: Eintrag ist kein Objekt – übersprungen`); return false; }
  for (const [k, type] of Object.entries(REQUIRED)) {
    if (typeof d[k] !== type || !d[k].trim()) { warn(`${file}: ${d.id || '(ohne id)'} – Pflichtfeld "${k}" fehlt – übersprungen`); return false; }
  }
  if (!ID_RE.test(d.id)) { warn(`${file}: id "${d.id}" ist nicht kebab-case – übersprungen`); return false; }
  if (!['iOS', 'Android'].includes(d.os)) warn(`${file}: ${d.id} – os "${d.os}" ist weder iOS noch Android`);
  if (d.uvp != null && (!Number.isFinite(d.uvp) || d.uvp <= 0)) { warn(`${file}: ${d.id} – uvp ungültig, auf null gesetzt`); d.uvp = null; }
  if (d.uvp == null) warn(`${file}: ${d.id} – keine UVP`);
  if (!BRAND_ORDER.includes(d.brand)) warn(`${file}: ${d.id} – Marke "${d.brand}" nicht in der Markenliste (wird hinten einsortiert)`);
  return true;
}

async function checkImages(d) {
  const images = Array.isArray(d.images) ? d.images : [];
  const colors = Array.isArray(d.image_colors) ? d.image_colors : [];
  const keptImages = [], keptColors = [];
  for (let i = 0; i < images.length; i++) {
    const src = images[i];
    if (typeof src !== 'string' || src.includes('..') || /^[a-z]+:/i.test(src)) { warn(`${d.id}: ungültiger Bildpfad ${JSON.stringify(src)} entfernt`); continue; }
    if (await exists(join(PUBLIC, src))) { keptImages.push(src); keptColors.push(colors[i] ?? null); }
    else warn(`${d.id}: Bild fehlt (${src}) – entfernt`);
  }
  d.images = keptImages;
  d.image_colors = keptColors;
  if (!keptImages.length) warn(`${d.id}: kein Bild vorhanden – App zeigt Platzhalter`);
}

const brandRank = (b) => { const i = BRAND_ORDER.indexOf(b); return i === -1 ? BRAND_ORDER.length : i; };

async function main() {
  const files = (await readdir(PARTS).catch(() => [])).sort();
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const mdFiles = files.filter((f) => f.endsWith('.sources.md'));
  if (!jsonFiles.length) { console.error(`Keine Dateien in ${PARTS} gefunden – phones.json bleibt unverändert.`); process.exit(1); }

  const byId = new Map();
  for (const f of jsonFiles) {
    let parsed;
    try { parsed = JSON.parse(await readFile(join(PARTS, f), 'utf8')); }
    catch (e) { warn(`${f}: kein gültiges JSON (${e.message}) – Datei übersprungen`); continue; }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    let n = 0;
    for (const d of list) {
      if (!validate(d, f)) continue;
      if (byId.has(d.id)) { warn(`${f}: doppelte id "${d.id}" – erster Eintrag bleibt`); continue; }
      byId.set(d.id, d); n++;
    }
    console.log(`  ${f}: ${n} Geräte`);
  }

  const phones = [...byId.values()];
  for (const d of phones) await checkImages(d);
  phones.sort((a, b) => brandRank(a.brand) - brandRank(b.brand) || a.brand.localeCompare(b.brand)
    || (b.uvp ?? -1) - (a.uvp ?? -1) || a.name.localeCompare(b.name));

  await writeFile(OUT_JSON, JSON.stringify(phones, null, 2) + '\n');

  let md = '# Bildquellen\n\nProduktbilder: Hersteller (Presse- und Produktbilder) bzw. Wikimedia Commons. ' +
    'Alle Rechte liegen bei den jeweiligen Rechteinhabern; Lizenzangaben siehe Tabelle.\n' +
    `Automatisch erzeugt von scripts/build-data.mjs am ${new Date().toISOString().slice(0, 10)}.\n`;
  for (const f of mdFiles) md += `\n<!-- ${f} -->\n${(await readFile(join(PARTS, f), 'utf8')).trim()}\n`;
  await writeFile(OUT_SOURCES, md);

  const imgCount = phones.reduce((s, d) => s + d.images.length, 0);
  console.log(`\n${phones.length} Geräte, ${imgCount} Bilder -> public/data/phones.json`);
  console.log(`${mdFiles.length} Quelldateien -> data/image_sources.md`);
  if (warnings) console.log(`${warnings} Warnung(en), siehe oben.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
