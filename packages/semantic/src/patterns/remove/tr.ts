/**
 * Turkish Remove Patterns
 *
 * Hand-crafted patterns for "remove" command.
 * Turkish uses SOV order: {target}'dan {patient} kaldır
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Turkish remove patterns.
 */
export function getRemovePatternsTr(): LanguagePattern[] {
  return [
    {
      id: 'remove-tr-full',
      language: 'tr',
      command: 'remove',
      priority: 100,
      template: {
        format: "{destination}'dan {patient} kaldır",
        tokens: [
          { type: 'role', role: 'destination' },
          {
            type: 'literal',
            value: "'dan",
            alternatives: ["'den", "'tan", "'ten", '-dan', '-den'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'literal',
            value: 'kaldır',
            alternatives: ['kaldırmak', 'sil', 'silmek', 'çıkar'],
          },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
    {
      id: 'remove-tr-simple',
      language: 'tr',
      command: 'remove',
      priority: 90,
      template: {
        format: '{patient} kaldır',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'kaldır', alternatives: ['kaldırmak', 'sil', 'silmek'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'remove-tr-accusative',
      language: 'tr',
      command: 'remove',
      priority: 95,
      template: {
        format: "{patient}'i kaldır",
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: "'i", alternatives: ["'ı", "'u", "'ü", '-i', '-ı'] },
          { type: 'literal', value: 'kaldır', alternatives: ['kaldırmak', 'sil'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
