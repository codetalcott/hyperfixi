/**
 * Get Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "get" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 13 files into single file.
 */

import type { LanguagePattern } from '../types';

function getGetPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: :x থেকে পান
    {
      id: 'get-bn-full',
      language: 'bn',
      command: 'get',
      priority: 100,
      template: {
        format: '{source} থেকে পান',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'থেকে' },
          { type: 'literal', value: 'পান', alternatives: ['নিন'] },
        ],
      },
      extraction: {
        source: { position: 0 },
      },
    },
    // Simple pattern: পান :x
    {
      id: 'get-bn-simple',
      language: 'bn',
      command: 'get',
      priority: 90,
      template: {
        format: 'পান {source}',
        tokens: [
          { type: 'literal', value: 'পান', alternatives: ['নিন'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}

function getGetPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'get-de-full',
      language: 'de',
      command: 'get',
      priority: 100,
      template: {
        format: 'hole {source}',
        tokens: [
          { type: 'literal', value: 'hole', alternatives: ['holen', 'get', 'bekomme', 'bekommen'] },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}

function getGetPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: #element से प्राप्त करें
    {
      id: 'get-hi-full',
      language: 'hi',
      command: 'get',
      priority: 100,
      template: {
        format: '{source} से प्राप्त करें',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'से' },
          { type: 'literal', value: 'प्राप्त', alternatives: ['पाएं'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        source: { position: 0 },
      },
    },
    // Simple pattern: प्राप्त #element
    {
      id: 'get-hi-simple',
      language: 'hi',
      command: 'get',
      priority: 90,
      template: {
        format: 'प्राप्त {source}',
        tokens: [
          { type: 'literal', value: 'प्राप्त', alternatives: ['पाएं'] },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}

function getGetPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'get-it-full',
      language: 'it',
      command: 'get',
      priority: 100,
      template: {
        format: 'ottenere {patient} da {source}',
        tokens: [
          { type: 'literal', value: 'ottenere', alternatives: ['ottieni', 'get', 'prendere'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'da', alternatives: ['di'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'da', markerAlternatives: ['di'] },
      },
    },
    {
      id: 'get-it-simple',
      language: 'it',
      command: 'get',
      priority: 90,
      template: {
        format: 'ottenere {patient}',
        tokens: [
          { type: 'literal', value: 'ottenere', alternatives: ['ottieni', 'get'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getGetPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'get-pl-full',
      language: 'pl',
      command: 'get',
      priority: 100,
      template: {
        format: 'uzyskaj {patient} z {source}',
        tokens: [
          { type: 'literal', value: 'uzyskaj' },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'z', alternatives: ['od', 'ze'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'z', markerAlternatives: ['od', 'ze'] },
      },
    },
    {
      id: 'get-pl-simple',
      language: 'pl',
      command: 'get',
      priority: 90,
      template: {
        format: 'uzyskaj {patient}',
        tokens: [
          { type: 'literal', value: 'uzyskaj' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getGetPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'get-ru-full',
      language: 'ru',
      command: 'get',
      priority: 100,
      template: {
        format: 'получить {patient} из {source}',
        tokens: [
          { type: 'literal', value: 'получить', alternatives: ['получи', 'взять', 'возьми'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'из', alternatives: ['от', 'с'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'из', markerAlternatives: ['от', 'с'] },
      },
    },
    {
      id: 'get-ru-simple',
      language: 'ru',
      command: 'get',
      priority: 90,
      template: {
        format: 'получить {patient}',
        tokens: [
          { type: 'literal', value: 'получить', alternatives: ['получи', 'взять', 'возьми'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getGetPatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: รับค่า :x
    {
      id: 'get-th-simple',
      language: 'th',
      command: 'get',
      priority: 100,
      template: {
        format: 'รับค่า {source}',
        tokens: [
          { type: 'literal', value: 'รับค่า' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        source: { position: 1 },
      },
    },
  ];
}

function getGetPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'get-uk-full',
      language: 'uk',
      command: 'get',
      priority: 100,
      template: {
        format: 'отримати {patient} з {source}',
        tokens: [
          { type: 'literal', value: 'отримати', alternatives: ['отримай', 'взяти', 'візьми'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'з', alternatives: ['від', 'із'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'з', markerAlternatives: ['від', 'із'] },
      },
    },
    {
      id: 'get-uk-simple',
      language: 'uk',
      command: 'get',
      priority: 90,
      template: {
        format: 'отримати {patient}',
        tokens: [
          { type: 'literal', value: 'отримати', alternatives: ['отримай', 'взяти', 'візьми'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getGetPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'get-vi-full',
      language: 'vi',
      command: 'get',
      priority: 100,
      template: {
        format: 'lấy giá trị của {target}',
        tokens: [
          { type: 'literal', value: 'lấy giá trị', alternatives: ['nhận', 'lấy'] },
          { type: 'group', optional: true, tokens: [{ type: 'literal', value: 'của' }] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    {
      id: 'get-vi-simple',
      language: 'vi',
      command: 'get',
      priority: 90,
      template: {
        format: 'lấy {target}',
        tokens: [
          { type: 'literal', value: 'lấy', alternatives: ['nhận', 'lấy giá trị'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

/**
 * Get get patterns for a specific language.
 */
export function getGetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getGetPatternsBn();
    case 'de':
      return getGetPatternsDe();
    case 'hi':
      return getGetPatternsHi();
    case 'it':
      return getGetPatternsIt();
    case 'pl':
      return getGetPatternsPl();
    case 'ru':
      return getGetPatternsRu();
    case 'th':
      return getGetPatternsTh();
    case 'uk':
      return getGetPatternsUk();
    case 'vi':
      return getGetPatternsVi();
    default:
      return [];
  }
}
