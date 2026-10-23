// Smoke test for the DERIVED renderer pipeline: render docs through the
// repo's actual Liquid includes (the REAL lib/render-core.mjs — no fixture
// copy), run the decorator over the result in jsdom, and assert the editing
// affordances landed in their canonical positions AND that policy is truly
// computed from grammar (flipping a grammar rule changes builder behavior).
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
  ok(![...d.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ paragraph'), 'no + paragraph button (overview prose is one box)');
  ok(d.querySelector('.wiki-infobox.pe-removable'), 'infobox removable');
  ok(d.querySelector('.wiki-infobox-data > dt .ce') && d.querySelector('.wiki-infobox-data > dd .ce'), 'infobox row editable');
  // +row / +badge live in an add-bar attached to the infobox, positioned
  // directly BELOW it via CSS (so the panel itself renders like the live site)
  const ibAdds = d.querySelector('.wiki-infobox > .pe-infobox-adds');
  ok(ibAdds && [...ibAdds.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ row'), '+ row button (in the add-bar below the infobox)');
  ok([...d.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ sublabel'), '+ sublabel slot (sentinel)');
  ok(ibAdds && [...ibAdds.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ badge'), '+ badge button (in the add-bar below the infobox)');
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

// ── case 4: DERIVATION — flip a grammar rule, builder behavior follows ──
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
  // glass dock: color / ribbon / note / remove
  const dock = cat.querySelector('.cat-card .cc-dock');
  ok(dock, 'glass dock present on the card');
  ok(dock.querySelectorAll('.cc-btn').length === 4, 'dock has 4 controls (drag/color/ribbon/remove) — note is NOT a dock control');
  ok(dock.querySelector('.cc-btn .cc-swatch'), 'color control shows the swatch');
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
  // EVERY pill carries BOTH controls: the ⋯ strike menu, and — to its right — the
  // standard two-click × delete (makeRemovable). The ⋯ works on string pills too:
  // striking promotes a plain string to {text, struck}.
  ok(gpills.every((g) => g.querySelector('.pe-tag-rm')), 'each pill has the standard two-click × delete');
  ok(gpills.every((g) => g.querySelector('.gpill-menu')), 'each pill has the ⋯ strike menu (string pills too)');
  ok(gpills[1].classList.contains('struck') && gpills[1].querySelector('.ce'), 'struck object pill carries the canon struck class (strikes the .ce)');
  const lastPop = () => [...d.querySelectorAll('.cc-pop.pill-pop')].pop();
  // string pill (gpills[0], unstruck) → offers "Strike through", never a danger Remove
  gpills[0].querySelector('.gpill-menu').onclick({ stopPropagation() {} });
  let pp = lastPop();
  ok(pp, '⋯ opens the pill strike popover');
  ok([...pp.querySelectorAll('.cc-row')].some((r) => r.textContent === 'Strike through'), 'unstruck pill offers "Strike through"');
  ok(!pp.querySelector('.cc-row.danger'), 'no Remove row in the strike menu (delete is the standard ×)');
  // object struck pill (gpills[1]) → offers "Remove strike"
  gpills[1].querySelector('.gpill-menu').onclick({ stopPropagation() {} });
  pp = lastPop();
  ok([...pp.querySelectorAll('.cc-row')].some((r) => r.textContent === 'Remove strike'), 'struck object pill offers "Remove strike"');
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

// ── case 7: section reorder + skin-derived color swatches ──
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
    // stand in for the skin: define a 3-color contract palette on the body
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
  // color popover (opened from the dock) — swatches are skin-derived
  const colorBtn = [...secs[0].querySelectorAll('.cat-card .cc-dock .cc-btn')].find((b) => b.querySelector('.cc-swatch'));
  ok(colorBtn && colorBtn.querySelector('.cc-swatch'), 'dock color control present');
  colorBtn.onclick.call(colorBtn);
  const pop = d.querySelector('.cc-pop');
  ok(pop, 'clicking color opens the popover');
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
  // the date is ONE clickable field → a month/day/year popover. It's also the
  // readiness JUMP target for month/day/year (data-pe-jump) and opens on jump
  // (data-pe-opens) — so the widget's "Month" item lands on the date control +
  // opens the picker, instead of falling through to the tag field.
  ok(st0.querySelector('.sc-float-date.pe-datefield'), 'the date is one clickable date field');
  const dfEl = st0.querySelector('.sc-float-date');
  ok(dfEl.hasAttribute('data-pe-opens'), 'date control opens its editor on a readiness jump');
  ok(/events\.0\.month\b/.test(dfEl.getAttribute('data-pe-jump') || '') && /events\.0\.year\b/.test(dfEl.getAttribute('data-pe-jump') || ''), 'date control is the jump target for month + year (not the tag)');
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
  ok(hCe && hCe.getAttribute('data-ph') === 'Timeline heading', 'required heading present + editable with "Timeline heading" placeholder');
  ok(![...tl.querySelectorAll('.tl-hdr .pe-add')].some((b) => b.textContent === '+ heading'), 'no "+ heading" slot (heading is required, always there)');
  // expandable card: the "Details ›" expand trigger opens the detail modal with an editable body
  (st0.querySelector('.sc-expand') || st0.querySelector('.sc-footer') || st0.querySelector('.itl-card')).click();
  const tlModal = tl.querySelector('.tl-modal');
  ok(tlModal.classList.contains('open'), 'clicking a card opens its expandable card (detail modal)');
  const mBody = tlModal.querySelector('[data-tl-body] .ce');
  ok(mBody, 'expandable card body is editable in place');
  ok((mBody.textContent || '').trim().length > 0, 'empty body shows its placeholder text in the editor');
  ok(tlModal.querySelector('[data-tl-title] .ce'), 'event title is editable in the expanded card');
  ok(/\bYear\b/.test(tlModal.querySelector('[data-tl-tag]').textContent), 'date appears in the expanded card tag line (upper-left), not just the tag');
  // no-day date drops the comma: "Month Year", never "Month, Year" (one canon fix, both surfaces)
  ok(!/,\s*Year/.test(tlModal.querySelector('[data-tl-tag]').textContent), 'no-day date has no comma before the year');
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
  // flatten the nested tree (section + every card's reqs + every item's reqs)
  const items = (marker) => [...marker.section, ...marker.cards.flatMap((c) => [...c.reqs, ...c.items.flatMap((it) => it.reqs)])];
  const hit = (marker, re, met) => items(marker).some((it) => re.test(it.label) && it.met === met);

  const r0 = cap(ready);
  ok(mk(r0.m, 'overview').done, 'overview marker = done when heading + ≥100-word prose are filled');
  ok(mk(r0.m, 'hero').done, 'hero marker = done when required title is filled');
  // structure: catalog groups each card with its items nested
  const catTree = mk(cap({ ...JSON.parse(JSON.stringify(ready)), sections: [{ type: 'catalog', data: JSON.parse(JSON.stringify(grammar.components.catalog.seed)) }] }).m, 'catalog');
  ok(catTree.cards.length === 2 && catTree.cards[0].kind === 'Category', 'catalog → one card per category, kind from grammar display');
  ok(catTree.cards[0].items.length >= 1 && /name/i.test(catTree.cards[0].items[0].reqs[0].label), 'each card nests its items, each carrying its required name');
  ok(catTree.section.some((l) => l.struct && /categor/i.test(l.label)), 'the ≥2-categories count rule lives at the section level (struct)');

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
  const catCap = cap({ ...JSON.parse(JSON.stringify(ready)), sections: [{ type: 'catalog', data: catSeed }] });
  const catMk = mk(catCap.m, 'catalog');
  ok(catMk && !catMk.done, 'catalog marker → todo (blank category present)');
  ok(items(catMk).some((it) => /at least one (cat )?item/i.test(it.label) && !it.met), 'derives the "at least one item" minimum for the empty category');
  // item fields live in the modal, not the card face → the jump resolves to the
  // item's pill (data-pe-scope), which opens the modal (data-pe-opens)
  const itemLeaf = catMk.cards[0].items[0].reqs.find((r) => /name/i.test(r.label));
  const scope = itemLeaf.jump.replace(/\.name$/, '');
  ok(catCap.d.querySelector(`[data-pe-scope="${scope}"][data-pe-opens]`), 'catalog item field resolves to its pill scope (which opens the item modal on jump)');
}

// ── case 13: delta in-place editor (the last onboarded bank) ──
{
  console.log('case 13: delta editor — axis, rows, chips, add/remove');
  const dSeed = JSON.parse(JSON.stringify(grammar.components.delta.seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'delta', data: dSeed }],
  };
  const d = renderAndDecorate(doc, false);
  const gd = d.querySelector('section.wiki-section.delta');
  ok(gd, 'delta section rendered via its canonical include chain');
  ok(gd.querySelector('.wiki-section-title .ce'), 'heading editable in place');
  // axis headers — name editable + DISTINCT Old/New placeholders (per-axis blank)
  const nm = gd.querySelector('.gd-gen-old .gd-name .ce');
  ok(nm && nm.getAttribute('data-ph') === 'Old model', 'prev model-name placeholder is "Old model"');
  ok(gd.querySelector('.gd-gen-new .gd-name .ce').getAttribute('data-ph') === 'New model', 'current model-name placeholder is "New model"');
  // column labels are LOCKED canon literals (Predecessor / Successor), not editable
  const ptag = gd.querySelector('.gd-gen-old .gd-tag'), ctag = gd.querySelector('.gd-gen-new .gd-tag');
  ok(ptag.textContent.trim() === 'Predecessor' && ptag.classList.contains('pe-canon') && !ptag.querySelector('.ce'), 'predecessor label locked canon (not editable)');
  ok(ctag.textContent.trim() === 'Successor' && ctag.classList.contains('pe-canon'), 'successor label locked canon');
  ok(gd.querySelector('.gd-gen-old .gd-year .ce') && gd.querySelector('.gd-gen-old .gd-year .ce').getAttribute('data-ph') === 'year', 'year field starts as "year" placeholder');
  // the derived per-column echoes + group labels are locked
  ok([...gd.querySelectorAll('.gd-sec-col')].every((c) => c.classList.contains('pe-canon')), 'gd-sec-col echoes locked (derived from the model name)');
  ok([...gd.querySelectorAll('.gd-sec-main')].every((c) => c.classList.contains('pe-canon')), 'Hardware/Software group labels locked');
  // the seed row starts BLANK: label + empty old/new fields + a "+ chip" slot
  const row = gd.querySelector('.gd-row');
  ok(row.querySelector('.gd-label-name .ce'), 'row label editable');
  ok(row.querySelector('.gd-old-val .ce') && row.querySelector('.gd-old-val .ce').getAttribute('data-ph') === 'old value', 'previous-value field is clearly labelled ("old value")');
  ok(row.querySelector('.gd-new-val .ce') && row.querySelector('.gd-new-val .ce').getAttribute('data-ph') === 'new value', 'current-value field is clearly labelled ("new value")');
  ok(!row.querySelector('.gd-chip'), 'seed row starts with no chip (blank)');
  const addChip = [...row.querySelectorAll('.pe-mini-add')].find((b) => b.textContent === '+ chip');
  ok(addChip, '"+ chip" slot present on a chipless row');
  // "no before" reads as an OR choice: the value field, an "or", then the toggle
  ok(row.querySelector('.pe-or') && /^or$/i.test(row.querySelector('.pe-or').textContent.trim()), 'old-value / no-before presented as an "or" choice');
  ok(row.querySelector('.pe-noold') && /no .before. value/i.test(row.querySelector('.pe-noold').textContent), 'no-before is an alternative toggle (.pe-noold), not an add-pill');
  // open the chip picker from "+ chip"
  addChip.onclick();
  const cpop = [...d.querySelectorAll('.cc-pop.chip-pop')].pop();
  ok(cpop, 'chip popover opens');
  ok(cpop.querySelector('.cc-chip-head .dr-info[data-tip-html]'), 'picker info "i" is a rich legend (color-meaning table), not a wall of text');
  ok(cpop.querySelectorAll('.cc-chip-cat .cc-chip-cat-h').length === 5, 'five category column-headers (from the grammar enum)');
  ok(cpop.querySelectorAll('.cc-chip-opt[data-c="better"]').length >= 1, '"better" category offers derived preset chips (bearings)');
  ok(cpop.querySelector('.cc-chip-opt[data-c="feature"][data-t="New"]'), 'preset labels come from grammar (feature → "New")');
  ok(cpop.querySelector('.cc-chip-fill[data-tpl] .cc-chip-fill-in'), 'a parameterized chip (e.g. {n}×) renders a fill-in input');
  ok([...cpop.querySelectorAll('.cc-chip-fill')].some((el) => el.getAttribute('data-tpl').includes('{n}')), 'fill chip carries its {n} template (resolved to chip_text on use)');
  ok(cpop.querySelector('.cc-chip-text') && cpop.querySelector('.cc-chip-apply'), 'a custom chip — free text + Apply');
  ok(cpop.querySelectorAll('.cc-chip-swatch').length === 5, 'custom color swatch per category');
  // a row WITH a chip → edit (opens picker) + × (remove) controls
  const dChip = renderAndDecorate({ ...doc, sections: [{ type: 'delta', data: { ...dSeed, hardware: [{ label: 'L', new: 'V', chip: 'better', chip_text: '2×' }] } }] }, false);
  const cRow = dChip.querySelector('section.wiki-section.delta .gd-row');
  ok(cRow.querySelector('.gd-chip'), 'chip renders when set');
  ok(cRow.querySelector('.gd-chip-ctrls .gd-chip-edit') && cRow.querySelector('.gd-chip-ctrls .gd-chip-rm'), 'a set chip carries both an edit (opens picker) and a × (remove)');
  // add-row affordances: small pills (reverted), still spanning a full-width cell
  const addRows = [...gd.querySelectorAll('.pe-gd-addrow .pe-mini-add')];
  const adders = addRows.map((b) => b.textContent);
  ok(adders.includes('+ hardware row') && adders.includes('+ software row'), '+ hardware row / + software row adders present');
  ok(addRows.every((b) => b.closest('td').colSpan === 3), 'add-row cell still spans the table (colspan 3)');
  // optional intro/footnote start as sentinel "+" slots (renderer-seeded), editable once added
  ok([...gd.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ intro text') || gd.querySelector('.delta-prose .ce'), 'intro is a "+ intro text" slot when absent (renderer sentinel)');
  ok([...gd.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ footnote') || gd.querySelector('.gd-foot .ce'), 'footnote is a "+" slot when absent');
  // the readiness widget tracks the per-row OLD value + NEW value (new always;
  // old unless the row is marked no_old)
  let mk = [];
  renderAndDecorate(doc, false, undefined, (w) => { w.__peMarkers = (list) => { mk = list; }; });
  const hwCard = ((mk[mk.length - 1] || {}).cards || []).find((c) => /Hardware/.test(c.kind));
  const reqLabels = hwCard ? hwCard.reqs.map((r) => r.label) : [];
  ok(reqLabels.includes('old value') && reqLabels.includes('new value'), 'widget tracks a row\'s old value AND new value');
  let mk2 = [];
  renderAndDecorate({ ...doc, sections: [{ type: 'delta', data: { ...dSeed, hardware: [{ label: 'L', no_old: true }] } }] }, false, undefined, (w) => { w.__peMarkers = (list) => { mk2 = list; }; });
  const hwCard2 = ((mk2[mk2.length - 1] || {}).cards || []).find((c) => /Hardware/.test(c.kind));
  const oldLeaf = hwCard2 && hwCard2.reqs.find((r) => r.label === 'old value');
  ok(oldLeaf && oldLeaf.met, 'no_old exempts the "old value" requirement (counts as met)');
}

// ── case 14: photo-rail in-place editor (headerless image bank) ──
{
  console.log('case 14: photo-rail editor — image popover, caption, add/remove');
  const seed = JSON.parse(JSON.stringify(grammar.components['photo-rail'].seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'photo-rail', data: seed }],
  };
  const d = renderAndDecorate(doc, false);
  const pr = d.querySelector('section.wiki-section.photo-rail');
  ok(pr, 'photo-rail section rendered via its canonical include chain');
  ok(!pr.querySelector('.wiki-section-title') && !pr.querySelector('.wiki-section-eyebrow'), 'headerless — no eyebrow/H2');
  ok(pr.querySelector('.photo-rail-scroll.wiki-section-bleed'), 'full-bleed horizontal scroller');
  const card = pr.querySelector('.photo-rail-card');
  ok(card.classList.contains('pe-img-empty'), 'an empty image is flagged as a placeholder');
  ok((card.querySelector('img').getAttribute('src') || '').indexOf('data:image/svg+xml') === 0, 'empty card renders a real placeholder image (holds its 280×200 footprint with no sizing CSS)');
  ok(card.querySelector('.photo-rail-caption strong .ce'), 'caption label (strong) editable in place');
  ok(card.querySelector('.photo-rail-caption .prail-cap-line .ce[data-pe-path$=".caption"]'), 'caption line editable in place');
  ok(card.querySelector('.photo-rail-caption .prail-cap-src .ce[data-pe-path$=".source"]'), 'source line editable in place');
  ok(card.querySelector('.pr-grip[draggable="true"]'), 'drag-to-reorder grip present');
  const img = card.querySelector('img');
  ok(card.getAttribute('data-pe-opens') && /photos\.0\.src$/.test(card.getAttribute('data-pe-scope') || ''), 'the card (whole slot) is the jump target for src — so the red flash boxes the slot, not the clipped img');
  card.dispatchEvent(new d.defaultView.MouseEvent('click', { bubbles: true }));
  const ipop = [...d.querySelectorAll('.cc-pop.img-pop')].pop();
  ok(ipop && ipop.querySelector('.cc-img-url') && ipop.querySelector('.cc-img-alt'), 'clicking the slot opens a URL + alt popover (the media field is a URL today)');
  ok([...pr.querySelectorAll('.pe-add')].some((b) => b.textContent === '+ photo'), '"+ photo" tile present');
  // readiness tracks each photo's image (src) + alt text
  let mk = [];
  renderAndDecorate(doc, false, undefined, (w) => { w.__peMarkers = (list) => { mk = list; }; });
  const pcard = ((mk[mk.length - 1] || {}).cards || []).find((c) => /Photo/.test(c.kind));
  const plabels = pcard ? pcard.reqs.map((r) => r.label) : [];
  ok(plabels.includes('add image'), 'widget tracks each photo\'s image (required)');
  ok(!plabels.includes('alt text'), 'alt text is optional — not a readiness requirement');
  ok(/\.alt(\s|$)/.test(card.getAttribute('data-pe-jump') || ''), 'the slot is still the editor for alt (jump target), even though alt is optional');
}

// ── case 15: prose-rail in-place editor (prose + optional archive rail) ──
{
  console.log('case 15: prose-rail editor — editable eyebrow/icon, blocks, archive rail');
  const seed = JSON.parse(JSON.stringify(grammar.components['prose-rail'].seed));
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'prose-rail', data: seed }],
  };
  const d = renderAndDecorate(doc, false);
  const pr = d.querySelector('section.wiki-section.prose-rail');
  ok(pr, 'prose-rail section rendered via its canonical include chain');
  const eb = pr.querySelector('.wiki-section-eyebrow');
  ok(eb && eb.querySelector('.ce[data-pe-path$=".eyebrow"]'), 'eyebrow TEXT editable in place (the first non-locked eyebrow)');
  const ebIc = eb && eb.querySelector('svg');
  ok(ebIc && ebIc.getAttribute('data-pe-opens') && /\.icon$/.test(ebIc.getAttribute('data-pe-scope') || ''), 'eyebrow icon opens the sprite-derived picker');
  ok(pr.querySelector('.wiki-section-title .ce[data-pe-path$=".heading"]'), 'heading editable in place');
  ok(pr.querySelector('.wiki-section-prose > p .ce[data-pe-path$=".text"]'), 'body block text editable in place');
  ok([...pr.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ subtitle'), 'a block without a subtitle offers "+ subtitle"');
  ok([...pr.querySelectorAll('.pe-mini-add')].some((b) => b.textContent === '+ paragraph'), '"+ paragraph" add at the end of the prose column');
  const rail = pr.querySelector('.arch-rail');
  ok(rail, 'the seeded section carries the archive rail');
  ok(rail.querySelector('.arch-rail-title .ce[data-pe-path$="rail.title"]'), 'rail header title editable in place');
  ok(rail.querySelector('.pe-remove'), 'the rail itself is removable (grammar optional field)');
  const arCard = rail.querySelector('.arch-rail-card');
  ok(arCard && arCard.classList.contains('pe-img-empty'), 'an empty rail image is flagged as a placeholder');
  ok((arCard.querySelector('img').getAttribute('src') || '').indexOf('data:image/svg+xml') === 0, 'empty rail card renders a real placeholder image (holds its footprint)');
  ok(arCard.getAttribute('data-pe-opens') && /rail\.photos\.0\.src$/.test(arCard.getAttribute('data-pe-scope') || ''), 'the card is the jump target for src (opens the image editor)');
  ok(arCard.querySelector('.arch-rail-caption strong .ce[data-pe-path$=".strong"]'), 'caption title editable (the MASTER three-line format)');
  ok(arCard.querySelector('.arail-cap-line .ce[data-pe-path$=".caption"]') && arCard.querySelector('.arail-cap-src .ce[data-pe-path$=".source"]'), 'caption + source lines editable');
  ok([...rail.querySelectorAll('.pe-add, .pe-mini-add')].some((b) => b.textContent === '+ photo'), '"+ photo" tile in the rail');
  // a doc WITHOUT the rail → full-width prose + a "+ image rail" affordance
  const seed2 = JSON.parse(JSON.stringify(seed)); delete seed2.rail;
  const d2 = renderAndDecorate({ ...doc, sections: [{ type: 'prose-rail', data: seed2 }] }, false);
  const pr2 = d2.querySelector('section.wiki-section.prose-rail');
  ok(!pr2.querySelector('.arch-rail'), 'no rail in data → no rail rendered');
  ok([...pr2.querySelectorAll('.pe-add, .pe-mini-add')].some((b) => /\+ image rail/.test(b.textContent)), 'railless section offers "+ image rail"');
  // readiness: eyebrow/heading/text required; the rail's image tracked per photo
  let mk15 = [];
  renderAndDecorate(doc, false, undefined, (w) => { w.__peMarkers = (list) => { mk15 = list; }; });
  const m15 = mk15[mk15.length - 1] || {};
  const secLabels = (m15.section || []).map((l) => l.label);
  ok(secLabels.includes('Eyebrow') || secLabels.some((l) => /eyebrow/i.test(l)), 'widget tracks the eyebrow (required)');
  const pcard15 = (m15.cards || []).find((c) => /Photo/.test(c.kind));
  ok(pcard15 && pcard15.reqs.some((r) => r.label === 'add image'), 'widget tracks the rail photo\'s image ("add image")');
}

// ── case 16: ContentStore doc↔rows mapping + grammar validation (no network) ──
{
  console.log('case 16: content-store mapping — doc↔rows round-trip, grammar validation');
  const { docToRows, rowsToDoc, validateDoc, persistableDoc } = await import('../lib/content-map.mjs');
  const doc = {
    hero: { title: 'T', desc: 'D' },
    overview: { heading: 'H', paragraphs: ['P'] },
    sections: [
      { type: 'prose-rail', data: JSON.parse(JSON.stringify(grammar.components['prose-rail'].seed)) },
      { type: 'photo-rail', data: JSON.parse(JSON.stringify(grammar.components['photo-rail'].seed)) },
    ],
    _stash: { feature: { title: 'editor-only' } },
  };
  const clean = persistableDoc(doc);
  ok(!('_stash' in clean), '_stash (editor-only state) is never persisted');
  const rows = docToRows(clean);
  ok(rows.length === 4 && rows[0].component === 'hero' && rows[0].position === 0 && rows[1].component === 'overview' && rows[1].position === 1, 'hero + overview are the locked rows 0/1');
  ok(rows[2].component === 'prose-rail' && rows[3].position === 3, 'body sections follow in order');
  const back = rowsToDoc(rows);
  ok(JSON.stringify(back) === JSON.stringify(clean), 'doc → rows → doc round-trips byte-identically');
  ok(rowsToDoc(rows.slice().reverse()) && JSON.stringify(rowsToDoc(rows.slice().reverse())) === JSON.stringify(clean), 'row order in the DB does not matter (sorted by position)');
  ok(rowsToDoc([]) === null, 'no rows → null (page never stored)');
  ok(validateDoc(clean, grammar).ok, 'a doc of real grammar components validates');
  const bad = { ...clean, sections: [{ type: 'not-a-component', data: {} }] };
  const v = validateDoc(bad, grammar);
  ok(!v.ok && /not-a-component/.test(v.errors.join(' ')), 'an unknown component type is refused (grammar is the validator)');
  ok(!validateDoc({ sections: [] }, grammar).ok, 'a doc missing the locked hero/overview is refused');
}

// ── case 17: roles — class→caps mapping + class-gated decoration ──
{
  console.log('case 17: roles — class caps, field/action gating, decorated surface per class');
  const { capsFor, fieldCap, actionCap, CLASS_CAPS, NO_CAPS, canEditAnything, grantedWikiIds } = await import('../lib/caps.mjs');

  // wiki VISIBILITY (the owner's rule: no grant → no wikis shown)
  const ALL = ['apple', 'taco-bell', 'fallout'];
  ok(grantedWikiIds('admin', null, null, ALL).length === 3, 'admin sees every wiki');
  ok(JSON.stringify(grantedWikiIds('contributor', 'wiki_master', 'apple', ALL)) === JSON.stringify(['apple']), 'wiki_master sees only their wiki');
  ok(grantedWikiIds('contributor', 'writer', null, ALL).length === 3, 'writer (platform-wide grant) sees all — until per-wiki memberships');
  ok(grantedWikiIds('viewer', null, null, ALL).length === 0, 'viewer: no wikis');
  ok(grantedWikiIds('contributor', null, null, ALL).length === 0, 'contributor WITHOUT a class: no wikis (no grant)');
  const { buildPolicy } = await import('../lib/policy.mjs');
  const P = buildPolicy(grammar).fields;

  ok(!('editor' in CLASS_CAPS), 'the shelved "editor" class does not exist');
  ok(JSON.stringify(capsFor('viewer', null)) === JSON.stringify(NO_CAPS) && !canEditAnything(capsFor('viewer', null)), 'viewer: no capabilities');
  const w = capsFor('contributor', 'writer');
  ok(w.text && !w.titles && !w.structure && !w.design, 'writer: prose alone');
  const dgn = capsFor('contributor', 'designer');
  ok(!dgn.text && !dgn.titles && !dgn.structure && dgn.design, 'designer: design alone');
  const cu = capsFor('contributor', 'wiki_master');
  ok(cu.text && cu.titles && cu.structure && cu.design, 'wiki_master: everything (wiki scope lives in the DB + UI)');
  ok(JSON.stringify(capsFor('admin', null)) === JSON.stringify(cu), 'admin: everything');
  ok(JSON.stringify(capsFor('contributor', 'nope')) === JSON.stringify(NO_CAPS), 'unknown class → no capabilities');

  // field caps DERIVE from grammar rules + the canon naming convention
  ok(fieldCap('sections.0.data.body.0.text', P['prose-rail.body[].text']) === 'text', 'prose body → text');
  ok(fieldCap('sections.0.data.heading', P['prose-rail.heading']) === 'titles', 'section heading → titles (naming convention)');
  ok(fieldCap('sections.0.data.events.0.title', P['timeline.events[].title']) === 'titles', 'event title → titles (identity flag)');
  ok(fieldCap('sections.0.data.categories.0.name', P['catalog.categories[].name']) === 'titles', 'catalog names → titles');
  ok(fieldCap('sections.0.data.icon', P['prose-rail.icon']) === 'design', 'sprite icon field → design');
  ok(fieldCap('sections.0.data.tone', P['prose-rail.tone']) === 'design', 'tone → design');
  ok(fieldCap('sections.0.data.rail.photos.0.caption', P['prose-rail.rail.photos[].caption']) === 'text', 'photo caption → text');
  ok(fieldCap('sections.0.data.rail.photos.0.strong', P['prose-rail.rail.photos[].strong']) === 'titles', 'photo Image Title → titles');

  ok(actionCap('commit') === null, 'commit is always allowed');
  ok(actionCap('setTone:a') === 'design' && actionCap('set:sections.0.data.body.0.icon:lock') === 'design', 'tone/icon actions → design');
  ok(actionCap('push:sections.0.data.rail.photos') === 'structure' && actionCap('secRm:2') === 'structure' && actionCap('lmove:sections.0.data.body:0:1') === 'structure', 'mutating actions → structure');

  // decorated surface per class (the prose-rail seed exercises all four caps)
  const seed17 = JSON.parse(JSON.stringify(grammar.components['prose-rail'].seed));
  const doc17 = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: 'D', stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'prose-rail', data: seed17 }],
  };
  const withCaps = (caps) => renderAndDecorate(doc17, false, undefined, (win) => { win.__PE_CAPS = caps; });

  const dv = withCaps(capsFor('viewer', null));
  ok(!dv.querySelector('.ce') && !dv.querySelector('.pe-add, .pe-mini-add, .pe-remove'), 'viewer: a clean render — zero editing chrome');

  const dw = withCaps(capsFor('contributor', 'writer'));
  ok(dw.querySelector('.wiki-section-prose > p .ce'), 'writer: prose editable');
  ok(!dw.querySelector('.wiki-section-title .ce') && !dw.querySelector('.wiki-section-eyebrow .ce'), 'writer: headings/eyebrows stay static');
  ok(!dw.querySelector('.pe-add:not([hidden]), .pe-mini-add:not([hidden]), .pe-remove, .pe-tag-rm'), 'writer: no add/remove chrome');
  ok(!dw.querySelector('.pe-tonebtn'), 'writer: no tone controls');

  const dd = withCaps(capsFor('contributor', 'designer'));
  ok(dd.querySelector('.pe-tonebtn'), 'designer: tone controls present');
  ok(!dd.querySelector('.ce'), 'designer: no text editing at all');
  ok(!dd.querySelector('.pe-add:not([hidden]), .pe-mini-add:not([hidden])'), 'designer: no structural adds');

  const dc = withCaps(capsFor('contributor', 'wiki_master'));
  ok(dc.querySelector('.wiki-section-title .ce') && dc.querySelector('.pe-mini-add') && dc.querySelector('.pe-tonebtn'), 'wiki_master: titles + structure + design all live');
}

// ── case 18: the READER surface (Wikipedia/Fandom model) — same renderer,
// scripts kept, sentinels stripped, canon shell ──
{
  console.log('case 18: reader — keepScripts render, sentinel strip, canon shell');
  const { stripSentinels, renderReaderBody, readerShell } = await import('../lib/reader-core.mjs');
  const { buildPolicy: bp18 } = await import('../lib/policy.mjs');
  const r18 = createRenderer(includes, bp18(grammar), registry);
  const doc = {
    hero: { eyebrow: null, title: 'T', subtitle: null, subtitle_meta: null, desc: null, stats: null, search: false, search_placeholder: '', spotlight: null, feature: null },
    overview: { tone: 'b', heading: 'H', paragraphs: ['P'], infobox: null },
    sections: [{ type: 'photo-rail', data: { tone: 'special', photos: [{ src: 'x.jpg', alt: 'a', strong: 'S' }] } }],
  };
  const editor = r18.renderBody(doc, false);
  ok(editor.includes(SENT_PREFIX), 'editor render carries sentinels (the "+"-slot protocol)');
  ok(!/<script/.test(editor), 'editor render strips scripts (inert canvas)');
  const reader = renderReaderBody(r18, SENT_PREFIX, doc, false);
  ok(!reader.includes(SENT_PREFIX), 'reader render strips every sentinel (no builder plumbing for readers)');
  ok(/<script/.test(reader) && /__railLb/.test(reader), 'reader render KEEPS the canon interaction scripts (the photo-rail lightbox)');
  ok(reader.includes('photo-rail-card'), 'reader renders the same canon markup');
  ok(stripSentinels('a' + SENT_PREFIX + 'add:hero.desc__' + 'b', SENT_PREFIX) === 'ab', 'sentinel stripper is exact');
  const shell = readerShell({ title: 'P — W', wikiId: 'apple', bodyClass: 'wiki-page wiki-apple', isHome: false, bankCss: ['bank-photo-rail.css'], bodyHtml: '<main>X</main>', nav: '' });
  ok(shell.includes('/canon/wiki-typography.css') && shell.includes('/canon/wiki-universals.css') && shell.includes('/canon/bank-photo-rail.css') && shell.includes('/canon/wiki-apple-skin.css'), 'reader shell loads the live canon stack');
  ok(!shell.includes('wiki-home.css'), 'non-home page skips the home layer');
  ok(readerShell({ title: 'H', wikiId: 'apple', bodyClass: 'x', isHome: true, bankCss: [], bodyHtml: '', nav: '' }).includes('/canon/wiki-home.css'), 'home page loads the home layer');
}

// ── case 19: the revision system's pure parts — green/red diffs + approver rights ──
{
  console.log('case 19: revisions — diffDocs (the green/red), canApprove');
  const { flattenDoc, diffDocs } = await import('../lib/diff-core.mjs');
  const { canApprove } = await import('../lib/caps.mjs');
  const before = {
    hero: { title: 'Drinks.', desc: 'D' },
    overview: { heading: 'H', paragraphs: ['P1', 'P2'] },
    sections: [{ type: 'catalog', data: { title: 'Every drink', unit: 'drink' } }],
    _stash: { feature: { title: 'editor-only' } },
  };
  const after = {
    hero: { title: 'Drinksssss.', desc: 'D' },
    overview: { heading: 'H', paragraphs: ['P1'] },
    sections: [{ type: 'catalog', data: { title: 'Every drink', unit: 'drink', note: 'new!' } }],
  };
  const d = diffDocs(before, after);
  const byKind = (k) => d.filter((x) => x.kind === k);
  ok(byKind('changed').some((x) => x.path === 'hero.title' && x.old === 'Drinks.' && x.new === 'Drinksssss.'), 'the ssss shows as changed: old red, new green');
  ok(byKind('removed').some((x) => x.path === 'overview.paragraphs[1]' && x.old === 'P2'), 'a deleted paragraph shows as removed');
  ok(byKind('added').some((x) => /catalog\[0\]\.note$/.test(x.path) && x.new === 'new!'), 'a new field shows as added, labeled by the section type');
  ok(!d.some((x) => x.path.includes('_stash')), '_stash (editor-only) never appears in a diff');
  ok(diffDocs(before, before).length === 0, 'identical docs → an empty diff');
  ok(!('_stash' in flattenDoc(before) ? false : true) === false || !Object.keys(flattenDoc(before)).some((p) => p.includes('_stash')), 'flatten skips _stash');

  ok(canApprove('admin', null, null, 'apple'), 'admin approves anywhere');
  ok(canApprove('contributor', 'wiki_master', 'apple', 'apple'), "a wiki's wiki_master approves in it");
  ok(!canApprove('contributor', 'wiki_master', 'apple', 'taco-bell'), 'a wiki_master cannot approve outside their wiki');
  ok(!canApprove('contributor', 'writer', null, 'apple') && !canApprove('viewer', null, null, 'apple'), 'writers/viewers never approve');
}

// ── case 20: the WIKI IDENTITY model (origination arc) — the category
// taxonomy is canon + derived everywhere, and tile covers render from it ──
{
  console.log('case 20: wiki identity — canon taxonomy, derived pipes, tile covers');
  const yaml = (await import('js-yaml')).default;
  const canonTax = yaml.load(fs.readFileSync('../_data/wiki_categories.yml', 'utf8'));
  const tax = JSON.parse(fs.readFileSync('data/wiki-categories.json', 'utf8'));
  ok(JSON.stringify(tax) === JSON.stringify(canonTax), 'data/wiki-categories.json matches the canon yml byte-for-byte (run npm run gen if not)');
  ok(Array.isArray(tax.categories) && tax.categories.length >= 12, 'the taxonomy carries the full category set');
  ok(tax.categories.every((c) => c.key && c.label && c.icon && c.grad && tax.palette[c.grad.from] && tax.palette[c.grad.to]),
    'every category has key/label/icon and a gradient that resolves in the palette');
  ok(tax.categories.every((c) => includes.sprite.includes(`id="ic-${c.icon}"`)),
    'every category icon exists in the canon sprite');
  ok(new Set(tax.categories.map((c) => c.key)).size === tax.categories.length, 'category keys are unique');

  // browse.html DERIVES the taxonomy — first via a build-time Liquid splice
  // (iteration 1), since superseded by the /api/directory feed (iteration 3,
  // case 22). Either pipe counts; restating labels/gradients never does.
  const browse = fs.readFileSync('../browse.html', 'utf8');
  ok(browse.includes('site.data.wiki_categories') || browse.includes('/api/directory'),
    'browse.html derives its categories (Liquid splice or the directory feed)');
  ok(!browse.includes('label:"Pop Culture"') && !/\.grad-music\{background-image/.test(browse),
    'browse.html no longer restates category labels or gradient rules');

  // the reader's tile cover renders from the taxonomy
  const { wikiCoverTile } = await import('../lib/reader-core.mjs');
  const food = tax.categories.find((c) => c.key === 'food');
  const t = wikiCoverTile({ id: 'taco-bell', name: 'Taco <Bell>', categories: ['food'], tagline: 'Menus · Sauces · Slogans', status: 'live', tile_cover: { kind: 'bespoke', cls: 'c-tacobell' } }, tax);
  ok(t.includes(tax.palette[food.grad.from]) && t.includes(tax.palette[food.grad.to]), "the tile's gradient stops come from the taxonomy palette");
  ok(t.includes(`#ic-${food.icon}`), "the tile's glyph is the category's sprite icon");
  ok(t.includes('Taco &lt;Bell&gt;'), 'the wiki name is escaped');
  ok(t.includes('href="/read/taco-bell"') && t.includes('Menus · Sauces · Slogans') && t.includes(food.label), 'link, tagline and genre label all render');
  ok(!t.includes('Coming soon'), 'a live wiki shows no coming-soon badge');
  ok(wikiCoverTile({ id: 'x', name: 'X', categories: ['games'], status: 'coming_soon' }, tax).includes('Coming soon'), 'a coming-soon wiki shows the badge');
  ok(wikiCoverTile({ id: 'x', name: 'X', categories: ['games'], tile_cover: { kind: 'themed', glyph: 'pizza' } }, tax).includes('#ic-pizza'), 'tile_cover.glyph overrides the category icon');
  const bare = wikiCoverTile({ id: 'y', name: 'Y' }, tax);
  ok(bare.includes('href="/read/y"') && bare.includes('linear-gradient'), 'a wiki with no identity yet (pre-0006) still renders a cover');
}

// ── case 21: ORIGINATION (origination arc, iteration 2) — merged taxonomy,
// originated categories, tile art, id slugs, validation ──
{
  console.log('case 21: origination — merged taxonomy, tile art, validation');
  const { mergeTaxonomy, resolveColor, slugifyId, spriteIconNames, validateCategory, validateNewWiki } = await import('../lib/taxonomy.mjs');
  const { wikiCoverTile, COVER_CSS, readerIndexShell } = await import('../lib/reader-core.mjs');
  const canonTax = JSON.parse(fs.readFileSync('data/wiki-categories.json', 'utf8'));

  ok(slugifyId('Smurfs’ Village!') === 'smurfs-village' && slugifyId('Film & TV') === 'film-and-tv', 'names slugify to clean ids');

  const dbRows = [
    { key: 'tabletop', label: 'Tabletop Games', icon: 'gamepad-2', grad_from: 'oklch(0.55 0.10 200)', grad_to: 'oklch(0.40 0.13 340)' },
    { key: 'food', label: 'A collision', icon: 'pizza', grad_from: '#000', grad_to: '#111' },
  ];
  const merged = mergeTaxonomy(canonTax, dbRows);
  ok(merged.categories.length === canonTax.categories.length + 1, 'originated categories merge in; canon wins a key collision');
  const tt = merged.categories.find((c) => c.key === 'tabletop');
  ok(tt && tt.originated && tt.grad.from === 'oklch(0.55 0.10 200)', 'an originated category carries literal gradient colors');
  ok(merged.categories.find((c) => c.key === 'food').label === 'Fast Food', 'the colliding canon category is untouched');
  ok(resolveColor(canonTax.palette, 'gold', 'x') === canonTax.palette.gold && resolveColor(canonTax.palette, '#123', 'x') === '#123', 'a stop resolves palette names AND literal colors');

  // a wiki tagged with an ORIGINATED category paints its literal colors
  const t21 = wikiCoverTile({ id: 'catan', name: 'Catan', categories: ['tabletop'], tagline: 'Hexes · Trades' }, merged);
  ok(t21.includes('oklch(0.55 0.10 200)') && t21.includes('#ic-gamepad-2') && t21.includes('Tabletop Games'), 'tile covers render originated categories');
  // tile ART is per-wiki content: an image cover with a legibility scrim, no glyph
  const art = wikiCoverTile({ id: 'dune', name: 'Dune', categories: ['film'], tile_cover: { kind: 'art', src: 'https://x/y.jpg' } }, merged);
  ok(art.includes("url('https://x/y.jpg')") && art.includes('background-size:cover') && !art.includes('rd-cover-glyph'), "tile_cover kind 'art' paints the uploaded image (master media pattern)");
  ok(readerIndexShell('t', '', '').includes('.rd-cover{') && COVER_CSS.includes('.rd-cover{'), 'ONE cover stylesheet serves the reader and the origination preview');

  const icons = spriteIconNames(includes.sprite);
  ok(icons.includes('pizza') && icons.includes('book-open') && icons.length > 20, 'icon-picker choices derive from the canon sprite');
  ok(validateCategory({ key: 'tabletop', label: 'T', icon: 'pizza', grad_from: '#000', grad_to: '#111' }, merged.categories.map((c) => c.key), icons).length === 1, 'a taken key is rejected');
  ok(validateCategory({ key: 'new-cat', label: 'New', icon: 'pizza', grad_from: '#000', grad_to: '#111' }, merged.categories.map((c) => c.key), icons).length === 0, 'a valid category passes');
  ok(validateNewWiki({ name: 'Dune', id: 'dune', categories: ['film'] }, ['apple'], merged.categories.map((c) => c.key)).length === 0, 'a valid wiki passes');
  ok(validateNewWiki({ name: 'Apple', id: 'apple', categories: ['tech'] }, ['apple'], merged.categories.map((c) => c.key)).length === 1, 'a taken wiki id is rejected');
  ok(validateNewWiki({ name: 'X', id: 'x', categories: [] }, [], []).length === 1, 'a wiki needs at least one category');
}

// ── case 22: THE DIRECTORY LIVES IN THE DATABASE (origination arc, iter. 3)
// — the public feed's payload, the seeded migration, and a browse page that
// derives instead of restating ──
{
  console.log('case 22: directory — /api/directory payload, 0008 seed, browse derives');
  const { directoryPayload } = await import('../lib/taxonomy.mjs');
  const canonTax = JSON.parse(fs.readFileSync('data/wiki-categories.json', 'utf8'));

  const pay = directoryPayload(
    [{ id: 'taco-bell', name: 'Taco Bell', categories: ['food'], tagline: 'Menus', status: 'live', tile_cover: { kind: 'bespoke', cls: 'c-tacobell' }, entries: 1284, popularity: 96 },
     { id: 'bare', name: 'Bare' }],
    canonTax,
    [{ key: 'tabletop', label: 'Tabletop', icon: 'gamepad-2', grad_from: '#123', grad_to: '#456' }]);
  const food22 = pay.categories.find((c) => c.key === 'food');
  ok(food22 && food22.from === canonTax.palette.gold && food22.to === canonTax.palette.rust, 'canon categories arrive with RESOLVED colors (no palette needed by consumers)');
  const tt22 = pay.categories.find((c) => c.key === 'tabletop');
  ok(tt22 && tt22.from === '#123' && tt22.to === '#456', 'originated categories ride the same feed');
  const bare = pay.wikis.find((w) => w.id === 'bare');
  ok(bare && bare.status === 'live' && bare.tile_cover.kind === 'themed' && bare.entries === 0, 'identity-less rows (pre-0006) get safe defaults');
  ok(bare.icon && bare.icon.kind === 'auto', 'the wiki MARK (icon slot) defaults to auto');
  ok(pay.wikis[0].tile_cover.cls === 'c-tacobell' && pay.wikis[0].popularity === 96, 'identity and stats pass through');
  ok(directoryPayload([{ id: 'x', name: 'X', icon: { kind: 'glyph', name: 'pizza' } }], canonTax, []).wikis[0].icon.name === 'pizza', 'a set icon rides the feed');

  // migration 0008 seeds the WHOLE hand-built directory
  const mig = fs.readFileSync('supabase/migrations/0008_directory_seed.sql', 'utf8');
  for (const id of ['taco-bell', 'fallout', 'apple', 'smurfs-village', 'doodle-jump'])
    ok(mig.includes(`('${id}','`), `0008 seeds the ${id} flagship`);
  ok((mig.match(/'coming_soon'/g) || []).length >= 34, '0008 seeds the full coming-soon directory (34 titles)');
  ok(mig.includes('on conflict (id) do update') && mig.includes('coalesce(wikis.blurb'), '0008 re-runs refresh stats + fill only MISSING identity');

  // the browse page DERIVES — no wiki data restated on the page
  const browse22 = fs.readFileSync('../browse.html', 'utf8');
  ok(browse22.includes('/api/directory'), 'browse.html fetches the public directory feed');
  ok(!browse22.includes('entries:4821') && !browse22.includes('TAGLINES') && !browse22.includes('Crunchwraps'), 'no wiki rows, taglines or blurbs restated on the page');
  ok(!browse22.includes('site.data.wiki_categories'), 'no build-time taxonomy splice left (the feed carries the merged set)');
  ok(browse22.includes('"c-tacobell"') && browse22.includes('tile_cover'), 'the bespoke cover ART stays on-page, keyed by the DB tile_cover.cls reference');
  ok(browse22.includes('t-display') && browse22.includes('t-label') && browse22.includes('t-lead'), "the page's document text reads the canon type roles");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
