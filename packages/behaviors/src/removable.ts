/**
 * Removable Behavior
 *
 * A behavior that removes an element when a trigger is clicked.
 * Supports optional confirmation and transition effects.
 *
 * @example
 * ```html
 * <!-- Basic usage (click anywhere on element) -->
 * <div _="install Removable">Click to remove</div>
 *
 * <!-- With a specific trigger element -->
 * <div _="install Removable(trigger: #close-btn)">
 *   <button id="close-btn">×</button>
 *   Content that will be removed
 * </div>
 *
 * <!-- With confirmation -->
 * <div _="install Removable(confirm: true)">Click to remove (with confirm)</div>
 *
 * <!-- With fade effect -->
 * <div _="install Removable(effect: 'fade')">Click to fade out</div>
 * ```
 *
 * @events
 * - `removable:before` - Fired before removal (cancelable)
 * - `removable:removed` - Fired after removal
 */

/**
 * The hyperscript source code for the Removable behavior.
 */
export const removableSource = `
behavior Removable(trigger, confirm, effect)
  init
    if trigger is undefined
      set trigger to me
    end
  end
  on click from trigger
    if confirm
      if not window.confirm("Are you sure?")
        halt
      end
    end
    trigger removable:before
    if effect is "fade"
      transition opacity to 0 over 300ms
    end
    trigger removable:removed
    remove me
  end
end
`.trim();

/**
 * Behavior metadata for documentation and tooling.
 */
export const removableMetadata = {
  name: 'Removable',
  version: '1.1.0',
  description: 'Makes elements removable on click',
  parameters: [
    {
      name: 'trigger',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element that triggers removal (e.g., a close button)',
    },
    {
      name: 'confirm',
      type: 'boolean',
      optional: true,
      default: 'false',
      description: 'Show confirmation dialog before removal',
    },
    {
      name: 'effect',
      type: 'string',
      optional: true,
      default: 'none',
      description: 'Transition effect: "fade" or "none"',
    },
  ],
  events: [
    { name: 'removable:before', description: 'Fired before removal (cancelable)' },
    { name: 'removable:removed', description: 'Fired after removal' },
  ],
};

/**
 * Register the Removable behavior with HyperFixi.
 */
export async function registerRemovable(
  hyperfixi?: { compile: (code: string, options?: { disableSemanticParsing?: boolean }) => any; execute: (ast: any, ctx: any) => Promise<any>; createContext: () => any }
): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  // Disable semantic parsing for behaviors - they use complex control flow
  const result = hf.compile(removableSource, { disableSemanticParsing: true });

  if (!result.success) {
    throw new Error(`Failed to compile Removable behavior: ${JSON.stringify(result.errors)}`);
  }

  // Use createContext() to get a proper execution context with locals Map
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
// Register SYNCHRONOUSLY so behaviors are available before attribute processing
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  registerRemovable().catch(console.error);
}

export default {
  source: removableSource,
  metadata: removableMetadata,
  register: registerRemovable,
};
