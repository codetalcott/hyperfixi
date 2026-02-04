/**
 * Quechua Tokenizer
 *
 * Tokenizes Quechua (Runasimi) hyperscript input.
 * Quechua characteristics:
 * - SOV word order
 * - Agglutinative/polysynthetic morphology
 * - Postpositions (suffixes)
 * - Case suffixes: -ta (accusative), -man (allative), -manta (ablative), etc.
 * - Evidential markers
 */

import type { LanguageToken, TokenKind, TokenStream } from '../types';
import {
  BaseTokenizer,
  TokenStreamImpl,
  createToken,
  createPosition,
  createLatinCharClassifiers,
  isWhitespace,
  isSelectorStart,
  isQuote,
  isDigit,
  isUrlStart,
  type KeywordEntry,
} from './base';
import { quechuaProfile } from '../generators/profiles/quechua';

// =============================================================================
// Quechua Character Classification
// =============================================================================

const { isLetter: isQuechuaLetter, isIdentifierChar: isQuechuaIdentifierChar } =
  createLatinCharClassifiers(/[a-zA-ZñÑ']/);

// =============================================================================
// Quechua Suffixes (Postpositions/Case markers)
// =============================================================================

const SUFFIXES = new Set([
  '-ta', // accusative (direct object)
  '-man', // allative (to, towards)
  '-manta', // ablative (from)
  '-pi', // locative (at, in)
  '-wan', // comitative/instrumental (with)
  '-paq', // benefactive (for)
  '-kama', // limitative (until, up to)
  '-rayku', // causative (because of)
  '-hina', // simulative (like, as)
  // Standalone (unhyphenated) forms — used when written as separate words
  'ta',
  'man',
  'manta',
  'pi',
  'wan',
  'paq',
  'kama',
  'hina',
  'pa',
]);

// =============================================================================
// Quechua Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional synonyms
 */
const QUECHUA_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'arí', normalized: 'true' },
  { native: 'ari', normalized: 'true' },
  { native: 'manan', normalized: 'false' },
  { native: 'mana', normalized: 'false' },
  { native: "ch'usaq", normalized: 'null' },
  { native: 'chusaq', normalized: 'null' },
  { native: 'mana riqsisqa', normalized: 'undefined' },

  // Positional
  { native: 'ñawpaq', normalized: 'first' },
  { native: 'nawpaq', normalized: 'first' },
  { native: 'qhipa', normalized: 'last' },
  { native: 'hamuq', normalized: 'next' },
  { native: 'ñawpaq kaq', normalized: 'previous' },
  { native: 'ñawpaq_kaq', normalized: 'previous' },
  { native: 'aswan qayllaqa', normalized: 'closest' },
  { native: 'tayta', normalized: 'parent' },

  // Events
  { native: 'llikllay', normalized: 'click' },
  { native: 'ñitiy', normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'yaykuy', normalized: 'input' },
  { native: 'llave uray', normalized: 'keydown' },
  { native: 'llave hawa', normalized: 'keyup' },
  { native: 'mausiri yayku', normalized: 'mouseover' },
  { native: 'mausiri lluqsi', normalized: 'mouseout' },
  { native: 'qhaway', normalized: 'focus' },
  { native: 'mana qhaway', normalized: 'blur' },
  { native: 'kargay', normalized: 'load' },
  { native: 'muyuy', normalized: 'scroll' },

  // References
  { native: 'ñuqa', normalized: 'me' },
  { native: 'nuqa', normalized: 'me' },
  { native: 'ñuqap', normalized: 'my' },
  { native: 'nuqap', normalized: 'my' },
  { native: 'chay', normalized: 'it' },
  { native: 'chaymi', normalized: 'it' },
  { native: 'lluqsiy', normalized: 'result' },
  { native: 'ruway', normalized: 'event' },
  { native: 'maypi', normalized: 'target' },

  // Time units
  { native: 'sikundu', normalized: 's' },
  { native: 'segundu', normalized: 's' },
  { native: 'waranqa sikundu', normalized: 'ms' },
  { native: 'minutu', normalized: 'm' },
  { native: 'ura', normalized: 'h' },
  { native: 'hora', normalized: 'h' },

  // Event triggers (on)
  { native: 'chaypim', normalized: 'on' },
  { native: 'kaypi', normalized: 'on' },

  // Control flow helpers
  { native: 'chayqa', normalized: 'then' },
  { native: 'chaymanta', normalized: 'then' },
  { native: 'chaymantataq', normalized: 'then' },
  { native: 'hinaspa', normalized: 'then' },
  { native: 'tukukuy', normalized: 'end' },
  { native: 'puchukay', normalized: 'end' },
  { native: 'kaykama', normalized: 'until' },

  // Command overrides
  { native: 'yapay', normalized: 'add' }, // Profile may have this as 'append'
  { native: "t'ikray", normalized: 'toggle' },
  { native: 'tikray', normalized: 'toggle' },

  // DOM focus
  { native: 'qhawachiy', normalized: 'focus' },
  { native: 'mana qhawachiy', normalized: 'blur' },

  // Suffix modifiers
  { native: '-manta', normalized: 'from' },
];

// =============================================================================
// Quechua Tokenizer Implementation
// =============================================================================

export class QuechuaTokenizer extends BaseTokenizer {
  readonly language = 'qu';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    this.initializeKeywordsFromProfile(quechuaProfile, QUECHUA_EXTRAS);
  }

  tokenize(input: string): TokenStream {
    const tokens: LanguageToken[] = [];
    let pos = 0;

    while (pos < input.length) {
      if (isWhitespace(input[pos])) {
        pos++;
        continue;
      }

      if (isSelectorStart(input[pos])) {
        // Check for event modifier first (.once, .debounce(), etc.)
        const modifierToken = this.tryEventModifier(input, pos);
        if (modifierToken) {
          tokens.push(modifierToken);
          pos = modifierToken.position.end;
          continue;
        }

        const selectorToken = this.trySelector(input, pos);
        if (selectorToken) {
          // Check if selector has a Quechua suffix attached
          const selectorWithSuffix = this.splitSelectorSuffix(selectorToken);
          if (selectorWithSuffix.length === 2) {
            // Selector + suffix: push both tokens
            tokens.push(selectorWithSuffix[0]);
            tokens.push(selectorWithSuffix[1]);
            pos = selectorWithSuffix[1].position.end;
          } else {
            // Just selector: push as-is
            tokens.push(selectorToken);
            pos = selectorToken.position.end;
          }
          continue;
        }
      }

      if (isQuote(input[pos])) {
        const stringToken = this.tryString(input, pos);
        if (stringToken) {
          tokens.push(stringToken);
          pos = stringToken.position.end;
          continue;
        }
      }

      if (isUrlStart(input, pos)) {
        const urlToken = this.tryUrl(input, pos);
        if (urlToken) {
          tokens.push(urlToken);
          pos = urlToken.position.end;
          continue;
        }
      }

      if (
        isDigit(input[pos]) ||
        (input[pos] === '-' && pos + 1 < input.length && isDigit(input[pos + 1]))
      ) {
        const numberToken = this.extractNumber(input, pos);
        if (numberToken) {
          tokens.push(numberToken);
          pos = numberToken.position.end;
          continue;
        }
      }

      const varToken = this.tryVariableRef(input, pos);
      if (varToken) {
        tokens.push(varToken);
        pos = varToken.position.end;
        continue;
      }

      // Check for suffix markers (-ta, -man, etc.)
      if (input[pos] === '-') {
        const suffixToken = this.trySuffix(input, pos);
        if (suffixToken) {
          tokens.push(suffixToken);
          pos = suffixToken.position.end;
          continue;
        }
      }

      if (isQuechuaLetter(input[pos])) {
        // Try multi-word keywords first (e.g., "mana qhawachiy" = blur)
        const multiWordToken = this.tryMultiWordKeyword(input, pos);
        if (multiWordToken) {
          tokens.push(multiWordToken);
          pos = multiWordToken.position.end;
          continue;
        }

        const wordToken = this.extractWord(input, pos);
        if (wordToken) {
          tokens.push(wordToken);
          pos = wordToken.position.end;
          continue;
        }
      }

      const operatorToken = this.tryOperator(input, pos);
      if (operatorToken) {
        tokens.push(operatorToken);
        pos = operatorToken.position.end;
        continue;
      }

      pos++;
    }

    return new TokenStreamImpl(tokens, 'qu');
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();
    if (SUFFIXES.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    if (token.startsWith('#') || token.startsWith('.') || token.startsWith('[')) return 'selector';
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    return 'identifier';
  }

  private trySuffix(input: string, startPos: number): LanguageToken | null {
    // Check for known suffixes
    for (const suffix of SUFFIXES) {
      if (input.slice(startPos, startPos + suffix.length).toLowerCase() === suffix) {
        return createToken(
          input.slice(startPos, startPos + suffix.length),
          'particle',
          createPosition(startPos, startPos + suffix.length)
        );
      }
    }
    return null;
  }

  /**
   * Split a selector token if it has a Quechua suffix attached.
   * E.g., ".openta" -> [".open", "-ta"]
   * Returns array with 1 token (no suffix) or 2 tokens (selector + suffix)
   */
  private splitSelectorSuffix(selectorToken: LanguageToken): LanguageToken[] {
    const text = selectorToken.value;

    // Check if selector ends with any known suffix
    for (const suffix of SUFFIXES) {
      if (text.toLowerCase().endsWith(suffix)) {
        const baseEnd = text.length - suffix.length;
        const base = text.slice(0, baseEnd);
        const suffixPart = text.slice(baseEnd);

        // Create base selector token
        const baseToken = createToken(
          base,
          'selector',
          createPosition(selectorToken.position.start, selectorToken.position.start + baseEnd)
        );

        // Create suffix particle token
        const suffixToken = createToken(
          suffixPart,
          'particle',
          createPosition(selectorToken.position.start + baseEnd, selectorToken.position.end)
        );

        return [baseToken, suffixToken];
      }
    }

    // No suffix found, return original token
    return [selectorToken];
  }

  /**
   * Try to match multi-word keywords that should be treated as a single unit.
   * E.g., "mana qhawachiy" (not focus = blur)
   */
  private tryMultiWordKeyword(input: string, pos: number): LanguageToken | null {
    // Multi-word keywords (longest first)
    const multiWordKeywords: Array<{ pattern: string; normalized: string }> = [
      { pattern: 'mana qhawachiy', normalized: 'blur' },
      { pattern: 'mana qhaway', normalized: 'blur' },
      { pattern: 'mana riqsisqa', normalized: 'undefined' },
      { pattern: 'mana waqtalla', normalized: 'async' },
      { pattern: 'ñawpaq kaq', normalized: 'previous' },
      { pattern: 'aswan qayllaqa', normalized: 'closest' },
      { pattern: 'llave uray', normalized: 'keydown' },
      { pattern: 'llave hawa', normalized: 'keyup' },
      { pattern: 'mausiri yayku', normalized: 'mouseover' },
      { pattern: 'mausiri lluqsi', normalized: 'mouseout' },
      { pattern: 'waranqa sikundu', normalized: 'ms' },
    ];

    const inputLower = input.toLowerCase();
    for (const { pattern, normalized } of multiWordKeywords) {
      if (inputLower.slice(pos, pos + pattern.length) === pattern) {
        // Check that it's followed by whitespace or end of input
        const endPos = pos + pattern.length;
        if (
          endPos >= input.length ||
          isWhitespace(input[endPos]) ||
          !isQuechuaLetter(input[endPos])
        ) {
          return createToken(
            input.slice(pos, endPos),
            'keyword',
            createPosition(pos, endPos),
            normalized
          );
        }
      }
    }

    return null;
  }

  private extractWord(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let word = '';

    while (pos < input.length && isQuechuaIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();

    // Check standalone suffixes first — classify as particle
    if (SUFFIXES.has(lower)) {
      return createToken(word, 'particle', createPosition(startPos, pos));
    }

    // O(1) Map lookup instead of O(n) array search
    const keywordEntry = this.lookupKeyword(lower);
    if (keywordEntry) {
      return createToken(word, 'keyword', createPosition(startPos, pos), keywordEntry.normalized);
    }

    return createToken(word, 'identifier', createPosition(startPos, pos));
  }

  private extractNumber(input: string, startPos: number): LanguageToken | null {
    let pos = startPos;
    let number = '';

    if (input[pos] === '-' || input[pos] === '+') {
      number += input[pos++];
    }

    while (pos < input.length && isDigit(input[pos])) {
      number += input[pos++];
    }

    if (pos < input.length && input[pos] === '.') {
      number += input[pos++];
      while (pos < input.length && isDigit(input[pos])) {
        number += input[pos++];
      }
    }

    let unitPos = pos;
    while (unitPos < input.length && isWhitespace(input[unitPos])) {
      unitPos++;
    }

    // Quechua time units (borrowed from Spanish)
    const remaining = input.slice(unitPos).toLowerCase();
    if (remaining.startsWith('sikundu') || remaining.startsWith('segundu')) {
      number += 's';
      pos = unitPos + 7;
    } else if (remaining.startsWith('minutu')) {
      number += 'm';
      pos = unitPos + 6;
    } else if (remaining.startsWith('hora') || remaining.startsWith('ura')) {
      number += 'h';
      pos = unitPos + (remaining.startsWith('hora') ? 4 : 3);
    }

    if (!number || number === '-' || number === '+') return null;

    return createToken(number, 'literal', createPosition(startPos, pos));
  }
}

export const quechuaTokenizer = new QuechuaTokenizer();
