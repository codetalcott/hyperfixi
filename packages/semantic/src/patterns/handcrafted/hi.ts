/**
 * Hindi's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/hi.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsHi } from '../toggle';
import { getPutPatternsHi } from '../put';
import { getEventHandlerPatternsHi } from '../event-handler';
import { getAddPatternsHi } from '../add';
import { getRemovePatternsHi } from '../remove';
import { getShowPatternsHi } from '../show';
import { getHidePatternsHi } from '../hide';
import { getSetPatternsHi } from '../set';
import { getGetPatternsHi } from '../get';
import { getIncrementPatternsHi } from '../increment';
import { getDecrementPatternsHi } from '../decrement';
import { getFetchPatternsHi } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsHi],
  ['put', getPutPatternsHi],
  ['event-handler', getEventHandlerPatternsHi],
  ['add', getAddPatternsHi],
  ['remove', getRemovePatternsHi],
  ['show', getShowPatternsHi],
  ['hide', getHidePatternsHi],
  ['set', getSetPatternsHi],
  ['get', getGetPatternsHi],
  ['increment', getIncrementPatternsHi],
  ['decrement', getDecrementPatternsHi],
  ['fetch', getFetchPatternsHi],
];
