/**
 * Resizable Behavior
 *
 * A behavior that makes elements resizable by dragging edges or corners.
 * Supports minimum/maximum dimensions and resize handles.
 *
 * @example
 * ```html
 * <!-- Basic resizable -->
 * <div _="install Resizable" style="width: 200px; height: 150px;">
 *   Resize me!
 * </div>
 *
 * <!-- With min/max constraints -->
 * <div _="install Resizable(minWidth: 100, maxWidth: 500)">
 *   Constrained resize
 * </div>
 *
 * <!-- With custom handle -->
 * <div _="install Resizable(handle: .resize-handle)">
 *   <div class="content">Content</div>
 *   <div class="resize-handle">⋱</div>
 * </div>
 * ```
 *
 * @events
 * - `resizable:start` - Fired when resize begins
 * - `resizable:resize` - Fired during resize
 * - `resizable:end` - Fired when resize completes
 */

/**
 * The hyperscript source code for the Resizable behavior.
 */
export const resizableSource = `
behavior Resizable(handle, minWidth, minHeight, maxWidth, maxHeight)
  init
    if no minWidth set the minWidth to 50
    if no minHeight set the minHeight to 50
    if no maxWidth set the maxWidth to 9999
    if no maxHeight set the maxHeight to 9999
    if no handle
      -- Create default resize handle
      make <div.hyperfixi-resize-handle/>
      put it at the end of me
      set the handle to it
      add { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: se-resize; } to the handle
    end
  end
  on pointerdown(clientX, clientY) from handle
    halt the event
    trigger resizable:start
    measure width
    set startWidth to it
    measure height
    set startHeight to it
    set startX to clientX
    set startY to clientY
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) or
               pointerup from document
      set newWidth to startWidth + (clientX - startX)
      set newHeight to startHeight + (clientY - startY)
      -- Apply constraints
      if newWidth < minWidth set newWidth to minWidth
      if newWidth > maxWidth set newWidth to maxWidth
      if newHeight < minHeight set newHeight to minHeight
      if newHeight > maxHeight set newHeight to maxHeight
      add { width: \${newWidth}px; height: \${newHeight}px; }
      trigger resizable:resize
    end
    trigger resizable:end
  end
end
`.trim();

/**
 * Behavior metadata for documentation and tooling.
 */
export const resizableMetadata = {
  name: 'Resizable',
  version: '1.0.0',
  description: 'Makes elements resizable by dragging',
  parameters: [
    {
      name: 'handle',
      type: 'selector',
      optional: true,
      default: 'auto-created',
      description: 'CSS selector for the resize handle',
    },
    {
      name: 'minWidth',
      type: 'number',
      optional: true,
      default: '50',
      description: 'Minimum width in pixels',
    },
    {
      name: 'minHeight',
      type: 'number',
      optional: true,
      default: '50',
      description: 'Minimum height in pixels',
    },
    {
      name: 'maxWidth',
      type: 'number',
      optional: true,
      default: '9999',
      description: 'Maximum width in pixels',
    },
    {
      name: 'maxHeight',
      type: 'number',
      optional: true,
      default: '9999',
      description: 'Maximum height in pixels',
    },
  ],
  events: [
    { name: 'resizable:start', description: 'Fired when resize begins' },
    { name: 'resizable:resize', description: 'Fired during resize' },
    { name: 'resizable:end', description: 'Fired when resize completes' },
  ],
};

/**
 * Register the Resizable behavior with HyperFixi.
 */
export async function registerResizable(
  hyperfixi?: { compile: (code: string) => any; execute: (ast: any, ctx: any) => Promise<any> }
): Promise<void> {
  const hf = hyperfixi || (typeof window !== 'undefined' ? (window as any).hyperfixi : null);

  if (!hf) {
    throw new Error(
      'HyperFixi not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const result = hf.compile(resizableSource);

  if (!result.success) {
    throw new Error(`Failed to compile Resizable behavior: ${JSON.stringify(result.errors)}`);
  }

  await hf.execute(result.ast, {});
}

// Auto-register when loaded as a script tag
// Register SYNCHRONOUSLY so behaviors are available before attribute processing
if (typeof window !== 'undefined' && (window as any).hyperfixi) {
  registerResizable().catch(console.error);
}

export default {
  source: resizableSource,
  metadata: resizableMetadata,
  register: registerResizable,
};
