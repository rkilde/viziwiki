'use client';
import React, { useEffect, useState } from 'react';

// The add-section picker — ported from the owner's mockup. Screen 1: choose
// how to start. Screen 2: the template bank (four bank tiles). Screen 3
// (catalog): the catalog-type chooser — "Category Masonry" is LIVE (it adds
// the canonical catalog bank, grammar-seeded, at the seam's position); the
// other types are ghosts until their banks exist.
const ic = (d: string, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

// a typed sub-chooser tile (catalog types, timeline types …). desc is a
// paragraph; bullets is the dashed-list form. A tile is `live` only when its
// type actually seeds a derived section (grammar seed + registry host exist).
type TypeTile = { id: string; name: string; live: boolean; icon: string; desc?: string; bullets?: string[] };

// tiles from the mockup's SECTION_TEMPLATES (names pluralized per the owner)
const TILES = [
  {
    id: 'catalog', name: 'Catalogs', pill: 'Category' as const, opens: 'catalog' as const,
    icon: '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    desc: 'Categorized, browsable lists — each item opens an expandable card. Pick a catalog type →',
  },
  {
    id: 'timeline', name: 'Timelines', pill: 'Category' as const, opens: 'timeline' as const,
    icon: '<polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" y1="12" x2="22" y2="12"/>',
    desc: 'Date-positioned event scrollers on a real time axis. Pick a timeline type →',
  },
  {
    id: 'delta', name: 'Side by Side Comparisons', pill: 'Available' as const, opens: null,
    icon: '<path d="M12 3v18"/><rect x="3" y="8" width="6" height="8" rx="1"/><rect x="15" y="8" width="6" height="8" rx="1"/>',
    desc: 'A previous-vs-current table grouped into Hardware & Software, with colour-coded change chips (better, feature, changed, worse, same).',
  },
  {
    id: 'config', name: 'Hardware & Software Tech Visuals', pill: 'Category' as const, opens: null,
    icon: '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
    desc: 'Storage/spec tiers with proportional fill bars derived from capacity, plus price, dates & device-colour dots. Pick a chart type →',
  },
];

// timeline types — "Standard Horizontal Timeline" IS the canonical timeline
// bank (the one real type today): clicking it seeds a derived `timeline`
// section (grammar seed + registry host). More types are ghosts until built.
const TIMELINE_TYPES: TypeTile[] = [
  { id: 'timeline', name: 'Standard Horizontal Timeline', live: true,
    icon: '<polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" y1="12" x2="22" y2="12"/>',
    bullets: ['standard timeline', 'horizontally scrollable'] },
];

// catalog types from the mockup's CATALOG_TYPES — Category Masonry IS the
// canonical catalog bank (the one real type today); the rest are ghosts.
const CATALOG_TYPES: TypeTile[] = [
  { id: 'catalog', name: 'Category Masonry', live: true,
    icon: '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    desc: 'A masonry of category cards; each item opens an expandable-card modal. The classic ViziWiki catalog.' },
  { id: 'flat-table', name: 'Flat Table', live: false,
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="3" x2="21" y1="15" y2="15"/><line x1="12" x2="12" y1="3" y2="21"/>',
    desc: 'Every item in one sortable, filterable table.' },
  { id: 'tier-list', name: 'Tier List', live: false,
    icon: '<line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/><rect x="3" y="3" width="4" height="18" rx="1"/>',
    desc: 'Items ranked into labelled tiers (S / A / B …).' },
  { id: 'gallery-catalog', name: 'Gallery Catalog', live: false,
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    desc: 'Image-led cards with an expandable detail view.' },
  { id: 'compact-list', name: 'Compact List', live: false,
    icon: '<line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    desc: 'A dense single-column list, no cards.' },
  { id: 'timeline-catalog', name: 'Timeline Catalog', live: false,
    icon: '<line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/>',
    desc: 'Items laid out chronologically along a spine.' },
];

export function SectionPicker({ onClose, onPick }: { onClose: () => void; onPick: (type: string) => void }) {
  const [screen, setScreen] = useState<'choices' | 'browse' | 'catalog' | 'timeline'>('choices');
  const [q, setQ] = useState('');

  // shared typed sub-chooser (catalog / timeline): a grid of TypeTiles, each
  // live tile seeds its derived section via onPick(type). desc → paragraph;
  // bullets → dashed list.
  const typeScreen = (title: string, sub: string, types: TypeTile[]) => (
    <>
      <div className="sp-head">
        <button className="sp-back" onClick={() => setScreen('browse')}>←</button>
        <div>
          <div className="sp-title">{title}</div>
          <div className="sp-sub">{sub}</div>
        </div>
        <button className="sp-x" onClick={onClose}>×</button>
      </div>
      <div className="sp-body">
        <div className="sp-grid">
          {types.map((t) => (
            <div
              key={t.id}
              className={`sp-card ${t.live ? 'available' : 'soon'}`}
              title={t.live ? '' : 'Coming soon'}
              onClick={t.live ? () => onPick(t.id) : undefined}
            >
              <span className={`sp-pill ${t.live ? 'ok' : 'soon'}`}>{t.live ? 'Available' : 'Soon'}</span>
              <div className="sp-card-top">
                <div className="sp-card-ic">{ic(t.icon, 16)}</div>
                <div className="sp-card-name">{t.name}</div>
              </div>
              <div className="sp-card-desc">
                {t.bullets
                  ? <ul className="sp-card-bullets">{t.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  : t.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const shown = TILES.filter((t) => !q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase()));

  return (
    <div id="sec-picker" className="open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-modal" onMouseDown={(e) => e.stopPropagation()}>
        {screen === 'choices' && (
          <>
            <div className="sp-head">
              <div>
                <div className="sp-title">Add a section</div>
                <div className="sp-sub">Choose how to start</div>
              </div>
              <button className="sp-x" onClick={onClose}>×</button>
            </div>
            <div className="sp-body">
              <div className="sp-choices">
                <button className="sp-choice" onClick={() => { setQ(''); setScreen('browse'); }}>
                  <div className="sp-choice-ic">{ic('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')}</div>
                  <div className="sp-choice-name">Section template</div>
                  <div className="sp-choice-desc">Start from a predefined section — Overview, catalog, timeline and more.</div>
                  <span className="sp-choice-tag">Browse the bank →</span>
                </button>
                <button className="sp-choice disabled" title="Coming soon">
                  <div className="sp-choice-ic">{ic('<path d="M12 5v14"/><path d="M5 12h14"/>')}</div>
                  <div className="sp-choice-name">Custom section</div>
                  <div className="sp-choice-desc">Build a section from scratch with your own layout and content.</div>
                  <span className="sp-choice-tag">Coming soon</span>
                </button>
              </div>
            </div>
          </>
        )}
        {screen === 'browse' && (
          <>
            <div className="sp-head">
              <button className="sp-back" onClick={() => setScreen('choices')}>←</button>
              <div>
                <div className="sp-title">Section templates</div>
                <div className="sp-sub">{shown.length} of {TILES.length} shown</div>
              </div>
              <button className="sp-x" onClick={onClose}>×</button>
            </div>
            <div className="sp-body">
              <div className="sp-search-wrap">
                {ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>', 16)}
                <input className="sp-search" placeholder="Search templates…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </div>
              <div className="sp-grid">
                {shown.map((t) => (
                  <div key={t.id} className="sp-card available" onClick={t.opens ? () => setScreen(t.opens!) : undefined}>
                    <span className={`sp-pill ${t.pill === 'Category' ? 'cat' : 'ok'}`}>{t.pill}</span>
                    <div className="sp-card-top">
                      <div className="sp-card-ic">{ic(t.icon, 16)}</div>
                      <div className="sp-card-name">{t.name}</div>
                    </div>
                    <div className="sp-card-desc">{t.desc}</div>
                  </div>
                ))}
                {!shown.length && <div className="sp-empty">No templates match “{q}”</div>}
              </div>
            </div>
          </>
        )}
        {screen === 'catalog' && typeScreen('Catalogs', 'Pick a catalog type', CATALOG_TYPES)}
        {screen === 'timeline' && typeScreen('Timelines', 'Pick a timeline type', TIMELINE_TYPES)}
      </div>
    </div>
  );
}
