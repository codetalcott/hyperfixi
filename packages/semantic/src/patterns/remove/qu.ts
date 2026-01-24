/**
 * Quechua Remove Patterns
 *
 * Patterns for parsing "remove" command in Quechua (Runasimi).
 * SOV word order with postposition suffixes (-ta for patient, -manta for source).
 */

import type { LanguagePattern } from '../../types';

export function getRemovePatternsQu(): LanguagePattern[] {
  return [
    // SOV pattern: .active ta qichuy (patient + verb)
    {
      id: 'remove-qu-sov',
      language: 'qu',
      command: 'remove',
      priority: 100,
      template: {
        format: '{patient} ta qichuy',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'qichuy', alternatives: ['hurquy', 'anchuchiy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: qichuy .active (verb + patient, more casual)
    {
      id: 'remove-qu-simple',
      language: 'qu',
      command: 'remove',
      priority: 90,
      template: {
        format: 'qichuy {patient}',
        tokens: [
          { type: 'literal', value: 'qichuy', alternatives: ['hurquy', 'anchuchiy'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With source: #button manta .active ta qichuy
    {
      id: 'remove-qu-with-source',
      language: 'qu',
      command: 'remove',
      priority: 95,
      template: {
        format: '{source} manta {patient} ta qichuy',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'manta' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'qichuy', alternatives: ['hurquy', 'anchuchiy'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}
