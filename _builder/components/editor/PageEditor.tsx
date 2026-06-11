'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page, WikiSkin } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc } from '../../lib/store';
import { buildCanvas, setIn, applyAction } from '../../lib/canvas';
import { renderBody } from '../../lib/render';
import { SectionPicker } from './SectionPicker';

const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');

/**
 * The page editor. The page renders in an IFRAME that loads the canonical CSS
 * (copied from the repo) and a body produced by EXECUTING the repo's own
 * Liquid includes (lib/render.ts) — the editor is DERIVED from the master
 * format, not a restatement of it. The iframe document loads ONCE; every edit
 * swaps the <body> in place (no reload → smooth, no flash) and re-runs the
 * decorator (editing affordances). Field edits sync via __peField; +add /
 * ×remove via __peAction; both update the live body.
 */
export function PageEditor({ page, skin, onClose }: { page: Page; skin: WikiSkin; onClose: () => void }) {
  const docRef = useRef<PageDoc>(loadPageDoc(page));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saved, setSaved] = useState(false);
  // page readiness — DERIVED in the canvas (decorator reads grammar `required`),
  // reported up here for the page-level pill. { incomplete, ready }
  const [ready, setReady] = useState<{ incomplete: number; ready: boolean } | null>(null);
  // add-section picker: null = closed, number = the insert index the seam carries
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const isHome = !!page.home; // home pages get home-only canon (e.g. the search bar)

  // built once — never changes, so the iframe never reloads
  const srcDoc = useMemo(() => buildCanvas(renderBody(docRef.current, isHome), skin), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const swapBody = () => {
      const ifr = iframeRef.current;
      if (!ifr?.contentDocument?.body) return;
      ifr.contentDocument.body.innerHTML = renderBody(docRef.current, isHome);
      (ifr.contentWindow as any)?.__decorate?.();
    };
    (window as any).__peField = (path: string, html: string) => { setIn(docRef.current, path, html); setSaved(false); };
    (window as any).__peAction = (action: string) => { applyAction(docRef.current, action); setSaved(false); swapBody(); };
    (window as any).__peResize = (h: number) => { if (iframeRef.current) iframeRef.current.style.height = Math.max(h, 480) + 'px'; };
    (window as any).__peOpenPicker = (index: number) => setPickerAt(typeof index === 'number' ? index : 0); // seam → picker (carries insert position)
    (window as any).__peDoc = () => docRef.current; // decorator reads current values (e.g. toolbar editors)
    (window as any).__peReadiness = (r: { incomplete: number; ready: boolean }) => setReady(r); // derived in-canvas
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { delete (window as any).__peField; delete (window as any).__peAction; delete (window as any).__peResize; delete (window as any).__peOpenPicker; delete (window as any).__peDoc; delete (window as any).__peReadiness; window.removeEventListener('keydown', onKey); };
  }, [onClose, isHome]);

  const save = () => { savePageDoc(page.id, docRef.current); setSaved(true); };
  const revert = () => {
    resetPageDoc(page.id);
    docRef.current = seedDoc(page);
    setSaved(false);
    const ifr = iframeRef.current;
    if (ifr?.contentDocument?.body) {
      ifr.contentDocument.body.innerHTML = renderBody(docRef.current, isHome);
      (ifr.contentWindow as any)?.__decorate?.();
    }
  };

  return (
    <div id="pe-overlay">
      <div className="pe-canvas-area">
        <iframe ref={iframeRef} className="pe-canvas" title="Page editor" srcDoc={srcDoc} style={{ height: 600 }} />
      </div>
      <div id="pe-chrome">
        {ready && (
          <span className={`pe-pgstat ${ready.ready ? 'done' : 'todo'}`} title="Derived from the grammar's required fields">
            {ready.ready ? <><IcCheck />Page ready</> : <><IcTri />{ready.incomplete} section{ready.incomplete !== 1 ? 's' : ''} need attention</>}
          </span>
        )}
        {saved && <span className="pe-chip-status"><IcCheck />saved</span>}
        <button onClick={revert} title="Discard changes"><IcUndo />Revert</button>
        <button onClick={onClose} title="Close (Esc)"><IcX />Close</button>
        <button className="primary" onClick={save}><IcCheck />Save</button>
      </div>
      {pickerAt != null && (
        <SectionPicker
          onClose={() => setPickerAt(null)}
          onPick={(type) => { (window as any).__peAction?.(`secAdd:${pickerAt}:${type}`); setPickerAt(null); }}
        />
      )}
    </div>
  );
}

const IcUndo = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>);
const IcX = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const IcCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
const IcTri = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
