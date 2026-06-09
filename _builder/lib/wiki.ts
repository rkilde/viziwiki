// Wiki data types + the loaded wikis. Today this imports the git-extracted
// Taco Bell JSON; later the same shapes come from ContentStore (Supabase).
import tacoBell from '../data/taco-bell.json';

export type Stat = { num: string; label: string };
export type Hero = {
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  subtitle_meta: string | null;
  desc: string | null;
  stats: Stat[];
};
export type SectionRef = { type: string; label: string };
export type Page = {
  id: string;
  title: string;
  permalink: string | null;
  status: string;          // 'live' (built page) | 'stub' (directory entry, not built)
  folder?: boolean;
  count?: number | null;
  accent?: string | null;
  sections: SectionRef[];
  hero: Hero;
  pages: Page[];
};
export type Wiki = { id: string; name: string; pages: Page[] };

export const WIKIS: Wiki[] = [tacoBell as unknown as Wiki];

// strip inline <br> for single-line row titles
export const oneLine = (t: string) => t.replace(/<br\s*\/?>/gi, ' ');
