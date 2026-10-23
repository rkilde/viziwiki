'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow, type TileCover, type WikiIcon, type WikiMeta } from '../content-store';
import { ICON_SPRITE } from '../lib/render';
import taxonomyCanon from '../data/wiki-categories.json';
import { mergeTaxonomy, resolveColor, spriteIconNames } from '../lib/taxonomy.mjs';
import { COVER_CSS, wikiCoverTile } from '../lib/reader-core.mjs';
import { GenArtRow, type GenWiki } from './GenArt';
import { TaglineFields, joinTagline, splitTagline, type TagParts } from './TaglineFields';

// The WIKI IDENTITY editor — alter the current wiki's tile cover art, tags,
// tagline, blurb and status AFTER origination (admin, or the wiki's master).
// Same form language and the same LIVE preview as the origination modal: the
// preview IS the reader's tile renderer + stylesheet, never a restatement.
// Cover kinds: themed (derived from the first tag) · art (the wiki's own
// image — a URL today, a Storage upload at public launch) · bespoke (the five
// hand-built flagship covers; kept unless deliberately switched away).

export function WikiIdentity({ wikiId, wikiName, onClose, onSaved, genAsUser = false }: {
  wikiId: string; wikiName: string; onClose: () => void; onSaved: () => void;
  /** admin "view as" preview: AI generation bills like a contributor's */
  genAsUser?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [blurb, setBlurb] = useState('');
  const [tagParts, setTagParts] = useState<TagParts>(['', '', '']);
  const tagline = joinTagline(tagParts);
  const [status, setStatus] = useState<'live' | 'coming_soon'>('live');
  const [kind, setKind] = useState<'themed' | 'art' | 'bespoke'>('themed');
  const [artUrl, setArtUrl] = useState('');
  const [bespokeCls, setBespokeCls] = useState<string | null>(null);
  // the wiki MARK (migration 0009): auto letter · sprite glyph · art image
  const [icKind, setIcKind] = useState<'auto' | 'glyph' | 'art'>('auto');
  const [icGlyph, setIcGlyph] = useState<string | null>(null);
  const [icSrc, setIcSrc] = useState('');
  const [dbCats, setDbCats] = useState<CategoryRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    contentStore?.listCategories().then(setDbCats).catch(() => {});
    contentStore?.listWikis().then((ws) => {
      const w = ws.find((x) => x.id === wikiId);
      if (w) {
        setCats(w.categories ?? []);
        setBlurb(w.blurb ?? ''); setTagParts(splitTagline(w.tagline));
        setStatus((w.status as any) ?? 'live');
        const tc = (w.tile_cover ?? { kind: 'themed' }) as TileCover;
        setKind(tc.kind); setArtUrl(tc.src ?? ''); setBespokeCls(tc.cls ?? null);
        const wi = (w.icon ?? { kind: 'auto' }) as WikiIcon;
        setIcKind(wi.kind); setIcGlyph(wi.name ?? null); setIcSrc(wi.src ?? '');
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [wikiId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tax = useMemo(() => mergeTaxonomy(taxonomyCanon as any, dbCats), [dbCats]);
  const icons = useMemo(() => spriteIconNames(ICON_SPRITE), []);
  const cover: TileCover = kind === 'art'
    ? { kind: 'art', src: artUrl.trim() }
    : kind === 'bespoke' && bespokeCls ? { kind: 'bespoke', cls: bespokeCls } : { kind: 'themed' };
  // the identity brief the AI generator draws from (relatedness is automatic)
  const primaryCat = tax.categories.find((c: any) => c.key === cats[0]) || null;
  const genWiki: GenWiki = {
    name: wikiName, genreLabel: primaryCat?.label ?? null,
    tagline: tagline.trim() || null, blurb: blurb.trim() || null,
    colors: primaryCat ? [resolveColor(tax.palette, primaryCat.grad.from, ''), resolveColor(tax.palette, primaryCat.grad.to, '')].filter(Boolean) : [],
  };
  const mark: WikiIcon = icKind === 'art'
    ? { kind: 'art', src: icSrc.trim() }
    : icKind === 'glyph' && icGlyph ? { kind: 'glyph', name: icGlyph } : { kind: 'auto' };
  const meta = { id: wikiId, name: wikiName, categories: cats, blurb: blurb.trim() || null, tagline: tagline.trim() || null, status, tile_cover: cover, icon: mark };
  const previewHtml = useMemo(
    () => `<div class="rd-covers" style="grid-template-columns:1fr">${wikiCoverTile(meta, tax)}</div>`,
    [cats, blurb, tagline, status, kind, artUrl, bespokeCls, tax]);  // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCat = (k: string) => setCats((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const save = async () => {
    if (!contentStore) { setErr('Cloud not configured'); return; }
    if (!cats.length) { setErr('pick at least one category'); return; }
    if (kind === 'art' && !artUrl.trim()) { setErr('give the art an image URL, or switch the cover kind'); return; }
    if (icKind === 'art' && !icSrc.trim()) { setErr('give the icon an image URL, or switch the icon kind'); return; }
    if (icKind === 'glyph' && !icGlyph) { setErr('pick a glyph for the icon, or switch the icon kind'); return; }
    setBusy(true); setErr(null);
    try {
      await contentStore.updateWikiIdentity(wikiId, meta as Pick<WikiMeta, 'categories' | 'blurb' | 'tagline' | 'status' | 'tile_cover' | 'icon'>);
      fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});
      setSavedTick(true); setTimeout(() => setSavedTick(false), 1800);
      onSaved();
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  return (
    <div className="acct-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="acct-modal ow-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
        <div className="acct-title">Wiki identity — {wikiName}</div>
        {!loaded ? <div className="acct-note">loading…</div> : (
        <div className="ow-cols">
          <div className="ow-form">
            <div className="ow-label">categories — first pick drives the themed cover</div>
            <div className="ow-cats">
              {tax.categories.map((c: any) => (
                <button key={c.key} type="button" className={`ow-cat ${cats.includes(c.key) ? 'on' : ''}`} onClick={() => toggleCat(c.key)}>
                  {c.label}{cats[0] === c.key ? ' ★' : ''}
                </button>
              ))}
            </div>
            <div className="ow-label">tagline — the dotted line under the title on the tile</div>
            <TaglineFields parts={tagParts} onChange={setTagParts} placeholders={['Menus', 'Sauces', 'Slogans']} />
            <div className="ow-label">blurb — not shown on the tile: it powers browse search and the tile's hover tooltip</div>
            <textarea className="acct-input ow-blurb" placeholder="one sentence describing the wiki" value={blurb} onChange={(e) => setBlurb(e.target.value)} />
            <div className="ow-row">
              <select className="acct-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="live">live</option>
                <option value="coming_soon">coming soon</option>
              </select>
              <select className="acct-input" value={kind} onChange={(e) => setKind(e.target.value as any)}>
                <option value="themed">themed cover (derived from first tag)</option>
                <option value="art">cover art (your image)</option>
                {bespokeCls && <option value="bespoke">bespoke (hand-built: {bespokeCls})</option>}
              </select>
            </div>
            {kind === 'art' && (<>
              <input className="acct-input" placeholder="tile art URL — an image upload at public launch" value={artUrl} onChange={(e) => setArtUrl(e.target.value)} />
              <GenArtRow kind="cover" wiki={genWiki} onResult={setArtUrl} asUser={genAsUser} />
            </>)}
            {kind === 'bespoke' && <div className="acct-note">This wiki wears one of the five hand-built covers (browse page art). Switch the kind above to replace it; the reference is kept if you switch back before saving.</div>}
            <div className="ow-label">wiki emblem — the small mark (switcher, wiki bar / rail)</div>
            <div className="ow-row wi-icon-row">
              <select className="acct-input" value={icKind} onChange={(e) => setIcKind(e.target.value as any)}>
                <option value="auto">auto (letter mark)</option>
                <option value="glyph">sprite glyph</option>
                <option value="art">emblem art (your image)</option>
              </select>
              <span className="wi-mark-preview" title="icon preview">
                {icKind === 'art' && icSrc.trim()
                  ? <img src={icSrc.trim()} alt="" />
                  : icKind === 'glyph' && icGlyph
                    ? <svg><use href={`#ic-${icGlyph}`} /></svg>
                    : <b>{wikiName[0]}</b>}
              </span>
            </div>
            {icKind === 'glyph' && (
              <div className="ow-icons">
                {icons.map((ic) => (
                  <button key={ic} type="button" title={ic} className={`ow-icon ${icGlyph === ic ? 'on' : ''}`} onClick={() => setIcGlyph(ic)}>
                    <svg><use href={`#ic-${ic}`} /></svg>
                  </button>
                ))}
              </div>
            )}
            {icKind === 'art' && (<>
              <input className="acct-input" placeholder="icon image URL — square works best; an upload at public launch" value={icSrc} onChange={(e) => setIcSrc(e.target.value)} />
              <GenArtRow kind="icon" wiki={genWiki} onResult={setIcSrc} asUser={genAsUser} />
            </>)}
            {err && <div className="acct-msg">{err}</div>}
            <div className="ow-actions">
              <button className="acct-primary" onClick={save} disabled={busy}>{busy ? '…' : savedTick ? 'Saved ✓' : 'Save identity'}</button>
              <button className="acct-switch" type="button" onClick={onClose}>close</button>
            </div>
            <div className="acct-note">Changes reach every surface that lists wikis — the reader index and the live browse page — within seconds.</div>
          </div>
          <div className="ow-preview">
            <div className="ow-label">tile cover — live</div>
            <style>{COVER_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} onClick={(e) => e.preventDefault()} />
            {kind === 'bespoke' && <div className="acct-note">Preview shows the themed fallback — the bespoke art renders on the browse page itself.</div>}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
