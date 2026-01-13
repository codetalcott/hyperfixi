/**
 * Russian Event Handler Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian event handler patterns.
 */
export function getEventHandlerPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-ru-full',
      language: 'ru',
      command: 'on',
      priority: 100,
      template: {
        format: 'при {event} на {source}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['когда'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'от'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'на',
          markerAlternatives: ['в', 'от'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-ru-simple',
      language: 'ru',
      command: 'on',
      priority: 90,
      template: {
        format: 'при {event}',
        tokens: [
          { type: 'literal', value: 'при', alternatives: ['когда'] },
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
