/**
 * Hebrew Proclitic Extractor (Context-Aware)
 *
 * Handles Hebrew prefix prepositions (proclitics) that attach to words:
 * - ב (b') - in, at, with (locative/instrumental)
 * - ל (l') - to, for (dative/benefactive)
 * - מ (m') - from (ablative)
 * - כ (k') - like, as (comparative)
 * - ה (h') - definite article "the"
 * - ו (v') - conjunction "and"
 * - ש (sh') - relative pronoun "that"
 *
 * These prefixes are grammatical markers that attach directly to the following word
 * without spaces. They need special handling to separate them from the root word.
 *
 * Examples:
 * - בלחיצה (b-lachitza) = at/on click → "on click"
 * - לכפתור (l-kaftor) = to button → "to #button"
 * - מהמסך (m-ha-masach) = from the screen → "from the screen"
 */

import type { ExtractionResult } from '../value-extractor-types';
import type { ContextAwareExtractor, TokenizerContext } from '../context-aware-extractor';
import { createUnicodeRangeClassifier } from '../base';

/** Check if character is Hebrew. */
const isHebrew = createUnicodeRangeClassifier([
  [0x0590, 0x05ff], // Hebrew
  [0xfb1d, 0xfb4f], // Hebrew Presentation Forms
]);

/**
 * Hebrew prefix prepositions (proclitics) that attach to words.
 */
const PROCLITIC_PREFIXES = new Map<string, string>([
  ['ב', 'on'], // b' - in, at, with (event marker / locative)
  ['ל', 'to'], // l' - to, for (dative / destination)
  ['מ', 'from'], // m' - from (ablative / source)
  ['כ', 'as'], // k' - like, as (comparative)
  ['ה', 'the'], // h' - definite article
  ['ו', 'and'], // v' - conjunction "and"
  ['ש', 'that'], // sh' - relative pronoun "that"
]);

/**
 * Event marker prefixes that attach to event names.
 * Subset of proclitics used specifically for event handlers.
 */
const EVENT_MARKER_PREFIXES = new Set(['ב', 'כ']); // "on/at" and "when"

/**
 * Hebrew event names that can follow event marker prefixes.
 */
const EVENT_NAMES = new Set([
  'לחיצה', // click
  'קליק', // click (loanword)
  'שליחה', // submit
  'הגשה', // submit (alternative)
  'ריחוף', // hover
  'מעבר', // hover/transition
  'שינוי', // change
  'עדכון', // update/change
  'קלט', // input
  'הזנה', // input (alternative)
  'מיקוד', // focus
  'טשטוש', // blur
  'טעינה', // load
  'גלילה', // scroll
]);

/**
 * HebrewProcliticExtractor - Context-aware extractor for Hebrew prefix prepositions.
 *
 * This extractor must run BEFORE HebrewKeywordExtractor to catch prefixes
 * before they're consumed as part of a longer word.
 */
export class HebrewProcliticExtractor implements ContextAwareExtractor {
  readonly name = 'hebrew-proclitic';

  private context?: TokenizerContext;

  setContext(context: TokenizerContext): void {
    this.context = context;
  }

  canExtract(input: string, position: number): boolean {
    const char = input[position];
    // Only extract if it's a known proclitic AND followed by more Hebrew
    return (
      PROCLITIC_PREFIXES.has(char) && position + 1 < input.length && isHebrew(input[position + 1])
    );
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.context) {
      throw new Error('HebrewProcliticExtractor: context not set');
    }

    const prefix = input[position];
    const normalized = PROCLITIC_PREFIXES.get(prefix);

    if (!normalized) return null;

    // CRITICAL: Check if the full word is a keyword BEFORE splitting
    // Many Hebrew keywords start with ה (definite article "the") but it's not a prefix
    let wordEnd = position;
    while (wordEnd < input.length && isHebrew(input[wordEnd])) {
      wordEnd++;
    }
    const fullWord = input.slice(position, wordEnd);

    // Check if full word is a keyword - if so, don't split it
    const keywordEntry = this.context?.lookupKeyword(fullWord);
    if (keywordEntry) {
      return null; // Let HebrewKeywordExtractor handle it
    }

    // Check if next char is also a proclitic (chained prefixes like מה = from-the)
    // But only skip if the word after BOTH proclitics is also meaningful
    if (position + 1 < input.length && PROCLITIC_PREFIXES.has(input[position + 1])) {
      // Check if word after first proclitic is meaningful
      const afterFirstPrefix = input.slice(position + 1, wordEnd);
      const afterFirstEntry = this.context?.lookupKeyword(afterFirstPrefix);
      const isAfterFirstEvent = EVENT_NAMES.has(afterFirstPrefix);

      // If word after first proclitic is meaningful, split here
      if (afterFirstEntry || isAfterFirstEvent || afterFirstPrefix.length >= 3) {
        // Don't skip - this is a valid split point
      } else {
        // Word after first proclitic is NOT meaningful - let chain be handled together
        return null;
      }
    }

    // Check if the remaining word (after prefix) is a keyword or meaningful
    const afterPrefix = input.slice(position + 1, wordEnd);
    const afterPrefixEntry = this.context?.lookupKeyword(afterPrefix);

    // Special handling for event marker prefixes (ב, כ) attached to event names
    const isEventMarkerPrefix = EVENT_MARKER_PREFIXES.has(prefix);
    const isEventName = EVENT_NAMES.has(afterPrefix);

    // If this is an event marker prefix attached to an event name, extract it
    if (isEventMarkerPrefix && isEventName) {
      return {
        value: prefix,
        length: 1,
        metadata: {
          normalized,
          procliticType: normalized,
          isEventMarker: true,
        },
      };
    }

    // Only split if the remaining word is meaningful (keyword or at least 2 chars)
    // SPECIAL CASE: Don't split if afterPrefix is itself a single-char proclitic
    // (e.g., 'ול' → don't split 'ו' from 'ל')
    if (afterPrefix.length === 1 && PROCLITIC_PREFIXES.has(afterPrefix)) {
      return null; // Don't split - remaining char is also a proclitic
    }

    if (!afterPrefixEntry && !isEventName && afterPrefix.length < 2) {
      return null; // Don't split - too short to be meaningful
    }

    // Determine if this is an event marker prefix (for non-event cases)
    const isEventMarker = isEventMarkerPrefix && afterPrefixEntry;

    return {
      value: prefix,
      length: 1,
      metadata: {
        normalized,
        procliticType: normalized,
        isEventMarker,
      },
    };
  }
}

/**
 * Create Hebrew proclitic extractor.
 * This should be registered BEFORE HebrewKeywordExtractor.
 */
export function createHebrewProcliticExtractor(): ContextAwareExtractor {
  return new HebrewProcliticExtractor();
}
