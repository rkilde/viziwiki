'use client';
import React, { useState } from 'react';
import type { Wiki, Page } from '../../lib/wiki';
import { oneLine } from '../../lib/wiki';
import { PagePreview } from './PagePreview';

const Chev = () => (
  <span className="mil-chev"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></span>
);
const Badge = ({ status }: { status: string }) => (
  <span className={`status-badge ${status}`}>{status === 'live' ? 'live' : 'not built'}</span>
);

function Row({ page, level, selected, onClick }: { page: Page; level: number; selected: boolean; onClick: () => void }) {
  const built = page.status === 'live';
  const dot = `${level === 0 ? 'cat' : 'sub'}${built ? '' : ' stub'}`;
  return (
    <div className={`mil-row ${level > 0 ? 'sub' : ''} ${selected ? 'sel' : ''}`} onClick={onClick}>
      <span className={`mil-dot ${dot}`} />
      <span className="mil-row-title">{oneLine(page.title)}</span>
      {page.count != null && <span className="mil-count">{page.count}</span>}
      {page.pages.length > 0 && <Chev />}
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
  const selected = sel2 || sel1 || sel0; // deepest selected node

  return (
    <div className="mil-cols">
      {/* col 0 — the wiki's main category pages (from its browse/directory) */}
      <Column head={wiki.name}>
        {wiki.pages.map((p) => (
          <Row key={p.id} page={p} level={0} selected={path[0] === p.id} onClick={() => setPath([p.id])} />
        ))}
      </Column>

      {/* col 1 — entries within the selected category */}
      {sel0 && sel0.pages.length > 0 && (
        <Column head={oneLine(sel0.title)}>
          {sel0.pages.map((p) => (
            <Row key={p.id} page={p} level={1} selected={path[1] === p.id} onClick={() => setPath([sel0.id, p.id])} />
          ))}
        </Column>
      )}

      {/* col 2 — entries within the selected folder/entry */}
      {sel1 && sel1.pages.length > 0 && (
        <Column head={oneLine(sel1.title)}>
          {sel1.pages.map((p) => (
            <Row key={p.id} page={p} level={2} selected={path[2] === p.id} onClick={() => setPath([sel0!.id, sel1.id, p.id])} />
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
            {selected.permalink ? (
              <PagePreview page={selected} />
            ) : (
              <div className="mil-preview-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="mil-noh">“{oneLine(selected.title)}” is a directory entry that hasn’t been built yet.<br />Open &amp; edit would create it.</div>
              </div>
            )}
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
