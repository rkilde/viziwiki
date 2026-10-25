// page-emblem.mjs — PURE extraction of a page's EMBLEM from the live site's
// chrome config. Every wiki page carries `window.WIKI_TOC = { pageLogo,
// wikiLogo, … }` where pageLogo is the PAGE's mark and wikiLogo the WIKI's —
// both hand-written inline SVG strings today. This lifts them into the
// MASTER MEDIA PATTERN ({ kind:'art', src: data-uri }) so the marks become
// DATA: carried by the extract pipes into the builder, seeded into the
// pages/wikis tables (migration 0010), rendered via <img> where scripts
// can't run — no longer bespoke per-page markup.
import { svgToDataUri } from './svg-gen.mjs';

/** Read one quoted string value off a `key: '…'` field in a JS object
 *  literal (the WIKI_TOC block) — handles ' " ` quoting and backslash
 *  escapes; evaluates ONLY the captured literal (trusted repo content,
 *  same contract as the extract scripts' CATS evaluation). */
export function readTocString(txt, key) {
  const at = txt.indexOf('WIKI_TOC');
  const scope = at === -1 ? txt : txt.slice(at);
  const m = scope.match(new RegExp('[^A-Za-z0-9_]' + key + '\\s*:\\s*'));
  if (!m) return null;
  let j = m.index + m[0].length;
  const q = scope[j];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let k = j + 1;
  while (k < scope.length) {
    if (scope[k] === '\\') { k += 2; continue; }
    if (scope[k] === q) break;
    k++;
  }
  if (k >= scope.length) return null;
  try { return new Function('return ' + scope.slice(j, k + 1))(); } catch { return null; }
}

// an emblem is a SMALL mark — a heavier image (the iPod pages' shared 84KB
// photo PNG) stays page-side until Supabase Storage uploads land (the master
// media pattern's next step), rather than bloating the bundle/table
const IMG_CAP = 8 * 1024;

/** Make an inline-HTML `<svg>` SELF-CONTAINED so it renders as a standalone
 *  image (<img src="data:…">): inline HTML tolerates a missing xmlns and
 *  inherits currentColor from the chrome — a standalone SVG document does
 *  neither (no xmlns = the browser refuses to render it at all). The live
 *  rails draw these marks light-on-dark, so currentColor becomes #fff. */
export function standaloneSvg(svg) {
  let s = String(svg);
  const root = s.match(/<svg\b[^>]*>/i);
  if (root && !/xmlns\s*=/.test(root[0])) {
    s = s.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (/xlink:/.test(s) && !/xmlns:xlink/.test(s)) {
    s = s.replace(/<svg\b/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  return s.replace(/currentColor/g, '#fff');
}

/** The page's emblem (WIKI_TOC.pageLogo) as master-media art, or null.
 *  Handles the two shapes found on the site: an inline `<svg>` (made
 *  self-contained, lifted as a data URI) and a small `<img src="data:…">`
 *  (its data URI lifted as-is). An svg with no drawable content (the empty
 *  placeholder open-tags on two pages) or one leaning on an on-page sprite
 *  (<use href="#…">) can't stand alone — those lift as null. */
export function extractPageEmblem(txt, key = 'pageLogo') {
  const val = (readTocString(txt, key) || '').trim();
  if (val.startsWith('<svg')) {
    const inner = val.replace(/^<svg\b[^>]*>/i, '').replace(/<\/svg\s*>\s*$/i, '');
    if (!/<\s*[a-z]/i.test(inner)) return null;            // nothing drawn
    if (/<use\b/i.test(inner)) return null;                // needs the page's sprite
    return { kind: 'art', src: svgToDataUri(standaloneSvg(val)) };
  }
  if (val.startsWith('<img')) {
    const m = val.match(/src\s*=\s*["'](data:image\/[^"']+)["']/i);
    if (m && m[1].length <= IMG_CAP) return { kind: 'art', src: m[1] };
  }
  return null;
}
