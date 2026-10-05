/**
 * Turkish's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/tr.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getPutPatternsTr } from '../put';
import { getEventHandlerPatternsTr } from '../event-handler';
import { getWaitPatternsTr } from '../wait';
import { getFetchPatternsTr } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['put', getPutPatternsTr],
  ['event-handler', getEventHandlerPatternsTr],
  ['wait', getWaitPatternsTr],
  ['fetch', getFetchPatternsTr],
];
