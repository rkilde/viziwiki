/* ====================================================================
   wiki-ipod-touch.js
   ViziWiki · iPod touch wiki — shared render engine
   All iPod touch gen pages load this file AFTER defining PAGE_DATA
   and TIMELINE. Change any render function here and it propagates
   to every gen page.

   SECTIONS CONTROLLED BY PAGE_DATA FLAGS:
   • PAGE_DATA.gaming        — Cultural impact section
   • PAGE_DATA.jailbreak     — Jailbreaking section
   • PAGE_DATA.budget        — Market positioning section
   • PAGE_DATA.design        — Industrial design section
   • PAGE_DATA.controversies — Controversies section
   • PAGE_DATA.photos        — Horizontal photo rail
   (Omit or set to null/false in PAGE_DATA to skip a section)
   ==================================================================== */

function lbShow(src, caption){
  document.getElementById('lbImg').src = src;
  document.getElementById('lbCaption').textContent = caption || '';
  document.getElementById('lb').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function lbHide(){
  document.getElementById('lb').classList.remove('open');
  document.getElementById('lbImg').src = '';
  document.body.style.overflow = '';
}
function lbClose(e){ if(e.target === document.getElementById('lb')) lbHide(); }
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') lbHide(); });

// ── Drag-to-scroll + static-click-to-lightbox ──────────────────────────
// Works on every scroll rail: .design-img-rail and .photo-rail-scroll
var DRAG_THRESHOLD = 6; // px — move less than this = static click

function addDragScroll(el){
  var isDown = false, startX, startY, scrollLeft, scrollTop, didDrag;
  el.style.cursor = 'grab';

  el.addEventListener('mousedown', function(e){
    isDown  = true;
    didDrag = false;
    startX  = e.pageX - el.getBoundingClientRect().left;
    startY  = e.pageY - el.getBoundingClientRect().top;
    scrollLeft = el.scrollLeft;
    scrollTop  = el.scrollTop;
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  });

  window.addEventListener('mouseup', function(){
    if(!isDown) return;
    isDown = false;
    el.style.cursor = 'grab';
    el.style.userSelect = '';
  });

  el.addEventListener('mousemove', function(e){
    if(!isDown) return;
    var x = e.pageX - el.getBoundingClientRect().left;
    var y = e.pageY - el.getBoundingClientRect().top;
    var dx = x - startX, dy = y - startY;
    if(Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD){
      didDrag = true;
    }
    el.scrollLeft = scrollLeft - dx;
    el.scrollTop  = scrollTop  - dy;
  });

  // Wire child images — only fire lightbox if not a drag
  el.querySelectorAll('img').forEach(function(img){
    img.style.cursor = 'inherit'; // inherit grab cursor
    img.addEventListener('click', function(e){
      if(didDrag) return; // suppress if user dragged
      var src     = img.src;
      var caption = '';
      var capEl   = img.closest('[class*="card"]');
      if(capEl){
        var c = capEl.querySelector('[class*="caption"]');
        if(c) caption = c.textContent.replace(/\s+/g,' ').trim();
      }
      lbShow(src, caption);
    });
  });
}

// Apply to all scrollable rails
document.querySelectorAll('.design-img-rail, .photo-rail-scroll').forEach(addDragScroll);

// JB chart static HTML — injected by renderJailbreak()
var JB_CHART_HTML = '<div class="jb-chart">\n      <div class="jb-chart-head">\n        <div class="jb-chart-head-cell">Capability</div>\n        <div class="jb-chart-head-cell">Stock iOS</div>\n        <div class="jb-chart-head-cell jb-col">Jailbroken</div>\n      </div><div class="jb-row"><div class="jb-cell feature-name">Multitasking</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Excluded from 2G in iOS 4</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Backgrounder app, full background processes</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Alternative app stores</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> App Store only</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Cydia, AppSync, Installous</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Visual theming</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> No customisation</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Winterboard — full icon packs, UI reskins</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Quick settings toggle</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Requires navigating to Settings app</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> SBSettings — pull-down overlay from anywhere</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">WiFi tethering</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Not available (WiFi-only device)</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> PdaNet — USB tethering from device WiFi</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Home screen customisation</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Fixed grid, no widgets</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Infinidock, FolderEnhancer, lockscreen widgets</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">System file access</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Sandboxed, no root</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> SSH, iFile, terminal — full filesystem access</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">3rd-party background audio</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Stock music app only</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Any app, background playback via Backgrounder</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Custom wallpapers</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Excluded from 2G in iOS 4</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Winterboard — any image, lock & home screen</span></div></div></div>';

// Populated by renderTimeline()
var TL = [];


// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE ENGINE — do not edit below this line
// ═══════════════════════════════════════════════════════════════════════

function imgRail(imgs){
  return imgs.map(function(im){
    return '<div class="design-img-card">'
      +'<img src="'+im.src+'" alt="'+im.alt+'" loading="lazy">'
      +'<div class="design-img-caption"><strong>'+im.strong+'</strong> '+im.caption+'</div>'
      +'</div>';
  }).join('\n');
}

function paraList(paras){
  return paras.map(function(p){ return '<p>'+p+'</p>'; }).join('\n');
}

function secLabel(icon, text){
  return '<div class="sec-label">'+icon+text+'</div>';
}

// ── renderHero ────────────────────────────────────────────────────────
function renderHero(){
  var h = PAGE_DATA.hero;
  document.title = PAGE_DATA.pageTitle;
  var el = document.getElementById('hero-content');
  if(!el) return;
  el.innerHTML =
    '<div class="hero-eyebrow jb"><span class="eyebrow-dot"></span>'+h.eyebrow+'</div>'
    +'<h1 class="hero-title fr">'+h.title+'</h1>'
    +'<div class="hero-gen">'
    +'  <span class="hero-gen-name fr">'+h.gen+'</span>'
    +'  <span class="hero-gen-sep"> · </span>'
    +'  <span class="hero-gen-model jb">Model <span>'+h.model+'</span></span>'
    +'</div>'
    +'<p class="hero-intro">'+h.intro+'</p>'
    +'<div class="stats-grid">'
    + h.stats.map(function(s){
        return '<div class="stat-cell">'
          +'<span class="stat-val fr">'+s.val+'</span>'
          +'<span class="stat-lbl">'+s.lbl+'</span>'
          +'</div>';
      }).join('')
    +'</div>';
}

// ── renderOverview ────────────────────────────────────────────────────
function renderOverview(){
  var o = PAGE_DATA.overview;
  var el = document.getElementById('overview-content');
  if(!el) return;
  var ib = o.infobox;
  el.innerHTML =
    '<div class="ov-inner">'
    +'<div class="ov-text">'
    +'<div class="sec-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>Overview</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+PAGE_DATA.overview.heading+'</h2>'
    + paraList(o.paragraphs)
    +'</div>'
    +'<aside class="infobox">'
    +'  <div class="ib-name fr">'+ib.name+'</div>'
    +'  <table class="ib-table"><tbody>'
    + ib.rows.map(function(r){ return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>'; }).join('')
    +'  </tbody></table>'
    +'  <span class="ib-disc jb">'+ib.discontinued+'</span>'
    +'</aside>'
    +'</div>';
}

// ── renderPhotoRail ───────────────────────────────────────────────────
function renderPhotoRail(){
  var el = document.getElementById('photo-rail-inner');
  if(!el) return;
  el.innerHTML = '<div class="photo-rail-scroll" id="photoRailScroll">'
    +'<div class="photo-rail-label">Photo archive <span>→</span></div>'
    + PAGE_DATA.photos.map(function(im){
        return '<div class="photo-rail-card">'
          +'<img src="'+im.src+'" alt="'+im.alt+'" loading="lazy">'
          +'<div class="design-img-caption"><strong>'+im.strong+'</strong> '+im.caption+'</div>'
          +'</div>';
      }).join('')
    +'</div>';
  var scroll = document.getElementById('photoRailScroll');
  if(scroll) addDragScroll(scroll);
}

// ── renderTimeline ────────────────────────────────────────────────────
function renderTimeline(){
  var track = document.getElementById('tlTrack');
  if(!track) return;
  // Build TL modal array from TIMELINE
  TL = TIMELINE.map(function(e){
    return {tag:e.month+(e.day?' '+e.day:'')+', '+e.year+' \xb7 '+e.tag, title:e.title, body:e.body};
  });
  // Rebuild positioning after render
  track.innerHTML = TIMELINE.map(function(e,i){
    var daySpan = e.day ? '<span class="sc-float-day fr">'+e.day+'</span> ' : '';
    return '<div class="station" data-date="'+e.dateKey+'">'
      +'<div class="station-event-top">'
      +'<div class="sc-float-date">'
      +'<span class="sc-float-month fr">'+e.month+'</span> '
      + daySpan
      +'<span class="sc-float-year fr">'+e.year+'</span>'
      +'</div>'
      +'<div class="station-card" onclick="openTl('+i+')">'
      +'<div class="sc-bar"></div>'
      +'<div class="sc-body">'
      +'<div class="sc-tag jb">'+e.tag+'</div>'
      +'<div class="sc-title fr">'+e.title+'</div>'
      +'<p class="sc-prose">'+e.preview+'</p>'
      +'<div class="sc-footer">'
      +'<span class="sc-expand jb">Details <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>'
      +'<span class="sc-num jb">'+String(i+1).padStart(2,'0')+'</span>'
      +'</div></div></div></div>'
      +'<div class="station-event-spine"><div class="station-dot"></div></div>'
      +'</div>';
  }).join('\n');
  // positionTimeline called on window.onload — see initPage()
}

// ── renderTLHeader ────────────────────────────────────────────────────
function renderTLHeader(){
  var el = document.getElementById('tl-header');
  if(!el) return;
  var tl = PAGE_DATA.timeline;
  el.innerHTML =
    '<div class="sec-label tl-label">'+
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    +'History'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+tl.heading+'</h2>'
    +'<div class="tl-scroll-hint jb">'+tl.hint+'</div>';
}

// ── renderDelta ───────────────────────────────────────────────────────
function renderDelta(){
  var d  = PAGE_DATA.delta;
  var el = document.getElementById('delta-content');
  if(!el) return;

  function dataRow(r){
    // noOld: show dot + italic missing text (or — if no text)
    var oldCell = r.noOld
      ? '<td class="gd-old"><span class="gd-dot"></span><span class="gd-old-val missing">'+(r.oldText||'—')+'</span></td>'
      : '<td class="gd-old"><span class="gd-old-val">'+r.oldText+'</span></td>';
    return '<tr class="gd-row">'
      +'<td class="gd-label">'
      +'<span class="gd-label-name jb">'+r.label+'</span>'
      +'<span class="gd-label-desc">'+r.desc+'</span>'
      +'</td>'
      + oldCell
      +'<td class="gd-new">'
      +'<span class="gd-new-val">'+r.newHtml+'</span>'
      +(r.chipCls?'<span class="'+r.chipCls+'">'+r.chipText+'</span>':'')
      +'</td>'
      +'</tr>';
  }

  function secRow(label, icon, col1, col2){
    return '<tr class="gd-sec">'
      +'<td class="gd-sec-main">'+icon+label+'</td>'
      +'<td class="gd-sec-col">'+col1+'</td>'
      +'<td class="gd-sec-col">'+col2+'</td>'
      +'</tr>';
  }

  var hwIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  var swIcon = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';

  el.innerHTML =
    '<div class="delta-inner">'
    +'<div class="sec-label">'
    +'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
    +'Generation delta'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+d.heading+'</h2>'
    +(d.intro?'<div class="delta-prose"><p>'+d.intro+'</p></div>':'')
    +'<div class="gd-wrap">'
    +'<table class="gd"><colgroup><col class="gd-c1"><col class="gd-c2"><col class="gd-c3"></colgroup>'
    +'<thead>'
    +'<tr class="gd-gen">'
    +'<td class="gd-gen-label"></td>'
    +'<td class="gd-gen-old">'
    +'<span class="gd-tag jb">'+d.prevGen.tag+'</span>'
    +'<span class="gd-name fr">'+d.prevGen.name+'</span>'
    +'<span class="gd-year jb">'+d.prevGen.year+'</span>'
    +'</td>'
    +'<td class="gd-gen-new">'
    +'<span class="gd-tag jb">'+d.thisGen.tag+'</span>'
    +'<span class="gd-name fr">'+d.thisGen.name+'</span>'
    +'<span class="gd-year jb">'+d.thisGen.year+'</span>'
    +'</td>'
    +'</tr>'
    +'</thead>'
    +'<tbody>'
    + secRow('Hardware', hwIcon, d.prevGen.name, d.thisGen.name)
    + d.hwRows.map(dataRow).join('')
    + secRow('Software', swIcon, d.prevGen.name, d.thisGen.name)
    + d.swRows.map(dataRow).join('')
    +'</tbody></table>'
    +'</div>'
    +(d.footnote?'<div class="gd-foot jb">'+d.footnote+'</div>':'')
    +'</div>';
}


// ── renderCfg ─────────────────────────────────────────────────────────
function renderCfg(){
  var c  = PAGE_DATA.cfg;
  var el = document.getElementById('cfg-content');
  if(!el) return;

  var regular = c.items.filter(function(it){ return !it.cls.includes('rev'); });
  var revised  = c.items.filter(function(it){ return  it.cls.includes('rev'); });

  function cfgRow(item){
    return '<div class="cfg-row">'
      +'<div class="cfg-cap fr">'+item.gb+'<span>GB</span></div>'
      +'<div class="cfg-track"><div class="cfg-fill '+item.cls+'"><span class="cfg-model">'+item.model+'</span></div></div>'
      +'<div class="cfg-price fr">'+item.price+'</div>'
      +'<div class="cfg-date-row"><span class="cfg-dates">'+item.dates+'</span></div>'
      +'</div>';
  }

  el.innerHTML =
    '<div class="cfg-inner">'
    +'<div class="sec-label">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/></svg>'
    +'Configurations'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+c.heading+'</h2>'
    +(c.intro && (c.intro[0]||c.intro[1])
      ? '<div class="cfg-prose">'
        +(c.intro[0]?'<p>'+c.intro[0]+'</p>':'')
        +(c.intro[1]?'<p>'+c.intro[1]+'</p>':'')
        +'</div>'
      : '')
    +'<div class="cfg-chart">'
    +'<div class="cfg-chart-head">'
    +'<div class="cfg-chart-title fr">'+c.chartTitle+'</div>'
    +'</div>'
    +'<div class="cfg-bars">'
    + regular.map(cfgRow).join('')
    +(c.dividerLabel?'<div class="cfg-divider"></div><div class="cfg-divider-label jb">'+c.dividerLabel+'</div>':'')
    + revised.map(cfgRow).join('')
    +'</div>'
    +'</div>'
    +(c.footer?'<div class="cfg-footer">'+c.footer+'</div>':'')
    +'</div>';
}


// ── renderSection (prose + right image rail) ──────────────────────────
function renderProseRail(elId, secData, labelIcon, labelText){
  var el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML =
    '<div class="wiki-section-inner">'
    +'<div class="design-cols">'
    +'<div class="wiki-prose-full">'
    +'<div class="sec-label">'+labelIcon+labelText+'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+secData.heading+'</h2>'
    + paraList(secData.paragraphs)
    +'</div>'
    +'<div class="design-img-rail" id="'+elId+'Rail">'
    +'<div class="design-img-rail-header"><span class="design-img-rail-title">Archive</span><span>↕</span></div>'
    + imgRail(secData.images)
    +'</div></div></div>';
  var rail = document.getElementById(elId+'Rail');
  if(rail) addDragScroll(rail);
}

// ── renderJailbreak ───────────────────────────────────────────────────
function renderJailbreak(){
  var jb = PAGE_DATA.jailbreak;
  var el = document.getElementById('jailbreak-content');
  if(!el) return;
  var modelsHtml = jb.models.map(function(m){
    return '<div class="jb-model-card '+m.cls+'">'
      +'<div class="jb-model-status jb">'+m.status+'</div>'
      +'<div class="jb-model-name fr">'+m.name+'</div>'
      +'<div class="jb-model-skus jb">'+m.skus+'</div>'
      +'<div class="jb-model-detail">'+m.detail+'</div>'
      +'</div>';
  }).join('');
  el.innerHTML =
    '<div class="wiki-section-inner">'
    +'<div class="sec-label">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    +'Jailbreaking'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+jb.heading+'</h2>'
    +'<div class="jb-two-col">'
    +'<div class="wiki-prose">'+paraList(jb.paragraphs)+'</div>'
    + JB_CHART_HTML
    +'</div>'
    +'<div class="jb-models">'+modelsHtml+'</div>'
    +'</div>';
}

// ── renderBudget ──────────────────────────────────────────────────────
function renderBudget(){
  var bu = PAGE_DATA.budget;
  var el = document.getElementById('budget-content');
  if(!el) return;
  el.innerHTML =
    '<div class="wiki-section-inner">'
    +'<div class="sec-label">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    +'Market positioning'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+bu.heading+'</h2>'
    +'<div class="wiki-prose-full">'+paraList(bu.paragraphs)+'</div>'
    +'</div>';
}

// ── renderOS ──────────────────────────────────────────────────────────
function renderOS(){
  var os = PAGE_DATA.os;
  var el = document.getElementById('os-content');
  if(!el) return;
  var lanesHtml = os.lanes.map(function(l){
    var badgeHtml = l.badge ? '<span class="lane-badge '+l.badgeType+'">'+l.badge+'</span>' : '';
    return '<div class="lane-seg '+l.type+'" style="'+l.style+'">'
      + badgeHtml
      +'<div class="lane-ver fr">'+l.ver+'</div>'
      +'<div class="lane-date jb">'+l.date+'</div>'
      +'</div>';
  }).join('');
  var notesHtml = os.notes.map(function(n){
    return '<div class="lane-note">'
      +'<span class="lane-note-dot" style="background:'+n.color+'"></span>'
      +'<span><strong>'+n.label+'</strong> &mdash; '+n.text+'</span>'
      +'</div>';
  }).join('');
  el.innerHTML =
    '<div class="os-inner">'
    +'<div class="sec-label">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>'
    +'Operating system support'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+os.heading+'</h2>'
    +'<div class="os-prose">'+paraList(os.paragraphs)+'</div>'
    +'<div class="lane-wrap">'
    +'<div class="lane-head">'
    +'<div class="lane-title fr">'+os.title+'</div>'
    +'<div class="lane-range jb">'+os.range+'</div>'
    +'</div>'
    +'<div class="lane-scroll"><div class="lane">'+lanesHtml+'</div></div>'
    +'<div class="lane-notes">'+notesHtml+'</div>'
    +'<div class="lane-legend">'
    +'<div class="lane-leg"><div class="lane-leg-sw" style="background:#d1fae5;border:1px solid #a7f3d0;"></div>Full support</div>'
    +'<div class="lane-leg"><div class="lane-leg-sw" style="background:#fef3c7;border:1px solid #fde68a;"></div>Partial</div>'
    +'<div class="lane-leg"><div class="lane-leg-sw" style="background:#f4f4f6;border:1px dashed rgba(0,0,0,.15);"></div>Not supported</div>'
    +'</div>'
    +'</div>'
    +'</div>';
}

// ── renderControversies ───────────────────────────────────────────────
function renderControversies(){
  var co = PAGE_DATA.controversies;
  var el = document.getElementById('controversies-content');
  if(!el) return;
  var subIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>';
  var proseHtml = co.items.map(function(item, ci){
    return '<div class="wiki-sub">'+(item.icon||subIcon)+item.title+'</div><p>'+item.body+'</p>';
  }).join('\n');
  el.innerHTML =
    '<div class="wiki-section-inner">'
    +'<div class="design-cols">'
    +'<div class="wiki-prose-full">'
    +'<div class="sec-label">'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>'
    +'Controversies'
    +'</div>'
    +'<h2 class="sec-h2 fr" style="margin-bottom:24px;">'+co.heading+'</h2>'
    + proseHtml
    +'</div>'
    +'<div class="design-img-rail" id="contrRail">'
    +'<div class="design-img-rail-header"><span class="design-img-rail-title">Press archive</span><span>↕</span></div>'
    + imgRail(co.images)
    +'</div></div></div>';
  var rail = document.getElementById('contrRail');
  if(rail) addDragScroll(rail);
}

// ── renderSpecs ───────────────────────────────────────────────────────
function renderSpecs(){
  var sp = PAGE_DATA;
  var el = document.getElementById('specs-content');
  if(!el) return;

  var eyebrowIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>';

  el.innerHTML =
    '<div class="spec-inner">'
    +'<div class="spec-eyebrow jb">'+eyebrowIcon+'Technical specifications</div>'
    +'<div class="spec-title fr">'+sp.specHeading+'</div>'
    +'<div class="spec-sub jb">'+sp.specSub+'</div>'
    +'<div class="spec-grid">'
    + sp.specs.map(function(card, ci){
        var rowsHtml = card.rows.map(function(r){
          return '<div class="spec-row">'
            +'<dt class="spec-k">'+r[0]+'</dt>'
            +'<dd class="spec-v">'+r[1]+'</dd>'
            +'</div>';
        }).join('');
        return '<div class="spec-card">'
          +'<div class="spec-card-head">'
          +(card.icon||'')
          +'<span>'+card.title+'</span>'
          +'</div>'
          +'<dl class="spec-list">'+rowsHtml+'</dl>'
          +'</div>';
      }).join('')
    +'</div>'
    +'</div>';
}


// ── renderWIKI_TOC ────────────────────────────────────────────────────
function renderWIKI_TOC(){
  // WIKI_TOC already defined in <head> — nothing to do
}

// ── INIT ──────────────────────────────────────────────────────────────
function initPage(){
  renderWIKI_TOC();
  renderHero();
  renderOverview();
  if(PAGE_DATA.photos && PAGE_DATA.photos.length) renderPhotoRail();
  renderTLHeader();
  renderTimeline();
  renderDelta();
  renderCfg();
  if(PAGE_DATA.gaming) renderProseRail('gaming-content', PAGE_DATA.gaming,
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>',
    'Cultural impact');
  if(PAGE_DATA.jailbreak){ renderJailbreak(); }
  else{ var jbEl=document.querySelector(".jailbreak-section"); if(jbEl) jbEl.style.display="none"; }
  if(PAGE_DATA.budget){ renderBudget(); }
  else{ var bgEl=document.querySelector(".budget-section"); if(bgEl) bgEl.style.display="none"; }
  if(PAGE_DATA.design) renderProseRail('design-content', PAGE_DATA.design,
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
    'Industrial design');
  renderOS();
  if(PAGE_DATA.controversies) renderControversies();
  renderSpecs();
}



// Run everything

var _tlDragged=false;
function openTl(i){if(_tlDragged)return;var d=TL[i];document.getElementById("tlTag").textContent=d.tag;document.getElementById("tlTitle").textContent=d.title;document.getElementById("tlBody").innerHTML=d.body;document.getElementById("tlPage").textContent=(i+1).toString().padStart(2,"0")+" / "+TL.length;document.getElementById("tlModal").classList.add("open");document.body.style.overflow="hidden";}
function closeTl(){document.getElementById("tlModal").classList.remove("open");document.body.style.overflow="";}
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeTl();});
function positionTimeline(){

  var CARD_W=280,SLIM_W=68,PAD=24,SPINE_Y=339,TRACK_H=368;
  var MO={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
  function pd(s){s=(s||"").trim();var m=s.match(/^(\w{3})\s+(\d{4})$/);if(m)return{y:+m[2],m:MO[m[1]]||1};var m2=s.match(/(\d{4})/);return m2?{y:+m2[1],m:1}:null;}
  function dm(a,b){return(b.y-a.y)*12+(b.m-a.m);}
  function fmt(n){if(n<1)return null;if(n===1)return"1 mo";if(n<12)return n+" mo";var y=Math.round(n/12);return y+" yr";}
  var track=document.getElementById("tlTrack");if(!track)return;
  var stations=[].slice.call(track.querySelectorAll(".station"));
  var items=stations.map(function(el){return{el:el,d:pd(el.getAttribute("data-date"))};}).filter(function(x){return x.d;});
  if(items.length<2)return;
  var byYear={};
  items.forEach(function(it){(byYear[it.d.y]||(byYear[it.d.y]=[])).push(it);});
  Object.values(byYear).forEach(function(g){g.sort(function(a,b){return a.d.m-b.d.m;});});
  var firstYr=Math.min.apply(null,Object.keys(byYear).map(Number));
  var lastYr=Math.max.apply(null,Object.keys(byYear).map(Number));
  var yearX={},cur=PAD;
  for(var yr=firstYr;yr<=lastYr;yr++){yearX[yr]=cur;var n=(byYear[yr]||[]).length;cur+=(n>0?n*CARD_W:SLIM_W);}
  var totalW=cur+PAD;
  track.style.cssText="display:block;position:relative;width:"+totalW+"px;height:"+TRACK_H+"px;padding-bottom:34px;min-width:unset;box-sizing:content-box;";
  var spine=document.createElement("div");
  spine.style.cssText="position:absolute;left:0;right:0;top:"+SPINE_Y+"px;height:1px;background:rgba(0,0,0,.12);z-index:1;";
  track.appendChild(spine);
  var posX=new Map();
  Object.keys(byYear).forEach(function(yr){var xw=yearX[+yr];byYear[+yr].forEach(function(it){it.el.style.position="absolute";it.el.style.top="0";it.el.style.left=xw+"px";it.el.style.width=CARD_W+"px";posX.set(it.el,xw);xw+=CARD_W;});});
  var ruler=document.createElement("div");ruler.className="tl-ruler";
  for(var y=firstYr;y<=lastYr;y++){var x=yearX[y];var nc=(byYear[y]||[]).length;var w=nc?nc*CARD_W:SLIM_W;var b=document.createElement("div");b.className="tl-band"+(y%2===0?" tl-band-even":"");b.style.cssText="left:"+x+"px;width:"+w+"px";track.appendChild(b);var tick=document.createElement("div");tick.className="tl-yr";tick.style.left=x+"px";tick.innerHTML="<span"+(nc===0?" style=\"opacity:.45;font-size:7px\"":"")+">"+y+"</span>";ruler.appendChild(tick);}
  track.appendChild(ruler);
  var chipY=160;
  var sorted=items.slice().sort(function(a,b){return(a.d.y*12+a.d.m)-(b.d.y*12+b.d.m);});
  for(var i=0;i<sorted.length-1;i++){var gap=dm(sorted[i].d,sorted[i+1].d);if(gap<1)continue;var label=fmt(gap);if(!label)continue;var cx1=(posX.get(sorted[i].el)||0)+CARD_W;var cx2=(posX.get(sorted[i+1].el)||0);var mid=(cx1+cx2)/2;var chip=document.createElement("div");chip.className="tl-gap";chip.style.cssText="left:"+mid+"px;top:"+chipY+"px";chip.textContent=label;track.appendChild(chip);}
  stations.forEach(function(el){
    var card=el.querySelector(".station-card");
    var spine=el.querySelector(".station-event-spine");
    if(!card||!spine)return;
    // getBoundingClientRect forces layout sync — always accurate
    var stRect=el.getBoundingClientRect();
    var cRect=card.getBoundingClientRect();
    var sRect=spine.getBoundingClientRect();
    var barTop=cRect.bottom-stRect.top;
    var barH=Math.max(0,(sRect.top+sRect.height/2)-cRect.bottom);
    if(barH<=0)return;
    var bar=document.createElement("div");
    bar.style.cssText="position:absolute;left:50%;transform:translateX(-50%);top:"+barTop+"px;width:1px;height:"+barH+"px;background:rgba(0,0,0,.15);pointer-events:none;z-index:1;";
    el.appendChild(bar);
  });
  var outer=document.getElementById("tlOuter");var dn=false,sx,sl,mx;
  outer.addEventListener("mousedown",function(e){dn=true;_tlDragged=false;sx=e.pageX-outer.offsetLeft;sl=outer.scrollLeft;mx=e.pageX;});
  outer.addEventListener("mouseleave",function(){dn=false;});
  outer.addEventListener("mouseup",function(){dn=false;});
  outer.addEventListener("mousemove",function(e){if(!dn)return;var dx=e.pageX-mx;if(Math.abs(dx)>4){_tlDragged=true;e.preventDefault();}outer.scrollLeft=sl-(e.pageX-outer.offsetLeft-sx)*1.2;});
}

// positionTimeline: retry until station cards have non-zero height,
// which confirms CSS is applied and layout is computed.
function schedulePositionTimeline(attemptsLeft) {
  if (attemptsLeft <= 0) return;
  var track = document.getElementById('tlTrack');
  if (!track) { setTimeout(function(){ schedulePositionTimeline(attemptsLeft-1); }, 100); return; }
  var firstCard = track.querySelector('.station-card');
  if (!firstCard || firstCard.getBoundingClientRect().height === 0) {
    setTimeout(function(){ schedulePositionTimeline(attemptsLeft-1); }, 100);
    return;
  }
  positionTimeline();
}
// Start trying on DOMContentLoaded, keep retrying up to 2 seconds
document.addEventListener('DOMContentLoaded', function(){
  schedulePositionTimeline(20);
});
window.addEventListener('load', function(){
  schedulePositionTimeline(10);
});

