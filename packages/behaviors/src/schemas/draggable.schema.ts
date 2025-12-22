import type { BehaviorSchema } from './types';

/**
 * Draggable Behavior Schema
 *
 * Makes elements draggable with pointer events.
 * Supports custom drag handles and lifecycle events.
 */
export const draggableSchema: BehaviorSchema = {
  name: 'Draggable',
  category: 'ui',
  tier: 'core',
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
  source: `
behavior Draggable(dragHandle)
  init
    if no dragHandle set dragHandle to me
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
`.trim(),
};
