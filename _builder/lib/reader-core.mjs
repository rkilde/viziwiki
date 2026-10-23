// reader-core.mjs — the PURE parts of the READER surface (the Wikipedia/
// Fandom publishing model, decided Oct 2026: content lives in the database,
// pages render from it through the SAME derived renderer the builder uses,
// and rendered copies are cached at the edge — "cache until edited").
// Plain .mjs so the Next routes AND the guard suite share it (case 18).

// A reader page must show no builder plumbing: absent optional fields render
// as sentinel tokens (the decorator's "+"-slot protocol) — strip every
// sentinel-bearing text so readers see clean canon output.
export function stripSentinels(html, sentPrefix) {
  if (!sentPrefix) return html;
  const re = new RegExp(sentPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[A-Za-z0-9_.:]+?__', 'g');
  return html.replace(re, '');
}

/** Render a stored PageDoc for READERS: canon interaction scripts KEPT
 *  (lightboxes, modals — exactly like the Jekyll site), sentinels stripped. */
export function renderReaderBody(renderer, sentPrefix, doc, isHome) {
  return stripSentinels(renderer.renderBody(doc, isHome, { keepScripts: true }), sentPrefix);
}

/** The reader document shell: the SAME canon stack the live site loads
 *  (typography → universals → home (home pages) → the bank layer → skin),
 *  served from /canon (copy-canon keeps those files current). The skin file
 *  is derived from the wiki id by the canon naming convention
 *  (wiki-<id>-skin.css), falling back to the base skin. */
export function readerShell({ title, wikiId, bodyClass, isHome, bankCss, bodyHtml, nav }) {
  const skinFile = `wiki-${wikiId}-skin.css`;
  const links = [
    '<link rel="stylesheet" href="/canon/wiki-typography.css">',
    '<link rel="stylesheet" href="/canon/wiki-universals.css">',
    ...(isHome ? ['<link rel="stylesheet" href="/canon/wiki-home.css">'] : []),
    ...(bankCss || []).map((f) => `<link rel="stylesheet" href="/canon/${f}">`),
    `<link rel="stylesheet" href="/canon/${skinFile}" onerror="this.remove()">`,
  ].join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,100..900,0..100,0;1,9..144,100..900,0..100,0&family=JetBrains+Mono:wght@400;500;600&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
${links}
<style>html,body{margin:0;padding:0}
.reader-nav{position:sticky;top:0;z-index:50;display:flex;gap:14px;align-items:center;padding:10px 20px;background:rgba(12,10,16,.92);backdrop-filter:blur(6px);border-bottom:1px solid rgba(255,255,255,.08);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.reader-nav a{color:rgba(255,255,255,.75);text-decoration:none}
.reader-nav a:hover{color:#fff}
.reader-nav .rn-badge{margin-left:auto;color:rgba(255,255,255,.35)}</style>
</head>
<body class="${escapeHtml(bodyClass || 'wiki-page')}">
${nav || ''}
${bodyHtml}
</body>
</html>`;
}

/** The tile-cover styles — ONE source for every surface that paints covers
 *  (the reader index interpolates it; the origination modal's live preview
 *  injects it, so the preview IS the reader's render, never a restatement). */
export const COVER_CSS = `
.rd-covers{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
@media (max-width:560px){.rd-covers{grid-template-columns:repeat(2,1fr);gap:10px}}
.rd-cover{position:relative;overflow:hidden;display:block;aspect-ratio:3/4;border-radius:14px;padding:13px;text-decoration:none;color:#fff;box-shadow:0 10px 26px -14px rgba(26,23,20,.4);transition:transform .2s}
.rd-cover:hover{transform:translateY(-4px)}
.rd-cover-glyph{position:absolute;right:-12px;bottom:-10px;width:120px;height:120px;opacity:.16;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.rd-cover-genre{position:absolute;top:12px;left:13px;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.82)}
.rd-cover-soon{position:absolute;top:12px;right:13px;font-family:'JetBrains Mono',monospace;font-size:7px;text-transform:uppercase;letter-spacing:.12em;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.35);border-radius:100px;padding:2px 7px}
.rd-cover-foot{position:absolute;left:13px;right:13px;bottom:13px;display:block}
.rd-cover-title{display:block;font-family:'Fraunces',Georgia,serif;font-weight:700;font-size:21px;line-height:1.02;letter-spacing:-.02em}
.rd-cover-tag{display:block;font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-top:6px;opacity:.85}
`;

/** One wiki's TILE COVER on the reader index (the origination arc) — the
 *  data-driven "themed" treatment: gradient + glyph DERIVED from the wiki's
 *  first category in the canon taxonomy (_data/wiki_categories.yml →
 *  data/wiki-categories.json), genre label + title + tagline over it.
 *  NOTE: the 5 flagship "bespoke" covers (tile_cover.kind === 'bespoke') are
 *  hand-built art living in browse.html — not canon CSS yet (the design-system
 *  arc canonizes them). Until then the reader renders EVERY wiki themed; the
 *  stored `cls` reference stays ready for that arc. */
export function wikiCoverTile(w, taxonomy) {
  const cats = Array.isArray(w.categories) ? w.categories : [];
  const cat = ((taxonomy && taxonomy.categories) || []).find((c) => c.key === cats[0]) || null;
  const pal = (taxonomy && taxonomy.palette) || {};
  // a gradient stop is a palette NAME (canon categories) or a literal color
  // value (originated categories store resolved colors)
  const stop = (nameOrValue, fb) => (nameOrValue && (pal[nameOrValue] || nameOrValue)) || fb;
  const from = stop(cat && cat.grad.from, '#2a2630');
  const to = stop(cat && cat.grad.to, '#4a4454');
  const cover = w.tile_cover || {};
  // tile ART is per-wiki CONTENT (the master media pattern — a URL today, a
  // Supabase Storage upload later): kind 'art' paints the uploaded image with
  // a legibility scrim; 'themed' (and, until canonized, 'bespoke') paints the
  // category gradient + glyph.
  const art = cover.kind === 'art' && cover.src
    ? `background-image:linear-gradient(to top,rgba(10,8,12,.78) 0%,rgba(10,8,12,.12) 45%,rgba(10,8,12,.18) 100%),url('${escapeHtml(cover.src)}');background-size:cover;background-position:center`
    : `background-image:linear-gradient(to bottom right,${from},${to})`;
  const glyph = cover.kind === 'art' ? null : (cover.glyph || (cat && cat.icon) || null);
  // a category icon beyond the canon sprite carries its vector body
  // (attachIconBodies) — rendered inline; sprite icons stay <use> refs
  const glyphSvg = cover.kind === 'art' ? null : (!cover.glyph && cat && cat.iconSvg) || null;
  const tag = w.tagline || w.blurb || '';
  // the genre corner lists EVERY tag the wiki wears; the blurb is the tooltip
  const genre = cats
    .map((k) => { const c = ((taxonomy && taxonomy.categories) || []).find((x) => x.key === k); return c ? c.label : null; })
    .filter(Boolean).join(' · ') || 'Wiki';
  const tip = w.blurb ? ` title="${escapeHtml(w.blurb)}"` : '';
  return `<a class="rd-cover" href="/read/${encodeURIComponent(w.id)}" style="${art}"${tip}>` +
    (glyphSvg ? `<svg class="rd-cover-glyph" viewBox="0 0 24 24" aria-hidden="true">${glyphSvg}</svg>`
      : glyph ? `<svg class="rd-cover-glyph" aria-hidden="true"><use href="#ic-${escapeHtml(glyph)}"></use></svg>` : '') +
    `<span class="rd-cover-genre">${escapeHtml(genre)}</span>` +
    (w.status === 'coming_soon' ? `<span class="rd-cover-soon">Coming soon</span>` : '') +
    `<span class="rd-cover-foot"><span class="rd-cover-title">${escapeHtml(w.name)}</span>` +
    (tag ? `<span class="rd-cover-tag">${escapeHtml(tag)}</span>` : '') +
    `</span></a>`;
}

/** A minimal reader index document (wiki / page listings). */
export function readerIndexShell(title, nav, itemsHtml) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500&family=Spectral:wght@400;500&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0}
body{font-family:'Spectral',Georgia,serif;background:#f6f4ee;color:#1a1714;min-height:100vh}
.rd-wrap{max-width:720px;margin:0 auto;padding:48px 24px}
.rd-eyebrow{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.24em;text-transform:uppercase;color:#6b655c;margin-bottom:10px}
h1{font-family:'Fraunces',Georgia,serif;font-size:34px;font-weight:700;letter-spacing:-.02em;margin:0 0 24px}
.rd-list{display:flex;flex-direction:column;gap:8px;list-style:none;padding:0;margin:0}
.rd-list a{display:flex;align-items:baseline;gap:10px;padding:14px 16px;background:#fff;border:1px solid rgba(26,23,20,.12);border-radius:10px;text-decoration:none;color:inherit}
.rd-list a:hover{border-color:rgba(26,23,20,.3)}
.rd-name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:17px}
.rd-meta{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#6b655c;margin-left:auto}
.rd-empty{font-family:'JetBrains Mono',monospace;font-size:11px;color:#6b655c;line-height:1.8}
${COVER_CSS}</style>
</head>
<body>
${nav || ''}
<div class="rd-wrap">${itemsHtml}</div>
</body>
</html>`;
}

export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
