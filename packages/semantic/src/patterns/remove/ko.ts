/**
 * Korean Remove Patterns
 *
 * Hand-crafted patterns for "remove" command.
 * Korean uses SOV order: {target} 에서 {patient} 를 제거
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Korean remove patterns.
 */
export function getRemovePatternsKo(): LanguagePattern[] {
  return [
    {
      id: 'remove-ko-full',
      language: 'ko',
      command: 'remove',
      priority: 100,
      template: {
        format: '{destination} 에서 {patient} 를 제거',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '에서' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          {
            type: 'literal',
            value: '제거',
            alternatives: ['제거하다', '삭제', '삭제하다', '빼다'],
          },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: '를', markerAlternatives: ['을'] },
      },
    },
    {
      id: 'remove-ko-simple',
      language: 'ko',
      command: 'remove',
      priority: 90,
      template: {
        format: '{patient} 를 제거',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '제거', alternatives: ['제거하다', '삭제', '삭제하다'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'remove-ko-possessive',
      language: 'ko',
      command: 'remove',
      priority: 95,
      template: {
        format: '{destination} 의 {patient} 를 제거',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '의' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '제거', alternatives: ['제거하다'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: '를', markerAlternatives: ['을'] },
      },
    },
  ];
}
