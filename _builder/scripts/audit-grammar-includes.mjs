// CANON DRIFT AUDIT — verifies the two halves of the canon that must agree on
// the field vocabulary actually do: every `data.*` field an include READS must
// be DECLARED in that component's grammar (fields or locked), and where both
// state a default, the defaults must match. This turns "two files that must
// agree" into "two files that cannot silently disagree" (standing rule #5).
//
// Read-only: reports drift and exits non-zero. Wired into `npm test`.
// Run from _builder:  node scripts/audit-grammar-includes.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const grammar = yaml.load(read('_data/grammar.yml'));
const visuals = yaml.load(read('_data/visuals.yml'));
const incPath = (p) => path.join(ROOT, '_includes', p);
const inc = (p) => (fs.existsSync(incPath(p)) ? fs.readFileSync(incPath(p), 'utf8') : null);

// Liquid loop variables (for x in alias.list) — their field reads belong to
// LIST SUBTYPES, which this audit doesn't validate yet (v2). Tracked so they
// don't false-positive as top-level reads.
function aliasesOf(txt) {
  const out = new Set();
  const re = /assign\s+(\w+)\s*=\s*include\.data\b/g;
  let m;
  while ((m = re.exec(txt))) out.add(m[1]);
  return out;
}

// all `alias.field` reads + any `| default:` values stated for them
function readsOf(txt, alias) {
  const fields = new Map(); // field → Set(defaults)
  const re = new RegExp('\\b' + alias + '\\.([a-zA-Z_]\\w*)', 'g');
  let m;
  while ((m = re.exec(txt))) if (!fields.has(m[1])) fields.set(m[1], new Set());
  const dre = new RegExp(alias + '\\.(\\w+)\\s*\\|\\s*default:\\s*([\'"]?)([^\'"%}\\s]+)\\2', 'g');
  while ((m = dre.exec(txt))) fields.get(m[1])?.add(m[3]);
  return fields;
}

// the set of field names a component (or subtype) legally exposes
function legalSet(fieldsMap, lockedDecl) {
  const s = new Set(Object.keys(fieldsMap || {}));
  if (Array.isArray(lockedDecl)) lockedDecl.forEach((f) => s.add(f));
  else if (lockedDecl && typeof lockedDecl === 'object') Object.keys(lockedDecl).forEach((f) => s.add(f));
  return s;
}

let problems = 0;
const report = (comp, file, msg) => { problems++; console.error(`  ✗ [${comp}] ${file}: ${msg}`); };

function auditFile(comp, file, fieldsMap, lockedDecl, grammarFields) {
  const txt = inc(file);
  if (txt == null) { report(comp, file, 'include file not found'); return; }
  const legal = legalSet(fieldsMap, lockedDecl);
  const aliases = aliasesOf(txt);
  aliases.add('include\\.data'); // direct include.data.field reads
  for (const alias of aliases) {
    for (const [field, defaults] of readsOf(txt, alias)) {
      if (!legal.has(field)) {
        report(comp, file, `reads \`${field}\` — not declared in grammar (fields or locked)`);
        continue;
      }
      // default agreement: where BOTH the include and grammar state one
      const gDefault = grammarFields?.[field]?.default;
      if (gDefault != null && defaults.size) {
        for (const d of defaults) {
          if (String(d) !== String(gDefault)) {
            report(comp, file, `\`${field}\` default mismatch: include says '${d}', grammar says '${gDefault}'`);
          }
        }
      }
    }
  }
}

console.log('canon drift audit: grammar.yml ↔ the includes each component renders through\n');

for (const [name, comp] of Object.entries(grammar.components || {})) {
  if (!comp || !comp.fields) continue;
  const secKey = comp.section || (name === 'hero' ? 'hero' : name + '-section');
  const secDef = (visuals.sections || {})[secKey];
  const files = [];
  if (secDef?.partial) files.push(secDef.partial);
  else if (name === 'hero') files.push('sections/hero.html');
  // the visual(s) legal in the section's slot (registry `hosts`)
  for (const host of secDef?.hosts || []) {
    const v = visuals[host];
    if (v?.partial) files.push(v.partial);
  }
  for (const f of files) auditFile(name, f, comp.fields, comp.locked, comp.fields);

  // section PARTS (hero's stats/search/spotlight/feature, overview's infobox):
  // a part with a same-named grammar subtype validates against that subtype;
  // otherwise it receives the whole component data (e.g. hero/search.html)
  for (const [part, partial] of Object.entries(secDef?.parts || {})) {
    const sub = comp.subtypes?.[part];
    if (sub) auditFile(`${name}.${part}`, partial, sub, null, sub);
    else auditFile(name, partial, comp.fields, comp.locked, comp.fields);
  }
}

console.log(problems ? `\n${problems} drift finding(s)` : 'no drift — every include read is grammar-declared, defaults agree');
process.exit(problems ? 1 : 0);
