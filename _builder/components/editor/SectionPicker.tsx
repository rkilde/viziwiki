'use client';
import React, { useEffect, useState } from 'react';
import grammar from '../../data/grammar.json';

// The add-section picker — ported from the owner's mockup. Screen 1: choose
// how to start. Screen 2: the template bank (four bank tiles). Screen 3
// (catalog/timeline): the type chooser. A tile is LIVE (clickable → adds the
// section) ONLY when it's DERIVED to be: its type has a grammar seed AND a
// registry section that hosts it. Ghost types (no canon component) can't be
// clicked. So a tile can't claim to be addable without its render deps —
// liveness is computed from canon, never a hand-set boolean (rule #5).
const isLive = (id: string): boolean => {
  const c = (grammar as any).components?.[id];
  return !!(c && c.seed && c.section);
};
const ic = (d: string, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

// Placeholder glyph — a blank white square. Used for every asset-tile icon
// EXCEPT the masonry catalog (which has its real icon). The owner will design
// per-asset icons later; until then every tile reads from this one constant so
// the swap is a single edit. White fill + faint border so it reads as an empty
// slot on the tile's light icon chip.
const BLANK = '<rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width="1"/>';

// a typed sub-chooser tile (catalog types, timeline types …). desc is a
// paragraph; bullets is the dashed-list form. Liveness is NOT stored here — it
// is derived from `id` via isLive() so the picker and the canon can't disagree.
type TypeTile = { id: string; name: string; icon: string; desc?: string; bullets?: string[] };

// tiles from the mockup's SECTION_TEMPLATES (names pluralized per the owner)
const TILES = [
  {
    id: 'catalog', name: 'Catalogs', pill: 'Category' as const, opens: 'catalog' as const,
    icon: '<rect x="3.5" y="3.5" width="4" height="4" rx="1"/><line x1="9.5" y1="5.5" x2="20" y2="5.5"/><rect x="3.5" y="10" width="4" height="4" rx="1"/><line x1="9.5" y1="12" x2="20" y2="12"/><rect x="3.5" y="16.5" width="4" height="4" rx="1"/><line x1="9.5" y1="18.5" x2="20" y2="18.5"/>',
    desc: 'Categorized, browsable lists — each item opens an expandable card. Pick a catalog type →',
  },
  {
    id: 'timeline', name: 'Timelines', pill: 'Category' as const, opens: 'timeline' as const,
    icon: '<polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" y1="12" x2="22" y2="12"/>',
    desc: 'Date-positioned event scrollers on a real time axis. Pick a timeline type →',
  },
  {
    id: 'delta', name: 'Side by Side Comparisons', pill: 'Available' as const, opens: null,
    icon: BLANK,
    desc: 'A previous-vs-current table grouped into Hardware & Software, with color-coded change chips (better, feature, changed, worse, same).',
  },
  {
    id: 'config', name: 'Hardware & Software Tech Visuals', pill: 'Category' as const, opens: 'config' as const,
    icon: '<rect x="7" y="2" width="10" height="20" rx="3"/><line x1="12" y1="17" x2="12" y2="18" stroke-width="2.5"/><line x1="10" y1="4.5" x2="14" y2="4.5"/>',
    desc: 'Storage/spec tiers with proportional fill bars derived from capacity, plus price, dates & device-color dots. Pick a chart type →',
  },
];

// timeline types — "Standard Horizontal Timeline" IS the canonical timeline
// bank (the one real type today): clicking it seeds a derived `timeline`
// section (grammar seed + registry host). More types are ghosts until built.
const TIMELINE_TYPES: TypeTile[] = [
  { id: 'timeline', name: 'Standard Horizontal Timeline',
    icon: '<line x1="1.5" y1="15" x2="22.5" y2="15"/><rect x="2.5" y="5.5" width="4" height="4" rx="0.9"/><line x1="4.5" y1="9.5" x2="4.5" y2="13.7"/><circle cx="4.5" cy="15" r="1.2"/><rect x="10" y="5.5" width="4" height="4" rx="0.9"/><line x1="12" y1="9.5" x2="12" y2="13.7"/><circle cx="12" cy="15" r="1.2"/><rect x="17.5" y="5.5" width="4" height="4" rx="0.9"/><line x1="19.5" y1="9.5" x2="19.5" y2="13.7"/><circle cx="19.5" cy="15" r="1.2"/>',
    bullets: ['standard timeline', 'horizontally scrollable'] },
];

// config (Hardware & Software Tech Visuals) types — the Storage / Configuration
// Chart IS the canonical config bank (the one real type today): clicking it
// seeds a derived `config` section (grammar seed + registry host). More chart
// types are ghosts until built.
const CONFIG_TYPES: TypeTile[] = [
  { id: 'config', name: 'Storage / Configuration Chart',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><text x="12" y="11" text-anchor="middle" dominant-baseline="middle" font-size="7" font-family="monospace" font-weight="bold" fill="currentColor" stroke="none">64</text><text x="12" y="17.5" text-anchor="middle" dominant-baseline="middle" font-size="4.2" font-family="monospace" fill="currentColor" stroke="none">GB</text>',
    desc: 'Capacity tiers as proportional fill bars (lowest → highest), with price, dates & device-color dots. Revised configs drop below a divider.' },
];

// catalog types from the mockup's CATALOG_TYPES — Category Masonry IS the
// canonical catalog bank (the one real type today); the rest are ghosts.
const CATALOG_TYPES: TypeTile[] = [
  { id: 'catalog', name: 'Masonry Catalog',
    icon: '<rect x="3.5" y="3.5" width="7" height="9.5" rx="1.4"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.4"/><rect x="13.5" y="11" width="7" height="9.5" rx="1.4"/>',
    desc: 'A masonry of category cards; each item opens an expandable-card modal. The classic ViziWiki catalog.' },
  { id: 'flat-table', name: 'Flat Table',
    icon: BLANK,
    desc: 'Every item in one sortable, filterable table.' },
  { id: 'tier-list', name: 'Tier List',
    icon: BLANK,
    desc: 'Items ranked into labelled tiers (S / A / B …).' },
  { id: 'gallery-catalog', name: 'Gallery Catalog',
    icon: BLANK,
    desc: 'Image-led cards with an expandable detail view.' },
  { id: 'compact-list', name: 'Compact List',
    icon: BLANK,
    desc: 'A dense single-column list, no cards.' },
  { id: 'timeline-catalog', name: 'Timeline Catalog',
    icon: BLANK,
    desc: 'Items laid out chronologically along a spine.' },
];

export function SectionPicker({ onClose, onPick }: { onClose: () => void; onPick: (type: string) => void }) {
  const [screen, setScreen] = useState<'choices' | 'browse' | 'catalog' | 'timeline' | 'config'>('choices');
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
          {types.map((t) => {
            const live = isLive(t.id);   // derived from canon, not stored on the tile
            return (
            <div
              key={t.id}
              className={`sp-card ${live ? 'available' : 'soon'}`}
              title={live ? '' : 'Coming soon'}
              onClick={live ? () => onPick(t.id) : undefined}
            >
              <span className={`sp-pill ${live ? 'ok' : 'soon'}`}>{live ? 'Available' : 'Soon'}</span>
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
            );
          })}
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
        {screen === 'config' && typeScreen('Hardware & Software Tech Visuals', 'Pick a chart type', CONFIG_TYPES)}
      </div>
    </div>
  );
}
