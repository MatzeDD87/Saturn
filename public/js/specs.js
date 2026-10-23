// Gemeinsame Datenblatt-Zeilen für Detailansicht und Vergleich.
// [Label, Wert-Funktion, Unsicherheits-Schlüssel, Vergleichsrichtung (+1 höher besser, -1 niedriger besser)]
import * as D from './data.js';

const camLine = (mp, extra) => (mp ? `${mp} MP${extra ? ' ' + extra : ''}` : '–');

export const SPEC_GROUPS = [
  ['Preis & Marktstart', [
    ['UVP ab', (p) => D.price(p.uvp), 'uvp', -1, (p) => p.uvp],
    ['Speicher & UVP', (p) => D.storagePrices(p).map((s) => `${D.storageLabel(s.gb)}${s.uvp ? ': ' + D.price(s.uvp) : ''}`).join(' · ') || D.NA, 'uvp_by_storage'],
    ['Marktstart', (p) => D.releaseLabel(p.release), 'release'],
  ]],
  ['Display', [
    ['Größe', (p) => `${D.inch(p.display.size_in)}${D.cm(p.display.size_in) ? ` (${D.cm(p.display.size_in)})` : ''}${p.foldable && p.cover_display_in ? ` · außen ${D.inch(p.cover_display_in)}` : ''}`, 'display.size_in', +1, (p) => p.display.size_in],
    ['Technik', (p) => D.text(p.display.type), 'display.type'],
    ['Auflösung', (p) => D.text(p.display.resolution), 'display.resolution'],
    ['Bildwiederholrate', (p) => D.unit(p.display.hz, 'Hz'), 'display.hz', +1, (p) => p.display.hz],
    ['Spitzenhelligkeit', (p) => D.unit(p.display.peak_nits, 'nits'), 'display.peak_nits', +1, (p) => p.display.peak_nits],
    ['Faltbar', (p) => D.yesNo(p.foldable), 'foldable'],
  ]],
  ['Leistung', [
    ['Prozessor', (p) => D.text(p.chip), 'chip'],
    ['Arbeitsspeicher', (p) => D.list(p.ram_gb, 'GB'), 'ram_gb', +1, (p) => Math.max(0, ...p.ram_gb)],
    ['Speicher', (p) => D.list(p.storage_gb, 'storage'), 'storage_gb', +1, (p) => Math.max(0, ...p.storage_gb)],
  ]],
  ['Kamera', [
    ['Hauptkamera', (p) => camLine(p.camera.main_mp), 'camera.main_mp', +1, (p) => p.camera.main_mp],
    ['Ultraweitwinkel', (p) => camLine(p.camera.ultrawide_mp), 'camera.ultrawide_mp'],
    ['Tele', (p) => (p.camera.tele_mp || p.camera.tele_zoom ? [p.camera.tele_mp ? `${p.camera.tele_mp} MP` : '', p.camera.tele_zoom || ''].filter(Boolean).join(' · ') : 'Kein Tele'), 'camera.tele_mp', +1, (p) => D.teleFactor(p)],
    ['Frontkamera', (p) => camLine(p.camera.front_mp), 'camera.front_mp'],
    ['Zusammenfassung', (p) => D.text(p.camera.summary), 'camera.summary'],
  ]],
  ['Akku & Laden', [
    ['Akku', (p) => D.unit(p.battery_mah, 'mAh'), 'battery_mah', +1, (p) => p.battery_mah],
    ['Laden mit Kabel', (p) => D.unit(p.charging.wired_w, 'W'), 'charging.wired_w', +1, (p) => p.charging.wired_w],
    ['Kabellos', (p) => (p.charging.wireless_w ? `${D.num(p.charging.wireless_w)} W` : p.charging.wireless_w === 0 ? 'Nein' : D.NA), 'charging.wireless_w', +1, (p) => p.charging.wireless_w],
    ['Hinweis', (p) => D.text(p.charging.note), 'charging.note'],
  ]],
  ['Software', [
    ['System', (p) => `${D.text(p.os)}${p.os_launch ? ` (ab Werk ${p.os_launch})` : ''}`, 'os_launch'],
    ['Updates', (p) => (p.updates_years ? `${p.updates_years} Jahre${p.updates_note ? ' – ' + p.updates_note : ''}` : D.text(p.updates_note)), 'updates_years', +1, (p) => p.updates_years],
  ]],
  ['Gehäuse & Verbindungen', [
    ['Schutzklasse', (p) => D.text(p.ip), 'ip'],
    ['Gewicht', (p) => D.unit(p.weight_g, 'g'), 'weight_g', -1, (p) => p.weight_g],
    ['Maße', (p) => (p.dimensions_mm ? `${p.dimensions_mm}${/mm/.test(p.dimensions_mm) ? '' : ' mm'}` : D.NA), 'dimensions_mm'],
    ['5G', (p) => D.yesNo(p.five_g), 'five_g'],
    ['SIM', (p) => D.text(p.esim), 'esim'],
    ['Farben', (p) => p.colors.map((c) => c.name).join(', ') || D.NA, 'colors'],
  ]],
];

// Feld als unsicher markiert? (Farbcodes der Swatches zählen nicht als Datenblatt-Unsicherheit.)
export function unc(p, key) {
  const leaf = key.split('.').pop();
  return p.uncertain.some((u) => u !== 'colors.hex' && (u === key || u === leaf || key.startsWith(u + '.') || u.startsWith(key + '.')));
}
export const UNC_MARK = '<span class="uns-mark" title="Wert nicht vollständig vom Hersteller bestätigt">*</span>';
