-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase schema — migration 0001 (phase 1: content persistence)
-- Paste this whole file into the Supabase dashboard → SQL Editor → Run.
-- Idempotent-ish: safe to re-run on a fresh project; guarded drops included.
--
-- Shape (mirrors the recorded plan in CLAUDE.md):
--   wikis    — one row per wiki (skin = the body class the canon skins key on)
--   pages    — one row per page of a wiki (type = grammar page_types key)
--   sections — ordered component rows per page; `data` is the canonical
--              front-matter JSON for that component (validated against
--              _data/grammar.yml by the builder before every save).
--              Row 0 = hero, row 1 = overview (the two locked sections);
--              rows 2+ = contributor-added sections.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.wikis (
  id         text primary key,                 -- 'apple'
  slug       text not null unique,             -- 'apple'
  name       text not null,                    -- 'Apple'
  skin       text not null default 'wiki-page wiki-base',  -- canon body class
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  wiki_id    text not null references public.wikis(id) on delete cascade,
  id         text not null,                    -- 'apple-ipod-touch-2g'
  slug       text not null,
  title      text not null,
  type       text not null default 'standard', -- grammar page_types key
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (wiki_id, id)
);

create table if not exists public.sections (
  wiki_id    text not null,
  page_id    text not null,
  position   int  not null,                    -- 0 = hero, 1 = overview, 2+ = body
  component  text not null,                    -- grammar components key
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (wiki_id, page_id, position),
  foreign key (wiki_id, page_id) references public.pages(wiki_id, id) on delete cascade
);

create index if not exists sections_by_page on public.sections (wiki_id, page_id, position);

-- ── Row Level Security ────────────────────────────────────────────────
-- ⚠ PHASE-1 POLICIES — INTENTIONALLY WIDE OPEN (single-admin build-out).
-- Anyone with the anon key (which ships in the builder bundle) can read and
-- write. This is acceptable ONLY while the platform is pre-launch with no
-- secret content. PHASE 2 (auth + roles) REPLACES every policy below with
-- role-gated ones (admin/contributor/viewer + draft ownership). Do not
-- launch publicly on these policies.
alter table public.wikis    enable row level security;
alter table public.pages    enable row level security;
alter table public.sections enable row level security;

drop policy if exists "phase1 open read wikis"     on public.wikis;
drop policy if exists "phase1 open write wikis"    on public.wikis;
drop policy if exists "phase1 open read pages"     on public.pages;
drop policy if exists "phase1 open write pages"    on public.pages;
drop policy if exists "phase1 open read sections"  on public.sections;
drop policy if exists "phase1 open write sections" on public.sections;

create policy "phase1 open read wikis"     on public.wikis    for select using (true);
create policy "phase1 open write wikis"    on public.wikis    for all    using (true) with check (true);
create policy "phase1 open read pages"     on public.pages    for select using (true);
create policy "phase1 open write pages"    on public.pages    for all    using (true) with check (true);
create policy "phase1 open read sections"  on public.sections for select using (true);
create policy "phase1 open write sections" on public.sections for all    using (true) with check (true);

-- updated_at maintenance
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists wikis_touch    on public.wikis;
drop trigger if exists pages_touch    on public.pages;
drop trigger if exists sections_touch on public.sections;
create trigger wikis_touch    before update on public.wikis    for each row execute function public.touch_updated_at();
create trigger pages_touch    before update on public.pages    for each row execute function public.touch_updated_at();
create trigger sections_touch before update on public.sections for each row execute function public.touch_updated_at();
