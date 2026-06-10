// THE DERIVED RENDERER. The editor canvas body is produced by EXECUTING the
// repo's own Liquid includes (surfaced via extract-includes.mjs) with LiquidJS
// in Jekyll mode — the exact templates the live site builds with. Editing a
// canonical include in the repo changes the live site AND the editor; there is
// no builder-side copy of the markup.
//
// Absent OPTIONAL fields are projected as SENTINEL values so the include still
// renders the element in its canonical position; the decorator
// (public/editor/decorate.js) then swaps each sentinel element for a dashed
// "+ add" slot — so even empty states sit exactly where the canon would put
// the real element.
import { Liquid } from 'liquidjs';
import includesData from '../data/includes.json';
import type { PageDoc } from './store';

const INCLUDES: Record<string, string> = (includesData as any).includes;
export const ICON_SPRITE: string = (includesData as any).sprite;

// sentinel protocol shared with decorate.js (injected as window.__PE_SENT)
export const SENT_PREFIX = '__PE_ADD__';
const SENT = (action: string) => `${SENT_PREFIX}${action}__`;

// LiquidJS in Jekyll mode over the in-memory canonical includes
const engine = new Liquid({
  jekyllInclude: true,
  extname: '.html',
  relativeReference: false,
  fs: {
    readFileSync: (f: string) => INCLUDES[f] ?? '',
    existsSync: (f: string) => f in INCLUDES,
    readFile: async (f: string) => INCLUDES[f] ?? '',
    exists: async (f: string) => f in INCLUDES,
    resolve: (_dir: string, file: string, ext: string) => (file.endsWith('.html') ? file : file + ext),
    sep: '/',
    contains: () => true,
  } as any,
});

const PAGE_TPL = engine.parse(
  '{% include sections/hero.html data=page.hero %}{% include sections/overview.html data=page.overview %}'
);

// ── projection: doc → the include's data contract, with sentinels ──────────
function projectHero(doc: PageDoc, isHome: boolean): any {
  const h = doc.hero;
  const s = h.spotlight, f = h.feature;
  const noAside = !s && !f;
  return {
    // required
    title: h.title,
    // optional → sentinel when absent
    eyebrow: h.eyebrow ?? SENT('addEyebrow'),
    subtitle: h.subtitle ?? SENT('addSubtitle'),
    // meta only offers itself when a subtitle exists
    subtitle_meta: h.subtitle != null ? (h.subtitle_meta ?? SENT('addMeta')) : null,
    desc: h.desc ?? SENT('addDesc'),
    // search: HOME-only canon — other pages don't even get the option
    search: isHome,
    search_placeholder: !isHome ? null : h.search ? h.search_placeholder : SENT('addSearch'),
    stats: h.stats ?? [{ num: SENT('addStats'), label: '' }],
    // hero card: spotlight XOR feature; neither → a sentinel spotlight whose
    // aside the decorator turns into the dual "+ card" slot
    spotlight: s
      ? { eyebrow: s.eyebrow ?? SENT('spAddEyebrow'), title: s.title, desc: s.desc ?? SENT('spAddDesc'), tags: s.tags, cta: s.cta }
      : noAside ? { title: SENT('addAside') } : null,
    feature: f
      ? { head_left: f.head_left ?? '', head_right: f.head_right ?? SENT('ftAddHeadRight'), title: f.title, desc: f.desc ?? SENT('ftAddDesc'), chips: f.chips }
      : null,
  };
}

function projectOverview(doc: PageDoc): any {
  const o = doc.overview;
  const ib = o.infobox;
  return {
    tone: o.tone || 'b',
    heading: o.heading,
    paragraphs: o.paragraphs,
    // no infobox → a sentinel panel; the decorator turns it into the dashed
    // "+ infobox" slot IN the right column where the real one renders
    infobox: ib
      ? { label: ib.label ?? undefined, title: ib.title, sublabel: ib.sublabel ?? SENT('addSublabel'), rows: ib.rows, badge: ib.badge ?? SENT('addBadge') }
      : { title: SENT('addInfobox'), rows: [] },
  };
}

// render the page body from the CANONICAL templates (sprite first so the
// includes' <use href="#ic-*"> resolve after every body swap)
export function renderBody(doc: PageDoc, isHome = false): string {
  const page = { hero: projectHero(doc, isHome), overview: projectOverview(doc) };
  return ICON_SPRITE + engine.renderSync(PAGE_TPL, { page });
}
