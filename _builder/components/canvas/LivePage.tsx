'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Page, Wiki } from '../../lib/wiki';
import { loadPageDoc, type PageDoc } from '../../lib/store';
import { contentStore } from '../../content-store';
import { renderBody, SENT_PREFIX } from '../../lib/render';
import { stripSentinels } from '../../lib/reader-core.mjs';
import { buildReadOnlyCanvas } from '../../lib/canvas';

// The page lays out at the same logical desktop width as the editor canvas,
// then scales to the rail. One knob.
const LOGICAL_W = 1080;

/**
 * The right rail's LIVE PAGE — the owner's rule: the rail is "purely a live
 * page scroller showing the actual page you can scroll through". The page is
 * the REAL render: the stored doc through the repo's own Liquid includes
 * (renderBody — rule #5, one renderer everywhere), sentinels stripped exactly
 * like the reader, wrapped in the canonical CSS stack (buildReadOnlyCanvas).
 * No decorator, no editing chrome — read-only, scaled to the rail, and the
 * RAIL scrolls it (no nested scrollbar).
 */
export function LivePage({ page, wiki }: { page: Page; wiki: Wiki }) {
  const isHome = !!page.home;
  const [doc, setDoc] = useState<PageDoc>(() => loadPageDoc(page));
  // cloud hydrate — the stored doc (Supabase) wins over the local stand-in,
  // exactly like the editor's open-time hydrate
  useEffect(() => {
    setDoc(loadPageDoc(page));
    let live = true;
    if (contentStore) {
      contentStore.loadPage(wiki.id, page.id)
        .then((d) => { if (live && d) setDoc(d as PageDoc); })
        .catch(() => { /* local doc stands */ });
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, wiki.id]);

  const srcDoc = useMemo(
    () => buildReadOnlyCanvas(stripSentinels(renderBody(doc, isHome), SENT_PREFIX), wiki.skin, isHome),
    [doc, isHome, wiki.skin]);

  // scale-to-fit: the iframe lays out at LOGICAL_W and reports its content
  // height (postMessage from the shell); the sizer reserves the scaled footprint
  const hostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [w, setW] = useState(0);
  const [contentH, setContentH] = useState(900);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && e.data && typeof e.data.__cvtH === 'number') {
        setContentH(Math.max(240, e.data.__cvtH));
      }
    };
    window.addEventListener('message', onMsg);
    const ro = new ResizeObserver(() => { if (hostRef.current) setW(hostRef.current.clientWidth); });
    if (hostRef.current) { setW(hostRef.current.clientWidth); ro.observe(hostRef.current); }
    return () => { window.removeEventListener('message', onMsg); ro.disconnect(); };
  }, []);
  const scale = w > 0 ? w / LOGICAL_W : 0.35;

  return (
    <div className="cvt-live" ref={hostRef}>
      <div className="cvt-live-sizer" style={{ height: Math.ceil(contentH * scale) }}>
        <iframe
          ref={iframeRef}
          className="cvt-live-frame"
          title={`${page.title} — live preview`}
          srcDoc={srcDoc}
          scrolling="no"
          style={{ width: LOGICAL_W, height: contentH, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
