/**
 * Bridge between Reference Expressions and Existing Expression Evaluator
 * Enables gradual migration from legacy to enhanced expressions while maintaining compatibility
 */

import type {
  ExecutionContext,
  TypedExpressionContext,
  ExpressionEvaluationOptions,
} from '../../../types/base-types';
import { referenceExpressions } from './index';

/**
 * Convert ExecutionContext to TypedExpressionContext for enhanced expressions
 */
export function createTypedExpressionContext(
  context: ExecutionContext,
  options: ExpressionEvaluationOptions = {}
): TypedExpressionContext {
  return {
    // Core context properties
    me: context.me,
    you: context.you,
    it: context.it,
    result: context.result,
    locals: context.locals || new Map(),
    globals: context.globals || new Map(),
    event: context.event || null,

    // Enhanced expression context properties
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: options.validationMode || 'strict',
    evaluationHistory: [],
  };
}

/**
 * Update ExecutionContext from TypedExpressionContext after evaluation
 */
export function updateExecutionContext(
  originalContext: ExecutionContext,
  typedContext: TypedExpressionContext
): ExecutionContext {
  // Update only the core properties that might have changed
  return {
    ...originalContext,
    me: typedContext.me,
    you: typedContext.you,
    it: typedContext.it,
    result: typedContext.result,
    locals: typedContext.locals,
    globals: typedContext.globals,
    event: typedContext.event,
  };
}

/**
 * Enhanced expression adapter that wraps enhanced expressions for use in legacy systems
 */
export class ExpressionAdapter {
  /**
   * Evaluate enhanced 'me' expression with legacy context
   */
  static async evaluateMe(context: ExecutionContext): Promise<HTMLElement | null> {
    const typedContext = createTypedExpressionContext(context);
    const result = await referenceExpressions.me.evaluate(typedContext, undefined);

    if (result.success) {
      return (result.value as HTMLElement) || null;
    } else {
      console.warn('Enhanced me expression failed:', result.error);
      return context.me instanceof HTMLElement ? context.me : null; // Fallback to legacy behavior
    }
  }

  /**
   * Evaluate enhanced 'you' expression with legacy context
   */
  static async evaluateYou(context: ExecutionContext): Promise<HTMLElement | null> {
    const typedContext = createTypedExpressionContext(context);
    const result = await referenceExpressions.you.evaluate(typedContext, undefined);

    if (result.success && result.value instanceof HTMLElement) {
      return result.value;
    } else {
      console.warn('Enhanced you expression failed:', result.error);
      return context.you instanceof HTMLElement ? context.you : null; // Fallback to legacy behavior
    }
  }

  /**
   * Evaluate enhanced 'it' expression with legacy context
   */
  static async evaluateIt(context: ExecutionContext): Promise<unknown> {
    const typedContext = createTypedExpressionContext(context);
    const result = await referenceExpressions.it.evaluate(typedContext, undefined);

    if (result.success) {
      return result.value;
    } else {
      console.warn('Enhanced it expression failed:', result.error);
      return context.it; // Fallback to legacy behavior
    }
  }

  /**
   * Evaluate enhanced CSS selector expression with legacy context
   */
  static async evaluateCSSSelector(
    context: ExecutionContext,
    selector: string,
    single = false
  ): Promise<HTMLElement | HTMLElement[] | null> {
    const typedContext = createTypedExpressionContext(context);
    const input = { selector, single };
    const result = await referenceExpressions['css-selector'].evaluate(typedContext, input);

    if (result.success) {
      return (result.value as HTMLElement | HTMLElement[] | null) ?? null;
    } else {
      console.warn('Enhanced CSS selector expression failed:', result.error);
      // Fallback to basic DOM query
      if (single) {
        return document.querySelector(selector) as HTMLElement | null;
      } else {
        const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
        return elements.length > 0 ? elements : null;
      }
    }
  }

  /**
   * Get enhanced expression metadata for debugging and tooling
   */
  static getExpressionMetadata(expressionName: string) {
    const expression = referenceExpressions[expressionName as keyof typeof referenceExpressions];
    return expression?.metadata;
  }

  /**
   * Get enhanced expression documentation for LLM assistance
   */
  static getExpressionDocumentation(expressionName: string) {
    const expression = referenceExpressions[expressionName as keyof typeof referenceExpressions];
    return (expression as { documentation?: unknown } | undefined)?.documentation;
  }

  /**
   * Validate expression input using enhanced validation
   */
  static validateExpressionInput(expressionName: string, input: unknown) {
    const expression = referenceExpressions[expressionName as keyof typeof referenceExpressions];
    return expression?.validate(input);
  }
}

/**
 * Legacy compatibility wrapper that provides enhanced features while maintaining the old interface
 */
export class LegacyCompatibilityLayer {
  /**
   * Enhanced version of existing 'me' expression
   */
  static meExpression = {
    name: 'me',
    category: 'Reference' as const,
    evaluatesTo: 'Element' as const,

    async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
      return ExpressionAdapter.evaluateMe(context);
    },

    validate() {
      return null; // Enhanced expressions handle their own validation
    },
  };

  /**
   * Enhanced version of existing 'you' expression
   */
  static youExpression = {
    name: 'you',
    category: 'Reference' as const,
    evaluatesTo: 'Element' as const,

    async evaluate(context: ExecutionContext): Promise<HTMLElement | null> {
      return ExpressionAdapter.evaluateYou(context);
    },

    validate() {
      return null; // Enhanced expressions handle their own validation
    },
  };

  /**
   * Enhanced version of existing 'it' expression
   */
  static itExpression = {
    name: 'it',
    category: 'Reference' as const,
    evaluatesTo: 'Any' as const,

    async evaluate(context: ExecutionContext): Promise<unknown> {
      return ExpressionAdapter.evaluateIt(context);
    },

    validate() {
      return null; // Enhanced expressions handle their own validation
    },
  };

  /**
   * Enhanced version for CSS selector queries
   */
  static createQuerySelector(single: boolean = true) {
    return {
      name: single ? 'querySelector' : 'querySelectorAll',
      category: 'Reference' as const,
      evaluatesTo: single ? ('Element' as const) : ('Array' as const),

      async evaluate(
        context: ExecutionContext,
        selector: string
      ): Promise<HTMLElement | HTMLElement[] | null> {
        return ExpressionAdapter.evaluateCSSSelector(context, selector, single);
      },

      validate(args: any[]): string | null {
        if (args.length !== 1) {
          return `${single ? 'querySelector' : 'querySelectorAll'} requires exactly one argument (selector)`;
        }
        if (typeof args[0] !== 'string') {
          return `${single ? 'querySelector' : 'querySelectorAll'} selector must be a string`;
        }
        return null;
      },
    };
  }
}

/**
 * Migration utility for gradually adopting enhanced expressions
 */
export class ExpressionMigrationUtility {
  private static migrationMap = new Map<string, boolean>();

  /**
   * Enable enhanced expression for a specific expression name
   */
  static enableEnhanced(expressionName: string) {
    this.migrationMap.set(expressionName, true);
  }

  /**
   * Disable enhanced expression for a specific expression name (use legacy)
   */
  static disableEnhanced(expressionName: string) {
    this.migrationMap.set(expressionName, false);
  }

  /**
   * Check if enhanced expression is enabled for a given name
   */
  static isEnhancedEnabled(expressionName: string): boolean {
    return this.migrationMap.get(expressionName) ?? false;
  }

  /**
   * Get migration status for all expressions
   */
  static getMigrationStatus() {
    return Object.fromEntries(this.migrationMap);
  }

  /**
   * Enable all enhanced reference expressions
   */
  static enableAllEnhanced() {
    Object.keys(referenceExpressions).forEach(name => {
      this.enableEnhanced(name);
    });
  }

  /**
   * Disable all enhanced expressions (revert to legacy)
   */
  static disableAllEnhanced() {
    Object.keys(referenceExpressions).forEach(name => {
      this.disableEnhanced(name);
    });
  }
}
