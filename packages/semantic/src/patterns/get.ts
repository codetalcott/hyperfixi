/**
 * Get Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "get" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 13 files into single file.
 *
 * **A `get` verb alternative must never be another command's verb.** Five of
 * these patterns listed the language's TAKE verb among `get`'s alternatives —
 * it `prendere`, bn `নিন`, ru `взять`/`возьми`, uk `взяти`/`візьми`, vi `lấy` —
 * so `take .active from .tab-button <pron>` matched `get-<l>-full` at
 * confidence 1.00 and came back as a `get`. The tokenizers keep the two verbs
 * distinct (`prendere`→take, `ottenere`→get) and the i18n transformer renders
 * them distinctly, so the alternatives could never match a real `get` surface;
 * they only shadowed take.
 *
 * The visible symptom was one role: the fused event-handler swap re-parses
 * `[verb..clause boundary]` standalone and swaps the richer result in only when
 * it is the SAME action, so an action flip vetoed the swap and take's trailing
 * `recipient` pronoun dropped — it/ru/uk/vi's rows in the baseline's
 * `roleLossyPatterns`. STANDALONE, those four returned the wrong command
 * outright.
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
          { type: 'literal', value: 'পান' },
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
          { type: 'literal', value: 'পান' },
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
          { type: 'literal', value: 'ottenere', alternatives: ['ottieni', 'get'] },
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
          { type: 'literal', value: 'получить', alternatives: ['получи'] },
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
          { type: 'literal', value: 'получить', alternatives: ['получи'] },
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
          { type: 'literal', value: 'отримати', alternatives: ['отримай'] },
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
          { type: 'literal', value: 'отримати', alternatives: ['отримай'] },
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
          { type: 'literal', value: 'lấy giá trị', alternatives: ['nhận'] },
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
      // Head was `lấy` (alt `lấy giá trị`) — but bare `lấy` is vi's TAKE verb,
      // so this pattern claimed every `lấy .active từ …`. vi's get verb is the
      // three-word `lấy giá trị` ("take the value of"), which is what the i18n
      // transformer renders; the bare form has no valid `get` surface.
      language: 'vi',
      command: 'get',
      priority: 90,
      template: {
        format: 'lấy giá trị {target}',
        tokens: [
          { type: 'literal', value: 'lấy giá trị', alternatives: ['nhận'] },
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
function getGetPatternsZh(): LanguagePattern[] {
  return [
    // `get #x.value` → zh `获取 把 #x.value` (BA object marker). The generated zh get
    // pattern doesn't tolerate 把, so the corpus form fell through to `fetch-zh-ba`
    // (which used to list 获得) and mis-parsed as fetch. Mirror fetch-zh-ba: the get
    // verb (获取/获得/取得) + an optional 把-marked source.
    {
      id: 'get-zh-ba',
      language: 'zh',
      command: 'get',
      priority: 105,
      template: {
        format: '获取 把 {source}',
        tokens: [
          { type: 'literal', value: '获取', alternatives: ['获得', '取得'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: '把', alternatives: ['从', '由'] }],
          },
          { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        source: { marker: '把', markerAlternatives: ['从', '由'] },
      },
    },
  ];
}

export function getGetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getGetPatternsBn();
    case 'de':
      return getGetPatternsDe();
    case 'zh':
      return getGetPatternsZh();
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
