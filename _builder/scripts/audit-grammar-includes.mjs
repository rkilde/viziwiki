// CANON DRIFT AUDIT v2 — COMPREHENSIVE. At the scale of millions of pages, any
// field the builder writes that the live template ignores (or any field a
// template reads that grammar never declared) is silent data corruption. This
// verifies the template ↔ schema seam EXACTLY, at every depth:
//
//   FORWARD  every `x.field` an include READS — through any nesting (subtypes,
//            lists of subtypes, sub-includes) — is DECLARED in grammar (fields
//            or `locked`), and where both state a `default` the values agree.
//   REVERSE  every grammar-declared field is actually READ by some include —
//            no dead canon that would give the builder a control doing nothing.
//
// It is a scope-aware Liquid analyzer that FOLLOWS the real include graph:
// starting from each component's entry include (section frame + its slot
// visual, from the visuals.yml registry), it tracks {% assign %} / {% for %}
// bindings to type every reference, and recurses into {% include P k=expr %}
// passing the resolved parameter types — so a sub-include like delta/row.html
// is checked against the `delta_row` subtype it actually receives. <script>,
// comments, the type-routed dispatcher (visual.html) and dynamic includes are
// skipped; Liquid built-ins (forloop, size/first/last) are whitelisted.
//
// Read-only. Wired into `npm test` — any mismatch fails the build.
// Run from _builder:  node scripts/audit-grammar-includes.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(process.cwd(), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const grammar = yaml.load(read('_data/grammar.yml'));
const visuals = yaml.load(read('_data/visuals.yml'));
const incFile = (p) => { const f = path.join(ROOT, '_includes', p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };

const BUILTIN = new Set(['size', 'first', 'last']);
const SKIP_INCLUDE = new Set(['visual.html', 'icon.html']); // dispatcher (type-routed) + params-only
const problems = [];
const reads = new Set();        // "TYPE::field" actually read somewhere
const flag = (comp, file, msg) => problems.push(`[${comp}] ${file}: ${msg}`);

// ── type model ──────────────────────────────────────────────────────────────
const SCALAR = { kind: 'scalar' };
const objType = (name, fields, locked) => ({ kind: 'obj', name, fields: fields || {}, locked: locked || new Set() });
// a component's root locked-field names (list form: [a,b] · object form: {a:…})
function lockedSet(comp) {
  const l = comp.locked;
  if (Array.isArray(l)) return new Set(l);
  if (l && typeof l === 'object') return new Set(Object.keys(l));
  return new Set();
}
// resolve a grammar field spec's VALUE type within a subtype namespace
function valueType(spec, subtypes) {
  const t = (spec && spec.type) || '';
  const list = /^list<(.+)>$/.exec(t);
  if (list) return { kind: 'list', el: subtypes[list[1]] ? objType(list[1], subtypes[list[1]]) : SCALAR };
  if (subtypes[t]) return objType(t, subtypes[t]);
  return SCALAR;
}

const dequote = (s) => s.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ');
const PATHS = /[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)+/g;

const visited = new Set();
// analyze one include FILE. ctx = Map(includeParamName → type) — what the
// caller passed (entry files get {data: componentRoot}). Follows sub-includes.
function analyze(comp, file, ctx, subtypes) {
  const vkey = file + '|' + [...ctx.entries()].map(([k, v]) => k + ':' + (v.name || v.kind)).sort().join(',');
  if (visited.has(vkey)) return;
  visited.add(vkey);

  let src = incFile(file);
  if (src == null) { flag(comp, file, 'include file not found'); return; }
  src = src.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, ' ')
           .replace(/<script[\s\S]*?<\/script>/gi, ' ')
           .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const stack = [new Map()];
  const lookup = (n) => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].has(n)) return stack[i].get(n); return undefined; };

  // resolve a dotted path → { type, spec } (spec = grammar spec of the final
  // segment, for default checks). Records reads + flags undeclared fields.
  function resolve(pathStr) {
    const segs = pathStr.split('.');
    let cur, spec = null;
    const base = segs.shift();
    if (base === 'forloop') return { type: SCALAR, spec };
    if (base === 'include') {                       // include.<param>[.field…]
      const param = segs.shift();
      cur = ctx.get(param) || SCALAR;
    } else {
      cur = lookup(base);
      if (cur === undefined) return { type: undefined, spec };   // unknown global
    }
    for (const seg of segs) {
      if (cur.kind === 'scalar' || cur.kind === 'forloop') return { type: SCALAR, spec };
      if (cur.kind === 'list') {
        if (seg === 'first' || seg === 'last') { cur = cur.el; continue; }
        return { type: SCALAR, spec };              // .size / named field on list
      }
      if (BUILTIN.has(seg) && !cur.fields[seg]) { cur = SCALAR; continue; }
      if (cur.fields[seg]) {
        reads.add(cur.name + '::' + seg);
        spec = cur.fields[seg];
        cur = valueType(spec, subtypes);
      } else if (cur.locked && cur.locked.has(seg)) {
        reads.add(cur.name + '::' + seg);           // declared via `locked`
        cur = SCALAR; spec = null;
      } else {
        flag(comp, file, `reads \`${cur.name}.${seg}\` — not declared in grammar (path ${pathStr})`);
        return { type: SCALAR, spec: null };
      }
    }
    return { type: cur, spec };
  }

  // validate every reference in an expression; check any `| default:` value
  function validateExpr(expr) {
    const cleaned = dequote(expr);
    for (const p of cleaned.match(PATHS) || []) {
      const base = p.split('.')[0];
      if (base !== 'forloop' && base !== 'include' && lookup(base) === undefined) continue;
      const { spec } = resolve(p);
      // default agreement: `path | default: VALUE`
      const dm = new RegExp(p.replace(/[.]/g, '\\.') + "\\s*\\|\\s*default:\\s*'?([^'\"|%}\\s]+)'?").exec(cleaned);
      if (dm && spec && spec.default != null && String(spec.default) !== String(dm[1])) {
        flag(comp, file, `\`${p}\` default mismatch: include '${dm[1]}' vs grammar '${spec.default}'`);
      }
    }
    // POSITIONAL access (e.g. a [key, value] pair read as r[0] / r[1]): the
    // Nth index reads the Nth declared field of that subtype
    let im; const IDX = /\b(\w+)\[(\d+)\]/g;
    while ((im = IDX.exec(cleaned))) {
      const v = lookup(im[1]);
      if (v && v.kind === 'obj') {
        const f = Object.keys(v.fields)[Number(im[2])];
        if (f) reads.add(v.name + '::' + f);
      }
    }
  }

  // collect a sub-include's params: {% include P k1=e1 k2=e2 %}
  function followInclude(tag) {
    const im = /^include\s+(\S+)([\s\S]*)$/.exec(tag);
    if (!im) return;
    const file2 = im[1];
    if (/\{\{|\}\}/.test(tag) || SKIP_INCLUDE.has(file2) || !/\.html$/.test(file2)) return; // dynamic / skip
    const childCtx = new Map();
    let pm; const PRE = /(\w+)\s*=\s*([^\s%]+)/g;
    while ((pm = PRE.exec(im[2]))) {
      const v = pm[2];
      childCtx.set(pm[1], /^[a-zA-Z_][\w.]*$/.test(v) ? (resolve(v).type || SCALAR) : SCALAR);
    }
    analyze(comp, file2, childCtx, subtypes);
  }

  const TOK = /\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g;
  let m;
  while ((m = TOK.exec(src))) {
    if (m[2] !== undefined) { validateExpr(m[2]); continue; }
    const tag = m[1].trim();
    const kw = (tag.match(/^(\w+)/) || [])[1];
    if (kw === 'for' || kw === 'tablerow') {
      const fm = /^\w+\s+(\w+)\s+in\s+([^\s|]+)/.exec(tag);
      validateExpr(tag.replace(/^\w+\s+\w+\s+in\s+/, ''));
      const frame = new Map();
      if (fm) { const ct = resolve(fm[2]).type; frame.set(fm[1], ct && ct.kind === 'list' ? ct.el : SCALAR); }
      stack.push(frame);
    } else if (kw === 'endfor' || kw === 'endtablerow') {
      if (stack.length > 1) stack.pop();
    } else if (kw === 'assign') {
      const am = /^assign\s+(\w+)\s*=\s*([\s\S]+)$/.exec(tag);
      if (am) {
        validateExpr(am[2]);
        const rhs = am[2].trim();
        const t = (!/\|/.test(rhs) && /^[a-zA-Z_][\w.]*$/.test(rhs)) ? (resolve(rhs).type || SCALAR) : SCALAR;
        stack[0].set(am[1], t);
      }
    } else if (kw === 'capture') {
      const cm = /^capture\s+(\w+)/.exec(tag);
      if (cm) stack[0].set(cm[1], SCALAR);
    } else if (kw === 'include') {
      validateExpr(tag.replace(/^include\s+\S+/, ''));   // validate param exprs
      followInclude(tag);
    } else if (kw && !['endcapture', 'else', 'break', 'continue', 'raw', 'endraw'].includes(kw)) {
      validateExpr(tag.replace(/^(if|unless|elsif|case|when|cycle|increment|decrement)\b/, ''));
    }
  }
}

// ── entry points per component (section frame + its slot visual) ─────────────
function entriesFor(name, comp) {
  const secKey = comp.section || (name === 'hero' ? 'hero' : name + '-section');
  const secDef = (visuals.sections || {})[secKey] || {};
  const out = [];
  if (secDef.partial) out.push(secDef.partial);
  else if (name === 'hero') out.push('sections/hero.html');
  for (const host of secDef.hosts || []) { const v = visuals[host]; if (v && v.partial) out.push(v.partial); }
  return out;
}

console.log('canon drift audit v2 — grammar.yml ↔ the full include graph (all depths)\n');

// FORWARD
for (const [name, comp] of Object.entries(grammar.components || {})) {
  if (!comp || !comp.fields) continue;
  const subtypes = comp.subtypes || {};
  const root = objType(name, comp.fields, lockedSet(comp));
  for (const file of entriesFor(name, comp)) analyze(name, file, new Map([['data', root]]), subtypes);
}

// REVERSE — every declared field must be read somewhere (locked decoration is
// exempt: it may be consumed by skins/JS, not the editor's data plane)
function reachable(name, comp) {
  const subtypes = comp.subtypes || {};
  const types = { [name]: comp.fields };
  const seen = new Set();
  const visit = (fields) => {
    for (const spec of Object.values(fields || {})) {
      const t = (spec && spec.type) || '';
      const sub = (/^list<(.+)>$/.exec(t) || [])[1] || (subtypes[t] ? t : null);
      if (sub && subtypes[sub] && !seen.has(sub)) { seen.add(sub); types[sub] = subtypes[sub]; visit(subtypes[sub]); }
    }
  };
  visit(comp.fields);
  return types;
}
for (const [name, comp] of Object.entries(grammar.components || {})) {
  if (!comp || !comp.fields) continue;
  for (const [tname, fields] of Object.entries(reachable(name, comp))) {
    for (const [field, spec] of Object.entries(fields)) {
      if (spec && spec.locked === true) continue;                 // locked decoration exempt
      if (!reads.has(tname + '::' + field)) flag(name, '(reverse)', `grammar declares \`${tname}.${field}\` but no include reads it (dead field?)`);
    }
  }
}

problems.forEach((p) => console.error('  ✗ ' + p));
console.log(problems.length ? `\n${problems.length} drift finding(s)` : 'no drift — every read is declared, every declared field is read, defaults agree');
process.exit(problems.length ? 1 : 0);
