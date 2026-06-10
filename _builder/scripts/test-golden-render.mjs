// GOLDEN RENDER GUARD — byte-stability for the derived renderer. Static audits
// prove the field vocabulary agrees; this proves the BEHAVIOUR doesn't move:
// the exact HTML the pipeline produces for a fixed corpus (deterministic
// fixture docs + every live page of every wiki) is snapshotted, and any byte
// of unintended change fails the build. At millions of pages, silent renderer
// drift (a LiquidJS edge case, a projection change, an include refactor) is
// the disaster class — this catches all of it at once.
//
//   check:   node scripts/test-golden-render.mjs          (runs in `npm test`)
//   update:  npm run golden                               (after INTENTIONAL
//            canon/content edits — review the diff, commit data/golden-render.json)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { buildPolicy } from '../lib/policy.mjs';
import { createRenderer } from '../lib/render-core.mjs';

const UPDATE = process.argv.includes('--update');
const GOLDEN_PATH = 'data/golden-render.json';

const includes = JSON.parse(fs.readFileSync('data/includes.json', 'utf8'));
const grammar = JSON.parse(fs.readFileSync('data/grammar.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('data/visuals.json', 'utf8'));
const renderer = createRenderer(includes, buildPolicy(grammar), registry);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// ── corpus part 1: deterministic fixtures (content-independent — only canon
// changes move these) ─────────────────────────────────────────────────────────
const FIXTURES = {
  'fixture:blank-home': {
    isHome: true,
    doc: {
      hero: { eyebrow: null, title: 'New Wiki', subtitle: null, subtitle_meta: null, desc: null, stats: null, search: false, search_placeholder: 'Search this wiki…', spotlight: null, feature: null },
      overview: { tone: 'b', heading: 'Section heading', paragraphs: ['Write the overview here…'], infobox: null },
      sections: [],
    },
  },
  'fixture:spotlight-page': {
    isHome: false,
    doc: {
      hero: {
        eyebrow: 'E', title: 'T', subtitle: 'Sub', subtitle_meta: 'M', desc: 'D <strong>bold</strong>.',
        stats: [{ num: '1', label: 'A' }, { num: '2', label: 'B' }, { num: '3', label: 'C' }, { num: '4', label: 'D' }],
        search: false, search_placeholder: '', spotlight: { eyebrow: '★', title: 'S', desc: 'sd', tags: ['x', 'y'], cta: 'Go →' }, feature: null,
      },
      overview: { tone: 'special', heading: 'H', paragraphs: ['P1', 'P2'], infobox: { label: 'Infobox', title: 'IT', sublabel: 'SL', rows: [['K', 'V'], ['K2', 'V2']], badge: 'B' } },
      sections: [],
    },
  },
  'fixture:feature-catalog-page': {
    isHome: false,
    doc: {
      hero: {
        eyebrow: null, title: 'T2', subtitle: null, subtitle_meta: null, desc: null, stats: null,
        search: false, search_placeholder: '', spotlight: null,
        feature: { head_left: 'L', head_right: 'R', title: 'FT', desc: 'fd', chips: [{ key: 'a', val: '1' }, { key: 'b', val: '2' }, { key: 'c', val: '3' }] },
      },
      overview: { tone: 'a', heading: 'H2', paragraphs: ['P'], infobox: null },
      sections: [{ type: 'catalog', data: JSON.parse(JSON.stringify(grammar.components.catalog.seed)) }],
    },
  },
};

// ── corpus part 2: every LIVE page of every wiki, straight off extraction.
// Test-only doc mapping (raw passthrough; the goal is renderer stability for
// real data, not editor seed semantics).
function docFrom(page) {
  const h = page.hero || {};
  return {
    hero: {
      eyebrow: h.eyebrow ?? null, title: h.title || page.title || 'Untitled',
      subtitle: h.subtitle ?? null, subtitle_meta: h.subtitle_meta ?? null, desc: h.desc ?? null,
      stats: Array.isArray(h.stats) && h.stats.length ? h.stats : null,
      search: !!h.search, search_placeholder: h.search_placeholder || 'Search…',
      spotlight: h.spotlight || null, feature: !h.spotlight ? h.feature || null : null,
    },
    overview: page.overview || { tone: 'b', heading: '—', paragraphs: [], infobox: null },
    sections: Array.isArray(page.body) ? page.body : [],
  };
}
const corpus = { ...FIXTURES };
for (const wikiFile of ['data/taco-bell.json', 'data/apple.json']) {
  const wiki = JSON.parse(fs.readFileSync(wikiFile, 'utf8'));
  const walk = (ps) => ps.flatMap((p) => [p, ...walk(p.pages || [])]);
  for (const page of [wiki.home, ...walk(wiki.pages)]) {
    if (!page || page.status !== 'live') continue;
    corpus[`${wiki.id}:${page.id}`] = { isHome: !!page.home, doc: docFrom(page) };
  }
}

// ── render + compare/update ──────────────────────────────────────────────────
const fresh = {};
for (const [id, { isHome, doc }] of Object.entries(corpus)) {
  const out = renderer.renderBody(doc, isHome);
  fresh[id] = { hash: sha(out), bytes: out.length };
}

if (UPDATE) {
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify(fresh, null, 2));
  console.log(`golden updated — ${Object.keys(fresh).length} renders snapshotted → ${GOLDEN_PATH}`);
  process.exit(0);
}

if (!fs.existsSync(GOLDEN_PATH)) {
  console.error(`golden file missing (${GOLDEN_PATH}) — run \`npm run golden\` and commit it`);
  process.exit(1);
}
const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
const changed = [];
for (const id of new Set([...Object.keys(golden), ...Object.keys(fresh)])) {
  if (!golden[id]) changed.push(`${id} — NEW page (not in golden)`);
  else if (!fresh[id]) changed.push(`${id} — REMOVED (in golden, no longer rendered)`);
  else if (golden[id].hash !== fresh[id].hash) changed.push(`${id} — output changed (${golden[id].bytes} → ${fresh[id].bytes} bytes)`);
}

if (changed.length) {
  console.error('golden render guard: renderer output moved for:\n' + changed.map((c) => '  ✗ ' + c).join('\n'));
  console.error('\nIf this change is INTENTIONAL (canon/include/grammar/content edit), refresh the');
  console.error('snapshot with `npm run golden`, review, and commit data/golden-render.json.');
  process.exit(1);
}
console.log(`golden render guard: ${Object.keys(fresh).length} renders byte-stable`);
