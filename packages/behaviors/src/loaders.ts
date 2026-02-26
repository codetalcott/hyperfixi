/**
 * Behavior Loaders
 *
 * Registers lazy loaders for all behaviors.
 * Import this module to enable on-demand loading without bundling all behaviors.
 *
 * @example
 * ```typescript
 * // Enable lazy loading
 * import '@hyperfixi/behaviors/loaders';
 *
 * // Now load behaviors on demand
 * import { loadBehavior } from '@hyperfixi/behaviors/registry';
 * await loadBehavior('Draggable');
 * ```
 */

import { registerLoader, registerSchema } from './registry';

// Register schemas for metadata queries before loading
import { draggableSchema } from './schemas/draggable.schema';
import { sortableSchema } from './schemas/sortable.schema';
import { resizableSchema } from './schemas/resizable.schema';
import { removableSchema } from './schemas/removable.schema';
import { toggleableSchema } from './schemas/toggleable.schema';
import { clipboardSchema } from './schemas/clipboard.schema';
import { autoDismissSchema } from './schemas/autodismiss.schema';
import { clickOutsideSchema } from './schemas/clickoutside.schema';
import { focusTrapSchema } from './schemas/focustrap.schema';
import { scrollRevealSchema } from './schemas/scrollreveal.schema';
import { tabsSchema } from './schemas/tabs.schema';

// Register all schemas
registerSchema(draggableSchema);
registerSchema(sortableSchema);
registerSchema(resizableSchema);
registerSchema(removableSchema);
registerSchema(toggleableSchema);
registerSchema(clipboardSchema);
registerSchema(autoDismissSchema);
registerSchema(clickOutsideSchema);
registerSchema(focusTrapSchema);
registerSchema(scrollRevealSchema);
registerSchema(tabsSchema);

// Register lazy loaders - behaviors are only loaded when requested
registerLoader('Draggable', () => import('./behaviors/draggable'));
registerLoader('Sortable', () => import('./behaviors/sortable'));
registerLoader('Resizable', () => import('./behaviors/resizable'));
registerLoader('Removable', () => import('./behaviors/removable'));
registerLoader('Toggleable', () => import('./behaviors/toggleable'));
registerLoader('Clipboard', () => import('./behaviors/clipboard'));
registerLoader('AutoDismiss', () => import('./behaviors/autodismiss'));
registerLoader('ClickOutside', () => import('./behaviors/clickoutside'));
registerLoader('FocusTrap', () => import('./behaviors/focustrap'));
registerLoader('ScrollReveal', () => import('./behaviors/scrollreveal'));
registerLoader('Tabs', () => import('./behaviors/tabs'));
