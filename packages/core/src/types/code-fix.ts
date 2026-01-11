/**
 * CodeFix Types for Automated Error Resolution
 *
 * LSP-compatible code fix suggestions for IDE/LLM automation.
 * These types are exported from core for use by MCP server and tooling,
 * but the ErrorFixes registry is kept in MCP server only to avoid
 * browser bundle bloat.
 *
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#codeAction
 */

/**
 * LSP CodeActionKind values relevant to hyperscript fixes.
 */
export type CodeActionKind = 'quickfix' | 'refactor' | 'source';

/**
 * Text edit range for applying fixes.
 */
export interface TextRange {
  /** Start position (0-indexed character offset) */
  readonly start: number;
  /** End position (0-indexed character offset) */
  readonly end: number;
}

/**
 * A text edit operation.
 */
export interface TextEdit {
  /** Type of edit operation */
  readonly type: 'insert' | 'replace' | 'delete';
  /** Range to modify (required for replace/delete, optional for insert) */
  readonly range?: TextRange;
  /** Text to insert or replace with (required for insert/replace) */
  readonly text?: string;
}

/**
 * A command to execute as part of a fix.
 */
export interface FixCommand {
  /** Command identifier */
  readonly name: string;
  /** Command arguments */
  readonly arguments: readonly unknown[];
}

/**
 * LSP-compatible code fix for automated error resolution.
 *
 * Can be used by IDEs to provide quick-fix suggestions and by
 * LLMs to automatically apply corrections.
 */
export interface CodeFix {
  /** Unique fix identifier (e.g., 'add-exists-check', 'fix-typo') */
  readonly code: string;

  /**
   * Short description shown in quick-fix menu.
   * May contain template placeholders like ${suggestion}.
   */
  readonly title: string;

  /** LSP CodeActionKind */
  readonly kind: CodeActionKind;

  /** Detailed explanation of what the fix does */
  readonly description?: string;

  /** The actual text edit to apply */
  readonly edit?: TextEdit;

  /** Alternative: command to execute instead of text edit */
  readonly command?: FixCommand;

  /**
   * Priority for sorting in quick-fix menu.
   * Higher values appear first. Default: 0
   */
  readonly priority?: number;

  /**
   * Whether this fix is preferred (shown prominently in IDE).
   * Typically only one fix per diagnostic should be preferred.
   */
  readonly isPreferred?: boolean;
}

/**
 * An error that can provide automated fixes.
 * Extends the standard error with fix suggestions.
 */
export interface FixableError {
  /** Error code from ErrorCodes */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Severity level */
  readonly severity: 'error' | 'warning' | 'info';
  /** Available fixes for this error */
  readonly fixes?: readonly CodeFix[];
}

/**
 * Diagnostic with associated code actions.
 * Used by MCP get_diagnostics response.
 */
export interface DiagnosticWithFixes {
  /** Index into the diagnostics array */
  readonly diagnosticIndex: number;
  /** Available fixes for this diagnostic */
  readonly fixes: readonly CodeFix[];
}

/**
 * Extended diagnostic response including code actions.
 */
export interface DiagnosticResponseWithFixes {
  /** Standard diagnostics array */
  readonly diagnostics: readonly unknown[];
  /** Code actions keyed by diagnostic index */
  readonly codeActions?: readonly DiagnosticWithFixes[];
}
