/**
 * The behavior sources, by name, and the function that defines them on a host.
 *
 * Every consumer — the npm `register*()` functions, the browser bundle
 * (`resolver.browser.global.js`) and `@hyperfixi/patterns-reference` — reads the same
 * `source` string from each schema in `src/schemas/`. A host defines a behavior from its
 * source exactly as it would from a page's `<script type="text/hyperscript">`.
 */

import { toggleableSchema } from './schemas/toggleable.schema';
import { removableSchema } from './schemas/removable.schema';
import { autoDismissSchema } from './schemas/autodismiss.schema';
import { clipboardSchema } from './schemas/clipboard.schema';
import { draggableSchema } from './schemas/draggable.schema';
import { clickOutsideSchema } from './schemas/clickoutside.schema';
import { scrollRevealSchema } from './schemas/scrollreveal.schema';
import { tabsSchema } from './schemas/tabs.schema';
import { focusTrapSchema } from './schemas/focustrap.schema';
import { sortableSchema } from './schemas/sortable.schema';
import { resizableSchema } from './schemas/resizable.schema';
import type { HyperscriptHost } from './schemas/types';

export const BEHAVIOR_SOURCES: Record<string, string> = {
  Toggleable: toggleableSchema.source,
  Removable: removableSchema.source,
  AutoDismiss: autoDismissSchema.source,
  Clipboard: clipboardSchema.source,
  Draggable: draggableSchema.source,
  ClickOutside: clickOutsideSchema.source,
  ScrollReveal: scrollRevealSchema.source,
  Tabs: tabsSchema.source,
  FocusTrap: focusTrapSchema.source,
  Sortable: sortableSchema.source,
  Resizable: resizableSchema.source,
};

/**
 * Define the named behaviors (every one by default) on a host. A source that does not
 * parse is reported and skipped, so one bad behavior does not take the others with it.
 *
 * @returns the names that were defined
 */
export function defineBehaviors(
  host: HyperscriptHost,
  names: readonly string[] = Object.keys(BEHAVIOR_SOURCES)
): string[] {
  const defined: string[] = [];
  for (const name of names) {
    const source = BEHAVIOR_SOURCES[name];
    if (!source) continue;
    try {
      host.evaluate(source);
      defined.push(name);
    } catch (e) {
      console.error(`[behaviors] ${name} did not parse: ${(e as Error).message}`);
    }
  }
  return defined;
}
