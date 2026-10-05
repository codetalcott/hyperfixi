/**
 * French's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/fr.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsFr } from '../event-handler';
import { getShowPatternsFr } from '../show';
import { getSetPatternsFr } from '../set';
import { getFetchPatternsFr } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsFr],
  ['show', getShowPatternsFr],
  ['set', getSetPatternsFr],
  ['fetch', getFetchPatternsFr],
];
