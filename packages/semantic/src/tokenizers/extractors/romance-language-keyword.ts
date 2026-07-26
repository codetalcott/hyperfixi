/**
 * Romance Language Keyword Extractors (Context-Aware)
 *
 * Shared extractors for Romance languages (Portuguese, French, German, Italian)
 * that have similar structure to Spanish but different character sets.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

function createLatinCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  const isIdentifierChar = (char: string) => /[0-9]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

/**
 * Generic Romance language keyword extractor class.
 */
class RomanceKeywordExtractor implements ContextAwareExtractor {
  readonly name: string;
  private context?: TokenizerContext;
  private isLetter: (char: string) => boolean;
  private isIdentifierChar: (char: string) => boolean;
  private prepositions: Set<string>;

  constructor(name: string, charPattern: RegExp, prepositions: Set<string>) {
    this.name = name;
    const classifiers = createLatinCharClassifiers(charPattern);
    this.isLetter = classifiers.isLetter;
    this.isIdentifierChar = classifiers.isIdentifierChar;
    this.prepositions = prepositions;
  }

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    return this.isLetter(input[position]);
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error(`${this.name}: context not set`);
    }

    let pos = position;
    let word = '';

    while (pos < input.length && this.isIdentifierChar(input[pos])) {
      word += input[pos++];
    }

    if (!word) return null;

    const lower = word.toLowerCase();
    const isPreposition = this.prepositions.has(lower);

    // Look up keyword entry
    const keywordEntry = this.context.lookupKeyword(lower);
    const normalized =
      keywordEntry && keywordEntry.normalized !== keywordEntry.native
        ? keywordEntry.normalized
        : undefined;

    // Try morphological normalization if available
    let morphNormalized: string | undefined;
    if (!keywordEntry && this.context.normalizer) {
      const morphResult = this.context.normalizer.normalize(word);
      if (morphResult.stem !== word && morphResult.confidence >= 0.7) {
        const stemEntry = this.context.lookupKeyword(morphResult.stem);
        if (stemEntry) {
          morphNormalized = stemEntry.normalized;
        }
      }
    }

    return {
      value: word,
      length: pos - position,
      metadata: {
        normalized: normalized || morphNormalized,
        isPreposition,
      },
    };
  }
}

// =============================================================================
// Portuguese
// =============================================================================

const PORTUGUESE_PREPOSITIONS = new Set([
  'em',
  'a',
  'de',
  'para',
  'com',
  'sem',
  'por',
  'sobre',
  'entre',
  'antes',
  'depois',
  'dentro',
  'fora',
  'ao',
  'do',
  'da',
  'no',
  'na',
]);

export function createPortugueseExtractors(): ContextAwareExtractor[] {
  return [
    new RomanceKeywordExtractor(
      'portuguese-keyword',
      /[a-zA-Z\u00e1\u00e2\u00e3\u00e9\u00ea\u00ed\u00f3\u00f4\u00f5\u00fa\u00e7\u00c1\u00c2\u00c3\u00c9\u00ca\u00cd\u00d3\u00d4\u00d5\u00da\u00c7]/,
      PORTUGUESE_PREPOSITIONS
    ),
  ];
}

// =============================================================================
// French
// =============================================================================

const FRENCH_PREPOSITIONS = new Set([
  'dans',
  'à',
  'de',
  'pour',
  'avec',
  'sans',
  'sur',
  'sous',
  'entre',
  'avant',
  'après',
  'dedans',
  'dehors',
  'au',
  'du',
  'des',
]);

export function createFrenchExtractors(): ContextAwareExtractor[] {
  return [
    new RomanceKeywordExtractor(
      'french-keyword',
      /[a-zA-Z\u00e0\u00e2\u00e6\u00e7\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00ff\u0153\u00c0\u00c2\u00c6\u00c7\u00c9\u00c8\u00ca\u00cb\u00cf\u00ce\u00d4\u00d9\u00db\u00dc\u0178\u0152]/,
      FRENCH_PREPOSITIONS
    ),
  ];
}

// =============================================================================
// German
// =============================================================================

const GERMAN_PREPOSITIONS = new Set([
  'in',
  'an',
  'auf',
  'zu',
  'von',
  'mit',
  'ohne',
  'für',
  'über',
  'unter',
  'zwischen',
  'vor',
  'nach',
  'bei',
  'aus',
  'durch',
]);

export function createGermanExtractors(): ContextAwareExtractor[] {
  return [
    new RomanceKeywordExtractor(
      'german-keyword',
      /[a-zA-Z\u00e4\u00f6\u00fc\u00df\u00c4\u00d6\u00dc\u1e9e]/,
      GERMAN_PREPOSITIONS
    ),
  ];
}

// =============================================================================
// Italian
// =============================================================================

const ITALIAN_PREPOSITIONS = new Set([
  'in',
  'a',
  'di',
  'da',
  'con',
  'su',
  'per',
  'tra',
  'fra',
  'dopo',
  'prima',
  'dentro',
  'fuori',
  'sopra',
  'sotto',
  // Articulated prepositions (preposition + article)
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

export function createItalianExtractors(): ContextAwareExtractor[] {
  return [
    new RomanceKeywordExtractor(
      'italian-keyword',
      /[a-zA-Z\u00e0\u00e8\u00e9\u00ec\u00ed\u00ee\u00f2\u00f3\u00f9\u00fa\u00c0\u00c8\u00c9\u00cc\u00cd\u00ce\u00d2\u00d3\u00d9\u00da]/,
      ITALIAN_PREPOSITIONS
    ),
  ];
}
