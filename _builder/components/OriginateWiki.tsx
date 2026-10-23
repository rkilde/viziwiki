'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow, type WikiMeta } from '../content-store';
import { ICON_SPRITE } from '../lib/render';
import taxonomyCanon from '../data/wiki-categories.json';
import { mergeTaxonomy, resolveColor, slugifyId, spriteIconNames, validateCategory, validateNewWiki } from '../lib/taxonomy.mjs';
import { COVER_CSS, wikiCoverTile } from '../lib/reader-core.mjs';
import { GenArtRow } from './GenArt';
import { LucidePicker, loadLucide, type LucideLib } from './LucidePicker';
import { TaglineFields, joinTagline, type TagParts } from './TaglineFields';

// The admin "New wiki" flow — ORIGINATION (the origination arc, iteration 2).
// Identity in, wiki out: name → id, categories from the MERGED taxonomy (the
// canon 12 + admin-originated ones, with "+ new category" right here), blurb,
// tagline, status, and the tile cover — themed by default (derived from the
// first category), or per-wiki ART (an image URL today, a Supabase Storage
// upload later — the master media pattern). Granting a wiki master is
// OPTIONAL: originate and work on it yourself, grant any time later.
// The live preview is the READER'S OWN renderer + CSS (wikiCoverTile +
// COVER_CSS) — never a restated copy.

type NewCat = { label: string; icon: string | null; from: string | null; to: string | null };

export function OriginateWiki({ existingIds, onClose, onCreated, genAsUser = false }: {
  existingIds: string[];
  onClose: () => void;
  onCreated: (meta: WikiMeta) => void;
  /** admin "view as" preview: AI generation bills like a contributor's */
  genAsUser?: boolean;
}) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [cats, setCats] = useState<string[]>([]);          // selection order = primary first
  const [blurb, setBlurb] = useState('');
  const [tagParts, setTagParts] = useState<TagParts>(['', '', '']);
  const tagline = joinTagline(tagParts);
  const [status, setStatus] = useState<'live' | 'coming_soon'>('live');
  const [artUrl, setArtUrl] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [dbCats, setDbCats] = useState<CategoryRow[]>([]);
  const [newCat, setNewCat] = useState<NewCat | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);  // wiki created; grant still open

  useEffect(() => { contentStore?.listCategories().then(setDbCats).catch(() => {}); }, []);

  const tax = useMemo(() => mergeTaxonomy(taxonomyCanon as any, dbCats), [dbCats]);
  // valid icons for a new category = canon sprite ∪ the full Lucide library
  // (loaded when the new-category form opens)
  const [lib, setLib] = useState<LucideLib | null>(null);
  useEffect(() => { if (newCat) loadLucide().then(setLib); }, [newCat]);
  const icons = useMemo(
    () => Array.from(new Set([...spriteIconNames(ICON_SPRITE), ...(lib?.icons.map((i) => i.n) ?? [])])),
    [lib]);
  const palette = Object.entries((taxonomyCanon as any).palette as Record<string, string>);
  const wikiId = idTouched ? id : slugifyId(name);

  const meta: WikiMeta = useMemo(() => ({
    id: wikiId, slug: wikiId, name: name.trim(), skin: 'wiki-page wiki-base',
    categories: cats, blurb: blurb.trim() || null, tagline: tagline.trim() || null,
    status, tile_cover: artUrl.trim() ? { kind: 'art', src: artUrl.trim() } : { kind: 'themed' },
  }), [wikiId, name, cats, blurb, tagline, status, artUrl]);

  // the live preview IS the reader's tile (same renderer, same CSS)
  const previewHtml = useMemo(
    () => `<div class="rd-covers" style="grid-template-columns:1fr">${wikiCoverTile(meta, tax)}</div>`,
    [meta, tax]);

  const toggleCat = (k: string) =>
    setCats((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const addCategory = async () => {
    if (!newCat || !contentStore) return;
    const row: CategoryRow = {
      key: slugifyId(newCat.label), label: newCat.label.trim(), icon: newCat.icon || '',
      grad_from: resolveColor((taxonomyCanon as any).palette, newCat.from, ''),
      grad_to: resolveColor((taxonomyCanon as any).palette, newCat.to, ''),
    };
    const errs = validateCategory(row, tax.categories.map((c: any) => c.key), icons);
    if (errs.length) { setErr(errs.join(' · ')); return; }
    setBusy(true); setErr(null);
    try {
      await contentStore.createCategory(row);
      setDbCats((prev) => [...prev, row]);
      setCats((prev) => [...prev, row.key]);
      setNewCat(null);
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const create = async () => {
    if (!contentStore) { setErr('Cloud not configured'); return; }
    setBusy(true); setErr(null);
    try {
      if (!createdId) {
        const errs = validateNewWiki(meta, existingIds, tax.categories.map((c: any) => c.key));
        if (errs.length) { setErr(errs.join(' · ')); setBusy(false); return; }
        await contentStore.createWiki(meta);
        setCreatedId(meta.id);
        // the new tile shows up on /read AND the live browse page's directory
        // feed in seconds, not at the next ISR tick
        fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});
      }
      if (grantEmail.trim()) await contentStore.grantWikiMaster(grantEmail, meta.id);
      onCreated(meta);
    } catch (e: any) {
      setErr((createdId ? 'Wiki created — the grant failed: ' : '') + (e?.message || String(e)));
    }
    setBusy(false);
  };

  const swatchRow = (which: 'from' | 'to') => (
    <div className="ow-swatches">
      <span className="ow-swatch-label">{which}</span>
      {palette.map(([pname, val]) => (
        <button key={pname} type="button" title={pname}
          className={`ow-swatch ${newCat?.[which] === pname ? 'on' : ''}`}
          style={{ background: val }} onClick={() => setNewCat((c) => c && { ...c, [which]: pname })} />
      ))}
    </div>
  );

  return (
    <div className="acct-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="acct-modal ow-modal" onMouseDown={(e) => e.stopPropagation()}>
        {/* the canon sprite, once — the icon picker and the cover preview reference it */}
        <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
        <div className="acct-title">Originate a wiki</div>
        <div className="ow-cols">
          <div className="ow-form">
            <input className="acct-input" placeholder="name — e.g. Dune" autoFocus value={name}
              onChange={(e) => setName(e.target.value)} disabled={!!createdId} />
            <input className="acct-input ow-id" placeholder="id (auto)" value={wikiId}
              onChange={(e) => { setIdTouched(true); setId(slugifyId(e.target.value)); }} disabled={!!createdId} />
            <div className="ow-label">categories — first pick drives the cover</div>
            <div className="ow-cats">
              {tax.categories.map((c: any) => (
                <button key={c.key} type="button" disabled={!!createdId}
                  className={`ow-cat ${cats.includes(c.key) ? 'on' : ''}`}
                  onClick={() => toggleCat(c.key)}>
                  {c.label}{cats[0] === c.key ? ' ★' : ''}
                </button>
              ))}
              {!newCat && <button type="button" className="ow-cat ow-cat-new" disabled={!!createdId}
                onClick={() => setNewCat({ label: '', icon: null, from: null, to: null })}>+ new category</button>}
            </div>
            {newCat && (
              <div className="ow-newcat">
                <input className="acct-input" placeholder="category label — e.g. Tabletop Games" value={newCat.label}
                  onChange={(e) => setNewCat({ ...newCat, label: e.target.value })} />
                <LucidePicker value={newCat.icon} onPick={(n) => setNewCat({ ...newCat, icon: n })} />
                {swatchRow('from')}
                {swatchRow('to')}
                <div className="ow-newcat-actions">
                  <button type="button" className="acct-primary" onClick={addCategory} disabled={busy}>Add category</button>
                  <button type="button" className="acct-switch" onClick={() => setNewCat(null)}>cancel</button>
                </div>
              </div>
            )}
            <div className="ow-label">tagline — the dotted line under the title on the tile</div>
            <TaglineFields parts={tagParts} onChange={setTagParts} disabled={!!createdId} />
            <div className="ow-label">blurb — not shown on the tile: it powers browse search and the tile's hover tooltip</div>
            <textarea className="acct-input ow-blurb" placeholder="one sentence describing the wiki" value={blurb}
              onChange={(e) => setBlurb(e.target.value)} disabled={!!createdId} />
            <div className="ow-row">
              <select className="acct-input" value={status} onChange={(e) => setStatus(e.target.value as any)} disabled={!!createdId}>
                <option value="live">live</option>
                <option value="coming_soon">coming soon</option>
              </select>
              <input className="acct-input" placeholder="tile art URL (optional — themed cover if blank)" value={artUrl}
                onChange={(e) => setArtUrl(e.target.value)} disabled={!!createdId} />
            </div>
            {!createdId && (() => {
              const pc = tax.categories.find((c: any) => c.key === cats[0]) || null;
              return <GenArtRow kind="cover" wiki={{
                name: name.trim() || 'a new wiki', genreLabel: pc?.label ?? null,
                tagline: tagline.trim() || null, blurb: blurb.trim() || null,
                colors: pc ? [resolveColor((taxonomyCanon as any).palette, pc.grad.from, ''), resolveColor((taxonomyCanon as any).palette, pc.grad.to, '')].filter(Boolean) : [],
              }} onResult={setArtUrl} asUser={genAsUser} />;
            })()}
            <input className="acct-input" placeholder="grant wiki master — email (optional)" value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)} />
            {err && <div className="acct-msg">{err}</div>}
            <div className="ow-actions">
              <button className="acct-primary" onClick={create} disabled={busy || (!createdId && !name.trim())}>
                {busy ? '…' : createdId ? (grantEmail.trim() ? 'Grant & finish' : 'Finish') : 'Originate'}
              </button>
              <button className="acct-switch" type="button" onClick={() => (createdId ? onCreated(meta) : onClose())}>
                {createdId ? 'finish without grant' : 'cancel'}
              </button>
            </div>
            <div className="acct-note">The cover art is per-wiki content — an image URL now, a Storage upload at public launch. The grant is optional; you can work the wiki yourself and grant later.</div>
          </div>
          <div className="ow-preview">
            <div className="ow-label">tile cover — live</div>
            <style>{COVER_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} onClick={(e) => e.preventDefault()} />
          </div>
        </div>
      </div>
    </div>
  );
}
