/**
 * Korean Show Patterns
 *
 * Hand-crafted patterns for "show" command.
 * Korean: {patient} 를 보여주다
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Korean show patterns.
 */
export function getShowPatternsKo(): LanguagePattern[] {
  return [
    {
      id: 'show-ko-full',
      language: 'ko',
      command: 'show',
      priority: 100,
      template: {
        format: '{patient} 를 보여주다',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          {
            type: 'literal',
            value: '보여주다',
            alternatives: ['보여줘', '표시', '표시하다', '보이다'],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    {
      id: 'show-ko-simple',
      language: 'ko',
      command: 'show',
      priority: 90,
      template: {
        format: '표시 {patient}',
        tokens: [
          { type: 'literal', value: '표시', alternatives: ['표시하다'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'show-ko-possessive',
      language: 'ko',
      command: 'show',
      priority: 95,
      template: {
        format: '{destination} 의 {patient} 를 보여주다',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '의' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '보여주다', alternatives: ['보여줘', '표시'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: '를', markerAlternatives: ['을'] },
      },
    },
  ];
}
