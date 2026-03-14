/**
 * Put Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "put" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 17 files into single file.
 */

import type { LanguagePattern } from '../types';

function getPutPatternsBn(): LanguagePattern[] {
  return [
    // Full pattern: 'hello' কে #output এ রাখুন
    {
      id: 'put-bn-full',
      language: 'bn',
      command: 'put',
      priority: 100,
      template: {
        format: '{patient} কে {destination} এ রাখুন',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'কে' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'এ', alternatives: ['তে'] },
          { type: 'literal', value: 'রাখুন', alternatives: ['রাখ'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'এ', position: 2 },
      },
    },
    // Simple pattern: রাখুন 'hello' #output এ
    {
      id: 'put-bn-simple',
      language: 'bn',
      command: 'put',
      priority: 90,
      template: {
        format: 'রাখুন {patient} {destination} এ',
        tokens: [
          { type: 'literal', value: 'রাখুন', alternatives: ['রাখ'] },
          { type: 'role', role: 'patient' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'এ', alternatives: ['তে'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 2 },
      },
    },
  ];
}

function getPutPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'put-en-into',
      language: 'en',
      command: 'put',
      priority: 100,
      template: {
        format: 'put {patient} into {destination}',
        tokens: [
          { type: 'literal', value: 'put' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'into', alternatives: ['in', 'to'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'into', markerAlternatives: ['in', 'to'] },
      },
    },
    {
      id: 'put-en-before',
      language: 'en',
      command: 'put',
      priority: 95,
      template: {
        format: 'put {patient} before {destination}',
        tokens: [
          { type: 'literal', value: 'put' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'before' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'before' },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-en-after',
      language: 'en',
      command: 'put',
      priority: 95,
      template: {
        format: 'put {patient} after {destination}',
        tokens: [
          { type: 'literal', value: 'put' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'after' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'after' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}

function getPutPatternsEs(): LanguagePattern[] {
  return [
    {
      id: 'put-es-full',
      language: 'es',
      command: 'put',
      priority: 100,
      template: {
        format: 'poner {patient} en {destination}',
        tokens: [
          { type: 'literal', value: 'poner', alternatives: ['pon', 'colocar', 'put'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'en', alternatives: ['dentro de', 'a'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'en', markerAlternatives: ['dentro de', 'a'] },
      },
    },
    {
      id: 'put-es-before',
      language: 'es',
      command: 'put',
      priority: 95,
      template: {
        format: 'poner {patient} antes de {destination}',
        tokens: [
          { type: 'literal', value: 'poner', alternatives: ['pon', 'colocar'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'antes de', alternatives: ['antes'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'antes de', markerAlternatives: ['antes'] },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-es-after',
      language: 'es',
      command: 'put',
      priority: 95,
      template: {
        format: 'poner {patient} después de {destination}',
        tokens: [
          { type: 'literal', value: 'poner', alternatives: ['pon', 'colocar'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'después de', alternatives: ['despues de', 'después'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'después de', markerAlternatives: ['despues de', 'después'] },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}

function getPutPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: "text" को #element में रखें
    {
      id: 'put-hi-full',
      language: 'hi',
      command: 'put',
      priority: 100,
      template: {
        format: '{patient} को {destination} में रखें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'में' },
          { type: 'literal', value: 'रखें', alternatives: ['रख', 'डालें', 'डाल'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'में', position: 3 },
      },
    },
    // Simple pattern: "text" रखें
    {
      id: 'put-hi-simple',
      language: 'hi',
      command: 'put',
      priority: 90,
      template: {
        format: '{patient} रखें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'रखें', alternatives: ['रख', 'डालें', 'डाल'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Bare pattern: रखें "text"
    {
      id: 'put-hi-bare',
      language: 'hi',
      command: 'put',
      priority: 80,
      template: {
        format: 'रखें {patient}',
        tokens: [
          { type: 'literal', value: 'रखें', alternatives: ['रख', 'डालें', 'डाल'] },
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

function getPutPatternsId(): LanguagePattern[] {
  return [
    {
      id: 'put-id-full',
      language: 'id',
      command: 'put',
      priority: 100,
      template: {
        // Two-word preposition: "ke dalam"
        format: 'taruh {patient} ke dalam {destination}',
        tokens: [
          {
            type: 'literal',
            value: 'taruh',
            alternatives: ['letakkan', 'masukkan', 'tempatkan', 'put'],
          },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'ke' },
          { type: 'literal', value: 'dalam', alternatives: ['di'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 4 },
      },
    },
    {
      id: 'put-id-simple-ke',
      language: 'id',
      command: 'put',
      priority: 95,
      template: {
        // Simplified: just "ke" without "dalam"
        format: 'taruh {patient} ke {destination}',
        tokens: [
          { type: 'literal', value: 'taruh', alternatives: ['letakkan', 'masukkan', 'tempatkan'] },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'ke', alternatives: ['di', 'pada'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
    {
      id: 'put-id-di',
      language: 'id',
      command: 'put',
      priority: 90,
      template: {
        // Alternative with "di"
        format: 'taruh {patient} di {destination}',
        tokens: [
          { type: 'literal', value: 'taruh', alternatives: ['letakkan', 'masukkan'] },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'di' },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
  ];
}

function getPutPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'put-it-full',
      language: 'it',
      command: 'put',
      priority: 100,
      template: {
        format: 'mettere {patient} in {target}',
        tokens: [
          { type: 'literal', value: 'mettere', alternatives: ['metti', 'inserire', 'put'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'in', alternatives: ['dentro', 'nel'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'in', markerAlternatives: ['dentro', 'nel'] },
      },
    },
    {
      id: 'put-it-simple',
      language: 'it',
      command: 'put',
      priority: 90,
      template: {
        format: 'mettere {patient}',
        tokens: [
          { type: 'literal', value: 'mettere', alternatives: ['metti', 'inserire', 'put'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}

function getPutPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'put-pl-full',
      language: 'pl',
      command: 'put',
      priority: 100,
      template: {
        format: 'umieść {patient} w {destination}',
        tokens: [
          { type: 'literal', value: 'umieść', alternatives: ['umiesc', 'wstaw', 'włóż', 'wloz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'w', alternatives: ['do', 'na'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'w', markerAlternatives: ['do', 'na'] },
      },
    },
    {
      id: 'put-pl-before',
      language: 'pl',
      command: 'put',
      priority: 95,
      template: {
        format: 'umieść {patient} przed {destination}',
        tokens: [
          { type: 'literal', value: 'umieść', alternatives: ['umiesc', 'wstaw'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'przed' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'przed' },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-pl-after',
      language: 'pl',
      command: 'put',
      priority: 95,
      template: {
        format: 'umieść {patient} po {destination}',
        tokens: [
          { type: 'literal', value: 'umieść', alternatives: ['umiesc', 'wstaw'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'po' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'po' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}

function getPutPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'put-ru-full',
      language: 'ru',
      command: 'put',
      priority: 100,
      template: {
        format: 'положить {patient} в {destination}',
        tokens: [
          {
            type: 'literal',
            value: 'положить',
            alternatives: ['положи', 'поместить', 'помести', 'вставить', 'вставь'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['во', 'на'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'в', markerAlternatives: ['во', 'на'] },
      },
    },
    {
      id: 'put-ru-before',
      language: 'ru',
      command: 'put',
      priority: 95,
      template: {
        format: 'положить {patient} перед {destination}',
        tokens: [
          { type: 'literal', value: 'положить', alternatives: ['положи', 'поместить', 'помести'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'перед', alternatives: ['до'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'перед', markerAlternatives: ['до'] },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-ru-after',
      language: 'ru',
      command: 'put',
      priority: 95,
      template: {
        format: 'положить {patient} после {destination}',
        tokens: [
          { type: 'literal', value: 'положить', alternatives: ['положи', 'поместить', 'помести'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'после' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'после' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}

function getPutPatternsTh(): LanguagePattern[] {
  return [
    // Pattern: ใส่ 'hello' ใน #output
    {
      id: 'put-th-full',
      language: 'th',
      command: 'put',
      priority: 100,
      template: {
        format: 'ใส่ {patient} ใน {destination}',
        tokens: [
          { type: 'literal', value: 'ใส่', alternatives: ['วาง'] },
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

function getPutPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'put-uk-full',
      language: 'uk',
      command: 'put',
      priority: 100,
      template: {
        format: 'покласти {patient} в {destination}',
        tokens: [
          {
            type: 'literal',
            value: 'покласти',
            alternatives: ['поклади', 'помістити', 'помісти', 'вставити', 'встав'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['у', 'на'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'в', markerAlternatives: ['у', 'на'] },
      },
    },
    {
      id: 'put-uk-before',
      language: 'uk',
      command: 'put',
      priority: 95,
      template: {
        format: 'покласти {patient} перед {destination}',
        tokens: [
          { type: 'literal', value: 'покласти', alternatives: ['поклади', 'помістити', 'помісти'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'перед', alternatives: ['до'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'перед', markerAlternatives: ['до'] },
        manner: { default: { type: 'literal', value: 'before' } },
      },
    },
    {
      id: 'put-uk-after',
      language: 'uk',
      command: 'put',
      priority: 95,
      template: {
        format: 'покласти {patient} після {destination}',
        tokens: [
          { type: 'literal', value: 'покласти', alternatives: ['поклади', 'помістити', 'помісти'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'після' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'після' },
        manner: { default: { type: 'literal', value: 'after' } },
      },
    },
  ];
}

function getPutPatternsVi(): LanguagePattern[] {
  return [
    {
      id: 'put-vi-into',
      language: 'vi',
      command: 'put',
      priority: 100,
      template: {
        format: 'đặt {patient} vào {target}',
        tokens: [
          { type: 'literal', value: 'đặt', alternatives: ['để', 'đưa'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'vào', alternatives: ['vào trong'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'vào', markerAlternatives: ['vào trong'] },
      },
    },
    {
      id: 'put-vi-before',
      language: 'vi',
      command: 'put',
      priority: 95,
      template: {
        format: 'đặt {patient} trước {target}',
        tokens: [
          { type: 'literal', value: 'đặt', alternatives: ['để', 'đưa'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'trước', alternatives: ['trước khi'] },
          { type: 'role', role: 'manner' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        manner: { marker: 'trước', markerAlternatives: ['trước khi'] },
      },
    },
    {
      id: 'put-vi-after',
      language: 'vi',
      command: 'put',
      priority: 95,
      template: {
        format: 'đặt {patient} sau {target}',
        tokens: [
          { type: 'literal', value: 'đặt', alternatives: ['để', 'đưa'] },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'sau', alternatives: ['sau khi'] },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'sau', markerAlternatives: ['sau khi'] },
      },
    },
  ];
}

function getPutPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'put-zh-full',
      language: 'zh',
      command: 'put',
      priority: 100,
      template: {
        format: '放置 {patient} 到 {destination}',
        tokens: [
          { type: 'literal', value: '放置', alternatives: ['放', '放入', '置入', 'put'] },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '到', alternatives: ['在', '于', '入'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 3 },
      },
    },
    {
      id: 'put-zh-ba',
      language: 'zh',
      command: 'put',
      priority: 95,
      template: {
        format: '把 {patient} 放到 {destination}',
        tokens: [
          { type: 'literal', value: '把' },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '放到', alternatives: ['放在', '放入'] },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
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
 * Get put patterns for a specific language.
 */
export function getPutPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getPutPatternsBn();
    case 'en':
      return getPutPatternsEn();
    case 'es':
      return getPutPatternsEs();
    case 'hi':
      return getPutPatternsHi();
    case 'id':
      return getPutPatternsId();
    case 'it':
      return getPutPatternsIt();
    case 'pl':
      return getPutPatternsPl();
    case 'ru':
      return getPutPatternsRu();
    case 'th':
      return getPutPatternsTh();
    case 'uk':
      return getPutPatternsUk();
    case 'vi':
      return getPutPatternsVi();
    case 'zh':
      return getPutPatternsZh();
    default:
      return [];
  }
}
