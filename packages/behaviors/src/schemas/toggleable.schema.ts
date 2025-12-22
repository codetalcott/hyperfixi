import type { BehaviorSchema } from './types';

/**
 * Toggleable Behavior Schema
 *
 * Toggles a CSS class on click.
 * Useful for accordions, dropdowns, and toggle buttons.
 */
export const toggleableSchema: BehaviorSchema = {
  name: 'Toggleable',
  category: 'form',
  tier: 'core',
  version: '1.0.0',
  description: 'Toggles a CSS class on click',
  parameters: [
    {
      name: 'cls',
      type: 'string',
      optional: true,
      default: 'active',
      description: 'CSS class to toggle',
    },
    {
      name: 'target',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element to toggle the class on',
    },
  ],
  events: [
    { name: 'toggleable:on', description: 'Fired when class is added' },
    { name: 'toggleable:off', description: 'Fired when class is removed' },
  ],
  source: `
behavior Toggleable(cls, target)
  init
    if cls is undefined
      set cls to "active"
    end
    if target is undefined
      set target to me
    end
  end
  on click
    toggle .{cls} on target
  end
end
`.trim(),
};
