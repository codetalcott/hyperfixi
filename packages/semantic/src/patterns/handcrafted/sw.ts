/**
 * Swahili's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/sw.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsSw } from '../event-handler';
import { getSetPatternsSw } from '../set';
import { getFetchPatternsSw } from '../fetch';
import { getViewTransitionPatternsSw } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsSw],
  ['set', getSetPatternsSw],
  ['fetch', getFetchPatternsSw],
  ['viewTransition', getViewTransitionPatternsSw],
];
