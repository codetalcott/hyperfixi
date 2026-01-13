/**
 * Korean Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Korean: {destination} 를 {patient} 로 설정
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Korean set patterns.
 */
export function getSetPatternsKo(): LanguagePattern[] {
  return [
    {
      id: 'set-ko-full',
      language: 'ko',
      command: 'set',
      priority: 100,
      template: {
        format: '{destination} 를 {patient} 로 설정',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
          { type: 'literal', value: '로', alternatives: ['으로'] },
          { type: 'literal', value: '설정', alternatives: ['설정하다', '설정해', '세트'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
    {
      id: 'set-ko-simple',
      language: 'ko',
      command: 'set',
      priority: 90,
      template: {
        format: '{destination} 에 {patient} 설정',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '에' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
          { type: 'literal', value: '설정', alternatives: ['설정하다'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
    {
      id: 'set-ko-equals',
      language: 'ko',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} 는 {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '는', alternatives: ['은'] },
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
