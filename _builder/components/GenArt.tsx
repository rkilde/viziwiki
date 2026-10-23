'use client';
import React, { useState } from 'react';
import { getAccessToken } from '../lib/auth';

// "✨ Generate" — the AI art row under an art-URL field (tile cover / wiki
// icon). Posts the wiki's IDENTITY (name, genre, tagline, blurb, category
// colors) + an optional designer hint to /api/generate; the route calls
// Claude server-side, sanitizes the SVG, and returns a data URI that drops
// straight into the existing `art` slot.
//
// WHO PAYS: admins run on the platform key (Vercel env). Everyone else
// CONNECTS THEIR OWN Anthropic API key (the 🔑 control) — it lives ONLY in
// their browser's localStorage, rides each request as a header, and is never
// stored server-side; their generations bill their own Anthropic account.

export type GenWiki = { name: string; genreLabel?: string | null; tagline?: string | null; blurb?: string | null; colors?: string[] };

const KEY_LS = 'viziwiki:anthropic-key';
const loadKey = () => { try { return localStorage.getItem(KEY_LS) || ''; } catch { return ''; } };
const saveKey = (k: string) => { try { k ? localStorage.setItem(KEY_LS, k) : localStorage.removeItem(KEY_LS); } catch { /* ignore */ } };

export function GenArtRow({ kind, wiki, onResult }: { kind: 'icon' | 'cover'; wiki: GenWiki; onResult: (dataUri: string) => void }) {
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [key, setKey] = useState(loadKey);

  const go = async () => {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const token = await getAccessToken();
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(key.trim() ? { 'x-anthropic-key': key.trim() } : {}),
        },
        body: JSON.stringify({ kind, wiki, hint: hint.trim() || undefined }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j?.needKey) setKeyOpen(true);
        throw new Error(j?.error || `generation failed (${r.status})`);
      }
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
      <button type="button" className={`vt-btn gen-key ${key ? 'on' : ''}`} onClick={() => setKeyOpen((o) => !o)}
        title={key ? 'Your own Anthropic API key is connected (stored only in this browser) — generations bill your account' : 'Connect your own Anthropic API key (billed to you; stays in this browser)'}>
        🔑{key ? ' ✓' : ''}
      </button>
      {keyOpen && (
        <div className="gen-key-box">
          <input className="acct-input" type="password" placeholder="your Anthropic API key (sk-ant-…)" value={key}
            onChange={(e) => setKey(e.target.value)} />
          <div className="gen-key-acts">
            <button type="button" className="acct-primary gen-btn" onClick={() => { saveKey(key.trim()); setKeyOpen(false); }}>Save</button>
            {key && <button type="button" className="acct-switch" onClick={() => { setKey(''); saveKey(''); }}>disconnect</button>}
            <button type="button" className="acct-switch" onClick={() => setKeyOpen(false)}>close</button>
          </div>
          <div className="acct-note">Get a key at console.anthropic.com (pay-per-use; a generation costs cents). It is stored ONLY in this browser and sent with your generations — never saved on the platform. Generations with your key bill your Anthropic account.</div>
        </div>
      )}
      {err && <div className="acct-msg gen-err">{err}</div>}
    </div>
  );
}
