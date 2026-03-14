/**
 * Remove Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "remove" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 15 files into single file.
 */

import type { LanguagePattern } from '../types';

function getRemovePatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: .active কে সরান
    {
      id: 'remove-bn-full',
      language: 'bn',
      command: 'remove',
      priority: 100,
      template: {
        format: '{patient} কে সরান',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'সরান', alternatives: ['মুছুন'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: সরান .active
    {
      id: 'remove-bn-simple',
      language: 'bn',
      command: 'remove',
      priority: 90,
      template: {
        format: 'সরান {patient}',
        tokens: [
          { type: 'literal', value: 'সরান', alternatives: ['মুছুন'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With source: #button থেকে .active কে সরান
    {
      id: 'remove-bn-with-source',
      language: 'bn',
      command: 'remove',
      priority: 95,
      template: {
        format: '{source} থেকে {patient} কে সরান',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'থেকে' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'সরান', alternatives: ['মুছুন'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getRemovePatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: .class को #element से हटाएं
    {
      id: 'remove-hi-full',
      language: 'hi',
      command: 'remove',
      priority: 100,
      template: {
        format: '{patient} को {source} से हटाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'से' },
          { type: 'literal', value: 'हटाएं', alternatives: ['हटा', 'मिटाएं'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        source: { marker: 'से', position: 3 },
      },
    },
    // Simple pattern: .class हटाएं
    {
      id: 'remove-hi-simple',
      language: 'hi',
      command: 'remove',
      priority: 90,
      template: {
        format: '{patient} हटाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'हटाएं', alternatives: ['हटा', 'मिटाएं'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Bare pattern: हटाएं .class
    {
      id: 'remove-hi-bare',
      language: 'hi',
      command: 'remove',
      priority: 80,
      template: {
        format: 'हटाएं {patient}',
        tokens: [
          { type: 'literal', value: 'हटाएं', alternatives: ['हटा', 'मिटाएं'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getRemovePatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'remove-it-full',
      language: 'it',
      command: 'remove',
      priority: 100,
      template: {
        format: 'rimuovere {patient} da {target}',
        tokens: [
          {
            type: 'literal',
            value: 'rimuovere',
            alternatives: ['rimuovi', 'eliminare', 'togliere', 'remove'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'da', alternatives: ['di'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'da',
          markerAlternatives: ['di'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-it-simple',
      language: 'it',
      command: 'remove',
      priority: 90,
      template: {
        format: 'rimuovere {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'rimuovere',
            alternatives: ['rimuovi', 'eliminare', 'togliere', 'remove'],
          },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getRemovePatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'remove-pl-full',
      language: 'pl',
      command: 'remove',
      priority: 100,
      template: {
        format: 'usuń {patient} z {source}',
        tokens: [
          { type: 'literal', value: 'usuń', alternatives: ['usun', 'wyczyść', 'wyczysc'] },
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
        source: {
          marker: 'z',
          markerAlternatives: ['od', 'ze'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-pl-simple',
      language: 'pl',
      command: 'remove',
      priority: 90,
      template: {
        format: 'usuń {patient}',
        tokens: [
          { type: 'literal', value: 'usuń', alternatives: ['usun', 'wyczyść', 'wyczysc'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getRemovePatternsQu(): LanguagePattern[] {
  return [
    // SOV pattern: .active ta qichuy (patient + verb)
    {
      id: 'remove-qu-sov',
      language: 'qu',
      command: 'remove',
      priority: 100,
      template: {
        format: '{patient} ta qichuy',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'qichuy', alternatives: ['hurquy', 'anchuchiy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: qichuy .active (verb + patient, more casual)
    {
      id: 'remove-qu-simple',
      language: 'qu',
      command: 'remove',
      priority: 90,
      template: {
        format: 'qichuy {patient}',
        tokens: [
          { type: 'literal', value: 'qichuy', alternatives: ['hurquy', 'anchuchiy'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With source: #button manta .active ta qichuy
    {
      id: 'remove-qu-with-source',
      language: 'qu',
      command: 'remove',
      priority: 95,
      template: {
        format: '{source} manta {patient} ta qichuy',
        tokens: [
          { type: 'role', role: 'source' },
          { type: 'literal', value: 'manta' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'qichuy', alternatives: ['hurquy', 'anchuchiy'] },
        ],
      },
      extraction: {
        source: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getRemovePatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'remove-ru-full',
      language: 'ru',
      command: 'remove',
      priority: 100,
      template: {
        format: 'удалить {patient} из {source}',
        tokens: [
          { type: 'literal', value: 'удалить', alternatives: ['удали', 'убрать', 'убери'] },
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
        source: {
          marker: 'из',
          markerAlternatives: ['от', 'с'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-ru-simple',
      language: 'ru',
      command: 'remove',
      priority: 90,
      template: {
        format: 'удалить {patient}',
        tokens: [
          { type: 'literal', value: 'удалить', alternatives: ['удали', 'убрать', 'убери'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getRemovePatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: ลบ .active
    {
      id: 'remove-th-simple',
      language: 'th',
      command: 'remove',
      priority: 100,
      template: {
        format: 'ลบ {patient}',
        tokens: [
          { type: 'literal', value: 'ลบ', alternatives: ['ลบออก'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With source: ลบ .active จาก #button
    {
      id: 'remove-th-with-source',
      language: 'th',
      command: 'remove',
      priority: 95,
      template: {
        format: 'ลบ {patient} จาก {source}',
        tokens: [
          { type: 'literal', value: 'ลบ', alternatives: ['ลบออก'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'จาก' },
          { type: 'role', role: 'source' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'จาก', position: 3 },
      },
    },
  ];
}

function getRemovePatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'remove-uk-full',
      language: 'uk',
      command: 'remove',
      priority: 100,
      template: {
        format: 'видалити {patient} з {source}',
        tokens: [
          { type: 'literal', value: 'видалити', alternatives: ['видали', 'прибрати', 'прибери'] },
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
        source: {
          marker: 'з',
          markerAlternatives: ['від', 'із'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-uk-simple',
      language: 'uk',
      command: 'remove',
      priority: 90,
      template: {
        format: 'видалити {patient}',
        tokens: [
          { type: 'literal', value: 'видалити', alternatives: ['видали', 'прибрати', 'прибери'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getRemovePatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'remove-vi-full',
      language: 'vi',
      command: 'remove',
      priority: 100,
      template: {
        format: 'xóa {patient} khỏi {target}',
        tokens: [
          { type: 'literal', value: 'xóa', alternatives: ['gỡ bỏ', 'loại bỏ', 'bỏ'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'khỏi', alternatives: ['từ'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: {
          marker: 'khỏi',
          markerAlternatives: ['từ'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-vi-simple',
      language: 'vi',
      command: 'remove',
      priority: 90,
      template: {
        format: 'xóa {patient}',
        tokens: [
          { type: 'literal', value: 'xóa', alternatives: ['gỡ bỏ', 'loại bỏ', 'bỏ'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}

function getRemovePatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'remove-zh-full',
      language: 'zh',
      command: 'remove',
      priority: 100,
      template: {
        format: '从 {destination} 删除 {patient}',
        tokens: [
          { type: 'literal', value: '从', alternatives: ['從'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '删除', alternatives: ['刪除', '移除', '去掉'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'remove-zh-simple',
      language: 'zh',
      command: 'remove',
      priority: 90,
      template: {
        format: '删除 {patient}',
        tokens: [
          { type: 'literal', value: '删除', alternatives: ['刪除', '移除', '去掉'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'remove-zh-ba',
      language: 'zh',
      command: 'remove',
      priority: 95,
      template: {
        format: '把 {patient} 从 {destination} 删除',
        tokens: [
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '从', alternatives: ['從'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '删除', alternatives: ['刪除', '移除'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
  ];
}

/**
 * Get remove patterns for a specific language.
 */
export function getRemovePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getRemovePatternsBn();
    case 'hi':
      return getRemovePatternsHi();
    case 'it':
      return getRemovePatternsIt();
    case 'pl':
      return getRemovePatternsPl();
    case 'qu':
      return getRemovePatternsQu();
    case 'ru':
      return getRemovePatternsRu();
    case 'th':
      return getRemovePatternsTh();
    case 'uk':
      return getRemovePatternsUk();
    case 'vi':
      return getRemovePatternsVi();
    case 'zh':
      return getRemovePatternsZh();
    default:
      return [];
  }
}
