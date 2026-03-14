/**
 * Trigger Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "trigger" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 5 files into single file.
 */

import type { LanguagePattern } from '../types';

function getTriggerPatternsEn(): LanguagePattern[] {
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

/**
 * Get trigger patterns for a specific language.
 */
export function getTriggerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getTriggerPatternsEn();
    default:
      return [];
  }
}
