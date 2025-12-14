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
behavior Toggleable(class, target)
  init
    if no class set the class to "active"
    if no target set the target to me
  end
  on click
    if the target matches the class
      remove the class from the target
      trigger toggleable:off
    else
      add the class to the target
      trigger toggleable:on
    end
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
      name: 'class',
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
  hyperfixi?: { compile: (code: string) => any; execute: (ast: any, ctx: any) => Promise<any> }
): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compile(toggleableSource);

  if (!result.success) {
    throw new Error(`Failed to compile Toggleable behavior: ${JSON.stringify(result.errors)}`);
  }

  await hf.execute(result.ast, {});
}

// Auto-register when loaded as a script tag
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerToggleable().catch(console.error);
    });
  } else {
    registerToggleable().catch(console.error);
  }
}

export default {
  source: toggleableSource,
  metadata: toggleableMetadata,
  register: registerToggleable,
};
