// GET /read — the reader's wiki index (from the content database).
// Each wiki renders as its TILE COVER (the origination arc): gradient +
// glyph derived from the canon category taxonomy, title + tagline over it.
import { html, noDb, readerIndexShell, readerNav, renderer, serverSupabase, wikiCoverTile } from '../../lib/reader';
import { mergeTaxonomy } from '../../lib/taxonomy.mjs';
import taxonomyCanon from '../../data/wiki-categories.json';

export const revalidate = 60;   // edge-cached; re-rendered at most once a minute

export async function GET() {
  const db = serverSupabase();
  if (!db) return noDb();
  // identity columns arrive with migration 0006 — pre-0006 rows fall back to
  // the bare listing shape and render as identity-less themed covers
  let r: { data: any[] | null; error: any } = await db.from('wikis').select('id, name, categories, blurb, tagline, status, tile_cover').order('name');
  if (r.error) r = await db.from('wikis').select('id, name').order('name');
  if (r.error) return noDb();
  // admin-ORIGINATED categories (migration 0007) merge into the canon taxonomy
  // so wikis tagged with them paint real covers ([] on a pre-0007 database)
  const dbCats = await db.from('wiki_categories').select('key, label, icon, grad_from, grad_to');
  const taxonomy = mergeTaxonomy(taxonomyCanon as any, dbCats.error ? [] : dbCats.data || []);
  const items = (r.data || []).map((w: any) => wikiCoverTile(w, taxonomy)).join('');
  return html(readerIndexShell('Wikis — ViziWiki Reader', readerNav([['Wikis', null]]),
    `<div class="rd-eyebrow">ViziWiki · Reader</div><h1>Wikis.</h1>` +
    (items
      ? renderer.sprite + `<div class="rd-covers">${items}</div>`
      : `<div class="rd-empty">Nothing published yet — save a page in the build kit and it appears here.</div>`)));
}
