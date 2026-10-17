import fs from 'node:fs';
import vm from 'node:vm';

// public/logic.js ist ein klassisches Browser-Skript – hier in einem frischen Kontext ausführen
export function loadLogic() {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(new URL('../public/logic.js', import.meta.url), 'utf8'), ctx);
  return ctx.MMSLogic;
}
