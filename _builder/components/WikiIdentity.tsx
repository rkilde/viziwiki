'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow, type TileCover, type WikiIcon, type WikiMeta } from '../content-store';
import { splitTagline } from './TaglineFields';
import { parseTileArt } from '../lib/tile-html.mjs';
import { wikiCoverTile } from '../lib/reader-core.mjs';
import {
  Bloom, EmblemMark, FlowRoot, GenBlock, I, Ic, IconSheet, NewTagSheet, SideTile, TagIcon, TagPick, TermChips, Words,
  draftMeta, emptyDraft, mergedTags, resolve, slugifyId, splitTerms, useLucide,
  type Draft, type TagDraft,
} from './identity/kit';

// WIKI IDENTITY — the owner's redesigned surface B: a short settings list
// (hero tile + rows), each row opening ONE question screen that reuses the
// origination flow's shapes. Save persists the whole identity at once.
// Includes the new UPLOADED TILE-ART kind: drop in a self-contained html
// art file (like the Renaissance "Vitruvian" tile) and it becomes the
// wiki's cover on the browse page — parsed + sanitized, identity text
// rendered from the database on top.

type Screen = null | 'tags' | 'words' | 'blurb' | 'cover' | 'emblem' | 'status' | 'newtag' | 'icon' | 'emblemicon';

export function WikiIdentity({ wikiId, wikiName, onClose, onSaved, onDeleted, canDelete = false, genAsUser = false, initialScreen }: {
  wikiId: string; wikiName: string; onClose: () => void; onSaved: () => void;
  /** admin only: permanent wiki deletion (triple-click confirmed) */
  onDeleted?: () => void; canDelete?: boolean; genAsUser?: boolean;
  /** open straight on one screen — the rail's emblem mark jumps here with 'emblem' */
  initialScreen?: Extract<Screen, 'emblem'>;
}) {
  const [loaded, setLoaded] = useState(false);
  const [d, setD] = useState<Draft>({ ...emptyDraft(), id: wikiId, name: wikiName });
  const [hadBespoke, setHadBespoke] = useState<string | null>(null);
  const [dbCats, setDbCats] = useState<CategoryRow[]>([]);
  const [screen, setScreen] = useState<Screen>(initialScreen ?? null);
  const [nt, setNt] = useState<TagDraft>({ label: '', icon: null, from: null, to: null });
  const [iconQ, setIconQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [artMsg, setArtMsg] = useState<string | null>(null);
  // the DANGER row's triple-click state: 0 untouched · 1 · 2 · 3 = deleting.
  // Arms down automatically after 4s of hesitation.
  const [delClicks, setDelClicks] = useState(0);
  const lib = useLucide();
  useEffect(() => {
    if (!delClicks || delClicks >= 3) return;
    const t = setTimeout(() => setDelClicks(0), 4000);
    return () => clearTimeout(t);
  }, [delClicks]);

  const clickDelete = async () => {
    if (!contentStore || !canDelete) return;
    const n = delClicks + 1;
    setDelClicks(n);
    if (n < 3) return;
    setBusy(true); setErr(null);
    try {
      await contentStore.deleteWiki(wikiId);
      fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});
      onDeleted?.();
    } catch (e: any) { setErr(e?.message || String(e)); setDelClicks(0); }
    setBusy(false);
  };

  useEffect(() => {
    contentStore?.listCategories().then(setDbCats).catch(() => {});
    contentStore?.listWikis().then((ws) => {
      const w = ws.find((x) => x.id === wikiId);
      if (w) {
        const tc = (w.tile_cover ?? { kind: 'themed' }) as TileCover;
        if (tc.kind === 'bespoke') setHadBespoke(tc.cls ?? null);
        setD({
          id: w.id, name: w.name, tags: w.categories ?? [],
          tagline: splitTagline(w.tagline), blurb: w.blurb ?? '',
          status: (w.status as any) ?? 'live', cover: tc, emblem: (w.icon ?? { kind: 'auto' }) as WikiIcon,
        });
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [wikiId]);

  const tax = useMemo(() => mergedTags(dbCats), [dbCats]);
  const set = (patch: Partial<Draft>) => { setD((p) => ({ ...p, ...patch })); setSaved(false); };
  const toggleTag = (k: string) => set({ tags: d.tags.includes(k) ? d.tags.filter((x) => x !== k) : [...d.tags, k] });
  const prim = tax.categories.find((t) => t.key === d.tags[0]);

  const save = async (): Promise<boolean> => {
    if (!contentStore) { setErr('Cloud not configured'); return false; }
    if (!d.tags.length) { setErr('pick at least one tag'); setScreen('tags'); return false; }
    setBusy(true); setErr(null);
    let ok = false;
    try {
      const m = draftMeta(d);
      await contentStore.updateWikiIdentity(wikiId, m as Pick<WikiMeta, 'categories' | 'blurb' | 'tagline' | 'status' | 'tile_cover' | 'icon'>);
      fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});
      setSaved(true); setTimeout(() => setSaved(false), 2200);
      onSaved();
      ok = true;
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
    return ok;
  };

  const addTag = async () => {
    if (!contentStore) return;
    const row: CategoryRow = { key: slugifyId(nt.label), label: nt.label.trim(), icon: nt.icon || '', grad_from: resolve(nt.from, ''), grad_to: resolve(nt.to, '') };
    setBusy(true); setErr(null);
    try {
      await contentStore.createCategory(row);
      setDbCats((p) => [...p, row]); set({ tags: [...d.tags, row.key] });
      setScreen('tags'); setNt({ label: '', icon: null, from: null, to: null });
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const onArtFile = (file: File) => {
    setArtMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const art = parseTileArt(String(reader.result || ''));
        set({ cover: { kind: 'html', cls: art.cls, css: art.css, inner: art.inner } });
        setArtMsg(`found "${art.cls}" — ${(art.css.length / 1024).toFixed(1)}KB of skin CSS, ${(art.inner.length / 1024).toFixed(1)}KB of art`);
      } catch (e: any) { setArtMsg('✗ ' + (e?.message || String(e))); }
    };
    reader.readAsText(file);
  };

  /* ── sub-screens ── */
  if (screen === 'icon') return <IconSheet q={iconQ} onQ={setIconQ} sel={nt.icon} onPick={(n) => { setNt({ ...nt, icon: n }); setScreen('newtag'); }} onBack={() => setScreen('newtag')} />;
  if (screen === 'emblemicon') return <IconSheet q={iconQ} onQ={setIconQ} sel={d.emblem.name ?? null} onPick={(n) => { set({ emblem: { kind: 'glyph', name: n } }); setScreen('emblem'); }} onBack={() => setScreen('emblem')} />;
  if (screen === 'newtag') return <NewTagSheet nt={nt} onChange={setNt} takenKeys={tax.categories.map((c) => c.key)} lib={lib}
    onPickIcon={() => { setIconQ(''); setScreen('icon'); }} onAdd={addTag} onBack={() => { setScreen('tags'); setErr(null); }} busy={busy}
    title="Make a new category." cta="Add category" />;

  if (screen) {
    let q = '', sub: React.ReactNode = '', field: React.ReactNode = null, note = '';
    if (screen === 'tags') {
      q = 'What’s it about?'; sub = <>Pick its categories. <b>The first one designs the cover.</b></>;
      note = 'All its categories show in the corner of the card.';
      field = <TagPick tax={tax} lib={lib} selected={d.tags} onToggle={toggleTag}
        onNew={() => { setNt({ label: '', icon: null, from: null, to: null }); setScreen('newtag'); }} />;
    } else if (screen === 'words') {
      q = 'Give it three words.'; sub = 'The little line under the title on its card.';
      field = <Words parts={d.tagline} onChange={(p) => set({ tagline: p })} />;
    } else if (screen === 'blurb') {
      q = 'What might people search?'; sub = 'Names, topics, nicknames — anything someone might type. A comma makes each one a tag.';
      field = (<>
        <TermChips value={d.blurb} placeholder="Da Vinci, Michelangelo, Medici, Italian art…" onChange={(blurb) => set({ blurb })} />
        <div className="in-under"><Ic d={I.search} w={1.8} /> Search only. <b>They never show on the card.</b></div>
      </>);
    } else if (screen === 'cover') {
      q = 'Pick its tile cover art.'; sub = 'Keep the one made from its category, or bring your own art.';
      note = d.cover.kind === 'themed' ? 'Change its first category and this changes with it.' : '';
      field = (<>
        <div className="choice">
          <button type="button" className={`choice-card ${d.cover.kind === 'themed' ? 'on' : ''}`} onClick={() => set({ cover: { kind: 'themed' } })}>
            <span className="choice-top"><span className="choice-ic"><Ic d={I.paint} w={1.8} /></span><span className="choice-t">Made for you</span></span>
            <div className="choice-d">Built from {prim ? <b>{prim.label}</b> : 'its category'} — nothing to do.</div>
          </button>
          <button type="button" className={`choice-card ${d.cover.kind === 'art' ? 'on' : ''}`} onClick={() => set({ cover: { kind: 'art', src: d.cover.kind === 'art' ? d.cover.src : '' } })}>
            <span className="choice-top"><span className="choice-ic"><Ic d={I.spark} w={1.8} /></span><span className="choice-t">Your own art</span></span>
            <div className="choice-d">Paste a picture, or let us draw one.</div>
          </button>
          <button type="button" className={`choice-card ${d.cover.kind === 'html' ? 'on' : ''}`} onClick={() => set({ cover: d.cover.kind === 'html' ? d.cover : { kind: 'html' } })}>
            <span className="choice-top"><span className="choice-ic"><Ic d={I.file} w={1.8} /></span><span className="choice-t">An art file</span></span>
            <div className="choice-d">Upload a designed tile — html, css and svg, animations and all.</div>
          </button>
          {hadBespoke && (
            <button type="button" className={`choice-card ${d.cover.kind === 'bespoke' ? 'on' : ''}`} onClick={() => set({ cover: { kind: 'bespoke', cls: hadBespoke } })}>
              <span className="choice-top"><span className="choice-ic"><Ic d={I.lock} w={1.8} /></span><span className="choice-t">Bespoke</span></span>
              <div className="choice-d">Its hand-made artwork. Only the five original wikis have one.</div>
            </button>
          )}
        </div>
        {d.cover.kind === 'art' && (
          <div style={{ marginTop: 20 }}>
            <input className="in sm" value={d.cover.src || ''} placeholder="Paste an image link" onChange={(e) => set({ cover: { kind: 'art', src: e.target.value } })} />
            <GenBlock kind="cover" d={d} tax={tax} isAdmin={!genAsUser} onResult={(uri) => set({ cover: { kind: 'art', src: uri } })} />
          </div>
        )}
        {d.cover.kind === 'html' && (
          <div className="upload-box">
            <p><b>Upload the art file.</b> A self-contained tile page (like the design handbacks): one element with <b>class="cover c-your-skin"</b>, its skin CSS in a style block. The genre, title and tagline render from the database on top — leave those slots out or they’ll be stripped.</p>
            <input type="file" accept=".html,.htm,text/html" onChange={(e) => { const f = e.target.files?.[0]; if (f) onArtFile(f); }} />
            {d.cover.inner && !artMsg?.startsWith('✗') && (
              <div className="upload-ok"><Ic d={I.check} w={2.4} /> {artMsg || `art loaded — "${d.cover.cls}"`}</div>
            )}
            {artMsg?.startsWith('✗') && <div className="in-under bad"><Ic d={I.warn} w={2} /> {artMsg.slice(2)}</div>}
          </div>
        )}
      </>);
    } else if (screen === 'emblem') {
      q = 'Pick its little mark.'; sub = 'The wiki emblem — the small badge in the wiki switcher and on mobile.';
      field = (<>
        <div className="choice">
          <button type="button" className={`choice-card ${d.emblem.kind === 'auto' ? 'on' : ''}`} onClick={() => set({ emblem: { kind: 'auto' } })}>
            <span className="choice-top"><EmblemMark d={{ ...d, emblem: { kind: 'auto' } }} tags={tax.categories} lib={lib} size="lg" /><span className="choice-t">Letter</span></span>
            <div className="choice-d">The first letter of the name, in its category’s colour.</div>
          </button>
          <button type="button" className={`choice-card ${d.emblem.kind === 'glyph' ? 'on' : ''}`} onClick={() => { setIconQ(''); setScreen('emblemicon'); }}>
            <span className="choice-top"><EmblemMark d={{ ...d, emblem: { kind: 'glyph', name: d.emblem.name || 'sparkles' } }} tags={tax.categories} lib={lib} size="lg" /><span className="choice-t">Symbol</span></span>
            <div className="choice-d">Choose a symbol instead of a letter.</div>
          </button>
          <button type="button" className={`choice-card ${d.emblem.kind === 'art' ? 'on' : ''}`} onClick={() => set({ emblem: { kind: 'art', src: d.emblem.kind === 'art' ? d.emblem.src : '' } })}>
            <span className="choice-top"><EmblemMark d={d.emblem.kind === 'art' ? d : { ...d, emblem: { kind: 'art', src: '' } }} tags={tax.categories} lib={lib} size="lg" /><span className="choice-t">Your own image</span></span>
            <div className="choice-d">Paste a small square image, or let us draw one.</div>
          </button>
        </div>
        {d.emblem.kind === 'art' && (
          <div style={{ marginTop: 20 }}>
            <input className="in sm" value={d.emblem.src || ''} placeholder="Paste an image link — square works best" onChange={(e) => set({ emblem: { kind: 'art', src: e.target.value } })} />
            <GenBlock kind="icon" d={d} tax={tax} isAdmin={!genAsUser} onResult={(uri) => set({ emblem: { kind: 'art', src: uri } })} />
          </div>
        )}
      </>);
    } else {
      q = 'When is it open?'; sub = 'Coming soon still shows on browse — it just doesn’t open yet.';
      field = (
        <div className="choice">
          <button type="button" className={`choice-card ${d.status === 'live' ? 'on' : ''}`} onClick={() => set({ status: 'live' })}>
            <span className="choice-top"><span className="choice-ic"><Ic d={I.globe} w={1.8} /></span><span className="choice-t">Live</span></span>
            <div className="choice-d">Anyone can read it now.</div>
          </button>
          <button type="button" className={`choice-card ${d.status === 'coming_soon' ? 'on' : ''}`} onClick={() => set({ status: 'coming_soon' })}>
            <span className="choice-top"><span className="choice-ic"><Ic d={I.clock} w={1.8} /></span><span className="choice-t">Coming soon</span></span>
            <div className="choice-d">Visible with a badge, opens for no one yet.</div>
          </button>
        </div>
      );
    }
    // SOLO mode: this screen was opened DIRECTLY (the rail's emblem mark →
    // 'emblem'). Back/× return straight to the build kit — never the full
    // identity summary — and the footer saves right here.
    const solo = !!initialScreen && screen === initialScreen;
    const leave = () => (solo ? onClose() : setScreen(null));
    const saveAndClose = async () => { if (await save()) onClose(); };
    return (
      <FlowRoot kind="fl">
        <Bloom d={d} tax={tax} />
        <div className="fl-head">
          <button className="fl-icon-btn" onClick={leave}><Ic d={I.back} w={2.2} /></button>
          <div className="fl-dots" />
          <button className="fl-icon-btn" onClick={leave}><Ic d={I.x} w={2.2} /></button>
        </div>
        <div className="fl-body"><div className="fl-wrap">
          <div className="q">
            <div className="q-step">{d.name}</div>
            <h1 className="q-h">{q}</h1>
            <p className="q-sub">{sub}</p>
            <div className="q-field">{field}</div>
          </div>
          <SideTile d={d} tax={tax} note={note} lib={lib} />
        </div></div>
        <div className="fl-foot"><div className="fl-foot-in">
          {solo ? (<>
            <button className="go" onClick={saveAndClose} disabled={busy || !loaded}>{busy ? '…' : 'Save emblem'}<Ic d={I.check} w={2.4} /></button>
            <button className="skip" onClick={onClose}>Cancel</button>
            {err && <span className="in-under bad" style={{ margin: 0 }}><Ic d={I.warn} w={2} /> {err}</span>}
          </>) : (<>
            <button className="go" onClick={() => setScreen(null)}>Done<Ic d={I.check} w={2.4} /></button>
            <span className="enter"><span className="kbd2">↵</span> to go back</span>
          </>)}
        </div></div>
      </FlowRoot>
    );
  }

  /* ── the settings list ── */
  const line = d.tagline.map((s) => s.trim()).filter(Boolean);
  const heroHtml = d.name.trim() ? wikiCoverTile(draftMeta(d), tax, { htmlArt: true }) : '';
  return (
    <FlowRoot kind="pane">
      <div className="pane-head">
        <button className="fl-icon-btn" onClick={onClose}><Ic d={I.back} w={2.2} /></button>
        <div className="pane-h"><div className="t">Wiki identity</div><div className="s">How {d.name} looks wherever wikis are listed</div></div>
      </div>
      <div className="pane-body"><div className="pane-in">
        {!loaded ? <div className="side-note">loading…</div> : (<>
          <div className="pane-hero">
            <div className="tw"><div dangerouslySetInnerHTML={{ __html: `<div class="rd-covers">${heroHtml}</div>` }} onClick={(e) => e.preventDefault()} /></div>
            <div className="m"><div className="n">{d.name}</div>
              <div className="d">Every change here shows up on browse, in the reader and in the wiki switcher within seconds. No deploy.</div></div>
          </div>
          <div className="rows">
            <button className="row" onClick={() => setScreen('tags')}><span className="row-k">Categories</span>
              <span className="row-chips">
                {d.tags.length ? d.tags.map((k) => { const t = tax.categories.find((x) => x.key === k); return t ? (
                  <span key={k} className="row-sw" style={{ background: `linear-gradient(140deg, ${resolve(t.grad.from)}, ${resolve(t.grad.to)})` }} title={t.label}><TagIcon name={t.icon} lib={lib} /></span>
                ) : null; }) : <span className="row-v empty">none yet</span>}
                {prim && <span className="row-v" style={{ marginLeft: 4 }}>{prim.label} designs the cover</span>}
              </span><RowGo /></button>
            <button className="row" onClick={() => setScreen('words')}><span className="row-k">Tagline</span>
              <span className={`row-v ${line.length ? '' : 'empty'}`}>{line.length ? line.join(' · ') : 'three words'}</span><RowGo /></button>
            <button className="row" onClick={() => setScreen('blurb')}><span className="row-k">Search terms</span>
              <span className={`row-v ${d.blurb ? '' : 'empty'}`}>{splitTerms(d.blurb).join(' · ') || 'what people might type to find it'}</span><RowGo /></button>
            <button className="row" onClick={() => setScreen('cover')}><span className="row-k">Tile cover art</span>
              <span className="row-v">{d.cover.kind === 'themed' ? 'Made from its category' : d.cover.kind === 'art' ? 'Its own art' : d.cover.kind === 'html' ? `Uploaded art file${d.cover.cls ? ` (${d.cover.cls})` : ''}` : 'Bespoke artwork'}</span><RowGo /></button>
            <button className="row" onClick={() => setScreen('emblem')}><span className="row-k">Wiki Emblem</span>
              <span className="row-chips"><EmblemMark d={d} tags={tax.categories} lib={lib} size="sm" />
                <span className="row-v">{d.emblem.kind === 'auto' ? 'Letter mark' : d.emblem.kind === 'glyph' ? 'Symbol' : 'Its own image'}</span></span><RowGo /></button>
            <button className="row" onClick={() => setScreen('status')}><span className="row-k">Status</span>
              <span className="row-v">{d.status === 'coming_soon' ? 'Coming soon' : 'Live'}</span><RowGo /></button>
          </div>
          <div className="rows-cap"><span>Fixed</span><span className="line" /></div>
          <div className="rows"><div className="row static">
            <span className="row-k">Web address</span>
            <span className="row-v" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: 'var(--muted)' }}>viziwiki.com/read/{d.id}</span>
            <span className="locked" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--dim)' }}><Ic d={I.lock} w={2} /> can’t change</span>
          </div></div>
          {canDelete && (<>
            <div className="rows-cap"><span>Danger</span><span className="line" /></div>
            <div className="rows"><div className={`panel ${delClicks ? 'warn' : ''}`}>
              <div className="panel-h">{delClicks > 0 && <Ic d={I.warn} w={2} />}
                <div>
                  <div className="panel-t">{delClicks === 0 ? 'Delete this wiki' : delClicks === 1 ? 'Really delete it?' : 'Last click erases it forever'}</div>
                  <div className="panel-d">
                    {delClicks === 0 && <>Erases {d.name} permanently — every page, its whole revision history, and its identity, everywhere it appears. <b>Not undoable.</b> Click three times to confirm.</>}
                    {delClicks === 1 && <>All of {d.name}’s pages and history go with it. Two more clicks.</>}
                    {delClicks >= 2 && <>There is no undo for this. One more click deletes {d.name}.</>}
                  </div>
                </div>
              </div>
              <div className="panel-acts">
                {delClicks > 0 && <button className="btn2" onClick={() => setDelClicks(0)}>Keep it</button>}
                <button className="btn2 danger" disabled={busy} onClick={clickDelete}>
                  {busy ? 'deleting…' : delClicks === 0 ? 'Delete wiki' : delClicks === 1 ? 'Click again (2 of 3)' : 'Click to erase (3 of 3)'}
                </button>
              </div>
            </div></div>
          </>)}
          {err && <div className="in-under bad" style={{ marginTop: 14 }}><Ic d={I.warn} w={2} /> {err}</div>}
        </>)}
      </div></div>
      <div className="pane-foot"><div className="pane-foot-in">
        {saved
          ? <span className="saved2"><Ic d={I.check} w={2.6} /> Saved</span>
          : (<><button className="btn2 primary" onClick={save} disabled={busy || !loaded}>{busy ? '…' : 'Save changes'}</button>
              <button className="btn2" onClick={onClose}>Cancel</button></>)}
      </div></div>
    </FlowRoot>
  );
}

const RowGo = () => <svg className="row-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: I.fwd }} />;
