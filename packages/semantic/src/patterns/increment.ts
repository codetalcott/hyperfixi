/**
 * Increment Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "increment" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 17 files into single file.
 */

import type { LanguagePattern } from '../types';

function getIncrementPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: :counter কে বৃদ্ধি করুন
    {
      id: 'increment-bn-full',
      language: 'bn',
      command: 'increment',
      priority: 100,
      template: {
        format: '{patient} কে বৃদ্ধি করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'বৃদ্ধি', alternatives: ['বাড়ান'] },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // With quantity: :counter কে 5 দিয়ে বৃদ্ধি করুন
    {
      id: 'increment-bn-with-quantity',
      language: 'bn',
      command: 'increment',
      priority: 95,
      template: {
        format: '{patient} কে {quantity} দিয়ে বৃদ্ধি করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'role', role: 'quantity' },
          { type: 'literal', value: 'দিয়ে' },
          { type: 'literal', value: 'বৃদ্ধি', alternatives: ['বাড়ান'] },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        quantity: { marker: 'দিয়ে', position: 2 },
      },
    },
    // Simple pattern: বৃদ্ধি :counter
    {
      id: 'increment-bn-simple',
      language: 'bn',
      command: 'increment',
      priority: 90,
      template: {
        format: 'বৃদ্ধি {patient}',
        tokens: [
          { type: 'literal', value: 'বৃদ্ধি', alternatives: ['বাড়ান'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getIncrementPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'increment-de-full',
      language: 'de',
      command: 'increment',
      priority: 100,
      template: {
        format: 'erhöhe {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'erhöhe',
            alternatives: ['erhoehe', 'erhöhen', 'inkrementiere', 'inkrementieren', 'increment'],
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

function getIncrementPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: :counter को बढ़ाएं
    {
      id: 'increment-hi-full',
      language: 'hi',
      command: 'increment',
      priority: 100,
      template: {
        format: '{patient} को बढ़ाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'बढ़ाएं', alternatives: ['बढ़ा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // With quantity: :counter को 5 से बढ़ाएं
    {
      id: 'increment-hi-with-quantity',
      language: 'hi',
      command: 'increment',
      priority: 95,
      template: {
        format: '{patient} को {quantity} से बढ़ाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'quantity' },
          { type: 'literal', value: 'से' },
          { type: 'literal', value: 'बढ़ाएं', alternatives: ['बढ़ा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        quantity: { marker: 'से', position: 2 },
      },
    },
    // Simple pattern: बढ़ाएं :counter
    {
      id: 'increment-hi-simple',
      language: 'hi',
      command: 'increment',
      priority: 90,
      template: {
        format: 'बढ़ाएं {patient}',
        tokens: [
          { type: 'literal', value: 'बढ़ाएं', alternatives: ['बढ़ा'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getIncrementPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'increment-it-full',
      language: 'it',
      command: 'increment',
      priority: 100,
      template: {
        format: 'incrementare {patient} di {quantity}',
        tokens: [
          {
            type: 'literal',
            value: 'incrementare',
            alternatives: ['incrementa', 'aumentare', 'increment'],
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
      id: 'increment-it-simple',
      language: 'it',
      command: 'increment',
      priority: 90,
      template: {
        format: 'incrementare {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'incrementare',
            alternatives: ['incrementa', 'aumentare', 'increment'],
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

function getIncrementPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'increment-pl-full',
      language: 'pl',
      command: 'increment',
      priority: 100,
      template: {
        format: 'zwiększ {patient} o {quantity}',
        tokens: [
          { type: 'literal', value: 'zwiększ', alternatives: ['zwieksz', 'podnieś', 'podnies'] },
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
      id: 'increment-pl-simple',
      language: 'pl',
      command: 'increment',
      priority: 90,
      template: {
        format: 'zwiększ {patient}',
        tokens: [
          { type: 'literal', value: 'zwiększ', alternatives: ['zwieksz', 'podnieś', 'podnies'] },
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

function getIncrementPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'increment-ru-full',
      language: 'ru',
      command: 'increment',
      priority: 100,
      template: {
        format: 'увеличить {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'увеличить', alternatives: ['увеличь'] },
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
      id: 'increment-ru-simple',
      language: 'ru',
      command: 'increment',
      priority: 90,
      template: {
        format: 'увеличить {patient}',
        tokens: [
          { type: 'literal', value: 'увеличить', alternatives: ['увеличь'] },
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

function getIncrementPatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: เพิ่มค่า :counter
    {
      id: 'increment-th-simple',
      language: 'th',
      command: 'increment',
      priority: 100,
      template: {
        format: 'เพิ่มค่า {patient}',
        tokens: [
          { type: 'literal', value: 'เพิ่มค่า' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With quantity: เพิ่มค่า :counter ด้วย 5
    {
      id: 'increment-th-with-quantity',
      language: 'th',
      command: 'increment',
      priority: 95,
      template: {
        format: 'เพิ่มค่า {patient} ด้วย {quantity}',
        tokens: [
          { type: 'literal', value: 'เพิ่มค่า' },
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

function getIncrementPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'increment-uk-full',
      language: 'uk',
      command: 'increment',
      priority: 100,
      template: {
        format: 'збільшити {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'збільшити', alternatives: ['збільш'] },
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
      id: 'increment-uk-simple',
      language: 'uk',
      command: 'increment',
      priority: 90,
      template: {
        format: 'збільшити {patient}',
        tokens: [
          { type: 'literal', value: 'збільшити', alternatives: ['збільш'] },
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

function getIncrementPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'increment-vi-full',
      language: 'vi',
      command: 'increment',
      priority: 100,
      template: {
        format: 'tăng {target} thêm {amount}',
        tokens: [
          { type: 'literal', value: 'tăng', alternatives: ['tăng lên'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'thêm', alternatives: ['lên'] },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: {
          marker: 'thêm',
          markerAlternatives: ['lên'],
          default: { type: 'literal', value: '1' },
        },
      },
    },
    {
      id: 'increment-vi-simple',
      language: 'vi',
      command: 'increment',
      priority: 90,
      template: {
        format: 'tăng {target}',
        tokens: [
          { type: 'literal', value: 'tăng', alternatives: ['tăng lên'] },
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

function getIncrementPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'increment-zh-full',
      language: 'zh',
      command: 'increment',
      priority: 100,
      template: {
        format: '增加 {patient}',
        tokens: [
          { type: 'literal', value: '增加', alternatives: ['递增', '加', '增', 'increment'] },
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
 * Get increment patterns for a specific language.
 */
export function getIncrementPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getIncrementPatternsBn();
    case 'de':
      return getIncrementPatternsDe();
    case 'hi':
      return getIncrementPatternsHi();
    case 'it':
      return getIncrementPatternsIt();
    case 'pl':
      return getIncrementPatternsPl();
    case 'ru':
      return getIncrementPatternsRu();
    case 'th':
      return getIncrementPatternsTh();
    case 'uk':
      return getIncrementPatternsUk();
    case 'vi':
      return getIncrementPatternsVi();
    case 'zh':
      return getIncrementPatternsZh();
    default:
      return [];
  }
}
