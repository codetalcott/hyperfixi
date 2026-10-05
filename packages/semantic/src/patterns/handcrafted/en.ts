/**
 * English's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/en.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsEn } from '../toggle';
import { getPutPatternsEn } from '../put';
import { getEventHandlerPatternsEn } from '../event-handler';
import { getWaitPatternsEn } from '../wait';
import { getAppendPatternsEn } from '../append';
import { getPrependPatternsEn } from '../prepend';
import { getTriggerPatternsEn } from '../trigger';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsEn],
  ['put', getPutPatternsEn],
  ['event-handler', getEventHandlerPatternsEn],
  ['wait', getWaitPatternsEn],
  ['append', getAppendPatternsEn],
  ['prepend', getPrependPatternsEn],
  ['trigger', getTriggerPatternsEn],
];
