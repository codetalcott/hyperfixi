// packages/i18n/src/types.ts

/**
 * Dictionary category names as a union type for type-safe access.
 */
export type DictionaryCategory =
  | 'commands'
  | 'modifiers'
  | 'events'
  | 'logical'
  | 'temporal'
  | 'values'
  | 'attributes'
  | 'expressions';

/**
 * All valid dictionary categories.
 */
export const DICTIONARY_CATEGORIES: readonly DictionaryCategory[] = [
  'commands',
  'modifiers',
  'events',
  'logical',
  'temporal',
  'values',
  'attributes',
  'expressions',
] as const;

/**
 * Dictionary structure for i18n translations.
 * Maps English canonical keywords to locale-specific translations.
 *
 * Note: Index signature removed for stricter type safety.
 * Use DICTIONARY_CATEGORIES to iterate over categories.
 */
export interface Dictionary {
  commands: Record<string, string>;
  modifiers: Record<string, string>;
  events: Record<string, string>;
  logical: Record<string, string>;
  temporal: Record<string, string>;
  values: Record<string, string>;
  attributes: Record<string, string>;
  expressions: Record<string, string>;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a string is a valid dictionary category.
 */
export function isDictionaryCategory(key: string): key is DictionaryCategory {
  return DICTIONARY_CATEGORIES.includes(key as DictionaryCategory);
}

/**
 * Safely get a category from a dictionary with type narrowing.
 * Returns undefined if the category doesn't exist.
 */
export function getDictionaryCategory(
  dict: Dictionary,
  category: string
): Record<string, string> | undefined {
  if (isDictionaryCategory(category)) {
    return dict[category];
  }
  return undefined;
}

/**
 * Iterate over all categories in a dictionary with proper typing.
 */
export function forEachCategory(
  dict: Dictionary,
  callback: (category: DictionaryCategory, entries: Record<string, string>) => void
): void {
  for (const category of DICTIONARY_CATEGORIES) {
    callback(category, dict[category]);
  }
}

/**
 * Find a translation in any category of a dictionary.
 * Returns the English key if found, undefined otherwise.
 */
export function findInDictionary(
  dict: Dictionary,
  localizedWord: string
): { category: DictionaryCategory; englishKey: string } | undefined {
  const normalized = localizedWord.toLowerCase();
  for (const category of DICTIONARY_CATEGORIES) {
    const entries = dict[category];
    for (const [english, localized] of Object.entries(entries)) {
      if (localized.toLowerCase() === normalized) {
        return { category, englishKey: english };
      }
    }
  }
  return undefined;
}

/**
 * Find a translation for an English word in any category.
 * Returns the localized word if found, undefined otherwise.
 */
export function translateFromEnglish(dict: Dictionary, englishWord: string): string | undefined {
  const normalized = englishWord.toLowerCase();
  for (const category of DICTIONARY_CATEGORIES) {
    const entries = dict[category];
    const translated = entries[normalized];
    if (translated) {
      return translated;
    }
  }
  return undefined;
}

export interface I18nConfig {
  locale: string;
  fallbackLocale?: string;
  dictionaries?: Record<string, Dictionary>;
  detectLocale?: boolean;
  rtlLocales?: string[];
  preserveOriginalAttribute?: string;
}

export interface TranslationOptions {
  from?: string;
  to: string;
  preserveOriginal?: boolean;
  validate?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  coverage: {
    total: number;
    translated: number;
    missing: string[];
  };
}

export interface ValidationError {
  type: 'missing' | 'invalid' | 'duplicate';
  key: string;
  message: string;
}

export interface ValidationWarning {
  type: 'unused' | 'deprecated' | 'inconsistent';
  key: string;
  message: string;
}

export interface LocaleMetadata {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  pluralRules?: (n: number) => string;
}

export interface TranslationContext {
  locale: string;
  direction: 'ltr' | 'rtl';
  dictionary: Dictionary;
  metadata: LocaleMetadata;
}

export type TokenType =
  | 'command'
  | 'modifier'
  | 'event'
  | 'logical'
  | 'temporal'
  | 'value'
  | 'attribute'
  | 'expression'
  | 'identifier'
  | 'operator'
  | 'literal';

export interface Token {
  type: TokenType;
  value: string;
  translated?: string;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
}

export interface TranslationResult {
  translated: string;
  original?: string;
  tokens: Token[];
  locale: {
    from: string;
    to: string;
  };
  warnings?: string[];
}
