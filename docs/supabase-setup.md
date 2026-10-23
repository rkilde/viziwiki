# Supabase setup — phase 1 (content persistence)

The builder saves pages to Supabase when two environment keys are set; without
them it falls back to browser localStorage exactly as before. This doc is the
owner's click-by-click to turn the cloud on. (Code side is done: schema in
`_builder/supabase/migrations/0001_init.sql`, store in
`_builder/content-store.ts`, mapping guarded by test case 16.)

## One-time setup (~5 minutes)

### 1 · Run the schema migrations (BOTH files, in order)
1. Open **supabase.com/dashboard** → the **ViziWiki Website** project
   (if it's paused, hit Restore and wait a minute).
2. Left sidebar → **SQL Editor** → **New query**.
3. Paste the ENTIRE contents of `_builder/supabase/migrations/0001_init.sql`
   (from the repo) and press **Run** (approve the "destructive operations"
   dialog — the drops are idempotency guards). Then repeat with
   `0002_grants.sql` — newer Supabase projects don't auto-grant table
   privileges to the API roles, and without it every request fails 42501
   "permission denied". You should see "Success. No rows returned" for both.
4. Sanity check: sidebar → **Table Editor** → you should now see three empty
   tables: `wikis`, `pages`, `sections`.

### 2 · Copy the two keys
1. Sidebar → **Project Settings** (gear) → **API** / **API Keys**.
2. Copy **Project URL** (looks like `https://xxxx.supabase.co` — also shown
   under Settings → Data API).
3. Copy the key: use the **"Legacy anon, service_role API keys" tab → the
   `anon` key** (long `eyJ…` string) — this is the proven one. (The new
   `sb_publishable_…` key returned blanket 401s on this project when first
   wired, Oct 2026 — retry it some day if Supabase irons that out.)
   ⚠ NEVER anything labeled `service_role` or "secret" — those stay in the
   dashboard.

### 3 · Give the keys to Vercel
1. **vercel.com/dashboard** → the builder project → **Settings** →
   **Environment Variables**.
2. Add both (all environments is fine):
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
3. **Redeploy** (Deployments → ⋯ on the latest → Redeploy) — env vars are
   baked in at build time, so a redeploy is required once.

### 4 · Verify
Open the build kit → open any page → edit something → **Save**. The chip
should read **"saved"** (it reads **"saved (local only)"** if the cloud write
failed — hover it for why). Then in Supabase → Table Editor → `sections`:
your page's rows should be there, `data` holding the canonical front-matter
JSON. Reload the builder on another browser/machine → the page loads your
saved version. That's persistence.

## What phase 1 is (and isn't)

- Saves are **instant** and **authoritative in Postgres**; localStorage stays
  as the offline/unconfigured fallback and the editor's instant-open copy.
- The grammar validates every save (`lib/content-map.mjs` → guard case 16):
  an invalid doc is refused before it can reach the database.
- An empty database bootstraps itself: the first save of any page upserts its
  wiki + page rows. No seed step needed.
- ⚠ **The RLS policies are wide open on purpose** (single-admin build-out —
  anyone with the public anon key could write). Fine pre-launch with nothing
  secret; **phase 2 (auth + roles) replaces every policy** before anything
  public. Also note: the free plan has no automatic backups — before real
  contributor content accumulates, set up an export or upgrade.
- The live Jekyll site is untouched — readers still get the static pages;
  Supabase serves the builder only. The publish path (DB → public site) is a
  later-phase decision recorded in CLAUDE.md.

## Phase 2 — accounts, roles, classes (BUILT — switch-on steps)

The role model: **viewer** (read-only) · **contributor** with a class —
**writer** (prose alone) / **designer** (design alone) / **curator**
(everything, scoped to their one wiki) · **admin** (the platform: originates
wikis, grants them to curators, manages roles). An "editor" class
(text+titles+structure) is designed but shelved for simplicity.

Owner steps to switch phase 2 on:
1. **SQL Editor** → paste + Run `_builder/supabase/migrations/0003_roles.sql`
   (approve the "destructive" dialog — it replaces the phase-1 open policies;
   content is untouched). From this moment, writes REQUIRE an account.
2. (Recommended during build-out) **Authentication → Sign In / Providers →
   Email** → turn OFF "Confirm email" so new accounts work instantly; turn it
   back on before the public launch.
3. In the builder: **Sign in → Create account** with your own email.
4. Back in SQL Editor, crown the founding Admin (one line, your email):
   `update public.profiles set role='admin' where email='you@example.com';`
5. Reload the builder — the topbar badge should read **admin**, with the
   "view as" preview (curator/designer/writer/viewer) next to it.

Granting roles (until the admin UI exists) — SQL Editor one-liners:
- Curator of a wiki: `update public.profiles set role='contributor',
  class='curator', wiki_id='taco-bell' where email='them@example.com';`
- Writer / designer: same with `class='writer'` (or `'designer'`), `wiki_id=null`.

Enforcement in phase 2: the DATABASE enforces who may write at all and the
curator's wiki boundary; the builder UI enforces the class detail (what a
writer vs designer may touch). Phase 3's moderation adds the review gate
that makes class detail tamper-proof.

## Next phase
3. **Moderation** — contributor edits land as drafts; a curator/admin
   approves → published.
