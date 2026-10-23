// GET /read/[wiki]/[page] — a READER page: the PUBLISHED revision rendered
// through the canonical derived renderer (scripts kept, sentinels stripped),
// wrapped in the live site's canon CSS stack, edge-cached. Phase 3: readers
// see what a wiki_master/admin APPROVED (pages.published_rev), never raw drafts;
// publishing/reverting pings /api/revalidate so this refreshes in seconds.
import { html, noDb, notFound, readerNav, readerShell, renderReaderBody, renderer, SENT_PREFIX, serverSupabase, bankCss } from '../../../../lib/reader';

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: { wiki: string; page: string } }) {
  const db = serverSupabase();
  if (!db) return noDb();
  const [{ data: wiki }, { data: page }] = await Promise.all([
    db.from('wikis').select('id, name, skin').eq('id', params.wiki).single(),
    db.from('pages').select('id, title, type, published_rev').eq('wiki_id', params.wiki).eq('id', params.page).single(),
  ]);
  if (!wiki || !page) return notFound(`No page "${params.wiki}/${params.page}" in the content database.`);
  if (!page.published_rev) return notFound('This page has no published version yet — a wiki_master or admin must approve one.');
  const { data: rev, error } = await db.from('revisions').select('doc').eq('id', page.published_rev).single();
  if (error || !rev?.doc) return noDb();
  const doc = rev.doc;
  const isHome = page.type === 'home';
  const bodyHtml = renderReaderBody(renderer, SENT_PREFIX, doc, isHome);
  return html(readerShell({
    title: `${page.title} — ${wiki.name} · ViziWiki`,
    wikiId: wiki.id,
    bodyClass: wiki.skin || 'wiki-page',
    isHome,
    bankCss: bankCss as string[],
    bodyHtml,
    nav: readerNav([['Wikis', '/read'], [wiki.name, `/read/${encodeURIComponent(wiki.id)}`], [page.title, null]]),
  }));
}
