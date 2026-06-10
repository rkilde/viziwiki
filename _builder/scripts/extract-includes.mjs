// Build-time: surface the CANONICAL Liquid includes (_includes/**) to the
// builder, so the editor canvas renders pages by EXECUTING the repo's own
// templates (via LiquidJS) instead of hand-mirrored markup. Same pattern as
// copy-canon: the repo files are the source, this emits a generated copy.
// Re-run on build (prebuild) so the builder always tracks the master format.
//
// Run from _builder:  node scripts/extract-includes.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const INC = path.join(ROOT, '_includes');

// the includes the editor renders today (hero + overview canon). Add to this
// list as more banks come into the editor.
const FILES = [
  'sections/hero.html',
  'sections/overview.html',
  'hero/stats.html',
  'hero/search.html',
  'hero/spotlight.html',
  'hero/feature.html',
  'overview/infobox.html',
  'icon.html',
];

const out = { includes: {}, sprite: '' };
for (const f of FILES) {
  out.includes[f] = fs.readFileSync(path.join(INC, f), 'utf8');
}
// the universal icon sprite — injected once into the canvas <body> so the
// includes' <use href="#ic-NAME"> references resolve.
out.sprite = fs.readFileSync(path.join(INC, 'icon-sprite.html'), 'utf8');

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'includes.json'), JSON.stringify(out));
console.log(`wrote data/includes.json — ${FILES.length} canonical includes + icon sprite`);
