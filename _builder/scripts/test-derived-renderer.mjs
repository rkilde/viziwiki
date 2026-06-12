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
const registry = JSON.parse(fs.readFileSync('data/visuals.json', 'utf8'));
const decorateSrc = fs.readFileSync('public/editor/decorate.js', 'utf8');

function renderAndDecorate(doc, isHome, customGrammar, prep) {
  const g = customGrammar || grammar;
  const policy = buildPolicy(g);
  const renderer = createRenderer(includes, policy, registry);
  const body = renderer.renderBody(doc, isHome);
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.__PE_POLICY = policy;
  w.__PE_REGISTRY = registry;
  w.__PE_SENT = SENT_PREFIX;
  w.__PE_DOC = doc;          // the decorator reads current values (toolbar editors)
  w.A = () => {}; w.P = () => {}; w.PV = () => {}; w.__retag = () => {};
  if (prep) prep(w);          // e.g. seed skin tokens before decoration
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

// ── case 5: CATALOG — first contributor-added body section ──
{
  console.log('case 5: catalog body section (grammar-seeded, registry-routed)');
  const catSeed = JSON.parse(JSON.stringify(grammar.components.catalog.seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P1', 'P2'], infobox: null },
    sections: [{ type: 'catalog', data: catSeed }],
  };
  const d = renderAndDecorate(doc, false);
  const cat = d.querySelector('section.wiki-section.catalog');
  ok(cat, 'catalog section rendered via its canonical include');
  ok(d.querySelector('.cat-masonry') && d.querySelector('.cat-card'), 'catalog visual rendered through the dispatcher');
  ok((cat.querySelector('.cat-summary') || {}).textContent.includes('4 items') && cat.querySelector('.cat-summary').textContent.includes('2 categories'), 'summary auto-derived from data (4 items · 2 categories)');
  ok(cat.querySelector('.wiki-section-eyebrow.pe-canon .pe-lock'), 'catalog eyebrow locked (from the visuals registry)');
  ok(cat.querySelector('.cat-summary.pe-canon .pe-lock'), 'derived summary locked (registry: derived)');
  ok(cat.querySelector('.wiki-section-title .ce'), 'catalog title editable (bound to sections.0.data.title)');
  ok([...cat.querySelectorAll('.pe-chip')].some((c) => c.textContent === 'remove section'), 'remove-section chip');
  ok(cat.querySelectorAll('.pe-tonebtn').length === 3, 'catalog tone buttons from grammar enum');
  ok(!d.querySelector('script'), 'editor canvas inert: <script> stripped');
  // ── Phase A: the flat editing surface ──
  const aLabels = [...cat.querySelectorAll('.pe-add, .pe-mini-add')].map((b) => b.textContent);
  ok(aLabels.includes('+ footnote'), '+ footnote slot (sentinel — seed has none)');
  ok(aLabels.includes('+ category'), '+ category button after the masonry');
  ok(cat.querySelector('.cat-card-title .ce'), 'category name editable');
  // glass dock: colour / ribbon / note / remove
  const dock = cat.querySelector('.cat-card .cc-dock');
  ok(dock, 'glass dock present on the card');
  ok(dock.querySelectorAll('.cc-btn').length === 3, 'dock has 3 controls (colour/ribbon/remove) — note is NOT a dock control');
  ok(dock.querySelector('.cc-btn .cc-swatch'), 'colour control shows the swatch');
  ok(dock.querySelector('.cc-btn.danger'), 'remove-category control (danger)');
  ok(!dock.querySelector('.cc-btn[data-tip*="note"]'), 'no note button in the dock');
  ok([...dock.querySelectorAll('.cc-btn')].every((b) => b.getAttribute('data-tip')), 'every dock control has a hover tooltip');
  ok(cat.querySelector('.cat-card .cc-dock'), 'dock is a child of the card (positioned above it via CSS)');
  // note is a dashed chip: "+ note" when absent (seed has none)
  const noteChip = cat.querySelector('.pe-note-chip');
  ok(noteChip && noteChip.tagName === 'BUTTON' && noteChip.textContent === '+ note', 'absent note → dashed "+ note" chip on the card');
  // present note → editable dashed chip + corner ×, lifted out of the count line
  const dN = renderAndDecorate({
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'catalog', data: { title: 'C', categories: [{ name: 'Cat', note: 'priced 99¢', items: [{ name: 'X', desc: 'd' }] }] } }],
  }, false);
  const pn = dN.querySelector('.cat-card-count .pe-note-chip.has');
  ok(pn && pn.querySelector('.ce').textContent === 'priced 99¢', 'present note → editable chip, INLINE in the count line');
  ok(pn.querySelector('.pe-remove'), 'present note chip has a corner ×');
  const cntTxt = dN.querySelector('.cat-card-count').childNodes[0].nodeValue;
  ok(/·\s*$/.test(cntTxt.trim() + ' ') || cntTxt.includes('·'), 'count keeps the canon "·" before the note chip');
  ok(dN.querySelector('.cat-card-count').textContent.replace(pn.textContent, '').indexOf('priced') === -1, 'note text appears once (only in the chip)');
  ok(!cat.querySelector('.cat-card > .pe-remove'), 'no corner × on the card (moved into the dock)');
  // two-click delete: clicking a × does NOT delete — it arms an in-place confirm
  const someRm = d.querySelector('.pe-remove, .pe-tag-rm, .pe-removeitem, .cc-btn.danger');
  someRm.click();
  const conf = d.querySelector('.pe-del-confirm');
  ok(conf, 'first click on a delete ✕ arms a confirm (does not delete)');
  ok(conf.querySelector('.pe-del-yes') && conf.querySelector('.pe-del-no'), 'confirm has "✓ Delete" + undo (split)');
  ok(someRm.classList.contains('pe-del-armed'), 'the ✕ is hidden while armed');
  conf.querySelector('.pe-del-no').click();
  ok(!d.querySelector('.pe-del-confirm'), 'undo backs out (no delete)');
  // pills: clickable openers + the "+ item" add pill
  ok(cat.querySelector('.cat-card').querySelectorAll('.cat-pill:not(.cat-add-pill)').length === 2, 'two item pills (first category)');
  ok(cat.querySelector('.cat-pill.cat-add-pill'), '"+ item" add pill in the pills row');
  ok([...cat.querySelectorAll('.pe-sec-tools .pe-chip')].some((c) => c.textContent.startsWith('unit:')), 'unit toolbar editor');
  // seams: after overview (insert 0) AND after the catalog (insert 1)
  const seams = d.querySelectorAll('.pe-add-section');
  ok(seams.length === 2, 'two seams: below overview + below the catalog');
  const ovSec = d.querySelector('section[data-section="overview"]');
  ok(ovSec.nextElementSibling.className === 'pe-add-section' && cat.nextElementSibling.className === 'pe-add-section', 'seams sit directly below each section');
  // overview heading binding still hits the OVERVIEW h2, not the catalog's
  ok(ovSec.querySelector('.wiki-section-title .ce'), 'overview heading still bound');
  // placeholder select-all marker: fields carry their grammar blank in data-ph
  ok(cat.querySelector('.cat-card-title .ce').getAttribute('data-ph') === 'New category', 'catalog field .ce carries data-ph (its grammar blank)');
}

// ── case 6: catalog ITEM DETAIL editing (the canonical modal, editor-driven) ──
{
  console.log('case 6: catalog item detail (modal editing)');
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{
      type: 'catalog',
      data: {
        title: 'C', categories: [{
          name: 'Cat', ribbon: { text: 'R', tone: 'gone' }, items: [
            { name: 'Rich', status: 'active', info: '95mg', desc: 'Desc.', groups: [{ label: 'G1', pills: ['plain', { text: 'obj', struck: true }] }], callout: { label: 'CL', text: 'CT' }, notes: 'N', cta: 'page.html' },
            { name: 'Bare', desc: 'Min.' },
          ],
        }],
      },
    }],
  };
  const d = renderAndDecorate(doc, false);
  const richDet = d.querySelector('[id="d-0-0"]');
  const bareDet = d.querySelector('[id="d-0-1"]');
  ok(richDet.querySelector('.modal-title .ce'), 'item name editable (the modal title)');
  ok(richDet.querySelector('.modal-desc .ce'), 'desc editable');
  // status is now a clickable chip opening a glass popover (no inline <select>)
  const stChip = richDet.querySelector('.chip.st-active.pe-st-chip');
  ok(stChip, 'status chip is a clickable popover trigger');
  ok(!richDet.querySelector('select'), 'no inline <select> (replaced by popover)');
  stChip.onclick();
  const stPop = d.querySelector('.cc-pop.status-pop');
  ok(stPop, 'clicking status opens the glass status popover');
  ok([...stPop.querySelectorAll('.cc-status[data-s]')].map((b) => b.getAttribute('data-s')).filter(Boolean).join(',') === 'active,discontinued,limited,retired', 'popover lists the grammar enum');
  ok(stPop.querySelector('.cc-status.none'), 'popover has a None option');
  ok(stPop.querySelector('.cc-status.st-active.sel'), 'current status marked selected');
  ok(richDet.querySelector('.chip.info .ce'), 'info chip editable (inline)');
  ok(richDet.querySelector('.modal-group-label .ce'), 'group label editable');
  ok(richDet.querySelectorAll('.gpill .ce').length === 2, 'string + object pills both editable');
  const gpills = [...richDet.querySelectorAll('.gpill')];
  ok(gpills.every((g) => g.querySelector('.gpill-menu')), 'each pill has the ⋯ options menu');
  ok(gpills[1].classList.contains('struck') && gpills[1].querySelector('.ce'), 'struck object pill carries the canon struck class (strikes the .ce)');
  const lastPop = () => [...d.querySelectorAll('.cc-pop.pill-pop')].pop();
  gpills[1].querySelector('.gpill-menu').onclick({ stopPropagation() {} });   // object (struck) pill
  let pp = lastPop();
  ok(pp, '⋯ opens the pill options popover');
  ok([...pp.querySelectorAll('.cc-row')].some((r) => r.textContent === 'Remove strike'), 'struck object pill offers "Remove strike"');
  ok(pp.querySelector('.cc-row.danger'), 'Remove (danger) row');
  gpills[0].querySelector('.gpill-menu').onclick({ stopPropagation() {} });   // string pill
  pp = lastPop();
  ok(!pp.querySelector('[data-a="strike"]'), 'string pill: no strike option (only Remove)');
  ok([...richDet.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ item'), '+ item (pill add)');
  ok(richDet.querySelector('.pe-adds'), 'bottom adders row present');
  ok([...richDet.querySelectorAll('.pe-adds .pe-mini-add')].some((b) => b.textContent === '+ group'), '+ group in adders row');
  ok(richDet.querySelector('.pe-adds .pe-removeitem'), 'Remove item control in the editor');
  ok(richDet.querySelector('.modal-callout .ce') && richDet.querySelector('.modal-callout .pe-remove'), 'callout editable + removable');
  ok(richDet.querySelector('.modal-note .ce'), 'notes editable');
  ok(richDet.querySelector('.modal-cta.pe-canon .pe-lock'), 'CTA label locked (canon)');
  ok([...richDet.querySelectorAll('.pe-chip')].some((c) => c.textContent.startsWith('link:')), 'cta link editor chip');
  // bare item: + status chip in head, + callout/+notes/+link in adders
  ok([...bareDet.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ status'), 'bare item: + status');
  ok([...bareDet.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ info'), 'bare item: + info');
  const bAdds = [...bareDet.querySelectorAll('.pe-adds .pe-mini-add')].map((b) => b.textContent);
  ['+ group', '+ callout', '+ notes'].forEach((l) => ok(bAdds.includes(l), `bare item adders: ${l}`));
  ok([...bareDet.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ link'), 'bare item: + link');
  // open the modal by clicking the pill; confirm canonical mechanics
  const pill = d.querySelector('.cat-pill:not(.cat-add-pill)');
  pill.dispatchEvent(new d.defaultView.Event('click'));
  const modal = d.querySelector('[data-catalog-modal]');
  ok(modal.classList.contains('open'), 'clicking a pill opens the canonical modal (.open)');
  ok(modal.querySelector('[data-modal-body] [id="d-0-0"]'), 'detail moved into the modal body');
  const mrb = modal.querySelector('[data-modal-ribbon]');
  ok(mrb.classList.contains('ribbon-gone'), 'modal ribbon mirrors the gone tone (read from the doc)');
  ok(mrb.querySelector('span') && mrb.querySelector('span').textContent === 'R', 'modal ribbon: canonical inner <span> with the doc ribbon text (not the stale pill attr)');
  // placeholder marker also on hero/overview fields
  ok(d.querySelector('.wiki-section-title .ce').hasAttribute('data-ph'), 'overview heading .ce carries data-ph');
  modal.querySelector('[data-modal-close]').onclick();
  ok(!modal.classList.contains('open') && d.querySelector('.cat-details [id="d-0-0"]'), 'close returns the detail to its hidden home');
}

// ── case 7: section reorder + skin-derived colour swatches ──
{
  console.log('case 7: reorder arrows + skin-derived swatches');
  const catData = () => JSON.parse(JSON.stringify(grammar.components.catalog.seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'catalog', data: catData() }, { type: 'catalog', data: { ...catData(), title: 'Second' } }],
  };
  doc.sections[0].data.categories[0].color = 2; // explicit swatch on the first
  const d = renderAndDecorate(doc, false, null, (w) => {
    // stand in for the skin: define a 3-colour contract palette on the body
    w.document.body.style.setProperty('--wiki-palette-1', '#111111');
    w.document.body.style.setProperty('--wiki-palette-2', '#222222');
    w.document.body.style.setProperty('--wiki-palette-3', '#333333');
  });
  const secs = [...d.querySelectorAll('section.wiki-section.catalog')];
  ok(secs.length === 2, 'two catalog sections render');
  const chips0 = [...secs[0].querySelectorAll('.pe-sec-tools .pe-chip')].map((c) => c.textContent);
  const chips1 = [...secs[1].querySelectorAll('.pe-sec-tools .pe-chip')].map((c) => c.textContent);
  ok(!chips0.includes('↑') && chips0.includes('↓'), 'first section: ↓ only (nothing above it is movable)');
  ok(chips1.includes('↑') && !chips1.includes('↓'), 'last section: ↑ only');
  // colour popover (opened from the dock) — swatches are skin-derived
  const colorBtn = secs[0].querySelector('.cat-card .cc-dock .cc-btn');
  ok(colorBtn && colorBtn.querySelector('.cc-swatch'), 'dock colour control present');
  colorBtn.onclick.call(colorBtn);
  const pop = d.querySelector('.cc-pop');
  ok(pop, 'clicking colour opens the popover');
  ok(pop.querySelectorAll('.cc-sw[data-i]').length === 3, 'swatches = exactly the 3 tokens the skin defines');
  ok(pop.querySelector('.cc-sw[data-i="2"]').className.includes('sel'), 'current swatch (color: 2) marked selected');
  ok(pop.querySelector('.cc-sw.auto'), 'auto (cycle) option present');
}

// ── case 8: timeline body section (addable from the picker) ──
// guards the full include chain: section frame → dispatcher → visual → card →
// station. A missing extract-includes entry would throw here (the bug that
// made the picker tile appear un-selectable: secAdd fired but render ENOENT'd).
{
  console.log('case 8: timeline body section (grammar-seeded, registry-routed)');
  const tlSeed = JSON.parse(JSON.stringify(grammar.components.timeline.seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'timeline', data: tlSeed }],
  };
  const d = renderAndDecorate(doc, false);
  const tl = d.querySelector('section.wiki-section.timeline');
  ok(tl, 'timeline section rendered via its canonical include chain');
  ok(tl.querySelector('.tl-outer'), 'timeline visual rendered through the dispatcher');
  ok(tl.querySelectorAll('.itl-station').length === tlSeed.events.length, 'one station card per seed event');
  ok(tl.querySelector('.wiki-section-eyebrow.pe-canon .pe-lock'), 'timeline eyebrow locked (from the visuals registry)');
  ok([...tl.querySelectorAll('.pe-chip')].some((c) => c.textContent === 'remove section'), 'remove-section chip present');
  ok(tl.querySelectorAll('.pe-tonebtn').length === 3, 'timeline tone buttons from grammar enum');
  // ordering: any input order positions by DATE (editing a middle card's year
  // out of sequence must not break the layout — stations are year-grouped and
  // bound by their original index, not DOM order)
  const dOoo = renderAndDecorate({
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'timeline', data: { heading: 'H', events: [
      { month: 'Jan', year: '2018', tag: 'A', title: 'E0', preview: 'p' },
      { month: 'Jan', year: '2012', tag: 'C', title: 'E2', preview: 'p' },
    ] } }],
  }, false);
  const lefts = {}; dOoo.querySelectorAll('.itl-station').forEach((s) => { lefts[s.getAttribute('data-detail')] = parseInt(s.style.left, 10); });
  ok(lefts['bktld-1'] < lefts['bktld-0'], 'a later-array event with an earlier year sits left (positions by date, any input order)');
  // and the date-format (single source in station.html data-tag): no day → no comma
  const tags = [...dOoo.querySelectorAll('.itl-station')].map((s) => s.getAttribute('data-tag'));
  ok(tags.some((t) => t.indexOf('Jan 2012 ·') === 0), 'no-day date drops the comma ("Jan 2012")');
}

// ── case 9: one-step bank onboarding guard ──
// Every grammar component that has a seed AND a registry section is a bank the
// picker can mark LIVE (SectionPicker.isLive). This renders each one end-to-end
// to prove its include chain resolves — so a bank can't go live without its
// render deps present. Generalizes the ENOENT case 8 caught to ALL banks, and
// will fail the build if extract-includes (registry-derived crawl) ever misses
// a chain.
{
  console.log('case 9: every seedable + registry-hosted bank renders end-to-end');
  const banks = Object.entries(grammar.components).filter(([t, c]) => c.seed && c.section && t !== 'hero' && t !== 'overview');
  ok(banks.length >= 6, `discovered ${banks.length} addable banks from canon`);
  for (const [type, c] of banks) {
    const doc = {
      hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
      overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
      sections: [{ type, data: JSON.parse(JSON.stringify(c.seed)) }],
    };
    let d, err = null;
    try { d = renderAndDecorate(doc, false); } catch (e) { err = e; }
    ok(!err, `${type}: renders without throwing (include chain resolves)${err ? ' — ' + err.message : ''}`);
    if (d) ok(d.querySelectorAll('body > section.wiki-section').length >= 2, `${type}: its body section rendered`);
  }
}

// ── case 10: builder bank contract — no layout JS ──
// The builder renders canon HTML+CSS but STRIPS <script> (inert canvas; the
// decorator owns interaction). So a bank's LAYOUT must be CSS/Liquid, never a
// runtime script — scripts may carry only interaction the decorator re-derives
// (the modal). This scans every builder-hosted visual include for scripts that
// mutate geometry; it would have caught the timeline's old positioning engine
// (el.style.left / track.style.cssText) BEFORE it shipped broken.
{
  console.log('case 10: builder-hosted visuals carry no layout JS (contract)');
  const GEO = /\.style\.(left|top|right|bottom|width|height|cssText)\s*=/;
  const visuals = Object.keys(includes.includes).filter((f) => f.startsWith('visuals/'));
  ok(visuals.length >= 6, `scanning ${visuals.length} builder-hosted visual includes`);
  for (const f of visuals) {
    const scripts = (includes.includes[f].match(/<script[\s\S]*?<\/script>/gi) || []).join('\n');
    ok(!GEO.test(scripts), `${f}: no layout-mutating script (layout must be CSS/Liquid, not runtime JS)`);
  }
}

// ── case 11: timeline in-place editor (the buildkit layer) ──
{
  console.log('case 11: timeline editor — fields editable, add/remove, modal');
  const tlSeed = JSON.parse(JSON.stringify(grammar.components.timeline.seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'timeline', data: tlSeed }],
  };
  const d = renderAndDecorate(doc, false);
  const tl = d.querySelector('section.wiki-section.timeline');
  const st0 = tl.querySelectorAll('.itl-station')[0];
  ok(st0.querySelector('.sc-title .ce'), 'event title is an editable box');
  ok(st0.querySelector('.sc-tag .ce'), 'event tag editable');
  ok(st0.querySelector('.sc-prose .ce'), 'event preview editable');
  // the date is ONE clickable field → a month/day/year popover
  ok(st0.querySelector('.sc-float-date.pe-datefield'), 'the date is one clickable date field');
  st0.querySelector('.sc-float-date').click();
  const dpop = d.querySelector('.cc-pop.date-pop');
  ok(dpop, 'clicking the date opens the date popover');
  ok(dpop.querySelectorAll('.cc-enum-opt').length === 12, 'month grid (12, from the grammar enum)');
  ok(dpop.querySelector('.cc-date-day') && dpop.querySelector('.cc-date-year'), 'day + year inputs');
  ok(/optional/i.test(dpop.querySelector('.cc-date-note').textContent), 'note states day is optional');
  // date validation: letters stripped, ranges enforced, invalid flagged + not applied
  const fire = (el, v) => { el.value = v; el.dispatchEvent(new d.defaultView.Event('input')); };
  const dayIn = dpop.querySelector('.cc-date-day'), yrIn = dpop.querySelector('.cc-date-year');
  fire(dayIn, '4a5');
  ok(dayIn.value === '45', 'day strips letters and caps at 2 digits');
  ok(dayIn.classList.contains('cc-invalid'), 'day 45 flagged invalid (out of month range)');
  fire(dayIn, '12'); ok(!dayIn.classList.contains('cc-invalid'), 'day 12 is valid');
  fire(yrIn, '20x1'); ok(yrIn.value === '201', 'year strips letters and caps at 4 digits');
  ok(yrIn.classList.contains('cc-invalid'), 'year needs exactly 4 digits (201 invalid)');
  fire(yrIn, '2015'); ok(!yrIn.classList.contains('cc-invalid'), '4-digit year is valid');
  const applyBtn = dpop.querySelector('.cc-apply');
  ok(applyBtn && /apply/i.test(applyBtn.textContent), 'date picker has an Apply button');
  ok(!applyBtn.disabled, 'Apply enabled when the date is valid');
  fire(dayIn, '99'); ok(applyBtn.disabled, 'Apply disabled while a field is invalid (can\'t commit a bad date)');
  // placeholder select-all: seeded title text carries its grammar blank in data-ph
  ok(st0.querySelector('.sc-title .ce').getAttribute('data-ph') === 'Name this event', 'title field marked placeholder (data-ph = grammar blank)');
  // add/remove per grammar min (seed has 5 > min 2 → removable; max none → addable)
  ok(st0.querySelector('.itl-card.pe-removable .pe-remove'), 'event removable (× on the card) above the min');
  ok([...tl.querySelectorAll('.pe-tl-addev')].some((b) => b.textContent === '+ new event'), '"+ new event" button present (upper-right, above the timeline)');
  // derived scroll hint is locked
  ok(tl.querySelector('.tl-scroll-hint.pe-canon .pe-lock'), 'auto-derived scroll hint locked');
  // at the grammar min, no × renders (can't drop below 2 events)
  const dMin = renderAndDecorate({ ...doc, sections: [{ type: 'timeline', data: { events: tlSeed.events.slice(0, 2) } }] }, false);
  ok(!dMin.querySelector('.itl-card.pe-removable .pe-remove'), 'at min events, no remove × (grammar min enforced)');
  // heading is REQUIRED → present + editable in place (no "+" slot), placeholder = blank
  const hCe = tl.querySelector('.wiki-section-title .ce');
  ok(hCe && hCe.getAttribute('data-ph') === 'Timeline Header', 'required heading present + editable with "Timeline Header" placeholder');
  ok(![...tl.querySelectorAll('.tl-hdr .pe-add')].some((b) => b.textContent === '+ heading'), 'no "+ heading" slot (heading is required, always there)');
  // expandable card: the "Details ›" expand trigger opens the detail modal with an editable body
  (st0.querySelector('.sc-expand') || st0.querySelector('.sc-footer') || st0.querySelector('.itl-card')).click();
  const tlModal = tl.querySelector('.tl-modal');
  ok(tlModal.classList.contains('open'), 'clicking a card opens its expandable card (detail modal)');
  const mBody = tlModal.querySelector('[data-tl-body] .ce');
  ok(mBody, 'expandable card body is editable in place');
  ok((mBody.textContent || '').trim().length > 0, 'empty body shows its placeholder text in the editor');
  ok(tlModal.querySelector('[data-tl-title] .ce'), 'event title is editable in the expanded card');
  ok(/2021/.test(tlModal.querySelector('[data-tl-tag]').textContent), 'date appears in the expanded card tag line (upper-left), not just the tag');
}

// ── case 12: READINESS MARKERS — derived from grammar required/min ──
// The markers render in the PARENT chrome now; the decorator POSTS a payload to
// window.parent.__peMarkers. We capture that payload (jsdom: window.parent ===
// window) and assert against the derived data + the in-canvas jump/flash.
{
  console.log('case 12: readiness markers — derived from grammar required/min');
  const prose100 = Array(110).fill('word').join(' ');   // 110 real words (over the grammar floor)
  const ready = {
    hero: { title: 'Title here', eyebrow: null, subtitle: null, subtitle_meta: null, desc: 'A real lead.', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'Real heading', paragraphs: [prose100], infobox: null },
  };
  // render + decorate, capturing the posted readiness payload
  const cap = (doc, g) => { let m = []; const d = renderAndDecorate(doc, false, g, (w) => { w.__peMarkers = (list) => { m = list; }; }); return { d, m }; };
  const mk = (m, prefix) => m.find((x) => x.prefix === prefix);
  const items = (marker) => marker.groups.flatMap((g) => g.items);
  const hit = (marker, re, met) => items(marker).some((it) => re.test(it.label) && it.met === met);

  const r0 = cap(ready);
  ok(mk(r0.m, 'overview').done, 'overview marker = done when heading + ≥100-word prose are filled');
  ok(mk(r0.m, 'hero').done, 'hero marker = done when required title is filled');

  // DERIVED word floor: short prose (under the grammar min_words) is NOT met,
  // and placeholder prose doesn't count at all (the bug where a fresh overview
  // showed its paragraph pre-checked)
  const shortDoc = JSON.parse(JSON.stringify(ready)); shortDoc.overview.paragraphs = ['Only three words.'];
  ok(hit(mk(cap(shortDoc).m, 'overview'), /\bwords\b/i, false), 'prose under the word floor is unmet (derived from grammar min_words)');
  const phDoc = JSON.parse(JSON.stringify(ready)); phDoc.overview.paragraphs = [grammar.components.overview.fields.paragraphs.item_blank];
  ok(hit(mk(cap(phDoc).m, 'overview'), /\bwords\b/i, false), 'placeholder prose does NOT count toward the word floor');

  // leave the required heading at its placeholder (null → include backfills the
  // grammar blank) → marker flips to todo and lists the unmet "Heading"
  const todo = JSON.parse(JSON.stringify(ready)); todo.overview.heading = null;
  const r2 = cap(todo); const ov2 = mk(r2.m, 'overview');
  ok(!ov2.done, 'overview marker → todo when required heading is left at its placeholder');
  ok(hit(ov2, /Heading/i, false), 'marker lists the unmet "Heading" requirement');
  ok(hit(ov2, /\bwords\b/i, true), 'met requirement ("≥100 words") shown as done');
  // jump flashes the BOUND heading field (not the whole section)
  const hItem = items(ov2).find((it) => /Heading/i.test(it.label) && !it.met);
  r2.d.defaultView.__peJump(hItem.jump, hItem.addpath);
  ok(r2.d.querySelector('[data-pe-path="overview.heading"].field-flash'), 'jump flashes the bound heading field, not the section');
  ok(!r2.d.querySelector('section.field-flash'), 'jump never flashes a whole section');

  // POSITIONAL (tuple) subtype: a filled infobox row's key/value read correctly
  // (the bug where filled rows showed unmet because data is rows.N.0/.1 while
  // grammar names them key/value)
  const ib = { tone: 'b', heading: 'H', paragraphs: [prose100], infobox: { label: 'Infobox', title: 'Panel', rows: [['Launched', '2003'], ['Status', 'Live']] } };
  const rIb = cap({ ...JSON.parse(JSON.stringify(ready)), overview: ib });
  ok(!items(mk(rIb.m, 'overview')).some((it) => /value|key/i.test(it.label) && !it.met), 'filled infobox row key/value read as met (positional tuple resolved)');
  ok(rIb.d.querySelector('[data-pe-path="overview.infobox.rows.0.1"]'), 'infobox value cell is jump-addressable at its positional path');

  // DERIVATION: an OPTIONAL field made required in grammar appears as a new
  // readiness requirement with ZERO widget edits (the whole point).
  const heroDoc = JSON.parse(JSON.stringify(ready)); heroDoc.hero.eyebrow = null;
  ok(!items(mk(cap(heroDoc).m, 'hero')).some((it) => /Eyebrow/i.test(it.label)), 'baseline: optional eyebrow is NOT a readiness requirement');
  const g2 = JSON.parse(JSON.stringify(grammar));
  g2.components.hero.fields.eyebrow.required = true;
  ok(hit(mk(cap(heroDoc, g2).m, 'hero'), /Eyebrow/i, false), 'grammar-required eyebrow APPEARS as a readiness requirement (derived from grammar, no widget edit)');

  // list min is derived too: a catalog with an empty category surfaces its
  // per-category required name + "at least one item"
  const catSeed = JSON.parse(JSON.stringify(grammar.components.catalog.seed));
  catSeed.categories.push({ name: null, items: [] });   // a blank, itemless category
  const catMk = mk(cap({ ...JSON.parse(JSON.stringify(ready)), sections: [{ type: 'catalog', data: catSeed }] }).m, 'catalog');
  ok(catMk && !catMk.done, 'catalog marker → todo (blank category present)');
  ok(items(catMk).some((it) => /at least one (cat )?item/i.test(it.label) && !it.met), 'derives the "at least one item" minimum for the empty category');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
