'use client';
import { useEffect, useMemo, useState } from 'react';
import { WIKIS } from '../lib/wiki';
import type { Page, Wiki } from '../lib/wiki';
import { Topbar } from '../components/miller/Topbar';
import { MillerView } from '../components/miller/MillerView';
import { PageEditor } from '../components/editor/PageEditor';
import { blankPage, loadUserWikis, loadChildren, saveChildren, mergeWiki, wikiFromMeta, pageFromMeta, type ChildOverlay } from '../lib/builder';
import { contentStore, type WikiMeta } from '../content-store';
import { OriginateWiki } from '../components/OriginateWiki';
import { ManageCategories } from '../components/ManageCategories';
import { WikiIdentity } from '../components/WikiIdentity';
import { AccountChip } from '../components/AccountChip';
import { onAuth, fetchProfile, type Profile, type ContributorClass } from '../lib/auth';
import { capsFor, grantedWikiIds, canApprove } from '../lib/caps.mjs';
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
  // the origination arc: ORIGINATED (cloud) wikis + their pages, and the modal
  const [cloudWikis, setCloudWikis] = useState<Wiki[]>([]);
  const [cloudPages, setCloudPages] = useState<Record<string, Page[]>>({});
  const [originating, setOriginating] = useState(false);
  const [managingTags, setManagingTags] = useState(false);     // admin: the category manager
  const [editingIdentity, setEditingIdentity] = useState(false); // current wiki's identity editor

  // hydrate user-created content from localStorage (client only) + auth state
  useEffect(() => { setUserWikis(loadUserWikis()); setChildren(loadChildren()); }, []);
  // originated wikis come from the content store (rows beyond the extracted
  // flagships) — they exist for every account; the grant filter below decides
  // who sees which
  // wiki MARKS (migration 0009) for EVERY row — flagships included, since their
  // dashboard entries come from the static extraction, not the DB row
  const [wikiIcons, setWikiIcons] = useState<Record<string, Wiki['icon']>>({});
  const refreshCloudWikis = () => {
    if (!contentStore) return;
    contentStore.listWikis()
      .then((rows) => {
        setWikiIcons(Object.fromEntries(rows.map((r) => [r.id, r.icon as Wiki['icon']])));
        setCloudWikis(rows
          .filter((r) => !WIKIS.some((w) => w.id === r.id))
          // live wikis first (the ones with work in them), then the coming-soon
          // directory seeds, A–Z within each
          .sort((a, b) => (a.status === 'coming_soon' ? 1 : 0) - (b.status === 'coming_soon' ? 1 : 0) || a.name.localeCompare(b.name))
          .map((r) => wikiFromMeta(r.id, r.name, r.status, r.icon as Wiki['icon'])));
      })
      .catch(() => {});
  };
  useEffect(refreshCloudWikis, []);
  useEffect(() => onAuth((email) => {
    setAuthEmail(email);
    if (email) fetchProfile().then(setProfile); else setProfile(null);
  }), []);

  // ── wiki VISIBILITY (the owner's rule: no grant → no wikis) ──
  // admin sees all (+ their local experiments); a wiki_master sees only their
  // wiki; writer/designer hold a platform-wide grant (all wikis) until
  // per-wiki memberships exist; viewer / ungranted / signed-out see NONE.
  // The admin "view as" preview applies to visibility too.
  const realRole = profile?.role ?? 'viewer';
  const realClass = (profile?.class ?? null) as ContributorClass | null;
  const grantRole = realRole === 'admin' && viewAs !== 'me' ? (viewAs === 'viewer' ? 'viewer' : 'contributor') : realRole;
  const grantClass = grantRole === 'contributor' ? (realRole === 'admin' && viewAs !== 'me' ? (viewAs as ContributorClass) : realClass) : null;
  const allWikis = useMemo(() => {
    const statics = WIKIS.map((w) => (wikiIcons[w.id] ? { ...w, icon: wikiIcons[w.id] } : w));
    return realRole === 'admin' ? [...statics, ...cloudWikis, ...userWikis] : [...statics, ...cloudWikis];
  }, [userWikis, cloudWikis, wikiIcons, realRole]);
  const shownWikis = useMemo(() => {
    const ids = grantedWikiIds(grantRole, grantClass, profile?.wiki_id ?? null, allWikis.map((w) => w.id));
    return allWikis.filter((w) => ids.includes(w.id));
  }, [grantRole, grantClass, profile?.wiki_id, allWikis]);
  // keep the selected wiki inside the granted set
  useEffect(() => {
    if (shownWikis.length && !shownWikis.some((w) => w.id === wikiId)) { setEditing(null); setWikiId(shownWikis[0].id); }
  }, [shownWikis, wikiId]);
  const baseWiki = shownWikis.find((w) => w.id === wikiId) || shownWikis[0] || null;
  // a selected ORIGINATED wiki loads its pages from the content store (once),
  // so its tree survives devices and sessions — unlike the localStorage overlay
  const isCloudWiki = !!baseWiki && cloudWikis.some((w) => w.id === baseWiki.id);
  useEffect(() => {
    if (!contentStore || !baseWiki || !isCloudWiki || cloudPages[baseWiki.id]) return;
    contentStore.listPages(baseWiki.id)
      .then((rows) => setCloudPages((prev) => ({ ...prev, [baseWiki.id]: rows.filter((r) => r.id !== `${baseWiki.id}-home`).map(pageFromMeta) })))
      .catch(() => {});
  }, [baseWiki, isCloudWiki, cloudPages]);
  // splice user-added nodes into the tree at render time (+ the cloud pages of
  // an originated wiki, deduped — a node added here and saved comes back from
  // the store under the same id on the next load)
  const wiki = useMemo(() => {
    if (!baseWiki) return null;
    const merged = mergeWiki(baseWiki, children);
    const cloud = cloudPages[baseWiki.id] || [];
    if (!cloud.length) return merged;
    const have = new Set(merged.pages.map((p) => p.id));
    return { ...merged, pages: [...merged.pages, ...cloud.filter((p) => !have.has(p.id))] };
  }, [baseWiki, children, cloudPages]);

  const onOriginated = (meta: WikiMeta) => {
    setOriginating(false);
    setCloudWikis((prev) => (prev.some((w) => w.id === meta.id) ? prev : [...prev, wikiFromMeta(meta.id, meta.name)]));
    setEditing(null);
    setWikiId(meta.id);
  };
  const addNode = (parentId: string, title: string): Page => {
    const node = blankPage(title);
    setChildren((prev) => {
      const key = `${baseWiki!.id}::${parentId}`;
      const next = { ...prev, [key]: [...(prev[key] || []), node] };
      saveChildren(next);
      return next;
    });
    return node;
  };

  // effective capabilities for THIS wiki: the profile's role/class, with the
  // wiki_master's wiki boundary applied (their wiki = full wiki_master; any other
  // wiki = read-only), and the admin's "view as" preview on top.
  const caps: EditCaps = useMemo(() => {
    if (realRole === 'admin' && viewAs !== 'me') {
      return viewAs === 'viewer' ? capsFor('viewer', null) : capsFor('contributor', viewAs);
    }
    if (realRole === 'contributor' && realClass === 'wiki_master' && profile?.wiki_id && profile.wiki_id !== baseWiki?.id) {
      return capsFor('viewer', null);   // wiki_masters are viewers outside their wiki
    }
    return capsFor(realRole, realClass);
  }, [realRole, realClass, viewAs, profile?.wiki_id, baseWiki?.id]);

  // who may edit the CURRENT wiki's identity: admin, or its wiki master
  const canEditIdentity = !!baseWiki && !!contentStore && (
    realRole === 'admin' ||
    (realRole === 'contributor' && realClass === 'wiki_master' && profile?.wiki_id === baseWiki.id));

  const account = (
    <>
      {realRole === 'admin' && contentStore && (
        <button className="vt-btn" title="Manage the wiki category tags (admin)" onClick={() => setManagingTags(true)}>Tags</button>
      )}
      <AccountChip email={authEmail} profile={profile} />
      {realRole === 'admin' && (
        <select className="vt-btn acct-viewas" title="Preview the builder as a class" value={viewAs} onChange={(e) => setViewAs(e.target.value)}>
          <option value="me">view as: admin</option>
          <option value="wiki_master">wiki master</option>
          <option value="designer">designer</option>
          <option value="writer">writer</option>
          <option value="viewer">viewer</option>
        </select>
      )}
    </>
  );

  return (
    <>
      <Topbar wikis={shownWikis} current={wiki || undefined} onSwitch={(w) => { setEditing(null); setWikiId(w.id); }} onNewWiki={realRole === 'admin' ? () => setOriginating(true) : undefined} onEditIdentity={canEditIdentity ? () => setEditingIdentity(true) : undefined} account={account} />
      {originating && <OriginateWiki existingIds={allWikis.map((w) => w.id)} onClose={() => setOriginating(false)} onCreated={onOriginated} />}
      {managingTags && <ManageCategories onClose={() => setManagingTags(false)} />}
      {editingIdentity && baseWiki && <WikiIdentity wikiId={baseWiki.id} wikiName={baseWiki.name} onClose={() => setEditingIdentity(false)} onSaved={refreshCloudWikis} />}
      {wiki && baseWiki ? (
        <>
          <div id="miller">
            <MillerView key={wiki.id} wiki={wiki} onOpen={setEditing} onAddNode={caps.structure ? addNode : undefined} />
          </div>
          {editing && <PageEditor key={`${editing.id}:${JSON.stringify(caps)}`} page={editing} skin={baseWiki.skin} wikiMeta={{ id: baseWiki.id, slug: baseWiki.id, name: baseWiki.name, skin: baseWiki.skin.bodyClass }} caps={caps}
            canApprove={realRole === 'admin' && viewAs !== 'me'
              ? viewAs === 'wiki_master'   // preview honors the previewed class
              : canApprove(realRole, realClass, profile?.wiki_id ?? null, baseWiki.id)}
            onClose={() => setEditing(null)} />}
        </>
      ) : (
        <div className="no-grant">
          <div className="no-grant-title">No wikis granted{authEmail ? '' : ' — sign in'}</div>
          <div className="no-grant-body">
            {authEmail
              ? 'This account holds no grant yet. An admin can grant a class — writer (prose), designer (visuals), or wiki_master (a whole wiki) — and the granted wikis will appear here.'
              : 'Sign in (top right) to see the wikis your account has been granted access to.'}
          </div>
        </div>
      )}
    </>
  );
}
