/**
 * Removable Behavior
 *
 * A simple behavior that removes an element when clicked.
 * Supports optional confirmation and transition effects.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div _="install Removable">Click to remove</div>
 *
 * <!-- With confirmation -->
 * <div _="install Removable(confirm: true)">Click to remove (with confirm)</div>
 *
 * <!-- With fade transition -->
 * <div _="install Removable(transition: fade)">Click to fade out</div>
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
behavior Removable(confirm, transition)
  on click
    if confirm
      if not window.confirm("Are you sure?")
        halt
      end
    end
    trigger removable:before
    if transition is "fade"
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
  version: '1.0.0',
  description: 'Makes elements removable on click',
  parameters: [
    {
      name: 'confirm',
      type: 'boolean',
      optional: true,
      default: 'false',
      description: 'Show confirmation dialog before removal',
    },
    {
      name: 'transition',
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
  hyperfixi?: { compile: (code: string) => any; execute: (ast: any, ctx: any) => Promise<any> }
): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compile(removableSource);

  if (!result.success) {
    throw new Error(`Failed to compile Removable behavior: ${JSON.stringify(result.errors)}`);
  }

  await hf.execute(result.ast, {});
}

// Auto-register when loaded as a script tag
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerRemovable().catch(console.error);
    });
  } else {
    registerRemovable().catch(console.error);
  }
}

export default {
  source: removableSource,
  metadata: removableMetadata,
  register: registerRemovable,
};
