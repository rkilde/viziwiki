/* ════════════════════════════════════════════════════════════════════
   content-store.ts — the ONE seam between the builder and where content lives.
   --------------------------------------------------------------------
   The builder UI imports ONLY this interface. It never talks to git or to
   Supabase directly. To change backends (git → Supabase, or anything else),
   you swap the IMPLEMENTATION below — the builder code never changes. This is
   the single thing that makes "no transfer headache" true (see
   docs/registry-grammar-proposal.md).

   The `component` strings and `type` strings below are keys in _data/grammar.yml
   (`components` and `page_types`). The grammar is the validator; this is the pipe.
   ════════════════════════════════════════════════════════════════════ */

/** One component instance on a page: its type + its field data.
 *  `data` is validated against the matching component schema in grammar.yml. */
export interface Section {
  component: string;                 // a key in grammar.yml → components (e.g. "lifecycle-lane")
  data: Record<string, unknown>;     // the contributor-edited fields for that component
}

/** A full page: which page-type it is + its ordered list of sections. */
export interface PageData {
  type: "standard" | "home";         // a key in grammar.yml → page_types
  sections: Section[];               // ordered; the renderer walks this list top-to-bottom
}

export interface WikiMeta { id: string; slug: string; name: string; skin: string; }
export interface PageMeta { id: string; slug: string; title: string; type: string; }

/** The contract. Every backend implements exactly these six methods. */
export interface ContentStore {
  listWikis(): Promise<WikiMeta[]>;
  listPages(wiki: string): Promise<PageMeta[]>;
  loadPage(wiki: string, page: string): Promise<PageData>;
  /** Validates `data` against grammar.yml, then persists. */
  savePage(wiki: string, page: string, data: PageData): Promise<void>;
  /** Creates a page pre-seeded from the page-type's grammar (hero + blanks). */
  createPage(wiki: string, type: PageData["type"], slug: string): Promise<PageMeta>;
  deletePage(wiki: string, page: string): Promise<void>;
}

/* ── Implementation A — git/files (now / dev) ───────────────────────────
   Reads & writes a page's front-matter blocks; commits via the GitHub API.
   Good for friends-and-family scale; every save costs a deploy cycle. */
export class GitContentStore implements ContentStore {
  async listWikis(): Promise<WikiMeta[]> { throw new Error("TODO: list wiki dirs in the repo"); }
  async listPages(): Promise<PageMeta[]> { throw new Error("TODO: list pages in a wiki dir"); }
  async loadPage(): Promise<PageData>     { throw new Error("TODO: parse front-matter → PageData"); }
  async savePage(): Promise<void>         { throw new Error("TODO: validate → write front-matter → commit via GitHub API"); }
  async createPage(): Promise<PageMeta>   { throw new Error("TODO: seed from grammar → new file → commit"); }
  async deletePage(): Promise<void>       { throw new Error("TODO: remove file → commit"); }
}

/* ── Implementation B — Supabase (scale / recommended) ──────────────────
   Same six methods, backed by Postgres (wikis / pages / sections tables,
   section data as jsonb validated by grammar.yml). Instant saves, no rebuild.
   Build this when you outgrow FnF; the builder above does not change. */
export class SupabaseContentStore implements ContentStore {
  async listWikis(): Promise<WikiMeta[]> { throw new Error("TODO: select from wikis"); }
  async listPages(): Promise<PageMeta[]> { throw new Error("TODO: select from pages where wiki_id = …"); }
  async loadPage(): Promise<PageData>     { throw new Error("TODO: select sections where page_id = … (ordered)"); }
  async savePage(): Promise<void>         { throw new Error("TODO: validate → upsert sections (jsonb)"); }
  async createPage(): Promise<PageMeta>   { throw new Error("TODO: insert page + seeded sections from grammar"); }
  async deletePage(): Promise<void>       { throw new Error("TODO: delete page (cascade sections)"); }
}
