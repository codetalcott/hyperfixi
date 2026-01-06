/**
 * Vietnamese Remove Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese remove patterns.
 */
export function getRemovePatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'remove-vi-full',
      language: 'vi',
      command: 'remove',
      priority: 100,
      template: {
        format: 'xóa {patient} khỏi {target}',
        tokens: [
          { type: 'literal', value: 'xóa', alternatives: ['gỡ bỏ', 'loại bỏ', 'bỏ'] },
          { type: 'role', role: 'patient' },
          { type: 'group', optional: true, tokens: [
            { type: 'literal', value: 'khỏi', alternatives: ['từ'] },
            { type: 'role', role: 'source' },
          ]},
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'khỏi', markerAlternatives: ['từ'], default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'remove-vi-simple',
      language: 'vi',
      command: 'remove',
      priority: 90,
      template: {
        format: 'xóa {patient}',
        tokens: [
          { type: 'literal', value: 'xóa', alternatives: ['gỡ bỏ', 'loại bỏ', 'bỏ'] },
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
