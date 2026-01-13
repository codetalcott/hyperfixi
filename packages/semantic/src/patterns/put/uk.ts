/**
 * Ukrainian Put Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian put patterns.
 */
export function getPutPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'put-uk-full',
      language: 'uk',
      command: 'put',
      priority: 100,
      template: {
        format: 'покласти {patient} в {destination}',
        tokens: [
          {
            type: 'literal',
            value: 'покласти',
            alternatives: ['поклади', 'помістити', 'помісти', 'вставити', 'встав'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['у', 'на'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'в', markerAlternatives: ['у', 'на'] },
      },
    },
    {
      id: 'put-uk-before',
      language: 'uk',
      command: 'put',
      priority: 95,
      template: {
        format: 'покласти {patient} перед {destination}',
        tokens: [
          { type: 'literal', value: 'покласти', alternatives: ['поклади', 'помістити', 'помісти'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'перед', alternatives: ['до'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'перед', markerAlternatives: ['до'] },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-uk-after',
      language: 'uk',
      command: 'put',
      priority: 95,
      template: {
        format: 'покласти {patient} після {destination}',
        tokens: [
          { type: 'literal', value: 'покласти', alternatives: ['поклади', 'помістити', 'помісти'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'після' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'після' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}
