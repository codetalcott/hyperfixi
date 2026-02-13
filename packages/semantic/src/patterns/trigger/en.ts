/**
 * English Trigger Patterns
 *
 * Tree-shakeable: Only included when English is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get English trigger patterns.
 */
export function getTriggerPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'trigger-en-full',
      language: 'en',
      command: 'trigger',
      priority: 100,
      template: {
        format: 'trigger {event} on {destination}',
        tokens: [
          { type: 'literal', value: 'trigger' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'on' },
              { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        destination: {
          marker: 'on',
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'trigger-en-simple',
      language: 'en',
      command: 'trigger',
      priority: 90,
      template: {
        format: 'trigger {event}',
        tokens: [
          { type: 'literal', value: 'trigger' },
          { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
        ],
      },
      extraction: {
        event: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
