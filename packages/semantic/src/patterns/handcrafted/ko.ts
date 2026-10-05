/**
 * Korean's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/ko.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getPutPatternsKo } from '../put';
import { getEventHandlerPatternsKo } from '../event-handler';
import { getFetchPatternsKo } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['put', getPutPatternsKo],
  ['event-handler', getEventHandlerPatternsKo],
  ['fetch', getFetchPatternsKo],
];
