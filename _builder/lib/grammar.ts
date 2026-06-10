// The canonical grammar, surfaced to the builder (generated from
// _data/grammar.yml by scripts/extract-grammar.mjs) and flattened into the
// POLICY map (lib/policy.mjs — one resolver, shared with the Node test).
// This is the SINGLE SOURCE for the build kit's rules: required/optional,
// starter blanks, list bounds, enums, locks. Read constraints from here —
// never hardcode them — so changing _data/grammar.yml alone changes builder
// behaviour (CLAUDE.md standing rule #5).
import grammar from '../data/grammar.json';
import { buildPolicy, ruleFor } from './policy.mjs';

export const GRAMMAR = grammar as any;
export const POLICY = buildPolicy(GRAMMAR);

// rule lookup for a concrete data path (numeric list indexes normalized)
export const rule = (path: string) => ruleFor(POLICY, path) || ({} as any);

export const isRequired = (path: string): boolean => !!rule(path).required;
export const blankOf = (path: string): any => {
  const b = rule(path).blank;
  // structured blanks (objects/arrays) must be cloned — they get mutated in docs
  return b && typeof b === 'object' ? JSON.parse(JSON.stringify(b)) : b;
};
export const itemBlankOf = (path: string): any => {
  const b = rule(path).item_blank;
  return b && typeof b === 'object' ? JSON.parse(JSON.stringify(b)) : b;
};

// canonical feature-card chip count (fixed: grammar min==max)
export const FEATURE_CHIP_COUNT: number = rule('hero.feature.chips').min ?? 3;
