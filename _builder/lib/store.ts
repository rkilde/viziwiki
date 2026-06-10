// Page-document store: the editable shape of a page + a localStorage stand-in
// for ContentStore (swaps to Supabase later, same calls). Hero + overview are
// LOCKED/required on every page — seedDoc always returns both present.
//
// The doc shape IS the canonical front-matter data contract (hero:/overview:
// blocks, snake_case keys) — the same data the Liquid includes consume on the
// live site. The editor renders by running the repo's own includes over this
// doc, so there is no builder-side restatement of the canon.
import type { Page } from './wiki';
import { FEATURE_CHIP_COUNT } from './grammar';

export type Stat = { num: string; label: string };
export type Chip = { key: string; val: string };
// hero card (aside) — Call-to-Action card (spotlight; cta REQUIRED) or the
// Feature card (a fixed number of chips — count from grammar).
export type SpotlightDoc = { eyebrow?: string | null; title: string; desc?: string | null; tags: string[]; cta: string };
export type FeatureDoc = { head_left?: string | null; head_right?: string | null; title: string; desc?: string | null; chips: Chip[] };
export type HeroDoc = {
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  subtitle_meta: string | null;
  desc: string | null;
  stats: Stat[] | null;
  search: boolean;              // home-only per canon
  search_placeholder: string;
  spotlight: SpotlightDoc | null;   // at most one aside —
  feature: FeatureDoc | null;       // spotlight XOR feature (canon)
};
export type InfoboxDoc = {
  label: string | null;
  title: string;
  sublabel: string | null;
  rows: [string, string][];
  badge: string | null;
} | null;
export type OverviewDoc = { tone: string; heading: string; paragraphs: string[]; infobox: InfoboxDoc };
// _stash holds the inactive aside variant so switching card<->feature keeps
// your edits. Editor state only — never rendered, never part of the contract.
export type PageDoc = { hero: HeroDoc; overview: OverviewDoc; _stash?: { spotlight?: SpotlightDoc; feature?: FeatureDoc } };

export const BLANK_CARD = (): SpotlightDoc => ({ eyebrow: 'Spotlight', title: 'Spotlight title', desc: 'Write a short description.', tags: ['Tag'], cta: 'Button label' });
export const BLANK_FEATURE = (): FeatureDoc => ({ head_left: 'Featured', head_right: null, title: 'Feature title', desc: 'Write a short description.', chips: padChips([]) });

// canon: the Feature card shows a FIXED number of chips (not addable/removable).
// The count is single-source — read from _data/grammar.yml, not hardcoded here.
export function padChips(chips: Chip[]): Chip[] {
  const n = FEATURE_CHIP_COUNT;
  const out = Array.isArray(chips) ? chips.slice(0, n) : [];
  while (out.length < n) out.push({ key: 'Label', val: 'Value' });
  return out;
}
// canon: the Call-to-Action card always has a CTA (required, can't be deleted)
export const reqCta = (cta: any): string => (typeof cta === 'string' && cta.length ? cta : 'Read more →');

// Seed a doc from a page's extracted front-matter — hero + overview always present.
export function seedDoc(page: Page): PageDoc {
  const h = (page.hero || {}) as any;
  const ov = page.overview || null;
  const s = h.spotlight, f = h.feature;
  return {
    hero: {
      eyebrow: h.eyebrow ?? null,
      title: h.title || page.title || 'Page title',
      subtitle: h.subtitle ?? null,
      subtitle_meta: h.subtitle_meta ?? null,
      desc: h.desc ?? null,
      stats: Array.isArray(h.stats) && h.stats.length ? h.stats : null,
      search: !!h.search,
      search_placeholder: h.search_placeholder || 'Search this wiki…',
      spotlight: s ? { eyebrow: s.eyebrow ?? null, title: s.title || 'Spotlight title', desc: s.desc ?? null, tags: Array.isArray(s.tags) ? s.tags : [], cta: reqCta(s.cta) } : null,
      feature: !s && f ? { head_left: f.head_left ?? null, head_right: f.head_right ?? null, title: f.title || 'Feature title', desc: f.desc ?? null, chips: padChips(f.chips) } : null,
    },
    overview: ov
      ? { tone: ov.tone || 'b', heading: ov.heading || 'Section heading', paragraphs: ov.paragraphs.length ? ov.paragraphs : ['Write the overview here…'], infobox: ov.infobox }
      : { tone: 'b', heading: 'Section heading', paragraphs: ['Write the overview here…'], infobox: null },
  };
}

// v2: the canonical-contract doc shape (v1 docs had a builder-only aside shape)
const KEY = (id: string) => `viziwiki:page:v2:${id}`;

export function loadPageDoc(page: Page): PageDoc {
  try {
    const saved = localStorage.getItem(KEY(page.id));
    if (saved) {
      const doc = JSON.parse(saved) as PageDoc;
      // bring older saves up to canon (required cta, fixed chip count)
      if (doc.hero.spotlight) doc.hero.spotlight.cta = reqCta(doc.hero.spotlight.cta);
      if (doc.hero.feature) doc.hero.feature.chips = padChips(doc.hero.feature.chips);
      return doc;
    }
  } catch { /* ignore */ }
  return seedDoc(page);
}
export function savePageDoc(pageId: string, doc: PageDoc) {
  localStorage.setItem(KEY(pageId), JSON.stringify(doc));
}
export function resetPageDoc(pageId: string) {
  localStorage.removeItem(KEY(pageId));
}
