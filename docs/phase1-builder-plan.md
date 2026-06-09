# Phase 1 — Builder Vertical Slice (plan / DRAFT — review before building)

> **Goal.** Prove the *entire builder loop* end-to-end on ONE component —
> **timeline** — on one page:
>
> render a page from data → click **+** → side rail offers the canon → pick
> **timeline** → it drops in pre-seeded and renders live → **click its events to
> edit in place** → save through `ContentStore` → reload shows the change.
>
> No code touched by the "contributor." When this works for timeline, every other
> component is the same pattern — just more field schemas.

---

## Why timeline first
Your call — and a good stress test. Timeline is the most interactive component
(computed positions, year bands, a detail modal, drag-scroll), so if the builder
drives *it*, it drives anything. Note: its editable fields are simple
(`month` dropdown, `year`/`title`/`preview` text, `body` richtext — straight from
`grammar.yml`), so the builder-UX part is easy; the extra effort is re-rendering
the positioned scroller live (see render approach below).

---

## The slice, step by step
1. **Renderer** — a function: `timeline data → the live timeline DOM`. (Reuses the
   existing component; see render approach.)
2. **Page canvas** — renders a page's `sections[]` from data, top to bottom, with a
   dashed **+** slot at the end.
3. **+ slot + side rail** — reads `grammar.yml` → lists the canon (greying out the
   singleton hero). Pick **Timeline**.
4. **Insert** — drops a grammar-**seeded** timeline (2 events) → renders immediately,
   editable. (Not a blank form — the live component is the editing surface.)
5. **Edit in place** — click an event's title/date/tag → edit → the timeline
   **re-renders live**. Field types from the grammar pick the control (month → a
   dropdown, body → a small rich editor, etc.).
6. **Save / load** — through the `ContentStore` interface. Reload → the change
   persisted.

**Exit criteria:** a non-coder opens the page, clicks +, adds a timeline, edits its
events in place, saves, reloads, and sees it stick — touching no code, CSS, or JSON.

---

## What this slice deliberately EXCLUDES (later phases)
Auth, moderation, multiple wikis, the Supabase wiring (swapped in later via the same
interface), the other seven components (same pattern, just more schemas), and
publishing to the live site. Thin slice on purpose.

---

## The 3 decisions this locks

### 1. Render approach → **one renderer, server-side** *(recommended)*
The builder must re-draw timeline on every edit. Two ways:
- **Client-only JS renderer** — fast, but timeline's markup would exist twice (Liquid
  for the published site + JS for the builder). Two sources = the thing we avoid.
- **One renderer (recommended)** — express the timeline component **once** in the
  builder's stack; that same renderer serves the live preview *and*, as the site goes
  dynamic, the published pages. Single source, on your north star.

> **Implication:** the builder's framework becomes, over time, the **render layer for
> the whole site** (replacing the Jekyll/Liquid renderer when the site moves onto the
> dynamic app). During FnF the Jekyll site keeps running in parallel; they converge
> later. This is why the stack choice (below) matters.

### 2. Stack → **SvelteKit** *(my recommendation)* vs **React/Next** *(the mainstream pick)*
A WYSIWYG builder is heavy on reactive state (edit a field → live re-render), so a
component framework with built-in SSR earns its keep (it also becomes the site
renderer per above).
- **SvelteKit** — least boilerplate, gentlest to read/learn, built-in SSR. Best fit
  for "simple, dummy-proof," and for you building it now.
- **React / Next.js** — more boilerplate, but the biggest ecosystem + hiring pool +
  the most AI/tooling familiarity (matters once you bring on contributors/devs).

Both do the job. It's a simplicity-now (Svelte) vs ecosystem-later (React) call —
**your decision.**

### 3. ContentStore sequencing → **in-memory first, then Supabase** *(recommended)*
Build the slice against a tiny throwaway in-memory `ContentStore` so the UI loop is
provable in a day with zero backend. Then swap in the `SupabaseContentStore` (same
six methods) — that's when we create the first real tables (from the grammar) and
wire your project URL + anon key. *Timeline-first and in-memory-first are decided;
you just confirm the stack + render approach.*

---

## What I need from you to start
- **Stack:** SvelteKit (recommended) or React/Next?
- **Render approach:** confirm "one renderer, server-side" (recommended)?

Everything else (timeline-first, the slice steps, in-memory-then-Supabase) is set.
Greenlight those two and I'll scaffold the builder app + the timeline renderer + the
+ slot, and we'll watch a timeline get built by clicking.
