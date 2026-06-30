/**
 * English Patterns Module
 *
 * Builds all patterns for English language.
 * This module is imported by languages/en.ts and only includes English patterns.
 */

import type { LanguagePattern } from '../types';
import { englishProfile } from '../generators/profiles/english';
import { generatePatternsForLanguage } from '../generators/pattern-generator';

// Import from consolidated pattern files (Phase 3.2)
import { getTogglePatternsForLanguage } from './toggle';
import { getPutPatternsForLanguage } from './put';
import { getEventHandlerPatternsForLanguage } from './event-handler';

// =============================================================================
// Hand-crafted English-only patterns
// =============================================================================

/**
 * English: "fetch /url as json" with response type.
 */
const fetchWithResponseTypeEnglish: LanguagePattern = {
  id: 'fetch-en-with-response-type',
  language: 'en',
  command: 'fetch',
  priority: 90,
  template: {
    format: 'fetch {source} as {responseType}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'as' },
      { type: 'role', role: 'responseType', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    source: { position: 1 },
    responseType: { marker: 'as' },
  },
};

/**
 * English: "fetch /url" without "from" preposition.
 */
const fetchSimpleEnglish: LanguagePattern = {
  id: 'fetch-en-simple',
  language: 'en',
  command: 'fetch',
  priority: 80,
  template: {
    format: 'fetch {source}',
    tokens: [
      { type: 'literal', value: 'fetch' },
      { type: 'role', role: 'source' },
    ],
  },
  extraction: {
    source: { position: 1 },
  },
};

/**
 * English: "swap <strategy> <target>" without prepositions.
 */
const swapSimpleEnglish: LanguagePattern = {
  id: 'swap-en-handcrafted',
  language: 'en',
  command: 'swap',
  priority: 110,
  template: {
    format: 'swap {method} {destination}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'method' },
      { type: 'role', role: 'destination' },
    ],
  },
  extraction: {
    method: { position: 1 },
    destination: { position: 2 },
  },
};

/**
 * English element-swap: "swap {destination} with {patient}" (`swap #a with #b`).
 *
 * The method-less, `with`-marked shape the i18n transformer emits for an element
 * swap. Without this, `swap-en-handcrafted` (`swap {method} {destination}`) greedily
 * binds `#a`→method and the bare word `with`→destination, then DROPS `#b` — a broken
 * en REFERENCE parse the translations (de/es/ja/ko all parse `{destination, patient}`
 * correctly) are penalized against in R1. This captures `destination`+`patient` to
 * match the schema (and the translations). Priority 120 > the method form's 110, and
 * the required `with` literal means it only fires on the element-swap shape — the
 * `swap innerHTML #target` / `swap delete #item` forms (no `with`) still take 110.
 */
const swapElementEnglish: LanguagePattern = {
  id: 'swap-en-element',
  language: 'en',
  command: 'swap',
  priority: 120,
  template: {
    format: 'swap {destination} with {patient}',
    tokens: [
      { type: 'literal', value: 'swap' },
      { type: 'role', role: 'destination' },
      { type: 'literal', value: 'with' },
      { type: 'role', role: 'patient' },
    ],
  },
  extraction: {},
};

/**
 * English: "repeat until event pointerup from document"
 */
const repeatUntilEventFromEnglish: LanguagePattern = {
  id: 'repeat-en-until-event-from',
  language: 'en',
  command: 'repeat',
  priority: 120,
  template: {
    format: 'repeat until event {event} from {source}',
    tokens: [
      { type: 'literal', value: 'repeat' },
      { type: 'literal', value: 'until' },
      { type: 'literal', value: 'event' },
      { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'from' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'reference', 'expression'] },
    ],
  },
  extraction: {
    event: { marker: 'event' },
    source: { marker: 'from' },
    loopType: { default: { type: 'literal', value: 'until-event' } },
  },
};

/**
 * English: "repeat until event pointerup"
 */
const repeatUntilEventEnglish: LanguagePattern = {
  id: 'repeat-en-until-event',
  language: 'en',
  command: 'repeat',
  priority: 110,
  template: {
    format: 'repeat until event {event}',
    tokens: [
      { type: 'literal', value: 'repeat' },
      { type: 'literal', value: 'until' },
      { type: 'literal', value: 'event' },
      { type: 'role', role: 'event', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    event: { marker: 'event' },
    loopType: { default: { type: 'literal', value: 'until-event' } },
  },
};

/**
 * English: "repeat {N} times" — counted loop HEAD only.
 *
 * Captures the count as `quantity` and stops after the `times` keyword, so the
 * loop BODY (`add "<p>Line</p>" to me`) is left for the surrounding clause loop
 * to parse as a following command (mirrors `repeat until event {event}`). Without
 * this, the generated positional `repeat` pattern greedily captures the body verb
 * (`add`) as a bogus `event` role and the body is dropped (the en reference's R1
 * `repeat.event:literal` garbage). Priority 110 > the generated pattern's 100.
 */
const repeatTimesEnglish: LanguagePattern = {
  id: 'repeat-en-times',
  language: 'en',
  command: 'repeat',
  priority: 110,
  template: {
    format: 'repeat {quantity} times',
    tokens: [
      { type: 'literal', value: 'repeat' },
      { type: 'role', role: 'quantity', expectedTypes: ['literal', 'expression'] },
      { type: 'literal', value: 'times' },
    ],
  },
  extraction: {
    loopType: { default: { type: 'literal', value: 'times' } },
  },
};

/**
 * English: "repeat forever" — infinite loop HEAD only. Stops after `forever` so
 * the body (`toggle .pulse`) is parsed by the clause loop instead of being
 * swallowed as the generated pattern's `quantity` role.
 */
const repeatForeverEnglish: LanguagePattern = {
  id: 'repeat-en-forever',
  language: 'en',
  command: 'repeat',
  priority: 110,
  template: {
    format: 'repeat forever',
    tokens: [
      { type: 'literal', value: 'repeat' },
      { type: 'literal', value: 'forever' },
    ],
  },
  extraction: {
    loopType: { default: { type: 'literal', value: 'forever' } },
  },
};

/**
 * English: "set {target} to {value}" with possessive syntax support
 */
const setPossessiveEnglish: LanguagePattern = {
  id: 'set-en-possessive',
  language: 'en',
  command: 'set',
  priority: 100,
  template: {
    // Optional trailing `on <scope>` (S1 tabs-aria): `set @aria-selected to
    // "false" on .tab` writes the attribute to every scope-matched element.
    // This hand-crafted pattern ties the generated `set-en-generated` on
    // priority and wins on stable-sort order, so the scope group must live
    // here too or `on .tab` is silently dropped.
    format: 'set {destination} to {patient} [on {scope}]',
    tokens: [
      { type: 'literal', value: 'set' },
      {
        type: 'role',
        role: 'destination',
        expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
      },
      { type: 'literal', value: 'to' },
      { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
      {
        type: 'group',
        optional: true,
        tokens: [
          { type: 'literal', value: 'on' },
          { type: 'role', role: 'scope', optional: true, expectedTypes: ['selector', 'reference'] },
        ],
      },
    ],
  },
  extraction: {
    destination: { position: 1 },
    patient: { marker: 'to' },
    scope: { marker: 'on' },
  },
};

/**
 * English: "for {variable} in {collection}"
 */
const forEnglish: LanguagePattern = {
  id: 'for-en-basic',
  language: 'en',
  command: 'for',
  priority: 100,
  template: {
    format: 'for {patient} in {source}',
    tokens: [
      { type: 'literal', value: 'for' },
      { type: 'role', role: 'patient', expectedTypes: ['expression', 'reference'] },
      { type: 'literal', value: 'in' },
      { type: 'role', role: 'source', expectedTypes: ['selector', 'expression', 'reference'] },
    ],
  },
  extraction: {
    patient: { position: 1 },
    source: { marker: 'in' },
    // NOTE: no `loopType` default. The `for` schema has no loopType role (unlike
    // `repeat`, whose variants times/forever/until/for are meaningful), so a
    // `loopType:literal="for"` here merely DUPLICATES the action name — a
    // redundant role NO schema-generated translation reproduces. Emitting it made
    // en the R1 outlier: all 23 langs "missed" `for.loopType:literal` on every
    // for-pattern (template-literal-list-build). The for AST mapper
    // (command-mappers.ts forMapper) reads only patient+source, so dropping it is
    // R2-safe. (Kept in sync with patterns/languages/en/control-flow.ts.)
  },
};

/**
 * English: "if {condition}"
 */
const ifEnglish: LanguagePattern = {
  id: 'if-en-basic',
  language: 'en',
  command: 'if',
  priority: 100,
  template: {
    format: 'if {condition}',
    tokens: [
      { type: 'literal', value: 'if' },
      { type: 'role', role: 'condition', expectedTypes: ['expression', 'reference', 'selector'] },
    ],
  },
  extraction: {
    condition: { position: 1 },
  },
};

/**
 * English: "unless {condition}"
 */
const unlessEnglish: LanguagePattern = {
  id: 'unless-en-basic',
  language: 'en',
  command: 'unless',
  priority: 100,
  template: {
    format: 'unless {condition}',
    tokens: [
      { type: 'literal', value: 'unless' },
      { type: 'role', role: 'condition', expectedTypes: ['expression', 'reference', 'selector'] },
    ],
  },
  extraction: {
    condition: { position: 1 },
  },
};

/**
 * English: "in 2s toggle .active" - Natural temporal delay
 */
const temporalInEnglish: LanguagePattern = {
  id: 'temporal-en-in',
  language: 'en',
  command: 'wait',
  priority: 95,
  template: {
    format: 'in {duration}',
    tokens: [
      { type: 'literal', value: 'in' },
      { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    duration: { position: 1 },
  },
};

/**
 * English: "after 2s show #tooltip" - Natural temporal delay
 */
const temporalAfterEnglish: LanguagePattern = {
  id: 'temporal-en-after',
  language: 'en',
  command: 'wait',
  priority: 95,
  template: {
    format: 'after {duration}',
    tokens: [
      { type: 'literal', value: 'after' },
      { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    duration: { position: 1 },
  },
};

// =============================================================================
// Build All English Patterns
// =============================================================================

/**
 * Build all English patterns.
 * Called once when the English language module is imported.
 */
export function buildEnglishPatterns(): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // 1. Hand-crafted patterns
  patterns.push(...getTogglePatternsForLanguage('en'));
  patterns.push(...getPutPatternsForLanguage('en'));
  patterns.push(...getEventHandlerPatternsForLanguage('en'));

  // 2. English-only hand-crafted patterns
  patterns.push(
    fetchWithResponseTypeEnglish,
    fetchSimpleEnglish,
    swapElementEnglish,
    swapSimpleEnglish,
    repeatUntilEventFromEnglish,
    repeatUntilEventEnglish,
    repeatTimesEnglish,
    repeatForeverEnglish,
    setPossessiveEnglish,
    forEnglish,
    ifEnglish,
    unlessEnglish,
    temporalInEnglish,
    temporalAfterEnglish
  );

  // 3. Generated patterns for English
  const generatedPatterns = generatePatternsForLanguage(englishProfile);
  patterns.push(...generatedPatterns);

  return patterns;
}
