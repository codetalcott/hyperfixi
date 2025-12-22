import type { BehaviorSchema } from './types';

/**
 * Resizable Behavior Schema
 *
 * Makes elements resizable by dragging edges or corners.
 * Supports minimum/maximum dimensions and resize handles.
 */
export const resizableSchema: BehaviorSchema = {
  name: 'Resizable',
  category: 'ui',
  tier: 'optional',
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
  source: `
behavior Resizable(handle, minWidth, minHeight, maxWidth, maxHeight)
  init
    if no minWidth set minWidth to 50
    if no minHeight set minHeight to 50
    if no maxWidth set maxWidth to 9999
    if no maxHeight set maxHeight to 9999
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
`.trim(),
};
