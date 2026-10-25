'use client';
import React, { useState } from 'react';
import type { Wiki } from '../../lib/wiki';
import { BrandLockup, type DrawerItem } from './BrandLockup';
import { ICON_SPRITE } from '../../lib/render';

const WIKI_COLOR: Record<string, string> = { 'taco-bell': '#702082', 'apple': '#1d1d1f' };

// The wiki's MARK in the switcher — renders the identity's icon slot
// (migration 0009): art image → glyph from the canon sprite → auto letter.
const Swatch = ({ wiki }: { wiki: Wiki }) => {
  const ic = wiki.icon;
  if (ic?.kind === 'art' && ic.src) {
    return <span className="wiki-btn-icon"><img className="wiki-mark-img" src={ic.src} alt="" /></span>;
  }
  const color = WIKI_COLOR[wiki.id] || '#9d7cf4';
  if (ic?.kind === 'glyph' && ic.name) {
    return <span className="wiki-btn-icon" style={{ background: color, color: '#fff' }}><svg className="wiki-mark-glyph"><use href={`#ic-${ic.name}`} /></svg></span>;
  }
  return <span className="wiki-btn-icon" style={{ background: color, color: '#fff', fontWeight: 700 }}>{wiki.name[0]}</span>;
};

export function Topbar({ wikis, current, onSwitch, menu, account }: { wikis: Wiki[]; current?: Wiki; onSwitch: (w: Wiki) => void; menu?: DrawerItem[]; account?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div id="topbar">
      {/* the canon sprite, once — wiki glyph marks reference it */}
      <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
      {/* brand lockup (ViziWiki + Build Kit), then a separator, then the existing chrome */}
      <BrandLockup menu={menu} />
      <span className="brand-sep" />
      {current ? (
      <div id="wiki-switcher">
        <button id="wiki-btn" className={open ? 'open' : ''} onClick={() => setOpen((o) => !o)}>
          <Swatch wiki={current} />
          <span id="wiki-btn-name">{current.name}</span>
          <svg className="wiki-btn-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {open && (
          <div id="wiki-dropdown">
            {wikis.map((w) => (
              <button key={w.id} className={`wdrop-item ${w.id === current.id ? 'active' : ''}`} onClick={() => { setOpen(false); if (w.id !== current.id) onSwitch(w); }}>
                <Swatch wiki={w} />
                <span className="wdrop-name">{w.name}</span>
                {w.status === 'coming_soon' && <span className="wdrop-soon">soon</span>}
              </button>
            ))}
                {/* sticky footer — the count only. Creating a wiki lives in the
                drawer menu (the layers icon), per the owner: SWITCHING and
                ORIGINATING are different jobs. */}
            <div className="wdrop-foot">
              <div className="wdrop-divider" />
              <div style={{ padding: '8px 9px 4px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase' }}>
                {wikis.length} wiki{wikis.length !== 1 ? 's' : ''} · the content store
              </div>
            </div>
          </div>
        )}
      </div>
      ) : null}
      {/* the WIKI IDENTITY button now lives FIRST in the canvas tree's left
          rail (owner's rule) — the topbar keeps switching + account only */}

      {/* the account control (phase-2 roles) — sign-in / identity + class badge;
          admins also get the "view as" class preview (the old level seam, real) */}
      <div id="level-toggle">{account}</div>

      <div id="topbar-kbd">
        <span><span className="kbd">drag</span> to pan · <span className="kbd">click</span> a page</span>
      </div>
    </div>
  );
}
