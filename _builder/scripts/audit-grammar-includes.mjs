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
  const vkey = file + '|' + [...ctx.entries()].map(([k, v]) => k + ':' + ((v.t && (v.t.name || v.t.kind)) || 'scalar')).sort().join(',');
  if (visited.has(vkey)) return;
  visited.add(vkey);

  let src = incFile(file);
  if (src == null) { flag(comp, file, 'include file not found'); return; }
  src = src.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, ' ')
           .replace(/<script[\s\S]*?<\/script>/gi, ' ')
           .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // frames hold { t: type, spec: grammarFieldSpec|null } so assigned vars keep
  // their field identity (e.g. rb_tone = ribbon.tone | default → enum spec)
  const stack = [new Map()];
  const lookup = (n) => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].has(n)) return stack[i].get(n); return undefined; };

  // resolve a dotted path → { type, spec } (spec = grammar spec of the final
  // segment, for default/enum checks). Records reads + flags undeclared fields.
  function resolve(pathStr) {
    const segs = pathStr.split('.');
    let cur, spec = null;
    const base = segs.shift();
    if (base === 'forloop') return { type: SCALAR, spec };
    if (base === 'include') {                       // include.<param>[.field…]
      const param = segs.shift();
      const ent = ctx.get(param);
      cur = ent ? ent.t : SCALAR;
      spec = ent ? ent.spec : null;
    } else {
      const ent = lookup(base);
      if (ent === undefined) return { type: undefined, spec };   // unknown global
      cur = ent.t;
      spec = ent.spec;
    }
    for (const seg of segs) {
      if (cur.kind === 'scalar' || cur.kind === 'forloop') return { type: SCALAR, spec: null };
      if (cur.kind === 'list') {
        if (seg === 'first' || seg === 'last') { cur = cur.el; spec = null; continue; }
        return { type: SCALAR, spec: null };        // .size / named field on list
      }
      if (BUILTIN.has(seg) && !cur.fields[seg]) { cur = SCALAR; spec = null; continue; }
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
      const ent = lookup(im[1]);
      const v = ent && ent.t;
      if (v && v.kind === 'obj') {
        const f = Object.keys(v.fields)[Number(im[2])];
        if (f) reads.add(v.name + '::' + f);
      }
    }
  }

  // ENUM membership: any `path == 'literal'` (or !=, either order) where the
  // path's grammar type is enum[…] must compare against a member of that enum
  function enumValues(spec) {
    const e = /^enum\[(.*)\]$/.exec((spec && spec.type) || '');
    return e ? e[1].split(',').map((s) => s.trim()) : null;
  }
  function checkEnumLiteral(refExpr, lit) {
    if (!/^[a-zA-Z_][\w.]*$/.test(refExpr)) return;
    const base = refExpr.split('.')[0];
    if (base !== 'forloop' && base !== 'include' && lookup(base) === undefined) return;
    const vals = enumValues(resolve(refExpr).spec);
    if (vals && !vals.includes(lit)) {
      flag(comp, file, `\`${refExpr}\` compared to '${lit}' — not in grammar enum [${vals.join(',')}]`);
    }
  }
  function checkComparisons(expr) {
    let cm;
    const CMP = /([\w.]+)\s*(?:==|!=)\s*(['"])([^'"]*)\2|(['"])([^'"]*)\4\s*(?:==|!=)\s*([\w.]+)/g;
    while ((cm = CMP.exec(expr))) {
      if (cm[1] != null) checkEnumLiteral(cm[1], cm[3]);
      else checkEnumLiteral(cm[6], cm[5]);
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
      const r = /^[a-zA-Z_][\w.]*$/.test(v) ? resolve(v) : { type: SCALAR, spec: null };
      childCtx.set(pm[1], { t: r.type || SCALAR, spec: r.spec || null });
    }
    analyze(comp, file2, childCtx, subtypes);
  }

  const TOK = /\{%-?([\s\S]*?)-?%\}|\{\{-?([\s\S]*?)-?\}\}/g;
  let m;
  const caseStack = []; // {% case X %} subjects, for {% when 'lit' %} enum checks
  while ((m = TOK.exec(src))) {
    if (m[2] !== undefined) { validateExpr(m[2]); continue; }
    const tag = m[1].trim();
    const kw = (tag.match(/^(\w+)/) || [])[1];
    if (kw === 'for' || kw === 'tablerow') {
      const fm = /^\w+\s+(\w+)\s+in\s+([^\s|]+)/.exec(tag);
      validateExpr(tag.replace(/^\w+\s+\w+\s+in\s+/, ''));
      const frame = new Map();
      if (fm) {
        const r = resolve(fm[2]);
        // SHAPE: looping a field grammar says is not a list
        if (r.spec && r.spec.type && !/^list</.test(r.spec.type)) {
          flag(comp, file, `loops over \`${fm[2]}\` — grammar declares it ${r.spec.type}, not a list`);
        }
        frame.set(fm[1], { t: r.type && r.type.kind === 'list' ? r.type.el : SCALAR, spec: null });
      }
      stack.push(frame);
    } else if (kw === 'endfor' || kw === 'endtablerow') {
      if (stack.length > 1) stack.pop();
    } else if (kw === 'assign') {
      const am = /^assign\s+(\w+)\s*=\s*([\s\S]+)$/.exec(tag);
      if (am) {
        validateExpr(am[2]);
        const rhs = am[2].trim();
        // a bare path keeps its type+spec; `path | default: …` keeps the
        // FIELD's identity too (so enum vars stay checkable); a dynamic index
        // into a typed list (`list[expr]`) yields the list's ELEMENT type (so a
        // sorted-by-index loop body still types its item's fields); else scalar
        const bare = /^[a-zA-Z_][\w.]*$/.test(rhs) ? rhs
          : (/^([a-zA-Z_][\w.]*)\s*\|\s*default:/.exec(rhs) || [])[1] || null;
        const idxm = !bare ? /^([a-zA-Z_][\w.]*)\[[^\]]+\]$/.exec(rhs) : null;
        let r;
        if (bare) r = resolve(bare);
        else if (idxm) { const lr = resolve(idxm[1]); r = { type: lr.type && lr.type.kind === 'list' ? lr.type.el : SCALAR, spec: null }; }
        else r = { type: SCALAR, spec: null };
        stack[0].set(am[1], { t: r.type || SCALAR, spec: r.spec || null });
      }
    } else if (kw === 'capture') {
      const cm = /^capture\s+(\w+)/.exec(tag);
      if (cm) stack[0].set(cm[1], { t: SCALAR, spec: null });
    } else if (kw === 'include') {
      validateExpr(tag.replace(/^include\s+\S+/, ''));   // validate param exprs
      followInclude(tag);
    } else if (kw === 'case') {
      const cs = /^case\s+([\w.]+)/.exec(tag);
      caseStack.push(cs ? resolve(cs[1]).spec : null);
      validateExpr(tag.replace(/^case\b/, ''));
    } else if (kw === 'endcase') {
      caseStack.pop();
    } else if (kw === 'when') {
      const subj = caseStack[caseStack.length - 1];
      const vals = subj && /^enum\[(.*)\]$/.exec(subj.type || '');
      if (vals) {
        const members = vals[1].split(',').map((s) => s.trim());
        let wm; const WL = /['"]([^'"]*)['"]/g;
        while ((wm = WL.exec(tag))) {
          if (!members.includes(wm[1])) flag(comp, file, `case/when '${wm[1]}' — not in grammar enum [${members.join(',')}]`);
        }
      }
    } else if (kw && !['endcapture', 'else', 'break', 'continue', 'raw', 'endraw'].includes(kw)) {
      checkComparisons(tag);
      validateExpr(tag.replace(/^(if|unless|elsif|cycle|increment|decrement)\b/, ''));
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
  for (const file of entriesFor(name, comp)) analyze(name, file, new Map([['data', { t: root, spec: null }]]), subtypes);
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
