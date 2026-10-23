// GET /read/[wiki]/[page] — a READER page: the stored doc rendered through
// the canonical derived renderer (scripts kept, sentinels stripped), wrapped
// in the live site's canon CSS stack, edge-cached (ISR). This is the
// Wikipedia/Fandom model: database → render → cache until edited.
import { html, noDb, notFound, readerNav, readerShell, renderReaderBody, renderer, SENT_PREFIX, rowsToDoc, serverSupabase, bankCss } from '../../../../lib/reader';

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: { wiki: string; page: string } }) {
  const db = serverSupabase();
  if (!db) return noDb();
  const [{ data: wiki }, { data: page }] = await Promise.all([
    db.from('wikis').select('id, name, skin').eq('id', params.wiki).single(),
    db.from('pages').select('id, title, type').eq('wiki_id', params.wiki).eq('id', params.page).single(),
  ]);
  if (!wiki || !page) return notFound(`No page "${params.wiki}/${params.page}" in the content database.`);
  const { data: rows, error } = await db.from('sections').select('position, component, data')
    .eq('wiki_id', params.wiki).eq('page_id', params.page).order('position');
  if (error) return noDb();
  const doc = rowsToDoc(rows || []);
  if (!doc) return notFound('This page has no stored sections yet.');
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
