/**
 * Enhanced Comparison Expressions - TypeScript Integration
 * Implements comparison operators (==, !=, >, <, >=, <=) with type safety
 */

import { z } from 'zod';
import type {
  BaseTypedExpression,
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  TypedResult,
  LLMDocumentation
} from '../../types/base-types.js';
import type { ExpressionCategory } from '../../types/enhanced-expressions.js';

// ============================================================================
// Input Schemas
// ============================================================================

const ComparisonInputSchema = z.object({
  left: z.unknown().describe('Left operand value'),
  operator: z.enum(['==', '!=', '>', '<', '>=', '<=']).describe('Comparison operator'),
  right: z.unknown().describe('Right operand value')
}).strict();

type ComparisonInput = z.infer<typeof ComparisonInputSchema>;

// ============================================================================
// Enhanced Equals Expression
// ============================================================================

export class EnhancedEqualsExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'equals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left == right';
  public readonly description = 'Equality comparison with type coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '5 == "5"',
        description: 'Type coercion equality',
        expectedOutput: true
      },
      {
        input: 'user.name == "John"',
        description: 'String comparison',
        expectedOutput: true,
        context: { locals: new Map([['user', { name: 'John' }]]) }
      }
    ],
    relatedExpressions: ['notEquals', 'strictEquals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs equality comparison between two values with JavaScript-style type coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['5', '"hello"', 'user.name', 'true']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['"5"', '"hello"', '"John"', 'false']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if operands are equal after type coercion, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Number equality',
        code: '5 == 5',
        explanation: 'Compare two numbers',
        output: 'true'
      },
      {
        title: 'Type coercion',
        code: '5 == "5"',
        explanation: 'String "5" is coerced to number 5',
        output: 'true'
      },
      {
        title: 'String comparison',
        code: '"hello" == "hello"',
        explanation: 'Compare two identical strings',
        output: 'true'
      },
      {
        title: 'Boolean comparison',
        code: 'true == 1',
        explanation: 'Boolean true is coerced to number 1',
        output: 'true'
      }
    ],
    seeAlso: ['!=', '===', 'strictEquals', 'notEquals'],
    tags: ['comparison', 'equality', 'coercion', 'logical']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // JavaScript equality comparison
      const result = input.left == input.right;

      this.trackPerformance(context, startTime, true, result);

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
          message: `Equality comparison failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands are valid values',
          'Check for null or undefined values'
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
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid comparison input: ${err.message}`
          })),
          suggestions: [
            'Provide left and right operands',
            'Use valid comparison operator'
          ]
        };
      }

      // Ensure operator is == for this expression
      if (parsed.data.operator !== '==') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: `Equals expression expects == operator, got ${parsed.data.operator}`
          }],
          suggestions: [
            'Use == for equality comparison',
            'Use appropriate expression for other operators'
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
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'equality comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Not Equals Expression
// ============================================================================

export class EnhancedNotEqualsExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'notEquals';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left != right';
  public readonly description = 'Inequality comparison with type coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '5 != "6"',
        description: 'Type coercion inequality',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['equals', 'strictNotEquals'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs inequality comparison between two values with JavaScript-style type coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['5', '"hello"', 'user.status']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['"6"', '"world"', '"active"']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if operands are not equal after type coercion, false otherwise',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Number inequality',
        code: '5 != 3',
        explanation: 'Compare two different numbers',
        output: 'true'
      },
      {
        title: 'Type coercion',
        code: '5 != "3"',
        explanation: 'String "3" is coerced to number 3',
        output: 'true'
      }
    ],
    seeAlso: ['==', '!==', 'equals'],
    tags: ['comparison', 'inequality', 'coercion', 'logical']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = input.left != input.right;

      this.trackPerformance(context, startTime, true, result);

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
          message: `Inequality comparison failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands are valid values',
          'Check for null or undefined values'
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
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid comparison input: ${err.message}`
          })),
          suggestions: [
            'Provide left and right operands',
            'Use valid comparison operator'
          ]
        };
      }

      if (parsed.data.operator !== '!=') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: `Not equals expression expects != operator, got ${parsed.data.operator}`
          }],
          suggestions: [
            'Use != for inequality comparison'
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
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'inequality comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Greater Than Expression
// ============================================================================

export class EnhancedGreaterThanExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThan';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left > right';
  public readonly description = 'Greater than comparison with numeric coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '10 > 5',
        description: 'Numeric greater than',
        expectedOutput: true
      },
      {
        input: '"b" > "a"',
        description: 'String comparison',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['lessThan', 'greaterThanOrEqual'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs greater than comparison between two values with numeric/string coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['10', '"b"', 'age', 'price']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['5', '"a"', '18', '100']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left operand is greater than right operand',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Number comparison',
        code: '10 > 5',
        explanation: 'Compare two numbers',
        output: 'true'
      },
      {
        title: 'String comparison',
        code: '"banana" > "apple"',
        explanation: 'Lexicographic string comparison',
        output: 'true'
      },
      {
        title: 'Mixed type coercion',
        code: '"10" > 5',
        explanation: 'String "10" coerced to number 10',
        output: 'true'
      }
    ],
    seeAlso: ['<', '>=', '<=', 'lessThan'],
    tags: ['comparison', 'greater', 'numeric', 'logical']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = input.left > input.right;

      this.trackPerformance(context, startTime, true, result);

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
          message: `Greater than comparison failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values'
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
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid comparison input: ${err.message}`
          })),
          suggestions: [
            'Provide left and right operands',
            'Use valid comparison operator'
          ]
        };
      }

      if (parsed.data.operator !== '>') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: `Greater than expression expects > operator, got ${parsed.data.operator}`
          }],
          suggestions: [
            'Use > for greater than comparison'
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
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'greater than comparison',
        output: success ? output : 'error',
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
  public readonly description = 'Less than comparison with numeric coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '5 < 10',
        description: 'Numeric less than',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['greaterThan', 'lessThanOrEqual'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs less than comparison between two values with numeric/string coercion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['5', '"a"', 'age']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['10', '"b"', '65']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left operand is less than right operand',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Number comparison',
        code: '5 < 10',
        explanation: 'Compare two numbers',
        output: 'true'
      },
      {
        title: 'String comparison',
        code: '"apple" < "banana"',
        explanation: 'Lexicographic string comparison',
        output: 'true'
      }
    ],
    seeAlso: ['>', '<=', '>=', 'greaterThan'],
    tags: ['comparison', 'less', 'numeric', 'logical']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = input.left < input.right;

      this.trackPerformance(context, startTime, true, result);

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
          message: `Less than comparison failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values'
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
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid comparison input: ${err.message}`
          })),
          suggestions: [
            'Provide left and right operands'
          ]
        };
      }

      if (parsed.data.operator !== '<') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: `Less than expression expects < operator, got ${parsed.data.operator}`
          }],
          suggestions: [
            'Use < for less than comparison'
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
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'less than comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Greater Than Or Equal Expression
// ============================================================================

export class EnhancedGreaterThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'greaterThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left >= right';
  public readonly description = 'Greater than or equal comparison with numeric coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '10 >= 10',
        description: 'Equal values comparison',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['greaterThan', 'lessThanOrEqual'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs greater than or equal comparison between two values',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['10', 'score']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['10', 'threshold']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left operand is greater than or equal to right operand',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Equal values',
        code: '10 >= 10',
        explanation: 'Equal values return true',
        output: 'true'
      },
      {
        title: 'Greater value',
        code: '15 >= 10',
        explanation: 'Greater value returns true',
        output: 'true'
      }
    ],
    seeAlso: ['>', '<', '<=', 'greaterThan'],
    tags: ['comparison', 'greater-equal', 'numeric', 'logical']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = input.left >= input.right;

      this.trackPerformance(context, startTime, true, result);

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
          message: `Greater than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values'
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
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid comparison input: ${err.message}`
          })),
          suggestions: [
            'Provide left and right operands'
          ]
        };
      }

      if (parsed.data.operator !== '>=') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: `Greater than or equal expression expects >= operator, got ${parsed.data.operator}`
          }],
          suggestions: [
            'Use >= for greater than or equal comparison'
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
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'greater than or equal comparison',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Less Than Or Equal Expression
// ============================================================================

export class EnhancedLessThanOrEqualExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'lessThanOrEqual';
  public readonly category: ExpressionCategory = 'Logical';
  public readonly syntax = 'left <= right';
  public readonly description = 'Less than or equal comparison with numeric coercion';
  public readonly inputSchema = ComparisonInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Logical',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: '5 <= 10',
        description: 'Less than comparison',
        expectedOutput: true
      }
    ],
    relatedExpressions: ['lessThan', 'greaterThanOrEqual'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs less than or equal comparison between two values',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand for comparison',
        optional: false,
        examples: ['5', 'age']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand for comparison',
        optional: false,
        examples: ['10', 'maxAge']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'True if left operand is less than or equal to right operand',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'Less than',
        code: '5 <= 10',
        explanation: 'Less than value returns true',
        output: 'true'
      },
      {
        title: 'Equal values',
        code: '10 <= 10',
        explanation: 'Equal values return true',
        output: 'true'
      }
    ],
    seeAlso: ['<', '>', '>=', 'lessThan'],
    tags: ['comparison', 'less-equal', 'numeric', 'logical']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: ComparisonInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      const result = input.left <= input.right;

      this.trackPerformance(context, startTime, true, result);

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
          message: `Less than or equal comparison failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands can be compared',
          'Check for valid numeric or string values'
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
          errors: parsed.error.errors.map(err => ({
            type: 'type-mismatch',
            message: `Invalid comparison input: ${err.message}`
          })),
          suggestions: [
            'Provide left and right operands'
          ]
        };
      }

      if (parsed.data.operator !== '<=') {
        return {
          isValid: false,
          errors: [{
            type: 'missing-argument',
            message: `Less than or equal expression expects <= operator, got ${parsed.data.operator}`
          }],
          suggestions: [
            'Use <= for less than or equal comparison'
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
          message: 'Validation failed with exception'
        }],
        suggestions: ['Check input structure and types']
      };
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'less than or equal comparison',
        output: success ? output : 'error',
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

export function createEnhancedEqualsExpression(): EnhancedEqualsExpression {
  return new EnhancedEqualsExpression();
}

export function createEnhancedNotEqualsExpression(): EnhancedNotEqualsExpression {
  return new EnhancedNotEqualsExpression();
}

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

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedComparisonExpressions = {
  equals: createEnhancedEqualsExpression(),
  notEquals: createEnhancedNotEqualsExpression(),
  greaterThan: createEnhancedGreaterThanExpression(),
  lessThan: createEnhancedLessThanExpression(),
  greaterThanOrEqual: createEnhancedGreaterThanOrEqualExpression(),
  lessThanOrEqual: createEnhancedLessThanOrEqualExpression()
} as const;