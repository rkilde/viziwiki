// Build-time: surface the canonical grammar (_data/grammar.yml) to the React
// builder as JSON, so the build kit reads its RULES (required fields, min/max
// counts, …) from the one canonical source instead of re-stating them in code.
// Same pattern as copy-canon / extract-* : the repo file is the source, this is
// a generated copy. Re-run on build (prebuild) so the builder always tracks it.
//
// Run from _builder:  node scripts/extract-grammar.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const grammar = yaml.load(fs.readFileSync(path.join(ROOT, '_data', 'grammar.yml'), 'utf8'));

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'grammar.json'), JSON.stringify(grammar, null, 2));
console.log('wrote data/grammar.json from _data/grammar.yml');
