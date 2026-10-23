// POST /api/revalidate — on-demand cache invalidation for the READER (phase
// 3): the builder calls this after a publish or revert so readers see the
// approved version in seconds instead of waiting out the 60s window.
// Body: { paths: ["/read/taco-bell/taco-bell-drinks", …] }
// Open by design: invalidating a cache only triggers a re-render of PUBLISHED
// content — it cannot change or reveal anything.
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  let paths: string[] = [];
  try { paths = ((await req.json())?.paths ?? []).filter((p: unknown) => typeof p === 'string' && ((p as string).startsWith('/read') || p === '/api/directory')); }
  catch { /* empty body → nothing to do */ }
  for (const p of paths.slice(0, 20)) revalidatePath(p);
  return Response.json({ ok: true, revalidated: paths.length });
}
