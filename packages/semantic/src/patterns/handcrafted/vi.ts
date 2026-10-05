/**
 * Vietnamese's hand-crafted patterns, one source per command (see ../handcrafted.ts).
 * languages/vi.ts registers them through `../core`.
 */
import type { HandcraftedPatterns } from '../handcrafted';
import { getTogglePatternsVi } from '../toggle';
import { getPutPatternsVi } from '../put';
import { getEventHandlerPatternsVi } from '../event-handler';
import { getAddPatternsVi } from '../add';
import { getRemovePatternsVi } from '../remove';
import { getShowPatternsVi } from '../show';
import { getHidePatternsVi } from '../hide';
import { getSetPatternsVi } from '../set';
import { getGetPatternsVi } from '../get';
import { getIncrementPatternsVi } from '../increment';
import { getDecrementPatternsVi } from '../decrement';
import { getFetchPatternsVi } from '../fetch';
import { getViewTransitionPatternsVi } from '../view-transition';

export const handcraftedPatterns: HandcraftedPatterns = [
  ['toggle', getTogglePatternsVi],
  ['put', getPutPatternsVi],
  ['event-handler', getEventHandlerPatternsVi],
  ['add', getAddPatternsVi],
  ['remove', getRemovePatternsVi],
  ['show', getShowPatternsVi],
  ['hide', getHidePatternsVi],
  ['set', getSetPatternsVi],
  ['get', getGetPatternsVi],
  ['increment', getIncrementPatternsVi],
  ['decrement', getDecrementPatternsVi],
  ['fetch', getFetchPatternsVi],
  ['viewTransition', getViewTransitionPatternsVi],
];
