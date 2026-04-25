/**
 * Show Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "show" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 16 files into single file.
 */

import type { LanguagePattern } from '../types';

function getShowPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: #element কে দেখান
    {
      id: 'show-bn-full',
      language: 'bn',
      command: 'show',
      priority: 100,
      template: {
        format: '{patient} কে দেখান',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'দেখান', alternatives: ['দেখাও'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: দেখান #element
    {
      id: 'show-bn-simple',
      language: 'bn',
      command: 'show',
      priority: 90,
      template: {
        format: 'দেখান {patient}',
        tokens: [
          { type: 'literal', value: 'দেখান', alternatives: ['দেখাও'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'show-de-full',
      language: 'de',
      command: 'show',
      priority: 100,
      template: {
        format: 'zeige {patient}',
        tokens: [
          { type: 'literal', value: 'zeige', alternatives: ['zeigen', 'anzeigen', 'show'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsFr(): LanguagePattern[] {
  return [
    {
      id: 'show-fr-full',
      language: 'fr',
      command: 'show',
      priority: 100,
      template: {
        format: 'afficher {patient}',
        tokens: [
          { type: 'literal', value: 'afficher', alternatives: ['montrer', 'présenter', 'show'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: #element को दिखाएं
    {
      id: 'show-hi-full',
      language: 'hi',
      command: 'show',
      priority: 100,
      template: {
        format: '{patient} को दिखाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'दिखाएं', alternatives: ['दिखा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: दिखाएं #element
    {
      id: 'show-hi-simple',
      language: 'hi',
      command: 'show',
      priority: 90,
      template: {
        format: 'दिखाएं {patient}',
        tokens: [
          { type: 'literal', value: 'दिखाएं', alternatives: ['दिखा'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // Bare pattern: दिखाएं (implicit me)
    {
      id: 'show-hi-bare',
      language: 'hi',
      command: 'show',
      priority: 80,
      template: {
        format: 'दिखाएं',
        tokens: [{ type: 'literal', value: 'दिखाएं', alternatives: ['दिखा'] }],
      },
      extraction: {
        patient: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getShowPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'show-it-full',
      language: 'it',
      command: 'show',
      priority: 100,
      template: {
        format: 'mostrare {patient} con {style}',
        tokens: [
          { type: 'literal', value: 'mostrare', alternatives: ['mostra', 'visualizzare', 'show'] },
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
      id: 'show-it-simple',
      language: 'it',
      command: 'show',
      priority: 90,
      template: {
        format: 'mostrare {patient}',
        tokens: [
          { type: 'literal', value: 'mostrare', alternatives: ['mostra', 'visualizzare', 'show'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'show-pl-full',
      language: 'pl',
      command: 'show',
      priority: 100,
      template: {
        format: 'pokaż {patient} z {style}',
        tokens: [
          { type: 'literal', value: 'pokaż', alternatives: ['pokaz', 'wyświetl', 'wyswietl'] },
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
      id: 'show-pl-simple',
      language: 'pl',
      command: 'show',
      priority: 90,
      template: {
        format: 'pokaż {patient}',
        tokens: [
          { type: 'literal', value: 'pokaż', alternatives: ['pokaz', 'wyświetl', 'wyswietl'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'show-ru-full',
      language: 'ru',
      command: 'show',
      priority: 100,
      template: {
        format: 'показать {patient} с {style}',
        tokens: [
          { type: 'literal', value: 'показать', alternatives: ['покажи'] },
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
      id: 'show-ru-simple',
      language: 'ru',
      command: 'show',
      priority: 90,
      template: {
        format: 'показать {patient}',
        tokens: [
          { type: 'literal', value: 'показать', alternatives: ['покажи'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: แสดง #element
    {
      id: 'show-th-simple',
      language: 'th',
      command: 'show',
      priority: 100,
      template: {
        format: 'แสดง {patient}',
        tokens: [
          { type: 'literal', value: 'แสดง' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'show-uk-full',
      language: 'uk',
      command: 'show',
      priority: 100,
      template: {
        format: 'показати {patient} з {style}',
        tokens: [
          { type: 'literal', value: 'показати', alternatives: ['покажи'] },
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
      id: 'show-uk-simple',
      language: 'uk',
      command: 'show',
      priority: 90,
      template: {
        format: 'показати {patient}',
        tokens: [
          { type: 'literal', value: 'показати', alternatives: ['покажи'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'show-vi-full',
      language: 'vi',
      command: 'show',
      priority: 100,
      template: {
        format: 'hiển thị {patient} với {effect}',
        tokens: [
          { type: 'literal', value: 'hiển thị', alternatives: ['hiện'] },
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
      id: 'show-vi-simple',
      language: 'vi',
      command: 'show',
      priority: 90,
      template: {
        format: 'hiển thị {patient}',
        tokens: [
          { type: 'literal', value: 'hiển thị', alternatives: ['hiện'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getShowPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'show-zh-full',
      language: 'zh',
      command: 'show',
      priority: 100,
      template: {
        format: '显示 {patient}',
        tokens: [
          { type: 'literal', value: '显示', alternatives: ['顯示', '展示', '呈现', '呈現'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'show-zh-ba',
      language: 'zh',
      command: 'show',
      priority: 95,
      template: {
        format: '把 {patient} 显示',
        tokens: [
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '显示', alternatives: ['顯示', '展示'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'show-zh-with-给',
      language: 'zh',
      command: 'show',
      priority: 90,
      template: {
        format: '给 {destination} 显示 {patient}',
        tokens: [
          { type: 'literal', value: '给', alternatives: ['給'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '显示', alternatives: ['顯示'] },
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
 * Get show patterns for a specific language.
 */
export function getShowPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getShowPatternsBn();
    case 'de':
      return getShowPatternsDe();
    case 'fr':
      return getShowPatternsFr();
    case 'hi':
      return getShowPatternsHi();
    case 'it':
      return getShowPatternsIt();
    case 'pl':
      return getShowPatternsPl();
    case 'ru':
      return getShowPatternsRu();
    case 'th':
      return getShowPatternsTh();
    case 'uk':
      return getShowPatternsUk();
    case 'vi':
      return getShowPatternsVi();
    case 'zh':
      return getShowPatternsZh();
    default:
      return [];
  }
}
