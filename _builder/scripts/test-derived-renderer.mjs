// Smoke test for the DERIVED renderer pipeline: render docs through the
// repo's actual Liquid includes (the REAL lib/render-core.mjs — no fixture
// copy), run the decorator over the result in jsdom, and assert the editing
// affordances landed in their canonical positions AND that policy is truly
// computed from grammar (flipping a grammar rule changes builder behaviour).
//
// Run from _builder:  node scripts/test-derived-renderer.mjs
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { buildPolicy } from '../lib/policy.mjs';
import { createRenderer, SENT_PREFIX } from '../lib/render-core.mjs';

const includes = JSON.parse(fs.readFileSync('data/includes.json', 'utf8'));
const grammar = JSON.parse(fs.readFileSync('data/grammar.json', 'utf8'));
const decorateSrc = fs.readFileSync('public/editor/decorate.js', 'utf8');

function renderAndDecorate(doc, isHome, customGrammar) {
  const g = customGrammar || grammar;
  const policy = buildPolicy(g);
  const renderer = createRenderer(includes, policy);
  const body = renderer.renderBody(doc, isHome);
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.__PE_POLICY = policy;
  w.__PE_SENT = SENT_PREFIX;
  w.A = () => {}; w.P = () => {}; w.__retag = () => {};
  w.eval(decorateSrc);
  w.__decorate();
  return w.document;
}

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } };

// ── case 1: rich page (spotlight, stats, infobox) — like a real TB page ──
{
  const doc = {
    hero: {
      eyebrow: 'Drinks', title: 'Drinks', subtitle: 'All of them', subtitle_meta: null,
      desc: 'A lead.', stats: [{ num: '1', label: 'A' }, { num: '2', label: 'B' }, { num: '3', label: 'C' }, { num: '4', label: 'D' }],
      search: false, search_placeholder: 'Search…',
      spotlight: { eyebrow: '★', title: 'Baja', desc: 'D', tags: ['X', 'Y'], cta: 'Open →' }, feature: null,
    },
    overview: { tone: 'b', heading: 'H.', paragraphs: ['P1', 'P2'], infobox: { label: 'Infobox', title: 'T', sublabel: null, rows: [['K', 'V']], badge: null } },
  };
  const d = renderAndDecorate(doc, false);
  console.log('case 1: rich sub-page');
  ok(d.querySelectorAll('.ce').length > 12, 'editable fields wrapped');
  ok(d.querySelector('.wiki-hero-title .ce'), 'title editable');
  ok(d.querySelector('.wiki-hero-title .wiki-hero-title-accent'), 'title accent preserved outside ce');
  ok(!d.querySelector('.wiki-hero-search'), 'NO search on non-home page (not even a + slot)');
  ok(d.querySelectorAll('.wiki-hero-stat .ce').length === 8, 'all 8 stat cells editable');
  ok(!d.querySelector('.wiki-hero-stat .pe-remove'), 'stat CELLS not removable (grammar min==max)');
  ok(d.querySelector('.wiki-hero-stats.pe-removable > .pe-remove'), 'stats grid removable as a whole (grammar optional)');
  ok(d.querySelector('.wiki-hero-spotlight-cta .ce'), 'CTA editable');
  ok(!d.querySelector('.wiki-hero-spotlight-cta .pe-remove') && !d.querySelector('.wiki-hero-spotlight-cta.pe-removable'), 'CTA NOT removable (grammar required)');
  ok(d.querySelectorAll('.wiki-hero-spotlight-tag .pe-tag-rm').length === 2, 'tags removable');
  ok([...d.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ tag'), '+ tag add button');
  ok(d.querySelectorAll('.wiki-section-prose > p.pe-removable').length === 2, 'paragraphs removable (above grammar min)');
  ok([...d.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ paragraph'), '+ paragraph button');
  ok(d.querySelector('.wiki-infobox.pe-removable'), 'infobox removable');
  ok(d.querySelector('.wiki-infobox-data > dt .ce') && d.querySelector('.wiki-infobox-data > dd .ce'), 'infobox row editable');
  ok([...d.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ row'), '+ row button');
  ok([...d.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ sublabel'), '+ sublabel slot (sentinel)');
  ok([...d.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ badge'), '+ badge slot (sentinel)');
  ok(d.querySelector('.wiki-section-eyebrow.pe-canon .pe-lock'), 'overview eyebrow locked (from grammar locked block)');
  ok(d.querySelector('.pe-sec-tools'), 'tone toolbar present');
  ok(d.querySelectorAll('.pe-tonebtn').length === 3, 'tone buttons from grammar enum (a/b/special)');
  ok([...d.querySelectorAll('.pe-chip')].some((c) => c.textContent === 'Call to Action Card' && c.className.includes('active')), 'aside chip active = CTA card');
  const ovSec = d.querySelector('section[data-section="overview"]');
  ok(ovSec.nextElementSibling && ovSec.nextElementSibling.className === 'pe-add-section', 'add-section seam directly below the overview');
  ok(d.querySelectorAll('.pe-add-section').length === 1, 'exactly one add-section seam (none above hero / between hero+overview)');
  ok(!d.body.textContent.includes(SENT_PREFIX), 'no sentinel text leaked');
}

// ── case 2: empty page (new draft) on HOME — all the + slots ──
{
  const doc = {
    hero: { eyebrow: null, title: 'New Wiki', subtitle: null, subtitle_meta: null, desc: null, stats: null, search: false, search_placeholder: 'Search this wiki…', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'Section heading', paragraphs: ['Write the overview here…'], infobox: null },
  };
  const d = renderAndDecorate(doc, true);
  console.log('case 2: blank home page');
  const labels = [...d.querySelectorAll('.pe-add, .pe-mini-add')].map((b) => b.textContent);
  ok(labels.includes('+ eyebrow'), '+ eyebrow slot');
  ok(labels.includes('+ subtitle'), '+ subtitle slot');
  ok(labels.includes('+ description'), '+ description slot');
  ok(labels.includes('+ search bar'), '+ search bar slot (HOME only — grammar hero_variant)');
  ok(labels.includes('+ stats (1×4)'), '+ stats slot');
  ok(labels.includes('+ Call to Action Card') && labels.includes('+ Feature Card'), 'aside empty slot (both cards)');
  ok(d.querySelector('.wiki-infobox.pe-empty'), 'infobox + slot keeps .wiki-infobox (right-column grid)');
  ok(!d.querySelector('.wiki-section-prose > p .pe-remove') && !d.querySelector('.wiki-section-prose > p.pe-removable'), 'single paragraph NOT removable (grammar min: 1)');
  ok(!d.body.textContent.includes(SENT_PREFIX), 'no sentinel text leaked');
  const input = d.querySelector('input.wiki-hero-search-input');
  ok(!input || !(input.getAttribute('placeholder') || '').includes(SENT_PREFIX), 'no sentinel in attributes');
}

// ── case 3: feature card page with subtitle+meta ──
{
  const doc = {
    hero: {
      eyebrow: 'E', title: 'T', subtitle: 'Sub', subtitle_meta: 'M1', desc: 'D', stats: null,
      search: false, search_placeholder: '', spotlight: null,
      feature: { head_left: 'L', head_right: null, title: 'FT', desc: null, chips: [{ key: 'K1', val: 'V1' }, { key: 'K2', val: 'V2' }, { key: 'K3', val: 'V3' }] },
    },
    overview: { tone: 'special', heading: 'H', paragraphs: ['P'], infobox: null },
  };
  const d = renderAndDecorate(doc, false);
  console.log('case 3: feature card + subtitle meta');
  ok(d.querySelectorAll('.wiki-hero-feature-chip .ce').length === 6, 'all chip cells editable');
  ok(!d.querySelector('.wiki-hero-feature-chip .pe-remove'), 'chips NOT removable (grammar min==max)');
  ok(![...d.querySelectorAll('.pe-mini-add, .pe-add')].some((b) => b.textContent === '+ chip'), 'no + chip button');
  ok([...d.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ right'), '+ right slot for head_right');
  ok([...d.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ description'), '+ description slot (feature desc)');
  ok(d.querySelector('.wiki-hero-subtitle-meta .ce'), 'subtitle meta editable');
  ok(d.querySelector('.wiki-hero-subtitle-meta + .pe-tag-rm'), 'meta mini ×');
  ok([...d.querySelectorAll('.pe-chip')].some((c) => c.textContent === 'Feature Card' && c.className.includes('active')), 'aside chip active = Feature card');
  ok(d.querySelector('section[data-section="overview"]').getAttribute('data-tone') === 'special', 'tone special rendered');
}

// ── case 4: DERIVATION — flip a grammar rule, builder behaviour follows ──
{
  console.log('case 4: grammar flip (desc → required) changes the builder');
  const g2 = JSON.parse(JSON.stringify(grammar));
  g2.components.hero.fields.desc.required = true;
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: null, stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
  };
  const before = renderAndDecorate(doc, false);
  ok([...before.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ description'), 'baseline: desc optional → + slot');
  const after = renderAndDecorate(doc, false, g2);
  ok(![...after.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ description'), 'grammar-required desc: no + slot');
  ok(after.querySelector('.wiki-hero-desc .ce'), 'grammar-required desc: element present (blank backfilled), editable');
  ok(!after.querySelector('.wiki-hero-desc.pe-removable'), 'grammar-required desc: not removable');
  // and the doc that HAS a desc loses its × too
  const doc2 = JSON.parse(JSON.stringify(doc)); doc2.hero.desc = 'Lead.';
  const after2 = renderAndDecorate(doc2, false, g2);
  ok(!after2.querySelector('.wiki-hero-desc.pe-removable'), 'grammar-required desc: × gone on filled page');
  const base2 = renderAndDecorate(doc2, false);
  ok(base2.querySelector('.wiki-hero-desc.pe-removable'), 'baseline: filled desc removable');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
