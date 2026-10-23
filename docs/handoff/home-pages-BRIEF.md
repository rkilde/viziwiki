# ViziWiki — Home page handoff brief (Apple + Fallout)

**Two self-contained files: `home-apple.html` and `home-fallout.html`. Open
either directly in a browser** (internet needed for the Google Fonts both use,
plus the Tailwind CDN the Fallout page already loads). Each is that wiki's
FULL home page, extracted from the live codebase: the hero and overview were
rendered through the site's own canonical templates, the four canon
stylesheets are inlined as READ-ONLY reference layers, and everything else —
the browse/timeline/numbers/see-also sections, the page-local CSS, the
scripts and data — is the page's own code, verbatim. Iterate on the
page-local layer.

## What ViziWiki is (one paragraph)

A platform of visually-designed wikis. Admins own a design system (the
**canon**); contributors supply content. A page is a stack of **sections**
(horizontal bands — eyebrow + H2 + content on a toned panel); most sections
hold a **data form** — a canonized, data-driven visual format. Home pages
follow a canon order: hero → browse → overview, then freeform sections,
see-also pinned last.

## The two pages (and why both)

They are the same skeleton wearing two radically different skins — that
contrast is the point. **Apple**: light, editorial, monochrome, Apple-logo
ghost watermark. **Fallout**: dark terminal green, CRT scanline flavor,
Vault-Boy energy. A redesign idea must survive both moods, because every
future wiki gets the same skeleton with its own skin.

## Hard constraints (the canon)

1. **The four inlined stylesheets at the top are read-only** (typography,
   universals, home canon, the wiki's skin). Iterate in the page-local
   `<style>` + markup below them. If a change NEEDS a canon-layer edit,
   note it as a proposal instead of editing it inline.
2. **Colors come from skin tokens** — prefer `var(--token, fallback)`;
   anything hardcoded can't ship.
3. **Layout = CSS; JS = interaction only.** No geometry computed in scripts.
4. **Home canon order is locked**: hero → browse → overview first,
   see-also last. Reorder inside the freeform middle only.
5. The hero + overview markup came from canonical templates — treat their
   structure as fixed (styling hooks are fine); the hand-built sections
   below them are fully yours to redesign.
6. Fonts: Fraunces / Spectral / JetBrains Mono. Icons: the inlined sprite
   (`<svg class="wiki-icon"><use href="#ic-NAME"></use></svg>`).
7. **American spelling everywhere.**

## The loop

Edit a file in place (one copy per variant if exploring) → the owner
previews by double-clicking → the chosen direction returns to the codebase
AI, which integrates it (page-local parts directly; canon-layer proposals
through the canon).
