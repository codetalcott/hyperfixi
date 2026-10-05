/**
 * Bengali's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/bn.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsBn } from '../toggle';
import { getPutPatternsBn } from '../put';
import { getEventHandlerPatternsBn } from '../event-handler';
import { getAddPatternsBn } from '../add';
import { getRemovePatternsBn } from '../remove';
import { getShowPatternsBn } from '../show';
import { getHidePatternsBn } from '../hide';
import { getSetPatternsBn } from '../set';
import { getGetPatternsBn } from '../get';
import { getIncrementPatternsBn } from '../increment';
import { getDecrementPatternsBn } from '../decrement';
import { getWaitPatternsBn } from '../wait';
import { getFetchPatternsBn } from '../fetch';
import { getViewTransitionPatternsBn } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsBn],
  ['put', getPutPatternsBn],
  ['event-handler', getEventHandlerPatternsBn],
  ['add', getAddPatternsBn],
  ['remove', getRemovePatternsBn],
  ['show', getShowPatternsBn],
  ['hide', getHidePatternsBn],
  ['set', getSetPatternsBn],
  ['get', getGetPatternsBn],
  ['increment', getIncrementPatternsBn],
  ['decrement', getDecrementPatternsBn],
  ['wait', getWaitPatternsBn],
  ['fetch', getFetchPatternsBn],
  ['viewTransition', getViewTransitionPatternsBn],
];
