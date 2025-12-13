/**
 * Semantic Static Analysis
 *
 * Analyzes semantic nodes for potential issues:
 * - Conflicting actions on same trigger
 * - Accessibility problems (hover-only interactions)
 * - Performance concerns (high-frequency triggers)
 * - Invalid role combinations
 *
 * Can be used:
 * - Standalone: analyze(input, lang)
 * - Dev mode: Enabled via config, auto-warns on parse
 * - Build time: Integrate with bundlers
 */

import type { SemanticNode, SemanticRole } from '../types';
import { parse } from '../parser';
import { getSchema } from '../validators';

// =============================================================================
// Types
// =============================================================================

export type WarningSeverity = 'error' | 'warning' | 'info';

export type WarningCode =
  | 'HOVER_ONLY_INTERACTION'
  | 'HIGH_FREQUENCY_TRIGGER'
  | 'MISSING_REQUIRED_ROLE'
  | 'INVALID_ROLE_FOR_COMMAND'
  | 'CONFLICTING_ACTIONS'
  | 'UNREACHABLE_BEHAVIOR'
  | 'POTENTIAL_RACE_CONDITION';

export interface AnalysisWarning {
  code: WarningCode;
  severity: WarningSeverity;
  message: string;
  suggestion?: string;
  location?: {
    input: string;
    role?: SemanticRole;
  };
}

export interface AnalysisResult {
  valid: boolean;
  warnings: AnalysisWarning[];
  node: SemanticNode | null;
}

export interface AnalysisConfig {
  /** Enable accessibility checks (default: true) */
  accessibility?: boolean;
  /** Enable performance checks (default: true) */
  performance?: boolean;
  /** Enable schema validation (default: true) */
  schema?: boolean;
  /** Treat warnings as errors (default: false) */
  strict?: boolean;
}

const DEFAULT_CONFIG: Required<AnalysisConfig> = {
  accessibility: true,
  performance: true,
  schema: true,
  strict: false,
};

// =============================================================================
// High-Frequency Triggers
// =============================================================================

const HIGH_FREQUENCY_TRIGGERS = new Set([
  'scroll',
  'mousemove',
  'touchmove',
  'resize',
  'input',
  'keydown',
  'keyup',
  'keypress',
]);

const THROTTLE_RECOMMENDED_TRIGGERS = new Set([
  'scroll',
  'mousemove',
  'touchmove',
  'resize',
]);

// =============================================================================
// Analysis Rules
// =============================================================================

/**
 * Check for hover-only interactions (accessibility issue).
 */
function checkAccessibility(node: SemanticNode, input: string): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  if (node.kind === 'event-handler') {
    const event = node.roles.get('event');
    if (event && event.type === 'literal') {
      const eventValue = String(event.value).toLowerCase();

      // Hover-only interactions
      if (eventValue === 'mouseenter' || eventValue === 'mouseover' || eventValue === 'hover') {
        warnings.push({
          code: 'HOVER_ONLY_INTERACTION',
          severity: 'warning',
          message: `Hover-only interaction detected (${eventValue}). Not accessible to keyboard or touch users.`,
          suggestion: 'Add keyboard equivalent (focus) or use a click-based interaction.',
          location: { input, role: 'event' },
        });
      }
    }
  }

  return warnings;
}

/**
 * Check for high-frequency events without throttling.
 */
function checkPerformance(node: SemanticNode, input: string): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  if (node.kind === 'event-handler') {
    const event = node.roles.get('event');
    if (event && event.type === 'literal') {
      const eventValue = String(event.value).toLowerCase();

      if (HIGH_FREQUENCY_TRIGGERS.has(eventValue)) {
        const severity = THROTTLE_RECOMMENDED_TRIGGERS.has(eventValue) ? 'warning' : 'info';
        warnings.push({
          code: 'HIGH_FREQUENCY_TRIGGER',
          severity,
          message: `High-frequency event '${eventValue}' may cause performance issues.`,
          suggestion: THROTTLE_RECOMMENDED_TRIGGERS.has(eventValue)
            ? `Consider using 'on ${eventValue} throttled:100ms' to limit execution frequency.`
            : 'Consider debouncing or throttling this handler.',
          location: { input, role: 'event' },
        });
      }
    }
  }

  return warnings;
}

/**
 * Validate role combinations against command schema.
 */
function checkSchema(node: SemanticNode, input: string): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  if (node.kind !== 'command') return warnings;

  const schema = getSchema(node.action);
  if (!schema) return warnings; // Unknown command, can't validate

  // Schema.roles is an array of role definitions
  const roleArray = Array.isArray(schema.roles) ? schema.roles : [];

  // Build a set of valid role names for this command
  const validRoles = new Set<string>();
  for (const roleSpec of roleArray) {
    if (roleSpec && typeof roleSpec === 'object' && 'role' in roleSpec) {
      validRoles.add(roleSpec.role);

      // Check required roles
      if (roleSpec.required && !node.roles.has(roleSpec.role as SemanticRole)) {
        warnings.push({
          code: 'MISSING_REQUIRED_ROLE',
          severity: 'error',
          message: `Command '${node.action}' requires '${roleSpec.role}' but it was not provided.`,
          suggestion: roleSpec.description,
          location: { input },
        });
      }
    }
  }

  // Check for unknown roles
  node.roles.forEach((_, role) => {
    if (!validRoles.has(role)) {
      warnings.push({
        code: 'INVALID_ROLE_FOR_COMMAND',
        severity: 'warning',
        message: `Role '${role}' is not typically used with '${node.action}' command.`,
        location: { input, role },
      });
    }
  });

  return warnings;
}

// =============================================================================
// Multi-Node Analysis (for detecting conflicts)
// =============================================================================

/**
 * Helper type for event handler nodes with body.
 */
interface EventHandlerNode extends SemanticNode {
  body?: SemanticNode[];
}

/**
 * Get the body commands from an event handler node.
 */
function getBodyCommands(node: SemanticNode): SemanticNode[] {
  if (node.kind === 'event-handler') {
    const handler = node as EventHandlerNode;
    return handler.body ?? [];
  }
  return [];
}

/**
 * Analyze multiple nodes together to detect conflicts.
 */
export function analyzeMultiple(
  nodes: SemanticNode[],
  _config: AnalysisConfig = {}
): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  // Group event handlers by event + source
  const handlersByEvent = new Map<string, { handler: SemanticNode; commands: SemanticNode[] }[]>();

  for (const node of nodes) {
    if (node.kind === 'event-handler') {
      const event = node.roles.get('event');
      const source = node.roles.get('source');

      const key = `${event?.type === 'literal' ? event.value : 'unknown'}:${
        source?.type === 'selector' ? source.value : 'self'
      }`;

      if (!handlersByEvent.has(key)) {
        handlersByEvent.set(key, []);
      }

      const commands = getBodyCommands(node);
      handlersByEvent.get(key)!.push({ handler: node, commands });
    }
  }

  // Check for conflicting actions on same event
  handlersByEvent.forEach((handlers, key) => {
    if (handlers.length > 1) {
      // Collect all actions and patients from body commands
      const allActions: string[] = [];
      const allPatients: string[] = [];

      for (const { commands } of handlers) {
        for (const cmd of commands) {
          allActions.push(cmd.action);
          const p = cmd.roles.get('patient');
          allPatients.push(p?.type === 'selector' ? p.value : 'unknown');
        }
      }

      // Check for direct conflicts (e.g., toggle + hide on same element)
      const hasToggle = allActions.includes('toggle');
      const hasShow = allActions.includes('show');
      const hasHide = allActions.includes('hide');

      if (hasToggle && (hasShow || hasHide)) {
        // Check if conflicting actions target the same patient
        const conflictingPatients = allPatients.filter((p, i) =>
          (allActions[i] === 'toggle' || allActions[i] === 'show' || allActions[i] === 'hide') &&
          allPatients.some((p2, i2) => i !== i2 && p === p2)
        );

        if (conflictingPatients.length > 0) {
          warnings.push({
            code: 'CONFLICTING_ACTIONS',
            severity: 'warning',
            message: `Conflicting actions on '${key}': ${[...new Set(allActions)].join(', ')} may interfere with each other.`,
            suggestion: 'Consider using a single toggle or conditional logic.',
          });
        }
      }

      // Check for potential race conditions with async operations
      const hasAsync = allActions.some(a => ['fetch', 'wait', 'send'].includes(a));
      if (hasAsync && handlers.length > 1) {
        warnings.push({
          code: 'POTENTIAL_RACE_CONDITION',
          severity: 'info',
          message: `Multiple handlers on '${key}' include async operations. Consider sequencing.`,
          suggestion: 'Use "then" to chain operations or add loading states.',
        });
      }
    }
  });

  return warnings;
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze a single hyperscript input for potential issues.
 *
 * @param input - The hyperscript text to analyze
 * @param lang - The language of the input (default: 'en')
 * @param config - Analysis configuration
 * @returns Analysis result with warnings
 *
 * @example
 * ```typescript
 * const result = analyze('on hover show .tooltip', 'en');
 * // result.warnings[0].code === 'HOVER_ONLY_INTERACTION'
 * ```
 */
export function analyze(
  input: string,
  lang: string = 'en',
  config: AnalysisConfig = {}
): AnalysisResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const warnings: AnalysisWarning[] = [];

  // Parse to semantic node (wrap in try/catch since parse() may throw)
  let node: SemanticNode | null = null;
  try {
    node = parse(input, lang);
  } catch {
    // Parse failed, node stays null
  }

  if (!node) {
    return {
      valid: false,
      warnings: [{
        code: 'UNREACHABLE_BEHAVIOR',
        severity: 'error',
        message: 'Could not parse input to semantic representation.',
        location: { input },
      }],
      node: null,
    };
  }

  // Run enabled checks
  if (cfg.accessibility) {
    warnings.push(...checkAccessibility(node, input));
  }

  if (cfg.performance) {
    warnings.push(...checkPerformance(node, input));
  }

  if (cfg.schema) {
    warnings.push(...checkSchema(node, input));
  }

  // Determine validity
  const hasErrors = warnings.some(w => w.severity === 'error');
  const hasWarnings = warnings.some(w => w.severity === 'warning');
  const valid = cfg.strict ? !hasErrors && !hasWarnings : !hasErrors;

  return { valid, warnings, node };
}

/**
 * Analyze multiple hyperscript inputs together.
 *
 * @param inputs - Array of hyperscript texts
 * @param lang - The language of the inputs
 * @param config - Analysis configuration
 * @returns Combined analysis result
 */
export function analyzeAll(
  inputs: string[],
  lang: string = 'en',
  config: AnalysisConfig = {}
): AnalysisResult {
  const allWarnings: AnalysisWarning[] = [];
  const nodes: SemanticNode[] = [];

  // Analyze each input individually
  for (const input of inputs) {
    const result = analyze(input, lang, config);
    allWarnings.push(...result.warnings);
    if (result.node) {
      nodes.push(result.node);
    }
  }

  // Run cross-input analysis
  allWarnings.push(...analyzeMultiple(nodes, config));

  const hasErrors = allWarnings.some(w => w.severity === 'error');
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const hasWarnings = allWarnings.some(w => w.severity === 'warning');
  const valid = cfg.strict ? !hasErrors && !hasWarnings : !hasErrors;

  return {
    valid,
    warnings: allWarnings,
    node: nodes[0] ?? null, // Return first node for single-input compat
  };
}

// =============================================================================
// Dev Mode Integration
// =============================================================================

let _devModeEnabled = false;
let _devModeConfig: AnalysisConfig = {};

/**
 * Enable dev mode analysis.
 * When enabled, every parse() call will run analysis and log warnings.
 */
export function enableDevMode(config: AnalysisConfig = {}): void {
  _devModeEnabled = true;
  _devModeConfig = config;
}

/**
 * Disable dev mode analysis.
 */
export function disableDevMode(): void {
  _devModeEnabled = false;
}

/**
 * Check if dev mode is enabled.
 */
export function isDevModeEnabled(): boolean {
  return _devModeEnabled;
}

/**
 * Get current dev mode config.
 */
export function getDevModeConfig(): AnalysisConfig {
  return { ..._devModeConfig };
}

/**
 * Run dev mode analysis if enabled.
 * Called internally by parser when dev mode is on.
 */
export function devModeAnalyze(input: string, lang: string, node: SemanticNode | null): void {
  if (!_devModeEnabled) return;

  if (!node) {
    console.warn(`[hyperfixi] Parse failed: ${input}`);
    return;
  }

  const result = analyze(input, lang, _devModeConfig);

  for (const warning of result.warnings) {
    const icon = warning.severity === 'error' ? '❌' :
                 warning.severity === 'warning' ? '⚠️' : 'ℹ️';
    const method = warning.severity === 'error' ? 'error' :
                   warning.severity === 'warning' ? 'warn' : 'info';

    console[method](
      `${icon} [hyperfixi:${warning.code}] ${warning.message}`,
      warning.suggestion ? `\n   💡 ${warning.suggestion}` : '',
      warning.location?.input ? `\n   📍 ${warning.location.input}` : ''
    );
  }
}

// =============================================================================
// Convenience Exports
// =============================================================================

export {
  checkAccessibility,
  checkPerformance,
  checkSchema,
};
