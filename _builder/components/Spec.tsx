'use client';
import React from 'react';
import { Editable } from './Editable';

// Mirrors the `spec` component schema in _data/grammar.yml.
export type SpecRow = { key: string; value: string };
export type SpecCard = { title: string; icon?: string; rows: SpecRow[] };
export type SpecData = {
  heading: string;
  device: string;
  tone: 'a' | 'b' | 'special';
  cards: SpecCard[];
};

const FileText = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

/**
 * The spec card grid — the SAME markup the published bank emits, but every text
 * node is an <Editable> and the structure can grow/shrink. One renderer; data in,
 * live editable component out. `onChange` hands the new data up to the page.
 */
export function Spec({ data, onChange }: { data: SpecData; onChange: (d: SpecData) => void }) {
  const update = (mut: (draft: SpecData) => void) => {
    const next = structuredClone(data);
    mut(next);
    onChange(next);
  };

  return (
    <section className="spec" data-tone={data.tone}>
      <div className="spec-eyebrow">
        <FileText /> Specifications Sheet
        <span style={{ flex: 1 }} />
        <button
          className="mini"
          title="Toggle dark / light band"
          onClick={() => update((d) => { d.tone = d.tone === 'special' ? 'a' : 'special'; })}
        >
          {data.tone === 'special' ? 'dark' : 'light'}
        </button>
      </div>

      <h2 className="spec-heading">
        <Editable value={data.heading} onCommit={(v) => update((d) => { d.heading = v; })} />
      </h2>
      <div className="spec-sub">
        <Editable value={data.device} onCommit={(v) => update((d) => { d.device = v; })} />
      </div>

      <div className="spec-grid">
        {data.cards.map((card, ci) => (
          <div className="spec-card" key={ci}>
            <div className="spec-card-head">
              <FileText />
              <Editable value={card.title} onCommit={(v) => update((d) => { d.cards[ci].title = v; })} />
              <span className="card-tools">
                <button className="mini" title="Remove card" onClick={() => update((d) => { d.cards.splice(ci, 1); })}>×</button>
              </span>
            </div>
            <dl className="spec-list">
              {card.rows.map((row, ri) => (
                <div className="spec-row" key={ri}>
                  <dt className="spec-k">
                    <Editable value={row.key} onCommit={(v) => update((d) => { d.cards[ci].rows[ri].key = v; })} />
                  </dt>
                  <dd className="spec-v">
                    <Editable value={row.value} onCommit={(v) => update((d) => { d.cards[ci].rows[ri].value = v; })} />
                    <span className="row-tools">
                      <button className="mini" title="Remove row" onClick={() => update((d) => { d.cards[ci].rows.splice(ri, 1); })}>×</button>
                    </span>
                  </dd>
                </div>
              ))}
              <button
                className="mini"
                onClick={() => update((d) => { d.cards[ci].rows.push({ key: 'Key', value: 'Value' }); })}
              >+ row</button>
            </dl>
          </div>
        ))}
        <button
          className="add-card"
          onClick={() => update((d) => { d.cards.push({ title: 'New card', rows: [{ key: 'Key', value: 'Value' }] }); })}
        >+ card</button>
      </div>
    </section>
  );
}
