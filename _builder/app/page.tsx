'use client';
import { WIKIS } from '../lib/wiki';
import { Topbar } from '../components/miller/Topbar';
import { MillerView } from '../components/miller/MillerView';

// The builder home (ported from the prototype): wiki switcher + Miller column
// view, loaded with the REAL Taco Bell wiki from git. Open/edit is a dummy for
// now — the page builder isn't ported yet.
export default function Page() {
  const wiki = WIKIS[0];
  return (
    <>
      <Topbar wikis={WIKIS} current={wiki} />
      <div id="miller">
        <MillerView wiki={wiki} />
      </div>
    </>
  );
}
