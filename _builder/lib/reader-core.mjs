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
${''}</style>
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
