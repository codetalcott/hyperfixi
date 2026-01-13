/**
 * Vietnamese Toggle Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese toggle patterns.
 */
export function getTogglePatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'toggle-vi-full',
      language: 'vi',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'chuyển đổi {patient} trên {target}',
        tokens: [
          { type: 'literal', value: 'chuyển đổi', alternatives: ['chuyển', 'bật tắt'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'trên', alternatives: ['tại', 'ở'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'trên',
          markerAlternatives: ['tại', 'ở'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-vi-simple',
      language: 'vi',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'chuyển đổi {patient}',
        tokens: [
          { type: 'literal', value: 'chuyển đổi', alternatives: ['chuyển', 'bật tắt'] },
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
