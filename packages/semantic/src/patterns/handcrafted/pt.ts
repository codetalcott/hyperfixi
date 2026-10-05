/**
 * Portuguese's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/pt.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsPt } from '../event-handler';
import { getSetPatternsPt } from '../set';
import { getFetchPatternsPt } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsPt],
  ['set', getSetPatternsPt],
  ['fetch', getFetchPatternsPt],
];
