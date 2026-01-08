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
 * English modifier keywords (derived from ENGLISH_MODIFIER_ROLES)
 */
export const ENGLISH_MODIFIERS: Set<string> = new Set([
  'to', 'from', 'into', 'with', 'at', 'in', 'of', 'as', 'by',
  'before', 'after', 'without',
]);

// =============================================================================
// English Commands
// =============================================================================

/**
 * English commands - the canonical set that the runtime understands.
 */
export const ENGLISH_COMMANDS: Set<string> = new Set([
  'add', 'append', 'async', 'beep', 'break', 'call', 'continue',
  'decrement', 'default', 'exit', 'fetch', 'for', 'get', 'go',
  'halt', 'hide', 'if', 'increment', 'install', 'js', 'log',
  'make', 'measure', 'morph', 'pick', 'process', 'push', 'put',
  'remove', 'render', 'repeat', 'replace', 'return', 'send', 'set',
  'settle', 'show', 'swap', 'take', 'tell', 'throw', 'toggle',
  'transition', 'trigger', 'unless', 'wait',
]);

// =============================================================================
// English Keywords (Non-Commands)
// =============================================================================

/**
 * English keywords that are not commands.
 */
export const ENGLISH_KEYWORDS: Set<string> = new Set([
  // Flow control
  'then', 'else', 'end', 'and', 'or', 'not',
  // Conditionals
  'if', 'unless',
  // Loops
  'for', 'while', 'until', 'forever', 'times', 'each', 'index',
  // Prepositions
  'in', 'to', 'from', 'into', 'with', 'without', 'of', 'at', 'by',
  // Conversion
  'as',
  // Comparison
  'matches', 'contains', 'is', 'exists',
  // Events
  'on', 'when', 'every', 'event',
  // Definitions
  'init', 'def', 'behavior',
  // Scope
  'global', 'local',
  // Articles
  'the', 'a', 'an', 'first', 'last',
  // Position
  'start', 'before', 'after',
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
  'click', 'dblclick', 'mousedown', 'mouseup', 'mouseenter', 'mouseleave',
  'mouseover', 'mouseout', 'mousemove', 'keydown', 'keyup', 'keypress',
  'focus', 'blur', 'change', 'input', 'submit', 'reset', 'load', 'unload',
  'resize', 'scroll', 'touchstart', 'touchend', 'touchmove', 'touchcancel',
  'dragstart', 'dragend', 'dragenter', 'dragleave', 'dragover', 'drop',
  'contextmenu', 'wheel', 'pointerdown', 'pointerup', 'pointermove',
  // Common abbreviations
  'ms', 's',
]);

// =============================================================================
// Logical Keywords
// =============================================================================

/**
 * English logical operator keywords.
 */
export const ENGLISH_LOGICAL_KEYWORDS: Set<string> = new Set([
  'and', 'or', 'not', 'is', 'exists', 'matches', 'contains', 'then', 'else',
]);

// =============================================================================
// Value Keywords
// =============================================================================

/**
 * English value keywords.
 */
export const ENGLISH_VALUE_KEYWORDS: Set<string> = new Set([
  'true', 'false', 'null', 'undefined', 'it', 'me', 'my', 'result',
]);

// =============================================================================
// Expression Keywords
// =============================================================================

/**
 * English expression keywords - positional, traversal, and string operations.
 */
export const ENGLISH_EXPRESSION_KEYWORDS: Set<string> = new Set([
  // Positional
  'first', 'last', 'next', 'previous', 'prev', 'at', 'random',
  // DOM traversal
  'closest', 'parent', 'children', 'within',
  // Emptiness/existence
  'no', 'empty', 'some',
  // String operations (multi-word)
  'starts with', 'ends with',
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
  'if', 'unless', 'when', 'where',
  // Japanese
  'もし', '時に', 'ときに', 'どこで',
  // Chinese
  '如果', '当',
  // Arabic
  'إذا', 'عندما', 'حيث',
  // Spanish
  'si', 'cuando', 'donde',
  // German
  'wenn', 'wann', 'wo',
  // French
  'quand', 'lorsque', 'où',
  // Portuguese
  'quando', 'onde',
  // Turkish
  'eğer', 'zaman', 'nerede',
  // Indonesian
  'ketika', 'saat', 'dimana',
  // Korean
  '때', '어디서',
  // Quechua
  'maypi',
  // Swahili
  'wakati', 'wapi',
]);

/**
 * "Then" keywords across languages (for conditional parsing).
 */
export const THEN_KEYWORDS: Set<string> = new Set([
  'then', 'それから', '那么', 'ثم', 'entonces', 'alors', 'dann', 'sonra',
  'lalu', 'chayqa', 'kisha',
]);
