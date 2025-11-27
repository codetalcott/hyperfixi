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

  // Definitions
  INIT: 'init',
  DEF: 'def',
  BEHAVIOR: 'behavior',

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
  'pick',
  'put',
  'remove',
  'render',
  'repeat',
  'return',
  'send',
  'set',
  'settle',
  'show',
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
  'remove',
  'take',
  'toggle',
  'set',
  'show',
  'hide',
  'add',
  'halt',
  'measure',
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
};
