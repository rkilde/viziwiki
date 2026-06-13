'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page, WikiSkin } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc } from '../../lib/store';
import { buildCanvas, setIn, applyAction } from '../../lib/canvas';
import { renderBody } from '../../lib/render';
import { SectionPicker } from './SectionPicker';
import { BugReporter } from './BugReporter';
import { ReadinessPanel, type Marker, type Leaf } from './ReadinessPanel';

const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');

// Preview viewport — the canvas lays out at this logical desktop width, then
// auto-scales to fit the editor's footprint (so 8vw and every proportion
// resolve like a real desktop, not the narrow iframe). Single knob: the
// scaling machinery stays intact, so re-sizing or re-adding views later is a
// one-line change here — no in-iframe code touched.
const CANVAS_W = 1080;

// The marker payload (per section) is built + posted by the decorator, DERIVED
// from grammar; the markers render out here in the editor chrome — an iframe
// can't paint into the backdrop beside it. Shape lives in ReadinessPanel.

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
  const areaRef = useRef<HTMLDivElement>(null);   // the scroll area (sets the fit width)
  const wrapRef = useRef<HTMLDivElement>(null);   // the scaled canvas footprint
  const [saved, setSaved] = useState(false);
  // per-section readiness markers (DERIVED in-canvas, rendered in the backdrop)
  const [markers, setMarkers] = useState<Marker[]>([]);
  // the SCALED canvas's screen offset, so markers align to it
  const [mkBox, setMkBox] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [openMk, setOpenMk] = useState<number | null>(null);
  // add-section picker: null = closed, number = the insert index the seam carries
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const isHome = !!page.home; // home pages get home-only canon (e.g. the search bar)

  // ── the one scale source ── the canvas lays out at `logicalW`, then scales to
  // fit the available width (never UP-scaled past 1:1). Every geometry below
  // reads `scale`; the iframe content is unaware of it.
  const [availW, setAvailW] = useState(0);        // canvas-area inner width
  const [contentH, setContentH] = useState(600);  // iframe content height (logical px)
  const logicalW = CANVAS_W;
  const PAD = 80;                                  // .pe-canvas-area horizontal padding (40+40)
  const scale = availW > 0 ? Math.min(1, (availW - PAD) / logicalW) : 1;

  // built once — never changes, so the iframe never reloads
  const srcDoc = useMemo(() => buildCanvas(renderBody(docRef.current, isHome), skin), []); // eslint-disable-line react-hooks/exhaustive-deps

  // remeasure both the available width AND the scaled canvas's screen offset
  const measure = () => {
    if (areaRef.current) setAvailW(areaRef.current.clientWidth);
    if (wrapRef.current) setMkBox({ left: wrapRef.current.offsetLeft, top: wrapRef.current.offsetTop });
  };

  useEffect(() => {
    const swapBody = () => {
      const ifr = iframeRef.current;
      if (!ifr?.contentDocument?.body) return;
      ifr.contentDocument.body.innerHTML = renderBody(docRef.current, isHome);
      (ifr.contentWindow as any)?.__decorate?.();
    };
    (window as any).__peField = (path: string, html: string) => { setIn(docRef.current, path, html); setSaved(false); };
    (window as any).__peAction = (action: string) => { applyAction(docRef.current, action); setSaved(false); if (/^(secAdd|secRm|secMove):/.test(action)) setOpenMk(null); swapBody(); };
    // drag-reorder mutates the doc WITHOUT a re-render — the decorator shuffles the
    // DOM nodes + FLIP-animates in place, then re-binds via a deferred swap.
    (window as any).__peReorderData = (action: string) => { applyAction(docRef.current, action); setSaved(false); };
    (window as any).__peResize = (h: number) => setContentH(Math.max(h, 480));
    (window as any).__peOpenPicker = (index: number) => setPickerAt(typeof index === 'number' ? index : 0); // seam → picker (carries insert position)
    (window as any).__peDoc = () => docRef.current; // decorator reads current values (e.g. toolbar editors)
    (window as any).__peMarkers = (list: Marker[]) => { setMarkers(list); measure(); }; // readiness, derived in-canvas
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (openMkRef.current != null) setOpenMk(null); else onClose(); };
    const onResize = () => measure();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    // the canvas area drives the fit width — observe it so scale auto-fits
    const ro = new ResizeObserver(() => measure());
    if (areaRef.current) ro.observe(areaRef.current);
    return () => { delete (window as any).__peField; delete (window as any).__peAction; delete (window as any).__peReorderData; delete (window as any).__peResize; delete (window as any).__peOpenPicker; delete (window as any).__peDoc; delete (window as any).__peMarkers; window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); ro.disconnect(); };
  }, [onClose, isHome]);

  // the scaled canvas's screen offset shifts whenever its footprint changes
  // (view switch, content height, available width) → re-read so markers track it
  useEffect(() => { measure(); }, [scale, contentH, availW, markers]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const jump = (it: Leaf) => { (iframeRef.current?.contentWindow as any)?.__peJump?.(it.jump, it.addpath); };
  const todoCount = markers.filter((m) => !m.done).length;
  const left = () => Math.max(6, mkBox.left - 50); // 50px into the backdrop, left of the canvas

  return (
    <div id="pe-overlay">
      <div ref={areaRef} className="pe-canvas-area" onMouseDown={(e) => { if (!(e.target as HTMLElement).closest('.pe-mk, .pe-mk-panel')) setOpenMk(null); }}>
        {/* the wrapper reserves the SCALED footprint; the iframe lays out at the
            full logical width and is scaled (top-left) to fit — so the page
            renders like that screen, just shown smaller. */}
        <div ref={wrapRef} className="pe-canvas-wrap" style={{ width: logicalW * scale, height: contentH * scale }}>
          <iframe ref={iframeRef} className="pe-canvas" title="Page editor" srcDoc={srcDoc}
            style={{ width: logicalW, height: contentH, transform: `scale(${scale})`, transformOrigin: 'top left' }} onLoad={measure} />
        </div>
        {/* readiness rail — out in the backdrop, aligned to each section. m.top is
            in iframe (logical) space → × scale to land on the scaled canvas. */}
        {markers.map((m, i) => (
          <React.Fragment key={i}>
            <button
              className={`pe-mk ${m.done ? 'done' : 'todo'} ${openMk === i ? 'open' : ''}`}
              style={{ top: mkBox.top + m.top * scale + 6, left: left() }}
              title={m.done ? 'Section ready' : `${m.left} required left`}
              onClick={(e) => { e.stopPropagation(); setOpenMk(openMk === i ? null : i); }}
            >
              <span className="pe-mk-tri">{m.done ? <IcCheck /> : <IcTri />}</span>
              {!m.done && <span className="pe-mk-count">{m.left}</span>}
            </button>
            {openMk === i && (
              <div className="pe-mk-panel" style={{ top: mkBox.top + m.top * scale, left: Math.max(6, left() - 354) }} onMouseDown={(e) => e.stopPropagation()}>
                <ReadinessPanel marker={m} onJump={jump} onClose={() => setOpenMk(null)} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {/* report-a-bug (top-left) — UI only for now */}
      <BugReporter />
      <div id="pe-chrome">
        {markers.length > 0 && todoCount === 0 && (
          <span className="pe-pgstat done" title="Derived from the grammar's required fields">
            <IcCheck />Page ready
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
