// ════════════════════════════════════════════════════════════════════
// CANONICAL WIKI HIERARCHY  ·  single source for the whole build kit
//
// Every wiki — extracted (Taco Bell, Apple) or brand-new — obeys the SAME
// node taxonomy. Nothing here is hardcoded per-wiki; the Miller view, the
// dots, the add-buttons, and the column headers all derive from this file.
//
//   depth 0            → MAIN CATEGORY PAGE   (gold dot)   — the top column
//   depth ≥ 1, leaf    → PAGE                 (neutral dot)
//   depth ≥ 1, has kids → SUBCATEGORY PAGE    (blue dot)   — emergent: a page
//                                                            BECOMES a subcategory
//                                                            the moment it gains
//                                                            child pages
//
// "Category" is therefore not a creation-time type — there is no "+ category"
// button. The first column adds a MAIN CATEGORY PAGE; every deeper column
// adds a PAGE; a page turns into a subcategory automatically once you add
// pages beneath it.
// ════════════════════════════════════════════════════════════════════

export type NodeKind = 'main-category' | 'subcategory' | 'page';

// the role of a node from its depth + whether it has children
export function nodeKind(depth: number, hasChildren: boolean): NodeKind {
  if (depth === 0) return 'main-category';
  return hasChildren ? 'subcategory' : 'page';
}

// dot colour class (maps to .mil-dot.<x> in globals.css) — always a solid,
// role-coloured dot
const DOT: Record<NodeKind, string> = {
  'main-category': 'cat',  // gold / amber
  'subcategory': 'sub',    // blue
  'page': 'leaf',          // neutral
};
// dot class for a node — solid colour by role
export function dotClass(depth: number, hasChildren: boolean): string {
  return DOT[nodeKind(depth, hasChildren)];
}

// each column adds exactly ONE kind of node, labelled by its depth
export function addLabel(depth: number): string {
  return depth === 0 ? '+ main category page' : '+ page';
}

// the first column's header (the main-category column)
export const ROOT_COLUMN_HEAD = 'Main category pages';
