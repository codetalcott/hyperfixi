/**
 * Russian's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/ru.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsRu } from '../toggle';
import { getPutPatternsRu } from '../put';
import { getEventHandlerPatternsRu } from '../event-handler';
import { getAddPatternsRu } from '../add';
import { getRemovePatternsRu } from '../remove';
import { getShowPatternsRu } from '../show';
import { getHidePatternsRu } from '../hide';
import { getSetPatternsRu } from '../set';
import { getGetPatternsRu } from '../get';
import { getIncrementPatternsRu } from '../increment';
import { getDecrementPatternsRu } from '../decrement';
import { getFetchPatternsRu } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsRu],
  ['put', getPutPatternsRu],
  ['event-handler', getEventHandlerPatternsRu],
  ['add', getAddPatternsRu],
  ['remove', getRemovePatternsRu],
  ['show', getShowPatternsRu],
  ['hide', getHidePatternsRu],
  ['set', getSetPatternsRu],
  ['get', getGetPatternsRu],
  ['increment', getIncrementPatternsRu],
  ['decrement', getDecrementPatternsRu],
  ['fetch', getFetchPatternsRu],
];
