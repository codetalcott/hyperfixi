/**
 * HyperFixi Modular Browser Bundle
 *
 * This is an example of a tree-shakeable bundle that only includes
 * the commands and expressions you explicitly import.
 *
 * Bundle size: ~15-25 KB gzipped (depending on selected features)
 *
 * ## How Tree-Shaking Works
 *
 * 1. Commands are imported as factory functions, not executed at module load
 * 2. Expression categories are passed to ConfigurableExpressionEvaluator
 * 3. Parser is selected based on needs (regex < hybrid < full)
 * 4. Bundlers (Rollup, esbuild, webpack) eliminate unused code
 *
 * ## Customizing Your Bundle
 *
 * Copy this file and modify the imports to include only what you need:
 *
 * ```typescript
 * // Minimal bundle (~15 KB) - 3 commands, core expressions, regex parser
 * import { toggle, add, remove } from '../commands';
 * import { references, logical } from '../expressions';
 * import { regexParser } from '../parser/regex-parser';
 *
 * // Standard bundle (~25 KB) - 8 commands, common expressions, hybrid parser
 * import { toggle, add, remove, show, hide, set, get, log } from '../commands';
 * import { references, logical, special, positional } from '../expressions';
 * import { hybridParser } from '../parser/hybrid-parser';
 *
 * // Full bundle (~180 KB) - all commands, all expressions, full parser
 * // (Use browser-bundle.ts instead for this)
 * ```
 */

// =============================================================================
// STEP 1: Import only the commands you need
// =============================================================================
import {
  // DOM commands
  toggle,
  add,
  remove,
  show,
  hide,

  // Data commands
  set,

  // Utility commands
  log,

  // Event commands
  send,
} from '../commands';

// =============================================================================
// STEP 2: Import only the expression categories you need
// =============================================================================
import {
  references, // me, you, it, CSS selectors
  logical, // comparisons, and/or/not
  special, // literals, math
} from '../expressions';

// =============================================================================
// STEP 3: Choose your parser (smaller = less coverage, larger = more features)
// =============================================================================
// Option A: Regex parser (~5 KB) - 8 commands, simple syntax only
// import { regexParser as parser } from '../parser/regex-parser';

// Option B: Hybrid parser (~7 KB) - 21+ commands, ~85% coverage
import { hybridParser as parser } from '../parser/hybrid-parser';

// Option C: Full parser (~180 KB) - 48 commands, 100% coverage
// import { fullParser as parser } from '../parser/full-parser';

// =============================================================================
// STEP 4: Create the runtime with your selected components
// =============================================================================
import { createRuntime, type HyperFixiRuntime } from '../runtime/runtime-factory';
import { ConfigurableExpressionEvaluator } from '../core/configurable-expression-evaluator';

// List of command factories to register
const commandFactories = [toggle, add, remove, show, hide, set, log, send];

// Expression categories to include
const expressionCategories = [references, logical, special];

// Create the runtime
const hyperfixi: HyperFixiRuntime = createRuntime({
  commands: commandFactories,
  expressions: expressionCategories,
  parser: parser,
});

// =============================================================================
// PUBLIC API
// =============================================================================

const api = {
  version: '1.0.0-modular',

  /**
   * Parse hyperscript code into AST
   */
  parse: (code: string) => hyperfixi.parse(code),

  /**
   * Execute hyperscript code on an element
   */
  execute: async (code: string, element?: Element) => {
    return hyperfixi.run(code, element);
  },

  /**
   * Run is an alias for execute
   */
  run: async (code: string, element?: Element) => {
    return hyperfixi.run(code, element);
  },

  /**
   * Process all _="" attributes in the document
   */
  init: () => processElements(document),

  /**
   * Process _="" attributes in a specific root
   */
  process: processElements,

  /**
   * The underlying runtime (for advanced use)
   */
  runtime: hyperfixi.runtime,

  /**
   * List of available commands
   */
  commands: commandFactories.map(f => f().name || f.name),

  /**
   * Parser being used
   */
  parserName: parser.name,
};

/**
 * Process all elements with _="" attributes
 */
function processElements(root: Element | Document = document): void {
  const elements = root.querySelectorAll('[_]');

  for (const el of elements) {
    const code = el.getAttribute('_');
    if (code) {
      try {
        hyperfixi.run(code, el);
      } catch (err) {
        console.error('HyperFixi Modular error:', err, 'Code:', code);
      }
    }
  }
}

// =============================================================================
// AUTO-INITIALIZE
// =============================================================================

if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }
}

export default api;

// Named exports for ESM usage
export {
  hyperfixi,
  api,
  processElements,
  // Re-export for advanced customization
  createRuntime,
  ConfigurableExpressionEvaluator,
};
