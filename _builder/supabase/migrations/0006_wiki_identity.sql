-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0006: the WIKI IDENTITY model
-- (the origination arc, iteration 1). Paste into SQL Editor → Run.
-- Idempotent; content untouched.
--
-- A wiki's identity = what every surface that lists wikis needs to render
-- its tile: the browse page, the reader's /read index, the home page, and
-- the future recommendations module.
--
--   categories  — taxonomy keys (canon: _data/wiki_categories.yml in the
--                 repo). App-validated against that file, NOT a DB check,
--                 so the taxonomy stays single-sourced in the canon.
--   blurb       — one-sentence description (search/cards).
--   tagline     — the short dot-separated cover line ("Menus · Sauces ·
--                 Slogans") shown on tile covers.
--   status      — 'live' | 'coming_soon' (browse shows coming-soon tiles).
--   tile_cover  — jsonb. {"kind":"themed"} renders the data-driven cover
--                 (gradient + glyph DERIVED from the wiki's first category;
--                 optional "glyph" overrides the icon). {"kind":"bespoke",
--                 "cls":"c-apple"} REFERENCES a hand-built canon cover
--                 class (the 5 flagship covers in browse.html) — reference,
--                 never a restatement of the art.
-- ════════════════════════════════════════════════════════════════════

alter table public.wikis add column if not exists categories text[] not null default '{}';
alter table public.wikis add column if not exists blurb      text;
alter table public.wikis add column if not exists tagline    text;
alter table public.wikis add column if not exists status     text not null default 'live';
alter table public.wikis add column if not exists tile_cover jsonb not null default '{"kind":"themed"}'::jsonb;

alter table public.wikis drop constraint if exists wikis_status_check;
alter table public.wikis add constraint wikis_status_check
  check (status in ('live','coming_soon'));

-- ── backfill: the 5 flagship identities (data from browse.html's directory;
-- UPDATEs, so a wiki not yet in the database is a harmless no-op — fallout /
-- smurfs-village / doodle-jump get rows when they are originated) ──
update public.wikis set
  categories = '{food}',
  blurb      = 'Crunchwraps, Mexican Pizza revivals, every limited-time menu logged.',
  tagline    = 'Menus · Sauces · Slogans',
  tile_cover = '{"kind":"bespoke","cls":"c-tacobell"}'::jsonb
where id = 'taco-bell';

update public.wikis set
  categories = '{tech}',
  blurb      = 'Every product, every era, every Steve moment. Mac to Vision Pro.',
  tagline    = 'Products · Timeline',
  tile_cover = '{"kind":"bespoke","cls":"c-apple"}'::jsonb
where id = 'apple';

update public.wikis set
  categories = '{games}',
  blurb      = 'Vaults, wastelands, and the war that never changes.',
  tagline    = 'Factions · Timeline',
  tile_cover = '{"kind":"bespoke","cls":"c-fallout"}'::jsonb
where id = 'fallout';

update public.wikis set
  categories = '{mobile}',
  blurb      = 'Rebuild the village berry by berry — every mushroom house, Smurf, crop, and mini-game.',
  tagline    = 'Buildings · Lore',
  tile_cover = '{"kind":"bespoke","cls":"c-smurfs"}'::jsonb
where id = 'smurfs-village';

update public.wikis set
  categories = '{mobile}',
  blurb      = 'Every platform, monster, power-up, and theme from Lima Sky''s 2009 vertical classic.',
  tagline    = 'Platforms · Monsters',
  tile_cover = '{"kind":"bespoke","cls":"c-doodlejump"}'::jsonb
where id = 'doodle-jump';
