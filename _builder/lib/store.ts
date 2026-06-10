// Page-document store: the editable shape of a page + a localStorage stand-in
// for ContentStore (swaps to Supabase later, same calls). Hero + overview are
// LOCKED/required on every page — seedDoc always returns both present.
import type { Page } from './wiki';
import { FEATURE_CHIP_COUNT } from './grammar';

export type Stat = { num: string; label: string };
export type Chip = { key: string; val: string };
// hero aside — canonical "hero card": the Call-to-Action card (spotlight; cta
// REQUIRED) or the Feature card (a fixed number of chips — count from grammar).
export type SpotlightDoc = { eyebrow: string | null; title: string; desc: string | null; tags: string[]; cta: string };
export type FeatureDoc = { headLeft: string | null; headRight: string | null; title: string; desc: string | null; chips: Chip[] /* fixed count, from grammar */ };
export type AsideDoc = { variant: 'card' | 'feature'; card: SpotlightDoc; feature: FeatureDoc };
export type HeroDoc = {
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  subtitle_meta: string | null;
  desc: string | null;
  stats: Stat[] | null;
  search: boolean;              // home-only per canon
  search_placeholder: string;
  aside: AsideDoc | null;       // spotlight/feature card
};
export type InfoboxDoc = {
  label: string | null;
  title: string;
  sublabel: string | null;
  rows: [string, string][];
  badge: string | null;
} | null;
export type OverviewDoc = { tone: string; heading: string; paragraphs: string[]; infobox: InfoboxDoc };
export type PageDoc = { hero: HeroDoc; overview: OverviewDoc };

export const BLANK_CARD = (): SpotlightDoc => ({ eyebrow: 'Spotlight', title: 'Spotlight title', desc: 'Write a short description.', tags: ['Tag'], cta: 'Button label' });
export const BLANK_FEATURE = (): FeatureDoc => ({ headLeft: 'Featured', headRight: null, title: 'Feature title', desc: 'Write a short description.', chips: padChips([]) });

// canon: the Feature card shows a FIXED number of chips (not addable/removable).
// The count is single-source — read from _data/grammar.yml, not hardcoded here.
function padChips(chips: Chip[]): Chip[] {
  const n = FEATURE_CHIP_COUNT;
  const out = Array.isArray(chips) ? chips.slice(0, n) : [];
  while (out.length < n) out.push({ key: 'Label', val: 'Value' });
  return out;
}
// canon: the Call-to-Action card always has a CTA (required, can't be deleted)
const reqCta = (cta: any): string => (typeof cta === 'string' && cta.length ? cta : 'Read more →');

function buildAside(h: any): AsideDoc | null {
  if (h?.spotlight) {
    const s = h.spotlight;
    return { variant: 'card', card: { eyebrow: s.eyebrow ?? null, title: s.title || 'Card title', desc: s.desc ?? null, tags: Array.isArray(s.tags) ? s.tags : [], cta: reqCta(s.cta) }, feature: BLANK_FEATURE() };
  }
  if (h?.feature) {
    const f = h.feature;
    return { variant: 'feature', card: BLANK_CARD(), feature: { headLeft: f.head_left ?? null, headRight: f.head_right ?? null, title: f.title || 'Feature title', desc: f.desc ?? null, chips: padChips(f.chips) } };
  }
  return null;
}

// normalize an aside to the canon (fixed chip count, required cta) — guards stale saved docs
export function normAside(a: AsideDoc | null): AsideDoc | null {
  if (!a) return a;
  return { ...a, card: { ...a.card, cta: reqCta(a.card.cta) }, feature: { ...a.feature, chips: padChips(a.feature.chips) } };
}

// Seed a doc from a page's extracted data — hero + overview always present.
export function seedDoc(page: Page): PageDoc {
  const h = (page.hero || {}) as any;
  const ov = page.overview || null;
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
      aside: buildAside(h),
    },
    overview: ov
      ? { tone: ov.tone || 'b', heading: ov.heading || 'Section heading', paragraphs: ov.paragraphs.length ? ov.paragraphs : ['Write the overview here…'], infobox: ov.infobox }
      : { tone: 'b', heading: 'Section heading', paragraphs: ['Write the overview here…'], infobox: null },
  };
}

const KEY = (id: string) => `viziwiki:page:${id}`;

export function loadPageDoc(page: Page): PageDoc {
  try {
    const saved = localStorage.getItem(KEY(page.id));
    if (saved) {
      const doc = JSON.parse(saved) as PageDoc;
      doc.hero.aside = normAside(doc.hero.aside); // bring older saves up to canon
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
