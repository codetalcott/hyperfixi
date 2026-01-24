/**
 * Quechua Toggle Patterns
 *
 * Patterns for parsing "toggle" command in Quechua (Runasimi).
 * SOV word order with postposition suffixes (-ta for patient, -man for destination).
 */

import type { LanguagePattern } from '../../types';

export function getTogglePatternsQu(): LanguagePattern[] {
  return [
    // SOV pattern: .active ta t'ikray (patient + verb)
    {
      id: 'toggle-qu-sov',
      language: 'qu',
      command: 'toggle',
      priority: 100,
      template: {
        format: "{patient} ta t'ikray",
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: t'ikray .active (verb + patient, more casual)
    {
      id: 'toggle-qu-simple',
      language: 'qu',
      command: 'toggle',
      priority: 90,
      template: {
        format: "t'ikray {patient}",
        tokens: [
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: #button pi .active ta t'ikray
    {
      id: 'toggle-qu-with-dest',
      language: 'qu',
      command: 'toggle',
      priority: 95,
      template: {
        format: "{destination} pi {patient} ta t'ikray",
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'pi' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
    // Destination with -man marker: #button man .active ta t'ikray
    {
      id: 'toggle-qu-dest-man',
      language: 'qu',
      command: 'toggle',
      priority: 93,
      template: {
        format: "{destination} man {patient} ta t'ikray",
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'man' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}
