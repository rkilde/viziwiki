# Phase 1 — Builder Vertical Slice (plan / DRAFT — review before building)

> **Goal.** Prove the *entire builder loop* end-to-end on ONE component —
> **spec** (the Specifications Sheet card grid) — on one page:
>
> render a page from data → click **+** → side rail offers the canon → pick
> **Spec** → it drops in pre-seeded and renders live → **click its heading / card
> titles / rows to edit in place** (add/remove cards & rows) → save through
> `ContentStore` → reload shows the change.
>
> No code, CSS, or JSON touched by the "contributor." When this works for spec,
> every other component is the same pattern — just more field schemas.

---

## Why spec first
The cleanest possible first proof. Spec is **easy to render** (pure HTML+CSS card
grid — no modal, no scroll engine, no JS) and **shallow** (two levels: `cards` →
`rows`). That lets us nail the builder mechanics — render-from-data, the **+** slot,
click-to-edit, add/remove nested rows, save/reload — without the rendering or
deep-nesting complexity that timeline/catalog would pile on. Those come later as
"same loop, plus their extras."

Spec's editable shape (from `grammar.yml`):
`heading` (text) · `device` (text) · `tone` (enum → dark/light) · `cards[]` →
each `{ title (text), icon (icon picker), rows[] → [key, value] }`.

---

## The slice, step by step
1. **Renderer** — `spec data → the live card grid` (reuses the existing spec
   component / `bank-spec.css`).
2. **Page canvas** — renders a page's `sections[]` from data, with a dashed **+**
   slot at the end.
3. **+ slot + side rail** — reads `grammar.yml` → lists the canon (graying out the
   singleton hero). Pick **Spec**.
4. **Insert** — drops a grammar-**seeded** spec (one card, a couple of rows) → renders
   immediately, editable. The live grid *is* the editing surface, not a blank form.
5. **Edit in place**
   - click the **heading** / **device** line → edit text
   - click a **card title** → edit; pick its **icon** from the sprite
   - click a **row** key/value → edit; **+ row** / **+ card** to add; × to remove
   - toggle **tone** (dark "special" band ⇄ light)
   - every change **re-renders live**
6. **Save / load** — through the `ContentStore` interface; reload → persisted.

**Exit criteria:** a non-coder opens the page, clicks +, adds a spec sheet, edits its
cards and rows in place, saves, reloads, and sees it stick — touching no code.

---

## What this slice deliberately EXCLUDES (later phases)
Auth, moderation, multiple wikis, the Supabase wiring (swapped in later via the same
interface), the other seven components (same pattern, more schemas), and publishing
to the live site. Thin slice on purpose.

---

## The 3 decisions this locks

### 1. Render approach → **one renderer, server-side** *(recommended)*
The builder re-draws the spec on every edit. Two ways:
- **Client-only JS renderer** — the spec markup would exist twice (Liquid for the
  published site + JS for the builder). Two sources = the thing we avoid.
- **One renderer (recommended)** — express the spec component **once** in the
  builder's stack; that same renderer serves the live preview *and*, as the site goes
  dynamic, the published pages. Single source, on your north star. (Spec makes this
  easy — its render is just HTML+CSS, no engine.)

> **Implication:** the builder's framework becomes, over time, the **render layer for
> the whole site** (replacing Jekyll/Liquid when the site moves onto the dynamic app).
> During FnF the Jekyll site keeps running in parallel; they converge later. That's
> why the stack choice matters.

### 2. Stack → **SvelteKit** *(my recommendation)* vs **React/Next** *(mainstream)*
A WYSIWYG builder is heavy on reactive state (edit a field → live re-render), so a
component framework with built-in SSR earns its keep (it also becomes the site
renderer, per above).
- **SvelteKit** — least boilerplate, gentlest to read/learn, built-in SSR. Best fit
  for "simple, dummy-proof," and for you building it now.
- **React / Next.js** — more boilerplate, but the biggest ecosystem + hiring pool +
  the most AI/tooling familiarity (matters once you bring on devs/contributors).

Both do the job — simplicity-now (Svelte) vs ecosystem-later (React). **Your call.**

### 3. ContentStore sequencing → **in-memory first, then Supabase** *(recommended)*
Build the slice against a tiny throwaway in-memory `ContentStore` so the loop is
provable fast with zero backend. Then swap in `SupabaseContentStore` (same six
methods) — that's when we create the first tables (from the grammar) and wire your
project URL + anon key. *Spec-first and in-memory-first are decided; you confirm the
stack + render approach.*

---

## What I need from you to start
- **Stack:** SvelteKit (recommended) or React/Next?
- **Render approach:** confirm "one renderer, server-side" (recommended)?

Greenlight those two and I'll scaffold the builder app + the spec renderer + the
+ slot, and we'll watch a spec sheet get built by clicking.
