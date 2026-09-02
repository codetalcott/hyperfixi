/**
 * Parser Constants
 * Centralized location for all keywords, commands, and magic strings used in parser
 */

import { COMMAND_NAMES } from '../commands/manifest';

/**
 * Core hyperscript keywords used in expressions and control flow
 */
export const KEYWORDS = {
  // Flow control
  THEN: 'then',
  ELSE: 'else',
  END: 'end',
  AND: 'and',
  OR: 'or',
  NOT: 'not',

  // Conditionals
  IF: 'if',
  UNLESS: 'unless',

  // Loops
  FOR: 'for',
  WHILE: 'while',
  UNTIL: 'until',
  FOREVER: 'forever',
  TIMES: 'times',
  EACH: 'each',
  INDEX: 'index',

  // Prepositions
  IN: 'in',
  TO: 'to',
  FROM: 'from',
  INTO: 'into',
  WITH: 'with',
  WITHOUT: 'without',
  OF: 'of',
  AT: 'at',
  BY: 'by',
  BETWEEN: 'between',

  // Conversion
  AS: 'as',

  // Comparison
  MATCHES: 'matches',
  CONTAINS: 'contains',

  // Events
  ON: 'on',
  WHEN: 'when',
  WHERE: 'where',
  EVERY: 'every',
  EVENT: 'event',

  // Definitions
  INIT: 'init',
  DEF: 'def',
  BEHAVIOR: 'behavior',

  // Scope modifiers
  GLOBAL: 'global',
  LOCAL: 'local',

  // Articles and positionals
  THE: 'the',
  A: 'a',
  AN: 'an',
  FIRST: 'first',
  LAST: 'last',

  // Special
  START: 'start',
  BEFORE: 'before',
  AFTER: 'after',
} as const;

/**
 * Command terminators - keywords that signal the end of a command's arguments
 */
export const COMMAND_TERMINATORS = [
  KEYWORDS.THEN,
  KEYWORDS.AND,
  KEYWORDS.ELSE,
  KEYWORDS.END,
  KEYWORDS.ON,
] as const;

/**
 * Every name the parser will accept in command position.
 *
 * ## Manifest-driven (Arc A step 3)
 *
 * The registered commands come from `commands/manifest.ts`, not from a hand-
 * maintained copy of it. This was one of the four lists the manifest arc names
 * as "already agreeing" (the brief's Claim 2), and it is now derived rather
 * than merely agreeing.
 *
 * It imports `COMMAND_NAMES`, deliberately, and not `COMMAND_MANIFEST`. The
 * parser wants the command SET; it has no use for each command's category,
 * tier, or upstream classification, and referencing the rich array would ship
 * all of it — measured at +4.8 KB raw in `hyperfixi-hx.js`, a hybrid-parser
 * bundle with no command registry at all, which is enough to break the ±5%
 * bundle-size gate on its own. See the note on `COMMAND_NAMES`.
 *
 * ## This Set is mutable at runtime, deliberately (Finding 6)
 *
 * `runtime/command-adapter.ts`'s `register()` calls `COMMANDS.add(name)` for
 * every command AND every `metadata.aliases` entry, so the parser learns about
 * commands the manifest never named — plugins, custom bundles, commands
 * registered by a test. Before step 3 that mechanism was also load-bearing for
 * a *manifest* command (`pseudo-command` was absent from the seed and only
 * appeared once a Runtime existed, which made the standalone parser and the
 * post-Runtime parser disagree). The manifest now feeds both halves, so
 * registration only ever ADDS to what is already here for the built-in 59.
 *
 * Practical consequence for tests: a test that reads this Set after any other
 * test in the same file constructed a Runtime sees whatever that Runtime
 * registered. Snapshot it before construction if that matters.
 */
export const COMMANDS = new Set<string>([
  ...COMMAND_NAMES,
  // Parser-only, with no command implementation and so no manifest row: `for`
  // is the loop KEYWORD (`for x in y`), accepted in command position and
  // handled by `parseForCommand`, which builds the same node shape `repeat`'s
  // `for` loop type produces. It is also in CONTROL_FLOW_COMMANDS below.
  // `while` is deliberately NOT here: it is only ever reached inside `repeat`'s
  // own syntax (`repeat while <cond>`, and as a repeat-block terminator), never
  // in command position.
  'for',
]);

/**
 * Control flow commands that use block structures
 */
export const CONTROL_FLOW_COMMANDS = new Set(['if', 'unless', 'repeat', 'wait', 'for', 'while']);

/**
 * PUT command operations
 */
export const PUT_OPERATIONS = {
  INTO: 'into',
  BEFORE: 'before',
  AFTER: 'after',
  AT: 'at',
  AT_START_OF: 'at start of',
  AT_END_OF: 'at end of',
} as const;

/**
 * Valid PUT operation keywords (used for validation)
 * Includes both simple and compound prepositions for tokenizer compatibility
 */
export const PUT_OPERATION_KEYWORDS = [
  PUT_OPERATIONS.INTO,
  PUT_OPERATIONS.BEFORE,
  PUT_OPERATIONS.AFTER,
  PUT_OPERATIONS.AT,
  PUT_OPERATIONS.AT_START_OF,
  PUT_OPERATIONS.AT_END_OF,
  'at the start of', // Include "the" variant
  'at the end of', // Include "the" variant
] as const;

/**
 * REPEAT command types
 */
export const REPEAT_TYPES = {
  FOR: 'for',
  WHILE: 'while',
  UNTIL: 'until',
  FOREVER: 'forever',
  TIMES: 'times',
  IN: 'in',
} as const;

/**
 * WAIT command types
 */
export const WAIT_TYPES = {
  FOR: 'for',
  A: 'a',
  AN: 'an',
} as const;

/**
 * Event-related keywords
 */
export const EVENT_KEYWORDS = {
  EVENT: 'event',
  EVENTS: 'events',
  FROM: 'from',
  QUEUE: 'queue',
  CALLED: 'called',
} as const;

/**
 * TOGGLE command modalities
 */
export const TOGGLE_MODALITIES = {
  MODAL: 'modal',
  POPOVER: 'popover',
} as const;

/**
 * Common hyperscript keywords for validation
 */
export const HYPERSCRIPT_KEYWORDS = new Set([
  'if',
  'else',
  'unless',
  'for',
  'while',
  'until',
  'end',
  'and',
  'or',
  'not',
  'in',
  'to',
  'from',
  'into',
  'with',
  'without',
  'as',
  'matches',
  'contains',
  'then',
  'on',
  'when',
  'every',
  'init',
  'def',
  'behavior',
  'the',
  'of',
  'first',
  'last',
]);

/**
 * Helper functions for command classification
 */
export const CommandClassification = {
  isCommand(name: string): boolean {
    return COMMANDS.has(name.toLowerCase());
  },

  isControlFlowCommand(name: string): boolean {
    return CONTROL_FLOW_COMMANDS.has(name.toLowerCase());
  },

  isKeyword(name: string): boolean {
    return HYPERSCRIPT_KEYWORDS.has(name.toLowerCase());
  },

  isTerminator(keyword: string): boolean {
    return (COMMAND_TERMINATORS as readonly string[]).includes(keyword);
  },

  isPutOperation(keyword: string): boolean {
    return (PUT_OPERATION_KEYWORDS as readonly string[]).includes(keyword);
  },

  /**
   * Check if a function name is a CSS color/value function
   * These should be quoted in hyperscript for clean parsing
   */
  isCSSFunction(name: string): boolean {
    return CSS_FUNCTIONS.has(name.toLowerCase());
  },
};

/**
 * CSS functions that use space-separated arguments
 * When used unquoted, they cause parsing issues
 * Recommend: transition *color to 'hsl(265 60% 65%)'
 */
export const CSS_FUNCTIONS = new Set([
  // Color functions (CSS Color Level 4)
  'hsl',
  'hsla',
  'rgb',
  'rgba',
  'hwb',
  'lab',
  'lch',
  'oklch',
  'oklab',
  'color',
  'color-mix',
  // Math functions
  'calc',
  'min',
  'max',
  'clamp',
  // Other CSS functions
  'var',
  'url',
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',
]);

// ============================================================================
// TOKENIZER SETS - Single source of truth for tokenizer classification
// ============================================================================

/**
 * Context variables that reference execution context
 */
export const CONTEXT_VARS = new Set(['me', 'it', 'you', 'result', 'my', 'its', 'your']);

/**
 * Logical operators for boolean expressions
 */
export const LOGICAL_OPERATORS = new Set(['and', 'or', 'not', 'no']);

/**
 * Comparison operators (includes both symbolic and English-style)
 *
 * Note on 'has'/'have':
 * Both forms are supported for grammatical correctness in English.
 * - "I have .active" (correct first-person grammar)
 * - "me has .active" (commonly used but grammatically "me has a car" is wrong)
 * - "it has .active" (correct third-person grammar)
 * - "#element has .active" (correct for named subjects)
 *
 * Hyperscript is designed to read like natural English, so supporting 'have'
 * allows users to write grammatically correct code: "if I have .loading return"
 * The 'I' identifier is case-sensitive (uppercase) to avoid conflict with loop variable 'i'.
 */
export const COMPARISON_OPERATORS = new Set([
  '==',
  '!=',
  '===',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  'is',
  'is not',
  'am', // upstream alias for `is` (e.g., `if I am .active`)
  'is a',
  'is an',
  'is not a',
  'is not an',
  // DOM ordering — upstream _hyperscript precedes/follows
  'precedes',
  'does not precede',
  'follows',
  'does not follow',
  'contains',
  'starts with', // "str starts with prefix" (upstream _hyperscript 0.9.90)
  'ends with', // "str ends with suffix" (upstream _hyperscript 0.9.90)
  'does not start with',
  'does not end with',
  'has', // "it has .class", "#element has .class"
  'have', // "I have .class" - grammatically correct first-person
  'does not contain',
  'include',
  'includes',
  'does not include',
  'match',
  'matches',
  'exists',
  'does not exist',
  'is empty',
  'is not empty',
  'is in',
  'is not in',
  'is between',
  'is not between',
  'equals',
  'in',
  // English-style comparison operators
  'is equal to',
  'is really equal to',
  'is not equal to',
  'is not really equal to',
  'is greater than',
  'is less than',
  'is greater than or equal to',
  'is less than or equal to',
  'really equals',
  // Upstream parity — shortened / first-person ("am") comparison forms.
  // `am`/`is` are interchangeable; the trailing `equal`/`to` words are optional;
  // `contain`/`match` accept `do not`/`does not` negation with either spelling.
  'am in', // `I am in [1, 2]`
  'am not in',
  'am between', // `I am between 1 and 10`
  'am not between',
  'is really', // strict equality without `equal to` — `2 is really 2`
  'is not really',
  'is equal', // loose equality without trailing `to` — `2 is equal 2`
  'is not equal',
  'contain', // singular subject — `I contain that`
  'do not contain', // first-person negation — `I do not contain that`
  'does not contains', // third-person + plural verb — `that does not contains me`
  'do not match', // `I do not match .foo`
  'does not match', // `x does not match .foo`
  // Postfix modifier on string comparators (upstream _hyperscript 0.9.90):
  //   "name is 'alice' ignoring case"
  //   "str starts with 'hi' ignoring case"
  'ignoring case',
  // Collection operators (upstream _hyperscript 0.9.90).
  // `where` is a single-word keyword already recognized by the identifier
  // classifier — the Pratt table picks it up as an infix operator in
  // expression contexts. Multi-word forms must be registered here so the
  // tokenizer's compound-operator path emits them as single OPERATOR tokens.
  'sorted by',
  'mapped to',
  'split by',
  'joined by',
]);

/**
 * Common DOM events for event handling
 */
export const DOM_EVENTS = new Set([
  'click',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseover',
  'mouseout',
  'mousemove',
  'mouseenter',
  'mouseleave',
  'focus',
  'blur',
  'change',
  'input',
  'submit',
  'reset',
  'select',
  'load',
  'unload',
  'resize',
  'scroll',
  'keydown',
  'keyup',
  'keypress',
  'touchstart',
  'touchend',
  'touchmove',
  'touchcancel',
  'drag',
  'drop',
  'dragover',
  'dragenter',
  'dragleave',
  'cut',
  'copy',
  'paste',
  'toggle',
]);

/**
 * Keywords the tokenizer should classify as KEYWORD tokens.
 *
 * Overlaps with but is not a superset of HYPERSCRIPT_KEYWORDS: this set
 * scopes tokenization, while HYPERSCRIPT_KEYWORDS scopes validation. Each
 * contains entries the other lacks (e.g. `where`, `before`, `equal` are
 * tokenizer-only; `matches`, `contains`, `every`, `first`, `last` are
 * validation-only).
 */
export const TOKENIZER_KEYWORDS = new Set([
  'on',
  'init',
  'behavior',
  'def',
  'if',
  'else',
  'unless',
  'for',
  'while',
  'until',
  'end',
  'and',
  'or',
  'not',
  'in',
  'to',
  'from',
  'into',
  'with',
  'as',
  'then',
  'when',
  'where',
  'after',
  'before',
  'by',
  'at',
  'between',
  'async',
  'no',
  // Compound syntax keywords
  'start',
  'of',
  'the',
  // Constructor keyword
  'new',
  // Scope keywords
  'global',
  'local',
  // Additional keywords for English-style operators
  'equal',
  'equals',
  'greater',
  'less',
  'than',
  'really',
  // Exception handling keywords
  'catch',
  'finally',
  'throw',
  'return',
]);
