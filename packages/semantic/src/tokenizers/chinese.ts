/**
 * Chinese Tokenizer
 *
 * Tokenizes Chinese hyperscript input.
 * Chinese is challenging because:
 * - No spaces between words (like Japanese)
 * - Uses CJK characters (shared with Japanese Kanji)
 * - SVO word order (like English)
 * - Uses prepositions (把, 在, 从, etc.) for grammatical roles
 * - No conjugation (unlike Japanese/Korean)
 * - CSS selectors are embedded ASCII
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { chineseProfile } from '../generators/profiles/chinese';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { ChineseKeywordExtractor } from './extractors/chinese-keyword';
import { ChineseParticleExtractor } from './extractors/chinese-particle';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// Character classification functions moved to extractors/chinese-keyword.ts

// =============================================================================
// Chinese Particles/Prepositions
// =============================================================================

/**
 * Chinese grammatical particles and prepositions.
 * These mark grammatical relationships in Chinese sentences.
 */
const PARTICLES = new Set([
  '把', // ba - marks direct object (BA construction)
  '在', // zai - at, in, on (location)
  '从', // cong - from
  '到', // dao - to, until
  '向', // xiang - towards
  '给', // gei - to, for (recipient)
  '对', // dui - to, towards
  '用', // yong - with, using
  '被', // bei - by (passive)
  '让', // rang - let, allow
  '的', // de - possessive/attributive
  '地', // de - adverbial marker
  '得', // de - complement marker
  '了', // le - completion marker
  '着', // zhe - progressive marker
  '过', // guo - experiential marker
  '吗', // ma - question particle
  '呢', // ne - question/emphasis particle
  '吧', // ba - suggestion particle
]);

// Particle constants and metadata moved to extractors/chinese-particle.ts

// =============================================================================
// Chinese Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words
 * - Event names
 * - Time units
 * - Additional synonyms
 */
const CHINESE_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: '真', normalized: 'true' },
  { native: '假', normalized: 'false' },
  { native: '空', normalized: 'null' },
  { native: '未定义', normalized: 'undefined' },

  // Positional
  { native: '第一个', normalized: 'first' },
  { native: '首个', normalized: 'first' },
  { native: '最后一个', normalized: 'last' },
  { native: '末个', normalized: 'last' },
  { native: '下一个', normalized: 'next' },
  { native: '上一个', normalized: 'previous' },
  { native: '最近的', normalized: 'closest' },
  { native: '父级', normalized: 'parent' },

  // Events
  { native: '点击', normalized: 'click' },
  { native: '双击', normalized: 'dblclick' },
  { native: '输入', normalized: 'input' },
  { native: '变更', normalized: 'change' },
  { native: '改变', normalized: 'change' },
  { native: '提交', normalized: 'submit' },
  { native: '按键', normalized: 'keydown' },
  { native: '释放键', normalized: 'keyup' },
  { native: '鼠标移入', normalized: 'mouseover' },
  { native: '鼠标移出', normalized: 'mouseout' },
  { native: '获得焦点', normalized: 'focus' },
  { native: '失去焦点', normalized: 'blur' },
  { native: '加载', normalized: 'load' },
  { native: '滚动', normalized: 'scroll' },

  // Additional references
  { native: '我的', normalized: 'my' },
  { native: '它的', normalized: 'its' },

  // Time units
  { native: '秒', normalized: 's' },
  { native: '毫秒', normalized: 'ms' },
  { native: '分钟', normalized: 'm' },
  { native: '小时', normalized: 'h' },

  // Logical operators
  { native: '和', normalized: 'and' },
  { native: '或者', normalized: 'or' },
  { native: '或', normalized: 'or' },
  { native: '不', normalized: 'not' },
  { native: '非', normalized: 'not' },
  { native: '是', normalized: 'is' },

  // Additional synonyms not in profile
  { native: '若', normalized: 'if' },
  { native: '不然', normalized: 'else' },
  { native: '循环', normalized: 'repeat' },
  { native: '遍历', normalized: 'for' },
  { native: '每个', normalized: 'for' },
  { native: '为每', normalized: 'for' },
  { native: '中止', normalized: 'halt' },
  { native: '抛', normalized: 'throw' },
  { native: '呼叫', normalized: 'call' },
  { native: '回', normalized: 'return' },
  { native: '脚本', normalized: 'js' },
  { native: '通知', normalized: 'tell' },
  { native: '缺省', normalized: 'default' },
  { native: '初始', normalized: 'init' },
  { native: '动作', normalized: 'behavior' },
  { native: '激发', normalized: 'trigger' },
  { native: '对焦', normalized: 'focus' },
  { native: '模糊', normalized: 'blur' },
  { native: '跳转', normalized: 'go' },
  { native: '导航', normalized: 'go' },
  { native: '抓取', normalized: 'fetch' },
  { native: '获取数据', normalized: 'fetch' },
  { native: '安定', normalized: 'settle' },
  { native: '拿取', normalized: 'take' },
  { native: '取', normalized: 'take' },
  { native: '创建', normalized: 'make' },
  { native: '克隆', normalized: 'clone' },
  { native: '记录', normalized: 'log' },
  { native: '打印', normalized: 'log' },
  { native: '动画', normalized: 'transition' },

  // Modifiers
  { native: '到里面', normalized: 'into' },
  { native: '里', normalized: 'into' },
  { native: '前', normalized: 'before' },
  { native: '后', normalized: 'after' },
  { native: '那么', normalized: 'then' },
  { native: '完', normalized: 'end' },

  // Connectives. Whole-token so the greedy longest-first walk claims the 2-char
  // 作为 (`as`) before its 1-char tail 为 can match the `for` command primary —
  // without it `作为 Number` shattered into `作` + `为`→`for` (`computed-value`).
  // The reverse render (CONNECTIVE_LEXICON.zh) already maps 作为→as.
  { native: '作为', normalized: 'as' },
  { native: '包含', normalized: 'inclusive' },
  { native: '排除', normalized: 'exclusive' },
];

// Chinese time units moved to generic-extractors.ts (NumberExtractor handles them)

// =============================================================================
// Chinese Tokenizer Implementation
// =============================================================================

export class ChineseTokenizer extends BaseTokenizer {
  readonly language = 'zh';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(chineseProfile, CHINESE_EXTRAS);
    // Chinese is analytic - no morphological normalizer needed

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings (includes Chinese quotes)
    this.registerExtractor(new NumberExtractor()); // Numbers (includes Chinese time units)
    this.registerExtractor(new AsciiIdentifierExtractor()); // ASCII identifiers (for mixed content)
    this.registerExtractor(new ChineseParticleExtractor()); // Particles with role metadata
    this.registerExtractor(new ChineseKeywordExtractor()); // Chinese keywords (context-aware)
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
    if (
      token.startsWith('"') ||
      token.startsWith("'") ||
      token.startsWith('\u201C') ||
      token.startsWith('\u2018')
    )
      return 'literal';
    if (/^\d/.test(token)) return 'literal';

    return 'identifier';
  }
}

/**
 * Singleton instance.
 */
export const chineseTokenizer = new ChineseTokenizer();
