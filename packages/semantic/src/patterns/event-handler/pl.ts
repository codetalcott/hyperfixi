/**
 * Polish Event Handler Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish event handler patterns.
 */
export function getEventHandlerPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-pl-full',
      language: 'pl',
      command: 'on',
      priority: 100,
      template: {
        format: 'gdy {event} na {source}',
        tokens: [
          { type: 'literal', value: 'gdy', alternatives: ['kiedy', 'przy', 'na'] },
          { type: 'role', role: 'event' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'na', alternatives: ['w', 'przy', 'z'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: {
          marker: 'na',
          markerAlternatives: ['w', 'przy', 'z'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'event-handler-pl-simple',
      language: 'pl',
      command: 'on',
      priority: 90,
      template: {
        format: 'gdy {event}',
        tokens: [
          { type: 'literal', value: 'gdy', alternatives: ['kiedy', 'przy', 'na'] },
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
