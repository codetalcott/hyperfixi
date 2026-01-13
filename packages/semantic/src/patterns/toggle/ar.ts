/**
 * Arabic Toggle Patterns
 *
 * Tree-shakeable: Only included when Arabic is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Arabic toggle patterns.
 */
export function getTogglePatternsAr(): LanguagePattern[] {
  return [
    {
      id: 'toggle-ar-full',
      language: 'ar',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'بدّل {patient} على {target}',
        tokens: [
          { type: 'literal', value: 'بدّل', alternatives: ['بدل', 'غيّر', 'غير'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'على', alternatives: ['في', 'ب'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'على',
          markerAlternatives: ['في', 'ب'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-ar-simple',
      language: 'ar',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'بدّل {patient}',
        tokens: [
          { type: 'literal', value: 'بدّل', alternatives: ['بدل', 'غيّر', 'غير'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
