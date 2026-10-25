'use client';
import React, { useState } from 'react';
import type { Page } from '../../lib/wiki';
import { oneLine } from '../../lib/wiki';
import { contentStore, type PageIcon, type PageMeta } from '../../content-store';
import { FlowRoot, I, Ic, IconSheet, TagIcon, useLucide } from '../identity/kit';

/* ════════════════════════════════════════════════════════════════════
   THE PAGE EMBLEM editor — opened from the right rail's mark slot. A solo
   window (back/× return straight to the build kit): pick a symbol from the
   full library, paste the page's own image, or clear it. Saving upserts the
   page row's `icon` (migration 0010) — the mark lives in the TABLE, exactly
   like the wiki's own emblem, never hardcoded page-side again.
   ════════════════════════════════════════════════════════════════════ */

export function PageEmblemSheet({ wikiId, page, onClose, onSaved }: {
  wikiId: string; page: Page; onClose: () => void;
  /** called with the saved value so the dashboard reflects it immediately */
  onSaved: (icon: PageIcon | null) => void;
}) {
  const [icon, setIcon] = useState<PageIcon | null>((page.icon as PageIcon) ?? null);
  const [picking, setPicking] = useState(false);
  const [iconQ, setIconQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lib = useLucide();
  const title = oneLine(page.title || page.id);

  const save = async () => {
    if (!contentStore) { setErr('Cloud not configured'); return; }
    setBusy(true); setErr(null);
    try {
      const meta: PageMeta = {
        id: page.id,
        slug: (page.permalink || '/' + page.id).replace(/^\//, ''),
        title, type: page.home ? 'home' : 'standard',
      };
      await contentStore.setPageIcon(wikiId, meta, icon);
      onSaved(icon);
      onClose();
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  if (picking) {
    return <IconSheet q={iconQ} onQ={setIconQ} sel={icon?.kind === 'glyph' ? icon.name : null}
      onPick={(n) => { setIcon({ kind: 'glyph', name: n }); setPicking(false); }} onBack={() => setPicking(false)} />;
  }

  const isData = icon?.kind === 'art' && icon.src?.startsWith('data:');
  return (
    <FlowRoot kind="fl">
      <div className="fl-head">
        <button className="fl-icon-btn" onClick={onClose}><Ic d={I.back} w={2.2} /></button>
        <div className="fl-dots" />
        <button className="fl-icon-btn" onClick={onClose}><Ic d={I.x} w={2.2} /></button>
      </div>
      <div className="fl-body"><div className="fl-wrap solo"><div className="q solo" style={{ maxWidth: 560 }}>
        <div className="q-step">{title}</div>
        <h1 className="q-h">Pick its page emblem.</h1>
        <p className="q-sub">The small mark this page wears in the rails — beside the wiki’s own emblem.</p>
        <div className="q-field">
          <div className="choice">
            <button type="button" className={`choice-card ${icon?.kind === 'glyph' ? 'on' : ''}`} onClick={() => setPicking(true)}>
              <span className="choice-top">
                <span className="pes-mark">{icon?.kind === 'glyph' && icon.name ? <TagIcon name={icon.name} lib={lib} /> : <Ic d={I.search} w={1.8} />}</span>
                <span className="choice-t">Symbol</span></span>
              <div className="choice-d">Pick from the full symbol library.</div>
            </button>
            <button type="button" className={`choice-card ${icon?.kind === 'art' ? 'on' : ''}`}
              onClick={() => setIcon({ kind: 'art', src: icon?.kind === 'art' ? icon.src : '' })}>
              <span className="choice-top">
                <span className="pes-mark">{icon?.kind === 'art' && icon.src ? <img src={icon.src} alt="" /> : <Ic d={I.spark} w={1.8} />}</span>
                <span className="choice-t">Its own image</span></span>
              <div className="choice-d">Paste a small square image or SVG link.</div>
            </button>
            <button type="button" className={`choice-card ${!icon ? 'on' : ''}`} onClick={() => setIcon(null)}>
              <span className="choice-top"><span className="pes-mark none">—</span><span className="choice-t">None</span></span>
              <div className="choice-d">No page emblem — only the wiki’s mark shows.</div>
            </button>
          </div>
          {icon?.kind === 'art' && (
            <div style={{ marginTop: 20 }}>
              {isData
                ? <div className="in-under"><Ic d={I.check} w={2.2} /> Its own artwork is loaded (scanned off the live page). Paste a link below to replace it.</div>
                : null}
              <input className="in sm" value={isData ? '' : icon.src || ''} placeholder="Paste an image link — square works best"
                onChange={(e) => setIcon({ kind: 'art', src: e.target.value })} />
            </div>
          )}
          {err && <div className="in-under bad"><Ic d={I.warn} w={2} /> {err}</div>}
        </div>
      </div></div></div>
      <div className="fl-foot"><div className="fl-foot-in solo">
        <button className="go" onClick={save} disabled={busy}>{busy ? '…' : 'Save emblem'}<Ic d={I.check} w={2.4} /></button>
        <button className="skip" onClick={onClose}>Cancel</button>
      </div></div>
    </FlowRoot>
  );
}
