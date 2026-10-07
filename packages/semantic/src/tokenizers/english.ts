/**
 * English Tokenizer
 *
 * Tokenizes English hyperscript input.
 * English uses space-separated words with prepositions.
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { englishProfile } from '../generators/profiles/english';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
  SpacedDurationExtractor,
  ATickExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createEnglishExtractors } from './extractors/english-keyword';

// =============================================================================
// English Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Event names
 * - Positional words
 * - Prepositions/modifiers
 * - Articles
 * - Synonyms with normalized forms
 * - Swap strategies
 * - British spelling aliases
 */
const ENGLISH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'true', normalized: 'true' },
  { native: 'false', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'undefined', normalized: 'undefined' },

  // Positional
  { native: 'first', normalized: 'first' },
  { native: 'last', normalized: 'last' },
  { native: 'next', normalized: 'next' },
  { native: 'previous', normalized: 'previous' },
  { native: 'closest', normalized: 'closest' },

  // Events
  { native: 'click', normalized: 'click' },
  { native: 'dblclick', normalized: 'dblclick' },
  { native: 'mousedown', normalized: 'mousedown' },
  { native: 'mouseup', normalized: 'mouseup' },
  { native: 'mouseover', normalized: 'mouseover' },
  { native: 'mouseout', normalized: 'mouseout' },
  { native: 'mouseenter', normalized: 'mouseenter' },
  { native: 'mouseleave', normalized: 'mouseleave' },
  { native: 'mousemove', normalized: 'mousemove' },
  { native: 'keydown', normalized: 'keydown' },
  { native: 'keyup', normalized: 'keyup' },
  { native: 'keypress', normalized: 'keypress' },
  { native: 'input', normalized: 'input' },
  { native: 'change', normalized: 'change' },
  { native: 'submit', normalized: 'submit' },
  { native: 'reset', normalized: 'reset' },
  { native: 'load', normalized: 'load' },
  { native: 'unload', normalized: 'unload' },
  { native: 'scroll', normalized: 'scroll' },
  { native: 'resize', normalized: 'resize' },
  { native: 'dragstart', normalized: 'dragstart' },
  { native: 'drag', normalized: 'drag' },
  { native: 'dragend', normalized: 'dragend' },
  { native: 'dragenter', normalized: 'dragenter' },
  { native: 'dragleave', normalized: 'dragleave' },
  { native: 'dragover', normalized: 'dragover' },
  { native: 'drop', normalized: 'drop' },
  { native: 'touchstart', normalized: 'touchstart' },
  { native: 'touchmove', normalized: 'touchmove' },
  { native: 'touchend', normalized: 'touchend' },
  { native: 'touchcancel', normalized: 'touchcancel' },

  // Prepositions/modifiers not in profile
  { native: 'in', normalized: 'in' },
  { native: 'to', normalized: 'to' },
  { native: 'at', normalized: 'at' },
  { native: 'by', normalized: 'by' },
  { native: 'with', normalized: 'with' },
  { native: 'without', normalized: 'without' },
  { native: 'of', normalized: 'of' },
  { native: 'as', normalized: 'as' },

  // Event handling keywords
  { native: 'every', normalized: 'every' },
  { native: 'upon', normalized: 'upon' },

  // Control flow helpers not in profile
  { native: 'unless', normalized: 'unless' },
  { native: 'forever', normalized: 'forever' },
  { native: 'times', normalized: 'times' },

  // Logical
  { native: 'and', normalized: 'and' },
  { native: 'or', normalized: 'or' },
  { native: 'not', normalized: 'not' },
  { native: 'is', normalized: 'is' },
  { native: 'exists', normalized: 'exists' },
  { native: 'empty', normalized: 'empty' },

  // References not in profile
  { native: 'my', normalized: 'my' },
  { native: 'your', normalized: 'your' },
  { native: 'its', normalized: 'its' },
  { native: 'the', normalized: 'the' },
  { native: 'a', normalized: 'a' },
  { native: 'an', normalized: 'an' },

  // Swap strategies. Not `innerHTML` / `outerHTML`: they are DOM properties a
  // value names (`set innerHTML of #d1 to …`), and a keyword there read as no
  // property; swap's method slot takes them as words (SWAP_STRATEGIES).
  { native: 'delete', normalized: 'delete' },
  { native: 'beforebegin', normalized: 'beforebegin' },
  { native: 'afterend', normalized: 'afterend' },
  { native: 'beforeend', normalized: 'beforeend' },
  { native: 'afterbegin', normalized: 'afterbegin' },

  // Command synonyms with normalized forms
  { native: 'flip', normalized: 'toggle' },
  { native: 'switch', normalized: 'toggle' },
  { native: 'increase', normalized: 'increment' },
  { native: 'decrease', normalized: 'decrement' },
  { native: 'display', normalized: 'show' },
  { native: 'reveal', normalized: 'show' },
  { native: 'conceal', normalized: 'hide' },

  // British spelling aliases
  { native: 'colour', normalized: 'color' },
  { native: 'grey', normalized: 'gray' },
  { native: 'centre', normalized: 'center' },
  { native: 'behaviour', normalized: 'behavior' },
  { native: 'initialise', normalized: 'initialize' },
  { native: 'favourite', normalized: 'favorite' },
];

// =============================================================================
// English Tokenizer Implementation
// =============================================================================

export class EnglishTokenizer extends BaseTokenizer {
  readonly language = 'en';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(englishProfile, ENGLISH_EXTRAS);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new SpacedDurationExtractor()); // `10 ms`, `2 seconds`
    this.registerExtractor(new ATickExtractor()); // `a tick` is `0ms`
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createEnglishExtractors()); // English keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
    // Check URLs before selectors (./path vs .class)
    if (
      token.startsWith('/') ||
      token.startsWith('./') ||
      token.startsWith('../') ||
      token.startsWith('http')
    )
      return 'url';
    // Check for event modifiers before CSS selectors
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(token))
      return 'event-modifier';
    if (
      token.startsWith('#') ||
      token.startsWith('.') ||
      token.startsWith('[') ||
      token.startsWith('*') ||
      token.startsWith('<')
    )
      return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  // extractWord() and tryConvertToClassSelector() methods removed
  // Now handled by EnglishKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const englishTokenizer = new EnglishTokenizer();
