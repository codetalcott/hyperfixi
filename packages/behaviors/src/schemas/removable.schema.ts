import type { BehaviorSchema } from './types';

/**
 * Removable Behavior Schema
 *
 * Removes an element when a trigger is clicked.
 * Supports optional confirmation and transition effects.
 *
 * @since 1.2.0 — `trigger` parameter renamed to `triggerEl` to avoid
 * shadowing the hyperscript `trigger` command keyword. Users migrating
 * from v1.x should update: `install Removable(triggerEl: .close-btn)`.
 */
export const removableSchema: BehaviorSchema = {
  name: 'Removable',
  category: 'data',
  tier: 'common',
  version: '1.2.0',
  description: 'Makes elements removable on click',
  parameters: [
    {
      name: 'triggerEl',
      type: 'selector',
      optional: true,
      default: 'me',
      description: 'Element that triggers removal (e.g., a close button)',
    },
    {
      name: 'confirmRemoval',
      type: 'boolean',
      optional: true,
      default: false,
      description: 'Show confirmation dialog before removal',
    },
    {
      name: 'effect',
      type: 'string',
      optional: true,
      default: 'none',
      enum: ['fade', 'none'],
      description: 'Transition effect: "fade" or "none"',
    },
  ],
  events: [
    { name: 'removable:before', description: 'Fired before removal (cancelable)' },
    { name: 'removable:removed', description: 'Fired after removal' },
  ],
  source: `
behavior Removable(triggerEl, confirmRemoval, effect)
  init
    if triggerEl is undefined
      set triggerEl to me
    end
  end
  on click from triggerEl
    if confirmRemoval
      js(me)
        if (!window.confirm("Are you sure?")) return "cancel";
      end
      if it is "cancel"
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
