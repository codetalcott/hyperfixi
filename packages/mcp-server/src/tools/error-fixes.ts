/**
 * Error Fixes Registry (MCP-Only)
 *
 * This registry is intentionally kept in the MCP server only to avoid
 * browser bundle bloat. LLMs and IDEs access fixes via MCP tools.
 *
 * Each fix follows the LSP CodeAction format for IDE integration.
 */

import type { CodeFix } from '@hyperfixi/core';

/**
 * Registry of automated fixes for known error codes.
 *
 * Keys are error codes from ErrorCodes (packages/core/src/types/error-codes.ts).
 * Values are arrays of CodeFix suggestions.
 */
export const ErrorFixes: Record<string, CodeFix[]> = {
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
  return ErrorFixes[errorCode] || [];
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

  // Try mapping common diagnostic codes to error codes
  const codeMapping: Record<string, string> = {
    'parse-error': 'SYNTAX.PARSE_ERROR',
    'unmatched-quote': 'SYNTAX.UNMATCHED_QUOTE',
    'unbalanced-parens': 'SYNTAX.UNBALANCED_PARENS',
    'unbalanced-brackets': 'SYNTAX.UNBALANCED_BRACKETS',
    'unbalanced-braces': 'SYNTAX.UNBALANCED_BRACES',
    'missing-then': 'SYNTAX.MISSING_THEN',
    'missing-role': 'MISSING.ARGUMENT',
    'possible-typo': 'VALIDATION.TYPO_DETECTED',
    'prefer-wait': 'DEPRECATION.PREFER_WAIT',
    'low-confidence': 'VALIDATION.AMBIGUOUS',
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
