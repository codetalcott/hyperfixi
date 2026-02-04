/**
 * Tagalog Put Patterns
 *
 * Patterns for parsing "put" command in Tagalog.
 * VSO word order: verb patient marker destination
 */

import type { LanguagePattern } from '../../types';

export function getPutPatternsTl(): LanguagePattern[] {
  return [
    {
      id: 'put-tl-into',
      language: 'tl',
      command: 'put',
      priority: 100,
      template: {
        format: 'ilagay {patient} sa {destination}',
        tokens: [
          { type: 'literal', value: 'ilagay', alternatives: ['lagay'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'sa' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'sa' },
      },
    },
    {
      id: 'put-tl-before',
      language: 'tl',
      command: 'put',
      priority: 95,
      template: {
        format: 'ilagay {patient} bago {destination}',
        tokens: [
          { type: 'literal', value: 'ilagay', alternatives: ['lagay'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'bago' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'bago' },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-tl-after',
      language: 'tl',
      command: 'put',
      priority: 95,
      template: {
        format: 'ilagay {patient} matapos {destination}',
        tokens: [
          { type: 'literal', value: 'ilagay', alternatives: ['lagay'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'matapos', alternatives: ['pagkatapos'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'matapos', markerAlternatives: ['pagkatapos'] },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}
