/**
 * Behavior Resolver — Lazy compilation of hyperscript behaviors
 *
 * Provides a resolver function that compiles behavior source strings on demand.
 * When the runtime encounters `install X` and X isn't registered, it calls
 * the resolver. If the resolver has source for X, it compiles it, registers
 * the behavior, and installation proceeds normally.
 *
 * @example
 * ```typescript
 * import { createBehaviorResolver } from '@hyperfixi/behaviors/resolver';
 *
 * const resolve = createBehaviorResolver(window.hyperfixi, window._hyperscript.behaviors);
 * window._hyperscript.behaviors.resolve = resolve;
 *
 * // Now `install Toggleable` will compile the behavior on first use
 * ```
 */

import { toggleableSchema } from './schemas/toggleable.schema';
import { removableSchema } from './schemas/removable.schema';
import { autoDismissSchema } from './schemas/autodismiss.schema';
import { clipboardSchema } from './schemas/clipboard.schema';
import { draggableSchema } from './schemas/draggable.schema';
import { clickOutsideSchema } from './schemas/clickoutside.schema';
import { scrollRevealSchema } from './schemas/scrollreveal.schema';
import { tabsSchema } from './schemas/tabs.schema';

export const BEHAVIOR_SOURCES: Record<string, string> = {
  Toggleable: toggleableSchema.source,
  Removable: removableSchema.source,
  AutoDismiss: autoDismissSchema.source,
  Clipboard: clipboardSchema.source,
  Draggable: draggableSchema.source,
  ClickOutside: clickOutsideSchema.source,
  ScrollReveal: scrollRevealSchema.source,
  Tabs: tabsSchema.source,
};

interface CompileResult {
  ok: boolean;
  ast?: any;
  errors?: unknown[];
}

interface BehaviorAPI {
  set(name: string, definition: any): void;
}

interface HyperFixiAPI {
  compileSync(code: string, options?: { traditional?: boolean }): CompileResult;
}

/**
 * Create a behavior resolver that compiles hyperscript source on demand.
 *
 * The returned function is meant to be assigned to `_hyperscript.behaviors.resolve`.
 * When called with a behavior name, it looks up the source, compiles it,
 * and registers the resulting AST in the behavior registry.
 *
 * @param hyperfixi - The hyperfixi API (needs compileSync)
 * @param behaviorAPI - The behavior registry API (needs set)
 * @returns Resolver function: (name: string) => boolean
 */
export function createBehaviorResolver(
  hyperfixi: HyperFixiAPI,
  behaviorAPI: BehaviorAPI
): (name: string) => boolean {
  return (name: string): boolean => {
    const source = BEHAVIOR_SOURCES[name];
    if (!source) return false;

    const result = hyperfixi.compileSync(source, { traditional: true });
    if (!result.ok || !result.ast) return false;

    const ast = result.ast as any;
    behaviorAPI.set(name, {
      name: ast.name,
      parameters: ast.parameters,
      eventHandlers: ast.eventHandlers,
      initBlock: ast.initBlock,
    });
    return true;
  };
}
