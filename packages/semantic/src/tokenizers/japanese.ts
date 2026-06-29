/**
 * Japanese Tokenizer
 *
 * Tokenizes Japanese hyperscript input.
 * Japanese is challenging because:
 * - No spaces between words
 * - Particles (助詞) mark grammatical roles
 * - Mixed scripts (hiragana, katakana, kanji, romaji)
 * - CSS selectors are embedded ASCII
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { JapaneseMorphologicalNormalizer } from './morphology/japanese-normalizer';
import { japaneseProfile } from '../generators/profiles/japanese';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { JapaneseKeywordExtractor } from './extractors/japanese-keyword';
import { JapaneseParticleExtractor } from './extractors/japanese-particle';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// Character classification functions moved to extractors/japanese-keyword.ts

// =============================================================================
// Japanese Particles
// =============================================================================

/**
 * Japanese particles that mark grammatical roles.
 * These are single hiragana characters that appear after nouns/verbs.
 */
const PARTICLES = new Set([
  'を', // wo - object marker
  'に', // ni - destination, time
  'で', // de - location of action, means
  'から', // kara - from
  'まで', // made - until
  'へ', // e - direction
  'と', // to - and, with
  'の', // no - possessive
  'が', // ga - subject marker
  'は', // wa - topic marker
  'も', // mo - also
  'より', // yori - than, from
]);

// Particle constants and metadata moved to extractors/japanese-particle.ts

// =============================================================================
// Japanese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Alternative reference forms (私 for me)
 * - Conditional event forms (temporal markers)
 * - Time units
 *
 * Moved to profile alternatives:
 * - そして → and.alternatives
 * - ならば, なら → then.alternatives
 * - ブラー → blur.alternatives
 * - 私の, その → possessive.keywords (already there)
 */
const JAPANESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: '真', normalized: 'true' },
  { native: '偽', normalized: 'false' },
  { native: 'ヌル', normalized: 'null' },
  { native: '未定義', normalized: 'undefined' },

  // Positional
  { native: '最初', normalized: 'first' },
  { native: '最後', normalized: 'last' },
  { native: '次', normalized: 'next' },
  { native: '前', normalized: 'previous' },
  { native: '最も近い', normalized: 'closest' },
  { native: '親', normalized: 'parent' },

  // Events
  { native: 'クリック', normalized: 'click' },
  { native: '変更', normalized: 'change' },
  { native: '送信', normalized: 'submit' },
  { native: '入力', normalized: 'input' },
  { native: 'ロード', normalized: 'load' },
  // The i18n dict emits the native `読み込み` for `load` (not the loanword `ロード`);
  // recognize it so `on load` events type as a literal, not a bare expression.
  { native: '読み込み', normalized: 'load' },
  { native: 'スクロール', normalized: 'scroll' },
  { native: 'キーダウン', normalized: 'keydown' },
  { native: 'キーアップ', normalized: 'keyup' },
  { native: 'マウスオーバー', normalized: 'mouseover' },
  { native: 'マウスアウト', normalized: 'mouseout' },
  // The i18n dict emits マウス押下/マウス解放 for mousedown/mouseup (repeat-until-event);
  // recognize them so the event types as a literal, not a bare expression.
  { native: 'マウス押下', normalized: 'mousedown' },
  { native: 'マウス解放', normalized: 'mouseup' },

  // Conjunctions. `または` (or) must be listed so the keyword extractor's
  // longest-match keeps it whole — otherwise the profile's `and` primary `また`
  // (a 2-char prefix of the 3-char `または`) wins and the trailing `は` falls to
  // the topic-particle extractor (`また`→and + `は`), destroying the multi-event
  // `or` conjunction (`on click または keypress …`). `と`/`そして`/`また` already
  // cover `and` via the profile; only `or` is missing.
  { native: 'または', normalized: 'or' },

  // References (alternative forms not in profile)
  { native: '私', normalized: 'me' }, // Alternative to 自分 (jibun)

  // Note: Attached particle forms (を切り替え, を追加, etc.) are intentionally NOT included
  // because they would cause ambiguous parsing. The separate particle + verb pattern
  // (を + 切り替え) is preferred for consistent semantic analysis.

  // Conditional event forms (temporal markers - special event syntax)
  { native: 'したら', normalized: 'on' },
  { native: 'すると', normalized: 'on' },
  { native: '時に', normalized: 'on' },

  // Time units
  { native: '秒', normalized: 's' },
  { native: 'ミリ秒', normalized: 'ms' },
  { native: '分', normalized: 'm' },
  { native: '時間', normalized: 'h' },
];

// Japanese time units moved to generic-extractors.ts (NumberExtractor handles them)

// =============================================================================
// Japanese Tokenizer Implementation
// =============================================================================

export class JapaneseTokenizer extends BaseTokenizer {
  readonly language = 'ja';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(japaneseProfile, JAPANESE_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new JapaneseMorphologicalNormalizer();

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers (includes Japanese time units)
    this.registerExtractor(new AsciiIdentifierExtractor()); // ASCII identifiers (counter, click, etc.)
    this.registerExtractor(new JapaneseParticleExtractor()); // Particles with role metadata
    this.registerExtractor(new JapaneseKeywordExtractor()); // Japanese keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    if (PARTICLES.has(token)) return 'particle';
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
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('「')) return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }

  // extractJapaneseWord(), extractAsciiWord(), and extractJapaneseNumber() methods removed
  // Now handled by JapaneseKeywordExtractor and NumberExtractor
}

/**
 * Singleton instance.
 */
export const japaneseTokenizer = new JapaneseTokenizer();
