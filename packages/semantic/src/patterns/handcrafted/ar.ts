/**
 * Arabic's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/ar.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsAr } from '../event-handler';
import { getWaitPatternsAr } from '../wait';
import { getFetchPatternsAr } from '../fetch';
import { getViewTransitionPatternsAr } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsAr],
  ['wait', getWaitPatternsAr],
  ['fetch', getFetchPatternsAr],
  ['viewTransition', getViewTransitionPatternsAr],
];
