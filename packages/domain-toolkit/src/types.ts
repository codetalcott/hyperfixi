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

/**
 * Matcher for an acknowledged-but-unfixed finding. Each entry is an object
 * whose fields are compared against the finding's rule + context. A finding
 * matches a waiver if every field in the waiver matches the corresponding
 * field on the finding (or finding.context). Matched findings are dropped
 * from the returned result entirely.
 *
 * Use sparingly — waivers are real debt that should have a plan to resolve.
 */
export interface LintWaiver {
  readonly rule: string;
  readonly reason: string; // human-readable; not matched against — for audit
  readonly matches?: Record<string, string | number | boolean>;
}

export interface DomainLintInput {
  readonly name: string;
  readonly schemas: readonly CommandSchema[];
  readonly profiles: readonly PatternGenLanguageProfile[];
  readonly tokenizers: Readonly<Record<string, LanguageTokenizer>>;
  readonly renderer?: RendererTables;
  readonly waivers?: readonly LintWaiver[];
}

/**
 * A single rule is a pure function producing findings.
 */
export type LintRule = (input: DomainLintInput) => LintFinding[];
