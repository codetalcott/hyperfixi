/**
 * Enhanced Reference expressions for hyperscript
 * Handles me, you, it, CSS selectors, and element references with enhanced TypeScript integration
 */

import type { ExecutionContext, ExpressionImplementation, EvaluationType } from '../../types/core';
import type { 
  TypedExpressionImplementation, 
  TypedExecutionContext, 
  HyperScriptValue, 
  EvaluationResult,
  ValidationResult,
  HyperScriptError,
  LLMDocumentation
} from '../../types/enhanced-core';

// ============================================================================
// Core Reference Variables
// ============================================================================

export const meExpression: ExpressionImplementation = {
  name: 'me',
  category: 'Reference',
  evaluatesTo: 'Element',
  
  async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
    return context.me;
  },
  
  validate() {
    return null; // 'me' requires no arguments
  }
};

export const youExpression: ExpressionImplementation = {
  name: 'you',
  category: 'Reference',
  evaluatesTo: 'Element',
  
  async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
    return context.you;
  },
  
  validate() {
    return null; // 'you' requires no arguments
  }
};

export const itExpression: ExpressionImplementation = {
  name: 'it',
  category: 'Reference',
  evaluatesTo: 'Any',
  
  async evaluate(context: ExecutionContext): Promise<unknown> {
    return context.it;
  },
  
  validate() {
    return null; // 'it' requires no arguments
  }
};

export const itsExpression: ExpressionImplementation = {
  name: 'its',
  category: 'Reference',
  evaluatesTo: 'Any',
  
  async evaluate(context: ExecutionContext): Promise<unknown> {
    // 'its' refers to the same context as 'it' - they are aliases
    return context.it;
  },
  
  validate() {
    return null; // 'its' requires no arguments
  }
};

export const resultExpression: ExpressionImplementation = {
  name: 'result',
  category: 'Reference',
  evaluatesTo: 'Any',
  
  async evaluate(context: ExecutionContext): Promise<unknown> {
    return context.result;
  },
  
  validate() {
    return null; // 'result' requires no arguments
  }
};

// ============================================================================
// CSS Selector Expressions
// ============================================================================

export const querySelectorExpression: ExpressionImplementation = {
  name: 'querySelector',
  category: 'Reference',
  evaluatesTo: 'Element',
  
  async evaluate(context: ExecutionContext, selector: string): Promise<HTMLElement | null> {
    if (typeof selector !== 'string') {
      throw new Error('querySelector requires a string selector');
    }
    
    // Always search from document to find any element
    // This matches hyperscript's behavior where selectors are global by default
    return document.querySelector(selector) as HTMLElement | null;
  },
  
  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'querySelector requires exactly one argument (selector)';
    }
    if (typeof args[0] !== 'string') {
      return 'querySelector selector must be a string';
    }
    return null;
  }
};

export const querySelectorAllExpression: ExpressionImplementation = {
  name: 'querySelectorAll',
  category: 'Reference',
  evaluatesTo: 'Array',
  
  async evaluate(context: ExecutionContext, selector: string): Promise<HTMLElement[]> {
    if (typeof selector !== 'string') {
      throw new Error('querySelectorAll requires a string selector');
    }
    
    // Always search from document to find any elements
    // This matches hyperscript's behavior where selectors are global by default
    const nodeList = document.querySelectorAll(selector);
    return Array.from(nodeList) as HTMLElement[];
  },
  
  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'querySelectorAll requires exactly one argument (selector)';
    }
    if (typeof args[0] !== 'string') {
      return 'querySelectorAll selector must be a string';
    }
    return null;
  }
};

// ============================================================================
// ID and Class Reference Expressions
// ============================================================================

export const idExpression: ExpressionImplementation = {
  name: 'getElementById',
  category: 'Reference',
  evaluatesTo: 'Element',
  
  async evaluate(context: ExecutionContext, id: string): Promise<HTMLElement | null> {
    if (typeof id !== 'string') {
      throw new Error('getElementById requires a string ID');
    }
    
    return document.getElementById(id);
  },
  
  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'getElementById requires exactly one argument (ID)';
    }
    if (typeof args[0] !== 'string') {
      return 'getElementById ID must be a string';
    }
    return null;
  }
};

export const classExpression: ExpressionImplementation = {
  name: 'getElementsByClassName',
  category: 'Reference',
  evaluatesTo: 'Array',
  
  async evaluate(context: ExecutionContext, className: string): Promise<HTMLElement[]> {
    if (typeof className !== 'string') {
      throw new Error('getElementsByClassName requires a string class name');
    }
    
    // Always search from document to find any elements
    // This matches hyperscript's behavior where selectors are global by default
    const collection = document.getElementsByClassName(className);
    return Array.from(collection) as HTMLElement[];
  },
  
  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'getElementsByClassName requires exactly one argument (className)';
    }
    if (typeof args[0] !== 'string') {
      return 'getElementsByClassName className must be a string';
    }
    return null;
  }
};

// ============================================================================
// Traversal Expressions (closest, parent, etc.)
// ============================================================================

export const closestExpression: ExpressionImplementation = {
  name: 'closest',
  category: 'Reference',
  evaluatesTo: 'Element',
  
  async evaluate(context: ExecutionContext, selector: string): Promise<HTMLElement | null> {
    if (typeof selector !== 'string') {
      throw new Error('closest requires a string selector');
    }
    
    if (!context.me) {
      return null;
    }
    
    return context.me.closest(selector) as HTMLElement | null;
  },
  
  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'closest requires exactly one argument (selector)';
    }
    if (typeof args[0] !== 'string') {
      return 'closest selector must be a string';
    }
    return null;
  }
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
  
  validate(): string | null {
    return null; // parent requires no arguments
  }
};

// ============================================================================
// Additional Global References
// ============================================================================

export const windowExpression: ExpressionImplementation = {
  name: 'window',
  category: 'Reference',
  evaluatesTo: 'Object',
  
  async evaluate(context: ExecutionContext): Promise<Window> {
    return window;
  },
  
  validate(): string | null {
    return null; // window requires no arguments
  }
};

export const documentExpression: ExpressionImplementation = {
  name: 'document',
  category: 'Reference',
  evaluatesTo: 'Object',
  
  async evaluate(context: ExecutionContext): Promise<Document> {
    return document;
  },
  
  validate(): string | null {
    return null; // document requires no arguments
  }
};

export const elementWithSelectorExpression: ExpressionImplementation = {
  name: 'elementWithSelector',
  category: 'Reference',
  evaluatesTo: 'Array',
  
  async evaluate(context: ExecutionContext, selector: string): Promise<HTMLElement[]> {
    if (typeof selector !== 'string') {
      throw new Error('Selector must be a string');
    }
    
    const elements = document.querySelectorAll(selector);
    return Array.from(elements) as HTMLElement[];
  },
  
  validate(args: unknown[]): string | null {
    if (args.length !== 1) {
      return 'elementWithSelector requires exactly one argument (selector)';
    }
    if (typeof args[0] !== 'string') {
      return 'selector must be a string';
    }
    return null;
  }
};

// ============================================================================
// StyleRef Expressions (CSS property access)
// ============================================================================

export const styleRefExpression: ExpressionImplementation = {
  name: 'styleRef',
  category: 'Reference',
  evaluatesTo: 'String',
  
  async evaluate(context: ExecutionContext, property: string, element?: HTMLElement): Promise<string | undefined> {
    if (typeof property !== 'string') {
      throw new Error('StyleRef requires a string property name');
    }
    
    const target = element || context.me;
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
    if (args.length === 0 || args.length > 2) {
      return 'styleRef requires 1-2 arguments (property, optional element)';
    }
    if (typeof args[0] !== 'string') {
      return 'styleRef property must be a string';
    }
    if (args.length === 2 && args[1] && typeof args[1] !== 'object') {
      return 'styleRef element must be an HTMLElement';
    }
    return null;
  }
};

export const possessiveStyleRefExpression: ExpressionImplementation = {
  name: 'possessiveStyleRef',
  category: 'Reference',
  evaluatesTo: 'String',
  
  async evaluate(context: ExecutionContext, possessor: string, property: string): Promise<string | undefined> {
    if (typeof possessor !== 'string' || typeof property !== 'string') {
      throw new Error('Possessive styleRef requires possessor and property strings');
    }
    
    // Resolve the possessor to an element
    let target: HTMLElement | null = null;
    if (possessor === 'my' && context.me) {
      target = context.me;
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
    if (args.length !== 2) {
      return 'possessiveStyleRef requires exactly 2 arguments (possessor, property)';
    }
    if (typeof args[0] !== 'string') {
      return 'possessiveStyleRef possessor must be a string';
    }
    if (typeof args[1] !== 'string') {
      return 'possessiveStyleRef property must be a string';
    }
    return null;
  }
};

export const ofStyleRefExpression: ExpressionImplementation = {
  name: 'ofStyleRef',
  category: 'Reference',
  evaluatesTo: 'String',
  
  async evaluate(context: ExecutionContext, property: string, reference: string): Promise<string | undefined> {
    if (typeof property !== 'string' || typeof reference !== 'string') {
      throw new Error('Of styleRef requires property and reference strings');
    }
    
    // Resolve the reference to an element
    let target: HTMLElement | null = null;
    if (reference === 'me' && context.me) {
      target = context.me;
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
    if (args.length !== 2) {
      return 'ofStyleRef requires exactly 2 arguments (property, reference)';
    }
    if (typeof args[0] !== 'string') {
      return 'ofStyleRef property must be a string';
    }
    if (typeof args[1] !== 'string') {
      return 'ofStyleRef reference must be a string';
    }
    return null;
  }
};

// ============================================================================
// Export all reference expressions
// ============================================================================

export const referenceExpressions = {
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

export type ReferenceExpressionName = keyof typeof referenceExpressions;