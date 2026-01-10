/**
 * Japanese Grammar-Transformed Patterns
 *
 * These patterns match the hybrid output from GrammarTransformer where
 * event and command are combined in SOV order:
 *   English: "on click toggle .active"
 *   Grammar output: ".active を クリック で 切り替え"
 *
 * Format: {patient} を {event-word} で {action-word}
 *
 * Tree-shakeable: Only included when Japanese is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Japanese grammar-transformed patterns.
 */
export function getGrammarTransformedPatternsJa(): LanguagePattern[] {
  return [
    // ==========================================================================
    // Click + Toggle
    // ==========================================================================
    {
      id: 'grammar-ja-click-toggle',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 切り替え',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '切り替え', alternatives: ['切り替える', 'トグル'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'toggle' } },
      },
    },

    // ==========================================================================
    // Click + Add
    // ==========================================================================
    {
      id: 'grammar-ja-click-add',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 追加',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '追加', alternatives: ['追加する', '付ける'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'add' } },
      },
    },

    // ==========================================================================
    // Click + Remove
    // ==========================================================================
    {
      id: 'grammar-ja-click-remove',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 削除',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '削除', alternatives: ['削除する', '外す', '取る'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'remove' } },
      },
    },

    // ==========================================================================
    // Click + Increment
    // ==========================================================================
    {
      id: 'grammar-ja-click-increment',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 増加',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '増加', alternatives: ['増加する', '増やす'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'increment' } },
      },
    },

    // ==========================================================================
    // Click + Show
    // ==========================================================================
    {
      id: 'grammar-ja-click-show',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 表示',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '表示', alternatives: ['表示する', '見せる'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'show' } },
      },
    },

    // ==========================================================================
    // Click + Hide
    // ==========================================================================
    {
      id: 'grammar-ja-click-hide',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 隠す',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '隠す', alternatives: ['非表示', '隠れる'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'hide' } },
      },
    },

    // ==========================================================================
    // Click + Set
    // ==========================================================================
    {
      id: 'grammar-ja-click-set',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 設定',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '設定', alternatives: ['設定する', 'セット'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'set' } },
      },
    },

    // ==========================================================================
    // Click + Decrement
    // ==========================================================================
    {
      id: 'grammar-ja-click-decrement',
      language: 'ja',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} を クリック で 減少',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '減少', alternatives: ['減少する', '減らす'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'decrement' } },
      },
    },

    // ==========================================================================
    // DESTINATION PATTERNS (higher priority)
    // ==========================================================================

    // Click + Set with destination: "{destination} を クリック で 設定 {patient} に"
    {
      id: 'grammar-ja-click-set-destination',
      language: 'ja',
      command: 'on',
      priority: 80,
      template: {
        format: '{destination} を クリック で 設定 {patient} に',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '設定', alternatives: ['設定する'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'に' },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: 'に' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'set' } },
      },
    },

    // Click + Put with destination: "{patient} を クリック で 置く {destination} に"
    {
      id: 'grammar-ja-click-put-destination',
      language: 'ja',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} を クリック で 置く {destination} に',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '置く', alternatives: ['入れる'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'に' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'に' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'put' } },
      },
    },

    // Click + Add with destination: "{patient} を クリック で 追加 {destination} に"
    {
      id: 'grammar-ja-click-add-destination',
      language: 'ja',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} を クリック で 追加 {destination} に',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '追加', alternatives: ['末尾追加'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'に' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'に' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'add' } },
      },
    },

    // Click + Show with style: "{patient} を クリック で 表示 {style} で"
    {
      id: 'grammar-ja-click-show-style',
      language: 'ja',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} を クリック で 表示 {style} で',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '表示', alternatives: ['見せる'] },
          { type: 'role', role: 'style' },
          { type: 'literal', value: 'で' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        style: { position: 5 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'show' } },
      },
    },

    // Click + Hide with style: "{patient} を クリック で 隠す {style} で"
    {
      id: 'grammar-ja-click-hide-style',
      language: 'ja',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} を クリック で 隠す {style} で',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'を' },
          { type: 'literal', value: 'クリック' },
          { type: 'literal', value: 'で' },
          { type: 'literal', value: '隠す', alternatives: ['非表示'] },
          { type: 'role', role: 'style' },
          { type: 'literal', value: 'で' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        style: { position: 5 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'hide' } },
      },
    },
  ];
}
