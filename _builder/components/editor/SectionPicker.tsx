'use client';
import React, { useEffect } from 'react';

// The add-section picker — the mockup's first screen, ported faithfully:
// "Add a section → choose how to start" with the two choice cards. BOTH are
// ghost/dummy options for now (no navigation, nothing is added); the real
// section bank wires in when more sections become editor-renderable.
const ic = (d: string) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

export function SectionPicker({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div id="sec-picker" className="open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sp-head">
          <div>
            <div className="sp-title">Add a section</div>
            <div className="sp-sub">Choose how to start</div>
          </div>
          <button className="sp-x" onClick={onClose}>×</button>
        </div>
        <div className="sp-body">
          <div className="sp-choices">
            <button className="sp-choice">
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
      </div>
    </div>
  );
}
