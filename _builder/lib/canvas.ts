// The editor canvas SHELL. The page body itself comes from the DERIVED
// renderer (lib/render.ts — the repo's own Liquid includes); this file only
// supplies the iframe document around it: the canonical CSS stack, the
// affordance CSS (editing chrome), the iframe runtime (field/action bridges,
// resize, background-luminance tagging), and the data mutations.
// NO canonical markup lives here — see CLAUDE.md standing rule #5.
import type { PageDoc } from './store';
import { seedSection } from './store';
import type { WikiSkin } from './wiki';
import { POLICY, rule, blankOf, itemBlankOf } from './grammar';
import { SENT_PREFIX, REGISTRY } from './render';
// bank stylesheets — DISCOVERED by copy-canon (every repo-root bank-*.css) and
// written to this manifest, so the canvas loads each bank's single-source CSS
// without a hardcoded <link> per bank (CLAUDE.md standing rule #5).
import BANK_CSS from '../data/bank-css.json';

// default skin = Taco Bell (keeps existing single-arg callers working)
const TACO_BELL_SKIN: WikiSkin = { bodyClass: 'wiki-page wiki-taco-bell', css: ['wiki-taco-bell-skin.css', 'tb-editorial-base.css'] };

const AFFORDANCE = `
  /* editing field: grey box on hover (= editable), blue box on click (= editing).
     overflow-wrap:anywhere keeps a long unbroken string from inflating the
     field's min-content — without it the inline-block + fit-content sizing
     blows out the canon's grid/flex tracks (the live site never sees this
     because plain text wraps at spaces). Keeps the editor on the master format. */
  .ce{ cursor:text; border-radius:3px; display:inline-block; max-width:100%; overflow-wrap:anywhere;
       outline:2px solid transparent; outline-offset:2px; transition:outline-color .12s; }
  .ce:hover{ outline-color:rgba(0,0,0,.18); }
  .ce:focus{ outline-color:rgba(0,113,227,.55); }

  /* Enter inside a paragraph box inserts block children — give them the
     canonical inter-paragraph rhythm so in-box paragraphs match +paragraph */
  .wiki-section-prose .ce > div,
  .wiki-section-prose .ce > p{ margin-top:20px; }
  .wiki-section-prose .ce > div:first-child,
  .wiki-section-prose .ce > p:first-child{ margin-top:0; }
  /* light pack — applied (via JS) when the field sits on a dark/gradient bg */
  .ce.on-dark:hover{ outline-color:rgba(255,255,255,.42); }
  .ce.on-dark:focus{ outline-color:rgba(130,185,255,.95); }

  /* corner controls — hidden until you hover the element they belong to */
  .pe-removable,.pe-locked{ position:relative; }
  /* shrink-wrap every removable field to its content so the × sits on the
     content's ACTUAL corner (like the heading box), no matter the text length */
  .pe-removable{ width:fit-content; max-width:100%; }
  /* exceptions — keep their layout width instead of shrinking to content:
     the infobox panel (and stop its overflow:hidden clipping the corner ×),
     the infobox value cells (grid-sized), the search bar, the stat grid */
  .wiki-infobox.pe-removable{ width:auto; overflow:visible; }
  .wiki-infobox-data > dd.pe-removable{ width:auto; }
  /* infobox ONLY: the row × is right-aligned + vertically centred on its row,
     not the upper-right corner — the corner rule still governs everything else */
  .wiki-infobox-data > dd.pe-removable > .pe-remove{ top:50%; right:-9px; left:auto; transform:translateY(-50%); }
  /* +row / +badge sit just BELOW the infobox (absolute, so the panel itself
     renders exactly like the live site — no editing chrome inside its bounds) */
  .pe-infobox-adds{ position:absolute; top:calc(100% + 8px); left:0; display:flex; gap:8px; }
  .wiki-hero-search.pe-removable{ width:auto; }
  .wiki-hero-stats.pe-removable{ width:auto; }
  .cat-card.pe-removable{ width:auto; }
  /* toolbar editors (unit/note) on the section glass pill */
  .pe-sec-tools .pe-chip .ce{ text-transform:none; letter-spacing:normal; min-width:18px; display:inline-block; }
  .pe-sec-tools .pe-chip{ display:inline-flex; align-items:center; gap:3px; }

  /* ════ catalog editor chrome — LIQUID GLASS (the standing UI direction) ════
     A hover-revealed dock at each card's bottom-right (clear of the ribbon),
     floating glass popovers, and a glass-chromed item editor. Designed as a
     distinct UI layer over the page content. */
  body{ --g-bg:rgba(250,250,253,.5); --g-panel:#ffffff; --g-blur:blur(28px) saturate(180%) brightness(1.05);
    --g-edge:1px solid rgba(255,255,255,.6); --g-shadow:0 18px 48px rgba(20,16,10,.26),0 3px 9px rgba(20,16,10,.14);
    --g-inset:inset 0 1px 0 rgba(255,255,255,.85); }
  /* dock FLOATS above the card's top-left — it must not change the card's
     canon dimensions (no padding/margin added to the card). overflow:visible
     (editor only) so the floating dock + its hover tooltips aren't clipped. */
  .cat-card{ overflow:visible !important; }
  /* position:fixed + JS placement (see armDockHover) — multicol-proof, and it
     stays pinned within a proximity zone so it's easy to reach. */
  .cc-dock{ position:fixed; z-index:50; display:flex; align-items:center; gap:2px; padding:4px; border-radius:13px;
    background:var(--g-bg); border:var(--g-edge); box-shadow:var(--g-shadow),var(--g-inset);
    opacity:0; transform:translateY(-6px) scale(.96); transform-origin:top left; pointer-events:none;
    transition:opacity .18s ease, transform .2s cubic-bezier(.2,.7,.3,1); }
  /* blur is applied ONLY when the dock is visible — a hidden (opacity:0)
     backdrop-filter still composites a faint band over the content beneath it
     (this, not geometry, was what hid a card's title). */
  .cc-dock.pinned{ opacity:1; transform:none; pointer-events:auto;
    backdrop-filter:var(--g-blur); -webkit-backdrop-filter:var(--g-blur); }
  /* hover explainer tooltip — solid glass chip above each control */
  .cc-btn[data-tip]::after{ content:attr(data-tip); position:absolute; bottom:calc(100% + 9px); left:50%;
    transform:translateX(-50%) translateY(4px) scale(.96); white-space:nowrap; padding:5px 9px; border-radius:8px; pointer-events:none; z-index:60;
    font-family:'JetBrains Mono',monospace; font-size:8.5px; letter-spacing:.08em; text-transform:uppercase; color:#241a10;
    background:var(--g-panel); border:var(--g-edge); box-shadow:var(--g-shadow),var(--g-inset);
    opacity:0; transition:opacity .14s ease, transform .16s cubic-bezier(.2,.8,.2,1); }
  .cc-btn[data-tip]::before{ content:''; position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%) rotate(45deg);
    width:8px; height:8px; pointer-events:none; z-index:60; background:var(--g-panel); border-right:var(--g-edge); border-bottom:var(--g-edge); opacity:0; transition:opacity .14s ease; }
  .cc-btn[data-tip]:hover::after{ opacity:1; transform:translateX(-50%) translateY(0) scale(1); transition-delay:.25s; }
  .cc-btn[data-tip]:hover::before{ opacity:1; transition-delay:.25s; }
  .cc-btn{ position:relative; }
  .cc-btn{ width:28px; height:28px; border:none; border-radius:9px; cursor:pointer; background:transparent; color:#574c40;
    display:flex; align-items:center; justify-content:center; transition:.12s; padding:0; }
  .cc-btn:hover{ background:rgba(255,255,255,.55); color:#241a10; box-shadow:inset 0 0 0 1px rgba(255,255,255,.6); }
  .cc-btn.on{ color:var(--cat-color); }
  .cc-btn.danger:hover{ background:rgba(220,60,60,.16); color:#c0392b; }
  .cc-btn svg{ width:15px; height:15px; }
  .cc-swatch{ width:16px; height:16px; border-radius:50%; background:var(--cat-color);
    box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.9), 0 0 0 1px rgba(0,0,0,.14); }
  .cc-sep{ width:1px; height:18px; background:rgba(0,0,0,.12); margin:0 3px; }

  .cc-pop{ position:fixed; z-index:1300; min-width:182px; padding:13px; border-radius:17px;
    background:var(--g-panel,#fff); border:var(--g-edge,1px solid rgba(255,255,255,.6));
    box-shadow:var(--g-shadow,0 18px 48px rgba(20,16,10,.26)),var(--g-inset,inset 0 1px 0 rgba(255,255,255,.85));
    backdrop-filter:var(--g-blur,blur(28px) saturate(180%)); -webkit-backdrop-filter:var(--g-blur,blur(28px) saturate(180%));
    opacity:0; transform:translateY(8px) scale(.92); transition:opacity .16s ease, transform .2s cubic-bezier(.2,.8,.2,1); }
  .cc-pop.in{ opacity:1; transform:none; }
  .cc-pop-label{ font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.18em; text-transform:uppercase; color:#6f6356; margin-bottom:10px; }
  .cc-swatches{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .cc-sw{ width:30px; height:30px; border-radius:9px; cursor:pointer; position:relative; border:none; transition:transform .12s;
    box-shadow:0 1px 3px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.3); }
  .cc-sw:hover{ transform:scale(1.12); }
  .cc-sw.sel{ box-shadow:0 0 0 2px #fff, 0 0 0 4px rgba(0,0,0,.2); }
  .cc-sw.sel::after{ content:'✓'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:700; text-shadow:0 1px 2px rgba(0,0,0,.45); }
  .cc-sw.auto{ background:#fff; color:rgba(0,0,0,.5); font:700 9px/1 'JetBrains Mono',monospace; display:flex; align-items:center; justify-content:center; }
  .cc-ribbon-field{ display:flex; flex-direction:column; gap:9px; min-width:206px; }
  .cc-ribbon-field input[type=text]{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.06em; text-transform:uppercase;
    padding:8px 10px; border-radius:9px; border:1px solid rgba(0,0,0,.14); background:rgba(255,255,255,.66); outline:none; color:#2a1f15; }
  .cc-ribbon-field input:focus{ border-color:var(--cat-color); box-shadow:0 0 0 3px color-mix(in oklab,var(--cat-color) 22%,transparent); }
  .cc-tone{ display:flex; gap:6px; }
  .cc-tone button{ flex:1; font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.1em; text-transform:uppercase; padding:7px;
    border-radius:8px; border:1px solid rgba(0,0,0,.14); background:rgba(255,255,255,.5); cursor:pointer; color:#574c40; }
  .cc-tone button.on{ background:var(--cat-color); color:#fff; border-color:transparent; }
  .cc-rm{ border:1px dashed rgba(0,0,0,.22); background:none; padding:7px; border-radius:8px; cursor:pointer;
    font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:#a05a52; }
  .cc-rm:hover{ background:rgba(160,90,82,.1); }
  .cc-status{ display:block; width:100%; text-align:left; margin-top:6px; padding:7px 10px; border:0; border-radius:8px; cursor:pointer;
    font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; position:relative; box-shadow:inset 0 0 0 1px rgba(0,0,0,.05); }
  .cc-status:first-of-type{ margin-top:0; }
  .cc-status.sel::after{ content:'✓'; position:absolute; right:9px; top:50%; transform:translateY(-50%); font-size:10px; }
  .cc-status.none{ background:transparent; border:1px dashed rgba(0,0,0,.22); color:#8a7d70; box-shadow:none; margin-top:8px; }

  /* timeline editor: month enum picker (grid of options) + event removal */
  .cc-enum{ display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
  .cc-enum-opt{ font-family:'JetBrains Mono',monospace; font-size:10px; padding:6px 4px; border-radius:7px; border:1px solid rgba(0,0,0,.14); background:rgba(255,255,255,.6); cursor:pointer; color:#574c40; }
  .cc-enum-opt:hover{ background:rgba(0,0,0,.06); }
  .cc-enum-opt.sel{ background:#241a10; color:#fff; border-color:transparent; }
  /* the date field (whole "month day year" above the card) + its popover. Hug
     the date text as a self-contained box (align-self so it doesn't stretch),
     with a clear gap before the card — no outline-offset bleeding into it. */
  .sc-float-date.pe-datefield{ align-self:flex-start; cursor:pointer; border-radius:7px; padding:3px 9px; margin:-3px 0 7px -9px; transition:background .12s, box-shadow .12s; }
  .sc-float-date.pe-datefield:hover{ background:rgba(99,102,241,.08); box-shadow:0 0 0 1.5px rgba(99,102,241,.45); }
  .cc-pop.date-pop{ min-width:236px; }
  .cc-date-row{ display:flex; gap:10px; margin-top:11px; align-items:flex-end; }
  .cc-date-row label{ display:flex; flex-direction:column; gap:5px; font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.14em; text-transform:uppercase; color:#6f6356; }
  .cc-date-row .cc-date-day-col{ flex:0 0 46px; }      /* day is short — keep it narrow */
  .cc-date-row .cc-date-year-col{ flex:1; }            /* year takes the rest */
  .cc-date-row input{ width:100%; box-sizing:border-box; font-family:'JetBrains Mono',monospace; font-size:12px; padding:7px 9px; border-radius:8px; border:1px solid rgba(0,0,0,.14); background:rgba(255,255,255,.66); outline:none; color:#2a1f15; }
  .cc-date-row .cc-date-day{ text-align:center; padding-left:5px; padding-right:5px; }
  .cc-date-row input:focus{ border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.18); }
  .cc-date-row input.cc-invalid, .cc-date-row input.cc-invalid:focus{ border-color:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.16); color:#c0392b; }
  .cc-date-note{ margin-top:11px; padding-top:9px; border-top:1px solid rgba(0,0,0,.08); font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.06em; text-transform:uppercase; color:#8a7d70; }
  .cc-apply{ display:block; width:100%; margin-top:11px; padding:9px; border:none; border-radius:9px; cursor:pointer;
    font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; background:#241a10; color:#fff; transition:.12s; }
  .cc-apply:hover{ background:#3a2a18; }
  .cc-apply:disabled{ background:rgba(0,0,0,.1); color:rgba(0,0,0,.38); cursor:not-allowed; }
  /* "+ new event" — right side, directly above the timeline panel (the header's
     bottom edge sits just above the scroller). ~2× the normal add-chip size. */
  .tl-hdr{ position:relative; }
  .pe-tl-addev{ position:absolute; right:48px; bottom:6px; z-index:5; font-size:14px; padding:8px 18px; border-radius:9px; }
  @media(max-width:600px){ .tl-hdr .pe-tl-addev{ right:16px; } }
  .itl-card.pe-removable{ width:100%; }                                        /* don't shrink the card to fit-content */
  .itl-card.pe-removable > .pe-remove{ top:6px; right:6px; left:auto; }         /* × inside the card corner (card clips overflow) */
  .sc-expand.pe-expand{ cursor:pointer; padding:2px 6px; margin:-2px -6px; border-radius:5px; transition:.12s; }  /* the "Details ›" expand trigger */
  .sc-expand.pe-expand:hover{ color:#6366f1; background:rgba(99,102,241,.08); }
  /* the expandable card: the canvas iframe is full-height (the parent scrolls
     it), so the canon modal's flex-centering lands in the CONTENT middle —
     off-screen. Pin the box and let centreModal place it at the visible-
     viewport centre in content coordinates (top set by JS + this translate). */
  .tl-modal-box{ position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); max-height:none; margin:0; }
  /* the body edit box: as a block it fits the text (inline-block left a baseline
     gap that made it look oversized); trim the last paragraph's margin */
  .tl-modal-body .ce{ display:block; }
  .tl-modal-body .ce > :last-child{ margin-bottom:0; }

  /* item editor: restyle the CANONICAL modal as a glass-chromed editor (content
     is the include's own .modal-* markup — edit = live). */
  .modal-ov.open{ display:block !important; }
  .modal-ov .modal-card{ position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); margin:0; }
  /* status options carry the canonical st-* token colors (fallbacks match) */
  /* status picker swatches — same derivation as the canon chips (meaning colors) */
  .cc-status.st-active{ background:color-mix(in oklab,var(--wiki-positive) 16%,var(--wiki-surface-bg,#fff)); color:color-mix(in oklab,var(--wiki-positive) 72%,var(--wiki-text-color,#000)); }
  .cc-status.st-limited{ background:color-mix(in oklab,var(--wiki-warning) 16%,var(--wiki-surface-bg,#fff)); color:color-mix(in oklab,var(--wiki-warning) 72%,var(--wiki-text-color,#000)); }
  .cc-status.st-discontinued{ background:color-mix(in oklab,var(--wiki-neutral) 16%,var(--wiki-surface-bg,#fff)); color:color-mix(in oklab,var(--wiki-neutral) 72%,var(--wiki-text-color,#000)); }
  .cc-status.st-retired{ background:color-mix(in oklab,var(--wiki-neutral) 16%,var(--wiki-surface-bg,#fff)); color:color-mix(in oklab,var(--wiki-neutral) 72%,var(--wiki-text-color,#000)); }
  .cat-add-pill{ border-style:dashed !important; color:rgba(0,0,0,.4) !important; background:transparent !important; }

  /* ════ two-click delete confirm (mockup Direction 2) ════ The ✕ trigger fades
     out and a red "✓ Delete" + grey undo pop in over it; a 2nd click commits,
     undo / outside-click / Escape backs out. Routed via armDelete for every
     delete in the kit. */
  .pe-del-armed{ opacity:0 !important; pointer-events:none; }
  .pe-del-confirm{ position:fixed; z-index:1400; display:inline-flex; align-items:center; gap:3px; }
  .pe-del-confirm button{ border:0; cursor:pointer; border-radius:7px; height:24px; padding:0 9px; font-family:'JetBrains Mono',monospace;
    font-size:9px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; display:inline-flex; align-items:center; gap:5px;
    animation:pe-del-pop .18s cubic-bezier(.2,1.3,.4,1) backwards; }
  .pe-del-confirm svg{ width:12px; height:12px; }
  .pe-del-yes{ background:#c0392b; color:#fff; box-shadow:0 3px 10px rgba(192,57,43,.32); }
  .pe-del-yes:hover{ background:#a5281b; }
  /* solid + bordered so "keep" stays visible on ANY background (a faint fill
     vanished on dark bands like the spec sheet's signature band) */
  .pe-del-confirm .pe-del-no{ background:#fff; box-sizing:border-box; border:1px solid rgba(0,0,0,.18); color:#5a5a5a; box-shadow:0 3px 10px rgba(0,0,0,.22); animation-delay:.04s; }
  .pe-del-confirm .pe-del-no:hover{ background:#f1f1f1; color:#1c1a17; border-color:rgba(0,0,0,.34); }
  @keyframes pe-del-pop{ from{ opacity:0; transform:scale(.5); } to{ opacity:1; transform:none; } }
  /* category note: a dashed chip INLINE in the count line (canon position —
     "N items · note") — "+ note" to add, editable text + corner × when present */
  .pe-note-chip{ display:inline-flex; align-items:center; margin-left:6px; padding:1px 7px; border-radius:4px; vertical-align:middle;
    border:1px dashed rgba(0,0,0,.28); background:transparent; color:rgba(0,0,0,.46); position:relative;
    font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; }
  button.pe-note-chip:hover{ border-color:rgba(0,0,0,.45); color:rgba(0,0,0,.62); }
  .pe-note-chip.has{ cursor:default; }
  .pe-note-chip .ce{ text-transform:none; letter-spacing:normal; }
  .pe-note-chip > .pe-remove{ top:-7px; right:-7px; width:14px; height:14px; font-size:10px; }
  .modal-scroll .pe-mini-add, .modal-scroll .pe-add{ opacity:.7; }
  .modal-scroll .pe-mini-add:hover, .modal-scroll .pe-add:hover{ opacity:1; }
  .modal-scroll .pe-chip{ display:inline-flex; align-items:center; gap:3px; margin-left:8px; border:1px solid rgba(120,120,140,.3); border-radius:999px;
    padding:2px 8px; font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.08em; text-transform:uppercase; color:rgba(90,90,110,.8); }
  .modal-scroll .pe-chip .ce{ text-transform:none; letter-spacing:normal; min-width:18px; }
  .pe-st-chip{ cursor:pointer; }
  .pe-st-chip::after{ content:' ▾'; opacity:.6; }
  .pe-adds{ display:flex; flex-wrap:wrap; gap:8px; margin-top:20px; padding-top:14px; border-top:1px dashed rgba(0,0,0,.14); align-items:center; }
  .pe-removeitem{ margin-left:auto; border:1px dashed rgba(160,90,82,.5); background:none; padding:7px 11px; border-radius:8px; cursor:pointer;
    font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#a05a52; }
  .pe-removeitem:hover{ background:rgba(160,90,82,.1); }
  /* callout + note are full-width content BLOCKS (the box / hairline divider
     span the card) — the text field inside stays content-width. Their × is
     inset (they aren't shrink-wrapped). */
  .modal-callout.pe-removable, .modal-note.pe-removable{ width:auto; max-width:none; }
  .modal-scroll .pe-removable > .pe-remove{ top:6px; right:6px; left:auto; }
  .gpill.struck .ce{ text-decoration:line-through; }
  /* group-pill control: a hover ⋯ menu (→ strike / remove popover) */
  .gpill{ position:relative; }
  .gpill-menu{ border:0; background:transparent; color:inherit; cursor:pointer; font-size:12px; line-height:1; padding:0 0 0 2px; margin-left:1px;
    opacity:0; max-width:0; overflow:hidden; transition:opacity .12s, max-width .12s; }
  .gpill:hover .gpill-menu, .gpill:focus-within .gpill-menu{ opacity:.55; max-width:16px; }
  .gpill-menu:hover{ opacity:1 !important; }
  .cc-pop.pill-pop{ min-width:150px; padding:6px; }
  .cc-row{ display:block; width:100%; text-align:left; padding:8px 10px; border:0; border-radius:8px; background:transparent; cursor:pointer;
    font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:#574c40; }
  .cc-row:hover{ background:rgba(255,255,255,.6); color:#241a10; }
  .cc-row.danger{ color:#a0473f; } .cc-row.danger:hover{ background:rgba(160,71,63,.12); color:#922; }
  .pe-remove,.pe-lock{ position:absolute; top:-9px; right:-9px; width:18px; height:18px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; line-height:1; opacity:0; transition:opacity .12s; z-index:4; }
  .pe-remove{ border:1px solid rgba(0,0,0,.18); background:#fff; color:rgba(0,0,0,.45); font-size:12px; cursor:pointer; }
  .pe-removable:hover > .pe-remove{ opacity:1; }
  .pe-remove:hover{ border-color:#ef4444; color:#ef4444; }
  .pe-lock{ border:1px solid rgba(0,0,0,.12); background:#fff; color:rgba(0,0,0,.34); cursor:default; }
  .pe-lock svg{ width:10px; height:10px; }
  /* canon-locked (can't edit AND can't delete): red box on hover + padlock */
  .pe-canon{ position:relative; width:fit-content; max-width:100%; cursor:not-allowed; border-radius:2px;
    outline:2px solid transparent; outline-offset:2px; transition:outline-color .12s; }
  .pe-canon:hover{ outline-color:rgba(220,48,48,.5); }
  .pe-canon.on-dark:hover{ outline-color:rgba(255,120,120,.85); }
  .pe-canon:hover > .pe-lock{ opacity:.9; }

  .pe-tag-rm{ display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:50%;
    margin-left:6px; vertical-align:middle; border:1px solid rgba(0,0,0,.18); background:#fff; color:rgba(0,0,0,.5);
    font-size:9px; line-height:1; cursor:pointer; opacity:0; transition:opacity .12s; }
  .pe-removable:hover .pe-tag-rm,
  .pe-removable:hover + .pe-tag-rm{ opacity:1; }
  .pe-tag-rm:hover{ border-color:#ef4444; color:#ef4444; }

  .pe-add{ font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; border-radius:5px; padding:3px 9px;
    border:1px dashed rgba(120,120,140,.5); background:rgba(120,120,140,.06); color:rgba(90,90,110,.85); }
  .pe-add:hover{ border-color:#6366f1; color:#6366f1; }
  .pe-mini-add{ font-family:'JetBrains Mono',monospace; font-size:10px; cursor:pointer; border-radius:3px; padding:2px 7px;
    margin-left:6px; vertical-align:middle; border:1px dashed rgba(120,120,140,.5); background:transparent; color:rgba(90,90,110,.7); }
  .pe-mini-add:hover{ color:#6366f1; border-color:#6366f1; }
  .pe-addline{ margin:12px 0; }
  .wiki-hero-subtitle.pe-removable{ display:inline-flex; align-items:baseline; }
  .wiki-infobox-label.pe-removable{ width:fit-content; max-width:100%; }

  /* hero card (aside) controls + empty slots */
  .pe-aside-ctrls{ display:flex; gap:6px; justify-content:flex-end; margin-bottom:8px; }
  .pe-chip{ cursor:pointer; border:1px solid rgba(120,120,140,.3); background:rgba(255,255,255,.72); border-radius:999px;
    font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.1em; text-transform:uppercase; color:rgba(90,90,110,.72); padding:3px 9px; }
  .pe-chip:hover{ border-color:rgba(90,90,110,.5); color:#333; }
  .pe-chip.active{ background:#6366f1; color:#fff; border-color:#6366f1; }
  .pe-aside-empty{ padding:22px; border:1.5px dashed rgba(120,120,140,.4); border-radius:10px; background:rgba(120,120,140,.04); }
  /* empty infobox slot: strip the real panel's fill/border so only the dashed
     placeholder shows, while keeping .wiki-infobox so the overview :has() grid
     still places it in the right column */
  .wiki-infobox.pe-empty{ background:transparent !important; border:none !important; overflow:visible; }
  .pe-aside-empty-label{ font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:rgba(90,90,110,.5); margin-bottom:12px; }
  .pe-add-row{ display:flex; gap:8px; flex-wrap:wrap; }

  /* section-level controls float in the section panel's upper-right (glass pill) */
  .pe-sec{ position:relative; }
  .pe-sec-tools{ position:absolute; top:12px; right:16px; z-index:6; display:inline-flex; align-items:center; gap:6px;
    padding:5px 10px; border-radius:999px; background:rgba(130,130,145,.12); border:1px solid rgba(130,130,145,.22);
    backdrop-filter:blur(8px) saturate(140%); -webkit-backdrop-filter:blur(8px) saturate(140%);
    font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:rgba(90,90,110,.75); }
  .pe-tonebtn{ font:inherit; cursor:pointer; border:1px solid rgba(120,120,140,.35); background:rgba(255,255,255,.72); border-radius:999px; padding:2px 8px; color:rgba(90,90,110,.85); text-transform:lowercase; }
  .pe-tonebtn.on{ background:#6366f1; border-color:#6366f1; color:#fff; }

  /* add-section affordance (dotted circle + plus) — sits on the seam between
     bands. Canon placement: only BELOW the overview (nothing can be added
     above the hero or between hero and overview — both are locked-first). */
  .pe-add-section{ display:flex; align-items:center; gap:14px; padding:8px 72px; cursor:pointer; background:#fff; }
  .pe-add-line{ flex:1; height:1px; background:rgba(0,0,0,.07); transition:background .15s; }
  .pe-add-section:hover .pe-add-line{ background:rgba(0,113,227,.35); }
  .pe-add-dot{ width:30px; height:30px; border-radius:50%; flex:none; position:relative;
    border:1.5px dashed rgba(0,0,0,.3); background:#fff; color:rgba(0,0,0,.42);
    font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.15s; }
  .pe-add-section:hover .pe-add-dot{ border-color:#0071e3; border-style:solid; color:#0071e3; }
  .pe-add-dot::after{ content:'Add section'; position:absolute; left:50%; top:-25px; transform:translateX(-50%) scale(.92);
    background:#0a0a0a; color:#fff; font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.14em; text-transform:uppercase;
    padding:3px 8px; border-radius:4px; white-space:nowrap; opacity:0; pointer-events:none; transition:.15s; }
  .pe-add-section:hover .pe-add-dot::after{ opacity:1; transform:translateX(-50%) scale(1); }

  /* ════ config (storage / configuration chart) editor — the owner's DRAWER
     flow (configeditorui.html). Inline grey/blue .ce boxes edit the chart
     directly (+ feed the readiness widget); a per-row chevron opens a structured
     drawer for the full form. The bars stay CANON-sorted low→high (config.html);
     an inline/drawer capacity, unit or revised change re-runs that sort and the
     decorator FLIPs each row + bar into place (inline transitions). ════ */
  .cfg-row{ position:relative; }   /* editor-only anchor for the row chevron (does NOT restate the canon grid) */
  /* per-row edit button (chevron), just right of the row */
  .row-edit-btn{ position:absolute; top:4px; right:-38px; width:26px; height:26px; border-radius:7px; border:1px solid rgba(0,0,0,.16);
    background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transition:opacity .14s;
    color:rgba(0,0,0,.45); z-index:10; box-shadow:0 2px 6px rgba(0,0,0,.08); }
  .cfg-row:hover .row-edit-btn, .row-edit-btn.open{ opacity:1; }
  .row-edit-btn:hover{ border-color:rgba(0,0,0,.3); color:#0a0a0a; }
  .row-edit-btn svg{ transition:transform .18s; }
  .row-edit-btn.open svg{ transform:rotate(180deg); }
  /* the dropdown drawer (sibling after the row). box-sizing on every child so
     width:100% inputs + padding don't overrun the grid columns (the overset). */
  .row-drawer{ display:none; margin:8px 0 2px; background:#f8f7f5; border:1px solid rgba(0,0,0,.10);
    border-radius:10px; padding:16px; gap:12px; flex-direction:column; }
  .row-drawer, .row-drawer *{ box-sizing:border-box; }
  .row-drawer.open{ display:flex; }
  .row-drawer .dr-row{ min-width:0; }
  .row-drawer .dr-row > div{ min-width:0; }
  .dr-row{ display:grid; gap:10px; }
  .dr-row.c2{ grid-template-columns:1fr 1fr; }
  .dr-row.c3{ grid-template-columns:1fr 1fr 1fr; }
  .dr-label{ font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.18em; text-transform:uppercase; color:rgba(0,0,0,.4); margin-bottom:4px; }
  .dr-input{ width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid rgba(0,0,0,.14); border-radius:7px; font-family:'Spectral',Georgia,serif; font-size:13.5px; color:#0a0a0a; background:#fff; outline:none; transition:.12s; }
  .dr-input:focus{ border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.14); }
  .dr-select{ appearance:none; cursor:pointer; padding-right:28px; background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E") no-repeat right 10px center; }
  .tog-row{ display:flex; gap:7px; flex-wrap:wrap; align-items:center; }
  /* info "i" beside a toggle — a hover/focus tooltip explaining the option */
  .dr-info{ position:relative; display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:rgba(0,0,0,.4); cursor:help; outline:none; }
  .dr-info svg{ width:15px; height:15px; }
  .dr-info:hover, .dr-info:focus{ color:#2563eb; }
  .dr-info::after{ content:attr(data-tip); position:absolute; left:0; bottom:calc(100% + 9px); transform:translateY(5px); width:300px; max-width:300px;
    white-space:normal; text-align:left; background:#0a0a0a; color:#fff; font-family:'Spectral',Georgia,serif; font-size:12px; font-weight:400; line-height:1.5;
    letter-spacing:0; text-transform:none; padding:10px 12px; border-radius:9px; box-shadow:0 10px 28px rgba(0,0,0,.24); opacity:0; pointer-events:none;
    transition:opacity .14s ease, transform .14s ease; z-index:40; }
  .dr-info::before{ content:''; position:absolute; left:6px; bottom:calc(100% + 3px); transform:translateY(5px) rotate(45deg); width:9px; height:9px; background:#0a0a0a; opacity:0; transition:opacity .14s ease, transform .14s ease; z-index:40; }
  .dr-info:hover::after, .dr-info:focus::after, .dr-info:hover::before, .dr-info:focus::before{ opacity:1; transform:translateY(0); }
  .dr-info:hover::before, .dr-info:focus::before{ transform:rotate(45deg); }
  .tog{ display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:6px; border:1px solid rgba(0,0,0,.16); background:#fff;
    font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.08em; text-transform:uppercase; color:rgba(0,0,0,.5); cursor:pointer; transition:.12s; }
  .tog:hover{ border-color:rgba(0,0,0,.3); }
  .tog.on{ background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; }
  .tog-pip{ width:7px; height:7px; border-radius:50%; background:currentColor; opacity:.4; }
  .tog.on .tog-pip{ opacity:1; }
  .dots-editor{ display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; }
  .dot-chip{ display:flex; flex-direction:column; align-items:center; gap:4px; position:relative; }
  .dot-swatch{ width:26px; height:26px; border-radius:50%; cursor:pointer; position:relative; box-shadow:0 1px 3px rgba(0,0,0,.18); border:2px solid transparent; transition:.12s; }
  .dot-swatch.ring{ border-color:rgba(0,0,0,.4); }
  .dot-swatch input[type=color]{ position:absolute; inset:0; opacity:0; cursor:pointer; border-radius:50%; width:100%; height:100%; border:none; padding:0; }
  .dot-name-inp{ width:44px; font-family:'JetBrains Mono',monospace; font-size:7px; letter-spacing:.06em; text-transform:uppercase; text-align:center;
    border:none; border-bottom:1px solid rgba(0,0,0,.16); background:transparent; outline:none; color:rgba(0,0,0,.5); }
  .dot-rm{ position:absolute; top:-4px; right:-4px; width:14px; height:14px; border-radius:50%; border:none; background:#fecaca; color:#dc2626;
    font-size:9px; cursor:pointer; display:none; align-items:center; justify-content:center; line-height:1; }
  .dot-chip:hover .dot-rm{ display:flex; }
  .dot-add{ width:26px; height:26px; border-radius:50%; border:1.5px dashed rgba(0,0,0,.22); background:transparent; font-size:14px; color:rgba(0,0,0,.3);
    cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .dot-add:hover{ border-color:rgba(0,0,0,.4); color:rgba(0,0,0,.5); }
  .dr-actions{ display:flex; justify-content:flex-end; align-items:center; padding-top:10px; border-top:1px solid rgba(0,0,0,.08); margin-top:2px; }
  .dr-btn{ font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.08em; text-transform:uppercase; padding:6px 10px; border-radius:6px;
    border:1px solid rgba(0,0,0,.14); background:#fff; cursor:pointer; color:rgba(0,0,0,.5); }
  .dr-btn:hover{ border-color:rgba(0,0,0,.3); color:#0a0a0a; }
  .dr-btn.danger{ border-color:#fecaca; color:#ef4444; }
  .dr-btn.danger:hover{ background:#fef2f2; }
  /* toolbar below the chart */
  .pe-cfg-toolbar{ display:flex; flex-wrap:wrap; gap:6px; margin-top:16px; padding-top:14px; border-top:1px dashed rgba(0,0,0,.14); }
  .pe-cfg-add{ font-family:'JetBrains Mono',monospace; font-size:8.5px; letter-spacing:.08em; text-transform:uppercase; padding:6px 10px; border-radius:6px;
    border:1px solid rgba(0,0,0,.14); background:#fff; cursor:pointer; color:rgba(0,0,0,.5); }
  .pe-cfg-add:hover{ border-color:rgba(0,0,0,.3); color:#0a0a0a; }

  /* ════ spec (Specifications Sheet) editor ════ Inline .ce on the heading,
     device line, card titles + key/value rows; a card-icon picker sourced from
     the canon sprite. Keep cards/rows full-width so the corner × sits right. */
  .spec-card{ position:relative; }                                  /* editor anchor for the × + drag handle */
  .spec-card.pe-removable{ width:auto; }
  .spec-row.pe-removable{ width:auto; }
  .spec-card-head .pe-mini-add{ margin-left:0; margin-right:6px; }
  /* the grid clips to its rounded border (overflow:hidden), so the × + drag
     handle are INSET into the card's top-right corner — outside-the-card
     positions get clipped on edge cards (top row / side columns). */
  .spec-card.pe-removable > .pe-remove{ top:6px; right:6px; left:auto; z-index:14; }
  .spec-drag{ position:absolute; top:30px; right:6px; width:18px; height:18px; z-index:13; display:flex; align-items:center; justify-content:center;
    border:1px solid rgba(0,0,0,.16); border-radius:50%; background:#fff; color:rgba(0,0,0,.4); cursor:grab; padding:0;
    opacity:0; transition:opacity .12s, color .12s, border-color .12s; }
  .spec-card:hover .spec-drag{ opacity:1; }
  .spec-drag:hover{ color:#6366f1; border-color:#6366f1; }
  .spec-drag:active{ cursor:grabbing; }
  .spec-drag svg{ width:11px; height:11px; }
  .spec-card.pe-dragging{ opacity:.4; }
  /* drop-insertion cue — INSET edge (an outside edge would be clipped by the grid) */
  .spec-card.pe-drop-before{ box-shadow:inset 3px 0 0 0 #6366f1; }
  .spec-card.pe-drop-after{ box-shadow:inset -3px 0 0 0 #6366f1; }
  /* icon picker popover — a scrollable grid of the sprite's glyphs */
  .cc-pop.icon-pop{ min-width:266px; }
  .cc-icons{ display:grid; grid-template-columns:repeat(6,1fr); gap:5px; max-height:244px; overflow-y:auto; margin-bottom:4px; padding:1px; }
  .cc-icon{ width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; border:1px solid rgba(0,0,0,.1);
    border-radius:8px; background:#fff; cursor:pointer; color:#333; transition:.12s; padding:0; }
  .cc-icon:hover{ border-color:#6366f1; color:#6366f1; background:rgba(99,102,241,.06); }
  .cc-icon.sel{ border-color:#6366f1; background:#6366f1; color:#fff; }
  .cc-icon svg{ width:17px; height:17px; }

  /* ════ lifecycle-lane (OS-support ribbon) editor ════ inline fields on the
     tiles; locked auto range/legend; type + badge picked in a popover. */
  .pe-lane-opts{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:10px; }
  .lane-seg{ position:relative; }
  .lane-seg.pe-removable{ width:auto; }
  .lane-seg.pe-removable > .pe-remove{ top:4px; right:4px; left:auto; z-index:14; }   /* inset: the scroller clips outside-the-tile */
  .pe-lane-foot{ display:flex; justify-content:flex-end; align-items:center; gap:8px; margin-top:12px; }
  .cc-pop.lane-pop{ min-width:230px; }
  .cc-pop.lane-pop .cc-enum{ grid-template-columns:repeat(2,1fr); }
  .cc-pop.lane-pop .cc-enum-opt{ display:flex; align-items:center; gap:6px; justify-content:center; text-transform:capitalize; }
  .cc-pop.lane-pop .cc-enum-opt .lane-note-dot{ flex:none; }
  /* color-coded support-type options (the semantic palette — matches the tiles) */
  .cc-pop.lane-pop .cc-type-full{ background:#d1fae5; border-color:#a7f3d0; color:#065f46; }
  .cc-pop.lane-pop .cc-type-partial{ background:#fef3c7; border-color:#fde68a; color:#92400e; }
  .cc-pop.lane-pop .cc-type-dropped{ background:#f3f4f6; border-color:#e5e7eb; border-style:dashed; color:#6b7280; }
  .cc-pop.lane-pop .cc-type-security{ background:#dbeafe; border-color:#bfdbfe; color:#1e40af; }
  .cc-pop.lane-pop .cc-enum-opt.sel{ box-shadow:0 0 0 2px #241a10; }
  /* badge preset bank — text+color combos (each chip in its badge colour) */
  .cc-pop.lane-pop .cc-badge-ship{ background:rgba(0,0,0,.06); border-color:rgba(0,0,0,.12); color:#6b6b6b; }
  .cc-pop.lane-pop .cc-badge-paid{ background:#fbbf24; border-color:#f59e0b; color:#78350f; }
  .cc-pop.lane-pop .cc-badge-limited{ background:#f59e0b; border-color:#d97706; color:#78350f; }
  .cc-pop.lane-pop .cc-badge-final{ background:#0a0a0a; border-color:#0a0a0a; color:#fff; }
  .cc-pop.lane-pop .cc-badge-dropped{ background:transparent; border:1px dashed rgba(0,0,0,.24); color:#8a8a8a; }
  .cc-pop.lane-pop .cc-badge-security{ background:#3b82f6; border-color:#2563eb; color:#fff; }
  /* version + date, side by side, in the segment popover */
  .cc-pop-row2{ display:flex; gap:8px; }
  .cc-pop-fld{ display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
  .cc-pop-fld .cc-pop-label{ margin-bottom:0; }
  .cc-lane-ver, .cc-lane-date, .cc-lane-badge{ width:100%; box-sizing:border-box; font-family:'JetBrains Mono',monospace; font-size:11px; padding:7px 9px;
    border-radius:8px; border:1px solid rgba(0,0,0,.14); background:rgba(255,255,255,.66); outline:none; color:#2a1f15; }
  .cc-lane-badge{ margin-top:2px; }
  .cc-lane-ver:focus, .cc-lane-date:focus, .cc-lane-badge:focus{ border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.16); }
  .cc-pop.lane-pop .cc-rm{ margin-top:10px; width:100%; }
`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">`;

// the iframe document: canonical CSS stack + affordance CSS + runtime +
// the decorator (grammar + sentinel protocol injected for it).
export function buildCanvas(bodyHtml: string, skin: WikiSkin = TACO_BELL_SKIN): string {
  const skinLinks = skin.css.map((f) => `<link rel="stylesheet" href="/canon/${f}">`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${FONTS}
<link rel="stylesheet" href="/canon/wiki-typography.css">
<link rel="stylesheet" href="/canon/wiki-universals.css">
${(BANK_CSS as string[]).map((f) => `<link rel="stylesheet" href="/canon/${f}">`).join('\n')}
${skinLinks}
<style>${AFFORDANCE}</style>
<script>
window.__PE_POLICY=${JSON.stringify(POLICY)};
window.__PE_REGISTRY=${JSON.stringify(REGISTRY)};
window.__PE_SENT=${JSON.stringify(SENT_PREFIX)};
function P(p,el){try{window.parent.__peField(p,el.innerHTML)}catch(e){}}
function PV(p,v){try{window.parent.__peField(p,v)}catch(e){}}
function A(a){try{window.parent.__peAction(a)}catch(e){}}
function H(){try{window.parent.__peResize(document.documentElement.scrollHeight)}catch(e){}}
// relative luminance (0=black,1=white) of "r,g,b" channels
function LUM(r,g,b){var f=function(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)}
// pull every "rgb/rgba(r,g,b[,a])" out of a CSS value, return [{r,g,b,a}]
function COLORS(s){var out=[],re=/rgba?\\(([^)]+)\\)/g,m;while((m=re.exec(s))){var p=m[1].split(',').map(function(v){return parseFloat(v)});out.push({r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1})}return out}
// effective background luminance behind an element: walk ancestors; first solid
// bg-color (alpha>.35) wins; else average any gradient colors in bg-image. Default light.
function effLum(el){var n=el;while(n&&n!==document.documentElement){var st=getComputedStyle(n);var bc=COLORS(st.backgroundColor);if(bc.length&&bc[0].a>0.35)return LUM(bc[0].r,bc[0].g,bc[0].b);var gc=COLORS(st.backgroundImage);if(gc.length){var t=0,c=0;for(var i=0;i<gc.length;i++){if(gc[i].a>0.1){t+=LUM(gc[i].r,gc[i].g,gc[i].b);c++}}if(c)return t/c}n=n.parentElement}return 1}
// tag each edit box on-dark when it sits on a dark background → light color pack
function tagDark(){var els=document.querySelectorAll('.ce,.pe-canon');for(var i=0;i<els.length;i++)els[i].classList.toggle('on-dark',effLum(els[i])<0.5)}
window.__retag=tagDark;
// Enter inside a paragraph box → a block element (div), not a bare <br>, so the
// new paragraph picks up the canonical inter-paragraph spacing (CSS above).
try{document.execCommand('defaultParagraphSeparator',false,'div')}catch(e){}
window.addEventListener('load',function(){if(window.__decorate)window.__decorate();H();try{new ResizeObserver(H).observe(document.body)}catch(e){}});
</script>
<script src="/editor/decorate.js"></script>
</head>
<body class="${skin.bodyClass}" style="overflow-x:hidden">${bodyHtml}</body></html>`;
}

// ── data sync (called from the React side) ──
function getAt(doc: any, path: string): any {
  let o: any = doc;
  for (const p of path.split('.')) o = o?.[p];
  return o;
}
function setAt(doc: any, path: string, value: any): void {
  const parts = path.split('.');
  let o: any = doc;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}
export function setIn(doc: PageDoc, path: string, value: string): void {
  setAt(doc, path, value);
}

// a body-section data path ("sections.0.data.categories.1.name") resolves its
// grammar rules under the section's COMPONENT type ("catalog.categories[].name")
function polKeyFor(doc: PageDoc, path: string): string {
  const m = /^sections\.(\d+)\.data\.(.+)$/.exec(path);
  if (!m) return path;
  const type = doc.sections[Number(m[1])]?.type;
  return type ? type + '.' + m[2].replace(/\.\d+(?=\.|$)/g, '[]') : path;
}

/**
 * Apply an editor action. GENERIC actions are derived from grammar policy:
 *   add:<path>   → set the field to its grammar `blank`
 *   rm:<path>    → null the field (splice for a list index; false for a bool),
 *                  cascading to fields that `requires` it (grammar)
 *   push:<path>  → append the list's grammar `item_blank`
 * Plus a few editor-semantics specials (aside XOR + stash, tone).
 */
export function applyAction(doc: PageDoc, action: string): void {
  const h = doc.hero;
  const stash = (doc._stash = doc._stash || {});
  const ci = action.indexOf(':');
  const name = ci < 0 ? action : action.slice(0, ci);
  const arg = ci < 0 ? '' : action.slice(ci + 1);
  switch (name) {
    case 'add': {
      // the search toggle seeds its placeholder alongside (home-variant canon)
      if (arg === 'hero.search') { h.search = true; if (!h.search_placeholder) h.search_placeholder = blankOf('hero.search_placeholder'); break; }
      setAt(doc, arg, blankOf(polKeyFor(doc, arg)));
      break;
    }
    case 'rm': {
      const parts = arg.split('.');
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) { // list item → splice
        const list = getAt(doc, parts.slice(0, -1).join('.'));
        if (Array.isArray(list)) list.splice(Number(last), 1);
        break;
      }
      if (rule(polKeyFor(doc, arg)).kind === 'bool') { setAt(doc, arg, false); break; }
      setAt(doc, arg, null);
      // cascade: null sibling fields that `requires` the removed one (grammar)
      const parent = parts.slice(0, -1).join('.');
      for (const [p, r] of Object.entries(POLICY.fields) as [string, any][]) {
        if (r.requires === last && p.startsWith(parent + '.') && !p.slice(parent.length + 1).includes('.')) setAt(doc, p, null);
      }
      break;
    }
    case 'push': {
      let list = getAt(doc, arg);
      if (!Array.isArray(list)) { list = []; setAt(doc, arg, list); } // absent optional list → create it (e.g. + group on an item with none)
      list.push(itemBlankOf(polKeyFor(doc, arg)));
      break;
    }
    case 'set': { // set:<path>:<value> — enum cycling / dropdowns / bool toggles
      const ci2 = arg.lastIndexOf(':');
      if (ci2 > 0) {
        const raw = arg.slice(ci2 + 1);
        const v = raw === 'true' ? true : raw === 'false' ? false : /^\d+$/.test(raw) ? Number(raw) : raw;
        setAt(doc, arg.slice(0, ci2), v);
      }
      break;
    }
    // hero card (aside): spotlight XOR feature (canon); the inactive variant
    // is stashed so switching back keeps your edits. Blanks come from grammar.
    case 'addAside':
    case 'switchAside':
      if (h.spotlight) stash.spotlight = h.spotlight;
      if (h.feature) stash.feature = h.feature;
      if (arg === 'feature') { h.feature = stash.feature || blankOf('hero.feature'); h.spotlight = null; }
      else { h.spotlight = stash.spotlight || blankOf('hero.spotlight'); h.feature = null; }
      break;
    case 'rmAside':
      if (h.spotlight) stash.spotlight = h.spotlight;
      if (h.feature) stash.feature = h.feature;
      h.spotlight = null; h.feature = null;
      break;
    case 'lmove': { // lmove:<listpath>:<from>:<to> — reorder a list item (drag-to-reorder)
      const li = arg.lastIndexOf(':'), lj = arg.lastIndexOf(':', li - 1);
      const path = arg.slice(0, lj), from = Number(arg.slice(lj + 1, li)), to = Number(arg.slice(li + 1));
      const list = getAt(doc, path);
      if (Array.isArray(list) && from >= 0 && from < list.length && to >= 0 && to < list.length && from !== to) {
        const [el] = list.splice(from, 1);
        list.splice(to, 0, el);
      }
      break;
    }
    case 'commit': break; // no-op: forces a re-render so derived displays refresh
    case 'setTone': doc.overview.tone = arg; break;
    // body sections (the ordered list after the locked hero+overview):
    //   secAdd:<index>:<type> → insert a grammar-seeded section at <index>
    //   secRm:<index>         → remove
    //   secTone:<index>:<t>   → set that section's tone
    case 'secAdd': {
      const [idx, type] = arg.split(':');
      doc.sections.splice(Number(idx), 0, seedSection(type));
      break;
    }
    case 'secRm': doc.sections.splice(Number(arg), 1); break;
    case 'secMove': { // secMove:<index>:<up|down> — body sections reorder freely (canon)
      const [mi, dir] = arg.split(':');
      const a2 = Number(mi), b2 = dir === 'up' ? a2 - 1 : a2 + 1;
      if (doc.sections[a2] && doc.sections[b2]) {
        const t2 = doc.sections[a2];
        doc.sections[a2] = doc.sections[b2];
        doc.sections[b2] = t2;
      }
      break;
    }
    case 'secTone': {
      const [idx, t] = arg.split(':');
      if (doc.sections[Number(idx)]) doc.sections[Number(idx)].data.tone = t;
      break;
    }
  }
}
