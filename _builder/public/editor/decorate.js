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
    'add:overview.infobox.badge':    { root: '.wiki-infobox-badge', label: '+ badge', cls: 'pe-add-badge' },
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
    // jump-addressable for list-count readiness items ("at least one …")
    var pm = /^push:(.+)$/.exec(action); if (pm) b.setAttribute('data-pe-addpath', pm[1]);
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
        var rep = spec.mini ? addBtn(action, spec.label, true) : addLine(action, spec.label, spec.pad);
        if (spec.cls) rep.classList.add(spec.cls);
        target.parentNode.replaceChild(rep, target);
      }
    });
  }

  // ── 2) editable text → wrap content in a .ce contenteditable span ──────────
  // the placeholder text for a data path = its grammar blank (or item_blank for
  // list items) — used to mark fields for placeholder select-all. Body-section
  // paths (sections.N.data.X) resolve through the section's component type.
  function phFor(path) {
    var key = path;
    var m = /^sections\.(\d+)\.data\.(.+)$/.exec(path);
    if (m) { var doc = getDoc(); var t = doc && doc.sections && doc.sections[+m[1]] && doc.sections[+m[1]].type; if (t) key = t + '.' + m[2]; }
    var r = ruleFor(key) || {};   // ruleFor maps numeric list indexes → []
    var ph = r.blank != null ? r.blank : r.item_blank;
    return (ph != null && typeof ph === 'string') ? ph : null;
  }
  function wrapCE(root, path, excl) {
    if (!root) return;
    var ph = phFor(path);
    if (root.matches && root.matches('input')) { // input placeholder → editable span
      var span = document.createElement('span');
      span.className = root.className + ' ce';
      span.setAttribute('contenteditable', 'true');
      span.setAttribute('data-pe-path', path);   // jump-addressable (readiness markers)
      span.textContent = root.getAttribute('placeholder') || '';
      if (ph != null) span.setAttribute('data-ph', ph);
      span.addEventListener('blur', function () { P(path, span); });
      root.parentNode.replaceChild(span, root);
      return;
    }
    var ce = document.createElement('span');
    ce.className = 'ce';
    ce.setAttribute('contenteditable', 'true');
    ce.setAttribute('data-pe-path', path);   // jump-addressable (readiness markers)
    if (ph != null) ce.setAttribute('data-ph', ph);
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
    armDelete(b, function () { A(action); });
    if (sibling) { el.parentNode.insertBefore(b, el.nextSibling); }
    else { el.classList.add('pe-removable'); el.appendChild(b); }
  }

  // ── glass control system (liquid-glass chrome — the standing UI direction) ──
  var CICON = {
    palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    flag: '<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>',
    hash: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v6h6"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  };
  var csvg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
  function dockBtn(icon, tip, cls, onclick) {
    var b = document.createElement('button');
    b.className = 'cc-btn' + (cls ? ' ' + cls : '');
    b.setAttribute('data-tip', tip);   // hover glass tooltip explainer
    b.innerHTML = icon; b.onclick = onclick;
    return b;
  }

  // floating glass popover (one at a time)
  var pePop = null;
  function closePop() { if (pePop) { var p = pePop; pePop = null; if (p.__onClose) { try { p.__onClose(); } catch (e) {} } p.classList.remove('in'); setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 180); } }
  function overlap(L, T, w, h, r) { var pad = 8; return !(L + w < r.left - pad || L > r.right + pad || T + h < r.top - pad || T > r.bottom + pad); }
  function placeFloat(el, btn, avoid) {
    var r = btn.getBoundingClientRect(); el.style.left = '0px'; el.style.top = '0px';
    var w = el.offsetWidth, h = el.offsetHeight;
    var left = r.left + r.width / 2 - w / 2, top = r.top - h - 12;
    if (top < 10) top = r.bottom + 12;
    left = Math.max(10, Math.min(left, window.innerWidth - w - 10));
    if (avoid) { var av = avoid.getBoundingClientRect();
      if (overlap(left, top, w, h, av)) { var tl = av.left - w - 12;
        if (tl >= 10 && !overlap(tl, top, w, h, av)) left = tl;
        else { top = av.bottom + 12; left = Math.max(10, Math.min(left, window.innerWidth - w - 10)); } } }
    el.style.left = left + 'px'; el.style.top = top + 'px';
  }
  function placeLeft(el, btn) {
    var r = btn.getBoundingClientRect(); el.style.left = '0px'; el.style.top = '0px';
    var w = el.offsetWidth, h = el.offsetHeight; var left = r.left - w - 12; if (left < 10) left = r.right + 12;
    el.style.left = left + 'px'; el.style.top = Math.max(10, Math.min(r.top + r.height / 2 - h / 2, window.innerHeight - h - 10)) + 'px';
  }
  function openPop(btn, accent, html, opts) {
    closePop(); opts = opts || {};
    var pop = document.createElement('div'); pop.className = 'cc-pop' + (opts.cls ? ' ' + opts.cls : '');
    if (accent) pop.style.setProperty('--cat-color', accent);
    pop.innerHTML = html; document.body.appendChild(pop);
    pop.__onClose = opts.onClose;   // fired once when the popover is dismissed
    (opts.place === 'left' ? placeLeft : placeFloat)(pop, btn, opts.avoid);
    (window.requestAnimationFrame || function (f) { setTimeout(f, 0); })(function () { pop.classList.add("in"); });
    pePop = pop; return pop;
  }
  // ── two-click delete confirm (mockup Direction 2 — the ✕ trigger arms in
  // place into a red "✓ Delete" + a grey undo; a 2nd click commits, undo /
  // outside-click / Escape backs out). EVERY delete in the kit routes through
  // armDelete(trigger, doDelete) so the behaviour is uniform. ──
  var CHK_SVG = csvg('<polyline points="20 6 9 17 4 12"/>');
  var UNDO_SVG = csvg('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>');
  var delConfirm = null;
  function closeDelConfirm() {
    if (!delConfirm) return;
    var c = delConfirm; delConfirm = null;
    if (c._trigger) c._trigger.classList.remove('pe-del-armed');
    if (c.parentNode) c.parentNode.removeChild(c);
  }
  function openDelConfirm(trigger, doDelete) {
    closeDelConfirm(); closePop();
    var c = document.createElement('div'); c.className = 'pe-del-confirm';
    c.innerHTML = '<button type="button" class="pe-del-yes">' + CHK_SVG + ' Delete</button><button type="button" class="pe-del-no" title="Keep">' + UNDO_SVG + '</button>';
    c._trigger = trigger; document.body.appendChild(c);
    trigger.classList.add('pe-del-armed');
    var r = trigger.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
    c.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px';
    c.style.top = Math.max(8, Math.min(r.top + r.height / 2 - h / 2, window.innerHeight - h - 8)) + 'px';
    qs('.pe-del-yes', c).onclick = function (e) { e.stopPropagation(); var dd = doDelete; closeDelConfirm(); dd(); };
    qs('.pe-del-no', c).onclick = function (e) { e.stopPropagation(); closeDelConfirm(); };
    delConfirm = c;
  }
  function armDelete(trigger, doDelete) {
    trigger.onclick = function (e) { e.stopPropagation(); e.preventDefault(); openDelConfirm(trigger, doDelete); };
  }
  document.addEventListener('mousedown', function (e) { if (delConfirm && !delConfirm.contains(e.target) && !(delConfirm._trigger && delConfirm._trigger.contains(e.target))) closeDelConfirm(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDelConfirm(); });

  document.addEventListener('mousedown', function (e) { if (pePop && !pePop.contains(e.target) && !(e.target.closest && e.target.closest('.cc-btn,.pe-st-chip,.im-info-chip,.gpill-menu,.pe-datefield'))) closePop(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });

  // PLACEHOLDER SELECT-ALL (general rule across the build kit): a field still
  // holds its placeholder when its text === its grammar blank. First click into
  // such a field selects all so you just type to replace it; once filled (text
  // ≠ blank) it clicks normally. Fields carry their blank in data-ph.
  function selectAllCE(el) {
    try {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { el.select(); return; }
      var r = document.createRange(); r.selectNodeContents(el);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (e) {}
  }
  document.addEventListener('focusin', function (e) {
    var el = e.target; if (!el || !el.getAttribute) return;
    var ph = el.getAttribute('data-ph'); if (ph == null) return;
    var val = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : el.textContent;
    if ((val || '').trim() !== ph.trim()) return;   // already filled → normal
    setTimeout(function () { selectAllCE(el); }, 0); // defer past the click's caret placement
  });

  // group-pill action menu (mockup style): a small glass popover with
  // Strike (object pills only) + Remove
  function openPillPop(btn, accent, strikePath, isStruck, removePath) {
    var html = (strikePath ? '<button class="cc-row" data-a="strike">' + (isStruck ? 'Remove strike' : 'Strike through') + '</button>' : '') +
      '<button class="cc-row danger" data-a="remove">Remove</button>';
    var pop = openPop(btn, accent, html, { cls: 'pill-pop' });
    var st = pop.querySelector('[data-a="strike"]'); if (st) st.onclick = function () { closePop(); A('set:' + strikePath + ':' + (!isStruck)); };
    pop.querySelector('[data-a="remove"]').onclick = function () { closePop(); A('rm:' + removePath); };
  }

  // centre the item-editor modal card in the VISIBLE viewport (the canvas is a
  // tall iframe scrolled by the parent — fixed/inset:0 alone would mis-centre)
  function centreModal(card) {
    try {
      var fr = window.frameElement, ph = (window.parent && window.parent.innerHeight) || window.innerHeight;
      var rect = fr.getBoundingClientRect();
      var visTop = Math.max(0, -rect.top);
      var visH = Math.min(rect.bottom, ph) - Math.max(rect.top, 0); if (visH <= 0) visH = ph;
      card.style.top = (visTop + visH / 2) + 'px';
      var sc = card.querySelector('.modal-scroll, .tl-modal-body'); if (sc) sc.style.maxHeight = (visH - 44) + 'px';
    } catch (e) { card.style.top = '50%'; }
  }
  var getDoc = function () { try { return window.__PE_DOC || (window.parent.__peDoc && window.parent.__peDoc()); } catch (e) { return null; } };

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
      armDelete(rm, function () { A('rmAside'); });
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
      // add-controls (+ row, + badge) go directly BELOW the infobox bounds, so
      // the infobox itself renders exactly as it will on the live site (no
      // editing chrome inside it).
      var ibAdds = document.createElement('div'); ibAdds.className = 'pe-infobox-adds';
      if (rowsRule.max == null || dts.length < rowsRule.max) ibAdds.appendChild(addBtn('push:overview.infobox.rows', '+ row', true));
      // the "+ badge" slot was placed INSIDE the infobox by sentinelPass (when
      // the badge is absent) — relocate it into the add bar below.
      var badgeSlot = qs('.pe-add-badge', ibox);
      if (badgeSlot) { badgeSlot.remove(); ibAdds.appendChild(addBtn('add:overview.infobox.badge', '+ badge', true)); }
      if (ibAdds.children.length) ibox.parentNode.insertBefore(ibAdds, ibox.nextSibling);
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
      var tones = toneRule.enum || [];   // derived from grammar — never restate the values
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
        unitCe.setAttribute('data-ph', R('catalog.unit').blank || 'item');
        // unit feeds the derived summary line — commit + re-render so it refreshes
        (function (p, el) { el.addEventListener('blur', function () { P(p, el); A('commit'); }); })(prefix + 'unit', unitCe);
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
          noteCe.setAttribute('data-ph', R('catalog.note').blank || 'Note');
          (function (p, el) { el.addEventListener('blur', function () { P(p, el); A('commit'); }); })(prefix + 'note', noteCe);
          noteChip.appendChild(noteCe);
          var noteRm = document.createElement('button');
          noteRm.className = 'pe-tag-rm';
          noteRm.style.opacity = '1';
          noteRm.textContent = '×';
          noteRm.title = 'Remove note';
          (function (p) { armDelete(noteRm, function () { A('rm:' + p); }); })(prefix + 'note');
          noteChip.appendChild(noteRm);
          extras.push(noteChip);
        } else {
          extras.push(addBtn('add:' + prefix + 'note', '+ note', true));
        }
      }
      // reorder: body sections move freely among themselves (canon — only
      // hero+overview are position-locked)
      var mkChip = function (label, action, title) {
        var c = document.createElement('button');
        c.className = 'pe-chip';
        c.textContent = label;
        if (title) c.title = title;
        c.onclick = function () { A(action); };
        return c;
      };
      if (i > 0) extras.push(mkChip('↑', 'secMove:' + i + ':up', 'Move section up'));
      if (i < bodySecs.length - 1) extras.push(mkChip('↓', 'secMove:' + i + ':down', 'Move section down'));
      var rmSecChip = mkChip('remove section', 'secRm:' + i);
      (function (ii) { armDelete(rmSecChip, function () { A('secRm:' + ii); }); })(i);
      extras.push(rmSecChip);
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

      // ── catalog: the full editing surface (liquid-glass controls) ──
      if (type === 'catalog') {
        // skin-derived swatch palette (read once from the loaded skin)
        var swatches = window.__peSwatches;
        if (swatches === undefined) {
          swatches = []; var bcs = getComputedStyle(document.body);
          for (var sn = 1; sn <= 24; sn++) { var sv = (bcs.getPropertyValue('--wiki-palette-' + sn) || '').trim(); if (sv) swatches.push({ n: sn, v: sv }); }
          window.__peSwatches = swatches;
        }

        // ── the CANONICAL item modal, editor-driven (content = the include's
        // own hidden detail markup, moved in; chrome restyled to glass) ──
        var detRoot = qs('.cat-details', secEl);
        var modal = qs('[data-catalog-modal]', secEl);
        var modalBody = modal && qs('[data-modal-body]', modal);
        var modalCard = modal && qs('.modal-card', modal);
        var modalRb = modal && qs('[data-modal-ribbon]', modal);
        var closeModal = function () {
          var openDet = modal && qs('[data-pe-detail-open]', modal);
          if (openDet && detRoot) { detRoot.appendChild(openDet); openDet.removeAttribute('data-pe-detail-open'); }
          if (modal) modal.classList.remove('open');
          window.__peOpenItem = null; closePop();
        };
        var openItem = function (j, k, pill) {
          if (!modal || !modalBody) return;
          var det = qs('[id="d-' + j + '-' + k + '"]', secEl); if (!det) return;
          if (modalCard && pill) modalCard.style.setProperty('--cat-color', pill.getAttribute('data-color') || '');
          if (modalRb) {
            // read the ribbon from the CURRENT doc — the pill's data-ribbon
            // attr goes stale after a live (PV) ribbon text/tone edit
            var dd = getDoc(); var rib = (((((dd || {}).sections || [])[i] || {}).data || {}).categories || [])[j];
            rib = rib && rib.ribbon;
            var rbText = rib ? (typeof rib === 'object' ? rib.text : rib) : null;
            var rbGone = !!(rib && typeof rib === 'object' && rib.tone === 'gone');
            // canon: the rotated banner needs an inner <span> (catalog.html L92)
            modalRb.innerHTML = '';
            if (rbText) { var rsp = document.createElement('span'); rsp.textContent = rbText; modalRb.appendChild(rsp); }
            modalRb.classList.toggle('ribbon-gone', rbGone);
            if (modalCard) modalCard.classList.toggle('has-ribbon', !!rbText);
          }
          det.setAttribute('data-pe-detail-open', '1'); modalBody.appendChild(det);
          modal.classList.add('open'); if (modalCard) centreModal(modalCard);
          window.__peOpenItem = { s: i, j: j, k: k };
        };
        if (modal) {
          var cbn = qs('[data-modal-close]', modal); if (cbn) cbn.onclick = closeModal;
          modal.onmousedown = function (e) { if (e.target === modal) closeModal(); };
        }

        // ── popovers (defined before use) ──
        var openColorPop = function (btn, cpre, accent, curColor) {
          var html = '<div class="cc-pop-label">Category colour</div><div class="cc-swatches">' +
            swatches.map(function (sw) { return '<button class="cc-sw' + (Number(curColor) === sw.n ? ' sel' : '') + '" style="background:' + sw.v + '" data-i="' + sw.n + '"></button>'; }).join('') +
            '<button class="cc-sw auto' + (curColor == null ? ' sel' : '') + '" data-auto title="Auto-cycle the palette">A</button></div>';
          var pop = openPop(btn, accent, html);
          qsa('.cc-sw[data-i]', pop).forEach(function (s) { s.onclick = function () { closePop(); A('set:' + cpre + 'color:' + s.getAttribute('data-i')); }; });
          var au = qs('[data-auto]', pop); if (au) au.onclick = function () { closePop(); A('rm:' + cpre + 'color'); };
        };
        var openRibbonPop = function (btn, cpre, accent, rb, card, j) {
          if (rb == null) { window.__peReopen = { s: i, j: j, kind: 'ribbon' }; A('add:' + cpre + 'ribbon'); return; }
          var isObj = (typeof rb === 'object');
          var tones = (R('catalog.categories[].ribbon.tone').enum) || [];   // derived from grammar — never restate the values
          var tone = isObj ? (rb.tone || 'accent') : 'accent';
          var html = '<div class="cc-pop-label">Ribbon</div><div class="cc-ribbon-field"><input type="text" placeholder="Ribbon text">' +
            (isObj ? '<div class="cc-tone">' + tones.map(function (t) { return '<button data-t="' + t + '" class="' + (t === tone ? 'on' : '') + '">' + (t === 'gone' ? 'Grey' : t) + '</button>'; }).join('') + '</div>' : '') +
            '<button class="cc-rm">Remove ribbon</button></div>';
          var pop = openPop(btn, accent, html, { avoid: qs('.cat-ribbon', card) });
          var input = qs('input', pop); input.value = isObj ? (rb.text || '') : rb;
          input.setAttribute('data-ph', ((R('catalog.categories[].ribbon').blank) || {}).text || 'Ribbon');
          input.addEventListener('input', function () { PV(cpre + (isObj ? 'ribbon.text' : 'ribbon'), input.value); var sp = qs('.cat-ribbon span', card); if (sp) sp.textContent = input.value; });
          qsa('.cc-tone [data-t]', pop).forEach(function (b) { b.onclick = function () { var t = b.getAttribute('data-t'); PV(cpre + 'ribbon.tone', t); var rib = qs('.cat-ribbon', card); if (rib) rib.classList.toggle('ribbon-gone', t === 'gone'); qsa('.cc-tone [data-t]', pop).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
          qs('.cc-rm', pop).onclick = function () { closePop(); A('rm:' + cpre + 'ribbon'); };
        };
        var stEnum = (R('catalog.categories[].items[].status').enum) || [];
        var openStatusPop = function (btn, ipre, cur, accent) {
          var html = '<div class="cc-pop-label">Status</div>' +
            stEnum.map(function (s) { return '<button class="cc-status st-' + s + (s === cur ? ' sel' : '') + '" data-s="' + s + '">' + s + '</button>'; }).join('') +
            '<button class="cc-status none' + (!cur ? ' sel' : '') + '" data-s="">None</button>';
          var pop = openPop(btn, accent, html, { place: 'left', cls: 'status-pop' });
          qsa('.cc-status', pop).forEach(function (b) { b.onclick = function () { var s = b.getAttribute('data-s'); closePop(); A(s ? 'set:' + ipre + 'status:' + s : 'rm:' + ipre + 'status'); }; });
        };

        wrapCE(qs('.wiki-section-title', secEl), prefix + 'title');
        var fn = qs('.cat-footnote', secEl);
        if (fn) { wrapCE(fn, prefix + 'footnote'); makeRemovable(fn, 'rm:' + prefix + 'footnote'); }

        // ── per category card: name ce + glass dock ──
        qsa('.cat-masonry > .cat-card', secEl).forEach(function (card, j) {
          var cpre = prefix + 'categories.' + j + '.';
          var cdata = (sdata.categories && sdata.categories[j]) || {};
          var accent = getComputedStyle(card).getPropertyValue('--cat-color');
          wrapCE(qs('.cat-card-title', card), cpre + 'name');

          // category NOTE — a dashed chip after the count line (NOT a dock
          // control): "+ note" to add · editable text + corner × when present.
          // The canon renders the note inline in the count line ("· note"); in
          // the editor we lift it OUT into the chip to avoid showing it twice.
          var cnt = qs('.cat-card-count', card);
          if (cnt) {
            var noteChip;
            if (cdata.note != null) {
              // canon: "N items · note". Keep "N items ·", lift the note text
              // into an inline chip right after the dot.
              for (var q = cnt.childNodes.length - 1; q >= 0; q--) {
                var nv = cnt.childNodes[q];
                if (nv.nodeType === 3 && nv.nodeValue.indexOf('·') > -1) { nv.nodeValue = nv.nodeValue.slice(0, nv.nodeValue.lastIndexOf('·') + 1); break; }
              }
              noteChip = document.createElement('span'); noteChip.className = 'pe-note-chip has';
              var ceN = document.createElement('span'); ceN.className = 'ce'; ceN.setAttribute('contenteditable', 'true'); ceN.textContent = cdata.note; ceN.setAttribute('data-ph', (R('catalog.categories[].note').blank) || 'Note');
              (function (p, el) { el.addEventListener('blur', function () { P(p, el); }); })(cpre + 'note', ceN);
              noteChip.appendChild(ceN);
              makeRemovable(noteChip, 'rm:' + cpre + 'note');     // corner ×
            } else {
              noteChip = document.createElement('button'); noteChip.className = 'pe-note-chip'; noteChip.textContent = '+ note';
              (function (p) { noteChip.onclick = function () { A('add:' + p); }; })(cpre + 'note');
            }
            cnt.appendChild(noteChip);   // INLINE in the count line (canon position)
          }

          // the glass dock (bottom-right): colour · ribbon · remove
          var dock = document.createElement('div'); dock.className = 'cc-dock';
          (function (cp, ac, cd) { dock.appendChild(dockBtn('<span class="cc-swatch"></span>', 'Change colour', '', function () { openColorPop(this, cp, ac, cd.color); })); })(cpre, accent, cdata);
          var sep = document.createElement('span'); sep.className = 'cc-sep'; dock.appendChild(sep);
          (function (cp, ac, cd, jj) { dock.appendChild(dockBtn(csvg(CICON.flag), cd.ribbon ? 'Edit ribbon' : 'Add a ribbon', cd.ribbon ? 'on' : '', function () { openRibbonPop(this, cp, ac, cd.ribbon == null ? null : cd.ribbon, card, jj); })); })(cpre, accent, cdata, j);
          (function (jj) { var tb = dockBtn(csvg(CICON.trash), 'Delete entire category', 'danger', null); armDelete(tb, function () { closePop(); A('rm:' + prefix + 'categories.' + jj); }); dock.appendChild(tb); })(j);
          card.appendChild(dock);

          // pills → open the item editor; "+ item". The pill is also the
          // readiness JUMP SCOPE for everything under this item (its name + the
          // pills it owns), so jumping to a modal-only field opens the modal.
          qsa('.cat-pill', card).forEach(function (pill, k) {
            pill.style.cursor = 'pointer';
            pill.setAttribute('data-pe-opens', '1');
            pill.setAttribute('data-pe-scope', cpre + 'items.' + k);
            (function (jj, kk, pp) { pp.addEventListener('click', function () { openItem(jj, kk, pp); }); })(j, k, pill);
          });
          var pillsWrap = qs('.cat-card-pills', card);
          if (pillsWrap) { var addP = addBtn('push:' + cpre + 'items', '+ item', true); addP.className = 'cat-pill cat-add-pill'; pillsWrap.appendChild(addP); }
        });

        // ── item detail content (canonical hidden divs) ──
        qsa('.cat-details > div', secEl).forEach(function (det) {
          var idm = /^d-(\d+)-(\d+)$/.exec(det.id || ''); if (!idm) return;
          var dj = Number(idm[1]), dk = Number(idm[2]);
          var ipre = prefix + 'categories.' + dj + '.items.' + dk + '.';
          var idata = (((sdata.categories || [])[dj] || {}).items || [])[dk] || {};
          var head = qs('.modal-headrow', det);
          var mAccent = modalCard ? getComputedStyle(modalCard).getPropertyValue('--cat-color') : '';

          // title = item.name — the SAME field is shown on the card pill, so a
          // rename must re-render (P alone only updates the modal). Commit on
          // blur; the open modal is re-opened by the __peOpenItem pass below.
          var mTitleEl = qs('.modal-title', det);
          wrapCE(mTitleEl, ipre + 'name');
          var mTitleCe = mTitleEl && mTitleEl.querySelector('.ce');
          if (mTitleCe) mTitleCe.addEventListener('blur', function () { A('commit'); });
          wrapCE(qs('.modal-desc', det), ipre + 'desc');

          // status chip → glass popover (the enum is the only styled set)
          var stChip = qs('.chip[class*="st-"]', det);
          if (stChip) { stChip.classList.add('pe-st-chip'); (function () { stChip.onclick = function () { openStatusPop(stChip, ipre, idata.status, mAccent); }; })(); }
          else if (head) { var gs = document.createElement('button'); gs.className = 'pe-mini-add'; gs.textContent = '+ status'; gs.onclick = function () { openStatusPop(gs, ipre, null, mAccent); }; head.appendChild(gs); }

          // info chip → inline ce (freeform); + info when absent
          var infoChip = qs('.chip.info', det);
          if (infoChip) { wrapCE(infoChip, ipre + 'info'); makeRemovable(infoChip, 'rm:' + ipre + 'info', true); }
          else if (head) head.appendChild(addBtn('add:' + ipre + 'info', '+ info', true));

          // pill groups: label, pills (string or {text,struck}), strike + remove, + pill
          qsa('.modal-group-label', det).forEach(function (gl, g) {
            wrapCE(gl, ipre + 'groups.' + g + '.label');
            (function (p) { makeRemovable(gl, 'rm:' + p, true); })(ipre + 'groups.' + g);
            var pillsDiv = gl.nextElementSibling;
            if (pillsDiv) {
              qsa('.gpill', pillsDiv).forEach(function (gp, pm) {
                var ppath = ipre + 'groups.' + g + '.pills.' + pm;
                var pdata = (((idata.groups || [])[g] || {}).pills || [])[pm];
                var isObj = pdata && typeof pdata === 'object';
                wrapCE(gp, isObj ? ppath + '.text' : ppath);
                var menu = document.createElement('button'); menu.className = 'gpill-menu'; menu.textContent = '⋯'; menu.title = 'Options'; menu.setAttribute('contenteditable', 'false');
                (function (p, struck, obj) { menu.onclick = function (e) { e.stopPropagation(); openPillPop(menu, mAccent, obj ? p + '.struck' : null, !!struck, p); }; })(ppath, isObj && pdata.struck, isObj);
                gp.appendChild(menu);
              });
              pillsDiv.appendChild(addBtn('push:' + ipre + 'groups.' + g + '.pills', '+ item', true));
            }
          });

          // callout + notes
          var co = qs('.modal-callout', det);
          if (co) { wrapCE(qs('.modal-callout-label', co), ipre + 'callout.label'); wrapCE(qs('.modal-callout-text', co), ipre + 'callout.text'); makeRemovable(co, 'rm:' + ipre + 'callout'); }
          var noEl = qs('.modal-note', det);
          if (noEl) { wrapCE(noEl, ipre + 'notes'); makeRemovable(noEl, 'rm:' + ipre + 'notes'); }

          // CTA: label locked; the LINK is the contributor field (inline editor)
          var cta = qs('.modal-cta', det);
          if (cta) {
            cta.classList.add('pe-canon');
            var clk = document.createElement('span'); clk.className = 'pe-lock'; clk.title = 'Locked canonical label — set the link instead'; clk.innerHTML = LOCK; cta.appendChild(clk);
            if (idata.cta != null) {
              var lc = document.createElement('span'); lc.className = 'pe-chip'; lc.appendChild(document.createTextNode('link: '));
              var lce = document.createElement('span'); lce.className = 'ce'; lce.setAttribute('contenteditable', 'true'); lce.textContent = idata.cta; lce.setAttribute('data-ph', (R('catalog.categories[].items[].cta').blank) || '#');
              (function (p, el) { el.addEventListener('blur', function () { P(p, el); }); })(ipre + 'cta', lce); lc.appendChild(lce);
              (function (p) { var lrm = document.createElement('button'); lrm.className = 'pe-tag-rm'; lrm.style.opacity = '1'; lrm.textContent = '×'; lrm.title = 'Remove link'; armDelete(lrm, function () { A('rm:' + p); }); lc.appendChild(lrm); })(ipre + 'cta');
              cta.parentNode.insertBefore(lc, cta.nextSibling);
            } else { cta.parentNode.insertBefore(addBtn('add:' + ipre + 'cta', '+ link', true), cta.nextSibling); }
          }

          // bottom adders row + remove item
          var adds = document.createElement('div'); adds.className = 'pe-adds';
          adds.appendChild(addBtn('push:' + ipre + 'groups', '+ group', true));
          if (!co) adds.appendChild(addBtn('add:' + ipre + 'callout', '+ callout', true));
          if (!noEl) adds.appendChild(addBtn('add:' + ipre + 'notes', '+ notes', true));
          (function (dj2, dk2) { var ri = document.createElement('button'); ri.className = 'pe-removeitem'; ri.textContent = 'Remove item'; armDelete(ri, function () { A('rm:' + prefix + 'categories.' + dj2 + '.items.' + dk2); }); adds.appendChild(ri); })(dj, dk);
          det.appendChild(adds);
        });

        // + category — after the masonry, where the new card lands
        var mas = qs('.cat-masonry', secEl);
        if (mas) mas.parentNode.insertBefore(addLine('push:' + prefix + 'categories', '+ category'), mas.nextSibling);

        // a body re-render closes the modal / popovers — reopen what was open
        var oi = window.__peOpenItem;
        if (oi && oi.s === i && openItem) {
          var rcard = qsa('.cat-masonry > .cat-card', secEl)[oi.j];
          var rpill = rcard && qsa('.cat-pill', rcard)[oi.k];
          if (rpill) openItem(oi.j, oi.k, rpill); else window.__peOpenItem = null;
        }
        var ro = window.__peReopen;
        if (ro && ro.s === i && ro.kind === 'ribbon') {
          window.__peReopen = null;
          var rc = qsa('.cat-masonry > .cat-card', secEl)[ro.j];
          var rb2 = rc && qs('.cc-dock .cc-btn[title="Ribbon"]', rc);
          if (rb2) rb2.click();
        }
      }

      // ── timeline: editable card faces + modal body + add/remove events ──
      if (type === 'timeline') {
        // required H2 — always present, editable in place (no "+" slot, no ×)
        wrapCE(qs('.wiki-section-title', secEl), prefix + 'heading');

        // the auto-derived scroll hint is canon — lock it (red box + padlock)
        var hintEl = qs('.tl-scroll-hint', secEl);
        if (hintEl) { hintEl.classList.add('pe-canon'); var hlk = document.createElement('span'); hlk.className = 'pe-lock'; hlk.title = 'Auto-derived from the event dates — never hand-typed'; hlk.innerHTML = LOCK; hintEl.appendChild(hlk); }

        var moEnum = (R('timeline.events[].month').enum) || [];
        var bodyBlank = (R('timeline.events[].body').blank) || '';
        var evMin = (R('timeline.events').min != null) ? R('timeline.events').min : 0;
        var evMax = R('timeline.events').max;
        var stations = qsa('.itl-station', secEl);
        var canRemoveEv = stations.length > evMin;

        // the DATE field popover: one click on the whole date opens a month
        // grid + day/year inputs. month enum from grammar. Edits are live (PV,
        // no re-render); dismissing commits once (re-render repositions, since
        // the date drives the layout). Month + year required; day optional.
        // days in a month, leap-aware (so e.g. Feb 30 / Apr 31 can't be entered)
        var DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var daysInMonth = function (mName, yr) {
          var mi = moEnum.indexOf(mName); if (mi < 0) return 31;
          var y = parseInt(yr, 10);
          if (mi === 1 && y && ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) return 29;
          return DIM[mi];
        };
        var openDatePop = function (anchor, k) {
          var epre = prefix + 'events.' + k + '.';
          var ev = (sdata.events && sdata.events[k]) || {};
          var dirty = false;   // only commit + re-position on close if the date actually changed
          var html = '<div class="cc-pop-label">Date</div>'
            + '<div class="cc-enum cc-month-grid">' + moEnum.map(function (m) { return '<button class="cc-enum-opt' + (m === ev.month ? ' sel' : '') + '" data-m="' + m + '">' + m + '</button>'; }).join('') + '</div>'
            + '<div class="cc-date-row"><label class="cc-date-day-col">Day<input type="text" inputmode="numeric" maxlength="2" class="cc-date-day" placeholder="—"></label>'
            + '<label class="cc-date-year-col">Year<input type="text" inputmode="numeric" maxlength="4" class="cc-date-year"></label></div>'
            + '<div class="cc-date-note">Month &amp; year required · day optional</div>'
            + '<button type="button" class="cc-apply">Apply date</button>';
          var pop = openPop(anchor, '', html, { cls: 'date-pop', onClose: function () { if (!dirty) return; var o = qs('.tl-outer', secEl); window.__peTlScrollTo = { s: i, k: k, from: o ? o.scrollLeft : 0 }; A('commit'); } });
          var dayIn = qs('.cc-date-day', pop), yrIn = qs('.cc-date-year', pop), applyBtn = qs('.cc-apply', pop);
          dayIn.value = ev.day != null ? ev.day : ''; yrIn.value = ev.year != null ? ev.year : '';
          var curMonth = ev.month || '';
          // Apply is disabled while anything is invalid, so a bad date can't be
          // committed (clicking Apply dismisses → onClose commits + scrolls).
          var updateApply = function () { applyBtn.disabled = dayIn.classList.contains('cc-invalid') || yrIn.classList.contains('cc-invalid'); };
          applyBtn.onclick = function () { closePop(); };
          // INVALID input is flagged (red) and NEVER applied — the doc keeps the
          // last valid value, so a bad/incomplete date can't be committed.
          var checkDay = function () {
            var v = dayIn.value;
            if (v === '') { dayIn.classList.remove('cc-invalid'); PV(epre + 'day', ''); dirty = true; updateApply(); return; }   // optional
            var n = parseInt(v, 10);
            if (!/^\d{1,2}$/.test(v) || n < 1 || n > daysInMonth(curMonth, yrIn.value)) { dayIn.classList.add('cc-invalid'); updateApply(); return; }
            dayIn.classList.remove('cc-invalid'); PV(epre + 'day', v); dirty = true; updateApply();
          };
          var checkYear = function () {
            if (/^\d{4}$/.test(yrIn.value)) { yrIn.classList.remove('cc-invalid'); PV(epre + 'year', yrIn.value); dirty = true; checkDay(); }   // re-check day (leap)
            else { yrIn.classList.add('cc-invalid'); }   // must be exactly 4 digits
            updateApply();
          };
          dayIn.addEventListener('input', function () { dayIn.value = dayIn.value.replace(/\D/g, '').slice(0, 2); checkDay(); });
          yrIn.addEventListener('input', function () { yrIn.value = yrIn.value.replace(/\D/g, '').slice(0, 4); checkYear(); });
          qsa('.cc-enum-opt', pop).forEach(function (b) { b.onclick = function () { curMonth = b.getAttribute('data-m'); PV(epre + 'month', curMonth); dirty = true; qsa('.cc-enum-opt', pop).forEach(function (x) { x.classList.toggle('sel', x === b); }); checkDay(); }; });
          updateApply();
        };

        // modal (scoped to THIS section) → body editing, decorator-driven (the
        // canon's own modal script is stripped in the builder, like the catalog)
        var tlModal = qs('.tl-modal', secEl);
        var tlBody = tlModal && qs('[data-tl-body]', tlModal);
        var tlDetails = qs('.tl-details', secEl);
        var tlBox = tlModal && qs('.tl-modal-box', tlModal);
        var closeTl = function () {
          var open = tlModal && qs('[data-pe-tl-open]', tlModal);
          if (open && tlDetails) { tlDetails.appendChild(open); open.removeAttribute('data-pe-tl-open'); }
          if (tlModal) tlModal.classList.remove('open');
          window.__peTlOpen = null; closePop();
        };
        var txt = function (el) { return el ? (el.textContent || '').trim() : ''; };
        var openEvent = function (k, st) {
          if (!tlModal || !tlBody) return;
          var det = qs('[id="bktld-' + k + '"]', secEl); if (!det) return;
          var tg = qs('[data-tl-tag]', tlModal), ti = qs('[data-tl-title]', tlModal), pg = qs('[data-tl-page]', tlModal);
          // date · tag (canon upper-left) — read the station's data-tag, the
          // SINGLE SOURCE for this line (built in station.html as
          // "{month}[ {day}], {year} · {tag}"). The live site's own script reads
          // the same attribute, so the format is defined in exactly one place;
          // the date drives a commit/re-render, so data-tag is fresh on open.
          if (tg) tg.textContent = st.getAttribute('data-tag') || '';
          // title — editable in the expanded card (same field as the card face).
          // reset textContent first so re-opening doesn't nest .ce wrappers.
          if (ti) { ti.textContent = txt(qs('.sc-title', st)); wrapCE(ti, prefix + 'events.' + k + '.title'); }
          if (pg) pg.textContent = st.getAttribute('data-num') + ' / ' + (stations.length < 10 ? '0' + stations.length : stations.length);
          if (!det.textContent.trim()) det.innerHTML = '<p>' + bodyBlank + '</p>';   // empty body → show its placeholder
          det.setAttribute('data-pe-tl-open', '1'); tlBody.appendChild(det);
          if (!det.querySelector('.ce')) wrapCE(det, prefix + 'events.' + k + '.body');   // guard: don't re-wrap on manual re-open
          tlModal.classList.add('open'); if (tlBox) centreModal(tlBox);
          window.__peTlOpen = { s: i, k: k };
        };
        if (tlModal) { var tc = qs('[data-tl-close]', tlModal); if (tc) tc.onclick = closeTl; tlModal.onmousedown = function (e) { if (e.target === tlModal) closeTl(); }; }

        stations.forEach(function (st) {
          // bind by the ORIGINAL event index (from the body link bktld-N), NOT
          // the DOM order — stations are emitted year-grouped, so DOM order ≠
          // the events[] array order once dates are edited out of sequence.
          var k = parseInt((st.getAttribute('data-detail') || '').replace('bktld-', ''), 10);
          if (isNaN(k)) return;
          var epre = prefix + 'events.' + k + '.';
          // the whole float-date above the card is ONE date field → month/day/year
          // popover. It's the jump target for the month/day/year requirements
          // (data-pe-jump lists all three), and data-pe-opens makes a readiness
          // jump OPEN the picker (not just scroll to it).
          var dateEl = qs('.sc-float-date', st);
          if (dateEl) {
            dateEl.classList.add('pe-datefield');
            dateEl.setAttribute('data-pe-opens', '1');
            dateEl.setAttribute('data-pe-jump', epre + 'month ' + epre + 'year ' + epre + 'day');
            (function (kk) { dateEl.onclick = function (e) { e.stopPropagation(); openDatePop(dateEl, kk); }; })(k);
          }
          // tag / title / preview (no layout impact → plain .ce, no re-render)
          wrapCE(qs('.sc-tag', st), epre + 'tag');
          wrapCE(qs('.sc-title', st), epre + 'title');
          wrapCE(qs('.sc-prose', st), epre + 'preview');
          // remove event (× inside the card corner), only above the grammar min
          var card = qs('.itl-card', st);
          if (card && canRemoveEv) makeRemovable(card, 'rm:' + prefix + 'events.' + k);
          // open the expandable card: the "Details ›" footer is the explicit
          // trigger (clear + never collides with field edits); clicking a
          // non-field part of the card also opens it.
          var expand = qs('.sc-expand', st);
          if (expand) { expand.classList.add('pe-expand'); (function (kk, ss) { expand.onclick = function (e) { e.stopPropagation(); openEvent(kk, ss); }; })(k, st); }
          if (card) { card.style.cursor = 'pointer'; (function (kk, ss) { card.addEventListener('click', function (e) { if (e.target.closest('.ce,.pe-remove,.cc-pop')) return; openEvent(kk, ss); }); })(k, st); }
        });

        // "+ new event" — upper-right, above the timeline. Appending lands the
        // new card on the right (its seed year); flag it so we scroll there.
        if (evMax == null || stations.length < evMax) {
          var addEv = document.createElement('button');
          addEv.className = 'pe-add pe-tl-addev';
          addEv.textContent = '+ new event';
          addEv.onclick = function () { var o = qs('.tl-outer', secEl); window.__peTlScrollTo = { s: i, k: qsa('.itl-station', secEl).length, from: o ? o.scrollLeft : 0 }; A('push:' + prefix + 'events'); };
          var hdrEl = qs('.tl-hdr', secEl); (hdrEl || secEl).appendChild(addEv);   // header bottom = directly above the timeline panel
        }

        // reopen the modal after a re-render (commit / add / remove) — find the
        // station by its original index (data-detail), not DOM order
        var tlo = window.__peTlOpen;
        if (tlo && tlo.s === i) {
          var rst = null; qsa('.itl-station', secEl).forEach(function (s) { if (s.getAttribute('data-detail') === 'bktld-' + tlo.k) rst = s; });
          if (rst) openEvent(tlo.k, rst); else window.__peTlOpen = null;
        }

        // ── smooth-scroll to the just-added / just-moved card after a re-render.
        // Restore the prior scroll first so the motion continues from where you
        // were (rather than snapping to 0), then animate to the target card. ──
        var ts = window.__peTlScrollTo;
        if (ts && ts.s === i) {
          window.__peTlScrollTo = null;
          var outer = qs('.tl-outer', secEl);
          if (outer) {
            if (ts.from != null) outer.scrollLeft = ts.from;
            (function (k) { (window.requestAnimationFrame || function (f) { setTimeout(f, 30); })(function () {
              var stn = null; qsa('.itl-station', secEl).forEach(function (s) { if (s.getAttribute('data-detail') === 'bktld-' + k) stn = s; });
              if (!stn) return;
              var target = stn.offsetLeft + stn.offsetWidth / 2 - outer.clientWidth / 2;
              target = Math.max(0, Math.min(target, outer.scrollWidth - outer.clientWidth));
              try { outer.scrollTo({ left: target, behavior: 'smooth' }); } catch (e) { outer.scrollLeft = target; }
            }); })(ts.k);
          }
        }
      }
    });

    // ════════════════════════════════════════════════════════════════════
    // READINESS MARKERS — a left-margin "is this section shippable yet?"
    // marker per section, DERIVED ENTIRELY FROM POLICY (the flattened
    // grammar). There is NO per-section rule list here: every requirement is
    // read from `required:` / list `min:` in grammar, and "done" = a required
    // field's value differs from its grammar placeholder. Change a `required`
    // in _data/grammar.yml — or add a whole new bank — and these markers
    // follow with zero edits here (standing rule #5). Jumping + the red flash
    // are canvas interaction, owned here (the layout contract).
    // ════════════════════════════════════════════════════════════════════
    (function readiness() {
      var FIELDS = (window.__PE_POLICY || {}).fields || {};
      var LOCKED = (window.__PE_POLICY || {}).locked || {};
      var rdoc = getDoc(); if (!rdoc || !FIELDS) return;

      // the markers themselves render in the PARENT editor chrome (out in the
      // black backdrop beside the canvas — an iframe can't paint outside its own
      // box). The decorator only needs the in-canvas flash that the jump fires.
      if (!document.getElementById('pe-readiness-css')) {
        var rs = document.createElement('style'); rs.id = 'pe-readiness-css';
        rs.textContent = [
          '@keyframes flashRed{0%{box-shadow:0 0 0 0 rgba(192,57,43,0)}14%{box-shadow:0 0 0 4px rgba(192,57,43,.32)}100%{box-shadow:0 0 0 0 rgba(192,57,43,0)}}',
          '.field-flash{animation:flashRed 1.5s ease-out;border-radius:5px}',
          '.field-flash,.field-flash *{color:#c0392b !important;font-weight:700 !important;transition:color .15s}',
          '.field-flash::before{color:#c0392b !important}'
        ].join('');
        (document.head || document.documentElement).appendChild(rs);
      }

      var PRIM = { text: 1, richtext: 1, url: 1, number: 1, color: 1, bool: 1 };
      var TRI = csvg('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>');
      var CHK = csvg('<polyline points="20 6 9 17 4 12"/>');
      var ne = function (v) { return v != null && String(v).replace(/<[^>]*>/g, '').trim() !== ''; };
      var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
      var human = function (s) { s = String(s == null ? '' : s).replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
      var findEl = function (p) { return qs('[data-pe-path="' + p + '"]'); };
      var strip = function (v) { return String(v).replace(/<[^>]*>/g, '').trim(); };

      // listName(lastSeg) → element subtype `of` (derived) for instance labels
      function ofMap(prefix) {
        var m = {};
        for (var k in FIELDS) { if (k.indexOf(prefix + '.') !== 0) continue; var r = FIELDS[k];
          if (r.kind === 'list') m[k.split('.').pop().replace('[]', '')] = r.of; }
        return m;
      }
      // expand a relative policy path (with [] list markers) against the live
      // data → concrete leaf instances; prunes absent optional objects/lists so
      // a requirement is raised only for content that actually exists.
      function walk(tokens, node, concrete, out) {
        if (!tokens.length) return;
        var tok = tokens[0], rest = tokens.slice(1);
        if (tok.slice(-2) === '[]') {
          var nm = tok.slice(0, -2), arr = node && node[nm];
          if (!Array.isArray(arr)) return;
          arr.forEach(function (it, i) { walk(rest, it, concrete.concat([nm, i]), out); });
          return;
        }
        if (node == null) return;
        if (!rest.length) { out.push({ concrete: concrete.concat([tok]), node: node, leaf: tok }); return; }
        if (node[tok] == null) return;
        walk(rest, node[tok], concrete.concat([tok]), out);
      }
      // met for a scalar — prefer the LIVE canvas value (so typing updates the
      // marker), else the doc; "met" = present AND ≠ its placeholder. The
      // placeholder is the element's data-ph when it has one, else the grammar
      // `blank` (tuple cells like infobox rows.0/.1 carry no data-ph because the
      // positional path doesn't map to the named key/value field).
      function metScalar(docPath, val, blank) {
        var b = String(blank == null ? '' : blank).trim();
        var el = findEl(docPath);
        if (el) { var t = strip(el.textContent); var ph = el.getAttribute('data-ph'); var phv = (ph != null ? ph : b).trim(); return t !== '' && t !== phv; }
        return ne(val) && strip(val) !== b;
      }
      function scalarLabel(concrete) {
        var li = -1; concrete.forEach(function (s, ix) { if (typeof s === 'number') li = ix; });
        return human(concrete.slice(li + 1).join(' '));
      }
      function listLabel(rel, r, need) {
        var listName = rel.split('.').pop().replace('[]', '');
        var real = r.of && !PRIM[r.of];
        var sing = real ? r.of.replace(/_/g, ' ') : listName.replace(/s$/, '');
        var plur = real ? sing + 's' : listName;
        return need <= 1 ? 'At least one ' + sing : 'At least ' + need + ' ' + plur;
      }
      // an instance's identifying value = its first required text field (derived).
      // Tuple (array) instances are read POSITIONALLY by the field's declaration
      // index (a pair row is ["Label","Value"] → label is index 0).
      function identTitle(prefix, concretePrefix, instData) {
        if (!instData) return '';
        var rel = ''; concretePrefix.forEach(function (seg) { rel += (typeof seg === 'number') ? '[]' : ((rel ? '.' : '') + seg); });
        var base = prefix + '.' + rel + '.', best = null, isArr = Array.isArray(instData), fi = -1;
        Object.keys(FIELDS).forEach(function (k) {
          if (k.indexOf(base) !== 0) return;
          var tail = k.slice(base.length); if (tail.indexOf('.') >= 0 || tail.indexOf('[]') >= 0) return;
          fi++; if (best != null) return;
          var r = FIELDS[k]; if (!r.required || (r.kind !== 'text' && r.kind !== 'richtext')) return;
          var v = isArr ? instData[fi] : instData[tail];
          if (ne(v) && strip(v) !== String(r.blank == null ? '' : r.blank).trim()) best = strip(v);
        });
        return best ? (best.length > 26 ? best.slice(0, 24) + '…' : best) : '';
      }
      // a `pair`-style subtype is stored POSITIONALLY (the doc + the binding use
      // rows.0.0 / rows.0.1, while grammar names the fields key/value). When the
      // instance node is an Array, resolve a named subfield to its declaration
      // index so the readiness check + jump address the REAL bound element.
      function tupleIndex(key) {
        var parent = key.replace(/\.[^.]+$/, '');   // drop the leaf → the list-element path
        var sibs = Object.keys(FIELDS).filter(function (k) {
          if (k.indexOf(parent + '.') !== 0) return false;
          var tail = k.slice(parent.length + 1); return tail.indexOf('.') < 0 && tail.indexOf('[]') < 0;
        });
        return sibs.indexOf(key);
      }
      var wordCount = function (t) { t = String(t == null ? '' : t).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').trim(); return t ? t.split(/\s+/).length : 0; };
      // total words across a list's items, EXCLUDING any item still holding its
      // placeholder (so seeded prose doesn't count). Live DOM first, else doc.
      function listWords(listDocPath, arr, rule) {
        var els = qsa('[data-pe-path^="' + listDocPath + '."]'), total = 0;
        if (els.length) {
          els.forEach(function (el) { var t = strip(el.textContent), ph = (el.getAttribute('data-ph') || '').trim(); if (t && t !== ph) total += wordCount(t); });
          return total;
        }
        var ib = String(rule.item_blank == null ? '' : rule.item_blank).trim();
        (Array.isArray(arr) ? arr : []).forEach(function (v) { if (ne(v) && strip(v) !== ib) total += wordCount(v); });
        return total;
      }

      // the readiness LABEL for one list level (its "cards") — canon-owned via
      // the component's grammar `display` block, else derived from the subtype
      // name (strip a subtype prefix: cat_item → Item).
      function kindOf(prefix, listName) {
        var disp = ((window.__PE_POLICY || {}).display || {})[prefix] || {};
        if (disp[listName] && disp[listName].kind) return disp[listName].kind;
        var of = ofMap(prefix)[listName] || listName;
        return human(of.replace(/^[a-z]+_/, ''));
      }
      // build the readiness TREE for one host: section-level fields, then one
      // "card" per first-level list instance, with deeper instances nested as
      // items. Fully derived from POLICY (required + min + min_words) + the data
      // — placement is purely by how many list indices a requirement's path has.
      function buildTree(prefix, data, dataPrefix) {
        var section = [], cardMap = {}, cardOrder = [];
        var nav = function (segs) { return segs.reduce(function (o, s) { return o == null ? o : o[s]; }, data); };
        function getCard(idxPos, concrete) {
          var ck = concrete.slice(0, idxPos + 1).join('.');
          if (!cardMap[ck]) {
            cardMap[ck] = { key: dataPrefix + ck, kind: kindOf(prefix, concrete[idxPos - 1]),
              name: identTitle(prefix, concrete.slice(0, idxPos + 1), nav(concrete.slice(0, idxPos + 1))),
              reqs: [], itemMap: {}, itemOrder: [] };
            cardOrder.push(ck);
          }
          return cardMap[ck];
        }
        function getItem(card, idxPos, concrete) {
          var ik = concrete.slice(0, idxPos + 1).join('.');
          if (!card.itemMap[ik]) {
            card.itemMap[ik] = { key: dataPrefix + ik, name: identTitle(prefix, concrete.slice(0, idxPos + 1), nav(concrete.slice(0, idxPos + 1))), reqs: [] };
            card.itemOrder.push(ik);
          }
          return card.itemMap[ik];
        }
        Object.keys(FIELDS).forEach(function (key) {
          if (key.indexOf(prefix + '.') !== 0) return;
          var r = FIELDS[key]; if (!r.required) return;
          var rel = key.slice(prefix.length + 1), insts = [];
          walk(rel.split('.'), data, [], insts);
          insts.forEach(function (inst) {
            // positional (tuple) subtype: the doc/path use an index (rows.0.0),
            // but for the TREE the cell is a FIELD of its row — keep the field
            // NAME in `concrete` (placement + label) and put the index only in
            // the doc path, so a pair's cells are leaves of its row, not items.
            var concrete = inst.concrete.slice(), docConcrete = inst.concrete.slice(), val;
            if (Array.isArray(inst.node) && r.kind !== 'list') { var ti = tupleIndex(key); if (ti >= 0) { docConcrete[docConcrete.length - 1] = ti; val = inst.node[ti]; } else val = inst.node[inst.leaf]; }
            else val = inst.node[inst.leaf];
            var docPath = dataPrefix + docConcrete.join('.');
            var idxs = []; concrete.forEach(function (s, ix) { if (typeof s === 'number') idxs.push(ix); });
            var leaf;
            if (r.kind === 'list' && r.min_words != null) {
              var w = listWords(docPath, val, r);
              leaf = { label: 'At least ' + r.min_words + ' words', sub: (w || 0) + ' / ' + r.min_words, met: w >= r.min_words, jump: docPath + '.0', addpath: docPath, struct: true };
            } else if (r.kind === 'list') {
              var need = r.min != null ? r.min : 1, arr = Array.isArray(val) ? val : [];
              leaf = { label: listLabel(rel, r, need), sub: arr.length + ' / ' + need, met: arr.length >= need, jump: docPath, addpath: docPath, struct: true };
            } else {
              leaf = { label: scalarLabel(concrete), met: metScalar(docPath, val, r.blank), jump: docPath };
            }
            if (idxs.length === 0) { section.push(leaf); return; }
            var card = getCard(idxs[0], concrete);
            if (idxs.length === 1) { card.reqs.push(leaf); return; }
            // deeper than the item (e.g. a pill inside a group) → tag with the
            // intermediate instance's name as a sub-label
            if (idxs.length >= 3) { var s3 = identTitle(prefix, concrete.slice(0, idxs[idxs.length - 1] + 1), nav(concrete.slice(0, idxs[idxs.length - 1] + 1))); if (s3) leaf.sub = s3; }
            getItem(card, idxs[1], concrete).reqs.push(leaf);
          });
        });
        var cards = cardOrder.map(function (ck) {
          var c = cardMap[ck];
          var items = c.itemOrder.map(function (ik) { var it = c.itemMap[ik]; return { key: it.key, name: it.name, reqs: it.reqs, unmet: it.reqs.filter(function (x) { return !x.met; }).length }; });
          var leaves = c.reqs.concat(items.reduce(function (a, it) { return a.concat(it.reqs); }, []));
          return { key: c.key, kind: c.kind, name: c.name, reqs: c.reqs, items: items, unmet: leaves.filter(function (x) { return !x.met; }).length, total: leaves.length };
        });
        return { section: section, cards: cards };
      }

      function flash(el) { el.classList.remove('field-flash'); void el.offsetWidth; el.classList.add('field-flash'); setTimeout(function () { el.classList.remove('field-flash'); }, 1600); }
      function jumpTo(it) {
        // address the bound field directly; then composite controls (e.g. the
        // timeline date, which edits month/day/year via one popover and lists
        // them in data-pe-jump); then a count/word item's add button. NEVER a
        // whole section — only ever a single field-sized element.
        // a match inside a CLOSED editor is no use — prefer the scope opener
        // that opens it. The catalog item fields live in the hidden .cat-details
        // store until openItem moves the detail into [data-catalog-modal].open.
        var hidden = function (e) { return !!(e && e.closest && e.closest('[data-catalog-modal]:not(.open), .tl-modal:not(.open), .cat-details')); };
        var el = findEl(it.jump); if (el && hidden(el)) el = null;
        if (!el) el = qs('[data-pe-jump~="' + it.jump + '"]');
        // composite EDITOR whose scope covers this path (e.g. a catalog item
        // pill — its name/pills are edited in a modal, not on the face): find
        // the face element whose data-pe-scope is a prefix of the jump, and
        // open it (data-pe-opens) so the contributor lands in that editor.
        if (!el) { var scs = qsa('[data-pe-scope]'); for (var z = 0; z < scs.length; z++) { var sc = scs[z].getAttribute('data-pe-scope'); if (sc && (it.jump === sc || it.jump.indexOf(sc + '.') === 0)) { el = scs[z]; break; } } }
        if (!el && it.addpath) el = qs('[data-pe-addpath="' + it.addpath + '"]');
        if (!el) { var base = it.jump.replace(/\.[^.]+$/, ''); el = qs('[data-pe-path^="' + base + '"]'); if (el && hidden(el)) el = null; }
        if (!el) return;
        try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        flash(el);
        if (el.hasAttribute && el.hasAttribute('contenteditable')) { setTimeout(function () { try { el.focus(); } catch (e) {} }, 300); return; }
        // composite opener (catalog item pill → its expandable card; timeline
        // date → its picker): OPEN it, then flash the ACTUAL field inside the
        // now-open editor when this jump targets a specific field (e.g. the item
        // name in the expanded card gets the red flash, not just the pill).
        if (el.getAttribute && el.getAttribute('data-pe-opens')) setTimeout(function () {
          try { el.click(); } catch (e) {}
          setTimeout(function () {
            var inner = findEl(it.jump);
            if (inner && inner !== el && !hidden(inner)) { try { inner.scrollIntoView({ block: 'center' }); } catch (e) {} flash(inner); if (inner.hasAttribute && inner.hasAttribute('contenteditable')) try { inner.focus(); } catch (e) {} }
          }, 130);
        }, 340);
      }
      // the parent (React chrome) renders the markers out in the black backdrop
      // and calls back here to run the in-canvas scroll+flash for an item.
      window.__peJump = function (jump, addpath) { jumpTo({ jump: jump, addpath: addpath }); };

      // hosts: hero + overview + every body section, each with its policy
      // prefix and the doc slice that holds its values
      var hosts = [];
      var heroEl = qs('section.wiki-hero');
      if (heroEl && rdoc.hero) hosts.push({ el: heroEl, prefix: 'hero', data: rdoc.hero, dataPrefix: 'hero.' });
      var ovEl = qs('section[data-section="overview"]');
      if (ovEl && rdoc.overview) hosts.push({ el: ovEl, prefix: 'overview', data: rdoc.overview, dataPrefix: 'overview.' });
      (rdoc.sections || []).forEach(function (s, i) {
        var el = bodySecs[i]; if (!el) return; var t = sectionTypeOf(el); if (!t) return;
        hosts.push({ el: el, prefix: t, data: (s.data || {}), dataPrefix: 'sections.' + i + '.data.' });
      });

      // serialize each host's readiness → a payload the parent renders. `top` is
      // the section's offset in the canvas document, so the parent can align the
      // marker (in the backdrop) to the section as the canvas scrolls.
      function buildPayload() {
        return hosts.map(function (host) {
          var tree = buildTree(host.prefix, host.data, host.dataPrefix);
          var leaves = tree.section.concat(tree.cards.reduce(function (a, c) { return a.concat(c.reqs, c.items.reduce(function (b, it) { return b.concat(it.reqs); }, [])); }, []));
          var left = leaves.filter(function (x) { return !x.met; }).length, met = leaves.length - left;
          return { top: host.el.offsetTop, prefix: host.prefix, done: left === 0, left: left,
            pct: leaves.length ? Math.round(met / leaves.length * 100) : 100, section: tree.section, cards: tree.cards };
        });
      }
      function postMarkers() { try { if (window.parent.__peMarkers) window.parent.__peMarkers(buildPayload()); } catch (e) {} }
      hosts.forEach(function (host) {
        host.el.addEventListener('input', function (e) {
          if (!e.target || !e.target.getAttribute || e.target.getAttribute('data-pe-path') == null) return;
          postMarkers();
        });
      });
      postMarkers();
    })();

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
