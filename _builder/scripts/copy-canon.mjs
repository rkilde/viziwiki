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
// the universal layer + the wiki's skin (order matches the live site load order)
const FILES = ['wiki-typography.css', 'wiki-universals.css', 'wiki-taco-bell-skin.css', 'tb-editorial-base.css'];

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) { console.warn(`! missing ${f}`); continue; }
  fs.copyFileSync(src, path.join(OUT, f));
  n++;
}
console.log(`copied ${n} canonical stylesheets → public/canon/`);
