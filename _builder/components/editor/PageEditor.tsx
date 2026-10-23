'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page, WikiSkin } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc } from '../../lib/store';
import { contentStore, type WikiMeta, type RevisionMeta } from '../../content-store';
import { canEditAnything, actionCap } from '../../lib/caps.mjs';
import { diffDocs } from '../../lib/diff-core.mjs';
import type { EditCaps } from '../../lib/canvas';
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
const ALL_CAPS: EditCaps = { text: true, titles: true, structure: true, design: true };

export function PageEditor({ page, skin, wikiMeta, caps = ALL_CAPS, canApprove = false, onClose }: { page: Page; skin: WikiSkin; wikiMeta?: WikiMeta; caps?: EditCaps; canApprove?: boolean; onClose: () => void }) {
  const docRef = useRef<PageDoc>(loadPageDoc(page));
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);   // the scroll area (sets the fit width)
  const wrapRef = useRef<HTMLDivElement>(null);   // the scaled canvas footprint
  const [saved, setSaved] = useState(false);
  // cloud persistence (ContentStore → Supabase when env keys are set):
  // 'off' = not configured (localStorage only) · ok/saving/err per last sync
  const [cloud, setCloud] = useState<'off' | 'ok' | 'saving' | 'err'>(contentStore && wikiMeta ? 'ok' : 'off');
  // set once the user edits anything — a late-arriving cloud doc must never
  // clobber in-progress edits
  const touchedRef = useRef(false);
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
  // shared layout constants for the canvas AND the readiness widget in its left
  // margin (so the two can't disagree).
  const GUTTER = 20, GAP = 18, PANEL_MAX = 330, PANEL_MIN = 248;
  const WIDGET_MIN = GUTTER + PANEL_MIN + GAP;            // 286 — min left margin the widget needs
  // Keep the canvas CENTERED at TRUE 1080. Only scale down if a centered 1080
  // wouldn't leave the widget its margin — reserve WIDGET_MIN on BOTH sides so it
  // stays symmetric. So "true 1080 + centered + widget contained" hold together
  // when the editor is wide enough (~1652px+); below that the canvas shrinks a
  // touch so the widget still fits in the (now smaller) centered margin.
  const maxDisp = availW - 2 * WIDGET_MIN;
  const scale = availW > 0 ? Math.min(1, maxDisp / logicalW) : 1;

  // built once — never changes, so the iframe never reloads
  const srcDoc = useMemo(() => buildCanvas(renderBody(docRef.current, isHome), skin, caps), []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // parent-side capability backstop (phase-2 roles): the decorator already
    // withholds affordances the class lacks; these refuse the underlying
    // mutations too, so canvas-side tampering can't climb classes.
    const may = canEditAnything(caps);
    (window as any).__peField = (path: string, html: string) => { if (!may) return; setIn(docRef.current, path, html); setSaved(false); touchedRef.current = true; };
    (window as any).__peAction = (action: string) => {
      const need = actionCap(action);
      if (need && !(caps as any)[need]) return;
      if (!may && need !== null) return;
      applyAction(docRef.current, action); setSaved(false); touchedRef.current = true; if (/^(secAdd|secRm|secMove):/.test(action)) setOpenMk(null); swapBody();
    };
    // drag-reorder mutates the doc WITHOUT a re-render — the decorator shuffles the
    // DOM nodes + FLIP-animates in place, then re-binds via a deferred swap.
    (window as any).__peReorderData = (action: string) => { applyAction(docRef.current, action); setSaved(false); touchedRef.current = true; };
    // render the current body WITHOUT swapping it in — lets the decorator splice a
    // single new node (e.g. a delta table row) in place instead of recreating the
    // whole table, so adds don't flash the static header rows.
    (window as any).__peRenderBody = () => renderBody(docRef.current, isHome);
    (window as any).__peResize = (h: number) => setContentH(Math.max(h, 480));
    (window as any).__peOpenPicker = (index: number) => setPickerAt(typeof index === 'number' ? index : 0); // seam → picker (carries insert position)
    (window as any).__peDoc = () => docRef.current; // decorator reads current values (e.g. toolbar editors)
    (window as any).__peMarkers = (list: Marker[]) => { setMarkers(list); measure(); }; // readiness, derived in-canvas
    // cloud hydrate (ContentStore): the editor opens instantly on the local
    // doc, then adopts the stored cloud doc when it arrives — unless the user
    // already started editing (their in-progress edits always win).
    let cloudLive = true;
    if (contentStore && wikiMeta) {
      contentStore.loadPage(wikiMeta.id, page.id).then((doc) => {
        if (!cloudLive || !doc || touchedRef.current) return;
        docRef.current = { ...(doc as PageDoc), _stash: docRef.current._stash };
        setSaved(true); setCloud('ok');
        swapBody();
      }).catch(() => { if (cloudLive) setCloud('err'); });
    }
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (openMkRef.current != null) setOpenMk(null); else onClose(); };
    const onResize = () => measure();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    // the canvas area drives the fit width — observe it so scale auto-fits
    const ro = new ResizeObserver(() => measure());
    if (areaRef.current) ro.observe(areaRef.current);
    return () => { cloudLive = false; delete (window as any).__peField; delete (window as any).__peAction; delete (window as any).__peReorderData; delete (window as any).__peRenderBody; delete (window as any).__peResize; delete (window as any).__peOpenPicker; delete (window as any).__peDoc; delete (window as any).__peMarkers; window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); ro.disconnect(); };
  }, [onClose, isHome]);

  // the scaled canvas's screen offset shifts whenever its footprint changes
  // (view switch, content height, available width) → re-read so markers track it
  useEffect(() => { measure(); }, [scale, contentH, availW, markers]); // eslint-disable-line react-hooks/exhaustive-deps

  // mirror openMk into a ref so the keydown handler (bound once) sees it live
  const openMkRef = useRef<number | null>(null);
  openMkRef.current = openMk;

  const canEdit = canEditAnything(caps);
  // phase 3: whether the last cloud save went LIVE (approver auto-publish)
  // or sits in the review queue
  const [saveFate, setSaveFate] = useState<'published' | 'pending' | null>(null);
  // the reader paths this page answers to — pinged after publish/revert so
  // readers update in seconds (on-demand cache invalidation)
  const readerPaths = wikiMeta ? [`/read/${wikiMeta.id}/${page.id}`, `/read/${wikiMeta.id}`, '/read'] : [];
  const pingReader = () => { try { fetch('/api/revalidate', { method: 'POST', body: JSON.stringify({ paths: readerPaths }) }); } catch { /* cache catches up in ≤60s */ } };
  const save = () => {
    if (!canEdit) return;
    savePageDoc(page.id, docRef.current); setSaved(true);   // local always (instant + offline fallback)
    if (contentStore && wikiMeta) {
      setCloud('saving'); setSaveFate(null);
      const meta = { id: page.id, slug: (page.permalink || '/' + page.id).replace(/^\//, ''), title: oneLine(page.title || page.id), type: isHome ? 'home' : 'standard' };
      contentStore.savePage(wikiMeta, meta, docRef.current, { publish: canApprove }).then((r) => {
        setCloud('ok'); setSaveFate(r.published ? 'published' : r.revId ? 'pending' : null);
        if (r.published) pingReader();
      }, (e) => { console.error('cloud save failed', e); setCloud('err'); });
    }
  };
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

  // ── phase 3: the HISTORY panel — every revision (who/when/status), a
  // green/red diff vs its predecessor, and approver actions ──
  const [histOpen, setHistOpen] = useState(false);
  const [revs, setRevs] = useState<RevisionMeta[]>([]);
  const [histBusy, setHistBusy] = useState(false);
  const [diffFor, setDiffFor] = useState<number | null>(null);
  const [diffRows, setDiffRows] = useState<Array<{ path: string; kind: string; old: string | null; new: string | null }>>([]);
  const loadHistory = () => {
    if (!contentStore || !wikiMeta) return;
    setHistBusy(true);
    contentStore.listRevisions(wikiMeta.id, page.id).then((list) => { setRevs(list); setHistBusy(false); }, () => setHistBusy(false));
  };
  const openHistory = () => { setHistOpen(true); setDiffFor(null); loadHistory(); };
  const showDiff = async (rev: RevisionMeta) => {
    if (!contentStore) return;
    setDiffFor(rev.id); setDiffRows([]);
    const older = revs.find((r) => r.id < rev.id);   // list is newest-first
    const [next, prev] = await Promise.all([
      contentStore.getRevisionDoc(rev.id),
      older ? contentStore.getRevisionDoc(older.id) : Promise.resolve(null),
    ]);
    setDiffRows(diffDocs(prev, next));
  };
  const reviewAct = async (kind: 'publish' | 'reject' | 'revert', rev: RevisionMeta) => {
    if (!contentStore) return;
    setHistBusy(true);
    try {
      if (kind === 'publish') { await contentStore.publishRevision(rev.id); pingReader(); }
      if (kind === 'reject') { await contentStore.rejectRevision(rev.id, 'rejected in review'); }
      if (kind === 'revert') {
        await contentStore.revertTo(rev.id); pingReader();
        // the working copy changed under us — adopt the reverted doc
        const doc = await contentStore.getRevisionDoc(rev.id);
        if (doc) {
          docRef.current = doc; savePageDoc(page.id, doc); setSaved(true);
          const ifr = iframeRef.current;
          if (ifr?.contentDocument?.body) { ifr.contentDocument.body.innerHTML = renderBody(docRef.current, isHome); (ifr.contentWindow as any)?.__decorate?.(); }
        }
      }
    } catch (e) { console.error(`${kind} failed`, e); }
    loadHistory();
  };

  const jump = (it: Leaf) => { (iframeRef.current?.contentWindow as any)?.__peJump?.(it.jump, it.addpath); };
  const todoCount = markers.filter((m) => !m.done).length;
  const left = () => Math.max(6, mkBox.left - 50); // 50px into the backdrop, left of the canvas
  // readiness panel: CONTAINED entirely in the left margin — right edge pinned a
  // GAP before the canvas, left edge a GUTTER from the screen. Width adapts to the
  // margin (clamped PANEL_MIN..PANEL_MAX); the left margin above guarantees room.
  const panelAvail = mkBox.left - GAP - GUTTER;
  const panelW = Math.round(Math.max(PANEL_MIN, Math.min(PANEL_MAX, panelAvail)));
  const panelLeft = Math.max(GUTTER, mkBox.left - GAP - panelW);

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
              <div className="pe-mk-panel" style={{ top: mkBox.top + m.top * scale, left: panelLeft, width: panelW }} onMouseDown={(e) => e.stopPropagation()}>
                <ReadinessPanel marker={m} onJump={jump} onClose={() => setOpenMk(null)} />
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
        {saved && <span className="pe-chip-status" title={cloud === 'off' ? 'Saved in this browser (no cloud keys configured)' : cloud === 'err' ? 'Saved in this browser; the cloud save failed — check the Supabase keys/project' : saveFate === 'published' ? 'Published — readers see this version' : saveFate === 'pending' ? 'Saved as a revision awaiting curator/admin review' : 'Saved'}><IcCheck />{cloud === 'saving' ? 'saving…' : cloud === 'err' ? 'saved (local only)' : saveFate === 'published' ? 'published' : saveFate === 'pending' ? 'saved — pending review' : 'saved'}</span>}
        {contentStore && wikiMeta && <button onClick={openHistory} title="Revision history — who changed what, diffs, publish/revert">History</button>}
        {canEdit && <button onClick={revert} title="Discard changes"><IcUndo />Revert</button>}
        <button onClick={onClose} title="Close (Esc)"><IcX />Close</button>
        {canEdit
          ? <button className="primary" onClick={save}><IcCheck />Save</button>
          : <span className="pe-chip-status" title="Sign in with a contributor account to edit">read only</span>}
      </div>
      {pickerAt != null && (
        <SectionPicker
          onClose={() => setPickerAt(null)}
          onPick={(type) => { (window as any).__peAction?.(`secAdd:${pickerAt}:${type}`); setPickerAt(null); }}
        />
      )}
      {histOpen && (
        <div className="pe-hist-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setHistOpen(false); }}>
          <div className="pe-hist" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pe-hist-head">
              <span className="pe-hist-title">History</span>
              <span className="pe-hist-sub">{oneLine(page.title || page.id)}</span>
              <button className="pe-hist-x" onClick={() => setHistOpen(false)}><IcX /></button>
            </div>
            <div className="pe-hist-body">
              {histBusy && !revs.length && <div className="pe-hist-empty">loading…</div>}
              {!histBusy && !revs.length && <div className="pe-hist-empty">No revisions yet — they appear from the first save after migration 0004.</div>}
              {revs.map((r) => (
                <div key={r.id} className={`pe-hist-rev st-${r.status} ${diffFor === r.id ? 'open' : ''}`}>
                  <button className="pe-hist-row" onClick={() => (diffFor === r.id ? setDiffFor(null) : showDiff(r))}>
                    <span className={`pe-hist-st st-${r.status}`}>{r.status}</span>
                    <span className="pe-hist-who">{r.author_email || 'system'}</span>
                    <span className="pe-hist-when">{new Date(r.created_at).toLocaleString()}</span>
                    {r.note && <span className="pe-hist-note" title={r.note}>{r.note}</span>}
                  </button>
                  {canApprove && (
                    <span className="pe-hist-acts">
                      {r.status === 'pending' && <button disabled={histBusy} onClick={() => reviewAct('publish', r)}>Publish</button>}
                      {r.status === 'pending' && <button disabled={histBusy} className="danger" onClick={() => reviewAct('reject', r)}>Reject</button>}
                      <button disabled={histBusy} onClick={() => reviewAct('revert', r)} title="Make this version current + published (as a new revision)">Revert to</button>
                    </span>
                  )}
                  {diffFor === r.id && (
                    <div className="pe-hist-diff">
                      {!diffRows.length && <div className="pe-hist-empty">no textual changes vs the previous revision</div>}
                      {diffRows.map((d, i) => (
                        <div key={i} className={`pe-diff-row ${d.kind}`}>
                          <span className="pe-diff-path">{d.path}</span>
                          {d.old != null && <span className="pe-diff-old">{d.old}</span>}
                          {d.new != null && <span className="pe-diff-new">{d.new}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const IcUndo = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>);
const IcX = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const IcCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
const IcTri = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
