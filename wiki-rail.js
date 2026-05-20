(function(){
  var T=window.WIKI_TOC;
  if(!T)return;

  var CHEV_DN='<svg viewBox="0 0 16 16"><polyline points="4,6 8,10 12,6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHEV_LT='<svg viewBox="0 0 14 14"><polyline points="9,3 5,7 9,11" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SAVE_ICO='<svg viewBox="0 0 14 14"><path d="M3.5 2L10.5 2L10.5 12L7 9.5L3.5 12Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var HOME_ICO='<svg viewBox="0 0 14 14"><path d="M2 6.5L7 2L12 6.5V12H9V9H5V12H2V6.5Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var HAM_ICO='<svg viewBox="0 0 14 14"><line x1="2" y1="4" x2="12" y2="4" stroke-width="1.6" stroke-linecap="round"/><line x1="2" y1="7" x2="12" y2="7" stroke-width="1.6" stroke-linecap="round"/><line x1="2" y1="10" x2="12" y2="10" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function buildBody(prefix){
    var html='';
    html+='<a class="wk-home" href="'+T.wikiHome+'">'+HOME_ICO+'<span>'+T.wikiTitle+' Wiki Home</span></a>';
    html+='<div class="wk-div"></div>';
    /* Wiki Categories */
    html+='<div class="wk-spill" onclick="wkToggle(this)"><span class="wk-spill-lbl"><span class="wk-spill-d">Wiki Categories</span></span><span class="wk-spill-chev">'+CHEV_DN+'</span></div>';
    html+='<div class="wk-sbody closed">';
    T.categories.forEach(function(c){
      html+='<a class="wk-cat" href="'+c.url+'"><span class="wk-dot" style="background:'+c.color+'"></span><span class="wk-cat-lbl">'+c.name+'</span></a>';
    });
    html+='</div>';
    html+='<div class="wk-div"></div>';
    /* Page sections */
    var currentGroup='';
    var num=0;
    T.sections.forEach(function(s){
      if(s.group!==currentGroup){
        currentGroup=s.group;
        html+='<div class="wk-toc-grp">'+s.group+'</div>';
      }
      num++;
      var n=num<10?'0'+num:''+num;
      html+='<a class="wk-toc-row" href="#'+s.id+'"><span class="wk-toc-num">'+n+'</span><span class="wk-toc-lbl">'+s.label+'</span></a>';
    });
    return html;
  }

  function railHead(){
    return '<div class="wk-head">'
      +'<button class="wk-save-btn" title="Save page">'+SAVE_ICO+'</button>'
      +'<div class="wk-logo">'+T.wikiLogo+'</div>'
      +'<div class="wk-text"><div class="wk-name">'+T.wikiTitle+'</div><div class="wk-sub"><span class="v">Visual</span> Wiki</div></div>'
      +'<div class="wk-page-logo">'+T.pageLogo+'</div>'
      +'<button class="wk-chev-btn" title="Collapse rail" onclick="wkCollapse()">'+CHEV_LT+'</button>'
      +'</div>';
  }

  /* Build web rail */
  var rail=document.createElement('div');
  rail.className='wk-rail';
  rail.id='wk-rail';
  rail.innerHTML=railHead()+'<div class="wk-body">'+buildBody('r')+'</div>';

  /* Build mobile top bar */
  var topbar=document.createElement('div');
  topbar.className='wk-topbar';
  topbar.innerHTML='<button class="wk-topbar-btn" title="Save page">'+SAVE_ICO+'</button>'
    +'<div class="wk-topbar-logo">'+T.wikiLogo+'</div>'
    +'<div class="wk-topbar-text"><div class="wk-topbar-name">'+T.wikiTitle+'</div><div class="wk-topbar-sub"><span class="v">Visual</span> Wiki</div></div>'
    +'<div class="wk-page-logo wk-topbar-page-logo">'+T.pageLogo+'</div>'
    +'<button class="wk-topbar-ham" onclick="wkOpenMob()" title="Open menu">'+HAM_ICO+'</button>';

  /* Build mobile overlay drawer (same dpanel design) */
  var mob=document.createElement('div');
  mob.className='wk-mob-overlay';
  mob.id='wk-mob';
  mob.innerHTML='<div class="wk-mob-panel">'
    +'<div class="wk-mob-head wk-head">'
    +'<button class="wk-save-btn" style="margin-right:9px;" title="Save page">'+SAVE_ICO+'</button>'
    +'<div class="wk-logo">'+T.wikiLogo+'</div>'
    +'<div class="wk-text" style="margin-left:9px;"><div class="wk-name">'+T.wikiTitle+'</div><div class="wk-sub"><span class="v">Visual</span> Wiki</div></div>'
    +'<div class="wk-page-logo" style="margin-left:auto;margin-right:6px;">'+T.pageLogo+'</div>'
    +'<button class="wk-chev-btn" title="Close" onclick="wkCloseMob()">'+CHEV_LT+'</button>'
    +'</div>'
    +'<div class="wk-mob-body">'+buildBody('m')+'</div>'
    +'</div>'
    +'<div class="wk-mob-scrim" onclick="wkCloseMob()"></div>';

  /* Inject: wrap body content in wk-wrap flex layout */
  var body=document.body;
  var wrapper=document.createElement('div');
  wrapper.className='wk-wrap';
  wrapper.style.cssText='display:flex;flex-direction:column;';

  /* Move all existing body children into a main div */
  var mainDiv=document.createElement('div');
  mainDiv.className='wk-main';
  while(body.firstChild){mainDiv.appendChild(body.firstChild);}

  /* Assemble: topbar above, then [rail | main] */
  body.appendChild(topbar);
  var rowDiv=document.createElement('div');
  rowDiv.style.cssText='display:flex;flex:1;align-items:flex-start;';
  rowDiv.appendChild(rail);
  rowDiv.appendChild(mainDiv);
  body.appendChild(rowDiv);
  body.appendChild(mob);

  /* Controls */
  window.wkCollapse=function(){
    var r=document.getElementById('wk-rail');
    r.classList.toggle('collapsed');
  };
  window.wkToggle=function(el){
    el.classList.toggle('open');
    var body=el.nextElementSibling;
    if(body){body.classList.toggle('open');body.classList.toggle('closed');}
  };
  window.wkOpenMob=function(){
    document.getElementById('wk-mob').classList.add('open');
    document.body.style.overflow='hidden';
  };
  window.wkCloseMob=function(){
    document.getElementById('wk-mob').classList.remove('open');
    document.body.style.overflow='';
  };

  /* Active TOC on scroll */
  var rows=document.querySelectorAll('.wk-toc-row');
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        rows.forEach(function(r){r.classList.remove('active');});
        var id=e.target.id;
        rows.forEach(function(r){
          if(r.getAttribute('href')==='#'+id)r.classList.add('active');
        });
      }
    });
  },{threshold:0.1,rootMargin:'-10% 0px -80% 0px'});
  document.querySelectorAll('[id]').forEach(function(el){
    if(T.sections.some(function(s){return s.id===el.id;}))observer.observe(el);
  });
})();
