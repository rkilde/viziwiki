'use client';
import React, { useEffect, useState } from 'react';
import type { Page } from '../../lib/wiki';
import { loadPageDoc, savePageDoc, resetPageDoc, seedDoc, type PageDoc, type HeroDoc, type OverviewDoc } from '../../lib/store';
import { RichEditable } from './RichEditable';

const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');

export function PageEditor({ page, onClose }: { page: Page; onClose: () => void }) {
  const [doc, setDoc] = useState<PageDoc>(() => loadPageDoc(page));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const update = (mut: (d: PageDoc) => void) => { const next = structuredClone(doc); mut(next); setDoc(next); setSaved(false); };
  const setHero = (mut: (h: HeroDoc) => void) => update((d) => mut(d.hero));
  const setOv = (mut: (o: OverviewDoc) => void) => update((d) => mut(d.overview));

  const save = () => { savePageDoc(page.id, doc); setSaved(true); };
  const revert = () => { resetPageDoc(page.id); setDoc(seedDoc(page)); setSaved(false); };

  const h = doc.hero, ov = doc.overview;

  return (
    <div id="pe-overlay">
      <div className="pe-bar">
        <span className="pe-ttl">{oneLine(page.title)}</span>
        <span className="sp" />
        {saved && <span className="saved">saved ✓</span>}
        <button onClick={revert}>Revert</button>
        <button onClick={onClose}>Close</button>
        <button className="primary" onClick={save}>Save</button>
      </div>

      <div className="pe-scroll">
        <div className="pe-sheet">

          {/* ── HERO — locked, on every page ── */}
          <div className="pe-sec-head"><span className="pe-sec-tag">Hero</span><span className="pe-sec-lock">· locked · every page</span></div>
          <div className="pp-hero">
            {h.eyebrow != null ? (
              <div className="pp-eyebrow pe-row">
                <RichEditable html={h.eyebrow} placeholder="Eyebrow" onCommit={(v) => setHero((x) => { x.eyebrow = v; })} />
                <button className="pe-rm" onClick={() => setHero((x) => { x.eyebrow = null; })}>×</button>
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}><button className="pe-add" onClick={() => setHero((x) => { x.eyebrow = 'Category'; })}>+ eyebrow</button></div>
            )}

            <div className="pp-title">
              <RichEditable html={h.title} placeholder="Page title" onCommit={(v) => setHero((x) => { x.title = v; })} />
              <span className="acc">.</span>
            </div>

            {h.subtitle != null ? (
              <div className="pp-subtitle pe-row">
                <RichEditable html={h.subtitle} placeholder="Subtitle" onCommit={(v) => setHero((x) => { x.subtitle = v; })} />
                {h.subtitle_meta != null ? (
                  <>
                    <span className="meta"> ·&nbsp;<RichEditable html={h.subtitle_meta} placeholder="meta" onCommit={(v) => setHero((x) => { x.subtitle_meta = v; })} /></span>
                    <button className="pe-rm" onClick={() => setHero((x) => { x.subtitle_meta = null; })}>× meta</button>
                  </>
                ) : (
                  <button className="pe-add" onClick={() => setHero((x) => { x.subtitle_meta = 'Model'; })}>+ meta</button>
                )}
                <button className="pe-rm" onClick={() => setHero((x) => { x.subtitle = null; x.subtitle_meta = null; })}>×</button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}><button className="pe-add" onClick={() => setHero((x) => { x.subtitle = 'Subtitle'; })}>+ subtitle</button></div>
            )}

            {h.desc != null ? (
              <div className="pe-row" style={{ marginTop: 20 }}>
                <RichEditable as="p" className="pp-desc" html={h.desc} placeholder="One-paragraph lead" onCommit={(v) => setHero((x) => { x.desc = v; })} />
                <button className="pe-rm" onClick={() => setHero((x) => { x.desc = null; })}>×</button>
              </div>
            ) : (
              <div style={{ marginTop: 20 }}><button className="pe-add" onClick={() => setHero((x) => { x.desc = 'Write a short lead sentence.'; })}>+ description</button></div>
            )}

            {h.stats ? (
              <div className="pe-row" style={{ marginTop: 36, alignItems: 'flex-start' }}>
                <div className="pp-stats">
                  {h.stats.map((s, i) => (
                    <div key={i}>
                      <div className="pp-stat-num"><RichEditable html={s.num} placeholder="0" onCommit={(v) => setHero((x) => { x.stats![i].num = v; })} /></div>
                      <div className="pp-stat-label"><RichEditable html={s.label} placeholder="Label" onCommit={(v) => setHero((x) => { x.stats![i].label = v; })} /></div>
                    </div>
                  ))}
                </div>
                <button className="pe-rm" onClick={() => setHero((x) => { x.stats = null; })}>×</button>
              </div>
            ) : (
              <div style={{ marginTop: 36 }}><button className="pe-add" onClick={() => setHero((x) => { x.stats = [{ num: '1', label: 'Stat' }, { num: '2', label: 'Stat' }, { num: '3', label: 'Stat' }, { num: '4', label: 'Stat' }]; })}>+ stats (1×4)</button></div>
            )}
          </div>

          {/* ── OVERVIEW — locked, on every page ── */}
          <div className="pe-sec-head"><span className="pe-sec-tag">Overview</span><span className="pe-sec-lock">· locked · every page</span></div>
          <div className={`pp-ov ${ov.infobox ? 'has-ib' : ''}`}>
            <div className="pp-ov-prose">
              <RichEditable as="div" className="pp-ov-heading" html={ov.heading} placeholder="Overview heading" onCommit={(v) => setOv((o) => { o.heading = v; })} />
              {ov.paragraphs.map((p, i) => (
                <div className="pe-row" key={i}>
                  <RichEditable as="p" html={p} placeholder="Paragraph" onCommit={(v) => setOv((o) => { o.paragraphs[i] = v; })} />
                  <button className="pe-rm" onClick={() => setOv((o) => { o.paragraphs.splice(i, 1); })}>×</button>
                </div>
              ))}
              <button className="pe-add" onClick={() => setOv((o) => { o.paragraphs.push('New paragraph.'); })}>+ paragraph</button>
            </div>

            {ov.infobox && (
              <aside className="pp-infobox">
                <div className="pp-ib-header">
                  <div className="pp-ib-label"><RichEditable html={ov.infobox.label || 'Infobox'} onCommit={(v) => setOv((o) => { o.infobox!.label = v; })} /></div>
                  <div className="pp-ib-title"><RichEditable html={ov.infobox.title} placeholder="Panel title" onCommit={(v) => setOv((o) => { o.infobox!.title = v; })} /></div>
                </div>
                <div className="pp-ib-rows">
                  {ov.infobox.rows.map((r, i) => (
                    <div className="pp-ib-row" key={i}>
                      <div className="pp-ib-k"><RichEditable html={r[0]} placeholder="Key" onCommit={(v) => setOv((o) => { o.infobox!.rows[i][0] = v; })} /></div>
                      <div className="pp-ib-v pe-row">
                        <RichEditable html={r[1]} placeholder="Value" onCommit={(v) => setOv((o) => { o.infobox!.rows[i][1] = v; })} />
                        <button className="pe-rm" onClick={() => setOv((o) => { o.infobox!.rows.splice(i, 1); })}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '12px 0', display: 'flex', gap: 8 }}>
                    <button className="pe-add" onClick={() => setOv((o) => { o.infobox!.rows.push(['Key', 'Value']); })}>+ row</button>
                    <button className="pe-rm" onClick={() => setOv((o) => { o.infobox = null; })}>remove infobox</button>
                  </div>
                </div>
              </aside>
            )}
          </div>

          {!ov.infobox && (
            <div className="pe-controls">
              <button className="pe-add" onClick={() => setOv((o) => { o.infobox = { label: 'Infobox', title: 'Panel Title', sublabel: null, rows: [['Key', 'Value'], ['Key', 'Value']], badge: null }; })}>+ infobox</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
