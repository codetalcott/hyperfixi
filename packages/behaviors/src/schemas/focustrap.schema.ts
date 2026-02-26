import type { BehaviorSchema } from './types';

/**
 * FocusTrap Behavior Schema
 *
 * Confines Tab navigation inside an element and restores focus on release.
 * Manages aria-modal for accessibility compliance.
 */
export const focusTrapSchema: BehaviorSchema = {
  name: 'FocusTrap',
  category: 'ui',
  tier: 'core',
  version: '1.0.0',
  description: 'Confines Tab navigation inside an element with ARIA support',
  parameters: [
    {
      name: 'active',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Whether the trap is active on install',
    },
    {
      name: 'initialFocus',
      type: 'selector',
      optional: true,
      description: 'Element to focus when the trap activates',
    },
    {
      name: 'returnFocus',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Restore focus to the previously focused element on deactivation',
    },
  ],
  events: [
    { name: 'focustrap:activated', description: 'Fired when the trap is activated' },
    { name: 'focustrap:deactivated', description: 'Fired when the trap is deactivated' },
  ],
  requirements: [
    'Sets aria-modal="true" on the element when active',
    'Listens for focustrap:activate and focustrap:deactivate custom events for programmatic control',
  ],
  source: `
behavior FocusTrap(active, initialFocus, returnFocus)
  init
    if active is undefined set active to true
    if returnFocus is undefined set returnFocus to true
  end
  -- Imperative installer handles Tab key trapping and focus management
end`.trim(),
};
