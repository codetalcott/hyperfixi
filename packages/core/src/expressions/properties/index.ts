/**
 * Property expressions for hyperscript
 * Handles possessive syntax, attribute access, and property references
 *
 * Uses centralized type-helpers for consistent type checking.
 */

import type { ExecutionContext, ExpressionImplementation } from '../../types/core';
import { getElementProperty } from '../property-access-utils';
import {
  validateArgCount,
  validateArgRange,
  validateArgIsString,
  validateSingleStringArg,
} from '../validation-helpers';
import { isObject } from '../type-helpers';

// Re-export for use in tests and external consumers
export { getElementProperty };

/** Property names that must never be accessed on plain objects (prototype pollution prevention). */
const UNSAFE_PROPS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Read a single property/attribute/style off one value, applying the
 * element/object/primitive rules shared by `possessive`/`my`/`its`/`your`.
 */
function readPossessiveValue(element: unknown, property: string): unknown {
  if (element instanceof Element) {
    return getElementProperty(element, property);
  }
  if (isObject(element)) {
    if (UNSAFE_PROPS.has(property)) return undefined;
    return (element as Record<string, unknown>)[property];
  }
  return (element as Record<string, unknown>)[property];
}

/**
 * A classRef/queryRef resolves to a *collection* of elements; upstream
 * `_hyperscript` maps a possessive over every match (`.cls's *color` →
 * `["red", "red"]`). We map arrays / NodeLists / HTMLCollections whose items are
 * Elements or host objects (e.g. the `CSSStyleDeclaration` that `'s style`
 * yields, so chains like `.cls's style's display` keep mapping), but NOT arrays
 * of primitives or plain objects — so `[1, 2, 3]'s length` still reads the
 * array's own property rather than mapping element-wise.
 */
function isMappableCollection(v: unknown): boolean {
  let items: unknown[];
  if (Array.isArray(v)) {
    items = v;
  } else if (
    (typeof NodeList !== 'undefined' && v instanceof NodeList) ||
    (typeof HTMLCollection !== 'undefined' && v instanceof HTMLCollection)
  ) {
    items = Array.from(v as ArrayLike<unknown>);
  } else {
    return false;
  }
  if (items.length === 0) return false;
  return items.every(
    item =>
      item instanceof Element ||
      (item != null &&
        typeof item === 'object' &&
        (item as object).constructor !== Object &&
        !Array.isArray(item))
  );
}

// ============================================================================
// Possessive Expressions
// ============================================================================

export const possessiveExpression: ExpressionImplementation = {
  name: 'possessive',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ["'s", 's'],

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const [element, property] = args;
    if (element == null) {
      return undefined;
    }

    if (typeof property !== 'string') {
      throw new Error('Property name must be a string');
    }

    // classRef/queryRef collections map the property over every member — UNLESS
    // the property belongs to the collection itself (e.g. `length` on the
    // HTMLCollection from `'s children`, or array methods). That keeps
    // `#x's children's length` reading the count while `.cls's *color` maps.
    if (isMappableCollection(element) && !(property in (element as object))) {
      return Array.from(element as ArrayLike<unknown>, item => readPossessiveValue(item, property));
    }

    return readPossessiveValue(element, property);
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgCount(args, 2, 'possessive', 'element, property') ??
      validateArgIsString(args, 1, 'possessive', 'property name')
    );
  },
};

export const myExpression: ExpressionImplementation = {
  name: 'my',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['my'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const [property] = args;
    if (!context.me) {
      return undefined;
    }

    if (typeof property !== 'string') {
      throw new Error('Property name must be a string');
    }

    // Handle DOM elements
    if (context.me instanceof Element) {
      return getElementProperty(context.me, property);
    }

    // Handle plain objects
    if (isObject(context.me)) {
      if (UNSAFE_PROPS.has(property)) return undefined;
      return (context.me as Record<string, unknown>)[property];
    }

    // Handle primitive values
    return (context.me as Record<string, unknown>)[property];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'my', 'property');
  },
};

export const itsExpression: ExpressionImplementation = {
  name: 'its',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['its'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const [property] = args;
    if (context.it == null) {
      return undefined;
    }

    if (typeof property !== 'string') {
      throw new Error('Property name must be a string');
    }

    const target = context.it;

    // Handle DOM element attributes and properties
    if (target instanceof Element) {
      return getElementProperty(target, property);
    }

    // Handle regular object property access
    if (isObject(target)) {
      if (UNSAFE_PROPS.has(property)) return undefined;
      return (target as Record<string, unknown>)[property];
    }

    // Handle primitive values
    return (target as Record<string, unknown>)[property];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'its', 'property');
  },
};

export const yourExpression: ExpressionImplementation = {
  name: 'your',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['your'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const [property] = args;
    if (!context.you) {
      return undefined;
    }

    if (typeof property !== 'string') {
      throw new Error('Property name must be a string');
    }

    // Handle DOM elements
    if (context.you instanceof Element) {
      return getElementProperty(context.you, property);
    }

    // Handle plain objects
    if (isObject(context.you)) {
      if (UNSAFE_PROPS.has(property)) return undefined;
      return (context.you as Record<string, unknown>)[property];
    }

    // Handle primitive values
    return (context.you as Record<string, unknown>)[property];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'your', 'property');
  },
};

// ============================================================================
// "Of" Expression (Reverse Property Access)
// ============================================================================

export const ofExpression: ExpressionImplementation = {
  name: 'of',
  category: 'Reference',
  evaluatesTo: 'Any',
  operators: ['of'],

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const [property, object] = args;
    if (object == null) {
      return undefined;
    }

    if (typeof property !== 'string') {
      throw new Error('Property name must be a string');
    }

    // Handle DOM element attributes and properties
    if (object instanceof Element) {
      return getElementProperty(object, property);
    }

    // Handle regular object property access
    if (isObject(object)) {
      if (UNSAFE_PROPS.has(property)) return undefined;
      return (object as Record<string, unknown>)[property];
    }

    // Handle primitive values
    return (object as Record<string, unknown>)[property];
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgCount(args, 2, 'of', 'property, object') ??
      validateArgIsString(args, 0, 'of', 'property name')
    );
  },
};

// ============================================================================
// Attribute Reference Expressions
// ============================================================================

export const attributeExpression: ExpressionImplementation = {
  name: 'attribute',
  category: 'Reference',
  evaluatesTo: 'String',
  operators: ['@'],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<string | null> {
    const [attributeName, element] = args;
    if (typeof attributeName !== 'string') {
      throw new Error('Attribute name must be a string');
    }

    const target = element || context.me;
    if (!target || !(target instanceof Element)) {
      return null;
    }

    return target.getAttribute(attributeName);
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgRange(args, 1, 2, 'attribute', 'attributeName, optional element') ??
      validateArgIsString(args, 0, 'attribute', 'attribute name') ??
      (args.length >= 2 && args[1] != null && !(args[1] instanceof Element)
        ? 'attribute element must be an Element'
        : null)
    );
  },
};

export const attributeWithValueExpression: ExpressionImplementation = {
  name: 'attributeWithValue',
  category: 'Reference',
  evaluatesTo: 'Boolean',
  operators: ['@='],

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<boolean> {
    const [attributeName, expectedValue, element] = args;
    if (typeof attributeName !== 'string') {
      throw new Error('Attribute name must be a string');
    }

    if (typeof expectedValue !== 'string') {
      throw new Error('Expected value must be a string');
    }

    const target = element || context.me;
    if (!target || !(target instanceof Element)) {
      return false;
    }

    const actualValue = target.getAttribute(attributeName);
    return actualValue === expectedValue;
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgRange(
        args,
        2,
        3,
        'attributeWithValue',
        'attributeName, expectedValue, optional element'
      ) ??
      validateArgIsString(args, 0, 'attributeWithValue', 'attribute name') ??
      validateArgIsString(args, 1, 'attributeWithValue', 'expected value') ??
      (args.length >= 3 && args[2] != null && !(args[2] instanceof Element)
        ? 'attributeWithValue element must be an Element'
        : null)
    );
  },
};

// ============================================================================
// Class Reference Expression
// ============================================================================

export const classReferenceExpression: ExpressionImplementation = {
  name: 'classReference',
  category: 'Reference',
  evaluatesTo: 'Array',
  operators: ['.'],

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement[]> {
    const [className] = args;
    if (typeof className !== 'string') {
      throw new Error('Class name must be a string');
    }

    // Remove leading dot if present
    const cleanClassName = className.startsWith('.') ? className.slice(1) : className;

    // Get all elements with the class
    const elements = document.getElementsByClassName(cleanClassName);
    return Array.from(elements) as HTMLElement[];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'classReference', 'className');
  },
};

// ============================================================================
// ID Reference Expression
// ============================================================================

export const idReferenceExpression: ExpressionImplementation = {
  name: 'idReference',
  category: 'Reference',
  evaluatesTo: 'Element',
  operators: ['#'],

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement | null> {
    const [idValue] = args;
    if (typeof idValue !== 'string') {
      throw new Error('ID value must be a string');
    }

    // Remove leading hash if present
    const cleanId = idValue.startsWith('#') ? idValue.slice(1) : idValue;

    return document.getElementById(cleanId);
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'idReference', 'idValue');
  },
};

// ============================================================================
// Helper Functions (Re-exported from shared utilities)
// ============================================================================

// Re-export helper functions for backward compatibility
export { isDataAttribute, isAriaAttribute } from '../property-access-utils';

// ============================================================================
// Export all property expressions
// ============================================================================

export const propertiesExpressions = {
  possessive: possessiveExpression,
  my: myExpression,
  its: itsExpression,
  your: yourExpression,
  of: ofExpression,
  attribute: attributeExpression,
  attributeWithValue: attributeWithValueExpression,
  classReference: classReferenceExpression,
  idReference: idReferenceExpression,
} as const;

export type PropertyExpressionName = keyof typeof propertiesExpressions;
