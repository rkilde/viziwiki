// The canonical grammar, surfaced to the builder (generated from
// _data/grammar.yml by scripts/extract-grammar.mjs). This is the SINGLE SOURCE
// for the build kit's rules — read constraints from here instead of hardcoding
// them, so changing _data/grammar.yml alone changes builder behaviour.
import grammar from '../data/grammar.json';

export const GRAMMAR = grammar as any;

// canonical feature-card chip count (the card shows exactly this many, fixed).
// Lives once in _data/grammar.yml (components.hero.subtypes.feature.chips.min).
const featureChips = GRAMMAR?.components?.hero?.subtypes?.feature?.chips ?? {};
export const FEATURE_CHIP_COUNT: number = typeof featureChips.min === 'number' ? featureChips.min : 3;
