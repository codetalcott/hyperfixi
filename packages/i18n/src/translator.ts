// packages/i18n/src/translator.ts

import {
  Dictionary,
  DICTIONARY_CATEGORIES,
  I18nConfig,
  TranslationOptions,
  TranslationResult,
  Token,
  TokenType,
  ValidationResult,
} from './types';
import { dictionaries } from './dictionaries';
import { detectLocale } from './utils/locale';
import { tokenize } from './utils/tokenizer';
import { validate } from './validators';

export class HyperscriptTranslator {
  private config: I18nConfig;
  private dictionaries: Map<string, Dictionary>;
  private reverseDictionaries: Map<string, Map<string, string>>;

  constructor(config: I18nConfig) {
    this.config = {
      fallbackLocale: 'en',
      preserveOriginalAttribute: 'data-i18n-original',
      detectLocale: true, // Enable language detection by default
      ...config,
      locale: config.locale || 'en',  // Ensure locale has a default
    };

    this.dictionaries = new Map();
    this.reverseDictionaries = new Map();

    // Load built-in dictionaries
    Object.entries(dictionaries).forEach(([locale, dict]) => {
      this.addDictionary(locale, dict);
    });

    // Load custom dictionaries
    if (config.dictionaries) {
      Object.entries(config.dictionaries).forEach(([locale, dict]) => {
        this.addDictionary(locale, dict);
      });
    }
  }

  translate(text: string, options: TranslationOptions): string {
    const result = this.translateWithDetails(text, options);
    return result.translated;
  }

  translateWithDetails(text: string, options: TranslationOptions): TranslationResult {
    const fromLocale = options.from || this.detectLanguage(text);
    const toLocale = options.to;

    if (fromLocale === toLocale) {
      return {
        translated: text,
        original: text,
        tokens: [],
        locale: { from: fromLocale, to: toLocale }
      };
    }

    // Get dictionaries
    const fromDict = this.getDictionary(fromLocale);
    const toDict = this.getDictionary(toLocale);

    if (!fromDict || !toDict) {
      throw new Error(`Missing dictionary for locale: ${!fromDict ? fromLocale : toLocale}`);
    }

    // Tokenize the input
    const tokens = tokenize(text, fromLocale);
    
    // Translate tokens
    const translatedTokens = this.translateTokens(tokens, fromLocale, toLocale);
    
    // Reconstruct the text
    const translated = this.reconstructText(translatedTokens);

    // Validate target dictionary if requested
    if (options.validate && toDict) {
      const validation = validate(toDict, toLocale);
      if (!validation.valid) {
        console.warn('Translation validation warnings:', validation.warnings);
      }
    }

    const result: TranslationResult = {
      translated,
      tokens: translatedTokens,
      locale: { from: fromLocale, to: toLocale },
      warnings: []
    };
    if (options.preserveOriginal) {
      result.original = text;
    }
    return result;
  }

  private translateTokens(tokens: Token[], fromLocale: string, toLocale: string): Token[] {
    const fromDict = this.getDictionary(fromLocale);
    const toDict = this.getDictionary(toLocale);
    const reverseFromDict = this.getReverseDictionary(fromLocale);
    const emptyDict: Dictionary = { commands: {}, modifiers: {}, events: {}, logical: {}, temporal: {}, values: {}, attributes: {}, expressions: {} };

    return tokens.map(token => {
      let translated = token.value;

      // Only translate keywords, not identifiers or literals
      if (this.isTranslatableToken(token)) {
        // First, try direct translation from source to target
        if (fromLocale !== 'en' && toLocale !== 'en') {
          // Translate through English as intermediate
          const english = this.findTranslation(token.value, fromDict || emptyDict, reverseFromDict);
          if (english) {
            translated = this.findTranslation(english, toDict || emptyDict, new Map()) || token.value;
          }
        } else if (fromLocale === 'en') {
          // Direct translation from English
          translated = this.findTranslation(token.value, toDict || emptyDict, new Map()) || token.value;
        } else {
          // Translation to English
          translated = this.findTranslation(token.value, fromDict || emptyDict, reverseFromDict) || token.value;
        }
      }

      return {
        ...token,
        translated
      };
    });
  }

  private findTranslation(
    word: string,
    dict: Dictionary,
    reverseDict: Map<string, string>
  ): string | null {
    const lowerWord = word.toLowerCase();

    // Check if translating FROM this locale using reverse dictionary
    if (reverseDict.size > 0) {
      const english = reverseDict.get(lowerWord);
      if (english) return english;
    }

    // Check categories in priority order (events before commands to handle 'click' etc.)
    const categoryOrder = ['events', 'commands', 'expressions', 'modifiers', 'logical', 'temporal', 'values', 'attributes'];

    for (const category of categoryOrder) {
      const translations = dict[category as keyof Dictionary];
      if (translations && typeof translations === 'object') {
        for (const [key, value] of Object.entries(translations)) {
          if (key.toLowerCase() === lowerWord) return value;
        }
      }
    }

    return null;
  }

  private isTranslatableToken(token: Token): boolean {
    const translatableTypes: TokenType[] = [
      'command', 'modifier', 'event', 'logical', 'temporal', 'value', 'attribute', 'expression'
    ];
    return translatableTypes.includes(token.type);
  }

  private reconstructText(tokens: Token[]): string {
    return tokens.map(token => token.translated || token.value).join('');
  }

  detectLanguage(text: string): string {
    if (!this.config.detectLocale) {
      return this.config.locale;
    }

    return detectLocale(text, Array.from(this.dictionaries.keys()));
  }

  addDictionary(locale: string, dictionary: Dictionary): void {
    this.dictionaries.set(locale, dictionary);

    // Build reverse dictionary for this locale using type-safe iteration
    const reverseDict = new Map<string, string>();

    for (const category of DICTIONARY_CATEGORIES) {
      const translations = dictionary[category];
      if (translations) {
        for (const [english, translated] of Object.entries(translations)) {
          reverseDict.set(translated.toLowerCase(), english);
        }
      }
    }

    this.reverseDictionaries.set(locale, reverseDict);
  }

  getDictionary(locale: string): Dictionary | undefined {
    return this.dictionaries.get(locale);
  }

  private getReverseDictionary(locale: string): Map<string, string> {
    return this.reverseDictionaries.get(locale) || new Map();
  }

  getSupportedLocales(): string[] {
    return Array.from(this.dictionaries.keys());
  }

  validateDictionary(locale: string): ValidationResult {
    const dict = this.getDictionary(locale);
    if (!dict) {
      return {
        valid: false,
        errors: [{ type: 'missing', key: locale, message: `Dictionary not found for locale: ${locale}` }],
        warnings: [],
        coverage: { total: 0, translated: 0, missing: [] }
      };
    }

    return validate(dict, locale);
  }

  isRTL(locale: string): boolean {
    const rtlLocales = this.config.rtlLocales || ['ar', 'he', 'fa', 'ur'];
    return rtlLocales.includes(locale);
  }

  getCompletions(context: { text: string; position: number; locale: string }): string[] {
    const dict = this.getDictionary(context.locale);
    if (!dict) return [];

    const completions: string[] = [];

    // Get the partial word at cursor
    const beforeCursor = context.text.substring(0, context.position);
    const partial = beforeCursor.match(/\b(\w+)$/)?.[1] || '';
    const lowerPartial = partial.toLowerCase();

    // Search all categories for matches using type-safe iteration
    // For non-English locales, search translated values; for English, search keys
    for (const category of DICTIONARY_CATEGORIES) {
      const translations = dict[category];
      if (translations) {
        for (const [key, value] of Object.entries(translations)) {
          // Search keys (English terms) and values (translated terms)
          if (key.toLowerCase().startsWith(lowerPartial)) {
            completions.push(key);
          }
          if (value.toLowerCase().startsWith(lowerPartial) && !completions.includes(value)) {
            completions.push(value);
          }
        }
      }
    }

    return completions;
  }
}

// Export a singleton instance for convenience
export const translator = new HyperscriptTranslator({ locale: 'en' });
