import type { BehaviorSchema } from './types';

/**
 * ClickOutside Behavior Schema
 *
 * Fires an event when the user clicks outside the element.
 * Uses pointerdown instead of click to avoid timing issues.
 */
export const clickOutsideSchema: BehaviorSchema = {
  name: 'ClickOutside',
  category: 'ui',
  tier: 'core',
  version: '1.0.0',
  description: 'Fires an event when the user clicks outside the element',
  parameters: [
    {
      name: 'active',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Whether the listener is active (can be toggled programmatically)',
    },
  ],
  events: [
    { name: 'clickoutside', description: 'Fired when a pointer press occurs outside the element' },
    {
      name: 'clickoutside:activate',
      description: 'Listen for this event to programmatically activate detection',
    },
    {
      name: 'clickoutside:deactivate',
      description: 'Listen for this event to programmatically deactivate detection',
    },
  ],
  requirements: ['Uses pointerdown instead of click to avoid timing issues with removed elements'],
  source: `
behavior ClickOutside(active)
  init
    if active is undefined
      set active to true
    end
  end
  on pointerdown from document
    js(me, active)
      if (!me.isConnected) return;
      if (active && !me.contains(event.target)) {
        me.dispatchEvent(new CustomEvent('clickoutside', { bubbles: true }));
      }
    end
  end
  on clickoutside:activate
    set active to true
  end
  on clickoutside:deactivate
    set active to false
  end
end`.trim(),
};
