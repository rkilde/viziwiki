# Catalog Bank — Specification (contributor-facing options)

> **Purpose of this file.** A complete, accurate catalog of *everything a
> contributor can choose or fill in* for the **Catalog** visual on ViziWiki.
> Hand this to a fresh Claude to author a friendly **contributor reference**
> (a "what can I put here?" guide / the option list the builder UI will expose).
> Everything below is already built and live; this is the source of truth for
> the catalog bank's contract.
>
> A second file — `catalog-bank-tech.md` — holds the *technical/design values*
> (font sizes, colors, spacing) the site owner may tweak later. Keep those out
> of the contributor reference.

---

## 1. The mental model (how it's structured)

A page is built from **sections**. One canon section type today is the
**Catalog Section**. A section has:

```
Catalog Section  (the frame: eyebrow + auto-summary + footnote slot)
└── a VISUAL fills its slot  →  "Catalog" (the masonry list of category cards)
    └── each item opens an  EXPANDABLE CARD  (the detail modal)
```

The contributor's job is to **supply meaning** (titles, names, descriptions,
choices). The bank **supplies form** (layout, counts, colors, dividers,
styling) automatically. A contributor never writes HTML, CSS, SVG, or colors.

---

## 2. What is LOCKED (canon — not contributor-editable)

These are fixed so every catalog across every wiki looks identical. List them
in the reference as "automatic / can't change," not as options:

- **Eyebrow:** the label **"Full Catalog"** + its icon (`list-ordered`). Always
  top-left. Not editable.
- **Summary line** (top-right): **auto-derived** — `"{total} {unit}s · {N}
  categories[ · {note}]"`. The contributor never types the count; it's computed
  from the data. (They *can* set the `unit` noun and an optional trailing `note`
  — see §3.)
- **Per-card count line:** **auto-derived** — `"{n} item(s)[ · {category note}]"`.
- **Layout:** two-column masonry of cards (one column on mobile). Cards flow
  automatically; order follows the data order.
- **Expandable card (modal) behavior:** clicking any item pill opens a centered
  detail card; the whole page dims behind it; click-away / Esc / the close
  button dismiss it. All locked.
- **Header + footer hairline dividers** inside the detail card. Locked.
- **The "See full entry →" link** text is fixed (the contributor only supplies
  *where* it points — see `cta` in §5).
- **All colors** come from the wiki's skin (the contributor *picks from* skin
  swatches; they never enter a hex).

---

## 3. SECTION-level options (the catalog as a whole)

| Field | Required? | Type / allowed values | What it does | Default |
|---|---|---|---|---|
| `title` | recommended | text | The H2 heading shown under the eyebrow (e.g. "Every active drink"). | — |
| `unit` | optional | text (a noun) | The noun used in the auto-summary, pluralized automatically ("drink" → "40 drinks"). | `item` |
| `note` | optional | text | A free trailing note appended to the summary ("· all under 9g fat", "· 99¢–$1.29"). | none |
| `footnote` | optional | text | A small monospace note box at the very bottom of the section (pricing caveats, sourcing, etc.). | none |
| `tone` | optional | `a` / `b` / `special` | The section's background tone (alternates with neighbors). | `b` |
| `visual` | optional | `catalog` | Which visual fills the slot. Only `catalog` exists today. | `catalog` |
| `categories` | **required** | list | The category cards (see §4). | — |

---

## 4. CATEGORY-level options (each card)

A catalog is a list of **categories**; each renders one card.

| Field | Required? | Type / allowed values | What it does | Default |
|---|---|---|---|---|
| `name` | **required** | text | The card title (e.g. "Mountain Dew", "Tacos"). | — |
| `color` | optional | a **skin swatch number** (1–21 today) | Picks the card's accent color (left border, title, pill hover, modal accent) from the skin's swatch set. In the builder this is a **color-picker of skin swatches**, never a hex. | auto-cycles the palette if omitted |
| `ribbon` | optional | text **or** `{ text, tone }` | A diagonal corner banner on the card. `tone` ∈ **`accent`** (uses the category color) or **`gone`** (a locked desaturated gray = "phased out / discontinued"). A plain string is treated as `accent`. | none |
| `note` | optional | text | A short note appended to the card's auto count line ("6 items · limited run"). | none |
| `items` | **required** | list | The items in this category (see §5). | — |

**Ribbon tones (the canonical set):**
- `accent` — colored to the category. Use for "New", "Featured", etc.
- `gone` — gray, signals retired/discontinued/phased-out. The gray is skin-owned
  (each wiki's own shade); never colorful.

---

## 5. ITEM-level options (each pill + its expandable card)

Each item shows as a clickable **pill** in the card; clicking opens the
**expandable card** (modal) built from these fields.

| Field | Required? | Type / allowed values | What it does |
|---|---|---|---|
| `name` | **required** | text | The pill label *and* the modal title. |
| `status` | optional | `active` / `discontinued` / `retired` / `limited` | A colored status chip in the modal header (pre-defined set; colors from skin). |
| `info` | optional | text | A small info chip in the modal header — price, calories, dates, etc. ("$3.19 · 220 cal", "2013–2017"). |
| `desc` | optional | text | The main description paragraph in the modal. |
| `groups` | optional | list of `{ label, pills }` | Labeled pill groups (e.g. "Ingredients", "Pairs with"). Each `pills` entry is **either** a plain string **or** `{ text, struck: true }` to render it struck-through (e.g. "removed" ingredients). |
| `callout` | optional | `{ label, text }` | A highlighted callout box (e.g. label "Replaced by" + text). One per item. |
| `notes` | optional | text | A small italic note line near the bottom of the modal (trivia, availability). |
| `cta` | optional | URL/path | If set, the "See full entry →" link points here. If omitted, the link still shows but is **inert** (does nothing) until the item has a real page. |

---

## 6. Complete annotated example (the data shape)

This is exactly how it's stored today (page front-matter). The builder will
generate this from form fields — but it's the canonical schema:

```yaml
catalog:
  title: "Every active drink"          # H2  (recommended)
  unit: drink                          # summary noun (default: item)
  note: "all under 9g fat"             # optional trailing summary note
  footnote: "Pricing reflects medium sizes; LTOs rotate."   # optional bottom note
  tone: b                              # a | b | special (default b)
  visual: catalog                      # only catalog today
  categories:
    - name: "Mountain Dew"
      color: 1                         # skin swatch # (1–21); omit to auto-cycle
      ribbon: { text: Discontinued, tone: gone }   # or a plain string (=accent)
      note: "limited run"             # optional, appended to the card count
      items:
        - name: "Baja Blast"
          status: active               # active|discontinued|retired|limited
          info: "$3.19 · 220 cal"      # header info chip
          desc: "The Mountain Dew exclusive…"
          groups:
            - label: "Ingredients"
              pills: ["Carbonated water", "HFCS", "Citrus"]
            - label: "Removed (diet)"
              pills:
                - "Sugar"
                - { text: "HFCS", struck: true }    # struck-through pill
          callout: { label: "Replaced by", text: "Sweet Lightning took the valve." }
          notes: "Never sold at retail."
          cta: /taco-bell-baja-blast.html           # omit → inert link
```

---

## 7. Notes for the contributor reference you're writing

- Frame every §3–§5 field as a **form field**: label, help text, type
  (text / dropdown / color-swatch / repeatable group / toggle).
- Make clear what's **automatic** (§2) so contributors don't look for controls
  that don't exist (counts, layout, dividers, the eyebrow).
- `color` and `ribbon.tone` are **pick-from-a-set**, not free entry — show the
  available swatches/tones.
- `status` is a fixed dropdown (4 values). `groups[].pills` support a "strike
  through" toggle per pill.
- Required minimum to render: `categories[].name` + at least one
  `items[].name`. Everything else is optional and degrades gracefully.
- The machine-readable registry of this contract lives at `_data/visuals.yml`
  (sections → `catalog-section`; visual → `catalog`). That file is what the
  real builder reads to populate pickers and validate choices.
