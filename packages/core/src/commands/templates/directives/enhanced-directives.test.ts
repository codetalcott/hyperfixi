/**
 * Enhanced Template Directives Test Suite
 * Comprehensive tests for @if, @else, and @repeat directives with enhanced typing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { TemplateExecutionContext } from '../../../types/template-types.ts';
import type { HyperScriptValue } from '../../../types/enhanced-expressions.ts';
import { EnhancedIfDirective } from './enhanced-if.ts';
import { EnhancedElseDirective } from './enhanced-else.ts';
import { EnhancedRepeatDirective } from './enhanced-repeat.ts';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestContext(overrides: Partial<TemplateExecutionContext> = {}): TemplateExecutionContext {
  return {
    me: undefined,
    it: undefined,
    you: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    event: undefined,
    
    // Enhanced expression context properties
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: 'strict',
    evaluationHistory: [],
    
    // Template-specific properties
    templateBuffer: [],
    templateDepth: 0,
    iterationContext: undefined,
    conditionalContext: undefined,
    
    templateMeta: {
      templateName: 'test-template',
      compiledAt: Date.now(),
      executionStartTime: Date.now(),
      directiveStack: []
    },
    
    ...overrides
  };
}

// ============================================================================
// @if Directive Tests
// ============================================================================

describe('EnhancedIfDirective', () => {
  let ifDirective: EnhancedIfDirective;
  let context: TemplateExecutionContext;

  beforeEach(() => {
    ifDirective = new EnhancedIfDirective();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should render content when condition is true', async () => {
      const input = {
        condition: true,
        templateContent: 'Hello World!'
      };

      const result = await ifDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello World!');
      expect(result.type).toBe('string');
    });

    it('should not render content when condition is false', async () => {
      const input = {
        condition: false,
        templateContent: 'Hidden content'
      };

      const result = await ifDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('');
      expect(result.type).toBe('string');
    });

    it('should handle truthy values', async () => {
      const testCases = [
        { condition: 'non-empty string', expected: true },
        { condition: 42, expected: true },
        { condition: [1, 2, 3], expected: true },
        { condition: { key: 'value' }, expected: true }
      ];

      for (const testCase of testCases) {
        const input = {
          condition: testCase.condition,
          templateContent: 'Content'
        };

        const result = await ifDirective.executeTemplate(context, input, input.templateContent);
        
        expect(result.success).toBe(true);
        if (testCase.expected) {
          expect(result.value).toBe('Content');
        } else {
          expect(result.value).toBe('');
        }
      }
    });

    it('should handle falsy values', async () => {
      const testCases = [
        { condition: '', expected: false },
        { condition: 0, expected: false },
        { condition: null, expected: false },
        { condition: undefined, expected: false },
        { condition: [], expected: false },
        { condition: {}, expected: false }
      ];

      for (const testCase of testCases) {
        const input = {
          condition: testCase.condition,
          templateContent: 'Content'
        };

        const result = await ifDirective.executeTemplate(context, input, input.templateContent);
        
        expect(result.success).toBe(true);
        expect(result.value).toBe('');
      }
    });
  });

  describe('Template interpolation', () => {
    it('should interpolate variables in template content', async () => {
      const testContext = createTestContext({
        locals: new Map([
          ['name', 'Alice'],
          ['age', 30]
        ])
      });

      const input = {
        condition: true,
        templateContent: 'Hello ${name}, you are ${age} years old!'
      };

      const result = await ifDirective.executeTemplate(testContext, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Hello Alice, you are 30 years old!');
    });

    it('should handle property access in interpolation', async () => {
      const testContext = createTestContext({
        locals: new Map([
          ['user', { name: 'Bob', profile: { email: 'bob@example.com' } }]
        ])
      });

      const input = {
        condition: true,
        templateContent: 'User: ${user.name}, Email: ${user.profile.email}'
      };

      const result = await ifDirective.executeTemplate(testContext, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('User: Bob, Email: bob@example.com');
    });

    it('should handle array length in interpolation', async () => {
      const testContext = createTestContext({
        locals: new Map([
          ['items', ['a', 'b', 'c']]
        ])
      });

      const input = {
        condition: true,
        templateContent: 'You have ${items.length} items'
      };

      const result = await ifDirective.executeTemplate(testContext, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('You have 3 items');
    });
  });

  describe('Validation', () => {
    it('should validate input schema', async () => {
      const invalidInput = {
        condition: true
        // missing templateContent
      };

      const result = await ifDirective.executeTemplate(context, invalidInput as any, '');

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('IfDirectiveValidationError');
      expect(result.error?.code).toBe('IF_VALIDATION_FAILED');
    });

    it('should reject empty template content', async () => {
      const input = {
        condition: true,
        templateContent: '   '
      };

      const result = await ifDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Template content cannot be empty');
    });

    it('should validate template context', async () => {
      const invalidContext = createTestContext({
        templateBuffer: null as any
      });

      const input = {
        condition: true,
        templateContent: 'Content'
      };

      const result = await ifDirective.executeTemplate(invalidContext, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('IfDirectiveContextError');
    });
  });

  describe('Conditional context creation', () => {
    it('should create proper conditional context when condition is true', async () => {
      const input = {
        condition: true,
        templateContent: 'Content'
      };

      const result = await ifDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      // We can't directly access the internal context, but we can verify the behavior
      expect(result.value).toBe('Content');
    });

    it('should create proper conditional context when condition is false', async () => {
      const input = {
        condition: false,
        templateContent: 'Content'
      };

      const result = await ifDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('');
    });
  });
});

// ============================================================================
// @else Directive Tests
// ============================================================================

describe('EnhancedElseDirective', () => {
  let elseDirective: EnhancedElseDirective;
  let context: TemplateExecutionContext;

  beforeEach(() => {
    elseDirective = new EnhancedElseDirective();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should render content when in proper conditional context with false condition', async () => {
      const contextWithFalseCondition = createTestContext({
        conditionalContext: {
          conditionMet: false,
          elseAllowed: true,
          branchExecuted: false
        }
      });

      const input = {
        templateContent: 'Else content'
      };

      const result = await elseDirective.executeTemplate(contextWithFalseCondition, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Else content');
    });

    it('should not render content when condition was true', async () => {
      const contextWithTrueCondition = createTestContext({
        conditionalContext: {
          conditionMet: true,
          elseAllowed: false,
          branchExecuted: true
        }
      });

      const input = {
        templateContent: 'Else content'
      };

      const result = await elseDirective.executeTemplate(contextWithTrueCondition, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('');
    });

    it('should not render content when branch already executed', async () => {
      const contextWithExecutedBranch = createTestContext({
        conditionalContext: {
          conditionMet: false,
          elseAllowed: true,
          branchExecuted: true
        }
      });

      const input = {
        templateContent: 'Else content'
      };

      const result = await elseDirective.executeTemplate(contextWithExecutedBranch, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('');
    });
  });

  describe('Template interpolation', () => {
    it('should interpolate variables in else content', async () => {
      const contextWithFalseCondition = createTestContext({
        conditionalContext: {
          conditionMet: false,
          elseAllowed: true,
          branchExecuted: false
        },
        locals: new Map([
          ['fallbackMessage', 'Please try again']
        ])
      });

      const input = {
        templateContent: 'Error: ${fallbackMessage}'
      };

      const result = await elseDirective.executeTemplate(contextWithFalseCondition, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Error: Please try again');
    });
  });

  describe('Validation', () => {
    it('should require conditional context', async () => {
      const contextWithoutConditional = createTestContext({
        conditionalContext: undefined
      });

      const input = {
        templateContent: 'Else content'
      };

      const result = await elseDirective.executeTemplate(contextWithoutConditional, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('requires preceding @if directive');
    });

    it('should reject empty template content', async () => {
      const input = {
        templateContent: '   '
      };

      const result = await elseDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Template content cannot be empty');
    });
  });
});

// ============================================================================
// @repeat Directive Tests
// ============================================================================

describe('EnhancedRepeatDirective', () => {
  let repeatDirective: EnhancedRepeatDirective;
  let context: TemplateExecutionContext;

  beforeEach(() => {
    repeatDirective = new EnhancedRepeatDirective();
    context = createTestContext();
  });

  describe('Basic functionality', () => {
    it('should iterate over array and render content for each item', async () => {
      const input = {
        collection: ['apple', 'banana', 'cherry'],
        templateContent: '${it}, '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('apple, banana, cherry, ');
    });

    it('should handle empty collections', async () => {
      const input = {
        collection: [],
        templateContent: '${it}'
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('');
    });

    it('should iterate over object collections', async () => {
      const input = {
        collection: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ],
        templateContent: '${it.name}(${it.age}), '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Alice(30), Bob(25), ');
    });
  });

  describe('Iteration context', () => {
    it('should provide iteration variables', async () => {
      const input = {
        collection: ['a', 'b', 'c'],
        templateContent: '${index}: ${it} (first: ${first}, last: ${last}), '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('0: a (first: true, last: false), 1: b (first: false, last: false), 2: c (first: false, last: true), ');
    });

    it('should provide collection length', async () => {
      const input = {
        collection: ['x', 'y'],
        templateContent: '${it} (${index + 1}/${length}), '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('x (1/2), y (2/2), ');
    });

    it('should handle custom iterator variable', async () => {
      const input = {
        collection: ['red', 'green', 'blue'],
        iteratorVariable: 'color',
        templateContent: 'Color: ${color}, '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('Color: red, Color: green, Color: blue, ');
    });
  });

  describe('Collection validation', () => {
    it('should handle array-like objects', async () => {
      const arrayLike = {
        0: 'first',
        1: 'second',
        length: 2
      };

      const input = {
        collection: arrayLike,
        templateContent: '${it}, '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('first, second, ');
    });

    it('should reject null/undefined collections', async () => {
      const input = {
        collection: null,
        templateContent: '${it}'
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('null or undefined');
    });

    it('should reject non-iterable collections', async () => {
      const input = {
        collection: 'not-iterable',
        templateContent: '${it}'
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not iterable');
    });
  });

  describe('Template interpolation', () => {
    it('should handle complex property access', async () => {
      const input = {
        collection: [
          { user: { profile: { name: 'Alice' } } },
          { user: { profile: { name: 'Bob' } } }
        ],
        templateContent: 'User: ${it.user.profile.name}, '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('User: Alice, User: Bob, ');
    });

    it('should handle arithmetic in interpolation', async () => {
      const input = {
        collection: ['a', 'b', 'c'],
        templateContent: '${index + 1}. ${it}, '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(true);
      expect(result.value).toBe('1. a, 2. b, 3. c, ');
    });
  });

  describe('Validation', () => {
    it('should validate input schema', async () => {
      const invalidInput = {
        collection: ['item']
        // missing templateContent
      };

      const result = await repeatDirective.executeTemplate(context, invalidInput as any, '');

      expect(result.success).toBe(false);
      expect(result.error?.name).toBe('RepeatDirectiveValidationError');
    });

    it('should reject empty template content', async () => {
      const input = {
        collection: ['item'],
        templateContent: '   '
      };

      const result = await repeatDirective.executeTemplate(context, input, input.templateContent);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Template content cannot be empty');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Template Directives Integration', () => {
  let ifDirective: EnhancedIfDirective;
  let elseDirective: EnhancedElseDirective;
  let repeatDirective: EnhancedRepeatDirective;

  beforeEach(() => {
    ifDirective = new EnhancedIfDirective();
    elseDirective = new EnhancedElseDirective();
    repeatDirective = new EnhancedRepeatDirective();
  });

  describe('If-Else chains', () => {
    it('should simulate if-else execution pattern', async () => {
      const context = createTestContext({
        locals: new Map([
          ['user', { isLoggedIn: false }]
        ])
      });

      // Simulate @if user.isLoggedIn
      const ifInput = {
        condition: false, // user.isLoggedIn evaluated to false
        templateContent: 'Welcome back!'
      };

      const ifResult = await ifDirective.executeTemplate(context, ifInput, ifInput.templateContent);
      expect(ifResult.success).toBe(true);
      expect(ifResult.value).toBe(''); // No content because condition is false

      // Simulate @else with proper conditional context
      const elseContext = createTestContext({
        ...context,
        conditionalContext: {
          conditionMet: false,
          elseAllowed: true,
          branchExecuted: false
        }
      });

      const elseInput = {
        templateContent: 'Please log in'
      };

      const elseResult = await elseDirective.executeTemplate(elseContext, elseInput, elseInput.templateContent);
      expect(elseResult.success).toBe(true);
      expect(elseResult.value).toBe('Please log in');
    });
  });

  describe('Conditional repeat patterns', () => {
    it('should handle conditional list rendering', async () => {
      const context = createTestContext({
        locals: new Map([
          ['items', [{ name: 'Item 1', visible: true }, { name: 'Item 2', visible: false }]]
        ])
      });

      // Simulate @repeat with conditional content
      const repeatInput = {
        collection: [{ name: 'Item 1', visible: true }, { name: 'Item 2', visible: false }],
        templateContent: '${it.name}'  // In real use, this would have nested @if for it.visible
      };

      const result = await repeatDirective.executeTemplate(context, repeatInput, repeatInput.templateContent);
      expect(result.success).toBe(true);
      expect(result.value).toBe('Item 1Item 2');
    });
  });

  describe('Performance tracking', () => {
    it('should track evaluation history', async () => {
      const context = createTestContext({
        evaluationHistory: []
      });

      const input = {
        condition: true,
        templateContent: 'Test content'
      };

      await ifDirective.executeTemplate(context, input, input.templateContent);

      expect(context.evaluationHistory).toHaveLength(1);
      expect(context.evaluationHistory![0].expressionName).toBe('@if');
      expect(context.evaluationHistory![0].success).toBe(true);
      expect(context.evaluationHistory![0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling', () => {
    it('should provide comprehensive error information', async () => {
      const invalidInput = {
        condition: true,
        templateContent: ''
      };

      const result = await ifDirective.executeTemplate(createTestContext(), invalidInput, invalidInput.templateContent);

      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        name: expect.stringContaining('Error'),
        message: expect.any(String),
        code: expect.any(String),
        suggestions: expect.arrayContaining([expect.any(String)])
      });
    });
  });
});