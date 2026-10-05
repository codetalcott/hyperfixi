/**
 * Ukrainian's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/uk.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsUk } from '../toggle';
import { getPutPatternsUk } from '../put';
import { getEventHandlerPatternsUk } from '../event-handler';
import { getAddPatternsUk } from '../add';
import { getRemovePatternsUk } from '../remove';
import { getShowPatternsUk } from '../show';
import { getHidePatternsUk } from '../hide';
import { getSetPatternsUk } from '../set';
import { getGetPatternsUk } from '../get';
import { getIncrementPatternsUk } from '../increment';
import { getDecrementPatternsUk } from '../decrement';
import { getFetchPatternsUk } from '../fetch';
import { getViewTransitionPatternsUk } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsUk],
  ['put', getPutPatternsUk],
  ['event-handler', getEventHandlerPatternsUk],
  ['add', getAddPatternsUk],
  ['remove', getRemovePatternsUk],
  ['show', getShowPatternsUk],
  ['hide', getHidePatternsUk],
  ['set', getSetPatternsUk],
  ['get', getGetPatternsUk],
  ['increment', getIncrementPatternsUk],
  ['decrement', getDecrementPatternsUk],
  ['fetch', getFetchPatternsUk],
  ['viewTransition', getViewTransitionPatternsUk],
];
