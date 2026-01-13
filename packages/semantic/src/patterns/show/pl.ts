/**
 * Polish Show Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish show patterns.
 */
export function getShowPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'show-pl-full',
      language: 'pl',
      command: 'show',
      priority: 100,
      template: {
        format: 'pokaż {patient} z {style}',
        tokens: [
          { type: 'literal', value: 'pokaż', alternatives: ['pokaz', 'wyświetl', 'wyswietl'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'z', alternatives: ['ze', 'jako'] },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'z', markerAlternatives: ['ze', 'jako'] },
      },
    },
    {
      id: 'show-pl-simple',
      language: 'pl',
      command: 'show',
      priority: 90,
      template: {
        format: 'pokaż {patient}',
        tokens: [
          { type: 'literal', value: 'pokaż', alternatives: ['pokaz', 'wyświetl', 'wyswietl'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
