// ════════════════════════════════════════════════════════════════════
// SEED ↔ PLACEHOLDER GUARD — makes "a fresh section reads as UNTOUCHED"
// un-regressable across every bank.
//
// The readiness widget calls a required field "done" when its value differs
// from its grammar placeholder (`blank`). So a freshly-seeded section is only
// honest if every required CONTENT field seeds to its placeholder. This guard
// enforces, for every component's `seed` against its grammar:
//   (1) every required text/richtext field HAS a `blank` (a placeholder it can
//       render + measure "untouched" against);
//   (2) where the seed provides such a field, it equals that `blank` (so it
//       reads as untouched, not pre-filled) — unless the field is a structural
//       driver flagged `seed_real: true` (e.g. a timeline's date positions);
//   (3) every required list is seeded at >= its `min` (the scaffold is there).
// Recurses through subtypes, component-typed fields, lists, and positional
// (tuple) subtypes. Runs in `npm test`. Fails the build on any violation.
// ════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..');
const grammar = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'grammar.json'), 'utf8'));

const TEXTY = new Set(['text', 'richtext', 'url']);  // placeholder-style content kinds
function parseType(t) {
  if (typeof t !== 'string') return { kind: 'unknown' };
  const l = /^list<(.+)>$/.exec(t); if (l) return { kind: 'list', of: l[1] };
  if (/^enum\[/.test(t)) return { kind: 'enum' };
  return { kind: t };
}

const violations = [];
function walk(fields, subtypes, seed, where) {
  const names = Object.keys(fields);
  names.forEach((name, declIdx) => {
    const spec = fields[name];
    if (!spec || typeof spec !== 'object' || spec.locked) return;
    const t = parseType(spec.type);
    // resolve the seeded value — positional when the instance is a tuple (array)
    const val = Array.isArray(seed) ? seed[declIdx] : (seed == null ? undefined : seed[name]);
    const here = where + '.' + name;

    if (spec.required && TEXTY.has(t.kind) && !spec.seed_real && spec.blank == null) {
      violations.push(`${here}: required ${t.kind} has NO placeholder \`blank\` — can't read as "untouched"`);
    }
    if (spec.required && spec.blank != null && !spec.seed_real && val != null && typeof val !== 'object') {
      if (String(val) !== String(spec.blank)) violations.push(`${here}: seed ${JSON.stringify(val)} ≠ placeholder ${JSON.stringify(spec.blank)} — a fresh section reads it as already-filled`);
    }
    if (spec.required && t.kind === 'list') {
      const min = spec.min ?? 1;
      if (!Array.isArray(val) || val.length < min) violations.push(`${here}: required list seeded with ${Array.isArray(val) ? val.length : 0} item(s) < min ${min}`);
    }
    // recurse
    if (t.kind === 'list' && subtypes[t.of] && typeof subtypes[t.of] === 'object') {
      if (Array.isArray(val)) val.forEach((it, i) => walk(subtypes[t.of], subtypes, it, `${here}[${i}]`));
    } else if (subtypes[t.kind] && typeof subtypes[t.kind] === 'object') {
      if (val != null) walk(subtypes[t.kind], subtypes, val, here);
    }
  });
}

console.log('seed ↔ placeholder guard — every component seed reads as "untouched"');
for (const [comp, def] of Object.entries(grammar.components || {})) {
  if (!def || !def.fields || !def.seed) continue;
  walk(def.fields, def.subtypes || {}, def.seed, comp);
}

if (violations.length) {
  console.error(`\n  ✗ ${violations.length} seed/placeholder violation(s):`);
  for (const v of violations) console.error('     · ' + v);
  console.error('\n  Fix: give the required field a `blank` placeholder and seed it to that blank');
  console.error('  (or flag a structural driver `seed_real: true`). See _data/grammar.yml.');
  process.exit(1);
}
console.log('  ✓ every seeded required field reads as untouched · every required list meets its min');
