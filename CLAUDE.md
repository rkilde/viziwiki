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
they pick one, fill a **simple form of fields**, and a live preview renders it
— **the contributor never touches code, CSS, SVG, or a CDN.**

**Standing directive:** evaluate everything we do against this goal. A change
is "on path" if it keeps components **universal, typed into banks,
data-driven (fields in → component renders its own HTML+CSS), and
skin-colored.** If something the owner asks for would pull against it, **say
so** and offer the builder-friendly alternative — then do what they decide
(their call always wins). Things that conflict: one-off bespoke components,
hardcoded colors/styles instead of skin tokens, hand-built-per-page layout
that can't be form-driven, special-casing anything the universal layer
defines, or layout that can't be validated/constrained.

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
spotlight/infobox panels, catalogues, swim diagrams — *any* data-viz — keep
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
- `tb-drinks.css`, `tb-menu-catalogue.css`, `tb-slogans.css` — page-specific
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

## Workflow norms
- Develop on branch `claude/quirky-carson-vKj8w`. Commit + push; owner previews
  the Cloudflare deploy and merges PRs themselves (don't open PRs unless asked).
- Cannot build Jekyll locally here — verify via the branch preview deploy.
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
  skin-swatch category colors, ribbon tones (accent / gone-grey),
  status·info-chip·pill-groups(+struck)·callout·notes, header+footer hairlines,
  auto-derived summary + optional note. `bank-catalog.css` = single source.
- **Phase 4 — Timeline bank** (full-bleed, date-positioned scroller + station
  card + detail modal): built + rolled out to **all 6 iPod pages**. New
  `section: timeline` (locked eyebrow + `ic-move-horizontal`, optional H2,
  auto-derived scroll-range hint, locked full-bleed). Extracted out of the iPod
  JS engine into a Liquid bank (`bank-timeline.css` = single source; legacy
  timeline JS / CSS / markup removed). `card_type` dispatch seam in place
  (one type: `station`).

**Open**
- Phase 4 visual bank — **catalog + timeline banks DONE** (see Done). Remaining
  typed banks to decide + extract:
  - **swim-lane / proportional timeline** (discontinued swim-lanes, cantina
    rollout phases, slogans, sauces) — also pays off the temporary
    `ITEM_DB` / `ITEMS_DATA` duplication on discontinued + cantina.
  - **ladder / ranking bars** (drinks sugar + caffeine, sauces heat).
  - **tile directory** (menus listing page, sauces discontinued tiles).
  - **comparison/delta table** + **config/storage chart** (iPod).
  - **quote wall · pairing matrix · spec table** (sauces, iPod) — smaller.
  Each bank is also where its component TYPE gets centralized (bank-owned).
- Re-tokenize page-specific DOCUMENT text not yet on canonical `.wiki-*` classes
  (e.g. the iPod page's own prose/eyebrows/headers reverted with its widgets).
- Redo the iPod CSS block-dedupe (cfg/jb/lane) as a pure non-type cleanup.
- **Skin-tokenize the timeline colors (same pattern as the config chart).**
  Today `bank-timeline.css` hardcodes the iPod monochrome. Convert to skin
  tokens exactly like config: **Apple's timeline pinned** to its current values
  (byte-identical), every other wiki **derives** from its own palette —
  preserving the general scheme (alternating year background panels as the
  years alternate, the relevant accent on each card's left edge, light chrome).
  Do this AFTER the config chart proves the pattern.
- Home pages still load the **Tailwind CDN** (separate from the de-Tailwinded
  archive pages) — a future de-Tailwind pass.
- Smurfs keeps its own small inline icon sprite (custom Smurf art) — optional
  fold into the universal sprite.
- **Bank CSS as a universal layer (deferred for now — kept separate on
  purpose for organization).** Each bank's stylesheet (e.g. `bank-catalog.css`)
  is already the single source for its visual, but it's currently *loaded*
  ad-hoc (per-page `extra_head` on drinks/discontinued/proof; via the
  `class-tb-menu` layout on the 5 menu pages). Once the bank set is built out,
  promote bank stylesheets to a first-class universal layer — loaded **once**
  in `_layouts/default.html` (alongside `wiki-universals.css`), and drop the
  scattered per-page/layout links — so any page can use a bank with zero CSS
  wiring. (Content is already single-source; this only systematizes the
  *loading*.)
- The **builder UI** itself (the 1.0 product) — built once enough components are
  data-driven banks.
- **Admin / builder back-end (master access + in-page edit mode).** The site is
  static (Cloudflare Pages) and content is already data-in-git, so no DB is
  needed to start — a "back-end" here = **auth + the builder writing data back +
  redeploy**. Recommended path (keeps the static/git single-source model):
  (1) **auth** — Cloudflare Access (Zero-Trust, owner-email gated) in front of an
  `/admin` route + a Worker holding a **GitHub App** token server-side (keeps the
  write token out of the browser); or GitHub OAuth in-browser as the simpler
  bridge. Master = repo admin; contributors = restricted role / PR-only.
  (2) **editor** — wire OUR builder kit to read a page's `catalog:` front-matter
  and commit edits via the **GitHub Contents API** (`visuals.yml` is already the
  registry it reads); a fast bridge is an off-the-shelf git CMS (Sveltia/Decap/
  Tina) configured against the front-matter schema. (3) **edit mode** — admin-only
  "Edit" affordance on any live page opens the builder pre-loaded with that page's
  data. (4) **draft→publish** — saves land on a `draft` branch (preview deploy),
  "Publish" = merge to main; Cloudflare already rebuilds on push. Trade-off: saves
  cost a deploy cycle (seconds), not instant-live — fine for a wiki; true instant
  editing would mean a dynamic app + DB (bigger leap, not now). NOTE: the auth/
  OAuth/Access/GitHub-App pieces need setup in the owner's GitHub + Cloudflare
  dashboards (can't be done from the agent env) — code can be built here, clicks
  walked through.
- **Vizi-verse** (the narrative side; currently only `top-10.html`) — deferred.

---

## Reference snapshots (original hand-built code)

The bank port replaced the hand-built catalogue markup/JS in the working
tree; the originals live in git history (merging to main preserves them).
Two anchor commits to compare against — `git show <sha>:<file>`:

- **`e6e5b81`** — *original-handbuilt*: the pristine hand-coded import, every
  page in its first form (pre-convergence).
- **`910990e`** — *pre-bank-port*: the last all-hand-built state — the catalog
  bank existed as scaffolding, but drinks / discontinued / the 5 menu pages
  were still hand-built catalogues (with `showDrink` / `showItemCard` /
  `FRESCO_ITEMS` etc.). Best "right before we banked it" reference.

(This environment can't push git tags — the git proxy only accepts the work
branch — so the SHAs are recorded here instead. To create real named tags
locally: `git tag original-handbuilt e6e5b81 && git tag pre-bank-port 910990e
&& git push origin --tags`.)
