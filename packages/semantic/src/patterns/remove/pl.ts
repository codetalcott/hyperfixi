/**
 * Polish Remove Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish remove patterns.
 */
export function getRemovePatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'remove-pl-full',
      language: 'pl',
      command: 'remove',
      priority: 100,
      template: {
        format: 'usuń {patient} z {source}',
        tokens: [
          { type: 'literal', value: 'usuń', alternatives: ['usun', 'wyczyść', 'wyczysc'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'z', alternatives: ['od', 'ze'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: {
          marker: 'z',
          markerAlternatives: ['od', 'ze'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-pl-simple',
      language: 'pl',
      command: 'remove',
      priority: 90,
      template: {
        format: 'usuń {patient}',
        tokens: [
          { type: 'literal', value: 'usuń', alternatives: ['usun', 'wyczyść', 'wyczysc'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
