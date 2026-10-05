/**
 * Italian's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/it.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsIt } from '../toggle';
import { getPutPatternsIt } from '../put';
import { getEventHandlerPatternsIt } from '../event-handler';
import { getAddPatternsIt } from '../add';
import { getRemovePatternsIt } from '../remove';
import { getShowPatternsIt } from '../show';
import { getHidePatternsIt } from '../hide';
import { getSetPatternsIt } from '../set';
import { getGetPatternsIt } from '../get';
import { getIncrementPatternsIt } from '../increment';
import { getDecrementPatternsIt } from '../decrement';
import { getFetchPatternsIt } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsIt],
  ['put', getPutPatternsIt],
  ['event-handler', getEventHandlerPatternsIt],
  ['add', getAddPatternsIt],
  ['remove', getRemovePatternsIt],
  ['show', getShowPatternsIt],
  ['hide', getHidePatternsIt],
  ['set', getSetPatternsIt],
  ['get', getGetPatternsIt],
  ['increment', getIncrementPatternsIt],
  ['decrement', getDecrementPatternsIt],
  ['fetch', getFetchPatternsIt],
];
