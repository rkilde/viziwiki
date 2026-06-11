// POLICY BUILDER — flattens the canonical grammar (generated from
// _data/grammar.yml) into a path → rules map the builder consumes. This is the
// ONE resolver: the renderer's projection, the decorator, and the action
// handlers all read this map, so "is this field optional / what's its starter
// value / how many items" is answered by grammar alone (standing rule #5).
//
// Plain .mjs on purpose: imported by the TypeScript app AND by the Node test
// so there is exactly one copy of this logic.

// "list<chip>" → { kind:'list', of:'chip' } · "enum[a,b]" → { kind:'enum', values:[...] }
function parseType(t) {
  if (typeof t !== 'string') return { kind: 'unknown' };
  const list = /^list<(.+)>$/.exec(t);
  if (list) return { kind: 'list', of: list[1] };
  const en = /^enum\[(.*)\]$/.exec(t);
  if (en) return { kind: 'enum', values: en[1].split(',').map((s) => s.trim()) };
  return { kind: t };
}

// Build { fields: {path: rule}, locked: {component: lockedSpec}, variants: {pageType: heroVariant} }
export function buildPolicy(grammar) {
  const fields = {};
  const components = (grammar && grammar.components) || {};

  function walkFields(comp, prefix, fieldMap, subtypes) {
    for (const [name, spec] of Object.entries(fieldMap || {})) {
      if (!spec || typeof spec !== 'object') continue;
      const t = parseType(spec.type);
      const path = prefix + name;
      fields[path] = {
        kind: t.kind,
        of: t.of ?? null,          // list element subtype name (e.g. "category") — for derived labelling
        required: !!spec.required,
        locked: spec.locked === true,
        default: spec.default ?? null,
        blank: spec.blank ?? spec.default ?? null,
        item_blank: spec.item_blank ?? null,
        min: spec.min ?? null,
        max: spec.max ?? null,
        requires: spec.requires ?? null,
        enum: t.values ?? null,
      };
      // recurse into component-typed fields (spotlight/feature/infobox…) and
      // list item subtypes (stat/chip/pair…) — paths use `[]` for list items
      if (t.kind === 'list' && subtypes && subtypes[t.of] && typeof subtypes[t.of] === 'object') {
        walkFields(comp, path + '[].', subtypes[t.of], subtypes);
      } else if (subtypes && subtypes[t.kind]) {
        walkFields(comp, path + '.', subtypes[t.kind], subtypes);
      }
    }
  }

  const locked = {};
  for (const [comp, def] of Object.entries(components)) {
    if (!def || typeof def !== 'object' || !def.fields) continue;
    walkFields(comp, comp + '.', def.fields, def.subtypes || {});
    if (def.locked) locked[comp] = def.locked;
  }

  // which hero variant each page type gets (e.g. home → search)
  const variants = {};
  for (const [pt, def] of Object.entries((grammar && grammar.page_types) || {})) {
    variants[pt] = (def && def.hero_variant) || 'standard';
  }

  return { fields, locked, variants };
}

// normalize a concrete data path to its policy path: numeric segments → []
// e.g. "hero.stats.2.num" → "hero.stats[].num" · "overview.paragraphs.1" → "overview.paragraphs[]"
export function policyPath(path) {
  return path.replace(/\.\d+(?=\.|$)/g, '[]');
}

// rule for a concrete path; a bare list-item path ("…paragraphs.1" → "…[]")
// falls back to the LIST's own rule (min/max govern its items)
export function ruleFor(policy, path) {
  const p = policyPath(path);
  return policy.fields[p] || (p.endsWith('[]') ? policy.fields[p.slice(0, -2)] : null) || null;
}
