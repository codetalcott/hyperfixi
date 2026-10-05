/**
 * Hebrew's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/he.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsHe } from '../event-handler';
import { getSetPatternsHe } from '../set';
import { getWaitPatternsHe } from '../wait';
import { getFetchPatternsHe } from '../fetch';
import { getTriggerPatternsHe } from '../trigger';
import { getSendPatternsHe } from '../send';
import { getViewTransitionPatternsHe } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsHe],
  ['set', getSetPatternsHe],
  ['wait', getWaitPatternsHe],
  ['fetch', getFetchPatternsHe],
  ['trigger', getTriggerPatternsHe],
  ['send', getSendPatternsHe],
  ['viewTransition', getViewTransitionPatternsHe],
];
