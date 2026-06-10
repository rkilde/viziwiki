// Builds the editor canvas as a full HTML document for an iframe. Loads the
// CANONICAL stylesheets (copied from the repo) and emits the EXACT canonical
// markup, so everything renders identically to the live site and tracks the
// master format. Editable text is contenteditable; delete/add affordances match
// the prototype: a corner × revealed only on hover of its own element (deletable),
// or a corner padlock (canon/locked, inert). No pp-* copies.
import type { PageDoc, HeroDoc, OverviewDoc, InfoboxDoc } from './store';

const AFFORDANCE = `
  .ce{ outline:none; cursor:text; border-radius:3px; transition:background .1s, box-shadow .1s; }
  .ce:hover{ background:rgba(99,102,241,.10); }
  .ce:focus{ background:rgba(99,102,241,.14); box-shadow:0 0 0 2px rgba(99,102,241,.5); }

  /* corner controls — hidden until you hover the element they belong to */
  .pe-removable,.pe-locked{ position:relative; }
  .pe-remove,.pe-lock{ position:absolute; top:-9px; right:-9px; width:18px; height:18px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; line-height:1; opacity:0; transition:opacity .12s; z-index:4; }
  .pe-remove{ border:1px solid rgba(0,0,0,.18); background:#fff; color:rgba(0,0,0,.45); font-size:12px; cursor:pointer; }
  .pe-removable:hover > .pe-remove{ opacity:1; }          /* direct child only → scoped to its own element */
  .pe-remove:hover{ border-color:#ef4444; color:#ef4444; }
  .pe-lock{ border:1px solid rgba(0,0,0,.12); background:#fff; color:rgba(0,0,0,.34); cursor:default; }
  .pe-locked:hover > .pe-lock{ opacity:.9; }
  .pe-lock svg{ width:10px; height:10px; }

  /* small inline × for the subtitle's meta */
  .pe-tag-rm{ display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:50%;
    margin-left:6px; vertical-align:middle; border:1px solid rgba(0,0,0,.18); background:#fff; color:rgba(0,0,0,.5);
    font-size:9px; line-height:1; cursor:pointer; opacity:0; transition:opacity .12s; }
  .pe-removable:hover .pe-tag-rm{ opacity:1; }
  .pe-tag-rm:hover{ border-color:#ef4444; color:#ef4444; }

  /* add affordances (unchanged) */
  .pe-add{ font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; border-radius:5px; padding:3px 9px;
    border:1px dashed rgba(120,120,140,.5); background:rgba(120,120,140,.06); color:rgba(90,90,110,.85); }
  .pe-add:hover{ border-color:#6366f1; color:#6366f1; }
  .pe-mini-add{ font-family:'JetBrains Mono',monospace; font-size:10px; cursor:pointer; border-radius:3px; padding:2px 7px;
    margin-left:6px; vertical-align:middle; border:1px dashed rgba(120,120,140,.5); background:transparent; color:rgba(90,90,110,.7); }
  .pe-mini-add:hover{ color:#6366f1; border-color:#6366f1; }
  .pe-addline{ margin:12px 0; }
  /* the corner × / padlock hugs the field's CONTENT box (like the eyebrow),
     not the full-width block — so it lands at the text's top-right, not the page edge */
  .pe-stats-wrap{ max-width:36rem; width:fit-content; }
  .wiki-hero-subtitle.pe-removable{ display:inline-flex; align-items:baseline; }
  .wiki-hero-title.pe-locked, .wiki-section-title.pe-locked,
  .wiki-infobox-title.pe-locked, .wiki-infobox-label.pe-locked,
  .wiki-infobox-label.pe-removable{ width:fit-content; max-width:100%; }

  .pe-toolbar{ font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:rgba(90,90,110,.7); margin-bottom:16px; display:inline-flex; align-items:center; gap:6px; }
  .pe-tonebtn{ font:inherit; cursor:pointer; border:1px solid rgba(120,120,140,.35); background:#fff; border-radius:5px; padding:3px 9px; color:rgba(90,90,110,.85); text-transform:lowercase; }
  .pe-tonebtn.on{ background:#6366f1; border-color:#6366f1; color:#fff; }
`;

const BOOK = `<svg class="wiki-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`;
const LOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

// corner × (delete) — place as a DIRECT child of a .pe-removable element
const x = (a: string) => `<button class="pe-remove" title="Remove" onclick="A('${a}')">×</button>`;
// corner padlock (canon, can't delete) — place as a direct child of a .pe-locked element
const lk = (tip: string) => `<span class="pe-lock" title="${tip}">${LOCK}</span>`;
const add = (a: string, label: string, style = '') => `<div class="pe-addline"${style ? ` style="${style}"` : ''}><button class="pe-add" onclick="A('${a}')">${label}</button></div>`;
const ce = (path: string, html: string) => `<span class="ce" contenteditable="true" onblur="P('${path}',this)">${html}</span>`;

function heroHTML(h: HeroDoc): string {
  return `
  <section class="wiki-hero">
    <div class="wiki-hero-inner"><div class="wiki-hero-content">
      ${h.eyebrow != null
        ? `<div class="wiki-hero-eyebrow pe-removable"><span class="wiki-hero-eyebrow-dot"></span> ${ce('hero.eyebrow', h.eyebrow)}${x('rmEyebrow')}</div>`
        : add('addEyebrow', '+ eyebrow')}
      <h1 class="wiki-hero-title pe-locked">${ce('hero.title', h.title)}<span class="wiki-hero-title-accent">.</span>${lk('Required — every page has a title')}</h1>
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
      ${h.stats
        ? `<div class="pe-removable pe-stats-wrap"><div class="wiki-hero-stats">${h.stats.map((s, i) =>
            `<div class="wiki-hero-stat"><div class="wiki-hero-stat-num">${ce(`hero.stats.${i}.num`, s.num)}</div><div class="wiki-hero-stat-label">${ce(`hero.stats.${i}.label`, s.label)}</div></div>`).join('')}</div>${x('rmStats')}</div>`
        : add('addStats', '+ stats (1×4)')}
    </div></div>
  </section>`;
}

function infoboxHTML(ib: NonNullable<InfoboxDoc>): string {
  return `<aside class="wiki-infobox pe-removable">${x('rmInfobox')}
    <div class="wiki-infobox-header">
      <div class="wiki-infobox-label pe-locked">${ce('overview.infobox.label', ib.label || 'Infobox')}${lk('Canon — the infobox label')}</div>
      <div class="wiki-infobox-title pe-locked">${ce('overview.infobox.title', ib.title)}${lk('Required — the infobox needs a title')}</div>
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

function ovHTML(ov: OverviewDoc): string {
  const ib = ov.infobox;
  const tone = ov.tone || 'b';
  const toneBar = `<div class="pe-toolbar">tone ${['a', 'b', 'special'].map((t) => `<button class="pe-tonebtn${tone === t ? ' on' : ''}" onclick="A('setTone:${t}')">${t}</button>`).join('')}</div>`;
  return `
  <section class="wiki-section" data-section="overview" data-tone="${tone}">
    <div class="wiki-section-inner">
      ${toneBar}
      <div class="wiki-overview${ib ? ' has-infobox' : ' no-infobox'}">
        <div class="wiki-overview-prose">
          <div class="wiki-section-eyebrow">${BOOK} Overview</div>
          <h2 class="wiki-section-title pe-locked">${ce('overview.heading', ov.heading)}${lk('Required — every page has an overview heading')}</h2>
          <div class="wiki-section-prose">
            ${ov.paragraphs.map((p, i) => `<div class="pe-removable"><p>${ce(`overview.paragraphs.${i}`, p)}</p>${x(`rmPara:${i}`)}</div>`).join('')}
            ${add('addPara', '+ paragraph')}
          </div>
        </div>
        ${ib ? infoboxHTML(ib) : ''}
      </div>
      ${!ib ? add('addInfobox', '+ infobox') : ''}
    </div>
  </section>`;
}

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export function buildCanvas(doc: PageDoc): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>${FONTS}
<link rel="stylesheet" href="/canon/wiki-typography.css">
<link rel="stylesheet" href="/canon/wiki-universals.css">
<link rel="stylesheet" href="/canon/tb-editorial-base.css">
<link rel="stylesheet" href="/canon/wiki-taco-bell-skin.css">
<style>${AFFORDANCE}</style>
<script>
function P(p,el){try{window.parent.__peField(p,el.innerHTML)}catch(e){}}
function A(a){try{window.parent.__peAction(a)}catch(e){}}
function H(){try{window.parent.__peResize(document.documentElement.scrollHeight)}catch(e){}}
window.addEventListener('load',function(){H();try{new ResizeObserver(H).observe(document.body)}catch(e){}});
</script>
</head>
<body class="wiki-page wiki-taco-bell" style="overflow-x:hidden">
${heroHTML(doc.hero)}
${ovHTML(doc.overview)}
</body></html>`;
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
  const [name, arg] = action.split(':');
  switch (name) {
    case 'addEyebrow': h.eyebrow = 'Category'; break;
    case 'rmEyebrow': h.eyebrow = null; break;
    case 'addSubtitle': h.subtitle = 'Subtitle'; break;
    case 'rmSubtitle': h.subtitle = null; h.subtitle_meta = null; break;
    case 'addMeta': h.subtitle_meta = 'Model'; break;
    case 'rmMeta': h.subtitle_meta = null; break;
    case 'addDesc': h.desc = 'Write a short lead sentence.'; break;
    case 'rmDesc': h.desc = null; break;
    case 'addStats': h.stats = [{ num: '1', label: 'Stat' }, { num: '2', label: 'Stat' }, { num: '3', label: 'Stat' }, { num: '4', label: 'Stat' }]; break;
    case 'rmStats': h.stats = null; break;
    case 'setTone': ov.tone = arg; break;
    case 'addPara': ov.paragraphs.push('New paragraph.'); break;
    case 'rmPara': ov.paragraphs.splice(Number(arg), 1); break;
    case 'addInfobox': ov.infobox = { label: 'Infobox', title: 'Panel Title', sublabel: null, rows: [['Key', 'Value'], ['Key', 'Value']], badge: null }; break;
    case 'rmInfobox': ov.infobox = null; break;
    case 'addSublabel': if (ov.infobox) ov.infobox.sublabel = 'Sub-label'; break;
    case 'rmSublabel': if (ov.infobox) ov.infobox.sublabel = null; break;
    case 'addBadge': if (ov.infobox) ov.infobox.badge = 'Badge'; break;
    case 'rmBadge': if (ov.infobox) ov.infobox.badge = null; break;
    case 'addRow': if (ov.infobox) ov.infobox.rows.push(['Key', 'Value']); break;
    case 'rmRow': if (ov.infobox) ov.infobox.rows.splice(Number(arg), 1); break;
  }
}
