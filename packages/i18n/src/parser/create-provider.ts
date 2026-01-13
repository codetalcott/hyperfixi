// packages/i18n/src/parser/create-provider.ts

import type { Dictionary } from '../types';
import type { KeywordProvider, KeywordProviderOptions } from './types';
import {
  ENGLISH_COMMANDS,
  ENGLISH_KEYWORDS,
  ENGLISH_MODIFIERS,
  ENGLISH_LOGICAL_KEYWORDS,
  ENGLISH_VALUE_KEYWORDS,
  ENGLISH_EXPRESSION_KEYWORDS,
  UNIVERSAL_ENGLISH_KEYWORDS,
} from '../constants';

/**
 * Creates a KeywordProvider from a dictionary.
 *
 * The provider creates reverse mappings (locale → English) for fast
 * resolution during parsing.
 *
 * @example
 * ```typescript
 * import { es } from '../dictionaries/es';
 * export const esKeywords = createKeywordProvider(es, 'es');
 * ```
 */
export function createKeywordProvider(
  dictionary: Dictionary,
  locale: string,
  options: KeywordProviderOptions = {}
): KeywordProvider {
  const { allowEnglishFallback = true } = options;

  // Build reverse maps: locale keyword → English canonical
  const reverseCommands = new Map<string, string>();
  const reverseModifiers = new Map<string, string>();
  const reverseEvents = new Map<string, string>();
  const reverseLogical = new Map<string, string>();
  const reverseTemporal = new Map<string, string>();
  const reverseValues = new Map<string, string>();
  const reverseAttributes = new Map<string, string>();
  const reverseExpressions = new Map<string, string>();
  const reverseAll = new Map<string, string>();

  // Forward maps: English → locale keyword
  const forwardAll = new Map<string, string>();

  // Build reverse mappings from dictionary
  // Note: reverseAll uses priority - first category to claim a locale word wins
  function buildReverseMap(
    category: Record<string, string>,
    reverseMap: Map<string, string>,
    priority: boolean = false
  ): void {
    for (const [english, localeWord] of Object.entries(category)) {
      const normalizedLocale = localeWord.toLowerCase();
      reverseMap.set(normalizedLocale, english.toLowerCase());
      // Only set in reverseAll if not already claimed (priority) or if this is a priority category
      if (priority || !reverseAll.has(normalizedLocale)) {
        reverseAll.set(normalizedLocale, english.toLowerCase());
      }
      forwardAll.set(english.toLowerCase(), localeWord.toLowerCase());
    }
  }

  // Build all reverse maps
  // Priority order: commands first (highest priority for parsing), then logical, events, values
  // This ensures 'en' (Spanish) → 'on' (command) rather than 'in' (modifier)
  if (dictionary.commands) {
    buildReverseMap(dictionary.commands, reverseCommands, true);
  }
  if (dictionary.logical) {
    buildReverseMap(dictionary.logical, reverseLogical, true);
  }
  if (dictionary.events) {
    buildReverseMap(dictionary.events, reverseEvents);
  }
  if (dictionary.values) {
    buildReverseMap(dictionary.values, reverseValues);
  }
  if (dictionary.temporal) {
    buildReverseMap(dictionary.temporal, reverseTemporal);
  }
  // Modifiers last (lowest priority) - they often conflict with commands
  if (dictionary.modifiers) {
    buildReverseMap(dictionary.modifiers, reverseModifiers);
  }
  if (dictionary.attributes) {
    buildReverseMap(dictionary.attributes, reverseAttributes);
  }
  if (dictionary.expressions) {
    buildReverseMap(dictionary.expressions, reverseExpressions);
  }

  // Collect all locale commands and keywords for completions
  const localeCommands = new Set(reverseCommands.keys());
  const allLocaleKeywords = new Set(reverseAll.keys());

  // Add English keywords/commands if fallback is enabled
  if (allowEnglishFallback) {
    for (const cmd of ENGLISH_COMMANDS) {
      localeCommands.add(cmd);
    }
    for (const kw of ENGLISH_KEYWORDS) {
      allLocaleKeywords.add(kw);
    }
    for (const kw of UNIVERSAL_ENGLISH_KEYWORDS) {
      allLocaleKeywords.add(kw);
    }
  }

  return {
    locale,

    resolve(token: string): string | undefined {
      const normalized = token.toLowerCase();

      // Check if it's a locale keyword
      const english = reverseAll.get(normalized);
      if (english !== undefined) {
        return english;
      }

      // If English fallback is enabled, check if it's already English
      if (allowEnglishFallback) {
        if (ENGLISH_COMMANDS.has(normalized) || ENGLISH_KEYWORDS.has(normalized)) {
          return normalized;
        }
        // Universal keywords (DOM events, etc.) pass through
        if (UNIVERSAL_ENGLISH_KEYWORDS.has(normalized)) {
          return normalized;
        }
      }

      return undefined;
    },

    isCommand(token: string): boolean {
      const normalized = token.toLowerCase();

      // Check locale commands
      if (reverseCommands.has(normalized)) {
        return true;
      }

      // Check English commands if fallback enabled
      if (allowEnglishFallback && ENGLISH_COMMANDS.has(normalized)) {
        return true;
      }

      return false;
    },

    isKeyword(token: string): boolean {
      const normalized = token.toLowerCase();

      // Check locale keywords (modifiers, logical, temporal, values)
      if (
        reverseModifiers.has(normalized) ||
        reverseLogical.has(normalized) ||
        reverseTemporal.has(normalized) ||
        reverseValues.has(normalized)
      ) {
        return true;
      }

      // Check English keywords if fallback enabled
      if (allowEnglishFallback && ENGLISH_KEYWORDS.has(normalized)) {
        return true;
      }

      return false;
    },

    isEvent(token: string): boolean {
      const normalized = token.toLowerCase();

      // Check locale events
      if (reverseEvents.has(normalized)) {
        return true;
      }

      // Universal English events always accepted
      if (UNIVERSAL_ENGLISH_KEYWORDS.has(normalized)) {
        return true;
      }

      return false;
    },

    isModifier(token: string): boolean {
      const normalized = token.toLowerCase();
      return (
        reverseModifiers.has(normalized) ||
        (allowEnglishFallback && ENGLISH_MODIFIERS.has(normalized))
      );
    },

    isLogical(token: string): boolean {
      const normalized = token.toLowerCase();
      return (
        reverseLogical.has(normalized) ||
        (allowEnglishFallback && ENGLISH_LOGICAL_KEYWORDS.has(normalized))
      );
    },

    isValue(token: string): boolean {
      const normalized = token.toLowerCase();
      return (
        reverseValues.has(normalized) ||
        (allowEnglishFallback && ENGLISH_VALUE_KEYWORDS.has(normalized))
      );
    },

    isExpression(token: string): boolean {
      const normalized = token.toLowerCase();
      return (
        reverseExpressions.has(normalized) ||
        (allowEnglishFallback && ENGLISH_EXPRESSION_KEYWORDS.has(normalized))
      );
    },

    getCommands(): string[] {
      return Array.from(localeCommands);
    },

    getKeywords(): string[] {
      return Array.from(allLocaleKeywords);
    },

    toLocale(englishKeyword: string): string | undefined {
      return forwardAll.get(englishKeyword.toLowerCase());
    },
  };
}

/**
 * Creates a default English-only keyword provider.
 * This is used when no locale is specified.
 */
export function createEnglishProvider(): KeywordProvider {
  return {
    locale: 'en',

    resolve(token: string): string | undefined {
      const normalized = token.toLowerCase();
      if (
        ENGLISH_COMMANDS.has(normalized) ||
        ENGLISH_KEYWORDS.has(normalized) ||
        UNIVERSAL_ENGLISH_KEYWORDS.has(normalized)
      ) {
        return normalized;
      }
      return undefined;
    },

    isCommand(token: string): boolean {
      return ENGLISH_COMMANDS.has(token.toLowerCase());
    },

    isKeyword(token: string): boolean {
      return ENGLISH_KEYWORDS.has(token.toLowerCase());
    },

    isEvent(token: string): boolean {
      return UNIVERSAL_ENGLISH_KEYWORDS.has(token.toLowerCase());
    },

    isModifier(token: string): boolean {
      return ENGLISH_MODIFIERS.has(token.toLowerCase());
    },

    isLogical(token: string): boolean {
      return ENGLISH_LOGICAL_KEYWORDS.has(token.toLowerCase());
    },

    isValue(token: string): boolean {
      return ENGLISH_VALUE_KEYWORDS.has(token.toLowerCase());
    },

    isExpression(token: string): boolean {
      return ENGLISH_EXPRESSION_KEYWORDS.has(token.toLowerCase());
    },

    getCommands(): string[] {
      return Array.from(ENGLISH_COMMANDS);
    },

    getKeywords(): string[] {
      return Array.from(ENGLISH_KEYWORDS);
    },

    toLocale(_englishKeyword: string): string | undefined {
      // English provider returns the keyword as-is
      return _englishKeyword.toLowerCase();
    },
  };
}

// Re-export the English keyword sets from constants for use in core
export {
  ENGLISH_COMMANDS,
  ENGLISH_KEYWORDS,
  ENGLISH_MODIFIERS,
  ENGLISH_LOGICAL_KEYWORDS,
  ENGLISH_VALUE_KEYWORDS,
  ENGLISH_EXPRESSION_KEYWORDS,
  UNIVERSAL_ENGLISH_KEYWORDS,
} from '../constants';
