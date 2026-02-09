import type { BehaviorSchema } from './types';

/**
 * Sortable Behavior Schema
 *
 * Drag-and-drop reordering of list items.
 * Apply to a container element; children become sortable.
 *
 * Note: This behavior fires lifecycle events but does NOT automatically
 * reorder DOM elements. Users must handle actual reordering in their
 * `sortable:move` event handlers.
 */
export const sortableSchema: BehaviorSchema = {
  name: 'Sortable',
  category: 'ui',
  tier: 'common',
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
    {
      name: 'sortable:move',
      description: 'Fired during drag — handle this event to reorder DOM elements',
    },
    { name: 'sortable:end', description: 'Fired when drag completes' },
  ],
  requirements: ['Users must handle DOM reordering in sortable:move event handlers'],
  source: `
behavior Sortable(handle, dragClass)
  init
    if no dragClass set dragClass to "sorting"
  end
  on pointerdown(target, clientY) from me
    set item to closest <li/> in target
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
`.trim(),
};
