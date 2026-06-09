# Registry-Grammar — Phase 0 proposal  *(DRAFT — review before anything is wired)*

> **Goal.** Turn the scattered, implicit structure of ViziWiki's content into one
> explicit, machine-readable **rulebook** (the grammar) plus one swappable **data
> seam** (the content-store interface). The grammar is what the builder's "+" slot
> and in-place editor read — and it is *the same shape* your future Supabase tables
> will mirror. Nothing here is wired yet; this is the format proposal.

This **extends `_data/visuals.yml`** (which today lists sections, visuals, `hosts`,
and partial field lists) into three complete layers:

1. **Page grammar** — page types → allowed sections (order + how many).
2. **Field schemas** — every component's fields: name, type, required, allowed
   values, default, help.
3. **Blank seeds** — what a freshly-inserted component starts with (so the live
   component renders something editable the instant it's dropped in).

---

## Layer 1 — Page grammar  (what's legal where)

**Just two page types.** An iPod page and a Taco Bell page are the *same kind of
page* — both `standard`, both free to use the **same component canon**. There is
no per-domain gating; a component built once is available on every page of every
wiki. The only second type is the wiki's landing page.

```yaml
canon: &canon                   # the full set of banks — shared by BOTH page types.
  [hero, overview, spec, config, lifecycle-lane, timeline, delta, catalog]
  # new banks join the canon here → instantly available on every page.

page_types:

  standard:        # EVERY content page (iPod, Taco Bell, anything). One canon, no gating.
    hero_variant: standard
    sections: *canon
    section_rules:
      hero: { min: 1, max: 1, locked_first: true, variant: standard }
      "*":  { min: 0, max: unbounded }   # every other section optional + repeatable

  home:            # the wiki's landing page — one per wiki. = a standard page PLUS the
                   # search-bar hero (search is home-only canon).
    hero_variant: search
    sections: *canon
    section_rules:
      hero: { min: 1, max: 1, locked_first: true, variant: search }
      "*":  { min: 0, max: unbounded }
```

The **only** differences between the two types: the **hero variant** (`search` on
home, `standard` elsewhere) and that `home` is the wiki's designated landing page.
Everything else — the whole bank canon — is identical and shared.

This is exactly what the **"+" slot** reads: on *any* page it offers the full canon
(greying out only the singleton `hero` once placed). Default is "optional +
repeatable" so a page can stack, say, two timelines or three catalogs; cap specific
sections at `max: 1` later if you want (e.g. one `overview`).

> **Architectural implication:** the per-domain layouts (`class-ipod-touch`,
> `class-tb-menu`, `class-tb-drink`) collapse toward a **single standard-page
> renderer** that just walks the page's ordered section list. That's the same
> renderer the builder drives — so this simplification is directly on the 1.0 path,
> not a detour. (Migrating the existing pages onto it is a later, separate step.)

---

## Layer 2 — Field schemas  (how each component is edited)

**The field-type vocabulary** (drives the right edit affordance in the side rail):
`text` · `richtext` (inline HTML ok) · `number` · `date` (`month-year`) · `bool` ·
`enum[...]` (fixed choices → dropdown) · `list<thing>` (repeatable group).

### Worked example — `lifecycle-lane` (fully specced)

```yaml
lifecycle-lane:
  section: os-section          # frame: locked "Operating system support" eyebrow + layers icon
  fields:
    heading:    { type: richtext, required: true,  help: "The H2 (e.g. 'Four major versions…')" }
    title:      { type: text,     required: true,  help: "The ribbon's left-hand title" }
    paragraphs: { type: list<richtext>, required: false, help: "Lead prose above the ribbon" }
    tone:       { type: enum[a,b,special], default: a }
    weighted:   { type: bool, default: false, help: "On = tile width ∝ time between dates" }
    end:        { type: date, required: false, help: "Weighted mode only — right edge for the last tile" }
    range_note: { type: text, required: false, help: "Optional suffix on the counter" }
    segments:   { type: list<segment>, required: true, min: 2 }
    notes:      { type: list<note>,    required: false }
  subtypes:
    segment:
      ver:        { type: text, required: true }
      date:       { type: date, required: true }
      type:       { type: enum[full,partial,dropped,security], required: true,
                    help: "full=green · partial=amber · dropped=grey cliff · security=blue post-EOL" }
      badge:      { type: text, required: false }
      badge_type: { type: enum[ship,paid,limited,final,dropped,security], default: ship }
    note:
      status: { type: enum[full,partial,limited,final,dropped,security], required: true }
      label:  { type: text, required: true }
      text:   { type: richtext, required: true }
  derived:                      # COMPUTED by the bank — NOT editable; listed so the builder hides them
    - "counter: launch → drop · duration · N major versions"
    - "legend: from the tile types present"
  rules:                        # validation the builder/store enforces
    - "exactly one segment SHOULD be type:dropped (the cliff)"
    - "a security tile must be listed AFTER the dropped tile (latest date last)"
```

Every other component (`spec`, `config`, `delta`, `timeline`, `catalog`, `overview`,
`hero`) gets the **same treatment** — fields + subtypes + derived + rules. I've specced
`lifecycle-lane` here as the format proof; the rest follow once you approve the shape.

---

## Layer 3 — Blank seeds  (what a fresh insert renders)

```yaml
lifecycle-lane:
  seed:
    heading: "New software-support timeline"
    title:   "Software lifecycle"
    segments:
      - { ver: "1.0", date: "Jan 2020", type: full,    badge: "Launch",  badge_type: ship }
      - { ver: "2.0", date: "Jan 2023", type: dropped, badge: "Dropped", badge_type: dropped }
```

Drop the component → it immediately shows an editable two-tile ribbon, not a blank form.

---

## The content-store interface  (the swappable seam)

The builder talks **only** to this — never to git or Supabase directly:

```ts
type PageData = { type: string; sections: { component: string; data: object }[] }

interface ContentStore {
  listWikis(): Promise<WikiMeta[]>
  listPages(wiki: string): Promise<PageMeta[]>
  loadPage(wiki: string, page: string): Promise<PageData>
  savePage(wiki: string, page: string, data: PageData): Promise<void>
  createPage(wiki: string, type: string): Promise<PageMeta>   // seeds from page grammar
  deletePage(wiki: string, page: string): Promise<void>
}
```

- **Now (FnF/dev):** `GitContentStore` — reads/writes front-matter, commits via the GitHub API. *(Or skip straight to the Supabase impl, per the backend decision.)*
- **Later (scale):** `SupabaseContentStore` — same six methods, backed by Postgres.

Swapping backends = swapping the implementation. **The builder never changes.**

---

## How this mirrors Supabase Postgres

The grammar *is* the table design. A clean first mapping:

```
wikis     ( id, slug, name, skin, owner_id )
pages     ( id, wiki_id, slug, type, position )           -- type ∈ page_types
sections  ( id, page_id, component, position, data jsonb ) -- component ∈ field schemas
```

**Recommendation for the churn phase:** store each section's fields as **`jsonb`
validated against the grammar**, rather than a column per field. Why: while the schema
is still churning (FnF), adding/renaming a field becomes *"update the grammar"* — not
an `ALTER TABLE` migration on every component row. The grammar is the validator; the
DB stays stable. You can normalize specific hot fields into real columns later if a
query needs it. *(This is the same "keep churn cheap" principle, now inside Postgres.)*

Enums (`type`, `badge_type`, …) become Postgres `CHECK` constraints or enum types —
straight from the grammar's `enum[...]` lists. Multi-tenancy (thousands of wikis) is
the `wiki_id` foreign key + row-level security.

---

## What I'd do next (on your approval of this format)

1. Spec the remaining components the same way: `hero`, `overview`, `spec`, `config`,
   `delta`, `timeline`, `catalog` (+ the `infobox` sub-bank).
2. Fold it all into `_data/visuals.yml` (or a new `_data/grammar.yml`) as the single
   source the builder + store read.
3. Stub the `ContentStore` interface + a thin first implementation.

**Nothing above touches the live site.** Review the *shape* — the page-grammar format,
the field-schema vocabulary, the interface, and the jsonb-mirror recommendation — and
I'll expand it to every component or adjust the format first.
