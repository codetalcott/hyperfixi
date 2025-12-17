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

import type { ASTNode } from '../../types/base-types';

/**
 * Types of selectors recognized by HyperFixi commands
 */
export type SelectorType = 'class' | 'attribute' | 'css-property' | 'element' | 'identifier' | 'unknown';

/**
 * Smart element types that have special toggle behavior
 */
export type SmartElementTag = 'dialog' | 'details' | 'summary' | 'select';

/**
 * Array of supported smart element tags
 */
export const SMART_ELEMENT_TAGS: readonly SmartElementTag[] = ['dialog', 'details', 'summary', 'select'] as const;

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
