// Generate the FULL Lucide icon library for the builder's pickers —
// data/lucide-library.json: every icon's name, official search TAGS, and
// vector body. DERIVED from the pinned `lucide-static` package (the version
// in package.json is the single source — upgrade the dep, re-run gen, the
// whole library moves). The canon page sprite (_includes/icon-sprite.html)
// stays CURATED — this library is builder-side scope; an icon picked from it
// that is not in the sprite renders INLINE (the feed carries its body), so
// live surfaces work with zero sprite edits.
//
// Run from _builder:  node scripts/gen-lucide.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkgRoot = path.dirname(require.resolve('lucide-static/package.json'));
const version = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).version;
const tags = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'tags.json'), 'utf8'));
const iconsDir = path.join(pkgRoot, 'icons');

const inner = (svg) => svg
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>[\s\S]*$/, '')
  .replace(/\n\s*/g, '')
  .trim();

const icons = [];
for (const f of fs.readdirSync(iconsDir).sort()) {
  if (!f.endsWith('.svg')) continue;
  const name = f.slice(0, -4);
  icons.push({ n: name, t: tags[name] || [], b: inner(fs.readFileSync(path.join(iconsDir, f), 'utf8')) });
}

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'lucide-library.json'),
  JSON.stringify({ version, icons }));
const kb = Math.round(fs.statSync(path.join(process.cwd(), 'data', 'lucide-library.json')).size / 1024);
console.log(`wrote data/lucide-library.json — ${icons.length} icons (lucide-static ${version}), ${kb}KB`);
