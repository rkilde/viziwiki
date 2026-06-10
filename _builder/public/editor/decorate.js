// THE DECORATOR — the builder's editing layer, attached AFTER the canonical
// Liquid includes render the page. The markup it decorates comes from the
// repo's own templates (see lib/render.ts); this file only adds editing
// affordances (grey/blue edit boxes, corner ×, padlocks, "+" slots) and binds
// them to data paths.
//
// Derivation contract (CLAUDE.md standing rule #5):
//  · WHAT renders + WHERE = the canonical includes (never restated here)
//  · WHAT is allowed (locks, tone enum, fixed chip count) = window.__PE_GRAMMAR
//    (generated from _data/grammar.yml)
//  · the tables below only REFERENCE canon identifiers (the wiki-* class names
//    + data paths) to say where each affordance attaches — binding, not canon.
//
// Absent optional fields arrive as SENTINEL values (window.__PE_SENT prefix)
// rendered by the real include — so each "+" slot replaces an element that
// sits exactly where the canon would render the real thing.
(function () {
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  // "+" slot specs, keyed by the add-action carried in the sentinel.
  // root = the canonical element to replace (closest ancestor); no root =
  // replace the sentinel-bearing element itself. kind: aside|infobox specials.
  var SLOTS = {
    addEyebrow:    { root: '.wiki-hero-eyebrow',           label: '+ eyebrow' },
    addSubtitle:   { root: '.wiki-hero-subtitle',          label: '+ subtitle' },
    addMeta:       { root: '.wiki-hero-subtitle-meta',     label: '+ meta', mini: true, alsoPrev: '.wiki-hero-subtitle-sep' },
    addDesc:       { root: '.wiki-hero-desc',              label: '+ description' },
    addSearch:     { root: '.wiki-hero-search',            label: '+ search bar' },
    addStats:      { root: '.wiki-hero-stats',             label: '+ stats (1×4)' },
    addAside:      { root: '.wiki-hero-aside',             kind: 'aside' },
    spAddEyebrow:  { root: '.wiki-hero-spotlight-eyebrow', label: '+ eyebrow' },
    spAddDesc:     { root: '.wiki-hero-spotlight-desc',    label: '+ description' },
    ftAddHeadRight:{ label: '+ right', mini: true },
    ftAddDesc:     { root: '.wiki-hero-feature-desc',      label: '+ description' },
    addInfobox:    { root: '.wiki-infobox',                kind: 'infobox' },
    addSublabel:   { label: '+ sublabel', mini: true },
    addBadge:      { root: '.wiki-infobox-badge',          label: '+ badge', pad: '0 16px 14px' },
  };

  // editable text bindings: data path ↔ canonical element (class-name contract)
  var EDIT = [
    { path: 'hero.eyebrow',            sel: '.wiki-hero-eyebrow', excl: ['.wiki-hero-eyebrow-dot'] },
    { path: 'hero.title',              sel: '.wiki-hero-title', excl: ['.wiki-hero-title-accent'] },
    { path: 'hero.subtitle',           sel: '.wiki-hero-subtitle', excl: ['.wiki-hero-subtitle-sep', '.wiki-hero-subtitle-meta'] },
    { path: 'hero.subtitle_meta',      sel: '.wiki-hero-subtitle-meta' },
    { path: 'hero.desc',               sel: '.wiki-hero-desc' },
    { path: 'hero.search_placeholder', sel: '.wiki-hero-search-input', input: true },
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

  // removable elements (corner ×): canonical element ↔ remove action
  var REMOVE = [
    { sel: '.wiki-hero-eyebrow',           action: 'rmEyebrow' },
    { sel: '.wiki-hero-subtitle',          action: 'rmSubtitle' },
    { sel: '.wiki-hero-desc',              action: 'rmDesc' },
    { sel: '.wiki-hero-search',            action: 'rmSearch' },
    { sel: '.wiki-hero-stats',             action: 'rmStats' },
    { sel: '.wiki-hero-spotlight-eyebrow', action: 'spRmEyebrow' },
    { sel: '.wiki-hero-spotlight-desc',    action: 'spRmDesc' },
    { sel: '.wiki-hero-feature-head > span:nth-child(2)', action: 'ftRmHeadRight', mini: true },
    { sel: '.wiki-hero-feature-desc',      action: 'ftRmDesc' },
    { sel: '.wiki-infobox',                action: 'rmInfobox' },
    { sel: '.wiki-infobox-title ~ .wiki-infobox-label', action: 'rmSublabel' },
    { sel: '.wiki-infobox-badge',          action: 'rmBadge' },
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
    var re = new RegExp(token + '([A-Za-z:]+?)__');
    var found = [];
    qsa('*').forEach(function (el) {
      // direct text children
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.indexOf(token) > -1) { found.push({ el: el, m: re.exec(n.nodeValue) }); return; }
      }
      // attributes (e.g. the search input's placeholder)
      if (el.placeholder && el.placeholder.indexOf(token) > -1) found.push({ el: el, m: re.exec(el.placeholder) });
    });
    found.forEach(function (f) {
      if (!f.m) return;
      var action = f.m[1];
      var spec = SLOTS[action];
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
        qs('.pe-add-row', target).appendChild(addBtn('addInfobox', '+ infobox'));
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

  // ── 3) removable → corner × ────────────────────────────────────────────────
  function makeRemovable(el, action, mini, title) {
    if (!el) return;
    el.classList.add('pe-removable');
    var b = document.createElement('button');
    b.className = mini ? 'pe-tag-rm' : 'pe-remove';
    b.title = title || 'Remove';
    b.textContent = '×';
    b.onclick = function () { A(action); };
    el.appendChild(b);
  }

  // ── main ───────────────────────────────────────────────────────────────────
  window.__decorate = function () {
    var G = window.__PE_GRAMMAR || {};
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

    // lists (canonical structures, indexed by DOM order)
    qsa('.wiki-hero-stat').forEach(function (item, i) {
      wrapCE(qs('.wiki-hero-stat-num', item), 'hero.stats.' + i + '.num');
      wrapCE(qs('.wiki-hero-stat-label', item), 'hero.stats.' + i + '.label');
    });
    var tags = qs('.wiki-hero-spotlight-tags');
    if (tags) {
      qsa('.wiki-hero-spotlight-tag', tags).forEach(function (t, i) {
        wrapCE(t, 'hero.spotlight.tags.' + i);
        makeRemovable(t, 'spRmTag:' + i, true);
      });
      tags.appendChild(addBtn('spAddTag', '+ tag', true));
    }
    // feature chips: count is FIXED by grammar (min==max) → no add/remove
    var chipSpec = (((G.components || {}).hero || {}).subtypes || {}).feature; chipSpec = chipSpec && chipSpec.chips;
    var chipsFixed = !chipSpec || chipSpec.min === chipSpec.max;
    qsa('.wiki-hero-feature-chip').forEach(function (c, i) {
      wrapCE(qs('.wiki-hero-feature-chip-key', c), 'hero.feature.chips.' + i + '.key');
      wrapCE(qs('.wiki-hero-feature-chip-val', c), 'hero.feature.chips.' + i + '.val');
      if (!chipsFixed) makeRemovable(c, 'ftRmChip:' + i);
    });
    var prose = qs('.wiki-section-prose');
    if (prose) {
      qsa('.wiki-section-prose > p').forEach(function (p, i) {
        wrapCE(p, 'overview.paragraphs.' + i);
        makeRemovable(p, 'rmPara:' + i);
      });
      prose.appendChild(addLine('addPara', '+ paragraph'));
    }
    var ibox = qs('.wiki-infobox');
    if (ibox && !ibox.classList.contains('pe-empty')) {
      qsa('.wiki-infobox-data > dt', ibox).forEach(function (dt, i) {
        wrapCE(dt, 'overview.infobox.rows.' + i + '.0');
        var dd = dt.nextElementSibling;
        if (dd) { wrapCE(dd, 'overview.infobox.rows.' + i + '.1'); makeRemovable(dd, 'rmRow:' + i); }
      });
      var dl = qs('.wiki-infobox-data', ibox);
      if (dl) dl.parentNode.insertBefore(addLine('addRow', '+ row', '8px 16px'), dl.nextSibling);
    }

    // removables (skip ones the sentinel pass already replaced)
    REMOVE.forEach(function (r) {
      var el = qs(r.sel);
      if (!el) return;
      if (r.sel === '.wiki-infobox' && el.classList.contains('pe-empty')) return;
      makeRemovable(el, r.action, r.mini);
    });
    // subtitle meta: its own mini × beside the meta span
    var meta = qs('.wiki-hero-subtitle-meta');
    if (meta) {
      var mb = document.createElement('button');
      mb.className = 'pe-tag-rm'; mb.title = 'Remove meta'; mb.textContent = '×';
      mb.onclick = function () { A('rmMeta'); };
      meta.parentNode.insertBefore(mb, meta.nextSibling);
    }

    // locked canon (red box + padlock): the overview's section label
    var eyebrow = qs('section[data-section="overview"] .wiki-section-eyebrow');
    if (eyebrow) {
      eyebrow.classList.add('pe-canon');
      var lk = document.createElement('span');
      lk.className = 'pe-lock';
      lk.title = 'Locked — the canonical section label, can’t be edited or removed';
      lk.innerHTML = LOCK;
      eyebrow.appendChild(lk);
    }

    // section tone toolbar — tones derived from the grammar enum
    var sec = qs('section[data-section="overview"]');
    if (sec) {
      sec.classList.add('pe-sec');
      var toneType = ((((G.components || {}).overview || {}).fields || {}).tone || {}).type || 'enum[a,b,special]';
      var tones = (/enum\[(.*)\]/.exec(toneType) || [0, 'a,b,special'])[1].split(',');
      var cur = sec.getAttribute('data-tone');
      var bar = document.createElement('div');
      bar.className = 'pe-sec-tools';
      bar.appendChild(document.createTextNode('tone '));
      tones.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'pe-tonebtn' + (cur === t ? ' on' : '');
        b.textContent = t;
        b.onclick = function () { A('setTone:' + t); };
        bar.appendChild(b);
      });
      sec.insertBefore(bar, sec.firstChild);
    }

    if (window.__retag) window.__retag();
  };
})();
