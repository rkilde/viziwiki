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

export function Topbar({ wikis, current, onSwitch, onNewWiki, onEditIdentity, menu, account }: { wikis: Wiki[]; current?: Wiki; onSwitch: (w: Wiki) => void; onNewWiki?: () => void; onEditIdentity?: () => void; menu?: DrawerItem[]; account?: React.ReactNode }) {
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
            {/* sticky footer — "+ New wiki" stays reachable however long the
               directory list above gets */}
            <div className="wdrop-foot">
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
                {onNewWiki ? `${wikis.length} wikis · the content store` : 'wikis you hold a grant for'}
              </div>
            </div>
          </div>
        )}
      </div>
      ) : null}
      {current && onEditIdentity && (
        /* the WIKI IDENTITY editor (tile cover art, tags, tagline, status) —
           admin or this wiki's master */
        <button className="vt-btn wiki-identity-btn" title={`Wiki identity — ${current.name}'s tile cover, tags, tagline, status`} onClick={onEditIdentity}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
          identity
        </button>
      )}

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
