/**
 * Indonesian's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/id.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getPutPatternsId } from '../put';
import { getEventHandlerPatternsId } from '../event-handler';
import { getSetPatternsId } from '../set';
import { getFetchPatternsId } from '../fetch';
import { getViewTransitionPatternsId } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['put', getPutPatternsId],
  ['event-handler', getEventHandlerPatternsId],
  ['set', getSetPatternsId],
  ['fetch', getFetchPatternsId],
  ['viewTransition', getViewTransitionPatternsId],
];
