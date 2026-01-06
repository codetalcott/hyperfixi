/**
 * Italian Event Handler Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian event handler patterns.
 */
export function getEventHandlerPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'event-handler-it-full',
      language: 'it',
      command: 'on',
      priority: 100,
      template: {
        format: 'su {event} {action}',
        tokens: [
          { type: 'literal', value: 'su', alternatives: ['quando', 'al', 'on'] },
          { type: 'role', role: 'event' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        action: { position: 2 },
      },
    },
    {
      id: 'event-handler-it-from',
      language: 'it',
      command: 'on',
      priority: 95,
      template: {
        format: 'su {event} da {source} {action}',
        tokens: [
          { type: 'literal', value: 'su', alternatives: ['quando', 'al', 'on'] },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'da', alternatives: ['di'] },
          { type: 'role', role: 'source' },
          { type: 'role', role: 'action' },
        ],
      },
      extraction: {
        event: { position: 1 },
        source: { marker: 'da', markerAlternatives: ['di'] },
        action: { position: -1 },
      },
    },
  ];
}
