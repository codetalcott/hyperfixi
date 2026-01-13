/**
 * Korean Put Patterns
 *
 * Hand-crafted patterns for "put" command.
 * Korean: "안녕하세요" 를 #output 에 넣기
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Korean put patterns.
 */
export function getPutPatternsKo(): LanguagePattern[] {
  return [
    {
      id: 'put-ko-full',
      language: 'ko',
      command: 'put',
      priority: 100,
      template: {
        format: '{patient} 를 {destination} 에 넣기',
        tokens: [
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
          { type: 'literal', value: '에', alternatives: ['에게', '으로', '로'] },
          {
            type: 'literal',
            value: '넣기',
            alternatives: ['넣다', '넣어', '놓다', '놓기', '두다', '두기'],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 2 },
      },
    },
    {
      id: 'put-ko-simple',
      language: 'ko',
      command: 'put',
      priority: 90,
      template: {
        format: '{patient} 를 {destination} 넣기',
        tokens: [
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
          { type: 'literal', value: '넣기', alternatives: ['넣다', '넣어'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 2 },
      },
    },
  ];
}
