// packages/i18n/src/parser/create-provider.ts

import type { Dictionary } from '../types';
import type { KeywordProvider, KeywordProviderOptions } from './types';

/**
 * English keywords that should always be recognized, even in non-English locales.
 * These are HTML/DOM standard terms that developers worldwide use.
 */
const UNIVERSAL_ENGLISH_KEYWORDS = new Set([
  // DOM events (HTML spec)
  'click', 'dblclick', 'mousedown', 'mouseup', 'mouseenter', 'mouseleave',
  'mouseover', 'mouseout', 'mousemove', 'keydown', 'keyup', 'keypress',
  'focus', 'blur', 'change', 'input', 'submit', 'reset', 'load', 'unload',
  'resize', 'scroll', 'touchstart', 'touchend', 'touchmove', 'touchcancel',
  'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
  'contextmenu', 'wheel', 'pointerdown', 'pointerup', 'pointermove',
  // Common abbreviations
  'ms', 's',
]);

/**
 * English commands - the canonical set that the runtime understands.
 */
const ENGLISH_COMMANDS = new Set([
  'add', 'append', 'async', 'beep', 'break', 'call', 'continue',
  'decrement', 'default', 'exit', 'fetch', 'for', 'get', 'go',
  'halt', 'hide', 'if', 'increment', 'install', 'js', 'log',
  'make', 'measure', 'morph', 'pick', 'process', 'push', 'put',
  'remove', 'render', 'repeat', 'replace', 'return', 'send', 'set',
  'settle', 'show', 'swap', 'take', 'tell', 'throw', 'toggle',
  'transition', 'trigger', 'unless', 'wait',
]);

/**
 * English keywords (non-commands).
 */
const ENGLISH_KEYWORDS = new Set([
  // Flow control
  'then', 'else', 'end', 'and', 'or', 'not',
  // Conditionals
  'if', 'unless',
  // Loops
  'for', 'while', 'until', 'forever', 'times', 'each', 'index',
  // Prepositions
  'in', 'to', 'from', 'into', 'with', 'without', 'of', 'at', 'by',
  // Conversion
  'as',
  // Comparison
  'matches', 'contains', 'is', 'exists',
  // Events
  'on', 'when', 'every', 'event',
  // Definitions
  'init', 'def', 'behavior',
  // Scope
  'global', 'local',
  // Articles
  'the', 'a', 'an', 'first', 'last',
  // Position
  'start', 'before', 'after',
]);

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
      return reverseModifiers.has(normalized) ||
        (allowEnglishFallback && ['to', 'from', 'into', 'with', 'at', 'in', 'of', 'as', 'by', 'before', 'after', 'without'].includes(normalized));
    },

    isLogical(token: string): boolean {
      const normalized = token.toLowerCase();
      return reverseLogical.has(normalized) ||
        (allowEnglishFallback && ['and', 'or', 'not', 'is', 'exists', 'matches', 'contains', 'then', 'else'].includes(normalized));
    },

    isValue(token: string): boolean {
      const normalized = token.toLowerCase();
      return reverseValues.has(normalized) ||
        (allowEnglishFallback && ['true', 'false', 'null', 'undefined', 'it', 'me', 'my', 'result'].includes(normalized));
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
      if (ENGLISH_COMMANDS.has(normalized) || ENGLISH_KEYWORDS.has(normalized) || UNIVERSAL_ENGLISH_KEYWORDS.has(normalized)) {
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
      return UNIVERSAL_ENGLISH_KEYWORDS.has(token.toLowerCase()) ||
        ['click', 'focus', 'blur', 'change', 'input', 'submit', 'load', 'scroll'].includes(token.toLowerCase());
    },

    isModifier(token: string): boolean {
      return ['to', 'from', 'into', 'with', 'at', 'in', 'of', 'as', 'by', 'before', 'after', 'without'].includes(token.toLowerCase());
    },

    isLogical(token: string): boolean {
      return ['and', 'or', 'not', 'is', 'exists', 'matches', 'contains', 'then', 'else'].includes(token.toLowerCase());
    },

    isValue(token: string): boolean {
      return ['true', 'false', 'null', 'undefined', 'it', 'me', 'my', 'result'].includes(token.toLowerCase());
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

// Export the English keyword sets for use in core
export { ENGLISH_COMMANDS, ENGLISH_KEYWORDS, UNIVERSAL_ENGLISH_KEYWORDS };
