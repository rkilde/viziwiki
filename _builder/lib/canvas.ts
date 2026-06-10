// Builds the editor canvas as a full HTML document for an iframe. It loads the
// CANONICAL stylesheets (copied from the repo by copy-canon.mjs) and emits the
// EXACT canonical markup (wiki-hero-*, wiki-overview-*, wiki-infobox-*), so the
// hero/stat-grid/overview render identically to the live site and track the
// master format. Editable text is contenteditable; +add / ×remove call back to
// the parent (React) via P()/A(). This is the single-source render — no pp-* copies.
import type { PageDoc, HeroDoc, OverviewDoc, InfoboxDoc } from './store';

const AFFORDANCE = `
  .ce{ outline:none; cursor:text; border-radius:3px; transition:background .1s, box-shadow .1s; }
  .ce:hover{ background:rgba(99,102,241,.10); }
  .ce:focus{ background:rgba(99,102,241,.14); box-shadow:0 0 0 2px rgba(99,102,241,.5); }
  .pe-add,.pe-rm{ font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; border-radius:5px; padding:3px 9px; margin-left:8px; vertical-align:middle; }
  .pe-add{ border:1px dashed rgba(120,120,140,.5); background:rgba(120,120,140,.06); color:rgba(90,90,110,.85); }
  .pe-add:hover{ border-color:#6366f1; color:#6366f1; }
  .pe-rm{ border:1px solid rgba(120,120,140,.35); background:rgba(255,255,255,.5); color:rgba(90,90,110,.7); }
  .pe-rm:hover{ border-color:#ef4444; color:#ef4444; }
  .pe-addline{ margin:12px 0; }
  .pe-wrap{ position:relative; }
`;

const BOOK = `<svg class="wiki-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`;

const add = (a: string, label: string) => `<div class="pe-addline"><button class="pe-add" onclick="A('${a}')">${label}</button></div>`;
const rm = (a: string) => `<button class="pe-rm" onclick="A('${a}')">×</button>`;
const ce = (path: string, html: string, cls = '') => `<span class="ce ${cls}" contenteditable="true" onblur="P('${path}',this)">${html}</span>`;

function heroHTML(h: HeroDoc): string {
  return `
  <section class="wiki-hero">
    <div class="wiki-hero-inner"><div class="wiki-hero-content">
      ${h.eyebrow != null
        ? `<div class="wiki-hero-eyebrow"><span class="wiki-hero-eyebrow-dot"></span> ${ce('hero.eyebrow', h.eyebrow)}${rm('rmEyebrow')}</div>`
        : add('addEyebrow', '+ eyebrow')}
      <h1 class="wiki-hero-title">${ce('hero.title', h.title)}<span class="wiki-hero-title-accent">.</span></h1>
      ${h.subtitle != null
        ? `<div class="wiki-hero-subtitle">${ce('hero.subtitle', h.subtitle)}${
            h.subtitle_meta != null
              ? `<span class="wiki-hero-subtitle-sep"> · </span><span class="wiki-hero-subtitle-meta">${ce('hero.subtitle_meta', h.subtitle_meta)}</span>${rm('rmMeta')}`
              : `<button class="pe-add" onclick="A('addMeta')">+ meta</button>`
          }${rm('rmSubtitle')}</div>`
        : add('addSubtitle', '+ subtitle')}
      ${h.desc != null
        ? `<div class="pe-wrap"><p class="wiki-hero-desc">${ce('hero.desc', h.desc)}</p>${rm('rmDesc')}</div>`
        : add('addDesc', '+ description')}
      ${h.stats
        ? `<div class="pe-wrap"><div class="wiki-hero-stats">${h.stats.map((s, i) =>
            `<div class="wiki-hero-stat"><div class="wiki-hero-stat-num">${ce(`hero.stats.${i}.num`, s.num)}</div><div class="wiki-hero-stat-label">${ce(`hero.stats.${i}.label`, s.label)}</div></div>`).join('')}</div>${rm('rmStats')}</div>`
        : add('addStats', '+ stats (1×4)')}
    </div></div>
  </section>`;
}

function infoboxHTML(ib: NonNullable<InfoboxDoc>): string {
  return `<aside class="wiki-infobox">
    <div class="wiki-infobox-header">
      <div class="wiki-infobox-label">${ce('overview.infobox.label', ib.label || 'Infobox')}</div>
      <div class="wiki-infobox-title">${ce('overview.infobox.title', ib.title)}</div>
    </div>
    <dl class="wiki-infobox-data">${ib.rows.map((r, i) =>
      `<dt>${ce(`overview.infobox.rows.${i}.0`, r[0])}</dt><dd>${ce(`overview.infobox.rows.${i}.1`, r[1])}${rm(`rmRow:${i}`)}</dd>`).join('')}</dl>
    <div class="pe-addline" style="padding:0 16px 12px"><button class="pe-add" onclick="A('addRow')">+ row</button>${rm('rmInfobox')}</div>
  </aside>`;
}

function ovHTML(ov: OverviewDoc): string {
  const ib = ov.infobox;
  return `
  <section class="wiki-section" data-section="overview" data-tone="${ov.tone || 'b'}">
    <div class="wiki-section-inner">
      <div class="wiki-overview${ib ? ' has-infobox' : ' no-infobox'}">
        <div class="wiki-overview-prose">
          <div class="wiki-section-eyebrow">${BOOK} Overview</div>
          <h2 class="wiki-section-title">${ce('overview.heading', ov.heading)}</h2>
          <div class="wiki-section-prose">
            ${ov.paragraphs.map((p, i) => `<div class="pe-wrap"><p>${ce(`overview.paragraphs.${i}`, p)}</p>${rm(`rmPara:${i}`)}</div>`).join('')}
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
<script>function P(p,el){try{window.parent.__peField(p,el.innerHTML)}catch(e){}}function A(a){try{window.parent.__peAction(a)}catch(e){}}</script>
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
    case 'addPara': ov.paragraphs.push('New paragraph.'); break;
    case 'rmPara': ov.paragraphs.splice(Number(arg), 1); break;
    case 'addInfobox': ov.infobox = { label: 'Infobox', title: 'Panel Title', sublabel: null, rows: [['Key', 'Value'], ['Key', 'Value']], badge: null }; break;
    case 'rmInfobox': ov.infobox = null; break;
    case 'addRow': if (ov.infobox) ov.infobox.rows.push(['Key', 'Value']); break;
    case 'rmRow': if (ov.infobox) ov.infobox.rows.splice(Number(arg), 1); break;
  }
}
