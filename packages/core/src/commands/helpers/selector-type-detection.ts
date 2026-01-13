/**
 * Selector Type Detection Helpers
 *
 * Phase 3 Consolidation: Shared utilities for detecting selector types
 * Used by toggle, add, remove, and set commands.
 *
 * Provides:
 * - Selector type detection from prefix characters
 * - Smart element tag detection
 * - AST node value extraction
 */

import type { ASTNode, ExecutionContext } from '../../types/base-types';

/**
 * Types of selectors recognized by HyperFixi commands
 */
export type SelectorType =
  | 'class'
  | 'attribute'
  | 'css-property'
  | 'element'
  | 'identifier'
  | 'unknown';

/**
 * Smart element types that have special toggle behavior
 */
export type SmartElementTag = 'dialog' | 'details' | 'summary' | 'select';

/**
 * Array of supported smart element tags
 */
export const SMART_ELEMENT_TAGS: readonly SmartElementTag[] = [
  'dialog',
  'details',
  'summary',
  'select',
] as const;

/**
 * Detect selector type from a string value
 *
 * Based on the first character(s):
 * - '.' → class selector
 * - '@' or '[@' → attribute selector
 * - '*' → CSS property
 * - '#' → element/ID selector
 * - Smart element tag name → element
 * - Other → identifier or unknown
 *
 * @param value - String value to detect type from
 * @returns Detected selector type
 */
export function detectSelectorType(value: string): SelectorType {
  if (typeof value !== 'string' || !value) {
    return 'unknown';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 'unknown';
  }

  // Check prefix-based types
  if (trimmed.startsWith('.')) {
    return 'class';
  }

  if (trimmed.startsWith('@') || trimmed.startsWith('[@')) {
    return 'attribute';
  }

  if (trimmed.startsWith('*')) {
    return 'css-property';
  }

  if (trimmed.startsWith('#')) {
    return 'element';
  }

  // Check if it's a smart element tag name
  if (isSmartElementTag(trimmed)) {
    return 'element';
  }

  // Could be an identifier or variable reference
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return 'identifier';
  }

  return 'unknown';
}

/**
 * Check if a string is a smart element tag name
 *
 * Smart elements have special toggle behavior:
 * - dialog: toggles open/close with modal support
 * - details: toggles open attribute
 * - summary: toggles parent details element
 * - select: toggles focus/picker
 *
 * @param tag - Tag name to check (case-insensitive)
 * @returns true if tag is a smart element
 */
export function isSmartElementTag(tag: string): tag is SmartElementTag {
  if (typeof tag !== 'string') return false;
  const lower = tag.toLowerCase();
  return SMART_ELEMENT_TAGS.includes(lower as SmartElementTag);
}

/**
 * Check if a selector string likely references a smart element
 *
 * Checks if the selector contains a smart element tag name.
 * More permissive than isSmartElementTag - handles selectors like
 * '#myDialog' or 'dialog.modal'.
 *
 * @param selector - Selector string to check
 * @returns true if selector likely targets a smart element
 */
export function isSmartElementSelector(selector: string): boolean {
  if (typeof selector !== 'string') return false;
  const lower = selector.toLowerCase();
  return SMART_ELEMENT_TAGS.some(tag => lower.includes(tag));
}

/**
 * Extract selector value from an AST node
 *
 * Handles different node types created by the parser:
 * - { type: 'selector', value: '.active' } → '.active'
 * - { type: 'cssSelector', selectorType: 'class', selector: '.active' } → '.active'
 * - { type: 'classSelector', selector: '.active' } → '.active'
 * - { type: 'identifier', name: 'foo' } → 'foo'
 * - { type: 'literal', value: 'some-string' } → 'some-string'
 *
 * @param node - AST node to extract value from
 * @returns Extracted string value or null if not extractable
 */
export function extractSelectorValue(node: ASTNode): string | null {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const anyNode = node as Record<string, unknown>;

  // Check 'selector' property (cssSelector, classSelector nodes)
  if (typeof anyNode.selector === 'string') {
    return anyNode.selector;
  }

  // Check 'value' property (selector, literal nodes)
  if (typeof anyNode.value === 'string') {
    return anyNode.value;
  }

  // Check 'name' property (identifier nodes)
  if (typeof anyNode.name === 'string') {
    return anyNode.name;
  }

  return null;
}

/**
 * Check if an AST node is a class selector that should be extracted directly
 *
 * Class selectors should have their value extracted directly rather than
 * evaluated, since evaluating them would query the DOM and return elements
 * (or empty NodeList if no elements have that class yet).
 *
 * ID selectors should be evaluated to get the actual DOM element.
 *
 * @param node - AST node to check
 * @returns true if node is a class selector
 */
export function isClassSelectorNode(node: ASTNode): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const anyNode = node as Record<string, unknown>;
  const nodeType = anyNode.type;

  // Check if it's a selector-type node
  if (nodeType !== 'selector' && nodeType !== 'cssSelector' && nodeType !== 'classSelector') {
    return false;
  }

  // Extract the value and check if it starts with '.'
  const value = extractSelectorValue(node);
  return typeof value === 'string' && value.startsWith('.');
}

/**
 * Check if an AST node is an ID selector
 *
 * ID selectors should be evaluated to get the actual DOM element(s).
 *
 * @param node - AST node to check
 * @returns true if node is an ID selector
 */
export function isIdSelectorNode(node: ASTNode): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const anyNode = node as Record<string, unknown>;
  const nodeType = anyNode.type;

  // Check if it's a selector-type node
  if (nodeType !== 'selector' && nodeType !== 'cssSelector' && nodeType !== 'idSelector') {
    return false;
  }

  // Extract the value and check if it starts with '#'
  const value = extractSelectorValue(node);
  return typeof value === 'string' && value.startsWith('#');
}

/**
 * Check if an AST node represents a bare smart element tag identifier
 *
 * e.g., "toggle details" where 'details' is an identifier node
 *
 * @param node - AST node to check
 * @returns true if node is a bare smart element identifier
 */
export function isBareSmartElementNode(node: ASTNode): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const anyNode = node as Record<string, unknown>;

  if (anyNode.type !== 'identifier') {
    return false;
  }

  const name = anyNode.name;
  return typeof name === 'string' && isSmartElementTag(name);
}

// ============================================================================
// First Argument Evaluation Helpers
// ============================================================================

/**
 * Command input type classifications
 * Used by toggle, add, remove commands to determine what operation to perform
 */
export type CommandInputType =
  | 'classes'
  | 'attribute'
  | 'css-property'
  | 'element'
  | 'styles'
  | 'unknown';

/**
 * Result of parsing a command's first argument
 */
export interface ParsedFirstArg {
  /** The resolved value (string, HTMLElement, object, etc.) */
  value: unknown;
  /** Whether the value was extracted from an AST node rather than evaluated */
  extractedFromNode: boolean;
}

/**
 * Evaluate the first argument of a command, with special handling for class selectors
 *
 * Class selector nodes should have their value extracted directly rather than
 * evaluated, since evaluating them would query the DOM and potentially return
 * empty results (if no elements have that class yet).
 *
 * This consolidates the common pattern found in toggle/add/remove parseInput:
 * ```
 * let firstValue: unknown;
 * if (isClassSelectorNode(firstArg)) {
 *   firstValue = extractSelectorValue(firstArg);
 * } else {
 *   firstValue = await evaluator.evaluate(firstArg, context);
 * }
 * ```
 *
 * @param firstArg - The first argument AST node
 * @param evaluator - Expression evaluator for evaluating AST nodes
 * @param context - Execution context with me, you, it, etc.
 * @returns Object with the resolved value and whether it was extracted from node
 *
 * @example
 * const { value, extractedFromNode } = await evaluateFirstArg(firstArg, evaluator, context);
 * if (typeof value === 'string' && value.startsWith('.')) {
 *   // Handle class
 * }
 */
export async function evaluateFirstArg(
  firstArg: ASTNode,
  evaluator: { evaluate: (node: ASTNode, context: ExecutionContext) => Promise<unknown> },
  context: ExecutionContext
): Promise<ParsedFirstArg> {
  // Class selector nodes should be extracted directly to get the class name
  // rather than evaluated (which would query the DOM)
  if (isClassSelectorNode(firstArg)) {
    return {
      value: extractSelectorValue(firstArg),
      extractedFromNode: true,
    };
  }

  // All other node types should be evaluated normally
  return {
    value: await evaluator.evaluate(firstArg, context),
    extractedFromNode: false,
  };
}

/**
 * Detect the input type from a string value
 *
 * Examines the prefix/format of a string to determine what kind of
 * command input it represents:
 * - Starts with '.' → classes
 * - Starts with '@' or '[@' → attribute
 * - Starts with '*' → css-property
 * - Starts with '#' or is smart element tag → element
 * - Otherwise → unknown (likely bare class name)
 *
 * @param value - String value to detect type from
 * @returns Detected command input type
 *
 * @example
 * detectInputType('.active')     // 'classes'
 * detectInputType('@disabled')   // 'attribute'
 * detectInputType('*opacity')    // 'css-property'
 * detectInputType('#myDialog')   // 'element'
 * detectInputType('details')     // 'element' (smart element tag)
 * detectInputType('active')      // 'unknown'
 */
export function detectInputType(value: string): CommandInputType {
  if (typeof value !== 'string' || !value) {
    return 'unknown';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 'unknown';
  }

  // Class selector
  if (trimmed.startsWith('.')) {
    return 'classes';
  }

  // Attribute selector
  if (trimmed.startsWith('@') || trimmed.startsWith('[@')) {
    return 'attribute';
  }

  // CSS property
  if (trimmed.startsWith('*')) {
    return 'css-property';
  }

  // Element selector (ID or smart element tag)
  if (trimmed.startsWith('#') || isSmartElementTag(trimmed)) {
    return 'element';
  }

  return 'unknown';
}
