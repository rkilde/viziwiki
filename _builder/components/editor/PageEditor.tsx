'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc } from '../../lib/store';
import { buildCanvas, buildBody, setIn, applyAction } from '../../lib/canvas';

const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');

/**
 * The page editor. The page renders in an IFRAME that loads the canonical CSS
 * (copied from the repo) + the real wiki-* markup — so it looks exactly like the
 * live site and tracks the master format. The iframe document loads ONCE; every
 * edit just swaps the <body> in place (no reload → smooth, no flash). Field edits
 * sync via __peField; +add/×remove via __peAction; both update the live body.
 */
export function PageEditor({ page, onClose }: { page: Page; onClose: () => void }) {
  const docRef = useRef<PageDoc>(loadPageDoc(page));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saved, setSaved] = useState(false);

  // built once — never changes, so the iframe never reloads
  const srcDoc = useMemo(() => buildCanvas(docRef.current), []);

  useEffect(() => {
    const swapBody = () => {
      const idoc = iframeRef.current?.contentDocument;
      if (idoc?.body) idoc.body.innerHTML = buildBody(docRef.current);
    };
    (window as any).__peField = (path: string, html: string) => { setIn(docRef.current, path, html); setSaved(false); };
    (window as any).__peAction = (action: string) => { applyAction(docRef.current, action); setSaved(false); swapBody(); };
    (window as any).__peResize = (h: number) => { if (iframeRef.current) iframeRef.current.style.height = Math.max(h, 480) + 'px'; };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { delete (window as any).__peField; delete (window as any).__peAction; delete (window as any).__peResize; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const save = () => { savePageDoc(page.id, docRef.current); setSaved(true); };
  const revert = () => {
    resetPageDoc(page.id);
    docRef.current = seedDoc(page);
    setSaved(false);
    const idoc = iframeRef.current?.contentDocument;
    if (idoc?.body) idoc.body.innerHTML = buildBody(docRef.current);
  };

  return (
    <div id="pe-overlay">
      <div className="pe-canvas-area">
        <iframe ref={iframeRef} className="pe-canvas" title="Page editor" srcDoc={srcDoc} style={{ height: 600 }} />
      </div>
      <div id="pe-chrome">
        {saved && <span className="pe-chip-status"><IcCheck />saved</span>}
        <button onClick={revert} title="Discard changes"><IcUndo />Revert</button>
        <button onClick={onClose} title="Close (Esc)"><IcX />Close</button>
        <button className="primary" onClick={save}><IcCheck />Save</button>
      </div>
    </div>
  );
}

const IcUndo = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>);
const IcX = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const IcCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
