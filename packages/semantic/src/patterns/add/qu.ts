/**
 * Quechua Add Patterns
 *
 * Patterns for parsing "add" command in Quechua (Runasimi).
 * SOV word order with postposition suffixes (-ta for patient, -man for destination).
 */

import type { LanguagePattern } from '../../types';

export function getAddPatternsQu(): LanguagePattern[] {
  return [
    // SOV pattern: .active ta yapay (patient + verb)
    {
      id: 'add-qu-sov',
      language: 'qu',
      command: 'add',
      priority: 100,
      template: {
        format: '{patient} ta yapay',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'yapay', alternatives: ['yapaykuy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: yapay .active (verb + patient, more casual)
    {
      id: 'add-qu-simple',
      language: 'qu',
      command: 'add',
      priority: 90,
      template: {
        format: 'yapay {patient}',
        tokens: [
          { type: 'literal', value: 'yapay', alternatives: ['yapaykuy'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: #button man .active ta yapay
    {
      id: 'add-qu-with-dest',
      language: 'qu',
      command: 'add',
      priority: 95,
      template: {
        format: '{destination} man {patient} ta yapay',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'man' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'yapay', alternatives: ['yapaykuy'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}
