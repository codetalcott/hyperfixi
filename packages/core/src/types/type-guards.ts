/**
 * Type Guards for HyperFixi
 * Provides type-safe alternatives to 'as any' casts throughout the codebase
 * Single source of truth for runtime type checking utilities
 */

// ============================================================================
// DOM Element Type Guards
// ============================================================================

/**
 * Type guard for HTMLInputElement
 */
export function isInputElement(el: unknown): el is HTMLInputElement {
  return (
    el !== null &&
    typeof el === 'object' &&
    'tagName' in el &&
    (el as Element).tagName === 'INPUT'
  );
}

/**
 * Type guard for form-like elements (input, select, textarea)
 * These elements have value, disabled properties
 */
export function isFormElement(
  el: unknown
): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (el === null || typeof el !== 'object' || !('tagName' in el)) {
    return false;
  }
  const tag = (el as Element).tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

/**
 * Type guard for HTMLElement (elements with style, hidden, etc.)
 */
export function isHTMLElement(el: unknown): el is HTMLElement {
  return (
    el !== null &&
    typeof el === 'object' &&
    'nodeType' in el &&
    (el as Node).nodeType === 1 &&
    'style' in el
  );
}

/**
 * Type guard for DOM Element using nodeType (cross-realm safe)
 * Works across iframes and different window contexts
 */
export function isDOMElement(value: unknown): value is Element {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    (value as Node).nodeType === 1
  );
}

/**
 * Type guard for DOM Node
 */
export function isDOMNode(value: unknown): value is Node {
  return (
    value !== null &&
    typeof value === 'object' &&
    'nodeType' in value &&
    typeof (value as Node).nodeType === 'number'
  );
}

/**
 * Type guard for HTMLOptionElement
 */
export function isOptionElement(el: unknown): el is HTMLOptionElement {
  return (
    el !== null &&
    typeof el !== 'undefined' &&
    typeof el === 'object' &&
    'tagName' in el &&
    (el as Element).tagName === 'OPTION'
  );
}

// ============================================================================
// Array and Collection Type Guards
// ============================================================================

/**
 * Type guard for array-like objects with length property
 * Useful for NodeList, HTMLCollection, arguments, etc.
 */
export function isArrayLike(value: unknown): value is ArrayLike<unknown> {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return true; // Strings are array-like
  }
  if (typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  // Check for array-like with numeric length
  return (
    'length' in value &&
    typeof (value as { length: unknown }).length === 'number' &&
    (value as { length: number }).length >= 0
  );
}

/**
 * Type guard for NodeList
 */
export function isNodeList(value: unknown): value is NodeList {
  return (
    value !== null &&
    typeof value === 'object' &&
    'length' in value &&
    'item' in value &&
    typeof (value as NodeList).item === 'function'
  );
}

/**
 * Type guard for HTMLCollection
 */
export function isHTMLCollection(value: unknown): value is HTMLCollection {
  return (
    value !== null &&
    typeof value === 'object' &&
    'length' in value &&
    'namedItem' in value &&
    typeof (value as HTMLCollection).namedItem === 'function'
  );
}

// ============================================================================
// Value Type Guards
// ============================================================================

/**
 * Type guard for objects (non-null, non-array)
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Type guard for any object type (excludes null)
 */
export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

/**
 * Type guard for functions
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Type guard for Promise-like objects
 */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'then' in value &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

// ============================================================================
// Safe Property Access Utilities
// ============================================================================

/**
 * Safe property access for unknown object types
 * Eliminates need for (obj as any)[key] casts
 */
export function getProperty<T = unknown>(
  obj: unknown,
  key: string
): T | undefined {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  if (typeof obj === 'object' || typeof obj === 'function') {
    return (obj as Record<string, T>)[key];
  }
  return undefined;
}

/**
 * Safe property setter for unknown object types
 * Returns true if property was set successfully
 */
export function setProperty<T = unknown>(
  obj: unknown,
  key: string,
  value: T
): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }
  if (typeof obj === 'object' || typeof obj === 'function') {
    try {
      (obj as Record<string, T>)[key] = value;
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Check if an object has a property
 */
export function hasProperty(obj: unknown, key: string): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }
  return typeof obj === 'object' && key in obj;
}

// ============================================================================
// Numeric Conversion Utilities
// ============================================================================

/**
 * Safe conversion to number
 * Returns undefined if conversion would produce NaN
 */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (value === null || value === undefined) {
    return undefined;
  }
  // Try valueOf for objects
  if (typeof value === 'object' && 'valueOf' in value) {
    const primitive = (value as { valueOf: () => unknown }).valueOf();
    if (typeof primitive === 'number') {
      return isNaN(primitive) ? undefined : primitive;
    }
  }
  return undefined;
}

/**
 * Safe comparison for unknown types
 * Returns comparison result or undefined if not comparable
 */
export function compareValues(
  left: unknown,
  right: unknown,
  op: '<' | '>' | '<=' | '>='
): boolean | undefined {
  const leftNum = toNumber(left);
  const rightNum = toNumber(right);

  // Numeric comparison
  if (leftNum !== undefined && rightNum !== undefined) {
    switch (op) {
      case '<':
        return leftNum < rightNum;
      case '>':
        return leftNum > rightNum;
      case '<=':
        return leftNum <= rightNum;
      case '>=':
        return leftNum >= rightNum;
    }
  }

  // String comparison fallback
  if (typeof left === 'string' && typeof right === 'string') {
    switch (op) {
      case '<':
        return left < right;
      case '>':
        return left > right;
      case '<=':
        return left <= right;
      case '>=':
        return left >= right;
    }
  }

  // Not comparable
  return undefined;
}

// ============================================================================
// Form Element Property Accessors
// ============================================================================

/**
 * Get form element value (input, select, textarea)
 */
export function getFormValue(el: unknown): string | undefined {
  if (isFormElement(el)) {
    return el.value;
  }
  return undefined;
}

/**
 * Get checkbox/radio checked state
 */
export function getChecked(el: unknown): boolean | undefined {
  if (isInputElement(el) && (el.type === 'checkbox' || el.type === 'radio')) {
    return el.checked;
  }
  return undefined;
}

/**
 * Get form element disabled state
 */
export function getDisabled(el: unknown): boolean | undefined {
  if (isFormElement(el)) {
    return el.disabled;
  }
  return undefined;
}

/**
 * Get option element selected state
 */
export function getSelected(el: unknown): boolean | undefined {
  if (isOptionElement(el)) {
    return el.selected;
  }
  return undefined;
}

/**
 * Get HTMLElement hidden state
 */
export function getHidden(el: unknown): boolean | undefined {
  if (isHTMLElement(el)) {
    return el.hidden;
  }
  return undefined;
}
