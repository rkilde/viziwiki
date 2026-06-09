// Page-document store: the editable shape of a page + a localStorage stand-in
// for ContentStore (swaps to Supabase later, same calls). Hero + overview are
// LOCKED/required on every page — seedDoc always returns both present.
import type { Page } from './wiki';

export type Stat = { num: string; label: string };
export type HeroDoc = {
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  subtitle_meta: string | null;
  desc: string | null;
  stats: Stat[] | null;
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

// Seed a doc from a page's extracted data — hero + overview always present.
export function seedDoc(page: Page): PageDoc {
  const h = page.hero || ({} as Page['hero']);
  const ov = page.overview || null;
  return {
    hero: {
      eyebrow: h.eyebrow ?? null,
      title: h.title || page.title || 'New page title',
      subtitle: h.subtitle ?? null,
      subtitle_meta: h.subtitle_meta ?? null,
      desc: h.desc ?? null,
      stats: Array.isArray(h.stats) && h.stats.length ? h.stats : null,
    },
    overview: ov
      ? { tone: ov.tone || 'b', heading: ov.heading || 'Overview', paragraphs: ov.paragraphs.length ? ov.paragraphs : ['Write the overview here.'], infobox: ov.infobox }
      : { tone: 'b', heading: 'Overview', paragraphs: ['Write the overview here.'], infobox: null },
  };
}

const KEY = (id: string) => `viziwiki:page:${id}`;

export function loadPageDoc(page: Page): PageDoc {
  try {
    const saved = localStorage.getItem(KEY(page.id));
    if (saved) return JSON.parse(saved) as PageDoc;
  } catch { /* ignore */ }
  return seedDoc(page);
}
export function savePageDoc(pageId: string, doc: PageDoc) {
  localStorage.setItem(KEY(pageId), JSON.stringify(doc));
}
export function resetPageDoc(pageId: string) {
  localStorage.removeItem(KEY(pageId));
}
