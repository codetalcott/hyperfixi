/**
 * Hindi Tokenizer
 *
 * Tokenizes Hindi hyperscript input.
 * Hindi is a fusional SOV language with:
 * - Devanagari script (U+0900-U+097F)
 * - Postposition markers (को, में, पर, से, etc.)
 * - Verb conjugations with stem + suffix patterns
 * - CSS selectors are embedded ASCII
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { HindiMorphologicalNormalizer } from './morphology/hindi-normalizer';
import { hindiProfile } from '../generators/profiles/hindi';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { HindiKeywordExtractor } from './extractors/hindi-keyword';
import { HindiParticleExtractor } from './extractors/hindi-particle';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// Character classification functions moved to extractors/hindi-keyword.ts

// =============================================================================
// Hindi Postpositions
// =============================================================================

/**
 * Single-word postpositions (for classifyToken only).
 * Actual extraction is handled by HindiParticleExtractor.
 */
const SINGLE_POSTPOSITIONS = new Set(['को', 'में', 'पर', 'से', 'का', 'की', 'के', 'तक', 'ने']);

// =============================================================================
// Hindi Extras (not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the Hindi profile.
 * Profile provides: commands, references, possessives, roleMarkers
 * Extras provide: values, positional, events, modifiers
 */
const HINDI_EXTRAS: KeywordEntry[] = [
  // Fused mousedown/mouseup (dict emits these WITHOUT `_` since the tokenizer
  // splits on it — see hi.ts events note). repeat-until-event / handler events.
  { native: 'माउसनीचे', normalized: 'mousedown' },
  { native: 'माउसऊपर', normalized: 'mouseup' },
  // window-resize compound: the dict emits underscore-joined आकार_बदलें
  // (resize), which the `_` split shattered into आकार + _ + बदलें — and the
  // stranded बदलें (toggle verb) anchored a PHANTOM toggle command while the
  // event slot grabbed the call target (the hi window-resize mis-parse,
  // Arc F). Whole-token entry mirrors qu's hatun_kay precedent (quechua.ts).
  { native: 'आकार_बदलें', normalized: 'resize' },

  // Values
  { native: 'सच', normalized: 'true' },
  { native: 'सत्य', normalized: 'true' },
  { native: 'झूठ', normalized: 'false' },
  { native: 'असत्य', normalized: 'false' },
  { native: 'खाली', normalized: 'null' },
  { native: 'अपरिभाषित', normalized: 'undefined' },

  // Positional
  { native: 'पहला', normalized: 'first' },
  { native: 'अंतिम', normalized: 'last' },
  { native: 'अगला', normalized: 'next' },
  { native: 'पिछला', normalized: 'previous' },
  { native: 'निकटतम', normalized: 'closest' },
  { native: 'मूल', normalized: 'parent' },

  // Events
  { native: 'क्लिक', normalized: 'click' },
  { native: 'परिवर्तन', normalized: 'change' },
  { native: 'जमा', normalized: 'submit' },
  { native: 'इनपुट', normalized: 'input' },
  { native: 'लोड', normalized: 'load' },
  { native: 'स्क्रॉल', normalized: 'scroll' },

  // Additional modifiers not in profile
  { native: 'को', normalized: 'to' },
  { native: 'के साथ', normalized: 'with' },

  // Connectives. Whole-token underscore-joined surface, mirroring आकार_बदलें
  // above: the `_` split shattered के_रूप_में (`as`) into के + _ + रूप + _ + में
  // (`computed-value`). Registering it lets the tokenizer's underscore-recovery
  // block adopt the whole run. The reverse render (CONNECTIVE_LEXICON.hi) already
  // maps के_रूप_में→as; it was a documented dead entry awaiting exactly this.
  { native: 'के_रूप_में', normalized: 'as' },

  // `या` (or) — dict hi.ts `or`; already matched by surface in the parser's
  // OR_KEYWORDS (event-adjacent `or` was absorbed), but every raw-expression
  // occurrence leaked verbatim (when-multiple-changes). Phantom-safe: `or` is
  // neither an ActionType nor a command schema.
  { native: 'या', normalized: 'or' },
  // `बदलने पर` (changes / "on changing") — dict hi.ts `changes`, SPACED whole
  // phrase via the multi-word keyword walk (`के साथ` precedent above). NEVER
  // register bare `बदलने`: the stem `बदल` is a registered toggle-verb
  // alternative (patterns/toggle.ts) and the morphological normalizer strips
  // conjugations — a bare entry re-opens the आकार_बदलें phantom-toggle class.
  { native: 'बदलने पर', normalized: 'changes' },
  { native: 'अक्षर', normalized: 'characters' },
];

// =============================================================================
// Hindi Tokenizer Class
// =============================================================================

export class HindiTokenizer extends BaseTokenizer {
  readonly language = 'hi';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(hindiProfile, HINDI_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.normalizer = new HindiMorphologicalNormalizer();

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs, variable refs
    this.registerExtractor(new StringLiteralExtractor()); // Strings
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractor(new HindiParticleExtractor()); // Particles with role metadata
    this.registerExtractor(new HindiKeywordExtractor()); // Hindi keywords (context-aware)
    this.registerExtractor(new AsciiIdentifierExtractor()); // ASCII identifiers (for mixed content)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(value: string): TokenKind {
    if (SINGLE_POSTPOSITIONS.has(value)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(value)) return 'keyword';
    // Check URLs before selectors (./path vs .class)
    if (
      value.startsWith('/') ||
      value.startsWith('./') ||
      value.startsWith('../') ||
      value.startsWith('http')
    )
      return 'url';
    // Check for event modifiers before CSS selectors
    if (/^\.(once|prevent|stop|debounce|throttle|queue)(\(.*\))?$/.test(value))
      return 'event-modifier';
    if (
      value.startsWith('#') ||
      value.startsWith('.') ||
      value.startsWith('[') ||
      value.startsWith('*') ||
      value.startsWith('<')
    )
      return 'selector';
    if (value.startsWith('"') || value.startsWith("'")) return 'literal';
    if (/^\d/.test(value)) return 'literal';
    if (value.startsWith(':')) return 'identifier';

    return 'identifier';
  }

  // extractNumber() method removed - now handled by NumberExtractor
}

// =============================================================================
// Export
// =============================================================================

export const hindiTokenizer = new HindiTokenizer();
