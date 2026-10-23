/* ====================================================================
   wiki-ipod-touch.js
   ViziWiki · iPod touch wiki — shared render engine
   All iPod touch gen pages load this file AFTER defining PAGE_DATA.
   Change any render function here and it propagates to every gen page.
   (The timeline now lives in the Timeline bank — _includes/visuals/
   timeline + bank-timeline.css — not here.)

   SECTIONS CONTROLLED BY PAGE_DATA FLAGS:
   • PAGE_DATA.jailbreak     — Jailbreaking section
   (Everything else migrated to canon banks: the photo rail → photo-rail
   bank; gaming / budget / design / controversies → the prose-rail bank,
   rendered from front-matter. Omit/null jailbreak to skip it.)
   ==================================================================== */

// JB chart static HTML — injected by renderJailbreak()
var JB_CHART_HTML = '<div class="jb-chart">\n      <div class="jb-chart-head">\n        <div class="jb-chart-head-cell">Capability</div>\n        <div class="jb-chart-head-cell">Stock iOS</div>\n        <div class="jb-chart-head-cell jb-col">Jailbroken</div>\n      </div><div class="jb-row"><div class="jb-cell feature-name">Multitasking</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Excluded from 2G in iOS 4</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Backgrounder app, full background processes</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Alternative app stores</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> App Store only</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Cydia, AppSync, Installous</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Visual theming</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> No customisation</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Winterboard — full icon packs, UI reskins</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Quick settings toggle</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Requires navigating to Settings app</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> SBSettings — pull-down overlay from anywhere</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">WiFi tethering</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Not available (WiFi-only device)</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> PdaNet — USB tethering from device WiFi</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Home screen customisation</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Fixed grid, no widgets</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Infinidock, FolderEnhancer, lockscreen widgets</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">System file access</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Sandboxed, no root</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> SSH, iFile, terminal — full filesystem access</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">3rd-party background audio</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Stock music app only</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Any app, background playback via Backgrounder</span></div></div>\n<div class="jb-row"><div class="jb-cell feature-name">Custom wallpapers</div><div class="jb-cell"><span class="jb-no">&#10005;</span><span class="jb-note"> Excluded from 2G in iOS 4</span></div><div class="jb-cell"><span class="jb-yes">&#10003;</span><span class="jb-note"> Winterboard — any image, lock & home screen</span></div></div></div>';


// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE ENGINE — do not edit below this line
// ═══════════════════════════════════════════════════════════════════════

function paraList(paras){
  return paras.map(function(p){ return '<p>'+p+'</p>'; }).join('\n');
}

function secLabel(icon, text){
  return '<div class="wiki-section-eyebrow">'+icon+text+'</div>';
}



// ── renderPhotoRail / renderProseRail / renderBudget / renderControversies ──
// All removed — the photo rail is the photo-rail bank, and the prose+rail
// sections (gaming / budget / design / controversies) are the prose-rail bank
// (_includes/sections/prose-rail-section.html, rendered from front matter).

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

// ── renderWIKI_TOC ────────────────────────────────────────────────────
function renderWIKI_TOC(){
  // WIKI_TOC already defined in <head> — nothing to do
}

// ── INIT ──────────────────────────────────────────────────────────────
function initPage(){
  renderWIKI_TOC();
  if(PAGE_DATA.jailbreak){ renderJailbreak(); }
  else{ var jbEl=document.querySelector(".jailbreak-section"); if(jbEl) jbEl.style.display="none"; }
}
