'use client';
import React, { useEffect, useMemo, useState } from 'react';
import taxonomyCanon from '../../data/wiki-categories.json';
import { ICON_SPRITE } from '../../lib/render';
import { mergeTaxonomy, resolveColor, slugifyId } from '../../lib/taxonomy.mjs';
import { COVER_CSS, wikiCoverTile } from '../../lib/reader-core.mjs';
import { loadLucide, type LucideLib } from '../LucidePicker';
import { getAccessToken } from '../../lib/auth';
import type { CategoryRow, TileCover, WikiIcon } from '../../content-store';

/* ════════════════════════════════════════════════════════════════════
   The IDENTITY FLOW kit — shared pieces of the redesigned surfaces
   (origination flow · identity pane · tags pane). The side tile is the
   REAL reader renderer (wikiCoverTile + COVER_CSS) — rule #5. Colors come
   from the canon palette; icons from the pinned Lucide library + sprite.
   ════════════════════════════════════════════════════════════════════ */

export const CANON_TAX = taxonomyCanon as any;
export const PALETTE: Array<[string, string]> = Object.entries(CANON_TAX.palette as Record<string, string>);
export const resolve = (v: string | null | undefined, fb = '#5b6472') => resolveColor(CANON_TAX.palette, v, fb);
export const grad = (from?: string | null, to?: string | null) =>
  `linear-gradient(140deg, ${resolve(from)}, ${resolve(to, '#4f46e5')})`;
export { slugifyId };

export type Tag = { key: string; label: string; icon: string; grad: { from: string; to: string }; originated?: boolean };
export const mergedTags = (dbCats: CategoryRow[]): { palette: any; categories: Tag[] } =>
  mergeTaxonomy(CANON_TAX, dbCats) as any;

/** The identity draft every surface edits. */
export type Draft = {
  id: string; name: string; tags: string[]; tagline: [string, string, string];
  blurb: string; status: 'live' | 'coming_soon'; cover: TileCover; emblem: WikiIcon;
};
export const emptyDraft = (): Draft => ({
  id: '', name: '', tags: [], tagline: ['', '', ''], blurb: '', status: 'live',
  cover: { kind: 'themed' }, emblem: { kind: 'auto' },
});
export const taglineOf = (d: Draft) => d.tagline.map((s) => s.trim()).filter(Boolean).join(' · ');
export const draftMeta = (d: Draft) => ({
  id: d.id || slugifyId(d.name), name: d.name.trim(),
  categories: d.tags, tagline: taglineOf(d) || null, blurb: d.blurb.trim() || null,
  status: d.status, tile_cover: d.cover, icon: d.emblem,
});

/* ── chrome icons (from the design handback) ── */
export const I = {
  back: '<polyline points="15 18 9 12 15 6"/>', fwd: '<polyline points="9 18 15 12 9 6"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>', search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  lock: '<rect x="4.5" y="11" width="15" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  spark: '<path d="M12 2.6l1.7 4.9 4.9 1.7-4.9 1.7L12 15.8l-1.7-4.9L5.4 9.2l4.9-1.7z"/><path d="M18.4 15.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  key: '<circle cx="7.6" cy="16.4" r="4.1"/><path d="M10.6 13.4L20 4M16.4 4h3.8v3.8"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  me: '<circle cx="12" cy="8" r="3.8"/><path d="M4.8 20.4a7.4 7.4 0 0 1 14.4 0"/>',
  hand: '<path d="M9 11.5V5.2a1.8 1.8 0 0 1 3.6 0v6.3M12.6 11V4.4a1.8 1.8 0 0 1 3.6 0V11"/><path d="M16.2 11V6.6a1.8 1.8 0 0 1 3.6 0v8.8A6 6 0 0 1 13.8 21h-1.4a6 6 0 0 1-6-6V9.8a1.8 1.8 0 0 1 3.6 0"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  paint: '<path d="M19 3H5a2 2 0 0 0-2 2v5h18V5a2 2 0 0 0-2-2z"/><path d="M12 10v4M9.5 14h5v4.5a2.5 2.5 0 0 1-5 0z"/>',
  globe: '<circle cx="12" cy="12" r="9.2"/><path d="M2.8 12h18.4M12 2.8c2.6 2.6 2.6 15.8 0 18.4-2.6-2.6-2.6-15.8 0-18.4z"/>',
  clock: '<circle cx="12" cy="12" r="9.2"/><polyline points="12 7 12 12 16 14"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4.8A2 2 0 0 1 4.8 2.8H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
};
export const Ic = ({ d, w = 2 }: { d: string; w?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);

/* ── tag/category icon: lucide body when the library knows it, sprite ref
   otherwise (the hidden sprite rides each surface root) ── */
export function TagIcon({ name, lib }: { name: string; lib: LucideLib | null }) {
  const body = lib?.icons.find((i) => i.n === name)?.b;
  if (body) return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: body }} />;
  return <svg fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><use href={`#ic-${name}`} /></svg>;
}

export function useLucide(): LucideLib | null {
  const [lib, setLib] = useState<LucideLib | null>(null);
  useEffect(() => { loadLucide().then(setLib); }, []);
  return lib;
}

/* ── the wiki's EMBLEM mark ── */
export function EmblemMark({ d, tags, lib, size }: { d: Draft; tags: Tag[]; lib: LucideLib | null; size: 'sm' | 'md' | 'lg' }) {
  const prim = tags.find((t) => t.key === d.tags[0]);
  const bg = prim ? grad(prim.grad.from, prim.grad.to) : grad(null, null);
  const e = d.emblem || { kind: 'auto' };
  if (e.kind === 'art' && e.src) return <span className={`emblem e-${size}`}><img src={e.src} alt="" /></span>;
  if (e.kind === 'glyph' && e.name) return <span className={`emblem e-${size}`} style={{ background: bg }}><TagIcon name={e.name} lib={lib} /></span>;
  return <span className={`emblem e-${size}`} style={{ background: bg }}>{((d.name || '?').trim()[0] || '?').toUpperCase()}</span>;
}

/* ── the LIVE side tile — the real reader renderer, never a mock ── */
export function SideTile({ d, tax, note, showEmblem = true, lib }: { d: Draft; tax: { palette: any; categories: Tag[] }; note?: string; showEmblem?: boolean; lib: LucideLib | null }) {
  const named = d.name.trim();
  const html = useMemo(() => (named ? wikiCoverTile(draftMeta(d), tax) : ''),
    [d, tax, named]);  // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fl-side">
      <div className="side-cap"><i />its card, live</div>
      {named
        ? <div dangerouslySetInnerHTML={{ __html: `<div class="rd-covers">${html}</div>` }} onClick={(e) => e.preventDefault()} />
        : <div className="tile-empty">Your card appears<br />as you name it</div>}
      {d.cover.kind === 'html' && <div className="side-note">Uploaded art renders on the browse page itself — this preview shows the themed stand-in.</div>}
      {d.cover.kind === 'bespoke' && <div className="side-note">Its hand-made artwork renders on the browse page itself.</div>}
      {note && <div className="side-note">{note}</div>}
      {showEmblem && named ? (
        <div className="side-emblem"><EmblemMark d={d} tags={tax.categories} lib={lib} size="md" /><span className="nm">{named}</span></div>
      ) : null}
    </div>
  );
}

export const Bloom = ({ d, tax }: { d: Draft; tax: { categories: Tag[] } }) => {
  const prim = tax.categories.find((t) => t.key === d.tags[0]);
  return <div className="fl-bloom" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${prim ? resolve(prim.grad.from) : '#2b2440'} 0%, transparent 70%)` }} />;
};

/* ── the flow chrome: COVER_CSS + hidden sprite, once per surface root ── */
export function FlowRoot({ kind, children }: { kind: 'fl' | 'pane'; children: React.ReactNode }) {
  return (
    <div className={`idf ${kind}`}>
      <style>{COVER_CSS}</style>
      <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />
      {children}
    </div>
  );
}

/* ── tag picking (big friendly cards + the primary-say sentence) ── */
export function TagPick({ tax, lib, selected, onToggle, onNew }: {
  tax: { categories: Tag[] }; lib: LucideLib | null; selected: string[];
  onToggle: (k: string) => void; onNew?: () => void;
}) {
  const prim = tax.categories.find((t) => t.key === selected[0]);
  return (
    <>
      <div className="pick">
        {tax.categories.map((t) => {
          const on = selected.includes(t.key), first = selected[0] === t.key;
          return (
            <button key={t.key} type="button" className={`pick-card ${on ? 'on' : ''} ${first ? 'primary' : ''}`} onClick={() => onToggle(t.key)}>
              {first && <span className="pick-flag">cover</span>}
              <span className="pick-sw" style={{ background: grad(t.grad.from, t.grad.to) }}><TagIcon name={t.icon} lib={lib} /></span>
              <span className="pick-name">{t.label}</span>
              <span className="pick-tick"><Ic d={I.check} w={3} /></span>
            </button>
          );
        })}
        {onNew && <button type="button" className="pick-card pick-new" onClick={onNew}><Ic d={I.plus} w={2.4} /> Add a new category</button>}
      </div>
      {prim && (
        <div className="primary-say">
          <span className="sw2" style={{ background: grad(prim.grad.from, prim.grad.to) }}><TagIcon name={prim.icon} lib={lib} /></span>
          <p><b>{prim.label}</b> is designing your cover — its colours and its symbol. Tap it again to drop it, or tap another tag first to swap.</p>
        </div>
      )}
    </>
  );
}

/* ── the three tagline words ── */
export function Words({ parts, onChange }: { parts: [string, string, string]; onChange: (p: [string, string, string]) => void }) {
  const out = parts.map((s) => s.trim()).filter(Boolean);
  return (
    <>
      <div className="words">
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="dot">·</span>}
            <input className="in" value={parts[i]} placeholder="word" maxLength={16}
              onChange={(e) => { const n = [...parts] as [string, string, string]; n[i] = e.target.value; onChange(n); }} />
          </React.Fragment>
        ))}
      </div>
      <div className="words-out">{out.length ? out.join(' · ') : <span className="e">shows under the title</span>}</div>
    </>
  );
}

/* ── ✨ generation + the key boundary, per the design's keyline ── */
const KEY_LS = 'viziwiki:anthropic-key';
const loadKey = () => { try { return localStorage.getItem(KEY_LS) || ''; } catch { return ''; } };
const saveKey = (k: string) => { try { k ? localStorage.setItem(KEY_LS, k) : localStorage.removeItem(KEY_LS); } catch { /* ignore */ } };

export function GenBlock({ kind, d, tax, isAdmin, onResult }: {
  kind: 'icon' | 'cover'; d: Draft; tax: { palette: any; categories: Tag[] };
  isAdmin: boolean; onResult: (dataUri: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [asUser, setAsUser] = useState(false);
  const [key, setKey] = useState(loadKey);
  const [keyOpen, setKeyOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const prim = tax.categories.find((t) => t.key === d.tags[0]);
  const effAdmin = isAdmin && !asUser;
  const need = !effAdmin && !key;

  const go = async () => {
    if (busy || need) return;
    setBusy(true); setErr(null);
    try {
      const token = await getAccessToken();
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(key.trim() ? { 'x-anthropic-key': key.trim() } : {}),
          ...(asUser ? { 'x-anthropic-as-user': '1' } : {}),
        },
        body: JSON.stringify({
          kind, hint: undefined,
          wiki: {
            name: d.name.trim() || 'a new wiki',
            genreLabel: prim?.label ?? null, tagline: taglineOf(d) || null, blurb: d.blurb.trim() || null,
            colors: prim ? [resolve(prim.grad.from), resolve(prim.grad.to)] : [],
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) { if (j?.needKey) setKeyOpen(true); throw new Error(j?.error || `generation failed (${r.status})`); }
      onResult(j.dataUri);
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  return (
    <>
      <button type="button" className={`gen ${busy ? 'busy' : ''}`} onClick={go} disabled={need || busy}>
        <Ic d={I.spark} w={1.8} />{busy ? (kind === 'cover' ? 'Drawing your cover…' : 'Drawing your mark…') : 'Draw one for me'}
      </button>
      {effAdmin ? (
        <div className="keyline ok"><Ic d={I.key} w={1.8} /><p>Using the ViziWiki key, because you’re an admin.</p>
          <button type="button" onClick={() => setAsUser(true)}>see what others get</button></div>
      ) : key ? (
        <div className="keyline ok"><Ic d={I.key} w={1.8} /><p><b>Your key is connected.</b> It’s kept in this browser only — never on ViziWiki.</p>
          <button type="button" onClick={() => { setKey(''); saveKey(''); }}>remove</button></div>
      ) : (
        <div className="keyline need"><Ic d={I.key} w={1.8} /><p>Drawing needs <b>your own AI key</b>. It stays in this browser only — never on ViziWiki.</p>
          <button type="button" onClick={() => setKeyOpen((o) => !o)}>add key</button></div>
      )}
      {keyOpen && !key && (
        <div className="upload-box">
          <p>Get a key at <b>console.anthropic.com</b> (pay-per-use; a drawing costs cents). Saved only in this browser.</p>
          <input className="in sm" type="password" placeholder="sk-ant-…" style={{ marginTop: 10 }}
            onKeyDown={(e) => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) { setKey(v); saveKey(v); setKeyOpen(false); } } }}
            onBlur={(e) => { const v = e.target.value.trim(); if (v) { setKey(v); saveKey(v); setKeyOpen(false); } }} />
        </div>
      )}
      {isAdmin && asUser && <button type="button" className="quiet-link" onClick={() => setAsUser(false)}>back to admin view</button>}
      {err && <div className="in-under bad"><Ic d={I.warn} w={2} /> {err}</div>}
    </>
  );
}

/* ── the icon chooser: one search box, big tappable symbols ── */
const ICON_CAP = 48;
export function IconSheet({ q, onQ, sel, onPick, onBack }: {
  q: string; onQ: (q: string) => void; sel: string | null; onPick: (n: string) => void; onBack: () => void;
}) {
  const lib = useLucide();
  const hits = useMemo(() => {
    if (!lib) return [];
    const s = q.trim().toLowerCase();
    if (!s) return lib.icons;
    const byName: typeof lib.icons = [], byTag: typeof lib.icons = [];
    for (const i of lib.icons) { if (i.n.includes(s)) byName.push(i); else if (i.t.some((t) => t.includes(s))) byTag.push(i); }
    return [...byName, ...byTag];
  }, [lib, q]);
  const shown = hits.slice(0, ICON_CAP);
  const more = hits.length - shown.length;
  return (
    <FlowRoot kind="fl">
      <div className="fl-head">
        <button className="fl-icon-btn" onClick={onBack}><Ic d={I.back} w={2.2} /></button>
        <div className="fl-dots" /><span style={{ width: 34 }} />
      </div>
      <div className="fl-body"><div className="fl-wrap solo"><div className="q solo">
        <div className="q-step">Symbol</div>
        <h1 className="q-h">Pick a symbol.</h1>
        <p className="q-sub">Search by what it means — try <b>history</b>, <b>music</b>, <b>food</b>.</p>
        <div className="q-field">
          <div className="search2"><Ic d={I.search} w={2} />
            <input value={q} autoFocus placeholder={lib ? `Search ${lib.icons.length.toLocaleString()} symbols` : 'Loading symbols…'} onChange={(e) => onQ(e.target.value)} /></div>
          {lib && (shown.length ? (
            <div className="icons2">{shown.map((i) => (
              <button key={i.n} type="button" className={`icell ${sel === i.n ? 'on' : ''}`} title={i.t.slice(0, 6).join(', ')} onClick={() => onPick(i.n)}>
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: i.b }} />
                <span className="nm">{i.n.replace(/-/g, ' ')}</span>
              </button>))}</div>
          ) : <div className="more">Nothing matches “{q}”. Try a meaning instead of a shape.</div>)}
          {lib && more > 0 && <div className="more">{more.toLocaleString()} more — {q ? 'keep typing to narrow it' : 'search to narrow it'}</div>}
        </div>
      </div></div></div>
    </FlowRoot>
  );
}

/* ── a new tag: three plain questions on one quiet screen ── */
export type TagDraft = { key?: string; label: string; icon: string | null; from: string | null; to: string | null };
export function NewTagSheet({ nt, onChange, takenKeys, lib, onPickIcon, onAdd, onBack, busy, title = 'Make a new tag.', sub = 'Every wiki on the site can use it after this.', cta = 'Add tag' }: {
  nt: TagDraft; onChange: (nt: TagDraft) => void; takenKeys: string[]; lib: LucideLib | null;
  onPickIcon: () => void; onAdd: () => void; onBack: () => void; busy?: boolean;
  title?: string; sub?: string; cta?: string;
}) {
  const key = nt.key ?? slugifyId(nt.label || '');
  const taken = !nt.key && !!key && takenKeys.includes(key);
  const ready = !!(nt.label.trim() && nt.icon && nt.from && nt.to && !taken);
  return (
    <FlowRoot kind="fl">
      <div className="fl-bloom" style={{ background: `radial-gradient(60% 60% at 50% 0%, ${nt.from ? resolve(nt.from) : '#2b2440'} 0%, transparent 70%)` }} />
      <div className="fl-head">
        <button className="fl-icon-btn" onClick={onBack}><Ic d={I.back} w={2.2} /></button>
        <div className="fl-dots" />
        <button className="fl-icon-btn" onClick={onBack}><Ic d={I.x} w={2.2} /></button>
      </div>
      <div className="fl-body"><div className="fl-wrap solo"><div className="q solo" style={{ maxWidth: 520 }}>
        <div className="q-step">{nt.key ? 'Edit tag' : 'New tag'}</div>
        <h1 className="q-h">{title}</h1>
        <p className="q-sub">{sub}</p>
        <div className="q-field">
          <input className="in" value={nt.label} autoFocus placeholder="Tabletop Games" onChange={(e) => onChange({ ...nt, label: e.target.value })} />
          {taken && <div className="in-under bad"><Ic d={I.warn} w={2} /> There’s already a tag with that name.</div>}
          {nt.key && <div className="in-under"><Ic d={I.lock} w={2} /> key: {nt.key} (fixed — wikis reference it)</div>}
          <button type="button" className="row" onClick={onPickIcon} style={{ marginTop: 16, border: '1px solid var(--border2)', borderRadius: 13, background: 'var(--bg2)' }}>
            <span className="row-k">Symbol</span>
            <span className="row-chips">
              {nt.icon
                ? <><span className="row-sw" style={{ background: grad(nt.from, nt.to) }}><TagIcon name={nt.icon} lib={lib} /></span>
                    <span className="row-v">{nt.icon.replace(/-/g, ' ')}</span></>
                : <span className="row-v empty">choose one</span>}
            </span>
            <svg className="row-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: I.fwd }} />
          </button>
          <div className="rows-cap"><span>Colours</span><span className="line" /></div>
          {(['from', 'to'] as const).map((which) => (
            <div className="sws" key={which}><span className="e">{which === 'from' ? 'From' : 'To'}</span>
              {PALETTE.map(([pname, val]) => (
                <button key={pname} type="button" title={pname} className={`sw3 ${nt[which] === pname || nt[which] === val ? 'on' : ''}`}
                  style={{ background: val }} onClick={() => onChange({ ...nt, [which]: pname })} />
              ))}
            </div>
          ))}
          <div className="gradout">
            <span className="s" style={{ background: grad(nt.from, nt.to) }}>{nt.icon ? <TagIcon name={nt.icon} lib={lib} /> : null}</span>
            <span className="b" style={{ background: grad(nt.from, nt.to) }} />
          </div>
          <div className="in-under"><Ic d={I.paint} w={1.8} /> These colours become the cover for any wiki that picks it first.</div>
        </div>
      </div></div></div>
      <div className="fl-foot"><div className="fl-foot-in solo">
        <button className="go" onClick={onAdd} disabled={!ready || busy}>{busy ? '…' : cta}<Ic d={I.check} w={2.4} /></button>
        <button className="skip" onClick={onBack}>Cancel</button>
      </div></div>
    </FlowRoot>
  );
}
