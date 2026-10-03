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
      name: 'targetEl',
      type: 'selector',
      optional: true,
      default: 'me',
      description:
        "Element to toggle the class on (not `target`: that is hyperscript's name for the event target)",
    },
  ],
  events: [
    { name: 'toggleable:on', description: 'Fired when class is added' },
    { name: 'toggleable:off', description: 'Fired when class is removed' },
  ],
  source: `
behavior Toggleable(cls, targetEl)
  init
    if cls is undefined set element's cls to "active" end
    if targetEl is undefined set element's targetEl to me end
  end
  on click
    toggle .{cls} on targetEl
    js(targetEl, cls)
      var eventName = targetEl.classList.contains(cls) ? 'toggleable:on' : 'toggleable:off';
      targetEl.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
    end
  end
end`.trim(),
};
