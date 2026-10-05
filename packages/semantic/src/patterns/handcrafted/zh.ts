/**
 * Chinese's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/zh.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsZh } from '../toggle';
import { getPutPatternsZh } from '../put';
import { getEventHandlerPatternsZh } from '../event-handler';
import { getAddPatternsZh } from '../add';
import { getRemovePatternsZh } from '../remove';
import { getShowPatternsZh } from '../show';
import { getHidePatternsZh } from '../hide';
import { getSetPatternsZh } from '../set';
import { getGetPatternsZh } from '../get';
import { getIncrementPatternsZh } from '../increment';
import { getDecrementPatternsZh } from '../decrement';
import { getWaitPatternsZh } from '../wait';
import { getFetchPatternsZh } from '../fetch';
import { getTriggerPatternsZh } from '../trigger';
import { getSendPatternsZh } from '../send';
import { getViewTransitionPatternsZh } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsZh],
  ['put', getPutPatternsZh],
  ['event-handler', getEventHandlerPatternsZh],
  ['add', getAddPatternsZh],
  ['remove', getRemovePatternsZh],
  ['show', getShowPatternsZh],
  ['hide', getHidePatternsZh],
  ['set', getSetPatternsZh],
  ['get', getGetPatternsZh],
  ['increment', getIncrementPatternsZh],
  ['decrement', getDecrementPatternsZh],
  ['wait', getWaitPatternsZh],
  ['fetch', getFetchPatternsZh],
  ['trigger', getTriggerPatternsZh],
  ['send', getSendPatternsZh],
  ['viewTransition', getViewTransitionPatternsZh],
];
