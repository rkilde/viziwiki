---
layout: default
title: "Browse — Tile Design (Old)"
nav_active: browse
body_class: "no-facet-chrome"
---
{% raw %}
<!-- ─────────── SVG icon sprite (referenced by browse tiles) ─────────── -->
<svg width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true">
<defs>
  <symbol id="icon-music" viewBox="0 0 100 100">
      <line x1="22" y1="80" x2="22" y2="22"/>
      <line x1="68" y1="74" x2="68" y2="18"/>
      <line x1="22" y1="22" x2="68" y2="18"/>
      <line x1="22" y1="32" x2="68" y2="28"/>
      <ellipse cx="14" cy="82" rx="11" ry="7" transform="rotate(-15 14 82)"/>
      <ellipse cx="60" cy="76" rx="11" ry="7" transform="rotate(-15 60 76)"/>
  </symbol>
  <symbol id="icon-film" viewBox="0 0 100 100">
      <rect x="14" y="44" width="72" height="40" rx="2"/>
      <path d="M14 44 L20 28 L34 26 L28 42 Z"/>
      <path d="M34 26 L40 42 L54 40 L48 24 Z"/>
      <path d="M54 40 L60 24 L74 22 L68 38 Z"/>
      <path d="M74 22 L80 26 L86 30 L86 44 L80 38 Z"/>
  </symbol>
  <symbol id="icon-tv-series" viewBox="0 0 100 100">
      <rect x="14" y="36" width="72" height="48" rx="3"/>
      <line x1="32" y1="14" x2="46" y2="36"/>
      <line x1="68" y1="14" x2="54" y2="36"/>
      <circle cx="76" cy="60" r="2" fill="currentColor"/>
  </symbol>
  <symbol id="icon-video-games" viewBox="0 0 100 100">
      <path d="M22 38 Q14 38 14 50 L14 64 Q14 74 22 74 Q30 74 34 66 L66 66 Q70 74 78 74 Q86 74 86 64 L86 50 Q86 38 78 38 Z"/>
      <line x1="24" y1="50" x2="36" y2="50"/>
      <line x1="30" y1="44" x2="30" y2="56"/>
      <circle cx="62" cy="46" r="3" fill="currentColor"/>
      <circle cx="72" cy="52" r="3" fill="currentColor"/>
      <circle cx="62" cy="58" r="3" fill="currentColor"/>
      <circle cx="52" cy="52" r="3" fill="currentColor"/>
  </symbol>
  <symbol id="icon-cartoons" viewBox="0 0 100 100">
      <path d="M14 22 Q14 14 22 14 L78 14 Q86 14 86 22 L86 54 Q86 62 78 62 L42 62 L24 78 L28 62 L22 62 Q14 62 14 54 Z"/>
      <circle cx="34" cy="38" r="3" fill="currentColor"/>
      <circle cx="50" cy="38" r="3" fill="currentColor"/>
      <circle cx="66" cy="38" r="3" fill="currentColor"/>
  </symbol>
  <symbol id="icon-anime" viewBox="0 0 100 100">
      <path d="M50 14 L57 42 L86 50 L57 58 L50 86 L43 58 L14 50 L43 42 Z"/>
      <path d="M22 22 L24 28 L30 30 L24 32 L22 38 L20 32 L14 30 L20 28 Z"/>
      <path d="M82 76 L84 80 L88 82 L84 84 L82 88 L80 84 L76 82 L80 80 Z"/>
  </symbol>
  <symbol id="icon-pop-culture" viewBox="0 0 100 100">
      <path d="M50 14 L60 38 L86 42 L66 60 L72 86 L50 72 L28 86 L34 60 L14 42 L40 38 Z"/>
  </symbol>
  <symbol id="icon-universes" viewBox="0 0 100 100">
      <rect x="14" y="22" width="40" height="60" transform="rotate(-10 34 52)"/>
      <rect x="30" y="20" width="40" height="60"/>
      <rect x="46" y="22" width="40" height="60" transform="rotate(10 66 52)"/>
  </symbol>
  <symbol id="icon-sports" viewBox="0 0 100 100">
      <path d="M30 22 L70 22 L68 48 Q68 58 50 58 Q32 58 32 48 Z"/>
      <path d="M30 28 Q18 28 20 38 Q22 44 30 44"/>
      <path d="M70 28 Q82 28 80 38 Q78 44 70 44"/>
      <line x1="50" y1="58" x2="50" y2="76"/>
      <rect x="36" y="76" width="28" height="8"/>
  </symbol>
  <symbol id="icon-internet" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="32"/>
      <ellipse cx="50" cy="50" rx="32" ry="12"/>
      <ellipse cx="50" cy="50" rx="14" ry="32"/>
      <line x1="18" y1="50" x2="82" y2="50"/>
  </symbol>
  <symbol id="icon-tech" viewBox="0 0 100 100">
      <rect x="26" y="26" width="48" height="48" rx="2"/>
      <rect x="38" y="38" width="24" height="24"/>
      <line x1="14" y1="34" x2="26" y2="34"/>
      <line x1="14" y1="46" x2="26" y2="46"/>
      <line x1="14" y1="58" x2="26" y2="58"/>
      <line x1="14" y1="66" x2="26" y2="66"/>
      <line x1="74" y1="34" x2="86" y2="34"/>
      <line x1="74" y1="46" x2="86" y2="46"/>
      <line x1="74" y1="58" x2="86" y2="58"/>
      <line x1="74" y1="66" x2="86" y2="66"/>
      <line x1="34" y1="14" x2="34" y2="26"/>
      <line x1="46" y1="14" x2="46" y2="26"/>
      <line x1="58" y1="14" x2="58" y2="26"/>
      <line x1="66" y1="14" x2="66" y2="26"/>
      <line x1="34" y1="74" x2="34" y2="86"/>
      <line x1="46" y1="74" x2="46" y2="86"/>
      <line x1="58" y1="74" x2="58" y2="86"/>
      <line x1="66" y1="74" x2="66" y2="86"/>
  </symbol>
  <symbol id="icon-apps-social" viewBox="0 0 100 100">
      <rect x="28" y="14" width="44" height="72" rx="6"/>
      <line x1="44" y1="80" x2="56" y2="80"/>
      <rect x="34" y="26" width="10" height="10" rx="2"/>
      <rect x="46" y="26" width="10" height="10" rx="2"/>
      <rect x="58" y="26" width="10" height="10" rx="2"/>
      <rect x="34" y="40" width="10" height="10" rx="2"/>
      <rect x="46" y="40" width="10" height="10" rx="2"/>
      <rect x="58" y="40" width="10" height="10" rx="2"/>
      <rect x="34" y="54" width="10" height="10" rx="2"/>
      <rect x="46" y="54" width="10" height="10" rx="2"/>
      <rect x="58" y="54" width="10" height="10" rx="2"/>
  </symbol>
  <symbol id="icon-streamers" viewBox="0 0 100 100">
      <path d="M14 30 Q14 22 22 22 L78 22 Q86 22 86 30 L86 60 Q86 68 78 68 L22 68 Q14 68 14 60 Z"/>
      <path d="M42 32 L42 58 L62 45 Z" fill="currentColor"/>
  </symbol>
  <symbol id="icon-fast-food" viewBox="0 0 100 100">
      <path d="M14 36 Q14 18 50 18 T86 36"/>
      <line x1="14" y1="36" x2="86" y2="36"/>
      <path d="M16 45 Q22 41 28 45 T40 45 T52 45 T64 45 T76 45 T84 45"/>
      <line x1="14" y1="55" x2="86" y2="55"/>
      <path d="M14 65 Q14 78 50 78 T86 65"/>
  </symbol>
  <symbol id="icon-pizza" viewBox="0 0 100 100">
      <path d="M50 14 L86 82 L14 82 Z"/>
      <circle cx="50" cy="42" r="4" fill="currentColor"/>
      <circle cx="38" cy="60" r="4" fill="currentColor"/>
      <circle cx="62" cy="60" r="4" fill="currentColor"/>
      <circle cx="50" cy="72" r="4" fill="currentColor"/>
  </symbol>
  <symbol id="icon-ice-cream" viewBox="0 0 100 100">
      <circle cx="50" cy="34" r="14"/>
      <circle cx="36" cy="28" r="11"/>
      <circle cx="64" cy="28" r="11"/>
      <path d="M30 50 L70 50 L50 90 Z"/>
      <line x1="36" y1="58" x2="64" y2="58"/>
      <line x1="42" y1="68" x2="58" y2="68"/>
  </symbol>
  <symbol id="icon-snacks" viewBox="0 0 100 100">
      <path d="M22 14 L78 14 L82 86 L18 86 Z"/>
      <line x1="18" y1="30" x2="82" y2="30"/>
      <rect x="36" y="42" width="28" height="22"/>
  </symbol>
  <symbol id="icon-soda" viewBox="0 0 100 100">
      <rect x="30" y="22" width="40" height="60" rx="3"/>
      <rect x="40" y="14" width="20" height="6" rx="1"/>
      <line x1="30" y1="34" x2="70" y2="34"/>
      <line x1="30" y1="68" x2="70" y2="68"/>
  </symbol>
  <symbol id="icon-cereal" viewBox="0 0 100 100">
      <path d="M14 50 Q14 78 50 78 Q86 78 86 50 Z"/>
      <line x1="20" y1="56" x2="80" y2="56"/>
      <circle cx="32" cy="48" r="3"/>
      <circle cx="48" cy="46" r="3"/>
      <circle cx="64" cy="48" r="3"/>
      <line x1="66" y1="22" x2="78" y2="44"/>
      <ellipse cx="78" cy="44" rx="9" ry="5" transform="rotate(28 78 44)"/>
  </symbol>
  <symbol id="icon-candy" viewBox="0 0 100 100">
      <ellipse cx="50" cy="50" rx="20" ry="14"/>
      <path d="M30 50 L14 36 L20 50 L14 64 Z"/>
      <path d="M70 50 L86 36 L80 50 L86 64 Z"/>
      <line x1="16" y1="44" x2="22" y2="48"/>
      <line x1="16" y1="58" x2="22" y2="54"/>
      <line x1="84" y1="44" x2="78" y2="48"/>
      <line x1="84" y1="58" x2="78" y2="54"/>
  </symbol>
  <symbol id="icon-sneakers" viewBox="0 0 100 100">
      <path d="M14 70 L14 78 Q14 84 22 84 L78 84 Q86 84 86 78 L86 68 Q86 58 76 56 L62 52 Q54 50 50 44 L44 32 Q40 24 32 28 Q24 32 24 42 L24 56 Q14 58 14 70 Z"/>
      <line x1="14" y1="70" x2="86" y2="70"/>
      <line x1="46" y1="54" x2="58" y2="50"/>
      <line x1="44" y1="60" x2="60" y2="56"/>
      <line x1="42" y1="66" x2="62" y2="62"/>
  </symbol>
  <symbol id="icon-game-consoles" viewBox="0 0 100 100">
      <rect x="14" y="30" width="72" height="40" rx="3"/>
      <line x1="14" y1="42" x2="86" y2="42"/>
      <rect x="26" y="50" width="14" height="14" rx="1"/>
      <circle cx="62" cy="54" r="3" fill="currentColor"/>
      <circle cx="72" cy="60" r="3" fill="currentColor"/>
      <line x1="20" y1="74" x2="20" y2="82"/>
      <line x1="80" y1="74" x2="80" y2="82"/>
  </symbol>
  <symbol id="icon-christmas-movies" viewBox="0 0 100 100">
      <path d="M50 12 L66 36 L60 36 L74 58 L66 58 L82 80 L18 80 L34 58 L26 58 L40 36 L34 36 Z"/>
      <rect x="42" y="80" width="16" height="8"/>
      <path d="M50 6 L52 12 L46 10 Z" fill="currentColor"/>
  </symbol>
  <symbol id="icon-horror" viewBox="0 0 100 100">
      <path d="M28 22 Q28 12 50 12 T72 22 L72 70 Q72 82 50 82 T28 70 Z"/>
      <circle cx="40" cy="40" r="4" fill="currentColor"/>
      <circle cx="60" cy="40" r="4" fill="currentColor"/>
      <path d="M40 60 Q50 55 60 60"/>
  </symbol>
  <symbol id="icon-theme-parks" viewBox="0 0 100 100">
      <path d="M6 78 Q22 28 42 56 T68 50 T96 72"/>
      <line x1="22" y1="56" x2="22" y2="90"/>
      <line x1="42" y1="56" x2="42" y2="90"/>
      <line x1="58" y1="52" x2="58" y2="90"/>
      <line x1="78" y1="58" x2="78" y2="90"/>
      <line x1="6" y1="90" x2="96" y2="90"/>
  </symbol>
  <symbol id="icon-boy-bands" viewBox="0 0 100 100">
      <rect x="42" y="14" width="16" height="30" rx="8"/>
      <line x1="44" y1="22" x2="56" y2="22"/>
      <line x1="44" y1="30" x2="56" y2="30"/>
      <line x1="44" y1="38" x2="56" y2="38"/>
      <path d="M30 50 Q30 60 50 60 Q70 60 70 50"/>
      <line x1="50" y1="44" x2="50" y2="78"/>
      <rect x="36" y="78" width="28" height="6"/>
  </symbol>
  <symbol id="icon-art" viewBox="0 0 100 100">
      <path d="M14 50 Q14 22 50 22 Q86 22 86 56 Q86 76 64 76 Q60 64 50 66 Q42 68 38 66 Q22 76 14 50 Z"/>
      <circle cx="30" cy="42" r="4" fill="currentColor"/>
      <circle cx="46" cy="36" r="4" fill="currentColor"/>
      <circle cx="62" cy="36" r="4" fill="currentColor"/>
      <circle cx="74" cy="48" r="4" fill="currentColor"/>
  </symbol>
  <symbol id="icon-fashion" viewBox="0 0 100 100">
      <path d="M50 14 Q42 14 42 22 Q42 28 50 28"/>
      <path d="M50 28 L14 64 L86 64 Z"/>
      <line x1="14" y1="64" x2="86" y2="64"/>
  </symbol>
  <symbol id="icon-science" viewBox="0 0 100 100">
      <line x1="36" y1="14" x2="64" y2="14"/>
      <path d="M38 14 L38 38 L20 78 Q18 86 26 86 L74 86 Q82 86 80 78 L62 38 L62 14"/>
      <line x1="32" y1="44" x2="68" y2="44"/>
      <circle cx="38" cy="68" r="3"/>
      <circle cx="56" cy="74" r="2"/>
  </symbol>
</defs>
</svg>



  <!-- ─────────────────────────────────────────────────────────────────────
       PAGE CONTENT — this is the part that gets copied to browse.html
       (between the Jekyll &#123;% raw %&#125; &#123;% endraw %&#125; tags) when shipping.
       Everything below until the "CHROME JS — DELETE" banner is the real page.
       ─────────────────────────────────────────────────────────────────── -->

<style>:root {
    color-scheme: light;
    --bg: #ffffff;
    --bg-soft: #f7f8fa;
    --text: #0a0a0a;
    --text-dim: #6b7280;
    --text-faint: #9ca3af;
    --border: #e5e7eb;
    --border-strong: #d1d5db;
    --accent: #0284c7;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 14px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* ──────── Top bar ──────── */

  /* ──────── Page header ──────── */
  .head {
    max-width: 1280px; margin: 0 auto;
    padding: 36px 24px 8px;
  }
  .head h1 {
    font-family: 'Inter', sans-serif;
    font-size: 32px; font-weight: 700;
    margin: 0 0 4px;
    letter-spacing: -.02em;
  }
  .head-sub {
    font-size: 14px; color: var(--text-dim);
    margin: 0;
  }

  /* ──────── Category tiles (Spotify style) ──────── */
  .tiles-section {
    max-width: 1280px; margin: 0 auto;
    padding: 28px 24px 8px;
  }
  .tiles-label {
    font-size: 11px; font-weight: 600;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: .12em;
    margin: 0 0 14px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
  .tile {
    aspect-ratio: 4 / 3;
    background: var(--c);
    color: white;
    text-decoration: none;
    border-radius: 10px;
    padding: 14px 16px;
    position: relative;
    overflow: hidden;
    display: flex; align-items: flex-start;
    transition: transform .18s ease;
  }
  .tile:hover { transform: scale(1.025); }
  .tile-name {
    font-family: 'Inter', sans-serif;
    font-size: 22px; font-weight: 800;
    line-height: 1.05;
    letter-spacing: -.02em;
    position: relative; z-index: 2;
    max-width: 70%;
  }
  .tile-glyph {
    position: absolute;
    bottom: -18px; right: -16px;
    font-family: 'Inter', sans-serif;
    font-size: 130px; font-weight: 900;
    line-height: 1; color: rgba(255, 255, 255, .28);
    transform: rotate(20deg);
    transform-origin: center;
    user-select: none; pointer-events: none;
    letter-spacing: -.06em;
  }

  /* ──────── List section ──────── */
  .list-wrap {
    max-width: 1280px; margin: 0 auto;
    padding: 40px 24px 120px;
  }
  .list-section {
    margin-bottom: 36px;
    scroll-margin-top: 80px;
  }
  .list-section:last-child { margin-bottom: 0; }
  .list-head {
    display: flex; align-items: baseline; gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
  }
  .list-head-mark {
    width: 10px; height: 10px;
    background: var(--c, var(--accent));
    border-radius: 2px;
    align-self: center;
  }
  .list-head h2 {
    font-family: 'Inter', sans-serif;
    font-size: 16px; font-weight: 700;
    letter-spacing: -.005em;
    margin: 0;
  }
  .list-head-count {
    font-size: 12px; font-weight: 500;
    color: var(--text-faint);
    margin-left: 4px;
  }

  /* List items */
  .list-row {
    display: flex; align-items: baseline; gap: 14px;
    padding: 11px 4px;
    border-bottom: 1px solid var(--border);
    text-decoration: none;
    color: var(--text);
    transition: background .12s ease;
  }
  .list-row:hover { background: var(--bg-soft); }
  .list-row.is-soon { color: var(--text-dim); }
  .list-row.is-soon:hover { background: transparent; cursor: default; }
  .list-row-name {
    font-family: 'Inter', sans-serif;
    font-size: 15px; font-weight: 600;
    flex-shrink: 0; min-width: 180px;
    letter-spacing: -.005em;
  }
  .list-row.is-soon .list-row-name {
    font-weight: 500;
    color: var(--text-dim);
  }
  .list-row-tag {
    font-size: 13.5px;
    color: var(--text-dim);
    flex: 1;
    line-height: 1.4;
  }
  .list-row-meta {
    font-size: 12px;
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .list-row-soon {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: .1em;
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 3px;
    flex-shrink: 0;
  }

  @media (max-width: 720px) {
    .head { padding: 28px 16px 8px; }
    .tiles-section { padding: 20px 16px 8px; }
    .tiles { grid-template-columns: repeat(2, 1fr); }
    .list-wrap { padding: 28px 16px 80px; }
    .list-row { flex-wrap: wrap; gap: 6px 12px; }
    .list-row-name { min-width: 100%; }
    .list-row-tag { width: 100%; flex: none; }
  }
</style>

<!-- ──────── Top bar ──────── -->




<!-- ═════════ LEFT RAIL (web-only) ═════════ -->
<nav class="page-toc" aria-label="Page contents">
  <button class="toc-close" id="toc-close" aria-label="Toggle contents panel">
    <svg class="toc-close-x" viewBox="0 0 14 14">
      <line x1="3.5" y1="3.5" x2="10.5" y2="10.5"/>
      <line x1="10.5" y1="3.5" x2="3.5" y2="10.5"/>
    </svg>
    <svg class="toc-close-collapse" viewBox="0 0 14 14">
      <polyline points="9,3 4,7 9,11"/>
    </svg>
    <svg class="toc-close-expand" viewBox="0 0 14 14">
      <polyline points="5,3 10,7 5,11"/>
    </svg>
  </button>

  <button class="toc-save" id="toc-save" aria-label="Save page">
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 3.5 2 L 10.5 2 L 10.5 12 L 7 9.5 L 3.5 12 Z"/>
    </svg>
  </button>

  <button class="toc-back-btn" id="toc-back" aria-label="Back to Hub">
    <svg viewBox="0 0 14 14">
      <polyline points="6,3 2,7 6,11"/>
      <line x1="2" y1="7" x2="12" y2="7"/>
    </svg>
    <span class="toc-back-label">Back to Hub</span>
  </button>

  <div class="toc-inner" id="toc-inner-host"></div>
</nav>


<!-- Drawer backdrop (mobile only) -->


<!-- Page bar (mobile only) -->
<div class="page-bar">
  <div class="title-row">
    <button class="page-hamburger" id="page-hamburger" aria-label="Toggle contents drawer">
      <svg class="burger-lines" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <line x1="2" y1="3" x2="12" y2="3"/>
        <line x1="2" y1="7" x2="12" y2="7"/>
        <line x1="2" y1="11" x2="12" y2="11"/>
      </svg>
      <svg class="burger-x" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <line x1="3.5" y1="3.5" x2="10.5" y2="10.5"/>
        <line x1="10.5" y1="3.5" x2="3.5" y2="10.5"/>
      </svg>
    </button>

    <!-- Centered: AOL logo + AOL wordmark -->
    <div class="page-title-center">
      <span class="page-subject-logo" id="page-subject-logo" aria-hidden="true"></span>
      <span class="page-title" id="page-title-host"></span>
    </div>

    <!-- Right-side action group: save (bookmark) then share -->
    <div class="page-actions">
      <button class="main-icon-btn page-save" aria-label="Save page">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M 3.5 2 L 10.5 2 L 10.5 12 L 7 9.5 L 3.5 12 Z"/>
        </svg>
      </button>
      <button class="main-icon-btn page-share" aria-label="Share">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9,2 12,5 9,8"/>
          <path d="M 12 5 L 5 5 Q 2 5 2 8 L 2 12"/>
        </svg>
      </button>
    </div>
  </div>
</div>



<!-- ──────── Page title ──────── -->
<header class="head">
  <h1>Browse</h1>
  <p class="head-sub">The Vizi library — every standalone page on ViziWiki.</p>
</header>

<!-- ──────── Tiles (Spotify-style) ──────── -->
<section class="tiles-section">
  <p class="tiles-label">Categories</p>
  <div class="tiles" id="tiles"><!-- populated by JS --></div>
</section>

<!-- ──────── Vizi list ──────── -->
<main class="list-wrap" id="list-wrap"><!-- populated by JS --></main>

<script>
(function() {
  // ──────── Categories (mapping + colors) ────────
  const CATEGORIES = [
    { key: 'music',            label: 'Music',                  color: '#ec4899' },
    { key: 'film',             label: 'Film',                   color: '#d97706' },
    { key: 'tv-series',        label: 'TV Series',              color: '#1e40af' },
    { key: 'video-games',      label: 'Video Games',            color: '#ef4444' },
    { key: 'cartoons',         label: 'Cartoons',               color: '#f59e0b' },
    { key: 'anime',            label: 'Anime',                  color: '#f472b6' },
    { key: 'pop-culture',      label: 'Pop Culture',            color: '#8b5cf6' },
    { key: 'universes',        label: 'Universes',              color: '#1e3a8a' },
    { key: 'sports',           label: 'Sports',                 color: '#16a34a' },
    { key: 'internet',         label: 'Internet',               color: '#006d77' },
    { key: 'tech',             label: 'Tech',                   color: '#4338ca' },
    { key: 'apps-social',      label: 'Apps & Social Media',    color: '#0ea5e9' },
    { key: 'streamers',        label: 'Streamers & YouTubers',  color: '#a855f7' },
    { key: 'fast-food',        label: 'Fast Food',              color: '#dc2626' },
    { key: 'pizza',            label: 'Pizza',                  color: '#e11d48' },
    { key: 'ice-cream',        label: 'Ice Cream',              color: '#fb7185' },
    { key: 'snacks',           label: 'Snacks',                 color: '#fb923c' },
    { key: 'soda',             label: 'Soda',                   color: '#991b1b' },
    { key: 'cereal',           label: 'Cereal',                 color: '#eab308' },
    { key: 'candy',            label: 'Candy',                  color: '#f43f5e' },
    { key: 'sneakers',         label: 'Sneakers',               color: '#1e293b' },
    { key: 'game-consoles',    label: 'Game Consoles',          color: '#2563eb' },
    { key: 'christmas-movies', label: 'Christmas Movies',       color: '#15803d' },
    { key: 'horror',           label: 'Horror Films',           color: '#18181b' },
    { key: 'theme-parks',      label: 'Theme Parks',            color: '#c026d3' },
    { key: 'boy-bands',        label: 'Boy Bands & Pop Stars',  color: '#c084fc' },
    { key: 'art',              label: 'Art',                    color: '#be185d' },
    { key: 'fashion',          label: 'Fashion',                color: '#ea580c' },
    { key: 'science',          label: 'Science',                color: '#0891b2' },
  ];

  // ──────── Vizis (cat key matches CATEGORIES.key) ────────
  const VIZIS = [
    { name: 'The Beatles', href: '#', tag: 'The 13-album arc, 1962–1970.', cat: 'music', meta: '1960s', available: false },
    { name: 'Miles Davis', href: '#', tag: 'Five style shifts across forty years.', cat: 'music', meta: '1940s', available: false },
    { name: 'Beyoncé', href: '#', tag: 'Destiny\'s Child to Renaissance.', cat: 'music', meta: '2000s', available: false },
    { name: 'Stanley Kubrick', href: '#', tag: 'Thirteen films, one obsessive eye.', cat: 'film', meta: '1950s', available: false },
    { name: 'Akira Kurosawa', href: '#', tag: 'Thirty films across five decades.', cat: 'film', meta: '1940s', available: false },
    { name: 'Christopher Nolan', href: '#', tag: 'Twelve films, time and obsession.', cat: 'film', meta: '1990s', available: false },
    { name: 'The Sopranos', href: '#', tag: 'The show that started prestige TV.', cat: 'tv-series', meta: '1990s', available: false },
    { name: 'Breaking Bad', href: '#', tag: 'Mr. Chips to Scarface in 62 episodes.', cat: 'tv-series', meta: '2000s', available: false },
    { name: 'Seinfeld', href: '#', tag: 'The show about nothing.', cat: 'tv-series', meta: '1980s', available: false },
    { name: 'Super Mario', href: '#', tag: 'From 8-bit jumps to Galaxy.', cat: 'video-games', meta: '1980s', available: false },
    { name: 'Pokémon', href: '#', tag: 'Gotta catch em all — 25+ years and counting.', cat: 'video-games', meta: '1990s', available: false },
    { name: 'The Legend of Zelda', href: '#', tag: 'Link\'s adventures across the timeline.', cat: 'video-games', meta: '1980s', available: false },
    { name: 'The Simpsons', href: '#', tag: '700+ episodes and still going.', cat: 'cartoons', meta: '1980s', available: false },
    { name: 'SpongeBob SquarePants', href: '#', tag: 'Pineapple under the sea.', cat: 'cartoons', meta: '1990s', available: false },
    { name: 'Looney Tunes', href: '#', tag: 'That\'s all folks, since 1930.', cat: 'cartoons', meta: '1930s', available: false },
    { name: 'Studio Ghibli', href: '#', tag: 'Miyazaki and the worlds he built.', cat: 'anime', meta: '1980s', available: false },
    { name: 'Dragon Ball', href: '#', tag: 'Saiyan saga to Super.', cat: 'anime', meta: '1980s', available: false },
    { name: 'One Piece', href: '#', tag: 'A thousand episodes and still going.', cat: 'anime', meta: '1990s', available: false },
    { name: 'Saturday Night Live', href: '#', tag: 'Five decades of live sketch comedy.', cat: 'pop-culture', meta: '1970s', available: false },
    { name: 'MTV', href: '#', tag: 'The cable channel that rewired pop.', cat: 'pop-culture', meta: '1980s', available: false },
    { name: 'Marvel Cinematic Universe', href: '#', tag: 'Thirty-plus films, one interconnected canon.', cat: 'universes', meta: '2000s', available: false },
    { name: 'Star Wars', href: '#', tag: 'A galaxy far, far away, since 1977.', cat: 'universes', meta: '1970s', available: false },
    { name: 'Middle-earth', href: '#', tag: 'Tolkien\'s invented world, mapped.', cat: 'universes', meta: '1930s', available: false },
    { name: 'Michael Jordan', href: '#', tag: 'Six rings, 13 years with the Bulls.', cat: 'sports', meta: '1980s', available: false },
    { name: 'Tom Brady', href: '#', tag: 'Seven Super Bowl rings.', cat: 'sports', meta: '2000s', available: false },
    { name: 'AOL', href: 'index.html#aol', tag: 'America Online — the friendly front door for 27 million people.', cat: 'internet', meta: '1990s', available: true },
    { name: 'CompuServe', href: 'index.html#compuserve', tag: 'The first major commercial online service.', cat: 'internet', meta: '1980s', available: true },
    { name: 'Prodigy', href: 'index.html#prodigy', tag: 'IBM + Sears\' graphical online service.', cat: 'internet', meta: '1980s', available: true },
    { name: 'GEnie', href: 'index.html#genie', tag: 'GE\'s half-price online service.', cat: 'internet', meta: '1980s', available: true },
    { name: 'Delphi', href: 'index.html#delphi', tag: 'First online service with full internet access, 1992.', cat: 'internet', meta: '1980s', available: true },
    { name: 'Tumblr', href: '#', tag: 'Dashboard culture and the long blogging era.', cat: 'internet', meta: '2000s', available: false },
    { name: 'Apple', href: '#', tag: 'The corporate biography, 1976 to present.', cat: 'tech', meta: '1970s', available: false },
    { name: 'IBM', href: '#', tag: 'Big Blue from punch cards to cloud.', cat: 'tech', meta: '1910s', available: false },
    { name: 'Vine', href: '#', tag: 'Six seconds that changed the internet.', cat: 'apps-social', meta: '2010s', available: false },
    { name: 'MySpace', href: '#', tag: 'Pre-Facebook social — top 8 friends.', cat: 'apps-social', meta: '2000s', available: false },
    { name: 'TikTok', href: '#', tag: 'The algorithm that ate everything.', cat: 'apps-social', meta: '2010s', available: false },
    { name: 'MrBeast', href: '#', tag: 'YouTube\'s biggest creator.', cat: 'streamers', meta: '2010s', available: false },
    { name: 'PewDiePie', href: '#', tag: '15 years on the throne.', cat: 'streamers', meta: '2010s', available: false },
    { name: 'McDonald\'s', href: '#', tag: 'The golden arches: a 70-year corporate biography.', cat: 'fast-food', meta: '1950s', available: false },
    { name: 'In-N-Out', href: '#', tag: 'The West Coast classic that refuses to grow up.', cat: 'fast-food', meta: '1940s', available: false },
    { name: 'Burger King', href: '#', tag: 'The flame-broiled runner-up.', cat: 'fast-food', meta: '1950s', available: false },
    { name: 'Domino\'s', href: '#', tag: '30 minutes or less, the pivot, and the bounceback.', cat: 'pizza', meta: '1960s', available: false },
    { name: 'Pizza Hut', href: '#', tag: 'The red-roofed pizza king.', cat: 'pizza', meta: '1950s', available: false },
    { name: 'New York Slice', href: '#', tag: 'Thin, foldable, and classic.', cat: 'pizza', meta: '1900s', available: false },
    { name: 'Ben & Jerry\'s', href: '#', tag: 'Cherry Garcia and a social mission.', cat: 'ice-cream', meta: '1970s', available: false },
    { name: 'Häagen-Dazs', href: '#', tag: 'The not-actually-Scandinavian premium ice cream.', cat: 'ice-cream', meta: '1960s', available: false },
    { name: 'Oreos', href: '#', tag: 'Twist, lick, dunk — since 1912.', cat: 'snacks', meta: '1910s', available: false },
    { name: 'Doritos', href: '#', tag: 'Nacho cheese supremacy.', cat: 'snacks', meta: '1960s', available: false },
    { name: 'Cheez-Its', href: '#', tag: 'The square that built an empire.', cat: 'snacks', meta: '1920s', available: false },
    { name: 'Coca-Cola', href: '#', tag: 'New Coke, the Cola Wars, and the formula.', cat: 'soda', meta: '1880s', available: false },
    { name: 'Pepsi', href: '#', tag: 'The Pepsi challenge and the choice of a new generation.', cat: 'soda', meta: '1890s', available: false },
    { name: 'Mountain Dew', href: '#', tag: 'Do the Dew — the extreme soda.', cat: 'soda', meta: '1940s', available: false },
    { name: 'Lucky Charms', href: '#', tag: 'They\'re magically delicious.', cat: 'cereal', meta: '1960s', available: false },
    { name: 'Frosted Flakes', href: '#', tag: 'Tony the Tiger says they\'re grrreat.', cat: 'cereal', meta: '1950s', available: false },
    { name: 'Cheerios', href: '#', tag: 'The classic O for breakfast.', cat: 'cereal', meta: '1940s', available: false },
    { name: 'Reese\'s', href: '#', tag: 'Chocolate and peanut butter, perfected.', cat: 'candy', meta: '1920s', available: false },
    { name: 'M&Ms', href: '#', tag: 'Melts in your mouth, not in your hands.', cat: 'candy', meta: '1940s', available: false },
    { name: 'Skittles', href: '#', tag: 'Taste the rainbow.', cat: 'candy', meta: '1970s', available: false },
    { name: 'Air Jordan 1', href: '#', tag: 'The shoe that started the empire.', cat: 'sneakers', meta: '1980s', available: false },
    { name: 'Air Jordan 3', href: '#', tag: 'Tinker Hatfield\'s masterpiece.', cat: 'sneakers', meta: '1980s', available: false },
    { name: 'Air Jordan 11', href: '#', tag: 'Patent leather and championship glory.', cat: 'sneakers', meta: '1990s', available: false },
    { name: 'Nintendo Entertainment System', href: '#', tag: 'The console that saved video games.', cat: 'game-consoles', meta: '1980s', available: false },
    { name: 'PlayStation', href: '#', tag: 'Sony\'s polygon-pushing disruptor.', cat: 'game-consoles', meta: '1990s', available: false },
    { name: 'Sega Genesis', href: '#', tag: 'Blast processing and Sonic speed.', cat: 'game-consoles', meta: '1980s', available: false },
    { name: 'Game Boy', href: '#', tag: 'Nintendo\'s handheld revolution.', cat: 'game-consoles', meta: '1980s', available: false },
    { name: 'Home Alone', href: '#', tag: 'Kevin defends the house, year after year.', cat: 'christmas-movies', meta: '1990s', available: false },
    { name: 'Elf', href: '#', tag: 'Buddy the Elf — what\'s your favorite color?', cat: 'christmas-movies', meta: '2000s', available: false },
    { name: 'A Christmas Story', href: '#', tag: 'The 24-hour TBS marathon and the Red Ryder BB gun.', cat: 'christmas-movies', meta: '1980s', available: false },
    { name: 'Halloween', href: '#', tag: 'Michael Myers and the birth of the slasher.', cat: 'horror', meta: '1970s', available: false },
    { name: 'Friday the 13th', href: '#', tag: 'Jason Voorhees, twelve films deep.', cat: 'horror', meta: '1980s', available: false },
    { name: 'Scream', href: '#', tag: 'The meta-slasher that revived the genre.', cat: 'horror', meta: '1990s', available: false },
    { name: 'Disney World', href: '#', tag: 'The Most Magical Place on Earth.', cat: 'theme-parks', meta: '1970s', available: false },
    { name: 'Universal Studios', href: '#', tag: 'Movie magic and Wizarding Worlds.', cat: 'theme-parks', meta: '1960s', available: false },
    { name: 'NSYNC', href: '#', tag: 'It\'s gonna be me — the Lou Pearlman era.', cat: 'boy-bands', meta: '1990s', available: false },
    { name: 'Backstreet Boys', href: '#', tag: 'Quit playing games — the original boy band.', cat: 'boy-bands', meta: '1990s', available: false },
    { name: 'BTS', href: '#', tag: 'K-pop\'s global takeover.', cat: 'boy-bands', meta: '2010s', available: false },
    // Sneakers (broader than just Jordans)
    { name: 'Air Force 1', href: '#', tag: "Nike's perennial bestseller since 1982.", cat: 'sneakers', meta: '1980s', available: false },
    { name: 'Yeezy 350', href: '#', tag: "Kanye's adidas era and the resale boom.", cat: 'sneakers', meta: '2010s', available: false },
    { name: 'Chuck Taylor All Star', href: '#', tag: 'The 1917 basketball shoe turned wardrobe staple.', cat: 'sneakers', meta: '1910s', available: false },
    // Art
    { name: 'Bauhaus', href: '#', tag: 'The school that designed the 20th century.', cat: 'art', meta: '1910s', available: false },
    { name: 'Andy Warhol', href: '#', tag: "Pop art's pope, soup cans and silkscreens.", cat: 'art', meta: '1960s', available: false },
    { name: 'Picasso', href: '#', tag: 'Blue Period, Cubism, a 70-year career.', cat: 'art', meta: '1900s', available: false },
    // Fashion
    { name: 'Vogue', href: '#', tag: "A century-and-a-half of fashion's record.", cat: 'fashion', meta: '1890s', available: false },
    { name: 'Coco Chanel', href: '#', tag: 'The little black dress and the empire.', cat: 'fashion', meta: '1910s', available: false },
    { name: 'Yves Saint Laurent', href: '#', tag: 'The man who reinvented haute couture.', cat: 'fashion', meta: '1960s', available: false },
    // Science
    { name: 'Marie Curie', href: '#', tag: 'Two Nobels, two new elements, one life.', cat: 'science', meta: '1890s', available: false },
    { name: 'Albert Einstein', href: '#', tag: 'Relativity, the photoelectric effect, and a famous tongue.', cat: 'science', meta: '1900s', available: false },
    { name: 'Isaac Newton', href: '#', tag: 'Gravity, optics, and a falling apple.', cat: 'science', meta: '1660s', available: false },
  ];

  // ──────── Render tiles ────────
  const tilesEl = document.getElementById('tiles');
  tilesEl.innerHTML = CATEGORIES.map(c => {
    const count = VIZIS.filter(v => v.cat === c.key).length;
    const label = count === 1 ? '1 vizi' : `${count} vizis`;
    return `<a class="tile" href="#cat-${c.key}" style="--c: ${c.color}">
      <span class="tile-name">${c.label}</span>
      <span class="tile-count">${label}</span>
      <svg class="tile-icon" viewBox="0 0 100 100" aria-hidden="true"><use href="#icon-${c.key}"/></svg>
    </a>`;
  }).join('');

  // ──────── Render list, grouped by category in CATEGORIES order ────────
  const listEl = document.getElementById('list-wrap');
  listEl.innerHTML = CATEGORIES.map(c => {
    const items = VIZIS.filter(v => v.cat === c.key);
    if (items.length === 0) {
      // Show empty state so the category still has presence after click
      return `<section class="list-section" id="cat-${c.key}">
        <div class="list-head" style="--c: ${c.color}">
          <span class="list-head-mark"></span>
          <h2>${c.label}</h2>
          <span class="list-head-count">0 vizis</span>
        </div>
        <div class="list-row is-soon">
          <span class="list-row-name">— No vizis yet</span>
          <span class="list-row-tag">First entries coming soon.</span>
        </div>
      </section>`;
    }
    const rows = items.map(v => {
      const cls = 'list-row' + (v.available ? '' : ' is-soon');
      const soonBadge = v.available ? '' : '<span class="list-row-soon">Soon</span>';
      return `<a class="${cls}" href="${v.href}">
        <span class="list-row-name">${v.name}</span>
        <span class="list-row-tag">${v.tag}</span>
        <span class="list-row-meta">${v.meta}</span>
        ${soonBadge}
      </a>`;
    }).join('');
    return `<section class="list-section" id="cat-${c.key}">
      <div class="list-head" style="--c: ${c.color}">
        <span class="list-head-mark"></span>
        <h2>${c.label}</h2>
        <span class="list-head-count">${items.length} ${items.length === 1 ? 'vizi' : 'vizis'}</span>
      </div>
      ${rows}
    </section>`;
  }).join('');
})();
</script>


  <!-- ═════════════════════════════════════════════════════════════════════
{% endraw %}
