'use client';
import React, { useState } from 'react';
import type { Wiki } from '../../lib/wiki';
import { BrandLockup } from './BrandLockup';

// Wiki swatch — a small colored tile. (Real per-wiki icons come later.)
const Swatch = ({ color, label }: { color: string; label: string }) => (
  <span className="wiki-btn-icon" style={{ background: color, color: '#fff', fontWeight: 700 }}>{label}</span>
);

const WIKI_COLOR: Record<string, string> = { 'taco-bell': '#702082', 'apple': '#1d1d1f' };

export function Topbar({ wikis, current, onSwitch, onNewWiki, account }: { wikis: Wiki[]; current?: Wiki; onSwitch: (w: Wiki) => void; onNewWiki?: () => void; account?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const color = current ? (WIKI_COLOR[current.id] || '#9d7cf4') : '#9d7cf4';

  return (
    <div id="topbar">
      {/* brand lockup (ViziWiki + Build Kit), then a separator, then the existing chrome */}
      <BrandLockup />
      <span className="brand-sep" />
      {current ? (
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
            {onNewWiki && <div className="wdrop-divider" />}
            {onNewWiki && (
              /* opens the ORIGINATION modal (identity + categories + tile
                 cover + optional wiki-master grant) — the admin flow */
              <button className="wdrop-item wdrop-new" onClick={() => { setOpen(false); onNewWiki(); }}>
                <span className="wiki-btn-icon" style={{ background: 'transparent', border: '1px dashed var(--border3)', color: 'var(--muted)', fontWeight: 700 }}>+</span>
                <span className="wdrop-name">New wiki</span>
              </button>
            )}
            <div style={{ padding: '8px 9px 4px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase' }}>
              {onNewWiki ? 'more wikis load from the content store' : 'wikis you hold a grant for'}
            </div>
          </div>
        )}
      </div>
      ) : null}

      <div id="view-toggle">
        <button className="vt-btn" disabled title="Coming soon">Tree</button>
        <button className="vt-btn active" data-mode="columns">Columns</button>
      </div>

      {/* the account control (phase-2 roles) — sign-in / identity + class badge;
          admins also get the "view as" class preview (the old level seam, real) */}
      <div id="level-toggle">{account}</div>

      <div id="topbar-kbd">
        <span><span className="kbd">click</span> a page to preview</span>
      </div>
    </div>
  );
}
