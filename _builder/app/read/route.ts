// GET /read — the reader's wiki index (from the content database).
import { html, noDb, readerIndexShell, readerNav, escapeHtml, serverSupabase } from '../../lib/reader';

export const revalidate = 60;   // edge-cached; re-rendered at most once a minute

export async function GET() {
  const db = serverSupabase();
  if (!db) return noDb();
  const { data, error } = await db.from('wikis').select('id, name').order('name');
  if (error) return noDb();
  const items = (data || []).map((w) =>
    `<a href="/read/${encodeURIComponent(w.id)}"><span class="rd-name">${escapeHtml(w.name)}</span><span class="rd-meta">${escapeHtml(w.id)}</span></a>`).join('');
  return html(readerIndexShell('Wikis — ViziWiki Reader', readerNav([['Wikis', null]]),
    `<div class="rd-eyebrow">ViziWiki · Reader</div><h1>Wikis.</h1>` +
    (items ? `<div class="rd-list">${items}</div>` : `<div class="rd-empty">Nothing published yet — save a page in the build kit and it appears here.</div>`)));
}
