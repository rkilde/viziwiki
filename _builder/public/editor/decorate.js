// THE DECORATOR — the builder's editing layer, attached AFTER the canonical
// Liquid includes render the page. The markup it decorates comes from the
// repo's own templates (see lib/render-core.mjs); this file only adds editing
// affordances (grey/blue edit boxes, corner ×, padlocks, "+" slots) and binds
// them to data paths.
//
// Derivation contract (CLAUDE.md standing rule #5):
//  · WHAT renders + WHERE = the canonical includes (never restated here)
//  · WHAT is allowed = window.__PE_POLICY (flattened from _data/grammar.yml):
//    removable = !required · list add/remove = min/max bounds · tone buttons =
//    the enum · locks = the component's `locked` block. Flip a field's rule in
//    grammar and this layer follows with NO edit here.
//  · the tables below only REFERENCE canon identifiers (the wiki-* class names
//    + data paths) to say where each affordance attaches — binding, not canon.
//
// Absent optional fields arrive as SENTINEL values (window.__PE_SENT prefix)
// rendered by the real include — so each "+" slot replaces an element that
// sits exactly where the canon would render the real thing.
(function () {
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  // policy lookup (mirror of lib/policy.mjs ruleFor — lookup protocol only,
  // the RULES themselves live in the injected policy)
  function ruleFor(path) {
    var P = (window.__PE_POLICY || {}).fields || {};
    var p = path.replace(/\.\d+(?=\.|$)/g, '[]');
    return P[p] || (p.slice(-2) === '[]' ? P[p.slice(0, -2)] : null) || null;
  }
  var optional = function (path) { var r = ruleFor(path); return !r || !r.required; };

  // "+" slot specs, keyed by the action carried in the sentinel. root = the
  // canonical element to replace (closest ancestor); no root = replace the
  // sentinel-bearing element itself. kind: aside|infobox specials.
  var SLOTS = {
    'add:hero.eyebrow':       { root: '.wiki-hero-eyebrow',           label: '+ eyebrow' },
    'add:hero.subtitle':      { root: '.wiki-hero-subtitle',          label: '+ subtitle' },
    'add:hero.subtitle_meta': { root: '.wiki-hero-subtitle-meta',     label: '+ meta', mini: true, alsoPrev: '.wiki-hero-subtitle-sep' },
    'add:hero.desc':          { root: '.wiki-hero-desc',              label: '+ description' },
    'add:hero.search':        { root: '.wiki-hero-search',            label: '+ search bar' },
    'add:hero.stats':         { root: '.wiki-hero-stats',             label: '+ stats (1×4)' },
    'addAside':               { root: '.wiki-hero-aside',             kind: 'aside' },
    'add:hero.spotlight.eyebrow': { root: '.wiki-hero-spotlight-eyebrow', label: '+ eyebrow' },
    'add:hero.spotlight.desc':    { root: '.wiki-hero-spotlight-desc',    label: '+ description' },
    'add:hero.feature.head_right':{ label: '+ right', mini: true },
    'add:hero.feature.desc':      { root: '.wiki-hero-feature-desc',      label: '+ description' },
    'add:overview.infobox':       { root: '.wiki-infobox',                kind: 'infobox' },
    'add:overview.infobox.sublabel': { label: '+ sublabel', mini: true },
    'add:overview.infobox.badge':    { root: '.wiki-infobox-badge', label: '+ badge', pad: '0 16px 14px' },
  };

  // editable text bindings: data path ↔ canonical element (class-name contract)
  var EDIT = [
    { path: 'hero.eyebrow',            sel: '.wiki-hero-eyebrow', excl: ['.wiki-hero-eyebrow-dot'] },
    { path: 'hero.title',              sel: '.wiki-hero-title', excl: ['.wiki-hero-title-accent'] },
    { path: 'hero.subtitle',           sel: '.wiki-hero-subtitle', excl: ['.wiki-hero-subtitle-sep', '.wiki-hero-subtitle-meta'] },
    { path: 'hero.subtitle_meta',      sel: '.wiki-hero-subtitle-meta' },
    { path: 'hero.desc',               sel: '.wiki-hero-desc' },
    { path: 'hero.search_placeholder', sel: '.wiki-hero-search-input' },
    { path: 'hero.spotlight.eyebrow',  sel: '.wiki-hero-spotlight-eyebrow' },
    { path: 'hero.spotlight.title',    sel: '.wiki-hero-spotlight-title' },
    { path: 'hero.spotlight.desc',     sel: '.wiki-hero-spotlight-desc' },
    { path: 'hero.spotlight.cta',      sel: '.wiki-hero-spotlight-cta' },
    { path: 'hero.feature.head_left',  sel: '.wiki-hero-feature-head > span:first-child' },
    { path: 'hero.feature.head_right', sel: '.wiki-hero-feature-head > span:nth-child(2)' },
    { path: 'hero.feature.title',      sel: '.wiki-hero-feature-title' },
    { path: 'hero.feature.desc',       sel: '.wiki-hero-feature-desc' },
    { path: 'overview.heading',        sel: '.wiki-section-title' },
    { path: 'overview.infobox.label',  sel: '.wiki-infobox-header > .wiki-infobox-label:first-child' },
    { path: 'overview.infobox.title',  sel: '.wiki-infobox-title' },
    { path: 'overview.infobox.sublabel', sel: '.wiki-infobox-title ~ .wiki-infobox-label' },
    { path: 'overview.infobox.badge',  sel: '.wiki-infobox-badge' },
  ];

  // "+" slots for BODY-SECTION fields, keyed by `<componentType>.<field>` —
  // resolved dynamically from the sentinel's containing section
  var SECTION_SLOTS = {
    'catalog.footnote': { root: '.cat-footnote', label: '+ footnote' },
  };

  // a section element's component type, derived from the registry's section
  // keys (the canon class contract: <type>-section frames carry class <type>)
  function sectionTypeOf(secEl) {
    var regs = (window.__PE_REGISTRY || {}).sections || {};
    for (var key in regs) {
      var t = key.replace(/-section$/, '');
      if (secEl.classList.contains(t)) return t;
    }
    return null;
  }

  // grammar rule lookup by policy key (e.g. 'catalog.categories[].ribbon.tone')
  function R(key) { return (((window.__PE_POLICY || {}).fields || {})[key]) || {}; }

  // removal roots: where the corner × attaches IF policy says the field is
  // optional (removability itself is computed, not listed). sibling = the ×
  // goes after the element (inline meta) instead of inside it.
  var RM_ROOTS = [
    { path: 'hero.eyebrow',           sel: '.wiki-hero-eyebrow' },
    { path: 'hero.subtitle',          sel: '.wiki-hero-subtitle' },
    { path: 'hero.subtitle_meta',     sel: '.wiki-hero-subtitle-meta', mini: true, sibling: true },
    { path: 'hero.desc',              sel: '.wiki-hero-desc' },
    { path: 'hero.search',            sel: '.wiki-hero-search' },
    { path: 'hero.stats',             sel: '.wiki-hero-stats' },
    { path: 'hero.spotlight.eyebrow', sel: '.wiki-hero-spotlight-eyebrow' },
    { path: 'hero.spotlight.desc',    sel: '.wiki-hero-spotlight-desc' },
    { path: 'hero.spotlight.cta',     sel: '.wiki-hero-spotlight-cta' }, // grammar: required → no × renders
    { path: 'hero.feature.head_right', sel: '.wiki-hero-feature-head > span:nth-child(2)', mini: true, sibling: true },
    { path: 'hero.feature.desc',      sel: '.wiki-hero-feature-desc' },
    { path: 'overview.infobox',       sel: '.wiki-infobox' },
    { path: 'overview.infobox.sublabel', sel: '.wiki-infobox-title ~ .wiki-infobox-label' },
    { path: 'overview.infobox.badge', sel: '.wiki-infobox-badge' },
  ];

  // list bindings: items indexed by DOM order; add/remove per grammar bounds
  var LISTS = [
    { path: 'hero.stats',            item: '.wiki-hero-stat', parts: { num: '.wiki-hero-stat-num', label: '.wiki-hero-stat-label' } },
    { path: 'hero.spotlight.tags',   container: '.wiki-hero-spotlight-tags', item: '.wiki-hero-spotlight-tag', whole: true, addLabel: '+ tag', mini: true },
    { path: 'hero.feature.chips',    item: '.wiki-hero-feature-chip', parts: { key: '.wiki-hero-feature-chip-key', val: '.wiki-hero-feature-chip-val' } },
    { path: 'overview.paragraphs',   container: '.wiki-section-prose', item: '.wiki-section-prose > p', whole: true, addLabel: '+ paragraph' },
  ];

  var qs = function (s, r) { return (r || document).querySelector(s); };
  var qsa = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  function addBtn(action, label, mini) {
    var b = document.createElement('button');
    b.className = mini ? 'pe-mini-add' : 'pe-add';
    b.textContent = label;
    b.onclick = function () { A(action); };
    return b;
  }
  function addLine(action, label, pad) {
    var d = document.createElement('div');
    d.className = 'pe-addline';
    if (pad) d.style.padding = pad;
    d.appendChild(addBtn(action, label));
    return d;
  }

  // ── 1) sentinel pass: turn each sentinel-rendered element into a "+" slot ──
  function sentinelPass() {
    var token = window.__PE_SENT;
    var re = new RegExp(token + '([A-Za-z0-9_.:]+?)__');
    var found = [];
    qsa('*').forEach(function (el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.indexOf(token) > -1) { found.push({ el: el, m: re.exec(n.nodeValue) }); return; }
      }
      if (el.placeholder && el.placeholder.indexOf(token) > -1) found.push({ el: el, m: re.exec(el.placeholder) });
    });
    found.forEach(function (f) {
      if (!f.m) return;
      var action = f.m[1];
      var spec = SLOTS[action];
      if (!spec) {
        // body-section field sentinel (add:sections.N.data.FIELD): resolve the
        // slot through the containing section's component type
        var sm = /^add:sections\.\d+\.data\.(\w+)$/.exec(action);
        if (sm) {
          var holder = f.el.closest('section.wiki-section');
          var st = holder && sectionTypeOf(holder);
          if (st) spec = SECTION_SLOTS[st + '.' + sm[1]];
        }
      }
      if (!spec) return;
      var target = spec.root ? (f.el.closest(spec.root) || f.el) : f.el;
      if (!target || !target.parentNode) return;
      if (spec.kind === 'aside') {
        target.innerHTML = '<div class="pe-aside-empty"><div class="pe-aside-empty-label">Hero card · optional</div><div class="pe-add-row"></div></div>';
        var row = qs('.pe-add-row', target);
        row.appendChild(addBtn('addAside:card', '+ Call to Action Card'));
        row.appendChild(addBtn('addAside:feature', '+ Feature Card'));
      } else if (spec.kind === 'infobox') {
        target.className = 'wiki-infobox pe-empty';
        target.innerHTML = '<div class="pe-aside-empty"><div class="pe-aside-empty-label">Infobox · optional</div><div class="pe-add-row"></div></div>';
        qs('.pe-add-row', target).appendChild(addBtn(action, '+ infobox'));
      } else {
        if (spec.alsoPrev && target.previousElementSibling && target.previousElementSibling.matches(spec.alsoPrev)) {
          target.previousElementSibling.remove();
        }
        target.parentNode.replaceChild(spec.mini ? addBtn(action, spec.label, true) : addLine(action, spec.label), target);
      }
    });
  }

  // ── 2) editable text → wrap content in a .ce contenteditable span ──────────
  function wrapCE(root, path, excl) {
    if (!root) return;
    if (root.matches && root.matches('input')) { // input placeholder → editable span
      var span = document.createElement('span');
      span.className = root.className + ' ce';
      span.setAttribute('contenteditable', 'true');
      span.textContent = root.getAttribute('placeholder') || '';
      span.addEventListener('blur', function () { P(path, span); });
      root.parentNode.replaceChild(span, root);
      return;
    }
    var ce = document.createElement('span');
    ce.className = 'ce';
    ce.setAttribute('contenteditable', 'true');
    var moved = [];
    [].slice.call(root.childNodes).forEach(function (n) {
      if (n.nodeType === 1) {
        var cls = n.getAttribute && (n.getAttribute('class') || '');
        if (/(^| )pe-/.test(cls)) return;
        if (excl && excl.some(function (s) { return n.matches && n.matches(s); })) return;
      }
      moved.push(n);
    });
    if (moved.length) {
      root.insertBefore(ce, moved[0]);
      moved.forEach(function (n) { ce.appendChild(n); });
    } else {
      root.insertBefore(ce, root.firstChild);
    }
    ce.addEventListener('blur', function () { P(path, ce); });
  }

  // ── 3) removable → corner × (only when grammar says the field is optional) ─
  function makeRemovable(el, action, mini, sibling) {
    if (!el) return;
    var b = document.createElement('button');
    b.className = mini ? 'pe-tag-rm' : 'pe-remove';
    b.title = 'Remove';
    b.textContent = '×';
    b.onclick = function () { A(action); };
    if (sibling) { el.parentNode.insertBefore(b, el.nextSibling); }
    else { el.classList.add('pe-removable'); el.appendChild(b); }
  }

  // ── main ───────────────────────────────────────────────────────────────────
  window.__decorate = function () {
    var POLICY = window.__PE_POLICY || {};
    sentinelPass();

    // hero card controls (both treatments are "cards" — canon naming)
    var aside = qs('.wiki-hero-aside');
    if (aside && !qs('.pe-aside-empty', aside)) {
      var variant = qs('.wiki-hero-spotlight', aside) ? 'card' : 'feature';
      var ctrls = document.createElement('div');
      ctrls.className = 'pe-aside-ctrls';
      [['card', 'Call to Action Card'], ['feature', 'Feature Card']].forEach(function (v) {
        var c = document.createElement('button');
        c.className = 'pe-chip' + (variant === v[0] ? ' active' : '');
        c.textContent = v[1];
        c.onclick = function () { A('switchAside:' + v[0]); };
        ctrls.appendChild(c);
      });
      var rm = document.createElement('button');
      rm.className = 'pe-chip'; rm.textContent = 'remove';
      rm.onclick = function () { A('rmAside'); };
      ctrls.appendChild(rm);
      aside.insertBefore(ctrls, aside.firstChild);
    }

    // editable fields
    EDIT.forEach(function (b) { wrapCE(qs(b.sel), b.path, b.excl); });

    // lists: item cells editable; add/remove COMPUTED from grammar min/max
    LISTS.forEach(function (L) {
      var items = qsa(L.item);
      var bounds = ruleFor(L.path) || {};
      var fixed = bounds.min != null && bounds.min === bounds.max;
      var canRemove = !fixed && (bounds.min == null || items.length > bounds.min);
      var canAdd = !fixed && (bounds.max == null || items.length < bounds.max);
      items.forEach(function (item, i) {
        if (L.whole) {
          wrapCE(item, L.path + '.' + i);
          if (canRemove) makeRemovable(item, 'rm:' + L.path + '.' + i, L.mini);
        } else {
          for (var part in L.parts) wrapCE(qs(L.parts[part], item), L.path + '.' + i + '.' + part);
          if (canRemove) makeRemovable(item, 'rm:' + L.path + '.' + i, L.mini);
        }
      });
      if (canAdd && L.container && L.addLabel) {
        var cont = qs(L.container);
        if (cont) cont.appendChild(L.mini ? addBtn('push:' + L.path, L.addLabel, true) : addLine('push:' + L.path, L.addLabel));
      }
    });
    // infobox rows: dt/dd pairs (the [key, value] canon shape)
    var ibox = qs('.wiki-infobox');
    if (ibox && !ibox.classList.contains('pe-empty')) {
      var rowsRule = ruleFor('overview.infobox.rows') || {};
      var dts = qsa('.wiki-infobox-data > dt', ibox);
      dts.forEach(function (dt, i) {
        wrapCE(dt, 'overview.infobox.rows.' + i + '.0');
        var dd = dt.nextElementSibling;
        if (dd) {
          wrapCE(dd, 'overview.infobox.rows.' + i + '.1');
          if (rowsRule.min == null || dts.length > rowsRule.min) makeRemovable(dd, 'rm:overview.infobox.rows.' + i);
        }
      });
      if (rowsRule.max == null || dts.length < rowsRule.max) {
        var dl = qs('.wiki-infobox-data', ibox);
        if (dl) dl.parentNode.insertBefore(addLine('push:overview.infobox.rows', '+ row', '8px 16px'), dl.nextSibling);
      }
    }

    // removables — × attaches only where grammar says optional
    RM_ROOTS.forEach(function (r) {
      if (!optional(r.path)) return;
      var el = qs(r.sel);
      if (!el) return;
      if (r.path === 'overview.infobox' && el.classList.contains('pe-empty')) return;
      makeRemovable(el, 'rm:' + r.path, r.mini, r.sibling);
    });

    // locked canon (red box + padlock) — driven by the component's grammar
    // `locked` block (e.g. overview's locked eyebrow)
    var lockedOv = (POLICY.locked || {}).overview;
    if (lockedOv && lockedOv.eyebrow) {
      var eyebrow = qs('section[data-section="overview"] .wiki-section-eyebrow');
      if (eyebrow) {
        eyebrow.classList.add('pe-canon');
        var lk = document.createElement('span');
        lk.className = 'pe-lock';
        lk.title = 'Locked — the canonical section label, can’t be edited or removed';
        lk.innerHTML = LOCK;
        eyebrow.appendChild(lk);
      }
    }

    // section tone toolbar (glass pill) — tones from the field's grammar enum
    function toneBar(secEl, polPath, mkAction, extra) {
      var toneRule = ruleFor(polPath) || {};
      var tones = toneRule.enum || ['a', 'b', 'special'];
      var cur = secEl.getAttribute('data-tone');
      var bar = document.createElement('div');
      bar.className = 'pe-sec-tools';
      bar.appendChild(document.createTextNode('tone '));
      tones.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'pe-tonebtn' + (cur === t ? ' on' : '');
        b.textContent = t;
        b.onclick = function () { A(mkAction(t)); };
        bar.appendChild(b);
      });
      (extra || []).forEach(function (el) { bar.appendChild(el); });
      secEl.classList.add('pe-sec');
      secEl.insertBefore(bar, secEl.firstChild);
    }

    var sec = qs('section[data-section="overview"]');
    if (sec) toneBar(sec, 'overview.tone', function (t) { return 'setTone:' + t; });

    // ── body sections (the ordered, contributor-added list after the locked
    // hero+overview). DOM order maps 1:1 to doc.sections — every wiki-section
    // after the overview is body section i. ──
    var bodySecs = qsa('body > section.wiki-section').filter(function (s) {
      return s.getAttribute('data-section') !== 'overview';
    });
    var REG_SECTIONS = (window.__PE_REGISTRY || {}).sections || {};
    var DOC = null;
    try { DOC = window.__PE_DOC || (window.parent.__peDoc && window.parent.__peDoc()); } catch (e) {}
    bodySecs.forEach(function (secEl, i) {
      // identify the section's grammar type from its canonical class
      var type = sectionTypeOf(secEl);
      if (!type) return;
      var prefix = 'sections.' + i + '.data.';
      var reg = REG_SECTIONS[type + '-section'] || {};
      var sdata = (DOC && DOC.sections && DOC.sections[i] && DOC.sections[i].data) || {};

      // tone + remove (sections are min:0 per page_types → always removable)
      var extras = [];
      if (type === 'catalog') {
        // unit + note live INSIDE the locked derived summary line — they get
        // toolbar editors instead of in-place boxes (counts stay locked)
        var unitChip = document.createElement('span');
        unitChip.className = 'pe-chip';
        unitChip.appendChild(document.createTextNode('unit: '));
        var unitCe = document.createElement('span');
        unitCe.className = 'ce';
        unitCe.setAttribute('contenteditable', 'true');
        unitCe.textContent = sdata.unit != null ? sdata.unit : (R('catalog.unit').blank || '');
        (function (p, el) { el.addEventListener('blur', function () { P(p, el); }); })(prefix + 'unit', unitCe);
        unitChip.appendChild(unitCe);
        extras.push(unitChip);
        if (sdata.note != null) {
          var noteChip = document.createElement('span');
          noteChip.className = 'pe-chip';
          noteChip.appendChild(document.createTextNode('note: '));
          var noteCe = document.createElement('span');
          noteCe.className = 'ce';
          noteCe.setAttribute('contenteditable', 'true');
          noteCe.textContent = sdata.note;
          (function (p, el) { el.addEventListener('blur', function () { P(p, el); }); })(prefix + 'note', noteCe);
          noteChip.appendChild(noteCe);
          var noteRm = document.createElement('button');
          noteRm.className = 'pe-tag-rm';
          noteRm.style.opacity = '1';
          noteRm.textContent = '×';
          noteRm.title = 'Remove note';
          (function (p) { noteRm.onclick = function () { A('rm:' + p); }; })(prefix + 'note');
          noteChip.appendChild(noteRm);
          extras.push(noteChip);
        } else {
          extras.push(addBtn('add:' + prefix + 'note', '+ note', true));
        }
      }
      var rmChip = document.createElement('button');
      rmChip.className = 'pe-chip';
      rmChip.textContent = 'remove section';
      rmChip.onclick = function () { A('secRm:' + i); };
      extras.push(rmChip);
      toneBar(secEl, type + '.tone', function (t) { return 'secTone:' + i + ':' + t; }, extras);

      // locked chrome, from the REGISTRY: the eyebrow label and the
      // auto-derived summary are canon — red box + padlock
      if (reg.eyebrow) {
        var eb = qs('.wiki-section-eyebrow', secEl);
        if (eb) {
          eb.classList.add('pe-canon');
          var elk = document.createElement('span');
          elk.className = 'pe-lock';
          elk.title = 'Locked — the canonical section label, can’t be edited or removed';
          elk.innerHTML = LOCK;
          eb.appendChild(elk);
        }
      }
      if (reg.summary === 'derived') {
        var sum = qs('.cat-summary', secEl);
        if (sum) {
          sum.classList.add('pe-canon');
          var slk = document.createElement('span');
          slk.className = 'pe-lock';
          slk.title = 'Auto-derived from the catalog data — never hand-typed';
          slk.innerHTML = LOCK;
          sum.appendChild(slk);
        }
      }

      // ── catalog: the full flat-field editing surface ──
      if (type === 'catalog') {
        wrapCE(qs('.wiki-section-title', secEl), prefix + 'title');
        var fn = qs('.cat-footnote', secEl);
        if (fn) { wrapCE(fn, prefix + 'footnote'); makeRemovable(fn, 'rm:' + prefix + 'footnote'); }

        // categories: name · ribbon (add/edit/tone/×) · note · items · ×
        qsa('.cat-masonry > .cat-card', secEl).forEach(function (card, j) {
          var cpre = prefix + 'categories.' + j + '.';
          var cdata = (sdata.categories && sdata.categories[j]) || {};
          wrapCE(qs('.cat-card-title', card), cpre + 'name');
          makeRemovable(card, 'rm:' + prefix + 'categories.' + j);

          var rib = qs('.cat-ribbon', card);
          if (rib) {
            var rspan = qs('span', rib);
            if (typeof cdata.ribbon === 'string') {
              wrapCE(rspan, cpre + 'ribbon');     // legacy string form — text only
            } else {
              wrapCE(rspan, cpre + 'ribbon.text');
              // tone: cycle through the grammar enum (accent/gone)
              var tones = R('catalog.categories[].ribbon.tone').enum || [];
              var curTone = (cdata.ribbon && cdata.ribbon.tone) || (R('catalog.categories[].ribbon.tone').blank || tones[0]);
              if (tones.length) {
                var tbtn = document.createElement('button');
                tbtn.className = 'pe-tag-rm';
                tbtn.style.width = 'auto';
                tbtn.style.borderRadius = '4px';
                tbtn.style.padding = '0 4px';
                tbtn.textContent = curTone;
                tbtn.title = 'Ribbon tone — click to cycle';
                (function (p, list, cur) { tbtn.onclick = function () { A('set:' + p + ':' + list[(list.indexOf(cur) + 1) % list.length]); }; })(cpre + 'ribbon.tone', tones, curTone);
                rib.appendChild(tbtn);
              }
            }
            var rrm = document.createElement('button');
            rrm.className = 'pe-tag-rm';
            rrm.textContent = '×';
            rrm.title = 'Remove ribbon';
            (function (p) { rrm.onclick = function () { A('rm:' + p); }; })(cpre + 'ribbon');
            rib.appendChild(rrm);
          } else {
            card.insertBefore(addBtn('add:' + cpre + 'ribbon', '+ ribbon', true), card.firstChild);
          }

          // category note: editable suffix inside the derived count line
          var cnt = qs('.cat-card-count', card);
          if (cnt) {
            if (cdata.note != null) {
              var node = null;
              for (var q = cnt.childNodes.length - 1; q >= 0; q--) {
                if (cnt.childNodes[q].nodeType === 3 && cnt.childNodes[q].nodeValue.indexOf('·') > -1) { node = cnt.childNodes[q]; break; }
              }
              if (node) {
                var noteText = node.splitText(node.nodeValue.lastIndexOf('·') + 1);
                var ceN = document.createElement('span');
                ceN.className = 'ce';
                ceN.setAttribute('contenteditable', 'true');
                cnt.insertBefore(ceN, noteText);
                ceN.appendChild(noteText);
                (function (p, el) { el.addEventListener('blur', function () { P(p, el); }); })(cpre + 'note', ceN);
                var nrm = document.createElement('button');
                nrm.className = 'pe-tag-rm';
                nrm.textContent = '×';
                nrm.title = 'Remove note';
                (function (p) { nrm.onclick = function () { A('rm:' + p); }; })(cpre + 'note');
                cnt.appendChild(nrm);
              }
            } else {
              cnt.appendChild(addBtn('add:' + cpre + 'note', '+ note', true));
            }
          }

          // items: pill face editable, per-item ×, + item
          qsa('.cat-pill', card).forEach(function (pill, k) {
            wrapCE(pill, cpre + 'items.' + k + '.name');
            makeRemovable(pill, 'rm:' + cpre + 'items.' + k, true);
          });
          var pillsWrap = qs('.cat-card-pills', card);
          if (pillsWrap) pillsWrap.appendChild(addBtn('push:' + cpre + 'items', '+ item', true));
        });

        // + category — after the masonry, where the new card lands
        var mas = qs('.cat-masonry', secEl);
        if (mas) mas.parentNode.insertBefore(addLine('push:' + prefix + 'categories', '+ category'), mas.nextSibling);
      }
    });

    // add-section seams (dotted circle +): BELOW the overview (insert at 0)
    // and after every body section (insert at i+1). Never above the hero or
    // between hero and overview — both locked-first per the canon.
    function seamAfter(el, index) {
      var seam = document.createElement('div');
      seam.className = 'pe-add-section';
      seam.innerHTML = '<span class="pe-add-line"></span><button class="pe-add-dot" title="Add section">+</button><span class="pe-add-line"></span>';
      seam.onclick = function () { try { window.parent.__peOpenPicker(index); } catch (e) {} };
      el.parentNode.insertBefore(seam, el.nextSibling);
    }
    if (sec) seamAfter(sec, 0);
    bodySecs.forEach(function (s, i) { seamAfter(s, i + 1); });

    if (window.__retag) window.__retag();
  };
})();
