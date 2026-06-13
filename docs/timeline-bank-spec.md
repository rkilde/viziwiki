# Timeline Bank — Specification (contributor-facing options)

> **Purpose of this file.** A complete, accurate catalog of *everything a
> contributor can choose or fill in* for the **Timeline** visual on ViziWiki.
> Hand this to a fresh Claude to author a friendly **contributor reference**.
> Everything below is already built and live; this is the source of truth.
>
> Companion: `timeline-bank-tech.md` (design values — font sizes, colors,
> layout constants). Keep those out of the contributor reference.

---

## 1. The mental model (how it's structured)

```
Timeline Section  (the frame: eyebrow + optional H2 + auto scroll-hint)
└── a VISUAL fills its slot  →  "Timeline" (a full-bleed horizontal scroller)
    └── each event is a CARD ("station") that opens an EXPANDABLE CARD (modal)
```

It's a horizontal, **date-positioned** strip of events. The contributor
supplies a flat **list of events with dates + text**; the bank computes the
positions, the year bands, the gaps, the scroll range — everything spatial —
automatically. A contributor never writes HTML, CSS, SVG, or colors.

It is deliberately **simpler than the catalog**: one flat event list, one card
type, no per-category colors / swatches / ribbons.

---

## 2. What is LOCKED (canon — not contributor-editable)

- **Eyebrow:** the label **"Timeline"** + its icon (`move-horizontal`). Locked.
- **Scroll hint** (under the heading): **auto-derived** —
  `"Scroll · {first event date} – {last event date}"`. Computed from the
  events; never typed.
- **Full-bleed:** the scroller runs **edge-to-edge** across the screen. Locked.
- **Date positioning:** events are placed on a proportional **year axis**;
  the bank draws the **year bands + year labels**, the connector **spine/dots**,
  and **gap chips** between far-apart events ("3 mo", "2 yr"). All automatic
  from the dates — the contributor only supplies the dates.
- **Scroll + drag**, the **expandable card (modal)** open/close, the page
  indicator ("03 / 10") — all automatic.
- **Card design** (the station face) and the **detail modal layout** — fixed
  (the `station` card type). A second card template is a future option
  (`card_type`), not something a contributor edits today.
- **All colors** come from the theme. *(Today the timeline uses a fixed
  monochrome palette — see tech doc; recoloring is an owner task, not a
  contributor one.)*

---

## 3. SECTION-level options

| Field | Required? | Type / allowed values | What it does | Default |
|---|---|---|---|---|
| `heading` | optional | text | The H2 under the eyebrow (e.g. "One chip jump. Three years."). **Optional** — omit it for eyebrow-only. | none |
| `tone` | optional | `a` / `b` / `special` | The section's background tone. | `b` |
| `visual` | optional | `timeline` | Which visual fills the slot. Only `timeline` today. | `timeline` |
| `card_type` | optional | `station` | Which card template renders each event (face + modal). Only `station` today; reserved for future templates. | `station` |
| `events` | **required** | list (chronological) | The timeline entries (see §4). List them in time order. | — |

---

## 4. EVENT-level options (each station/card)

| Field | Required? | Type / allowed values | What it does |
|---|---|---|---|
| `month` | **required** | 3-letter month (`Jan`…`Dec`) | Drives the floating date *and* the position on the year axis. |
| `day` | optional | number/text (e.g. `28`) | Shown in the floating date and the modal date line; omit for month-level events. |
| `year` | **required** | 4-digit year (e.g. `2019`) | The floating date + the axis position. |
| `tag` | optional | text | A small label on the card and in the modal header ("Launch", "Software"). |
| `title` | **required** | text | The card headline *and* the modal title. |
| `preview` | optional | text | One-line summary shown on the card face. |
| `body` | optional | rich text (paragraphs) | The full detail shown in the expandable card (modal). Supports multiple paragraphs and **bold**. |

> Minimum to render an event: `month` + `year` + `title`. `preview` fills the
> card face; `body` fills the modal. The timeline needs **≥ 2 events** to
> position (it lays them out relative to each other).

---

## 5. Complete annotated example (the data shape)

Exactly how it's stored today (page front-matter); the builder will generate
this from form fields:

```yaml
timeline:
  heading: "One chip jump. Three years. The end of the iPod."   # optional H2
  visual: timeline            # only timeline today (default)
  card_type: station          # only station today (default)
  events:                     # chronological; ≥ 2
    - month: May
      day: "28"               # optional
      year: "2019"
      tag: Launch
      title: "iPod touch 7G released."
      preview: "Apple A10 Fusion. 2 GB RAM. New 256 GB top tier. $199 to start."
      body: >
        <p>Apple released the 7th generation iPod touch on May 28, 2019 — the
        first major update in nearly four years…</p>
        <p>It launched in six colors across 32, 128, and 256 GB tiers…</p>
    - month: Sep
      year: "2019"            # no day → month-level
      tag: Software
      title: "iOS 13 — first iPod ever to run it."
      preview: "iOS 13 dropped every A9-and-earlier device. The 7G made the cut."
      body: "<p>iOS 13 shipped in September 2019…</p>"
```

The auto scroll-hint for the above renders as **"Scroll · May 2019 – Sep 2019"**
(first → last). Year bands, positions, and any gap chips are computed.

---

## 6. Notes for the contributor reference you're writing

- Frame §3–§4 as **form fields**: `heading` (text, optional), then a
  **repeatable "Event" group** with month (dropdown Jan–Dec), day (optional),
  year, tag, title, preview, body (rich-text box).
- Stress what's **automatic** (§2): positions, year bands, gap labels, the
  scroll hint, the full-bleed width, the page counter. Contributors only give
  **dates + words**.
- `body` is the one rich field (paragraphs / bold) → a small rich-text editor.
- Events should be entered **in chronological order**.
- The machine-readable contract lives in `_data/visuals.yml`
  (sections → `timeline-section`; visual → `timeline`; `card_types: [station]`).
