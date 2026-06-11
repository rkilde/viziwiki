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
  .cc-dock{ position:absolute; top:-42px; left:0; z-index:8; display:flex; align-items:center; gap:2px; padding:4px; border-radius:13px;
    background:var(--g-bg); border:var(--g-edge); box-shadow:var(--g-shadow),var(--g-inset);
    opacity:0; transform:translateY(-6px) scale(.96); transform-origin:top left; pointer-events:none;
    transition:opacity .18s ease, transform .2s cubic-bezier(.2,.7,.3,1); }
  /* blur is applied ONLY when the dock is visible — a hidden (opacity:0)
     backdrop-filter still composites a faint band over the content beneath it
     (this, not geometry, was what hid a card's title). */
  .cat-card:hover .cc-dock, .cc-dock.pinned{ opacity:1; transform:none; pointer-events:auto;
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
  /* the date field (whole "month day year" above the card) + its popover */
  .pe-datefield{ cursor:pointer; border-radius:6px; transition:.12s; }
  .pe-datefield:hover{ background:rgba(99,102,241,.08); outline:1px dashed rgba(99,102,241,.45); outline-offset:3px; }
  .cc-pop.date-pop{ min-width:236px; }
  .cc-date-row{ display:flex; gap:10px; margin-top:11px; }
  .cc-date-row label{ flex:1; display:flex; flex-direction:column; gap:5px; font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.14em; text-transform:uppercase; color:#6f6356; }
  .cc-date-row .cc-date-day{ flex:0 0 64px; }
  .cc-date-row input{ font-family:'JetBrains Mono',monospace; font-size:12px; padding:7px 9px; border-radius:8px; border:1px solid rgba(0,0,0,.14); background:rgba(255,255,255,.66); outline:none; color:#2a1f15; }
  .cc-date-row input:focus{ border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.18); }
  .cc-date-note{ margin-top:11px; padding-top:9px; border-top:1px solid rgba(0,0,0,.08); font-family:'JetBrains Mono',monospace; font-size:8px; letter-spacing:.06em; text-transform:uppercase; color:#8a7d70; }
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
  /* status options carry the canonical st-* token colours (fallbacks match) */
  .cc-status.st-active{ background:var(--st-active-bg,#dcfce7); color:var(--st-active-fg,#166534); }
  .cc-status.st-discontinued{ background:var(--st-discontinued-bg,#fee2e2); color:var(--st-discontinued-fg,#991b1b); }
  .cc-status.st-limited{ background:var(--st-limited-bg,#fef9c3); color:var(--st-limited-fg,#854d0e); }
  .cc-status.st-retired{ background:var(--st-retired-bg,#f3f4f6); color:var(--st-retired-fg,#4b5563); }
  .cat-add-pill{ border-style:dashed !important; color:rgba(0,0,0,.4) !important; background:transparent !important; }
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
