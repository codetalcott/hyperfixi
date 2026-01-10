/**
 * Korean Grammar-Transformed Patterns
 *
 * These patterns match the hybrid output from GrammarTransformer where
 * event and command are combined in SOV order:
 *   English: "on click toggle .active"
 *   Grammar output: ".active 를 클릭 토글"
 *
 * Format: {patient} 를 {event-word} {action-word}
 *
 * Tree-shakeable: Only included when Korean is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Korean grammar-transformed patterns.
 */
export function getGrammarTransformedPatternsKo(): LanguagePattern[] {
  return [
    // ==========================================================================
    // Click + Toggle
    // ==========================================================================
    {
      id: 'grammar-ko-click-toggle',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 토글',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '토글', alternatives: ['토글하다'] },
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
      id: 'grammar-ko-click-add',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 추가',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '추가', alternatives: ['추가하다', '더하다'] },
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
      id: 'grammar-ko-click-remove',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 제거',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '제거', alternatives: ['제거하다', '삭제', '빼다'] },
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
      id: 'grammar-ko-click-increment',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 증가',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '증가', alternatives: ['증가하다', '늘리다'] },
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
      id: 'grammar-ko-click-show',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 보이기',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '보이기', alternatives: ['보이다', '표시'] },
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
      id: 'grammar-ko-click-hide',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 숨기기',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '숨기기', alternatives: ['숨기다', '감추다'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'hide' } },
      },
    },

    // ==========================================================================
    // Click + Set (for counters)
    // ==========================================================================
    {
      id: 'grammar-ko-click-set',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 설정',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '설정', alternatives: ['설정하다', '지정'] },
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
      id: 'grammar-ko-click-decrement',
      language: 'ko',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} 를 클릭 감소',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '감소', alternatives: ['감소하다', '줄이다'] },
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

    // Click + Set with destination: "{destination} 를 클릭 설정 {patient} 에"
    {
      id: 'grammar-ko-click-set-destination',
      language: 'ko',
      command: 'on',
      priority: 80,
      template: {
        format: '{destination} 를 클릭 설정 {patient} 에',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '설정', alternatives: ['설정하다'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '에' },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: '에' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'set' } },
      },
    },

    // Click + Put with destination: "{patient} 를 클릭 넣다 {destination} 에"
    {
      id: 'grammar-ko-click-put-destination',
      language: 'ko',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} 를 클릭 넣다 {destination} 에',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '넣다', alternatives: ['넣기'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '에' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: '에' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'put' } },
      },
    },

    // Click + Add with destination: "{patient} 를 클릭 추가 {destination} 에"
    {
      id: 'grammar-ko-click-add-destination',
      language: 'ko',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} 를 클릭 추가 {destination} 에',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '추가', alternatives: ['추가하다'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '에' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: '에' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'add' } },
      },
    },

    // Click + Remove from destination: "{patient} 를 클릭 제거 {destination} 에서"
    {
      id: 'grammar-ko-click-remove-destination',
      language: 'ko',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} 를 클릭 제거 {destination} 에서',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '제거', alternatives: ['제거하다'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '에서' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: '에서' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'remove' } },
      },
    },

    // Click + Show with style: "{patient} 를 클릭 보이다 {style} 로"
    {
      id: 'grammar-ko-click-show-style',
      language: 'ko',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} 를 클릭 보이다 {style} 로',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '보이다', alternatives: ['보이기'] },
          { type: 'role', role: 'style' },
          { type: 'literal', value: '로' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        style: { marker: '로' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'show' } },
      },
    },

    // Click + Hide with style: "{patient} 를 클릭 숨기다 {style} 로"
    {
      id: 'grammar-ko-click-hide-style',
      language: 'ko',
      command: 'on',
      priority: 80,
      template: {
        format: '{patient} 를 클릭 숨기다 {style} 로',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '를', alternatives: ['을'] },
          { type: 'literal', value: '클릭' },
          { type: 'literal', value: '숨기다', alternatives: ['숨기기'] },
          { type: 'role', role: 'style' },
          { type: 'literal', value: '로' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        style: { marker: '로' },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'hide' } },
      },
    },
  ];
}
