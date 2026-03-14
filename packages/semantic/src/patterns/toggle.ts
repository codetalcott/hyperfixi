/**
 * Toggle Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "toggle" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 17 files into single file.
 */

import type { LanguagePattern } from '../types';

function getTogglePatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: .active কে টগল করুন
    {
      id: 'toggle-bn-full',
      language: 'bn',
      command: 'toggle',
      priority: 100,
      template: {
        format: '{patient} কে টগল করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'টগল', alternatives: ['পরিবর্তন'] },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: টগল .active
    {
      id: 'toggle-bn-simple',
      language: 'bn',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'টগল {patient}',
        tokens: [
          { type: 'literal', value: 'টগল', alternatives: ['পরিবর্তন'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: #button এ .active কে টগল করুন
    {
      id: 'toggle-bn-with-dest',
      language: 'bn',
      command: 'toggle',
      priority: 95,
      template: {
        format: '{destination} এ {patient} কে টগল করুন',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'এ', alternatives: ['তে'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'literal', value: 'টগল', alternatives: ['পরিবর্তন'] },
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

function getTogglePatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'toggle-en-full',
      language: 'en',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'toggle {patient} on {target}',
        tokens: [
          { type: 'literal', value: 'toggle' },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'on', alternatives: ['from'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'on',
          markerAlternatives: ['from'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-en-simple',
      language: 'en',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'toggle {patient}',
        tokens: [
          { type: 'literal', value: 'toggle' },
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

function getTogglePatternsEs(): LanguagePattern[] {
  return [
    {
      id: 'toggle-es-full',
      language: 'es',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'alternar {patient} en {target}',
        tokens: [
          { type: 'literal', value: 'alternar', alternatives: ['cambiar', 'toggle'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'en', alternatives: ['sobre', 'de'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'en',
          markerAlternatives: ['sobre', 'de'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-es-simple',
      language: 'es',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'alternar {patient}',
        tokens: [
          { type: 'literal', value: 'alternar', alternatives: ['cambiar', 'toggle'] },
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

function getTogglePatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: .active को #button पर टॉगल करें
    {
      id: 'toggle-hi-full',
      language: 'hi',
      command: 'toggle',
      priority: 100,
      template: {
        format: '{patient} को {destination} पर टॉगल करें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'पर' },
          { type: 'literal', value: 'टॉगल', alternatives: ['बदलें', 'बदल'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'को', position: 2 },
      },
    },
    // Simple pattern: .active टॉगल करें
    {
      id: 'toggle-hi-simple',
      language: 'hi',
      command: 'toggle',
      priority: 90,
      template: {
        format: '{patient} टॉगल करें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'टॉगल', alternatives: ['बदलें', 'बदल'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Bare pattern: टॉगल .active
    {
      id: 'toggle-hi-bare',
      language: 'hi',
      command: 'toggle',
      priority: 80,
      template: {
        format: 'टॉगल {patient}',
        tokens: [
          { type: 'literal', value: 'टॉगल', alternatives: ['बदलें', 'बदल'] },
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

function getTogglePatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'toggle-it-full',
      language: 'it',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'commutare {patient} su {target}',
        tokens: [
          {
            type: 'literal',
            value: 'commutare',
            alternatives: ['alternare', 'toggle', 'cambiare'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'su', alternatives: ['in', 'di'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'su',
          markerAlternatives: ['in', 'di'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-it-simple',
      language: 'it',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'commutare {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'commutare',
            alternatives: ['alternare', 'toggle', 'cambiare'],
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

function getTogglePatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'toggle-pl-full',
      language: 'pl',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'przełącz {patient} na {destination}',
        tokens: [
          { type: 'literal', value: 'przełącz', alternatives: ['przelacz', 'przełączaj'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'na', alternatives: ['w', 'dla'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'na',
          markerAlternatives: ['w', 'dla'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-pl-simple',
      language: 'pl',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'przełącz {patient}',
        tokens: [
          { type: 'literal', value: 'przełącz', alternatives: ['przelacz', 'przełączaj'] },
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

function getTogglePatternsQu(): LanguagePattern[] {
  return [
    // SOV pattern: .active ta t'ikray (patient + verb)
    {
      id: 'toggle-qu-sov',
      language: 'qu',
      command: 'toggle',
      priority: 100,
      template: {
        format: "{patient} ta t'ikray",
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: t'ikray .active (verb + patient, more casual)
    {
      id: 'toggle-qu-simple',
      language: 'qu',
      command: 'toggle',
      priority: 90,
      template: {
        format: "t'ikray {patient}",
        tokens: [
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: #button pi .active ta t'ikray
    {
      id: 'toggle-qu-with-dest',
      language: 'qu',
      command: 'toggle',
      priority: 95,
      template: {
        format: "{destination} pi {patient} ta t'ikray",
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'pi' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
    // Destination with -man marker: #button man .active ta t'ikray
    {
      id: 'toggle-qu-dest-man',
      language: 'qu',
      command: 'toggle',
      priority: 93,
      template: {
        format: "{destination} man {patient} ta t'ikray",
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'man' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'literal', value: "t'ikray", alternatives: ['tikray', 'kutichiy'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getTogglePatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'toggle-ru-full',
      language: 'ru',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'переключить {patient} на {destination}',
        tokens: [
          { type: 'literal', value: 'переключить', alternatives: ['переключи'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'для'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'на',
          markerAlternatives: ['в', 'для'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-ru-simple',
      language: 'ru',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'переключить {patient}',
        tokens: [
          { type: 'literal', value: 'переключить', alternatives: ['переключи'] },
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

function getTogglePatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: สลับ .active
    {
      id: 'toggle-th-simple',
      language: 'th',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'สลับ {patient}',
        tokens: [
          { type: 'literal', value: 'สลับ' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // With destination: สลับ .active ใน #button
    {
      id: 'toggle-th-with-dest',
      language: 'th',
      command: 'toggle',
      priority: 95,
      template: {
        format: 'สลับ {patient} ใน {destination}',
        tokens: [
          { type: 'literal', value: 'สลับ' },
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

function getTogglePatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'toggle-uk-full',
      language: 'uk',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'перемкнути {patient} на {destination}',
        tokens: [
          { type: 'literal', value: 'перемкнути', alternatives: ['перемкни'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'для'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'на',
          markerAlternatives: ['в', 'для'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-uk-simple',
      language: 'uk',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'перемкнути {patient}',
        tokens: [
          { type: 'literal', value: 'перемкнути', alternatives: ['перемкни'] },
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

function getTogglePatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'toggle-vi-full',
      language: 'vi',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'chuyển đổi {patient} trên {target}',
        tokens: [
          { type: 'literal', value: 'chuyển đổi', alternatives: ['chuyển', 'bật tắt'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'trên', alternatives: ['tại', 'ở'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'trên',
          markerAlternatives: ['tại', 'ở'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-vi-simple',
      language: 'vi',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'chuyển đổi {patient}',
        tokens: [
          { type: 'literal', value: 'chuyển đổi', alternatives: ['chuyển', 'bật tắt'] },
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

function getTogglePatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'toggle-zh-full',
      language: 'zh',
      command: 'toggle',
      priority: 100,
      template: {
        format: '切换 {patient} 在 {target}',
        tokens: [
          { type: 'literal', value: '切换' },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: '在', alternatives: ['到', '于'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: '在',
          markerAlternatives: ['到', '于'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-zh-simple',
      language: 'zh',
      command: 'toggle',
      priority: 90,
      template: {
        format: '切换 {patient}',
        tokens: [
          { type: 'literal', value: '切换' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-zh-ba',
      language: 'zh',
      command: 'toggle',
      priority: 95,
      template: {
        format: '把 {patient} 切换',
        tokens: [
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '切换' },
        ],
      },
      extraction: {
        patient: { marker: '把' },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    {
      id: 'toggle-zh-full-ba',
      language: 'zh',
      command: 'toggle',
      priority: 98,
      template: {
        format: '在 {target} 把 {patient} 切换',
        tokens: [
          { type: 'literal', value: '在', alternatives: ['到', '于'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: '把' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: '切换' },
        ],
      },
      extraction: {
        destination: { marker: '在', markerAlternatives: ['到', '于'] },
        patient: { marker: '把' },
      },
    },
  ];
}

/**
 * Get toggle patterns for a specific language.
 */
export function getTogglePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getTogglePatternsBn();
    case 'en':
      return getTogglePatternsEn();
    case 'es':
      return getTogglePatternsEs();
    case 'hi':
      return getTogglePatternsHi();
    case 'it':
      return getTogglePatternsIt();
    case 'pl':
      return getTogglePatternsPl();
    case 'qu':
      return getTogglePatternsQu();
    case 'ru':
      return getTogglePatternsRu();
    case 'th':
      return getTogglePatternsTh();
    case 'uk':
      return getTogglePatternsUk();
    case 'vi':
      return getTogglePatternsVi();
    case 'zh':
      return getTogglePatternsZh();
    default:
      return [];
  }
}
