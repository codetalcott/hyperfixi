/**
 * Resizable Behavior — Imperative Implementation
 *
 * Makes elements resizable by dragging edges or corners.
 * Supports minimum/maximum dimensions and resize handles.
 *
 * @example
 * ```html
 * <div _="install Resizable" style="width: 200px; height: 150px;">
 *   Resize me!
 * </div>
 * ```
 */

import { resizableSchema } from '../schemas/resizable.schema';
import type { LokaScriptInstance } from '../schemas/types';
import { resolveRuntime } from '../schemas/types';

// Re-export schema-derived values for backwards compatibility
export const resizableSource = resizableSchema.source;
export const resizableMetadata = resizableSchema;

/**
 * Imperative installer for Resizable behavior.
 */
function installResizable(element: HTMLElement, params: Record<string, any>): void {
  // Resolve handle element
  let handleEl: HTMLElement = element;
  if (params.handle && params.handle !== 'me') {
    if (typeof params.handle === 'string') {
      const found = element.querySelector(params.handle);
      if (found instanceof HTMLElement) handleEl = found;
    } else if (params.handle instanceof HTMLElement) {
      handleEl = params.handle;
    }
  }

  const minW = params.minWidth ?? 50;
  const minH = params.minHeight ?? 50;
  const maxW = params.maxWidth ?? 9999;
  const maxH = params.maxHeight ?? 9999;

  handleEl.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault();
    element.dispatchEvent(new CustomEvent('resizable:start', { bubbles: true }));

    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev: PointerEvent) {
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + (ev.clientX - startX)));
      const newHeight = Math.max(minH, Math.min(maxH, startHeight + (ev.clientY - startY)));

      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;
      element.dispatchEvent(new CustomEvent('resizable:resize', { bubbles: true }));
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      element.dispatchEvent(new CustomEvent('resizable:end', { bubbles: true }));
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

/**
 * Register the Resizable behavior with LokaScript.
 */
export async function registerResizable(hyperfixi?: LokaScriptInstance): Promise<void> {
  const hf = hyperfixi || resolveRuntime();

  if (!hf) {
    throw new Error(
      'LokaScript not found. Make sure @hyperfixi/core is loaded before registering behaviors.'
    );
  }

  const syntheticNode = {
    type: 'behavior',
    name: 'Resizable',
    parameters: ['handle', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'],
    eventHandlers: [],
    imperativeInstaller: installResizable,
  };
  const ctx = hf.createContext ? hf.createContext() : { locals: new Map(), globals: new Map() };
  await hf.execute(syntheticNode, ctx);
}

// Auto-register when loaded as a script tag
if (resolveRuntime()) {
  registerResizable().catch(console.error);
}

export default {
  source: resizableSchema.source,
  metadata: resizableSchema,
  register: registerResizable,
};
