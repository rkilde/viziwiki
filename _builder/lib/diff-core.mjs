// diff-core.mjs — the PURE green/red machinery: compare two PageDoc
// snapshots and emit a human-readable change list (the data behind the
// builder's history diffs and a curator's review). Plain .mjs so the UI and
// the guard suite (case 19) share it.

/** Flatten a doc into { "hero.title": "Drinks.", "sections.0.data.…": … } —
 *  scalar leaves only; arrays/objects recurse. Section paths are labeled by
 *  the section's component type for readability. */
export function flattenDoc(doc) {
  const out = {};
  const walk = (v, path) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === '_stash') continue;                      // editor-only, never diffed
        walk(x, path ? `${path}.${k}` : k);
      }
      return;
    }
    out[path] = String(v);
  };
  const d = doc || {};
  walk(d.hero || {}, 'hero');
  walk(d.overview || {}, 'overview');
  (Array.isArray(d.sections) ? d.sections : []).forEach((s, i) => {
    walk(s && s.data ? s.data : {}, `${s && s.type ? s.type : 'section'}[${i}]`);
  });
  return out;
}

/** Diff two docs → [{ path, kind: 'added'|'removed'|'changed', old, new }],
 *  ordered by path. Equal leaves are omitted (a quiet diff = no change). */
export function diffDocs(prevDoc, nextDoc) {
  const a = flattenDoc(prevDoc);
  const b = flattenDoc(nextDoc);
  const paths = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const out = [];
  for (const p of paths) {
    const inA = p in a, inB = p in b;
    if (inA && !inB) out.push({ path: p, kind: 'removed', old: a[p], new: null });
    else if (!inA && inB) out.push({ path: p, kind: 'added', old: null, new: b[p] });
    else if (a[p] !== b[p]) out.push({ path: p, kind: 'changed', old: a[p], new: b[p] });
  }
  return out;
}
