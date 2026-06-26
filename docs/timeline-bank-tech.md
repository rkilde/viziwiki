# Timeline Bank — Technical / Tweakable Values

> Companion to `timeline-bank-spec.md`. The **design layer** of the Timeline
> visual — every font size, weight, color token, spacing, and the layout
> constants — and **where to change each**. Owner/admin only.
>
> **Two things changed since this bank was first extracted:**
> 1. **Colors ARE skin-tokenized.** The chart reads `--tl-*` tokens (§0), each
>    defaulting to a mix of the wiki palette, so any wiki auto-themes. A skin can
>    pin a token to lock a look — the Apple skin pins the originals
>    (`#0a0a0a`/`#fff`/…) via `body.wiki-apple .timeline { … }`, so the iPod
>    timeline is unchanged.
> 2. **Layout is derived in Liquid, not JS.** The year groups, card x-offsets,
>    spacers, bands, ruler ticks and gap chips are all computed in
>    `_includes/visuals/timeline/timeline.html` (templating) and emitted as
>    inline positions. The only `<script>` is interaction (open modal +
>    drag-scroll); it never computes geometry. (This is the builder layout
>    contract — a JS-laid-out bank would collapse in the builder.)

Fonts in use: **Fraunces** (serif — dates, titles), **JetBrains Mono**
(labels, tags, hints), **Spectral** (modal prose).

Single source for everything below: **`bank-timeline.css`**, except the
**layout constants**, which live in the visual's Liquid
(`_includes/visuals/timeline/timeline.html`).

---

## 0. Skin-derived color tokens  (`bank-timeline.css`, defined on `.timeline`)

Each token defaults to a mix of the wiki base palette (`--wiki-text-color` /
`--wiki-surface-bg` / `--wiki-accent-on-light`). Override (pin) per skin to lock
a look; leave unset to auto-theme.

| Token | Role | Default basis |
|---|---|---|
| `--tl-ink` | All text | `--wiki-text-color` (#0a0a0a) |
| `--tl-surface` | Card + modal background | `--wiki-surface-bg` (#fff) |
| `--tl-accent` | Card left edge (`.sc-bar`), spine dot, modal bar | `--wiki-accent-on-light` → text color |
| `--tl-line` | Hairlines / borders / spine | 8% ink |
| `--tl-band` | Alternating (odd-year) panel | 2.5% ink |
| `--tl-chip` | Gap-duration chip background | 9% ink on surface |
| `--tl-footer` | Modal footer background | 2% ink on surface |
| `--tl-dim` | Modal overlay scrim | 45% ink |

> To recolor for a wiki: set/pin these tokens in that wiki's skin
> (`wiki-{name}-skin.css`) under `body.wiki-{name} .timeline { … }`. Do **not**
> hardcode hex in the bank.

---

## A. Layout constants  (`_includes/visuals/timeline/timeline.html`, Liquid `assign`s)

These drive the proportional date positioning — change the `{%- assign … -%}`
values at the top of the visual:

| Constant | Value | Meaning |
|---|---|---|
| `CARD_W` | `280` | px width allotted to each dated event column on the axis |
| `SLIM_W` | `68` | px width for a year that has **no** events (keeps the axis to scale) |
| `PAD` | `24` | px padding at the start/end of the track |
| `TRACK_H` | `368` | px — total track height |
| `CHIP_Y` | `160` | px — vertical position of the gap-duration chips |
| gap labels | `<1`=none, `1`="1 mo", `<12`="N mo", else "N yr" | chip text between events (computed in Liquid) |

> The spine's vertical position is the CSS `.tl-spine { top: 339px }` (not a
> Liquid constant). The horizontal scroll/drag multiplier (`*1.2`) is in the
> interaction script in the same file.

---

## B. Header & hint  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Header block | `.tl-hdr` | `max-width:1320px`, `padding:0 48px 32px` (→ tighter mobile) |
| Scroll hint | `.tl-scroll-hint` | mono **9px** (8px mobile), letter-spacing `.18em`, uppercase, `color: 35% --tl-ink` |

> The eyebrow ("Timeline") + the H2 use the **universal document classes**
> (`.wiki-section-eyebrow` / `.wiki-section-title`) — change those in
> `wiki-universals.css` / `wiki-typography.css`, not here.

---

## C. The scroller, axis & decorations  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Scroller | `.tl-outer` | `overflow-x:auto`, `cursor:grab`, `padding-bottom:36px`, scrollbar hidden |
| Track | `.track` | positioned container (size set by the Liquid layout) |
| Year band | `.tl-band` / `.tl-band-even` | `background: var(--tl-band)` / transparent (alternating) |
| Spine | `.tl-spine` | `top:339px`, `1px`, `background: var(--tl-line)` |
| Year tick label | `.tl-yr span` | mono **8px**, letter-spacing `.14em`, `color: 28% --tl-ink` |
| Gap chip | `.tl-gap` | mono **7.5px**, bg `var(--tl-chip)`, bordered pill |
| Spine dot | `.itl-dot` | `9×9px`, `background: var(--tl-accent)` |

---

## D. The station card (face)  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Station box | `.itl-event-top` | `width:210px`, `height:340px` |
| Floating date | `.sc-float-month/-day/-year` | Fraunces **22px** / 600, `color: 25% --tl-ink` (day = 700) |
| Card | `.itl-card` | `background: var(--tl-surface)`, radius `12px`, border `var(--tl-line)`, soft shadow; hover lifts `-3px` |
| Accent bar | `.sc-bar` | `width:3px`, `background: var(--tl-accent)` (left edge) |
| Body padding | `.sc-body` | `15px 15px 13px 18px` |
| Tag | `.sc-tag` | mono **8px**, letter-spacing `.18em`, `38% --tl-ink` |
| Title | `.sc-title` | Fraunces **16px** / 600, `var(--tl-ink)` |
| Preview prose | `.sc-prose` | **11.5px**, line-height `1.58`, `52% --tl-ink` |
| Footer | `.sc-footer` | top hairline `var(--tl-line)` |
| "Details" link | `.sc-expand` | mono **7.5px**, `32% --tl-ink` |
| Number | `.sc-num` | mono **7.5px**, `16% --tl-ink` |
| Connector | `.sc-connector` | 1px line card→spine, fills the gap via flex (no JS) |

---

## E. The expandable card (detail modal)  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Overlay / dim | `.tl-modal` | dim `var(--tl-dim)`, `backdrop-filter:blur(4px)`, centered, `padding:24px` |
| Card | `.tl-modal-box` | `width:min(440px, 100vw-48px)` (→ `100vw-32px` mobile), capped height, radius `12px`, bg `var(--tl-surface)` |
| Accent bar | `.tl-modal-bar` | `width:3px`, `var(--tl-accent)` |
| Header | `.tl-modal-header` | `padding:20px 20px 18px 24px`, bottom hairline `var(--tl-line)` |
| Tag | `.tl-modal-tag` | mono **8.5px**, letter-spacing `.18em`, `38% --tl-ink` |
| Title | `.tl-modal-title` | Fraunces **22px** / 600, `var(--tl-ink)` |
| Body | `.tl-modal-body` | scrollable; padding `20px 20px 22px 24px` |
| Body paragraphs | `.tl-modal-body p` | Spectral **13.5px**, line-height `1.75`, `70% --tl-ink` |
| Body bold | `.tl-modal-body p strong` | `var(--tl-ink)` / 600 |
| Footer | `.tl-modal-footer` | `padding:12px 20px 14px 24px`, top hairline, bg `var(--tl-footer)` |
| Close button | `.tl-modal-close` | mono **7.5px**, `35% --tl-ink` |
| Page counter | `.tl-modal-page` | mono **8px**, `22% --tl-ink` |

### Mobile breakpoint
`@media (max-width:600px)` — tighter header padding, smaller hint, modal width
`100vw-32px`.

---

## F. Quick "I want to change X" index

| To change… | Edit |
|---|---|
| Event column width / axis scale | `CARD_W` / `SLIM_W` in `timeline.html` (Liquid constants) |
| Track height / gap-chip height | `TRACK_H` / `CHIP_Y` in `timeline.html`; spine `top` in `.tl-spine` |
| Gap-chip wording / thresholds | the gap-label logic in `timeline.html` |
| Any font size / weight / spacing | the matching selector in `bank-timeline.css` (§B–E) |
| Card title / date / preview type | `.sc-title` / `.sc-float-*` / `.sc-prose` |
| Modal type | `.tl-modal-title` / `.tl-modal-body p` |
| The dim darkness / blur | `.tl-modal` (`--tl-dim` + `backdrop-filter`) |
| **Recolor for a new wiki** | set/pin the `--tl-*` tokens (§0) in that wiki's skin — never hardcode hex in the bank |
| Eyebrow + H2 type (shared) | `wiki-typography.css` / `wiki-universals.css` (NOT the bank) |

> Rule of thumb: **layout math → `timeline.html` Liquid constants; type &
> spacing → `bank-timeline.css`; color → the `--tl-*` skin tokens; eyebrow/H2 →
> the universal type scale.**
