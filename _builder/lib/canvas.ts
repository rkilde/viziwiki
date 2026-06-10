// Builds the editor canvas as a full HTML document for an iframe. Loads the
// CANONICAL stylesheets (copied from the repo) and emits the EXACT canonical
// markup, so everything renders identically to the live site and tracks the
// master format. Covers every canonical hero + overview element & add-on.
// Editable text is contenteditable; +add/×remove call back via P()/A(). No pp-*.
import type { PageDoc, HeroDoc, OverviewDoc, InfoboxDoc, SpotlightDoc, FeatureDoc } from './store';
import { BLANK_CARD, BLANK_FEATURE } from './store';
import type { WikiSkin } from './wiki';

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

  /* overview prose: keep the canonical 20px inter-paragraph rhythm whether a
     paragraph is added via "+ paragraph" (a separate pe-removable block — the
     wrapper breaks the canon's "> p + p" adjacency, so restore it here) OR by
     pressing Enter inside a paragraph box (the browser inserts block children,
     which otherwise stack with no gap). Both paths now match each other + canon. */
  .wiki-section-prose .pe-removable{ margin-top:20px; }
  .wiki-section-prose .pe-removable:first-child{ margin-top:0; }
  .wiki-section-prose .pe-removable > p{ margin:0; }
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
     the infobox value cells (grid-sized), and the search bar */
  .wiki-infobox.pe-removable{ width:auto; overflow:visible; }
  .wiki-infobox-data > dd.pe-removable{ width:auto; }
  .wiki-hero-search.pe-removable{ width:auto; }
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
  .pe-removable:hover .pe-tag-rm{ opacity:1; }
  .pe-tag-rm:hover{ border-color:#ef4444; color:#ef4444; }

  .pe-add{ font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; border-radius:5px; padding:3px 9px;
    border:1px dashed rgba(120,120,140,.5); background:rgba(120,120,140,.06); color:rgba(90,90,110,.85); }
  .pe-add:hover{ border-color:#6366f1; color:#6366f1; }
  .pe-mini-add{ font-family:'JetBrains Mono',monospace; font-size:10px; cursor:pointer; border-radius:3px; padding:2px 7px;
    margin-left:6px; vertical-align:middle; border:1px dashed rgba(120,120,140,.5); background:transparent; color:rgba(90,90,110,.7); }
  .pe-mini-add:hover{ color:#6366f1; border-color:#6366f1; }
  .pe-addline{ margin:12px 0; }
  .pe-stats-wrap{ max-width:36rem; width:fit-content; }
  .wiki-hero-subtitle.pe-removable{ display:inline-flex; align-items:baseline; }
  .wiki-infobox-label.pe-removable{ width:fit-content; max-width:100%; }

  /* hero card (aside) controls + empty slot */
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

const BOOK = `<svg class="wiki-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`;

const x = (a: string) => `<button class="pe-remove" title="Remove" onclick="A('${a}')">×</button>`;
const lk = (tip: string) => `<span class="pe-lock" title="${tip}">${LOCK}</span>`;
const add = (a: string, label: string, style = '') => `<div class="pe-addline"${style ? ` style="${style}"` : ''}><button class="pe-add" onclick="A('${a}')">${label}</button></div>`;
const ce = (path: string, html: string | null) => `<span class="ce" contenteditable="true" onblur="P('${path}',this)">${html || ''}</span>`;

// ── hero card (aside) ── both treatments are "cards": the Call-to-Action card
// (spotlight, CTA required) and the Feature card (exactly 3 fixed chips).
const asideCtrls = (variant: string) => `<div class="pe-aside-ctrls">
  <button class="pe-chip ${variant === 'card' ? 'active' : ''}" onclick="A('switchAside:card')">Call to Action Card</button>
  <button class="pe-chip ${variant === 'feature' ? 'active' : ''}" onclick="A('switchAside:feature')">Feature Card</button>
  <button class="pe-chip" onclick="A('rmAside')">remove</button></div>`;

function spotlightHTML(c: SpotlightDoc): string {
  return `<aside class="wiki-hero-aside">${asideCtrls('card')}
    <div class="wiki-hero-spotlight">
      ${c.eyebrow != null ? `<div class="wiki-hero-spotlight-eyebrow pe-removable">${ce('hero.aside.card.eyebrow', c.eyebrow)}${x('spRmEyebrow')}</div>` : add('spAddEyebrow', '+ eyebrow')}
      <h3 class="wiki-hero-spotlight-title">${ce('hero.aside.card.title', c.title)}</h3>
      ${c.desc != null ? `<div class="pe-removable"><p class="wiki-hero-spotlight-desc">${ce('hero.aside.card.desc', c.desc)}</p>${x('spRmDesc')}</div>` : add('spAddDesc', '+ description')}
      <div class="wiki-hero-spotlight-tags">${c.tags.map((t, i) => `<span class="wiki-hero-spotlight-tag pe-removable">${ce(`hero.aside.card.tags.${i}`, t)}<button class="pe-tag-rm" onclick="A('spRmTag:${i}')">×</button></span>`).join('')}<button class="pe-mini-add" onclick="A('spAddTag')">+ tag</button></div>
      <button class="wiki-hero-spotlight-cta">${ce('hero.aside.card.cta', c.cta)}</button>
    </div></aside>`;
}

function featureHTML(f: FeatureDoc): string {
  return `<aside class="wiki-hero-aside">${asideCtrls('feature')}
    <div class="wiki-hero-feature">
      <div class="wiki-hero-feature-halftone"></div>
      <div class="wiki-hero-feature-body">
        <div class="wiki-hero-feature-head"><span>${ce('hero.aside.feature.headLeft', f.headLeft || '')}</span>${f.headRight != null ? `<span class="pe-removable" style="display:inline-block">${ce('hero.aside.feature.headRight', f.headRight)}<button class="pe-tag-rm" onclick="A('ftRmHeadRight')">×</button></span>` : `<button class="pe-mini-add" onclick="A('ftAddHeadRight')">+ right</button>`}</div>
        <div class="wiki-hero-feature-title">${ce('hero.aside.feature.title', f.title)}</div>
        ${f.desc != null ? `<div class="pe-removable"><p class="wiki-hero-feature-desc">${ce('hero.aside.feature.desc', f.desc)}</p>${x('ftRmDesc')}</div>` : add('ftAddDesc', '+ description')}
        <div class="wiki-hero-feature-stats">${f.chips.map((c, i) => `<div class="wiki-hero-feature-chip"><div class="wiki-hero-feature-chip-key">${ce(`hero.aside.feature.chips.${i}.key`, c.key)}</div><div class="wiki-hero-feature-chip-val">${ce(`hero.aside.feature.chips.${i}.val`, c.val)}</div></div>`).join('')}</div>
      </div>
    </div></aside>`;
}

function asideHTML(aside: HeroDoc['aside']): string {
  if (!aside) {
    return `<aside class="wiki-hero-aside"><div class="pe-aside-empty">
      <div class="pe-aside-empty-label">Hero card · optional</div>
      <div class="pe-add-row"><button class="pe-add" onclick="A('addAside:card')">+ Call to Action Card</button><button class="pe-add" onclick="A('addAside:feature')">+ Feature Card</button></div>
    </div></aside>`;
  }
  return aside.variant === 'card' ? spotlightHTML(aside.card) : featureHTML(aside.feature);
}

// HOME-ONLY canon: the search bar exists only on wiki home heroes. On every
// other page type it isn't even offered (no add button).
function searchHTML(h: HeroDoc, isHome: boolean): string {
  if (!isHome) return '';
  if (!h.search) return add('addSearch', '+ search bar');
  return `<div class="wiki-hero-search pe-removable"><span class="wiki-hero-search-icon">${SEARCH_ICON}</span><span class="wiki-hero-search-input ce" contenteditable="true" onblur="P('hero.search_placeholder',this)">${h.search_placeholder || 'Search this wiki…'}</span>${x('rmSearch')}</div>`;
}

function heroHTML(h: HeroDoc, isHome: boolean): string {
  return `
  <section class="wiki-hero">
    <div class="wiki-hero-inner">
      <div class="wiki-hero-content">
        ${h.eyebrow != null
          ? `<div class="wiki-hero-eyebrow pe-removable"><span class="wiki-hero-eyebrow-dot"></span> ${ce('hero.eyebrow', h.eyebrow)}${x('rmEyebrow')}</div>`
          : add('addEyebrow', '+ eyebrow')}
        <h1 class="wiki-hero-title">${ce('hero.title', h.title)}<span class="wiki-hero-title-accent">.</span></h1>
        ${h.subtitle != null
          ? `<div class="wiki-hero-subtitle pe-removable">${ce('hero.subtitle', h.subtitle)}${
              h.subtitle_meta != null
                ? `<span class="wiki-hero-subtitle-sep"> · </span><span class="wiki-hero-subtitle-meta">${ce('hero.subtitle_meta', h.subtitle_meta)}</span><button class="pe-tag-rm" title="Remove meta" onclick="A('rmMeta')">×</button>`
                : `<button class="pe-mini-add" onclick="A('addMeta')">+ meta</button>`
            }${x('rmSubtitle')}</div>`
          : add('addSubtitle', '+ subtitle')}
        ${h.desc != null
          ? `<div class="pe-removable" style="max-width:36rem;width:fit-content"><p class="wiki-hero-desc">${ce('hero.desc', h.desc)}</p>${x('rmDesc')}</div>`
          : add('addDesc', '+ description')}
        ${searchHTML(h, isHome)}
        ${h.stats
          ? `<div class="pe-removable pe-stats-wrap"><div class="wiki-hero-stats">${h.stats.map((s, i) =>
              `<div class="wiki-hero-stat"><div class="wiki-hero-stat-num">${ce(`hero.stats.${i}.num`, s.num)}</div><div class="wiki-hero-stat-label">${ce(`hero.stats.${i}.label`, s.label)}</div></div>`).join('')}</div>${x('rmStats')}</div>`
          : add('addStats', '+ stats (1×4)')}
      </div>
      ${asideHTML(h.aside)}
    </div>
  </section>`;
}

function infoboxHTML(ib: NonNullable<InfoboxDoc>): string {
  return `<aside class="wiki-infobox pe-removable">${x('rmInfobox')}
    <div class="wiki-infobox-header">
      <div class="wiki-infobox-label">${ce('overview.infobox.label', ib.label || 'Infobox')}</div>
      <div class="wiki-infobox-title">${ce('overview.infobox.title', ib.title)}</div>
      ${ib.sublabel != null
        ? `<div class="wiki-infobox-label pe-removable" style="margin-top:4px">${ce('overview.infobox.sublabel', ib.sublabel)}${x('rmSublabel')}</div>`
        : `<div class="pe-addline" style="margin:6px 0 0"><button class="pe-add" onclick="A('addSublabel')">+ sublabel</button></div>`}
    </div>
    <dl class="wiki-infobox-data">${ib.rows.map((r, i) =>
      `<dt>${ce(`overview.infobox.rows.${i}.0`, r[0])}</dt><dd class="pe-removable">${ce(`overview.infobox.rows.${i}.1`, r[1])}${x(`rmRow:${i}`)}</dd>`).join('')}</dl>
    <div class="pe-addline" style="padding:8px 16px"><button class="pe-add" onclick="A('addRow')">+ row</button></div>
    ${ib.badge != null
      ? `<span class="wiki-infobox-badge pe-removable">${ce('overview.infobox.badge', ib.badge)}${x('rmBadge')}</span>`
      : add('addBadge', '+ badge', 'padding:0 16px 14px')}
  </aside>`;
}

// empty infobox slot — a .wiki-infobox so the overview's :has() grid still puts
// it in the RIGHT column (where the real infobox would render), mirroring the
// hero aside's empty "+ card / + feature" slot. The +button lives where the
// element will actually appear, not at the bottom of the section.
function infoboxEmpty(): string {
  return `<aside class="wiki-infobox pe-empty"><div class="pe-aside-empty">
    <div class="pe-aside-empty-label">Infobox · optional</div>
    <div class="pe-add-row"><button class="pe-add" onclick="A('addInfobox')">+ infobox</button></div>
  </div></aside>`;
}

function ovHTML(ov: OverviewDoc): string {
  const ib = ov.infobox;
  const tone = ov.tone || 'b';
  const toneBar = `<div class="pe-sec-tools">tone ${['a', 'b', 'special'].map((t) => `<button class="pe-tonebtn${tone === t ? ' on' : ''}" onclick="A('setTone:${t}')">${t}</button>`).join('')}</div>`;
  return `
  <section class="wiki-section pe-sec" data-section="overview" data-tone="${tone}">
    ${toneBar}
    <div class="wiki-section-inner">
      <div class="wiki-overview">
        <div class="wiki-overview-prose">
          <div class="wiki-section-eyebrow pe-canon">${BOOK} Overview${lk('Locked — the canonical section label, can’t be edited or removed')}</div>
          <h2 class="wiki-section-title">${ce('overview.heading', ov.heading)}</h2>
          <div class="wiki-section-prose">
            ${ov.paragraphs.map((p, i) => `<div class="pe-removable"><p>${ce(`overview.paragraphs.${i}`, p)}</p>${x(`rmPara:${i}`)}</div>`).join('')}
            ${add('addPara', '+ paragraph')}
          </div>
        </div>
        ${ib ? infoboxHTML(ib) : infoboxEmpty()}
      </div>
    </div>
  </section>`;
}

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export function buildBody(doc: PageDoc, isHome = false): string {
  return `${heroHTML(doc.hero, isHome)}${ovHTML(doc.overview)}`;
}

export function buildCanvas(doc: PageDoc, skin: WikiSkin = TACO_BELL_SKIN, isHome = false): string {
  const skinLinks = skin.css.map((f) => `<link rel="stylesheet" href="/canon/${f}">`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${FONTS}
<link rel="stylesheet" href="/canon/wiki-typography.css">
<link rel="stylesheet" href="/canon/wiki-universals.css">
${skinLinks}
<style>${AFFORDANCE}</style>
<script>
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
// Enter inside a paragraph box → a block element (div), not a bare <br>, so the
// new paragraph picks up the canonical inter-paragraph spacing (CSS above).
try{document.execCommand('defaultParagraphSeparator',false,'div')}catch(e){}
window.addEventListener('load',function(){H();tagDark();try{new ResizeObserver(H).observe(document.body)}catch(e){}try{new MutationObserver(function(){requestAnimationFrame(tagDark)}).observe(document.body,{childList:true,subtree:true})}catch(e){}});
</script>
</head>
<body class="${skin.bodyClass}" style="overflow-x:hidden">${buildBody(doc, isHome)}</body></html>`;
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
  const a = h.aside;
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
    // hero card (aside)
    case 'addAside': h.aside = { variant: arg === 'feature' ? 'feature' : 'card', card: BLANK_CARD(), feature: BLANK_FEATURE() }; break;
    case 'switchAside': if (a) a.variant = arg as 'card' | 'feature'; break;
    case 'rmAside': h.aside = null; break;
    case 'spAddEyebrow': if (a) a.card.eyebrow = 'Spotlight'; break;
    case 'spRmEyebrow': if (a) a.card.eyebrow = null; break;
    case 'spAddDesc': if (a) a.card.desc = 'Write a short description.'; break;
    case 'spRmDesc': if (a) a.card.desc = null; break;
    case 'spAddTag': if (a) a.card.tags.push('Tag'); break;
    case 'spRmTag': if (a) a.card.tags.splice(Number(arg), 1); break;
    // CTA is REQUIRED on the Call-to-Action card (no add/remove — always present)
    case 'ftAddHeadRight': if (a) a.feature.headRight = 'Label'; break;
    case 'ftRmHeadRight': if (a) a.feature.headRight = null; break;
    case 'ftAddDesc': if (a) a.feature.desc = 'Write a short description.'; break;
    case 'ftRmDesc': if (a) a.feature.desc = null; break;
    // Feature card chips are FIXED at exactly 3 (no add/remove)
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
