'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow, type WikiIcon } from '../content-store';
import type { LucideLib } from './LucidePicker';
import {
  FlowRoot, I, Ic, IconSheet, NewTagSheet, TagIcon,
  grad, mergedTags, resolve, slugifyId, useLucide,
  type Tag, type TagDraft,
} from './identity/kit';

// WIKI CATEGORIES — the master admin's list of every category on the site,
// and the wikis filed under each (the owner's design handback, applied).
// Built to SCAN: one dense row per category — swatch, name, the wikis' marks
// visible before you click, counts right-aligned — searchable (a wiki's name
// finds its categories too) and sortable. A category opens into its own
// screen: facts, the wikis filed under it (each row jumps to that wiki's
// identity), and the browse filter row as readers actually see it. "Added"
// categories are editable through the SAME edit sheet as before (NewTagSheet,
// unchanged per the owner); the canon twelve are LEGACY — locked, they live
// in the repo. A category in use can't be removed: the blocked panel lists
// its wearers as rows that jump straight to each wiki's identity.

type WikiLite = { id: string; name: string; categories: string[]; status: string; coverKind: string; icon: WikiIcon };

const STATUS: Record<string, string> = { live: 'Live', coming_soon: 'Coming soon' };

/* the wiki's small MARK: its emblem (art / glyph / letter) on its primary
   category's gradient — the same identity the switcher renders */
function WikiMark({ w, tax, lib, cls }: { w: WikiLite; tax: { categories: Tag[] }; lib: LucideLib | null; cls: string }) {
  const prim = tax.categories.find((t) => t.key === w.categories[0]);
  const bg = prim ? grad(prim.grad.from, prim.grad.to) : grad(null, null);
  if (w.icon?.kind === 'art' && w.icon.src) return <span className={cls}><img src={w.icon.src} alt="" /></span>;
  if (w.icon?.kind === 'glyph' && w.icon.name) return <span className={cls} style={{ background: bg }}><TagIcon name={w.icon.name} lib={lib} /></span>;
  return <span className={cls} style={{ background: bg }}>{((w.name || '?').trim()[0] || '?').toUpperCase()}</span>;
}

/* the public browse filter row, drawn as the page draws it — a light paper
   preview inside the dark surface */
function BrowseRow({ tax, active, note, ghost }: { tax: { categories: Tag[] }; active?: { key: string; label: string } | null; note?: string; ghost?: boolean }) {
  const list = active && !tax.categories.some((c) => c.key === active.key)
    ? [...tax.categories, active as Tag] : tax.categories;
  return (
    <div className="browse">
      <div className="browse-top"><span className="browse-lbl">Filter:</span>
        <div className="bchips"><span className="bchip all">All</span>
          {list.map((c) => (
            <span key={c.key} className={`bchip ${active && c.key === active.key ? 'me' : ghost ? 'ghost' : ''}`}>{c.label}</span>
          ))}
        </div></div>
      {note && <div className="browse-note">{note}</div>}
    </div>
  );
}

export function ManageCategories({ onClose, onGotoWiki }: { onClose: () => void; onGotoWiki?: (wikiId: string) => void }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [wikis, setWikis] = useState<WikiLite[]>([]);
  const [view, setView] = useState<null | string>(null);      // null = the list · a key = one category
  const [blocked, setBlocked] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [screen, setScreen] = useState<null | 'newtag' | 'icon'>(null);
  const [draft, setDraft] = useState<TagDraft>({ label: '', icon: null, from: null, to: null });
  const [iconQ, setIconQ] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'use' | 'az'>('use');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lib = useLucide();

  const load = () => {
    contentStore?.listCategories().then(setRows).catch(() => {});
    contentStore?.listWikis().then((ws) => setWikis(ws.map((w) => ({
      id: w.id, name: w.name, categories: w.categories ?? [], status: w.status ?? 'live',
      coverKind: (w.tile_cover as any)?.kind ?? 'themed', icon: (w.icon ?? { kind: 'auto' }) as WikiIcon,
    })))).catch(() => {});
  };
  useEffect(load, []);
  const tax = useMemo(() => mergedTags(rows), [rows]);
  const legacy = tax.categories.filter((t) => !t.originated);
  const added = tax.categories.filter((t) => t.originated);
  const filedUnder = (k: string) => wikis.filter((w) => w.categories.includes(k));
  const coveredBy = (k: string) => wikis.filter((w) => w.categories[0] === k && w.coverKind === 'themed');
  const ping = () => fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});

  const openCat = (k: string) => { setView(k); setBlocked(false); setConfirm(false); };

  const commitTag = async () => {
    if (!contentStore) return;
    const row: CategoryRow = {
      key: draft.key ?? slugifyId(draft.label), label: draft.label.trim(), icon: draft.icon || '',
      grad_from: resolve(draft.from, ''), grad_to: resolve(draft.to, ''),
    };
    setBusy(true); setErr(null);
    try {
      if (draft.key) await contentStore.updateCategory(row); else await contentStore.createCategory(row);
      // optimistic: the detail screen opens on the fresh row before the reload lands
      setRows((p) => (p.some((r) => r.key === row.key) ? p.map((r) => (r.key === row.key ? row : r)) : [...p, row]));
      setScreen(null); setDraft({ label: '', icon: null, from: null, to: null });
      openCat(row.key);
      load(); ping();
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const doDelete = async (key: string) => {
    if (!contentStore) return;
    setBusy(true); setErr(null);
    try { await contentStore.deleteCategory(key); setConfirm(false); setView(null); load(); ping(); }
    catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  /* ── the shared edit sheet (unchanged per the owner) + its icon picker ── */
  if (screen === 'icon') return <IconSheet q={iconQ} onQ={setIconQ} sel={draft.icon} onPick={(n) => { setDraft({ ...draft, icon: n }); setScreen('newtag'); }} onBack={() => setScreen('newtag')} />;
  if (screen === 'newtag') {
    const wearing = draft.key ? filedUnder(draft.key).length : 0;
    return <NewTagSheet nt={draft} onChange={setDraft}
      takenKeys={tax.categories.filter((c) => c.key !== draft.key).map((c) => c.key)} lib={lib}
      onPickIcon={() => { setIconQ(''); setScreen('icon'); }} onAdd={commitTag}
      onBack={() => { setScreen(null); setErr(null); }} busy={busy}
      title={draft.key ? 'Edit the category.' : 'Make a new category.'}
      sub={draft.key ? `${wearing || 'No'} wiki${wearing === 1 ? ' is' : 's are'} filed under it — their covers change too.` : 'Every wiki on the site can use it after this.'}
      cta={draft.key ? 'Save changes' : 'Add category'} />;
  }

  /* ════ ONE CATEGORY — who is filed under it ════ */
  const c = view ? tax.categories.find((t) => t.key === view) : null;
  if (view && c) {
    const under = filedUnder(c.key), cov = coveredBy(c.key), n = under.length;
    const wikiRow = (w: WikiLite) => {
      const isCover = w.categories[0] === c.key && w.coverKind === 'themed';
      return (
        <button key={w.id} type="button" className="wrow" onClick={() => onGotoWiki?.(w.id)}>
          <WikiMark w={w} tax={tax} lib={lib} cls="wmark" />
          <span className="wmain"><span className="n">{w.name}</span>
            <span className={`c ${isCover ? 'cover' : ''}`}>{isCover ? 'its cover comes from this category'
              : w.coverKind !== 'themed' ? 'filed here · has its own artwork' : 'filed here'}</span></span>
          <span className="wtags">{w.categories.map((k) => {
            const t = tax.categories.find((x) => x.key === k);
            return <span key={k} className={`wtag ${k === c.key ? 'this' : ''}`}>{t?.label || k}</span>;
          })}</span>
          <span className="wstat">{STATUS[w.status] || w.status}</span>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: I.fwd }} />
        </button>
      );
    };

    return (
      <FlowRoot kind="pane">
        <div className="pane-head">
          <button className="fl-icon-btn" onClick={() => { if (blocked || confirm) { setBlocked(false); setConfirm(false); } else setView(null); }}><Ic d={I.back} w={2.2} /></button>
          <div className="pane-h"><div className="t catname">{c.label}</div>
            <div className="s">{blocked ? 'Can’t be removed yet' : confirm ? 'Remove it?' : c.originated ? 'Added after launch' : 'A legacy category'}</div></div>
          {!c.originated && <span className="adminchip"><Ic d={I.lock} w={2} /> locked</span>}
        </div>
        <div className="pane-body"><div className="pane-in">
          {blocked ? (
            <div className="stop">
              <div className="stop-h"><Ic d={I.warn} w={2} />
                <div><div className="stop-t">{n} wiki{n === 1 ? ' is' : 's are'} filed under <span className="catname">{c.label}</span></div>
                  <div className="stop-d">A category in use can’t be removed. Open {n === 1 ? 'it' : 'them'} and file {n === 1 ? 'it' : 'them'} elsewhere
                    first{cov.length ? <>. <b>{cov.length}</b> of them also take {cov.length === 1 ? 'its' : 'their'} cover from this category</> : null}.</div></div></div>
              <div className="rows" style={{ marginTop: 16 }}>{under.map(wikiRow)}</div>
              <div className="panel-acts" style={{ marginTop: 14 }}><button className="btn2" onClick={() => setBlocked(false)}>Got it</button></div>
            </div>
          ) : confirm ? (
            <div className="q" style={{ paddingTop: 8 }}>
              <h1 className="q-h">Remove <span className="catname">{c.label}</span>?</h1>
              <p className="q-sub">No wiki is filed under it, so nothing changes for readers. Its key <b>{c.key}</b> is freed up afterwards, and the chip disappears from the browse row.</p>
              <div className="panel-acts" style={{ marginTop: 22 }}>
                <button className="btn2 danger" disabled={busy} onClick={() => doDelete(c.key)}>{busy ? '…' : 'Remove it'}</button>
                <button className="btn2" onClick={() => setConfirm(false)}>Keep it</button>
              </div>
            </div>
          ) : (<>
            <div className="cat-top">
              <span className="sw big" style={{ background: grad(c.grad.from, c.grad.to) }}><TagIcon name={c.icon} lib={lib} /></span>
              <span className="m"><span className="l catname">{c.label}</span>
                <span className="d">{n ? `${n} wiki${n === 1 ? '' : 's'} filed under it${cov.length ? `, ${cov.length} taking ${cov.length === 1 ? 'its' : 'their'} cover from it` : ''}.`
                  : 'Nothing is filed under it yet.'}</span></span>
            </div>
            <div className="facts2">
              <span className="fact2"><span className="k">Key</span><span className="v mono">{c.key}</span></span>
              <span className="fact2"><span className="k">Symbol</span><span className="v"><TagIcon name={c.icon} lib={lib} /> {c.icon.replace(/-/g, ' ')}</span></span>
              <span className="fact2"><span className="k">Colours</span>
                <span className="v"><span className="pair"><i style={{ background: resolve(c.grad.from) }} /><i style={{ background: resolve(c.grad.to) }} /></span>
                  {c.grad.from} into {c.grad.to}</span></span>
            </div>
            {!c.originated && <div className="lockline"><Ic d={I.lock} w={1.9} />
              <p>Legacy categories ship with ViziWiki and look the same everywhere, so the name, symbol and colours are fixed.</p></div>}

            <div className="rows-cap"><span>Wikis filed under <span className="catname" style={{ fontSize: 11 }}>{c.label}</span></span><span className="line" />
              <span className="n2">{n ? `${n} of ${wikis.length}` : 'none yet'}</span></div>
            {n ? <div className="rows">{under.map(wikiRow)}</div>
              : <div className="rows"><div className="nobody">Nothing is filed under this category yet.<br />It still shows in the browse row — tapping it there currently finds nothing.</div></div>}

            <div className="rows-cap"><span>On the browse page</span><span className="line" /></div>
            <BrowseRow tax={tax} active={c} note={n ? `Tapping it there lists ${n === 1 ? 'that wiki' : `those ${n} wikis`}.` : 'Tapping it there currently finds nothing.'} />
            {err && <div className="in-under bad" style={{ marginTop: 12 }}><Ic d={I.warn} w={2} /> {err}</div>}
          </>)}
        </div></div>
        {!blocked && !confirm && c.originated && (
          <div className="pane-foot"><div className="pane-foot-in">
            <button className="btn2 primary" onClick={() => {
              setDraft({ key: c.key, label: c.label, icon: c.icon, from: c.grad.from, to: c.grad.to });
              setScreen('newtag');
            }}>Edit category</button>
            <button className="btn2" onClick={() => (filedUnder(c.key).length ? setBlocked(true) : setConfirm(true))}>Remove</button>
          </div></div>
        )}
      </FlowRoot>
    );
  }

  /* ════ EVERY CATEGORY ON THE SITE — the scannable list ════ */
  const s = q.trim().toLowerCase();
  const match = (t: Tag) => !s || t.label.toLowerCase().includes(s) || t.key.includes(s)
    || filedUnder(t.key).some((w) => w.name.toLowerCase().includes(s));
  const order = (list: Tag[]) => sort === 'use'
    ? [...list].sort((a, b) => filedUnder(b.key).length - filedUnder(a.key).length || a.label.localeCompare(b.label))
    : [...list].sort((a, b) => a.label.localeCompare(b.label));
  const addedShown = order(added.filter(match)), legacyShown = order(legacy.filter(match));
  const used = tax.categories.filter((t) => filedUnder(t.key).length).length;

  const row = (t: Tag) => {
    const under = filedUnder(t.key), n = under.length, cov = coveredBy(t.key).length;
    const show = under.slice(0, 4), more = n - show.length;
    return (
      <button key={t.key} type="button" className="crow" onClick={() => openCat(t.key)}>
        <span className="sw" style={{ background: grad(t.grad.from, t.grad.to) }}><TagIcon name={t.icon} lib={lib} /></span>
        <span className="crow-nm">{t.label}</span>
        <span className="marks">{show.map((w) => <WikiMark key={w.id} w={w} tax={tax} lib={lib} cls="m" />)}{more > 0 && <span className="more2">+{more}</span>}</span>
        <span className={`countcol ${n ? '' : 'zero'}`}>{n ? <><b>{n}</b> wiki{n === 1 ? '' : 's'}</> : 'none yet'}</span>
        <span className="coverscol">{cov ? <><b>{cov}</b> cover{cov === 1 ? '' : 's'}</> : ''}</span>
        {!t.originated ? <span className="lockcol"><Ic d={I.lock} w={2.2} /> legacy</span> : <span className="lockcol" />}
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: I.fwd }} />
      </button>
    );
  };

  return (
    <FlowRoot kind="pane">
      <div className="pane-head">
        <button className="fl-icon-btn" onClick={onClose}><Ic d={I.back} w={2.2} /></button>
        <div className="pane-h"><div className="t">Wiki Categories</div><div className="s">Every category on the site, and the wikis filed under each</div></div>
        <span className="adminchip"><Ic d={I.lock} w={1.9} /> admins only</span>
      </div>
      <div className="pane-body"><div className="pane-in wide">
        <div className="scan">
          <label className="find2"><Ic d={I.search} w={2} />
            <input value={q} placeholder="Find a category — or a wiki inside one" onChange={(e) => setQ(e.target.value)} /></label>
          <div className="sortrow">
            <button className={sort === 'use' ? 'on' : ''} onClick={() => setSort('use')}>Most used</button>
            <button className={sort === 'az' ? 'on' : ''} onClick={() => setSort('az')}>A–Z</button>
          </div>
        </div>
        <div className="tally">
          <span><b>{tax.categories.length}</b> categories</span>
          <span><b>{added.length}</b> added · <b>{legacy.length}</b> legacy</span>
          <span><b>{used}</b> in use · <b>{tax.categories.length - used}</b> empty</span>
        </div>

        <div className="rows-cap"><span>Added</span><span className="line" />
          <span className="n2">{added.length} · made here since launch · any admin can change these</span></div>
        <div className="rows">
          {addedShown.length ? addedShown.map(row)
            : <div className="nobody">{s ? 'No added category matches that.' : 'None added yet.'}</div>}
          <button type="button" className="addrow" onClick={() => { setDraft({ label: '', icon: null, from: null, to: null }); setScreen('newtag'); }}>
            <span className="p">+</span><span className="l">New category</span>
          </button>
        </div>

        <div className="rows-cap"><span>Legacy</span><span className="line" />
          <span className="n2">{legacy.length} · shipped with the platform · locked</span></div>
        <div className="rows">
          {legacyShown.length ? legacyShown.map(row) : <div className="nobody">No legacy category matches that.</div>}
        </div>
        {err && <div className="in-under bad" style={{ marginTop: 12 }}><Ic d={I.warn} w={2} /> {err}</div>}
      </div></div>
    </FlowRoot>
  );
}
