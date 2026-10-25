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

/** A wiki's tile cover (migrations 0006/0007 — the origination arc). Tile art
 *  is PER-WIKI CONTENT, not canon design — the canon owns only the tile frame.
 *  "themed" = the data-driven default: gradient + glyph DERIVED from the
 *  wiki's first category (`glyph` optionally overrides the icon). "art" = the
 *  wiki's own uploaded cover image (`src` — the master media pattern: a URL
 *  today, a Supabase Storage upload later). "html" = UPLOADED TILE-ART FILE
 *  (a designer's self-contained html/css/svg tile — parsed + sanitized by
 *  lib/tile-html.mjs into its skin `cls`, skin-scoped `css`, and decorative
 *  `inner` markup; identity text renders from the database on top).
 *  "bespoke" REFERENCES a hand-built flagship cover class in browse.html by
 *  name (never restated art). */
export interface TileCover { kind: 'themed' | 'art' | 'html' | 'bespoke'; src?: string; cls?: string; glyph?: string; css?: string; inner?: string; }
/** The wiki's small MARK (migration 0009) — the compact identity shown in the
 *  build kit's switcher and, as the chrome goes DB-native, the live wiki-bar
 *  logo / TOC rail. Per-wiki content: "auto" = derived letter mark (default),
 *  "glyph" = a canon sprite icon, "art" = the wiki's own image (master media
 *  pattern — a URL today, a Storage upload at launch). */
export interface WikiIcon { kind: 'auto' | 'glyph' | 'art'; name?: string; src?: string; }
export interface WikiMeta {
  id: string; slug: string; name: string; skin: string;
  /** Identity (migration 0006) — optional so pre-0006 rows and the extracted
   *  flagship metas stay valid; listWikis fills defaults when absent. */
  categories?: string[]; blurb?: string | null; tagline?: string | null;
  status?: 'live' | 'coming_soon'; tile_cover?: TileCover; icon?: WikiIcon;
}
/** A PAGE's small MARK (its emblem — migration 0010, same master-media shape
 *  as the wiki's): a sprite/library glyph, or the page's own image/SVG art. */
export type PageIcon = { kind: 'glyph'; name: string } | { kind: 'art'; src: string };
export interface PageMeta { id: string; slug: string; title: string; type: string; icon?: PageIcon | null; }
/** One row of a page's history (phase 3 — the revision system). */
export interface RevisionMeta {
  id: number; status: 'pending' | 'published' | 'rejected';
  author_email: string | null; note: string | null;
  reviewed_email: string | null; created_at: string;
}
export interface SaveResult { revId: number | null; published: boolean; }
/** An admin-ORIGINATED category (migration 0007) — the canon 12 live in
 *  _data/wiki_categories.yml; surfaces render the merged set (lib/taxonomy.mjs). */
export interface CategoryRow { key: string; label: string; icon: string; grad_from: string; grad_to: string; }

/** The contract. Every backend implements exactly these six methods. */
export interface ContentStore {
  listWikis(): Promise<WikiMeta[]>;
  listPages(wiki: string): Promise<PageMeta[]>;
  /** The stored doc, or null if this page has never been saved to the store. */
  loadPage(wiki: string, page: string): Promise<PageDoc | null>;
  /** Validates against grammar.yml (rule #5 — the grammar is the validator),
   *  then persists the working copy AND appends a revision (phase 3: every
   *  save is history). `publish: true` (approvers) publishes it immediately —
   *  the DB re-checks approver rights. Returns the revision + whether it
   *  went live. Upserts the wiki + page rows so an empty database bootstraps
   *  itself from the first save. */
  savePage(wiki: WikiMeta, page: PageMeta, doc: PageDoc, opts?: { publish?: boolean }): Promise<SaveResult>;
  createPage(wiki: WikiMeta, meta: PageMeta, doc: PageDoc): Promise<PageMeta>;
  deletePage(wiki: string, page: string): Promise<void>;
  // ── phase 3: the revision system ──
  listRevisions(wiki: string, page: string, limit?: number): Promise<RevisionMeta[]>;
  getRevisionDoc(id: number): Promise<PageDoc | null>;
  publishRevision(id: number): Promise<void>;
  rejectRevision(id: number, reason?: string): Promise<void>;
  /** Revert = a NEW published revision copied from `id` (linear history). */
  revertTo(id: number): Promise<number>;
  // ── the origination arc (iteration 2) ──
  /** Originate a wiki: insert its row WITH identity (admin; RLS re-checks). */
  createWiki(meta: WikiMeta): Promise<void>;
  /** Update a wiki's IDENTITY (tile cover, tags, blurb, tagline, status) —
   *  admin or the wiki's master; never touches id/slug/skin/content. */
  updateWikiIdentity(id: string, patch: Pick<WikiMeta, 'categories' | 'blurb' | 'tagline' | 'status' | 'tile_cover' | 'icon'>): Promise<void>;
  /** Admin-originated categories ([] on a pre-0007 database). */
  listCategories(): Promise<CategoryRow[]>;
  createCategory(cat: CategoryRow): Promise<void>;
  /** Edit / remove an ORIGINATED category (the canon 12 live in the repo —
   *  changing those is a canon edit, never a UI action). */
  updateCategory(cat: CategoryRow): Promise<void>;
  deleteCategory(key: string): Promise<void>;
  /** OPTIONAL grant: make `email`'s account the wiki master of `wikiId`
   *  (admin updates profiles). Throws a clear error if no such account. */
  grantWikiMaster(email: string, wikiId: string): Promise<void>;
  /** PERMANENTLY delete a wiki — its pages, sections, and whole revision
   *  history cascade with it (admin only; the RLS delete policy re-checks).
   *  NOT undoable from the app: recovery exists only via database backups. */
  deleteWiki(id: string): Promise<void>;
  /** Set (or clear, with null) a PAGE's emblem — upserts the page row so a
   *  flagship page whose content still lives in git gets a row carrying just
   *  its identity + mark (it holds no published revision, so readers never
   *  see it as a page). */
  setPageIcon(wikiId: string, page: PageMeta, icon: PageIcon | null): Promise<void>;
}

/* ── Implementation A — git/files (dev-era idea; superseded) ────────────
   Front-matter + GitHub-API commits. Kept as the documented alternative;
   never built — the platform scope decided Supabase (see CLAUDE.md). */
export class GitContentStore implements ContentStore {
  async listWikis(): Promise<WikiMeta[]> { throw new Error("GitContentStore not built — Supabase is the decided path"); }
  async listPages(): Promise<PageMeta[]> { throw new Error("GitContentStore not built"); }
  async loadPage(): Promise<PageDoc | null> { throw new Error("GitContentStore not built"); }
  async savePage(): Promise<SaveResult>   { throw new Error("GitContentStore not built"); }
  async createPage(): Promise<PageMeta>   { throw new Error("GitContentStore not built"); }
  async deletePage(): Promise<void>       { throw new Error("GitContentStore not built"); }
  async listRevisions(): Promise<RevisionMeta[]> { throw new Error("GitContentStore not built"); }
  async getRevisionDoc(): Promise<PageDoc | null> { throw new Error("GitContentStore not built"); }
  async publishRevision(): Promise<void>  { throw new Error("GitContentStore not built"); }
  async rejectRevision(): Promise<void>   { throw new Error("GitContentStore not built"); }
  async revertTo(): Promise<number>       { throw new Error("GitContentStore not built"); }
  async createWiki(): Promise<void>       { throw new Error("GitContentStore not built"); }
  async updateWikiIdentity(): Promise<void> { throw new Error("GitContentStore not built"); }
  async listCategories(): Promise<CategoryRow[]> { throw new Error("GitContentStore not built"); }
  async createCategory(): Promise<void>   { throw new Error("GitContentStore not built"); }
  async setPageIcon(): Promise<void>      { throw new Error("GitContentStore not built"); }
  async updateCategory(): Promise<void>   { throw new Error("GitContentStore not built"); }
  async deleteCategory(): Promise<void>   { throw new Error("GitContentStore not built"); }
  async grantWikiMaster(): Promise<void>  { throw new Error("GitContentStore not built"); }
  async deleteWiki(): Promise<void>       { throw new Error("GitContentStore not built"); }
}

/* ── Implementation B — Supabase (the platform path) ──────────────────── */
export class SupabaseContentStore implements ContentStore {
  constructor(private db: NonNullable<typeof supabase>) {}

  async listWikis(): Promise<WikiMeta[]> {
    // identity columns arrive with migration 0006 — fall back gracefully on a
    // pre-0006 database (same pattern as the 0004 revision-insert fallback)
    // identity columns arrive across 0006–0009 — fall back by generation
    let r: { data: any[] | null; error: any } = await this.db.from('wikis')
      .select('id, slug, name, skin, categories, blurb, tagline, status, tile_cover, icon').order('id');
    if (r.error) r = await this.db.from('wikis')
      .select('id, slug, name, skin, categories, blurb, tagline, status, tile_cover').order('id');
    if (r.error) {
      r = await this.db.from('wikis').select('id, slug, name, skin').order('id');
      if (r.error) throw r.error;
      return (r.data ?? []).map((w: any) => ({
        ...w, categories: [], blurb: null, tagline: null, status: 'live', tile_cover: { kind: 'themed' },
      })) as WikiMeta[];
    }
    return (r.data ?? []).map((w: any) => ({ icon: { kind: 'auto' }, ...w })) as WikiMeta[];
  }

  async listPages(wiki: string): Promise<PageMeta[]> {
    // icon arrived with migration 0010 — fall back gracefully on older DBs
    let r: { data: any[] | null; error: any } =
      await this.db.from('pages').select('id, slug, title, type, icon').eq('wiki_id', wiki).order('id');
    if (r.error) r = await this.db.from('pages').select('id, slug, title, type').eq('wiki_id', wiki).order('id');
    if (r.error) throw r.error;
    return r.data ?? [];
  }

  async setPageIcon(wikiId: string, page: PageMeta, icon: PageIcon | null): Promise<void> {
    const { error } = await this.db.from('pages')
      .upsert({ wiki_id: wikiId, id: page.id, slug: page.slug, title: page.title, type: page.type, icon }, { onConflict: 'wiki_id,id' });
    if (error) throw error;
  }

  async loadPage(wiki: string, page: string): Promise<PageDoc | null> {
    const { data, error } = await this.db
      .from('sections').select('position, component, data')
      .eq('wiki_id', wiki).eq('page_id', page).order('position');
    if (error) throw error;
    return rowsToDoc(data ?? []) as PageDoc | null;
  }

  async savePage(wiki: WikiMeta, page: PageMeta, doc: PageDoc, opts?: { publish?: boolean }): Promise<SaveResult> {
    const clean = persistableDoc(doc);
    const v = validateDoc(clean, GRAMMAR);
    if (!v.ok) throw new Error('doc failed grammar validation: ' + v.errors.join('; '));
    // bootstrap parents (idempotent)
    let r = await this.db.from('wikis').upsert({ id: wiki.id, slug: wiki.slug, name: wiki.name, skin: wiki.skin }, { onConflict: 'id' });
    if (r.error) throw r.error;
    r = await this.db.from('pages').upsert({ wiki_id: wiki.id, id: page.id, slug: page.slug, title: page.title, type: page.type }, { onConflict: 'wiki_id,id' });
    if (r.error) throw r.error;
    // replace the working-copy section rows: upsert the new set, drop the tail
    const rows = docToRows(clean).map((row: any) => ({ wiki_id: wiki.id, page_id: page.id, ...row }));
    r = await this.db.from('sections').upsert(rows, { onConflict: 'wiki_id,page_id,position' });
    if (r.error) throw r.error;
    r = await this.db.from('sections').delete().eq('wiki_id', wiki.id).eq('page_id', page.id).gte('position', rows.length);
    if (r.error) throw r.error;
    // phase 3: every save appends a revision (full snapshot + who + when)
    const rev = await this.db.from('revisions')
      .insert({ wiki_id: wiki.id, page_id: page.id, doc: clean })
      .select('id').single();
    if (rev.error) {
      // pre-0004 database: the save itself succeeded — report unpublished
      console.warn('revision insert failed (run migration 0004?)', rev.error.message);
      return { revId: null, published: false };
    }
    let published = false;
    if (opts?.publish) {
      const pub = await this.db.rpc('publish_revision', { rid: rev.data.id });
      published = !pub.error;
      if (pub.error) console.warn('publish refused', pub.error.message);
    }
    return { revId: rev.data.id, published };
  }

  async listRevisions(wiki: string, page: string, limit = 50): Promise<RevisionMeta[]> {
    const { data, error } = await this.db.from('revisions')
      .select('id, status, author_email, note, reviewed_email, created_at')
      .eq('wiki_id', wiki).eq('page_id', page)
      .order('id', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []) as RevisionMeta[];
  }

  async getRevisionDoc(id: number): Promise<PageDoc | null> {
    const { data, error } = await this.db.from('revisions').select('doc').eq('id', id).single();
    if (error) return null;
    return (data?.doc ?? null) as PageDoc | null;
  }

  async publishRevision(id: number): Promise<void> {
    const { error } = await this.db.rpc('publish_revision', { rid: id });
    if (error) throw error;
  }

  async rejectRevision(id: number, reason?: string): Promise<void> {
    const { error } = await this.db.rpc('reject_revision', { rid: id, reason: reason ?? null });
    if (error) throw error;
  }

  async revertTo(id: number): Promise<number> {
    const { data, error } = await this.db.rpc('revert_to', { rid: id });
    if (error) throw error;
    return data as number;
  }

  async createPage(wiki: WikiMeta, meta: PageMeta, doc: PageDoc): Promise<PageMeta> {
    await this.savePage(wiki, meta, doc);
    return meta;
  }

  // ── the origination arc (iteration 2) ──
  async createWiki(meta: WikiMeta): Promise<void> {
    const { error } = await this.db.from('wikis').insert({
      id: meta.id, slug: meta.slug, name: meta.name, skin: meta.skin,
      categories: meta.categories ?? [], blurb: meta.blurb ?? null, tagline: meta.tagline ?? null,
      status: meta.status ?? 'live', tile_cover: meta.tile_cover ?? { kind: 'themed' },
    });
    if (error) throw error;
  }

  async updateWikiIdentity(id: string, patch: Pick<WikiMeta, 'categories' | 'blurb' | 'tagline' | 'status' | 'tile_cover' | 'icon'>): Promise<void> {
    const base: any = {
      categories: patch.categories ?? [], blurb: patch.blurb ?? null, tagline: patch.tagline ?? null,
      status: patch.status ?? 'live', tile_cover: patch.tile_cover ?? { kind: 'themed' },
    };
    let r = await this.db.from('wikis').update({ ...base, icon: patch.icon ?? { kind: 'auto' } }).eq('id', id).select('id');
    if (r.error) r = await this.db.from('wikis').update(base).eq('id', id).select('id');   // pre-0009
    if (r.error) throw r.error;
    if (!r.data?.length) throw new Error(`no wiki "${id}" to update`);
  }

  async listCategories(): Promise<CategoryRow[]> {
    const { data, error } = await this.db.from('wiki_categories')
      .select('key, label, icon, grad_from, grad_to').order('key');
    if (error) return [];   // pre-0007 database — the canon taxonomy still renders
    return (data ?? []) as CategoryRow[];
  }

  async createCategory(cat: CategoryRow): Promise<void> {
    const { error } = await this.db.from('wiki_categories').insert(cat);
    if (error) throw error;
  }

  async updateCategory(cat: CategoryRow): Promise<void> {
    const { key, ...rest } = cat;
    const { data, error } = await this.db.from('wiki_categories').update(rest).eq('key', key).select('key');
    if (error) throw error;
    if (!data?.length) throw new Error(`no originated category "${key}" to update`);
  }

  async deleteCategory(key: string): Promise<void> {
    const { error } = await this.db.from('wiki_categories').delete().eq('key', key);
    if (error) throw error;
  }

  async grantWikiMaster(email: string, wikiId: string): Promise<void> {
    const { data, error } = await this.db.from('profiles')
      .update({ role: 'contributor', class: 'wiki_master', wiki_id: wikiId })
      .eq('email', email.trim().toLowerCase()).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error(`no account with the email "${email.trim()}" — they need to sign up first (the grant can be given any time after origination)`);
  }

  async deletePage(wiki: string, page: string): Promise<void> {
    const { error } = await this.db.from('pages').delete().eq('wiki_id', wiki).eq('id', page);
    if (error) throw error;  // sections cascade
  }

  async deleteWiki(id: string): Promise<void> {
    // one cascading delete: wikis → pages → sections + revisions (the FK
    // chain from 0001/0004). RLS "delete wikis" is admin-only (0003).
    const { data, error } = await this.db.from('wikis').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error(`no wiki "${id}" was deleted — admin rights are required`);
  }
}

/** The live store: Supabase when the env keys are set, otherwise null and the
 *  builder stays on its localStorage stand-in (lib/store.ts). */
export const contentStore: ContentStore | null = supabase ? new SupabaseContentStore(supabase) : null;
