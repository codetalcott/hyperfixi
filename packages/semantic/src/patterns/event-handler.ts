/**
 * Event Handler Patterns
 *
 * Patterns for the "on [event]" construct across supported languages.
 * Event handlers bind commands to DOM events.
 *
 * Semantic structure:
 * - action: 'on'
 * - event: the event name (click, input, keydown, etc.)
 * - body: commands to execute (parsed separately)
 * - source: optional event source filter
 */

import type { LanguagePattern } from '../types';

// =============================================================================
// English Patterns (SVO)
// =============================================================================

/**
 * English: "on click {body...}"
 * The standard event handler form.
 */
const eventEnglishStandard: LanguagePattern = {
  id: 'event-en-standard',
  language: 'en',
  command: 'on',
  priority: 100,
  template: {
    format: 'on {event} {body}',
    tokens: [
      { type: 'literal', value: 'on' },
      { type: 'role', role: 'event' },
      // Body is captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
    // Body handled specially - everything after event
  },
};

/**
 * English: "on click from #button {body...}"
 * Event handler with source filter.
 */
const eventEnglishWithSource: LanguagePattern = {
  id: 'event-en-source',
  language: 'en',
  command: 'on',
  priority: 110, // Higher priority - more specific
  template: {
    format: 'on {event} from {source} {body}',
    tokens: [
      { type: 'literal', value: 'on' },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'from' },
      { type: 'role', role: 'source' },
      // Body is captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
    source: { marker: 'from' },
  },
};

// =============================================================================
// Japanese Patterns (SOV)
// =============================================================================

/**
 * Japanese: "クリック で {body...}"
 * Word order: EVENT で BODY
 *
 * で (de) = at/on (locative-instrumental particle)
 * Used here to mark the event as the context for the action.
 */
const eventJapaneseStandard: LanguagePattern = {
  id: 'event-ja-standard',
  language: 'ja',
  command: 'on',
  priority: 100,
  template: {
    format: '{event} で {body}',
    tokens: [
      { type: 'role', role: 'event' },
      // Note: 'に' removed from alternatives to avoid conflict with destination markers
      // Use 'で' (instrumental) for events: クリック で toggle .active
      { type: 'literal', value: 'で', alternatives: ['のとき', 'の時', '時'] },
      // Body is captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Japanese: "#button から クリック で {body...}"
 * Event handler with source filter.
 *
 * から (kara) = from
 */
const eventJapaneseWithSource: LanguagePattern = {
  id: 'event-ja-source',
  language: 'ja',
  command: 'on',
  priority: 110,
  template: {
    format: '{source} から {event} で {body}',
    tokens: [
      { type: 'role', role: 'source' },
      { type: 'literal', value: 'から', alternatives: ['の'] },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'で' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    source: { position: 0 },
    event: { marker: 'から', markerAlternatives: ['の'] },
  },
};

/**
 * Japanese: "クリック の 時 {body...}"
 * Alternative form using の時 (at the time of)
 *
 * の時 (no toki) = when, at the time of
 */
const eventJapaneseWhen: LanguagePattern = {
  id: 'event-ja-when',
  language: 'ja',
  command: 'on',
  priority: 95,
  template: {
    format: '{event} の 時 {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'の' },
      { type: 'literal', value: '時', alternatives: ['とき'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Japanese: "クリックしたら {body...}"
 * Native conditional form using したら (if/when X happens)
 * This is the most natural form for event handlers in Japanese.
 *
 * したら = conditional form of する (to do)
 * クリックしたら = "if/when clicked"
 */
const eventJapaneseConditionalTara: LanguagePattern = {
  id: 'event-ja-conditional-tara',
  language: 'ja',
  command: 'on',
  priority: 105, // Higher than standard (100) - prefer native idiom
  template: {
    format: '{event}したら {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'したら', alternatives: ['すると', 'すれば'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Japanese: "クリック時に {body...}"
 * Temporal suffix form using 時に (at the time of)
 * Common in technical/formal writing.
 *
 * 時に (toki ni) = at the time of
 */
const eventJapaneseTemporalSuffix: LanguagePattern = {
  id: 'event-ja-temporal-suffix',
  language: 'ja',
  command: 'on',
  priority: 102, // Slightly higher than standard
  template: {
    format: '{event}時に {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: '時に', alternatives: ['時'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Japanese: "#button から クリックしたら {body...}"
 * Conditional form with source filter.
 */
const eventJapaneseConditionalWithSource: LanguagePattern = {
  id: 'event-ja-conditional-source',
  language: 'ja',
  command: 'on',
  priority: 115, // Highest - most specific
  template: {
    format: '{source} から {event}したら {body}',
    tokens: [
      { type: 'role', role: 'source' },
      { type: 'literal', value: 'から', alternatives: ['の'] },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'したら', alternatives: ['すると'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    source: { position: 0 },
    event: { marker: 'から', markerAlternatives: ['の'] },
  },
};

// =============================================================================
// Korean Patterns (SOV)
// =============================================================================

/**
 * Korean: "클릭하면 {body...}"
 * Native conditional form using -하면 (if/when X happens)
 * This is the most natural form for event handlers in Korean.
 *
 * -하면 = conditional form of 하다 (to do)
 * 클릭하면 = "if/when clicked"
 */
const eventKoreanConditionalMyeon: LanguagePattern = {
  id: 'event-ko-conditional-myeon',
  language: 'ko',
  command: 'on',
  priority: 105, // Higher than standard - prefer native idiom
  template: {
    format: '{event}하면 {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: '하면', alternatives: ['으면', '면'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Korean: "클릭할때 {body...}" or "클릭할 때 {body...}"
 * Temporal form using -ㄹ 때 (when/at the time of)
 * Common in both casual and formal Korean.
 *
 * -ㄹ 때 / -을 때 = "when (something happens)"
 */
const eventKoreanTemporalTtae: LanguagePattern = {
  id: 'event-ko-temporal-ttae',
  language: 'ko',
  command: 'on',
  priority: 102, // Slightly higher than standard
  template: {
    format: '{event}할때 {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: '할때', alternatives: ['할 때', '을때', '을 때'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Korean: "클릭 에 {body...}"
 *
 * NOTE: This pattern is DISABLED because 에 (at/to) is too ambiguous.
 * It conflicts with destination markers in commands like 'set', 'prepend', 'trigger'.
 * Korean users should use native conditional forms instead:
 * - 클릭하면 (if clicked) - most natural
 * - 클릭할때 (when clicking) - temporal
 *
 * The pattern is kept here for documentation but not exported.
 */
// const eventKoreanStandard: LanguagePattern = {
//   id: 'event-ko-standard',
//   language: 'ko',
//   command: 'on',
//   priority: 90,
//   template: {
//     format: '{event} 에 {body}',
//     tokens: [
//       { type: 'role', role: 'event' },
//       { type: 'literal', value: '에', alternatives: ['에서'] },
//     ],
//   },
//   extraction: {
//     event: { position: 0 },
//   },
// };

/**
 * Korean: "#button 에서 클릭하면 {body...}"
 * Conditional form with source filter.
 *
 * 에서 (eseo) = from, at (source/location particle)
 */
const eventKoreanConditionalWithSource: LanguagePattern = {
  id: 'event-ko-conditional-source',
  language: 'ko',
  command: 'on',
  priority: 115, // Highest - most specific
  template: {
    format: '{source} 에서 {event}하면 {body}',
    tokens: [
      { type: 'role', role: 'source' },
      { type: 'literal', value: '에서' },
      { type: 'role', role: 'event' },
      { type: 'literal', value: '하면', alternatives: ['으면'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    source: { position: 0 },
    event: { marker: '에서' },
  },
};

/**
 * Korean: "#button 에서 클릭 에 {body...}"
 * Standard event handler with source filter.
 */
const eventKoreanWithSource: LanguagePattern = {
  id: 'event-ko-source',
  language: 'ko',
  command: 'on',
  priority: 110,
  template: {
    format: '{source} 에서 {event} 에 {body}',
    tokens: [
      { type: 'role', role: 'source' },
      { type: 'literal', value: '에서' },
      { type: 'role', role: 'event' },
      { type: 'literal', value: '에' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    source: { position: 0 },
    event: { marker: '에서' },
  },
};

// =============================================================================
// Arabic Patterns (VSO)
// =============================================================================

/**
 * Arabic: "عند النقر {body...}"
 * Word order: PREP EVENT BODY
 *
 * عند (ʿinda) = at, when, upon
 * النقر (an-naqr) = the clicking (definite noun)
 *
 * Note: Arabic commonly uses definite article (ال) with event nouns.
 */
const eventArabicStandard: LanguagePattern = {
  id: 'event-ar-standard',
  language: 'ar',
  command: 'on',
  priority: 100,
  template: {
    format: 'عند {event} {body}',
    tokens: [
      { type: 'literal', value: 'عند', alternatives: ['على', 'لدى'] },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

/**
 * Arabic: "عند النقر من #button {body...}"
 * Event handler with source filter.
 *
 * من (min) = from
 */
const eventArabicWithSource: LanguagePattern = {
  id: 'event-ar-source',
  language: 'ar',
  command: 'on',
  priority: 110,
  template: {
    format: 'عند {event} من {source} {body}',
    tokens: [
      { type: 'literal', value: 'عند' },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'من' },
      { type: 'role', role: 'source' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
    source: { marker: 'من' },
  },
};

/**
 * Arabic: "إذا نُقر {body...}"
 * Conditional form using إذا (if/when)
 *
 * إذا (idhā) = if, when (conditional)
 * نُقر (nuqira) = was clicked (passive)
 */
const eventArabicConditional: LanguagePattern = {
  id: 'event-ar-conditional',
  language: 'ar',
  command: 'on',
  priority: 95,
  template: {
    format: 'إذا {event} {body}',
    tokens: [
      { type: 'literal', value: 'إذا', alternatives: ['اذا', 'لو'] },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

/**
 * Arabic: "عندما نقر {body...}"
 * Native temporal conjunction form using عندما (when)
 * More natural for event handlers than عند.
 *
 * عندما (ʿindamā) = when (temporal conjunction)
 * This is the most natural Arabic form for "when X happens".
 */
const eventArabicTemporalIndama: LanguagePattern = {
  id: 'event-ar-temporal-indama',
  language: 'ar',
  command: 'on',
  priority: 105, // Higher than standard - prefer native idiom
  template: {
    format: 'عندما {event} {body}',
    tokens: [
      { type: 'literal', value: 'عندما' },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

/**
 * Arabic: "حين النقر {body...}"
 * Temporal form using حين (at the time of)
 * Common in formal/literary Arabic.
 *
 * حين (ḥīna) = at the time of, when
 */
const eventArabicTemporalHina: LanguagePattern = {
  id: 'event-ar-temporal-hina',
  language: 'ar',
  command: 'on',
  priority: 102,
  template: {
    format: 'حين {event} {body}',
    tokens: [
      { type: 'literal', value: 'حين', alternatives: ['حينما'] },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

/**
 * Arabic: "لمّا نقر {body...}"
 * Temporal form using لمّا (when - past emphasis)
 * Used for completed/past actions triggering something.
 *
 * لمّا (lammā) = when (with past tense, emphatic)
 */
const eventArabicTemporalLamma: LanguagePattern = {
  id: 'event-ar-temporal-lamma',
  language: 'ar',
  command: 'on',
  priority: 103,
  template: {
    format: 'لمّا {event} {body}',
    tokens: [
      { type: 'literal', value: 'لمّا', alternatives: ['لما'] },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

/**
 * Arabic: "عندما نقر من #button {body...}"
 * Native temporal form with source filter.
 */
const eventArabicTemporalWithSource: LanguagePattern = {
  id: 'event-ar-temporal-source',
  language: 'ar',
  command: 'on',
  priority: 115, // Highest - most specific
  template: {
    format: 'عندما {event} من {source} {body}',
    tokens: [
      { type: 'literal', value: 'عندما', alternatives: ['حين', 'لمّا'] },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'من' },
      { type: 'role', role: 'source' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
    source: { marker: 'من' },
  },
};

// =============================================================================
// Turkish Patterns (SOV)
// =============================================================================

/**
 * Turkish: "tıklandığında {body...}"
 * Native conditional form using -dığında (when X happens)
 * This is the most natural form for event handlers in Turkish.
 *
 * -dığında = conditional/temporal suffix
 * tıklandığında = "when clicked"
 */
const eventTurkishConditionalDiginda: LanguagePattern = {
  id: 'event-tr-conditional-diginda',
  language: 'tr',
  command: 'on',
  priority: 105, // Higher than standard - prefer native idiom
  template: {
    format: '{event}dığında {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'dığında', alternatives: ['dıgında', 'duğunda', 'düğünde'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Turkish: "tıklayınca {body...}"
 * Native temporal form using -ınca/-ince (when/as)
 * Common alternative to -dığında.
 *
 * -ınca/-ince/-unca/-ünce = "when" (temporal converb)
 */
const eventTurkishTemporalInca: LanguagePattern = {
  id: 'event-tr-temporal-inca',
  language: 'tr',
  command: 'on',
  priority: 103,
  template: {
    format: '{event}ınca {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'ınca', alternatives: ['ince', 'unca', 'ünce', 'yınca', 'yince'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Turkish: "tıklarsa {body...}"
 * Conditional form using -rsa/-rse (if/hypothetical)
 * Used for hypothetical conditions.
 *
 * -rsa/-rse = "if" (conditional)
 */
const eventTurkishConditionalSa: LanguagePattern = {
  id: 'event-tr-conditional-sa',
  language: 'tr',
  command: 'on',
  priority: 102,
  template: {
    format: '{event}rsa {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'rsa', alternatives: ['rse', 'sa', 'se'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Turkish: "tıklama olduğunda {body...}"
 * Standard event handler form with olduğunda (when it happens).
 */
const eventTurkishStandard: LanguagePattern = {
  id: 'event-tr-standard',
  language: 'tr',
  command: 'on',
  priority: 100,
  template: {
    format: '{event} olduğunda {body}',
    tokens: [
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'olduğunda', alternatives: ['oldugunda', 'de', 'da'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 0 },
  },
};

/**
 * Turkish: "#button den tıklandığında {body...}"
 * Conditional form with source filter.
 *
 * -den/-dan = from (ablative case)
 */
const eventTurkishConditionalWithSource: LanguagePattern = {
  id: 'event-tr-conditional-source',
  language: 'tr',
  command: 'on',
  priority: 115, // Highest - most specific
  template: {
    format: '{source} den {event}dığında {body}',
    tokens: [
      { type: 'role', role: 'source' },
      { type: 'literal', value: 'den', alternatives: ['dan', 'ten', 'tan'] },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'dığında', alternatives: ['dıgında', 'duğunda'] },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    source: { position: 0 },
    event: { marker: 'den', markerAlternatives: ['dan', 'ten', 'tan'] },
  },
};

// =============================================================================
// Spanish Patterns (SVO)
// =============================================================================

/**
 * Spanish: "en clic {body...}"
 * Word order: PREP EVENT BODY
 *
 * en = on, in (preposition)
 * al = a + el (upon the) - contracts with article
 */
const eventSpanishStandard: LanguagePattern = {
  id: 'event-es-standard',
  language: 'es',
  command: 'on',
  priority: 100,
  template: {
    format: 'en {event} {body}',
    tokens: [
      { type: 'literal', value: 'en', alternatives: ['al', 'cuando'] },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

/**
 * Spanish: "en clic desde #button {body...}"
 * Event handler with source filter.
 *
 * desde = from
 * de = from (alternative)
 */
const eventSpanishWithSource: LanguagePattern = {
  id: 'event-es-source',
  language: 'es',
  command: 'on',
  priority: 110,
  template: {
    format: 'en {event} desde {source} {body}',
    tokens: [
      { type: 'literal', value: 'en', alternatives: ['al'] },
      { type: 'role', role: 'event' },
      { type: 'literal', value: 'desde', alternatives: ['de'] },
      { type: 'role', role: 'source' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
    source: { marker: 'desde', markerAlternatives: ['de'] },
  },
};

/**
 * Spanish: "cuando clic {body...}"
 * Alternative form using cuando (when)
 *
 * cuando = when
 */
const eventSpanishWhen: LanguagePattern = {
  id: 'event-es-when',
  language: 'es',
  command: 'on',
  priority: 95,
  template: {
    format: 'cuando {event} {body}',
    tokens: [
      { type: 'literal', value: 'cuando' },
      { type: 'role', role: 'event' },
      // Body captured as remaining tokens
    ],
  },
  extraction: {
    event: { position: 1 },
  },
};

// =============================================================================
// Event Name Translations
// =============================================================================

/**
 * Common event names translated across languages.
 * Used by tokenizers to normalize event names to English.
 */
export const eventNameTranslations: Record<string, Record<string, string>> = {
  // Korean event names → English
  ko: {
    '클릭': 'click',
    '입력': 'input',
    '변경': 'change',
    '제출': 'submit',
    '키다운': 'keydown',
    '키업': 'keyup',
    '마우스오버': 'mouseover',
    '마우스아웃': 'mouseout',
    '포커스': 'focus',
    '블러': 'blur',
    '로드': 'load',
    '스크롤': 'scroll',
  },
  // Japanese event names → English
  ja: {
    'クリック': 'click',
    '入力': 'input',
    '変更': 'change',
    '送信': 'submit',
    'キーダウン': 'keydown',
    'キーアップ': 'keyup',
    'キープレス': 'keypress',
    'マウスオーバー': 'mouseover',
    'マウスアウト': 'mouseout',
    'フォーカス': 'focus',
    'ブラー': 'blur',
    'ロード': 'load',
    'スクロール': 'scroll',
  },
  // Arabic event names → English
  ar: {
    'النقر': 'click',
    'نقر': 'click',
    'الإدخال': 'input',
    'إدخال': 'input',
    'التغيير': 'change',
    'تغيير': 'change',
    'الإرسال': 'submit',
    'إرسال': 'submit',
    'ضغط المفتاح': 'keydown',
    'رفع المفتاح': 'keyup',
    'تمرير الماوس': 'mouseover',
    'التركيز': 'focus',
    'تحميل': 'load',
    'تمرير': 'scroll',
  },
  // Spanish event names → English
  es: {
    'clic': 'click',
    'click': 'click',
    'entrada': 'input',
    'cambio': 'change',
    'envío': 'submit',
    'enviar': 'submit',
    'tecla abajo': 'keydown',
    'tecla arriba': 'keyup',
    'ratón encima': 'mouseover',
    'ratón fuera': 'mouseout',
    'enfoque': 'focus',
    'desenfoque': 'blur',
    'carga': 'load',
    'desplazamiento': 'scroll',
  },
  // Turkish event names → English
  tr: {
    'tıklama': 'click',
    'tıkla': 'click',
    'tık': 'click',
    'giriş': 'input',
    'girdi': 'input',
    'değişiklik': 'change',
    'değişim': 'change',
    'gönderme': 'submit',
    'gönder': 'submit',
    'tuşbasma': 'keydown',
    'tuşbırakma': 'keyup',
    'fareiçinde': 'mouseover',
    'faredışında': 'mouseout',
    'odaklanma': 'focus',
    'odak': 'focus',
    'bulanıklık': 'blur',
    'yükleme': 'load',
    'kaydırma': 'scroll',
  },
};

/**
 * Normalize an event name to English.
 */
export function normalizeEventName(event: string, language: string): string {
  const translations = eventNameTranslations[language];
  if (translations && translations[event]) {
    return translations[event];
  }
  return event.toLowerCase();
}

// =============================================================================
// Export All Event Handler Patterns
// =============================================================================

export const eventHandlerPatterns: LanguagePattern[] = [
  // English
  eventEnglishStandard,
  eventEnglishWithSource,
  // Japanese - native idiom patterns first (higher priority)
  eventJapaneseConditionalWithSource,
  eventJapaneseConditionalTara,
  eventJapaneseTemporalSuffix,
  eventJapaneseStandard,
  eventJapaneseWithSource,
  eventJapaneseWhen,
  // Korean - native idiom patterns (conditional forms preferred over ambiguous 에)
  eventKoreanConditionalWithSource,
  eventKoreanConditionalMyeon,
  eventKoreanTemporalTtae,
  eventKoreanWithSource,
  // Note: eventKoreanStandard disabled - 에 is ambiguous (event vs destination)
  // Arabic - native idiom patterns first (higher priority)
  eventArabicTemporalWithSource,
  eventArabicTemporalIndama,
  eventArabicTemporalLamma,
  eventArabicTemporalHina,
  eventArabicStandard,
  eventArabicWithSource,
  eventArabicConditional,
  // Turkish - native idiom patterns first (higher priority)
  eventTurkishConditionalWithSource,
  eventTurkishConditionalDiginda,
  eventTurkishTemporalInca,
  eventTurkishConditionalSa,
  eventTurkishStandard,
  // Spanish
  eventSpanishStandard,
  eventSpanishWithSource,
  eventSpanishWhen,
];

/**
 * Get event handler patterns for a specific language.
 */
export function getEventHandlerPatternsForLanguage(language: string): LanguagePattern[] {
  return eventHandlerPatterns.filter(p => p.language === language);
}
