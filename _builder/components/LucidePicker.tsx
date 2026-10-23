'use client';
import React, { useEffect, useMemo, useState } from 'react';

// The FULL Lucide icon picker — every icon in the pinned library
// (data/lucide-library.json, ~2,200), searchable by NAME and by the
// package's official TAGS ("history" finds landmark, hourglass, scroll…).
// Loaded lazily (its own chunk) so the main bundle stays lean. Used
// wherever a category tag's icon is chosen; the resolution pipe
// (attachIconBodies) makes any pick render on every surface.

export type LucideLib = { version: string; icons: Array<{ n: string; t: string[]; b: string }> };
let LIB: LucideLib | null = null;
export async function loadLucide(): Promise<LucideLib> {
  if (!LIB) LIB = (await import('../data/lucide-library.json')).default as unknown as LucideLib;
  return LIB;
}

const CAP = 168;   // icons shown at once — refine the search past this

export function LucidePicker({ value, onPick }: { value: string | null; onPick: (name: string) => void }) {
  const [lib, setLib] = useState<LucideLib | null>(LIB);
  const [q, setQ] = useState('');
  useEffect(() => { loadLucide().then(setLib); }, []);
  const shown = useMemo(() => {
    if (!lib) return [];
    const s = q.trim().toLowerCase();
    if (!s) return lib.icons;
    // name hits first, then tag hits
    const byName: typeof lib.icons = [], byTag: typeof lib.icons = [];
    for (const i of lib.icons) {
      if (i.n.includes(s)) byName.push(i);
      else if (i.t.some((t) => t.includes(s))) byTag.push(i);
    }
    return [...byName, ...byTag];
  }, [lib, q]);
  return (
    <div className="lp">
      <input className="acct-input" placeholder={lib ? `search ${lib.icons.length} icons — name or tag, e.g. "history", "food", "music"` : 'loading the icon library…'}
        value={q} onChange={(e) => setQ(e.target.value)} />
      {lib && (
        <>
          <div className="ow-icons lp-grid">
            {shown.slice(0, CAP).map((i) => (
              <button key={i.n} type="button" className={`ow-icon ${value === i.n ? 'on' : ''}`}
                title={i.n + (i.t.length ? ' — ' + i.t.slice(0, 6).join(', ') : '')}
                onClick={() => onPick(i.n)}>
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: i.b }} />
              </button>
            ))}
          </div>
          {shown.length > CAP && <div className="lp-note">{shown.length - CAP} more match — refine the search</div>}
          {!shown.length && <div className="lp-note">nothing matches “{q}”</div>}
        </>
      )}
    </div>
  );
}

/** One library icon rendered inline (rows, previews). */
export function LucideGlyph({ name, lib, className }: { name: string; lib: LucideLib | null; className?: string }) {
  const body = lib?.icons.find((i) => i.n === name)?.b;
  if (!body) return <svg className={className}><use href={`#ic-${name}`} /></svg>;   // sprite fallback
  return <svg className={className} viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: body }} />;
}
