'use client';
import React, { useState } from 'react';

// The readiness panel body (the design AI's nested-by-card layout). The marker
// payload is built+posted by the decorator (derived from grammar); this only
// renders it: a progress summary, a Section region (component-level fields),
// then one collapsible group per "card" (first-level list instance) with its
// items nested, ready cards tucked into a disclosure, and met lines hidden
// behind a per-card "show completed". Every leaf maps to a field → onJump.
export type Leaf = { label: string; sub?: string; met: boolean; jump: string; addpath?: string; struct?: boolean };
export type Item = { key: string; name: string | null; reqs: Leaf[]; unmet: number };
export type Card = { key: string; kind: string; name: string | null; reqs: Leaf[]; items: Item[]; unmet: number; total: number };
export type Marker = { top: number; prefix: string; done: boolean; left: number; pct: number; section: Leaf[]; cards: Card[] };

const Tri = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
const Chk = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
const Chev = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>);
const plural = (k: string) => (/y$/.test(k) ? k.slice(0, -1) + 'ies' : k + 's');

export function ReadinessPanel({ marker, onJump }: { marker: Marker; onJump: (l: Leaf) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [doneOpen, setDoneOpen] = useState<Set<string>>(new Set());
  const [readyOpen, setReadyOpen] = useState(false);
  const toggle = (s: Set<string>, k: string, set: (n: Set<string>) => void) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); set(n); };

  const m = marker;
  const secUnmet = m.section.filter((l) => !l.met).length;
  const unmetCards = m.cards.filter((c) => c.unmet > 0);
  const readyCards = m.cards.filter((c) => c.unmet === 0);
  const kind = m.cards.length ? m.cards[0].kind : 'Card';

  const renderLeaf = (l: Leaf, i: number) => (
    <button key={i} className={`pe-mk-leaf ${l.met ? 'met' : ''} ${l.struct ? 'struct' : ''}`} disabled={l.met} onClick={() => !l.met && onJump(l)}>
      <span className="box" />
      <span className="tx">{l.label}{l.sub && <span className="sub">{l.sub}</span>}</span>
    </button>
  );

  const renderCard = (c: Card) => {
    const isOpen = open.has(c.key);
    const ready = c.unmet === 0;
    const reqUnmet = c.reqs.filter((r) => !r.met);
    const reqMet = c.reqs.filter((r) => r.met);
    const itemsUnmet = c.items.filter((it) => it.unmet > 0);
    const itemsDone = c.items.filter((it) => it.unmet === 0);
    const doneCount = reqMet.length + itemsDone.reduce((n, it) => n + it.reqs.length, 0);
    const dOpen = doneOpen.has(c.key);
    return (
      <div key={c.key} className={`pe-mk-cg ${ready ? 'ready' : ''} ${isOpen ? 'open' : ''}`}>
        <button className="pe-mk-cg-head" onClick={() => toggle(open, c.key, setOpen)}>
          <span className="cg-chev"><Chev /></span>
          <span className="cg-kind">{c.kind}</span>
          <span className="cg-name">{c.name || <span className="un">Unnamed {c.kind.toLowerCase()}</span>}</span>
          {ready ? <span className="cg-stat done"><Chk /> Ready</span> : <span className="cg-stat todo"><Tri /> {c.unmet} left</span>}
        </button>
        <div className="pe-mk-cg-body">
          {reqUnmet.map(renderLeaf)}
          {itemsUnmet.map((it) => (
            <div className="pe-mk-itsub" key={it.key}>
              <div className="itsub-head"><span className={`nm ${it.name ? '' : 'un'}`}>{it.name || 'Unnamed item'}</span><span className="ct">{it.unmet} left</span></div>
              {it.reqs.filter((r) => !r.met).map(renderLeaf)}
            </div>
          ))}
          {doneCount > 0 && (<>
            <button className={`pe-mk-donetoggle ${dOpen ? 'open' : ''}`} onClick={() => toggle(doneOpen, c.key, setDoneOpen)}><Chev /> {dOpen ? 'Hide' : 'Show'} {doneCount} completed</button>
            {dOpen && (
              <div className="pe-mk-cg-done">
                {reqMet.map(renderLeaf)}
                {itemsDone.map((it) => (<div className="pe-mk-itsub" key={it.key}><div className="itsub-head"><span className="nm">{it.name || 'Item'}</span></div>{it.reqs.map(renderLeaf)}</div>))}
              </div>
            )}
          </>)}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`pe-mk-phead ${m.done ? 'done' : 'todo'}`}>
        <span className="pi">{m.done ? <Chk /> : <Tri />}</span>
        <span className="pt">{m.done ? 'Section ready' : 'Needs attention'}</span>
        <span className="pn">{m.done ? 'complete' : m.left + ' required'}</span>
      </div>
      <div className={`pe-mk-summary ${m.done ? 'alldone' : ''}`}>
        <span className="stxt">{m.done ? 'All set' : m.left + ' required left'}</span>
        <span className="bar"><i style={{ width: m.pct + '%' }} /></span>
      </div>

      {m.section.length > 0 && (<>
        <div className="pe-mk-region"><span className="rl">Section</span><span className="line" />{secUnmet ? <span className="rstat todo"><Tri /> {secUnmet} left</span> : <span className="rstat done"><Chk /> done</span>}</div>
        <div className={`pe-mk-secblock ${secUnmet ? '' : 'allmet'}`}>{m.section.map(renderLeaf)}</div>
      </>)}

      {m.cards.length > 0 && (<>
        <div className="pe-mk-region"><span className="rl">{plural(kind)}</span><span className="line" /><span className={`rstat ${readyCards.length === m.cards.length ? 'done' : 'count'}`}>{readyCards.length} / {m.cards.length} ready</span></div>
        {unmetCards.map(renderCard)}
        {readyCards.length > 0 && (
          <div className={`pe-mk-readydisc ${readyOpen ? 'open' : ''}`}>
            <button className="head" onClick={() => setReadyOpen((o) => !o)}><Chk /> {readyCards.length} ready {readyCards.length !== 1 ? plural(kind).toLowerCase() : kind.toLowerCase()}<span className="chev"><Chev /></span></button>
            {readyOpen && <div className="body">{readyCards.map(renderCard)}</div>}
          </div>
        )}
      </>)}
    </>
  );
}
