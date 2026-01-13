/**
 * Partial Template Validator
 * Development-time validation for hx-partial content
 *
 * Detects common errors where partial templates contain layout elements
 * that should only appear in full pages.
 *
 * @example
 * import { validatePartialContent, configurePartialValidation } from './partial-validator';
 *
 * // Configure validation
 * configurePartialValidation({ strictness: 'strict' });
 *
 * // Validate content
 * const result = validatePartialContent('<div>content</div>', '#main');
 * if (!result.valid) {
 *   console.warn('Issues:', result.issues);
 * }
 */

import type {
  PartialValidationIssue,
  PartialValidationResult,
  PartialValidationConfig,
  GlobalPartialValidationConfig,
  LayoutElementCategory,
  LayoutElementMap,
} from './partial-validation-types';

// ============================================================================
// Element Classification
// ============================================================================

/**
 * Critical layout elements that should NEVER appear in partials
 * These elements break page structure when swapped into content areas
 */
const CRITICAL_LAYOUT_ELEMENTS: LayoutElementMap = {
  html: {
    category: 'document-root',
    message: 'The <html> element is the document root and cannot be part of a partial',
    suggestion:
      'Remove the <html> element. Return only the content that should replace the target.',
  },
  body: {
    category: 'document-root',
    message: 'The <body> element is the document body and cannot be part of a partial',
    suggestion: 'Remove the <body> element. Return only the content for the target.',
  },
  head: {
    category: 'document-root',
    message: 'The <head> element contains document metadata and cannot be part of a partial',
    suggestion: 'Remove the <head> element. Styles/scripts should be loaded separately.',
  },
};

/**
 * Structural semantic elements that may cause duplicate landmark issues
 * Warn when these appear in partials targeting non-full-page swaps
 */
const STRUCTURAL_SEMANTIC_ELEMENTS: LayoutElementMap = {
  header: {
    category: 'semantic-landmark',
    message:
      'The <header> element is a semantic landmark. Swapping may create duplicate landmarks.',
    suggestion:
      'Consider if <header> is appropriate in this partial, or if the page already has this landmark.',
  },
  footer: {
    category: 'semantic-landmark',
    message:
      'The <footer> element is a semantic landmark. Swapping may create duplicate landmarks.',
    suggestion:
      'Consider if <footer> is appropriate in this partial, or if the page already has this landmark.',
  },
  main: {
    category: 'semantic-landmark',
    message: 'The <main> element should be unique per page. Swapping may create duplicates.',
    suggestion: 'Consider if <main> is appropriate. Pages should have exactly one <main> element.',
  },
  nav: {
    category: 'semantic-landmark',
    message:
      'The <nav> element is a semantic landmark. Consider if navigation should be in a partial.',
    suggestion:
      'Consider if <nav> is appropriate in this partial, or if navigation should be static.',
  },
  aside: {
    category: 'semantic-landmark',
    message: 'The <aside> element is a semantic landmark. Swapping may affect accessibility.',
    suggestion: 'Consider if <aside> is appropriate in this partial.',
  },
};

/**
 * Warning-level elements that may indicate problematic patterns
 */
const WARNING_ELEMENTS: LayoutElementMap = {
  title: {
    category: 'metadata',
    message: 'The <title> element should only appear in <head>. This may be ignored by browsers.',
    suggestion: 'Move <title> to the document <head> or remove from partial.',
  },
  meta: {
    category: 'metadata',
    message: 'The <meta> element should only appear in <head>. This may be ignored by browsers.',
    suggestion: 'Move <meta> to the document <head> or remove from partial.',
  },
  link: {
    category: 'metadata',
    message: 'The <link> element for stylesheets should typically be in <head>.',
    suggestion: 'Consider if <link> should be in document <head> for proper loading order.',
  },
  base: {
    category: 'metadata',
    message: 'The <base> element should only appear once in <head>.',
    suggestion: 'Remove <base> from partial. It must be in document <head>.',
  },
};

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if we're in development mode
 * Production mode disables validation by default for performance
 */
function isDevMode(): boolean {
  // Check explicit production flag
  if (typeof window !== 'undefined' && (window as any).__HYPERFIXI_PROD__) {
    return false;
  }

  // Check Node.js environment
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return false;
  }

  // Default to dev mode (safer for catching issues)
  return true;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: GlobalPartialValidationConfig = {
  enabled: isDevMode(),
  showWarnings: true,
  strictness: 'standard',
  additionalCriticalElements: [],
  additionalStructuralElements: [],
  ignoredElements: [],
  ignoredTargets: [],
  targetOverrides: [],
};

// Global configuration instance
let globalConfig: GlobalPartialValidationConfig = { ...DEFAULT_VALIDATION_CONFIG };

/**
 * Configure global validation settings
 *
 * @example
 * configurePartialValidation({
 *   strictness: 'strict',
 *   additionalCriticalElements: ['app-shell', 'app-layout'],
 *   ignoredTargets: ['#modal-container'],
 * });
 */
export function configurePartialValidation(config: Partial<GlobalPartialValidationConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current validation configuration
 */
export function getPartialValidationConfig(): GlobalPartialValidationConfig {
  return { ...globalConfig };
}

/**
 * Reset configuration to defaults
 */
export function resetPartialValidationConfig(): void {
  globalConfig = { ...DEFAULT_VALIDATION_CONFIG };
}

/**
 * Get config for a specific target, applying overrides
 */
function getConfigForTarget(target: string): PartialValidationConfig {
  const baseConfig = { ...globalConfig };

  // Check for target-specific overrides
  if (globalConfig.targetOverrides) {
    for (const override of globalConfig.targetOverrides) {
      if (matchesTargetPattern(target, override.target)) {
        return { ...baseConfig, ...override.config };
      }
    }
  }

  return baseConfig;
}

/**
 * Match target against pattern (supports * wildcard)
 */
function matchesTargetPattern(target: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(target);
  }
  return target === pattern;
}

// ============================================================================
// Validation Logic
// ============================================================================

/**
 * Validate partial HTML content for layout/structural issues
 *
 * @param html - The HTML content to validate
 * @param targetSelector - The target selector where content will be swapped
 * @returns Validation result with issues
 *
 * @example
 * const result = validatePartialContent(
 *   '<html><body><div>content</div></body></html>',
 *   '#main-content'
 * );
 * // result.valid = false
 * // result.issues = [{ element: 'html', severity: 'critical', ... }, ...]
 */
export function validatePartialContent(
  html: string,
  targetSelector: string = ''
): PartialValidationResult {
  const config = getConfigForTarget(targetSelector);

  // Return early if validation is disabled
  if (!config.enabled) {
    return createEmptyResult();
  }

  // Check if target should be ignored
  if (config.ignoredTargets?.some(pattern => matchesTargetPattern(targetSelector, pattern))) {
    return createEmptyResult();
  }

  const issues: PartialValidationIssue[] = [];

  // Check for DOCTYPE in raw HTML (before parsing)
  const doctypeMatch = html.match(/<!DOCTYPE[^>]*>/i);
  if (doctypeMatch && !config.ignoredElements?.includes('doctype')) {
    issues.push({
      severity: 'critical',
      category: 'document-root',
      element: 'DOCTYPE',
      message: 'DOCTYPE declarations cannot be part of a partial',
      suggestion: 'Remove DOCTYPE declaration. Partials should only contain content fragments.',
      targetSelector,
      count: 1,
    });
  }

  // Parse HTML to detect elements
  // Note: In Node.js environment, this requires DOM implementation
  if (typeof document === 'undefined') {
    // Server-side: can only do basic regex checks
    return validateWithRegex(html, targetSelector, config);
  }

  // Check for critical layout elements using regex since DOM parsing
  // strips <html>, <body>, <head> when inserted into a div's innerHTML
  for (const [tagName, info] of Object.entries(CRITICAL_LAYOUT_ELEMENTS)) {
    if (config.ignoredElements?.includes(tagName)) continue;

    // Use regex to detect these elements as DOM parsing won't work
    const regex = new RegExp(`<${tagName}[\\s>]`, 'gi');
    const matches = html.match(regex);
    const count = matches?.length || 0;

    if (count > 0) {
      issues.push({
        severity: 'critical',
        category: info.category,
        element: tagName,
        message: info.message,
        suggestion: info.suggestion || `Remove the <${tagName}> element from the partial.`,
        targetSelector,
        count,
      });
    }
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  // Check for structural semantic elements (warning level in standard mode)
  if (config.strictness !== 'relaxed') {
    for (const [tagName, info] of Object.entries(STRUCTURAL_SEMANTIC_ELEMENTS)) {
      if (config.ignoredElements?.includes(tagName)) continue;

      const elements = container.querySelectorAll(tagName);
      const count = elements.length;

      if (count > 0) {
        issues.push({
          severity: config.strictness === 'strict' ? 'critical' : 'structural',
          category: info.category,
          element: tagName,
          message: info.message,
          suggestion: info.suggestion || `Consider if <${tagName}> is appropriate in this partial.`,
          targetSelector,
          count,
        });
      }
    }
  }

  // Check for warning-level elements in strict mode
  if (config.strictness === 'strict') {
    for (const [tagName, info] of Object.entries(WARNING_ELEMENTS)) {
      if (config.ignoredElements?.includes(tagName)) continue;

      const elements = container.querySelectorAll(tagName);
      const count = elements.length;

      if (count > 0) {
        issues.push({
          severity: 'warning',
          category: info.category,
          element: tagName,
          message: info.message,
          suggestion:
            info.suggestion || `Move <${tagName}> to document <head> or remove from partial.`,
          targetSelector,
          count,
        });
      }
    }
  }

  // Check custom critical elements
  if (config.additionalCriticalElements) {
    for (const tagName of config.additionalCriticalElements) {
      if (config.ignoredElements?.includes(tagName)) continue;

      const elements = container.querySelectorAll(tagName);
      const count = elements.length;

      if (count > 0) {
        issues.push({
          severity: 'critical',
          category: 'document-root',
          element: tagName,
          message: `The <${tagName}> element is configured as a critical layout element.`,
          suggestion: `Remove <${tagName}> from the partial content.`,
          targetSelector,
          count,
        });
      }
    }
  }

  // Check custom structural elements
  if (config.additionalStructuralElements) {
    for (const tagName of config.additionalStructuralElements) {
      if (config.ignoredElements?.includes(tagName)) continue;

      const elements = container.querySelectorAll(tagName);
      const count = elements.length;

      if (count > 0) {
        issues.push({
          severity: 'structural',
          category: 'semantic-landmark',
          element: tagName,
          message: `The <${tagName}> element is configured as a structural element.`,
          suggestion: `Consider if <${tagName}> is appropriate in this partial.`,
          targetSelector,
          count,
        });
      }
    }
  }

  // Run custom validator if provided
  if (config.customValidator) {
    const customIssues = config.customValidator(html, targetSelector);
    issues.push(...customIssues);
  }

  return createResult(issues);
}

/**
 * Fallback validation using regex for server-side environments
 * Less accurate but works without DOM
 */
function validateWithRegex(
  html: string,
  targetSelector: string,
  config: PartialValidationConfig
): PartialValidationResult {
  const issues: PartialValidationIssue[] = [];

  // Check critical elements with regex
  for (const [tagName, info] of Object.entries(CRITICAL_LAYOUT_ELEMENTS)) {
    if (config.ignoredElements?.includes(tagName)) continue;

    const regex = new RegExp(`<${tagName}[\\s>]`, 'gi');
    const matches = html.match(regex);
    const count = matches?.length || 0;

    if (count > 0) {
      issues.push({
        severity: 'critical',
        category: info.category,
        element: tagName,
        message: info.message,
        suggestion: info.suggestion || `Remove the <${tagName}> element from the partial.`,
        targetSelector,
        count,
      });
    }
  }

  // Check structural elements in standard/strict mode
  if (config.strictness !== 'relaxed') {
    for (const [tagName, info] of Object.entries(STRUCTURAL_SEMANTIC_ELEMENTS)) {
      if (config.ignoredElements?.includes(tagName)) continue;

      const regex = new RegExp(`<${tagName}[\\s>]`, 'gi');
      const matches = html.match(regex);
      const count = matches?.length || 0;

      if (count > 0) {
        issues.push({
          severity: config.strictness === 'strict' ? 'critical' : 'structural',
          category: info.category,
          element: tagName,
          message: info.message,
          suggestion: info.suggestion || `Consider if <${tagName}> is appropriate in this partial.`,
          targetSelector,
          count,
        });
      }
    }
  }

  return createResult(issues);
}

// ============================================================================
// Result Helpers
// ============================================================================

/**
 * Create an empty validation result (no issues)
 */
function createEmptyResult(): PartialValidationResult {
  return {
    valid: true,
    issues: [],
    bySeverity: { critical: [], structural: [], warning: [] },
    totalIssues: 0,
    shouldProceed: true,
  };
}

/**
 * Create validation result from issues
 */
function createResult(issues: PartialValidationIssue[]): PartialValidationResult {
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    structural: issues.filter(i => i.severity === 'structural'),
    warning: issues.filter(i => i.severity === 'warning'),
  };

  return {
    valid: bySeverity.critical.length === 0,
    issues,
    bySeverity,
    totalIssues: issues.length,
    shouldProceed: true, // Always proceed - non-blocking
  };
}
