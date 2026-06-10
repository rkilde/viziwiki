// Builder mutations: creating new wikis + new category/page nodes. Today this
// is a localStorage stand-in for ContentStore (swaps to Supabase later, same
// calls). New wikis get the NEUTRAL BASE SKIN (no skin of their own yet → mono
// greyscale). New nodes are stored as an overlay merged into the wiki tree at
// render time, so we never mutate the git-extracted static JSON.
import type { Wiki, Page, WikiSkin } from './wiki';

// the fallback skin for a brand-new, unstyled wiki — renders mono greyscale.
// No wiki-{name} body class, so only wiki-base-skin.css's tokens fire.
export const BASE_SKIN: WikiSkin = { bodyClass: 'wiki-page wiki-base', css: ['wiki-base-skin.css'] };

const EMPTY_HERO: Page['hero'] = { eyebrow: null, title: null, subtitle: null, subtitle_meta: null, desc: null, stats: [], search: false, search_placeholder: null, spotlight: null, feature: null };
const uid = (p: string) => p + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

// A new node: a draft page seeded only with a title. hero + overview templates
// are filled in by seedDoc when it's opened (both are locked on every page).
export function blankPage(title: string, folder: boolean): Page {
  return {
    id: uid('n-'), title, permalink: null, status: 'draft', folder,
    count: folder ? 0 : null, accent: null, sections: [], hero: { ...EMPTY_HERO }, overview: null, pages: [],
  };
}
export function blankWiki(name: string): Wiki {
  return { id: uid('w-'), name, pages: [], skin: BASE_SKIN };
}

// ── overlay model ──────────────────────────────────────────────────────
// children[`${wikiId}::${parentId}`] = nodes added under that parent (parentId
// '' = the wiki root). User-created wikis are stored whole (with empty pages —
// their children live in the same overlay, keyed by the wiki id + node id).
export type ChildOverlay = Record<string, Page[]>;
const W_KEY = 'viziwiki:builder:wikis';
const C_KEY = 'viziwiki:builder:children';

export function loadUserWikis(): Wiki[] {
  try { const s = localStorage.getItem(W_KEY); return s ? (JSON.parse(s) as Wiki[]) : []; } catch { return []; }
}
export function saveUserWikis(wikis: Wiki[]) { try { localStorage.setItem(W_KEY, JSON.stringify(wikis)); } catch { /* ignore */ } }
export function loadChildren(): ChildOverlay {
  try { const s = localStorage.getItem(C_KEY); return s ? (JSON.parse(s) as ChildOverlay) : {}; } catch { return {}; }
}
export function saveChildren(c: ChildOverlay) { try { localStorage.setItem(C_KEY, JSON.stringify(c)); } catch { /* ignore */ } }

// Splice the overlay's added children into a wiki tree (recursively — an added
// node can itself have added children). Static nodes keep their JSON children.
function mergePages(wikiId: string, parentId: string, pages: Page[], c: ChildOverlay): Page[] {
  const own = pages.map((p) => ({ ...p, pages: mergePages(wikiId, p.id, p.pages, c) }));
  const added = (c[`${wikiId}::${parentId}`] || []).map((p) => ({ ...p, pages: mergePages(wikiId, p.id, p.pages, c) }));
  const merged = [...own, ...added];
  return merged;
}
export function mergeWiki(wiki: Wiki, c: ChildOverlay): Wiki {
  return { ...wiki, pages: mergePages(wiki.id, '', wiki.pages, c) };
}
