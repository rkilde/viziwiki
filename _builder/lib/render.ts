// App-side entry to the DERIVED RENDERER. All logic lives in render-core.mjs
// (one copy, shared with the Node smoke test); this wires it to the bundled
// generated data (canonical includes + grammar policy).
import includesData from '../data/includes.json';
import registry from '../data/visuals.json';
import { createRenderer, SENT_PREFIX } from './render-core.mjs';
import { POLICY } from './grammar';
import type { PageDoc } from './store';

export { SENT_PREFIX };
export const REGISTRY = registry as any;

const renderer = createRenderer(includesData as any, POLICY, REGISTRY);

export const ICON_SPRITE: string = (includesData as any).sprite;

export function renderBody(doc: PageDoc, isHome = false): string {
  return renderer.renderBody(doc, isHome);
}
