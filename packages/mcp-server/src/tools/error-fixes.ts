/**
 * Error Fixes Registry (MCP-Only)
 *
 * This registry is intentionally kept in the MCP server only to avoid
 * browser bundle bloat. LLMs and IDEs access fixes via MCP tools.
 *
 * Each fix follows the LSP CodeAction format for IDE integration.
 */

/**
 * A fix in the LSP CodeAction shape. (The type lived in @hyperfixi/core, whose
 * error catalog these fixes key on, until Phase C4; it is this registry's own now.)
 */
export interface CodeFix {
  /** Unique fix identifier (e.g., 'add-exists-check', 'fix-typo') */
  readonly code: string;
  /** Short description shown in the quick-fix menu; may hold `${suggestion}`. */
  readonly title: string;
  /** LSP CodeActionKind */
  readonly kind: 'quickfix' | 'refactor' | 'source';
  /** What the fix does */
  readonly description?: string;
  /** The text edit to apply (character offsets) */
  readonly edit?: {
    readonly type: 'insert' | 'replace' | 'delete';
    readonly range?: { readonly start: number; readonly end: number };
    readonly text?: string;
  };
  /** A command to run instead of an edit */
  readonly command?: { readonly name: string; readonly arguments: readonly unknown[] };
  /** Higher sorts first (default 0) */
  readonly priority?: number;
  /** Shown prominently; at most one per diagnostic */
  readonly isPreferred?: boolean;
}

/**
 * Registry of automated fixes for known error codes.
 *
 * Keys are the codes validate_and_compile, translate_code and score_fidelity emit
 * (@lokascript/compilation-service, UPPER_SNAKE: a test holds every one of them here), then the
 * dotted catalog core's engine used before 4.0. get_diagnostics' kebab-case codes map onto both
 * (getFixesForDiagnostic). Values are arrays of CodeFix suggestions.
 */
export const ErrorFixes: Record<string, CodeFix[]> = {
  // ==========================================================================
  // validate_and_compile / translate_code / score_fidelity diagnostics
  // ==========================================================================

  ENGINE_PARSE_ERROR: [
    {
      code: 'check-named-token',
      title: 'Check the word the engine stopped on',
      kind: 'quickfix',
      description:
        'The engine reads upstream _hyperscript and stops at the first token it cannot read. ' +
        'A misspelled command or keyword is the usual cause: get_diagnostics suggests the ' +
        'nearest command, and get_command_docs shows its syntax.',
      priority: 100,
      isPreferred: true,
    },
    {
      code: 'write-upstream-spelling',
      title: "Write upstream's spelling of a core-only form",
      kind: 'quickfix',
      description:
        'Forms only HyperFixi 3.x ran are not read by the engine: write `X matches .c` for ' +
        '`X has .c`, `put X at start of Y` for `prepend X to Y`, `set @a of X to v` for ' +
        '`set @a to v on X`, `go to url "/x"` for `go to /x`, and a template literal ' +
        '(fetch `/q?x=${v}`) for a URL with ${} in it.',
      priority: 80,
    },
    {
      code: 'read-the-english',
      title: 'For non-English code, read the English it became',
      kind: 'quickfix',
      description:
        'The engine runs the English rendering of non-English code; the message quotes it. ' +
        'translate_to_english shows the same text: fix the source where its English goes wrong.',
      priority: 60,
    },
  ],

  UNCONSUMED_INPUT: [
    {
      code: 'add-role-marker',
      title: 'Add the role marker before the target',
      kind: 'quickfix',
      description:
        'Tokens no role took were dropped, and the role fell back to a default such as `me`. ' +
        'Usually a marker is missing: `add .x to #el`, `remove .x from #el`, `toggle .x on #el`, ' +
        '`put "v" into #el`. get_command_docs lists the markers of each command.',
      priority: 100,
      isPreferred: true,
    },
    {
      code: 'separate-commands',
      title: 'Separate the next command with "then"',
      kind: 'quickfix',
      description: 'If the dropped tokens begin a second command, put `then` before it.',
      priority: 70,
    },
  ],

  PARSE_FAILED: [
    {
      code: 'check-language',
      title: 'Check the language argument',
      kind: 'quickfix',
      description: 'The code is read as the language given (default "en").',
      priority: 100,
      isPreferred: true,
    },
    {
      code: 'validate-one-command',
      title: 'Validate one command at a time',
      kind: 'quickfix',
      description:
        'Validate the first command alone, then add the rest one at a time to find the part ' +
        'that fails.',
      priority: 80,
    },
    {
      code: 'use-explicit-syntax',
      title: 'Write it in explicit syntax',
      kind: 'quickfix',
      description:
        'Pass `explicit` to validate_and_compile: [command role:value ...], e.g. ' +
        '[toggle patient:.active destination:#menu]. get_command_docs lists the roles.',
      priority: 60,
    },
  ],

  EXPLICIT_PARSE_ERROR: [
    {
      code: 'fix-explicit-format',
      title: 'Use [command role:value ...]',
      kind: 'quickfix',
      description:
        'One command per bracket, each role written role:value with a role name from ' +
        'get_command_docs (patient, destination, source, …); quote a value that holds spaces.',
      priority: 100,
      isPreferred: true,
    },
  ],

  LOW_CONFIDENCE: [
    {
      code: 'use-explicit-syntax',
      title: 'Write it in explicit syntax',
      kind: 'quickfix',
      description:
        'The parse is unsure which pattern the code follows. Explicit syntax names every ' +
        'role: [toggle patient:.active destination:#menu].',
      priority: 100,
      isPreferred: true,
    },
    {
      code: 'check-language',
      title: 'Check the language argument',
      kind: 'quickfix',
      description: 'Code read as the wrong language parses with low confidence.',
      priority: 80,
    },
  ],

  INERT_QUANTIFIER_TARGET: [
    {
      code: 'drop-quantifier',
      title: 'Write the selector without "all"/"every"',
      kind: 'quickfix',
      description: 'A selector already addresses every match: `add .done to .todo`.',
      priority: 100,
      isPreferred: true,
    },
  ],

  HALF_PARSED_CONDITION: [
    {
      code: 'use-matches',
      title: 'Test a class with "matches"',
      kind: 'quickfix',
      description: 'For class tests use `matches`: `if #box matches .danger`.',
      edit: {
        type: 'replace',
        text: 'if ${target} matches ${class}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  INERT_PROPERTY_WRITE: [
    {
      code: 'use-text-content',
      title: 'Write textContent, or put into the element',
      kind: 'quickfix',
      description: '`text` is not a DOM property on most elements.',
      edit: {
        type: 'replace',
        text: 'put ${value} into ${target}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  THIS_IS_NOT_ME: [
    {
      code: 'use-me',
      title: 'Write `me` for the element the handler is on',
      kind: 'quickfix',
      description:
        'Hyperscript has no `this`: it reads a variable nobody set, so it is null. The element ' +
        'the handler is on is `me`, and its properties are `my value` or `me.value`.',
      edit: {
        type: 'replace',
        text: 'me',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  ENGINE_CHECK_SKIPPED: [
    {
      code: 'install-engine',
      title: 'Install @hyperfixi/engine beside the server',
      kind: 'quickfix',
      description:
        'Without the engine, English is checked by the semantic parser only, and code the engine ' +
        'cannot read can come back ok. @hyperfixi/mcp-server 7.5.0 and later depend on it; an older ' +
        'install, or one that skipped it, needs `npm install @hyperfixi/engine`.',
      priority: 100,
      isPreferred: true,
    },
  ],

  UNKNOWN_EVENT_WORD: [
    {
      code: 'use-event-word',
      title: "Write the language's word for the event",
      kind: 'quickfix',
      description:
        'The handler listens for a custom event of that name, which nothing fires unless a script ' +
        "sends it. Write the language's word for the DOM event (get_keyword_translations), or its " +
        'English name (`click`); a custom event fired on purpose is clearer written as code.',
      priority: 100,
      isPreferred: true,
    },
  ],

  NAME_COLLISION: [
    {
      code: 'rename-variable',
      title: 'Rename the variable',
      kind: 'quickfix',
      description:
        "The variable is spelled like a word of the code's language, and the parse reads it " +
        "as that word in some places. The diagnostic's suggestion names a spelling that is free.",
      priority: 100,
      isPreferred: true,
    },
  ],

  INCOMPLETE_PARSE: [
    {
      code: 'fix-unconsumed-input-first',
      title: 'Fix the UNCONSUMED_INPUT diagnostics first',
      kind: 'quickfix',
      description:
        'The scores compare only what parsed. Once both sides parse whole, score them again.',
      priority: 100,
      isPreferred: true,
    },
  ],

  LOSSY_TRANSLATION: [
    {
      code: 'validate-source',
      title: 'Validate the source first',
      kind: 'quickfix',
      description:
        'A source whose parse drops a clause translates without it. Run validate_and_compile ' +
        'on the source and fix its UNCONSUMED_INPUT diagnostics.',
      priority: 100,
      isPreferred: true,
    },
    {
      code: 'translate-in-parts',
      title: 'Translate the commands separately',
      kind: 'quickfix',
      description:
        'If the source is whole, some shape in it has no translation yet. Translate the ' +
        'commands one at a time, or show the English for the one that is refused.',
      priority: 60,
    },
  ],

  NO_INPUT: [
    {
      code: 'provide-input',
      title: 'Pass code, explicit or semantic',
      kind: 'quickfix',
      description:
        'validate_and_compile reads `code` (with `language`), `explicit` bracket syntax, or ' +
        'a `semantic` JSON node.',
      priority: 100,
      isPreferred: true,
    },
  ],

  // ==========================================================================
  // Missing Element Errors
  // ==========================================================================

  'NOT_FOUND.ELEMENT': [
    {
      code: 'add-exists-check',
      title: 'Add element existence check',
      kind: 'quickfix',
      description: 'Wrap the command in an "if exists" conditional to prevent runtime errors',
      edit: {
        type: 'replace',
        text: 'if ${selector} exists\n  ${command}\nend',
      },
      priority: 100,
      isPreferred: true,
    },
    {
      code: 'add-optional-chaining',
      title: 'Use optional target',
      kind: 'quickfix',
      description: 'Add "?" to make the target optional (silently skips if not found)',
      edit: {
        type: 'replace',
        text: '${command} on ${selector}?',
      },
      priority: 50,
    },
  ],

  'NOT_FOUND.CLASS': [
    {
      code: 'verify-class-name',
      title: 'Verify class name starts with dot',
      kind: 'quickfix',
      description: 'Class selectors should start with a dot (.classname)',
      priority: 100,
      isPreferred: true,
    },
  ],

  // ==========================================================================
  // Missing Argument Errors
  // ==========================================================================

  'MISSING.ARGUMENT': [
    {
      code: 'add-toggle-target',
      title: 'Add class or attribute to toggle',
      kind: 'quickfix',
      description: 'toggle command requires a target (class, attribute, or visibility)',
      edit: {
        type: 'replace',
        text: 'toggle .${1:classname}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'MISSING.DESTINATION': [
    {
      code: 'add-put-destination',
      title: 'Add "into" destination',
      kind: 'quickfix',
      description: 'put command requires a destination (into #element)',
      edit: {
        type: 'replace',
        text: '${value} into ${1:#element}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'MISSING.SOURCE': [
    {
      code: 'add-for-source',
      title: 'Add collection to iterate',
      kind: 'quickfix',
      description: 'for loop requires a collection (for each item in collection)',
      edit: {
        type: 'replace',
        text: 'for each ${1:item} in ${2:collection}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  // ==========================================================================
  // Type Mismatch Errors
  // ==========================================================================

  'VALIDATION.TYPE_MISMATCH': [
    {
      code: 'convert-to-number',
      title: 'Convert to number',
      kind: 'quickfix',
      description: 'Use "as Number" to convert value to numeric type',
      edit: {
        type: 'replace',
        text: '${value} as Number',
      },
      priority: 100,
    },
    {
      code: 'convert-to-string',
      title: 'Convert to string',
      kind: 'quickfix',
      description: 'Use "as String" to convert value to text',
      edit: {
        type: 'replace',
        text: '${value} as String',
      },
      priority: 90,
    },
  ],

  // ==========================================================================
  // Typo/Unknown Command Errors
  // ==========================================================================

  'VALIDATION.TYPO_DETECTED': [
    {
      code: 'fix-typo',
      title: 'Fix typo: ${suggestion}',
      kind: 'quickfix',
      description: 'Replace with suggested correct spelling',
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.UNKNOWN_COMMAND': [
    {
      code: 'check-spelling',
      title: 'Check command spelling',
      kind: 'quickfix',
      description: 'Command not recognized. Check for typos or missing imports.',
      priority: 50,
    },
  ],

  // ==========================================================================
  // Syntax Errors
  // ==========================================================================

  'SYNTAX.UNBALANCED_PARENS': [
    {
      code: 'add-closing-paren',
      title: 'Add missing closing parenthesis',
      kind: 'quickfix',
      edit: {
        type: 'insert',
        text: ')',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.UNBALANCED_BRACKETS': [
    {
      code: 'add-closing-bracket',
      title: 'Add missing closing bracket',
      kind: 'quickfix',
      edit: {
        type: 'insert',
        text: ']',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.UNBALANCED_BRACES': [
    {
      code: 'add-closing-brace',
      title: 'Add missing closing brace',
      kind: 'quickfix',
      edit: {
        type: 'insert',
        text: '}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.UNMATCHED_BACKTICK': [
    {
      code: 'add-closing-backtick',
      title: 'Add missing closing backtick',
      kind: 'quickfix',
      edit: {
        type: 'insert',
        text: '`',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.UNMATCHED_QUOTE': [
    {
      code: 'add-closing-quote',
      title: 'Add missing closing quote',
      kind: 'quickfix',
      edit: {
        type: 'insert',
        text: '"',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.MISSING_THEN': [
    {
      code: 'add-then',
      title: 'Add "then" between commands',
      kind: 'quickfix',
      description: 'Commands should be separated by "then"',
      edit: {
        type: 'replace',
        text: '${command1} then ${command2}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  'SYNTAX.MISSING_END': [
    {
      code: 'add-end',
      title: 'Add missing "end"',
      kind: 'quickfix',
      description: 'Block commands (if, repeat, for) require "end"',
      edit: {
        type: 'insert',
        text: '\nend',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  // ==========================================================================
  // Runtime Errors
  // ==========================================================================

  'RUNTIME.TIMEOUT': [
    {
      code: 'increase-timeout',
      title: 'Increase timeout duration',
      kind: 'quickfix',
      description: 'Operation timed out. Consider increasing wait time.',
      priority: 50,
    },
    {
      code: 'add-async',
      title: 'Make operation async',
      kind: 'quickfix',
      description: 'Wrap in async block to avoid blocking',
      edit: {
        type: 'replace',
        text: 'async do ${command} end',
      },
      priority: 40,
    },
  ],

  'RUNTIME.NETWORK_ERROR': [
    {
      code: 'add-error-handler',
      title: 'Add error handler',
      kind: 'quickfix',
      description: 'Add error handling for network failures',
      edit: {
        type: 'replace',
        text: 'fetch ${url}\n  on error put "Network error" into ${target}\nend',
      },
      priority: 100,
      isPreferred: true,
    },
  ],

  // ==========================================================================
  // Deprecation Warnings
  // ==========================================================================

  'DEPRECATION.PREFER_WAIT': [
    {
      code: 'replace-with-wait',
      title: 'Replace setTimeout with wait',
      kind: 'refactor',
      description: 'Use hyperscript "wait" command instead of JavaScript setTimeout',
      edit: {
        type: 'replace',
        text: 'wait ${duration}',
      },
      priority: 100,
      isPreferred: true,
    },
  ],
};

/**
 * Get available fixes for an error code.
 *
 * @param errorCode - The error code (e.g., 'NOT_FOUND.ELEMENT')
 * @returns Array of CodeFix suggestions, or empty array if none available
 */
export function getFixesForError(errorCode: string): CodeFix[] {
  return ErrorFixes[errorCode] || getFixesForDiagnostic(errorCode);
}

/**
 * Get all fixes that might apply to a diagnostic based on its code.
 *
 * Handles both exact matches and prefix matches (e.g., 'MISSING.*').
 *
 * @param diagnosticCode - The diagnostic code from get_diagnostics
 * @returns Array of applicable CodeFix suggestions
 */
export function getFixesForDiagnostic(diagnosticCode: string): CodeFix[] {
  // Try exact match first
  const exactFixes = ErrorFixes[diagnosticCode];
  if (exactFixes) {
    return exactFixes;
  }

  // Map other codes onto the registry's keys: validate_and_compile's parse-failure variants, and
  // get_diagnostics' kebab-case codes. (Every target must be a key above: `parse-error` and
  // `low-confidence` pointed at keys that did not exist, so they found no fixes.)
  const codeMapping: Record<string, string> = {
    PARSE_ERROR: 'PARSE_FAILED',
    PARSE_EXCEPTION: 'PARSE_FAILED',
    PARSE_DIAGNOSTIC: 'PARSE_FAILED', // a parser warning that carried no code of its own
    'parse-error': 'ENGINE_PARSE_ERROR',
    'semantic-error': 'PARSE_FAILED',
    'low-confidence': 'LOW_CONFIDENCE',
    'engine-check-skipped': 'ENGINE_CHECK_SKIPPED',
    'unmatched-quote': 'SYNTAX.UNMATCHED_QUOTE',
    'unmatched-backtick': 'SYNTAX.UNMATCHED_BACKTICK',
    'unbalanced-parens': 'SYNTAX.UNBALANCED_PARENS',
    'unbalanced-brackets': 'SYNTAX.UNBALANCED_BRACKETS',
    'unbalanced-braces': 'SYNTAX.UNBALANCED_BRACES',
    'missing-then': 'SYNTAX.MISSING_THEN',
    'missing-role': 'MISSING.ARGUMENT',
    'possible-typo': 'VALIDATION.TYPO_DETECTED',
    'prefer-wait': 'DEPRECATION.PREFER_WAIT',
  };

  const mappedCode = codeMapping[diagnosticCode];
  if (mappedCode) {
    return ErrorFixes[mappedCode] || [];
  }

  return [];
}

/**
 * Get all available error codes that have fixes.
 */
export function getFixableErrorCodes(): string[] {
  return Object.keys(ErrorFixes);
}

/**
 * Check if an error code has available fixes.
 */
export function hasFixesForError(errorCode: string): boolean {
  return errorCode in ErrorFixes || getFixesForDiagnostic(errorCode).length > 0;
}
