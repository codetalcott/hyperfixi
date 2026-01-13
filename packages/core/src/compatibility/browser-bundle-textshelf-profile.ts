/**
 * HyperFixi TextShelf Profile Bundle
 *
 * Custom tree-shaken bundle for projects/textshelf using the new
 * createRuntime() tree-shaking architecture.
 *
 * Based on analysis of 332 hyperscript instances across 42 templates.
 *
 * ## Commands Included (10)
 *
 * | Category | Commands | Usage |
 * |----------|----------|-------|
 * | DOM | add, remove, toggle, show, hide | Class manipulation |
 * | Animation | transition | Opacity fades |
 * | Data | set | Property updates |
 * | Async | wait | Timing delays |
 * | Navigation | go | Scroll to bottom |
 * | Execution | call | alert() for errors |
 *
 * ## Expression Categories (3)
 *
 * - references: me, my, CSS selectors (#id, .class)
 * - logical: Basic comparisons
 * - special: String/number literals
 *
 * ## Bundle Size
 *
 * Target: ~5 KB gzipped (vs 12 KB official hyperscript)
 *
 * ## TextShelf Usage Patterns
 *
 * ```html
 * <!-- Fade-in notification -->
 * <div _="on load transition opacity to 1 then wait 3s then transition opacity to 0">
 *
 * <!-- Form button enabling -->
 * <input _="on change add .btn-primary to #saver">
 *
 * <!-- Disabled toggle during HTMX -->
 * <button _="on click toggle .disabled until htmx:afterOnLoad">
 *
 * <!-- Color picker binding -->
 * <input _="on input set #primary_color.value to my value">
 * ```
 */

// =============================================================================
// TREE-SHAKEABLE IMPORTS - Only what TextShelf needs
// =============================================================================

// Commands (using new factory exports)
import {
  toggle, // Toggle disabled states
  add, // Add CSS classes
  remove, // Remove elements
  show, // Show elements
  hide, // Hide elements
  set, // Set properties
  wait, // Timing delays
  go, // Scroll navigation
  transition, // CSS transitions
  call, // Call alert() for errors
} from '../commands';

// Expression categories (minimal set)
import {
  references, // me, my, CSS selectors
  logical, // Comparisons
  special, // Literals
} from '../expressions';

// Parser (hybrid handles "then" chaining)
import { hybridParser } from '../parser/hybrid-parser';

// Runtime factory
import { createRuntime, type HyperFixiRuntime } from '../runtime/runtime-factory';

// =============================================================================
// CREATE RUNTIME - Tree-shaken to only include TextShelf commands
// =============================================================================

const hyperfixi: HyperFixiRuntime = createRuntime({
  commands: [
    // DOM (5)
    toggle,
    add,
    remove,
    show,
    hide,
    // Animation (1)
    transition,
    // Data (1)
    set,
    // Async (1)
    wait,
    // Navigation (1)
    go,
    // Execution (1)
    call,
  ],
  expressions: [references, logical, special],
  parser: hybridParser,
});

// =============================================================================
// DOM PROCESSOR - Handle _="" attributes
// =============================================================================

function processElement(el: Element): void {
  const code = el.getAttribute('_');
  if (!code) return;

  try {
    // Parse event handlers: "on click toggle .active"
    const eventMatch = code.match(/^on\s+(\S+)(?:\s+from\s+(\S+))?\s*/i);
    if (eventMatch) {
      const eventName = eventMatch[1];
      const eventFilter = eventMatch[2];
      const commands = code.slice(eventMatch[0].length);

      // Handle "until" modifier
      const untilMatch = commands.match(/\s+until\s+(\S+)/i);
      const cleanCommands = commands.replace(/\s+until\s+\S+/i, '');

      const handler = async (e: Event) => {
        try {
          await hyperfixi.run(cleanCommands, el as Element);
        } catch (err) {
          console.error('HyperFixi TextShelf error:', err, 'Code:', cleanCommands);
        }
      };

      // Add event listener
      el.addEventListener(eventName, handler);

      // Handle "until" - remove listener when until event fires
      if (untilMatch) {
        const untilEvent = untilMatch[1];
        const untilHandler = () => {
          el.removeEventListener(eventName, handler);
          el.removeEventListener(untilEvent, untilHandler);
        };
        el.addEventListener(untilEvent, untilHandler);
      }

      return;
    }

    // Handle "init" blocks
    if (code.trim().startsWith('init')) {
      const initCommands = code.replace(/^init\s*/i, '');
      hyperfixi.run(initCommands, el as Element);
      return;
    }

    // Direct command execution
    hyperfixi.run(code, el as Element);
  } catch (err) {
    console.error('HyperFixi TextShelf error:', err, 'Code:', code);
  }
}

function processElements(root: Element | Document = document): void {
  const elements = root.querySelectorAll('[_]');
  elements.forEach(processElement);
}

// =============================================================================
// PUBLIC API
// =============================================================================

const api = {
  version: '1.0.0-textshelf',

  // Parsing
  parse: (code: string) => hyperfixi.parse(code),

  // Execution
  execute: async (code: string, element?: Element) => hyperfixi.run(code, element),
  run: async (code: string, element?: Element) => hyperfixi.run(code, element),
  eval: async (code: string, element?: Element) => hyperfixi.run(code, element),

  // DOM processing
  init: () => processElements(document),
  process: processElements,

  // Internals
  runtime: hyperfixi.runtime,

  // Metadata
  commands: ['toggle', 'add', 'remove', 'show', 'hide', 'transition', 'set', 'wait', 'go', 'call'],
  parserName: 'hybrid',
};

// =============================================================================
// AUTO-INITIALIZE
// =============================================================================

if (typeof window !== 'undefined') {
  // Expose as hyperfixi
  (window as any).hyperfixi = api;

  // Also expose as _hyperscript for drop-in compatibility with existing code
  (window as any)._hyperscript = api;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }

  // Re-process on HTMX content swaps (critical for TextShelf!)
  document.addEventListener('htmx:afterSettle', (e: Event) => {
    const target = (e as CustomEvent).detail?.target;
    if (target) {
      processElements(target);
    }
  });
}

export default api;
export { hyperfixi, api, processElements };
