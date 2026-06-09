'use client';
import React, { useEffect, useRef } from 'react';
import type { Page } from '../../lib/wiki';

function HeroBlock({ page }: { page: Page }) {
  const h = page.hero;
  const hasHero = page.sections.some((s) => s.type === 'hero') && (h.title || h.eyebrow || h.desc);
  if (!hasHero) return null;
  return (
    <div className="pp-hero">
      {h.eyebrow && <div className="pp-eyebrow">{h.eyebrow}</div>}
      <div className="pp-title">
        <span dangerouslySetInnerHTML={{ __html: h.title || page.title }} />
        <span className="acc">.</span>
      </div>
      {h.subtitle && (
        <div
          className="pp-subtitle"
          dangerouslySetInnerHTML={{ __html: h.subtitle + (h.subtitle_meta ? ` <span class="meta">· ${h.subtitle_meta}</span>` : '') }}
        />
      )}
      {h.desc && <p className="pp-desc" dangerouslySetInnerHTML={{ __html: h.desc }} />}
      {h.stats.length > 0 && (
        <div className="pp-stats">
          {h.stats.map((s, i) => (
            <div key={i}>
              <div className="pp-stat-num">{s.num}</div>
              <div className="pp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A scaled white mini-page: the real hero (from front-matter) + a labelled band
 *  per remaining section. Full section rendering arrives with the page builder. */
export function PagePreview({ page }: { page: Page }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current, scale = scaleRef.current, sizer = sizerRef.current;
    if (!stage || !scale || !sizer) return;
    const fit = () => {
      const s = stage.clientWidth / 900;
      scale.style.transform = `scale(${s})`;
      sizer.style.height = scale.scrollHeight * s + 'px';
    };
    requestAnimationFrame(fit);
    const t = setTimeout(fit, 300); // re-fit after webfonts settle
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [page]);

  const others = page.sections.filter((s) => s.type !== 'hero');

  return (
    <div className="mil-preview-stage" ref={stageRef}>
      <div className="mil-preview-sizer" ref={sizerRef}>
        <div className="mil-preview-scale" ref={scaleRef}>
          <div className="pp">
            <HeroBlock page={page} />
            {others.map((s, i) => (
              <div className="pp-band" key={i}>
                <div className="pp-band-eyebrow">{s.label}</div>
                <div className="pp-band-note">{s.type} section — full render arrives with the page builder</div>
              </div>
            ))}
            {page.sections.length === 0 && (
              <div className="pp-band"><div className="pp-band-note">No sections yet.</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
