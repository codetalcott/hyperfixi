/**
 * Polish's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/pl.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsPl } from '../toggle';
import { getPutPatternsPl } from '../put';
import { getEventHandlerPatternsPl } from '../event-handler';
import { getAddPatternsPl } from '../add';
import { getRemovePatternsPl } from '../remove';
import { getShowPatternsPl } from '../show';
import { getHidePatternsPl } from '../hide';
import { getSetPatternsPl } from '../set';
import { getGetPatternsPl } from '../get';
import { getIncrementPatternsPl } from '../increment';
import { getDecrementPatternsPl } from '../decrement';
import { getFetchPatternsPl } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsPl],
  ['put', getPutPatternsPl],
  ['event-handler', getEventHandlerPatternsPl],
  ['add', getAddPatternsPl],
  ['remove', getRemovePatternsPl],
  ['show', getShowPatternsPl],
  ['hide', getHidePatternsPl],
  ['set', getSetPatternsPl],
  ['get', getGetPatternsPl],
  ['increment', getIncrementPatternsPl],
  ['decrement', getDecrementPatternsPl],
  ['fetch', getFetchPatternsPl],
];
