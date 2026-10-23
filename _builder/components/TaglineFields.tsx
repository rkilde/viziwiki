'use client';
import React from 'react';

// The TAGLINE as three word-slots with the dots printed between them — the
// owner's spec: "have the dots there so you don't have to type it; it's like
// you have 3 fields to fill out." Stored as ONE string ("A · B · C", empty
// slots skipped) so nothing downstream changes.

export type TagParts = [string, string, string];

export function splitTagline(s: string | null | undefined): TagParts {
  const parts = String(s ?? '').split('·').map((p) => p.trim()).filter(Boolean);
  return [parts[0] ?? '', parts[1] ?? '', parts.slice(2).join(' · ')];
}

export function joinTagline(parts: TagParts): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(' · ');
}

const DEFAULT_PH: TagParts = ['Teams', 'Players', 'Seasons'];

export function TaglineFields({ parts, onChange, disabled = false, placeholders = DEFAULT_PH }: {
  parts: TagParts; onChange: (parts: TagParts) => void; disabled?: boolean; placeholders?: TagParts;
}) {
  const set = (i: number, v: string) => {
    const next = [...parts] as TagParts;
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="tagf">
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="tagf-dot">·</span>}
          <input className="acct-input" placeholder={placeholders[i]} value={parts[i]}
            onChange={(e) => set(i, e.target.value)} disabled={disabled} />
        </React.Fragment>
      ))}
    </div>
  );
}
