/**
 * Test Bundle: Standard (41 commands)
 *
 * This bundle uses RuntimeExperimental with all 41 V2 commands for tree-shaking testing.
 * Phase 5 (16) + Phase 6-1 (5 control flow) + Phase 6-2 (5 data/execution) + Phase 6-3 (4 animation) + Phase 6-4 (5 advanced) + Phase 6-5 (6 utility/specialized)
 * Expected size: ~215 KB (42% reduction from 368 KB baseline)
 */

import { createRuntimeExperimental } from '../runtime/runtime-experimental';

// Create runtime with all 41 V2 commands (default behavior)
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
      // Control Flow (7)
      'if',
      'repeat',
      'break',
      'continue',
      'halt',
      'return',
      'exit',
      // Phase 6-2: Data & Execution (5)
      'bind',
      'call',
      'append',
      // Phase 6-3: Animation & Persistence (4)
      'transition',
      'measure',
      'settle',
      'persist',
      // Phase 6-4: Advanced Features (5)
      'js',
      'async',
      'unless',
      'default',
      'pseudo-command',
      // Phase 6-5: Utility & Specialized (6)
      'tell',
      'copy',
      'pick',
      'throw',
      'beep',
      'install',
    ],
  };
}

export default runtime;
