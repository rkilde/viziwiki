'use client';
import React, { useEffect, useState } from 'react';

// The add-section picker — ported from the owner's mockup. Screen 1: choose
// how to start (Section template / Custom section). Screen 2: the template
// bank, currently the four bank tiles only. EVERYTHING is a ghost for now —
// no tile adds anything; the real wiring lands as sections become
// editor-renderable.
const ic = (d: string, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

// tiles from the mockup's SECTION_TEMPLATES (names pluralized per the owner)
const TILES = [
  {
    id: 'catalog', name: 'Catalogs', pill: 'Category' as const,
    icon: '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    desc: 'Categorized, browsable lists — each item opens an expandable card. Pick a catalog type →',
  },
  {
    id: 'timeline', name: 'Timelines', pill: 'Category' as const,
    icon: '<polyline points="18 8 22 12 18 16"/><polyline points="6 8 2 12 6 16"/><line x1="2" y1="12" x2="22" y2="12"/>',
    desc: 'Date-positioned event scrollers on a real time axis. Pick a timeline type →',
  },
  {
    id: 'delta', name: 'Side by Side Comparisons', pill: 'Available' as const,
    icon: '<path d="M12 3v18"/><rect x="3" y="8" width="6" height="8" rx="1"/><rect x="15" y="8" width="6" height="8" rx="1"/>',
    desc: 'A previous-vs-current table grouped into Hardware & Software, with colour-coded change chips (better, feature, changed, worse, same).',
  },
  {
    id: 'config', name: 'Hardware & Software Tech Visuals', pill: 'Category' as const,
    icon: '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
    desc: 'Storage/spec tiers with proportional fill bars derived from capacity, plus price, dates & device-colour dots. Pick a chart type →',
  },
];

export function SectionPicker({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<'choices' | 'browse'>('choices');
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const shown = TILES.filter((t) => !q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase()));

  return (
    <div id="sec-picker" className="open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-modal" onMouseDown={(e) => e.stopPropagation()}>
        {screen === 'choices' ? (
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
        ) : (
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
                  <div key={t.id} className="sp-card available">
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
      </div>
    </div>
  );
}
