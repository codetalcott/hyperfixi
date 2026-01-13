/**
 * Chinese Toggle Patterns
 *
 * Tree-shakeable: Only included when Chinese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Chinese toggle patterns.
 */
export function getTogglePatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'toggle-zh-full',
      language: 'zh',
      command: 'toggle',
      priority: 100,
      template: {
        format: '切换 {patient} 在 {target}',
        tokens: [
          { type: 'literal', value: '切换' },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: '在', alternatives: ['到', '于'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: '在',
          markerAlternatives: ['到', '于'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-zh-simple',
      language: 'zh',
      command: 'toggle',
      priority: 90,
      template: {
        format: '切换 {patient}',
        tokens: [
          { type: 'literal', value: '切换' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-zh-ba',
      language: 'zh',
      command: 'toggle',
      priority: 95,
      template: {
        format: '把 {patient} 切换',
        tokens: [
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '切换' },
        ],
      },
      extraction: {
        patient: { marker: '把' },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-zh-full-ba',
      language: 'zh',
      command: 'toggle',
      priority: 98,
      template: {
        format: '在 {target} 把 {patient} 切换',
        tokens: [
          { type: 'literal', value: '在', alternatives: ['到', '于'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '切换' },
        ],
      },
      extraction: {
        destination: { marker: '在', markerAlternatives: ['到', '于'] },
        patient: { marker: '把' },
      },
    },
  ];
}
