/**
 * Chinese Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Chinese: 设置 {destination} 为 {patient}
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Chinese set patterns.
 */
export function getSetPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'set-zh-full',
      language: 'zh',
      command: 'set',
      priority: 100,
      template: {
        format: '设置 {destination} 为 {patient}',
        tokens: [
          { type: 'literal', value: '设置', alternatives: ['設置', '设定', '設定'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '为', alternatives: ['為', '到', '成'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { marker: '为', markerAlternatives: ['為', '到', '成'] },
      },
    },
    {
      id: 'set-zh-ba',
      language: 'zh',
      command: 'set',
      priority: 95,
      template: {
        format: '把 {destination} 设置为 {patient}',
        tokens: [
          { type: 'literal', value: '把' },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '设置为', alternatives: ['設置為', '设定为', '設定為'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { marker: '设置为', markerAlternatives: ['設置為', '设定为', '設定為'] },
      },
    },
    {
      id: 'set-zh-simple',
      language: 'zh',
      command: 'set',
      priority: 90,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
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
