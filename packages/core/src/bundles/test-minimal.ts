/**
 * Test Bundle: Minimal (2 commands)
 *
 * This bundle uses RuntimeExperimental with only 2 commands for tree-shaking testing.
 * Expected size: ~90 KB (82% reduction from 511 KB baseline)
 */

import { createMinimalRuntime } from '../runtime/runtime-experimental';
import { createHideCommand, createShowCommand } from '../commands';

// Create runtime with only 2 commands
export const runtime = createMinimalRuntime([createHideCommand(), createShowCommand()]);

// Export for browser global
if (typeof window !== 'undefined') {
  (window as any).HyperFixiMinimal = {
    runtime,
    version: '1.0.0-experimental',
    commands: ['hide', 'show'],
  };
}

export default runtime;
