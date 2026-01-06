/**
 * Vietnamese Put Patterns
 *
 * Tree-shakeable: Only included when Vietnamese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Vietnamese put patterns.
 */
export function getPutPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'put-vi-into',
      language: 'vi',
      command: 'put',
      priority: 100,
      template: {
        format: 'đặt {patient} vào {target}',
        tokens: [
          { type: 'literal', value: 'đặt', alternatives: ['để', 'đưa'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'vào', alternatives: ['vào trong'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'vào', markerAlternatives: ['vào trong'] },
      },
    },
    {
      id: 'put-vi-before',
      language: 'vi',
      command: 'put',
      priority: 95,
      template: {
        format: 'đặt {patient} trước {target}',
        tokens: [
          { type: 'literal', value: 'đặt', alternatives: ['để', 'đưa'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'trước', alternatives: ['trước khi'] },
          { type: 'role', role: 'manner' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        manner: { marker: 'trước', markerAlternatives: ['trước khi'] },
      },
    },
    {
      id: 'put-vi-after',
      language: 'vi',
      command: 'put',
      priority: 95,
      template: {
        format: 'đặt {patient} sau {target}',
        tokens: [
          { type: 'literal', value: 'đặt', alternatives: ['để', 'đưa'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'sau', alternatives: ['sau khi'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'sau', markerAlternatives: ['sau khi'] },
      },
    },
  ];
}
