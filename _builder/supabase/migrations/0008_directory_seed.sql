-- ════════════════════════════════════════════════════════════════════
-- ViziWiki · Supabase — migration 0008: THE DIRECTORY LIVES IN THE DATABASE
-- (origination arc, iteration 3). Paste into SQL Editor → Run. Idempotent.
--
-- Moves every wiki that was hardcoded on the live browse page into `wikis`,
-- so the DATABASE is the single directory and the browse page (like /read)
-- renders from it via GET /api/directory. What stays hardcoded on the page
-- is only what should be: the hand-coded bespoke cover ART (referenced by
-- tile_cover.cls), the "All" filter chip, and the page layout itself.
--
--   entries / popularity — PLACEHOLDER directory stats (sort keys on the
--   browse page), carried over from the hand-built page. They become DERIVED
--   values later (real page counts / traffic); these columns are where those
--   derived numbers will land, so no surface changes when that flips.
--
-- Inserts use ON CONFLICT (id) DO UPDATE that refreshes the STATS and fills
-- identity ONLY WHERE IT'S MISSING — a wiki that already exists (taco-bell /
-- apple, or anything originated since) keeps whatever identity, skin, and
-- tile cover it has; empty identity (a row bootstrapped by a save before
-- 0006 landed) gets the seed values. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

alter table public.wikis add column if not exists entries    int not null default 0;
alter table public.wikis add column if not exists popularity int not null default 0;

insert into public.wikis (id, slug, name, skin, categories, blurb, tagline, status, tile_cover, entries, popularity) values
  -- ── the 5 built (flagship) wikis — live, bespoke covers ──
  ('taco-bell','taco-bell','Taco Bell','wiki-page wiki-taco-bell','{food}','Crunchwraps, Mexican Pizza revivals, every limited-time menu logged.','Menus · Sauces · Slogans','live','{"kind":"bespoke","cls":"c-tacobell"}',1284,96),
  ('fallout','fallout','Fallout','wiki-page wiki-fallout','{games}','Vaults, wastelands, and the war that never changes.','Factions · Timeline','live','{"kind":"bespoke","cls":"c-fallout"}',1140,95),
  ('apple','apple','Apple','wiki-page wiki-apple','{tech}','Every product, every era, every Steve moment. Mac to Vision Pro.','Products · Timeline','live','{"kind":"bespoke","cls":"c-apple"}',2847,97),
  ('smurfs-village','smurfs-village','Smurfs'' Village','wiki-page wiki-smurfs-village','{mobile}','Rebuild the village berry by berry — every mushroom house, Smurf, crop, and mini-game.','Buildings · Lore','live','{"kind":"bespoke","cls":"c-smurfs"}',612,79),
  ('doodle-jump','doodle-jump','Doodle Jump','wiki-page wiki-doodle-jump','{mobile}','Every platform, monster, power-up, and theme from Lima Sky''s 2009 vertical classic.','Platforms · Monsters','live','{"kind":"bespoke","cls":"c-doodlejump"}',318,82),
  -- ── the directory's coming-soon wikis — themed covers ──
  ('dune','dune','Dune','wiki-page wiki-base','{film}','Spice, sandworms, and Atreides lore.','Houses · Spice · Lore','coming_soon','{"kind":"themed"}',4821,98),
  ('bts','bts','BTS','wiki-page wiki-base','{music}','ARMY-built encyclopedia of the septet.','Members · Eras · Discography','coming_soon','{"kind":"themed"}',12044,99),
  ('the-legend-of-zelda','the-legend-of-zelda','The Legend of Zelda','wiki-page wiki-base','{games}','Hyrule, Triforce, every dungeon mapped.','Games · Items · Timeline','coming_soon','{"kind":"themed"}',8932,97),
  ('studio-ghibli','studio-ghibli','Studio Ghibli','wiki-page wiki-base','{anime}','Every frame, every Totoro.','Films · Characters · Lore','coming_soon','{"kind":"themed"}',2188,92),
  ('taylor-swift','taylor-swift','Taylor Swift','wiki-page wiki-base','{music}','Eras, easter eggs, and re-records.','Eras · Discography','coming_soon','{"kind":"themed"}',15788,99),
  ('mcdonalds','mcdonalds','McDonald''s','wiki-page wiki-base','{food}','McRib release schedule, Grimace, Travis meal.','Menu · History · Promos','coming_soon','{"kind":"themed"}',1042,84),
  ('star-wars','star-wars','Star Wars','wiki-page wiki-base','{film}','A galaxy far, far away — fully indexed.','Saga · Characters · Lore','coming_soon','{"kind":"themed"}',22910,96),
  ('minecraft','minecraft','Minecraft','wiki-page wiki-base','{games}','Blocks, mobs, redstone, every snapshot.','Blocks · Mobs · Biomes','coming_soon','{"kind":"themed"}',9821,95),
  ('marvel-cinematic-universe','marvel-cinematic-universe','Marvel Cinematic Universe','wiki-page wiki-base','{film}','Phases 1 through whatever we''re on now.','Phases · Heroes · Timeline','coming_soon','{"kind":"themed"}',18044,97),
  ('naruto','naruto','Naruto','wiki-page wiki-base','{anime}','Hidden villages, jutsu, the whole shinobi grid.','Villages · Jutsu · Clans','coming_soon','{"kind":"themed"}',7320,90),
  ('nba','nba','NBA','wiki-page wiki-base','{sports}','Every box score since 1946.','Teams · Players · Seasons','coming_soon','{"kind":"themed"}',24018,93),
  ('fifa-world-cup','fifa-world-cup','FIFA World Cup','wiki-page wiki-base','{sports}','Every tournament, every Panini sticker.','Teams · Tournaments · History','coming_soon','{"kind":"themed"}',6210,91),
  ('formula-1','formula-1','Formula 1','wiki-page wiki-base','{sports}','Drivers, constructors, lap records.','Teams · Circuits · Seasons','coming_soon','{"kind":"themed"}',5094,89),
  ('pokemon','pokemon','Pokémon','wiki-page wiki-base','{games}','All 1000+ pocket monsters.','Pokédex · Regions · Games','coming_soon','{"kind":"themed"}',14002,96),
  ('genshin-impact','genshin-impact','Genshin Impact','wiki-page wiki-base','{games}','Teyvat, characters, weapons, banners.','Characters · Regions · Banners','coming_soon','{"kind":"themed"}',6814,87),
  ('kendrick-lamar','kendrick-lamar','Kendrick Lamar','wiki-page wiki-base','{music}','Pulitzer, Compton, GNX.','Albums · Era · Verses','coming_soon','{"kind":"themed"}',3210,94),
  ('chick-fil-a','chick-fil-a','Chick-fil-A','wiki-page wiki-base','{food}','Sauces, secret menu, Sunday rule.','Menu · History · Locations','coming_soon','{"kind":"themed"}',488,75),
  ('severance','severance','Severance','wiki-page wiki-base','{film}','Lumon, MDR, the goats.','Episodes · Lumon · Lore','coming_soon','{"kind":"themed"}',1244,88),
  ('one-piece','one-piece','One Piece','wiki-page wiki-base','{anime}','1100+ chapters mapped to the Grand Line.','Arcs · Crews · Devil Fruits','coming_soon','{"kind":"themed"}',18991,95),
  ('sabrina-carpenter','sabrina-carpenter','Sabrina Carpenter','wiki-page wiki-base','{music}','Espresso, Short n'' Sweet, every tour fit.','Eras · Discography','coming_soon','{"kind":"themed"}',1812,89),
  ('tiktok-trends','tiktok-trends','TikTok Trends','wiki-page wiki-base','{internet}','Sounds, dances, brain rot — archived.','Trends · Sounds · Eras','coming_soon','{"kind":"themed"}',9421,92),
  ('y2k-fashion','y2k-fashion','Y2K Fashion','wiki-page wiki-base','{fashion}','Low-rise, butterfly clips, juicy tracksuits.','Styles · Icons · Eras','coming_soon','{"kind":"themed"}',2104,81),
  ('geocities','geocities','GeoCities','wiki-page wiki-base','{tech}','Neighborhoods of the early web.','Sites · History · Web Lore','coming_soon','{"kind":"themed"}',3088,70),
  ('fortnite','fortnite','Fortnite','wiki-page wiki-base','{games}','Every season, every skin, every collab.','Seasons · Skins · Map','coming_soon','{"kind":"themed"}',7041,88),
  ('beyonce','beyonce','Beyoncé','wiki-page wiki-base','{music}','Renaissance, Cowboy Carter, the BeyHive.','Eras · Discography · Tours','coming_soon','{"kind":"themed"}',9210,98),
  ('harry-potter','harry-potter','Harry Potter','wiki-page wiki-base','{books}','Hogwarts, Horcruxes, the whole wizarding world.','Books · Spells · Lore','coming_soon','{"kind":"themed"}',11240,91),
  ('stranger-things','stranger-things','Stranger Things','wiki-page wiki-base','{film}','Hawkins, Upside Down, every Demogorgon.','Seasons · Characters · Lore','coming_soon','{"kind":"themed"}',4112,90),
  ('demon-slayer','demon-slayer','Demon Slayer','wiki-page wiki-base','{anime}','Hashira, breathing styles, Muzan arc.','Arcs · Hashira · Breathing','coming_soon','{"kind":"themed"}',3920,89),
  ('k-pop','k-pop','K-pop','wiki-page wiki-base','{music}','Every group, every comeback, every fandom name.','Groups · Eras · Charts','coming_soon','{"kind":"themed"}',26012,96),
  ('wendys','wendys','Wendy''s','wiki-page wiki-base','{food}','Square patties, frosty, Twitter roasts.','Menu · History · Tweets','coming_soon','{"kind":"themed"}',410,72),
  ('wii-sports','wii-sports','Wii Sports','wiki-page wiki-base','{games}','Matt is undefeated. Document everything.','Games · Miis · Records','coming_soon','{"kind":"themed"}',188,68),
  ('vine-rip','vine-rip','Vine (rip)','wiki-page wiki-base','{internet}','Six seconds, eternal.','Vines · Creators · Lore','coming_soon','{"kind":"themed"}',2491,80),
  ('streetwear','streetwear','Streetwear','wiki-page wiki-base','{fashion}','Supreme drops, Yeezys, Bape archives.','Brands · Drops · History','coming_soon','{"kind":"themed"}',4204,83),
  ('squid-game','squid-game','Squid Game','wiki-page wiki-base','{film}','Pink guards, dalgona, every game.','Games · Players · Lore','coming_soon','{"kind":"themed"}',1804,86)
on conflict (id) do update set
  entries    = excluded.entries,
  popularity = excluded.popularity,
  categories = case when wikis.categories = '{}' then excluded.categories else wikis.categories end,
  blurb      = coalesce(wikis.blurb, excluded.blurb),
  tagline    = coalesce(wikis.tagline, excluded.tagline),
  tile_cover = case when wikis.tile_cover = '{"kind":"themed"}'::jsonb then excluded.tile_cover else wikis.tile_cover end;
