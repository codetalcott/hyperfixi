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
    // The at-end-of / at-start-of positional puts (`put it at end of body`,
    // make-toast-element). The three-word position phrase is matched as
    // consecutive literal tokens and recorded whole in `manner` — the exact
    // form the core runtime's PutCommand.mapPosition accepts (beforeend /
    // afterbegin).
    {
      id: 'put-en-at-end',
      language: 'en',
      command: 'put',
      priority: 96,
      template: {
        format: 'put {patient} at end of {destination}',
        tokens: [
          { type: 'literal', value: 'put' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'at' },
          { type: 'literal', value: 'end' },
          { type: 'literal', value: 'of' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 5 },
        manner: { default: { type: 'literal', value: 'at end of' } },
      },
    },
    {
      id: 'put-en-at-start',
      language: 'en',
      command: 'put',
      priority: 96,
      template: {
        format: 'put {patient} at start of {destination}',
        tokens: [
          { type: 'literal', value: 'put' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'at' },
          { type: 'literal', value: 'start' },
          { type: 'literal', value: 'of' },
          { type: 'role', role: 'destination' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { position: 5 },
        manner: { default: { type: 'literal', value: 'at start of' } },
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
    // Verb-MEDIAL pattern: यह को रखें #container में (`{patient} को रखें
    // {destination} में`). The hi transformer emits put VERB-MEDIAL in a fused
    // event body's then-clause (`… बनाएं फिर यह को रखें #container में` —
    // make-element / make-toast first put), with रखें BETWEEN the patient and the
    // destination, unlike the standalone verb-FINAL `put-hi-full` below. Without
    // this the clause fell through to `put-hi-bare` (`रखें {patient}`), which
    // grabbed the DESTINATION (#container) as the patient and defaulted the
    // destination to `me` — the put landed on the clicked element. Priority above
    // put-hi-full; only matches when रखें is medial, so the verb-final form is
    // untouched.
    {
      id: 'put-hi-verb-medial',
      language: 'hi',
      command: 'put',
      priority: 105,
      template: {
        format: '{patient} को रखें {destination} में',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'रखें', alternatives: ['रख', 'डालें', 'डाल'] },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'में' },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'में', position: 3 },
      },
    },
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

function getPutPatternsQu(): LanguagePattern[] {
  return [
    // Patient-first SOV with destination: chay ta kurku man churay — the i18n
    // transformer emits PATIENT-first for qu (`chay ta noqa man churay`,
    // async-block / fetch-with-headers / if-exists then-tails); there were no
    // handcrafted qu put patterns at all and the generated SOV order is
    // dest-first, so every marked-destination put dropped.
    {
      id: 'put-qu-patient-first',
      language: 'qu',
      command: 'put',
      priority: 96,
      template: {
        format: '{patient} ta {destination} man churay',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'ta' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'man' },
          { type: 'literal', value: 'churay', alternatives: ['tiyachiy'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 2 },
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
      // BA-fronted put. The i18n grammar transformer emits the *split* verb form
      // `把 {patient} 放置 到 {destination}` for `put X into Y` (verb 放置 + a
      // separate destination marker 到), so the destination marker is matched as
      // an optional group — when absent, the merged verb forms (放到/放在) carry
      // the "to" themselves. See ZH_BLOCK_BODY_SCOPE.md #3.
      id: 'put-zh-ba',
      language: 'zh',
      command: 'put',
      priority: 95,
      template: {
        format: '把 {patient} 放置 到 {destination}',
        tokens: [
          { type: 'literal', value: '把' },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '放置', alternatives: ['放到', '放在', '放入', '放', '置入'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: '到', alternatives: ['在', '于', '入'] }],
          },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: '到', markerAlternatives: ['在', '于', '入'] },
      },
    },
  ];
}

/**
 * Get put patterns for a specific language.
 */
/**
 * Positional put (before/after) for languages whose handcrafted/generated put
 * patterns cover only the into-destination form. The i18n transformer emits
 * `<verb> {patient} <before|after-word> {destination}` (he inserts the את
 * patient marker after the verb; zh fronts 把 between verb and patient).
 * Without these, `put X after/before Y` keeps the event but drops the put
 * (put-after/put-before lossy in exactly these 8 languages). en/es/pl/ru/uk/vi
 * carry their own handcrafted before/after variants — this table is only for
 * the languages that had none.
 */
const PUT_POSITIONAL: ReadonlyArray<{
  lang: string;
  verb: string;
  verbAlts?: string[];
  before: string;
  after: string;
  /** literal inserted between verb and patient (he את, zh 把-optional) */
  patientPrefix?: string;
  patientPrefixOptional?: boolean;
}> = [
  { lang: 'de', verb: 'setzen', before: 'vor', after: 'nach' },
  { lang: 'fr', verb: 'mettre', before: 'avant', after: 'après' },
  { lang: 'he', verb: 'שים', patientPrefix: 'את', before: 'לפני', after: 'אחרי' },
  {
    lang: 'id',
    verb: 'taruh',
    verbAlts: ['letakkan', 'masukkan', 'tempatkan'],
    before: 'sebelum',
    after: 'setelah',
  },
  { lang: 'ms', verb: 'letak', before: 'sebelum', after: 'selepas' },
  { lang: 'pt', verb: 'colocar', before: 'antes', after: 'depois' },
  { lang: 'sw', verb: 'weka', before: 'kabla', after: 'baada' },
  {
    lang: 'zh',
    verb: '放置',
    verbAlts: ['放', '放入'],
    patientPrefix: '把',
    patientPrefixOptional: true,
    before: '之前',
    after: '之后',
  },
];

/**
 * The at-end-of positional put (`put it at end of body`, make-toast-element).
 * en carries `put-en-at-end` (a handcrafted three-literal `at end of` phrase);
 * the i18n transformer translates that phrase word-for-word into every other
 * language, but no non-en language had a counterpart, so the third clause of
 * make-toast-element either dropped entirely (SOV/VSO: the made toast is never
 * attached → empty effect) or mis-parsed (the generic into-put grabbed the
 * `end` word as the destination). This table records the per-language surface
 * words the transformer emits for `at`/`end`/`of` plus the put verb, so the
 * generated pattern reconstructs the en `put {patient} <at-word> <end-word>
 * <of-word> {destination}` shape with `manner: 'at end of'` — the exact form
 * the core runtime's PutCommand.mapPosition accepts (beforeend).
 *
 * The destination is the language's `body` word (the dict-canonical form, which
 * already aligns with each profile's `references.body` so it resolves to the
 * `body` contextReference). qu is omitted: its dict body word (`kurku`)
 * disagrees with the profile (`ukhu`) and its tokenizer splits `_`-joined
 * keywords — both tracked separately. he leaves `at`/`of` untranslated, so its
 * markers are the English literals.
 *
 * A multi-word marker (vi `kết thúc`) tokenizes as a SINGLE token whose value is
 * the whole phrase, so it is carried verbatim in one literal (not split). SOV
 * languages place the verb last (after an object marker on the body). Only
 * `at end of` is generated — `at start of` appears in no corpus example.
 */
const PUT_AT_END: ReadonlyArray<{
  lang: string;
  verb: string;
  verbAlts?: string[];
  /** marker word(s) for `at` (manner phrase head). */
  at: string;
  /** the `end` position noun. */
  end: string;
  /** the `of` connective between `end` and the body destination. */
  of: string;
  /** verb-final word order: `{patient} at end of {destination} <objMarker> verb`. */
  sov?: boolean;
  /** SOV object marker between the body destination and the trailing verb. */
  objMarker?: string;
  /** literal inserted between verb and patient (zh 把, he את). */
  patientPrefix?: string;
}> = [
  // SVO / VSO (verb-first)
  {
    lang: 'es',
    verb: 'poner',
    verbAlts: ['pon', 'colocar', 'put'],
    at: 'en',
    end: 'fin',
    of: 'de',
  },
  { lang: 'fr', verb: 'mettre', at: 'à', end: 'fin', of: 'de' },
  { lang: 'pt', verb: 'colocar', at: 'em', end: 'fim', of: 'de' },
  { lang: 'it', verb: 'mettere', at: 'a', end: 'fine', of: 'di' },
  { lang: 'de', verb: 'setzen', at: 'bei', end: 'ende', of: 'von' },
  { lang: 'sw', verb: 'weka', at: 'katika', end: 'mwisho', of: 'ya' },
  {
    lang: 'id',
    verb: 'taruh',
    verbAlts: ['letakkan', 'masukkan', 'tempatkan'],
    at: 'di',
    end: 'akhir',
    of: 'dari',
  },
  { lang: 'ms', verb: 'letak', at: 'di', end: 'tamat', of: 'daripada' },
  { lang: 'vi', verb: 'đặt', at: 'tại', end: 'kết thúc', of: 'của' },
  { lang: 'pl', verb: 'umieść', at: 'przy', end: 'koniec', of: 'z' },
  { lang: 'ru', verb: 'положить', at: 'у', end: 'конец', of: 'из' },
  { lang: 'uk', verb: 'покласти', at: 'в', end: 'кінець', of: 'з' },
  { lang: 'th', verb: 'ใส่', at: 'ที่', end: 'จบ', of: 'ของ' },
  { lang: 'tl', verb: 'ilagay', at: 'sa', end: 'wakas', of: 'ng' },
  { lang: 'ar', verb: 'ضع', at: 'عند', end: 'النهاية', of: 'من' },
  {
    lang: 'zh',
    verb: '放置',
    verbAlts: ['放', '放入'],
    patientPrefix: '把',
    at: '在',
    end: '结束',
    of: '的',
  },
  { lang: 'he', verb: 'שים', patientPrefix: 'את', at: 'at', end: 'סוף', of: 'of' },
  // SOV (verb-last, object marker before the verb)
  { lang: 'tr', verb: 'koy', sov: true, objMarker: 'i', at: 'de', end: 'son', of: 'nin' },
  { lang: 'ja', verb: '置く', sov: true, objMarker: 'を', at: 'で', end: '終わり', of: 'の' },
  { lang: 'ko', verb: '넣다', sov: true, objMarker: '를', at: '에', end: '끝', of: '의' },
  {
    lang: 'hi',
    verb: 'रखें',
    verbAlts: ['रख', 'डालें', 'डाल'],
    sov: true,
    objMarker: 'को',
    at: 'पर',
    end: 'समाप्त',
    of: 'का',
  },
  {
    lang: 'bn',
    verb: 'রাখুন',
    verbAlts: ['রাখ'],
    sov: true,
    objMarker: 'কে',
    at: 'এ',
    end: 'শেষ',
    of: 'র',
  },
  // qu was excluded from PUT_AT_END (§7n) while body was the unaligned `ukhu`;
  // now that the qu profile body = `kurku` (qu arc wave 1), add the SOV at-end
  // entry. Corpus: `chay pi tukuy pa kurku ta churay` = `{patient} pi tukuy pa
  // {destination} ta churay` (put it at end of body — make-toast's attaching put).
  {
    lang: 'qu',
    verb: 'churay',
    sov: true,
    objMarker: 'ta',
    at: 'pi',
    end: 'tukuy',
    of: 'pa',
  },
];

/**
 * Whether an `end`-keyword token is the position NOUN of an `at end of` phrase
 * (`put it at end of body`), not a block terminator. The clause splitter
 * (`parseBodyWithClauses`) breaks at every `end` keyword; for languages whose
 * `end` noun tokenizes as a `keyword` (zh `结束`, …) that wrongly chops the
 * trailing `put it at end of body` clause out of make-toast. The English guard
 * recognizes the `at` … `of` sandwich literally; this generalizes it to the
 * per-language `at`/`of` words recorded in PUT_AT_END (zh `在` … `的`,
 * id `di` … `dari`, …). Returns false for languages with no at-end spec (their
 * end noun never collides) and for any non-sandwiched `end`.
 */
export function isAtEndPositionNoun(
  language: string,
  endValue: string,
  prevValue: string | undefined,
  nextValue: string | undefined
): boolean {
  const spec = PUT_AT_END.find(s => s.lang === language);
  if (!spec) return false;
  const eq = (a: string | undefined, b: string): boolean =>
    (a ?? '').toLowerCase() === b.toLowerCase();
  return eq(endValue, spec.end) && eq(prevValue, spec.at) && eq(nextValue, spec.of);
}

/**
 * Whether a word is one of a language's `at end of` connective words (`at`/`end`/
 * `of`: zh `在`/`结束`/`的`, ms `di`/`tamat`/`daripada`, …). These are pattern
 * connectives, never DOM property names — so a possessive whose property head is
 * one is a mis-read (`letak ia di tamat …` = "put it at end of …", not the
 * phantom possessive `it.di`). Unlike the role markers caught by their normalized
 * concept, the `at`/`of` words tokenize as bare identifiers with no concept, so
 * this surface-word check is the only signal. Returns false when the language has
 * no at-end spec.
 */
export function isAtEndConnective(language: string, value: string): boolean {
  const spec = PUT_AT_END.find(s => s.lang === language);
  if (!spec) return false;
  const v = value.toLowerCase();
  return v === spec.at.toLowerCase() || v === spec.of.toLowerCase() || v === spec.end.toLowerCase();
}

function buildAtEndPutPatterns(language: string): LanguagePattern[] {
  const spec = PUT_AT_END.find(s => s.lang === language);
  if (!spec) return [];
  const tokens: LanguagePattern['template']['tokens'] = [];
  const verbToken = spec.verbAlts
    ? ({ type: 'literal', value: spec.verb, alternatives: spec.verbAlts } as const)
    : ({ type: 'literal', value: spec.verb } as const);
  // A multi-word marker (vi `kết thúc`) tokenizes as ONE token whose value is
  // the whole phrase, so the literal must carry the phrase verbatim — splitting
  // on whitespace would emit two literals that never align with the single
  // token. Single-word markers are unaffected.
  const pushWords = (phrase: string) => {
    tokens.push({ type: 'literal', value: phrase });
  };
  if (!spec.sov) {
    tokens.push(verbToken);
    if (spec.patientPrefix) tokens.push({ type: 'literal', value: spec.patientPrefix });
    tokens.push({ type: 'role', role: 'patient' });
    pushWords(spec.at);
    pushWords(spec.end);
    pushWords(spec.of);
    tokens.push({ type: 'role', role: 'destination' });
  } else {
    tokens.push({ type: 'role', role: 'patient' });
    pushWords(spec.at);
    pushWords(spec.end);
    pushWords(spec.of);
    tokens.push({ type: 'role', role: 'destination' });
    if (spec.objMarker) tokens.push({ type: 'literal', value: spec.objMarker });
    tokens.push(verbToken);
  }
  return [
    {
      id: `put-${spec.lang}-at-end`,
      language: spec.lang,
      command: 'put',
      // Above the generic into-put (≤100) so the full `at end of` phrase wins
      // over a put that would otherwise grab the `end` word as its destination.
      priority: 110,
      template: {
        format: `put {patient} ${spec.at} ${spec.end} ${spec.of} {destination}`,
        tokens,
      },
      extraction: {
        manner: { default: { type: 'literal', value: 'at end of' } },
      },
    } satisfies LanguagePattern,
  ];
}

function buildPositionalPutPatterns(language: string): LanguagePattern[] {
  const spec = PUT_POSITIONAL.find(s => s.lang === language);
  if (!spec) return [];
  return (['before', 'after'] as const).map(manner => {
    const posWord = spec[manner];
    const tokens: LanguagePattern['template']['tokens'] = [
      spec.verbAlts
        ? { type: 'literal', value: spec.verb, alternatives: spec.verbAlts }
        : { type: 'literal', value: spec.verb },
    ];
    if (spec.patientPrefix) {
      tokens.push(
        spec.patientPrefixOptional
          ? {
              type: 'group',
              optional: true,
              tokens: [{ type: 'literal', value: spec.patientPrefix }],
            }
          : { type: 'literal', value: spec.patientPrefix }
      );
    }
    tokens.push(
      { type: 'role', role: 'patient' },
      { type: 'literal', value: posWord },
      { type: 'role', role: 'destination' }
    );
    return {
      id: `put-${spec.lang}-${manner}`,
      language: spec.lang,
      command: 'put',
      priority: 95,
      template: {
        format: `${spec.verb} {patient} ${posWord} {destination}`,
        tokens,
      },
      extraction: {
        patient: { position: spec.patientPrefix && !spec.patientPrefixOptional ? 2 : 1 },
        destination: { marker: posWord },
        manner: { default: { type: 'literal', value: manner } },
      },
    } satisfies LanguagePattern;
  });
}

export function getPutPatternsForLanguage(language: string): LanguagePattern[] {
  const positional = buildPositionalPutPatterns(language);
  // The at-end-of positional put (make-toast-element); en carries its own
  // handcrafted variant, every other language is generated from PUT_AT_END.
  const atEnd = buildAtEndPutPatterns(language);
  switch (language) {
    case 'bn':
      return [...getPutPatternsBn(), ...atEnd];
    case 'en':
      return getPutPatternsEn();
    case 'es':
      return [...getPutPatternsEs(), ...atEnd];
    case 'hi':
      return [...getPutPatternsHi(), ...atEnd];
    case 'id':
      return [...getPutPatternsId(), ...positional, ...atEnd];
    case 'it':
      return [...getPutPatternsIt(), ...atEnd];
    case 'pl':
      return [...getPutPatternsPl(), ...atEnd];
    case 'ru':
      return [...getPutPatternsRu(), ...atEnd];
    case 'qu':
      return [...getPutPatternsQu(), ...atEnd];
    case 'th':
      return [...getPutPatternsTh(), ...atEnd];
    case 'uk':
      return [...getPutPatternsUk(), ...atEnd];
    case 'vi':
      return [...getPutPatternsVi(), ...atEnd];
    case 'zh':
      return [...getPutPatternsZh(), ...positional, ...atEnd];
    default:
      return [...positional, ...atEnd];
  }
}
