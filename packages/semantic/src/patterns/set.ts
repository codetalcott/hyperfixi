/**
 * Set Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "set" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 19 files into single file.
 */

import type { LanguagePattern } from '../types';

function getSetPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: :x কে 5 এ সেট করুন
    {
      id: 'set-bn-full',
      language: 'bn',
      command: 'set',
      priority: 100,
      template: {
        format: '{patient} কে {goal} এ সেট করুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'role', role: 'goal' },
          { type: 'literal', value: 'এ', alternatives: ['তে'] },
          { type: 'literal', value: 'সেট', alternatives: ['নির্ধারণ'] },
          { type: 'literal', value: 'করুন' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        goal: { marker: 'এ', position: 2 },
      },
    },
    // Simple pattern: সেট :x 5
    {
      id: 'set-bn-simple',
      language: 'bn',
      command: 'set',
      priority: 90,
      template: {
        format: 'সেট {patient} {goal}',
        tokens: [
          { type: 'literal', value: 'সেট', alternatives: ['নির্ধারণ'] },
          { type: 'role', role: 'patient' },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { position: 2 },
      },
    },
  ];
}

function getSetPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'set-de-full',
      language: 'de',
      command: 'set',
      priority: 100,
      template: {
        format: 'setze {destination} auf {patient}',
        tokens: [
          { type: 'literal', value: 'setze', alternatives: ['setzen', 'stelle', 'stellen', 'set'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'auf', alternatives: ['zu', 'an'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-de-festlegen-auf',
      language: 'de',
      command: 'set',
      priority: 99,
      template: {
        format: 'festlegen auf {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'festlegen', alternatives: ['einstellen', 'setzen'] },
          { type: 'literal', value: 'auf', alternatives: ['an'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-de-equals',
      language: 'de',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getSetPatternsEs(): LanguagePattern[] {
  return [
    {
      id: 'set-es-full',
      language: 'es',
      command: 'set',
      priority: 100,
      template: {
        format: 'establecer {destination} a {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'establecer',
            alternatives: ['fijar', 'definir', 'poner', 'set'],
          },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'a', alternatives: ['en', 'como'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-es-prep-first',
      language: 'es',
      command: 'set',
      priority: 95,
      template: {
        format: 'establecer en {destination} {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'establecer',
            alternatives: ['fijar', 'definir', 'poner', 'set'],
          },
          { type: 'literal', value: 'en', alternatives: ['a'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-es-equals',
      language: 'es',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getSetPatternsFr(): LanguagePattern[] {
  return [
    {
      id: 'set-fr-full',
      language: 'fr',
      command: 'set',
      priority: 100,
      template: {
        format: 'définir {destination} à {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'définir',
            alternatives: ['definir', 'mettre', 'fixer', 'set'],
          },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'à', alternatives: ['a', 'sur', 'comme'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-fr-sur-direct',
      language: 'fr',
      command: 'set',
      priority: 98,
      template: {
        format: 'définir sur {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'définir', alternatives: ['definir', 'mettre', 'fixer'] },
          { type: 'literal', value: 'sur', alternatives: ['à', 'en'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-fr-equals',
      language: 'fr',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getSetPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: :x को 5 सेट करें
    {
      id: 'set-hi-full',
      language: 'hi',
      command: 'set',
      priority: 100,
      template: {
        format: '{destination} को {patient} सेट करें',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'सेट', alternatives: ['निर्धारित'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: 'को', position: 2 },
      },
    },
    // Simple pattern: सेट :x 5
    {
      id: 'set-hi-simple',
      language: 'hi',
      command: 'set',
      priority: 90,
      template: {
        format: 'सेट {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'सेट', alternatives: ['निर्धारित'] },
          { type: 'role', role: 'destination' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 2 },
      },
    },
  ];
}

function getSetPatternsId(): LanguagePattern[] {
  return [
    {
      id: 'set-id-full',
      language: 'id',
      command: 'set',
      priority: 100,
      template: {
        format: 'atur {destination} ke {patient}',
        tokens: [
          { type: 'literal', value: 'atur', alternatives: ['tetapkan', 'setel', 'set'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'ke', alternatives: ['menjadi', 'jadi', 'pada'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-id-pada-direct',
      language: 'id',
      command: 'set',
      priority: 98,
      template: {
        format: 'atur pada {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'atur', alternatives: ['tetapkan', 'setel'] },
          { type: 'literal', value: 'pada', alternatives: ['ke', 'di'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-id-equals',
      language: 'id',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getSetPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'set-it-full',
      language: 'it',
      command: 'set',
      priority: 100,
      template: {
        format: 'impostare {patient} a {goal}',
        tokens: [
          { type: 'literal', value: 'impostare', alternatives: ['imposta', 'set', 'definire'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'a', alternatives: ['su', 'come'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'a', markerAlternatives: ['su', 'come'] },
      },
    },
    {
      id: 'set-it-simple',
      language: 'it',
      command: 'set',
      priority: 90,
      template: {
        format: 'impostare {patient}',
        tokens: [
          { type: 'literal', value: 'impostare', alternatives: ['imposta', 'set'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getSetPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'set-pl-full',
      language: 'pl',
      command: 'set',
      priority: 100,
      template: {
        format: 'ustaw {patient} na {goal}',
        tokens: [
          { type: 'literal', value: 'ustaw', alternatives: ['określ', 'okresl', 'przypisz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'na', alternatives: ['do', 'jako'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'na', markerAlternatives: ['do', 'jako'] },
      },
    },
    {
      id: 'set-pl-simple',
      language: 'pl',
      command: 'set',
      priority: 90,
      template: {
        format: 'ustaw {patient}',
        tokens: [
          { type: 'literal', value: 'ustaw', alternatives: ['określ', 'okresl'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getSetPatternsPt(): LanguagePattern[] {
  return [
    {
      id: 'set-pt-full',
      language: 'pt',
      command: 'set',
      priority: 100,
      template: {
        format: 'definir {destination} para {patient}',
        tokens: [
          { type: 'literal', value: 'definir', alternatives: ['estabelecer', 'colocar', 'set'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'para', alternatives: ['como', 'a', 'em'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-pt-em-direct',
      language: 'pt',
      command: 'set',
      priority: 98,
      template: {
        format: 'definir em {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'definir', alternatives: ['estabelecer', 'colocar'] },
          { type: 'literal', value: 'em', alternatives: ['para', 'a'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-pt-equals',
      language: 'pt',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

function getSetPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'set-ru-full',
      language: 'ru',
      command: 'set',
      priority: 100,
      template: {
        format: 'установить {patient} в {goal}',
        tokens: [
          { type: 'literal', value: 'установить', alternatives: ['установи', 'задать', 'задай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['на', 'как'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'в', markerAlternatives: ['на', 'как'] },
      },
    },
    {
      id: 'set-ru-simple',
      language: 'ru',
      command: 'set',
      priority: 90,
      template: {
        format: 'установить {patient}',
        tokens: [
          { type: 'literal', value: 'установить', alternatives: ['установи', 'задать', 'задай'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getSetPatternsTh(): LanguagePattern[] {
  return [
    // Simple pattern: ตั้ง :x 5
    {
      id: 'set-th-simple',
      language: 'th',
      command: 'set',
      priority: 100,
      template: {
        format: 'ตั้ง {patient} {goal}',
        tokens: [
          { type: 'literal', value: 'ตั้ง', alternatives: ['กำหนด'] },
          { type: 'role', role: 'patient' },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { position: 2 },
      },
    },
  ];
}

function getSetPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'set-uk-full',
      language: 'uk',
      command: 'set',
      priority: 100,
      template: {
        format: 'встановити {patient} в {goal}',
        tokens: [
          { type: 'literal', value: 'встановити', alternatives: ['встанови', 'задати', 'задай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['на', 'як'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'в', markerAlternatives: ['на', 'як'] },
      },
    },
    {
      id: 'set-uk-simple',
      language: 'uk',
      command: 'set',
      priority: 90,
      template: {
        format: 'встановити {patient}',
        tokens: [
          { type: 'literal', value: 'встановити', alternatives: ['встанови', 'задати', 'задай'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getSetPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'set-vi-full',
      language: 'vi',
      command: 'set',
      priority: 100,
      template: {
        format: 'gán {target} thành {value}',
        tokens: [
          { type: 'literal', value: 'gán', alternatives: ['thiết lập', 'đặt giá trị'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'thành', alternatives: ['bằng', 'là'] },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'thành', markerAlternatives: ['bằng', 'là'] },
      },
    },
    {
      id: 'set-vi-simple',
      language: 'vi',
      command: 'set',
      priority: 90,
      template: {
        format: 'đặt {target} là {value}',
        tokens: [
          { type: 'literal', value: 'đặt' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'là' },
          { type: 'role', role: 'goal' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'là' },
      },
    },
  ];
}

function getSetPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'set-zh-full',
      language: 'zh',
      command: 'set',
      priority: 100,
      template: {
        format: '设置 {destination} 为 {patient}',
        tokens: [
          { type: 'literal', value: '设置', alternatives: ['設置', '设定', '設定'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '为', alternatives: ['為', '到', '成'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { marker: '为', markerAlternatives: ['為', '到', '成'] },
      },
    },
    {
      id: 'set-zh-ba',
      language: 'zh',
      command: 'set',
      priority: 95,
      template: {
        format: '把 {destination} 设置为 {patient}',
        tokens: [
          { type: 'literal', value: '把' },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '设置为', alternatives: ['設置為', '设定为', '設定為'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { marker: '设置为', markerAlternatives: ['設置為', '设定为', '設定為'] },
      },
    },
    {
      id: 'set-zh-simple',
      language: 'zh',
      command: 'set',
      priority: 90,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}

/**
 * Get set patterns for a specific language.
 */
export function getSetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getSetPatternsBn();
    case 'de':
      return getSetPatternsDe();
    case 'es':
      return getSetPatternsEs();
    case 'fr':
      return getSetPatternsFr();
    case 'hi':
      return getSetPatternsHi();
    case 'id':
      return getSetPatternsId();
    case 'it':
      return getSetPatternsIt();
    case 'pl':
      return getSetPatternsPl();
    case 'pt':
      return getSetPatternsPt();
    case 'ru':
      return getSetPatternsRu();
    case 'th':
      return getSetPatternsTh();
    case 'uk':
      return getSetPatternsUk();
    case 'vi':
      return getSetPatternsVi();
    case 'zh':
      return getSetPatternsZh();
    default:
      return [];
  }
}
