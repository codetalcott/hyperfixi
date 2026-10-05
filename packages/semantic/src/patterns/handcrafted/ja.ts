/**
 * Japanese's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/ja.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getPutPatternsJa } from '../put';
import { getEventHandlerPatternsJa } from '../event-handler';
import { getFetchPatternsJa } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['put', getPutPatternsJa],
  ['event-handler', getEventHandlerPatternsJa],
  ['fetch', getFetchPatternsJa],
];
