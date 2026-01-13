/**
 * Variable Access Helpers - Shared utilities for variable manipulation commands
 *
 * Used by: increment, decrement, set, get, bind
 *
 * These utilities handle:
 * - Getting/setting variables in execution context (locals, globals, window)
 * - Type conversion for numeric operations
 * - Element property access via property paths (e.g., "me.value")
 * - Context reference resolution (me, it, you)
 *
 * Bundle size savings: ~290 lines per command using these helpers
 */

import type { ExecutionContext } from '../../types/base-types';
import { isHTMLElement } from '../../utils/element-check';

/**
 * Convert any value to a number for arithmetic operations
 *
 * Handles:
 * - null/undefined → 0 (default start value)
 * - number → number (preserved)
 * - string → parseFloat (NaN if invalid)
 * - boolean → 0/1
 * - array → length
 * - object → length property or valueOf()
 *
 * @param value - Value to convert
 * @returns Numeric value (may be NaN for invalid strings)
 */
export function convertToNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return parsed; // Return NaN if invalid string to preserve test expectations
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === 'object') {
    // Try to get length or valueOf
    if ('length' in value && typeof value.length === 'number') {
      return value.length;
    }
    if (typeof value.valueOf === 'function') {
      const result = value.valueOf();
      if (typeof result === 'number') {
        return result;
      }
    }
    // Return NaN for objects that can't be converted
    return NaN;
  }

  return 0;
}

/**
 * Get variable value from execution context
 *
 * Search order (unless preferredScope specified):
 * 1. Local variables
 * 2. Global variables
 * 3. General variables
 * 4. window/globalThis (browser globals)
 *
 * @param name - Variable name
 * @param context - Execution context
 * @param preferredScope - 'global' to check globals first
 * @returns Variable value or undefined
 */
export function getVariableValue(
  name: string,
  context: ExecutionContext,
  preferredScope?: string
): unknown {
  // If preferred scope is specified, check that first
  if (preferredScope === 'global' && context.globals && context.globals.has(name)) {
    return context.globals.get(name);
  }

  // Check local variables first (unless global is preferred)
  if (preferredScope !== 'global' && context.locals && context.locals.has(name)) {
    return context.locals.get(name);
  }

  // Check global variables
  if (context.globals && context.globals.has(name)) {
    return context.globals.get(name);
  }

  // Check general variables
  if (context.variables && context.variables.has(name)) {
    return context.variables.get(name);
  }

  // Check local variables as fallback
  if (preferredScope === 'global' && context.locals && context.locals.has(name)) {
    return context.locals.get(name);
  }

  // Check window/globalThis as final fallback (for browser globals)
  if (typeof window !== 'undefined' && name in window) {
    return (window as any)[name];
  }
  if (typeof globalThis !== 'undefined' && name in globalThis) {
    return (globalThis as any)[name];
  }

  // Return undefined if not found
  return undefined;
}

/**
 * Set variable value in execution context
 *
 * Strategy:
 * - If preferredScope='global', always set in globals + window
 * - If variable exists in local scope, update it
 * - If variable exists in global scope, update it (+ window)
 * - If variable exists in general variables, update it
 * - If variable exists on window, update it (+ globals)
 * - Otherwise, create new local variable
 *
 * @param name - Variable name
 * @param value - Value to set
 * @param context - Execution context
 * @param preferredScope - 'global' to force global scope
 */
export function setVariableValue(
  name: string,
  value: unknown,
  context: ExecutionContext,
  preferredScope?: string
): void {
  // If preferred scope is specified, handle it
  if (preferredScope === 'global') {
    context.globals.set(name, value);
    // Also set on window for browser globals
    if (typeof window !== 'undefined') {
      (window as any)[name] = value;
    }
    return;
  }

  // If variable exists in local scope, update it
  if (context.locals && context.locals.has(name)) {
    context.locals.set(name, value);
    return;
  }

  // If variable exists in global scope, update it
  if (context.globals && context.globals.has(name)) {
    context.globals.set(name, value);
    // Also update on window if it exists there
    if (typeof window !== 'undefined' && name in window) {
      (window as any)[name] = value;
    }
    return;
  }

  // If variable exists in general variables, update it
  if (context.variables && context.variables.has(name)) {
    context.variables.set(name, value);
    return;
  }

  // Check if variable exists on window (browser global)
  if (typeof window !== 'undefined' && name in window) {
    (window as any)[name] = value;
    // Also store in globals for consistency
    context.globals.set(name, value);
    return;
  }

  // Create new local variable
  context.locals.set(name, value);
}

/**
 * Resolve element reference from context
 *
 * @param elementRef - Reference name (me, it, you) or variable name
 * @param context - Execution context
 * @returns Resolved element or null
 */
export function resolveElementRef(elementRef: string, context: ExecutionContext): unknown {
  if (elementRef === 'me') {
    return context.me;
  } else if (elementRef === 'it') {
    return context.it;
  } else if (elementRef === 'you') {
    return context.you;
  } else {
    // Try to resolve as variable
    return getVariableValue(elementRef, context);
  }
}

/**
 * Get element property value from property path
 *
 * Handles:
 * - me.value → context.me.value
 * - it.scrollTop → context.it.scrollTop
 * - you.textContent → context.you.textContent
 * - element.value → resolve 'element' variable, then get 'value'
 *
 * @param propertyPath - Property path (e.g., "me.value")
 * @param context - Execution context
 * @returns Property value (as number for arithmetic commands)
 */
export function getElementPropertyValue(propertyPath: string, context: ExecutionContext): number {
  const parts = propertyPath.split('.');
  const elementRef = parts[0];
  const property = parts[1];

  const element = resolveElementRef(elementRef, context);

  if (!element) {
    return 0;
  }

  // Get property value
  const value = (element as Record<string, unknown>)[property];
  return convertToNumber(value);
}

/**
 * Set element property value from property path
 *
 * @param propertyPath - Property path (e.g., "me.value")
 * @param value - Value to set
 * @param context - Execution context
 */
export function setElementPropertyValue(
  propertyPath: string,
  value: unknown,
  context: ExecutionContext
): void {
  const parts = propertyPath.split('.');
  const elementRef = parts[0];
  const property = parts[1];

  const element = resolveElementRef(elementRef, context);

  if (element) {
    (element as Record<string, unknown>)[property] = value;
  }
}

/**
 * Get current numeric value from a target
 *
 * Handles multiple target types:
 * - number: return as-is
 * - HTMLElement: get value/textContent or property
 * - string (variable name): resolve variable
 * - string (property path): resolve element property
 * - context references: me, it, you
 *
 * @param target - Target identifier
 * @param property - Optional property name
 * @param scope - Optional scope ('global' or 'local')
 * @param context - Execution context
 * @returns Current numeric value
 */
export function getCurrentNumericValue(
  target: string | HTMLElement | number,
  property: string | undefined,
  scope: string | undefined,
  context: ExecutionContext
): number {
  // Handle direct numeric values
  if (typeof target === 'number') {
    return target;
  }

  // Handle HTMLElement
  if (isHTMLElement(target)) {
    const element = target as HTMLElement;
    if (property) {
      // Get element property or attribute
      if (
        property.startsWith('data-') ||
        ['id', 'class', 'title', 'alt', 'src', 'href'].includes(property)
      ) {
        const value = element.getAttribute(property);
        return convertToNumber(value);
      } else {
        const value = (element as any)[property];
        return convertToNumber(value);
      }
    } else {
      // Use element's text content or value
      const value = (element as any).value || element.textContent;
      return convertToNumber(value);
    }
  }

  // Handle string (variable name or element reference)
  if (typeof target === 'string') {
    // Handle scoped variables
    if (scope === 'global') {
      const value = getVariableValue(target, context, 'global');
      return convertToNumber(value);
    }

    // Handle element property references (e.g., "me.value", "element.scrollTop")
    if (target.includes('.')) {
      return getElementPropertyValue(target, context);
    }

    // Handle context references
    if (target === 'me' && context.me) {
      return convertToNumber((context.me as any).value || 0);
    } else if (target === 'it') {
      return convertToNumber(context.it || 0);
    } else if (target === 'you' && context.you) {
      return convertToNumber((context.you as any).value || 0);
    }

    // Get variable value
    const value = getVariableValue(target, context);
    return convertToNumber(value);
  }

  return convertToNumber(target);
}

/**
 * Set new value to a target
 *
 * Handles multiple target types:
 * - HTMLElement: set value/textContent or property
 * - string (variable name): set variable
 * - string (property path): set element property
 * - context references: me, it, you
 *
 * @param target - Target identifier
 * @param property - Optional property name
 * @param scope - Optional scope ('global' or 'local')
 * @param newValue - New value to set
 * @param context - Execution context
 */
export function setTargetValue(
  target: string | HTMLElement | number,
  property: string | undefined,
  scope: string | undefined,
  newValue: unknown,
  context: ExecutionContext
): void {
  // Handle HTMLElement
  if (isHTMLElement(target)) {
    const element = target as HTMLElement;
    if (property) {
      // Set element property or attribute
      if (
        property.startsWith('data-') ||
        ['id', 'class', 'title', 'alt', 'src', 'href'].includes(property)
      ) {
        element.setAttribute(property, String(newValue));
      } else {
        (element as any)[property] = newValue;
      }
    } else {
      // Set element's text content or value
      if ('value' in element && (element as any).value !== undefined) {
        (element as any).value = String(newValue);
      } else {
        element.textContent = String(newValue);
      }
    }
    return;
  }

  // Handle string (variable name or element reference)
  if (typeof target === 'string') {
    // Handle scoped variables
    if (scope === 'global') {
      setVariableValue(target, newValue, context, 'global');
      return;
    }

    // Handle element property references
    if (target.includes('.')) {
      setElementPropertyValue(target, newValue, context);
      return;
    }

    // Handle context references
    if (target === 'me' && context.me) {
      (context.me as any).value = newValue;
      return;
    } else if (target === 'it') {
      Object.assign(context, { it: newValue });
      return;
    } else if (target === 'you' && context.you) {
      (context.you as any).value = newValue;
      return;
    }

    // Set variable value
    setVariableValue(target, newValue, context);
  }
}
