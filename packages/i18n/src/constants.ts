// packages/i18n/src/constants.ts

/**
 * Shared Constants for i18n Package
 *
 * Centralizes keyword definitions to eliminate duplication across
 * transformer.ts, create-provider.ts, and other modules.
 */

import type { SemanticRole } from './grammar/types';

// =============================================================================
// English Modifier → Semantic Role Mappings
// =============================================================================

/**
 * Maps English modifier keywords to their semantic roles.
 * Used by both the grammar transformer and keyword provider.
 */
export const ENGLISH_MODIFIER_ROLES: Readonly<Record<string, SemanticRole>> = {
  to: 'destination',
  into: 'destination',
  from: 'source',
  with: 'style',
  by: 'quantity',
  as: 'method',
  on: 'event',
  over: 'duration',
  for: 'duration',
} as const;

/**
 * Maps a command verb to its **primary** semantic role — the role of the
 * command's first/leading argument when no explicit modifier keyword marks it.
 *
 * The generic argument parser in the transformer defaults the first unmarked
 * argument to `patient`, which is correct for the majority of commands
 * (`toggle .x`, `add .x`, …) but wrong for commands whose leading argument is a
 * non-patient — e.g. `wait <duration>`. Marking a duration as a patient emits a
 * spurious object-marker in the target language (Chinese `等待 把 1s`, ungrammatical;
 * Japanese `1s を 待つ`; Korean `1s 를 대기`), which the semantic parser then fails to
 * match — dropping the command.
 *
 * Only commands whose primary role is **not** `patient` are listed here (the
 * `patient` default already covers the rest). Mirrors the `primaryRole` field of
 * the semantic package's command schemas (`@lokascript/semantic`); kept in sync by
 * `schema-alignment.test.ts` so this local copy can't drift without the bundle
 * having to pull in the whole semantic graph.
 *
 * @see packages/i18n/src/schema-alignment.test.ts
 * @see docs-internal/ZH_BLOCK_BODY_SCOPE.md (#1 — transformer role model)
 */
export const COMMAND_PRIMARY_ROLES: Readonly<Record<string, SemanticRole>> = {
  set: 'destination',
  on: 'event',
  trigger: 'event',
  send: 'event',
  wait: 'duration',
  fetch: 'source',
  get: 'source',
  if: 'condition',
  unless: 'condition',
  while: 'condition',
  repeat: 'loopType',
  go: 'destination',
  scroll: 'destination',
  tell: 'destination',
  default: 'destination',
  swap: 'destination',
  morph: 'destination',
  bind: 'destination',
} as const;

/**
 * English modifier keywords (derived from ENGLISH_MODIFIER_ROLES)
 */
export const ENGLISH_MODIFIERS: Set<string> = new Set([
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
  'without',
]);

// =============================================================================
// English Commands
// =============================================================================

/**
 * English commands - the canonical set that the runtime understands.
 */
export const ENGLISH_COMMANDS: Set<string> = new Set([
  'add',
  'append',
  'async',
  'beep',
  'blur', // v0.9.90 phase 1
  'break',
  'breakpoint', // v0.9.90 phase 1
  'call',
  'clear', // v0.9.90 phase 1
  'close', // v0.9.90 phase 1
  'continue',
  'decrement',
  'default',
  'empty', // v0.9.90 phase 1
  'exit',
  'fetch',
  'focus', // v0.9.90 phase 1
  'for',
  'get',
  'go',
  'halt',
  'hide',
  'if',
  'increment',
  'install',
  'js',
  'log',
  'make',
  'measure',
  'morph',
  'open', // v0.9.90 phase 1
  'pick',
  'process',
  'push',
  'put',
  'remove',
  'render',
  'repeat',
  'replace',
  'reset', // v0.9.90 phase 1
  'return',
  'select', // v0.9.90 phase 1
  'send',
  'set',
  'settle',
  'show',
  'swap',
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
  'unless',
  'wait',
  // v2.x reactive + realtime + service-worker DSL commands
  'live',
  'bind',
  'eventsource',
  'socket',
  'worker',
  'intercept',
]);

// =============================================================================
// English Keywords (Non-Commands)
// =============================================================================

/**
 * English keywords that are not commands.
 */
export const ENGLISH_KEYWORDS: Set<string> = new Set([
  // Flow control
  'then',
  'else',
  'end',
  'and',
  'or',
  'not',
  // Conditionals
  'if',
  'unless',
  // Loops
  'for',
  'while',
  'until',
  'forever',
  'times',
  'each',
  'index',
  // Prepositions
  'in',
  'to',
  'from',
  'into',
  'with',
  'without',
  'of',
  'at',
  'by',
  // Conversion
  'as',
  // Comparison
  'matches',
  'contains',
  'is',
  'exists',
  // Events
  'on',
  'when',
  'every',
  'event',
  // Definitions
  'init',
  'def',
  'behavior',
  // Scope
  'global',
  'local',
  // Articles
  'the',
  'a',
  'an',
  'first',
  'last',
  // Position
  'start',
  'before',
  'after',
]);

// =============================================================================
// Universal English Keywords (DOM/HTML Standards)
// =============================================================================

/**
 * English keywords that should always be recognized, even in non-English locales.
 * These are HTML/DOM standard terms that developers worldwide use.
 */
export const UNIVERSAL_ENGLISH_KEYWORDS: Set<string> = new Set([
  // DOM events (HTML spec)
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mouseout',
  'mousemove',
  'keydown',
  'keyup',
  'keypress',
  'focus',
  'blur',
  'change',
  'input',
  'submit',
  'reset',
  'load',
  'unload',
  'resize',
  'scroll',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'dragstart',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'drop',
  'contextmenu',
  'wheel',
  'pointerdown',
  'pointerup',
  'pointermove',
  // Common abbreviations
  'ms',
  's',
]);

// =============================================================================
// Logical Keywords
// =============================================================================

/**
 * English logical operator keywords.
 */
export const ENGLISH_LOGICAL_KEYWORDS: Set<string> = new Set([
  'and',
  'or',
  'not',
  'is',
  'exists',
  'matches',
  'contains',
  'then',
  'else',
]);

// =============================================================================
// Value Keywords
// =============================================================================

/**
 * English value keywords.
 */
export const ENGLISH_VALUE_KEYWORDS: Set<string> = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'it',
  'me',
  'my',
  'result',
]);

// =============================================================================
// Expression Keywords
// =============================================================================

/**
 * English expression keywords - positional, traversal, and string operations.
 */
export const ENGLISH_EXPRESSION_KEYWORDS: Set<string> = new Set([
  // Positional
  'first',
  'last',
  'next',
  'previous',
  'prev',
  'at',
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
  // String operations (multi-word)
  'starts with',
  'ends with',
]);

// =============================================================================
// Conditional Keywords
// =============================================================================

/**
 * Conditional keywords across languages (for statement type identification).
 * Includes 'when'/'where' conditional modifiers and their translations.
 */
export const CONDITIONAL_KEYWORDS: Set<string> = new Set([
  // English
  'if',
  'unless',
  'when',
  'where',
  // Japanese
  'もし',
  '時に',
  'ときに',
  'どこで',
  // Chinese
  '如果',
  '当',
  // Arabic
  'إذا',
  'عندما',
  'حيث',
  // Spanish
  'si',
  'cuando',
  'donde',
  // German
  'wenn',
  'wann',
  'wo',
  // French
  'quand',
  'lorsque',
  'où',
  // Portuguese
  'quando',
  'onde',
  // Turkish
  'eğer',
  'zaman',
  'nerede',
  // Indonesian
  'ketika',
  'saat',
  'dimana',
  // Korean
  '때',
  '어디서',
  // Quechua
  'maypi',
  // Swahili
  'wakati',
  'wapi',
]);

/**
 * "Then" keywords across languages (for conditional parsing).
 */
export const THEN_KEYWORDS: Set<string> = new Set([
  'then',
  'それから',
  '那么',
  'ثم',
  'entonces',
  'alors',
  'dann',
  'sonra',
  'lalu',
  'chayqa',
  'kisha',
]);
