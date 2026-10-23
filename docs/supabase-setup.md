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
**writer** (prose alone) / **designer** (design alone) / **wiki master**
(everything, scoped to their one wiki) · **admin** (the platform: originates
wikis, grants them to wiki masters, manages roles). An "editor" class
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
   "view as" preview (wiki master/designer/writer/viewer) next to it.

Granting roles (until the admin UI exists) — SQL Editor one-liners:
- Wiki master of a wiki: `update public.profiles set role='contributor',
  class='wiki_master', wiki_id='taco-bell' where email='them@example.com';`
- Writer / designer: same with `class='writer'` (or `'designer'`), `wiki_id=null`.

Enforcement in phase 2: the DATABASE enforces who may write at all and the
wiki master's wiki boundary; the builder UI enforces the class detail (what a
writer vs designer may touch). Phase 3's moderation adds the review gate
that makes class detail tamper-proof.

## Phase 3 — revisions, review, publish (BUILT — switch-on steps)

The revision system (the Wikipedia model's data layer): every save appends a
full-snapshot **revision** (who + when + status); **approvers** (admin, or a
wiki's wiki master) publish/reject; readers are served only the **published**
version; **revert** makes any old version current again as a new published
revision (history stays linear). The builder's **History** button shows the
whole trail with **green/red diffs** between versions.

Owner steps to switch phase 3 on:
1. **SQL Editor** → paste + Run `_builder/supabase/migrations/0004_revisions.sql`
   (approve the dialog). It also BACKFILLS one published revision per existing
   page from the current content, so `/read` keeps serving what it serves.
2. That's it. Behavior from then on:
   - **Approver saves** (you, or a wiki's wiki master): Save = publish — chip says
     **"published"**, readers update in seconds (on-demand invalidation).
   - **Writer/designer saves**: chip says **"saved — pending review"**; the
     revision waits in the page's History until an approver hits **Publish**
     (or **Reject**). The working copy in the editor does advance; readers
     don't see it until approval.
   - **History** (button in the editor chrome): every revision, who/when,
     status, click a row for the green/red diff vs its predecessor,
     **Revert to** any version (approvers).
3. Trust ladder (recorded in CLAUDE.md, future flips — no schema changes
   needed): per-user auto-publish for proven contributors → publish-on-save +
   patrol/revert at scale.

## Wiki identity (origination arc, iteration 1 — switch-on step)

Every wiki now carries an **identity**: category tags (from the canon taxonomy
`_data/wiki_categories.yml`), a blurb, a cover tagline, a status
(live / coming soon), and a **tile cover** — so any surface that lists wikis
(the reader's `/read` index today; browse page, home page, and the future
recommendations module as they go DB-native) can render its tile from the
database.

Owner step to switch it on:
1. **SQL Editor** → paste + Run `_builder/supabase/migrations/0006_wiki_identity.sql`.
   It adds the identity columns to `wikis` and backfills the flagship
   identities (Taco Bell → food, Apple → tech, plus no-op rows for
   fallout / smurfs-village / doodle-jump until they're originated).
2. Verify: open `vizwiki.vercel.app/read` — the wiki list renders as tile
   covers (category gradient + glyph + title + tagline) instead of plain rows.

Note: the reader renders every wiki with the data-driven **themed** cover for
now. The five hand-built flagship covers (the Apple logo tile etc.) live in
browse.html and get canonized in the design-system arc; the database already
stores the reference (`tile_cover: {"kind":"bespoke","cls":"c-apple"}`) so
nothing moves twice.

## Origination (origination arc, iteration 2 — switch-on step)

Admins **originate wikis from the builder** — the "New wiki" entry in the wiki
switcher opens the origination modal: name → id, categories from the merged
taxonomy (**"+ new category"** right there for wikis the canon 12 don't
cover), blurb, tagline, live/coming-soon, the tile cover (themed by default;
paste an image URL for per-wiki cover **art** — a Storage upload at public
launch), and an **optional** wiki-master grant by email. No grant needed — you
can originate and work the wiki yourself; grant any time later. The new wiki
appears in the builder immediately (add pages, save, publish) and its tile
shows on `/read` in seconds.

Owner step to switch it on:
1. **SQL Editor** → paste + Run `_builder/supabase/migrations/0007_origination.sql`
   (the `wiki_categories` table for admin-originated tags — the canon 12 stay
   in the repo; surfaces render the merged set).
2. Verify: builder → wiki switcher → **New wiki** → originate a test wiki →
   it opens in the builder and its cover tile appears on `/read`.

## The directory lives in the database (iteration 3 — switch-on step)

The live site's **browse page now renders from the database**: it fetches the
platform's public feed (`vizwiki.vercel.app/api/directory` — every wiki's
identity + the merged category taxonomy with resolved colors) and builds its
filter chips and cover tiles from it. Originate a wiki (or a new category) in
the build kit → its tile (and chip) appears on the live browse page
automatically, no deploy. Hardcoded on the page now: only the five hand-coded
bespoke covers (referenced by `tile_cover.cls`), the "All" chip, and the page
layout. The page's document text (eyebrow / H1 / intro) reads the canon type
roles.

Owner step to switch it on:
1. **SQL Editor** → paste + Run `_builder/supabase/migrations/0008_directory_seed.sql`.
   It seeds EVERY wiki that was hardcoded on the browse page into `wikis`
   (the 5 flagships live + 34 coming-soon titles, with their categories,
   blurbs, taglines, and placeholder entries/popularity stats — those columns
   become derived page-count/traffic numbers later). Re-runs refresh stats
   and never clobber identity.
2. Verify: hard-refresh the live `/browse.html` — the full library renders as
   before (now from the database; coming-soon tiles say "Coming soon"), and a
   freshly originated wiki shows up on it within a minute.

## Wiki icons (switch-on step)

Each wiki has an **icon slot** — its small mark (the build-kit switcher now;
the live wiki-bar/rail logo as the chrome goes DB-native): auto letter mark,
a canon sprite glyph, or the wiki's own image URL.

Owner step: **SQL Editor** → paste + Run
`_builder/supabase/migrations/0009_wiki_icon.sql`, then set any wiki's icon
from its **identity** modal (the button beside the wiki switcher).
