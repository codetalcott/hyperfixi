/**
 * Tagalog's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/tl.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getEventHandlerPatternsTl } from '../event-handler';
import { getWaitPatternsTl } from '../wait';
import { getFetchPatternsTl } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['event-handler', getEventHandlerPatternsTl],
  ['wait', getWaitPatternsTl],
  ['fetch', getFetchPatternsTl],
];
