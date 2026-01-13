/**
 * Polish Hide Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish hide patterns.
 */
export function getHidePatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'hide-pl-full',
      language: 'pl',
      command: 'hide',
      priority: 100,
      template: {
        format: 'ukryj {patient} z {style}',
        tokens: [
          { type: 'literal', value: 'ukryj', alternatives: ['schowaj', 'zasłoń', 'zaslon'] },
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
      id: 'hide-pl-simple',
      language: 'pl',
      command: 'hide',
      priority: 90,
      template: {
        format: 'ukryj {patient}',
        tokens: [
          { type: 'literal', value: 'ukryj', alternatives: ['schowaj', 'zasłoń', 'zaslon'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
