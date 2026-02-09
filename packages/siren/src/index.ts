/**
 * @lokascript/siren — Siren hypermedia plugin for LokaScript.
 *
 * Makes Siren API responses drive DOM behavior declaratively.
 * The server's affordances (actions, links, entities) become the engine of UI state.
 */

// Plugin
export { sirenPlugin } from './plugin';

// Types
export type {
  SirenEntity,
  SirenAction,
  SirenField,
  SirenLink,
  SirenSubEntity,
  SirenEntityEventDetail,
  SirenBlockedEventDetail,
  SirenErrorEventDetail,
} from './types';

// Client
export {
  fetchSiren,
  getCurrentEntity,
  getCurrentUrl,
  setCurrentEntity,
  resetClient,
} from './siren-client';

// Context
export { sirenContextProvider } from './siren-context';
export type { SirenContextValue } from './siren-context';

// Commands
export { followCommand } from './commands/follow';
export { executeActionCommand } from './commands/execute-action';

// Behaviors
export {
  createSirenAffordance,
  type SirenAffordanceConfig,
  type SirenAffordanceInstance,
} from './behaviors/siren-affordance';

// Utilities
export { resolveUrl, reconcileFields, classifyError } from './util';

// Auto-register for script tag usage
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (win.lokascript?.registry) {
    import('./plugin').then(({ sirenPlugin }) => {
      win.lokascript.registry.use(sirenPlugin);
    });
  }
}
