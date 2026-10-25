'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Wiki, Page } from '../../lib/wiki';
import { oneLine } from '../../lib/wiki';
import { ROOT_COLUMN_HEAD, dotClass } from '../../lib/hierarchy';
import { LivePage } from './LivePage';
import { PageEmblemSheet } from './PageEmblemSheet';
import { TagIcon, useLucide } from '../identity/kit';
import type { LucideLib } from '../LucidePicker';
import type { PageIcon } from '../../content-store';

/* ════════════════════════════════════════════════════════════════════
   THE CANVAS TREE — the build kit's main page organizer (replaces the
   Miller columns; ported from the owner's v12 design handback).
   Pages hang downward as paper sheets: the front page → its categories →
   the pages of the one open category. Only one branch is open at a time.
   · LEFT rail (where the main-category column lived): the wiki identity
     button first, then the category quick-nav.
   · RIGHT rail: PURELY the live page — the selected page rendered through
     the repo's own includes (LivePage), scrolled by the rail itself, with
     the one pinned action. No completion/progress info (owner's rule).
   ════════════════════════════════════════════════════════════════════ */

const STATUS: Record<string, string> = { live: 'Live', draft: 'Draft', review: 'In review', stub: 'Not started' };

/* ── derived tree helpers — everything reads the real Wiki/Page tree ── */
const kidsOf = (wiki: Wiki, p: Page): Page[] => (p.id === wiki.home.id ? wiki.pages : p.pages || []);
const descend = (p: Page): Page[] => [p, ...(p.pages || []).flatMap(descend)];
const allPages = (wiki: Wiki): Page[] => [wiki.home, ...wiki.pages.flatMap(descend)];
const findPage = (wiki: Wiki, id: string): Page | null => allPages(wiki).find((p) => p.id === id) || null;
const parentOf = (wiki: Wiki, id: string): Page | null => {
  if (id === wiki.home.id) return null;
  if (wiki.pages.some((c) => c.id === id)) return wiki.home;
  return allPages(wiki).find((p) => (p.pages || []).some((c) => c.id === id)) || null;
};
const trailTo = (wiki: Wiki, id: string): Page[] => {
  const out: Page[] = [];
  let c = findPage(wiki, id);
  while (c) { out.unshift(c); c = parentOf(wiki, c.id); }
  return out;
};
// a page's state, from REAL data only: no sections yet → empty; built → its
// publication status colors the strip (live = green, in-progress = amber)
type NodeState = 'none' | 'todo' | 'ok';
const stateOf = (p: Page): NodeState => ((p.sections || []).length === 0 ? 'none' : p.status === 'live' ? 'ok' : 'todo');
const branchOpen = (p: Page): number => descend(p).filter((x) => stateOf(x) !== 'ok').length;
const needWork = (wiki: Wiki): Page[] => allPages(wiki).filter((p) => p.id !== wiki.home.id && stateOf(p) !== 'ok');

type Words = { k: string; t: string };
const leafWords = (p: Page): Words => {
  const st = stateOf(p);
  return st === 'none' ? { k: '', t: 'Empty' } : st === 'todo' ? { k: 'todo', t: STATUS[p.status] || 'Draft' } : { k: 'ok', t: 'Live' };
};
const branchWords = (wiki: Wiki, p: Page): Words => {
  if (!kidsOf(wiki, p).length) return leafWords(p);
  const n = branchOpen(p);   // descendants (self included) not yet built/live
  return n ? { k: 'todo', t: `${n} unfinished in here` } : { k: 'ok', t: 'all built' };
};

/* ── the sheet: a page drawn as the paper document it is ── */
// section band shapes by the section's REAL canon type
const bandOf = (type: string, i: number) => {
  if (type === 'catalog' || type === 'photo-rail') return (
    <span key={i}><i className="pg-lbl" /><span className="pg-grid"><i /><i /><i /><i /></span></span>);
  if (type === 'timeline' || type === 'os-section') return (
    <span key={i}><span className="pg-spine"><i style={{ left: '6%' }} /><i style={{ left: '34%' }} /><i style={{ left: '62%' }} /><i style={{ left: '90%' }} /></span></span>);
  if (type === 'spec' || type === 'config' || type === 'delta') return (
    <span key={i}><i className="pg-lbl" /><span className="pg-grid"><i /><i /></span></span>);
  return <span key={i}><i className="pg-ln" /><i className="pg-ln" /><i className="pg-ln s" /></span>;
};

// the chip row: up to five children, each colored by its own state — a branch
// shows its health before you open it
function NestRow({ wiki, p }: { wiki: Wiki; p: Page }) {
  const kids = kidsOf(wiki, p);
  if (!kids.length) return null;
  const show = kids.slice(0, 5), more = kids.length - show.length;
  const w = show.length * 10 + (show.length - 1) * 4;
  return (
    <span className="nest">
      <i className="stem" />
      <span className="rail-ln" style={{ left: `calc(50% - ${w / 2}px)`, width: w }} />
      {show.map((k, i) => <i key={i} className={`chip ${stateOf(k)}`} />)}
      {more > 0 && <span className="more">+{more}</span>}
    </span>
  );
}

function Sheet({ wiki, p, h }: { wiki: Wiki; p: Page; h: number }) {
  if (!(p.sections || []).length) {
    return (<><span className="paper blank" style={{ height: h }}><span>+</span></span><NestRow wiki={wiki} p={p} /></>);
  }
  const others = (p.sections || []).filter((s) => s.type !== 'hero').slice(0, 3);
  const hasHero = (p.sections || []).some((s) => s.type === 'hero');
  const stats = hasHero && p.hero?.stats?.length ? p.hero.stats.slice(0, 4) : [];
  const title = oneLine(p.hero?.title || p.title || '');
  const st = stateOf(p);
  return (
    <>
      <span className="paper" style={{ height: h }}>
        <i className="fold" />
        <span className="pg">
          <span className="pg-hero">
            <i className="pg-eye" /><i className="pg-ttl" />{title.length > 14 && <i className="pg-ttl two" />}
            {stats.length > 0 && <span className="pg-stats">{stats.map((_, i) => <i key={i} />)}</span>}
          </span>
          <span className="pg-body">{others.map((s, i) => bandOf(s.type, i))}</span>
        </span>
        <i className={`strip ${st === 'none' ? '' : st}`} />
      </span>
      <NestRow wiki={wiki} p={p} />
    </>
  );
}

/* ── layout — the real geometry, in unscaled coordinates (v12 port) ── */
const ROOT = { w: 120, ph: 130 }, CAT = { w: 112, ph: 110 }, PAGE_SPEC = { w: 94, ph: 96 }, CAPH = 56, GAP = 10;
const NEST = 25;
const hOf = (s: { ph: number }) => s.ph + NEST + GAP + CAPH;
const LANE = 140, LANE_W = 720, MAXROW = 6;
const ZOOMS = [0.5, 0.62, 0.75, 0.88, 1];
const KEEP = 160;

type PlacedNode = { kind: 'node'; p: Page; x: number; y: number; w: number; h: number; cls: string; words: Words; here: boolean }
  | { kind: 'add'; addKind: 'cat' | 'page'; parentId: string; x: number; y: number; w: number; h: number; label: string };
type Link = { d: string; cls: string };
type Layout = { W: number; H: number; nodes: PlacedNode[]; links: Link[]; caps: Array<{ top: number; label: string }> };

function computeLayout(wiki: Wiki, rootId: string, focusId: string | null, selId: string, onlyTodo: boolean, canAdd: boolean): Layout {
  const homeId = wiki.home.id;
  const root = findPage(wiki, rootId) || wiki.home;
  const cats = kidsOf(wiki, root);
  const focus = focusId ? cats.find((c) => c.id === focusId) || null : null;
  const kids = focus ? kidsOf(wiki, focus) : [];
  const W = LANE + LANE_W;
  const ADD = { __add: true } as any;

  const place = (items: any[], spec: { w: number; ph: number }, gap: number, y: number) => {
    const per = Math.max(1, Math.min(MAXROW, Math.floor((LANE_W + gap) / (spec.w + gap))));
    const rows: any[][] = [];
    for (let i = 0; i < items.length; i += per) rows.push(items.slice(i, i + per));
    const out: Array<{ p: any; x: number; y: number }> = [];
    let ry = y;
    rows.forEach((row) => {
      const total = row.length * spec.w + (row.length - 1) * gap;
      const sx = LANE + Math.max(0, (LANE_W - total) / 2);
      row.forEach((it, i) => out.push({ p: it, x: sx + i * (spec.w + gap), y: ry }));
      ry += hOf(spec) + 26;
    });
    return { out, bottom: ry - 26 };
  };

  const rootY = 18, rootX = LANE + (LANE_W - ROOT.w) / 2;
  const catY = rootY + hOf(ROOT) + 58;
  const catItems = canAdd ? [...cats, ADD] : [...cats];
  const catsP = place(catItems, CAT, 28, catY);
  const pageY = catsP.bottom + 64;
  const kidItems = focus ? (canAdd ? [...kids, ADD] : [...kids]) : [];
  const kidsP = focus ? place(kidItems, PAGE_SPEC, 18, pageY) : { out: [], bottom: pageY };
  const H = (focus ? kidsP.bottom : catsP.bottom) + 20;

  const trail = trailTo(wiki, selId).map((p) => p.id);
  const links: Link[] = [];
  const nodes: PlacedNode[] = [];

  const rootWords = root.id === homeId
    ? (needWork(wiki).length ? { k: 'todo', t: `${needWork(wiki).length} unfinished in here` } : { k: 'ok', t: 'all built' })
    : branchWords(wiki, root);
  nodes.push({ kind: 'node', p: root, x: rootX, y: rootY, w: ROOT.w, h: ROOT.ph,
    cls: 'root ' + (trail.includes(root.id) ? 'trail ' : '') + (selId === root.id ? 'here' : ''),
    words: rootWords, here: selId === root.id });
  const foot0 = { x: rootX + ROOT.w / 2, y: rootY + hOf(ROOT) };

  catsP.out.forEach(({ p, x, y }) => {
    const cx = x + CAT.w / 2;
    if (p.__add) {
      links.push({ cls: 'add', d: `M${foot0.x},${foot0.y} C${foot0.x},${foot0.y + 36} ${cx},${y - 36} ${cx},${y}` });
      nodes.push({ kind: 'add', addKind: root.id === homeId ? 'cat' : 'page', parentId: root.id, x, y, w: CAT.w, h: CAT.ph,
        label: root.id === homeId ? 'New category' : 'New page' });
      return;
    }
    const page = p as Page;
    const isFocus = !!focus && page.id === focus.id, onTrail = trail.includes(page.id);
    links.push({ cls: onTrail ? 'lit' : '', d: `M${foot0.x},${foot0.y} C${foot0.x},${foot0.y + 36} ${cx},${y - 36} ${cx},${y}` });
    const catFade = onlyTodo && branchOpen(page) === 0 ? 'fade ' : '';
    nodes.push({ kind: 'node', p: page, x, y, w: CAT.w, h: CAT.ph,
      cls: (onTrail ? 'trail ' : '') + (isFocus ? '' : 'dim ') + catFade + (selId === page.id ? 'here' : ''),
      words: branchWords(wiki, page), here: selId === page.id });
    if (isFocus) {
      const foot = { x: cx, y: y + hOf(CAT) };
      kidsP.out.forEach((k) => {
        const kx = k.x + PAGE_SPEC.w / 2;
        if (k.p.__add) {
          links.push({ cls: 'add', d: `M${foot.x},${foot.y} C${foot.x},${foot.y + 38} ${kx},${k.y - 38} ${kx},${k.y}` });
          nodes.push({ kind: 'add', addKind: 'page', parentId: focus!.id, x: k.x, y: k.y, w: PAGE_SPEC.w, h: PAGE_SPEC.ph, label: 'New page' });
          return;
        }
        const kp = k.p as Page;
        const onT = trail.includes(kp.id);
        links.push({ cls: onT ? 'lit' : '', d: `M${foot.x},${foot.y} C${foot.x},${foot.y + 38} ${kx},${k.y - 38} ${kx},${k.y}` });
        const kidFade = onlyTodo && stateOf(kp) === 'ok' && !((kp.pages || []).length && branchOpen(kp)) ? 'fade ' : '';
        nodes.push({ kind: 'node', p: kp, x: k.x, y: k.y, w: PAGE_SPEC.w, h: PAGE_SPEC.ph,
          cls: (onT ? 'trail ' : '') + kidFade + (selId === kp.id ? 'here' : ''),
          words: branchWords(wiki, kp), here: selId === kp.id });
      });
    }
  });

  const caps = [
    { top: rootY + 46, label: 'The front page' },
    { top: catY + 46, label: root.id === homeId ? 'Its categories' : `Pages in ${oneLine(root.title)}` },
  ];
  if (focus) caps.push({ top: pageY + 46, label: `Pages in ${oneLine(focus.title)}` });
  return { W, H, nodes, links, caps };
}

/* ── icons ── */
const Svg = ({ d, w = 2 }: { d: React.ReactNode; w?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{d}</svg>);
const IcFwd = <polyline points="9 18 15 12 9 6" />;
const IcPencil = <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></>;
const IcIdentity = <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></>;
const IcHome = <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>;

/* the wiki's EMBLEM mark (the icon slot, migration 0009): art image →
   sprite glyph → auto letter. The sprite is injected once by the Topbar. */
function WikiEmblemMark({ wiki }: { wiki: Wiki }) {
  const ic = wiki.icon;
  if (ic?.kind === 'art' && ic.src) return <span className="cvt-mark"><img src={ic.src} alt="" /></span>;
  if (ic?.kind === 'glyph' && ic.name) return <span className="cvt-mark"><svg><use href={`#ic-${ic.name}`} /></svg></span>;
  return <span className="cvt-mark">{((wiki.name || '?').trim()[0] || '?').toUpperCase()}</span>;
}

/* a left-rail nav row, RECURSIVE: the row body navigates the map; the
   chevron (holders only) expands the branch's sub pages in place. Dots come
   from the canonical hierarchy (lib/hierarchy). */
function NavRow({ p, depth, wiki, selId, focusId, expanded, onToggle, onNav }: {
  p: Page; depth: number; wiki: Wiki; selId: string; focusId: string | null;
  expanded: Record<string, boolean>; onToggle: (id: string) => void; onNav: (id: string) => void;
}) {
  const kids = kidsOf(wiki, p);
  const open = !!expanded[p.id];
  return (
    <>
      <div className={`cvt-nav ${selId === p.id ? 'sel' : ''} ${focusId === p.id && selId !== p.id ? 'on' : ''}`}>
        <button className="cvt-nav-main" style={{ paddingLeft: 9 + depth * 15 }} onClick={() => onNav(p.id)}>
          <span className={`cvt-dot ${dotClass(depth, kids.length > 0)}`} />
          <span className="cvt-nav-nm">{oneLine(p.title)}</span>
          {kids.length > 0 && !open && <span className="cvt-nav-n">{kids.length}</span>}
        </button>
        {kids.length > 0 && (
          <button className={`cvt-exp ${open ? 'open' : ''}`} onClick={() => onToggle(p.id)}
            aria-label={open ? `Collapse ${oneLine(p.title)}` : `Expand ${oneLine(p.title)}`}>
            <Svg d={IcFwd} w={2.6} />
          </button>
        )}
      </div>
      {open && kids.map((k) => (
        <NavRow key={k.id} p={k} depth={depth + 1} wiki={wiki} selId={selId} focusId={focusId}
          expanded={expanded} onToggle={onToggle} onNav={onNav} />
      ))}
    </>
  );
}

/* the PAGE's emblem mark in the right rail: its own art, a library glyph, or
   (when it has none) the dashed "+" slot that adds one */
function PageMarkView({ icon, lib }: { icon: PageIcon | null; lib: LucideLib | null }) {
  if (icon?.kind === 'art' && icon.src) return <span className="cvt-mark pg"><img src={icon.src} alt="" /></span>;
  if (icon?.kind === 'glyph' && icon.name) return <span className="cvt-mark pg"><TagIcon name={icon.name} lib={lib} /></span>;
  return <span className="cvt-mark pg add">+</span>;
}

/* ════════════════════════ the component ════════════════════════ */
export function CanvasTree({ wiki, onOpen, onAddNode, onEditIdentity, onEditEmblem, canEditPageEmblem = false }: {
  wiki: Wiki;
  onOpen?: (page: Page) => void;
  onAddNode?: (parentId: string, title: string) => Page;
  onEditIdentity?: () => void;
  /** opens the identity editor straight on the master wiki-emblem screen */
  onEditEmblem?: () => void;
  /** design capability + cloud store present: the rail's page-emblem slot edits */
  canEditPageEmblem?: boolean;
}) {
  const homeId = wiki.home.id;
  const [rootId, setRootId] = useState(homeId);
  const [focusId, setFocusId] = useState<string | null>(wiki.pages[0]?.id ?? null);
  const [selId, setSelId] = useState(homeId);
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [panelOff, setPanelOff] = useState(false);
  const [adding, setAdding] = useState<{ kind: 'cat' | 'page'; parentId: string } | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [zoom, setZoom] = useState(1);
  // which left-rail branches are expanded (category id → open)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // the page-emblem editor target + saved overrides (shown instantly; the
  // store row is the durable copy)
  const [emblemFor, setEmblemFor] = useState<Page | null>(null);
  const [pageIcons, setPageIcons] = useState<Record<string, PageIcon | null>>({});
  const lib = useLucide();

  // keep the view valid when the tree changes under it (wiki prop updates)
  const sel = findPage(wiki, selId) || wiki.home;
  useEffect(() => {
    if (!findPage(wiki, rootId)) { setRootId(homeId); setFocusId(wiki.pages[0]?.id ?? null); }
    if (focusId && !findPage(wiki, focusId)) setFocusId(wiki.pages[0]?.id ?? null);
    if (!findPage(wiki, selId)) setSelId(homeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wiki]);

  /* ── one navigation rule (v12): a holder becomes the focus; a leaf keeps
     its parent's branch open ── */
  const navigate = (id: string) => {
    const p = findPage(wiki, id);
    if (!p) return;
    setSelId(id);
    setAdding(null);
    if (id === homeId) { setRootId(homeId); if (!focusId) setFocusId(wiki.pages[0]?.id ?? null); return; }
    if (kidsOf(wiki, p).length) {
      const par = parentOf(wiki, id);
      setRootId(par ? par.id : homeId); setFocusId(id); return;
    }
    const par = parentOf(wiki, id);
    if (!par) { setRootId(homeId); setFocusId(null); return; }
    const gp = parentOf(wiki, par.id);
    setRootId(gp ? gp.id : homeId); setFocusId(par.id);
  };

  const commitAdd = () => {
    const t = addTitle.trim();
    const a = adding;
    setAdding(null); setAddTitle('');
    if (!t || !a || !onAddNode) return;
    // overlay parent key: '' = the wiki root (top of the canon)
    const parentKey = a.parentId === homeId ? '' : a.parentId;
    const node = onAddNode(parentKey, t);
    if (!node) return;
    if (a.kind === 'cat') { setRootId(homeId); setFocusId(node.id); setSelId(node.id); }
    else setSelId(node.id);   // the branch it lands in is already open
  };

  const layout = useMemo(
    () => computeLayout(wiki, rootId, focusId, selId, onlyTodo, !!onAddNode),
    [wiki, rootId, focusId, selId, onlyTodo, onAddNode, adding]);

  /* ── pan + zoom: transforms applied straight to the stage (no re-render) ── */
  const mapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const S = useRef({ px: 0, py: 0, zoom: 1, placed: false });
  const suppressRef = useRef(false);
  S.current.zoom = zoom;

  const clampPan = () => {
    const m = mapRef.current; if (!m || !m.clientWidth) return;
    const s = S.current, vw = m.clientWidth, vh = m.clientHeight, w = layout.W * s.zoom, h = layout.H * s.zoom;
    s.px = Math.min(vw - Math.min(KEEP, w), Math.max(Math.min(KEEP, vw) - w, s.px));
    s.py = Math.min(vh - Math.min(KEEP, h), Math.max(Math.min(KEEP, vh) - h, s.py));
  };
  const placeStage = () => {
    const st = stageRef.current; if (!st) return;
    clampPan();
    st.style.transform = `translate(${Math.round(S.current.px)}px,${Math.round(S.current.py)}px) scale(${S.current.zoom})`;
  };
  const centre = () => {
    const m = mapRef.current; if (!m) return;
    S.current.px = Math.max(14, (m.clientWidth - layout.W * S.current.zoom) / 2);
    S.current.py = 14;
    placeStage();
  };
  // zoom about a point, so what you are looking at stays put
  const zoomAt = (cx: number, cy: number, dir: number) => {
    const s = S.current;
    const i = ZOOMS.indexOf(s.zoom);
    const n = Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? ZOOMS.length - 1 : i) + dir));
    if (ZOOMS[n] === s.zoom) return;
    const z = ZOOMS[n];
    s.px = cx - (cx - s.px) * (z / s.zoom);
    s.py = cy - (cy - s.py) * (z / s.zoom);
    s.zoom = z;
    setZoom(z);
    placeStage();
  };
  const stepZoom = (d: number) => {
    const m = mapRef.current; if (!m) return;
    zoomAt(m.clientWidth / 2, m.clientHeight / 2, d);
  };
  const fitZoom = () => {
    const m = mapRef.current; if (!m) return;
    const availW = m.clientWidth - 40, availH = m.clientHeight - 40;
    const z = [...ZOOMS].reverse().find((v) => layout.W * v <= availW && layout.H * v <= availH)
      || [...ZOOMS].reverse().find((v) => layout.W * v <= availW) || ZOOMS[0];
    S.current.zoom = z; setZoom(z);
    S.current.px = Math.max(14, (m.clientWidth - layout.W * z) / 2);
    S.current.py = Math.max(14, (m.clientHeight - layout.H * z) / 2);
    placeStage();
  };

  useEffect(() => {
    if (!S.current.placed) { centre(); S.current.placed = true; } else placeStage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, panelOff, zoom]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    let pan: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('button, input, .add')) return;
      pan = { x: e.clientX, y: e.clientY, px: S.current.px, py: S.current.py, moved: false };
      map.classList.add('panning');
      try { map.setPointerCapture(e.pointerId); } catch { /* fine */ }
    };
    const move = (e: PointerEvent) => {
      if (!pan) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pan.moved = true;
      S.current.px = pan.px + dx; S.current.py = pan.py + dy;
      placeStage();
    };
    const end = () => { if (!pan) return; suppressRef.current = pan.moved; map.classList.remove('panning'); pan = null; };
    // scroll or two-finger swipe pans; ⌘/ctrl-scroll zooms at the pointer
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = map.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1 : -1);
      } else { S.current.px -= e.deltaX; S.current.py -= e.deltaY; placeStage(); }
    };
    map.addEventListener('pointerdown', down);
    map.addEventListener('pointermove', move);
    (['pointerup', 'pointercancel', 'pointerleave'] as const).forEach((k) => map.addEventListener(k, end));
    map.addEventListener('wheel', wheel, { passive: false });
    const onResize = () => placeStage();
    window.addEventListener('resize', onResize);
    return () => {
      map.removeEventListener('pointerdown', down);
      map.removeEventListener('pointermove', move);
      (['pointerup', 'pointercancel', 'pointerleave'] as const).forEach((k) => map.removeEventListener(k, end));
      map.removeEventListener('wheel', wheel);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.W, layout.H]);

  const onMapKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const k = e.shiftKey ? 140 : 50;
    if (e.key === 'ArrowLeft') S.current.px += k;
    else if (e.key === 'ArrowRight') S.current.px -= k;
    else if (e.key === 'ArrowUp') S.current.py += k;
    else if (e.key === 'ArrowDown') S.current.py -= k;
    else if (e.key === '0') { fitZoom(); return; }
    else if (e.key === 'Escape' && adding) { setAdding(null); setAddTitle(''); return; }
    else return;
    e.preventDefault(); placeStage();
  };

  const clickNode = (id: string) => {
    if (suppressRef.current) { suppressRef.current = false; return; }
    navigate(id);
  };

  const trail = trailTo(wiki, selId);
  const todo = needWork(wiki).length;
  const par = parentOf(wiki, sel.id);
  const whereName = par ? (par.id === homeId ? wiki.name : oneLine(par.title)) : wiki.name;
  const selState = stateOf(sel);

  return (
    <div id="cvt" className={panelOff ? 'solo' : ''}>
      {/* ── LEFT RAIL, in SECTIONS (owner's structure): the emblem + title
          header · the identity button · Wiki home · the main categories,
          each expandable to its sub pages ── */}
      <div className="cvt-left">
        <div className="cvt-rail-head">
          {onEditEmblem ? (
            <span className="cvt-mark-wrap">
              <button className="cvt-mark-btn" onClick={onEditEmblem} aria-label="Change the wiki emblem"><WikiEmblemMark wiki={wiki} /></button>
              <button className="cvt-mark-tip" onClick={onEditEmblem} tabIndex={-1}><span>Change the wiki emblem</span></button>
            </span>
          ) : <WikiEmblemMark wiki={wiki} />}
          <span className="cvt-rail-title">{wiki.name}</span>
        </div>
        {onEditIdentity && (
          <div className="cvt-sec">
            <button className="cvt-id-btn" onClick={onEditIdentity} title={`Wiki identity — ${wiki.name}'s tile cover art, categories, tagline, emblem`}>
              <span className="cvt-id-ic"><Svg d={IcIdentity} /></span>
              <span className="cvt-id-tx"><b>Wiki identity</b><i>tile cover art · categories · tagline · emblem</i></span>
            </button>
          </div>
        )}
        <div className="cvt-sec">
          <div className={`cvt-nav ${selId === homeId ? 'sel' : ''}`}>
            <button className="cvt-nav-main" onClick={() => navigate(homeId)}>
              <span className="cvt-nav-ic"><Svg d={IcHome} /></span>
              <span className="cvt-nav-nm">Wiki home</span>
            </button>
            <span className="cvt-nav-tag">home</span>
          </div>
        </div>
        <div className="cvt-sec">
          <div className="cvt-left-head">{ROOT_COLUMN_HEAD}</div>
          {wiki.pages.map((p) => (
            <NavRow key={p.id} p={p} depth={0} wiki={wiki} selId={selId} focusId={focusId}
              expanded={expanded} onToggle={(id) => setExpanded((e) => ({ ...e, [id]: !e[id] }))} onNav={navigate} />
          ))}
        </div>
      </div>

      {/* ── THE MAP ── */}
      <div className="work">
        <div className="work-head">
          <div className="trail">
            {trail.map((p, i, a) => (
              <React.Fragment key={p.id}>
                <button className={`crumb ${i === a.length - 1 ? 'here' : ''}`} onClick={() => navigate(p.id)}>
                  {p.id === homeId ? wiki.name : oneLine(p.title)}
                </button>
                {i < a.length - 1 && <span className="crumb-sep">›</span>}
              </React.Fragment>
            ))}
          </div>
          <div className="head-right">
            {todo > 0 && (
              <button className={`filter ${onlyTodo ? 'on' : ''}`} onClick={() => setOnlyTodo(!onlyTodo)}
                title="Push finished pages back so the work stands out">
                Needs work <span className="n">{todo}</span>
              </button>
            )}
          </div>
        </div>
        <div className="map" ref={mapRef} tabIndex={0} onKeyDown={onMapKey}
          onClick={(e) => { if (adding && !(e.target as HTMLElement).closest('.add')) { setAdding(null); setAddTitle(''); } }}>
          <div className="stage" ref={stageRef} style={{ width: layout.W, height: layout.H }}>
            <div className="canvas" style={{ width: layout.W, height: layout.H }}>
              {layout.caps.map((c, i) => <span key={i} className="rowcap" style={{ top: c.top }}>{c.label}</span>)}
              <svg className="links" viewBox={`0 0 ${layout.W} ${layout.H}`} preserveAspectRatio="none">
                {layout.links.map((l, i) => <path key={i} className={l.cls} d={l.d} />)}
              </svg>
              {layout.nodes.map((n, i) => {
                if (n.kind === 'add') {
                  const typing = !!adding && adding.kind === n.addKind && adding.parentId === n.parentId;
                  return (
                    <div key={`add-${n.parentId}-${i}`} className={`add ${typing ? 'typing' : ''}`}
                      style={{ left: n.x, top: n.y, width: n.w }}
                      onClick={() => { if (suppressRef.current) { suppressRef.current = false; return; } if (!typing) { setAdding({ kind: n.addKind, parentId: n.parentId }); setAddTitle(''); } }}>
                      <div className="add-sheet" style={{ height: n.h }}>
                        {typing
                          ? <input autoFocus value={addTitle} placeholder={n.addKind === 'cat' ? 'Category name' : 'Page name'} autoComplete="off"
                              onChange={(e) => setAddTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitAdd(); } if (e.key === 'Escape') { setAdding(null); setAddTitle(''); } }} />
                          : <span className="add-plus">+</span>}
                      </div>
                      <div className="add-cap">{typing ? 'Press Enter to make it' : n.label}</div>
                    </div>
                  );
                }
                const kids = kidsOf(wiki, n.p).length;
                return (
                  <button key={n.p.id} className={`node ${n.cls}`} style={{ left: n.x, top: n.y, width: n.w }}
                    onClick={() => clickNode(n.p.id)}>
                    {n.here && <span className="youarehere">{panelOff ? 'selected' : 'open in the rail'}</span>}
                    <Sheet wiki={wiki} p={n.p} h={n.h} />
                    <span className="cap">
                      <span className="nm">{oneLine(n.p.title)}</span>
                      {kids > 0 && <span className="held">{kids} page{kids === 1 ? '' : 's'} nested</span>}
                      <span className={`st ${n.words.k}`}>{n.words.t}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="zoom">
            <button onClick={() => stepZoom(-1)} disabled={zoom <= ZOOMS[0]} title="Zoom out">−</button>
            <span className="pc">{Math.round(zoom * 100)}%</span>
            <button onClick={() => stepZoom(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} title="Zoom in">+</button>
            <button className="fit" onClick={fitZoom}>Fit</button>
          </div>
        </div>
        {panelOff && <button className="panel-tab" onClick={() => setPanelOff(false)}>The page</button>}
      </div>

      {/* ── RIGHT RAIL — purely the live page (the owner's rule): a slim
          fixed header, then THE PAGE ITSELF at small scale filling the rail
          and scrolling on its own; one pinned action ── */}
      {!panelOff && (
        <div className="panel">
          <button className="panel-x" onClick={() => setPanelOff(true)} title="Hide this panel"><Svg d={IcFwd} w={2.4} /></button>
          <div className="panel-top">
            <div className="panel-id">
              {/* the PAGE's emblem slot: its mark, or a dashed "+" to add one;
                  hover pops the clickable tip (the wiki-mark pattern).
                  THE RULE (owner): the HOME page's emblem IS the wiki emblem —
                  one mark, always identical, edited only in the master-emblem
                  screen — so home shows the wiki mark and clicks go there. */}
              {(() => {
                if (sel.id === homeId) {
                  if (!onEditEmblem) return <WikiEmblemMark wiki={wiki} />;
                  return (
                    <span className="cvt-mark-wrap">
                      <button className="cvt-mark-btn" onClick={onEditEmblem} aria-label="Change the wiki emblem"><WikiEmblemMark wiki={wiki} /></button>
                      <button className="cvt-mark-tip" onClick={onEditEmblem} tabIndex={-1}><span>Change the wiki emblem</span></button>
                    </span>
                  );
                }
                const selIcon = (sel.id in pageIcons ? pageIcons[sel.id] : (sel.icon as PageIcon | null)) ?? null;
                if (!canEditPageEmblem) return selIcon ? <PageMarkView icon={selIcon} lib={lib} /> : null;
                const tip = selIcon ? 'Change the page emblem' : 'Add a page emblem';
                return (
                  <span className="cvt-mark-wrap">
                    <button className="cvt-mark-btn" onClick={() => setEmblemFor(sel)} aria-label={tip}><PageMarkView icon={selIcon} lib={lib} /></button>
                    <button className="cvt-mark-tip" onClick={() => setEmblemFor(sel)} tabIndex={-1}><span>{tip}</span></button>
                  </span>
                );
              })()}
              <div className="panel-id-tx">
                <div className="panel-eye">{whereName}</div>
                <h2 className="panel-nm">{oneLine(sel.title)}</h2>
              </div>
            </div>
            <div className="panel-meta">
              <span className={`pill ${sel.status}`}>{STATUS[sel.status] || sel.status}</span>
              <span className="when">read only — exactly what a reader sees</span>
            </div>
          </div>
          <div className="cvt-live-scroll">
            <LivePage key={`${wiki.id}:${sel.id}`} page={sel} wiki={wiki} />
          </div>
          <div className="panel-foot">
            <button className="open" onClick={() => onOpen?.(sel)}>
              <Svg d={IcPencil} />{selState === 'none' ? 'Start this page' : 'Open and edit'}
            </button>
          </div>
        </div>
      )}

      {/* the page-emblem editor (solo window — back/× return right here) */}
      {emblemFor && (
        <PageEmblemSheet wikiId={wiki.id}
          page={{ ...emblemFor, icon: (emblemFor.id in pageIcons ? pageIcons[emblemFor.id] : emblemFor.icon) as PageIcon | null }}
          onClose={() => setEmblemFor(null)}
          onSaved={(ic) => setPageIcons((p) => ({ ...p, [emblemFor.id]: ic }))} />
      )}
    </div>
  );
}
