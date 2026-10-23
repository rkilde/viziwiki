-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0007: ORIGINATION (origination arc,
-- iteration 2). Paste into SQL Editor → Run. Idempotent; content untouched.
--
-- wiki_categories — categories ORIGINATED by an admin from the builder's
-- "New wiki" flow, for wikis the canon taxonomy doesn't cover. The 12
-- built-in categories stay CANON in the repo (_data/wiki_categories.yml) and
-- are NOT mirrored here — every surface renders the MERGED set (canon first;
-- canon wins a key collision — lib/taxonomy.mjs). grad_from / grad_to hold
-- concrete CSS color values (picked from the canon palette's swatches at
-- origination), so no surface needs anything beyond this row to paint the
-- category's themed covers.
--
-- Wiki origination itself needs no new table — it's an INSERT into `wikis`
-- (identity columns from migration 0006), already admin-allowed by the
-- phase-2 policies. Granting a wiki master is an admin UPDATE on `profiles`
-- (policy "admin edit profiles", 0003) — the grant is OPTIONAL; an admin can
-- originate a wiki and simply work on it themselves.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.wiki_categories (
  key        text primary key,           -- 'tabletop' (lowercase, hyphenated)
  label      text not null,              -- 'Tabletop Games'
  icon       text not null,              -- canon sprite name (ic-<icon>)
  grad_from  text not null,              -- CSS color value (cover gradient)
  grad_to    text not null,
  created_at timestamptz not null default now()
);

alter table public.wiki_categories enable row level security;

drop policy if exists "read wiki_categories"        on public.wiki_categories;
drop policy if exists "admin write wiki_categories" on public.wiki_categories;
create policy "read wiki_categories" on public.wiki_categories
  for select using (true);
create policy "admin write wiki_categories" on public.wiki_categories
  for all using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- newer Supabase projects don't auto-grant table privileges (the 0002 lesson)
grant select on public.wiki_categories to anon, authenticated;
grant insert, update, delete on public.wiki_categories to authenticated;
