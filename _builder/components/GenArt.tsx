'use client';
import React, { useState } from 'react';
import { getAccessToken } from '../lib/auth';

// "✨ Generate" — the AI art row under an art-URL field (tile cover / wiki
// icon). Posts the wiki's IDENTITY (name, genre, tagline, blurb, category
// colors) + an optional designer hint to /api/generate; the route calls
// Claude server-side, sanitizes the SVG, and returns a data URI that drops
// straight into the existing `art` slot. Relatedness is automatic — the
// prompt is derived from identity; the hint is for taste.

export type GenWiki = { name: string; genreLabel?: string | null; tagline?: string | null; blurb?: string | null; colors?: string[] };

export function GenArtRow({ kind, wiki, onResult }: { kind: 'icon' | 'cover'; wiki: GenWiki; onResult: (dataUri: string) => void }) {
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const token = await getAccessToken();
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ kind, wiki, hint: hint.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `generation failed (${r.status})`);
      onResult(j.dataUri);
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  return (
    <div className="gen-row">
      <input className="acct-input gen-hint" placeholder={`optional art direction — e.g. "${kind === 'icon' ? 'minimal line-art bell' : 'night skyline, neon rain'}"`}
        value={hint} onChange={(e) => setHint(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } }} />
      <button type="button" className="acct-primary gen-btn" onClick={go} disabled={busy}>
        {busy ? 'drawing…' : '✨ Generate'}
      </button>
      {err && <div className="acct-msg gen-err">{err}</div>}
    </div>
  );
}
