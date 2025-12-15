/**
 * Sortable Behavior
 *
 * A behavior for drag-and-drop reordering of list items.
 * Apply to a container element; children become sortable.
 *
 * @example
 * ```html
 * <!-- Basic sortable list -->
 * <ul _="install Sortable">
 *   <li>Item 1</li>
 *   <li>Item 2</li>
 *   <li>Item 3</li>
 * </ul>
 *
 * <!-- With custom drag handle -->
 * <ul _="install Sortable(handle: .grip)">
 *   <li><span class="grip">⋮</span> Item 1</li>
 *   <li><span class="grip">⋮</span> Item 2</li>
 * </ul>
 *
 * <!-- With drag class -->
 * <ul _="install Sortable(dragClass: dragging)">
 *   <li>Item 1</li>
 *   <li>Item 2</li>
 * </ul>
 * ```
 *
 * @events
 * - `sortable:start` - Fired when drag begins
 * - `sortable:move` - Fired during reordering
 * - `sortable:end` - Fired when drag completes
 */

/**
 * The hyperscript source code for the Sortable behavior.
 */
export const sortableSource = `
behavior Sortable(handle, dragClass)
  init
    if no dragClass set dragClass to "sorting"
  end
  on pointerdown(target, clientY) from me
    set item to closest <li, [data-sortable-item]/> in target
    if no item exit
    if handle
      set handleEl to target.closest(handle)
      if no handleEl exit
    end
    halt the event
    add dragClass to item
    trigger sortable:start on me
    repeat until event pointerup from document
      wait for pointermove(clientY) from document
      trigger sortable:move on me
    end
    remove dragClass from item
    trigger sortable:end on me
  end
end
`.trim();

/**
 * Behavior metadata for documentation and tooling.
 */
export const sortableMetadata = {
  name: 'Sortable',
  version: '1.0.0',
  description: 'Makes child elements reorderable via drag-and-drop',
  parameters: [
    {
      name: 'handle',
      type: 'selector',
      optional: true,
      default: 'none',
      description: 'CSS selector for drag handles within items',
    },
    {
      name: 'dragClass',
      type: 'string',
      optional: true,
      default: 'sorting',
      description: 'CSS class added to item during drag',
    },
  ],
  events: [
    { name: 'sortable:start', description: 'Fired when drag begins' },
    { name: 'sortable:move', description: 'Fired when items are reordered' },
    { name: 'sortable:end', description: 'Fired when drag completes' },
  ],
};

/**
 * Register the Sortable behavior with HyperFixi.
 */
export async function registerSortable(
  hyperfixi?: { compile: (code: string, options?: { disableSemanticParsing?: boolean }) => any; execute: (ast: any, ctx: any) => Promise<any>; createContext: () => any }
): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  // Disable semantic parsing for behaviors - they use complex control flow
  const result = hf.compile(sortableSource, { disableSemanticParsing: true });

  if (!result.success) {
    throw new Error(`Failed to compile Sortable behavior: ${JSON.stringify(result.errors)}`);
  }

  // Use createContext() to get a proper execution context with locals Map
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(result.ast, ctx);
}

// Auto-register when loaded as a script tag
// Register SYNCHRONOUSLY so behaviors are available before attribute processing
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  registerSortable().catch(console.error);
}

export default {
  source: sortableSource,
  metadata: sortableMetadata,
  register: registerSortable,
};
