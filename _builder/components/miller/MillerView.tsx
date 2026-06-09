'use client';
import React, { useState } from 'react';
import type { Wiki } from '../../lib/wiki';
import { oneLine } from '../../lib/wiki';
import { PagePreview } from './PagePreview';

const Chev = () => (
  <span className="mil-chev"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></span>
);
const Badge = ({ status }: { status: string }) => <span className={`status-badge ${status}`}>{status}</span>;

function Row({ title, dot, hasChildren, selected, onClick }: { title: string; dot: 'cat' | 'sub' | ''; hasChildren: boolean; selected: boolean; onClick: () => void }) {
  return (
    <div className={`mil-row ${dot === 'sub' ? 'sub' : ''} ${selected ? 'sel' : ''}`} onClick={onClick}>
      <span className={`mil-dot ${dot}`} />
      <span className="mil-row-title">{oneLine(title)}</span>
      {hasChildren && <Chev />}
    </div>
  );
}

function Column({ head, children }: { head: string; children: React.ReactNode }) {
  return (
    <div className="mil-col">
      <div className="mil-col-head">{head}</div>
      <div className="mil-col-body">{children}</div>
    </div>
  );
}

export function MillerView({ wiki }: { wiki: Wiki }) {
  const [path, setPath] = useState<string[]>([]);

  const sel0 = wiki.pages.find((p) => p.id === path[0]) || null;
  const sel1 = sel0?.pages.find((p) => p.id === path[1]) || null;
  const sel2 = sel1?.pages.find((p) => p.id === path[2]) || null;
  const selected = sel2 || sel1 || sel0; // deepest selected page (all nodes are real pages)

  return (
    <div className="mil-cols">
      {/* col 0 — the wiki's top-level pages */}
      <Column head={wiki.name}>
        {wiki.pages.map((p) => (
          <Row key={p.id} title={p.title} dot="cat" hasChildren={p.pages.length > 0}
            selected={path[0] === p.id} onClick={() => setPath([p.id])} />
        ))}
      </Column>

      {/* col 1 — children of the selected top-level page */}
      {sel0 && sel0.pages.length > 0 && (
        <Column head={oneLine(sel0.title)}>
          {sel0.pages.map((p) => (
            <Row key={p.id} title={p.title} dot="sub" hasChildren={p.pages.length > 0}
              selected={path[1] === p.id} onClick={() => setPath([sel0.id, p.id])} />
          ))}
        </Column>
      )}

      {/* col 2 — children of the selected child */}
      {sel1 && sel1.pages.length > 0 && (
        <Column head={oneLine(sel1.title)}>
          {sel1.pages.map((p) => (
            <Row key={p.id} title={p.title} dot="sub" hasChildren={false}
              selected={path[2] === p.id} onClick={() => setPath([sel0!.id, sel1.id, p.id])} />
          ))}
        </Column>
      )}

      {/* preview */}
      <div className="mil-col mil-preview-col">
        <div className="mil-col-head">Preview</div>
        {selected ? (
          <div className="mil-preview-body">
            <div className="mil-preview-meta">
              <Badge status={selected.status} />
              <span className="mil-preview-name">{oneLine(selected.title)}</span>
            </div>
            <PagePreview page={selected} />
            <button className="mil-open dummy" title="The page builder isn't wired up yet" onClick={() => {}}>
              Open &amp; edit → (coming soon)
            </button>
          </div>
        ) : (
          <div className="mil-preview-body" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="mil-empty">Select a page to preview it</div>
          </div>
        )}
      </div>
    </div>
  );
}
