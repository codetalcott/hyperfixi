/**
 * German Show Patterns
 *
 * Hand-crafted patterns for "show" command.
 * German: zeige #modal
 */

import type { LanguagePattern } from '../../types';

/**
 * Get German show patterns.
 */
export function getShowPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'show-de-full',
      language: 'de',
      command: 'show',
      priority: 100,
      template: {
        format: 'zeige {patient}',
        tokens: [
          { type: 'literal', value: 'zeige', alternatives: ['zeigen', 'anzeigen', 'show'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
