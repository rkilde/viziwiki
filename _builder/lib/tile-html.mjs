// tile-html.mjs — PURE pipeline for UPLOADED TILE-ART FILES (the owner's
// "html file for the art"): a designer hands in a self-contained demo page
// (like the Renaissance "Vitruvian" tile) and this extracts exactly what the
// platform stores — the art's skin CLASS, its skin-scoped CSS, and the
// decorative INNER markup — leaving behind everything the canon already owns
// (the cover-base CSS, fonts, page scaffolding) and everything identity owns
// (the genre/vol/title/tagline text slots, which render from the database).
// Stored as tile_cover = { kind:'html', cls, css, inner }. Re-sanitized at
// SERVE time too (/api/directory, /read) — defense in depth; stored markup
// must be inert even if a client bypassed this parser.

const CAP_BYTES = 80 * 1024;   // css + inner ceiling

const strip = (s, re) => String(s).replace(re, '');

/** Sanitize a fragment of markup: no scripts, no handlers, no external refs. */
export function sanitizeTileMarkup(html) {
  let s = String(html || '');
  s = strip(s, /<script[\s\S]*?<\/script\s*>/gi); s = strip(s, /<script[^>]*\/?>/gi);
  s = strip(s, /<foreignObject[\s\S]*?<\/foreignObject\s*>/gi);
  s = strip(s, /<iframe[\s\S]*?(<\/iframe\s*>|\/>)/gi);
  s = strip(s, /<(embed|object|base|link|meta)[^>]*\/?>/gi);
  s = strip(s, /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi);
  s = strip(s, /\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi);   // keep #local refs
  s = s.replace(/javascript:/gi, '');
  if (/<script|<iframe|onload\s*=|onclick\s*=/i.test(s)) throw new Error('markup sanitization failed');
  return s;
}

/** Sanitize skin CSS: no imports, no external url()s (local #refs stay). */
export function sanitizeTileCss(css) {
  let s = String(css || '');
  s = strip(s, /@import[^;]*;/gi);
  s = s.replace(/expression\s*\(/gi, 'blocked(');
  s = s.replace(/url\(\s*(['"]?)(?!['"]?#)/gi, 'url($1#blocked-');   // external url() → dead local ref
  s = s.replace(/javascript:/gi, '');
  return s;
}

/** Remove the identity text slots (c-genre / c-vol / c-foot / c-soon) with
 *  BALANCED same-tag depth counting — a slot like c-foot holds nested divs
 *  (c-title, c-blurb), so a non-greedy regex would cut at the first inner
 *  close and leave an orphan + a stray closer that breaks the page's DOM
 *  (the Renaissance upload hit exactly this). */
export function removeIdentitySlots(html) {
  let s = String(html || '');
  // c-title / c-blurb normally live inside c-foot, but stand-alone orphans
  // (left by the pre-fix parser) must go too
  for (const slot of ['c-genre', 'c-vol', 'c-foot', 'c-soon', 'c-title', 'c-blurb']) {
    const openRe = new RegExp(`<([a-z0-9]+)\\b[^>]*class\\s*=\\s*"[^"]*\\b${slot}\\b[^"]*"[^>]*>`, 'i');
    let m;
    while ((m = s.match(openRe))) {
      const tag = m[1].toLowerCase();
      const start = m.index;
      const walker = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}\\s*>`, 'gi');
      walker.lastIndex = start + m[0].length;
      let depth = 1, end = s.length, w;
      while ((w = walker.exec(s))) {
        if (w[0][1] === '/') depth--; else if (!/\/>$/.test(w[0])) depth++;
        if (depth === 0) { end = w.index + w[0].length; break; }
      }
      s = s.slice(0, start) + s.slice(end);
    }
  }
  return s;
}

/* split a stylesheet into top-level blocks: rules, @keyframes, @media */
function cssBlocks(css) {
  const out = [];
  let i = 0; const s = css;
  while (i < s.length) {
    const open = s.indexOf('{', i);
    if (open === -1) break;
    let depth = 1, j = open + 1;
    while (j < s.length && depth > 0) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
    out.push({ head: s.slice(i, open).trim(), body: s.slice(open + 1, j - 1), raw: s.slice(i, j) });
    i = j;
  }
  return out;
}

/** Parse an uploaded tile-art FILE. Returns { cls, css, inner } or throws
 *  with a human-readable reason. */
export function parseTileArt(fileHtml) {
  const src = String(fileHtml || '').replace(/<!--[\s\S]*?-->/g, '');

  // 1 · the art element: the first <a|div> carrying class "cover <skin>"
  const coverM = src.match(/<(a|div)\b[^>]*class\s*=\s*"([^"]*\bcover\b[^"]*)"[^>]*>/i);
  if (!coverM) throw new Error('no element with class "cover …" found — export the tile as <a class="cover c-your-skin">…</a>');
  const cls = (coverM[2].split(/\s+/).find((c) => c && c !== 'cover') || '').trim();
  if (!/^[a-z][a-z0-9-]*$/i.test(cls)) throw new Error('the cover element needs ONE custom skin class beside "cover" (e.g. class="cover c-ren-codex")');

  // the element's inner markup (match braces of the same tag)
  const tag = coverM[1];
  const startIdx = src.indexOf(coverM[0]) + coverM[0].length;
  const closeRe = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
  closeRe.lastIndex = startIdx;
  let depth = 1, endIdx = -1, m;
  while ((m = closeRe.exec(src))) {
    if (m[0][1] === '/') depth--; else depth++;
    if (depth === 0) { endIdx = m.index; break; }
  }
  if (endIdx === -1) throw new Error(`the <${tag} class="cover …"> element never closes`);
  let inner = src.slice(startIdx, endIdx);

  // 2 · drop the identity text slots — the DATABASE renders those
  inner = removeIdentitySlots(inner);
  inner = sanitizeTileMarkup(inner).trim();
  if (!inner) throw new Error('the cover element holds no decorative markup after removing the identity text slots');

  // 3 · the skin CSS: keep ONLY rules scoped to the skin class, plus the
  // @keyframes they use and @media blocks that contain skin rules. The
  // cover-base CSS, page scaffolding, :root etc. all stay behind — canon
  // already owns those on every surface.
  const allCss = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((x) => x[1]).join('\n');
  const marker = '.' + cls;
  const kept = [];
  const usedAnims = new Set();
  for (const b of cssBlocks(allCss)) {
    if (b.head.startsWith('@media')) {
      const innerKept = cssBlocks(b.body).filter((ib) => ib.head.includes(marker));
      if (innerKept.length) {
        kept.push(`${b.head}{${innerKept.map((ib) => ib.raw).join('')}}`);
        for (const ib of innerKept) for (const am of ib.body.matchAll(/animation(?:-name)?\s*:\s*([a-zA-Z0-9_-]+)/g)) usedAnims.add(am[1]);
      }
    } else if (b.head.includes(marker)) {
      kept.push(b.raw);
      for (const am of b.body.matchAll(/animation(?:-name)?\s*:\s*([a-zA-Z0-9_-]+)/g)) usedAnims.add(am[1]);
    }
  }
  for (const b of cssBlocks(allCss)) {
    const km = b.head.match(/^@keyframes\s+([a-zA-Z0-9_-]+)/);
    if (km && usedAnims.has(km[1])) kept.push(b.raw);
  }
  if (!kept.length) throw new Error(`no CSS rules scoped to .${cls} found — the art's styles must all live under its skin class`);
  const css = sanitizeTileCss(kept.join('\n')).trim();

  const bytes = css.length + inner.length;
  if (bytes > CAP_BYTES) throw new Error(`the art weighs ${(bytes / 1024).toFixed(0)}KB — keep skin CSS + markup under ${CAP_BYTES / 1024}KB`);
  return { cls, css, inner };
}

/** Re-sanitize a stored html tile cover at SERVE time. Returns the cover,
 *  or null when it can't be made safe (caller degrades to themed). */
export function safeHtmlCover(cover) {
  try {
    if (!cover || cover.kind !== 'html' || !cover.cls || !cover.inner) return null;
    if (!/^[a-z][a-z0-9-]*$/i.test(cover.cls)) return null;
    // re-run the slot strip too — SELF-HEALS covers stored by the earlier
    // parser (orphaned slot fragments repair at serve time, no re-upload)
    let inner = removeIdentitySlots(sanitizeTileMarkup(cover.inner));
    // drop any stray unmatched closers an older store left behind
    inner = balanceClosers(inner);
    return { kind: 'html', cls: cover.cls, css: sanitizeTileCss(cover.css || ''), inner };
  } catch { return null; }
}

/** Remove end tags that have no matching opener (per tag name, in order) —
 *  a stray `</div>` inside a tile would close the page's grid early. */
export function balanceClosers(html) {
  const s = String(html || '');
  const re = /<([a-z0-9]+)\b[^>]*?(\/?)>|<\/([a-z0-9]+)\s*>/gi;
  const depth = {};
  const drop = [];
  let m;
  while ((m = re.exec(s))) {
    if (m[3]) {
      const t = m[3].toLowerCase();
      if ((depth[t] || 0) > 0) depth[t]--; else drop.push([m.index, m.index + m[0].length]);
    } else if (!m[2] && !/^(br|img|input|hr|meta|link|path|circle|rect|line|polyline|polygon|ellipse|stop|use)$/i.test(m[1])) {
      const t = m[1].toLowerCase();
      depth[t] = (depth[t] || 0) + 1;
    }
  }
  if (!drop.length) return s;
  let out = '', last = 0;
  for (const [a, b] of drop) { out += s.slice(last, a); last = b; }
  return out + s.slice(last);
}
