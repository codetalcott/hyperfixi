/**
 * Dictionary Derivation from Semantic Profiles
 *
 * Creates Dictionary objects from LanguageProfile keywords,
 * eliminating keyword duplication between packages.
 *
 * The semantic profile is the single source of truth for keyword translations.
 * This adapter extracts the `primary` value from each KeywordTranslation.
 */

import type { Dictionary, DictionaryCategory } from '../types';

/**
 * KeywordTranslation interface (matches @hyperfixi/semantic)
 */
interface KeywordTranslation {
  readonly primary: string;
  readonly alternatives?: string[];
  readonly normalized?: string;
}

/**
 * LanguageProfile interface (subset needed for derivation)
 */
interface LanguageProfile {
  readonly code: string;
  readonly keywords: Record<string, KeywordTranslation>;
  readonly references?: Record<string, string>;
}

// =============================================================================
// Keyword Category Mappings
// =============================================================================

/**
 * Keywords that belong to the 'commands' category.
 */
const COMMAND_KEYWORDS = [
  // Event handling
  'on',
  'tell',
  'trigger',
  'send',
  // DOM manipulation
  'take',
  'put',
  'set',
  'get',
  'add',
  'remove',
  'toggle',
  'hide',
  'show',
  // Control flow
  'if',
  'unless',
  'repeat',
  'for',
  'while',
  'until',
  'continue',
  'break',
  'halt',
  // Async
  'wait',
  'fetch',
  'call',
  'return',
  // Other commands
  'make',
  'log',
  'throw',
  'catch',
  'measure',
  'transition',
  // Data commands
  'increment',
  'decrement',
  'bind',
  'default',
  'persist',
  // Navigation
  'go',
  'pushUrl',
  'replaceUrl',
  // Utility
  'copy',
  'pick',
  'beep',
  // Advanced
  'js',
  'async',
  'render',
  // Animation
  'swap',
  'morph',
  'settle',
  // Content
  'append',
  'prepend',
  'clone',
  // Control
  'exit',
  // Behaviors
  'install',
  'behavior',
  'init',
  // Focus
  'focus',
  'blur',
] as const;

/**
 * Keywords that belong to the 'modifiers' category.
 */
const MODIFIER_KEYWORDS = [
  'to',
  'from',
  'into',
  'with',
  'at',
  'in',
  'of',
  'as',
  'by',
  'before',
  'after',
  'over',
  'under',
  'between',
  'through',
  'without',
] as const;

/**
 * Keywords that belong to the 'logical' category.
 */
const LOGICAL_KEYWORDS = [
  'and',
  'or',
  'not',
  'is',
  'exists',
  'matches',
  'contains',
  'includes',
  'equals',
  'then',
  'else',
  'otherwise',
  'end',
] as const;

/**
 * Keywords that belong to the 'expressions' category.
 */
const EXPRESSION_KEYWORDS = [
  // Positional
  'first',
  'last',
  'next',
  'previous',
  'prev',
  'random',
  // DOM traversal
  'closest',
  'parent',
  'children',
  'within',
  // Emptiness/existence
  'no',
  'empty',
  'some',
] as const;

// =============================================================================
// Derivation Functions
// =============================================================================

/**
 * Extract primary translations for a list of keywords from the profile.
 * Returns a Record<string, string> mapping English key to translated value.
 */
function extractCategory(
  keywords: Record<string, KeywordTranslation>,
  keys: readonly string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const translation = keywords[key];
    if (translation) {
      result[key] = translation.primary;
    }
  }
  return result;
}

/**
 * Extract references from the profile (me, it, you, etc.).
 */
function extractReferences(references: Record<string, string> | undefined): Record<string, string> {
  if (!references) return {};
  return { ...references };
}

/**
 * Merge base dictionary with profile-derived values.
 * Profile values take precedence (they're the source of truth).
 */
function mergeWithFallback(
  derived: Record<string, string>,
  fallback: Record<string, string>
): Record<string, string> {
  return { ...fallback, ...derived };
}

// =============================================================================
// Fallback Dictionaries
// =============================================================================

/**
 * Event names - these are typically not in profiles since they're
 * DOM standard events. Localization is optional.
 */
const EVENT_FALLBACK: Record<string, string> = {
  click: 'click',
  dblclick: 'dblclick',
  mousedown: 'mousedown',
  mouseup: 'mouseup',
  mouseenter: 'mouseenter',
  mouseleave: 'mouseleave',
  mouseover: 'mouseover',
  mouseout: 'mouseout',
  mousemove: 'mousemove',
  keydown: 'keydown',
  keyup: 'keyup',
  keypress: 'keypress',
  focus: 'focus',
  blur: 'blur',
  change: 'change',
  input: 'input',
  submit: 'submit',
  reset: 'reset',
  load: 'load',
  unload: 'unload',
  resize: 'resize',
  scroll: 'scroll',
  touchstart: 'touchstart',
  touchend: 'touchend',
  touchmove: 'touchmove',
  touchcancel: 'touchcancel',
};

/**
 * Temporal keywords - time units.
 */
const TEMPORAL_FALLBACK: Record<string, string> = {
  seconds: 'seconds',
  second: 'second',
  milliseconds: 'milliseconds',
  millisecond: 'millisecond',
  minutes: 'minutes',
  minute: 'minute',
  hours: 'hours',
  hour: 'hour',
  ms: 'ms',
  s: 's',
  min: 'min',
  h: 'h',
};

/**
 * Value keywords - literals and references.
 */
const VALUES_FALLBACK: Record<string, string> = {
  true: 'true',
  false: 'false',
  null: 'null',
  undefined: 'undefined',
  element: 'element',
  window: 'window',
  document: 'document',
  value: 'value',
};

/**
 * Attribute keywords.
 */
const ATTRIBUTES_FALLBACK: Record<string, string> = {
  class: 'class',
  classes: 'classes',
  style: 'style',
  styles: 'styles',
  attribute: 'attribute',
  attributes: 'attributes',
  property: 'property',
  properties: 'properties',
};

/**
 * Expression keywords fallback.
 */
const EXPRESSIONS_FALLBACK: Record<string, string> = {
  at: 'at',
  'starts with': 'starts with',
  'ends with': 'ends with',
};

// =============================================================================
// Main Derivation Function
// =============================================================================

/**
 * Options for dictionary derivation.
 */
export interface DeriveOptions {
  /**
   * Override specific categories with custom values.
   * Useful for categories not fully covered by the profile.
   */
  overrides?: Partial<Dictionary>;

  /**
   * Whether to include English fallbacks for missing entries.
   * Default: true
   */
  includeFallbacks?: boolean;
}

/**
 * Derive a Dictionary from a LanguageProfile.
 *
 * This is the main adapter function that creates dictionaries from
 * semantic profiles, eliminating keyword duplication.
 *
 * @param profile - The language profile to derive from
 * @param options - Derivation options
 * @returns A complete Dictionary object
 *
 * @example
 * ```typescript
 * import { japaneseProfile } from '@hyperfixi/semantic';
 * import { deriveFromProfile } from './derive';
 *
 * export const ja = deriveFromProfile(japaneseProfile);
 * ```
 */
export function deriveFromProfile(
  profile: LanguageProfile,
  options: DeriveOptions = {}
): Dictionary {
  const { overrides = {}, includeFallbacks = true } = options;
  const { keywords, references } = profile;

  // Extract from profile keywords
  const derivedCommands = extractCategory(keywords, COMMAND_KEYWORDS);
  const derivedModifiers = extractCategory(keywords, MODIFIER_KEYWORDS);
  const derivedLogical = extractCategory(keywords, LOGICAL_KEYWORDS);
  const derivedExpressions = extractCategory(keywords, EXPRESSION_KEYWORDS);

  // Extract references (me, it, you, etc.) and add to values
  const derivedReferences = extractReferences(references);

  // Build the dictionary with fallbacks
  const dictionary: Dictionary = {
    commands: includeFallbacks ? mergeWithFallback(derivedCommands, {}) : derivedCommands,

    modifiers: includeFallbacks ? mergeWithFallback(derivedModifiers, {}) : derivedModifiers,

    events: includeFallbacks ? { ...EVENT_FALLBACK } : {},

    logical: includeFallbacks ? mergeWithFallback(derivedLogical, {}) : derivedLogical,

    temporal: includeFallbacks ? { ...TEMPORAL_FALLBACK } : {},

    values: includeFallbacks
      ? mergeWithFallback(derivedReferences, VALUES_FALLBACK)
      : derivedReferences,

    attributes: includeFallbacks ? { ...ATTRIBUTES_FALLBACK } : {},

    expressions: includeFallbacks
      ? mergeWithFallback(derivedExpressions, EXPRESSIONS_FALLBACK)
      : derivedExpressions,
  };

  // Apply overrides (for language-specific customizations)
  if (overrides.commands) {
    dictionary.commands = { ...dictionary.commands, ...overrides.commands };
  }
  if (overrides.modifiers) {
    dictionary.modifiers = { ...dictionary.modifiers, ...overrides.modifiers };
  }
  if (overrides.events) {
    dictionary.events = { ...dictionary.events, ...overrides.events };
  }
  if (overrides.logical) {
    dictionary.logical = { ...dictionary.logical, ...overrides.logical };
  }
  if (overrides.temporal) {
    dictionary.temporal = { ...dictionary.temporal, ...overrides.temporal };
  }
  if (overrides.values) {
    dictionary.values = { ...dictionary.values, ...overrides.values };
  }
  if (overrides.attributes) {
    dictionary.attributes = { ...dictionary.attributes, ...overrides.attributes };
  }
  if (overrides.expressions) {
    dictionary.expressions = { ...dictionary.expressions, ...overrides.expressions };
  }

  return dictionary;
}

/**
 * Create an English dictionary (identity mapping).
 * Special case since English keywords map to themselves.
 */
export function createEnglishDictionary(): Dictionary {
  const identity = (keys: readonly string[]): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = key;
    }
    return result;
  };

  return {
    commands: identity(COMMAND_KEYWORDS),
    modifiers: identity(MODIFIER_KEYWORDS),
    events: { ...EVENT_FALLBACK },
    logical: identity(LOGICAL_KEYWORDS),
    temporal: { ...TEMPORAL_FALLBACK },
    values: {
      ...VALUES_FALLBACK,
      it: 'it',
      its: 'its',
      me: 'me',
      my: 'my',
      myself: 'myself',
      you: 'you',
      your: 'your',
      yourself: 'yourself',
      target: 'target',
      detail: 'detail',
      event: 'event',
      body: 'body',
      result: 'result',
    },
    attributes: { ...ATTRIBUTES_FALLBACK },
    expressions: {
      ...identity(EXPRESSION_KEYWORDS),
      ...EXPRESSIONS_FALLBACK,
    },
  };
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Compare a derived dictionary against an original to find missing entries.
 * Useful for validating that derivation is complete.
 */
export function validateDictionary(
  derived: Dictionary,
  original: Dictionary
): { missing: Record<DictionaryCategory, string[]>; coverage: number } {
  const categories: DictionaryCategory[] = [
    'commands',
    'modifiers',
    'events',
    'logical',
    'temporal',
    'values',
    'attributes',
    'expressions',
  ];

  const missing: Record<DictionaryCategory, string[]> = {
    commands: [],
    modifiers: [],
    events: [],
    logical: [],
    temporal: [],
    values: [],
    attributes: [],
    expressions: [],
  };

  let totalOriginal = 0;
  let totalDerived = 0;

  for (const category of categories) {
    const origKeys = Object.keys(original[category]);
    const derivedKeys = new Set(Object.keys(derived[category]));

    totalOriginal += origKeys.length;

    for (const key of origKeys) {
      if (derivedKeys.has(key)) {
        totalDerived++;
      } else {
        missing[category].push(key);
      }
    }
  }

  return {
    missing,
    coverage: totalOriginal > 0 ? totalDerived / totalOriginal : 1,
  };
}
