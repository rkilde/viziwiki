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
    'config.footer':    { root: '.cfg-footer',   label: '+ footer' },
  };

  // a body section's component type. The RELIABLE source is the DOC — body
  // sections map 1:1 to doc.sections in order — so callers with the index use
  // docTypeAt(i). sectionTypeOf is a DOM-only fallback (class == type) that
  // works for banks whose section class equals the type, but NOT for ones where
  // they differ (os-section/class lane-section hosts lifecycle-lane) — hence the
  // doc-index path. (CLAUDE.md: section→type is derived, not a name guess.)
  function docTypeAt(i) { try { var d = getDoc(); return (d && d.sections && d.sections[i] && d.sections[i].type) || null; } catch (e) { return null; } }
  function sectionTypeOf(secEl) {
    var regs = (window.__PE_REGISTRY || {}).sections || {};
    for (var key in regs) {
      var t = key.replace(/-section$/, '');
      if (secEl.classList.contains(t)) return t;
    }
    return null;
  }
  // the registry section (eyebrow/icon/hosts…) for a component type, via the
  // `hosts` map (derived) — handles type ≠ section name (lifecycle-lane↔os-section)
  function regForType(type) {
    var regs = (window.__PE_REGISTRY || {}).sections || {};
    for (var key in regs) { if ((regs[key].hosts || []).indexOf(type) >= 0) return regs[key]; }
    return regs[type + '-section'] || {};
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
    // overview prose: ONE editable box — the contributor types as many/few
    // paragraphs as they like inside it (Enter → new paragraph). No "+ paragraph"
    // (no addLabel) — the single first box is the whole writing surface.
    { path: 'overview.paragraphs',   container: '.wiki-section-prose', item: '.wiki-section-prose > p', whole: true },
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
  // The card dock floats ABOVE its card. Two problems with plain CSS :hover +
  // absolute positioning: (a) inside the masonry's CSS multi-columns, absolute
  // children mis-resolve their containing block (the dock jumps to another
  // card); (b) the dock sits outside the card, so moving the mouse up to USE it
  // leaves the card and hides it. Fix both: position the dock with JS as
  // position:fixed at the card's rect (multicol-proof), and keep it pinned
  // until the mouse leaves a PROXIMITY zone around the card + the dock.
  function armDockHover(card, dock, id) {
    var GRACE = 56;   // px around the card/dock before it hides
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
    var place = function () { var r = card.getBoundingClientRect(); dock.style.left = r.left + 'px'; dock.style.top = (r.top - dock.offsetHeight - 6) + 'px'; };
    var inBox = function (e, r) { return e.clientX >= r.left - GRACE && e.clientX <= r.right + GRACE && e.clientY >= r.top - GRACE && e.clientY <= r.bottom + GRACE; };
    var moveH = null;
    var unpin = function () { dock.classList.remove('pinned'); if (window.__peDockOpen === id) window.__peDockOpen = null; if (moveH) { document.removeEventListener('mousemove', moveH); moveH = null; } };
    var watch = function () { if (moveH) return; moveH = function (e) { if (!inBox(e, card.getBoundingClientRect()) && !inBox(e, dock.getBoundingClientRect())) unpin(); }; document.addEventListener('mousemove', moveH); };
    dock._pin = function () { if (!dock.classList.contains('pinned')) { dock.classList.add('pinned'); if (id != null) window.__peDockOpen = id; watch(); } place(); };
    card.addEventListener('mouseenter', dock._pin);
    // RE-RENDER RESTORE: an action (+ item, + ribbon, …) destroys this dock and
    // builds a fresh one. If this card's dock was pinned, bring it straight back
    // with NO fade and NO position jump — pin instantly (held hidden) and place
    // it once the iframe has re-laid-out — so the dock doesn't flash.
    if (id != null && window.__peDockOpen === id) {
      dock.style.transition = 'none'; dock.style.opacity = '0'; dock.classList.add('pinned'); watch();
      setTimeout(function () { place(); dock.style.opacity = ''; raf(function () { dock.style.transition = ''; }); }, 50);
    }
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
      if (ibAdds.children.length) ibox.appendChild(ibAdds);   // absolute-positioned directly below the infobox (CSS)
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

    // section tone toolbar (glass pill) — tones from the field's grammar enum.
    // If the field declares `modes` ({Label: enumValue}, e.g. the spec sheet's
    // {Light: a, Dark: special}), render a LABELED toggle instead of raw enum
    // chips — both the labels and the value mapping are DERIVED from grammar.
    function toneBar(secEl, polPath, mkAction, extra) {
      var toneRule = ruleFor(polPath) || {};
      var modes = toneRule.modes;                       // {Label: enumValue} | null
      var tones = toneRule.enum || [];   // derived from grammar — never restate the values
      var cur = secEl.getAttribute('data-tone');
      var bar = document.createElement('div');
      bar.className = 'pe-sec-tools';
      bar.appendChild(document.createTextNode(modes ? 'mode ' : 'tone '));
      var pairs = modes ? Object.keys(modes).map(function (k) { return [k, modes[k]]; }) : tones.map(function (t) { return [t, t]; });
      pairs.forEach(function (p) {
        var b = document.createElement('button');
        b.className = 'pe-tonebtn' + (cur === p[1] ? ' on' : '');
        b.textContent = p[0];
        b.onclick = function () { A(mkAction(p[1])); };
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
      // the component type from the DOC (reliable 1:1 order), DOM class fallback
      var type = docTypeAt(i) || sectionTypeOf(secEl);
      if (!type) return;
      var prefix = 'sections.' + i + '.data.';
      var reg = regForType(type);   // registry section via the hosts map (handles type ≠ section name)
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
          // move any ALREADY-open detail back first, so opening a different item
          // doesn't stack two details in the modal (the "dual load" glitch).
          var prevDet = qs('[data-pe-detail-open]', modal);
          if (prevDet && prevDet !== det && detRoot) { detRoot.appendChild(prevDet); prevDet.removeAttribute('data-pe-detail-open'); }
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
          var html = '<div class="cc-pop-label">Category color</div><div class="cc-swatches">' +
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

          // the glass dock (bottom-right): color · ribbon · remove
          var dock = document.createElement('div'); dock.className = 'cc-dock';
          (function (cp, ac, cd) { dock.appendChild(dockBtn('<span class="cc-swatch"></span>', 'Change color', '', function () { openColorPop(this, cp, ac, cd.color); })); })(cpre, accent, cdata);
          var sep = document.createElement('span'); sep.className = 'cc-sep'; dock.appendChild(sep);
          (function (cp, ac, cd, jj) { dock.appendChild(dockBtn(csvg(CICON.flag), cd.ribbon ? 'Edit ribbon' : 'Add a ribbon', cd.ribbon ? 'on' : '', function () { openRibbonPop(this, cp, ac, cd.ribbon == null ? null : cd.ribbon, card, jj); })); })(cpre, accent, cdata, j);
          (function (jj) { var tb = dockBtn(csvg(CICON.trash), 'Delete entire category', 'danger', null); armDelete(tb, function () { closePop(); A('rm:' + prefix + 'categories.' + jj); }); dock.appendChild(tb); })(j);
          card.appendChild(dock); armDockHover(card, dock, cpre);

          // the ribbon banner on the card is the jump SCOPE for the ribbon text
          // (it's edited via the dock popover, not a bound field) — clicking it
          // (or jumping to it) opens the ribbon editor: pin the dock, open its
          // ribbon popover.
          var rbBanner = qs('.cat-ribbon', card);
          if (rbBanner && cdata.ribbon != null) {
            rbBanner.setAttribute('data-pe-opens', '1');
            rbBanner.setAttribute('data-pe-scope', cpre + 'ribbon');
            rbBanner.style.cursor = 'pointer';
            (function (dk) { rbBanner.addEventListener('click', function () { if (dk._pin) dk._pin(); var rb = qs('.cc-btn[data-tip="Edit ribbon"]', dk); if (rb) rb.click(); }); })(dock);
          }

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
          var dk = rc && qs('.cc-dock', rc);
          var rb2 = dk && qs('.cc-btn[data-tip="Edit ribbon"]', dk);
          // pin + position the (freshly re-rendered) dock so the ribbon popover
          // lands at the right place, then open it — so adding a ribbon shows the
          // editor immediately (no second click). DEFER until the iframe has
          // resized + laid out, else the card's measured position is wrong and
          // the popover jumps to the top.
          if (dk && rb2) setTimeout(function () { if (dk._pin) dk._pin(); rb2.click(); }, 60);
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
          if (card) {
            // the card is the jump SCOPE for the modal-only body field — a
            // readiness jump to events.K.body opens the expandable card (the body
            // lives in the modal, not on the face) and then flashes the body.
            card.setAttribute('data-pe-scope', prefix + 'events.' + k); card.setAttribute('data-pe-opens', '1');
            card.style.cursor = 'pointer'; (function (kk, ss) { card.addEventListener('click', function (e) { if (e.target.closest('.ce,.pe-remove,.cc-pop')) return; openEvent(kk, ss); }); })(k, st);
          }
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

      // ── config: the storage/configuration chart — the owner's DRAWER editing
      // flow (configeditorui.html). Inline grey/blue .ce boxes edit the chart
      // directly (and feed the readiness widget); a per-row chevron opens a
      // structured drawer for the full form (capacity/unit/price/model/dates,
      // revised + price-drop toggles, divider label, device colors, remove).
      // Bars stay CANON-sorted (config.html) — an inline/drawer capacity, unit
      // or revised change re-runs that sort and we FLIP each row to its new slot
      // + grow/shrink the bar from where it was (decorator interaction; the
      // layout itself is derived in Liquid). Rows bind by their ORIGINAL data
      // index (data-idx, from the canon) so the sorted DOM addresses the right
      // item. There is no manual reorder — the order is DERIVED from capacity. ──
      if (type === 'config') {
        var ea = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
        // number/price field behaviours, mirroring the timeline date fields:
        //  · numCE/numInput — typing a letter is gracefully filtered out (the
        //    field only keeps digits + a decimal point); you can't break it.
        //  · enterBlur — pressing Enter LOCKS the value in (commits on blur) and
        //    never inserts a newline / can't be pushed past.
        var caretEnd = function (el) { try { var r = document.createRange(); r.selectNodeContents(el); r.collapse(false); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} };
        var numCE = function (el) { el.addEventListener('input', function () { var c = (el.textContent || '').replace(/[^\d.]/g, ''); if (c !== el.textContent) { el.textContent = c; caretEnd(el); } }); };
        var numInput = function (el) { el.addEventListener('input', function () { var c = el.value.replace(/[^\d.]/g, ''); if (c !== el.value) el.value = c; }); };
        var enterBlur = function (el) { if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }); };
        wrapCE(qs('.wiki-section-title', secEl), prefix + 'heading');     // required H2
        wrapCE(qs('.cfg-chart-title', secEl), prefix + 'chart_title');    // required chart title

        // intro (optional) — inline-editable + removable. Just ONE "+ intro text"
        // affordance, shown only while there's no intro yet (it renders right
        // below the H2); once an intro line exists, no second "+" appears.
        var cfgIntro = qs('.cfg-prose', secEl);
        var introPs = cfgIntro ? qsa('p', cfgIntro) : [];
        introPs.forEach(function (p, ix) { wrapCE(p, prefix + 'intro.' + ix); makeRemovable(p, 'rm:' + prefix + 'intro.' + ix); });
        if (!introPs.length) {
          var introAnchor = cfgIntro || qs('.wiki-section-title', secEl);
          if (introAnchor && introAnchor.parentNode) introAnchor.parentNode.insertBefore(addLine('push:' + prefix + 'intro', '+ intro text'), introAnchor.nextSibling);
        }

        // footer (optional richtext) — inline. Keep .cfg-footer FULL WIDTH so its
        // hairline divider spans across; the editable text box + its × hug the
        // text (attach the removable to the inner .ce, not the footer, so the
        // footer isn't shrunk to fit-content — which was clipping the hairline).
        var cfgFtr = qs('.cfg-footer', secEl);
        if (cfgFtr) { wrapCE(cfgFtr, prefix + 'footer'); makeRemovable(qs('.ce', cfgFtr) || cfgFtr, 'rm:' + prefix + 'footer'); }

        // divider label (section-level) — inline-editable when the divider shows
        var dlEl = qs('.cfg-divider-label', secEl);
        if (dlEl) wrapCE(dlEl, prefix + 'divider_label');

        // FLIP snapshot — capture each row's rect + its fill width BEFORE a
        // reorder-causing commit (capacity / unit / revised).
        var cfgSnap = function () {
          var snap = {};
          qsa('.cfg-row', secEl).forEach(function (row) {
            var di = row.getAttribute('data-idx'); var fl = qs('.cfg-fill', row);
            snap[di] = { r: row.getBoundingClientRect(), w: fl ? fl.getBoundingClientRect().width : 0 };
          });
          window.__peCfgFlip = { s: i, snap: snap };
        };
        // combine the drawer's old/new price inputs into the single canon
        // `price` string ("old → new" when a price-drop is on)
        var combinePrice = function (oldv, newv, drop) { oldv = String(oldv || '').trim(); newv = String(newv || '').trim(); return (drop && newv) ? (oldv + ' → ' + newv) : oldv; };

        qsa('.cfg-row', secEl).forEach(function (row) {
          var di = parseInt(row.getAttribute('data-idx'), 10); if (isNaN(di)) return;
          var ipre = prefix + 'items.' + di + '.';
          var idata = (sdata.items && sdata.items[di]) || {};

          // ── inline chart fields (direct manipulation) ──
          // capacity (REQUIRED) — inline number edit; commits → re-sort + re-fill
          var capBox = qs('.cfg-cap', row);
          if (capBox) {
            var capCe = document.createElement('span');
            capCe.className = 'ce'; capCe.setAttribute('contenteditable', 'true');
            capCe.setAttribute('data-pe-path', ipre + 'capacity');
            [].slice.call(capBox.childNodes).forEach(function (n) { if (n.nodeType === 3) capCe.appendChild(n); });
            capBox.insertBefore(capCe, capBox.firstChild);
            numCE(capCe); enterBlur(capCe);
            (function (cd) { capCe.addEventListener('blur', function () {
              var raw = (capCe.textContent || '').replace(/[^\d.]/g, '');
              if (raw === '' || !(Number(raw) > 0)) { capCe.textContent = String(cd.capacity != null ? cd.capacity : ''); return; }
              capCe.textContent = raw;
              if (String(Number(raw)) === String(cd.capacity)) return;     // unchanged → no re-render
              cfgSnap(); PV(ipre + 'capacity', Number(raw)); A('commit');
            }); })(idata);
            // the unit (GB/TB) is display-only on the chart — it changes ONLY via
            // the drawer's Unit dropdown (no inline click-toggle).
          }
          // model (inside the bar) — inline when present
          var fill = qs('.cfg-fill', row);
          var modelEl = fill && qs('.cfg-model', fill);
          if (modelEl) wrapCE(modelEl, ipre + 'model');
          // price — keep the CANON rendering exactly: a single line, OR the
          // stacked "old → new" drop (canon splits on '→' into two .cfg-price-
          // line rows). Inline-edit the SINGLE-price case in place; the drop is
          // edited via the drawer's old/new fields so we never flatten the
          // canon's stacked layout (that flattening was the drift).
          var priceEl = qs('.cfg-price', row);
          if (priceEl && idata.price != null && String(idata.price).indexOf('→') < 0) {
            var pLine = qs('.cfg-price-line', priceEl);
            if (pLine) {
              wrapCE(pLine, ipre + 'price');
              var pce = pLine.querySelector('.ce');
              if (pce) { enterBlur(pce); (function (cd) { pce.addEventListener('blur', function () { var t = (pce.textContent || ''); if (t === String(cd.price)) return; PV(ipre + 'price', t); A('commit'); }); })(idata); }
            }
          }
          // dates — inline when present
          var datesEl = qs('.cfg-dates', row);
          if (datesEl) wrapCE(datesEl, ipre + 'dates');

          // ── the per-row EDIT DRAWER (the owner's design) ──
          var chev = document.createElement('button');
          chev.className = 'row-edit-btn'; chev.title = 'Edit configuration';
          chev.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
          row.appendChild(chev);

          var hasArrow = String(idata.price || '').indexOf('→') >= 0;
          var oldP = hasArrow ? idata.price.split('→')[0].trim() : (idata.price || '');
          var newP = hasArrow ? idata.price.split('→')[1].trim() : '';
          var drawer = document.createElement('div'); drawer.className = 'row-drawer';
          drawer.innerHTML =
            '<div class="dr-row c3" style="align-items:flex-start">'
            + '<div><div class="dr-label">Capacity</div><input class="dr-input dr-cap" inputmode="numeric" value="' + ea(idata.capacity != null ? idata.capacity : '') + '"></div>'
            + '<div><div class="dr-label">Unit</div><select class="dr-input dr-select dr-unit"><option' + (idata.unit !== 'TB' ? ' selected' : '') + '>GB</option><option' + (idata.unit === 'TB' ? ' selected' : '') + '>TB</option></select></div>'
            // price + its price-drop toggle + the revised price are GROUPED here
            + '<div><div class="dr-label">Price</div><input class="dr-input dr-price" value="' + ea(oldP) + '">'
            +   '<div class="tog-row" style="margin-top:8px"><button class="tog dr-drop' + (hasArrow ? ' on' : '') + '"><span class="tog-pip"></span>Price drop (→)</button></div>'
            +   (hasArrow ? '<div style="margin-top:8px"><div class="dr-label">Revised price</div><input class="dr-input dr-price2" value="' + ea(newP) + '"></div>' : '')
            + '</div>'
            + '</div>'
            + '<div class="dr-row c2">'
            + '<div><div class="dr-label">Model / model number</div><input class="dr-input dr-model" value="' + ea(idata.model || '') + '"></div>'
            + '<div><div class="dr-label">Dates available</div><input class="dr-input dr-dates" value="' + ea(idata.dates || '') + '"></div>'
            + '</div>'
            + '<div><div class="dr-label" style="margin-bottom:8px">Options</div><div class="tog-row">'
            + '<button class="tog dr-revised' + (idata.revised ? ' on' : '') + '"><span class="tog-pip"></span>Mark as special configuration</button>'
            + '<span class="dr-info" tabindex="0" data-tip="' + ea("Sets a model apart from the standard tiers: it drops below a hairline divider with a striped bar. Use it for a config that doesn't share the lineup's hardware. Real case — the iPod touch (5th gen) shipped in 32 & 64 GB; a year later a cheaper 16 GB 'A1509' arrived with no rear camera, no flash and no loop, in Silver only. Marking it special drops it below the divider with its own note, so it reads as the stripped-down budget exception rather than a normal third tier.") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>'
            + '</div>'
            + (idata.revised ? '<div style="margin-top:8px"><div class="dr-label">Special configuration label</div><input class="dr-input dr-divlabel" value="' + ea(sdata.divider_label || '') + '" placeholder="e.g. special edition"></div>' : '')
            + '</div>'
            + '<div><div class="dr-label" style="margin-bottom:8px">Device colors</div><div class="dots-editor"></div></div>'
            + '<div class="dr-actions"><button class="dr-btn danger dr-remove">Remove</button></div>';
          row.parentNode.insertBefore(drawer, row.nextSibling);

          var qd = function (s) { return qs(s, drawer); };
          // chevron toggles the drawer (one open at a time); the open id is held
          // so the drawer survives a commit/re-render (reopened below)
          chev.onclick = function () {
            var wasOpen = drawer.classList.contains('open');
            qsa('.row-drawer.open', secEl).forEach(function (d) { d.classList.remove('open'); });
            qsa('.row-edit-btn.open', secEl).forEach(function (b) { b.classList.remove('open'); });
            if (!wasOpen) { drawer.classList.add('open'); chev.classList.add('open'); window.__peCfgDrawer = { s: i, idx: di }; }
            else window.__peCfgDrawer = null;
          };

          // capacity (drawer) — commit on change → re-sort + re-fill
          var capIn = qd('.dr-cap');
          numInput(capIn); enterBlur(capIn);
          (function (cd) {
            var commitCap = function () {
              var raw = (capIn.value || '').replace(/[^\d.]/g, '');
              if (raw === '' || !(Number(raw) > 0)) { capIn.value = String(cd.capacity != null ? cd.capacity : ''); return; }
              capIn.value = raw; if (String(Number(raw)) === String(cd.capacity)) return;
              cfgSnap(); PV(ipre + 'capacity', Number(raw)); A('commit');
            };
            capIn.addEventListener('change', commitCap);
          })(idata);
          // unit (drawer)
          qd('.dr-unit').addEventListener('change', function () { cfgSnap(); A('set:' + ipre + 'unit:' + this.value); });
          // price + price2 + price-drop toggle → the single canon price string
          var priceIn = qd('.dr-price'), price2In = qd('.dr-price2'), dropBtn = qd('.dr-drop');
          var pushPrice = function () { PV(ipre + 'price', combinePrice(priceIn.value, price2In ? price2In.value : '', dropBtn.classList.contains('on'))); A('commit'); };
          enterBlur(priceIn); priceIn.addEventListener('change', pushPrice);
          if (price2In) { enterBlur(price2In); price2In.addEventListener('change', pushPrice); }
          dropBtn.onclick = function () {
            var on = !dropBtn.classList.contains('on'); dropBtn.classList.toggle('on', on);
            var nv = (price2In ? price2In.value : '') || (R('config.items[].price').blank || '$0');
            PV(ipre + 'price', combinePrice(priceIn.value, nv, on)); A('commit');
          };
          // model / dates (drawer) — commit on change (canon decides structure)
          qd('.dr-model').addEventListener('change', function () { PV(ipre + 'model', this.value); A('commit'); });
          qd('.dr-dates').addEventListener('change', function () { PV(ipre + 'dates', this.value); A('commit'); });
          // revised toggle — re-sort across the divider
          (function (cd) { qd('.dr-revised').onclick = function () { cfgSnap(); A('set:' + ipre + 'revised:' + (cd.revised ? 'false' : 'true')); }; })(idata);
          // divider label (section-level)
          var divIn = qd('.dr-divlabel'); if (divIn) divIn.addEventListener('change', function () { PV(prefix + 'divider_label', this.value); A('commit'); });
          // device colors editor — swatch (native color input, click = ring),
          // name, remove × · "+" to add. hex/name patch live; ring/add/remove commit.
          var dotsEd = qd('.dots-editor');
          (idata.colors || []).forEach(function (c, ci) {
            var dpre = ipre + 'colors.' + ci + '.';
            var chip = document.createElement('div'); chip.className = 'dot-chip';
            chip.innerHTML = '<div class="dot-swatch' + (c.ring ? ' ring' : '') + '" style="background:' + (c.hex || '#888') + '" title="Click to toggle ring"><input type="color" value="' + (c.hex || '#888888') + '"></div>'
              + '<input class="dot-name-inp" value="' + ea(c.name || '') + '"><button class="dot-rm" title="Remove color">×</button>';
            var sw = qs('.dot-swatch', chip), hexIn = qs('input[type=color]', chip), nmIn = qs('.dot-name-inp', chip), rmB = qs('.dot-rm', chip);
            hexIn.onclick = function (e) { e.stopPropagation(); };
            hexIn.addEventListener('input', function () { PV(dpre + 'hex', hexIn.value); sw.style.background = hexIn.value; var liveDot = qsa('.cfg-color .cfg-dot', row)[ci]; if (liveDot) liveDot.style.background = hexIn.value; });
            (function (cc) { sw.onclick = function () { A('set:' + dpre + 'ring:' + (cc.ring ? 'false' : 'true')); }; })(c);
            nmIn.addEventListener('change', function () { PV(dpre + 'name', nmIn.value); A('commit'); });
            (function (cci) { rmB.onclick = function () { A('rm:' + ipre + 'colors.' + cci); }; })(ci);
            dotsEd.appendChild(chip);
          });
          var dotAdd = document.createElement('button'); dotAdd.className = 'dot-add'; dotAdd.title = 'Add color'; dotAdd.textContent = '+';
          dotAdd.onclick = function () { A('push:' + ipre + 'colors'); };
          dotsEd.appendChild(dotAdd);
          // remove configuration (two-click confirm) — clear the drawer flag so a
          // shifted index doesn't reopen a different row's drawer
          (function (d) { armDelete(qd('.dr-remove'), function () { window.__peCfgDrawer = null; A('rm:' + prefix + 'items.' + d); }); })(di);

          // reopen this drawer if it was the open one before a re-render
          if (window.__peCfgDrawer && window.__peCfgDrawer.s === i && window.__peCfgDrawer.idx === di) { drawer.classList.add('open'); chev.classList.add('open'); }
        });

        // toolbar below the chart — "+ configuration" (intro lives below the H2)
        var cfgChart = qs('.cfg-chart', secEl);
        if (cfgChart) {
          var tb = document.createElement('div'); tb.className = 'pe-cfg-toolbar';
          var mk = function (label, action) { var b = document.createElement('button'); b.className = 'pe-cfg-add'; b.textContent = label; var pm = /^push:(.+)$/.exec(action); if (pm) b.setAttribute('data-pe-addpath', pm[1]); b.onclick = function () { A(action); }; return b; };
          tb.appendChild(mk('+ configuration', 'push:' + prefix + 'items'));
          cfgChart.appendChild(tb);
        }

        // ── FLIP: after a reorder-causing commit, slide each row to its new slot
        // and grow/shrink its bar from the old width. All inline → no live-CSS
        // change (the live site, being static, never animates). ──
        var cfgFlip = window.__peCfgFlip;
        if (cfgFlip && cfgFlip.s === i) {
          window.__peCfgFlip = null;
          var craf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
          qsa('.cfg-row', secEl).forEach(function (row) {
            var di = row.getAttribute('data-idx'); var old = cfgFlip.snap[di]; if (!old) return;
            var nr = row.getBoundingClientRect(); var dx = old.r.left - nr.left, dy = old.r.top - nr.top;
            var fl = qs('.cfg-fill', row); var targetW = fl ? fl.style.width : null;
            if (dx || dy) { row.style.transition = 'none'; row.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
            if (fl && targetW) { fl.style.transition = 'none'; fl.style.width = old.w + 'px'; }
            craf(function () { craf(function () {
              if (dx || dy) { row.style.transition = 'transform .5s cubic-bezier(.4,0,.2,1)'; row.style.transform = ''; }
              if (fl && targetW) { fl.style.transition = 'width .5s cubic-bezier(.4,0,.2,1)'; fl.style.width = targetW; }
            }); });
          });
        }
      }

      // ── spec: the "Specifications Sheet" card grid. Inline .ce on the heading,
      // device line, each card title, and every key/value row; an icon picker on
      // each card head (icons DERIVED from the canon sprite in the iframe); add/
      // remove rows + cards. Positional [key,value] rows bind .0/.1 like the
      // overview infobox. No layout JS (the grid is pure CSS). ──
      if (type === 'spec') {
        wrapCE(qs('.wiki-section-title', secEl), prefix + 'heading');     // required H2
        wrapCE(qs('.spec-sub', secEl), prefix + 'device');                // required device line

        var labBlank = (R('spec.cards[].rows[].label').blank) || 'Label';
        var vBlank = (R('spec.cards[].rows[].value').blank) || 'Value';
        var rowsRule = R('spec.cards[].rows'), cardsRule = R('spec.cards');
        var rowsMin = rowsRule.min != null ? rowsRule.min : 1;
        var cardsMin = cardsRule.min != null ? cardsRule.min : 1;
        var grid = qs('.spec-grid', secEl);

        // icon names are DERIVED from the canon sprite injected into the canvas
        // (each <symbol id="ic-NAME">) — never a hand-kept list.
        var iconNames = function () {
          if (window.__peIcons) return window.__peIcons;
          window.__peIcons = qsa('svg symbol[id^="ic-"]').map(function (s) { return s.id.replace(/^ic-/, ''); }).sort();
          return window.__peIcons;
        };
        var openIconPop = function (btn, cpre, cur) {
          var names = iconNames();
          var html = '<div class="cc-pop-label">Card icon</div><div class="cc-icons">'
            + names.map(function (n) { return '<button class="cc-icon' + (n === cur ? ' sel' : '') + '" data-n="' + n + '" title="' + n + '"><svg class="wiki-icon" viewBox="0 0 24 24"><use href="#ic-' + n + '"></use></svg></button>'; }).join('')
            + '</div>' + (cur ? '<button class="cc-rm">Remove icon</button>' : '');
          var pop = openPop(btn, '', html, { cls: 'icon-pop' });
          qsa('.cc-icon', pop).forEach(function (b) { b.onclick = function () { closePop(); A('set:' + cpre + 'icon:' + b.getAttribute('data-n')); }; });
          var rm = qs('.cc-rm', pop); if (rm) rm.onclick = function () { closePop(); A('rm:' + cpre + 'icon'); };
        };

        // FLIP for drag-to-reorder: snapshot card rects by their TITLE (a stable
        // identity across the reorder re-render), then slide each to its new slot.
        var specSnap = function () {
          var snap = {};
          qsa('.spec-card', secEl).forEach(function (c) { var t = qs('.spec-card-head span', c); snap[(t ? t.textContent : '') || Math.random()] = c.getBoundingClientRect(); });
          window.__peSpecFlip = { s: i, snap: snap };
        };

        qsa('.spec-card', secEl).forEach(function (card, j) {
          var cpre = prefix + 'cards.' + j + '.';
          var cdata = (sdata.cards && sdata.cards[j]) || {};
          var head = qs('.spec-card-head', card);
          // title (required)
          wrapCE(qs('span', head), cpre + 'title');
          // icon (REQUIRED) — click the glyph to change; "+ icon" when absent.
          // The icon isn't a text field, so it carries a jump SCOPE (not a path):
          // a readiness jump to a missing icon opens the picker.
          var iconEl = head && qs('.wiki-icon', head);
          if (iconEl) {
            iconEl.style.cursor = 'pointer'; iconEl.setAttribute('title', 'Change icon');
            iconEl.setAttribute('data-pe-scope', cpre + 'icon'); iconEl.setAttribute('data-pe-opens', '1');
            (function (cd) { iconEl.onclick = function (e) { e.stopPropagation(); openIconPop(iconEl, cpre, cd.icon); }; })(cdata);
          } else if (head) {
            var addIc = addBtn('', '+ icon', true);
            addIc.setAttribute('data-pe-scope', cpre + 'icon'); addIc.setAttribute('data-pe-opens', '1');
            addIc.onclick = function () { openIconPop(addIc, cpre, null); };
            head.insertBefore(addIc, head.firstChild);
          }
          // label/value rows (positional [0]/[1], required)
          var rows = qsa('.spec-row', card);
          rows.forEach(function (r, k) {
            var dt = qs('.spec-k', r), dd = qs('.spec-v', r);
            wrapCE(dt, cpre + 'rows.' + k + '.0'); var dtce = dt && dt.querySelector('.ce'); if (dtce) dtce.setAttribute('data-ph', labBlank);
            wrapCE(dd, cpre + 'rows.' + k + '.1'); var ddce = dd && dd.querySelector('.ce'); if (ddce) ddce.setAttribute('data-ph', vBlank);
            if (rows.length > rowsMin) makeRemovable(r, 'rm:' + cpre + 'rows.' + k);
          });
          var list = qs('.spec-list', card);
          if (list) list.appendChild(addBtn('push:' + cpre + 'rows', '+ spec', true));
          // remove the whole card (above the min)
          if (qsa('.spec-card', secEl).length > cardsMin) makeRemovable(card, 'rm:' + prefix + 'cards.' + j);

          // drag handle (top-right, below the ×) → reorder cards. Only the handle
          // initiates the drag (so editing text inside the card is unaffected);
          // the card is the drag image. On drop, move the data + FLIP-animate.
          var grab = document.createElement('button');
          grab.className = 'spec-drag'; grab.title = 'Drag to reorder'; grab.setAttribute('draggable', 'true');
          grab.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
          (function (jj) {
            grab.addEventListener('dragstart', function (e) {
              window.__peSpecDrag = jj; card.classList.add('pe-dragging');
              try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(jj)); e.dataTransfer.setDragImage(card, 20, 20); } catch (x) {}
            });
            grab.addEventListener('dragend', function () { card.classList.remove('pe-dragging'); qsa('.spec-card', secEl).forEach(function (c) { c.classList.remove('pe-drop-before', 'pe-drop-after'); }); window.__peSpecDrag = null; });
          })(j);
          card.appendChild(grab);

          // drop target feedback + commit
          (function (jj) {
            card.addEventListener('dragover', function (e) {
              if (window.__peSpecDrag == null || window.__peSpecDrag === jj) return;
              e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (x) {}
              var rc = card.getBoundingClientRect(); var after = (e.clientX - rc.left) > rc.width / 2;
              card.classList.toggle('pe-drop-after', after); card.classList.toggle('pe-drop-before', !after);
            });
            card.addEventListener('dragleave', function () { card.classList.remove('pe-drop-before', 'pe-drop-after'); });
            card.addEventListener('drop', function (e) {
              e.preventDefault(); var from = window.__peSpecDrag; if (from == null || from === jj) return;
              var rc = card.getBoundingClientRect(); var after = (e.clientX - rc.left) > rc.width / 2;
              var to = jj; if (after && from > jj) to = jj + 1; else if (!after && from < jj) to = jj - 1;
              if (to === from) return;
              specSnap(); A('lmove:' + prefix + 'cards:' + from + ':' + to);
            });
          })(j);
        });

        // + card — after the grid
        if (grid) grid.parentNode.insertBefore(addLine('push:' + prefix + 'cards', '+ card'), grid.nextSibling);

        // FLIP play — after a reorder re-render, slide each card from its old slot
        var sf = window.__peSpecFlip;
        if (sf && sf.s === i) {
          window.__peSpecFlip = null;
          var sraf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
          qsa('.spec-card', secEl).forEach(function (c) {
            var t = qs('.spec-card-head span', c); var key = t ? t.textContent : ''; var old = sf.snap[key]; if (!old) return;
            var nr = c.getBoundingClientRect(); var dx = old.left - nr.left, dy = old.top - nr.top;
            if (!dx && !dy) return;
            c.style.transition = 'none'; c.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
            sraf(function () { sraf(function () { c.style.transition = 'transform .42s cubic-bezier(.4,0,.2,1)'; c.style.transform = ''; }); });
          });
        }
      }

      // ── lifecycle-lane: the OS-support ribbon. Inline .ce on the heading,
      // lane title, lead prose, each segment's version + date, and the notes.
      // The auto range + legend are LOCKED (derived). Enum choices — support
      // TYPE and BADGE type — are picked in a per-segment popover; the note
      // STATUS in a dot popover. Dates are inline text ("Mon YYYY"); editing one
      // commits → the canon repositions the tiles + recomputes the range. No
      // layout JS in the canon (widths are Liquid flex). ──
      if (type === 'lifecycle-lane') {
        var ea2 = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
        var lockCanon = function (el, tip) { if (!el) return; el.classList.add('pe-canon'); var lk = document.createElement('span'); lk.className = 'pe-lock'; lk.title = tip; lk.innerHTML = LOCK; el.appendChild(lk); };
        wrapCE(qs('.wiki-section-title', secEl), prefix + 'heading');   // required H2
        wrapCE(qs('.lane-title', secEl), prefix + 'title');            // required lane title

        // lead/intro: ONE box (no "+ lead text"). When there's no intro box (none
        // added, OR removed → empty .lane-prose), show a single "+ intro text" to
        // (re)create it; present → edit it (removable).
        var lprose = qs('.lane-prose', secEl);
        var lps = lprose ? qsa('p', lprose) : [];
        lps.forEach(function (p, ix) { wrapCE(p, prefix + 'paragraphs.' + ix); makeRemovable(p, 'rm:' + prefix + 'paragraphs.' + ix); });
        if (!lps.length) { var lAnchor = lprose || qs('.wiki-section-title', secEl); if (lAnchor && lAnchor.parentNode) lAnchor.parentNode.insertBefore(addLine('push:' + prefix + 'paragraphs', '+ intro text'), lAnchor.nextSibling); }

        // the upper-right range + the legend are DERIVED from the segments → locked
        lockCanon(qs('.lane-range', secEl), 'Auto-derived from the segment dates & versions — never hand-typed');
        lockCanon(qs('.lane-legend', secEl), 'Auto-derived from the support tiers present');

        // small chip editor (the weighted-mode end-date control below the chart)
        var laneChip = function (label, path, val, blank, removable) {
          var chip = document.createElement('span'); chip.className = 'pe-chip'; chip.appendChild(document.createTextNode(label + ' '));
          var ce = document.createElement('span'); ce.className = 'ce'; ce.setAttribute('contenteditable', 'true'); ce.setAttribute('data-pe-path', path);
          if (blank != null) ce.setAttribute('data-ph', blank); ce.textContent = (val != null ? val : (blank || ''));
          ce.addEventListener('blur', function () { if ((ce.textContent || '') === String(val == null ? '' : val)) return; P(path, ce); A('commit'); }); chip.appendChild(ce);
          if (removable) { var rm = document.createElement('button'); rm.className = 'pe-tag-rm'; rm.style.opacity = '1'; rm.textContent = '×'; rm.title = 'Remove'; armDelete(rm, function () { A('rm:' + path); }); chip.appendChild(rm); }
          return chip;
        };

        // segments
        var segTypes = (R('lifecycle-lane.segments[].type').enum) || [];
        var badgeTypes = (R('lifecycle-lane.segments[].badge_type').enum) || [];
        var segMin = (R('lifecycle-lane.segments').min != null) ? R('lifecycle-lane.segments').min : 2;
        var badgePresets = (R('lifecycle-lane.segments[].badge_type').presets) || {};   // {type: text} combos (derived)
        var segEls = qsa('.lane-seg', secEl);
        var verBlank = (R('lifecycle-lane.segments[].ver').blank) || 'Version';
        var openSegPop = function (anchor, spre, sd) {
          // version + date are ALSO editable here (kept inline on the tile too)
          var html = '<div class="cc-pop-row2"><label class="cc-pop-fld"><span class="cc-pop-label">Software version</span><input type="text" class="cc-lane-ver" placeholder="' + ea2(verBlank) + '" value="' + ea2(sd.ver) + '"></label>'
            + '<label class="cc-pop-fld"><span class="cc-pop-label">Date</span><input type="text" class="cc-lane-date" placeholder="Mon YYYY" value="' + ea2(sd.date) + '"></label></div>'
            + '<div class="cc-pop-label" style="margin-top:13px">Support type</div><div class="cc-enum cc-lane-types">'
            + segTypes.map(function (t) { return '<button class="cc-enum-opt cc-type-' + t + (sd.type === t ? ' sel' : '') + '" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div>'
            // BADGE = a bank of preset text+color combos (derived from the
            // badge_type enum + its grammar `presets` map). Pick one → sets the
            // text AND the colour together; no freeform typing.
            + '<div class="cc-pop-label" style="margin-top:13px">Badge' + (sd.badge != null ? '' : ' (optional)') + '</div><div class="cc-enum cc-badge-bank">'
            + badgeTypes.map(function (b) { var tx = (badgePresets[b] || b); var on = (sd.badge != null && (sd.badge_type || 'ship') === b) ? ' sel' : ''; return '<button class="cc-enum-opt cc-badge-' + b + on + '" data-bt="' + b + '" data-btx="' + ea2(tx) + '">' + tx + '</button>'; }).join('') + '</div>'
            + (sd.badge != null ? '<button class="cc-rm">Remove badge</button>' : '');
          var pop = openPop(anchor, '', html, { cls: 'lane-pop' });
          var vi = qs('.cc-lane-ver', pop); if (vi) { enterBlurI(vi); vi.addEventListener('change', function () { PV(spre + 'ver', vi.value); A('commit'); }); }
          var di = qs('.cc-lane-date', pop); if (di) { enterBlurI(di); di.addEventListener('change', function () { PV(spre + 'date', di.value); A('commit'); }); }
          qsa('[data-t]', pop).forEach(function (b) { b.onclick = function () { closePop(); A('set:' + spre + 'type:' + b.getAttribute('data-t')); }; });
          // a preset sets BOTH badge text + badge_type in one commit
          qsa('[data-bt]', pop).forEach(function (b) { b.onclick = function () { closePop(); PV(spre + 'badge', b.getAttribute('data-btx')); PV(spre + 'badge_type', b.getAttribute('data-bt')); A('commit'); }; });
          var rm = qs('.cc-rm', pop); if (rm) rm.onclick = function () { closePop(); A('rm:' + spre + 'badge'); };
        };
        var enterBlurI = function (el) { el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }); };
        // inline ver/date: commit on blur ONLY when changed (so the derived range
        // + tile positions refresh, without re-rendering on a no-op focus)
        var dce0 = function (ce, orig) { ce.addEventListener('blur', function () { if ((ce.textContent || '').trim() !== String(orig == null ? '' : orig).trim()) A('commit'); }); };
        segEls.forEach(function (seg, k) {
          var spre = prefix + 'segments.' + k + '.';
          var sd = (sdata.segments && sdata.segments[k]) || {};
          // version + date BOTH feed the derived range (date → edges, ver → the
          // version count), so an inline edit to either must commit/re-render.
          var vEl = qs('.lane-ver', seg);
          if (vEl) { wrapCE(vEl, spre + 'ver'); var vce = vEl.querySelector('.ce'); if (vce) dce0(vce, sd.ver); }
          var dEl = qs('.lane-date', seg);
          if (dEl) { wrapCE(dEl, spre + 'date'); var dce = dEl.querySelector('.ce'); if (dce) dce0(dce, sd.date); }
          if (segEls.length > segMin) makeRemovable(seg, 'rm:' + prefix + 'segments.' + k);
          // click the tile (not a field/×) → the type + badge popover
          seg.style.cursor = 'pointer';
          (function (sp, d) { seg.addEventListener('click', function (e) { if (e.target.closest('.ce,.pe-remove,.cc-pop,.lane-badge')) return; openSegPop(seg, sp, d); }); })(spre, sd);
        });
        var lane = qs('.lane', secEl);
        if (lane) lane.parentNode.insertBefore(addBtn('push:' + prefix + 'segments', '+ segment', true), lane.nextSibling);

        // notes (optional) — status dot popover · inline label + text · add/remove
        var noteStatuses = (R('lifecycle-lane.notes[].status').enum) || [];
        var notesWrap = qs('.lane-notes', secEl);
        var openNoteStatusPop = function (anchor, npre, cur) {
          var html = '<div class="cc-pop-label">Status</div><div class="cc-enum">'
            + noteStatuses.map(function (s) { return '<button class="cc-enum-opt' + (cur === s ? ' sel' : '') + '" data-s="' + s + '"><span class="lane-note-dot lane-dot-' + s + '"></span>' + s + '</button>'; }).join('') + '</div>';
          var pop = openPop(anchor, '', html, { cls: 'lane-pop' });
          qsa('[data-s]', pop).forEach(function (b) { b.onclick = function () { closePop(); A('set:' + npre + 'status:' + b.getAttribute('data-s')); }; });
        };
        if (notesWrap) {
          qsa('.lane-note', notesWrap).forEach(function (note, k) {
            var npre = prefix + 'notes.' + k + '.';
            var nd = (sdata.notes && sdata.notes[k]) || {};
            var dot = qs('.lane-note-dot', note);
            if (dot) { dot.style.cursor = 'pointer'; dot.title = 'Status'; (function (nn, dd) { dot.onclick = function (e) { e.stopPropagation(); openNoteStatusPop(dot, nn, dd.status); }; })(npre, nd); }
            var strong = qs('strong', note);
            if (strong) wrapCE(strong, npre + 'label');
            // the trailing "— text" node: keep the "— " static, edit just the text
            if (strong) { var tnode = strong.nextSibling; if (tnode && tnode.nodeType === 3) { var m = tnode.nodeValue.match(/^(\s*[—-]\s*)([\s\S]*)$/); if (m) { tnode.nodeValue = m[1]; var tce = document.createElement('span'); tce.className = 'ce'; tce.setAttribute('contenteditable', 'true'); tce.setAttribute('data-pe-path', npre + 'text'); tce.setAttribute('data-ph', (R('lifecycle-lane.notes[].text').blank) || 'Note body'); tce.textContent = m[2]; (function (p, el) { el.addEventListener('blur', function () { P(p, el); }); })(npre + 'text', tce); tnode.parentNode.insertBefore(tce, tnode.nextSibling); } } }
            makeRemovable(note, 'rm:' + prefix + 'notes.' + k, true);
          });
          notesWrap.appendChild(addBtn('push:' + prefix + 'notes', '+ note', true));
        } else { var ls = qs('.lane-scroll', secEl); if (ls) ls.parentNode.insertBefore(addLine('push:' + prefix + 'notes', '+ note'), ls.nextSibling); }

        // weighted-widths toggle — OUTSIDE the visual's bounds, just below it,
        // lower-right. "weighted by time" → tile widths ∝ the gap between dates.
        // When on, an end-date chip sets the right edge for the last tile.
        var laneWrap = qs('.lane-wrap', secEl);
        if (laneWrap && laneWrap.parentNode) {
          var foot = document.createElement('div'); foot.className = 'pe-lane-foot';
          var wBtn = document.createElement('button'); wBtn.className = 'pe-tonebtn' + (sdata.weighted ? ' on' : ''); wBtn.textContent = 'weighted by time'; wBtn.title = 'On = each tile’s width ∝ the time until the next version';
          wBtn.onclick = function () { A('set:' + prefix + 'weighted:' + (sdata.weighted ? 'false' : 'true')); }; foot.appendChild(wBtn);
          if (sdata.weighted) {
            if (sdata.end != null) foot.appendChild(laneChip('end', prefix + 'end', sdata.end, R('lifecycle-lane.end').blank, true));
            else foot.appendChild(addBtn('add:' + prefix + 'end', '+ end date', true));
          }
          laneWrap.parentNode.insertBefore(foot, laneWrap.nextSibling);   // sibling AFTER the visual, not inside it
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
      // the readiness label for a scalar leaf — the field's grammar `label`
      // override when set (e.g. preview → "Summary line"), else the humanized
      // field name. `key` is the policy path (so we can read its rule).
      function scalarLabel(concrete, key) {
        var r = key && FIELDS[key];
        if (r && r.label) return r.label;
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
      // an instance's identifying value names its card in the widget. The field
      // is DERIVED: a grammar `identity: true` field if declared (e.g. the
      // timeline event's title, which isn't its first required text — year is),
      // else the first required text/richtext field. The value is read LIVE from
      // the bound .ce (so the card name updates in REAL TIME as you type), else
      // the doc. Tuple (array) instances index positionally.
      function identTitle(prefix, concretePrefix, instData, dataPrefix) {
        if (!instData) return '';
        var rel = ''; concretePrefix.forEach(function (seg) { rel += (typeof seg === 'number') ? '[]' : ((rel ? '.' : '') + seg); });
        var base = prefix + '.' + rel + '.', isArr = Array.isArray(instData);
        // collect this instance's own (depth-0) fields in declaration order
        var fields = [];
        Object.keys(FIELDS).forEach(function (k) {
          if (k.indexOf(base) !== 0) return;
          var tail = k.slice(base.length); if (tail.indexOf('.') >= 0 || tail.indexOf('[]') >= 0) return;
          fields.push({ key: k, tail: tail, r: FIELDS[k], fi: fields.length });
        });
        var idField = null, firstText = null;
        fields.forEach(function (f) {
          if (f.r.identity) idField = idField || f;
          if (!firstText && f.r.required && (f.r.kind === 'text' || f.r.kind === 'richtext')) firstText = f;
        });
        var pick = idField || firstText; if (!pick) return '';
        var docPath = (dataPrefix || '') + concretePrefix.join('.') + '.' + (isArr ? pick.fi : pick.tail);
        var el = dataPrefix ? findEl(docPath) : null;
        var v = el ? strip(el.textContent) : (isArr ? instData[pick.fi] : instData[pick.tail]);
        if (!ne(v) || strip(v) === String(pick.r.blank == null ? '' : pick.r.blank).trim()) return '';
        v = strip(v); return v.length > 26 ? v.slice(0, 24) + '…' : v;
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
              name: identTitle(prefix, concrete.slice(0, idxPos + 1), nav(concrete.slice(0, idxPos + 1)), dataPrefix),
              reqs: [], itemMap: {}, itemOrder: [] };
            cardOrder.push(ck);
          }
          return cardMap[ck];
        }
        function getItem(card, idxPos, concrete) {
          var ik = concrete.slice(0, idxPos + 1).join('.');
          if (!card.itemMap[ik]) {
            card.itemMap[ik] = { key: dataPrefix + ik, name: identTitle(prefix, concrete.slice(0, idxPos + 1), nav(concrete.slice(0, idxPos + 1)), dataPrefix), reqs: [] };
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
              leaf = { label: scalarLabel(concrete, key), met: metScalar(docPath, val, r.blank), jump: docPath };
            }
            if (idxs.length === 0) { section.push(leaf); return; }
            var card = getCard(idxs[0], concrete);
            if (idxs.length === 1) { card.reqs.push(leaf); return; }
            // deeper than the item (e.g. a pill inside a group) → tag with the
            // intermediate instance's name as a sub-label
            if (idxs.length >= 3) { var s3 = identTitle(prefix, concrete.slice(0, idxs[idxs.length - 1] + 1), nav(concrete.slice(0, idxs[idxs.length - 1] + 1)), dataPrefix); if (s3) leaf.sub = s3; }
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
        // if a modal / expanded card is open and the target lives OUTSIDE it
        // (e.g. a category NAME on the collapsed card, or another card's field),
        // close it first — so the field is reachable, and so opening a different
        // item replaces rather than stacks onto the current one.
        var openMod = qs('[data-catalog-modal].open, .tl-modal.open');
        if (openMod && !openMod.contains(el)) { var xb = qs('[data-modal-close], [data-tl-close]', openMod); if (xb) try { xb.click(); } catch (e) {} }
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
        var el = bodySecs[i]; if (!el) return; var t = s.type || sectionTypeOf(el); if (!t) return;
        hosts.push({ el: el, prefix: t, data: (s.data || {}), dataPrefix: 'sections.' + i + '.data.' });
      });

      // y of an element within the canvas document (sum offsetTop up the chain)
      function docTop(el) { var t = 0; while (el) { t += el.offsetTop || 0; el = el.offsetParent; } return t; }
      // serialize each host's readiness → a payload the parent renders. `top` is
      // the y of the section's EYEBROW/heading (not the section's top edge / seam)
      // so the marker lines up with the visible header, not the gap above it.
      function buildPayload() {
        return hosts.map(function (host) {
          var tree = buildTree(host.prefix, host.data, host.dataPrefix);
          var leaves = tree.section.concat(tree.cards.reduce(function (a, c) { return a.concat(c.reqs, c.items.reduce(function (b, it) { return b.concat(it.reqs); }, [])); }, []));
          var left = leaves.filter(function (x) { return !x.met; }).length, met = leaves.length - left;
          var anchor = qs('.wiki-section-eyebrow, .wiki-hero-eyebrow', host.el) || qs('.wiki-section-title, .wiki-hero-title', host.el) || host.el;
          return { top: docTop(anchor), prefix: host.prefix, done: left === 0, left: left,
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
