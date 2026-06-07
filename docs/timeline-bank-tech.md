# Timeline Bank — Technical / Tweakable Values

> Companion to `timeline-bank-spec.md`. The **design layer** of the Timeline
> visual — every font size, weight, color, spacing, and the layout-engine
> constants — and **where to change each**. Owner/admin only.
>
> ⚠️ **Colors are NOT skin-tokenized yet.** The timeline was extracted from the
> iPod pages with its original **monochrome palette hardcoded** in
> `bank-timeline.css` (`#0a0a0a`, `#fff`, `rgba(0,0,0,…)`) — kept identical on
> purpose. Before another wiki adopts the timeline, these should be converted to
> skin tokens (a deferred task). Until then, recoloring = editing the hex/rgba
> values in `bank-timeline.css` directly.

Fonts in use: **Fraunces** (serif — dates, titles), **JetBrains Mono**
(labels, tags, hints), **Spectral** (modal prose).

Single source for everything below: **`bank-timeline.css`**, except the
**layout-engine constants**, which live in the visual's script
(`_includes/visuals/timeline/timeline.html`).

---

## A. Layout-engine constants  (`_includes/visuals/timeline/timeline.html`, the IIFE)

These drive the proportional date positioning — change in the `position()`
function:

| Constant | Value | Meaning |
|---|---|---|
| `CARD_W` | `280` | px width allotted to each event column on the axis |
| `SLIM_W` | `68` | px width for a year that has **no** events (keeps the axis to scale) |
| `PAD` | `24` | px padding at the start/end of the track |
| `SPINE_Y` | `339` | px — vertical position of the horizontal spine line |
| `TRACK_H` | `368` | px — total track height |
| gap labels | `<1`=none, `1`="1 mo", `<12`="N mo", else "N yr" | the chip text between far-apart events (`fmt()`) |

> The horizontal scroll/drag multiplier (`*1.2`) is also in this function.

---

## B. Header & hint  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Header block | `.tl-hdr` | `max-width:1320px`, `padding:0 48px 32px` (→ `0 16px 24px` mobile) |
| Scroll hint | `.tl-scroll-hint` | mono **9px** (8px mobile), letter-spacing `.18em`, uppercase, `color:rgba(0,0,0,.35)` |

> The eyebrow ("Timeline") + the H2 use the **universal document classes**
> (`.wiki-section-eyebrow` / `.wiki-section-title`) — change those in
> `wiki-universals.css` / `wiki-typography.css`, not here.

---

## C. The scroller, axis & decorations  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Scroller | `.tl-outer` | `overflow-x:auto`, `cursor:grab`, `padding-bottom:36px`, scrollbar hidden |
| Track | `.track` | positioned container (size set by the engine) |
| Year band | `.tl-band` / `.tl-band-even` | `background:rgba(0,0,0,.025)` / transparent (alternating) |
| Year tick label | `.tl-yr span` | mono **8px**, letter-spacing `.14em`, `color:rgba(0,0,0,.28)` |
| Gap chip | `.tl-gap` | mono **7.5px**, bg `#e8e8ec`, bordered pill |
| Spine dot | `.itl-dot` | `9×9px`, `background:#0a0a0a` |

---

## D. The station card (face)  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Station box | `.itl-event-top` | `width:210px`, `height:340px` |
| Floating date | `.sc-float-month/-day/-year` | Fraunces **22px** / 600, `color:rgba(0,0,0,.25)` (day = 700) |
| Card | `.itl-card` | `background:#fff`, radius `12px`, border `rgba(0,0,0,.08)`, soft shadow; hover lifts `-3px` |
| Accent bar | `.sc-bar` | `width:3px`, `background:#0a0a0a` (left edge) |
| Body padding | `.sc-body` | `15px 15px 13px 18px` |
| Tag | `.sc-tag` | mono **8px**, letter-spacing `.18em`, `rgba(0,0,0,.38)` |
| Title | `.sc-title` | Fraunces **16px** / 600, `#0a0a0a` |
| Preview prose | `.sc-prose` | **11.5px**, line-height `1.58`, `rgba(0,0,0,.52)` |
| Footer | `.sc-footer` | top hairline `rgba(0,0,0,.06)` |
| "Details" link | `.sc-expand` | mono **7.5px**, `rgba(0,0,0,.32)` |
| Number | `.sc-num` | mono **7.5px**, `rgba(0,0,0,.16)` |

---

## E. The expandable card (detail modal)  (`bank-timeline.css`)

| Element | Selector | Key values |
|---|---|---|
| Overlay / dim | `.tl-modal` | `z-index:9999`, dim `rgba(0,0,0,.45)`, `backdrop-filter:blur(4px)`, centered, `padding:24px` |
| Card | `.tl-modal-box` | `width:min(440px, 100vw-48px)` (→ `100vw-32px` mobile), `max-height:100vh-80px`, radius `12px` |
| Accent bar | `.tl-modal-bar` | `width:3px`, `#0a0a0a` |
| Header | `.tl-modal-header` | `padding:20px 20px 18px 24px`, bottom hairline |
| Tag | `.tl-modal-tag` | mono **8.5px**, letter-spacing `.18em`, `rgba(0,0,0,.38)` |
| Title | `.tl-modal-title` | Fraunces **22px** / 600, `#0a0a0a` |
| Body | `.tl-modal-body` | scrollable; padding `20px 20px 22px 24px` |
| Body paragraphs | `.tl-modal-body p` | Spectral **13.5px**, line-height `1.75`, `rgba(0,0,0,.7)` |
| Body bold | `.tl-modal-body p strong` | `#0a0a0a` / 600 |
| Footer | `.tl-modal-footer` | `padding:12px 20px 14px 24px`, top hairline, bg `#fafafa` |
| Close button | `.tl-modal-close` | mono **7.5px**, `rgba(0,0,0,.35)` |
| Page counter | `.tl-modal-page` | mono **8px**, `rgba(0,0,0,.22)` |

### Mobile breakpoint
`@media (max-width:600px)` — tighter header padding, smaller hint, modal width
`100vw-32px`.

---

## F. Quick "I want to change X" index

| To change… | Edit |
|---|---|
| Event column width / axis scale | `CARD_W` / `SLIM_W` in `timeline.html` (engine) |
| Track height / spine position | `TRACK_H` / `SPINE_Y` in `timeline.html` |
| Gap-chip wording / thresholds | `fmt()` in `timeline.html` |
| Any font size / weight / spacing | the matching selector in `bank-timeline.css` (§B–E) |
| Card title / date / preview type | `.sc-title` / `.sc-float-*` / `.sc-prose` |
| Modal type | `.tl-modal-title` / `.tl-modal-body p` |
| The dim darkness / blur | `.tl-modal` in `bank-timeline.css` |
| **Recolor for a new wiki** | first **tokenize** the hardcoded `#0a0a0a`/`#fff`/`rgba(0,0,0,…)` in `bank-timeline.css` into skin tokens (deferred task), then set them per skin |
| Eyebrow + H2 type (shared) | `wiki-typography.css` / `wiki-universals.css` (NOT the bank) |

> Rule of thumb: **layout math → `timeline.html` engine; type & spacing →
> `bank-timeline.css`; eyebrow/H2 → the universal type scale.** Colors are the
> exception — hardcoded for now, pending skin-tokenization.
