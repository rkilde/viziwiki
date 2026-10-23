# ViziWiki — Browse UI handoff brief

**You are being handed one self-contained file: `browse-ui.html`. Open it in a
browser — it renders with zero setup.** It is the Apple wiki's home page below
the hero, extracted verbatim from the live codebase. The iteration target is
the **BROWSE section** — the "Directory / Browse the wiki" section: a drill-in
tile grid over a `TREE`/`LABELS` data object, with breadcrumb nav, expanding
drawers, mini image carousels, and status chips. Everything else in the file
(timeline / numbers / see-also, the stylesheets) is context so the page looks
and behaves real.

## What ViziWiki is (one paragraph)

A platform of visually-designed wikis. Admins own a design system (the
**canon**); contributors supply content. A page is a stack of **sections**
(horizontal bands, each an eyebrow + H2 + content on a toned panel); most
sections hold an **emblem** — a canonized, data-driven visual format that
renders entirely from supplied data. The browse UI is the home page's
directory section: how a reader descends from a wiki's home into its content
tree.

## Status: browse is NOT yet canonized

Browse is currently hand-built per wiki (this drill-in grid is Apple's). It is
on the roadmap to become an **emblem** — a data-driven component any wiki gets
for free. That is exactly why your design pass matters: whatever you and the
owner converge on becomes the canonical browse emblem. Design accordingly:

## Hard constraints (the canon — your design must fit these)

1. **Data-driven.** The UI must render purely from the `TREE` + `LABELS`
   shape in the file (nodes: name, range/date, href or stub, children via
   `key`, model lists). No hand-placed tiles. If you need richer data per
   node (an image, a blurb), define the field — don't hardcode instances.
2. **The section frame stays.** Eyebrow + H2 + the toned band
   (`.wiki-section`, `data-tone`) are canon. Redesign what's INSIDE the
   section, not the frame.
3. **Layout = CSS only. JS = interaction only.** The builder renders markup
   with scripts stripped — a layout computed in JS collapses there. Drill-in,
   drawers, carousels (interaction) are fine in JS; geometry is not.
4. **Colors must be tokenizable.** Prefer `var(--token, fallback)` over raw
   hex. The four canon stylesheets at the top of the file are READ-ONLY
   reference — iterate in the PAGE-LOCAL CSS layer (clearly marked).
5. **Document text** (eyebrow/H2/prose) uses the universal classes already in
   the markup; dense widget text inside tiles may have its own tuned sizes.
6. **American spelling everywhere.** No British variants, anywhere, ever.
7. Fonts: Fraunces (display serif) · Spectral (prose) · JetBrains Mono
   (labels/micro-caps). Icons come from the inlined sprite
   (`<svg class="wiki-icon"><use href="#ic-NAME"></use></svg>`).

## How to iterate

- Edit `browse-ui.html` in place (page-local CSS + the browse markup/scripts).
  Keep it ONE self-contained file so the owner can preview by double-clicking.
- Several alternative treatments? Duplicate the file per variant, or add a
  variant switcher — owner's preference.
- When a direction is chosen, the owner brings the final file back to the
  codebase AI, which canonizes it (grammar + includes + bank CSS + builder).
  You do not need to touch the real repo.

## Known pain points to improve (owner may add more)

- The drill-in is one level of grid at a time; deep trees (iPhone gens →
  models) take several clicks to survey.
- Tile density/visual hierarchy: product lines, app categories, and iOS all
  render as similar tiles.
- Mobile behavior of the grid + drawers is serviceable, not designed.
- Stub vs live pages ("statusClass") could be more legible at a glance.
