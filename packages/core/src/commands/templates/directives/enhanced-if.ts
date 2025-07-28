/**
 * Enhanced @if Directive - Deep TypeScript Integration
 * Implements conditional template rendering with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import type {
  EnhancedTemplateDirective,
  TemplateExecutionContext,
  IfDirectiveInput,
  TemplateDirectiveType,
  TemplateRenderStrategy,
  TemplateLLMDocumentation
} from '../../../types/enhanced-templates.ts';
import { IfDirectiveInputSchema } from '../../../types/enhanced-templates';
import type {
  TypedResult,
  ExpressionMetadata
} from '../../../types/enhanced-expressions.ts';
import type { UnifiedValidationResult, UnifiedValidationError } from '../../../types/unified-types.ts';
import { TemplateContextUtils } from '../enhanced-template-context';

/**
 * Enhanced @if directive with full type safety for LLM agents
 */
export class EnhancedIfDirective implements EnhancedTemplateDirective<IfDirectiveInput, string> {
  public readonly name = '@if' as const;
  public readonly category = 'Template';
  public readonly syntax = '@if <condition>';
  public readonly outputType = 'String' as const;
  public readonly inputSchema = IfDirectiveInputSchema;

  // Template-specific properties
  public readonly directiveType: TemplateDirectiveType = '@if';
  public readonly renderStrategy: TemplateRenderStrategy = 'conditional';
  public readonly createsScope = true;
  public readonly allowsNesting = true;
  public readonly allowedNext: TemplateDirectiveType[] = ['@else', '@end'];

  public readonly metadata: ExpressionMetadata = {
    category: 'Template',
    complexity: 'simple',
    sideEffects: ['template-rendering'],
    dependencies: [],
    returnTypes: ['string'],
    examples: [
      {
        input: '@if user.isLoggedIn\nWelcome back!\n@end',
        description: 'Conditionally render welcome message for logged-in users',
        expectedOutput: 'Welcome back!'
      },
      {
        input: '@if items.length > 0\nYou have ${items.length} items\n@else\nNo items found\n@end',
        description: 'Show item count or empty message',
        expectedOutput: 'You have 3 items'
      },
      {
        input: '@if user.role === "admin"\n@if user.permissions.canEdit\nEdit controls\n@end\n@end',
        description: 'Nested conditional rendering for admin users',
        expectedOutput: 'Edit controls'
      }
    ],
    relatedExpressions: ['@else', '@repeat', 'boolean conversion'],
    performance: {
      averageTime: 0.5,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: TemplateLLMDocumentation = {
    summary: 'Conditionally renders template content based on boolean evaluation of expressions',
    parameters: [
      {
        name: 'condition',
        type: 'object',
        description: 'Expression that evaluates to truthy/falsy value',
        optional: false,
        examples: ['user.isActive', 'items.length > 0', 'status === "success"', 'data && data.valid']
      },
      {
        name: 'templateContent',
        type: 'string',
        description: 'Template content to render when condition is true',
        optional: false,
        examples: ['Welcome back!', 'You have ${count} items', '<div class="success">Success!</div>']
      }
    ],
    returns: {
      type: 'object',
      description: 'Structured result with rendered content or empty string',
      examples: ['{ success: true, value: "Welcome back!", type: "string" }']
    },
    examples: [
      {
        title: 'Simple conditional rendering',
        code: '@if user.isLoggedIn\nWelcome, ${user.name}!\n@end',
        explanation: 'Renders welcome message only if user is logged in',
        output: 'Welcome, John!'
      },
      {
        title: 'Conditional with else branch',
        code: '@if cart.items.length > 0\nCart has ${cart.items.length} items\n@else\nYour cart is empty\n@end',
        explanation: 'Shows cart status with item count or empty message',
        output: 'Cart has 3 items'
      },
      {
        title: 'Complex condition evaluation',
        code: '@if user.role === "admin" && user.permissions.includes("edit")\nAdmin controls available\n@end',
        explanation: 'Renders admin controls only for users with proper role and permissions',
        output: 'Admin controls available'
      },
      {
        title: 'Nested conditional logic',
        code: '@if user.isActive\n@if user.hasNotifications\nYou have ${user.notificationCount} new messages\n@else\nNo new messages\n@end\n@end',
        explanation: 'Nested conditions for active users with notification checks',
        output: 'You have 5 new messages'
      }
    ],
    patterns: [
      {
        name: 'User Authentication',
        template: '@if user.isAuthenticated\nWelcome back, ${user.name}!\n@else\nPlease log in to continue\n@end',
        context: { user: { isAuthenticated: true, name: 'Alice' } },
        expectedOutput: 'Welcome back, Alice!',
        explanation: 'Standard authentication check pattern'
      },
      {
        name: 'Data Validation',
        template: '@if data && data.isValid\nProcessing: ${data.message}\n@else\nInvalid data provided\n@end',
        context: { data: { isValid: true, message: 'Success' } },
        expectedOutput: 'Processing: Success',
        explanation: 'Common data validation pattern'
      },
      {
        name: 'Feature Flags',
        template: '@if features.newDesign\n<div class="new-layout">${content}</div>\n@else\n<div class="legacy-layout">${content}</div>\n@end',
        context: { features: { newDesign: true }, content: 'Hello World' },
        expectedOutput: '<div class="new-layout">Hello World</div>',
        explanation: 'Feature flag conditional rendering'
      }
    ],
    combinations: [
      {
        directives: ['@if', '@else'],
        description: 'Binary conditional rendering',
        example: '@if condition\nTrue branch\n@else\nFalse branch\n@end',
        useCase: 'Show different content based on single condition'
      },
      {
        directives: ['@if', '@repeat'],
        description: 'Conditional iteration',
        example: '@if items.length > 0\n@repeat in items\n${it.name}\n@end\n@end',
        useCase: 'Only show list if items exist'
      }
    ],
    troubleshooting: [
      {
        error: 'Condition always evaluates to false',
        cause: 'Variable not in scope or undefined',
        solution: 'Check variable name and ensure it exists in template context',
        prevention: 'Use template context validation and provide default values'
      },
      {
        error: 'Template content not rendering',
        cause: 'Missing @end directive',
        solution: 'Add @end directive to close the @if block',
        prevention: 'Use editor with template syntax highlighting'
      }
    ],
    seeAlso: ['@else', '@repeat', 'boolean expressions', 'template interpolation'],
    tags: ['conditional', 'template', 'rendering', 'boolean', 'branching']
  };

  /**
   * Main evaluation method for expressions
   */
  async evaluate(context: TemplateExecutionContext, input: IfDirectiveInput): Promise<TypedResult<string>> {
    return this.executeTemplate(context, input, input.templateContent);
  }

  /**
   * Enhanced template execution method
   */
  async executeTemplate(
    context: TemplateExecutionContext,
    input: IfDirectiveInput,
    templateContent: string
  ): Promise<TypedResult<string>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'IfDirectiveValidationError',
            message: validation.errors[0]?.message || 'Invalid @if directive input',
            code: 'IF_VALIDATION_FAILED',
            suggestions: validation.suggestions || [
              'Ensure condition and templateContent are provided',
              'Check condition expression syntax',
              'Verify template content is valid'
            ]
          }
        };
      }

      // Validate template context
      const contextValidation = this.validateTemplateContext(context, input);
      if (!contextValidation.isValid) {
        return {
          success: false,
          error: {
            name: 'IfDirectiveContextError',
            message: contextValidation.errors[0]?.message || 'Invalid template context',
            code: 'IF_CONTEXT_INVALID',
            suggestions: contextValidation.suggestions || ['Check template context structure']
          }
        };
      }

      // Evaluate condition
      const conditionResult = this.evaluateCondition(input.condition, context);
      
      // Create conditional context
      const conditionalContext = this.createConditionalContext(context, conditionResult);

      // Execute template content if condition is true
      let result = '';
      if (conditionResult) {
        result = this.renderTemplateContent(templateContent, conditionalContext);
      }

      // Track evaluation
      this.trackEvaluation(context, input, result, startTime);

      return {
        success: true,
        value: result,
        type: 'string'
      };

    } catch (error) {
      return {
        success: false,
        error: {
          name: 'IfDirectiveError',
          message: `@if directive execution failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'IF_EXECUTION_FAILED',
          suggestions: [
            'Check condition expression syntax',
            'Verify template content is valid',
            'Ensure all referenced variables exist in context'
          ]
        }
      };
    }
  }

  /**
   * Validate input according to schema
   */
  validate(input: unknown): UnifiedValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid @if directive: ${err.message}`,
            suggestions: [`Expected { condition: any, templateContent: string }, got: ${typeof input}`]
          })),
          suggestions: [
            'Provide both condition and templateContent',
            'Ensure templateContent is a string',
            'Check @if directive syntax: @if <condition>'
          ]
        };
      }

      // Additional semantic validation
      const { condition, templateContent } = parsed.data;
      
      if (!templateContent.trim()) {
        return {
          isValid: false,
          errors: [{
            type: 'syntax-error',
            message: 'Template content cannot be empty',
            suggestions: ['Provide content to render when condition is true']
          }],
          suggestions: ['Add content between @if and @end directives']
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestions: ['Check @if directive input structure']
        }],
        suggestions: ['Ensure input matches expected format']
      };
    }
  }

  /**
   * Validate template context and input
   */
  validateTemplateContext(
    context: TemplateExecutionContext,
    _input: IfDirectiveInput
  ): UnifiedValidationResult {
    const errors: UnifiedValidationResult['errors'] = [];
    
    // Check template buffer exists
    if (!Array.isArray(context.templateBuffer)) {
      errors.push({
        type: 'runtime-error',
        message: 'Template buffer not initialized',
        suggestions: ['Ensure template context is properly created']
      });
    }
    
    // Check nesting depth
    if (context.templateDepth > 10) {
      errors.push({
        type: 'runtime-error',
        message: `Template nesting too deep (${context.templateDepth})`,
        suggestions: ['Reduce template nesting complexity']
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions: errors.length > 0 ? ['Fix template context issues'] : []
    };
  }

  /**
   * Evaluate condition expression for truthiness
   */
  private evaluateCondition(condition: unknown, _context: TemplateExecutionContext): boolean {
    // Handle direct boolean values
    if (typeof condition === 'boolean') {
      return condition;
    }
    
    // Handle null/undefined
    if (condition == null) {
      return false;
    }
    
    // Handle numbers
    if (typeof condition === 'number') {
      return condition !== 0 && !isNaN(condition);
    }
    
    // Handle strings
    if (typeof condition === 'string') {
      return condition.length > 0;
    }
    
    // Handle arrays
    if (Array.isArray(condition)) {
      return condition.length > 0;
    }
    
    // Handle objects
    if (typeof condition === 'object') {
      return Object.keys(condition).length > 0;
    }
    
    // Default: convert to boolean
    return Boolean(condition);
  }

  /**
   * Create conditional context for this directive
   */
  private createConditionalContext(
    context: TemplateExecutionContext,
    conditionMet: boolean
  ): TemplateExecutionContext {
    return {
      ...context,
      conditionalContext: {
        conditionMet,
        elseAllowed: !conditionMet,
        branchExecuted: conditionMet
      }
    };
  }

  /**
   * Render template content with interpolation
   */
  private renderTemplateContent(
    templateContent: string,
    context: TemplateExecutionContext
  ): string {
    // Simple interpolation for ${variable} expressions
    return templateContent.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        // Simple variable resolution from context
        const variables = TemplateContextUtils.extractVariables(context);
        
        // Handle simple property access (e.g., user.name, items.length)
        const value = this.resolveExpression(expression.trim(), variables);
        return String(value ?? '');
      } catch (error) {
        console.warn(`Template interpolation error for ${expression}:`, error);
        return match; // Return original if evaluation fails
      }
    });
  }

  /**
   * Simple expression resolver for template interpolation
   */
  private resolveExpression(expression: string, variables: Record<string, unknown>): unknown {
    // Handle simple variable access
    if (expression in variables) {
      return variables[expression];
    }
    
    // Handle property access (e.g., user.name)
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let current = variables[parts[0]];
      
      for (let i = 1; i < parts.length && current != null; i++) {
        if (typeof current === 'object' && current !== null) {
          current = (current as Record<string, unknown>)[parts[i]];
        } else {
          return undefined;
        }
      }
      
      return current;
    }
    
    // Handle array length
    if (expression.endsWith('.length')) {
      const varName = expression.slice(0, -7);
      const value = variables[varName];
      if (Array.isArray(value)) {
        return value.length;
      }
    }
    
    return undefined;
  }

  /**
   * Track evaluation for debugging and performance
   */
  private trackEvaluation(
    context: TemplateExecutionContext,
    input: IfDirectiveInput,
    result: string,
    startTime: number
  ): void {
    if (context.evaluationHistory) {
      (context.evaluationHistory as any).push({
        expressionName: this.name,
        category: this.category,
        input,
        output: result,
        timestamp: startTime,
        duration: Date.now() - startTime,
        success: true
      });
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create enhanced @if directive instance
 */
export function createEnhancedIfDirective(): EnhancedIfDirective {
  return new EnhancedIfDirective();
}

export default EnhancedIfDirective;