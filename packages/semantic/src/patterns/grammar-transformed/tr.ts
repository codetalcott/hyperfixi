/**
 * Turkish Grammar-Transformed Patterns
 *
 * These patterns match the hybrid output from GrammarTransformer where
 * event and command are combined in SOV order with attached suffixes:
 *   English: "on click toggle .active"
 *   Grammar output: ".activei tıklamade değiştir"
 *
 * Format: {patient}i tıklamade {action}
 * Note: Turkish uses agglutinative suffixes attached directly:
 *   - -i/-ı/-u/-ü: accusative (patient)
 *   - -de/-da: locative (event)
 *   - -e/-a: dative (destination)
 *
 * Tree-shakeable: Only included when Turkish is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Turkish grammar-transformed patterns.
 */
export function getGrammarTransformedPatternsTr(): LanguagePattern[] {
  return [
    // ==========================================================================
    // Click + Toggle
    // ==========================================================================
    {
      id: 'grammar-tr-click-toggle',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        // Matches: ".activei tıklamade değiştir"
        format: '{patient} tıklamade değiştir',
        tokens: [
          { type: 'role', role: 'patient' },  // Captures ".activei" (with suffix)
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'değiştir', alternatives: ['değiştirmek', 'aç/kapat'] },
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
      id: 'grammar-tr-click-add',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade ekle',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'ekle', alternatives: ['eklemek', 'koy'] },
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
      id: 'grammar-tr-click-remove',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade kaldır',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'kaldır', alternatives: ['kaldırmak', 'sil', 'çıkar'] },
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
      id: 'grammar-tr-click-increment',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade artır',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'artır', alternatives: ['artırmak', 'arttır'] },
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
      id: 'grammar-tr-click-show',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade göster',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'göster', alternatives: ['göstermek', 'görüntüle'] },
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
      id: 'grammar-tr-click-hide',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade gizle',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'gizle', alternatives: ['gizlemek', 'sakla'] },
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
      id: 'grammar-tr-click-set',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade ayarla',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'ayarla', alternatives: ['ayarlamak', 'belirle'] },
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
      id: 'grammar-tr-click-decrement',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade azalt',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'azalt', alternatives: ['azaltmak', 'düşür'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'decrement' } },
      },
    },
  ];
}
