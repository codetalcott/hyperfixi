/**
 * Enhanced Reference expressions for hyperscript
 * Handles me, you, it, CSS selectors, and element references with enhanced TypeScript integration
 */

import type { ExecutionContext, ExpressionImplementation } from '../../types/core';
import {
  validateNoArgs,
  validateSingleStringArg,
  validateArgCount,
  validateArgRange,
  validateArgIsString,
} from '../validation-helpers';

// ============================================================================
// Core Reference Variables
// ============================================================================

export const meExpression: ExpressionImplementation = {
  name: 'me',
  category: 'Reference',
  evaluatesTo: 'Element',

  async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
    return context.me instanceof HTMLElement ? context.me : null;
  },

  validate: validateNoArgs,
};

export const youExpression: ExpressionImplementation = {
  name: 'you',
  category: 'Reference',
  evaluatesTo: 'Element',

  async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
    return context.you instanceof HTMLElement ? context.you : null;
  },

  validate: validateNoArgs,
};

export const itExpression: ExpressionImplementation = {
  name: 'it',
  category: 'Reference',
  evaluatesTo: 'Any',

  async evaluate(context: ExecutionContext): Promise<unknown> {
    return context.it;
  },

  validate: validateNoArgs,
};

export const itsExpression: ExpressionImplementation = {
  name: 'its',
  category: 'Reference',
  evaluatesTo: 'Any',

  async evaluate(context: ExecutionContext): Promise<unknown> {
    // 'its' refers to the same context as 'it' - they are aliases
    return context.it;
  },

  validate: validateNoArgs,
};

export const resultExpression: ExpressionImplementation = {
  name: 'result',
  category: 'Reference',
  evaluatesTo: 'Any',

  async evaluate(context: ExecutionContext): Promise<unknown> {
    return context.result;
  },

  validate: validateNoArgs,
};

// ============================================================================
// CSS Selector Expressions
// ============================================================================

export const querySelectorExpression: ExpressionImplementation = {
  name: 'querySelector',
  category: 'Reference',
  evaluatesTo: 'Element',

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<HTMLElement | null> {
    const [selector] = args;
    if (typeof selector !== 'string') {
      throw new Error('querySelector requires a string selector');
    }

    // Always search from document to find any element
    // This matches hyperscript's behavior where selectors are global by default
    return document.querySelector(selector) as HTMLElement | null;
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'querySelector', 'selector');
  },
};

export const querySelectorAllExpression: ExpressionImplementation = {
  name: 'querySelectorAll',
  category: 'Reference',
  evaluatesTo: 'Array',

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const selector = args[0];
    if (typeof selector !== 'string') {
      throw new Error('querySelectorAll requires a string selector');
    }

    // Always search from document to find any elements
    // This matches hyperscript's behavior where selectors are global by default
    const nodeList = document.querySelectorAll(selector);
    return Array.from(nodeList) as HTMLElement[];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'querySelectorAll', 'selector');
  },
};

// ============================================================================
// ID and Class Reference Expressions
// ============================================================================

export const idExpression: ExpressionImplementation = {
  name: 'getElementById',
  category: 'Reference',
  evaluatesTo: 'Element',

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const id = args[0];
    if (typeof id !== 'string') {
      throw new Error('getElementById requires a string ID');
    }

    return document.getElementById(id);
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'getElementById', 'ID');
  },
};

export const classExpression: ExpressionImplementation = {
  name: 'getElementsByClassName',
  category: 'Reference',
  evaluatesTo: 'Array',

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const className = args[0];
    if (typeof className !== 'string') {
      throw new Error('getElementsByClassName requires a string class name');
    }

    // Always search from document to find any elements
    // This matches hyperscript's behavior where selectors are global by default
    const collection = document.getElementsByClassName(className);
    return Array.from(collection) as HTMLElement[];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'getElementsByClassName', 'className');
  },
};

// ============================================================================
// Traversal Expressions (closest, parent, etc.)
// ============================================================================

export const closestExpression: ExpressionImplementation = {
  name: 'closest',
  category: 'Reference',
  evaluatesTo: 'Element',

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const selector = args[0];
    if (typeof selector !== 'string') {
      throw new Error('closest requires a string selector');
    }

    if (!context.me) {
      return null;
    }

    return context.me.closest(selector);
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'closest', 'selector');
  },
};

export const parentExpression: ExpressionImplementation = {
  name: 'parent',
  category: 'Reference',
  evaluatesTo: 'Element',

  async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
    if (!context.me) {
      return null;
    }

    return context.me.parentElement;
  },

  validate: validateNoArgs,
};

// ============================================================================
// Additional Global References
// ============================================================================

export const windowExpression: ExpressionImplementation = {
  name: 'window',
  category: 'Reference',
  evaluatesTo: 'Object',

  async evaluate(_context: ExecutionContext): Promise<Window> {
    return window;
  },

  validate: validateNoArgs,
};

export const documentExpression: ExpressionImplementation = {
  name: 'document',
  category: 'Reference',
  evaluatesTo: 'Object',

  async evaluate(_context: ExecutionContext): Promise<Document> {
    return document;
  },

  validate: validateNoArgs,
};

export const elementWithSelectorExpression: ExpressionImplementation = {
  name: 'elementWithSelector',
  category: 'Reference',
  evaluatesTo: 'Array',

  async evaluate(_context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const selector = args[0];
    if (typeof selector !== 'string') {
      throw new Error('Selector must be a string');
    }

    const elements = document.querySelectorAll(selector);
    return Array.from(elements) as HTMLElement[];
  },

  validate(args: unknown[]): string | null {
    return validateSingleStringArg(args, 'elementWithSelector', 'selector');
  },
};

// ============================================================================
// StyleRef Expressions (CSS property access)
// ============================================================================

export const styleRefExpression: ExpressionImplementation = {
  name: 'styleRef',
  category: 'Reference',
  evaluatesTo: 'String',

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const property = args[0];
    const element = args[1] as HTMLElement | undefined;

    if (typeof property !== 'string') {
      throw new Error('StyleRef requires a string property name');
    }

    const target = element || context.me;
    if (!target || !(target instanceof HTMLElement)) {
      return undefined;
    }

    // Check if it's a computed style request
    if (property.startsWith('computed-')) {
      const cssProperty = property.substring(9); // Remove 'computed-' prefix
      const computedStyle = getComputedStyle(target);
      return computedStyle.getPropertyValue(cssProperty) || '';
    }

    // Direct style property access
    const value = target.style.getPropertyValue(property);
    return value || undefined;
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgRange(args, 1, 2, 'styleRef', 'property, optional element') ??
      validateArgIsString(args, 0, 'styleRef', 'property') ??
      (args.length === 2 && args[1] && typeof args[1] !== 'object'
        ? 'styleRef element must be an HTMLElement'
        : null)
    );
  },
};

export const possessiveStyleRefExpression: ExpressionImplementation = {
  name: 'possessiveStyleRef',
  category: 'Reference',
  evaluatesTo: 'String',

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const possessor = args[0];
    const property = args[1];

    if (typeof possessor !== 'string' || typeof property !== 'string') {
      throw new Error('Possessive styleRef requires possessor and property strings');
    }

    // Resolve the possessor to an element
    let target: HTMLElement | null = null;
    if (possessor === 'my' && context.me) {
      target = context.me instanceof HTMLElement ? context.me : null;
    } else if (possessor === 'its' && context.result) {
      target = context.result as HTMLElement;
    }

    if (!target) {
      return undefined;
    }

    // Check if it's a computed style request
    if (property.startsWith('computed-')) {
      const cssProperty = property.substring(9); // Remove 'computed-' prefix
      const computedStyle = getComputedStyle(target);
      return computedStyle.getPropertyValue(cssProperty) || '';
    }

    // Direct style property access
    const value = target.style.getPropertyValue(property);
    return value || undefined;
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgCount(args, 2, 'possessiveStyleRef', 'possessor, property') ??
      validateArgIsString(args, 0, 'possessiveStyleRef', 'possessor') ??
      validateArgIsString(args, 1, 'possessiveStyleRef', 'property')
    );
  },
};

export const ofStyleRefExpression: ExpressionImplementation = {
  name: 'ofStyleRef',
  category: 'Reference',
  evaluatesTo: 'String',

  async evaluate(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
    const property = args[0];
    const reference = args[1];

    if (typeof property !== 'string' || typeof reference !== 'string') {
      throw new Error('Of styleRef requires property and reference strings');
    }

    // Resolve the reference to an element
    let target: HTMLElement | null = null;
    if (reference === 'me' && context.me) {
      target = context.me instanceof HTMLElement ? context.me : null;
    } else if (reference === 'it' && context.result) {
      target = context.result as HTMLElement;
    }

    if (!target) {
      return undefined;
    }

    // Check if it's a computed style request
    if (property.startsWith('computed-')) {
      const cssProperty = property.substring(9); // Remove 'computed-' prefix
      const computedStyle = getComputedStyle(target);
      return computedStyle.getPropertyValue(cssProperty) || '';
    }

    // Direct style property access
    const value = target.style.getPropertyValue(property);
    return value || undefined;
  },

  validate(args: unknown[]): string | null {
    return (
      validateArgCount(args, 2, 'ofStyleRef', 'property, reference') ??
      validateArgIsString(args, 0, 'ofStyleRef', 'property') ??
      validateArgIsString(args, 1, 'ofStyleRef', 'reference')
    );
  },
};

// ============================================================================
// Export all reference expressions
// ============================================================================

export const referencesExpressions = {
  me: meExpression,
  you: youExpression,
  it: itExpression,
  its: itsExpression,
  result: resultExpression,
  querySelector: querySelectorExpression,
  querySelectorAll: querySelectorAllExpression,
  getElementById: idExpression,
  getElementsByClassName: classExpression,
  closest: closestExpression,
  parent: parentExpression,
  window: windowExpression,
  document: documentExpression,
  elementWithSelector: elementWithSelectorExpression,
  styleRef: styleRefExpression,
  possessiveStyleRef: possessiveStyleRefExpression,
  ofStyleRef: ofStyleRefExpression,
} as const;

export type ReferenceExpressionName = keyof typeof referencesExpressions;

// Re-export implementations for tests
export {
  MeExpression,
  YouExpression,
  ItExpression,
  CSSSelectorExpression,
  createMeExpression,
  createYouExpression,
  createItExpression,
} from './impl/index';
