import type { BehaviorSchema } from './types';

/**
 * Removable Behavior Schema
 *
 * Removes an element when a trigger is clicked.
 * Supports optional confirmation and transition effects.
 */
export const removableSchema: BehaviorSchema = {
  name: 'Removable',
  category: 'data',
  tier: 'common',
  version: '1.1.0',
  description: 'Makes elements removable on click',
  parameters: [
    {
      name: 'trigger',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element that triggers removal (e.g., a close button)',
    },
    {
      name: 'confirm',
      type: 'boolean',
      optional: true,
      default: 'false',
      description: 'Show confirmation dialog before removal',
    },
    {
      name: 'effect',
      type: 'string',
      optional: true,
      default: 'none',
      description: 'Transition effect: "fade" or "none"',
    },
  ],
  events: [
    { name: 'removable:before', description: 'Fired before removal (cancelable)' },
    { name: 'removable:removed', description: 'Fired after removal' },
  ],
  source: `
behavior Removable(trigger, confirm, effect)
  init
    if trigger is undefined
      set trigger to me
    end
  end
  on click from trigger
    if confirm
      if not window.confirm("Are you sure?")
        halt
      end
    end
    trigger removable:before
    if effect is "fade"
      transition opacity to 0 over 300ms
    end
    trigger removable:removed
    remove me
  end
end
`.trim(),
};
