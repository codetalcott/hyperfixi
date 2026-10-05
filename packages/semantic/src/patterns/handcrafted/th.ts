/**
 * Thai's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/th.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsTh } from '../toggle';
import { getPutPatternsTh } from '../put';
import { getEventHandlerPatternsTh } from '../event-handler';
import { getAddPatternsTh } from '../add';
import { getRemovePatternsTh } from '../remove';
import { getShowPatternsTh } from '../show';
import { getHidePatternsTh } from '../hide';
import { getSetPatternsTh } from '../set';
import { getGetPatternsTh } from '../get';
import { getIncrementPatternsTh } from '../increment';
import { getDecrementPatternsTh } from '../decrement';
import { getFetchPatternsTh } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsTh],
  ['put', getPutPatternsTh],
  ['event-handler', getEventHandlerPatternsTh],
  ['add', getAddPatternsTh],
  ['remove', getRemovePatternsTh],
  ['show', getShowPatternsTh],
  ['hide', getHidePatternsTh],
  ['set', getSetPatternsTh],
  ['get', getGetPatternsTh],
  ['increment', getIncrementPatternsTh],
  ['decrement', getDecrementPatternsTh],
  ['fetch', getFetchPatternsTh],
];
