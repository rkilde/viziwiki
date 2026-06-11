// Single-source CSS pipeline: copy the CANONICAL stylesheets from the repo into
// the builder so the editor canvas renders with the exact same CSS as the live
// site. Re-run on build → the build kit always tracks the master format (change
// the stat grid in wiki-universals.css → both the live site and the builder
// update). These are COPIES, never hand-edited — the repo files are the source.
//
// Run from _builder:  node scripts/copy-canon.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const OUT = path.join(process.cwd(), 'public', 'canon');
// the universal layer + every wiki's skin (order matches the live site load
// order). The BANK stylesheets are NOT listed — they're discovered (every
// `bank-*.css` at the repo root is a bank's single-source stylesheet), so a new
// bank's CSS is picked up with zero edits here. The discovered list is written
// to data/bank-css.json and loaded by the canvas (lib/canvas.ts) in order.
const BASE = ['wiki-typography.css', 'wiki-universals.css', 'wiki-taco-bell-skin.css', 'tb-editorial-base.css', 'wiki-apple-skin.css', 'wiki-base-skin.css'];
const BANK = fs.readdirSync(ROOT).filter((f) => /^bank-.*\.css$/.test(f)).sort();

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const f of [...BASE, ...BANK]) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.warn(`! missing ${f}`); continue; }
  fs.copyFileSync(src, path.join(OUT, f));
  n++;
}
// manifest of bank stylesheets → the canvas links these (derived, not restated)
fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'bank-css.json'), JSON.stringify(BANK, null, 2));
console.log(`copied ${n} canonical stylesheets → public/canon/ (${BANK.length} bank stylesheets, discovered)`);
