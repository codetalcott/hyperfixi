/**
 * Thai Tokenizer
 *
 * Tokenizes Thai hyperscript input.
 * Thai is an isolating SVO language with:
 * - Thai script (U+0E00-U+0E7F)
 * - No spaces between words (like Chinese/Japanese)
 * - Prepositions for grammatical marking
 * - CSS selectors are embedded ASCII
 *
 * This tokenizer derives keywords from the Thai profile (single source of truth)
 * with extras for literals, positional words, and event names.
 */

import type { TokenKind } from '../types';
import type { KeywordEntry } from './base';
import { BaseTokenizer } from './base';
import { thaiProfile } from '../generators/profiles/thai';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createThaiExtractors } from './extractors/thai-keyword';

// =============================================================================
// Thai-Specific Keywords (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Positional words (first, last, next, etc.)
 * - Event names (click, change, submit, etc.)
 * - Additional modifiers (when, to, with)
 */
const THAI_EXTRAS: KeywordEntry[] = [
  // Values/Literals
  { native: 'จริง', normalized: 'true' },
  { native: 'เท็จ', normalized: 'false' },
  { native: 'ว่าง', normalized: 'null' },
  { native: 'ไม่กำหนด', normalized: 'undefined' },

  // Positional
  { native: 'แรก', normalized: 'first' },
  { native: 'สุดท้าย', normalized: 'last' },
  { native: 'ถัดไป', normalized: 'next' },
  { native: 'ก่อนหน้า', normalized: 'previous' },
  { native: 'ใกล้สุด', normalized: 'closest' },
  { native: 'ต้นทาง', normalized: 'parent' },

  // Events
  { native: 'คลิก', normalized: 'click' },
  { native: 'เปลี่ยนแปลง', normalized: 'change' },
  { native: 'ส่ง', normalized: 'submit' },
  { native: 'อินพุต', normalized: 'input' },
  { native: 'โหลด', normalized: 'load' },
  { native: 'เลื่อน', normalized: 'scroll' },
  // `ปรับขนาด` (resize) — dict th.ts `resize`; without it the greedy scan
  // shattered it into ป + รับ(→take) + ขนาด (window-resize/th rendered
  // `on ป take ขนาด …`). Precedent: hi आकार_बदलें, tr boyutlandırma.
  { native: 'ปรับขนาด', normalized: 'resize' },

  // Additional modifiers
  { native: 'เวลา', normalized: 'when' },
  { native: 'ไปยัง', normalized: 'to' },
  { native: 'ด้วย', normalized: 'with' },
  { native: 'และ', normalized: 'and' },
  { native: 'รวม', normalized: 'inclusive' },
  { native: 'ยกเว้น', normalized: 'exclusive' },
];

// =============================================================================
// Thai Tokenizer Class
// =============================================================================

export class ThaiTokenizer extends BaseTokenizer {
  readonly language = 'th';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(thaiProfile, THAI_EXTRAS);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractors(createThaiExtractors()); // Thai keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(value: string): TokenKind {
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(value)) return 'keyword';
    // Check event modifiers BEFORE selectors (.once vs .active)
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(value))
      return 'event-modifier';
    if (
      value.startsWith('.') ||
      value.startsWith('#') ||
      value.startsWith('[') ||
      value.startsWith('*') ||
      value.startsWith('<')
    )
      return 'selector';
    if (value.startsWith(':')) return 'identifier';
    if (value.startsWith('"') || value.startsWith("'")) return 'literal';
    if (/^-?\d/.test(value)) return 'literal';
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (value.startsWith('/') || value.startsWith('./') || value.startsWith('http')) return 'url';
    return 'identifier';
  }
}

export const thaiTokenizer = new ThaiTokenizer();
