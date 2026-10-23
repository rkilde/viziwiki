'use client';
import { useEffect, useMemo, useState } from 'react';
import { WIKIS } from '../lib/wiki';
import type { Page, Wiki } from '../lib/wiki';
import { Topbar } from '../components/miller/Topbar';
import { MillerView } from '../components/miller/MillerView';
import { PageEditor } from '../components/editor/PageEditor';
import { blankWiki, blankPage, loadUserWikis, saveUserWikis, loadChildren, saveChildren, mergeWiki, type ChildOverlay } from '../lib/builder';
import { AccountChip } from '../components/AccountChip';
import { onAuth, fetchProfile, type Profile, type ContributorClass } from '../lib/auth';
import { capsFor } from '../lib/caps.mjs';
import type { EditCaps } from '../lib/canvas';

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
  // phase-2 roles: the signed-in account + its profile (role/class), and the
  // admin-only "view as" preview (the old level seam, now real)
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewAs, setViewAs] = useState<string>('me');

  // hydrate user-created content from localStorage (client only) + auth state
  useEffect(() => { setUserWikis(loadUserWikis()); setChildren(loadChildren()); }, []);
  useEffect(() => onAuth((email) => {
    setAuthEmail(email);
    if (email) fetchProfile().then(setProfile); else setProfile(null);
  }), []);

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
  const addNode = (parentId: string, title: string): Page => {
    const node = blankPage(title);
    setChildren((prev) => {
      const key = `${baseWiki.id}::${parentId}`;
      const next = { ...prev, [key]: [...(prev[key] || []), node] };
      saveChildren(next);
      return next;
    });
    return node;
  };

  // effective capabilities for THIS wiki: the profile's role/class, with the
  // curator's wiki boundary applied (their wiki = full curator; any other
  // wiki = read-only), and the admin's "view as" preview on top.
  const role = profile?.role ?? 'viewer';
  const cls = (profile?.class ?? null) as ContributorClass | null;
  const caps: EditCaps = useMemo(() => {
    if (role === 'admin' && viewAs !== 'me') {
      return viewAs === 'viewer' ? capsFor('viewer', null) : capsFor('contributor', viewAs);
    }
    if (role === 'contributor' && cls === 'curator' && profile?.wiki_id && profile.wiki_id !== baseWiki.id) {
      return capsFor('viewer', null);   // curators are viewers outside their wiki
    }
    return capsFor(role, cls);
  }, [role, cls, viewAs, profile?.wiki_id, baseWiki.id]);

  const account = (
    <>
      <AccountChip email={authEmail} profile={profile} />
      {role === 'admin' && (
        <select className="vt-btn acct-viewas" title="Preview the builder as a class" value={viewAs} onChange={(e) => setViewAs(e.target.value)}>
          <option value="me">view as: admin</option>
          <option value="curator">curator</option>
          <option value="designer">designer</option>
          <option value="writer">writer</option>
          <option value="viewer">viewer</option>
        </select>
      )}
    </>
  );

  return (
    <>
      <Topbar wikis={allWikis} current={wiki} onSwitch={(w) => { setEditing(null); setWikiId(w.id); }} onNewWiki={addWiki} account={account} />
      <div id="miller">
        <MillerView key={wiki.id} wiki={wiki} onOpen={setEditing} onAddNode={addNode} />
      </div>
      {editing && <PageEditor key={`${editing.id}:${JSON.stringify(caps)}`} page={editing} skin={baseWiki.skin} wikiMeta={{ id: baseWiki.id, slug: baseWiki.id, name: baseWiki.name, skin: baseWiki.skin.bodyClass }} caps={caps} onClose={() => setEditing(null)} />}
    </>
  );
}
