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
 * Alternative conditional form using إذا (if/when)
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
  // Japanese
  eventJapaneseStandard,
  eventJapaneseWithSource,
  eventJapaneseWhen,
  // Arabic
  eventArabicStandard,
  eventArabicWithSource,
  eventArabicConditional,
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
