// content-map.mjs — the PURE mapping between the editor's PageDoc and the
// Supabase `sections` rows, plus grammar validation. Plain .mjs (like
// policy.mjs) so BOTH the TypeScript store (content-store.ts) and the node
// guard suite (test-derived-renderer.mjs, no network) import the same code —
// the mapping is tested without a database.
//
// Contract (mirrors supabase/migrations/0001_init.sql):
//   row 0 = component 'hero'     (data = the hero block)
//   row 1 = component 'overview' (data = the overview block)
//   row 2+ = the contributor-added body sections, in order
// `_stash` (the editor's inactive-aside keeper) is EDITOR STATE ONLY and is
// never persisted — documented in lib/store.ts.

/** PageDoc → ordered section rows (no ids — the store adds wiki/page keys). */
export function docToRows(doc) {
  const rows = [
    { position: 0, component: 'hero', data: doc.hero || {} },
    { position: 1, component: 'overview', data: doc.overview || {} },
  ];
  (Array.isArray(doc.sections) ? doc.sections : []).forEach((s, i) => {
    rows.push({ position: 2 + i, component: s.type, data: s.data || {} });
  });
  return rows;
}

/** Ordered section rows → PageDoc (null if the rows aren't a stored page). */
export function rowsToDoc(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const hero = sorted.find((r) => r.component === 'hero');
  const overview = sorted.find((r) => r.component === 'overview');
  if (!hero || !overview) return null;   // not a complete page (both are locked canon)
  return {
    hero: hero.data,
    overview: overview.data,
    sections: sorted
      .filter((r) => r.component !== 'hero' && r.component !== 'overview')
      .map((r) => ({ type: r.component, data: r.data })),
  };
}

/** Grammar as the validator (rule #5): every body section's type must be a
 *  component the grammar knows. Returns { ok, errors[] } — the store refuses
 *  to persist an invalid doc, so a corrupted editor state can't reach the DB. */
export function validateDoc(doc, grammar) {
  const errors = [];
  const comps = (grammar && grammar.components) || {};
  if (!doc || typeof doc !== 'object') errors.push('doc is not an object');
  else {
    if (!doc.hero || typeof doc.hero !== 'object') errors.push('missing hero (locked canon)');
    if (!doc.overview || typeof doc.overview !== 'object') errors.push('missing overview (locked canon)');
    (Array.isArray(doc.sections) ? doc.sections : []).forEach((s, i) => {
      if (!s || typeof s !== 'object') errors.push(`sections[${i}] is not an object`);
      else if (!comps[s.type]) errors.push(`sections[${i}]: unknown component "${s.type}" (not in grammar.yml)`);
    });
  }
  return { ok: errors.length === 0, errors };
}

/** The persistable projection of a doc: drops editor-only state (_stash). */
export function persistableDoc(doc) {
  const { _stash, ...rest } = doc || {};
  return rest;
}
