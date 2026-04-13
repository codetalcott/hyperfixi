/**
 * Core types for the domain linter.
 */

import type { CommandSchema } from '@lokascript/intent';
import type { PatternGenLanguageProfile, LanguageTokenizer } from '@lokascript/framework';

export type Severity = 'error' | 'warning' | 'note';

export interface LintFinding {
  readonly rule: string;
  readonly severity: Severity;
  readonly message: string;
  /** Optional structured context: domain, language code, command action, role name, etc. */
  readonly context?: Record<string, string | number | boolean>;
}

export interface LintResult {
  readonly domain: string;
  readonly findings: readonly LintFinding[];
  /** Count helpers — derived from findings. */
  readonly errorCount: number;
  readonly warningCount: number;
}

/**
 * Optional renderer metadata for R10 (renderer-coherence check).
 * Domains without a renderer or without standard table shape omit this field.
 */
export interface RendererTables {
  /** Keyed by action name → lang code → keyword. */
  readonly commandKeywords: Record<string, Record<string, string>>;
  /** Keyed by marker name → lang code → marker word. */
  readonly markers: Record<string, Record<string, string>>;
}

export interface DomainLintInput {
  readonly name: string;
  readonly schemas: readonly CommandSchema[];
  readonly profiles: readonly PatternGenLanguageProfile[];
  readonly tokenizers: Readonly<Record<string, LanguageTokenizer>>;
  readonly renderer?: RendererTables;
}

/**
 * A single rule is a pure function producing findings.
 */
export type LintRule = (input: DomainLintInput) => LintFinding[];
