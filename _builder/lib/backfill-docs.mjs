// backfill-docs.mjs — PROJECT DBNATIVE slice 1: assemble every extracted
// flagship page as the PageDoc the database stores. PURE: reads the
// extraction output (data/taco-bell.json, data/apple.json — themselves
// derived from the pages' own front matter), emits the include-ready doc
// shape (hero / overview / sections) — the SAME data the live Jekyll pages
// render, untouched. The generator turns these into migration 0011; the
// guard renders every one through the derived renderer to prove the reader
// can serve them.
import fs from 'node:fs';
import path from 'node:path';

const oneLine = (t) => String(t || '').replace(/<br\s*\/?>/gi, ' ').trim();
const walk = (ps) => ps.flatMap((p) => [p, ...walk(p.pages || [])]);

/** Every LIVE flagship page as { wiki, id, slug, title, type, isHome, doc }. */
export function flagshipDocs(dataDir = path.join(process.cwd(), 'data')) {
  const out = [];
  const seen = new Set();
  for (const file of ['taco-bell.json', 'apple.json']) {
    const w = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    for (const p of [w.home, ...walk(w.pages)]) {
      if (p.status !== 'live' || !p.permalink) continue;
      const key = `${w.id}/${p.id}`;
      if (seen.has(key)) continue;   // the directory lists a page twice in places
      seen.add(key);
      out.push({
        wiki: w.id,
        id: p.id,
        slug: p.permalink.replace(/^\//, ''),
        title: oneLine(p.title),
        type: p.home ? 'home' : 'standard',
        isHome: !!p.home,
        doc: {
          hero: p.hero,
          // one page (sauces) predates the overview rollout — it gets the
          // empty locked section to fill in the builder
          overview: p.overview || { tone: 'b', heading: '', paragraphs: [], infobox: null },
          sections: Array.isArray(p.body) ? p.body : [],
        },
      });
    }
  }
  return out;
}
