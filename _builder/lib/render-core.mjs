// THE DERIVED RENDERER (core). Renders the editor canvas body by EXECUTING the
// repo's own Liquid includes (LiquidJS, Jekyll mode). Field POLICY — which
// fields are optional, their starter values, list bounds — is COMPUTED from
// the grammar policy (lib/policy.mjs), never restated here: flip a field to
// required in _data/grammar.yml and the "+" slot disappears on the next build.
//
// What this file DOES own: the shape adapter between the page doc and each
// include's data contract (the field names the include itself declares), and
// the sentinel protocol. Absent OPTIONAL fields render as sentinel values so
// the include still emits the element in its canonical position; the decorator
// swaps each sentinel element for a "+" slot.
//
// Plain .mjs on purpose: imported by the TypeScript app AND by the Node test
// so there is exactly one copy of this logic.
import { Liquid } from 'liquidjs';
import { ruleFor } from './policy.mjs';

export const SENT_PREFIX = '__PE_ADD__';

export function createRenderer(includesData, policy) {
  const INCLUDES = includesData.includes;
  const SPRITE = includesData.sprite;

  const engine = new Liquid({
    jekyllInclude: true,
    extname: '.html',
    relativeReference: false,
    fs: {
      readFileSync: (f) => INCLUDES[f] ?? '',
      existsSync: (f) => f in INCLUDES,
      readFile: async (f) => INCLUDES[f] ?? '',
      exists: async (f) => f in INCLUDES,
      resolve: (_dir, file, ext) => (file.endsWith('.html') ? file : file + ext),
      sep: '/',
      contains: () => true,
    },
  });

  const PAGE_TPL = engine.parse(
    '{% include sections/hero.html data=page.hero %}{% include sections/overview.html data=page.overview %}'
  );

  const SENT = (action) => `${SENT_PREFIX}${action}__`;
  // value for an optional-per-grammar field: the value, or a "+" sentinel.
  // If grammar flips the field to REQUIRED, it backfills its blank instead —
  // the element is always present, the "+" slot disappears.
  const opt = (path, value) => {
    const rule = ruleFor(policy, path) || {};
    if (rule.required) return value ?? rule.blank;
    return value ?? SENT('add:' + path);
  };

  function projectHero(doc, isHome) {
    const h = doc.hero;
    const s = h.spotlight, f = h.feature;
    const noAside = !s && !f;
    // the search bar belongs to the page type whose hero variant is "search"
    // (grammar page_types) — other page types don't even get the option
    const searchable = (isHome ? policy.variants.home : policy.variants.standard) === 'search';
    return {
      title: h.title,
      eyebrow: opt('hero.eyebrow', h.eyebrow),
      subtitle: opt('hero.subtitle', h.subtitle),
      // grammar: subtitle_meta `requires: subtitle` — only offered alongside it
      subtitle_meta: h.subtitle != null ? opt('hero.subtitle_meta', h.subtitle_meta) : null,
      desc: opt('hero.desc', h.desc),
      search: searchable,
      search_placeholder: !searchable ? null : h.search ? h.search_placeholder : SENT('add:hero.search'),
      stats: h.stats ?? [{ num: SENT('add:hero.stats'), label: '' }],
      // hero card: spotlight XOR feature (canon); neither → a sentinel whose
      // aside the decorator turns into the dual "+ card" slot
      spotlight: s
        ? { eyebrow: opt('hero.spotlight.eyebrow', s.eyebrow), title: s.title, desc: opt('hero.spotlight.desc', s.desc), tags: s.tags, cta: s.cta }
        : noAside ? { title: SENT('addAside') } : null,
      feature: f
        ? { head_left: f.head_left ?? '', head_right: opt('hero.feature.head_right', f.head_right), title: f.title, desc: opt('hero.feature.desc', f.desc), chips: f.chips }
        : null,
    };
  }

  function projectOverview(doc) {
    const o = doc.overview;
    const ib = o.infobox;
    return {
      tone: o.tone || (ruleFor(policy, 'overview.tone') || {}).blank || 'b',
      heading: o.heading,
      paragraphs: o.paragraphs,
      // no infobox → a sentinel panel; the decorator turns it into the dashed
      // "+ infobox" slot IN the right column where the real one renders
      infobox: ib
        ? { label: ib.label ?? undefined, title: ib.title, sublabel: opt('overview.infobox.sublabel', ib.sublabel), rows: ib.rows, badge: opt('overview.infobox.badge', ib.badge) }
        : { title: SENT('add:overview.infobox'), rows: [] },
    };
  }

  // render the page body from the CANONICAL templates (sprite first so the
  // includes' <use href="#ic-*"> resolve after every body swap)
  function renderBody(doc, isHome = false) {
    const page = { hero: projectHero(doc, isHome), overview: projectOverview(doc) };
    return SPRITE + engine.renderSync(PAGE_TPL, { page });
  }

  return { renderBody, sprite: SPRITE };
}
