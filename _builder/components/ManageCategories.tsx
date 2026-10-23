'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow } from '../content-store';
import { ICON_SPRITE } from '../lib/render';
import taxonomyCanon from '../data/wiki-categories.json';
import { resolveColor, slugifyId, spriteIconNames, validateCategory } from '../lib/taxonomy.mjs';
import { LucidePicker, LucideGlyph, loadLucide, type LucideLib } from './LucidePicker';

// ADMIN-ONLY: the category (tag) manager for the main wiki categorization.
// The canon 12 live in the repo (_data/wiki_categories.yml) and show here as
// LOCKED rows — editing those is a canon change, never a UI action. Rows the
// admin ORIGINATED (wiki_categories table) are fully managed here: create,
// relabel, re-icon, regrade, delete. Every surface (browse chips + tiles,
// /read covers, the origination picker) renders the merged set, so a change
// here propagates everywhere wikis surface.

type Draft = { key: string | null; label: string; icon: string | null; from: string | null; to: string | null };
const PAL = Object.entries((taxonomyCanon as any).palette as Record<string, string>);

export function ManageCategories({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  // which WIKIS wear each tag (names) — deletes are BLOCKED while a tag is
  // worn: the owner re-assigns those wikis' tags first (identity editor)
  const [usage, setUsage] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Draft | null>(null);   // key=null → creating
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // the FULL Lucide library (searchable picker + inline row glyphs); the
  // valid-icon set = canon sprite ∪ the library
  const [lib, setLib] = useState<LucideLib | null>(null);
  useEffect(() => { loadLucide().then(setLib); }, []);
  const icons = useMemo(
    () => Array.from(new Set([...spriteIconNames(ICON_SPRITE), ...(lib?.icons.map((i) => i.n) ?? [])])),
    [lib]);
  const canon = (taxonomyCanon as any).categories as Array<{ key: string; label: string; icon: string; grad: { from: string; to: string } }>;

  const load = () => {
    contentStore?.listCategories().then(setRows).catch(() => {});
    contentStore?.listWikis().then((ws) => {
      const u: Record<string, string[]> = {};
      for (const w of ws) for (const k of w.categories ?? []) (u[k] = u[k] || []).push(w.name);
      setUsage(u);
    }).catch(() => {});
  };
  useEffect(load, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ping = () => fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});

  const commit = async () => {
    if (!draft || !contentStore) return;
    const row: CategoryRow = {
      key: draft.key ?? slugifyId(draft.label), label: draft.label.trim(), icon: draft.icon || '',
      grad_from: resolveColor((taxonomyCanon as any).palette, draft.from, ''),
      grad_to: resolveColor((taxonomyCanon as any).palette, draft.to, ''),
    };
    const taken = [...canon.map((c) => c.key), ...rows.map((r) => r.key)].filter((k) => k !== draft.key);
    const errs = validateCategory(row, taken, icons);
    if (errs.length) { setErr(errs.join(' · ')); return; }
    setBusy(true); setErr(null);
    try {
      if (draft.key) await contentStore.updateCategory(row); else await contentStore.createCategory(row);
      setDraft(null); load(); ping();
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const remove = async (r: CategoryRow) => {
    if (!contentStore) return;
    const wearers = usage[r.key] || [];
    if (wearers.length) {
      // the owner's rule: a worn tag can't be deleted — re-assign first
      const shown = wearers.slice(0, 8).join(', ') + (wearers.length > 8 ? ` + ${wearers.length - 8} more` : '');
      setErr(`"${r.label}" is worn by ${wearers.length} wiki${wearers.length !== 1 ? 's' : ''} (${shown}). Re-assign their tags first — open each wiki's identity editor — then delete.`);
      return;
    }
    if (!window.confirm(`Delete "${r.label}"? No wiki carries this tag.`)) return;
    setBusy(true); setErr(null);
    try { await contentStore.deleteCategory(r.key); load(); ping(); }
    catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const edit = (r: CategoryRow) => setDraft({ key: r.key, label: r.label, icon: r.icon, from: r.grad_from, to: r.grad_to });

  const swatchRow = (which: 'from' | 'to') => (
    <div className="ow-swatches">
      <span className="ow-swatch-label">{which}</span>
      {PAL.map(([pname, val]) => (
        <button key={pname} type="button" title={pname}
          className={`ow-swatch ${draft && (draft[which] === pname || draft[which] === val) ? 'on' : ''}`}
          style={{ background: val }} onClick={() => setDraft((d) => d && { ...d, [which]: pname })} />
      ))}
    </div>
  );

  const gradChip = (from: string, to: string) => (
    <span className="mc-grad" style={{ background: `linear-gradient(to bottom right, ${from}, ${to})` }} />
  );

  return (
    <div className="acct-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="acct-modal mc-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
        <div className="acct-title">Wiki categories</div>
        <div className="acct-note">The tags wikis are categorized by — they drive the browse filter chips and every themed tile cover. Canon tags live in the repo and are locked here; tags you originate are fully editable.</div>

        <div className="mc-list">
          {canon.map((c) => (
            <div key={c.key} className="mc-row canon">
              {gradChip(resolveColor((taxonomyCanon as any).palette, c.grad.from, '#333'), resolveColor((taxonomyCanon as any).palette, c.grad.to, '#555'))}
              <LucideGlyph name={c.icon} lib={lib} className="mc-ic" />
              <span className="mc-label">{c.label}</span>
              <span className="mc-key">{c.key}</span>
              {usage[c.key]?.length ? <span className="mc-usage" title={usage[c.key].join(', ')}>{usage[c.key].length} wiki{usage[c.key].length !== 1 ? 's' : ''}</span> : null}
              <span className="mc-lock" title="Canon — defined in the repo (_data/wiki_categories.yml)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> canon
              </span>
            </div>
          ))}
          {rows.map((r) => (
            <div key={r.key} className="mc-row">
              {gradChip(r.grad_from, r.grad_to)}
              <LucideGlyph name={r.icon} lib={lib} className="mc-ic" />
              <span className="mc-label">{r.label}</span>
              <span className="mc-key">{r.key}</span>
              {usage[r.key]?.length ? <span className="mc-usage" title={usage[r.key].join(', ')}>{usage[r.key].length} wiki{usage[r.key].length !== 1 ? 's' : ''}</span> : null}
              <span className="mc-acts">
                <button className="vt-btn" disabled={busy} onClick={() => edit(r)}>Edit</button>
                <button className="vt-btn mc-del" disabled={busy} onClick={() => remove(r)}>Delete</button>
              </span>
            </div>
          ))}
          {!rows.length && <div className="mc-empty">No originated tags yet — everything above is canon.</div>}
        </div>

        {draft ? (
          <div className="ow-newcat">
            <input className="acct-input" autoFocus placeholder="category label — e.g. Tabletop Games" value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            {draft.key && <div className="ow-label">key: {draft.key} (fixed — wikis reference it)</div>}
            <LucidePicker value={draft.icon} onPick={(n) => setDraft({ ...draft, icon: n })} />
            {swatchRow('from')}
            {swatchRow('to')}
            <div className="ow-newcat-actions">
              <button type="button" className="acct-primary" onClick={commit} disabled={busy}>{draft.key ? 'Save changes' : 'Add category'}</button>
              <button type="button" className="acct-switch" onClick={() => { setDraft(null); setErr(null); }}>cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" className="ow-cat ow-cat-new" style={{ alignSelf: 'flex-start' }}
            onClick={() => setDraft({ key: null, label: '', icon: null, from: null, to: null })}>+ new category</button>
        )}
        {err && <div className="acct-msg">{err}</div>}
        <div className="ow-actions"><button className="acct-switch" type="button" onClick={onClose}>close</button></div>
      </div>
    </div>
  );
}
