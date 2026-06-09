# `_builder/` — the 1.0 builder (Phase 0 stubs)

> Lives in a `_`-prefixed dir so Jekyll ignores it — none of this touches the
> static site build. This is the home of the eventual **wiki builder** (the 1.0
> product). Right now it holds only the **Phase 0 seam**.

## What's here
- **`content-store.ts`** — the `ContentStore` interface: the single seam between
  the builder UI and wherever content lives. The builder imports *only* this;
  swapping backends (git ⇄ Supabase) means swapping the implementation, not the
  builder. Includes stub `GitContentStore` and `SupabaseContentStore` classes.

## How it fits together
```
_data/grammar.yml ──┐   (the rulebook: components, fields, page-types, seeds)
                    ├─► the BUILDER UI ──► ContentStore  ──► [ git | Supabase ]
the "+" slot &      │     (reads grammar         (the seam)      (the backend,
 in-place editor ───┘      to know what's                         swappable)
                           legal + how to edit)
```

- The **grammar** says *what exists and how it's edited*.
- The **ContentStore** says *how content is loaded/saved* — backend-agnostic.
- The **builder UI** (not built yet) sits on top of both.

## Next steps (beyond Phase 0)
1. Pick + wire the first `ContentStore` implementation (recommended: Supabase).
2. Build the builder UI: the `+` slot + side rail (reads `grammar.yml`), and
   in-place editing of the live component.
3. A single standard-page **renderer** that walks `PageData.sections` (the same
   one that replaces the per-domain `class-*` layouts).

Nothing here is wired yet — it's the contract, authored ahead of the UI so the
backend choice stays deferrable and the builder is DB-ready from its first line.
