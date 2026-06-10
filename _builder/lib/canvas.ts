// The editor canvas SHELL. The page body itself comes from the DERIVED
// renderer (lib/render.ts — the repo's own Liquid includes); this file only
// supplies the iframe document around it: the canonical CSS stack, the
// affordance CSS (editing chrome), the iframe runtime (field/action bridges,
// resize, background-luminance tagging), and the data mutations.
// NO canonical markup lives here — see CLAUDE.md standing rule #5.
import type { PageDoc } from './store';
import { BLANK_CARD, BLANK_FEATURE } from './store';
import type { WikiSkin } from './wiki';
import { GRAMMAR } from './grammar';
import { SENT_PREFIX } from './render';

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
${skinLinks}
<style>${AFFORDANCE}</style>
<script>
window.__PE_GRAMMAR=${JSON.stringify(GRAMMAR)};
window.__PE_SENT=${JSON.stringify(SENT_PREFIX)};
function P(p,el){try{window.parent.__peField(p,el.innerHTML)}catch(e){}}
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
export function setIn(doc: PageDoc, path: string, value: string): void {
  const parts = path.split('.');
  let o: any = doc;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length - 1]] = value;
}

export function applyAction(doc: PageDoc, action: string): void {
  const h = doc.hero, ov = doc.overview;
  const s = h.spotlight, f = h.feature;
  const stash = (doc._stash = doc._stash || {});
  const [name, arg] = action.split(':');
  switch (name) {
    case 'addEyebrow': h.eyebrow = 'Category label'; break;
    case 'rmEyebrow': h.eyebrow = null; break;
    case 'addSubtitle': h.subtitle = 'Subtitle'; break;
    case 'rmSubtitle': h.subtitle = null; h.subtitle_meta = null; break;
    case 'addMeta': h.subtitle_meta = 'Model number'; break;
    case 'rmMeta': h.subtitle_meta = null; break;
    case 'addDesc': h.desc = 'Write a short lead paragraph for this page.'; break;
    case 'rmDesc': h.desc = null; break;
    case 'addStats': h.stats = [{ num: 'Value', label: 'Stat label' }, { num: 'Value', label: 'Stat label' }, { num: 'Value', label: 'Stat label' }, { num: 'Value', label: 'Stat label' }]; break;
    case 'rmStats': h.stats = null; break;
    case 'addSearch': h.search = true; if (!h.search_placeholder) h.search_placeholder = 'Search this wiki…'; break;
    case 'rmSearch': h.search = false; break;
    // hero card (aside): spotlight XOR feature; the inactive variant is
    // stashed so switching back keeps your edits
    case 'addAside':
    case 'switchAside':
      if (s) stash.spotlight = s;
      if (f) stash.feature = f;
      if (arg === 'feature') { h.feature = stash.feature || BLANK_FEATURE(); h.spotlight = null; }
      else { h.spotlight = stash.spotlight || BLANK_CARD(); h.feature = null; }
      break;
    case 'rmAside':
      if (s) stash.spotlight = s;
      if (f) stash.feature = f;
      h.spotlight = null; h.feature = null;
      break;
    case 'spAddEyebrow': if (s) s.eyebrow = 'Spotlight'; break;
    case 'spRmEyebrow': if (s) s.eyebrow = null; break;
    case 'spAddDesc': if (s) s.desc = 'Write a short description.'; break;
    case 'spRmDesc': if (s) s.desc = null; break;
    case 'spAddTag': if (s) s.tags.push('Tag'); break;
    case 'spRmTag': if (s) s.tags.splice(Number(arg), 1); break;
    // CTA is REQUIRED on the Call-to-Action card (no add/remove — always present)
    case 'ftAddHeadRight': if (f) f.head_right = 'Label'; break;
    case 'ftRmHeadRight': if (f) f.head_right = null; break;
    case 'ftAddDesc': if (f) f.desc = 'Write a short description.'; break;
    case 'ftRmDesc': if (f) f.desc = null; break;
    // Feature card chips are FIXED at the grammar count (no add/remove)
    // overview
    case 'setTone': ov.tone = arg; break;
    case 'addPara': ov.paragraphs.push('Write another paragraph here…'); break;
    case 'rmPara': ov.paragraphs.splice(Number(arg), 1); break;
    case 'addInfobox': ov.infobox = { label: 'Infobox', title: 'Infobox title', sublabel: null, rows: [['Label', 'Value'], ['Label', 'Value']], badge: null }; break;
    case 'rmInfobox': ov.infobox = null; break;
    case 'addSublabel': if (ov.infobox) ov.infobox.sublabel = 'Sub-label'; break;
    case 'rmSublabel': if (ov.infobox) ov.infobox.sublabel = null; break;
    case 'addBadge': if (ov.infobox) ov.infobox.badge = 'Status badge'; break;
    case 'rmBadge': if (ov.infobox) ov.infobox.badge = null; break;
    case 'addRow': if (ov.infobox) ov.infobox.rows.push(['Label', 'Value']); break;
    case 'rmRow': if (ov.infobox) ov.infobox.rows.splice(Number(arg), 1); break;
  }
}
