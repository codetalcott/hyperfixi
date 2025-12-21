/**
 * Parser Constants
 * Centralized location for all keywords, commands, and magic strings used in parser
 */

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

  // Conversion
  AS: 'as',

  // Comparison
  MATCHES: 'matches',
  CONTAINS: 'contains',

  // Events
  ON: 'on',
  WHEN: 'when',
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
 * All hyperscript commands
 */
export const COMMANDS = new Set([
  'add',
  'append',
  'async',
  'beep',
  'break',
  'call',
  'continue',
  'copy',
  'decrement',
  'default',
  'exit',
  'fetch',
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
  'morph',      // htmx-like: DOM morphing with state preservation
  'pick',
  'process',    // htmx-like: process partials
  'push',       // htmx-like: push url to history
  'put',
  'remove',
  'render',
  'repeat',
  'replace',    // htmx-like: replace url in history
  'return',
  'send',
  'set',
  'settle',
  'show',
  'swap',       // htmx-like: DOM swapping with multiple strategies
  'take',
  'tell',
  'throw',
  'toggle',
  'transition',
  'trigger',
  'unless',
  'wait',
]);

/**
 * Compound commands that require special parsing logic
 * These commands have complex argument patterns and prepositions
 */
export const COMPOUND_COMMANDS = new Set([
  'put',
  'trigger',
  'send',       // send <event> to <target> (alias for trigger)
  'remove',
  'take',
  'toggle',
  'set',
  'show',
  'hide',
  'add',
  'halt',
  'measure',
  'js',
  'tell',       // tell <target> <command> [<command> ...]
  // htmx-like commands with complex argument patterns
  'swap',       // swap [strategy] of <target> with <content> [using view transition]
  'morph',      // morph [over] <target> with <content>
  'push',       // push url <url> [with title <title>]
  'replace',    // replace url <url> [with title <title>]
  'process',    // process partials in <content> [using view transition]
]);

/**
 * Control flow commands that use block structures
 */
export const CONTROL_FLOW_COMMANDS = new Set([
  'if',
  'unless',
  'repeat',
  'wait',
  'for',
  'while',
]);

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
  'at the start of',  // Include "the" variant
  'at the end of',    // Include "the" variant
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

  isCompoundCommand(name: string): boolean {
    return COMPOUND_COMMANDS.has(name.toLowerCase());
  },

  isControlFlowCommand(name: string): boolean {
    return CONTROL_FLOW_COMMANDS.has(name.toLowerCase());
  },

  isKeyword(name: string): boolean {
    return HYPERSCRIPT_KEYWORDS.has(name.toLowerCase());
  },

  isTerminator(keyword: string): boolean {
    return COMMAND_TERMINATORS.includes(keyword as any);
  },

  isPutOperation(keyword: string): boolean {
    return PUT_OPERATION_KEYWORDS.includes(keyword as any);
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
  'hsl', 'hsla', 'rgb', 'rgba', 'hwb',
  'lab', 'lch', 'oklch', 'oklab',
  'color', 'color-mix',
  // Math functions
  'calc', 'min', 'max', 'clamp',
  // Other CSS functions
  'var', 'url', 'linear-gradient', 'radial-gradient',
  'conic-gradient', 'repeating-linear-gradient',
  'repeating-radial-gradient', 'repeating-conic-gradient',
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
  'is a',
  'is an',
  'is not a',
  'is not an',
  'contains',
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
]);

/**
 * Tokenizer keywords (superset of HYPERSCRIPT_KEYWORDS with additional tokenizer-specific entries)
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
