/**
 * Enhanced Template Context Implementation
 * Provides TemplateExecutionContext with validation and LLM documentation
 */

import type { ExecutionContext } from '../../types/core.ts';
import type { 
  TemplateExecutionContext,
  TemplateContextBridge,
  TemplateDirectiveType,
  EnhancedTemplateConfig
} from '../../types/enhanced-templates.ts';
import type { TypedExpressionContext } from '../../types/enhanced-expressions.ts';
import type { HyperScriptValue } from '../../types/enhanced-core.ts';

// ============================================================================
// Template Context Bridge Implementation
// ============================================================================

export class EnhancedTemplateContextBridge implements TemplateContextBridge {
  private readonly config: EnhancedTemplateConfig;
  
  constructor(config: Partial<EnhancedTemplateConfig> = {}) {
    this.config = {
      enableCaching: true,
      maxCacheSize: 100,
      enableMetrics: true,
      enableValidation: true,
      executionTimeout: 5000,
      maxNestingDepth: 10,
      customDirectives: {},
      preprocessors: [],
      postprocessors: [],
      ...config
    };
  }

  /**
   * Convert ExecutionContext to TemplateExecutionContext
   */
  toTemplateContext(
    context: ExecutionContext,
    options: {
      templateName?: string;
      initialBuffer?: string[];
      iterationContext?: TemplateExecutionContext['iterationContext'];
    } = {}
  ): TemplateExecutionContext {
    const now = Date.now();
    
    // Create base typed context
    const baseContext: TypedExpressionContext = {
      me: context.me,
      it: context.it,
      you: context.you,
      result: context.result,
      locals: context.locals || new Map(),
      globals: context.globals || new Map(),
      event: context.event,
      
      // Enhanced expression context properties
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict',
      evaluationHistory: []
    };
    
    // Extend with template-specific properties
    const templateContext: TemplateExecutionContext = {
      ...baseContext,
      
      // Template-specific properties
      templateBuffer: options.initialBuffer || [],
      templateDepth: 0,
      iterationContext: options.iterationContext,
      conditionalContext: undefined,
      
      templateMeta: {
        templateName: options.templateName,
        compiledAt: now,
        executionStartTime: now,
        directiveStack: []
      }
    };
    
    return templateContext;
  }
  
  /**
   * Convert TemplateExecutionContext back to ExecutionContext
   */
  fromTemplateContext(
    templateContext: TemplateExecutionContext,
    originalContext: ExecutionContext
  ): ExecutionContext {
    return {
      ...originalContext,
      me: templateContext.me,
      it: templateContext.it,
      you: templateContext.you,
      result: templateContext.result,
      locals: templateContext.locals,
      globals: templateContext.globals,
      event: templateContext.event,
      
      // Preserve template results in meta
      meta: {
        ...originalContext.meta,
        __ht_template_result: templateContext.templateBuffer,
        __ht_template_meta: templateContext.templateMeta
      }
    };
  }
  
  /**
   * Create a scoped template context for nested directives
   */
  createScopedContext(
    parentContext: TemplateExecutionContext,
    directiveType: TemplateDirectiveType,
    scopeData: Record<string, HyperScriptValue> = {}
  ): TemplateExecutionContext {
    return {
      ...parentContext,
      
      // Inherit parent buffer (shared)
      templateBuffer: parentContext.templateBuffer,
      
      // Increase template depth
      templateDepth: parentContext.templateDepth + 1,
      
      // Create new locals scope with parent fallback
      locals: new Map([
        ...Array.from(parentContext.locals.entries()),
        ...Object.entries(scopeData)
      ]),
      
      // Update directive stack
      templateMeta: {
        ...parentContext.templateMeta,
        directiveStack: [...parentContext.templateMeta.directiveStack, directiveType]
      }
    };
  }
  
  /**
   * Create iteration context for @repeat directives
   */
  createIterationContext(
    parentContext: TemplateExecutionContext,
    collection: HyperScriptValue,
    currentIndex: number,
    currentItem: HyperScriptValue
  ): TemplateExecutionContext {
    const totalItems = Array.isArray(collection) ? collection.length : 
                      collection && typeof collection === 'object' && 'length' in collection ? 
                      (collection as { length: number }).length : 1;
    
    return {
      ...parentContext,
      
      // Set current item as 'it'
      it: currentItem,
      
      // Create iteration context
      iterationContext: {
        collection,
        currentIndex,
        currentItem,
        totalItems
      },
      
      // Add iteration variables to locals
      locals: new Map([
        ...Array.from(parentContext.locals.entries()),
        ['index', currentIndex],
        ['item', currentItem],
        ['first', currentIndex === 0],
        ['last', currentIndex === totalItems - 1],
        ['length', totalItems]
      ])
    };
  }
  
  /**
   * Create conditional context for @if/@else chains
   */
  createConditionalContext(
    parentContext: TemplateExecutionContext,
    conditionMet: boolean,
    isElse = false
  ): TemplateExecutionContext {
    const existingContext = parentContext.conditionalContext;
    
    return {
      ...parentContext,
      
      conditionalContext: {
        conditionMet,
        elseAllowed: !conditionMet && !isElse,
        branchExecuted: existingContext?.branchExecuted || conditionMet
      }
    };
  }
  
  /**
   * Validate template context constraints
   */
  validateContext(context: TemplateExecutionContext): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check nesting depth
    if (context.templateDepth > this.config.maxNestingDepth) {
      errors.push(`Template nesting depth (${context.templateDepth}) exceeds maximum (${this.config.maxNestingDepth})`);
    }
    
    // Check directive stack consistency
    const stack = context.templateMeta.directiveStack;
    if (stack.length > 0) {
      const openDirectives = stack.filter(d => d !== '@end');
      if (openDirectives.length !== stack.filter(d => d === '@end').length) {
        warnings.push(`Unbalanced directive stack: ${openDirectives.join(', ')}`);
      }
    }
    
    // Check buffer size
    if (context.templateBuffer.length > 10000) {
      warnings.push(`Large template buffer (${context.templateBuffer.length} segments) may impact performance`);
    }
    
    // Check execution time
    const executionTime = Date.now() - context.templateMeta.executionStartTime;
    if (executionTime > this.config.executionTimeout) {
      errors.push(`Template execution time (${executionTime}ms) exceeds timeout (${this.config.executionTimeout}ms)`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ============================================================================
// Template Context Utilities
// ============================================================================

/**
 * Utility functions for working with template contexts
 */
export class TemplateContextUtils {
  /**
   * Extract template variables from context
   */
  static extractVariables(context: TemplateExecutionContext): Record<string, HyperScriptValue> {
    const variables: Record<string, HyperScriptValue> = {};
    
    // Add locals
    for (const [key, value] of context.locals.entries()) {
      variables[key] = value;
    }
    
    // Add globals
    for (const [key, value] of context.globals.entries()) {
      variables[`global.${key}`] = value;
    }
    
    // Add context elements
    if (context.me) variables['me'] = context.me;
    if (context.it !== undefined) variables['it'] = context.it;
    if (context.you) variables['you'] = context.you;
    if (context.result !== undefined) variables['result'] = context.result;
    
    // Add iteration context
    if (context.iterationContext) {
      variables['index'] = context.iterationContext.currentIndex;
      variables['item'] = context.iterationContext.currentItem;
      variables['first'] = context.iterationContext.currentIndex === 0;
      variables['last'] = context.iterationContext.currentIndex === context.iterationContext.totalItems - 1;
      variables['length'] = context.iterationContext.totalItems;
    }
    
    return variables;
  }
  
  /**
   * Check if a condition should execute in the current context
   */
  static shouldExecuteCondition(
    context: TemplateExecutionContext,
    isElse = false
  ): boolean {
    const conditional = context.conditionalContext;
    
    if (!conditional) {
      return !isElse; // Execute @if, not @else without prior @if
    }
    
    if (isElse) {
      return conditional.elseAllowed && !conditional.branchExecuted;
    }
    
    return conditional.conditionMet;
  }
  
  /**
   * Get current iteration information
   */
  static getIterationInfo(context: TemplateExecutionContext) {
    const iteration = context.iterationContext;
    
    if (!iteration) {
      return null;
    }
    
    return {
      index: iteration.currentIndex,
      item: iteration.currentItem,
      isFirst: iteration.currentIndex === 0,
      isLast: iteration.currentIndex === iteration.totalItems - 1,
      total: iteration.totalItems,
      progress: (iteration.currentIndex + 1) / iteration.totalItems
    };
  }
  
  /**
   * Append content to template buffer with validation
   */
  static appendToBuffer(
    context: TemplateExecutionContext,
    content: string,
    source = 'unknown'
  ): void {
    if (!content) return;
    
    // Validate buffer size
    if (context.templateBuffer.length > 10000) {
      console.warn(`Template buffer approaching size limit (${context.templateBuffer.length})`);
    }
    
    // Add content with metadata
    context.templateBuffer.push(content);
    
    // Track in evaluation history if available
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: 'template-append',
        category: 'Template',
        input: { content, source },
        output: content,
        timestamp: Date.now(),
        duration: 0,
        success: true
      });
    }
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default enhanced template configuration
 */
export const defaultEnhancedTemplateConfig: EnhancedTemplateConfig = {
  enableCaching: true,
  maxCacheSize: 100,
  enableMetrics: true,
  enableValidation: true,
  executionTimeout: 5000, // 5 seconds
  maxNestingDepth: 10,
  customDirectives: {},
  preprocessors: [],
  postprocessors: []
};

/**
 * Create a default template context bridge
 */
export function createTemplateContextBridge(
  config?: Partial<EnhancedTemplateConfig>
): EnhancedTemplateContextBridge {
  return new EnhancedTemplateContextBridge(config);
}