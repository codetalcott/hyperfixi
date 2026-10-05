/**
 * Quechua's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/qu.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsQu } from '../toggle';
import { getPutPatternsQu } from '../put';
import { getEventHandlerPatternsQu } from '../event-handler';
import { getAddPatternsQu } from '../add';
import { getRemovePatternsQu } from '../remove';
import { getSetPatternsQu } from '../set';
import { getIncrementPatternsQu } from '../increment';
import { getWaitPatternsQu } from '../wait';
import { getFetchPatternsQu } from '../fetch';
import { getTriggerPatternsQu } from '../trigger';
import { getViewTransitionPatternsQu } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsQu],
  ['put', getPutPatternsQu],
  ['event-handler', getEventHandlerPatternsQu],
  ['add', getAddPatternsQu],
  ['remove', getRemovePatternsQu],
  ['set', getSetPatternsQu],
  ['increment', getIncrementPatternsQu],
  ['wait', getWaitPatternsQu],
  ['fetch', getFetchPatternsQu],
  ['trigger', getTriggerPatternsQu],
  ['viewTransition', getViewTransitionPatternsQu],
];
