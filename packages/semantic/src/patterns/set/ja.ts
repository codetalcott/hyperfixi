/**
 * Japanese Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Japanese: {destination} を {patient} に 設定
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Japanese set patterns.
 */
export function getSetPatternsJa(): LanguagePattern[] {
  return [
    {
      id: 'set-ja-full',
      language: 'ja',
      command: 'set',
      priority: 100,
      template: {
        format: '{destination} を {patient} に 設定',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'を' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
          { type: 'literal', value: 'に' },
          { type: 'literal', value: '設定', alternatives: ['設定する', 'セット', 'セットする'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
    {
      id: 'set-ja-simple',
      language: 'ja',
      command: 'set',
      priority: 90,
      template: {
        format: '{destination} に {patient} を 設定',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'に' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: '設定', alternatives: ['設定する'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: 'を' },
      },
    },
    {
      id: 'set-ja-equals',
      language: 'ja',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} は {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'は' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}
