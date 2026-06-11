// Build-time: surface the CANONICAL Liquid includes (_includes/**) to the
// builder, so the editor canvas renders pages by EXECUTING the repo's own
// templates (via LiquidJS) instead of hand-mirrored markup. Same pattern as
// copy-canon: the repo files are the source, this emits a generated copy.
// Re-run on build (prebuild) so the builder always tracks the master format.
//
// DERIVED, not listed (CLAUDE.md standing rule #5): the set of includes the
// builder needs is NOT a hand-maintained list. We seed ROOTS from the visual
// registry (_data/visuals.yml — every `partial:` / `.html` path it declares)
// and then crawl the canon's OWN `{% include %}` graph transitively. So adding
// a bank = add its registry entry + write its include files; this script pulls
// the whole chain automatically (the bug it prevents: a section that the picker
// can add but the renderer can't find — see test-derived-renderer case 8).
//
// Run from _builder:  node scripts/extract-includes.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const INC = path.join(ROOT, '_includes');
const reg = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'visuals.yml'), 'utf8'));

// ROOTS = every include path the registry declares (section frames, their named
// parts, and the visual partials). Anywhere in the registry a string value ends
// in `.html`, it names a canonical template the builder renders.
function collectRoots(node, out) {
  if (!node || typeof node !== 'object') return out;
  for (const v of Object.values(node)) {
    if (typeof v === 'string' && /\.html$/.test(v)) out.add(v);
    else if (v && typeof v === 'object') collectRoots(v, out);
  }
  return out;
}

// literal `{% include path … %}` targets only — dynamic `{% include {{var}} %}`
// (e.g. hero's optional chrome) is skipped, exactly as the old hand list did.
function includesIn(src) {
  const re = /\{%-?\s*include\s+([^\s%{}]+)/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

const want = new Set();
const queue = [...collectRoots(reg, new Set())];
const missing = [];
while (queue.length) {
  const f = queue.shift();
  if (want.has(f)) continue;
  const full = path.join(INC, f);
  if (!fs.existsSync(full)) { missing.push(f); continue; }
  want.add(f);
  for (const dep of includesIn(fs.readFileSync(full, 'utf8'))) {
    if (!want.has(dep)) queue.push(dep);
  }
}
if (missing.length) {
  // a declared partial (or something it includes) doesn't exist on disk — fail
  // the build rather than ship a bank the renderer can't resolve.
  console.error(`✗ extract-includes: missing canonical include(s):\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const out = { includes: {}, sprite: '' };
for (const f of [...want].sort()) out.includes[f] = fs.readFileSync(path.join(INC, f), 'utf8');
// the universal icon sprite — injected once into the canvas <body> so the
// includes' <use href="#ic-NAME"> references resolve.
out.sprite = fs.readFileSync(path.join(INC, 'icon-sprite.html'), 'utf8');

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'includes.json'), JSON.stringify(out));
console.log(`wrote data/includes.json — ${want.size} canonical includes (registry-derived) + icon sprite`);
