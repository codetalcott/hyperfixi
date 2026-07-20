/**
 * Russian Tokenizer
 *
 * Tokenizes Russian hyperscript input.
 * Russian characteristics:
 * - SVO word order (relatively free, but SVO is common)
 * - Space-separated words
 * - Prepositions with phonetic variants (в/во, с/со, к/ко)
 * - Cyrillic alphabet (а-яА-ЯёЁ)
 * - Fusional morphology with verb conjugations
 * - Imperative form used in software UI (infinitive also common)
 */

import type { TokenKind } from '../types';
import { BaseTokenizer, type KeywordEntry } from './base';
import { RussianMorphologicalNormalizer } from './morphology/russian-normalizer';
import { russianProfile } from '../generators/profiles/russian';
import {
  StringLiteralExtractor,
  NumberExtractor,
  OperatorExtractor,
  PunctuationExtractor,
} from './generic-extractors';
import { getHyperscriptExtractors } from './extractor-helpers';
import { createRussianExtractors } from './extractors/cyrillic-keyword';
import { AsciiIdentifierExtractor } from './extractors/ascii-identifier';

// =============================================================================
// Russian Prepositions (used in classifyToken)
// =============================================================================

/**
 * Russian prepositions with phonetic variants (в/во, с/со, к/ко, о/об/обо).
 * These mark grammatical cases and semantic roles.
 */
const PREPOSITIONS = new Set([
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

// =============================================================================
// Russian Extras (keywords not in profile)
// =============================================================================

/**
 * Extra keywords not covered by the profile:
 * - Literals (true, false, null, undefined)
 * - Time units (секунда, минута, час with inflections)
 * - Additional gendered forms
 *
 * All other keywords (positional, events, commands, logical operators)
 * are now in the profile.
 */
const RUSSIAN_EXTRAS: KeywordEntry[] = [
  // Fused event names (the i18n dict emits these WITHOUT `_`, since the tokenizer
  // splits on `_` — see ru.ts events note). Recognize them so the event types as
  // a literal, not a bare expression (window-resize, repeat-until-event).
  { native: 'мышьвниз', normalized: 'mousedown' },
  { native: 'мышьвверх', normalized: 'mouseup' },
  { native: 'изменениеразмера', normalized: 'resize' },

  // Values/Literals (not in profile - generic across all languages)
  { native: 'истина', normalized: 'true' },
  { native: 'правда', normalized: 'true' },
  { native: 'ложь', normalized: 'false' },
  { native: 'null', normalized: 'null' },
  { native: 'неопределено', normalized: 'undefined' },
  // `ничего` ("nothing") is the word the corpus author uses for a null
  // comparison (`если item есть ничего` → `if item is null`). Without it the
  // literal leaked verbatim and the canonical parser rejected the render
  // (behavior-sortable/ru). Its sibling `неопределено`→undefined was already
  // registered; this closes the null half.
  { native: 'ничего', normalized: 'null' },

  // Time units (not in profile - handled by number parser)
  { native: 'секунда', normalized: 's' },
  { native: 'секунды', normalized: 's' },
  { native: 'секунд', normalized: 's' },
  { native: 'миллисекунда', normalized: 'ms' },
  { native: 'миллисекунды', normalized: 'ms' },
  { native: 'миллисекунд', normalized: 'ms' },
  { native: 'минута', normalized: 'm' },
  { native: 'минуты', normalized: 'm' },
  { native: 'минут', normalized: 'm' },
  { native: 'час', normalized: 'h' },
  { native: 'часа', normalized: 'h' },
  { native: 'часов', normalized: 'h' },

  // Positional (masculine nominative — the forms the i18n dict emits; the
  // gendered variants below predate these but the base forms were never
  // listed, so `последний <.message/> в #chat` never formed a positional
  // query — see positional-keyword-drift.test.ts)
  { native: 'первый', normalized: 'first' },
  { native: 'последний', normalized: 'last' },
  { native: 'следующий', normalized: 'next' },
  { native: 'предыдущий', normalized: 'previous' },
  { native: 'ближайший', normalized: 'closest' },
  { native: 'родитель', normalized: 'parent' },
  { native: 'случайный', normalized: 'random' },

  // Gendered forms (additional variants)
  { native: 'первая', normalized: 'first' }, // feminine
  { native: 'первое', normalized: 'first' }, // neuter
  { native: 'последняя', normalized: 'last' }, // feminine
  { native: 'последнее', normalized: 'last' }, // neuter
  { native: 'следующая', normalized: 'next' }, // feminine
  { native: 'предыдущая', normalized: 'previous' }, // feminine
  { native: 'пустая', normalized: 'empty' }, // feminine
  { native: 'пустое', normalized: 'empty' }, // neuter
  { native: 'моя', normalized: 'my' }, // feminine
  { native: 'моё', normalized: 'my' }, // neuter
  { native: 'мои', normalized: 'my' }, // plural
  { native: 'включительно', normalized: 'inclusive' },
  { native: 'исключительно', normalized: 'exclusive' },
];

// =============================================================================
// Russian Tokenizer Implementation
// =============================================================================

export class RussianTokenizer extends BaseTokenizer {
  readonly language = 'ru';
  readonly direction = 'ltr' as const;

  constructor() {
    super();
    // Initialize keywords from profile + extras (single source of truth)
    this.initializeKeywordsFromProfile(russianProfile, RUSSIAN_EXTRAS);
    // Set morphological normalizer for verb conjugations
    this.setNormalizer(new RussianMorphologicalNormalizer());

    // Register extractors (order matters: specific before generic)
    this.registerExtractors([
      ...getHyperscriptExtractors(), // CSS, URL, property access, variable refs, event modifiers
      ...createRussianExtractors(), // Russian keywords with morphology
      new StringLiteralExtractor(),
      new NumberExtractor(),
      new AsciiIdentifierExtractor(), // ASCII identifiers (for mixed content)
      new OperatorExtractor(),
      new PunctuationExtractor(),
    ]);
  }

  classifyToken(token: string): TokenKind {
    const lower = token.toLowerCase();

    if (PREPOSITIONS.has(lower)) return 'particle';
    // O(1) Map lookup instead of O(n) array search
    if (this.isKeyword(lower)) return 'keyword';
    // Check event modifiers BEFORE selectors (.once vs .active)
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
    if (token.startsWith('"') || token.startsWith("'")) return 'literal';
    if (/^\d/.test(token)) return 'literal';
    // URLs (`/api/data`, `./x`, `http…`) — else typed identifier→expression (fetch.source R1).
    if (token.startsWith('/') || token.startsWith('./') || token.startsWith('http')) return 'url';
    return 'identifier';
  }
}

export const russianTokenizer = new RussianTokenizer();
