/**
 * Nearley-Based Language Detector (Phase 5.1)
 *
 * Detects the language of hyperscript input using Earley-based ambiguity
 * resolution. Replaces ad-hoc language detection with a data-driven
 * approach generated from semantic profiles.
 *
 * Detection strategy:
 * 1. Script detection: Non-Latin scripts instantly identify the language
 *    (CJK → ja/zh, Hangul → ko, Arabic → ar, Cyrillic → ru/uk, etc.)
 * 2. Keyword matching: Tokenize input, look up each token in the
 *    profile-generated keyword → language map
 * 3. Nearley ambiguity resolution: When tokens match multiple languages,
 *    use Earley parsing to score by structural context
 * 4. Confidence threshold: Only return a result above minimum confidence
 *
 * Bundle impact: ~3 KB (Nearley runtime + generated keyword map)
 */

import * as nearley from 'nearley';
import { KEYWORD_LANGUAGE_MAP, SCRIPT_RANGES } from './generated/language-grammar';

// =============================================================================
// Types
// =============================================================================

export interface LanguageDetectionResult {
  /** Detected language code (ISO 639-1) */
  readonly language: string;
  /** Confidence score (0-1) */
  readonly confidence: number;
  /** Alternative language candidates with scores */
  readonly alternatives: readonly LanguageCandidate[];
  /** Detection method used */
  readonly method: 'script' | 'keyword' | 'nearley';
}

export interface LanguageCandidate {
  readonly language: string;
  readonly score: number;
  readonly keywordMatches: number;
}

// =============================================================================
// Script-Based Detection (Phase 1: Instant for non-Latin)
// =============================================================================

function detectByScript(input: string): string | null {
  const languageCounts = new Map<string, number>();

  for (const char of input) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;

    for (const range of SCRIPT_RANGES) {
      if (codePoint >= range.start && codePoint <= range.end) {
        for (const lang of range.languages) {
          languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
        }
      }
    }
  }

  if (languageCounts.size === 0) return null;

  // Return language with most non-Latin characters
  let bestLang = '';
  let bestCount = 0;
  for (const [lang, count] of Array.from(languageCounts)) {
    if (count > bestCount) {
      bestLang = lang;
      bestCount = count;
    }
  }

  // Disambiguate CJK: Japanese uses hiragana/katakana, Chinese doesn't
  if (bestLang === 'ja' || bestLang === 'zh') {
    const hasKana = /[\u3040-\u30FF]/.test(input);
    return hasKana ? 'ja' : 'zh';
  }

  return bestLang;
}

// =============================================================================
// Word-Level Tokenizer for Nearley
// =============================================================================

interface WordToken {
  value: string;
  offset: number;
}

/**
 * Simple word-level lexer for Nearley.
 * Splits on whitespace and punctuation, preserving token offsets.
 */
class WordLexer {
  private tokens: WordToken[] = [];
  private pos = 0;

  reset(data: string): void {
    this.tokens = [];
    this.pos = 0;

    // Split into words (handle CJK characters individually)
    const regex =
      /[\u3040-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0400-\u04FF\u0900-\u09FF\u0E00-\u0E7F]+|[a-zA-Z\u00C0-\u024F]+(?:['-][a-zA-Z\u00C0-\u024F]+)*|[#.@][a-zA-Z0-9_-]+|'[^']*'/g;
    let match;
    while ((match = regex.exec(data)) !== null) {
      this.tokens.push({ value: match[0].toLowerCase(), offset: match.index });
    }
  }

  next(): WordToken | undefined {
    if (this.pos >= this.tokens.length) return undefined;
    return this.tokens[this.pos++];
  }

  save(): { pos: number } {
    return { pos: this.pos };
  }

  formatError(token: WordToken): string {
    return `Unexpected token "${token.value}" at offset ${token.offset}`;
  }

  has(name: string): boolean {
    return name === 'word';
  }
}

// =============================================================================
// Nearley Grammar for Language Detection
// =============================================================================

/**
 * Build a Nearley grammar that classifies word tokens by language.
 *
 * Grammar structure:
 *   main → token+
 *   token → (any word that matches a keyword → tagged with language(s))
 *         | (any other word → tagged as unknown)
 *
 * The Earley algorithm handles ambiguity when one word matches multiple
 * languages, maintaining all possible parse paths.
 */
function buildDetectionGrammar(): nearley.CompiledRules {
  const rules: nearley.CompiledRules['ParserRules'] = [];

  // main → tokens
  rules.push({
    name: 'main',
    symbols: ['tokens'],
    postprocess: (d: unknown[][]) => d[0],
  });

  // tokens → tokens token | token
  rules.push({
    name: 'tokens',
    symbols: ['tokens', 'token'],
    postprocess: (d: unknown[][]) => [...(d[0] as unknown[]), d[1]],
  });

  rules.push({
    name: 'tokens',
    symbols: ['token'],
    postprocess: (d: unknown[]) => [d[0]],
  });

  // For each keyword, create a token rule that matches it
  for (const [keyword, languages] of Object.entries(KEYWORD_LANGUAGE_MAP)) {
    rules.push({
      name: 'token',
      symbols: [{ test: (t: WordToken) => t.value === keyword }],
      postprocess: () => ({ languages, keyword }),
    });
  }

  // Fallback: any word not matching a keyword
  rules.push({
    name: 'token',
    symbols: [{ test: () => true }],
    postprocess: () => null,
  });

  return {
    Lexer: new WordLexer(),
    ParserRules: rules,
    ParserStart: 'main',
  };
}

// Lazy-initialized grammar
let cachedGrammar: nearley.Grammar | null = null;

function getGrammar(): nearley.Grammar {
  if (!cachedGrammar) {
    cachedGrammar = nearley.Grammar.fromCompiled(buildDetectionGrammar());
  }
  return cachedGrammar;
}

// =============================================================================
// Keyword Scoring (without Nearley for simplicity/speed)
// =============================================================================

function scoreByKeywords(input: string): Map<string, number> {
  const scores = new Map<string, number>();

  // Tokenize: split on whitespace and extract words
  const words = input
    .toLowerCase()
    .match(
      /[\u3040-\u9FFF\uAC00-\uD7AF\u0600-\u06FF\u0590-\u05FF\u0400-\u04FF\u0900-\u09FF\u0E00-\u0E7F]+|[a-zA-Z\u00C0-\u024F]+(?:['-][a-zA-Z\u00C0-\u024F]+)*/g
    );

  if (!words) return scores;

  for (const word of words) {
    const languages = KEYWORD_LANGUAGE_MAP[word];
    if (languages) {
      // Weight: keywords unique to one language score higher
      const weight = 1 / languages.length;
      for (const lang of languages) {
        scores.set(lang, (scores.get(lang) || 0) + weight);
      }
    }
  }

  return scores;
}

// =============================================================================
// Nearley-Based Disambiguation
// =============================================================================

function disambiguateWithNearley(input: string): Map<string, number> | null {
  try {
    const grammar = getGrammar();
    const parser = new nearley.Parser(grammar);
    parser.feed(input);

    if (parser.results.length === 0) return null;

    // Score each parse result
    const scores = new Map<string, number>();

    // Take the first result (Earley parser returns all valid parses)
    const result = parser.results[0] as Array<{
      languages: readonly string[];
      keyword: string;
    } | null>;
    if (!result) return null;

    for (const token of result) {
      if (token && token.languages) {
        const weight = 1 / token.languages.length;
        for (const lang of token.languages) {
          scores.set(lang, (scores.get(lang) || 0) + weight);
        }
      }
    }

    return scores;
  } catch {
    // Nearley parse error — fall back to keyword scoring
    return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Detect the language of hyperscript input.
 *
 * Uses a three-phase detection strategy:
 * 1. Script detection (instant for non-Latin: CJK, Arabic, Cyrillic, etc.)
 * 2. Keyword scoring (fast lookup in profile-generated map)
 * 3. Nearley disambiguation (Earley parsing for ambiguous Latin-script inputs)
 *
 * @param input - Hyperscript code to detect language of
 * @param registeredLanguages - Optional set of registered languages to filter to
 * @returns Detection result with language, confidence, and alternatives
 */
export function detectLanguage(
  input: string,
  registeredLanguages?: ReadonlySet<string>
): LanguageDetectionResult {
  // Phase 1: Script detection (instant for non-Latin)
  const scriptLang = detectByScript(input);
  if (scriptLang) {
    // Filter by registered languages
    if (registeredLanguages && !registeredLanguages.has(scriptLang)) {
      // Script detected a language that isn't registered — fall through to keyword scoring
    } else {
      return {
        language: scriptLang,
        confidence: 0.95,
        alternatives: [],
        method: 'script',
      };
    }
  }

  // Phase 2: Keyword scoring
  const keywordScores = scoreByKeywords(input);

  // Phase 3: Nearley disambiguation for close matches
  let nearleyScores: Map<string, number> | null = null;
  if (keywordScores.size > 1) {
    // Only use Nearley when there's ambiguity
    nearleyScores = disambiguateWithNearley(input);
  }

  // Merge scores (keyword + nearley)
  const finalScores = new Map<string, number>();
  for (const [lang, score] of Array.from(keywordScores)) {
    if (registeredLanguages && !registeredLanguages.has(lang)) continue;
    finalScores.set(lang, score);
  }

  if (nearleyScores) {
    for (const [lang, score] of Array.from(nearleyScores)) {
      if (registeredLanguages && !registeredLanguages.has(lang)) continue;
      // Nearley scores supplement keyword scores
      const existing = finalScores.get(lang) || 0;
      finalScores.set(lang, existing + score * 0.5);
    }
  }

  // Sort by score
  const sorted = Array.from(finalScores.entries()).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    // No matches — default to English
    return {
      language: 'en',
      confidence: 0.1,
      alternatives: [],
      method: 'keyword',
    };
  }

  // Calculate confidence
  const [bestLang, bestScore] = sorted[0];
  const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);
  const confidence = totalScore > 0 ? bestScore / totalScore : 0;

  // Build alternatives
  const alternatives: LanguageCandidate[] = sorted.slice(1, 4).map(([lang, score]) => ({
    language: lang,
    score: totalScore > 0 ? score / totalScore : 0,
    keywordMatches: Math.round(keywordScores.get(lang) || 0),
  }));

  return {
    language: bestLang,
    confidence: Math.min(confidence, 0.99),
    alternatives,
    method: nearleyScores ? 'nearley' : 'keyword',
  };
}

/**
 * Quick check if input likely needs language detection.
 * Returns false if input is clearly English or explicit syntax.
 */
export function needsLanguageDetection(input: string): boolean {
  // Explicit syntax is language-agnostic
  if (input.startsWith('[') && input.endsWith(']')) return false;

  // Check for non-ASCII characters (likely non-English)
  if (/[^\x00-\x7F]/.test(input)) return true;

  // Check if input contains non-English keywords
  const words = input.toLowerCase().split(/\s+/);
  for (const word of words) {
    const languages = KEYWORD_LANGUAGE_MAP[word];
    if (languages && !languages.includes('en')) {
      return true; // Keyword that doesn't match English
    }
  }

  return false;
}
