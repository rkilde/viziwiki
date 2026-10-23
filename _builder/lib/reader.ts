// READER shared pieces (server-only): the derived renderer + the nav bar.
// The reader is the Wikipedia/Fandom publishing model (decided Oct 2026):
// pages render FROM THE DATABASE through the same canonical renderer the
// builder uses (rule #5 — one renderer, two surfaces), and route responses
// are cached at the edge via ISR (`revalidate`) — "cache until edited".
// Phase 3 swaps "latest saved" for "latest PUBLISHED" + on-demand
// invalidation on approve; nothing else here changes.
import includes from '../data/includes.json';
import grammar from '../data/grammar.json';
import registry from '../data/visuals.json';
import bankCss from '../data/bank-css.json';
import { buildPolicy } from './policy.mjs';
import { createRenderer, SENT_PREFIX } from './render-core.mjs';
import { renderReaderBody, readerShell, readerIndexShell, escapeHtml, wikiCoverTile } from './reader-core.mjs';
import { rowsToDoc } from './content-map.mjs';
import { serverSupabase } from './supabase-server';

const renderer = createRenderer(includes as any, buildPolicy(grammar as any), registry as any);

export const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

export const readerNav = (crumbs: Array<[string, string | null]>) =>
  `<nav class="reader-nav">` +
  crumbs.map(([label, href]) => (href ? `<a href="${href}">${escapeHtml(label)}</a>` : `<span>${escapeHtml(label)}</span>`)).join('<span>·</span>') +
  `<span class="rn-badge">ViziWiki · reader preview</span></nav>`;

export function notFound(what: string) {
  return html(readerIndexShell('Not found — ViziWiki', readerNav([['Wikis', '/read']]),
    `<div class="rd-eyebrow">Reader</div><h1>Not found.</h1><div class="rd-empty">${escapeHtml(what)}</div>`), 404);
}

export function noDb() {
  return html(readerIndexShell('Reader — ViziWiki', null,
    `<div class="rd-eyebrow">Reader</div><h1>Reader offline.</h1><div class="rd-empty">The content database is not configured (missing Supabase env keys).</div>`), 503);
}

export { renderer, SENT_PREFIX, renderReaderBody, readerShell, readerIndexShell, escapeHtml, rowsToDoc, serverSupabase, bankCss, wikiCoverTile };
