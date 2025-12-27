/**
 * Partial Validation Warning Formatter
 * Generates helpful console warnings for partial validation issues
 *
 * Uses styled console output in browsers for clear visibility.
 * Falls back to plain text in Node.js environments.
 */

import type {
  PartialValidationResult,
  PartialValidationIssue,
  PartialValidationSeverity,
} from './partial-validation-types';

// ============================================================================
// Console Styles (Browser)
// ============================================================================

const STYLES = {
  header: 'font-weight: bold; font-size: 13px; color: #6366f1;',
  critical: 'color: #dc2626; font-weight: bold;',
  structural: 'color: #ea580c; font-weight: bold;',
  warning: 'color: #ca8a04; font-weight: bold;',
  element: 'color: #7c3aed; font-weight: bold;',
  suggestion: 'color: #16a34a; font-style: italic;',
  target: 'color: #0891b2;',
  normal: 'color: inherit;',
  count: 'color: #6b7280;',
};

const SEVERITY_ICONS: Record<PartialValidationSeverity, string> = {
  critical: '\u{1F6A8}', // Police car light
  structural: '\u{26A0}\u{FE0F}', // Warning sign
  warning: '\u{1F4A1}', // Light bulb
};

const SEVERITY_LABELS: Record<PartialValidationSeverity, string> = {
  critical: 'CRITICAL',
  structural: 'STRUCTURAL',
  warning: 'WARNING',
};

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if we're in a browser environment with styled console support
 */
function supportsStyledConsole(): boolean {
  return typeof window !== 'undefined' && typeof console !== 'undefined';
}

// ============================================================================
// Warning Output
// ============================================================================

/**
 * Emit validation warnings to console
 * Uses styled console output in browsers for clear visibility
 *
 * @example
 * const result = validatePartialContent(html, '#target');
 * if (result.totalIssues > 0) {
 *   emitPartialValidationWarnings(result);
 * }
 */
export function emitPartialValidationWarnings(result: PartialValidationResult): void {
  if (result.totalIssues === 0) return;

  if (supportsStyledConsole()) {
    emitStyledWarnings(result);
  } else {
    emitPlainWarnings(result);
  }
}

/**
 * Emit styled warnings (browser environment)
 */
function emitStyledWarnings(result: PartialValidationResult): void {
  // Group console output
  console.groupCollapsed(
    `%c[HyperFixi] Partial Template Validation: ${result.totalIssues} issue(s) found`,
    STYLES.header
  );

  // Summary line
  emitSummaryLine(result);

  // Critical issues first (if any)
  if (result.bySeverity.critical.length > 0) {
    console.group(
      `%c${SEVERITY_ICONS.critical} Critical Issues (${result.bySeverity.critical.length})`,
      STYLES.critical
    );
    for (const issue of result.bySeverity.critical) {
      emitStyledIssue(issue);
    }
    console.groupEnd();
  }

  // Structural issues
  if (result.bySeverity.structural.length > 0) {
    console.group(
      `%c${SEVERITY_ICONS.structural} Structural Issues (${result.bySeverity.structural.length})`,
      STYLES.structural
    );
    for (const issue of result.bySeverity.structural) {
      emitStyledIssue(issue);
    }
    console.groupEnd();
  }

  // Warnings
  if (result.bySeverity.warning.length > 0) {
    console.group(
      `%c${SEVERITY_ICONS.warning} Warnings (${result.bySeverity.warning.length})`,
      STYLES.warning
    );
    for (const issue of result.bySeverity.warning) {
      emitStyledIssue(issue);
    }
    console.groupEnd();
  }

  console.groupEnd();
}

/**
 * Emit summary line with counts
 */
function emitSummaryLine(result: PartialValidationResult): void {
  const parts: string[] = [];
  const styles: string[] = [];

  if (result.bySeverity.critical.length > 0) {
    parts.push(`%c${result.bySeverity.critical.length} critical%c`);
    styles.push(STYLES.critical, STYLES.normal);
  }

  if (result.bySeverity.structural.length > 0) {
    if (parts.length > 0) parts.push(', ');
    parts.push(`%c${result.bySeverity.structural.length} structural%c`);
    styles.push(STYLES.structural, STYLES.normal);
  }

  if (result.bySeverity.warning.length > 0) {
    if (parts.length > 0) parts.push(', ');
    parts.push(`%c${result.bySeverity.warning.length} warning(s)%c`);
    styles.push(STYLES.warning, STYLES.normal);
  }

  if (parts.length > 0) {
    console.log(`Found: ${parts.join('')}`, ...styles);
  }
}

/**
 * Emit a single styled issue
 */
function emitStyledIssue(issue: PartialValidationIssue): void {
  const countStr = issue.count > 1 ? ` %c(${issue.count} instances)%c` : '';
  const countStyles = issue.count > 1 ? [STYLES.count, STYLES.normal] : [];

  console.log(
    `  %c<${issue.element}>${countStr}: %c${issue.message}`,
    STYLES.element,
    ...countStyles,
    STYLES.normal
  );

  console.log(`    %c\u{1F4A1} ${issue.suggestion}`, STYLES.suggestion);

  if (issue.targetSelector) {
    console.log(
      `    %cTarget: %c${issue.targetSelector}`,
      STYLES.normal,
      STYLES.target
    );
  }
}

/**
 * Emit plain text warnings (Node.js environment)
 */
function emitPlainWarnings(result: PartialValidationResult): void {
  console.warn(`[HyperFixi] Partial Template Validation: ${result.totalIssues} issue(s) found`);

  // Build summary
  const summaryParts: string[] = [];
  if (result.bySeverity.critical.length > 0) {
    summaryParts.push(`${result.bySeverity.critical.length} critical`);
  }
  if (result.bySeverity.structural.length > 0) {
    summaryParts.push(`${result.bySeverity.structural.length} structural`);
  }
  if (result.bySeverity.warning.length > 0) {
    summaryParts.push(`${result.bySeverity.warning.length} warning(s)`);
  }
  console.warn(`  Found: ${summaryParts.join(', ')}`);

  // Emit all issues
  for (const issue of result.issues) {
    const icon = SEVERITY_ICONS[issue.severity];
    const label = SEVERITY_LABELS[issue.severity];
    const countStr = issue.count > 1 ? ` (${issue.count}x)` : '';
    const targetStr = issue.targetSelector ? ` [target: ${issue.targetSelector}]` : '';

    console.warn(`  ${icon} [${label}] <${issue.element}>${countStr}${targetStr}`);
    console.warn(`      ${issue.message}`);
    console.warn(`      Fix: ${issue.suggestion}`);
  }
}

// ============================================================================
// String Formatting
// ============================================================================

/**
 * Format a single issue as a simple string (for error arrays)
 */
export function formatIssueAsString(issue: PartialValidationIssue): string {
  const countStr = issue.count > 1 ? ` (${issue.count}x)` : '';
  const targetStr = issue.targetSelector ? ` [target: ${issue.targetSelector}]` : '';
  const icon = SEVERITY_ICONS[issue.severity];
  const label = SEVERITY_LABELS[issue.severity];

  return `${icon} [${label}] <${issue.element}>${countStr}${targetStr}: ${issue.message}`;
}

/**
 * Format all issues as simple strings
 */
export function formatIssuesAsStrings(result: PartialValidationResult): string[] {
  return result.issues.map(formatIssueAsString);
}

/**
 * Format validation result as a single summary string
 */
export function formatResultSummary(result: PartialValidationResult): string {
  if (result.totalIssues === 0) {
    return 'No validation issues found';
  }

  const parts: string[] = [];
  if (result.bySeverity.critical.length > 0) {
    parts.push(`${result.bySeverity.critical.length} critical`);
  }
  if (result.bySeverity.structural.length > 0) {
    parts.push(`${result.bySeverity.structural.length} structural`);
  }
  if (result.bySeverity.warning.length > 0) {
    parts.push(`${result.bySeverity.warning.length} warning(s)`);
  }

  return `Partial validation: ${parts.join(', ')}`;
}
