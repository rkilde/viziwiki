# ViziWiki — Project Guide (read me first)

ViziWiki is a hand-built Jekyll site (Cloudflare Pages, output `_site`) being
converged into a **modular platform**: many crowdsourced, visually-designed
wikis where *admins* own the design system and *contributors* eventually just
supply content. Everything was hand-coded before the owner knew how to code;
we are converging it into a clean, layered, single-source system.

---

## ★ The 1.0 north star (the ultimate goal — keep it in the background always)

A **UI "wiki builder"**: a contributor clicks a blank dashed **"+"** slot, a
side rail shows the **canon components allowed at that section/page level**,
they pick one, and then **fill it out by editing the live component directly,
in place — WYSIWYG / direct manipulation, NOT a form of blank fields.** Click
the title to rename it, click a value to change it, click a swatch to recolor —
**the live component itself is the editing surface.** The contributor never
touches code, CSS, SVG, or a CDN.

**Standing directive:** evaluate everything we do against this goal. A change
is "on path" if it keeps components **universal, typed into banks,
data-driven (fields in → component renders its own HTML+CSS), and
skin-colored.** If something the owner asks for would pull against it, **say
so** and offer the builder-friendly alternative — then do what they decide
(their call always wins). Things that conflict: one-off bespoke components,
hardcoded colors/styles instead of skin tokens, hand-built-per-page layout
that can't be data-driven / edited in place, special-casing anything the
universal layer defines, or layout that can't be validated/constrained.

---

## Architecture (the layers)

Load order on every page: `wiki-typography.css → wiki-universals.css →
wiki-home.css (home pages only) → wiki-{name}-skin.css`. All injected from
`_layouts/default.html`. (`wiki-home.css` is loaded ONLY by home pages, via
their `extra_head`.)

- **Layer 0 — Universal** (`wiki-universals.css`): site-wide canon. Section
  container/sizing, vertical rhythm, tonal alternation (`data-tone="a/b/special"`),
  dividers, eyebrow/title/prose type, the **hero** (container + eyebrow + title +
  desc + stat grid), the **spotlight bank**, the **infobox bank**, `.wiki-icon`,
  full-bleed scroller. Owns **structure + token defaults**, never final colors.
- **Layer 1 — Home canon** (`wiki-home.css`): home-page-only bits. The
  **search bar** (a required element of HOME heroes only — never on sub-pages)
  + its tokens, and the **canonical hero load-in animation** (`.hero-intro`-gated,
  `.wiki-home`-scoped, Fallout's staggered rise).
- **Layer 2 — Page classes** (`_layouts/class-*.html`): repeating page types
  (e.g. `class-ipod-touch`, `class-tb-menu`, `class-tb-drink`) = structure once,
  content-only pages.
- **Layer 3 — Skins** (`wiki-{name}-skin.css`): **all color** via tokens under
  `body.wiki-{name}`. Skins set, never the universal layer.

### Type scale — DOCUMENT text only (`wiki-typography.css`)
The universal type scale governs **only non-visual document text** — prose,
body, eyebrows, and headings (the editorial reading layer). It is **8 roles**:
`display · title · subtitle · lead · body · body-sm · caption · label`, each a
size/leading/tracking/weight token set (`--t-<role>-*`, body uses the legacy
`--wiki-prose-*` names) + a `.t-<role>` class. Change a value once → every
document heading/body across the whole site updates. Sizes are universal
(skins set color, never size).
**Visual components do NOT use this scale.** Charts, timelines, stat tiles,
spotlight/infobox panels, catalogs, swim diagrams — *any* data-viz — keep
their own type, tuned to the component and controlled **in the bank** (Phase
4). Forcing the universal scale onto dense widgets breaks their layouts (it
did, on the iPod charts — hence this rule). **Rule of thumb: document text →
`typography.css`; widget text → its bank.** (So `Numeral`/`Data`/`Micro` are
*not* universal roles — they're widget concerns owned by each bank.)

### Banks (typed, reusable, single-source — the heart of 1.0)
- **Infobox** (`.wiki-infobox`, universals §15-INFOBOX) — bank type #1. Its body
  fills with `var(--panel-bg)` so it matches whatever toned panel it sits on
  (each `.wiki-section[data-tone]` publishes `--panel-bg`).
- **Spotlight** (universals §14) — swappable treatments: `.wiki-hero-spotlight`
  (card / Cantina) and `.wiki-hero-feature` (Diablo). Skin tokens set colors.
- **Icons** (`_includes/icon-sprite.html`) — one universal SVG sprite, each icon a
  pinned `<symbol id="ic-NAME">` (Lucide paths copied under stable names, immune
  to Lucide renames). Inject once in `<body>`; reference with
  `<svg class="wiki-icon"><use href="#ic-NAME"></use></svg>` or `{% include
  icon.html name="X" %}`. **No icon CDN.** Add an icon = add one `<symbol>`.

### Terminology (be precise)
- **Token** = a CSS custom property (`--section-title-color`, `--panel-bg`, …)
  holding a design value. Skins set them; components read them.
- **Utility class** = a Tailwind-style shorthand (`flex`, `px-6`). The
  Tailwind-native archive pages freeze the ones they use into
  `tb-tw-compat.css` so no Tailwind CDN is needed.

### Supporting CSS
- `tb-editorial-base.css` — shared base for the Taco Bell *archive* sub-pages
  (light editorial palette + section-token mapping + dark-hero text + font
  helpers + footer credit).
- `tb-tw-compat.css` — frozen Tailwind utilities (+ a preflight reset) so the
  de-Tailwinded pages render identically without the Tailwind CDN.
- `tb-drinks.css`, `tb-menu-catalog.css`, `tb-slogans.css` — page-specific
  unique-visual components (bank candidates, deferred).

---

## Standing rules (the owner is emphatic about these)
1. **No special cases.** Never a bespoke reimplementation of anything
   `wiki-universals.css` already defines. Changing universals must change
   literally every place.
2. **Colors come from skin tokens only** — never hardcoded in a page, never set
   in the universal layer. Visuals must conform to spacing AND all universal
   standards too.
3. **Data-driven components** (Level B): a page/contributor supplies data; the
   component emits its own HTML + CSS. That's what makes the builder possible.
4. Distinguish: (a) bespoke reimplementations of universal concepts → MUST
   conform; (b) genuinely-unique visuals → become bank components (deferred);
   (c) additive decorative flourishes (hero overlays, eyebrow dots) → allowed.
5. **The builder must be DERIVED, never restated (baseline rule for ALL
   builder work).** Every builder behavior must trace to the canonical source
   in the repo through a pipeline, not a copy typed into builder code. The
   test: *could you change the behavior by editing only the canonical repo
   file (universals/skin CSS, a Liquid include, `grammar.yml`), with zero
   builder-code edits?* If implementing a builder feature requires writing
   down a fact that already exists in the canon — a color, a count, a
   structure, a default, a lock — that's a restatement and it's wrong.
   The pipes: CSS → `copy-canon`; rules/constraints/seeds → `extract-grammar`
   (`lib/grammar.ts`); wiki content → `extract-*`; markup → the Liquid
   includes themselves, EXECUTED in the builder (LiquidJS, Jekyll mode:
   `extract-includes` → `lib/render.ts`; absent optional fields render as
   sentinels that the decorator `public/editor/decorate.js` swaps for "+"
   slots in their canonical positions). Builder-only editing chrome (`pe-*`
   affordances) is allowed, but WHAT it attaches to and WHAT it permits must
   be derived (grammar fields/locks/enums + canon class-name conventions —
   the decorator's tables only REFERENCE canon identifiers, never restate
   structure). Guard: `npm test` (scripts/test-derived-renderer.mjs) runs on
   every build and fails if the pipeline or decoration breaks.

### Bank → builder onboarding (one derived step + the layout contract)
Adding a bank to the builder is **not** a list to edit in N places — every pipe
is derived from the canon, so you add the bank to the canon and the builder
follows:
- **Includes** auto-extract: `extract-includes` seeds roots from the registry's
  declared `partial:`s and **crawls the `{% include %}` graph** — write the
  include files + the registry entry, the whole chain is pulled (build fails if
  a declared partial is missing).
- **CSS** auto-loads: drop a `bank-<name>.css` at the repo root; `copy-canon`
  discovers it → `data/bank-css.json` → the canvas links it. No per-bank wiring.
- **Picker liveness** is derived: a tile is addable only when its type has a
  grammar `seed` + a registry `section` (`SectionPicker.isLive`) — never a
  hand-set flag.
- **Section→partial** is derived from the registry's `hosts:` map (NOT a
  `<type>-section` name guess — that broke lifecycle-lane/os-section).
- **Readiness widget is derived, but LABELS are an onboarding step.** The
  per-section "what's left to fill" tracker builds itself from grammar — every
  `required:` field + list `min:` + `min_words:` becomes a checklist line, and
  the panel auto-nests it (section-level fields → the **Section** region; each
  first-level list instance → a collapsible **card**; deeper instances → items
  under it). New banks get this for free. The ONE thing to set per bank is the
  display **kind label** for each list level (what a "card"/"item" is called) —
  a `display: { <listName>: { kind: "…" } }` block on the component in
  `grammar.yml` (defaults to a name derived from the subtype). Guards: the seed
  guard (`audit-seeds`) makes a fresh section read as "untouched"; `gen-
  placeholders` regenerates `PLACEHOLDERS.md`. So onboarding a bank's readiness
  = declare `required`/`min`/`blank` (you already do) + optionally a `display`
  block for nice card labels.
- **THE LAYOUT CONTRACT (hard rule):** the builder renders canon HTML+CSS but
  **strips `<script>`** (inert canvas; the decorator owns interaction). So a
  bank's **layout must be CSS/Liquid** — derive positions in Liquid and emit
  them (the config + timeline pattern), never compute layout in a runtime
  script. A `<script>` may carry **only interaction** the decorator re-derives
  (the modal). A bank that lays out in JS renders fine on the live site but
  collapses in the builder. Guards: case 9 renders every seedable+hosted bank;
  case 10 fails the build if any builder-hosted visual ships a geometry-mutating
  script (`.style.left/top/width/height/cssText =`).

**Onboarded to the builder:** ALL SIX extracted banks — catalog, timeline, config,
spec, lifecycle-lane, **delta** — have a live picker tile + an in-place editor.
(Delta: the picker tile direct-adds; the editor binds the heading, the prev|current
axis headers — model name required, the `.gd-sec-col` echoes locked as derived — and
the Hardware/Software rows: label + old→new + a color chip via a derived enum
popover, a `no_old` "before" toggle, per-group add/remove; intro/footnote are
renderer-seeded sentinel "+" slots. Guard: case 13.)

**Photo-rail bank — CANONIZED (onboarding next).** The iPod horizontal photo rail is
extracted off the legacy `wiki-ipod-touch.js` engine into a bank: a headerless,
full-bleed scroller of image cards (no "Photo archive" label — photos only), data
`photo_rail.photos[]{ src, alt, strong?, caption? }` with `src` typed **`media`**
(a URL today; a Supabase Storage upload later, no bank/output change). `bank-photo-rail.css`
= single source; the include `_includes/visuals/photo-rail/` + `sections/photo-rail-section.html`
(registry `photo-rail-section`, full_bleed, no h2). Rolled out to all 6 iPod pages
(photos moved JS → front-matter; `renderPhotoRail` removed). Click-to-zoom lightbox is
a self-contained live-only script (builder strips it; no geometry mutation). NOT yet
onboarded to the builder picker/decorator — that's the next step.

### The builder app (`_builder/`) — the 1.0 product, actively built
A Next.js app (previewed on **Vercel**) that renders a page by EXECUTING the repo's
own Liquid includes + canon CSS, then layers editing chrome — the derived renderer
(rule #5). Key parts:
- `lib/render.ts` / `render-core.mjs` — LiquidJS in Jekyll mode (the includes, executed).
- `lib/canvas.ts` — `buildCanvas` (the iframe doc = canon CSS stack + affordance CSS +
  runtime), `applyAction` (all data mutations), `setIn`.
- `lib/grammar.ts` / `policy.mjs` — grammar → the policy the decorator + readiness read.
- `public/editor/decorate.js` — the in-iframe decorator and the editing SURFACE: wraps
  fields in `.ce`, adds `+`/× affordances, popovers, drag-reorder, posts the readiness
  payload. (Shared `infoI`/`infoIcon` = the one info-"i" tooltip, portaled to `<body>`.)
- `components/editor/` — `PageEditor` (iframe host + the scaled, centered true-1080
  preview + the readiness rail in the left margin), `SectionPicker` (add-section
  picker), `ReadinessPanel`.
- `scripts/` — `copy-canon` (CSS + `bank-*.css` discovery), `extract-grammar`/
  `-includes`/`-visuals`/`-taco-bell`/`-apple`, `gen-placeholders`, and the guards
  `audit-*` + `test-derived-renderer` + `test-golden-render`.
- Commands run FROM `/home/user/viziwiki/_builder`: `npm run gen` (regen data + copy
  canon), `npm test` (the guards), `npm run build`.

## Workflow norms
- Develop on the session's designated feature branch (it rotates per feature — the
  owner names it; e.g. `claude/catalog-note-fixes`). Commit + push; the owner previews
  the deploy and merges PRs themselves (don't open PRs unless asked).
- Cannot build Jekyll locally here — verify the wiki via the Cloudflare branch preview;
  the builder app (`_builder/`) previews on Vercel.
- Permalinks are explicit flat slugs (`permalink:`), decoupled from file path;
  keep `.html` URLs.
- Don't put the model identifier in commits/PRs/code.

---

## Convergence status

**Done**
- Phase 1: single source of truth + home canon (`.wiki-home` wrapper on all 5).
- Phase 2: explicit permalinks.
- Phase 3: page-class templates + full conformance — iPod ×6, drink-detail ×4,
  menu item pages, and **all 5 Taco Bell listing pages** (menus, slogans,
  sauces, drinks, discontinued-drinks) converged + de-Tailwinded; corrupted
  files repaired (ipod CSS, discontinued-drinks DOCTYPE/dupes).
- Hero + spotlight promoted to the universal layer; **panel-aware infobox**;
  canonical **home-hero load-in** (back-button–aware); **universal icon sprite**
  — lucide CDN removed from all 7 pages that loaded it.
- **Universal type scale (8 document roles)** established in `wiki-typography.css`;
  document text (section eyebrow/H2/H3/prose, hero title/desc/eyebrow, archive
  prose) reads it. Visual-component type was briefly wired to the scale then
  **reverted** — it belongs to the bank, not the universal layer (see "Type
  scale" above).
- **Phase 4 — Catalog bank** (data-driven list + paired expandable card): built
  + rolled out to **7 pages** (drinks, discontinued-drinks, the 5 menu
  sub-pages). Section/visual split (`_includes/sections/` + `_includes/visuals/`
  + the `visual.html` dispatcher + `_data/visuals.yml` registry); add-ons:
  skin-swatch category colors, ribbon tones (accent / gone-gray),
  status·info-chip·pill-groups(+struck)·callout·notes, header+footer hairlines,
  auto-derived summary + optional note. `bank-catalog.css` = single source.
- **Phase 4 — Timeline bank** (full-bleed, date-positioned scroller + station
  card + detail modal): built + rolled out to **all 6 iPod pages**. New
  `section: timeline` (locked eyebrow + `ic-move-horizontal`, optional H2,
  auto-derived scroll-range hint, locked full-bleed). Extracted out of the iPod
  JS engine into a Liquid bank (`bank-timeline.css` = single source; legacy
  timeline JS / CSS / markup removed). `card_type` dispatch seam in place
  (one type: `station`). **Skin-tokenized** — `--tl-*` tokens derive from the
  wiki palette; Apple pinned to the original monochrome (`body.wiki-apple
  .timeline`), so the iPod look is unchanged while other wikis auto-theme.
- **Phase 4 — Config bank** (storage/configuration chart, no modal): built +
  rolled out to **all 6 iPod pages**. New `section: config` (locked eyebrow +
  `ic-hard-drive`, required H2 + chart-title, optional intro/footer, contained).
  Bar widths **derived** from capacity (GB/TB normalized, exact proportion).
  Revised-group (`revised` flag → striped bar + `divider_label`); price "old →
  new" drops; device-color dots are content hex. **Skin-tokenized** (`--cfg-*`,
  Apple pinned) — first chart-bank themed from day one. Extracted out of the
  iPod JS engine (`bank-config.css` = single source; legacy `renderCfg` / CSS /
  placeholder removed).
- **Phase 4 — Spec bank** (the "Specifications Sheet" card grid): built + rolled
  out to **all 6 iPod pages**. New `section: spec` (locked eyebrow + `ic-file-text`,
  required H2 + device line `name · model`, default `tone: special` = the dark
  inverted signature band). Card grid of `[key, value]` rows; card icons from the
  sprite. **Skin-tokenized** (`--spec-*`; the dark band re-derives the same tokens
  light-on-dark in one block). `bank-spec.css` = single source.
- **Phase 4 — Delta bank** (the "Changes & Improvements" comparison table): built +
  rolled out to **all 6 iPod pages**. New `section: delta` (locked eyebrow +
  `ic-chart-column-stacked`, required H2, optional intro/footnote). `prev → current`
  rows in hardware/software groups; change chips (`better/feature/changed/worse/same`)
  where color = direction, text = value. **Skin-tokenized** (`--gd-*`, Apple pinned).
  `bank-delta.css` = single source.
- **Phase 4 — Lifecycle-lane bank** (the OS-support ribbon / "iOS versions chart"):
  built + rolled out to **all 6 iPod pages**. New `section: os-section` (locked
  eyebrow + `ic-layers`, required H2, optional lead prose, contained). A segmented
  support ribbon: tiers `full/partial/dropped/security` (fill color), corner badges,
  an **auto-derived counter** (`launch → drop · duration · N major versions`, rounded
  to the nearest month; post-drop `security` patches excluded), and an **auto legend**.
  Width model `uniform` (default) or opt-in `weighted` (∝ date gap); `security` tile =
  a post-EOL patch placed after the drop so the latest date stays last. Extracted off
  the iPod JS engine (`renderOS` removed). **Skin-tokenized** (`--lane-*`; the semantic
  support palette reproduces the Apple look, no pin needed). `bank-lifecycle-lane.css`
  = single source. (Contributor handoff kit authored: markup + css + spec.md + tech.md.)
- **Overview section → include** (`_includes/sections/overview.html` +
  `_includes/overview/infobox.html`): DONE. New `overview-section` (locked "Overview"
  eyebrow + `ic-book-open`, required H2 + paragraphs, optional **infobox** fact-panel
  bank; prose|infobox or two-column newspaper layout). Driven by an `overview:`
  front-matter block, **rolled out to ~24 pages** (6 iPod + the apple/smurfs/fallout/
  doodle homes + every TB drink + menu page). iPod overview pulled off `renderOverview`.
- **Bank CSS = a universal layer (DONE).** All six `bank-*.css` load **once** in
  `_layouts/default.html` (the bank layer, right after `wiki-universals.css`, before
  `extra_head` so a skin can still pin bank tokens); the old per-page `extra_head` /
  `class-tb-menu` links were removed (`class-tb-menu.html` carries a note to that
  effect). Any page can now use any bank with zero CSS wiring. The builder mirrors it:
  `copy-canon` auto-discovers `bank-*.css` → `data/bank-css.json` → the canvas links them.
- **Universal-layer additions (builder/live parity).** `.wiki-hero-title` now sets
  `text-wrap: balance` (balanced headlines; never orphans a trailing word or the accent
  "." — same on the live site and the builder). `wiki-universals.css` §00 adds
  `html, body { margin: 0; padding: 0 }`, mirroring the layout's global reset so any
  context that loads the canon CSS but NOT `default.html`'s inline reset — i.e. the
  builder's preview iframe — still renders the page flush to its frame (idempotent on live).

**Open**
- Phase 4 visual bank — **catalog + timeline + config + spec + delta +
  lifecycle-lane banks DONE** (see Done). Remaining typed banks to decide + extract:
  - **swim-lane / proportional timeline** (discontinued swim-lanes, cantina
    rollout phases, slogans, sauces) — also pays off the temporary
    `ITEM_DB` / `ITEMS_DATA` duplication on discontinued + cantina.
  - **ladder / ranking bars** (drinks sugar + caffeine, sauces heat).
  - **tile directory** (menus listing page, sauces discontinued tiles).
  - **quote wall · pairing matrix** (sauces, iPod) — smaller.
  Each bank is also where its component TYPE gets centralized (bank-owned).
- **Hero → data-driven include** (`_includes/sections/hero.html` + `_includes/hero/*`):
  DONE for the sub-pages, the 6 iPod pages (off the JS engine), the TB sub/detail
  pages, and the apple/taco-bell home heroes. Remaining: fallout/smurfs/doodle home
  heroes (per-element flourishes → skin selectors).
- Re-tokenize page-specific DOCUMENT text not yet on canonical `.wiki-*` classes
  (e.g. the iPod page's own prose/eyebrows/headers reverted with its widgets).
- Redo the iPod CSS block-dedupe (jb/lane) as a pure non-type cleanup.
- Home pages still load the **Tailwind CDN** (separate from the de-Tailwinded
  archive pages) — a future de-Tailwind pass.
- Smurfs keeps its own small inline icon sprite (custom Smurf art) — optional
  fold into the universal sprite.
- The **builder app** (`_builder/`, see "The builder app" above) is substantially
  built — derived renderer, section picker, in-place decorator, readiness rail,
  scaled + centered true-1080 desktop preview — with **all 6 extracted banks
  onboarded** (catalog/timeline/config/spec/lifecycle-lane/delta). Two active tracks:
  **(a) the Supabase back-end** (the public-contributor platform — now the decided
  direction, see below) and **(b) more banks** (swim-lane / ladder / tile-directory /
  quote-wall) so the builder can express more page types.
- **Back-end = the public contributor platform (DECIDED — Supabase).** Target: a
  crowdsourced platform in the class of **Wikipedia / Fandom** — many wikis, many
  *public* contributors, moderation, near-instant edits. That scope means a
  **database backend, not the git/file path** (a commit-per-save + deploy-per-publish
  model can't carry public scale or public sign-ups). The architecture already has
  the seam for it: **`_builder/content-store.ts`** defines ONE `ContentStore`
  interface (`listWikis/listPages/loadPage/savePage/createPage/deletePage`) that the
  builder UI imports *exclusively* — so the backend swaps WITHOUT touching the builder
  ("no transfer headache"). Two implementations are stubbed today (both throw TODO;
  the builder still saves to the `localStorage` stand-in — `lib/store.ts` /
  `app/page.tsx`):
    · `GitContentStore` — front-matter + GitHub-API commits; *friends-and-family / dev*
      only (every save = a deploy cycle). NOT the path for this scope.
    · `SupabaseContentStore` — **the chosen path.** Postgres `wikis / pages / sections`
      (section `data` as `jsonb`, validated against `grammar.yml`), **Supabase Auth**
      (real accounts + roles: admin / contributor / viewer), **Supabase Storage**
      (media uploads — the grammar's image fields already point here). Instant saves,
      no rebuild.
  Build order: (1) wire `SupabaseContentStore` (schema + the six methods, grammar as
  the validator) and switch the builder off `localStorage`; (2) **auth + roles** —
  sign-up / sessions, a roles table, row-level security so a contributor edits only
  what their role allows; (3) **moderation** — contributor edits land as
  drafts/proposals; an admin approves → published (Wikipedia/Fandom-style review).
  The dynamic DB serves the **content**; the static Jekyll site stays the
  single-source home for **canon/design** — the CSS layers, the Liquid includes,
  `grammar.yml` (the schema both the builder and the DB validate against). Caveat: the
  Supabase project + auth providers are created in the owner's dashboards (not from the
  agent env) — code is built here, the dashboard clicks walked through. See
  `_builder/README.md` + `docs/registry-grammar-proposal.md`.
- **Vizi-verse** (the narrative side; currently only `top-10.html`) — deferred.

---

## Reference snapshots (original hand-built code)

The bank port replaced the hand-built catalog markup/JS in the working
tree; the originals live in git history (merging to main preserves them).
Two anchor commits to compare against — `git show <sha>:<file>`:

- **`e6e5b81`** — *original-handbuilt*: the pristine hand-coded import, every
  page in its first form (pre-convergence).
- **`910990e`** — *pre-bank-port*: the last all-hand-built state — the catalog
  bank existed as scaffolding, but drinks / discontinued / the 5 menu pages
  were still hand-built catalogs (with `showDrink` / `showItemCard` /
  `FRESCO_ITEMS` etc.). Best "right before we banked it" reference.

(This environment can't push git tags — the git proxy only accepts the work
branch — so the SHAs are recorded here instead. To create real named tags
locally: `git tag original-handbuilt e6e5b81 && git tag pre-bank-port 910990e
&& git push origin --tags`.)
