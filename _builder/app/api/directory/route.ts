// GET /api/directory — the PUBLIC wiki directory (origination arc, iter. 3).
// The one feed every wiki-listing surface consumes: the live site's browse
// page fetches it cross-origin (CORS open — this is public, read-only data),
// and future consumers (home-page tiles, the recommendations module) read the
// same payload. Wikis + the MERGED category taxonomy with gradient colors
// resolved (lib/taxonomy.mjs — the same pipe /read uses), edge-cached.
import { NextResponse } from 'next/server';
import { serverSupabase } from '../../../lib/supabase-server';
import { attachIconBodies, directoryPayload } from '../../../lib/taxonomy.mjs';
import taxonomyCanon from '../../../data/wiki-categories.json';
import includes from '../../../data/includes.json';
import lucide from '../../../data/lucide-library.json';

export const revalidate = 60;   // cache until edited (same model as /read)

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' };

export async function GET() {
  const db = serverSupabase();
  if (!db) return NextResponse.json({ error: 'no database configured' }, { status: 503, headers: CORS });
  let w: { data: any[] | null; error: any } = await db.from('wikis')
    .select('id, name, categories, blurb, tagline, status, tile_cover, icon, entries, popularity').order('name');
  // pre-0009 / pre-0006 databases — serve what exists so the page still renders
  if (w.error) w = await db.from('wikis')
    .select('id, name, categories, blurb, tagline, status, tile_cover, entries, popularity').order('name');
  if (w.error) w = await db.from('wikis').select('id, name').order('name');
  if (w.error) return NextResponse.json({ error: 'directory unavailable' }, { status: 503, headers: CORS });
  const c = await db.from('wiki_categories').select('key, label, icon, grad_from, grad_to');
  const payload = directoryPayload(w.data || [], taxonomyCanon as any, c.error ? [] : c.data || []);
  // category icons beyond the canon sprite ride the feed WITH their vector
  // body (resolved from the pinned Lucide library) so consumers render them
  // inline — the browse page needs no sprite edit for any library icon
  payload.categories = attachIconBodies(payload.categories, (includes as any).sprite, lucide as any);
  return NextResponse.json(payload, { headers: CORS });
}
