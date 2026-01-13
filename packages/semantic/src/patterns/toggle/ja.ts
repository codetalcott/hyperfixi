/**
 * Japanese Toggle Patterns
 *
 * Tree-shakeable: Only included when Japanese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Japanese toggle patterns.
 */
export function getTogglePatternsJa(): LanguagePattern[] {
  return [
    {
      id: 'toggle-ja-full',
      language: 'ja',
      command: 'toggle',
      priority: 100,
      template: {
        format: '{target} の {patient} を 切り替え',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'の' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          {
            type: 'literal',
            value: '切り替え',
            alternatives: ['切り替える', 'トグル', 'トグルする'],
          },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: 'を' },
      },
    },
    {
      id: 'toggle-ja-simple',
      language: 'ja',
      command: 'toggle',
      priority: 90,
      template: {
        format: '{patient} を 切り替え',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          {
            type: 'literal',
            value: '切り替え',
            alternatives: ['切り替える', 'トグル', 'トグルする'],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-ja-location',
      language: 'ja',
      command: 'toggle',
      priority: 95,
      template: {
        format: '{target} で {patient} を 切り替え',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'で' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: '切り替え', alternatives: ['切り替える', 'トグル'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: 'を' },
      },
    },
    {
      id: 'toggle-ja-compact',
      language: 'ja',
      command: 'toggle',
      priority: 93,
      template: {
        format: '{patient}を切り替え',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を切り替え', alternatives: ['を切り替える', 'をトグル'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-ja-verb-ending',
      language: 'ja',
      command: 'toggle',
      priority: 88,
      template: {
        format: '{patient} を 切り替える',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: '切り替える', alternatives: ['トグルする'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Phase 6d: Word order flexibility - verb-first pattern
    {
      id: 'toggle-ja-verb-first',
      language: 'ja',
      command: 'toggle',
      priority: 75,
      template: {
        format: '切り替え {patient} を',
        tokens: [
          { type: 'literal', value: '切り替え', alternatives: ['トグル'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Phase 6d: Object-before-destination scrambled order
    {
      id: 'toggle-ja-scrambled',
      language: 'ja',
      command: 'toggle',
      priority: 70,
      template: {
        format: '{patient} を {destination} で 切り替え',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '切り替え', alternatives: ['トグル'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'で' },
      },
    },
  ];
}
