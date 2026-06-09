// Build-time extraction: reads the real Taco Bell pages from the repo and emits
// _builder/data/taco-bell.json (the wiki -> pages tree the Miller view consumes).
//
// HIERARCHY IS DERIVED, NOT HARD-CODED: top-level pages are taco-bell/*.html;
// a detail page (in a subfolder) nests under whichever top-level page LINKS to
// its permalink. (The current Jekyll pages carry no explicit parent field, so a
// cross-link is the only real signal. Once content lives in the builder's data
// model, parentage is an explicit property and this derivation goes away.)
//
// Run from _builder:  node scripts/extract-taco-bell.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const TB = path.join(ROOT, 'taco-bell');
const SUBDIRS = ['drinks', 'menus'];
const SECTION_ORDER = ['hero', 'overview', 'spec', 'config', 'os', 'timeline', 'delta', 'catalog'];
const SECTION_LABEL = { hero: 'Hero', overview: 'Overview', spec: 'Specifications', config: 'Configurations', os: 'OS support', timeline: 'Timeline', delta: 'Changes', catalog: 'Catalog' };

const read = (f) => fs.readFileSync(f, 'utf8');
const frontMatter = (txt) => {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try { return yaml.load(m[1]) || {}; } catch { return {}; }
};
const cleanTitle = (fm) => fm.hero?.title || (fm.title || 'Untitled').split('·')[0].split(' — ')[0].trim();

function pageObj(relFile, txt) {
  const fm = frontMatter(txt);
  const h = fm.hero || {};
  return {
    id: relFile.replace(/\.html$/, '').replace(/.*\//, ''),
    title: cleanTitle(fm),
    permalink: fm.permalink || null,
    status: 'live',
    sections: SECTION_ORDER.filter((k) => fm[k] != null).map((k) => ({ type: k === 'os' ? 'lifecycle-lane' : k, label: SECTION_LABEL[k] })),
    hero: {
      eyebrow: h.eyebrow || null, title: h.title || null, subtitle: h.subtitle || null,
      subtitle_meta: h.subtitle_meta || null, desc: h.desc || null,
      stats: Array.isArray(h.stats) ? h.stats : [],
    },
    pages: [],
    _raw: txt,
  };
}

// top-level pages (taco-bell/*.html)
const tops = fs.readdirSync(TB).filter((f) => f.endsWith('.html'))
  .map((f) => pageObj(f, read(path.join(TB, f))));

// detail pages (subfolders)
const details = SUBDIRS.flatMap((sub) => {
  const dir = path.join(TB, sub);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => pageObj(`${sub}/${f}`, read(path.join(dir, f)))) : [];
});

// nest each detail under the top page whose content LINKS to its permalink/slug
for (const d of details) {
  const needle = d.permalink || `/${d.id}.html`;
  const parent = tops.find((t) => t._raw.includes(needle)) || tops.find((t) => t._raw.includes(d.id));
  if (parent) parent.pages.push(d);
  else { console.warn(`! no linking parent for ${d.id} — left at top level`); tops.push(d); }
}

// home first, then by title
tops.sort((a, b) => (a.id === 'taco-bell' ? -1 : b.id === 'taco-bell' ? 1 : a.title.localeCompare(b.title)));

const strip = (p) => { const { _raw, ...rest } = p; rest.pages = rest.pages.map(strip); return rest; };
const wiki = { id: 'taco-bell', name: 'Taco Bell', pages: tops.map(strip) };

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'taco-bell.json'), JSON.stringify(wiki, null, 2));
const count = (ps) => ps.reduce((a, p) => a + 1 + count(p.pages), 0);
console.log(`wrote data/taco-bell.json — ${wiki.pages.length} top-level, ${count(wiki.pages)} pages total`);
