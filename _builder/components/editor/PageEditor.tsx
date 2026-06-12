'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page, WikiSkin } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc } from '../../lib/store';
import { buildCanvas, setIn, applyAction } from '../../lib/canvas';
import { renderBody } from '../../lib/render';
import { SectionPicker } from './SectionPicker';
import { BugReporter } from './BugReporter';

const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');

// readiness payload from the decorator (computed in-canvas, DERIVED from
// grammar). The markers themselves render out here in the editor chrome — an
// iframe can't paint into the backdrop beside it.
type MkItem = { label: string; met: boolean; jump: string; addpath?: string };
type MkGroup = { label: string; items: MkItem[] };
type Marker = { top: number; prefix: string; done: boolean; count: number; groups: MkGroup[] };

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
  // per-section readiness markers (DERIVED in-canvas, rendered in the backdrop)
  const [markers, setMarkers] = useState<Marker[]>([]);
  // the iframe's offset within the scroll area, so markers align to the canvas
  const [mkBox, setMkBox] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [openMk, setOpenMk] = useState<number | null>(null);
  // add-section picker: null = closed, number = the insert index the seam carries
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const isHome = !!page.home; // home pages get home-only canon (e.g. the search bar)

  // built once — never changes, so the iframe never reloads
  const srcDoc = useMemo(() => buildCanvas(renderBody(docRef.current, isHome), skin), []); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = () => {
    const ifr = iframeRef.current;
    if (ifr) setMkBox({ left: ifr.offsetLeft, top: ifr.offsetTop });
  };

  useEffect(() => {
    const swapBody = () => {
      const ifr = iframeRef.current;
      if (!ifr?.contentDocument?.body) return;
      ifr.contentDocument.body.innerHTML = renderBody(docRef.current, isHome);
      (ifr.contentWindow as any)?.__decorate?.();
    };
    (window as any).__peField = (path: string, html: string) => { setIn(docRef.current, path, html); setSaved(false); };
    (window as any).__peAction = (action: string) => { applyAction(docRef.current, action); setSaved(false); setOpenMk(null); swapBody(); };
    (window as any).__peResize = (h: number) => { if (iframeRef.current) iframeRef.current.style.height = Math.max(h, 480) + 'px'; };
    (window as any).__peOpenPicker = (index: number) => setPickerAt(typeof index === 'number' ? index : 0); // seam → picker (carries insert position)
    (window as any).__peDoc = () => docRef.current; // decorator reads current values (e.g. toolbar editors)
    (window as any).__peMarkers = (list: Marker[]) => { setMarkers(list); measure(); }; // readiness, derived in-canvas
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (openMkRef.current != null) setOpenMk(null); else onClose(); };
    const onResize = () => measure();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { delete (window as any).__peField; delete (window as any).__peAction; delete (window as any).__peResize; delete (window as any).__peOpenPicker; delete (window as any).__peDoc; delete (window as any).__peMarkers; window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [onClose, isHome]);

  // mirror openMk into a ref so the keydown handler (bound once) sees it live
  const openMkRef = useRef<number | null>(null);
  openMkRef.current = openMk;

  const save = () => { savePageDoc(page.id, docRef.current); setSaved(true); };
  const revert = () => {
    resetPageDoc(page.id);
    docRef.current = seedDoc(page);
    setSaved(false); setOpenMk(null);
    const ifr = iframeRef.current;
    if (ifr?.contentDocument?.body) {
      ifr.contentDocument.body.innerHTML = renderBody(docRef.current, isHome);
      (ifr.contentWindow as any)?.__decorate?.();
    }
  };

  const jump = (it: MkItem) => { (iframeRef.current?.contentWindow as any)?.__peJump?.(it.jump, it.addpath); setOpenMk(null); };
  const todoCount = markers.filter((m) => !m.done).length;
  const left = (m: Marker) => Math.max(6, mkBox.left - 50); // 50px into the backdrop, left of the canvas

  return (
    <div id="pe-overlay">
      <div className="pe-canvas-area" onMouseDown={(e) => { if (!(e.target as HTMLElement).closest('.pe-mk, .pe-mk-panel')) setOpenMk(null); }}>
        <iframe ref={iframeRef} className="pe-canvas" title="Page editor" srcDoc={srcDoc} style={{ height: 600 }} onLoad={measure} />
        {/* readiness rail — out in the backdrop, aligned to each section */}
        {markers.map((m, i) => (
          <React.Fragment key={i}>
            <button
              className={`pe-mk ${m.done ? 'done' : 'todo'} ${openMk === i ? 'open' : ''}`}
              style={{ top: mkBox.top + m.top + 6, left: left(m) }}
              title={m.done ? 'Section ready' : `${m.count} required left`}
              onClick={(e) => { e.stopPropagation(); setOpenMk(openMk === i ? null : i); }}
            >
              <span className="pe-mk-tri">{m.done ? <IcCheck /> : <IcTri />}</span>
              {!m.done && <span className="pe-mk-count">{m.count}</span>}
            </button>
            {openMk === i && (
              <div className="pe-mk-panel" style={{ top: mkBox.top + m.top, left: Math.max(6, left(m) - 302) }} onMouseDown={(e) => e.stopPropagation()}>
                <div className="pe-mk-head">
                  <span className="pi">{m.done ? <IcCheck /> : <IcTri />}</span>
                  <span className="pt">{m.done ? 'Section ready' : 'Needs attention'}</span>
                  <span className="pn">{m.done ? 'complete' : `${m.count} required`}</span>
                </div>
                {m.done ? (
                  <div className="pe-mk-allgood"><span className="pi"><IcCheck /></span> Everything required is in place.</div>
                ) : (
                  m.groups.filter((g) => g.items.some((it) => !it.met)).map((g, gi) => (
                    <div className="pe-mk-cat" key={gi}>
                      <div className="pe-mk-cat-label">{g.label}</div>
                      {g.items.map((it, ii) => (
                        <button key={ii} className={`pe-mk-item ${it.met ? 'met' : ''}`} disabled={it.met} onClick={() => !it.met && jump(it)}>
                          <span className="box" /><span className="tx">{it.label}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {/* report-a-bug (top-left) — UI only for now */}
      <BugReporter />
      <div id="pe-chrome">
        {markers.length > 0 && (
          <span className={`pe-pgstat ${todoCount === 0 ? 'done' : 'todo'}`} title="Derived from the grammar's required fields">
            {todoCount === 0 ? <><IcCheck />Page ready</> : <><IcTri />{todoCount} section{todoCount !== 1 ? 's' : ''} need attention</>}
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
