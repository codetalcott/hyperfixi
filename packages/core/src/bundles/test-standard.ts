/**
 * Test Bundle: Standard (16 commands)
 *
 * This bundle uses RuntimeExperimental with all 16 V2 commands for tree-shaking testing.
 * Expected size: ~200 KB (61% reduction from 511 KB baseline)
 */

import { createRuntimeExperimental } from '../runtime/runtime-experimental';

// Create runtime with all 16 V2 commands (default behavior)
export const runtime = createRuntimeExperimental();

// Export for browser global
if (typeof window !== 'undefined') {
  (window as any).HyperFixiStandard = {
    runtime,
    version: '1.0.0-experimental',
    commands: [
      // DOM (7)
      'hide',
      'show',
      'add',
      'remove',
      'toggle',
      'put',
      'make',
      // Async (2)
      'wait',
      'fetch',
      // Data (3)
      'set',
      'increment',
      'decrement',
      // Utility (1)
      'log',
      // Events (2)
      'trigger',
      'send',
      // Navigation (1)
      'go',
    ],
  };
}

export default runtime;
