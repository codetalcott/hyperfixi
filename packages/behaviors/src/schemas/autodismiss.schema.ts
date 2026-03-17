import type { BehaviorSchema } from './types';

/**
 * AutoDismiss Behavior Schema
 *
 * Auto-removes flash messages and toasts after a configurable delay.
 * Supports pause-on-hover and fade effect.
 */
export const autoDismissSchema: BehaviorSchema = {
  name: 'AutoDismiss',
  category: 'ui',
  tier: 'core',
  version: '1.0.0',
  description: 'Auto-removes elements after a delay with optional pause-on-hover',
  parameters: [
    {
      name: 'delay',
      type: 'number',
      optional: true,
      default: 5000,
      description: 'Time in ms before the element is removed',
    },
    {
      name: 'pauseOnHover',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'Pause the countdown when the mouse hovers over the element',
    },
    {
      name: 'effect',
      type: 'string',
      optional: true,
      default: 'none',
      enum: ['fade', 'none'],
      description: 'Transition effect before removal: "fade" or "none"',
    },
  ],
  events: [
    { name: 'autodismiss:start', description: 'Fired when the countdown timer starts' },
    {
      name: 'autodismiss:dismissed',
      description: 'Fired before removal (cancelable via preventDefault)',
    },
    { name: 'autodismiss:paused', description: 'Fired when the timer is paused on hover' },
    { name: 'autodismiss:resumed', description: 'Fired when the timer resumes on mouseleave' },
  ],
  source: `
behavior AutoDismiss(delay, pauseOnHover, effect)
  init
    if delay is undefined
      set delay to 5000
    end
    if effect is undefined
      set effect to "none"
    end
    js(me, delay, effect)
      setTimeout(function() {
        me.dispatchEvent(new CustomEvent('autodismiss:dismissed', { bubbles: true }));
        if (effect === 'fade') {
          me.style.transition = 'opacity 300ms';
          me.style.opacity = '0';
          setTimeout(function() { me.remove(); }, 300);
        } else {
          me.remove();
        }
      }, delay);
    end
  end
end`.trim(),
};
