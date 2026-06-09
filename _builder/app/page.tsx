'use client';
import { useEffect, useState } from 'react';
import { Spec, SpecData } from '../components/Spec';

// The grammar-`seed` for spec (what a fresh insert starts as), fleshed out a bit
// so the slice looks real. Later this comes from grammar.yml via the "+" slot.
const SEED: SpecData = {
  heading: 'The complete sheet.',
  device: 'iPod touch (7th generation) · A2178',
  tone: 'special',
  cards: [
    { title: 'Display', rows: [
      { key: 'Size', value: '4-inch Retina' },
      { key: 'Resolution', value: '1136×640 · 326 ppi' },
    ] },
    { title: 'Chip', rows: [
      { key: 'SoC', value: 'Apple A10 Fusion' },
      { key: 'RAM', value: '2 GB LPDDR4' },
    ] },
    { title: 'Storage', rows: [
      { key: 'Tiers', value: '32 · 128 · 256 GB' },
    ] },
  ],
};

// Stand-in for ContentStore: localStorage now, Supabase later (same idea —
// save persists, reload restores). The builder code won't change when we swap it.
const KEY = 'viziwiki:spec-slice';

export default function Page() {
  const [spec, setSpec] = useState<SpecData>(SEED);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setSpec(JSON.parse(s));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  function save() {
    localStorage.setItem(KEY, JSON.stringify(spec));
    setSavedAt(new Date().toLocaleTimeString());
  }
  function reset() {
    localStorage.removeItem(KEY);
    setSpec(SEED);
    setSavedAt(null);
  }

  if (!loaded) return null; // avoid hydration flash before localStorage read

  return (
    <>
      <div className="builder-bar">
        <h1>ViziWiki Builder</h1>
        <span className="tag">Phase 1 · spec slice</span>
        <span className="spacer" />
        {savedAt && <span className="tag">saved {savedAt}</span>}
        <button onClick={reset}>Reset</button>
        <button onClick={save}>Save</button>
      </div>
      <div className="canvas">
        <div className="section-host">
          <Spec data={spec} onChange={setSpec} />
        </div>
      </div>
    </>
  );
}
