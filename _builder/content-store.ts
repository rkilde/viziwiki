/* ════════════════════════════════════════════════════════════════════
   content-store.ts — the ONE seam between the builder and where content lives.
   --------------------------------------------------------------------
   The builder UI imports ONLY this interface (plus the `contentStore`
   singleton below). It never talks to git or to Supabase directly. To change
   backends you swap the implementation — the builder code never changes
   ("no transfer headache", see docs/registry-grammar-proposal.md).

   The persisted document IS the editor's PageDoc (lib/store.ts) — which is
   itself the canonical front-matter data contract the Liquid includes
   consume. Mapping doc ↔ DB rows + grammar validation live in
   lib/content-map.mjs (pure, covered by guard case 16). Schema:
   supabase/migrations/0001_init.sql.
   ════════════════════════════════════════════════════════════════════ */
import type { PageDoc } from './lib/store';
import { GRAMMAR } from './lib/grammar';
import { supabase } from './lib/supabase';
import { docToRows, rowsToDoc, validateDoc, persistableDoc } from './lib/content-map.mjs';

export interface WikiMeta { id: string; slug: string; name: string; skin: string; }
export interface PageMeta { id: string; slug: string; title: string; type: string; }

/** The contract. Every backend implements exactly these six methods. */
export interface ContentStore {
  listWikis(): Promise<WikiMeta[]>;
  listPages(wiki: string): Promise<PageMeta[]>;
  /** The stored doc, or null if this page has never been saved to the store. */
  loadPage(wiki: string, page: string): Promise<PageDoc | null>;
  /** Validates against grammar.yml (rule #5 — the grammar is the validator),
   *  then persists. Upserts the wiki + page rows so an empty database
   *  bootstraps itself from the first save. */
  savePage(wiki: WikiMeta, page: PageMeta, doc: PageDoc): Promise<void>;
  createPage(wiki: WikiMeta, meta: PageMeta, doc: PageDoc): Promise<PageMeta>;
  deletePage(wiki: string, page: string): Promise<void>;
}

/* ── Implementation A — git/files (dev-era idea; superseded) ────────────
   Front-matter + GitHub-API commits. Kept as the documented alternative;
   never built — the platform scope decided Supabase (see CLAUDE.md). */
export class GitContentStore implements ContentStore {
  async listWikis(): Promise<WikiMeta[]> { throw new Error("GitContentStore not built — Supabase is the decided path"); }
  async listPages(): Promise<PageMeta[]> { throw new Error("GitContentStore not built"); }
  async loadPage(): Promise<PageDoc | null> { throw new Error("GitContentStore not built"); }
  async savePage(): Promise<void>         { throw new Error("GitContentStore not built"); }
  async createPage(): Promise<PageMeta>   { throw new Error("GitContentStore not built"); }
  async deletePage(): Promise<void>       { throw new Error("GitContentStore not built"); }
}

/* ── Implementation B — Supabase (the platform path) ──────────────────── */
export class SupabaseContentStore implements ContentStore {
  constructor(private db: NonNullable<typeof supabase>) {}

  async listWikis(): Promise<WikiMeta[]> {
    const { data, error } = await this.db.from('wikis').select('id, slug, name, skin').order('id');
    if (error) throw error;
    return data ?? [];
  }

  async listPages(wiki: string): Promise<PageMeta[]> {
    const { data, error } = await this.db.from('pages').select('id, slug, title, type').eq('wiki_id', wiki).order('id');
    if (error) throw error;
    return data ?? [];
  }

  async loadPage(wiki: string, page: string): Promise<PageDoc | null> {
    const { data, error } = await this.db
      .from('sections').select('position, component, data')
      .eq('wiki_id', wiki).eq('page_id', page).order('position');
    if (error) throw error;
    return rowsToDoc(data ?? []) as PageDoc | null;
  }

  async savePage(wiki: WikiMeta, page: PageMeta, doc: PageDoc): Promise<void> {
    const clean = persistableDoc(doc);
    const v = validateDoc(clean, GRAMMAR);
    if (!v.ok) throw new Error('doc failed grammar validation: ' + v.errors.join('; '));
    // bootstrap parents (idempotent)
    let r = await this.db.from('wikis').upsert({ id: wiki.id, slug: wiki.slug, name: wiki.name, skin: wiki.skin }, { onConflict: 'id' });
    if (r.error) throw r.error;
    r = await this.db.from('pages').upsert({ wiki_id: wiki.id, id: page.id, slug: page.slug, title: page.title, type: page.type }, { onConflict: 'wiki_id,id' });
    if (r.error) throw r.error;
    // replace the section rows: upsert the new set, then drop any stale tail
    const rows = docToRows(clean).map((row: any) => ({ wiki_id: wiki.id, page_id: page.id, ...row }));
    r = await this.db.from('sections').upsert(rows, { onConflict: 'wiki_id,page_id,position' });
    if (r.error) throw r.error;
    r = await this.db.from('sections').delete().eq('wiki_id', wiki.id).eq('page_id', page.id).gte('position', rows.length);
    if (r.error) throw r.error;
  }

  async createPage(wiki: WikiMeta, meta: PageMeta, doc: PageDoc): Promise<PageMeta> {
    await this.savePage(wiki, meta, doc);
    return meta;
  }

  async deletePage(wiki: string, page: string): Promise<void> {
    const { error } = await this.db.from('pages').delete().eq('wiki_id', wiki).eq('id', page);
    if (error) throw error;  // sections cascade
  }
}

/** The live store: Supabase when the env keys are set, otherwise null and the
 *  builder stays on its localStorage stand-in (lib/store.ts). */
export const contentStore: ContentStore | null = supabase ? new SupabaseContentStore(supabase) : null;
