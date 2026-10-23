// svg-gen.mjs — PURE parts of the AI art generator (origination arc): the
// prompt builders and the SVG sanitizer. The Claude API call itself lives in
// app/api/generate/route.ts (server-side key); these stay pure so the guard
// suite covers them (case 23).
//
// WHY SVG: the platform's bespoke covers are already vector art, and vectors
// stay crisp at any size, weigh kilobytes, carry no binary-storage needs
// (data-URI into the existing `art` slots), and can be re-colored later. The
// prompt derives art direction FROM THE WIKI'S IDENTITY — name, tags, blurb,
// its category's palette — the golden rule's "relatedness" made automatic.

/** Shared output contract — the hard rules every generation must obey. */
const CONTRACT = `Output EXACTLY one complete <svg> element and nothing else — no markdown fences, no commentary before or after.
Hard rules:
- Self-contained vector art only: paths, shapes, gradients, patterns, clipPaths, masks, filters defined inline.
- NO <script>, NO <foreignObject>, NO event handler attributes, NO external references of any kind (no href/xlink:href to URLs, no <image> elements, no @import, no url() pointing outside this SVG).
- NO raster data. NO animation elements.
- NO text or lettering of any kind — the platform overlays its own typography.
- Give the root element the exact viewBox requested. Fill the full canvas (an opaque background layer first).`;

/** Art direction derived from the wiki's identity (+ the designer's hint). */
function identityBrief(w) {
  const bits = [`The wiki's subject: "${w.name}".`];
  if (w.genreLabel) bits.push(`Genre: ${w.genreLabel}.`);
  if (w.tagline) bits.push(`Its tagline: "${w.tagline}".`);
  if (w.blurb) bits.push(`Its description: "${w.blurb}".`);
  if (w.colors && w.colors.length) bits.push(`Base the palette on these brand colors (expand with harmonious tints/shades as needed): ${w.colors.join(', ')}.`);
  return bits.join(' ');
}

/** The user prompt for one generation. kind: 'icon' | 'cover'. */
export function buildSvgPrompt(kind, w, hint) {
  const brief = identityBrief(w);
  const direction = hint && String(hint).trim() ? `\nArt direction from the designer (follow it): ${String(hint).trim()}` : '';
  if (kind === 'icon') {
    return `Design a small square vector MARK (an app-icon-style logo) for a wiki. ${brief}
It renders at sizes as small as 18px inside a rounded tile, so: ONE bold, instantly readable silhouette or motif that evokes the subject; strong figure-ground contrast; at most ~5 colors; generous margins (motif within the middle ~70% of the canvas); an opaque background filling the whole canvas.
viewBox="0 0 64 64".${direction}

${CONTRACT}`;
  }
  return `Design a portrait poster-style vector COVER ARTWORK for a wiki's browse tile. ${brief}
It is a 3:4 portrait card in a grid of many covers, so: a striking, atmospheric composition that evokes the subject at a glance (scene, motif, or abstract treatment — your judgment); rich but cohesive palette; an opaque background filling the whole canvas. Keep the BOTTOM-LEFT QUARTER visually calm and darker/lower-contrast — the platform overlays the wiki's title and tagline there in white text.
viewBox="0 0 360 480".${direction}

${CONTRACT}`;
}

export const GEN_SYSTEM = `You are a senior brand illustrator producing production vector art for ViziWiki, a platform of visually designed wikis. Craft matters: confident shapes, deliberate palette, no clip-art clichés. You respect every hard rule in the request exactly.`;

/** Pull the first complete <svg>…</svg> out of a model response. */
export function extractSvg(text) {
  const s = String(text || '');
  const start = s.indexOf('<svg');
  const end = s.lastIndexOf('</svg>');
  if (start === -1 || end === -1 || end < start) return null;
  return s.slice(start, end + 6);
}

/** Sanitize generated SVG for safe storage + rendering. Defense in depth —
 *  the art renders via <img>/CSS background (scripts never execute there),
 *  but stored markup must be inert anyway. Throws on an irrecoverable shape;
 *  strips the removable sins. */
export function sanitizeSvg(svg) {
  let s = String(svg || '').trim();
  if (!/^<svg[\s>]/.test(s) || !s.endsWith('</svg>')) throw new Error('not a bare <svg> element');
  if (!/viewBox\s*=/.test(s)) throw new Error('missing viewBox');
  // strip whole dangerous elements
  s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, '').replace(/<script[^>]*\/>/gi, '');
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '').replace(/<foreignObject[^>]*\/>/gi, '');
  s = s.replace(/<image[\s\S]*?(\/>|<\/image\s*>)/gi, '');
  s = s.replace(/<animate[\s\S]*?(\/>|<\/animate\w*\s*>)/gi, '');
  // strip event handlers + external/scripted references
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  s = s.replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '');   // keep #local refs
  s = s.replace(/javascript:/gi, '');
  s = s.replace(/url\(\s*(['"]?)(?!['"]?#)/gi, 'url($1#blocked-');              // external url() → dead local ref
  if (/<script|<foreignObject|onload|onclick/i.test(s)) throw new Error('sanitization failed');
  return s;
}

/** A data URI the existing `art` slots (tile cover src / icon src) accept. */
export function svgToDataUri(svg) {
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
}
