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

  const cat = wiki.categories.find((c) => c.id === path[0]) || null;
  const page1 = cat?.pages.find((p) => p.id === path[1]) || null;
  const page2 = page1?.pages.find((p) => p.id === path[2]) || null;
  const selected = page2 || page1; // deepest selected real page

  return (
    <div className="mil-cols">
      {/* col 0 — categories */}
      <Column head={wiki.name}>
        {wiki.categories.map((c) => (
          <Row key={c.id} title={c.title} dot="cat" hasChildren={c.pages.length > 0}
            selected={path[0] === c.id} onClick={() => setPath([c.id])} />
        ))}
      </Column>

      {/* col 1 — pages of the selected category */}
      {cat && (
        <Column head={cat.title}>
          {cat.pages.map((p) => (
            <Row key={p.id} title={p.title} dot="" hasChildren={p.pages.length > 0}
              selected={path[1] === p.id} onClick={() => setPath([cat.id, p.id])} />
          ))}
        </Column>
      )}

      {/* col 2 — subpages of the selected page */}
      {page1 && page1.pages.length > 0 && (
        <Column head={oneLine(page1.title)}>
          {page1.pages.map((p) => (
            <Row key={p.id} title={p.title} dot="sub" hasChildren={false}
              selected={path[2] === p.id} onClick={() => setPath([cat!.id, page1.id, p.id])} />
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
