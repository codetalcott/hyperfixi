/**
 * Test Bundle: Standard (21 commands)
 *
 * This bundle uses RuntimeExperimental with all 21 V2 commands for tree-shaking testing.
 * Phase 5 (16 commands) + Phase 6-1 (5 control flow commands)
 * Expected size: ~140 KB (62% reduction from 366 KB baseline)
 */

import { createRuntimeExperimental } from '../runtime/runtime-experimental';

// Create runtime with all 21 V2 commands (default behavior)
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
      // Control Flow (5)
      'if',
      'repeat',
      'break',
      'continue',
      'halt',
    ],
  };
}

export default runtime;
