// GET /read/[wiki] — one wiki's page index (from the content database).
import { html, noDb, notFound, readerIndexShell, readerNav, escapeHtml, serverSupabase } from '../../../lib/reader';

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: { wiki: string } }) {
  const db = serverSupabase();
  if (!db) return noDb();
  const { data: wiki } = await db.from('wikis').select('id, name').eq('id', params.wiki).single();
  if (!wiki) return notFound(`No wiki "${params.wiki}" in the content database.`);
  const { data: pages } = await db.from('pages').select('id, title, type').eq('wiki_id', wiki.id).order('title');
  const items = (pages || []).map((p) =>
    `<a href="/read/${encodeURIComponent(wiki.id)}/${encodeURIComponent(p.id)}"><span class="rd-name">${escapeHtml(p.title)}</span><span class="rd-meta">${p.type === 'home' ? 'home' : 'page'}</span></a>`).join('');
  return html(readerIndexShell(`${wiki.name} — ViziWiki Reader`, readerNav([['Wikis', '/read'], [wiki.name, null]]),
    `<div class="rd-eyebrow">ViziWiki · Reader</div><h1>${escapeHtml(wiki.name)}.</h1>` +
    (items ? `<div class="rd-list">${items}</div>` : `<div class="rd-empty">No pages saved for this wiki yet.</div>`)));
}
