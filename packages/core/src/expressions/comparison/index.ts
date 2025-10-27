/**
 * Enhanced Comparison Expressions - Deep TypeScript Integration
 * Implements comparison operations (>, <, >=, <=, ==, !=) with comprehensive validation
 * Enhanced for LLM code agents with full type safety
 */

import { v } from '../../validation/lightweight-validators';
import type {
  ValidationResult,
  TypedExecutionContext as TypedExpressionContext,
  UnifiedEvaluationType as EvaluationType,
  UnifiedExpressionMetadata as ExpressionMetadata,
  UnifiedTypedResult as TypedResult,
  UnifiedLLMDocumentation as LLMDocumentation,
  UnifiedExpressionCategory as ExpressionCategory
} from '../../types/index';

// Define BaseTypedExpression locally for now
interface BaseTypedExpression<T> {
  readonly name: string;
  readonly category: string;
  readonly syntax: string;
  readonly outputType: EvaluationType;
  readonly inputSchema: any;
  readonly metadata: ExpressionMetadata;
  readonly documentation: LLMDocumentation;
  evaluate(context: TypedExpressionContext, input: unknown): Promise<TypedResult<T>>;
  validate(input: unknown): ValidationResult;
}

// ============================================================================
// Input Schemas
// ============================================================================

const ComparisonInputSchema = v.object({
  left: v.unknown().describe('Left operand value'),
  right: v.unknown().describe('Right operand value')
});

type ComparisonInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Greater Than Expression
// ============================================================================

export class EnhancedGreaterThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left > right';
  public readonly description = 'Compares if left operand is greater than right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['boolean'],
    examples: [
      {
        input: '10 > 5',
        description: 'Compare two numbers',
        expectedOutput: true
      },
      {
        input: '"b" > "a"',
        description: 'Compare strings lexicographically',
        expectedOutput: true
      },
      {
        input: 'age > 18',
        description: 'Check if person is adult',
        expectedOutput: true,
        context: { locals: new Map([['age', 25]]) }
      }
    ],
    relatedExpressions: ['lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'equals', 'notEquals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Compares two values to determine if the left operand is greater than the right operand',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand - number, string, or comparable value',
        optional: false,
        examples: ['10', '"b"', 'age', 'score']
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand - number, string, or comparable value',
        optional: false,
        examples: ['5', '"a"', '18', 'threshold']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left is greater than right, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Numeric comparison',
        code: '25 > 18',
        explanation: 'Check if 25 is greater than 18',
        output: 'true'
      },
      {
        title: 'String comparison',
        code: '"zebra" > "apple"',
        explanation: 'Compare strings lexicographically',
        output: 'true'
      },
      {
        title: 'Variable comparison',
        code: 'currentScore > bestScore',
        explanation: 'Compare variables containing numbers',
        output: 'false'
      },
      {
        title: 'Age verification',
        code: 'userAge > 21',
        explanation: 'Check if user meets age requirement',
        output: 'true'
      }
    ],
    seeAlso: ['lessThan', 'greaterThanOrEqual', 'equals', 'mathematical operations'],
    tags: ['comparison', 'logical', 'greater', 'boolean', 'conditional']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
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

      // Compare values
      const result = this.compareValues(input.left, input.right, '>');

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
          message: `Greater than comparison failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }],
        suggestions: [
          'Ensure both operands are comparable (numbers, strings, or dates)',
          'Check for null or undefined values',
          'Verify operands have compatible types'
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
            message: `Invalid comparison input: ${err.message}`,
            suggestions: []
          })) ?? [],
          suggestions: [
            'Provide both left and right operands',
            'Ensure operands are comparable values'
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
   * Compare two values using the specified operator
   */
  private compareValues(left: unknown, right: unknown, _operator: string): boolean {
    // Handle null/undefined cases
    if (left == null || right == null) {
      return false;
    }

    // If both are numbers, compare numerically
    if (typeof left === 'number' && typeof right === 'number') {
      return left > right;
    }

    // If both are strings, compare lexicographically
    if (typeof left === 'string' && typeof right === 'string') {
      return left > right;
    }

    // Try to convert both to numbers
    const leftNum = this.toNumber(left);
    const rightNum = this.toNumber(right);
    
    if (leftNum !== null && rightNum !== null) {
      return leftNum > rightNum;
    }

    // Fallback to string comparison
    return String(left) > String(right);
  }

  /**
   * Convert value to number, return null if not possible
   */
  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return null;
  }

  /**
   * Track performance for debugging and optimization
   */
  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'comparison',
        output: success ? 'boolean' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Less Than Expression
// ============================================================================

export class EnhancedLessThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left < right';
  public readonly description = 'Compares if left operand is less than right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['boolean'],
    examples: [
      {
        input: '5 < 10',
        description: 'Compare two numbers',
        expectedOutput: true
      },
      {
        input: 'temperature < 32',
        description: 'Check if below freezing',
        expectedOutput: true,
        context: { locals: new Map([['temperature', 25]]) }
      }
    ],
    relatedExpressions: ['greaterThan', 'lessThanOrEqual', 'greaterThanOrEqual', 'equals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Compares two values to determine if the left operand is less than the right operand',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand - number, string, or comparable value',
        optional: false,
        examples: ['5', '"a"', 'temperature', 'count']
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand - number, string, or comparable value',
        optional: false,
        examples: ['10', '"z"', '32', 'limit']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left is less than right, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Numeric comparison',
        code: '15 < 20',
        explanation: 'Check if 15 is less than 20',
        output: 'true'
      },
      {
        title: 'Temperature check',
        code: 'currentTemp < freezingPoint',
        explanation: 'Check if temperature is below freezing',
        output: 'true'
      }
    ],
    seeAlso: ['greaterThan', 'lessThanOrEqual', 'equals'],
    tags: ['comparison', 'logical', 'less', 'boolean', 'conditional']
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    // Reuse greater than logic but invert the comparison
    const greaterThanExpr = new EnhancedGreaterThanExpression();
    
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = greaterThanExpr['compareValues'](input.left, input.right, '<');

      return {
        success: true,
        value: this.invertComparison(result, input.left, input.right, '<'),
        type: 'boolean'
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Less than comparison failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }],
        suggestions: ['Ensure both operands are comparable']
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new EnhancedGreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private invertComparison(_greaterResult: boolean, left: unknown, right: unknown, _operator: string): boolean {
    // Handle null/undefined cases
    if (left == null || right == null) {
      return false;
    }

    // For less than, we need to do the actual comparison
    if (typeof left === 'number' && typeof right === 'number') {
      return left < right;
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left < right;
    }

    // Try numeric conversion
    const leftNum = this.toNumber(left);
    const rightNum = this.toNumber(right);
    
    if (leftNum !== null && rightNum !== null) {
      return leftNum < rightNum;
    }

    return String(left) < String(right);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return null;
  }
}

// ============================================================================
// Enhanced Greater Than Or Equal Expression
// ============================================================================

export class EnhancedGreaterThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left >= right';
  public readonly description = 'Compares if left operand is greater than or equal to right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['boolean'],
    examples: [
      {
        input: '10 >= 10',
        description: 'Equal values should return true',
        expectedOutput: true
      },
      {
        input: 'score >= passingGrade',
        description: 'Check if student passed',
        expectedOutput: true,
        context: { locals: new Map([['score', 85], ['passingGrade', 70]]) }
      }
    ],
    relatedExpressions: ['greaterThan', 'lessThan', 'lessThanOrEqual', 'equals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Compares two values to determine if the left operand is greater than or equal to the right operand',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand - number, string, or comparable value',
        optional: false,
        examples: ['10', 'score', 'currentValue']
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand - number, string, or comparable value',
        optional: false,
        examples: ['10', 'passingGrade', 'minimumValue']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left is greater than or equal to right, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Passing grade check',
        code: 'studentScore >= 70',
        explanation: 'Check if student scored 70 or above',
        output: 'true'
      },
      {
        title: 'Minimum requirement',
        code: 'age >= minimumAge',
        explanation: 'Check if age meets minimum requirement',
        output: 'true'
      }
    ],
    seeAlso: ['greaterThan', 'lessThanOrEqual', 'equals'],
    tags: ['comparison', 'logical', 'greater-equal', 'boolean', 'conditional']
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = this.compareGreaterOrEqual(input.left, input.right);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Greater than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }],
        suggestions: ['Ensure both operands are comparable']
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new EnhancedGreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private compareGreaterOrEqual(left: unknown, right: unknown): boolean {
    if (left == null || right == null) {
      return left === right; // Both null/undefined are equal
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return left >= right;
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left >= right;
    }

    const leftNum = this.toNumber(left);
    const rightNum = this.toNumber(right);
    
    if (leftNum !== null && rightNum !== null) {
      return leftNum >= rightNum;
    }

    return String(left) >= String(right);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return null;
  }
}

// ============================================================================
// Enhanced Less Than Or Equal Expression
// ============================================================================

export class EnhancedLessThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left <= right';
  public readonly description = 'Compares if left operand is less than or equal to right operand';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['boolean'],
    examples: [
      {
        input: '5 <= 10',
        description: 'Check if value is within limit',
        expectedOutput: true
      },
      {
        input: 'usage <= quota',
        description: 'Check if under quota',
        expectedOutput: true,
        context: { locals: new Map([['usage', 75], ['quota', 100]]) }
      }
    ],
    relatedExpressions: ['lessThan', 'greaterThan', 'greaterThanOrEqual', 'equals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Compares two values to determine if the left operand is less than or equal to the right operand',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand - number, string, or comparable value',
        optional: false,
        examples: ['5', 'usage', 'currentAmount']
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand - number, string, or comparable value',
        optional: false,
        examples: ['10', 'quota', 'maximumAmount']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left is less than or equal to right, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Quota check',
        code: 'currentUsage <= monthlyQuota',
        explanation: 'Check if usage is within monthly quota',
        output: 'true'
      },
      {
        title: 'Budget constraint',
        code: 'totalCost <= budget',
        explanation: 'Check if cost is within budget',
        output: 'false'
      }
    ],
    seeAlso: ['lessThan', 'greaterThanOrEqual', 'equals'],
    tags: ['comparison', 'logical', 'less-equal', 'boolean', 'conditional']
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = this.compareLessOrEqual(input.left, input.right);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Less than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }],
        suggestions: ['Ensure both operands are comparable']
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new EnhancedGreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private compareLessOrEqual(left: unknown, right: unknown): boolean {
    if (left == null || right == null) {
      return left === right;
    }

    if (typeof left === 'number' && typeof right === 'number') {
      return left <= right;
    }

    if (typeof left === 'string' && typeof right === 'string') {
      return left <= right;
    }

    const leftNum = this.toNumber(left);
    const rightNum = this.toNumber(right);
    
    if (leftNum !== null && rightNum !== null) {
      return leftNum <= rightNum;
    }

    return String(left) <= String(right);
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    
    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return null;
  }
}

// ============================================================================
// Enhanced Equality Expression
// ============================================================================

export class EnhancedEqualityExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'equals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left == right';
  public readonly description = 'Compares if two values are equal with type coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['boolean'],
    examples: [
      {
        input: '5 == "5"',
        description: 'Type coercion equality',
        expectedOutput: true
      },
      {
        input: 'status == "complete"',
        description: 'String equality check',
        expectedOutput: true,
        context: { locals: new Map([['status', 'complete']]) }
      }
    ],
    relatedExpressions: ['notEquals', 'greaterThan', 'lessThan', 'strictEquals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Compares two values for equality with automatic type coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand - any value',
        optional: false,
        examples: ['5', '"hello"', 'true', 'variable']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand - any value',
        optional: false,
        examples: ['"5"', '"hello"', 'false', 'otherVariable']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if values are equal (with type coercion), false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Numeric equality with strings',
        code: '42 == "42"',
        explanation: 'Numbers and numeric strings are equal',
        output: 'true'
      },
      {
        title: 'Boolean coercion',
        code: '1 == true',
        explanation: 'Number 1 equals boolean true',
        output: 'true'
      },
      {
        title: 'String comparison',
        code: 'userRole == "admin"',
        explanation: 'Check if user has admin role',
        output: 'false'
      }
    ],
    seeAlso: ['notEquals', 'strictEquals', 'comparison operations'],
    tags: ['comparison', 'logical', 'equality', 'boolean', 'type-coercion']
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = this.compareEquality(input.left, input.right);

      return {
        success: true,
        value: result,
        type: 'boolean'
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Equality comparison failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }],
        suggestions: ['Check for comparable values']
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const greaterThanExpr = new EnhancedGreaterThanExpression();
    return greaterThanExpr.validate(input);
  }

  private compareEquality(left: unknown, right: unknown): boolean {
    // Direct equality check
    if (left === right) {
      return true;
    }

    // Null/undefined handling
    if (left == null && right == null) {
      return true;
    }

    if (left == null || right == null) {
      return false;
    }

    // Type coercion for numbers and strings
    if (typeof left === 'number' && typeof right === 'string') {
      const rightNum = Number(right);
      return Number.isFinite(rightNum) && left === rightNum;
    }

    if (typeof left === 'string' && typeof right === 'number') {
      const leftNum = Number(left);
      return Number.isFinite(leftNum) && leftNum === right;
    }

    // Boolean coercion
    if (typeof left === 'boolean' && typeof right === 'number') {
      return (left ? 1 : 0) === right;
    }

    if (typeof left === 'number' && typeof right === 'boolean') {
      return left === (right ? 1 : 0);
    }

    // Default: convert both to strings and compare
    return String(left) === String(right);
  }
}

// ============================================================================
// Enhanced Inequality Expression
// ============================================================================

export class EnhancedInequalityExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'notEquals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left != right';
  public readonly description = 'Compares if two values are not equal';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['boolean'],
    examples: [
      {
        input: '5 != 3',
        description: 'Numbers are not equal',
        expectedOutput: true
      },
      {
        input: 'status != "pending"',
        description: 'Check if not pending',
        expectedOutput: true,
        context: { locals: new Map([['status', 'complete']]) }
      }
    ],
    relatedExpressions: ['equals', 'greaterThan', 'lessThan'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Compares two values for inequality (not equal)',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand - any value',
        optional: false,
        examples: ['5', '"hello"', 'status']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand - any value',
        optional: false,
        examples: ['3', '"world"', '"pending"']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if values are not equal, false if they are equal',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Different numbers',
        code: '10 != 5',
        explanation: 'Check if numbers are different',
        output: 'true'
      },
      {
        title: 'Status check',
        code: 'currentStatus != "error"',
        explanation: 'Check if status is not error',
        output: 'true'
      }
    ],
    seeAlso: ['equals', 'comparison operations'],
    tags: ['comparison', 'logical', 'inequality', 'boolean', 'not-equal']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    try {
      // Use equality expression and invert the result
      const equalityExpr = new EnhancedEqualityExpression();
      const equalityResult = await equalityExpr.evaluate(context, input);

      if (!equalityResult.success) {
        return {
          success: false,
          ...(equalityResult.errors && { errors: equalityResult.errors }),
          ...(equalityResult.suggestions && { suggestions: equalityResult.suggestions })
        };
      }

      return {
        success: true,
        value: !equalityResult.value,
        type: 'boolean'
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Inequality comparison failed: ${error instanceof Error ? error.message : String(error)}`,
          suggestions: []
        }],
        suggestions: ['Check for comparable values']
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const equalityExpr = new EnhancedEqualityExpression();
    return equalityExpr.validate(input);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEnhancedGreaterThanExpression(): EnhancedGreaterThanExpression {
  return new EnhancedGreaterThanExpression();
}

export function createEnhancedLessThanExpression(): EnhancedLessThanExpression {
  return new EnhancedLessThanExpression();
}

export function createEnhancedGreaterThanOrEqualExpression(): EnhancedGreaterThanOrEqualExpression {
  return new EnhancedGreaterThanOrEqualExpression();
}

export function createEnhancedLessThanOrEqualExpression(): EnhancedLessThanOrEqualExpression {
  return new EnhancedLessThanOrEqualExpression();
}

export function createEnhancedEqualityExpression(): EnhancedEqualityExpression {
  return new EnhancedEqualityExpression();
}

export function createEnhancedInequalityExpression(): EnhancedInequalityExpression {
  return new EnhancedInequalityExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const comparisonExpressions = {
  greaterThan: createEnhancedGreaterThanExpression(),
  lessThan: createEnhancedLessThanExpression(),
  greaterThanOrEqual: createEnhancedGreaterThanOrEqualExpression(),
  lessThanOrEqual: createEnhancedLessThanOrEqualExpression(),
  equals: createEnhancedEqualityExpression(),
  notEquals: createEnhancedInequalityExpression()
} as const;