/**
 * Test Bundle: Baseline (Original Runtime)
 *
 * This bundle uses the original Runtime with all commands for comparison.
 * Expected size: ~511 KB (baseline for comparison)
 */

import { Runtime } from '../runtime/runtime';

// Create original runtime (imports all commands)
export const runtime = new Runtime();

// Export for browser global
if (typeof window !== 'undefined') {
  (window as any).HyperFixiBaseline = {
    runtime,
    version: '1.0.0-baseline',
    commands: 'all',
  };
}

export default runtime;
