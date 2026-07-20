/**
 * Italian Tokenizer (Context-Aware Extractors)
 *
 * Tokenizes Italian hyperscript input using context-aware extractors.
 * Italian is very similar to Spanish:
 * - Uses space-separated words
 * - Has similar preposition structure (SVO)
 * - Uses accent marks that need proper handling
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { ItalianMorphologicalNormalizer } from './morphology/italian-normalizer';
import { italianProfile } from '../generators/profiles/italian';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createItalianExtractors } from './extractors/romance-language-keyword';

// =============================================================================
// Italian Prepositions (used in classifyToken)
// =============================================================================

/**
 * Italian prepositions that mark grammatical roles.
 */
const PREPOSITIONS = new Set([
  'in', // in, into
  'a', // to, at
  'di', // of, from
  'da', // from, by
  'con', // with
  'su', // on
  'per', // for
  'tra', // between
  'fra', // between (variant)
  'dopo', // after
  'prima', // before
  'dentro', // inside
  'fuori', // outside
  'sopra', // above
  'sotto', // under
  // Articulated prepositions
  'al', // a + il
  'allo', // a + lo
  'alla', // a + la
  'ai', // a + i
  'agli', // a + gli
  'alle', // a + le
  'del', // di + il
  'dello', // di + lo
  'della', // di + la
  'dei', // di + i
  'degli', // di + gli
  'delle', // di + le
  'dal', // da + il
  'dallo', // da + lo
  'dalla', // da + la
  'dai', // da + i
  'dagli', // da + gli
  'dalle', // da + le
  'nel', // in + il
  'nello', // in + lo
  'nella', // in + la
  'nei', // in + i
  'negli', // in + gli
  'nelle', // in + le
  'sul', // su + il
  'sullo', // su + lo
  'sulla', // su + la
  'sui', // su + i
  'sugli', // su + gli
  'sulle', // su + le
]);

// =============================================================================
// Italian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false)
 * - Positional words
 * - Event names
 * - Time units
 * - Multi-word phrases
 * - Imperative forms (profile uses infinitives)
 */
const ITALIAN_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'vero', normalized: 'true' },
  { native: 'falso', normalized: 'false' },
  { native: 'nullo', normalized: 'null' },
  { native: 'indefinito', normalized: 'undefined' },

  // Positional
  { native: 'primo', normalized: 'first' },
  { native: 'prima', normalized: 'first' },
  { native: 'ultimo', normalized: 'last' },
  { native: 'ultima', normalized: 'last' },
  { native: 'prossimo', normalized: 'next' },
  { native: 'successivo', normalized: 'next' },
  { native: 'precedente', normalized: 'previous' },
  { native: 'vicino', normalized: 'closest' },
  { native: 'padre', normalized: 'parent' },

  // Events
  { native: 'clic', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'fare clic', normalized: 'click' },
  { native: 'input', normalized: 'input' },
  { native: 'cambio', normalized: 'change' },
  { native: 'invio', normalized: 'submit' },
  { native: 'tasto giù', normalized: 'keydown' },
  { native: 'tasto su', normalized: 'keyup' },
  { native: 'mouse sopra', normalized: 'mouseover' },
  { native: 'mouse fuori', normalized: 'mouseout' },
  { native: 'fuoco', normalized: 'focus' },
  { native: 'sfuocatura', normalized: 'blur' },
  { native: 'caricamento', normalized: 'load' },
  { native: 'scorrimento', normalized: 'scroll' },

  // References
  { native: 'io', normalized: 'me' },
  { native: 'me', normalized: 'me' },
  { native: 'destinazione', normalized: 'target' },

  // Time units
  { native: 'secondo', normalized: 's' },
  { native: 'secondi', normalized: 's' },
  { native: 'millisecondo', normalized: 'ms' },
  { native: 'millisecondi', normalized: 'ms' },
  { native: 'minuto', normalized: 'm' },
  { native: 'minuti', normalized: 'm' },
  { native: 'ora', normalized: 'h' },
  { native: 'ore', normalized: 'h' },

  // Multi-word phrases
  { native: 'fino a', normalized: 'until' },
  { native: 'prima di', normalized: 'before' },
  { native: 'dopo di', normalized: 'after' },
  { native: 'dentro di', normalized: 'into' },
  { native: 'fuori di', normalized: 'out' },

  // Override profile conflicts (aggiungere is both add and append in profile, prefer add)
  { native: 'aggiungere', normalized: 'add' },

  // Imperative forms (profile has infinitives)
  { native: 'aggiungi', normalized: 'add' },
  { native: 'rimuovi', normalized: 'remove' },
  { native: 'elimina', normalized: 'remove' },
  { native: 'togli', normalized: 'remove' },
  { native: 'metti', normalized: 'put' },
  { native: 'inserisci', normalized: 'put' },
  { native: 'prendi', normalized: 'take' },
  { native: 'fai', normalized: 'make' },
  { native: 'crea', normalized: 'make' },
  { native: 'clona', normalized: 'clone' },
  { native: 'copia', normalized: 'clone' },
  { native: 'imposta', normalized: 'set' },
  { native: 'ottieni', normalized: 'get' },
  { native: 'incrementa', normalized: 'increment' },
  { native: 'aumenta', normalized: 'increment' },
  { native: 'decrementa', normalized: 'decrement' },
  { native: 'diminuisci', normalized: 'decrement' },
  { native: 'registra', normalized: 'log' },
  { native: 'mostra', normalized: 'show' },
  { native: 'visualizza', normalized: 'show' },
  { native: 'nascondi', normalized: 'hide' },
  { native: 'anima', normalized: 'transition' },
  { native: 'scatena', normalized: 'trigger' },
  { native: 'attiva', normalized: 'trigger' },
  { native: 'invia', normalized: 'send' },
  { native: 'focalizza', normalized: 'focus' },
  { native: 'sfuoca', normalized: 'blur' },
  { native: 'vai', normalized: 'go' },
  { native: 'naviga', normalized: 'go' },
  { native: 'aspetta', normalized: 'wait' },
  { native: 'attendi', normalized: 'wait' },
  { native: 'recupera', normalized: 'fetch' },
  { native: 'stabilizza', normalized: 'settle' },
  { native: 'ripeti', normalized: 'repeat' },
  { native: 'continua', normalized: 'continue' },
  { native: 'ferma', normalized: 'halt' },
  { native: 'lancia', normalized: 'throw' },
  { native: 'chiama', normalized: 'call' },
  { native: 'ritorna', normalized: 'return' },
  { native: 'inizializza', normalized: 'init' },
  { native: 'installa', normalized: 'install' },
  { native: 'misura', normalized: 'measure' },

  // Logical/conditional
  { native: 'e', normalized: 'and' },
  { native: 'o', normalized: 'or' },
  { native: 'non', normalized: 'not' },
  { native: 'è', normalized: 'is' },
  { native: 'esiste', normalized: 'exists' },
  { native: 'vuoto', normalized: 'empty' },

  // Synonyms not in profile
  { native: 'toggle', normalized: 'toggle' },
  { native: 'di', normalized: 'tell' },
  { native: 'inclusivo', normalized: 'inclusive' },
  { native: 'esclusivo', normalized: 'exclusive' },
  { native: 'caratteri', normalized: 'characters' },
  { native: 'casuale', normalized: 'random' },
];

// =============================================================================
// Italian Tokenizer Implementation
// =============================================================================

export class ItalianTokenizer extends BaseTokenizer {
  readonly language = 'it';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(italianProfile, ITALIAN_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new ItalianMorphologicalNormalizer());

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createItalianExtractors()); // Italian keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
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
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';

    return 'identifier';
  }

  // tryMultiWordPhrase(), extractItalianWord(), extractItalianNumber() methods removed
  // Now handled by ItalianKeywordExtractor (context-aware)
}

/**
 * Singleton instance.
 */
export const italianTokenizer = new ItalianTokenizer();
