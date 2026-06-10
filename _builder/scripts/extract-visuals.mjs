// Build-time: surface the VISUAL BANK REGISTRY (_data/visuals.yml) to the
// builder. The registry is the canon map of section type → partial → locked
// chrome → legal visuals; the builder's renderer + decorator read THIS, never
// restate it (CLAUDE.md standing rule #5).
//
// Run from _builder:  node scripts/extract-visuals.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const SRC = path.resolve(process.cwd(), '..', '_data', 'visuals.yml');
const reg = yaml.load(fs.readFileSync(SRC, 'utf8'));

fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'data', 'visuals.json'), JSON.stringify(reg, null, 2));
// visuals live as top-level keys alongside `sections:` (catalog, timeline, …)
const visuals = Object.keys(reg).filter((k) => k !== 'sections');
console.log(`wrote data/visuals.json — ${Object.keys(reg.sections || {}).length} section types, ${visuals.length} visuals`);
