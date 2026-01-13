/**
 * Russian Put Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian put patterns.
 */
export function getPutPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'put-ru-full',
      language: 'ru',
      command: 'put',
      priority: 100,
      template: {
        format: 'положить {patient} в {destination}',
        tokens: [
          {
            type: 'literal',
            value: 'положить',
            alternatives: ['положи', 'поместить', 'помести', 'вставить', 'вставь'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['во', 'на'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'в', markerAlternatives: ['во', 'на'] },
      },
    },
    {
      id: 'put-ru-before',
      language: 'ru',
      command: 'put',
      priority: 95,
      template: {
        format: 'положить {patient} перед {destination}',
        tokens: [
          { type: 'literal', value: 'положить', alternatives: ['положи', 'поместить', 'помести'] },
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
      id: 'put-ru-after',
      language: 'ru',
      command: 'put',
      priority: 95,
      template: {
        format: 'положить {patient} после {destination}',
        tokens: [
          { type: 'literal', value: 'положить', alternatives: ['положи', 'поместить', 'помести'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'после' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'после' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}
