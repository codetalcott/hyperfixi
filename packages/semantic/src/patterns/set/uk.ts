/**
 * Ukrainian Set Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian set patterns.
 */
export function getSetPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'set-uk-full',
      language: 'uk',
      command: 'set',
      priority: 100,
      template: {
        format: 'встановити {patient} в {goal}',
        tokens: [
          { type: 'literal', value: 'встановити', alternatives: ['встанови', 'задати', 'задай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['на', 'як'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'в', markerAlternatives: ['на', 'як'] },
      },
    },
    {
      id: 'set-uk-simple',
      language: 'uk',
      command: 'set',
      priority: 90,
      template: {
        format: 'встановити {patient}',
        tokens: [
          { type: 'literal', value: 'встановити', alternatives: ['встанови', 'задати', 'задай'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
