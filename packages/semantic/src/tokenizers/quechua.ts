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

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { quechuaProfile } from '../generators/profiles/quechua';
import { quechuaMorphologicalNormalizer } from './morphology/quechua-normalizer';
import { NumberExtractor, OperatorExtractor, PunctuationExtractor } from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createQuechuaKeywordExtractor } from './extractors/quechua-keyword';
import type { ValueExtractor, ExtractionResult } from './value-extractor-types';

// =============================================================================
// Quechua-Specific String Literal Extractor
// =============================================================================

/**
 * Custom string literal extractor for Quechua.
 *
 * Accepts both double (") and single (') quotes. Single quotes are safe here
 * even though Quechua glottalizes with an apostrophe (`ch'usaq`, `ñit'iy`):
 * those apostrophes are always MID-word, and this extractor is only consulted at
 * a token-start position (after whitespace) — no Quechua word *starts* with `'`,
 * and the word/keyword extractor (registered after this one) consumes the whole
 * glottalized word before its apostrophe is ever a token boundary. Without single
 * quotes the corpus `'Saved!'` (make-toast) tokenized as `'Saved` + `!` + `'`.
 */
class QuechuaStringLiteralExtractor implements ValueExtractor {
  readonly name = 'quechua-string-literal';

  canExtract(input: string, position: number): boolean {
    return input[position] === '"' || input[position] === "'";
  }

  extract(input: string, position: number): ExtractionResult | null {
    const quote = input[position];
    let value = quote;
    let pos = position + 1;

    while (pos < input.length) {
      const char = input[pos];
      if (char === quote) {
        value += char;
        return { value, length: value.length };
      }
      if (char === '\\' && pos + 1 < input.length) {
        value += char + input[pos + 1];
        pos += 2;
      } else {
        value += char;
        pos++;
      }
    }

    return null; // Unclosed string
  }
}

// =============================================================================
// Quechua Suffixes (used in classifyToken)
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
  // `cheqaq` ("true/correct") is the form the i18n dict emits for `true`
  // (set-attribute `@disabled ta cheqaq man …`); without it the value tokenized
  // as a bare identifier and `set @disabled to <undefined>` ran. arí/ari ("yes")
  // are the colloquial alternates, kept for input tolerance.
  { native: 'cheqaq', normalized: 'true' },
  { native: 'arí', normalized: 'true' },
  { native: 'ari', normalized: 'true' },
  { native: 'manan', normalized: 'false' },
  { native: 'mana', normalized: 'false' },
  { native: "ch'usaq", normalized: 'null' },
  { native: 'chusaq', normalized: 'null' },
  { native: 'mana riqsisqa', normalized: 'undefined' },

  // Positional
  // Put-position words (`put X before/after Y`): the i18n dict emits the locative
  // -pi forms ñawpaqpi (before) / qhepapi (after). They must be exact single-token
  // entries ABOVE the bare ñawpaq/qhipa (longest-first), else the greedy loop binds
  // the prefix (ñawpaq→first) and strands `pi` — which the SOV parser then mis-reads
  // as the event marker, and the position word is lost from the put.
  { native: 'ñawpaqpi', normalized: 'before' },
  { native: 'nawpaqpi', normalized: 'before' },
  { native: 'qhepapi', normalized: 'after' },
  { native: 'qhipapi', normalized: 'after' },
  { native: 'ñawpaq', normalized: 'first' },
  { native: 'nawpaq', normalized: 'first' },
  { native: 'qhipa', normalized: 'last' },
  { native: 'hamuq', normalized: 'next' },
  // The i18n dict emits the -ntin/-nin derived forms ("the one after/before").
  // Without exact entries the morphology binds their PREFIXES — qhipa(ntin)
  // read as `last`, ñawpaq(nin) as `first` — cross-mapping next/previous.
  // Longest-first matching makes the exact forms win.
  { native: 'qhipantin', normalized: 'next' },
  { native: 'ñawpaqnin', normalized: 'previous' },
  { native: 'ñawpaq kaq', normalized: 'previous' },
  { native: 'ñawpaq_kaq', normalized: 'previous' },
  // Single token only — 'aswan qayllaqa' (multi-word) was dead, and any
  // aswan-prefixed compound splits (the suffix extractor strips -wan from
  // 'aswan'). The i18n dict emits bare 'kaylla' (near/close).
  { native: 'kaylla', normalized: 'closest' },
  { native: 'qaylla', normalized: 'closest' },
  { native: 'tayta', normalized: 'parent' },

  // Events
  { native: 'llikllay', normalized: 'click' },
  { native: 'ñitiy', normalized: 'click' },
  // Glottalized spelling — the curated corpus rows (fix-translations.sql) and
  // the event-handler pattern map both use ñit'iy. Without this entry the
  // word-walk splits it at the injected English-passthrough keyword `it`
  // (ñ + it + 'iy), wrecking every curated qu click pattern.
  { native: "ñit'iy", normalized: 'click' },
  { native: 'click', normalized: 'click' },
  { native: 'yaykuy', normalized: 'input' },
  { native: 'llave uray', normalized: 'keydown' },
  { native: 'llave hawa', normalized: 'keyup' },
  { native: 'mausiri yayku', normalized: 'mouseover' },
  { native: 'mausiri lluqsi', normalized: 'mouseout' },
  // Fused mousedown/mouseup (dict emits these WITHOUT `_` since the tokenizer
  // splits on it; `rat_ñitiy` also mis-captured as click — see qu.ts events note).
  { native: 'ratñitiy', normalized: 'mousedown' },
  { native: 'rathuqariy', normalized: 'mouseup' },
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
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(quechuaProfile, QUECHUA_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(quechuaMorphologicalNormalizer);

    // Register extractors for extractor-based tokenization
    // Order matters: more specific extractors first
    this.registerExtractors(getHyperscriptExtractors()); // CSS, events, URLs
    this.registerExtractor(new QuechuaStringLiteralExtractor()); // Strings (double quotes only)
    this.registerExtractor(new NumberExtractor()); // Numbers
    this.registerExtractor(createQuechuaKeywordExtractor()); // Quechua keywords (context-aware)
    this.registerExtractor(new OperatorExtractor()); // Operators
    this.registerExtractor(new PunctuationExtractor()); // Punctuation
  }

  // tokenize() method removed - now uses extractor-based tokenization from BaseTokenizer
  // All tokenization logic delegated to registered extractors (context-aware)

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (SUFFIXES.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // URLs/paths before selectors (./path vs .class) — matches the other
    // tokenizers (hindi/japanese/…). Without this `/api/data` fell through to
    // `identifier` → `expression`, breaking the `fetch.source:literal` R1 match.
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
    if (token.startsWith('"')) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    if (['==', '!=', '<=', '>=', '<', '>', '&&', '||', '!'].includes(token)) return 'operator';

    return 'identifier';
  }

  // trySuffix(), splitSelectorSuffix(), tryMultiWordKeyword(), extractWord(), extractNumber() methods removed
  // Now handled by QuechuaKeywordExtractor (context-aware)
}

export const quechuaTokenizer = new QuechuaTokenizer();
