/**
 * Enhanced @else Directive - Deep TypeScript Integration
 * Implements else branch template rendering with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import type {
  EnhancedTemplateDirective,
  TemplateExecutionContext,
  ElseDirectiveInput,
  TemplateDirectiveType,
  TemplateRenderStrategy,
  TemplateLLMDocumentation
} from '../../../types/enhanced-templates.ts';
import { ElseDirectiveInputSchema } from '../../../types/enhanced-templates.ts';
import type {
  TypedResult,
  ExpressionMetadata,
  ValidationResult
} from '../../../types/enhanced-expressions.ts';
import { TemplateContextUtils } from '../enhanced-template-context.ts';

/**
 * Enhanced @else directive with full type safety for LLM agents
 */
export class EnhancedElseDirective implements EnhancedTemplateDirective<ElseDirectiveInput, string> {
  public readonly name = '@else' as const;
  public readonly category = 'Template';
  public readonly syntax = '@else';
  public readonly outputType = 'String' as const;
  public readonly inputSchema = ElseDirectiveInputSchema;

  // Template-specific properties
  public readonly directiveType: TemplateDirectiveType = '@else';
  public readonly renderStrategy: TemplateRenderStrategy = 'conditional';
  public readonly createsScope = false;
  public readonly allowsNesting = true;
  public readonly allowedNext: TemplateDirectiveType[] = ['@end'];

  public readonly metadata: ExpressionMetadata = {
    category: 'Template',
    complexity: 'simple',
    sideEffects: ['template-rendering'],
    dependencies: ['@if'],
    returnTypes: ['string'],
    examples: [
      {
        input: '@if user.isLoggedIn\nWelcome back!\n@else\nPlease log in\n@end',
        description: 'Show login prompt if user is not authenticated',
        expectedOutput: 'Please log in'
      },
      {
        input: '@if items.length > 0\nYou have items\n@else\nYour cart is empty\n@end',
        description: 'Show empty cart message when no items',
        expectedOutput: 'Your cart is empty'
      },
      {
        input: '@if user.role === "admin"\nAdmin panel\n@else\nUser dashboard\n@end',
        description: 'Show different interface based on user role',
        expectedOutput: 'User dashboard'
      }
    ],
    relatedExpressions: ['@if', '@repeat', 'boolean conversion'],
    performance: {
      averageTime: 0.3,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: TemplateLLMDocumentation = {
    summary: 'Renders alternative template content when the preceding @if condition evaluates to false',
    parameters: [
      {
        name: 'templateContent',
        type: 'string',
        description: 'Template content to render when @if condition is false',
        optional: false,
        examples: ['Please log in', 'No items found', '<div class="error">Error occurred</div>']
      }
    ],
    returns: {
      type: 'object',
      description: 'Structured result with rendered content or empty string',
      examples: ['{ success: true, value: "Please log in", type: "string" }']
    },
    examples: [
      {
        title: 'Basic if-else branch',
        code: '@if user.isActive\nActive user content\n@else\nInactive user message\n@end',
        explanation: 'Shows different content based on user activation status',
        output: 'Inactive user message'
      },
      {
        title: 'Authentication check',
        code: '@if user.token\nWelcome back, ${user.name}!\n@else\nPlease sign in to continue\n@end',
        explanation: 'Authentication-based content rendering',
        output: 'Please sign in to continue'
      },
      {
        title: 'Data availability check',
        code: '@if data.results && data.results.length > 0\nShowing ${data.results.length} results\n@else\nNo results found for your search\n@end',
        explanation: 'Show results count or empty state message',
        output: 'No results found for your search'
      },
      {
        title: 'Feature flag fallback',
        code: '@if features.betaFeature\n<div class="beta">Beta feature content</div>\n@else\n<div class="stable">Standard feature content</div>\n@end',
        explanation: 'Feature flag with fallback content',
        output: '<div class="stable">Standard feature content</div>'
      }
    ],
    patterns: [
      {
        name: 'Authentication Flow',
        template: '@if user.authenticated\nWelcome to your dashboard\n@else\nPlease log in to access your account\n@end',
        context: { user: { authenticated: false } },
        expectedOutput: 'Please log in to access your account',
        explanation: 'Standard authentication check with fallback'
      },
      {
        name: 'Content Availability',
        template: '@if content.available\n${content.body}\n@else\nContent is currently unavailable\n@end',
        context: { content: { available: false } },
        expectedOutput: 'Content is currently unavailable',
        explanation: 'Content availability check with fallback message'
      },
      {
        name: 'Permission-Based UI',
        template: '@if user.canEdit\n<button>Edit</button>\n@else\n<span class="disabled">Read Only</span>\n@end',
        context: { user: { canEdit: false } },
        expectedOutput: '<span class="disabled">Read Only</span>',
        explanation: 'Show different UI elements based on permissions'
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
        directives: ['@if', '@else', '@repeat'],
        description: 'Conditional list rendering',
        example: '@if items.length > 0\n@repeat in items\n${it.name}\n@end\n@else\nNo items available\n@end',
        useCase: 'Show list if items exist, otherwise show empty message'
      }
    ],
    troubleshooting: [
      {
        error: '@else directive without preceding @if',
        cause: '@else used without a matching @if directive',
        solution: 'Ensure @else follows an @if directive in the same scope',
        prevention: 'Use template validation and proper nesting'
      },
      {
        error: 'Multiple @else directives for single @if',
        cause: 'More than one @else for the same @if block',
        solution: 'Use only one @else per @if block',
        prevention: 'Follow if-else-end pattern consistently'
      },
      {
        error: '@else content not rendering',
        cause: 'Previous @if condition was true, so @else branch skipped',
        solution: 'Check @if condition logic - @else only renders when @if is false',
        prevention: 'Test both branches of conditional logic'
      }
    ],
    seeAlso: ['@if', '@repeat', 'boolean expressions', 'template interpolation'],
    tags: ['conditional', 'template', 'rendering', 'boolean', 'branching', 'fallback']
  };

  /**
   * Main evaluation method for expressions
   */
  evaluate(context: TemplateExecutionContext, input: ElseDirectiveInput): Promise<TypedResult<string>> {
    return this.executeTemplate(context, input, input.templateContent);
  }

  /**
   * Enhanced template execution method
   */
  async executeTemplate(
    context: TemplateExecutionContext,
    input: ElseDirectiveInput,
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
            name: 'ElseDirectiveValidationError',
            message: validation.errors[0]?.message || 'Invalid @else directive input',
            code: 'ELSE_VALIDATION_FAILED',
            suggestions: validation.suggestions || [
              'Ensure templateContent is provided',
              'Check template content is valid',
              'Verify @else follows @if directive'
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
            name: 'ElseDirectiveContextError',
            message: contextValidation.errors[0]?.message || 'Invalid template context',
            code: 'ELSE_CONTEXT_INVALID',
            suggestions: contextValidation.suggestions || ['Check template context structure']
          }
        };
      }

      // Check if @else should execute based on conditional context
      const shouldExecute = this.shouldExecuteElse(context);
      
      let result = '';
      if (shouldExecute) {
        // Create conditional context for else branch
        const elseContext = this.createElseContext(context);
        
        // Execute template content
        result = await this.renderTemplateContent(templateContent, elseContext);
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
          name: 'ElseDirectiveError',
          message: `@else directive execution failed: ${error instanceof Error ? error.message : String(error)}`,
          code: 'ELSE_EXECUTION_FAILED',
          suggestions: [
            'Check template content is valid',
            'Ensure @else follows @if directive',
            'Verify all referenced variables exist in context'
          ]
        }
      };
    }
  }

  /**
   * Validate input according to schema
   */
  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch' as const,
            message: `Invalid @else directive: ${err.message}`,
            suggestion: `Expected { templateContent: string }, got: ${typeof input}`
          })),
          suggestions: [
            'Provide templateContent as a string',
            'Check @else directive syntax: @else',
            'Ensure @else follows @if directive'
          ]
        };
      }

      // Additional semantic validation
      const { templateContent } = parsed.data;
      
      if (!templateContent.trim()) {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-syntax',
            message: 'Template content cannot be empty',
            suggestion: 'Provide content to render in else branch'
          }],
          suggestion: 'Add content between @else and @end directives'
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestion: 
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'runtime-error',
          message: 'Validation failed with exception',
          suggestion: 'Check @else directive input structure'
        }],
        suggestion: 'Ensure input matches expected format'
      };
    }
  }

  /**
   * Validate template context and input
   */
  validateTemplateContext(
    context: TemplateExecutionContext,
    input: ElseDirectiveInput
  ): ValidationResult {
    const errors: Array<{ type: string; message: string; suggestion: string }> = [];
    
    // Check template buffer exists
    if (!Array.isArray(context.templateBuffer)) {
      errors.push({
        type: 'context-error',
        message: 'Template buffer not initialized',
        suggestion: 'Ensure template context is properly created'
      });
    }
    
    // Check conditional context exists (required for @else)
    if (!context.conditionalContext) {
      errors.push({
        type: 'conditional-error',
        message: '@else directive requires preceding @if directive',
        suggestion: 'Ensure @else follows @if in the same scope'
      });
    }
    
    // Check nesting depth
    if (context.templateDepth > 10) {
      errors.push({
        type: 'nesting-error',
        message: `Template nesting too deep (${context.templateDepth})`,
        suggestion: 'Reduce template nesting complexity'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions: errors.length > 0 ? ['Fix template context issues'] : []
    };
  }

  /**
   * Determine if @else branch should execute based on conditional context
   */
  private shouldExecuteElse(context: TemplateExecutionContext): boolean {
    const conditional = context.conditionalContext;
    
    if (!conditional) {
      // No conditional context means no preceding @if
      return false;
    }
    
    // @else executes when:
    // 1. The @if condition was false (!conditionMet)
    // 2. No branch has been executed yet (!branchExecuted)
    // 3. @else is allowed (elseAllowed)
    return conditional.elseAllowed && !conditional.branchExecuted;
  }

  /**
   * Create conditional context for else branch
   */
  private createElseContext(
    context: TemplateExecutionContext
  ): TemplateExecutionContext {
    return {
      ...context,
      conditionalContext: {
        conditionMet: false,
        elseAllowed: false, // No further @else allowed after this one
        branchExecuted: true // Mark that a branch has been executed
      }
    };
  }

  /**
   * Render template content with interpolation
   */
  private async renderTemplateContent(
    templateContent: string,
    context: TemplateExecutionContext
  ): Promise<string> {
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
    if (variables.hasOwnProperty(expression)) {
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
    input: ElseDirectiveInput,
    result: string,
    startTime: number
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
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
 * Create enhanced @else directive instance
 */
export function createEnhancedElseDirective(): EnhancedElseDirective {
  return new EnhancedElseDirective();
}

export default EnhancedElseDirective;