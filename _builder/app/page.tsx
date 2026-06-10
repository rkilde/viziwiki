'use client';
import { useEffect, useMemo, useState } from 'react';
import { WIKIS } from '../lib/wiki';
import type { Page, Wiki } from '../lib/wiki';
import { Topbar } from '../components/miller/Topbar';
import { MillerView } from '../components/miller/MillerView';
import { PageEditor } from '../components/editor/PageEditor';
import { blankWiki, blankPage, loadUserWikis, saveUserWikis, loadChildren, saveChildren, mergeWiki, type ChildOverlay } from '../lib/builder';

// The builder home: wiki switcher + Miller column view (real wikis from git +
// user-created blank wikis). "+ New wiki" makes a blank (mono base-skin) wiki;
// "+ category / + page" at the bottom of each column adds a node you title in
// place — that title becomes the H1. "Open & edit" opens the hero + overview
// editor (both locked on every page). Saved to localStorage now, Supabase later.
export default function Page() {
  const [userWikis, setUserWikis] = useState<Wiki[]>([]);
  const [children, setChildren] = useState<ChildOverlay>({});
  const [wikiId, setWikiId] = useState(WIKIS[0].id);
  const [editing, setEditing] = useState<Page | null>(null);
  // admin-only: which contributor access level the builder is previewed as.
  // All three behave identically for now — the seam for level-gated features.
  const [level, setLevel] = useState(1);

  // hydrate user-created content from localStorage (client only)
  useEffect(() => { setUserWikis(loadUserWikis()); setChildren(loadChildren()); }, []);

  const allWikis = useMemo(() => [...WIKIS, ...userWikis], [userWikis]);
  const baseWiki = allWikis.find((w) => w.id === wikiId) || WIKIS[0];
  // splice user-added nodes into the tree at render time
  const wiki = useMemo(() => mergeWiki(baseWiki, children), [baseWiki, children]);

  const addWiki = (name: string) => {
    const w = blankWiki(name);
    setUserWikis((prev) => { const next = [...prev, w]; saveUserWikis(next); return next; });
    setEditing(null);
    setWikiId(w.id);
  };
  const addNode = (parentId: string, kind: 'category' | 'page', title: string): Page => {
    const node = blankPage(title, kind === 'category');
    setChildren((prev) => {
      const key = `${baseWiki.id}::${parentId}`;
      const next = { ...prev, [key]: [...(prev[key] || []), node] };
      saveChildren(next);
      return next;
    });
    return node;
  };

  return (
    <>
      <Topbar wikis={allWikis} current={wiki} onSwitch={(w) => { setEditing(null); setWikiId(w.id); }} onNewWiki={addWiki} level={level} onLevel={setLevel} />
      <div id="miller">
        <MillerView key={wiki.id} wiki={wiki} onOpen={setEditing} onAddNode={addNode} />
      </div>
      {editing && <PageEditor page={editing} skin={baseWiki.skin} onClose={() => setEditing(null)} />}
    </>
  );
}
