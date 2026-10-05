/**
 * Malay's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/ms.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsMs } from '../event-handler';
import { getSetPatternsMs } from '../set';
import { getFetchPatternsMs } from '../fetch';
import { getViewTransitionPatternsMs } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsMs],
  ['set', getSetPatternsMs],
  ['fetch', getFetchPatternsMs],
  ['viewTransition', getViewTransitionPatternsMs],
];
