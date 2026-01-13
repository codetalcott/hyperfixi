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
          { type: 'role', role: 'patient' }, // Captures ".activei" (with suffix)
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

    // ==========================================================================
    // THEN-CHAIN PATTERNS (with continuation marker)
    // Turkish uses "sonra" for "then"
    // ==========================================================================

    // Click + Wait then: "{duration} tıklamade bekle sonra"
    {
      id: 'grammar-tr-click-wait-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{duration} tıklamade bekle sonra',
        tokens: [
          { type: 'role', role: 'duration' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'bekle', alternatives: ['beklemek'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        duration: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'wait' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // Click + Toggle then: "{patient} tıklamade değiştir sonra"
    {
      id: 'grammar-tr-click-toggle-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{patient} tıklamade değiştir sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'değiştir', alternatives: ['değiştirmek'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'toggle' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // Click + Add then: "{patient} tıklamade ekle sonra"
    {
      id: 'grammar-tr-click-add-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{patient} tıklamade ekle sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'ekle', alternatives: ['eklemek'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'add' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // Click + Remove then: "{patient} tıklamade kaldır sonra"
    {
      id: 'grammar-tr-click-remove-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{patient} tıklamade kaldır sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'kaldır', alternatives: ['kaldırmak'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'remove' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // Click + Show then: "{patient} tıklamade göster sonra"
    {
      id: 'grammar-tr-click-show-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{patient} tıklamade göster sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'göster', alternatives: ['göstermek'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'show' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // Click + Hide then: "{patient} tıklamade gizle sonra"
    {
      id: 'grammar-tr-click-hide-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{patient} tıklamade gizle sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'gizle', alternatives: ['gizlemek'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'hide' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // ==========================================================================
    // CONTINUATION PATTERNS (for body after then)
    // These match commands that follow the "sonra" keyword
    // ==========================================================================

    // Remove continuation: "{patient} kaldır"
    {
      id: 'grammar-tr-remove-continuation',
      language: 'tr',
      command: 'remove',
      priority: 70,
      template: {
        format: '{patient} kaldır',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'kaldır', alternatives: ['kaldırmak', 'sil', 'çıkar'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        action: { default: { type: 'literal', value: 'remove' } },
      },
    },

    // Toggle continuation: "{patient} değiştir"
    {
      id: 'grammar-tr-toggle-continuation',
      language: 'tr',
      command: 'toggle',
      priority: 70,
      template: {
        format: '{patient} değiştir',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'değiştir', alternatives: ['değiştirmek', 'aç/kapat'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        action: { default: { type: 'literal', value: 'toggle' } },
      },
    },

    // Add continuation: "{patient} ekle"
    {
      id: 'grammar-tr-add-continuation',
      language: 'tr',
      command: 'add',
      priority: 70,
      template: {
        format: '{patient} ekle',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ekle', alternatives: ['eklemek', 'koy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        action: { default: { type: 'literal', value: 'add' } },
      },
    },

    // Show continuation: "{patient} göster"
    {
      id: 'grammar-tr-show-continuation',
      language: 'tr',
      command: 'show',
      priority: 70,
      template: {
        format: '{patient} göster',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'göster', alternatives: ['göstermek', 'görüntüle'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        action: { default: { type: 'literal', value: 'show' } },
      },
    },

    // Hide continuation: "{patient} gizle"
    {
      id: 'grammar-tr-hide-continuation',
      language: 'tr',
      command: 'hide',
      priority: 70,
      template: {
        format: '{patient} gizle',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'gizle', alternatives: ['gizlemek', 'sakla'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        action: { default: { type: 'literal', value: 'hide' } },
      },
    },

    // Put continuation: "{patient} {destination} koy"
    {
      id: 'grammar-tr-put-continuation',
      language: 'tr',
      command: 'put',
      priority: 72,
      template: {
        format: '{patient} {destination} koy',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'koy', alternatives: ['koymak', 'yerleştir'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        action: { default: { type: 'literal', value: 'put' } },
      },
    },

    // ==========================================================================
    // PUT BEFORE/AFTER PATTERNS
    // ==========================================================================

    // Click + Put before: "{value} önce {target}i tıklamade koy"
    {
      id: 'grammar-tr-click-put-before',
      language: 'tr',
      command: 'on',
      priority: 78,
      template: {
        format: '{patient} önce {destination} tıklamade koy',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'önce' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'koy', alternatives: ['koymak', 'yerleştir'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'put' } },
        position: { default: { type: 'literal', value: 'before' } },
      },
    },

    // Click + Put after: "{value} sonra {target}i tıklamade koy"
    {
      id: 'grammar-tr-click-put-after',
      language: 'tr',
      command: 'on',
      priority: 78,
      template: {
        format: '{patient} sonra {destination} tıklamade koy',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'sonra' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'koy', alternatives: ['koymak', 'yerleştir'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'put' } },
        position: { default: { type: 'literal', value: 'after' } },
      },
    },

    // ==========================================================================
    // FETCH PATTERNS
    // ==========================================================================

    // Click + Fetch: "{source}i tıklamade getir"
    {
      id: 'grammar-tr-click-fetch',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{source} tıklamade getir',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'getir', alternatives: ['getirmek', 'al'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'fetch' } },
      },
    },

    // Click + Fetch then: "{source}i tıklamade getir sonra"
    {
      id: 'grammar-tr-click-fetch-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{source} tıklamade getir sonra',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'getir', alternatives: ['getirmek', 'al'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'fetch' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // ==========================================================================
    // TRANSITION PATTERNS
    // ==========================================================================

    // Click + Transition: "{property}i tıklamade geçiş {value}e {duration}"
    {
      id: 'grammar-tr-click-transition',
      language: 'tr',
      command: 'on',
      priority: 77,
      template: {
        format: '{patient} tıklamade geçiş {goal} {duration}',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'geçiş', alternatives: ['geçişyap', 'animasyon'] },
          { type: 'role', role: 'goal' },
          { type: 'role', role: 'duration' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        goal: { position: 1 },
        duration: { position: 2 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'transition' } },
      },
    },

    // Click + Transition then: "{property}i tıklamade geçiş {value}e {duration} sonra"
    {
      id: 'grammar-tr-click-transition-then',
      language: 'tr',
      command: 'on',
      priority: 87,
      template: {
        format: '{patient} tıklamade geçiş {goal} {duration} sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'geçiş', alternatives: ['geçişyap', 'animasyon'] },
          { type: 'role', role: 'goal' },
          { type: 'role', role: 'duration' },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        goal: { position: 1 },
        duration: { position: 2 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'transition' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // ==========================================================================
    // SEND PATTERNS
    // ==========================================================================

    // Click + Send: "{message}i tıklamade gönder {target}e"
    {
      id: 'grammar-tr-click-send',
      language: 'tr',
      command: 'on',
      priority: 77,
      template: {
        format: '{patient} tıklamade gönder {destination}',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'gönder', alternatives: ['göndermek', 'yolla'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'send' } },
      },
    },

    // ==========================================================================
    // TRIGGER PATTERNS
    // ==========================================================================

    // Load + Trigger: "{event}i yüklede tetikle"
    {
      id: 'grammar-tr-load-trigger',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} yüklede tetikle',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'yüklede', alternatives: ['yüklemede', 'yükleme'] },
          { type: 'literal', value: 'tetikle', alternatives: ['tetiklemek', 'tetik'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'load' } },
        action: { default: { type: 'literal', value: 'trigger' } },
      },
    },

    // ==========================================================================
    // FOCUS PATTERNS
    // ==========================================================================

    // Click + Focus: "{target}i tıklamade odaklan"
    {
      id: 'grammar-tr-click-focus',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade odaklan',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'odaklan', alternatives: ['odakla', 'fokus', 'odak'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'focus' } },
      },
    },

    // ==========================================================================
    // LOG PATTERNS
    // ==========================================================================

    // Click + Log: "{message}i tıklamade günlükle"
    {
      id: 'grammar-tr-click-log',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade günlükle',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'günlükle', alternatives: ['günlük', 'kayıt', 'kaydet'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'log' } },
      },
    },

    // ==========================================================================
    // GO/NAVIGATE PATTERNS
    // ==========================================================================

    // Click + Go back: "backi tıklamade git"
    {
      id: 'grammar-tr-click-go-back',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: 'backi tıklamade git',
        tokens: [
          { type: 'literal', value: 'backi', alternatives: ['back'] },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'git', alternatives: ['gitmek', 'geç'] },
        ],
      },
      extraction: {
        destination: { default: { type: 'literal', value: 'back' } },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'go' } },
      },
    },

    // ==========================================================================
    // CALL PATTERNS
    // ==========================================================================

    // Click + Call: "{function}i tıklamade çağır"
    {
      id: 'grammar-tr-click-call',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade çağır',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'çağır', alternatives: ['çağırmak', 'ara'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'call' } },
      },
    },

    // ==========================================================================
    // GET PATTERNS
    // ==========================================================================

    // Click + Get: "{target}i tıklamade al"
    {
      id: 'grammar-tr-click-get',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} tıklamade al',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'al', alternatives: ['almak', 'elde et'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'get' } },
      },
    },

    // Click + Get then: "{target}i tıklamade al sonra"
    {
      id: 'grammar-tr-click-get-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{patient} tıklamade al sonra',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'al', alternatives: ['almak', 'elde et'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'get' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // ==========================================================================
    // DEFAULT PATTERNS (load event)
    // ==========================================================================

    // Load + Default: "{patient}i yüklede varsayılan {goal}e"
    {
      id: 'grammar-tr-load-default',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: '{patient} yüklede varsayılan {goal}',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'yüklede', alternatives: ['yüklemede', 'yükleme'] },
          { type: 'literal', value: 'varsayılan', alternatives: ['varsayılı', 'default'] },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        goal: { position: 1 },
        event: { default: { type: 'literal', value: 'load' } },
        action: { default: { type: 'literal', value: 'default' } },
      },
    },

    // ==========================================================================
    // WAIT PATTERNS
    // ==========================================================================

    // Click + Wait then: "{duration}i tıklamade bekle sonra"
    {
      id: 'grammar-tr-click-wait-duration-then',
      language: 'tr',
      command: 'on',
      priority: 85,
      template: {
        format: '{duration} tıklamade bekle sonra',
        tokens: [
          { type: 'role', role: 'duration' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'bekle', alternatives: ['beklemek'] },
          { type: 'literal', value: 'sonra', alternatives: ['ardından'] },
        ],
      },
      extraction: {
        duration: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'wait' } },
        continues: { default: { type: 'literal', value: 'then' } },
      },
    },

    // ==========================================================================
    // PUT INTO PATTERNS
    // ==========================================================================

    // Click + Put into: "{content}i tıklamade koy {target}e"
    {
      id: 'grammar-tr-click-put-into',
      language: 'tr',
      command: 'on',
      priority: 76,
      template: {
        format: '{patient} tıklamade koy {destination}',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'koy', alternatives: ['koymak', 'yerleştir'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'put' } },
      },
    },

    // Click + Put into me: "{content}i tıklamade koy bene"
    {
      id: 'grammar-tr-click-put-into-me',
      language: 'tr',
      command: 'on',
      priority: 77,
      template: {
        format: '{patient} tıklamade koy bene',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'koy', alternatives: ['koymak', 'yerleştir'] },
          { type: 'literal', value: 'bene', alternatives: ['bana'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'literal', value: 'me' } },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'put' } },
      },
    },

    // ==========================================================================
    // EXCHANGE/SWAP PATTERNS
    // ==========================================================================

    // Click + Exchange: "{source}i tıklamade takas {target} ile"
    {
      id: 'grammar-tr-click-exchange',
      language: 'tr',
      command: 'on',
      priority: 76,
      template: {
        format: '{patient} tıklamade takas {destination} ile',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'takas', alternatives: ['değiştir', 'swap'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'ile' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'swap' } },
      },
    },

    // ==========================================================================
    // APPEND PATTERNS
    // ==========================================================================

    // Click + Append: "{content}i tıklamade ekle {target}"
    {
      id: 'grammar-tr-click-append-to',
      language: 'tr',
      command: 'on',
      priority: 76,
      template: {
        format: '{patient} tıklamade ekle {destination}',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'ekle', alternatives: ['eklemek', 'koy'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 1 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'append' } },
      },
    },

    // ==========================================================================
    // BLUR PATTERNS
    // ==========================================================================

    // Keydown + Blur: "beni keydown[key=="Escape"]de bulanık"
    {
      id: 'grammar-tr-keydown-blur',
      language: 'tr',
      command: 'on',
      priority: 76,
      template: {
        format: '{patient} {event} bulanık',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'role', role: 'event' },
          { type: 'literal', value: 'bulanık', alternatives: ['bulanıklaş', 'blur'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        event: { position: 1 },
        action: { default: { type: 'literal', value: 'blur' } },
      },
    },

    // ==========================================================================
    // WAIT FOR EVENT PATTERNS
    // ==========================================================================

    // Click + Wait event: "tıklamade bekle {event}"
    {
      id: 'grammar-tr-click-wait-event',
      language: 'tr',
      command: 'on',
      priority: 75,
      template: {
        format: 'tıklamade bekle {duration}',
        tokens: [
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'bekle', alternatives: ['beklemek'] },
          { type: 'role', role: 'duration' },
        ],
      },
      extraction: {
        duration: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'wait' } },
      },
    },

    // ==========================================================================
    // GO URL PATTERNS
    // ==========================================================================

    // Click + Go url: "tıklamade git url {destination}e"
    {
      id: 'grammar-tr-click-go-url',
      language: 'tr',
      command: 'on',
      priority: 76,
      template: {
        format: 'tıklamade git url {destination}',
        tokens: [
          { type: 'literal', value: 'tıklamade', alternatives: ['tıklamada'] },
          { type: 'literal', value: 'git', alternatives: ['gitmek', 'geç'] },
          { type: 'literal', value: 'url', alternatives: ['yol'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        destination: { position: 0 },
        event: { default: { type: 'literal', value: 'click' } },
        action: { default: { type: 'literal', value: 'go' } },
      },
    },
  ];
}
