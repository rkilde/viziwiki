#!/usr/bin/env python3
"""
validate-grammar.py — check every page's front-matter against _data/grammar.yml.

The grammar is the single source the builder + content-store trust, so this proves
the pages and the grammar agree. Run from the repo root:  python3 _builder/validate-grammar.py

It checks, per component block on each page:
  · required fields are present
  · enum fields hold an allowed value
  · list subtypes recurse (same checks on each element)
  · any field not in the component's `fields`/`locked` is reported as "unknown"
    (usually = the grammar is missing a field the real data uses)

This is the same validation logic ContentStore.savePage() will run before persisting.
Exit code is non-zero if anything is found.
"""
import glob, re, sys, yaml
from collections import Counter

G = yaml.safe_load(open('_data/grammar.yml'))
COMPS = G['components']
# front-matter key → component name (only `os` differs from its component name)
KEYMAP = {'hero': 'hero', 'overview': 'overview', 'spec': 'spec', 'config': 'config',
          'os': 'lifecycle-lane', 'timeline': 'timeline', 'delta': 'delta', 'catalog': 'catalog'}

def enum_vals(t):
    m = re.match(r'enum\[(.*)\]', t or '')
    return [x.strip() for x in m.group(1).split(',')] if m else None

def list_sub(t):
    m = re.match(r'list<(.*)>', t or '')
    return m.group(1) if m else None

def allowed_keys(comp):
    c = COMPS[comp]
    ks = set((c.get('fields') or {}).keys())
    lk = c.get('locked')
    if isinstance(lk, list):
        ks |= set(lk)
    ks |= {'id', 'class', 'tone', 'visual', 'eyebrow'}   # universal frame keys
    return ks

agg = Counter()

def check(obj, schema, comp, ctx):
    subs = COMPS[comp].get('subtypes') or {}
    nctx = re.sub(r'\[\d+\]', '[]', ctx)
    for fname, fspec in schema.items():
        if not isinstance(fspec, dict):
            continue
        if fspec.get('required') and fname not in obj:
            agg["[%s]%s missing required '%s'" % (comp, nctx, fname)] += 1
        if fname not in obj:
            continue
        val, t = obj[fname], fspec.get('type')
        ev = enum_vals(t)
        if ev and isinstance(val, str) and val not in ev:
            agg["[%s] %s='%s' not in %s" % (comp, fname, val, ev)] += 1
        st = list_sub(t)
        if st and st in subs and isinstance(val, list):
            for el in val:
                if isinstance(el, dict):
                    check(el, subs[st], comp, "%s.%s[]" % (ctx, fname))

for f in glob.glob('**/*.html', recursive=True):
    if f.startswith(('_site/', '_includes/', '_layouts/', '_builder/')):
        continue
    txt = open(f, encoding='utf-8', errors='ignore').read()
    if not txt.startswith('---'):
        continue
    m = re.match(r'^---\n(.*?)\n---', txt, re.S)
    if not m:
        continue
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except Exception as e:
        agg["front-matter parse error: %s" % e] += 1
        continue
    for key, comp in KEYMAP.items():
        if key not in fm or not isinstance(fm[key], dict):
            continue
        block = fm[key]
        ak = allowed_keys(comp)
        for k in block:
            if k not in ak:
                agg["[%s] unknown field '%s'" % (comp, k)] += 1
        check(block, COMPS[comp].get('fields') or {}, comp, "")

total = sum(agg.values())
print("findings: %d | distinct: %d" % (total, len(agg)))
for msg, n in agg.most_common():
    print("  %d  %s" % (n, msg))
sys.exit(1 if total else 0)
