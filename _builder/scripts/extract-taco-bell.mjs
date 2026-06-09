// Build-time extraction: reads the real Taco Bell pages from the repo and emits
// _builder/data/taco-bell.json (the wiki → categories → pages tree the Miller
// column view consumes). Run from _builder:  node scripts/extract-taco-bell.mjs
// This is a stand-in for ContentStore.listWikis/listPages reading git; later the
// same shape comes from Supabase. Re-run when the TB pages change.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');     // repo root, from _builder/
const TB = path.join(ROOT, 'taco-bell');
const SECTION_ORDER = ['hero', 'overview', 'spec', 'config', 'os', 'timeline', 'delta', 'catalog'];
const SECTION_LABEL = { hero: 'Hero', overview: 'Overview', spec: 'Specifications', config: 'Configurations', os: 'OS support', timeline: 'Timeline', delta: 'Changes', catalog: 'Catalog' };

// the real TB structure → Miller categories
const STRUCTURE = [
  { id: 'home', title: 'Home', files: [{ f: 'taco-bell.html' }] },
  { id: 'drinks', title: 'Drinks', files: [
    { f: 'taco-bell-drinks.html', children: [
      'drinks/taco-bell-spiked-lemonade.html',
      'drinks/taco-bell-brisk-raspberry.html',
      'drinks/taco-bell-sangrita-blast.html',
      'drinks/taco-bell-pina-colada-frutista.html',
    ] },
    { f: 'taco-bell-discontinued-drinks.html' },
  ] },
  { id: 'menus', title: 'Menus', files: [
    { f: 'taco-bell-menus.html', children: [
      'menus/taco-bell-menu-big-bell-value.html',
      'menus/taco-bell-menu-luxe-value.html',
      'menus/taco-bell-menu-cantina-chicken.html',
      'menus/taco-bell-menu-fresco.html',
      'menus/taco-bell-menu-2-dollar-deals.html',
    ] },
  ] },
  { id: 'sauces', title: 'Sauces', files: [{ f: 'taco-bell-sauces.html' }] },
  { id: 'slogans', title: 'Slogans', files: [{ f: 'taco-bell-slogans.html' }] },
];

function frontMatter(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  try { return yaml.load(m[1]) || {}; } catch { return {}; }
}

function cleanTitle(fm) {
  if (fm.hero && fm.hero.title) return fm.hero.title;
  let t = fm.title || 'Untitled';
  return t.split('·')[0].split(' — ')[0].trim();
}

function buildPage(relFile) {
  const fm = frontMatter(path.join(TB, relFile));
  const sections = SECTION_ORDER.filter((k) => fm[k] != null)
    .map((k) => ({ type: k === 'os' ? 'lifecycle-lane' : k, label: SECTION_LABEL[k] }));
  const h = fm.hero || {};
  return {
    id: relFile.replace(/\.html$/, '').replace(/.*\//, ''),
    title: cleanTitle(fm),
    permalink: fm.permalink || null,
    status: 'live',
    sections,
    hero: {
      eyebrow: h.eyebrow || null,
      title: h.title || null,
      subtitle: h.subtitle || null,
      subtitle_meta: h.subtitle_meta || null,
      desc: h.desc || null,
      stats: Array.isArray(h.stats) ? h.stats : [],
    },
    pages: [],
  };
}

const wiki = {
  id: 'taco-bell',
  name: 'Taco Bell',
  categories: STRUCTURE.map((cat) => ({
    id: cat.id,
    title: cat.title,
    status: 'live',
    pages: cat.files.map((entry) => {
      const page = buildPage(entry.f);
      if (entry.children) page.pages = entry.children.map(buildPage);
      return page;
    }),
  })),
};

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'taco-bell.json'), JSON.stringify(wiki, null, 2));
const n = wiki.categories.reduce((a, c) => a + c.pages.reduce((b, p) => b + 1 + p.pages.length, 0), 0);
console.log(`wrote data/taco-bell.json — ${wiki.categories.length} categories, ${n} pages`);
