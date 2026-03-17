import type { BehaviorSchema } from './types';

/**
 * ScrollReveal Behavior Schema
 *
 * Adds a class or fires events when the element enters or exits the viewport.
 * Uses the IntersectionObserver web standard API.
 */
export const scrollRevealSchema: BehaviorSchema = {
  name: 'ScrollReveal',
  category: 'layout',
  tier: 'common',
  version: '1.0.0',
  description: 'Adds a class when the element enters the viewport via IntersectionObserver',
  parameters: [
    {
      name: 'cls',
      type: 'string',
      optional: true,
      default: 'revealed',
      description: 'CSS class added when element enters viewport',
    },
    {
      name: 'threshold',
      type: 'number',
      optional: true,
      default: 0.1,
      description: 'Intersection ratio threshold (0-1) for triggering',
    },
    {
      name: 'once',
      type: 'boolean',
      optional: true,
      default: true,
      description: 'If true, disconnect observer after first intersection',
    },
  ],
  events: [
    { name: 'scrollreveal:enter', description: 'Fired when the element enters the viewport' },
    { name: 'scrollreveal:exit', description: 'Fired when the element exits the viewport' },
  ],
  requirements: ['Uses IntersectionObserver API (supported in all modern browsers)'],
  source: `
behavior ScrollReveal(cls, threshold, once)
  init
    if cls is undefined
      set cls to "revealed"
    end
    if threshold is undefined
      set threshold to 0.1
    end
    if once is undefined
      set once to true
    end
    js(me, cls, threshold, once)
      var obs = new IntersectionObserver(function(entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            me.classList.add(cls);
            me.dispatchEvent(new CustomEvent('scrollreveal:enter', { bubbles: true }));
            if (once) obs.disconnect();
          } else if (!once) {
            me.classList.remove(cls);
            me.dispatchEvent(new CustomEvent('scrollreveal:exit', { bubbles: true }));
          }
        }
      }, { threshold: threshold });
      obs.observe(me);
    end
  end
end`.trim(),
};
