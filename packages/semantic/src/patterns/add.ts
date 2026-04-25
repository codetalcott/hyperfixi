/**
 * Add Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "add" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 15 files into single file.
 */

import type { LanguagePattern } from '../types';

function getAddPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: .active কে যোগ করুন
    {
      id: 'add-bn-full',
      language: 'bn',
      command: 'add',
      priority: 100,
      template: {
        format: '{patient} কে যোগ করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'যোগ' },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: যোগ .active
    {
      id: 'add-bn-simple',
      language: 'bn',
      command: 'add',
      priority: 90,
      template: {
        format: 'যোগ {patient}',
        tokens: [
          { type: 'literal', value: 'যোগ' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: #button এ .active কে যোগ করুন
    {
      id: 'add-bn-with-dest',
      language: 'bn',
      command: 'add',
      priority: 95,
      template: {
        format: '{destination} এ {patient} কে যোগ করুন',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'এ', alternatives: ['তে'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'যোগ' },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getAddPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: .class को #element में जोड़ें
    {
      id: 'add-hi-full',
      language: 'hi',
      command: 'add',
      priority: 100,
      template: {
        format: '{patient} को {destination} में जोड़ें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'में' },
          { type: 'literal', value: 'जोड़ें', alternatives: ['जोड़'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'में', position: 3 },
      },
    },
    // Simple pattern: .class जोड़ें
    {
      id: 'add-hi-simple',
      language: 'hi',
      command: 'add',
      priority: 90,
      template: {
        format: '{patient} जोड़ें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'जोड़ें', alternatives: ['जोड़'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Bare pattern: जोड़ें .class
    {
      id: 'add-hi-bare',
      language: 'hi',
      command: 'add',
      priority: 80,
      template: {
        format: 'जोड़ें {patient}',
        tokens: [
          { type: 'literal', value: 'जोड़ें', alternatives: ['जोड़'] },
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

function getAddPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'add-it-full',
      language: 'it',
      command: 'add',
      priority: 100,
      template: {
        format: 'aggiungere {patient} a {target}',
        tokens: [
          { type: 'literal', value: 'aggiungere', alternatives: ['aggiungi', 'add'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'a', alternatives: ['su', 'in'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'a',
          markerAlternatives: ['su', 'in'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-it-simple',
      language: 'it',
      command: 'add',
      priority: 90,
      template: {
        format: 'aggiungere {patient}',
        tokens: [
          { type: 'literal', value: 'aggiungere', alternatives: ['aggiungi', 'add'] },
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

function getAddPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'add-pl-full',
      language: 'pl',
      command: 'add',
      priority: 100,
      template: {
        format: 'dodaj {patient} do {destination}',
        tokens: [
          { type: 'literal', value: 'dodaj', alternatives: ['dołącz', 'dolacz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'do', alternatives: ['na', 'w'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'do',
          markerAlternatives: ['na', 'w'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-pl-simple',
      language: 'pl',
      command: 'add',
      priority: 90,
      template: {
        format: 'dodaj {patient}',
        tokens: [
          { type: 'literal', value: 'dodaj', alternatives: ['dołącz', 'dolacz'] },
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

function getAddPatternsQu(): LanguagePattern[] {
  return [
    // SOV pattern: .active ta yapay (patient + verb)
    {
      id: 'add-qu-sov',
      language: 'qu',
      command: 'add',
      priority: 100,
      template: {
        format: '{patient} ta yapay',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'yapay', alternatives: ['yapaykuy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: yapay .active (verb + patient, more casual)
    {
      id: 'add-qu-simple',
      language: 'qu',
      command: 'add',
      priority: 90,
      template: {
        format: 'yapay {patient}',
        tokens: [
          { type: 'literal', value: 'yapay', alternatives: ['yapaykuy'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: #button man .active ta yapay
    {
      id: 'add-qu-with-dest',
      language: 'qu',
      command: 'add',
      priority: 95,
      template: {
        format: '{destination} man {patient} ta yapay',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'man' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: 'yapay', alternatives: ['yapaykuy'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getAddPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'add-ru-full',
      language: 'ru',
      command: 'add',
      priority: 100,
      template: {
        format: 'добавить {patient} к {destination}',
        tokens: [
          { type: 'literal', value: 'добавить', alternatives: ['добавь'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'к', alternatives: ['на', 'в'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'к',
          markerAlternatives: ['на', 'в'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-ru-simple',
      language: 'ru',
      command: 'add',
      priority: 90,
      template: {
        format: 'добавить {patient}',
        tokens: [
          { type: 'literal', value: 'добавить', alternatives: ['добавь'] },
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

function getAddPatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: เพิ่ม .active
    {
      id: 'add-th-simple',
      language: 'th',
      command: 'add',
      priority: 100,
      template: {
        format: 'เพิ่ม {patient}',
        tokens: [
          { type: 'literal', value: 'เพิ่ม' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: เพิ่ม .active ใน #button
    {
      id: 'add-th-with-dest',
      language: 'th',
      command: 'add',
      priority: 95,
      template: {
        format: 'เพิ่ม {patient} ใน {destination}',
        tokens: [
          { type: 'literal', value: 'เพิ่ม' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ใน' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'ใน', position: 3 },
      },
    },
  ];
}

function getAddPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'add-uk-full',
      language: 'uk',
      command: 'add',
      priority: 100,
      template: {
        format: 'додати {patient} до {destination}',
        tokens: [
          { type: 'literal', value: 'додати', alternatives: ['додай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'до', alternatives: ['на', 'в'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'до',
          markerAlternatives: ['на', 'в'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-uk-simple',
      language: 'uk',
      command: 'add',
      priority: 90,
      template: {
        format: 'додати {patient}',
        tokens: [
          { type: 'literal', value: 'додати', alternatives: ['додай'] },
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

function getAddPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'add-vi-full',
      language: 'vi',
      command: 'add',
      priority: 100,
      template: {
        format: 'thêm {patient} vào {target}',
        tokens: [
          { type: 'literal', value: 'thêm', alternatives: ['bổ sung'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'vào', alternatives: ['cho'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'vào',
          markerAlternatives: ['cho'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-vi-simple',
      language: 'vi',
      command: 'add',
      priority: 90,
      template: {
        format: 'thêm {patient}',
        tokens: [
          { type: 'literal', value: 'thêm', alternatives: ['bổ sung'] },
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

function getAddPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'add-zh-full',
      language: 'zh',
      command: 'add',
      priority: 100,
      template: {
        format: '给 {destination} 添加 {patient}',
        tokens: [
          { type: 'literal', value: '给', alternatives: ['為', '为'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '添加', alternatives: ['加', '增加', '加上'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'add-zh-simple',
      language: 'zh',
      command: 'add',
      priority: 90,
      template: {
        format: '添加 {patient}',
        tokens: [
          { type: 'literal', value: '添加', alternatives: ['加', '增加'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'add-zh-ba',
      language: 'zh',
      command: 'add',
      priority: 95,
      template: {
        format: '把 {patient} 添加到 {destination}',
        tokens: [
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '添加到', alternatives: ['加到', '增加到'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: '添加到', markerAlternatives: ['加到', '增加到'] },
      },
    },
  ];
}

/**
 * Get add patterns for a specific language.
 */
export function getAddPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getAddPatternsBn();
    case 'hi':
      return getAddPatternsHi();
    case 'it':
      return getAddPatternsIt();
    case 'pl':
      return getAddPatternsPl();
    case 'qu':
      return getAddPatternsQu();
    case 'ru':
      return getAddPatternsRu();
    case 'th':
      return getAddPatternsTh();
    case 'uk':
      return getAddPatternsUk();
    case 'vi':
      return getAddPatternsVi();
    case 'zh':
      return getAddPatternsZh();
    default:
      return [];
  }
}
