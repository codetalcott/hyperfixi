/**
 * Spanish's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/es.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsEs } from '../toggle';
import { getPutPatternsEs } from '../put';
import { getEventHandlerPatternsEs } from '../event-handler';
import { getSetPatternsEs } from '../set';
import { getFetchPatternsEs } from '../fetch';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsEs],
  ['put', getPutPatternsEs],
  ['event-handler', getEventHandlerPatternsEs],
  ['set', getSetPatternsEs],
  ['fetch', getFetchPatternsEs],
];
