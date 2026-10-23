// taxonomy.mjs — PURE helpers for the wiki category taxonomy (origination arc).
// The 12 built-in categories are CANON (_data/wiki_categories.yml → copy-canon
// → data/wiki-categories.json). Admin-ORIGINATED categories are CONTENT: rows
// in public.wiki_categories (migration 0007). Every surface renders from the
// MERGED set — canon first (and canon wins a key collision), then originated.
// Plain .mjs so the Next app AND the guard suite share it (case 21).

/** A wiki id / category key from a display name: lowercase, hyphenated. */
export function slugifyId(name) {
  return String(name || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Merge the canon taxonomy with originated category rows. DB rows arrive as
 *  { key, label, icon, grad_from, grad_to } (concrete CSS color values, picked
 *  from the canon palette swatches at origination). The merged entries keep
 *  the canon shape — grad.from/to hold a palette NAME (canon) or a literal
 *  color value (originated); resolveColor handles both. */
export function mergeTaxonomy(canonTax, dbRows) {
  const canon = (canonTax && canonTax.categories) || [];
  const have = new Set(canon.map((c) => c.key));
  const extra = (dbRows || [])
    .filter((r) => r && r.key && !have.has(r.key))
    .map((r) => ({ key: r.key, label: r.label || r.key, icon: r.icon || 'sparkles', grad: { from: r.grad_from || '#2a2630', to: r.grad_to || '#4a4454' }, originated: true }));
  return { palette: (canonTax && canonTax.palette) || {}, categories: [...canon, ...extra] };
}

/** A gradient stop: a canon palette name, or (originated) a literal color. */
export function resolveColor(palette, nameOrValue, fallback) {
  if (!nameOrValue) return fallback;
  return (palette && palette[nameOrValue]) || nameOrValue;
}

/** The public DIRECTORY payload (GET /api/directory) — what the live site's
 *  browse page (and any future wiki-listing surface) consumes: every wiki row
 *  with its identity, plus the MERGED taxonomy with gradient colors RESOLVED
 *  (palette names → values), so no consumer needs the palette. */
export function directoryPayload(wikiRows, canonTax, dbCats) {
  const merged = mergeTaxonomy(canonTax, dbCats);
  const pal = merged.palette;
  return {
    wikis: (wikiRows || []).map((w) => ({
      id: w.id, name: w.name, categories: w.categories || [], blurb: w.blurb || null,
      tagline: w.tagline || null, status: w.status || 'live', tile_cover: w.tile_cover || { kind: 'themed' },
      icon: w.icon || { kind: 'auto' },   // the wiki MARK (0009) — for compact listings
      entries: w.entries || 0, popularity: w.popularity || 0,
    })),
    categories: merged.categories.map((c) => ({
      key: c.key, label: c.label, icon: c.icon,
      from: resolveColor(pal, c.grad.from, '#2a2630'), to: resolveColor(pal, c.grad.to, '#4a4454'),
    })),
  };
}

/** Every icon name in the canon sprite (id="ic-NAME") — the derived source of
 *  an icon picker's choices (never a hand-kept list). */
export function spriteIconNames(spriteHtml) {
  return [...String(spriteHtml || '').matchAll(/id="ic-([a-z0-9-]+)"/g)].map((m) => m[1]);
}

/** Validate an originated category before it's stored. Returns error strings
 *  (empty = valid). `taken` = keys already in the merged taxonomy. */
export function validateCategory(cat, taken, iconNames) {
  const errs = [];
  if (!cat || !cat.key || !/^[a-z0-9][a-z0-9-]*$/.test(cat.key)) errs.push('key must be lowercase letters/numbers/hyphens');
  else if (taken && taken.includes(cat.key)) errs.push(`"${cat.key}" is already a category`);
  if (!cat || !String(cat.label || '').trim()) errs.push('a label is required');
  if (!cat || !cat.icon || (iconNames && !iconNames.includes(cat.icon))) errs.push('pick an icon from the sprite');
  if (!cat || !cat.grad_from || !cat.grad_to) errs.push('pick a gradient');
  return errs;
}

/** Validate a new wiki's identity before origination. */
export function validateNewWiki(meta, existingIds, categoryKeys) {
  const errs = [];
  if (!meta || !String(meta.name || '').trim()) errs.push('a name is required');
  if (!meta || !meta.id || !/^[a-z0-9][a-z0-9-]*$/.test(meta.id)) errs.push('id must be lowercase letters/numbers/hyphens');
  else if (existingIds && existingIds.includes(meta.id)) errs.push(`"${meta.id}" already exists`);
  const cats = (meta && meta.categories) || [];
  if (!cats.length) errs.push('pick at least one category');
  else if (categoryKeys) for (const k of cats) if (!categoryKeys.includes(k)) errs.push(`unknown category "${k}"`);
  return errs;
}
