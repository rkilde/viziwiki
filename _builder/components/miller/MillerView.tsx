'use client';
import React, { useState } from 'react';
import type { Wiki, Page } from '../../lib/wiki';
import { oneLine } from '../../lib/wiki';
import { dotClass, addLabel, ROOT_COLUMN_HEAD } from '../../lib/hierarchy';
import { PagePreview } from './PagePreview';

const Chev = () => (
  <span className="mil-chev"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></span>
);
const IcHome = () => (
  <svg className="mil-home-ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);

// The wiki HOME — a single special page pinned at the top of the main-category
// column (not a category itself; it's the root the categories hang off).
function HomeRow({ home, selected, onClick }: { home: Page; selected: boolean; onClick: () => void }) {
  return (
    <>
      <div className={`mil-row mil-home ${selected ? 'sel' : ''}`} onClick={onClick}>
        <IcHome />
        <span className="mil-row-title">Wiki home</span>
        <span className="mil-home-tag">home</span>
      </div>
      <div className="mil-home-divider" />
    </>
  );
}
const BADGE_LABEL: Record<string, string> = { live: 'live', draft: 'draft' };
const Badge = ({ status }: { status: string }) => (
  <span className={`status-badge ${status}`}>{BADGE_LABEL[status] || 'not built'}</span>
);

function Row({ page, level, selected, onClick }: { page: Page; level: number; selected: boolean; onClick: () => void }) {
  // role + color come from the canonical hierarchy (gold main-cat / blue
  // subcategory / neutral page), so every wiki reads the same rule.
  const dot = dotClass(level, page.pages.length > 0);
  return (
    <div className={`mil-row ${level > 0 ? 'sub' : ''} ${selected ? 'sel' : ''}`} onClick={onClick}>
      <span className={`mil-dot ${dot}`} />
      <span className="mil-row-title">{oneLine(page.title)}</span>
      {page.count != null && <span className="mil-count">{page.count}</span>}
      {page.pages.length > 0 && <Chev />}
    </div>
  );
}

// A Miller column. The add control: ONE button in the footer per the canon —
// "+ main category page" in the first column, "+ page" deeper. Clicking it drops
// an editable row IN THE LIST (where the new item lands), focused for typing;
// Enter commits (creates the node, which becomes its H1, and selects it),
// Escape/empty cancels.
function Column({ head, depth, onAdd, children }: { head: string; depth?: number; onAdd?: (title: string) => void; children: React.ReactNode }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const commit = () => { const t = title.trim(); if (t && onAdd) onAdd(t); setAdding(false); setTitle(''); };
  const cancel = () => { setAdding(false); setTitle(''); };
  const d = depth || 0;
  return (
    <div className="mil-col">
      <div className="mil-col-head">{head}</div>
      <div className="mil-col-body">
        {children}
        {adding && (
          <div className={`mil-row ${d > 0 ? 'sub' : ''} mil-add-live`}>
            <span className={`mil-dot ${dotClass(d, false)}`} />
            <input
              className="mil-add-live-input" autoFocus value={title}
              placeholder={d === 0 ? 'New main category page…' : 'New page…'}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              onBlur={commit}
            />
          </div>
        )}
      </div>
      {onAdd && !adding && (
        <div className="mil-col-foot">
          <div className="mil-add-row"><button className="mil-add-btn" onClick={() => setAdding(true)}>{addLabel(d)}</button></div>
        </div>
      )}
    </div>
  );
}

export function MillerView({ wiki, onOpen, onAddNode }: { wiki: Wiki; onOpen?: (page: Page) => void; onAddNode?: (parentId: string, title: string) => Page }) {
  const [path, setPath] = useState<string[]>([]);
  const [homeSel, setHomeSel] = useState(false);

  const sel0 = wiki.pages.find((p) => p.id === path[0]) || null;
  const sel1 = sel0?.pages.find((p) => p.id === path[1]) || null;
  const sel2 = sel1?.pages.find((p) => p.id === path[2]) || null;
  const selected = homeSel ? wiki.home : (sel2 || sel1 || sel0); // deepest selected node
  const pick = (p: string[]) => { setHomeSel(false); setPath(p); };

  // create a node under `parentId`, then select it in `prefix`'s next column
  const add = (prefix: string[], parentId: string, title: string) => {
    const node = onAddNode?.(parentId, title);
    if (node) pick([...prefix, node.id]);
  };
  const adder = (depth: number, prefix: string[], parentId: string) =>
    onAddNode ? (title: string) => add(prefix, parentId, title) : undefined;

  return (
    <div className="mil-cols">
      {/* col 0 — the wiki HOME (pinned) + the MAIN CATEGORY pages (top of canon) */}
      <Column head={ROOT_COLUMN_HEAD} depth={0} onAdd={adder(0, [], '')}>
        <HomeRow home={wiki.home} selected={homeSel} onClick={() => { setHomeSel(true); setPath([]); }} />
        {wiki.pages.map((p) => (
          <Row key={p.id} page={p} level={0} selected={!homeSel && path[0] === p.id} onClick={() => pick([p.id])} />
        ))}
      </Column>

      {/* col 1 — entries within the selected category (shown once a category is picked) */}
      {sel0 && (
        <Column head={oneLine(sel0.title)} depth={1} onAdd={adder(1, [sel0.id], sel0.id)}>
          {sel0.pages.map((p) => (
            <Row key={p.id} page={p} level={1} selected={path[1] === p.id} onClick={() => pick([sel0.id, p.id])} />
          ))}
        </Column>
      )}

      {/* col 2 — entries within the selected folder/entry */}
      {sel1 && (
        <Column head={oneLine(sel1.title)} depth={2} onAdd={adder(2, [sel0!.id, sel1.id], sel1.id)}>
          {sel1.pages.map((p) => (
            <Row key={p.id} page={p} level={2} selected={path[2] === p.id} onClick={() => pick([sel0!.id, sel1.id, p.id])} />
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
