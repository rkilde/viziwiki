'use client';
import React, { useState } from 'react';
import { authAvailable, signIn, signOut, signUp, type Profile } from '../lib/auth';

// The topbar account control (phase-2 roles): signed out → "Sign in" + a
// minimal email/password modal (sign in ⇄ create account); signed in → the
// email + the account's class badge + sign out. Email+password only for now —
// OAuth providers arrive at public launch (dashboard toggles, no code).
export function AccountChip({ email, profile }: { email: string | null; profile: Profile | null }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!authAvailable) return <span className="acct-badge" title="Cloud keys not configured">offline</span>;

  if (email) {
    const badge = profile?.role === 'admin' ? 'admin' : profile?.role === 'contributor' ? (profile.class || 'contributor') : 'viewer';
    return (
      <span className="acct">
        <span className="acct-email" title={email}>{email}</span>
        <span className={`acct-badge acct-${badge}`}>{badge.replace("_", " ")}{profile?.class === 'wiki_master' && profile.wiki_id ? ` · ${profile.wiki_id}` : ''}</span>
        <button className="vt-btn" onClick={() => signOut()}>Sign out</button>
      </span>
    );
  }

  const submit = async () => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = mode === 'in' ? await signIn(em.trim(), pw) : await signUp(em.trim(), pw);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    if ((r as any).needsConfirm) { setMsg('Check your email to confirm the account, then sign in.'); setMode('in'); return; }
    setOpen(false); setEm(''); setPw('');
  };

  return (
    <>
      <button className="vt-btn active" onClick={() => { setOpen(true); setMsg(null); }}>Sign in</button>
      {open && (
        <div className="acct-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          {/* a REAL <form> with autocomplete hints — this is what lets Chrome
              (and every password manager) recognize the login, offer saved
              credentials, and prompt to save new ones */}
          <form className="acct-modal" method="post" onMouseDown={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="acct-title">{mode === 'in' ? 'Sign in' : 'Create account'}</div>
            <input className="acct-input" type="email" name="email" autoComplete="username"
              placeholder="email" autoFocus value={em} onChange={(e) => setEm(e.target.value)} />
            <input className="acct-input" type="password" name="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              placeholder="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            {msg && <div className="acct-msg">{msg}</div>}
            <button className="acct-primary" type="submit" disabled={busy || !em.trim() || pw.length < 6}>
              {busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}
            </button>
            <button className="acct-switch" type="button" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }}>
              {mode === 'in' ? 'No account? Create one' : 'Have an account? Sign in'}
            </button>
            <div className="acct-note">New accounts start as read-only viewers; an admin grants contributor classes.</div>
          </form>
        </div>
      )}
    </>
  );
}
