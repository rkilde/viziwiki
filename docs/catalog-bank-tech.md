# Catalog Bank — Technical / Tweakable Values

> Companion to `catalog-bank-spec.md`. This is the **design layer** — every
> font size, weight, color, spacing, and shape the catalog visual uses, and
> **where to change it**. None of this is contributor-facing; it's for the site
> owner / admin tuning the look. Change a value in the one place listed and it
> propagates to **every catalog on every page**.
>
> Two kinds of values:
> 1. **Skin tokens** — CSS custom properties set per-wiki in
>    `wiki-{name}-skin.css`. Colors live here. Override per wiki.
> 2. **Bank CSS** — structural type/spacing in **`bank-catalog.css`** (one
>    file, the single source for the catalog + expandable-card visual).

---

## A. Skin tokens — colors & shapes  (`wiki-{name}-skin.css`)

These are read by the bank; each wiki sets its own. Current = Taco Bell skin.

### Category swatch palette (the colors a category can pick)
The set a category's `color: N` chooses from. Grow this freely (the component
just reads `--cat-color`; adding swatches never touches the bank).

| Token | Value | Name |
|---|---|---|
| `--cat-accent-1` | `#3b6d11` | dew green |
| `--cat-accent-2` | `#0284c7` | fountain sky |
| `--cat-accent-3` | `#7c3aed` | dirty violet |
| `--cat-accent-4` | `#db2777` | freeze pink |
| `--cat-accent-5` | `#059669` | refresca jade |
| `--cat-accent-6` | `#0891b2` | still cyan |
| `--cat-accent-7` | `#78350f` | coffee brown |
| `--cat-accent-8` | `#2563eb` | bottle blue |
| `--cat-accent-9` | `#993556` | frutista rose |
| `--cat-accent-10` | `#0f6e56` | freeze teal |
| `--cat-accent-11` | `#5a8a1a` | limeade olive |
| `--cat-accent-12` | `#854f0b` | defunct ochre |
| `--cat-accent-13` | `#185fa5` | defunct blue |
| `--cat-accent-14` | `#b45309` | taco sienna |
| `--cat-accent-15` | `#6d28d9` | burrito violet |
| `--cat-accent-16` | `#0c4a6e` | specialty blue |
| `--cat-accent-17` | `#a16207` | value amber |
| `--cat-accent-18` | `#92400e` | big-bell umber |
| `--cat-accent-19` | `#44403c` | stone gray |
| `--cat-accent-20` | `#4d7c0f` | griller olive |
| `--cat-accent-21` | `#991b1b` | brick red |

> Auto-cycle (when a category sets no `color`) currently rotates swatches **1–8**
> (`bank-catalog`/visual uses `index modulo 8 + 1`).

### Status-chip colors (the 4 pre-defined states)
| State | bg token | fg token | current bg / fg |
|---|---|---|---|
| active | `--st-active-bg` | `--st-active-fg` | `#dcfce7` / `#166534` |
| discontinued | `--st-discontinued-bg` | `--st-discontinued-fg` | `rgba(42,31,21,.08)` / `rgba(42,31,21,.55)` |
| retired | `--st-retired-bg` | `--st-retired-fg` | `#fef3c7` / `#92400e` |
| limited | `--st-limited-bg` | `--st-limited-fg` | `#fde68a` / `#78350f` |

### Other color/shape tokens
| Token | Current | Used for |
|---|---|---|
| `--divider` | `color-mix(in oklab, var(--foreground) 10%, transparent)` | all hairlines, card borders, pill borders |
| `--ribbon-fg` | `#ffffff` | ribbon text color |
| `--ribbon-gone-bg` | `rgba(42,31,21,0.72)` | the locked "gone" (phased-out) ribbon grey |
| `--ribbon-gone-fg` | (falls back to `--ribbon-fg`) | "gone" ribbon text |
| `--cat-pill-fg` | *(unset → bank default: foreground @ 85% over card)* | **resting** pill text color; set this token to override globally |
| `--card` | `#fff` (skin/page) | card + modal surface |
| `--foreground` | skin/page | base text color (chips, titles, desc derive from it) |
| `--muted-foreground` | skin/page | summary, counts, eyebrow, notes |
| `--card-shape` | *(optional; default `14px`)* | card + modal corner radius |
| `--chip-shape` | *(optional; default `999px`)* | status/info chip corner radius |

---

## B. Bank CSS — type & spacing  (`bank-catalog.css`)

Single source for the catalog visual. Selector → the values you'd tweak.
Fonts in use: **Fraunces** (serif titles), **JetBrains Mono** (labels/pills),
**Spectral** (modal prose).

### Section chrome
| Element | Selector | Key values |
|---|---|---|
| Header row (eyebrow ↔ summary) | `.catalog .cat-head` | `margin-bottom:24px`, flex space-between |
| Summary line | `.catalog .cat-summary` | mono **10px**, letter-spacing `.1em`, uppercase, muted |
| Masonry | `.catalog .cat-masonry` | `columns:2; column-gap:16px` (→ 1 col on mobile) |

> The eyebrow "Full Catalog" + the H2 use the **universal document classes**
> (`.wiki-section-eyebrow` / `.wiki-section-title` in `wiki-universals.css` /
> `wiki-typography.css`) — change those there, not in the bank.

### Category card (the masonry tile)
| Element | Selector | Key values |
|---|---|---|
| Card | `.cat-card` | `padding:20px` (16px mobile), `border-left:4px solid var(--cat-color)`, radius `--card-shape`, `margin-bottom:16px` |
| Title | `.cat-card-title` | Fraunces **17px** / 600, color = category |
| Count line | `.cat-card-count` | mono **8px** / 500, letter-spacing `.12em`, muted |
| Divider | `.cat-card-divider` | 1px `--divider`, `margin:12px 0` |
| Pill (resting) | `.cat-pill` | mono **10px** / 500, `padding:5px 12px`, radius `4px`, color `--cat-pill-fg` |
| Pill (hover) | `.cat-pill:hover` | bg/border/text shift toward the category color |

### Ribbon (corner banner)
| Element | Selector | Key values |
|---|---|---|
| Box | `.cat-ribbon` | `104×104px` (88px mobile) |
| Banner | `.cat-ribbon span` | mono **8px** / 700, rotated 45°, bg = category color |
| "gone" tone | `.cat-ribbon.ribbon-gone span` | bg = `--ribbon-gone-bg` (grey, not category) |

### Footnote box
| `.cat-footnote` | mono **10px**, line-height `1.7`, bordered box, muted |

### Expandable card (modal)
| Element | Selector | Key values |
|---|---|---|
| Overlay / dim | `.modal-ov` | `z-index:999`, dim = `foreground @ 52%`, `backdrop-filter:blur(4px)`, centered |
| Card | `.modal-card` | `max-width:460px`, radius `--card-shape`, `border-left:5px solid var(--cat-color)` |
| Scroll body | `.modal-scroll` | `max-height:85vh`, `padding:24px 24px 22px` (20/16/18 mobile) |
| Close button | `.modal-close` | 26px circle, top-right |
| Header eyebrow (category) | `.modal-eyebrow` | mono **9px** / 600, letter-spacing `.2em`, muted |
| Chips (status/info) | `.chip` | mono **8.5px** / 600, radius `--chip-shape` |
| Info chip color | `.chip.info` | category color @ 12% bg |
| Title | `.modal-title` | Fraunces **24px** / 600 (21px mobile) |
| Header divider (full-bleed) | `.modal-divider` | 1px `--divider`, `margin:16px -24px 0` (the `-24px` matches `.modal-scroll` padding to reach card edges) |
| Footer divider (inset) | `.modal-divider.is-inset` | 1px, `margin:20px 0 0` |
| Description | `.modal-desc` | Spectral **14px** (13.5 mobile), line-height `1.55` |
| Group label | `.modal-group-label` | mono **8px** / 600, letter-spacing `.2em` |
| Group pill | `.gpill` | mono **9px** / 500, category-tinted |
| Struck pill | `.gpill.struck` | line-through + greyscaled |
| Callout box | `.modal-callout` | category-tinted, `border-left:3px` |
| Callout label / text | `.modal-callout-label` / `-text` | mono **9px** label / Spectral **14px** text |
| Notes line | `.modal-note` | Spectral **12.5px** italic, top hairline, muted |
| CTA link | `.modal-cta` | mono **10px** / 600, category color, bottom border |

### Mobile breakpoint
`@media (max-width:640px)` — masonry → 1 column; card padding 16px; smaller
ribbons; modal padding 12px; title 21px; desc 13.5px.

---

## C. Quick "I want to change X" index

| To change… | Edit |
|---|---|
| A category color / add more swatches | `--cat-accent-*` in `wiki-{name}-skin.css` |
| The status chip colors | `--st-*` in `wiki-{name}-skin.css` |
| The "gone" ribbon grey | `--ribbon-gone-bg` in `wiki-{name}-skin.css` |
| Resting pill text shade | `--cat-pill-fg` (skin) or its default in `.cat-pill` (`bank-catalog.css`) |
| Card / modal corner radius | `--card-shape` (skin) |
| Any font size / weight / spacing | the matching selector in `bank-catalog.css` (§B) |
| Card title / count / pill / modal type | `bank-catalog.css` (§B) |
| The dim darkness / blur behind the modal | `.modal-ov` in `bank-catalog.css` |
| Masonry column count / gap | `.catalog .cat-masonry` in `bank-catalog.css` |
| Eyebrow + H2 type (shared, document scale) | `wiki-typography.css` / `wiki-universals.css` (NOT the bank) |

> Rule of thumb: **colors → skin tokens; type & spacing → `bank-catalog.css`;
> the eyebrow/H2 document type → the universal type scale.** One edit in the
> right place updates every catalog sitewide.
