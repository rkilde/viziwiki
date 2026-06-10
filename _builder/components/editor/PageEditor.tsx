'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc } from '../../lib/store';
import { buildCanvas, setIn, applyAction } from '../../lib/canvas';

const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');

/**
 * The page editor. Renders the page in an IFRAME that loads the canonical CSS
 * (copied from the repo) and emits the real wiki-* markup — so hero/overview/
 * stat-grid look exactly like the live site and track the master format. Editable
 * text is contenteditable inside the iframe; it calls back via window.__peField /
 * __peAction. Field edits update the doc in place (no reload); +add/×remove bump a
 * revision to re-render the iframe.
 */
export function PageEditor({ page, onClose }: { page: Page; onClose: () => void }) {
  const docRef = useRef<PageDoc>(loadPageDoc(page));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [rev, setRev] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (window as any).__peField = (path: string, html: string) => { setIn(docRef.current, path, html); setSaved(false); };
    (window as any).__peAction = (action: string) => { applyAction(docRef.current, action); setSaved(false); setRev((r) => r + 1); };
    (window as any).__peResize = (h: number) => { if (iframeRef.current) iframeRef.current.style.height = Math.max(h, 480) + 'px'; };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { delete (window as any).__peField; delete (window as any).__peAction; delete (window as any).__peResize; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const srcDoc = useMemo(() => buildCanvas(docRef.current), [rev]);

  const save = () => { savePageDoc(page.id, docRef.current); setSaved(true); };
  const revert = () => { resetPageDoc(page.id); docRef.current = seedDoc(page); setSaved(false); setRev((r) => r + 1); };

  return (
    <div id="pe-overlay">
      <div className="pe-bar">
        <span className="pe-ttl">{oneLine(page.title)}</span>
        <span className="pe-canon-note">canonical CSS · hero + overview (locked)</span>
        <span className="sp" />
        {saved && <span className="saved">saved ✓</span>}
        <button onClick={revert}>Revert</button>
        <button onClick={onClose}>Close</button>
        <button className="primary" onClick={save}>Save</button>
      </div>
      <div className="pe-canvas-area">
        <iframe ref={iframeRef} className="pe-canvas" title="Page editor" srcDoc={srcDoc} style={{ height: 600 }} />
      </div>
    </div>
  );
}
