// Build-time extraction for the Apple wiki. Like the Taco Bell extractor, the
// hierarchy comes from the wiki's OWN directory data — here the `TREE` + `LABELS`
// objects on apple/apple.html — NOT from the .html files. `TREE.root` is the
// first column (product lines + app categories + iOS); a node with a `key`
// expands into `TREE[key]` (a deeper column); a node with an `href` is a built
// page (we read it for the hero/overview preview), otherwise it's a "stub".
// The iPhone branch uses a {gen, models[]} shape — gens become folders.
//
// Run from _builder:  node scripts/extract-apple.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { extractPageEmblem } from '../lib/page-emblem.mjs';

const ROOT = path.resolve(process.cwd(), '..');
const AP = path.join(ROOT, 'apple');
const HOME = path.join(AP, 'apple.html');
// the REAL layout order from _layouts/class-ipod-touch.html (hero, overview,
// photo rail, timeline, delta, config, gaming, [jailbreak — legacy, not
// carried], budget, design, os, controversies, spec)
const SECTION_ORDER = ['hero', 'overview', 'photo_rail', 'timeline', 'delta', 'config', 'gaming', 'budget', 'design', 'os', 'controversies', 'spec', 'catalog'];
const SECTION_LABEL = { hero: 'Hero', overview: 'Overview', photo_rail: 'Photos', spec: 'Specifications', config: 'Configurations', gaming: 'Cultural impact', os: 'OS support', timeline: 'Timeline', delta: 'Changes', catalog: 'Catalog', budget: 'Market positioning', design: 'Industrial design', controversies: 'Controversies' };
// front-matter key → canonical section TYPE where they differ (the key is the
// page's name for the block; the type is the bank that renders it)
const KEY_TYPE = { os: 'lifecycle-lane', photo_rail: 'photo-rail', gaming: 'prose-rail', budget: 'prose-rail', design: 'prose-rail', controversies: 'prose-rail' };

// 1) pull the TREE + LABELS object literals off the home page (trusted, our content)
const homeTxt = fs.readFileSync(HOME, 'utf8');
const grab = (name) => {
  const m = homeTxt.match(new RegExp('const ' + name + '\\s*=\\s*(\\{[\\s\\S]*?\\});'));
  if (!m) { console.error(`Could not find ${name} in apple.html`); process.exit(1); }
  return new Function('return ' + m[1])();
};
const LABELS = grab('LABELS');
const TREE = grab('TREE');

// 2) index every built page file by basename so an href resolves to a file
const fileIndex = {};
for (const dir of [AP, path.join(AP, 'ipod-touch')]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) fileIndex[f] = path.join(dir, f);
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function parseFile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const fmMatch = txt.match(/^---\n([\s\S]*?)\n---/);
  let fm = {};
  try { fm = fmMatch ? (yaml.load(fmMatch[1]) || {}) : {}; } catch {}
  const h = fm.hero || {};
  const ov = fm.overview || null;
  // contributor-added body sections (beyond the locked hero+overview) the
  // editor can render today — carried verbatim (canonical front-matter shape)
  // EVERY canonized body section rides into the editable doc (all these banks
  // have builder editors — cases 9-15). Order follows SECTION_ORDER, i.e. the
  // page's real layout order, so the builder shows the page as the live site
  // lays it out.
  const BODY_TYPES = ['photo_rail', 'spec', 'config', 'gaming', 'os', 'timeline', 'delta', 'catalog', 'budget', 'design', 'controversies'];
  return {
    // the page's EMBLEM (WIKI_TOC.pageLogo) — lifted into master-media art
    icon: extractPageEmblem(txt),
    sections: SECTION_ORDER.filter((k) => fm[k] != null).map((k) => ({ type: KEY_TYPE[k] || k, label: SECTION_LABEL[k] })),
    body: SECTION_ORDER.filter((k) => BODY_TYPES.includes(k) && fm[k] != null).map((k) => ({ type: KEY_TYPE[k] || k, data: fm[k] })),
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
function builtPageData(href) {
  const file = fileIndex[href];
  if (!file) return null;
  return parseFile(file);
}

// the wiki HOME page — a single, special page (hero + browse + overview canon).
// Pinned at the top of the builder's main-category column.
function homeNode(file, wikiId, name) {
  const d = parseFile(file);
  return {
    id: `${wikiId}-home`, title: name, permalink: '/' + path.basename(file), status: 'live', home: true,
    folder: false, count: null, accent: null, icon: d.icon, sections: d.sections, body: d.body, hero: d.hero, overview: d.overview, pages: [],
  };
}

const EMPTY_HERO = { eyebrow: null, title: null, subtitle: null, subtitle_meta: null, desc: null, stats: [], search: false, search_placeholder: null, spotlight: null, feature: null };

// 3) transform a TREE node into a page node. Two shapes:
//    standard {name, range, key?, href?, …}  ·  gen {gen, date, models[]}
function toNode(node) {
  // iPhone gen-format: a folder of model leaves
  if (node.models) {
    return {
      id: slug(node.gen), title: node.gen, permalink: null, status: 'stub', folder: true,
      count: node.models.length, accent: null, sections: [], hero: EMPTY_HERO, overview: null,
      pages: node.models.map((mdl) => ({
        id: slug(mdl.name), title: mdl.name, permalink: null, status: 'stub', folder: false,
        count: null, accent: null, sections: [], hero: EMPTY_HERO, overview: null, pages: [],
      })),
    };
  }
  const href = node.href || null;
  const built = href ? builtPageData(href) : null;
  // children come from a `key` reference into TREE
  const childArr = node.key && Array.isArray(TREE[node.key]) ? TREE[node.key] : [];
  const children = childArr.map(toNode);
  return {
    id: built ? href.replace(/\.html$/, '') : (node.key || slug(node.name)),
    title: node.name,
    permalink: built ? '/' + href : null,
    status: built ? 'live' : 'stub',
    folder: children.length > 0,
    count: children.length || null,
    accent: null,
    icon: built ? built.icon : null,
    sections: built ? built.sections : [],
    body: built ? built.body : [],
    hero: built ? built.hero : EMPTY_HERO,
    overview: built ? built.overview : null,
    pages: children,
  };
}

const wiki = { id: 'apple', name: LABELS.root || 'Apple', home: homeNode(HOME, 'apple', LABELS.root || 'Apple'), pages: TREE.root.map(toNode) };

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'apple.json'), JSON.stringify(wiki, null, 2));
const count = (ps) => ps.reduce((a, p) => a + 1 + count(p.pages), 0);
const live = (ps) => ps.reduce((a, p) => a + (p.status === 'live' ? 1 : 0) + live(p.pages), 0);
console.log(`wrote data/apple.json — ${wiki.pages.length} top-level, ${count(wiki.pages)} nodes, ${live(wiki.pages)} with built pages`);
