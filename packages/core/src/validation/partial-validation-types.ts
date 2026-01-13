/**
 * Partial Template Validation Types
 * Development-time validation for hx-partial content
 *
 * These types support runtime validation of partial templates to catch common errors
 * where partials accidentally contain full page layout elements (html, body, head)
 * or duplicate semantic landmarks (header, footer, main, nav, aside).
 */

// ============================================================================
// Severity and Category Types
// ============================================================================

/**
 * Severity levels for validation issues
 * - critical: Layout elements that will break page structure (html, body, head)
 * - structural: Semantic duplicates that may cause issues (header, footer, main, nav)
 * - warning: Potentially problematic patterns (title, meta, scripts in partials)
 */
export type PartialValidationSeverity = 'critical' | 'structural' | 'warning';

/**
 * Element categories for validation
 */
export type LayoutElementCategory =
  | 'document-root' // html, body, head
  | 'semantic-landmark' // header, footer, main, nav, aside
  | 'sectioning' // section, article with main semantic role
  | 'metadata' // title, meta, link, base
  | 'script-style'; // script, style (potential issues in partials)

// ============================================================================
// Validation Issue Types
// ============================================================================

/**
 * A detected validation issue in partial content
 */
export interface PartialValidationIssue {
  /** Severity of the issue */
  severity: PartialValidationSeverity;

  /** Category of the problematic element */
  category: LayoutElementCategory;

  /** The element tag name that triggered the issue */
  element: string;

  /** Human-readable message describing the issue */
  message: string;

  /** Actionable suggestion for fixing the issue */
  suggestion: string;

  /** The target selector where this partial would be swapped */
  targetSelector?: string;

  /** Count of how many instances were found */
  count: number;
}

/**
 * Result of validating partial content
 */
export interface PartialValidationResult {
  /** Whether validation passed (no critical issues) */
  valid: boolean;

  /** All detected issues */
  issues: PartialValidationIssue[];

  /** Issues grouped by severity for easy filtering */
  bySeverity: {
    critical: PartialValidationIssue[];
    structural: PartialValidationIssue[];
    warning: PartialValidationIssue[];
  };

  /** Total issue count */
  totalIssues: number;

  /** Whether to proceed with swap (always true - non-blocking) */
  shouldProceed: true;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for partial validation
 */
export interface PartialValidationConfig {
  /** Enable/disable validation entirely (default: true in dev, false in prod) */
  enabled: boolean;

  /** Show console warnings (default: true) */
  showWarnings: boolean;

  /** Validation strictness level */
  strictness: 'relaxed' | 'standard' | 'strict';

  /** Custom elements to treat as critical (e.g., app-specific layout components) */
  additionalCriticalElements?: string[];

  /** Custom elements to treat as structural */
  additionalStructuralElements?: string[];

  /** Elements to ignore during validation */
  ignoredElements?: string[];

  /** Target selectors to skip validation for */
  ignoredTargets?: string[];

  /** Custom validation hook for project-specific rules */
  customValidator?: (html: string, target: string) => PartialValidationIssue[];
}

/**
 * Per-target validation override
 * Allows disabling validation for specific swap targets
 */
export interface TargetValidationOverride {
  /** Target selector pattern (supports wildcards with *) */
  target: string;

  /** Override settings */
  config: Partial<PartialValidationConfig>;
}

/**
 * Global validation configuration with per-target overrides
 */
export interface GlobalPartialValidationConfig extends PartialValidationConfig {
  /** Per-target configuration overrides */
  targetOverrides?: TargetValidationOverride[];
}

// ============================================================================
// Element Definition Types
// ============================================================================

/**
 * Definition for a layout element to detect
 */
export interface LayoutElementDefinition {
  /** Element category */
  category: LayoutElementCategory;
  /** Human-readable message describing the issue */
  message: string;
  /** Default suggestion for fixing */
  suggestion?: string;
}

/**
 * Map of element tag names to their definitions
 */
export type LayoutElementMap = Record<string, LayoutElementDefinition>;

// ============================================================================
// Branded Types for Documentation
// ============================================================================

/**
 * Branded type for validated partial content
 * Documents that content has passed validation checks
 * Note: This is a documentation aid - actual validation is at runtime
 */
export type ValidatedPartialContent = string & { readonly __brand: 'ValidatedPartialContent' };

/**
 * Type guard to check if content is validated
 * In practice, always returns true - this is documentation-only
 */
export function isValidatedContent(content: string): content is ValidatedPartialContent {
  return typeof content === 'string';
}
