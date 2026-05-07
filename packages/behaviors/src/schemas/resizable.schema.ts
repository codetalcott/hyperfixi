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
      name: 'minWidth',
      type: 'number',
      optional: true,
      default: 50,
      description: 'Minimum width in pixels',
    },
    {
      name: 'minHeight',
      type: 'number',
      optional: true,
      default: 50,
      description: 'Minimum height in pixels',
    },
    {
      name: 'maxWidth',
      type: 'number',
      optional: true,
      default: 9999,
      description: 'Maximum width in pixels',
    },
    {
      name: 'maxHeight',
      type: 'number',
      optional: true,
      default: 9999,
      description: 'Maximum height in pixels',
    },
  ],
  events: [
    { name: 'resizable:start', description: 'Fired when resize begins' },
    { name: 'resizable:resize', description: 'Fired during resize' },
    { name: 'resizable:end', description: 'Fired when resize completes' },
  ],
  source: `
behavior Resizable(minWidth, minHeight, maxWidth, maxHeight)
  on pointerdown(clientX, clientY) from me
    halt the event
    trigger resizable:start
    measure width
    set startWidth to it
    measure height
    set startHeight to it
    set startX to clientX
    set startY to clientY
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) from document
      set newWidth to startWidth + clientX - startX
      set newHeight to startHeight + clientY - startY
      if newWidth < minWidth then set newWidth to minWidth end
      if newWidth > maxWidth then set newWidth to maxWidth end
      if newHeight < minHeight then set newHeight to minHeight end
      if newHeight > maxHeight then set newHeight to maxHeight end
      set my style.width to newWidth + "px"
      set my style.height to newHeight + "px"
      trigger resizable:resize
    end
    trigger resizable:end
  end
end
`.trim(),
};
