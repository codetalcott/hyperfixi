/**
 * Enhanced Logical Expressions - Deep TypeScript Integration
 * Implements logical operations (and, or, not) with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  TypedExpressionContext,
  ExpressionCategory,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  LLMDocumentation,
  TypedExpressionImplementation,
  EvaluationResult
} from '../../types/base-types';

// ============================================================================
// Input Schemas
// ============================================================================

const BinaryLogicalInputSchema = v.object({
  left: v.unknown().describe('Left operand value'),
  right: v.unknown().describe('Right operand value')
}).strict();

const UnaryLogicalInputSchema = v.object({
  operand: v.unknown().describe('Operand value to negate')
}).strict();

type BinaryLogicalInput = z.infer<typeof BinaryLogicalInputSchema>;
type UnaryLogicalInput = z.infer<typeof UnaryLogicalInputSchema>;

// ============================================================================
// Enhanced And Expression
// ============================================================================

export class EnhancedAndExpression implements TypedExpressionImplementation<BinaryLogicalInput, boolean> {
  public readonly name = 'and';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left and right';
  public readonly description = 'Logical AND operation with comprehensive boolean type coercion';
  public readonly inputSchema = BinaryLogicalInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'true and false',
        description: 'Basic boolean AND operation',
        expectedOutput: false
      },
      {
        input: 'value > 0 and value < 100',
        description: 'Range validation with logical AND',
        expectedOutput: true,
        context: { locals: new Map([['value', 50]]) }
      },
      {
        input: 'user.isActive and user.hasPermission',
        description: 'Object property AND evaluation',
        expectedOutput: true,
        context: { locals: new Map([['user', { isActive: true, hasPermission: true }]]) }
      }
    ],
    relatedExpressions: ['or', 'not', 'equals', 'greaterThan'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs logical AND operation with short-circuit evaluation and comprehensive type coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand - any value that can be coerced to boolean',
        optional: false,
        examples: ['true', '1', '"hello"', 'user.isActive', 'count > 0']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand - any value that can be coerced to boolean (only evaluated if left is truthy)',
        optional: false,
        examples: ['false', '0', '""', 'user.hasPermission', 'status == "active"']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if both operands are truthy, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Basic boolean AND',
        code: 'true and false',
        explanation: 'Returns false because the second operand is false',
        output: 'false'
      },
      {
        title: 'Truthy value coercion',
        code: '"hello" and 42',
        explanation: 'Non-empty string and non-zero number are both truthy',
        output: 'true'
      },
      {
        title: 'Short-circuit evaluation',
        code: 'false and someExpensiveFunction()',
        explanation: 'Right operand is not evaluated when left is falsy',
        output: 'false'
      },
      {
        title: 'Range validation',
        code: 'age >= 18 and age <= 65',
        explanation: 'Check if age is within valid range',
        output: 'true'
      },
      {
        title: 'Object property validation',
        code: 'user and user.isActive',
        explanation: 'Check if user exists and is active',
        output: 'true'
      }
    ],
    seeAlso: ['or', 'not', 'boolean coercion', 'conditional logic'],
    tags: ['logical', 'boolean', 'and', 'conditional', 'short-circuit']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryLogicalInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Convert left operand to boolean
      const leftBool = this.toBoolean(input.left);

      // Short-circuit evaluation: if left is false, return false without evaluating right
      if (!leftBool) {
        this.trackPerformance(context, startTime, true);
        return {
          success: true,
          value: false,
          type: 'boolean'
        };
      }

      // Convert right operand to boolean
      const rightBool = this.toBoolean(input.right);
      const result = leftBool && rightBool;

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Logical AND operation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure both operands are valid values',
          'Check for null or undefined values',
          'Verify operands can be converted to boolean'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid AND operation input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide both left and right operands',
            'Ensure operands are valid values'
          ]
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
          suggestions: []
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  /**
   * Convert value to boolean using JavaScript's truthiness rules
   */
  private toBoolean(value: unknown): boolean {
    // JavaScript falsy values: false, 0, -0, 0n, "", null, undefined, NaN
    if (value === false || value === 0 || value === -0 || value === 0n || 
        value === "" || value === null || value === undefined) {
      return false;
    }
    
    if (typeof value === 'number' && isNaN(value)) {
      return false;
    }
    
    // All other values are truthy
    return true;
  }

  /**
   * Track performance for debugging and optimization
   */
  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'logical operation',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Or Expression
// ============================================================================

export class EnhancedOrExpression implements TypedExpressionImplementation<BinaryLogicalInput, boolean> {
  public readonly name = 'or';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left or right';
  public readonly description = 'Logical OR operation with comprehensive boolean type coercion';
  public readonly inputSchema = BinaryLogicalInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'false or true',
        description: 'Basic boolean OR operation',
        expectedOutput: true
      },
      {
        input: 'user.isGuest or user.isAdmin',
        description: 'User permission check with OR',
        expectedOutput: true,
        context: { locals: new Map([['user', { isGuest: false, isAdmin: true }]]) }
      },
      {
        input: 'value < 0 or value > 100',
        description: 'Range exclusion validation',
        expectedOutput: false,
        context: { locals: new Map([['value', 50]]) }
      }
    ],
    relatedExpressions: ['and', 'not', 'equals', 'greaterThan'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs logical OR operation with short-circuit evaluation and comprehensive type coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand - any value that can be coerced to boolean',
        optional: false,
        examples: ['false', '0', '""', 'user.isGuest', 'count <= 0']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand - any value that can be coerced to boolean (only evaluated if left is falsy)',
        optional: false,
        examples: ['true', '1', '"fallback"', 'user.isAdmin', 'hasDefault']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if either operand is truthy, false if both are falsy',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Basic boolean OR',
        code: 'false or true',
        explanation: 'Returns true because the second operand is true',
        output: 'true'
      },
      {
        title: 'Falsy value coercion',
        code: '0 or ""',
        explanation: 'Both operands are falsy, so result is false',
        output: 'false'
      },
      {
        title: 'Short-circuit evaluation',
        code: 'true or someExpensiveFunction()',
        explanation: 'Right operand is not evaluated when left is truthy',
        output: 'true'
      },
      {
        title: 'Default value pattern',
        code: 'userInput or "default"',
        explanation: 'Use default value when user input is empty',
        output: 'true'
      },
      {
        title: 'Permission check',
        code: 'user.isOwner or user.isAdmin',
        explanation: 'Check if user has either owner or admin permissions',
        output: 'true'
      }
    ],
    seeAlso: ['and', 'not', 'boolean coercion', 'default values'],
    tags: ['logical', 'boolean', 'or', 'conditional', 'short-circuit', 'fallback']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryLogicalInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Convert left operand to boolean
      const leftBool = this.toBoolean(input.left);

      // Short-circuit evaluation: if left is true, return true without evaluating right
      if (leftBool) {
        this.trackPerformance(context, startTime, true);
        return {
          success: true,
          value: true,
          type: 'boolean'
        };
      }

      // Convert right operand to boolean
      const rightBool = this.toBoolean(input.right);
      const result = leftBool || rightBool;

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Logical OR operation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure both operands are valid values',
          'Check for null or undefined values',
          'Verify operands can be converted to boolean'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    // Reuse AND validation logic
    const andExpr = new EnhancedAndExpression();
    return andExpr.validate(input);
  }

  private toBoolean(value: unknown): boolean {
    // Reuse AND boolean conversion logic
    const andExpr = new EnhancedAndExpression();
    return andExpr['toBoolean'](value);
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'logical operation',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Not Expression
// ============================================================================

export class EnhancedNotExpression implements TypedExpressionImplementation<UnaryLogicalInput, boolean> {
  public readonly name = 'not';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'not operand';
  public readonly description = 'Logical NOT operation with comprehensive boolean type coercion';
  public readonly inputSchema = UnaryLogicalInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'not true',
        description: 'Basic boolean NOT operation',
        expectedOutput: false
      },
      {
        input: 'not user.isBlocked',
        description: 'Negate user blocked status',
        expectedOutput: true,
        context: { locals: new Map([['user', { isBlocked: false }]]) }
      },
      {
        input: 'not (value > 100)',
        description: 'Negate comparison result',
        expectedOutput: true,
        context: { locals: new Map([['value', 50]]) }
      }
    ],
    relatedExpressions: ['and', 'or', 'equals', 'greaterThan'],
    performance: {
      averageTime: 0.05,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs logical NOT operation (negation) with comprehensive type coercion',
    parameters: [
      {
        name: 'operand',
        type: 'any',
        description: 'Operand to negate - any value that can be coerced to boolean',
        optional: false,
        examples: ['true', 'false', '0', '""', 'user.isActive', 'count > 0']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if operand is falsy, false if operand is truthy',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Basic negation',
        code: 'not true',
        explanation: 'Negates true to false',
        output: 'false'
      },
      {
        title: 'Falsy value negation',
        code: 'not 0',
        explanation: 'Zero is falsy, so its negation is true',
        output: 'true'
      },
      {
        title: 'String negation',
        code: 'not ""',
        explanation: 'Empty string is falsy, so its negation is true',
        output: 'true'
      },
      {
        title: 'Complex expression negation',
        code: 'not (age < 18)',
        explanation: 'Negate the result of age comparison',
        output: 'true'
      },
      {
        title: 'Property access negation',
        code: 'not user.isBlocked',
        explanation: 'Check if user is not blocked',
        output: 'true'
      }
    ],
    seeAlso: ['and', 'or', 'boolean coercion', 'negation'],
    tags: ['logical', 'boolean', 'not', 'negation', 'inverse']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: UnaryLogicalInput
  ): Promise<EvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Convert operand to boolean and negate
      const operandBool = this.toBoolean(input.operand);
      const result = !operandBool;

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Logical NOT operation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operand is a valid value',
          'Check for null or undefined values',
          'Verify operand can be converted to boolean'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);
      
      if (!parsed.success) {
        return {
          isValid: false,
          errors: parsed.error?.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid NOT operation input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide a single operand',
            'Ensure operand is a valid value'
          ]
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
          suggestions: []
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private toBoolean(value: unknown): boolean {
    // Reuse AND boolean conversion logic
    const andExpr = new EnhancedAndExpression();
    return andExpr['toBoolean'](value);
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'logical operation',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEnhancedAndExpression(): EnhancedAndExpression {
  return new EnhancedAndExpression();
}

export function createEnhancedOrExpression(): EnhancedOrExpression {
  return new EnhancedOrExpression();
}

export function createEnhancedNotExpression(): EnhancedNotExpression {
  return new EnhancedNotExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedLogicalExpressions = {
  and: createEnhancedAndExpression(),
  or: createEnhancedOrExpression(),
  not: createEnhancedNotExpression()
} as const;