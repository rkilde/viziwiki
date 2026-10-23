# Supabase setup — phase 1 (content persistence)

The builder saves pages to Supabase when two environment keys are set; without
them it falls back to browser localStorage exactly as before. This doc is the
owner's click-by-click to turn the cloud on. (Code side is done: schema in
`_builder/supabase/migrations/0001_init.sql`, store in
`_builder/content-store.ts`, mapping guarded by test case 16.)

## One-time setup (~5 minutes)

### 1 · Run the schema migration
1. Open **supabase.com/dashboard** → the **ViziWiki Website** project
   (if it's paused, hit Restore and wait a minute).
2. Left sidebar → **SQL Editor** → **New query**.
3. Paste the ENTIRE contents of `_builder/supabase/migrations/0001_init.sql`
   (from the repo) and press **Run**. You should see "Success. No rows returned".
4. Sanity check: sidebar → **Table Editor** → you should now see three empty
   tables: `wikis`, `pages`, `sections`.

### 2 · Copy the two keys
1. Sidebar → **Project Settings** (gear) → **API**.
2. Copy **Project URL** (looks like `https://xxxx.supabase.co`).
3. Copy the **anon / public** API key (the long one labeled `anon` `public`).
   ⚠ NOT the `service_role` key — that one is secret and never leaves the
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

## Next phases
2. **Auth + roles** — sign-up/sessions, admin/contributor/viewer, row-level
   security per role (replaces the open policies).
3. **Moderation** — contributor edits land as drafts; admin approves →
   published.
