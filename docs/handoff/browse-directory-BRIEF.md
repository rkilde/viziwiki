# ViziWiki — Main Browse page handoff brief

**You are being handed one self-contained file: `browse-directory.html`. Open
it in a browser (it needs internet — it uses Google Fonts and the Tailwind CDN
the real page already loads).** It is ViziWiki's **site-level Browse page** —
the directory of ALL wikis — extracted verbatim from the live `browse.html`.

## What this page is

ViziWiki is a platform of visually-designed wikis (Apple, Taco Bell, Fallout,
Smurfs Village, Doodle Jump… with many more to come). This page is the front
door to the library: a hero ("Browse."), a search bar with a live hit counter,
a sticky genre-filter chip row (with FLIP animations), and the tile grid —
where **every wiki gets a bespoke card treatment** (Taco Bell's halftone
gradient + bell, Fallout's CRT scanlines + terminal green, etc.). That
per-tile art direction is the page's identity: tiles should feel like tiny
posters of their wiki, not uniform cards.

## How it works (iterate on all of it)

- **Data-driven**: tiles render from two arrays in the bottom script —
  `CATEGORIES` (genre chips) and `WIKIS` (name, genre, blurb, status, the
  tile's CSS class). Add/modify wikis there; per-tile looks are the `.c-*`
  classes in the stylesheet.
- Search + filter + hit counter + chip FLIP animation are plain JS in the
  same file.
- The global site nav is NOT in this file — it belongs to the site layout and
  is out of scope; design the page body as if the nav sits above it.

## Constraints (lighter than wiki pages — this is site chrome, not canon)

1. **Stay one self-contained file** so the owner can preview by
   double-clicking, and bring the result back for integration.
2. **Fonts**: Fraunces (display serif) · Spectral (body) · JetBrains Mono
   (labels/micro-caps). These three ARE the brand — keep them.
3. **Palette**: the oklch genre palette at the top of the stylesheet is shared
   with the landing page (`--electric/--plum/--gold/--rust/--neon/--acid`…) —
   evolve it coherently rather than introducing stray hexes.
4. **Tailwind**: the page currently uses the Tailwind CDN for utilities. You
   may keep using it for iteration; know that the site plans to freeze used
   utilities into a static stylesheet later (no CDN at runtime), so avoid
   exotic plugin features.
5. **Per-wiki tiles stay bespoke** — that's a feature. But keep each tile's
   treatment contained in its own `.c-<wiki>` block so treatments stay
   swappable per wiki.
6. **American spelling everywhere.** No British variants, anywhere, ever.
7. Status vocabulary on tiles ("Live", "Coming soon"…) should stay legible —
   the platform will soon have many more stub wikis than live ones.

## Things the owner wants from iteration (add your own notes here)

- How the grid scales from ~6 wikis to dozens/hundreds (pagination?
  featured rows? genre sections?) while search/filter stay instant.
- Tile hierarchy: live wikis vs coming-soon stubs.
- Mobile grid behavior.

## The loop

Edit the file in place (or one copy per variant) → the owner previews in a
browser → the chosen direction comes back to the codebase AI for integration
into the real `browse.html`.
