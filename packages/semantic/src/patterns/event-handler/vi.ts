/**
 * Vietnamese Event Handler Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese event handler patterns.
 */
export function getEventHandlerPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-vi-full',
      language: 'vi',
      command: 'on',
      priority: 100,
      template: {
        format: 'khi {event} trên {source}',
        tokens: [
          { type: 'literal', value: 'khi', alternatives: ['lúc', 'trên'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'trên', alternatives: ['tại'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'trên',
          markerAlternatives: ['tại'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-vi-simple',
      language: 'vi',
      command: 'on',
      priority: 90,
      template: {
        format: 'khi {event}',
        tokens: [
          { type: 'literal', value: 'khi', alternatives: ['lúc', 'trên'] },
          { type: 'role', role: 'event' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
