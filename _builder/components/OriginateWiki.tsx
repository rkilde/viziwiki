'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow, type WikiMeta } from '../content-store';
import { validateNewWiki } from '../lib/taxonomy.mjs';
import { parseTileArt } from '../lib/tile-html.mjs';
import {
  Bloom, FlowRoot, GenBlock, I, Ic, IconSheet, NewTagSheet, SideTile, TagPick, Words,
  draftMeta, emptyDraft, mergedTags, resolve, slugifyId, useLucide,
  type Draft, type TagDraft,
} from './identity/kit';

// ORIGINATION — the owner's redesigned "New wiki": a sign-up flow. One
// question per screen, Enter to continue, and the REAL tile (the reader's
// own renderer) building itself alongside. Model, rules and vocabulary are
// unchanged from the previous modal — this is the same machinery re-staged.

const STEPS = [
  { k: 'name', q: 'What’s the wiki called?', s: <>This is the big title on its card, and it sets the web address.</> },
  { k: 'tags', q: 'What’s it about?', s: <>Pick its categories. <b>The first one you pick designs the cover.</b></> },
  { k: 'words', q: 'Give it three words.', s: <>The little line under the title. Then the search terms that bring it up.</> },
  { k: 'cover', q: 'Pick its tile cover art.', s: <>Keep the one made from your category, or bring your own art.</> },
  { k: 'owner', q: 'Who runs it?', s: <>You can keep it and hand it over any time.</> },
] as const;

export function OriginateWiki({ existingIds, onClose, onCreated, genAsUser = false }: {
  existingIds: string[]; onClose: () => void; onCreated: (meta: WikiMeta) => void; genAsUser?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(emptyDraft);
  const [dbCats, setDbCats] = useState<CategoryRow[]>([]);
  const [sub, setSub] = useState<null | 'newtag' | 'icon'>(null);
  const [nt, setNt] = useState<TagDraft>({ label: '', icon: null, from: null, to: null });
  const [iconQ, setIconQ] = useState('');
  const [owner, setOwner] = useState<'me' | 'other' | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);   // wiki row exists; grant may still be open
  const [done, setDone] = useState<null | { grantNote?: string }>(null);
  const [artMsg, setArtMsg] = useState<string | null>(null);
  const lib = useLucide();

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

  useEffect(() => { contentStore?.listCategories().then(setDbCats).catch(() => {}); }, []);
  const tax = useMemo(() => mergedTags(dbCats), [dbCats]);
  const id = slugifyId(d.name);
  const meta: WikiMeta = { ...draftMeta({ ...d, id }), slug: id, skin: 'wiki-page wiki-base' } as WikiMeta;
  const idTaken = !!id && existingIds.includes(id) && !createdId;

  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));
  const toggleTag = (k: string) => set({ tags: d.tags.includes(k) ? d.tags.filter((x) => x !== k) : [...d.tags, k] });

  const addTag = async () => {
    if (!contentStore) return;
    const row: CategoryRow = { key: slugifyId(nt.label), label: nt.label.trim(), icon: nt.icon || '', grad_from: resolve(nt.from, ''), grad_to: resolve(nt.to, '') };
    setBusy(true); setErr(null);
    try {
      await contentStore.createCategory(row);
      setDbCats((p) => [...p, row]); set({ tags: [...d.tags, row.key] });
      setSub(null); setNt({ label: '', icon: null, from: null, to: null });
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const create = async () => {
    if (!contentStore) { setErr('Cloud not configured'); return; }
    setBusy(true); setErr(null);
    try {
      if (!createdId) {
        const errs = validateNewWiki(meta, existingIds, tax.categories.map((c) => c.key));
        if (errs.length) { setErr(errs.join(' · ')); setBusy(false); return; }
        await contentStore.createWiki(meta);
        setCreatedId(meta.id);
        fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});
      }
      if (owner === 'other' && email.trim()) await contentStore.grantWikiMaster(email, meta.id);
      setDone({});
    } catch (e: any) {
      setErr((createdId || meta.id ? 'The wiki is created — the grant failed: ' : '') + (e?.message || String(e)));
      if (!createdId) setCreatedId(meta.id);   // createWiki succeeded if we got to the grant
    }
    setBusy(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    create();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    e.preventDefault();
    if (can && !busy) next();
  };

  if (sub === 'icon') return <IconSheet q={iconQ} onQ={setIconQ} sel={nt.icon} onPick={(n) => { setNt({ ...nt, icon: n }); setSub('newtag'); }} onBack={() => setSub('newtag')} />;
  if (sub === 'newtag') return <NewTagSheet nt={nt} onChange={setNt} takenKeys={tax.categories.map((c) => c.key)} lib={lib}
    onPickIcon={() => { setIconQ(''); setSub('icon'); }} onAdd={addTag} onBack={() => { setSub(null); setErr(null); }} busy={busy}
    title="Make a new category." cta="Add category" />;

  if (done) {
    return (
      <FlowRoot kind="fl">
        <Bloom d={d} tax={tax} />
        <div className="fl-head"><span style={{ width: 34 }} /><div className="fl-dots" />
          <button className="fl-icon-btn" onClick={onClose}><Ic d={I.x} w={2.2} /></button></div>
        <div className="fl-body"><div className="done">
          <div className="done-tile"><SideTileBare d={{ ...d, id }} tax={tax} /></div>
          <h1 className="done-h">{d.name.trim()} is ready.</h1>
          <p className="done-s">It’s on the browse page already — no deploy, no waiting. Add pages whenever you like.</p>
          <div className={`done-live ${err ? 'warn' : ''}`}><i />{err ? 'Live — grant still open' : d.status === 'coming_soon' ? 'Showing as coming soon' : 'Live now'}</div>
          {err && <p className="done-s" style={{ fontSize: 13 }}>{err} You can grant any time from its identity.</p>}
          <div className="done-acts">
            <button className="go" style={{ justifyContent: 'center' }} onClick={() => onCreated(meta)}>Open its build kit<Ic d={I.fwd} w={2.4} /></button>
            <button className="skip" onClick={() => { setD(emptyDraft()); setStep(0); setOwner(null); setEmail(''); setErr(null); setCreatedId(null); setDone(null); }}>Create another wiki</button>
          </div>
        </div></div>
      </FlowRoot>
    );
  }

  const stepDef = STEPS[step];
  let field: React.ReactNode = null, note = '', can = true, skip = '';

  if (stepDef.k === 'name') {
    can = !!d.name.trim() && !idTaken; note = 'Name it and the card draws itself.';
    field = (<>
      <input className="in" value={d.name} autoFocus placeholder="The Renaissance" disabled={!!createdId}
        onChange={(e) => set({ name: e.target.value })} />
      {d.name.trim() && !idTaken && <div className="in-under"><Ic d={I.globe} w={1.8} /> viziwiki.com/read/<b>{id}</b></div>}
      {idTaken && <div className="in-under bad"><Ic d={I.warn} w={2} /> “{id}” already exists — pick another name.</div>}
    </>);
  } else if (stepDef.k === 'tags') {
    can = d.tags.length > 0; note = 'All its categories show in the corner of the card.';
    field = <TagPick tax={tax} lib={lib} selected={d.tags} onToggle={createdId ? () => {} : toggleTag}
      onNew={createdId ? undefined : () => { setNt({ label: '', icon: null, from: null, to: null }); setSub('newtag'); }} />;
  } else if (stepDef.k === 'words') {
    skip = 'Skip for now'; note = 'Two or three words works best.';
    field = (<>
      <Words parts={d.tagline} onChange={(p) => set({ tagline: p })} />
      <div style={{ marginTop: 28 }}>
        <textarea className="in sm" value={d.blurb} placeholder="Search terms — names, topics, nicknames people might type (e.g. Da Vinci, Medici, Italian art)" onChange={(e) => set({ blurb: e.target.value })} />
        <div className="in-under"><Ic d={I.search} w={1.8} /> If it’s in here, the wiki comes up in search. <b>It never shows on the card.</b></div>
      </div>
    </>);
  } else if (stepDef.k === 'cover') {
    const prim = tax.categories.find((t) => t.key === d.tags[0]);
    note = d.cover.kind === 'themed' ? 'Change your first tag and this changes with it.' : 'A dark fade keeps the title readable.';
    field = (<>
      <div className="choice">
        <button type="button" className={`choice-card ${d.cover.kind === 'themed' ? 'on' : ''}`} onClick={() => set({ cover: { kind: 'themed' } })}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.paint} w={1.8} /></span><span className="choice-t">Made for you</span></span>
          <span className="choice-mini"><MiniTile d={{ ...d, cover: { kind: 'themed' } }} tax={tax} /></span>
          <div className="choice-d">Built from {prim ? <b>{prim.label}</b> : 'your tag'} — nothing to do.</div>
        </button>
        <button type="button" className={`choice-card ${d.cover.kind === 'art' ? 'on' : ''}`} onClick={() => set({ cover: { kind: 'art', src: d.cover.kind === 'art' ? d.cover.src : '' } })}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.spark} w={1.8} /></span><span className="choice-t">Your own art</span></span>
          <span className="choice-mini"><MiniTile d={{ ...d, cover: { kind: 'art', src: d.cover.kind === 'art' ? d.cover.src : '' } }} tax={tax} /></span>
          <div className="choice-d">Paste a picture, or let us draw one.</div>
        </button>
        <button type="button" className={`choice-card ${d.cover.kind === 'html' ? 'on' : ''}`} onClick={() => set({ cover: d.cover.kind === 'html' ? d.cover : { kind: 'html' } })}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.file} w={1.8} /></span><span className="choice-t">An art file</span></span>
          <div className="choice-d">Upload a designed tile — html, css and svg, animations and all.</div>
        </button>
      </div>
      {d.cover.kind === 'art' && (
        <div style={{ marginTop: 20 }}>
          <input className="in sm" value={d.cover.src || ''} placeholder="Paste an image link" onChange={(e) => set({ cover: { kind: 'art', src: e.target.value } })} />
          <GenBlock kind="cover" d={d} tax={tax} isAdmin={!genAsUser} onResult={(uri) => set({ cover: { kind: 'art', src: uri } })} />
        </div>
      )}
      {d.cover.kind === 'html' && (
        <div className="upload-box">
          <p><b>Upload the art file.</b> A self-contained tile page: one element with <b>class="cover c-your-skin"</b>, its skin CSS in a style block. The genre, title and tagline render from the database on top.</p>
          <input type="file" accept=".html,.htm,text/html" onChange={(e) => { const f = e.target.files?.[0]; if (f) onArtFile(f); }} />
          {d.cover.inner && !artMsg?.startsWith('✗') && <div className="upload-ok"><Ic d={I.check} w={2.4} /> {artMsg || `art loaded — "${d.cover.cls}"`}</div>}
          {artMsg?.startsWith('✗') && <div className="in-under bad"><Ic d={I.warn} w={2} /> {artMsg.slice(2)}</div>}
        </div>
      )}
    </>);
  } else {
    can = owner !== null && (owner === 'me' || !busy); note = 'You can change all of this later.';
    field = (<>
      <div className="choice">
        <button type="button" className={`choice-card ${owner === 'me' ? 'on' : ''}`} onClick={() => setOwner('me')}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.me} w={1.8} /></span><span className="choice-t">I’ll run it</span></span>
          <div className="choice-d">You keep it. Hand it to someone whenever you like.</div>
        </button>
        <button type="button" className={`choice-card ${owner === 'other' ? 'on' : ''}`} onClick={() => setOwner('other')}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.hand} w={1.8} /></span><span className="choice-t">Someone else</span></span>
          <div className="choice-d">They become its wiki master — this wiki only.</div>
        </button>
      </div>
      {owner === 'other' && (
        <div style={{ marginTop: 20 }}>
          <input className="in sm" value={email} placeholder="their email" onChange={(e) => setEmail(e.target.value)} />
          <div className="in-under"><Ic d={I.check} w={2.2} /> No account yet? Finish without it — you can grant any time from its identity.</div>
        </div>
      )}
      <div className="rows-cap" style={{ paddingTop: 28 }}><span>When it goes live</span><span className="line" /></div>
      <div className="choice">
        <button type="button" className={`choice-card ${d.status === 'live' ? 'on' : ''}`} onClick={() => set({ status: 'live' })}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.globe} w={1.8} /></span><span className="choice-t">Live now</span></span>
          <div className="choice-d">Readable the second you finish.</div>
        </button>
        <button type="button" className={`choice-card ${d.status === 'coming_soon' ? 'on' : ''}`} onClick={() => set({ status: 'coming_soon' })}>
          <span className="choice-top"><span className="choice-ic"><Ic d={I.clock} w={1.8} /></span><span className="choice-t">Coming soon</span></span>
          <div className="choice-d">Shows on browse with a badge, opens for no one yet.</div>
        </button>
      </div>
      {err && <div className="in-under bad" style={{ marginTop: 16 }}><Ic d={I.warn} w={2} /> {err}</div>}
      {createdId && err && <button type="button" className="quiet-link" onClick={() => setDone({})}>Finish without the grant →</button>}
    </>);
  }

  const last = step === STEPS.length - 1;
  return (
    <FlowRoot kind="fl">
      <div onKeyDown={onKey} style={{ display: 'contents' }}>
        <Bloom d={d} tax={tax} />
        <div className="fl-head">
          <button className="fl-icon-btn" onClick={() => setStep(Math.max(0, step - 1))} disabled={!step}><Ic d={I.back} w={2.2} /></button>
          <div className="fl-dots">{STEPS.map((s, i) => (
            <button key={s.k} className={`fl-dot ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} title={s.q} onClick={() => setStep(i)} />))}</div>
          <button className="fl-icon-btn" onClick={onClose}><Ic d={I.x} w={2.2} /></button>
        </div>
        <div className="fl-brand">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round"><polygon points="7,1.5 12.5,7 7,12.5 1.5,7" /><line x1="1.5" y1="7" x2="12.5" y2="7" /></svg>
          <span>New wiki</span>
        </div>
        <div className="fl-body"><div className="fl-wrap">
          <div className="q">
            <div className="q-step">Step {step + 1} of {STEPS.length}</div>
            <h1 className="q-h">{stepDef.q}</h1>
            <p className="q-sub">{stepDef.s}</p>
            <div className="q-field">{field}</div>
          </div>
          <SideTile d={{ ...d, id }} tax={tax} note={note} lib={lib} />
        </div></div>
        <div className="fl-foot"><div className="fl-foot-in">
          <button className="go" onClick={next} disabled={!can || busy}>{busy ? '…' : last ? 'Create the wiki' : 'Continue'}<Ic d={I.fwd} w={2.4} /></button>
          {skip && <button className="skip" onClick={next}>{skip}</button>}
          <span className="enter"><span className="kbd2">↵</span> {last ? 'to create' : 'to continue'}</span>
        </div></div>
      </div>
    </FlowRoot>
  );
}

/* tiny tile wrappers (the REAL renderer, framed) */
import { wikiCoverTile } from '../lib/reader-core.mjs';
function MiniTile({ d, tax }: { d: Draft; tax: any }) {
  const html = d.name.trim() || d.tags.length ? wikiCoverTile(draftMeta(d), tax) : '';
  return <span dangerouslySetInnerHTML={{ __html: `<div class="rd-covers">${html}</div>` }} />;
}
function SideTileBare({ d, tax }: { d: Draft; tax: any }) {
  return <div className="fl-side" style={{ position: 'static' }}><div dangerouslySetInnerHTML={{ __html: `<div class="rd-covers">${wikiCoverTile(draftMeta(d), tax)}</div>` }} /></div>;
}
