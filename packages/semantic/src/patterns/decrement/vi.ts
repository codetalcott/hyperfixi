/**
 * Vietnamese Decrement Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese decrement patterns.
 */
export function getDecrementPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'decrement-vi-full',
      language: 'vi',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'giảm {target} đi {amount}',
        tokens: [
          { type: 'literal', value: 'giảm', alternatives: ['giảm đi'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'đi', alternatives: ['xuống'] },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: {
          marker: 'đi',
          markerAlternatives: ['xuống'],
          default: { type: 'literal', value: '1' },
        },
      },
    },
    {
      id: 'decrement-vi-simple',
      language: 'vi',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'giảm {target}',
        tokens: [
          { type: 'literal', value: 'giảm', alternatives: ['giảm đi'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: '1' } },
      },
    },
  ];
}
