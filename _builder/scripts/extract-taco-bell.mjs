// Build-time extraction: the wiki's tree comes from its OWN directory/browse
// data (the `CATS` array on the home page), NOT from the .html files. That
// directory is the source of truth: the first column = the main category pages
// listed in the browse section; entries/folders go deeper. A node is "live" if
// it has a built page (pageUrl) — we then read that file for the hero/sections
// preview; otherwise it's a "stub" (a directory entry not built yet).
//
// Run from _builder:  node scripts/extract-taco-bell.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const TB = path.join(ROOT, 'taco-bell');
const HOME = path.join(TB, 'taco-bell.html');
const SECTION_ORDER = ['hero', 'overview', 'spec', 'config', 'os', 'timeline', 'delta', 'catalog'];
const SECTION_LABEL = { hero: 'Hero', overview: 'Overview', spec: 'Specifications', config: 'Configurations', os: 'OS support', timeline: 'Timeline', delta: 'Changes', catalog: 'Catalog' };

// 1) pull the CATS array literal off the home page and evaluate it (trusted, our content)
const homeTxt = fs.readFileSync(HOME, 'utf8');
const m = homeTxt.match(/const CATS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('Could not find CATS in taco-bell.html'); process.exit(1); }
const CATS = new Function('return ' + m[1])();

// 2) index every built page file by its basename so a pageUrl resolves to a file
const fileIndex = {};
for (const dir of [TB, path.join(TB, 'drinks'), path.join(TB, 'menus')]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) fileIndex[f] = path.join(dir, f);
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function parseFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const fmMatch = txt.match(/^---\n([\s\S]*?)\n---/);
  let fm = {};
  try { fm = fmMatch ? (yaml.load(fmMatch[1]) || {}) : {}; } catch {}
  const h = fm.hero || {};
  const ov = fm.overview || null;
  return {
    sections: SECTION_ORDER.filter((k) => fm[k] != null).map((k) => ({ type: k === 'os' ? 'lifecycle-lane' : k, label: SECTION_LABEL[k] })),
    hero: { eyebrow: h.eyebrow || null, title: h.title || null, subtitle: h.subtitle || null, subtitle_meta: h.subtitle_meta || null, desc: h.desc || null, stats: Array.isArray(h.stats) ? h.stats : [], search: !!h.search, search_placeholder: h.search_placeholder || null, spotlight: h.spotlight || null, feature: h.feature || null },
    overview: ov ? {
      tone: ov.tone || 'b',
      heading: ov.heading || '',
      paragraphs: Array.isArray(ov.paragraphs) ? ov.paragraphs : [],
      infobox: ov.infobox ? {
        label: ov.infobox.label || null, title: ov.infobox.title || '', sublabel: ov.infobox.sublabel || null,
        rows: Array.isArray(ov.infobox.rows) ? ov.infobox.rows : [], badge: ov.infobox.badge || null,
      } : null,
    } : null,
  };
}
function builtPageData(pageUrl) {
  const file = fileIndex[pageUrl];
  if (!file) return null;
  return parseFile(file);
}

// the wiki HOME page — a single, special page (hero + browse + overview canon).
// Pinned at the top of the builder's main-category column.
function homeNode(file, wikiId, name) {
  const d = parseFile(file);
  return {
    id: `${wikiId}-home`, title: name, permalink: '/' + path.basename(file), status: 'live', home: true,
    folder: false, count: null, accent: null, sections: d.sections, hero: d.hero, overview: d.overview, pages: [],
  };
}

// 3) transform a directory node (category / entry / folder) into a page node
function toNode(node) {
  const pageUrl = node.pageUrl || null;
  const built = pageUrl ? builtPageData(pageUrl) : null;
  return {
    id: pageUrl ? pageUrl.replace(/\.html$/, '') : slug(node.n || node.name),
    title: node.name || node.n,
    permalink: built ? '/' + pageUrl : null,
    status: built ? 'live' : 'stub',
    folder: !!node.isFolder,
    count: typeof node.count === 'number' ? node.count : null,
    accent: node.accent || (node.grad && node.grad[0]) || null,
    sections: built ? built.sections : [],
    hero: built ? built.hero : { eyebrow: null, title: null, subtitle: null, subtitle_meta: null, desc: null, stats: [], search: false, search_placeholder: null, spotlight: null, feature: null },
    overview: built ? built.overview : null,
    pages: (node.entries || []).map(toNode),
  };
}

const wiki = { id: 'taco-bell', name: 'Taco Bell', home: homeNode(HOME, 'taco-bell', 'Taco Bell'), pages: CATS.map(toNode) };

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'taco-bell.json'), JSON.stringify(wiki, null, 2));
const count = (ps) => ps.reduce((a, p) => a + 1 + count(p.pages), 0);
const live = (ps) => ps.reduce((a, p) => a + (p.status === 'live' ? 1 : 0) + live(p.pages), 0);
console.log(`wrote data/taco-bell.json — ${wiki.pages.length} categories, ${count(wiki.pages)} nodes, ${live(wiki.pages)} with built pages`);
