// ════════════════════════════════════════════════════════════════════
// SKIN CONTRACT GUARD — makes the skin↔asset contract un-regressable.
// Enforces, against _data/skin-contract.yml:
//   (a) every var(--wiki-*) a bank reads is a CONTRACT token (no invented
//       names like the old --accent that silently fall through);
//   (b) a bank may otherwise only read its OWN internal tokens (its prefix) —
//       so a bank can't reach for another bank's or a skin's private token;
//   (c) every contract token has a UNIVERSAL DEFAULT (so any skin + any bank
//       always resolves).
// Runs in `npm test` (→ prebuild). Fails the build on any violation.
// ════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const manifest = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'skin-contract.yml'), 'utf8'));

// contract token set
const contract = new Set();
for (const group of Object.values(manifest)) {
  if (!Array.isArray(group)) continue;
  for (const t of group) contract.add(t.token);
}
const PALETTE_MAX = 24;   // --wiki-palette is a ramp; accept --wiki-palette-1..24
const isContract = (tok) => {
  if (contract.has(tok)) return true;
  const m = /^--wiki-palette-(\d+)$/.exec(tok);
  return !!(m && +m[1] >= 1 && +m[1] <= PALETTE_MAX);
};

// each bank may read its own internal tokens (its prefix) in addition to contract
const BANK_PREFIX = {
  'bank-catalog.css': '--cat-',
  'bank-timeline.css': '--tl-',
  'bank-config.css': '--cfg-',
  'bank-delta.css': '--gd-',
  'bank-spec.css': '--spec-',
  'bank-lifecycle-lane.css': '--lane-',
};

console.log('skin contract guard — _data/skin-contract.yml');
let violations = 0;

// (a) + (b): bank reads
for (const [file, prefix] of Object.entries(BANK_PREFIX)) {
  const css = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const reads = [...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
  const bad = [...new Set(reads)].filter((tok) => !tok.startsWith(prefix) && !isContract(tok));
  if (bad.length) { violations += bad.length; console.error(`  ✗ ${file} reads non-contract token(s): ${bad.join(', ')}`); }
}

// (c): every contract token has a universal default (universals §0 or the
// typography layer for the prose tokens)
const defSrc = ['wiki-universals.css', 'wiki-typography.css']
  .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const defined = new Set([...defSrc.matchAll(/(--wiki-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const missing = [];
for (const tok of contract) {
  if (tok === '--wiki-palette') {            // the ramp: 1..8 are the guaranteed floor
    for (let i = 1; i <= 8; i++) if (!defined.has('--wiki-palette-' + i)) missing.push('--wiki-palette-' + i);
    continue;
  }
  if (!defined.has(tok)) missing.push(tok);
}
if (missing.length) { violations += missing.length; console.error(`  ✗ contract tokens with NO universal default: ${missing.join(', ')}`); }

if (violations) { console.error(`\nskin contract: ${violations} violation(s) — see above`); process.exit(1); }
console.log(`  ✓ ${contract.size} contract tokens · every bank read is contract-or-internal · every token has a default`);
