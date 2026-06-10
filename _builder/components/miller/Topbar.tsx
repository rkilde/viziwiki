'use client';
import React, { useState } from 'react';
import type { Wiki } from '../../lib/wiki';

// Wiki swatch — a small coloured tile. (Real per-wiki icons come later.)
const Swatch = ({ color, label }: { color: string; label: string }) => (
  <span className="wiki-btn-icon" style={{ background: color, color: '#fff', fontWeight: 700 }}>{label}</span>
);

const WIKI_COLOR: Record<string, string> = { 'taco-bell': '#702082', 'apple': '#1d1d1f' };

export function Topbar({ wikis, current, onSwitch, onNewWiki, level, onLevel }: { wikis: Wiki[]; current: Wiki; onSwitch: (w: Wiki) => void; onNewWiki: (name: string) => void; level: number; onLevel: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const color = WIKI_COLOR[current.id] || '#9d7cf4';

  const commitNew = () => {
    const n = name.trim();
    if (n) { onNewWiki(n); setOpen(false); }
    setNaming(false); setName('');
  };

  return (
    <div id="topbar">
      <div id="wiki-switcher">
        <button id="wiki-btn" className={open ? 'open' : ''} onClick={() => setOpen((o) => !o)}>
          <Swatch color={color} label={current.name[0]} />
          <span id="wiki-btn-name">{current.name}</span>
          <svg className="wiki-btn-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {open && (
          <div id="wiki-dropdown">
            {wikis.map((w) => (
              <button key={w.id} className={`wdrop-item ${w.id === current.id ? 'active' : ''}`} onClick={() => { setOpen(false); if (w.id !== current.id) onSwitch(w); }}>
                <Swatch color={WIKI_COLOR[w.id] || '#9d7cf4'} label={w.name[0]} />
                <span className="wdrop-name">{w.name}</span>
              </button>
            ))}
            <div className="wdrop-divider" />
            {naming ? (
              <input
                className="wdrop-new-input" autoFocus value={name} placeholder="New wiki name…"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setNaming(false); setName(''); } }}
                onBlur={commitNew}
              />
            ) : (
              <button className="wdrop-item wdrop-new" onClick={() => setNaming(true)}>
                <span className="wiki-btn-icon" style={{ background: 'transparent', border: '1px dashed var(--border3)', color: 'var(--muted)', fontWeight: 700 }}>+</span>
                <span className="wdrop-name">New wiki</span>
              </button>
            )}
            <div style={{ padding: '8px 9px 4px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase' }}>
              more wikis load from the content store
            </div>
          </div>
        )}
      </div>

      <div id="view-toggle">
        <button className="vt-btn" disabled title="Coming soon">Tree</button>
        <button className="vt-btn active" data-mode="columns">Columns</button>
      </div>

      <div id="level-toggle" title="Admin only — preview the builder as a contributor access level">
        <span className="lvl-label">Access</span>
        {[1, 2, 3].map((n) => (
          <button key={n} className={`vt-btn ${level === n ? 'active' : ''}`} onClick={() => onLevel(n)}>Level {n}</button>
        ))}
      </div>

      <div id="topbar-kbd">
        <span><span className="kbd">click</span> a page to preview</span>
      </div>
    </div>
  );
}
