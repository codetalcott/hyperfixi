/**
 * @hyperfixi/behaviors
 *
 * Reusable hyperscript behaviors for LokaScript.
 * Each behavior can be imported individually for tree-shaking,
 * or all behaviors can be registered at once.
 *
 * @example Individual import (tree-shakeable)
 * ```javascript
 * import { registerDraggable } from '@hyperfixi/behaviors/draggable';
 * await registerDraggable();
 * ```
 *
 * @example Import all
 * ```javascript
 * import { registerAll } from '@hyperfixi/behaviors';
 * await registerAll();
 * ```
 *
 * @example Registry-based lazy loading
 * ```javascript
 * import { loadBehavior, getBehaviorsByCategory } from '@hyperfixi/behaviors';
 * await loadBehavior('Draggable');
 * const uiBehaviors = getBehaviorsByCategory('ui');
 * ```
 *
 * @example CDN usage
 * ```html
 * <script src="lokascript-browser.js"></script>
 * <script src="@hyperfixi/behaviors/draggable.browser.js"></script>
 * <!-- Draggable is auto-registered -->
 * ```
 */

// =============================================================================
// Re-export individual behaviors
// =============================================================================

export {
  draggableSource,
  draggableMetadata,
  registerDraggable,
  default as Draggable,
} from './behaviors/draggable';

export {
  removableSource,
  removableMetadata,
  registerRemovable,
  default as Removable,
} from './behaviors/removable';

export {
  toggleableSource,
  toggleableMetadata,
  registerToggleable,
  default as Toggleable,
} from './behaviors/toggleable';

export {
  sortableSource,
  sortableMetadata,
  registerSortable,
  default as Sortable,
} from './behaviors/sortable';

export {
  resizableSource,
  resizableMetadata,
  registerResizable,
  default as Resizable,
} from './behaviors/resizable';

export {
  clipboardSource,
  clipboardMetadata,
  registerClipboard,
  default as Clipboard,
} from './behaviors/clipboard';

export {
  autoDismissSource,
  autoDismissMetadata,
  registerAutoDismiss,
  default as AutoDismiss,
} from './behaviors/autodismiss';

export {
  clickOutsideSource,
  clickOutsideMetadata,
  registerClickOutside,
  default as ClickOutside,
} from './behaviors/clickoutside';

export {
  focusTrapSource,
  focusTrapMetadata,
  registerFocusTrap,
  default as FocusTrap,
} from './behaviors/focustrap';

export {
  scrollRevealSource,
  scrollRevealMetadata,
  registerScrollReveal,
  default as ScrollReveal,
} from './behaviors/scrollreveal';

export { tabsSource, tabsMetadata, registerTabs, default as Tabs } from './behaviors/tabs';

// =============================================================================
// Types
// =============================================================================

export type {
  BehaviorSchema,
  BehaviorCategory,
  BehaviorTier,
  ParameterSchema,
  EventSchema,
  BehaviorModule,
  HyperscriptHost,
  HyperscriptWindow,
} from './schemas/types';

// =============================================================================
// Initialize registry with loaders (populates schemas and loaders)
// =============================================================================

import './loaders';

// =============================================================================
// Registry exports
// =============================================================================

export {
  // Registration
  registerBehavior,
  registerSchema,
  registerLoader,
  // Query (sync)
  getBehavior,
  tryGetBehavior,
  getSchema,
  tryGetSchema,
  isRegistered,
  hasLoader,
  getRegisteredBehaviors,
  getAvailableBehaviors,
  // Query by metadata
  getBehaviorsByCategory,
  getBehaviorsByTier,
  getAllSchemas,
  getAllSchemasRecord,
  // Lazy loading (async)
  loadBehavior,
  preloadTier,
  preloadCategory,
  loadAll,
  // Runtime registration
  registerWithRuntime,
  registerAllWithRuntime,
} from './registry';

// =============================================================================
// Generated types and metadata
// =============================================================================

export type {
  BehaviorName,
  UIBehavior,
  DataBehavior,
  AnimationBehavior,
  FormBehavior,
  LayoutBehavior,
  CoreBehavior,
  CommonBehavior,
  OptionalBehavior,
} from './generated/types';

export {
  ALL_BEHAVIOR_NAMES,
  BEHAVIORS_BY_CATEGORY,
  BEHAVIORS_BY_TIER,
  BEHAVIOR_CATEGORIES,
  BEHAVIOR_TIERS,
} from './generated/metadata';

// =============================================================================
// Curation status (curated / optional / experimental) — see curation.ts
// =============================================================================

export type { CurationStatus } from './curation';
export {
  CURATED_BEHAVIORS,
  OPTIONAL_BEHAVIORS,
  EXPERIMENTAL_BEHAVIORS,
  CURATION_STATUS,
  curationStatusOf,
  isCurated,
} from './curation';

// =============================================================================
// Convenience functions
// =============================================================================

import { registerDraggable } from './behaviors/draggable';
import { registerRemovable } from './behaviors/removable';
import { registerToggleable } from './behaviors/toggleable';
import { registerSortable } from './behaviors/sortable';
import { registerResizable } from './behaviors/resizable';
import { registerClipboard } from './behaviors/clipboard';
import { registerAutoDismiss } from './behaviors/autodismiss';
import { registerClickOutside } from './behaviors/clickoutside';
import { registerFocusTrap } from './behaviors/focustrap';
import { registerScrollReveal } from './behaviors/scrollreveal';
import { registerTabs } from './behaviors/tabs';
import type { HyperscriptHost } from './schemas/types';
import { resolveRuntime } from './schemas/types';

/**
 * Define every behavior on a hyperscript host.
 *
 * @param host - The host (`@hyperfixi/engine`'s `window.hyperfixi`, or upstream's
 *   `window._hyperscript`); defaults to the one on `window`
 *
 * @example
 * ```javascript
 * import { registerAll } from '@hyperfixi/behaviors';
 * await registerAll();
 * ```
 */
export async function registerAll(host?: HyperscriptHost): Promise<void> {
  await Promise.all([
    registerDraggable(host),
    registerRemovable(host),
    registerToggleable(host),
    registerSortable(host),
    registerResizable(host),
    registerClipboard(host),
    registerAutoDismiss(host),
    registerClickOutside(host),
    registerFocusTrap(host),
    registerScrollReveal(host),
    registerTabs(host),
  ]);
}

// =============================================================================
// Auto-definition for the browser bundles
// =============================================================================

/**
 * Resolves when every behavior is defined, when the package was loaded as a script tag after
 * the host; `null` otherwise.
 */
export let ready: Promise<void> | null = null;

// Loaded as a script tag after the host, before the document is ready, this runs before the
// host reads the page, so every `install` finds its behavior. Loaded later, the elements the
// host has already seen are processed again, so their installs can succeed now.
const _host = resolveRuntime();
if (_host) {
  ready = registerAll(_host)
    .then(() => {
      if (document.readyState !== 'loading') _host.processNode?.(document.body);
    })
    .catch(err => {
      console.error('[behaviors] Auto-definition failed:', err);
    });
}
