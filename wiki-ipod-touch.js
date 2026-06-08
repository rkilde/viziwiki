/* ====================================================================
   wiki-ipod-touch.js
   ViziWiki · iPod touch wiki — shared render engine
   All iPod touch gen pages load this file AFTER defining PAGE_DATA.
   Change any render function here and it propagates to every gen page.
   (The timeline now lives in the Timeline bank — _includes/visuals/
   timeline + bank-timeline.css — not here.)

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
  return '<div class="wiki-section-eyebrow">'+icon+text+'</div>';
}



// ── renderPhotoRail ───────────────────────────────────────────────────
function renderPhotoRail(){
  var el = document.getElementById('photo-rail-inner');
  if(!el) return;
  el.innerHTML = '<div class="photo-rail-scroll wiki-section-bleed" id="photoRailScroll">'
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






// ── renderSection (prose + right image rail) ──────────────────────────
function renderProseRail(elId, secData, labelIcon, labelText){
  var el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML =
    '<div class="wiki-section-inner">'
    +'<div class="design-cols">'
    +'<div class="wiki-section-prose">'
    +'<div class="wiki-section-eyebrow">'+labelIcon+labelText+'</div>'
    +'<h2 class="wiki-section-title" style="margin-bottom:24px;">'+secData.heading+'</h2>'
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
    +'<div class="wiki-section-eyebrow">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    +'Jailbreaking'
    +'</div>'
    +'<h2 class="wiki-section-title" style="margin-bottom:24px;">'+jb.heading+'</h2>'
    +'<div class="jb-two-col">'
    +'<div class="wiki-section-prose">'+paraList(jb.paragraphs)+'</div>'
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
    +'<div class="wiki-section-eyebrow">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
    +'Market positioning'
    +'</div>'
    +'<h2 class="wiki-section-title" style="margin-bottom:24px;">'+bu.heading+'</h2>'
    +'<div class="wiki-section-prose">'+paraList(bu.paragraphs)+'</div>'
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
    '<div class="wiki-section-inner">'
    +'<div class="wiki-section-eyebrow">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>'
    +'Operating system support'
    +'</div>'
    +'<h2 class="wiki-section-title" style="margin-bottom:24px;">'+os.heading+'</h2>'
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
    return '<div class="wiki-section-subtitle">'+(item.icon||subIcon)+item.title+'</div><p>'+item.body+'</p>';
  }).join('\n');
  el.innerHTML =
    '<div class="wiki-section-inner">'
    +'<div class="design-cols">'
    +'<div class="wiki-section-prose">'
    +'<div class="wiki-section-eyebrow">'
    +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>'
    +'Controversies'
    +'</div>'
    +'<h2 class="wiki-section-title" style="margin-bottom:24px;">'+co.heading+'</h2>'
    + proseHtml
    +'</div>'
    +'<div class="design-img-rail" id="contrRail">'
    +'<div class="design-img-rail-header"><span class="design-img-rail-title">Press archive</span><span>↕</span></div>'
    + imgRail(co.images)
    +'</div></div></div>';
  var rail = document.getElementById('contrRail');
  if(rail) addDragScroll(rail);
}



// ── renderWIKI_TOC ────────────────────────────────────────────────────
function renderWIKI_TOC(){
  // WIKI_TOC already defined in <head> — nothing to do
}

// ── INIT ──────────────────────────────────────────────────────────────
function initPage(){
  renderWIKI_TOC();
  if(PAGE_DATA.photos && PAGE_DATA.photos.length) renderPhotoRail();
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
}
