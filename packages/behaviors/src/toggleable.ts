/**
 * Toggleable Behavior
 *
 * A behavior that toggles a CSS class on click.
 * Useful for accordions, dropdowns, and toggle buttons.
 *
 * @example
 * ```html
 * <!-- Basic usage (toggles .active) -->
 * <button _="install Toggleable">Toggle</button>
 *
 * <!-- Custom class -->
 * <div _="install Toggleable(class: expanded)">
 *   <h3>Click to expand</h3>
 *   <div class="content">Hidden content</div>
 * </div>
 *
 * <!-- Toggle on another element -->
 * <button _="install Toggleable(target: #menu, class: open)">Menu</button>
 * <nav id="menu">...</nav>
 * ```
 *
 * @events
 * - `toggleable:on` - Fired when class is added
 * - `toggleable:off` - Fired when class is removed
 */

/**
 * The hyperscript source code for the Toggleable behavior.
 */
export const toggleableSource = `
behavior Toggleable(cls, target)
  init
    if cls is undefined
      set cls to "active"
    end
    if target is undefined
      set target to me
    end
  end
  on click
    toggle .{cls} on target
  end
end
`.trim();

/**
 * Behavior metadata for documentation and tooling.
 */
export const toggleableMetadata = {
  name: 'Toggleable',
  version: '1.0.0',
  description: 'Toggles a CSS class on click',
  parameters: [
    {
      name: 'cls',
      type: 'string',
      optional: true,
      default: 'active',
      description: 'CSS class to toggle',
    },
    {
      name: 'target',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element to toggle the class on',
    },
  ],
  events: [
    { name: 'toggleable:on', description: 'Fired when class is added' },
    { name: 'toggleable:off', description: 'Fired when class is removed' },
  ],
};

/**
 * Register the Toggleable behavior with HyperFixi.
 */
export async function registerToggleable(
  hyperfixi?: { compile: (code: string, options?: { disableSemanticParsing?: boolean }) => any; execute: (ast: any, ctx: any) => Promise<any>; createContext: () => any }
): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  // Disable semantic parsing for behaviors - they use complex control flow
  const result = hf.compile(toggleableSource, { disableSemanticParsing: true });

  if (!result.success) {
    throw new Error(`Failed to compile Toggleable behavior: ${JSON.stringify(result.errors)}`);
  }

  // Use createContext() to get a proper execution context with locals Map
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
// Register SYNCHRONOUSLY so behaviors are available before attribute processing
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  registerToggleable().catch(console.error);
}

export default {
  source: toggleableSource,
  metadata: toggleableMetadata,
  register: registerToggleable,
};
