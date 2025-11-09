/**
 * Enhanced Mathematical Expressions - Deep TypeScript Integration
 * Implements arithmetic operations (+, -, *, /, mod) with comprehensive validation
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
  UnifiedExpressionCategory as ExpressionCategory,
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

const BinaryOperationInputSchema = v.object({
  left: v.unknown().describe('Left operand value'),
  right: v.unknown().describe('Right operand value'),
});

type BinaryOperationInput = any; // Inferred from RuntimeValidator

// ============================================================================
// Enhanced Addition Expression
// ============================================================================

export class EnhancedAdditionExpression implements BaseTypedExpression<number> {
  public readonly name = 'addition';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left + right';
  public readonly description = 'Adds two numeric values with type safety and validation';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['number'],
    examples: [
      {
        input: '5 + 3',
        description: 'Add two numbers',
        expectedOutput: 8,
      },
      {
        input: '"10" + "20"',
        description: 'Add numeric strings (auto-converted)',
        expectedOutput: 30,
      },
      {
        input: 'price + tax',
        description: 'Add variables containing numbers',
        expectedOutput: 125.5,
        context: {
          locals: new Map([
            ['price', 100],
            ['tax', 25.5],
          ]),
        },
      },
    ],
    relatedExpressions: ['subtraction', 'multiplication', 'division', 'modulo'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)',
    },
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs mathematical addition of two numeric values with automatic type conversion',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand - number or numeric string',
        optional: false,
        examples: ['5', '"10"', 'price', 'count + 1'],
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand - number or numeric string',
        optional: false,
        examples: ['3', '"20"', 'tax', 'increment'],
      },
    ],
    returns: {
      type: 'number',
      description: 'Sum of left and right operands',
      examples: ['8', '30', '125.50'],
    },
    examples: [
      {
        title: 'Basic addition',
        code: '5 + 3',
        explanation: 'Adds two literal numbers',
        output: '8',
      },
      {
        title: 'String number addition',
        code: '"10" + "5"',
        explanation: 'Automatically converts string numbers and adds them',
        output: '15',
      },
      {
        title: 'Variable addition',
        code: 'basePrice + shipping',
        explanation: 'Adds values from context variables',
        output: '134.99',
      },
      {
        title: 'Complex expression',
        code: '(price * quantity) + tax',
        explanation: 'Addition as part of larger mathematical expression',
        output: '108.50',
      },
    ],
    seeAlso: ['subtraction', 'multiplication', 'division', 'modulo', 'number conversion'],
    tags: ['mathematical', 'arithmetic', 'addition', 'numbers', 'calculation'],
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Convert operands to numbers
      const leftNum = this.toNumber(input.left, 'left operand');
      const rightNum = this.toNumber(input.right, 'right operand');

      // Perform addition
      const result = leftNum + rightNum;

      // Validate result (check for overflow, NaN, etc.)
      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Addition resulted in non-finite value: ${leftNum} + ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: [
            'Check for numeric overflow',
            'Ensure operands are within valid number range',
            'Verify input values are not causing mathematical errors',
          ],
        };
      }

      // Track performance
      this.trackPerformance(context, startTime, true);

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      // Track performance for failed operations
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Addition failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: [
          'Ensure both operands are numeric or convertible to numbers',
          'Check for null or undefined values',
          'Verify operands are within valid ranges',
        ],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      const parsed = this.inputSchema.safeParse(input);

      if (!parsed.success) {
        return {
          isValid: false,
          errors:
            parsed.error?.errors.map(err => ({
              type: 'type-mismatch',
              message: `Invalid addition input: ${err.message}`,
              suggestions: [],
            })) ?? [],
          suggestions: [
            'Provide both left and right operands',
            'Ensure operands are numbers or convertible to numbers',
          ],
        };
      }

      const { left, right } = parsed.data as { left: unknown; right: unknown };

      // Check if operands can be converted to numbers
      if (!this.isNumericValue(left)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: `Left operand cannot be converted to number: ${String(left)}`,
              suggestions: [],
            },
          ],
          suggestions: ['Provide a numeric value or string for left operand'],
        };
      }

      if (!this.isNumericValue(right)) {
        return {
          isValid: false,
          errors: [
            {
              type: 'type-mismatch',
              message: `Right operand cannot be converted to number: ${String(right)}`,
              suggestions: [],
            },
          ],
          suggestions: ['Provide a numeric value or string for right operand'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            type: 'runtime-error',
            message: 'Validation failed with exception',
            suggestions: [],
          },
        ],
        suggestions: ['Check input structure and types'],
      };
    }
  }

  /**
   * Convert value to number with proper error handling
   */
  private toNumber(value: unknown, context: string): number {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`${context} is not a finite number: ${value}`);
      }
      return value;
    }

    if (typeof value === 'string') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        throw new Error(`${context} cannot be converted to number: "${value}"`);
      }
      if (!Number.isFinite(num)) {
        throw new Error(`${context} converts to non-finite number: "${value}" -> ${num}`);
      }
      return num;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    if (value == null) {
      throw new Error(`${context} is null or undefined`);
    }

    throw new Error(`${context} cannot be converted to number: ${typeof value}`);
  }

  /**
   * Check if value can be converted to a number
   */
  private isNumericValue(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    if (typeof value === 'string') {
      const num = Number(value);
      return Number.isFinite(num);
    }

    if (typeof value === 'boolean') {
      return true;
    }

    return false;
  }

  /**
   * Track performance for debugging and optimization
   */
  private trackPerformance(
    context: TypedExpressionContext,
    startTime: number,
    success: boolean
  ): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'binary operation',
        output: success ? 'number' : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success,
      });
    }
  }
}

// ============================================================================
// Enhanced Subtraction Expression
// ============================================================================

export class EnhancedSubtractionExpression implements BaseTypedExpression<number> {
  public readonly name = 'subtraction';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left - right';
  public readonly description = 'Subtracts right operand from left operand with type safety';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['number'],
    examples: [
      {
        input: '10 - 3',
        description: 'Subtract two numbers',
        expectedOutput: 7,
      },
      {
        input: 'total - discount',
        description: 'Calculate final price with discount',
        expectedOutput: 85,
        context: {
          locals: new Map([
            ['total', 100],
            ['discount', 15],
          ]),
        },
      },
    ],
    relatedExpressions: ['addition', 'multiplication', 'division', 'modulo'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)',
    },
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs mathematical subtraction of right operand from left operand',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand (minuend) - number or numeric string',
        optional: false,
        examples: ['10', '"100"', 'total', 'balance'],
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand (subtrahend) - number or numeric string',
        optional: false,
        examples: ['3', '"15"', 'discount', 'deduction'],
      },
    ],
    returns: {
      type: 'number',
      description: 'Difference of left minus right operands',
      examples: ['7', '85', '-5'],
    },
    examples: [
      {
        title: 'Basic subtraction',
        code: '10 - 3',
        explanation: 'Subtracts 3 from 10',
        output: '7',
      },
      {
        title: 'Price calculation',
        code: 'originalPrice - discount',
        explanation: 'Calculate discounted price',
        output: '85',
      },
      {
        title: 'Negative result',
        code: '5 - 8',
        explanation: 'Subtraction can result in negative numbers',
        output: '-3',
      },
    ],
    seeAlso: ['addition', 'multiplication', 'division', 'modulo'],
    tags: ['mathematical', 'arithmetic', 'subtraction', 'numbers', 'calculation'],
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    // Reuse the same logic as addition but with subtraction operation
    const additionExpr = new EnhancedAdditionExpression();

    try {
      // Validate using the same validation logic
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      // Convert and subtract
      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');
      const result = leftNum - rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Subtraction resulted in non-finite value: ${leftNum} - ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow/underflow', 'Verify input ranges'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Subtraction failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric', 'Check for null or undefined values'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    // Reuse addition validation logic
    const additionExpr = new EnhancedAdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Enhanced Multiplication Expression
// ============================================================================

export class EnhancedMultiplicationExpression implements BaseTypedExpression<number> {
  public readonly name = 'multiplication';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left * right';
  public readonly description = 'Multiplies two numeric values with overflow protection';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['number'],
    examples: [
      {
        input: '6 * 7',
        description: 'Multiply two numbers',
        expectedOutput: 42,
      },
      {
        input: 'price * quantity',
        description: 'Calculate total cost',
        expectedOutput: 150,
        context: {
          locals: new Map([
            ['price', 25],
            ['quantity', 6],
          ]),
        },
      },
    ],
    relatedExpressions: ['addition', 'subtraction', 'division', 'modulo'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)',
    },
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs mathematical multiplication of two numeric values',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand (multiplicand) - number or numeric string',
        optional: false,
        examples: ['6', '"25"', 'price', 'rate'],
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand (multiplier) - number or numeric string',
        optional: false,
        examples: ['7', '"6"', 'quantity', 'factor'],
      },
    ],
    returns: {
      type: 'number',
      description: 'Product of left and right operands',
      examples: ['42', '150', '0'],
    },
    examples: [
      {
        title: 'Basic multiplication',
        code: '6 * 7',
        explanation: 'Multiplies 6 by 7',
        output: '42',
      },
      {
        title: 'Price calculation',
        code: 'unitPrice * quantity',
        explanation: 'Calculate total price for multiple items',
        output: '150',
      },
      {
        title: 'Zero result',
        code: '5 * 0',
        explanation: 'Multiplication by zero results in zero',
        output: '0',
      },
    ],
    seeAlso: ['addition', 'subtraction', 'division', 'modulo'],
    tags: ['mathematical', 'arithmetic', 'multiplication', 'numbers', 'calculation'],
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const additionExpr = new EnhancedAdditionExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');
      const result = leftNum * rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Multiplication resulted in non-finite value: ${leftNum} * ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow', 'Verify input ranges'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Multiplication failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const additionExpr = new EnhancedAdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Enhanced Division Expression
// ============================================================================

export class EnhancedDivisionExpression implements BaseTypedExpression<number> {
  public readonly name = 'division';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left / right';
  public readonly description =
    'Divides left operand by right operand with zero-division protection';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['number'],
    examples: [
      {
        input: '15 / 3',
        description: 'Divide two numbers',
        expectedOutput: 5,
      },
      {
        input: 'total / count',
        description: 'Calculate average',
        expectedOutput: 25,
        context: {
          locals: new Map([
            ['total', 100],
            ['count', 4],
          ]),
        },
      },
    ],
    relatedExpressions: ['addition', 'subtraction', 'multiplication', 'modulo'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)',
    },
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs mathematical division with protection against division by zero',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand (dividend) - number or numeric string',
        optional: false,
        examples: ['15', '"100"', 'total', 'numerator'],
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand (divisor) - number or numeric string, must not be zero',
        optional: false,
        examples: ['3', '"4"', 'count', 'denominator'],
      },
    ],
    returns: {
      type: 'number',
      description: 'Quotient of left divided by right operands',
      examples: ['5', '25', '2.5'],
    },
    examples: [
      {
        title: 'Basic division',
        code: '15 / 3',
        explanation: 'Divides 15 by 3',
        output: '5',
      },
      {
        title: 'Average calculation',
        code: 'totalScore / numberOfTests',
        explanation: 'Calculate average score',
        output: '87.5',
      },
      {
        title: 'Decimal result',
        code: '10 / 4',
        explanation: 'Division can result in decimal numbers',
        output: '2.5',
      },
    ],
    seeAlso: ['addition', 'subtraction', 'multiplication', 'modulo'],
    tags: ['mathematical', 'arithmetic', 'division', 'numbers', 'calculation'],
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const additionExpr = new EnhancedAdditionExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');

      // Check for division by zero
      if (rightNum === 0) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: 'Division by zero is not allowed',
              suggestions: [],
            },
          ],
          suggestions: [
            'Ensure the divisor (right operand) is not zero',
            'Add a condition to check for zero before division',
            'Use a default value when divisor might be zero',
          ],
        };
      }

      const result = leftNum / rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Division resulted in non-finite value: ${leftNum} / ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow/underflow'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Division failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric and divisor is not zero'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const additionExpr = new EnhancedAdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Enhanced Modulo Expression
// ============================================================================

export class EnhancedModuloExpression implements BaseTypedExpression<number> {
  public readonly name = 'modulo';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left mod right';
  public readonly description = 'Calculates remainder of division with comprehensive validation';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['number'],
    examples: [
      {
        input: '10 mod 3',
        description: 'Calculate remainder of 10 divided by 3',
        expectedOutput: 1,
      },
      {
        input: 'index mod batchSize',
        description: 'Check if index is at batch boundary',
        expectedOutput: 2,
        context: {
          locals: new Map([
            ['index', 17],
            ['batchSize', 5],
          ]),
        },
      },
    ],
    relatedExpressions: ['addition', 'subtraction', 'multiplication', 'division'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)',
    },
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Calculates the remainder after division (modulo operation)',
    parameters: [
      {
        name: 'left',
        type: 'number',
        description: 'Left operand (dividend) - number or numeric string',
        optional: false,
        examples: ['10', '"17"', 'index', 'value'],
      },
      {
        name: 'right',
        type: 'number',
        description: 'Right operand (divisor) - number or numeric string, must not be zero',
        optional: false,
        examples: ['3', '"5"', 'batchSize', 'modulus'],
      },
    ],
    returns: {
      type: 'number',
      description: 'Remainder of left divided by right operands',
      examples: ['1', '2', '0'],
    },
    examples: [
      {
        title: 'Basic modulo',
        code: '10 mod 3',
        explanation: 'Calculate remainder: 10 ÷ 3 = 3 remainder 1',
        output: '1',
      },
      {
        title: 'Even/odd check',
        code: 'number mod 2',
        explanation: 'Check if number is even (remainder 0) or odd (remainder 1)',
        output: '1',
      },
      {
        title: 'Batch processing',
        code: 'index mod batchSize',
        explanation: 'Determine position within current batch',
        output: '2',
      },
    ],
    seeAlso: ['addition', 'subtraction', 'multiplication', 'division'],
    tags: ['mathematical', 'arithmetic', 'modulo', 'remainder', 'calculation'],
  };

  async evaluate(
    _context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const additionExpr = new EnhancedAdditionExpression();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions,
        };
      }

      const leftNum = additionExpr['toNumber'](input.left, 'left operand');
      const rightNum = additionExpr['toNumber'](input.right, 'right operand');

      // Check for modulo by zero
      if (rightNum === 0) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: 'Modulo by zero is not allowed',
              suggestions: [],
            },
          ],
          suggestions: [
            'Ensure the divisor (right operand) is not zero',
            'Add a condition to check for zero before modulo operation',
          ],
        };
      }

      const result = leftNum % rightNum;

      if (!Number.isFinite(result)) {
        return {
          success: false,
          errors: [
            {
              type: 'runtime-error',
              message: `Modulo resulted in non-finite value: ${leftNum} % ${rightNum} = ${result}`,
              suggestions: [],
            },
          ],
          suggestions: ['Check for numeric overflow issues'],
        };
      }

      return {
        success: true,
        value: result,
        type: 'number',
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            type: 'runtime-error',
            message: `Modulo failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestions: [],
          },
        ],
        suggestions: ['Ensure both operands are numeric and divisor is not zero'],
      };
    }
  }

  validate(input: unknown): ValidationResult {
    const additionExpr = new EnhancedAdditionExpression();
    return additionExpr.validate(input);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createEnhancedAdditionExpression(): EnhancedAdditionExpression {
  return new EnhancedAdditionExpression();
}

export function createEnhancedSubtractionExpression(): EnhancedSubtractionExpression {
  return new EnhancedSubtractionExpression();
}

export function createEnhancedMultiplicationExpression(): EnhancedMultiplicationExpression {
  return new EnhancedMultiplicationExpression();
}

export function createEnhancedDivisionExpression(): EnhancedDivisionExpression {
  return new EnhancedDivisionExpression();
}

export function createEnhancedModuloExpression(): EnhancedModuloExpression {
  return new EnhancedModuloExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const mathematicalExpressions = {
  addition: createEnhancedAdditionExpression(),
  subtraction: createEnhancedSubtractionExpression(),
  multiplication: createEnhancedMultiplicationExpression(),
  division: createEnhancedDivisionExpression(),
  modulo: createEnhancedModuloExpression(),
} as const;
