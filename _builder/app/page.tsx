'use client';
import { useState } from 'react';
import { WIKIS } from '../lib/wiki';
import type { Page } from '../lib/wiki';
import { Topbar } from '../components/miller/Topbar';
import { MillerView } from '../components/miller/MillerView';
import { PageEditor } from '../components/editor/PageEditor';

// The builder home: wiki switcher + Miller column view (real Taco Bell wiki from
// git). "Open & edit" on any page opens the hero + overview editor (both locked
// on every page). Page docs save to localStorage now, Supabase later.
export default function Page() {
  const wiki = WIKIS[0];
  const [editing, setEditing] = useState<Page | null>(null);
  // admin-only: which contributor access level the builder is previewed as.
  // All three behave identically for now — the seam for level-gated features.
  const [level, setLevel] = useState(1);

  return (
    <>
      <Topbar wikis={WIKIS} current={wiki} level={level} onLevel={setLevel} />
      <div id="miller">
        <MillerView wiki={wiki} onOpen={setEditing} />
      </div>
      {editing && <PageEditor page={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
