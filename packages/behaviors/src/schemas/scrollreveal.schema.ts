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
    {
      name: 'rootMargin',
      type: 'string',
      optional: true,
      default: '0px',
      description: 'CSS margin around the viewport for triggering earlier or later',
    },
  ],
  events: [
    { name: 'scrollreveal:enter', description: 'Fired when the element enters the viewport' },
    { name: 'scrollreveal:exit', description: 'Fired when the element exits the viewport' },
  ],
  requirements: ['Uses IntersectionObserver API (supported in all modern browsers)'],
  source: `
behavior ScrollReveal(cls, threshold, once, rootMargin)
  init
    if cls is undefined set cls to "revealed"
    if threshold is undefined set threshold to 0.1
    if once is undefined set once to true
    if rootMargin is undefined set rootMargin to "0px"
  end
  -- Imperative installer handles IntersectionObserver setup
end`.trim(),
};
