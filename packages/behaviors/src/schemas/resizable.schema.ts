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
      default: 'me',
      description: 'CSS selector for the resize handle (defaults to the element itself)',
    },
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
behavior Resizable(handle, minWidth, minHeight, maxWidth, maxHeight)
  init
    if handle is undefined
      set handle to me
    end
    if minWidth is undefined
      set minWidth to 50
    end
    if minHeight is undefined
      set minHeight to 50
    end
    if maxWidth is undefined
      set maxWidth to 9999
    end
    if maxHeight is undefined
      set maxHeight to 9999
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
      wait for pointermove(clientX, clientY) or pointerup from document
      js(startWidth, startHeight, clientX, clientY, startX, startY, minWidth, maxWidth, minHeight, maxHeight, me)
        var nw = Math.max(minWidth, Math.min(maxWidth, startWidth + (clientX - startX)));
        var nh = Math.max(minHeight, Math.min(maxHeight, startHeight + (clientY - startY)));
        me.style.width = nw + 'px';
        me.style.height = nh + 'px';
      end
      trigger resizable:resize
    end
    trigger resizable:end
  end
end
`.trim(),
};
