/**
 * Hide Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "hide" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 15 files into single file.
 */

import type { LanguagePattern } from '../types';

function getHidePatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: #element কে লুকান
    {
      id: 'hide-bn-full',
      language: 'bn',
      command: 'hide',
      priority: 100,
      template: {
        format: '{patient} কে লুকান',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'লুকান', alternatives: ['লুকাও'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: লুকান #element
    {
      id: 'hide-bn-simple',
      language: 'bn',
      command: 'hide',
      priority: 90,
      template: {
        format: 'লুকান {patient}',
        tokens: [
          { type: 'literal', value: 'লুকান', alternatives: ['লুকাও'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'hide-de-full',
      language: 'de',
      command: 'hide',
      priority: 100,
      template: {
        format: 'verstecke {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'verstecke',
            alternatives: ['verstecken', 'verberge', 'verbergen', 'hide'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: #element को छिपाएं
    {
      id: 'hide-hi-full',
      language: 'hi',
      command: 'hide',
      priority: 100,
      template: {
        format: '{patient} को छिपाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'छिपाएं', alternatives: ['छिपा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: छिपाएं #element
    {
      id: 'hide-hi-simple',
      language: 'hi',
      command: 'hide',
      priority: 90,
      template: {
        format: 'छिपाएं {patient}',
        tokens: [
          { type: 'literal', value: 'छिपाएं', alternatives: ['छिपा'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // Bare pattern: छिपाएं (implicit me)
    {
      id: 'hide-hi-bare',
      language: 'hi',
      command: 'hide',
      priority: 80,
      template: {
        format: 'छिपाएं',
        tokens: [{ type: 'literal', value: 'छिपाएं', alternatives: ['छिपा'] }],
      },
      extraction: {
        patient: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getHidePatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'hide-it-full',
      language: 'it',
      command: 'hide',
      priority: 100,
      template: {
        format: 'nascondere {patient} con {style}',
        tokens: [
          { type: 'literal', value: 'nascondere', alternatives: ['nascondi', 'hide'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'con' },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'con' },
      },
    },
    {
      id: 'hide-it-simple',
      language: 'it',
      command: 'hide',
      priority: 90,
      template: {
        format: 'nascondere {patient}',
        tokens: [
          { type: 'literal', value: 'nascondere', alternatives: ['nascondi', 'hide'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'hide-pl-full',
      language: 'pl',
      command: 'hide',
      priority: 100,
      template: {
        format: 'ukryj {patient} z {style}',
        tokens: [
          { type: 'literal', value: 'ukryj', alternatives: ['schowaj', 'zasłoń', 'zaslon'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'z', alternatives: ['ze', 'jako'] },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'z', markerAlternatives: ['ze', 'jako'] },
      },
    },
    {
      id: 'hide-pl-simple',
      language: 'pl',
      command: 'hide',
      priority: 90,
      template: {
        format: 'ukryj {patient}',
        tokens: [
          { type: 'literal', value: 'ukryj', alternatives: ['schowaj', 'zasłoń', 'zaslon'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'hide-ru-full',
      language: 'ru',
      command: 'hide',
      priority: 100,
      template: {
        format: 'скрыть {patient} с {style}',
        tokens: [
          { type: 'literal', value: 'скрыть', alternatives: ['скрой', 'спрятать', 'спрячь'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'с', alternatives: ['со', 'как'] },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'с', markerAlternatives: ['со', 'как'] },
      },
    },
    {
      id: 'hide-ru-simple',
      language: 'ru',
      command: 'hide',
      priority: 90,
      template: {
        format: 'скрыть {patient}',
        tokens: [
          { type: 'literal', value: 'скрыть', alternatives: ['скрой', 'спрятать', 'спрячь'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: ซ่อน #element
    {
      id: 'hide-th-simple',
      language: 'th',
      command: 'hide',
      priority: 100,
      template: {
        format: 'ซ่อน {patient}',
        tokens: [
          { type: 'literal', value: 'ซ่อน' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'hide-uk-full',
      language: 'uk',
      command: 'hide',
      priority: 100,
      template: {
        format: 'сховати {patient} з {style}',
        tokens: [
          { type: 'literal', value: 'сховати', alternatives: ['сховай', 'приховати', 'приховай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'з', alternatives: ['із', 'як'] },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'з', markerAlternatives: ['із', 'як'] },
      },
    },
    {
      id: 'hide-uk-simple',
      language: 'uk',
      command: 'hide',
      priority: 90,
      template: {
        format: 'сховати {patient}',
        tokens: [
          { type: 'literal', value: 'сховати', alternatives: ['сховай', 'приховати', 'приховай'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'hide-vi-full',
      language: 'vi',
      command: 'hide',
      priority: 100,
      template: {
        format: 'ẩn {patient} với {effect}',
        tokens: [
          { type: 'literal', value: 'ẩn', alternatives: ['che', 'giấu'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'với' },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'với' },
      },
    },
    {
      id: 'hide-vi-simple',
      language: 'vi',
      command: 'hide',
      priority: 90,
      template: {
        format: 'ẩn {patient}',
        tokens: [
          { type: 'literal', value: 'ẩn', alternatives: ['che', 'giấu'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getHidePatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'hide-zh-full',
      language: 'zh',
      command: 'hide',
      priority: 100,
      template: {
        format: '隐藏 {patient}',
        tokens: [
          { type: 'literal', value: '隐藏', alternatives: ['隱藏', '藏起', '藏'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'hide-zh-ba',
      language: 'zh',
      command: 'hide',
      priority: 95,
      template: {
        format: '把 {patient} 隐藏',
        tokens: [
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '隐藏', alternatives: ['隱藏', '藏起'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'hide-zh-from',
      language: 'zh',
      command: 'hide',
      priority: 90,
      template: {
        format: '从 {destination} 隐藏 {patient}',
        tokens: [
          { type: 'literal', value: '从', alternatives: ['從'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '隐藏', alternatives: ['隱藏'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
  ];
}

/**
 * Get hide patterns for a specific language.
 */
export function getHidePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getHidePatternsBn();
    case 'de':
      return getHidePatternsDe();
    case 'hi':
      return getHidePatternsHi();
    case 'it':
      return getHidePatternsIt();
    case 'pl':
      return getHidePatternsPl();
    case 'ru':
      return getHidePatternsRu();
    case 'th':
      return getHidePatternsTh();
    case 'uk':
      return getHidePatternsUk();
    case 'vi':
      return getHidePatternsVi();
    case 'zh':
      return getHidePatternsZh();
    default:
      return [];
  }
}
