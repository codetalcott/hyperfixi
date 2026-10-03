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
  description:
    'Makes elements draggable with pointer events (EXPERIMENTAL — stateful async component, beyond the inline-scripting boundary; not part of the curated set)',
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
  on pointerdown(clientX, clientY) from (dragHandle or me)
    halt the event
    trigger draggable:start
    set xoff to clientX - my offsetLeft
    set yoff to clientY - my offsetTop
    repeat until event pointerup from document
      wait for pointermove(clientX, clientY) or
               pointerup(clientX, clientY) from document
      add { left: \${clientX - xoff}px; top: \${clientY - yoff}px; }
      trigger draggable:move
    end
    trigger draggable:end
  end
end`.trim(),
};
