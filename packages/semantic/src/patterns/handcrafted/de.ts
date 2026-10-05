/**
 * German's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/de.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsDe } from '../event-handler';
import { getShowPatternsDe } from '../show';
import { getHidePatternsDe } from '../hide';
import { getSetPatternsDe } from '../set';
import { getGetPatternsDe } from '../get';
import { getIncrementPatternsDe } from '../increment';
import { getDecrementPatternsDe } from '../decrement';
import { getFetchPatternsDe } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsDe],
  ['show', getShowPatternsDe],
  ['hide', getHidePatternsDe],
  ['set', getSetPatternsDe],
  ['get', getGetPatternsDe],
  ['increment', getIncrementPatternsDe],
  ['decrement', getDecrementPatternsDe],
  ['fetch', getFetchPatternsDe],
];
