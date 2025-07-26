/**
 * Enhanced Def Feature Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TypedDefFeatureImplementation,
  createDefFeature,
  createEnhancedDef,
  enhancedDefImplementation,
  type EnhancedDefInput,
  type EnhancedDefOutput
} from './enhanced-def.js';

describe('Enhanced Def Feature Implementation', () => {
  let defFeature: TypedDefFeatureImplementation;
  
  beforeEach(() => {
    defFeature = createDefFeature();
    vi.clearAllMocks();
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal function definition', async () => {
      const input: EnhancedDefInput = {
        definition: {
          name: 'testFunction',
          parameters: ['x'],
          body: ['return x * 2'],
          isAsync: false,
        },
        context: {
          variables: {},
        },
        options: {
          enableClosures: true,
          enableTypeChecking: true,
        },
      };

      const result = await defFeature.initialize(input);
      
      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      
      if (result.success && result.value) {
        expect(result.value.category).toBe('Universal');
        expect(result.value.capabilities).toContain('function-definition');
        expect(result.value.capabilities).toContain('parameter-validation');
        expect(result.value.capabilities).toContain('closure-support');
      }
    });

    it('should initialize with comprehensive function definition', async () => {
      const input: EnhancedDefInput = {
        definition: {
          name: 'complexFunction',
          namespace: 'myNamespace',
          parameters: ['a', 'b', 'c'],
          body: [
            'set result to a + b',
            'if result > c',
            'return result',
            'else',
            'return c'
          ],
          catchBlock: {
            parameter: 'error',
            body: ['log error', 'return null']
          },
          finallyBlock: ['log "function completed"'],
          isAsync: true,
          returnType: 'number',
        },
        context: {
          variables: { debug: true },
          me: null,
        },
        options: {
          enableClosures: true,
          enableTypeChecking: true,
          maxParameterCount: 10,
          allowDynamicParameters: false,
        },
        environment: 'backend',
        debug: true,
      };

      const result = await defFeature.initialize(input);
      
      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('function-definition');
        expect(result.value.capabilities).toContain('async-execution');
        expect(result.value.capabilities).toContain('error-handling');
        expect(result.value.state).toBe('ready');
      }
    });

    it('should handle function with parameters and type checking', async () => {
      const input: EnhancedDefInput = {
        definition: {
          name: 'validator',
          parameters: ['input', 'type'],
          body: ['return true'],
          isAsync: false,
        },
        options: {
          enableTypeChecking: true,
          maxParameterCount: 5,
        },
      };

      const result = await defFeature.initialize(input);
      
      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('type-checking');
        expect(result.value.state).toBe('ready');
      }
    });
  });

  describe('Function Management', () => {
    it('should define and register functions', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'add',
          parameters: ['x', 'y'],
          body: ['return x + y'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Check if function exists
        expect(result.value.functions.exists('add')).toBe(true);

        // Get function metadata
        const metadata = result.value.functions.getMetadata('add');
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe('add');
        expect(metadata?.parameters).toEqual(['x', 'y']);
        expect(metadata?.isAsync).toBe(false);
      }
    });

    it('should call defined functions with parameters', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'multiply',
          parameters: ['a', 'b'],
          body: ['return a * b'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Call the function
        const callResult = await result.value.functions.call('multiply', [3, 4]);
        expect(callResult).toBeDefined();

        // Check call was recorded
        const callStack = result.value.execution.getCallStack();
        expect(callStack.length).toBeGreaterThan(0);
      }
    });

    it('should handle async function execution', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'asyncProcess',
          parameters: ['data'],
          body: ['wait 10ms', 'return processed'],
          isAsync: true,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Invoke async function
        const asyncResult = await result.value.execution.invokeAsync('asyncProcess', 'testData');
        expect(asyncResult).toBeDefined();

        // Verify it's marked as async
        const metadata = result.value.functions.getMetadata('asyncProcess');
        expect(metadata?.isAsync).toBe(true);
      }
    });

    it('should manage function namespaces', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'helper',
          namespace: 'utils.math',
          parameters: ['n'],
          body: ['return n + 1'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Check function exists in namespace
        expect(result.value.functions.exists('utils.math.helper')).toBe(true);

        // List functions in namespace
        const namespaceFunctions = result.value.functions.list('utils.math');
        expect(namespaceFunctions).toContain('utils.math.helper');
      }
    });

    it('should remove functions', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'temporary',
          parameters: [],
          body: ['return temp'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Verify function exists
        expect(result.value.functions.exists('temporary')).toBe(true);

        // Remove function
        const removed = result.value.functions.remove('temporary');
        expect(removed).toBe(true);

        // Verify function no longer exists
        expect(result.value.functions.exists('temporary')).toBe(false);
      }
    });
  });

  describe('Parameter Management', () => {
    it('should validate function parameters', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'divide',
          parameters: ['numerator', 'denominator'],
          body: ['return numerator / denominator'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Valid parameters
        const validParams = result.value.parameters.validate('divide', [10, 2]);
        expect(validParams.isValid).toBe(true);

        // Invalid parameter count
        const invalidParams = result.value.parameters.validate('divide', [10]);
        expect(invalidParams.isValid).toBe(false);
        expect(invalidParams.error).toContain('Expected 2 parameters');
      }
    });

    it('should bind parameters to values', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'greet',
          parameters: ['name', 'title'],
          body: ['return title + " " + name'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Bind parameters
        const bindings = result.value.parameters.bind('greet', ['John', 'Mr.']);
        expect(bindings).toEqual({
          name: 'John',
          title: 'Mr.'
        });
      }
    });

    it('should get function signatures', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'calculate',
          parameters: ['x', 'y', 'operation'],
          body: ['return result'],
          isAsync: true,
          returnType: 'number',
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const signature = result.value.parameters.getSignature('calculate');
        expect(signature).toEqual({
          name: 'calculate',
          parameters: ['x', 'y', 'operation'],
          isAsync: true,
          returnType: 'number',
        });
      }
    });
  });

  describe('Closure Support', () => {
    it('should create closures with captured variables', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'counter',
          parameters: [],
          body: ['return count + 1'],
          isAsync: false,
        },
        options: {
          enableClosures: true,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Create closure with captured variable
        const closure = result.value.execution.createClosure('counter', { count: 5 });
        expect(closure).toBeDefined();
        expect(typeof closure.call).toBe('function');

        // Call closure
        const closureResult = await closure.call();
        expect(closureResult).toBeDefined();
      }
    });
  });

  describe('Type Management', () => {
    it('should check parameter types', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'typed',
          parameters: ['str', 'num'],
          body: ['return str + num'],
          isAsync: false,
        },
        options: {
          enableTypeChecking: true,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Check types
        expect(result.value.types.check('hello', 'string')).toBe(true);
        expect(result.value.types.check(42, 'number')).toBe(true);
        expect(result.value.types.check('hello', 'number')).toBe(false);

        // Infer types
        expect(result.value.types.infer('test')).toBe('string');
        expect(result.value.types.infer(123)).toBe('number');
        expect(result.value.types.infer([])).toBe('array');
      }
    });

    it('should annotate functions with type information', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'annotated',
          parameters: ['input'],
          body: ['return processed'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Annotate function
        const annotated = result.value.types.annotate('annotated', ['string'], 'string');
        expect(annotated).toBe(true);

        // Check annotation was applied
        const signature = result.value.parameters.getSignature('annotated');
        expect(signature?.returnType).toBe('string');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle function execution errors with catch blocks', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'risky',
          parameters: ['value'],
          body: ['throw "error occurred"'],
          catchBlock: {
            parameter: 'err',
            body: ['return "handled"']
          },
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Get catch block
        const catchBlock = result.value.errors.getCatchBlock('risky');
        expect(catchBlock).toBeDefined();
        expect(catchBlock?.parameter).toBe('err');

        // Handle error
        const error = new Error('test error');
        const handled = await result.value.errors.handle(error, 'risky');
        expect(handled).toBeDefined();
      }
    });

    it('should execute finally blocks', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'withFinally',
          parameters: [],
          body: ['return success'],
          finallyBlock: ['log "cleanup"'],
          isAsync: false,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Get finally block
        const finallyBlock = result.value.errors.getFinallyBlock('withFinally');
        expect(finallyBlock).toBeDefined();
        expect(Array.isArray(finallyBlock)).toBe(true);
      }
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate function name format', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: '123invalid',
          parameters: [],
          body: ['return true'],
          isAsync: false,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].type).toBe('invalid-function-name');
      expect(validationResult.suggestions).toContain('Use valid JavaScript identifier for function name');
    });

    it('should validate parameter names', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: 'validFunction',
          parameters: ['valid-param', 'another-invalid', '123param'],
          body: ['return true'],
          isAsync: false,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.errors.some(e => e.type === 'invalid-parameter-name')).toBe(true);
    });

    it('should validate duplicate parameters', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: 'duplicateParams',
          parameters: ['param1', 'param2', 'param1'],
          body: ['return true'],
          isAsync: false,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'duplicate-parameters')).toBe(true);
    });

    it('should validate parameter count limits', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: 'tooManyParams',
          parameters: Array.from({length: 25}, (_, i) => `param${i}`),
          body: ['return true'],
          isAsync: false,
        },
        options: {
          maxParameterCount: 20,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'too-many-parameters')).toBe(true);
    });

    it('should validate empty function body', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: 'emptyFunction',
          parameters: [],
          body: [],
          isAsync: false,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'empty-function-body')).toBe(true);
    });

    it('should validate catch block parameter', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: 'catchFunction',
          parameters: [],
          body: ['return true'],
          catchBlock: {
            parameter: '123invalid',
            body: ['return false']
          },
          isAsync: false,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-catch-parameter')).toBe(true);
    });

    it('should validate namespace format', () => {
      const validationResult = defFeature.validate({
        definition: {
          name: 'namespacedFunction',
          namespace: '123.invalid.namespace',
          parameters: [],
          body: ['return true'],
          isAsync: false,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-namespace')).toBe(true);
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await defFeature.initialize({
        definition: {} as any, // Invalid definition
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      // Initialize multiple times to build performance history
      for (let i = 0; i < 3; i++) {
        await defFeature.initialize({
          definition: {
            name: `testFunc${i}`,
            parameters: ['x'],
            body: ['return x'],
            isAsync: false,
          },
        });
      }

      const metrics = defFeature.getPerformanceMetrics();
      
      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
      expect(typeof metrics.totalFunctions).toBe('number');
      expect(typeof metrics.totalNamespaces).toBe('number');
      expect(typeof metrics.averageCallTime).toBe('number');
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createDefFeature();
      expect(context).toBeInstanceOf(TypedDefFeatureImplementation);
      expect(context.name).toBe('defFeature');
      expect(context.category).toBe('Universal');
    });

    it('should create enhanced def through convenience function', async () => {
      const result = await createEnhancedDef({
        name: 'testFunction',
        parameters: ['x'],
        body: ['return x * 2'],
      }, {
        environment: 'frontend',
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pattern Compliance', () => {
    it('should have required enhanced pattern properties', () => {
      expect(defFeature.name).toBe('defFeature');
      expect(defFeature.category).toBe('Universal');
      expect(defFeature.description).toBeDefined();
      expect(defFeature.inputSchema).toBeDefined();
      expect(defFeature.outputType).toBe('Context');
      expect(defFeature.metadata).toBeDefined();
      expect(defFeature.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = defFeature;
      
      expect(metadata.category).toBe('Universal');
      expect(metadata.complexity).toBe('complex');
      expect(Array.isArray(metadata.sideEffects)).toBe(true);
      expect(Array.isArray(metadata.dependencies)).toBe(true);
      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);
      expect(metadata.environmentRequirements).toBeDefined();
      expect(metadata.performance).toBeDefined();
    });

    it('should have LLM-compatible documentation', () => {
      const { documentation } = defFeature;
      
      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('functions');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle complete function definition workflow', async () => {
      const result = await defFeature.initialize({
        definition: {
          name: 'calculator',
          namespace: 'math.utils',
          parameters: ['operation', 'x', 'y'],
          body: [
            'if operation == "add"',
            'return x + y',
            'else if operation == "multiply"',
            'return x * y',
            'else',
            'throw "Unknown operation"'
          ],
          catchBlock: {
            parameter: 'error',
            body: ['log "Calculation failed: " + error', 'return 0']
          },
          finallyBlock: ['log "Calculation completed"'],
          isAsync: false,
          returnType: 'number',
        },
        context: {
          variables: { debug: true },
        },
        options: {
          enableClosures: true,
          enableTypeChecking: true,
          maxParameterCount: 10,
        },
        environment: 'universal',
        debug: true,
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Verify function registration
        expect(result.value.functions.exists('math.utils.calculator')).toBe(true);

        // Get function metadata
        const metadata = result.value.functions.getMetadata('math.utils.calculator');
        expect(metadata?.name).toBe('calculator');
        expect(metadata?.namespace).toBe('math.utils');
        expect(metadata?.parameters).toEqual(['operation', 'x', 'y']);
        expect(metadata?.returnType).toBe('number');

        // Validate parameters
        const validation = result.value.parameters.validate('math.utils.calculator', ['add', 5, 3]);
        expect(validation.isValid).toBe(true);

        // Get function signature
        const signature = result.value.parameters.getSignature('math.utils.calculator');
        expect(signature?.name).toBe('calculator');
        expect(signature?.parameters).toHaveLength(3);

        // Check error handling capabilities
        const catchBlock = result.value.errors.getCatchBlock('math.utils.calculator');
        expect(catchBlock?.parameter).toBe('error');

        const finallyBlock = result.value.errors.getFinallyBlock('math.utils.calculator');
        expect(Array.isArray(finallyBlock)).toBe(true);

        // Type checking
        expect(result.value.types.check('add', 'string')).toBe(true);
        expect(result.value.types.check(5, 'number')).toBe(true);
        expect(result.value.types.infer('multiply')).toBe('string');

        // List functions in namespace
        const namespaceFunctions = result.value.functions.list('math.utils');
        expect(namespaceFunctions).toContain('math.utils.calculator');
      }
    });
  });
});

describe('Enhanced Def Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedDefImplementation).toBeInstanceOf(TypedDefFeatureImplementation);
    expect(enhancedDefImplementation.name).toBe('defFeature');
  });
});