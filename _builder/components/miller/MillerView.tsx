'use client';
import React, { useState } from 'react';
import type { Wiki, Page } from '../../lib/wiki';
import { oneLine } from '../../lib/wiki';
import { PagePreview } from './PagePreview';

const Chev = () => (
  <span className="mil-chev"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></span>
);
const BADGE_LABEL: Record<string, string> = { live: 'live', draft: 'draft' };
const Badge = ({ status }: { status: string }) => (
  <span className={`status-badge ${status}`}>{BADGE_LABEL[status] || 'not built'}</span>
);

function Row({ page, level, selected, onClick }: { page: Page; level: number; selected: boolean; onClick: () => void }) {
  const dot = `${level === 0 ? 'cat' : 'sub'}${page.status === 'live' ? '' : page.status === 'draft' ? ' draft' : ' stub'}`;
  return (
    <div className={`mil-row ${level > 0 ? 'sub' : ''} ${selected ? 'sel' : ''}`} onClick={onClick}>
      <span className={`mil-dot ${dot}`} />
      <span className="mil-row-title">{oneLine(page.title)}</span>
      {page.count != null && <span className="mil-count">{page.count}</span>}
      {page.pages.length > 0 && <Chev />}
    </div>
  );
}

// Bottom-of-column add controls: "+ category" / "+ page" → inline title input.
// Committing the title creates the node (it becomes that page's H1) and selects it.
function ColFooter({ onAdd }: { onAdd: (kind: 'category' | 'page', title: string) => void }) {
  const [kind, setKind] = useState<'category' | 'page' | null>(null);
  const [title, setTitle] = useState('');
  const commit = () => { const t = title.trim(); if (t && kind) onAdd(kind, t); setKind(null); setTitle(''); };
  if (kind) {
    return (
      <div className="mil-add-input">
        <input
          autoFocus value={title} placeholder={kind === 'category' ? 'New category…' : 'New page…'}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setKind(null); setTitle(''); } }}
          onBlur={commit}
        />
      </div>
    );
  }
  return (
    <div className="mil-add-row">
      <button className="mil-add-btn" onClick={() => setKind('category')}>+ category</button>
      <button className="mil-add-btn" onClick={() => setKind('page')}>+ page</button>
    </div>
  );
}

function Column({ head, footer, children }: { head: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mil-col">
      <div className="mil-col-head">{head}</div>
      <div className="mil-col-body">{children}</div>
      {footer && <div className="mil-col-foot">{footer}</div>}
    </div>
  );
}

export function MillerView({ wiki, onOpen, onAddNode }: { wiki: Wiki; onOpen?: (page: Page) => void; onAddNode?: (parentId: string, kind: 'category' | 'page', title: string) => Page }) {
  const [path, setPath] = useState<string[]>([]);

  const sel0 = wiki.pages.find((p) => p.id === path[0]) || null;
  const sel1 = sel0?.pages.find((p) => p.id === path[1]) || null;
  const sel2 = sel1?.pages.find((p) => p.id === path[2]) || null;
  const selected = sel2 || sel1 || sel0; // deepest selected node

  // create a node under `parentId`, then select it in `prefix`'s next column
  const add = (prefix: string[], parentId: string, kind: 'category' | 'page', title: string) => {
    const node = onAddNode?.(parentId, kind, title);
    if (node) setPath([...prefix, node.id]);
  };
  const footer = (prefix: string[], parentId: string) =>
    onAddNode ? <ColFooter onAdd={(kind, title) => add(prefix, parentId, kind, title)} /> : undefined;

  return (
    <div className="mil-cols">
      {/* col 0 — the wiki's main category pages (from its browse/directory) */}
      <Column head={wiki.name} footer={footer([], '')}>
        {wiki.pages.map((p) => (
          <Row key={p.id} page={p} level={0} selected={path[0] === p.id} onClick={() => setPath([p.id])} />
        ))}
      </Column>

      {/* col 1 — entries within the selected category (shown once a category is picked) */}
      {sel0 && (
        <Column head={oneLine(sel0.title)} footer={footer([sel0.id], sel0.id)}>
          {sel0.pages.map((p) => (
            <Row key={p.id} page={p} level={1} selected={path[1] === p.id} onClick={() => setPath([sel0.id, p.id])} />
          ))}
        </Column>
      )}

      {/* col 2 — entries within the selected folder/entry */}
      {sel1 && (
        <Column head={oneLine(sel1.title)} footer={footer([sel0!.id, sel1.id], sel1.id)}>
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
                <div className="mil-noh">“{oneLine(selected.title)}” hasn’t been built yet.<br />Open &amp; edit starts it with a hero + overview.</div>
              </div>
            )}
            <button className="mil-open" onClick={() => onOpen?.(selected)}>
              Open &amp; edit →
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
