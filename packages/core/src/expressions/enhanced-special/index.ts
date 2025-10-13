
// Missing number validator - add to lightweight-validators.ts if needed
const createNumberValidator = () => v.string({ pattern: /^\d+$/ });

/**
 * Enhanced Special Expressions for HyperScript
 * Provides deep TypeScript integration for literals and mathematical operations
 */

import { v, z, type RuntimeValidator } from '../../validation/lightweight-validators';
import type { 
  BaseTypedExpression,
  TypedExpressionContext,
  EvaluationType,
  ExpressionMetadata,
  ValidationResult,
  TypedResult,
  LLMDocumentation
} from '../../types/base-types';
import type { ExpressionCategory } from '../../types/enhanced-expressions';

// ============================================================================
// Input Schemas
// ============================================================================

const StringLiteralInputSchema = v.object({
  value: v.string().describe('String literal value')
}).strict();

const NumberLiteralInputSchema = v.object({
  value: v.number().describe('Number literal value')
}).strict();

const BooleanLiteralInputSchema = v.object({
  value: v.boolean().describe('Boolean literal value')
}).strict();

const ArrayLiteralInputSchema = v.object({
  elements: v.array(v.unknown()).describe('Array elements')
}).strict();

const ObjectLiteralInputSchema = v.object({
  properties: z.record(v.string(), v.unknown()).describe('Object properties')
}).strict();

const BinaryOperationInputSchema = v.object({
  left: v.unknown().describe('Left operand'),
  right: v.unknown().describe('Right operand')
}).strict();

const UnaryOperationInputSchema = v.object({
  operand: v.unknown().describe('Operand for unary operation')
}).strict();

type StringLiteralInput = z.infer<typeof StringLiteralInputSchema>;
type NumberLiteralInput = z.infer<typeof NumberLiteralInputSchema>;
type BooleanLiteralInput = z.infer<typeof BooleanLiteralInputSchema>;
type BinaryOperationInput = z.infer<typeof BinaryOperationInputSchema>;

// ============================================================================
// Enhanced String Literal Expression
// ============================================================================

export class EnhancedStringLiteralExpression implements BaseTypedExpression<string> {
  public readonly name = 'stringLiteral';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = '"string" or \'string\'';
  public readonly outputType: EvaluationType = 'String';
  public readonly inputSchema = StringLiteralInputSchema;

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['String'],
    examples: [
      {
        input: '"hello world"',
        description: 'Simple string literal',
        expectedOutput: 'hello world'
      },
      {
        input: '"Hello ${name}!"',
        description: 'Template string with interpolation',
        expectedOutput: 'Hello John!'
      }
    ],
    relatedExpressions: ['numberLiteral', 'booleanLiteral'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(n)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates string literals with optional template interpolation support',
    parameters: [
      {
        name: 'value',
        type: 'string',
        description: 'The string literal value',
        optional: false,
        examples: ['"hello"', '"world"', '"Hello ${name}!"', '"Value: ${count}"']
      }
    ],
    returns: {
      type: 'string',
      description: 'The string value, with any template interpolation resolved',
      examples: ['"hello"', '"Hello John!"', '"Value: 42"']
    },
    examples: [
      {
        title: 'Simple string',
        code: '"hello world"',
        explanation: 'Create a simple string literal',
        output: '"hello world"'
      },
      {
        title: 'Template interpolation',
        code: '"Hello ${user.name}!"',
        explanation: 'String with variable interpolation',
        output: '"Hello John!"'
      },
      {
        title: 'Numeric interpolation',
        code: '"Count: ${items.length}"',
        explanation: 'String with numeric value interpolation',
        output: '"Count: 5"'
      }
    ],
    seeAlso: ['numberLiteral', 'booleanLiteral', 'objectLiteral'],
    tags: ['literal', 'string', 'template', 'interpolation']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: StringLiteralInput
  ): Promise<TypedResult<string>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      let result = input.value;

      // Handle template interpolation if present
      if (result.includes('${') || result.includes('$')) {
        result = this.interpolateString(result, context);
      }

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'string'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `String literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Check template syntax for interpolation',
          'Ensure referenced variables exist in context'
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
            message: `Invalid string literal input: ${err.message}`,
            suggestions: []
          })),
          suggestions: [
            'Provide a value parameter',
            'Ensure value is a string'
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

  private interpolateString(template: string, context: TypedExpressionContext): string {
    // Handle ${expression} interpolation
    let result = template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
      try {
        const value = this.resolveExpression(expression.trim(), context);
        return value !== undefined ? String(value) : '';
      } catch (error) {
        return '';
      }
    });

    // Handle $variable interpolation
    result = result.replace(/\$([a-zA-Z_$][a-zA-Z0-9_.$]*)/g, (match, varName) => {
      try {
        const value = this.resolveVariable(varName, context);
        return value !== undefined ? String(value) : '';
      } catch (error) {
        return '';
      }
    });

    return result;
  }

  private resolveExpression(expression: string, context: TypedExpressionContext): unknown {
    // Simple expression resolution - for now handle basic property access
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let value = this.resolveVariable(parts[0], context);
      
      for (let i = 1; i < parts.length && value != null; i++) {
        value = (value as any)[parts[i]];
      }
      
      return value;
    }
    
    return this.resolveVariable(expression, context);
  }

  private resolveVariable(varName: string, context: TypedExpressionContext): unknown {
    // Check context properties
    if (varName === 'me' && context.me) return context.me;
    if (varName === 'you' && context.you) return context.you;
    if (varName === 'it' && context.it) return context.it;
    if (varName === 'result' && context.result) return context.result;
    
    // Check locals
    if (context.locals?.has(varName)) {
      return context.locals.get(varName);
    }
    
    // Check globals
    if (context.globals?.has(varName)) {
      return context.globals.get(varName);
    }
    
    return undefined;
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'string literal',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Number Literal Expression
// ============================================================================

export class EnhancedNumberLiteralExpression implements BaseTypedExpression<number> {
  public readonly name = 'numberLiteral';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = '123 or 3.14';
  public readonly description = 'Numeric literal with validation';
  public readonly inputSchema = NumberLiteralInputSchema;
  public readonly outputType: EvaluationType = 'Number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Number'],
    examples: [
      {
        input: '42',
        description: 'Integer literal',
        expectedOutput: 42
      },
      {
        input: '3.14159',
        description: 'Decimal literal',
        expectedOutput: 3.14159
      }
    ],
    relatedExpressions: ['stringLiteral', 'booleanLiteral'],
    performance: {
      averageTime: 0.05,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates numeric literals with validation for finite numbers',
    parameters: [
      {
        name: 'value',
        type: 'number',
        description: 'The numeric literal value',
        optional: false,
        examples: ['42', '3.14', '-17', '0']
      }
    ],
    returns: {
      type: 'number',
      description: 'The numeric value',
      examples: ['42', '3.14', '-17', '0']
    },
    examples: [
      {
        title: 'Integer literal',
        code: '42',
        explanation: 'Create an integer literal',
        output: '42'
      },
      {
        title: 'Decimal literal',
        code: '3.14159',
        explanation: 'Create a decimal literal',
        output: '3.14159'
      },
      {
        title: 'Negative number',
        code: '-17',
        explanation: 'Create a negative number literal',
        output: '-17'
      }
    ],
    seeAlso: ['stringLiteral', 'addition', 'multiplication'],
    tags: ['literal', 'number', 'numeric', 'integer', 'decimal']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: NumberLiteralInput
  ): Promise<TypedResult<number>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      if (!isFinite(input.value)) {
        return {
          success: false,
          errors: [{
            type: 'invalid-argument',
            message: 'Number literal must be finite'
          }],
          suggestions: [
            'Use finite numbers only',
            'Avoid Infinity and NaN values'
          ]
        };
      }

      this.trackPerformance(context, startTime, true, input.value);

      return {
        success: true,
        value: input.value,
        type: 'number'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Number literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure value is a valid number',
          'Check for numeric overflow'
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
            message: `Invalid number literal input: ${err.message}`,
            suggestions: []
          })),
          suggestions: [
            'Provide a value parameter',
            'Ensure value is a number'
          ]
        };
      }

      if (!isFinite(parsed.data.value)) {
        return {
          isValid: false,
          errors: [{
            type: 'invalid-argument',
            message: 'Number literal value must be finite'
          }],
          suggestions: [
            'Use finite numbers only',
            'Avoid Infinity and NaN values'
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
        input: 'number literal',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Boolean Literal Expression
// ============================================================================

export class EnhancedBooleanLiteralExpression implements BaseTypedExpression<boolean> {
  public readonly name = 'booleanLiteral';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'true or false';
  public readonly description = 'Boolean literal values';
  public readonly inputSchema = BooleanLiteralInputSchema;
  public readonly outputType: EvaluationType = 'Boolean';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Boolean'],
    examples: [
      {
        input: 'true',
        description: 'True boolean literal',
        expectedOutput: true
      },
      {
        input: 'false',
        description: 'False boolean literal',
        expectedOutput: false
      }
    ],
    relatedExpressions: ['stringLiteral', 'numberLiteral'],
    performance: {
      averageTime: 0.05,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates boolean literal values (true or false)',
    parameters: [
      {
        name: 'value',
        type: 'boolean',
        description: 'The boolean literal value',
        optional: false,
        examples: ['true', 'false']
      }
    ],
    returns: {
      type: 'boolean',
      description: 'The boolean value',
      examples: ['true', 'false']
    },
    examples: [
      {
        title: 'True literal',
        code: 'true',
        explanation: 'Create a true boolean literal',
        output: 'true'
      },
      {
        title: 'False literal',
        code: 'false',
        explanation: 'Create a false boolean literal',
        output: 'false'
      }
    ],
    seeAlso: ['and', 'or', 'not', 'equals'],
    tags: ['literal', 'boolean', 'true', 'false', 'logic']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BooleanLiteralInput
  ): Promise<TypedResult<boolean>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      this.trackPerformance(context, startTime, true, input.value);

      return {
        success: true,
        value: input.value,
        type: 'boolean'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Boolean literal evaluation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure value is a valid boolean'
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
            message: `Invalid boolean literal input: ${err.message}`,
            suggestions: []
          })),
          suggestions: [
            'Provide a value parameter',
            'Ensure value is a boolean'
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
        input: 'boolean literal',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Addition Expression
// ============================================================================

export class EnhancedAdditionExpression implements BaseTypedExpression<number> {
  public readonly name = 'addition';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left + right';
  public readonly description = 'Addition of two numeric values';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'Number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Number'],
    examples: [
      {
        input: '5 + 3',
        description: 'Add two numbers',
        expectedOutput: 8
      },
      {
        input: 'age + 1',
        description: 'Add variable and literal',
        expectedOutput: 31,
        context: { locals: new Map([['age', 30]]) }
      }
    ],
    relatedExpressions: ['subtraction', 'multiplication', 'division'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs addition of two numeric values with automatic type conversion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand (converted to number)',
        optional: false,
        examples: ['5', 'age', '"10"', 'true']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand (converted to number)',
        optional: false,
        examples: ['3', '1', '"5"', 'false']
      }
    ],
    returns: {
      type: 'number',
      description: 'Sum of the two operands',
      examples: ['8', '31', '15']
    },
    examples: [
      {
        title: 'Integer addition',
        code: '5 + 3',
        explanation: 'Add two integers',
        output: '8'
      },
      {
        title: 'Decimal addition',
        code: '3.14 + 2.86',
        explanation: 'Add two decimal numbers',
        output: '6'
      },
      {
        title: 'Mixed types',
        code: '5 + "3"',
        explanation: 'Add number and string (converted to number)',
        output: '8'
      }
    ],
    seeAlso: ['-', '*', '/', 'mod'],
    tags: ['arithmetic', 'addition', 'math', 'binary', 'operator']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      const leftNum = this.ensureNumber(input.left, 'Left operand');
      const rightNum = this.ensureNumber(input.right, 'Right operand');
      
      const result = leftNum + rightNum;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'number'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Addition failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands can be converted to numbers',
          'Check for valid numeric values'
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
            message: `Invalid addition input: ${err.message}`,
            suggestions: []
          })),
          suggestions: [
            'Provide left and right operands'
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

  private ensureNumber(value: unknown, context: string): number {
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        throw new Error(`${context} must be a finite number`);
      }
      return value;
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error(`${context} cannot be converted to number: "${value}"`);
      }
      return num;
    }
    
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    if (value === null || value === undefined) {
      return 0;
    }
    
    throw new Error(`${context} cannot be converted to number`);
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'addition operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced String Concatenation Expression
// ============================================================================

export class EnhancedStringConcatenationExpression implements BaseTypedExpression<string> {
  public readonly name = 'stringConcatenation';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left + right (string concatenation)';
  public readonly description = 'Concatenation of two values into a string';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'String';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['String'],
    examples: [
      {
        input: '"Hello " + "World"',
        description: 'Concatenate two strings',
        expectedOutput: 'Hello World'
      },
      {
        input: '"Count: " + 42',
        description: 'Concatenate string and number',
        expectedOutput: 'Count: 42'
      },
      {
        input: '"Time: " + (new Date()).toLocaleTimeString()',
        description: 'Concatenate string and function result',
        expectedOutput: 'Time: 3:45:30 PM'
      }
    ],
    relatedExpressions: ['stringLiteral', 'addition'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(n)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs string concatenation of two values by converting them to strings',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand (converted to string)',
        optional: false,
        examples: ['"Hello"', '42', 'true', 'new Date()']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand (converted to string)',
        optional: false,
        examples: ['"World"', '123', 'false', 'variable']
      }
    ],
    returnValue: {
      type: 'string',
      description: 'Concatenated string result',
      examples: ['"Hello World"', '"Count: 42"', '"Time: 3:45:30 PM"']
    },
    examples: [
      {
        title: 'Basic string concatenation',
        code: '"Hello " + "World"',
        explanation: 'Concatenate two string literals',
        output: '"Hello World"'
      },
      {
        title: 'String and number',
        code: '"Count: " + count',
        explanation: 'Concatenate string with variable',
        output: '"Count: 5"'
      },
      {
        title: 'Function result concatenation',
        code: '"Time: " + (new Date()).toLocaleTimeString()',
        explanation: 'Concatenate string with function call result',
        output: '"Time: 3:45:30 PM"'
      }
    ],
    seeAlso: ['stringLiteral', 'addition', 'templateString'],
    tags: ['string', 'concatenation', 'join', 'binary', 'operator']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<string>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validation.errors[0]?.message || 'Invalid input',
            code: 'STRING_CONCATENATION_VALIDATION_FAILED',
            suggestions: validation.suggestions
          },
          type: 'error'
        };
      }

      // Convert both operands to strings
      const leftStr = this.convertToString(input.left);
      const rightStr = this.convertToString(input.right);
      
      const result = leftStr + rightStr;
      
      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'string'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);
      
      return {
        success: false,
        error: {
          name: 'StringConcatenationError',
          message: error instanceof Error ? error.message : 'String concatenation failed',
          code: 'STRING_CONCATENATION_ERROR',
          suggestions: ['Check that operands can be converted to strings']
        },
        type: 'error'
      };
    }
  }

  validate(input: unknown): ValidationResult<BinaryOperationInput> {
    const parsed = BinaryOperationInputSchema.safeParse(input);
    
    if (!parsed.success) {
      return {
        isValid: false,
        errors: parsed.error.errors.map(err => ({
          type: 'type-mismatch',
          message: `Invalid string concatenation input: ${err.message}`,
          suggestions: []
        })),
        suggestions: [
          'Provide left and right operands for concatenation'
        ]
      };
    }

    return {
      isValid: true,
      errors: [],
      suggestions: [],
      data: parsed.data
    };
  }

  private convertToString(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (value instanceof Date) return value.toString();
    
    try {
      return String(value);
    } catch {
      return '[object Object]';
    }
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'string concatenation operation',
        output: success ? output : 'error',
        timestamp: startTime,
        duration: Date.now() - startTime,
        success
      });
    }
  }
}

// ============================================================================
// Enhanced Multiplication Expression
// ============================================================================

export class EnhancedMultiplicationExpression implements BaseTypedExpression<number> {
  public readonly name = 'multiplication';
  public readonly category: ExpressionCategory = 'Special';
  public readonly syntax = 'left * right';
  public readonly description = 'Multiplication of two numeric values';
  public readonly inputSchema = BinaryOperationInputSchema;
  public readonly outputType: EvaluationType = 'Number';

  public readonly metadata: ExpressionMetadata = {
    category: 'Special',
    complexity: 'simple',
    sideEffects: [],
    dependencies: [],
    returnTypes: ['Number'],
    examples: [
      {
        input: '5 * 3',
        description: 'Multiply two numbers',
        expectedOutput: 15
      },
      {
        input: 'width * height',
        description: 'Multiply variables',
        expectedOutput: 100,
        context: { locals: new Map([['width', 10], ['height', 10]]) }
      }
    ],
    relatedExpressions: ['addition', 'subtraction', 'division'],
    performance: {
      averageTime: 0.1,
      complexity: 'O(1)'
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Performs multiplication of two numeric values with automatic type conversion',
    parameters: [
      {
        name: 'left',
        type: 'any',
        description: 'Left operand (converted to number)',
        optional: false,
        examples: ['5', 'width', '"10"', 'true']
      },
      {
        name: 'right',
        type: 'any',
        description: 'Right operand (converted to number)',
        optional: false,
        examples: ['3', 'height', '"5"', 'false']
      }
    ],
    returns: {
      type: 'number',
      description: 'Product of the two operands',
      examples: ['15', '100', '50']
    },
    examples: [
      {
        title: 'Integer multiplication',
        code: '5 * 3',
        explanation: 'Multiply two integers',
        output: '15'
      },
      {
        title: 'Decimal multiplication',
        code: '3.14 * 2',
        explanation: 'Multiply decimal and integer',
        output: '6.28'
      },
      {
        title: 'Boolean multiplication',
        code: '5 * true',
        explanation: 'Multiply number and boolean (true = 1)',
        output: '5'
      }
    ],
    seeAlso: ['+', '-', '/', 'mod', '^'],
    tags: ['arithmetic', 'multiplication', 'math', 'binary', 'operator']
  };

  async evaluate(
    context: TypedExpressionContext,
    input: BinaryOperationInput
  ): Promise<TypedResult<number>> {
    const startTime = Date.now();

    try {
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            name: 'ValidationError',
            message: validation.errors.map(e => e.message).join(', '),
            code: 'VALIDATION_FAILED',
            suggestions: validation.suggestions
          }
        };
      }

      const leftNum = this.ensureNumber(input.left, 'Left operand');
      const rightNum = this.ensureNumber(input.right, 'Right operand');
      
      const result = leftNum * rightNum;

      this.trackPerformance(context, startTime, true, result);

      return {
        success: true,
        value: result,
        type: 'number'
      };

    } catch (error) {
      this.trackPerformance(context, startTime, false);

      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Multiplication failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Ensure operands can be converted to numbers',
          'Check for valid numeric values'
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
            message: `Invalid multiplication input: ${err.message}`,
            suggestions: []
          })),
          suggestions: [
            'Provide left and right operands'
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

  private ensureNumber(value: unknown, context: string): number {
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        throw new Error(`${context} must be a finite number`);
      }
      return value;
    }
    
    if (typeof value === 'string') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        throw new Error(`${context} cannot be converted to number: "${value}"`);
      }
      return num;
    }
    
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    
    if (value === null || value === undefined) {
      return 0;
    }
    
    throw new Error(`${context} cannot be converted to number`);
  }

  private trackPerformance(context: TypedExpressionContext, startTime: number, success: boolean, output?: any): void {
    if (context.evaluationHistory) {
      context.evaluationHistory.push({
        expressionName: this.name,
        category: this.category,
        input: 'multiplication operation',
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

export function createEnhancedStringLiteralExpression(): EnhancedStringLiteralExpression {
  return new EnhancedStringLiteralExpression();
}

export function createEnhancedNumberLiteralExpression(): EnhancedNumberLiteralExpression {
  return new EnhancedNumberLiteralExpression();
}

export function createEnhancedBooleanLiteralExpression(): EnhancedBooleanLiteralExpression {
  return new EnhancedBooleanLiteralExpression();
}

export function createEnhancedAdditionExpression(): EnhancedAdditionExpression {
  return new EnhancedAdditionExpression();
}

export function createEnhancedStringConcatenationExpression(): EnhancedStringConcatenationExpression {
  return new EnhancedStringConcatenationExpression();
}

export function createEnhancedMultiplicationExpression(): EnhancedMultiplicationExpression {
  return new EnhancedMultiplicationExpression();
}

// ============================================================================
// Expression Registry
// ============================================================================

export const enhancedSpecialExpressions = {
  stringLiteral: createEnhancedStringLiteralExpression(),
  numberLiteral: createEnhancedNumberLiteralExpression(),
  booleanLiteral: createEnhancedBooleanLiteralExpression(),
  addition: createEnhancedAdditionExpression(),
  stringConcatenation: createEnhancedStringConcatenationExpression(),
  multiplication: createEnhancedMultiplicationExpression()
} as const;

// Legacy export for compatibility with expression-evaluator
export const specialExpressions = enhancedSpecialExpressions;

export type EnhancedSpecialExpressionName = keyof typeof enhancedSpecialExpressions;