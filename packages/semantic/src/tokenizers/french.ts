/**
 * French Tokenizer
 *
 * Tokenizes French hyperscript input.
 * French characteristics:
 * - SVO word order
 * - Space-separated words
 * - Prepositions
 * - Accent marks (é, è, ê, ë, à, â, ù, û, ô, î, ï, ç, œ, æ)
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { frenchProfile } from '../generators/profiles/french';
import { FrenchMorphologicalNormalizer } from './morphology/french-normalizer';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createFrenchExtractors } from './extractors/french-keyword';

// =============================================================================
// French Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Accent-free variants for accessibility
 */
const FRENCH_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'vrai', normalized: 'true' },
  { native: 'faux', normalized: 'false' },
  { native: 'nul', normalized: 'null' },
  { native: 'indéfini', normalized: 'undefined' },
  { native: 'indefini', normalized: 'undefined' },

  // Positional
  { native: 'premier', normalized: 'first' },
  { native: 'première', normalized: 'first' },
  { native: 'premiere', normalized: 'first' },
  { native: 'dernier', normalized: 'last' },
  { native: 'dernière', normalized: 'last' },
  { native: 'derniere', normalized: 'last' },
  { native: 'suivant', normalized: 'next' },
  { native: 'précédent', normalized: 'previous' },
  { native: 'precedent', normalized: 'previous' },
  // Single token only — the tokenizer never matches multi-word natives, so the
  // old 'plus proche' entry was dead. The i18n dict emits 'proche'.
  { native: 'proche', normalized: 'closest' },
  { native: 'parent', normalized: 'parent' },

  // Events
  { native: 'clic', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'entrée', normalized: 'input' },
  { native: 'entree', normalized: 'input' },
  { native: 'changement', normalized: 'change' },
  { native: 'soumission', normalized: 'submit' },
  { native: 'touche bas', normalized: 'keydown' },
  { native: 'touche haut', normalized: 'keyup' },
  { native: 'souris dessus', normalized: 'mouseover' },
  { native: 'souris dehors', normalized: 'mouseout' },
  { native: 'focus', normalized: 'focus' },
  { native: 'flou', normalized: 'blur' },
  { native: 'chargement', normalized: 'load' },
  { native: 'défilement', normalized: 'scroll' },
  { native: 'defilement', normalized: 'scroll' },

  // Additional references
  { native: 'je', normalized: 'me' },
  { native: 'mon', normalized: 'my' },
  { native: 'ma', normalized: 'my' },
  { native: 'mes', normalized: 'my' },
  { native: 'ça', normalized: 'it' },
  { native: 'ca', normalized: 'it' },
  { native: 'resultat', normalized: 'result' },
  { native: 'evenement', normalized: 'event' },

  // Time units
  { native: 'seconde', normalized: 's' },
  { native: 'secondes', normalized: 's' },
  { native: 'milliseconde', normalized: 'ms' },
  { native: 'millisecondes', normalized: 'ms' },
  { native: 'minute', normalized: 'm' },
  { native: 'minutes', normalized: 'm' },
  { native: 'heure', normalized: 'h' },
  { native: 'heures', normalized: 'h' },

  // Accent-free variants (for user convenience)
  { native: 'prefixer', normalized: 'prepend' },
  { native: 'creer', normalized: 'make' },
  { native: 'definir', normalized: 'set' },
  { native: 'etablir', normalized: 'set' },
  { native: 'incrementer', normalized: 'increment' },
  { native: 'decrementer', normalized: 'decrement' },
  { native: 'declencher', normalized: 'trigger' },
  { native: 'defocaliser', normalized: 'blur' },
  { native: 'recuperer', normalized: 'fetch' },
  { native: 'repeter', normalized: 'repeat' },
  { native: 'arreter', normalized: 'halt' },
  { native: 'defaut', normalized: 'default' },
  { native: 'jusqua', normalized: 'until' },
  { native: 'apres', normalized: 'after' },

  // Additional log synonyms
  { native: 'journaliser', normalized: 'log' },

  // Additional morph synonym
  { native: 'transmuter', normalized: 'morph' },

  // Multi-word phrases
  { native: 'tant que', normalized: 'while' },
  { native: 'inclusif', normalized: 'inclusive' },
  { native: 'exclusif', normalized: 'exclusive' },
  { native: 'caractères', normalized: 'characters' },
];

// =============================================================================
// French Tokenizer Implementation
// =============================================================================

export class FrenchTokenizer extends BaseTokenizer {
  readonly language = 'fr';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(frenchProfile, FRENCH_EXTRAS);
    this.normalizer = new FrenchMorphologicalNormalizer();

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createFrenchExtractors()); // French keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(token)) return 'keyword';
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
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  // extractWord() and extractNumber() methods removed
  // Now handled by FrenchKeywordExtractor (context-aware) and NumberExtractor
}

/**
 * Singleton instance.
 */
export const frenchTokenizer = new FrenchTokenizer();
