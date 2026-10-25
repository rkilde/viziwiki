'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { contentStore, type CategoryRow } from '../content-store';
import {
  FlowRoot, I, Ic, IconSheet, NewTagSheet, TagIcon,
  grad, mergedTags, resolve, slugifyId, useLucide,
  type Tag, type TagDraft,
} from './identity/kit';

// SITE WIKI TAGS — the owner's redesigned surface C: a plain list. Yours
// first (fully editable), the built-in twelve below (locked — they live in
// the repo's canon). The delete rule in plain words: a tag any wiki wears
// cannot be deleted — the panel names the wearers as tappable chips that
// jump straight to that wiki's identity.

type WikiLite = { id: string; name: string; categories: string[] };

export function ManageCategories({ onClose, onGotoWiki }: { onClose: () => void; onGotoWiki?: (wikiId: string) => void }) {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [wikis, setWikis] = useState<WikiLite[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [screen, setScreen] = useState<null | 'newtag' | 'icon'>(null);
  const [draft, setDraft] = useState<TagDraft>({ label: '', icon: null, from: null, to: null });
  const [iconQ, setIconQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lib = useLucide();

  const load = () => {
    contentStore?.listCategories().then(setRows).catch(() => {});
    contentStore?.listWikis().then((ws) => setWikis(ws.map((w) => ({ id: w.id, name: w.name, categories: w.categories ?? [] })))).catch(() => {});
  };
  useEffect(load, []);
  const tax = useMemo(() => mergedTags(rows), [rows]);
  const canon = tax.categories.filter((t) => !t.originated);
  const originated = tax.categories.filter((t) => t.originated);
  const wearers = (k: string) => wikis.filter((w) => w.categories.includes(k));
  const ping = () => fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ paths: ['/read', '/api/directory'] }) }).catch(() => {});

  const commitTag = async () => {
    if (!contentStore) return;
    const row: CategoryRow = {
      key: draft.key ?? slugifyId(draft.label), label: draft.label.trim(), icon: draft.icon || '',
      grad_from: resolve(draft.from, ''), grad_to: resolve(draft.to, ''),
    };
    setBusy(true); setErr(null);
    try {
      if (draft.key) await contentStore.updateCategory(row); else await contentStore.createCategory(row);
      setScreen(null); setDraft({ label: '', icon: null, from: null, to: null });
      load(); ping();
    } catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  const doDelete = async (key: string) => {
    if (!contentStore) return;
    setBusy(true); setErr(null);
    try { await contentStore.deleteCategory(key); setConfirm(null); load(); ping(); }
    catch (e: any) { setErr(e?.message || String(e)); }
    setBusy(false);
  };

  if (screen === 'icon') return <IconSheet q={iconQ} onQ={setIconQ} sel={draft.icon} onPick={(n) => { setDraft({ ...draft, icon: n }); setScreen('newtag'); }} onBack={() => setScreen('newtag')} />;
  if (screen === 'newtag') return <NewTagSheet nt={draft} onChange={setDraft}
    takenKeys={tax.categories.filter((c) => c.key !== draft.key).map((c) => c.key)} lib={lib}
    onPickIcon={() => { setIconQ(''); setScreen('icon'); }} onAdd={commitTag}
    onBack={() => { setScreen(null); setErr(null); }} busy={busy}
    title={draft.key ? 'Edit the tag.' : 'Make a new tag.'}
    sub={draft.key ? `${wearers(draft.key).length || 'No'} wiki${wearers(draft.key).length === 1 ? ' wears' : 's wear'} it — their covers change too.` : 'Every wiki on the site can use it after this.'}
    cta={draft.key ? 'Save changes' : 'Add tag'} />;

  const row = (t: Tag) => {
    const w = wearers(t.key), n = w.length;
    if (blocked === t.key) {
      return (
        <div className="panel warn" key={t.key}>
          <div className="panel-h"><Ic d={I.warn} w={2} />
            <div><div className="panel-t">“{t.label}” is being used</div>
              <div className="panel-d">{n} wiki{n === 1 ? '' : 's'} {n === 1 ? 'wears' : 'wear'} this tag, so it can’t be deleted yet. Open {n === 1 ? 'it' : 'them'} and pick a different tag first.</div></div></div>
          <div className="wearers">{w.map((x) => (
            <button key={x.id} type="button" className="wearer" onClick={() => onGotoWiki?.(x.id)}>
              <span className="emblem e-sm" style={{ background: grad(t.grad.from, t.grad.to) }}>{(x.name[0] || '?').toUpperCase()}</span>{x.name}
            </button>))}</div>
          <div className="panel-acts"><button className="btn2" onClick={() => setBlocked(null)}>OK</button></div>
        </div>
      );
    }
    if (confirm === t.key) {
      return (
        <div className="panel warn" key={t.key}>
          <div className="panel-t">Delete “{t.label}”?</div>
          <div className="panel-d">No wiki uses it, so nothing changes for readers.</div>
          <div className="panel-acts">
            <button className="btn2" onClick={() => setConfirm(null)}>Keep it</button>
            <button className="btn2 danger" disabled={busy} onClick={() => doDelete(t.key)}>Delete</button>
          </div>
        </div>
      );
    }
    return (
      <div className="tagrow" key={t.key}>
        <span className="g" style={{ background: grad(t.grad.from, t.grad.to) }}><TagIcon name={t.icon} lib={lib} /></span>
        <span className="m"><div className="l">{t.label}</div>
          <div className="u">{n ? `used by ${w.map((x) => x.name).join(', ')}` : 'not used yet'}</div></span>
        {!t.originated ? (
          <span className="locked"><Ic d={I.lock} w={2} /> built in</span>
        ) : (<>
          <button type="button" className="act" onClick={() => {
            setBlocked(null); setConfirm(null);
            setDraft({ key: t.key, label: t.label, icon: t.icon, from: t.grad.from, to: t.grad.to });
            setScreen('newtag');
          }}>Edit</button>
          <button type="button" className="act danger" onClick={() => {
            if (wearers(t.key).length) { setBlocked(t.key); setConfirm(null); } else { setConfirm(t.key); setBlocked(null); }
          }}>Delete</button>
        </>)}
      </div>
    );
  };

  return (
    <FlowRoot kind="pane">
      <div className="pane-head">
        <button className="fl-icon-btn" onClick={onClose}><Ic d={I.back} w={2.2} /></button>
        <div className="pane-h"><div className="t">Tags</div><div className="s">What wikis are filed under, across the whole site</div></div>
        <button className="btn2 primary" onClick={() => { setDraft({ label: '', icon: null, from: null, to: null }); setScreen('newtag'); }}>
          + New tag
        </button>
      </div>
      <div className="pane-body"><div className="pane-in">
        <div className="rows-cap" style={{ paddingTop: 4 }}><span>Yours</span><span className="line" /></div>
        <div className="rows">{originated.length ? originated.map(row)
          : <div className="panel"><div className="panel-d" style={{ margin: 0 }}>No tags of your own yet. “New tag” makes one.</div></div>}</div>
        <div className="rows-cap"><span>Built in</span><span className="line" /></div>
        <div className="rows">{canon.map(row)}</div>
        <div className="side-note" style={{ marginTop: 14 }}>The twelve built-in tags are part of ViziWiki itself, so they can’t be changed or deleted.</div>
        {err && <div className="in-under bad" style={{ marginTop: 12 }}><Ic d={I.warn} w={2} /> {err}</div>}
      </div></div>
    </FlowRoot>
  );
}
