/**
 * Ukrainian Event Handler Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian event handler patterns.
 */
export function getEventHandlerPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-uk-full',
      language: 'uk',
      command: 'on',
      priority: 100,
      template: {
        format: 'при {event} на {source}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['коли'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'від'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'на',
          markerAlternatives: ['в', 'від'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-uk-simple',
      language: 'uk',
      command: 'on',
      priority: 90,
      template: {
        format: 'при {event}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['коли'] },
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
