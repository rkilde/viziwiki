-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0003 (phase 2: accounts, roles, classes)
-- Paste into SQL Editor → Run (approve the "destructive" dialog — the drops
-- replace the phase-1 wide-open policies; data is untouched). Idempotent.
--
-- The role model (owner's design):
--   viewer       read-only (also what a signed-out visitor effectively is)
--   contributor  carries a CLASS:
--     writer     prose/text values only (enforced in the builder UI)
--     designer   design elements only                 (UI-enforced)
--     curator    everything, SCOPED TO ONE WIKI       (wiki scope DB-enforced)
--   ("editor" — text+titles+structure — designed but shelved for simplicity;
--    re-adding it later = one ALTER on the class check + a caps.mjs entry)
--   admin        the platform: originate wikis, grant them to curators,
--                manage roles, the canon
-- DB enforcement is coarse by design in phase 2: WHO may write at all, and
-- the curator's wiki boundary. Class granularity (writer vs editor vs
-- designer) is enforced by the builder UI until phase 3's moderation adds
-- the review gate behind it.
-- ════════════════════════════════════════════════════════════════════

-- ── profiles: one row per account ─────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'viewer'
             check (role in ('viewer','contributor','admin')),
  class      text check (class in ('writer','designer','curator')),
  wiki_id    text references public.wikis(id) on delete set null,  -- curator's wiki
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- auto-create a profile (as viewer) the moment an account signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── helpers the policies read (security definer: they may read profiles) ─
create or replace function public.my_role() returns text
language sql security definer stable set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'viewer');
$$;
create or replace function public.my_class() returns text
language sql security definer stable set search_path = public as $$
  select (select class from public.profiles where id = auth.uid());
$$;
create or replace function public.my_wiki() returns text
language sql security definer stable set search_path = public as $$
  select (select wiki_id from public.profiles where id = auth.uid());
$$;
-- may this account write content in wiki W?  admin: anywhere. contributor:
-- curator → only their wiki; writer/editor/designer → any wiki (platform-wide
-- classes until per-wiki memberships exist).
create or replace function public.can_write_wiki(w text) returns boolean
language sql security definer stable set search_path = public as $$
  select public.my_role() = 'admin'
      or (public.my_role() = 'contributor'
          and (public.my_class() is distinct from 'curator' or public.my_wiki() = w));
$$;

-- ── REPLACE the phase-1 wide-open policies ────────────────────────────
-- reads stay public (the builder is browsable signed-out = viewer behavior);
-- writes now require an account with the right role/scope.
drop policy if exists "phase1 open read wikis"     on public.wikis;
drop policy if exists "phase1 open write wikis"    on public.wikis;
drop policy if exists "phase1 open read pages"     on public.pages;
drop policy if exists "phase1 open write pages"    on public.pages;
drop policy if exists "phase1 open read sections"  on public.sections;
drop policy if exists "phase1 open write sections" on public.sections;

drop policy if exists "read wikis"     on public.wikis;
drop policy if exists "write wikis"    on public.wikis;
drop policy if exists "insert wikis"   on public.wikis;
drop policy if exists "update wikis"   on public.wikis;
drop policy if exists "delete wikis"   on public.wikis;
drop policy if exists "read pages"     on public.pages;
drop policy if exists "write pages"    on public.pages;
drop policy if exists "read sections"  on public.sections;
drop policy if exists "write sections" on public.sections;

create policy "read wikis"    on public.wikis    for select using (true);
create policy "read pages"    on public.pages    for select using (true);
create policy "read sections" on public.sections for select using (true);

-- wikis: contributors may upsert the metadata row of a wiki they can write
-- (savePage bootstraps it); ONLY admin may create brand-new wikis is a
-- phase-2.5 tightening once wiki-granting UI exists — today the row insert
-- happens for already-granted wikis in practice.
create policy "insert wikis" on public.wikis for insert
  with check (public.can_write_wiki(id));
create policy "update wikis" on public.wikis for update
  using (public.can_write_wiki(id)) with check (public.can_write_wiki(id));
create policy "delete wikis" on public.wikis for delete
  using (public.my_role() = 'admin');

create policy "write pages" on public.pages for all
  using (public.can_write_wiki(wiki_id)) with check (public.can_write_wiki(wiki_id));
create policy "write sections" on public.sections for all
  using (public.can_write_wiki(wiki_id)) with check (public.can_write_wiki(wiki_id));

-- ── profiles RLS: you see your own row; admins see + manage everyone ──
alter table public.profiles enable row level security;
drop policy if exists "read own profile"    on public.profiles;
drop policy if exists "admin read profiles" on public.profiles;
drop policy if exists "admin edit profiles" on public.profiles;
create policy "read own profile" on public.profiles for select
  using (id = auth.uid());
create policy "admin read profiles" on public.profiles for select
  using (public.my_role() = 'admin');
create policy "admin edit profiles" on public.profiles for update
  using (public.my_role() = 'admin') with check (true);

grant select, insert, update, delete on public.profiles to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- AFTER RUNNING: sign up in the builder with your own email, then paste
-- this ONE line (with your email) to crown the founding Admin:
--
--   update public.profiles set role='admin' where email='you@example.com';
--
-- Granting a wiki to a curator (until the admin UI exists):
--
--   update public.profiles
--     set role='contributor', class='curator', wiki_id='taco-bell'
--     where email='curator@example.com';
-- ════════════════════════════════════════════════════════════════════
