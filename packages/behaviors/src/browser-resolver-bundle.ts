/**
 * Browser Behavior Resolver Bundle
 *
 * Pre-registers all standard behavior definitions with the hyperfixi runtime.
 * Include after hyperfixi.js — all standard behaviors become available.
 *
 * Usage:
 *   <script src="hyperfixi.js"></script>
 *   <script src="hyperfixi-behaviors.js"></script>
 *   <!-- install Toggleable, Draggable, etc. just work -->
 */

import { BEHAVIOR_SOURCES } from './behavior-resolver';

function init() {
  const hf = (window as any).hyperfixi;
  if (!hf?.compileSync || !hf?.execute) return;

  // Compile and register each behavior definition with the runtime.
  // This is equivalent to having them in a <script type="text/hyperscript"> block.
  for (const [name, source] of Object.entries(BEHAVIOR_SOURCES)) {
    const result = hf.compileSync(source, { traditional: true });
    if (result?.ok && result.ast) {
      // execute() registers the behavior in the runtime's behaviorRegistry
      hf.execute(result.ast).catch(() => {
        // Async — errors handled silently
      });
    }
  }

  // Re-scan: the attribute processor may have already processed elements
  // and failed (behaviors weren't registered). Reset and re-init.
  const ap = hf.attributeProcessor;
  if (ap) {
    ap.reset();
    ap.init();
  }
}

if (typeof window !== 'undefined') {
  init();
}
