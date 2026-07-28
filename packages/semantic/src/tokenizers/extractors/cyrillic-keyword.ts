/**
 * Cyrillic Language Keyword Extractors (Context-Aware)
 *
 * Shared extractors for Cyrillic languages (Russian, Ukrainian)
 * that share similar script but have different phonetic variants.
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';

function createCyrillicCharClassifiers(pattern: RegExp) {
  const isLetter = (char: string) => pattern.test(char);
  // `_` is a word character MID-word only, so an underscore compound keyword
  // (`добавить_в_конец`, `по_умолчанию`, `пока_не`) walks whole and reaches
  // lookupKeyword as one string. Without it the walk stopped at the underscore
  // and each shard was classified on its own — `добавить` is `add`'s primary, so
  // ru/uk `append` and `prepend` silently parsed as `add` with junk roles, and
  // `prepend` (which has no single-word alternative) was unreachable entirely.
  //
  // Deliberately NOT added to `isLetter`: `canExtract` uses that, so a LEADING
  // underscore still isn't a word start (it stays available as a sigil/operator).
  // This matches the Malay/Latin extractors and the framework's own default
  // word-char test, both of which already count `_`.
  const isIdentifierChar = (char: string) => /[0-9_]/.test(char) || pattern.test(char);
  return { isLetter, isIdentifierChar };
}

/**
 * Generic Cyrillic language keyword extractor class.
 */
class CyrillicKeywordExtractor implements ContextAwareExtractor {
  readonly name: string;
  private context?: TokenizerContext;
  private isLetter: (char: string) => boolean;
  private isIdentifierChar: (char: string) => boolean;
  private prepositions: Set<string>;

  constructor(name: string, charPattern: RegExp, prepositions: Set<string>) {
    this.name = name;
    const classifiers = createCyrillicCharClassifiers(charPattern);
    this.isLetter = classifiers.isLetter;
    this.isIdentifierChar = classifiers.isIdentifierChar;
    this.prepositions = prepositions;
  }

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    // A leading apostrophe is a string-literal quote, not a word start. The
    // Ukrainian char class includes the apostrophe because it is an internal
    // letter (п'ять, об'єкт) — valid mid-word (the extract loop's
    // isIdentifierChar keeps it) but never word-initial. Without this guard a
    // keyword starts on the opening `'` of a literal like 'Saved!', swallowing
    // the quote and splitting the string at the first non-letter (issue: uk
    // make-toast-element). No-op for Russian, whose char class has no
    // apostrophe.
    if (char === "'") return false;
    return this.isLetter(char);
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
// Russian
// =============================================================================

/**
 * Russian prepositions with phonetic variants (в/во, с/со, к/ко, о/об/обо).
 * These mark grammatical cases and semantic roles.
 */
const RUSSIAN_PREPOSITIONS = new Set([
  'в', // in
  'во', // in (before consonant clusters)
  'на', // on
  'с', // with, from
  'со', // with (before consonant clusters)
  'к', // to, towards
  'ко', // to (before consonant clusters)
  'о', // about
  'об', // about (before vowels)
  'обо', // about (before consonant clusters)
  'у', // at, by
  'от', // from
  'до', // until, to
  'из', // from, out of
  'за', // behind, for
  'по', // along, by
  'под', // under
  'над', // above
  'перед', // in front of
  'передо', // in front of (before consonant clusters)
  'между', // between
  'через', // through
  'без', // without
  'для', // for
  'при', // at, during
  'про', // about
  'после', // after
  'вокруг', // around
  'против', // against
  'вместо', // instead of
  'кроме', // except
  'среди', // among
]);

export function createRussianExtractors(): ContextAwareExtractor[] {
  return [
    new CyrillicKeywordExtractor(
      'russian-keyword',
      /[a-zA-Z\u0430-\u044f\u0410-\u042f\u0451\u0401]/,
      RUSSIAN_PREPOSITIONS
    ),
  ];
}

// =============================================================================
// Ukrainian
// =============================================================================

/**
 * Ukrainian prepositions (similar to Russian but with unique letters і, ї, є, ґ).
 * Note: Ukrainian uses 'в/у' for 'in', 'з/із/зі' for 'with/from'.
 */
const UKRAINIAN_PREPOSITIONS = new Set([
  'в', // in
  'у', // in
  'на', // on
  'з', // with, from
  'із', // with (variant)
  'зі', // with (before consonant clusters)
  'до', // to
  'від', // from
  'о', // about
  'об', // about (before vowels)
  'при', // at, during
  'для', // for
  'під', // under
  'над', // above
  'перед', // in front of
  'між', // between
  'через', // through
  'без', // without
  'по', // along, by
  'за', // behind, for
  'про', // about
  'після', // after
  'навколо', // around
  'проти', // against
  'замість', // instead of
  'крім', // except
  'серед', // among
  'к', // to (less common)
]);

export function createUkrainianExtractors(): ContextAwareExtractor[] {
  return [
    new CyrillicKeywordExtractor(
      'ukrainian-keyword',
      /[a-zA-Z\u0430-\u044f\u0410-\u042f\u0456\u0406\u0457\u0407\u0454\u0404\u0491\u0490\u044c\u042c']/,
      UKRAINIAN_PREPOSITIONS
    ),
  ];
}
