// caps.mjs — the PURE mapping from an account's role/class to its editing
// capabilities. Plain .mjs (like policy.mjs / content-map.mjs) so the builder
// UI, the decorator, AND the guard suite share one source (case 17).
//
// The owner's model: every account is viewer | contributor | admin; a
// contributor carries a CLASS. Classes are capability SETS, not a ladder —
// designer deliberately has design WITHOUT text:
//   writer    prose/text values only
//   designer  design only (tones, icons, theme)
//   curator   everything, scoped to their one wiki (scope enforced in the DB)
//   admin     everything, everywhere
// (An "editor" class — text + titles + structure, between writer and curator —
// was designed and deliberately shelved to keep the foundation simple; titles
// and structure are curator-only until it returns.)
export const NO_CAPS = Object.freeze({ text: false, titles: false, structure: false, design: false });

export const CLASS_CAPS = Object.freeze({
  writer:   { text: true,  titles: false, structure: false, design: false },
  designer: { text: false, titles: false, structure: false, design: true  },
  curator:  { text: true,  titles: true,  structure: true,  design: true  },
});

export function capsFor(role, cls) {
  if (role === 'admin') return { text: true, titles: true, structure: true, design: true };
  if (role === 'contributor') return { ...(CLASS_CAPS[cls] || NO_CAPS) };
  return { ...NO_CAPS };   // viewer / signed out
}

export const canEditAnything = (caps) => !!(caps && (caps.text || caps.titles || caps.structure || caps.design));

/** Which capability a FIELD edit needs — DERIVED from the grammar rule plus
 *  the canon NAMING CONVENTION (grammar consistently names title-class fields
 *  title/heading/name/eyebrow/subtitle/strong), never a hand-kept field list.
 *  `rule` may be null (unknown path → treated as plain text). */
const TITLE_FIELD = /(^|\.)(title|heading|name|eyebrow|subtitle|strong)$/;
export function fieldCap(path, rule) {
  const r = rule || {};
  const p = String(path || '').replace(/\.\d+(?=\.|$)/g, '');
  if (r.kind === 'icon') return 'design';
  if (/(^|\.)tone$/.test(p)) return 'design';
  if (r.identity || TITLE_FIELD.test(p)) return 'titles';
  return 'text';
}

/** Which wikis this account may SEE in the build kit (the owner's rule: no
 *  grant → no wikis). admin → all · curator (wiki_id set) → theirs only ·
 *  writer/designer (platform-wide grant, wiki_id null) → all, until per-wiki
 *  memberships exist · viewer / no class / signed out → none. */
export function grantedWikiIds(role, cls, wikiId, allIds) {
  const ids = Array.isArray(allIds) ? allIds : [];
  if (role === 'admin') return [...ids];
  if (role === 'contributor' && cls) return wikiId ? ids.filter((id) => id === wikiId) : [...ids];
  return [];
}

/** Which capability an ACTION verb needs (the parent-side backstop). */
export function actionCap(action) {
  const a = String(action || '');
  if (a === 'commit') return null;                               // always allowed
  if (/^set:.*\.(tone|icon):/.test(a) || /^setTone/.test(a)) return 'design';
  if (/^(set|add|rm):.*icon/.test(a)) return 'design';
  return 'structure';                                            // push/rm/add/lmove/sec*/aside/pill…
}
