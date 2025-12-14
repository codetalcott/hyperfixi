/**
 * Draggable Behavior
 *
 * A reusable behavior that makes elements draggable with pointer events.
 * Supports custom drag handles, lifecycle events, and smooth positioning.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div _="install Draggable">Drag me!</div>
 *
 * <!-- With custom drag handle -->
 * <div _="install Draggable(dragHandle: .titlebar)">
 *   <div class="titlebar">Drag here</div>
 *   <div class="content">Content</div>
 * </div>
 *
 * <!-- With lifecycle hooks -->
 * <div _="install Draggable
 *         on draggable:start add .dragging
 *         on draggable:end remove .dragging">
 *   Drag me!
 * </div>
 * ```
 *
 * @events
 * - `draggable:start` - Fired when drag begins
 * - `draggable:move` - Fired during each movement
 * - `draggable:end` - Fired when drag completes
 */

/**
 * The hyperscript source code for the Draggable behavior.
 * This can be used to register the behavior manually or inspect its implementation.
 */
export const draggableSource = `
behavior Draggable(dragHandle)
  init
    if no dragHandle set the dragHandle to me
  end
  on pointerdown(clientX, clientY) from dragHandle
    halt the event
    trigger draggable:start
    measure x
    set startX to it
    measure y
    set startY to it
    set xoff to clientX - startX
    set yoff to clientY - startY
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) or
               pointerup(clientX, clientY) from document
      add { left: \${clientX - xoff}px; top: \${clientY - yoff}px; }
      trigger draggable:move
    end
    trigger draggable:end
  end
end
`.trim();

/**
 * Behavior metadata for documentation and tooling.
 */
export const draggableMetadata = {
  name: 'Draggable',
  version: '1.0.0',
  description: 'Makes elements draggable with pointer events',
  parameters: [
    {
      name: 'dragHandle',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'CSS selector for the drag handle element',
    },
  ],
  events: [
    { name: 'draggable:start', description: 'Fired when drag begins' },
    { name: 'draggable:move', description: 'Fired during each movement' },
    { name: 'draggable:end', description: 'Fired when drag completes' },
  ],
  requirements: ['position: absolute or position: fixed on the element'],
};

/**
 * Register the Draggable behavior with HyperFixi.
 *
 * @param hyperfixi - The hyperfixi instance (defaults to window.hyperfixi)
 * @returns Promise that resolves when behavior is registered
 *
 * @example
 * ```javascript
 * import { registerDraggable } from '@hyperfixi/behaviors/draggable';
 * await registerDraggable();
 * ```
 */
export async function registerDraggable(
  hyperfixi?: { compile: (code: string) => any; execute: (ast: any, ctx: any) => Promise<any> }
): Promise<void> {
  // Get hyperfixi instance
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  // Compile the behavior source
  const result = hf.compile(draggableSource);

  if (!result.success) {
    throw new Error(`Failed to compile Draggable behavior: ${JSON.stringify(result.errors)}`);
  }

  // Execute to register the behavior
  await hf.execute(result.ast, {});
}

// Auto-register when loaded as a script tag (IIFE/global build)
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  // Wait for DOM to be ready, then register
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerDraggable().catch(console.error);
    });
  } else {
    registerDraggable().catch(console.error);
  }
}

// Default export for convenience
export default {
  source: draggableSource,
  metadata: draggableMetadata,
  register: registerDraggable,
};
