/**
 * Decrement Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "decrement" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 14 files into single file.
 */

import type { LanguagePattern } from '../types';

function getDecrementPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: :counter কে হ্রাস করুন
    {
      id: 'decrement-bn-full',
      language: 'bn',
      command: 'decrement',
      priority: 100,
      template: {
        format: '{patient} কে হ্রাস করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'হ্রাস', alternatives: ['কমান'] },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // With quantity: :counter কে 5 দিয়ে হ্রাস করুন
    {
      id: 'decrement-bn-with-quantity',
      language: 'bn',
      command: 'decrement',
      priority: 95,
      template: {
        format: '{patient} কে {quantity} দিয়ে হ্রাস করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'role', role: 'quantity' },
          { type: 'literal', value: 'দিয়ে' },
          { type: 'literal', value: 'হ্রাস', alternatives: ['কমান'] },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        quantity: { marker: 'দিয়ে', position: 2 },
      },
    },
    // Simple pattern: হ্রাস :counter
    {
      id: 'decrement-bn-simple',
      language: 'bn',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'হ্রাস {patient}',
        tokens: [
          { type: 'literal', value: 'হ্রাস', alternatives: ['কমান'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getDecrementPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'decrement-de-full',
      language: 'de',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'verringere {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'verringere',
            alternatives: [
              'verringern',
              'dekrementiere',
              'dekrementieren',
              'reduziere',
              'decrement',
            ],
          },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getDecrementPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: :counter को घटाएं
    {
      id: 'decrement-hi-full',
      language: 'hi',
      command: 'decrement',
      priority: 100,
      template: {
        format: '{patient} को घटाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'घटाएं', alternatives: ['घटा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // With quantity: :counter को 5 से घटाएं
    {
      id: 'decrement-hi-with-quantity',
      language: 'hi',
      command: 'decrement',
      priority: 95,
      template: {
        format: '{patient} को {quantity} से घटाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'quantity' },
          { type: 'literal', value: 'से' },
          { type: 'literal', value: 'घटाएं', alternatives: ['घटा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        quantity: { marker: 'से', position: 2 },
      },
    },
    // Simple pattern: घटाएं :counter
    {
      id: 'decrement-hi-simple',
      language: 'hi',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'घटाएं {patient}',
        tokens: [
          { type: 'literal', value: 'घटाएं', alternatives: ['घटा'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getDecrementPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'decrement-it-full',
      language: 'it',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'decrementare {patient} di {quantity}',
        tokens: [
          {
            type: 'literal',
            value: 'decrementare',
            alternatives: ['decrementa', 'diminuire', 'decrement'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'di', alternatives: ['per'] },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: {
          marker: 'di',
          markerAlternatives: ['per'],
          default: { type: 'literal', value: '1' },
        },
      },
    },
    {
      id: 'decrement-it-simple',
      language: 'it',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'decrementare {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'decrementare',
            alternatives: ['decrementa', 'diminuire', 'decrement'],
          },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: '1' } },
      },
    },
  ];
}

function getDecrementPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'decrement-pl-full',
      language: 'pl',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'zmniejsz {patient} o {quantity}',
        tokens: [
          { type: 'literal', value: 'zmniejsz', alternatives: ['obniż', 'obniz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'o' },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'o', default: { type: 'literal', value: 1 } },
      },
    },
    {
      id: 'decrement-pl-simple',
      language: 'pl',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'zmniejsz {patient}',
        tokens: [
          { type: 'literal', value: 'zmniejsz', alternatives: ['obniż', 'obniz'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: 1 } },
      },
    },
  ];
}

function getDecrementPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'decrement-ru-full',
      language: 'ru',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'уменьшить {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'уменьшить', alternatives: ['уменьши'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на' },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'на', default: { type: 'literal', value: 1 } },
      },
    },
    {
      id: 'decrement-ru-simple',
      language: 'ru',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'уменьшить {patient}',
        tokens: [
          { type: 'literal', value: 'уменьшить', alternatives: ['уменьши'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: 1 } },
      },
    },
  ];
}

function getDecrementPatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: ลดค่า :counter
    {
      id: 'decrement-th-simple',
      language: 'th',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'ลดค่า {patient}',
        tokens: [
          { type: 'literal', value: 'ลดค่า' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With quantity: ลดค่า :counter ด้วย 5
    {
      id: 'decrement-th-with-quantity',
      language: 'th',
      command: 'decrement',
      priority: 95,
      template: {
        format: 'ลดค่า {patient} ด้วย {quantity}',
        tokens: [
          { type: 'literal', value: 'ลดค่า' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ด้วย' },
          { type: 'role', role: 'quantity' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'ด้วย', position: 3 },
      },
    },
  ];
}

function getDecrementPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'decrement-uk-full',
      language: 'uk',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'зменшити {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'зменшити', alternatives: ['зменш'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на' },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'на', default: { type: 'literal', value: 1 } },
      },
    },
    {
      id: 'decrement-uk-simple',
      language: 'uk',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'зменшити {patient}',
        tokens: [
          { type: 'literal', value: 'зменшити', alternatives: ['зменш'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: 1 } },
      },
    },
  ];
}

function getDecrementPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'decrement-vi-full',
      language: 'vi',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'giảm {target} đi {amount}',
        tokens: [
          { type: 'literal', value: 'giảm', alternatives: ['giảm đi'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'đi', alternatives: ['xuống'] },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: {
          marker: 'đi',
          markerAlternatives: ['xuống'],
          default: { type: 'literal', value: '1' },
        },
      },
    },
    {
      id: 'decrement-vi-simple',
      language: 'vi',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'giảm {target}',
        tokens: [
          { type: 'literal', value: 'giảm', alternatives: ['giảm đi'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: '1' } },
      },
    },
  ];
}

function getDecrementPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'decrement-zh-full',
      language: 'zh',
      command: 'decrement',
      priority: 100,
      template: {
        format: '减少 {patient}',
        tokens: [
          { type: 'literal', value: '减少', alternatives: ['递减', '减', '降低', 'decrement'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

/**
 * Get decrement patterns for a specific language.
 */
export function getDecrementPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getDecrementPatternsBn();
    case 'de':
      return getDecrementPatternsDe();
    case 'hi':
      return getDecrementPatternsHi();
    case 'it':
      return getDecrementPatternsIt();
    case 'pl':
      return getDecrementPatternsPl();
    case 'ru':
      return getDecrementPatternsRu();
    case 'th':
      return getDecrementPatternsTh();
    case 'uk':
      return getDecrementPatternsUk();
    case 'vi':
      return getDecrementPatternsVi();
    case 'zh':
      return getDecrementPatternsZh();
    default:
      return [];
  }
}
