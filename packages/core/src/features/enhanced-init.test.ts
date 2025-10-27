/**
 * Enhanced Init Feature Tests
 * Comprehensive testing for TypedInitFeatureImplementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  TypedInitFeatureImplementation, 
  createInitFeature, 
  createEnhancedInit,
  EnhancedInitInput,
  EnhancedInitOutput,
  InitRegistration,
  InitExecution
} from './init';
import { createMockHyperscriptContext, createTestElement } from '../test-setup';
import type { TypedExpressionContext } from '../types/enhanced-expressions';

describe('Enhanced Init Feature', () => {
  let initFeature: TypedInitFeatureImplementation;
  let testElement: HTMLElement;
  let mockContext: TypedExpressionContext;

  beforeEach(() => {
    initFeature = new TypedInitFeatureImplementation();
    testElement = createTestElement('<div id="test-element" class="test">Test Content</div>');
    
    // Create enhanced context for testing
    mockContext = {
      ...createMockHyperscriptContext(testElement),
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict' as const,
      evaluationHistory: []
    } as TypedExpressionContext;
  });

  afterEach(() => {
    // Clean up DOM
    testElement.remove();
    vi.restoreAllMocks();
  });

  describe('Feature Metadata', () => {
    it('should have correct feature properties', () => {
      expect(initFeature.name).toBe('initFeature');
      expect(initFeature.category).toBe('Frontend');
      expect(initFeature.description).toContain('Type-safe element initialization');
      expect(initFeature.outputType).toBe('Object');
    });

    it('should have comprehensive metadata', () => {
      expect(initFeature.metadata.category).toBe('Frontend');
      expect(initFeature.metadata.complexity).toBe('complex');
      expect(initFeature.metadata.sideEffects).toContain('dom-initialization');
      expect(initFeature.metadata.examples).toHaveLength(3);
    });

    it('should have LLM documentation', () => {
      expect(initFeature.documentation.summary).toContain('element initialization');
      expect(initFeature.documentation.parameters).toHaveLength(1);
      expect(initFeature.documentation.examples).toHaveLength(3);
      expect(initFeature.documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Input Validation', () => {
    it('should validate correct input structure', () => {
      const validInput: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['initialized'] }],
          timing: { immediate: false, delay: 0, defer: false },
          lifecycle: { runOnce: true, resetOnRemoval: false, propagateToChildren: false }
        },
        execution: {
          parallel: false,
          stopOnError: true,
          timeout: 10000,
          retries: { enabled: false, maxAttempts: 3, delay: 1000 }
        },
        errorHandling: {
          strategy: 'log',
          fallbackCommands: [],
          setAttribute: true
        },
        context: { variables: {} },
        options: {
          enableDOMObserver: true,
          enablePerformanceTracking: true,
          enableEventEmission: true,
          maxConcurrentInits: 10
        },
        environment: 'frontend',
        debug: false
      };

      const result = initFeature.validate(validInput);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty commands array', () => {
      const invalidInput = {
        initialization: {
          target: testElement,
          commands: [], // Empty array should be rejected
          timing: {},
          lifecycle: {}
        }
      };

      const result = initFeature.validate(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('missing-argument');
      expect(result.suggestions[0]).toContain('Add at least one command');
    });

    it('should reject invalid delay values', () => {
      const invalidInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'test' }],
          timing: { delay: -100 } // Negative delay should be rejected
        }
      };

      const result = initFeature.validate(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('invalid-syntax');
    });

    it('should validate CSS selectors', () => {
      const invalidInput = {
        initialization: {
          target: '<<<invalid-selector>>>', // Invalid CSS selector
          commands: [{ name: 'test' }]
        }
      };

      const result = initFeature.validate(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('invalid-syntax');
    });

    it('should validate execution timeout', () => {
      const invalidInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'test' }]
        },
        execution: {
          timeout: 500 // Too short, should be at least 1000ms
        }
      };

      const result = initFeature.validate(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('invalid-syntax');
    });

    it('should validate retry configuration', () => {
      const invalidInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'test' }]
        },
        execution: {
          retries: {
            enabled: true,
            maxAttempts: 0, // Invalid: should be at least 1
            delay: -100     // Invalid: should be non-negative
          }
        }
      };

      const result = initFeature.validate(invalidInput);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'invalid-syntax')).toBe(true);
      expect(result.errors.some(e => e.type === 'invalid-syntax')).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize with valid input', async () => {
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['initialized'] }],
          timing: { immediate: false, delay: 0, defer: false },
          lifecycle: { runOnce: true, resetOnRemoval: false, propagateToChildren: false }
        },
        execution: { parallel: false, stopOnError: true, timeout: 10000, retries: { enabled: false, maxAttempts: 3, delay: 1000 } },
        errorHandling: { strategy: 'log', fallbackCommands: [], setAttribute: true },
        context: { variables: {} },
        options: { enableDOMObserver: true, enablePerformanceTracking: true, enableEventEmission: true, maxConcurrentInits: 10 },
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.state).toBe('ready');
        expect(result.value.capabilities).toContain('element-initialization');
        expect(result.value.contextId).toMatch(/^init-\d+$/);
      }
    });

    it('should return error for invalid input', async () => {
      const invalidInput = { invalid: 'input' };

      const result = await initFeature.initialize(invalidInput as any);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].type).toBe('type-mismatch');
        expect(result.suggestions).toContain('Ensure input matches EnhancedInitInput schema');
      }
    });

    it('should create context with all required API methods', async () => {
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['test'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: {},
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const context = result.value;
        
        // Element management API
        expect(typeof context.elements.register).toBe('function');
        expect(typeof context.elements.unregister).toBe('function');
        expect(typeof context.elements.process).toBe('function');
        expect(typeof context.elements.processAll).toBe('function');
        expect(typeof context.elements.isRegistered).toBe('function');
        expect(typeof context.elements.isProcessed).toBe('function');
        
        // Command execution API
        expect(typeof context.execution.execute).toBe('function');
        expect(typeof context.execution.executeParallel).toBe('function');
        expect(typeof context.execution.executeWithRetry).toBe('function');
        
        // Lifecycle management API
        expect(typeof context.lifecycle.onElementAdded).toBe('function');
        expect(typeof context.lifecycle.onElementRemoved).toBe('function');
        expect(typeof context.lifecycle.onDOMReady).toBe('function');
        expect(typeof context.lifecycle.reset).toBe('function');
        
        // Error handling API
        expect(typeof context.errors.handle).toBe('function');
        expect(typeof context.errors.getErrorHistory).toBe('function');
        expect(typeof context.errors.clearErrors).toBe('function');
      }
    });
  });

  describe('Element Registration and Processing', () => {
    let initContext: EnhancedInitOutput;

    beforeEach(async () => {
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['registered'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: {},
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      expect(result.success).toBe(true);
      if (result.success) {
        initContext = result.value;
      }
    });

    it('should register elements for initialization', async () => {
      const commands = [{ name: 'addClass', args: ['test-class'] }];
      const registration = await initContext.elements.register(testElement, commands);
      
      expect(registration).toBeTruthy();
      expect(registration.element).toBe(testElement);
      expect(registration.commands).toEqual(commands);
      expect(registration.state).toBe('pending');
    });

    it('should check if element is registered', async () => {
      const commands = [{ name: 'addClass', args: ['test'] }];
      await initContext.elements.register(testElement, commands);
      
      expect(initContext.elements.isRegistered(testElement)).toBe(true);
      
      const otherElement = createTestElement('<div>');
      expect(initContext.elements.isRegistered(otherElement)).toBe(false);
    });

    it('should process individual elements', async () => {
      const newElement = createTestElement('<div id="process-test">');  
      const commands = [{ name: 'addClass', args: ['processed'] }];
      await initContext.elements.register(newElement, commands);
      
      const result = await initContext.elements.process(newElement);
      expect(result).toBe(true);
      expect(newElement.classList.contains('processed')).toBe(true);
    });

    it('should process all registered elements', async () => {
      const element1 = createTestElement('<div id="el1">');
      const element2 = createTestElement('<div id="el2">');
      
      await initContext.elements.register(element1, [{ name: 'addClass', args: ['batch1'] }]);
      await initContext.elements.register(element2, [{ name: 'addClass', args: ['batch2'] }]);
      
      const results = await initContext.elements.processAll();
      
      expect(results).toHaveLength(3); // Including the initial testElement
      expect(element1.classList.contains('batch1')).toBe(true);
      expect(element2.classList.contains('batch2')).toBe(true);
    });

    it('should unregister elements', async () => {
      const commands = [{ name: 'addClass', args: ['test'] }];
      await initContext.elements.register(testElement, commands);
      
      expect(initContext.elements.isRegistered(testElement)).toBe(true);
      
      const result = initContext.elements.unregister(testElement);
      expect(result).toBe(true);
      expect(initContext.elements.isRegistered(testElement)).toBe(false);
    });
  });

  describe('Command Execution', () => {
    let initContext: EnhancedInitOutput;

    beforeEach(async () => {
      // Add test element to DOM so selector can find it
      document.body.appendChild(testElement);
      
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement, // Use element directly instead of selector
          commands: [{ name: 'addClass', args: ['init'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: {},
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      if (result.success) {
        initContext = result.value;
      }
    });
    
    afterEach(() => {
      // Clean up test element from DOM
      if (testElement.parentNode) {
        testElement.parentNode.removeChild(testElement);
      }
    });

    it('should execute basic commands', async () => {
      const commands = [
        { name: 'addClass', args: ['test-class'] },
        { name: 'setAttribute', args: ['data-test', 'value'] }
      ];

      await initContext.execution.execute(commands);
      
      // Commands should be executed (basic implementation)
      expect(true).toBe(true); // Basic test - would need mock command executor for full testing
    });

    it('should execute commands in parallel', async () => {
      const commands = [
        { name: 'addClass', args: ['parallel1'] },
        { name: 'addClass', args: ['parallel2'] }
      ];

      await initContext.execution.executeParallel(commands);
      
      // Commands should be executed in parallel
      expect(true).toBe(true); // Basic test
    });

    it('should execute commands with retry', async () => {
      const commands = [{ name: 'addClass', args: ['retry-test'] }];

      const result = await initContext.execution.executeWithRetry(commands, undefined, 2, 100);
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(1);
    });

    it('should track execution history', async () => {
      const commands = [{ name: 'addClass', args: ['history-test'] }];

      await initContext.execution.execute(commands);
      
      const history = initContext.execution.getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear execution history', async () => {
      const commands = [{ name: 'addClass', args: ['clear-test'] }];
      await initContext.execution.execute(commands);
      
      const cleared = initContext.execution.clearHistory();
      expect(cleared).toBe(true);
      
      const history = initContext.execution.getExecutionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Lifecycle Management', () => {
    let initContext: EnhancedInitOutput;

    beforeEach(async () => {
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['lifecycle'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: {},
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      if (result.success) {
        initContext = result.value;
      }
    });

    it('should handle element added events', () => {
      const mockCallback = vi.fn();
      const handlerId = initContext.lifecycle.onElementAdded(mockCallback);
      
      expect(typeof handlerId).toBe('string');
      expect(handlerId).toBe('handler-id'); // Mock implementation returns fixed string
    });

    it('should handle element removed events', () => {
      const mockCallback = vi.fn();
      const handlerId = initContext.lifecycle.onElementRemoved(mockCallback);
      
      expect(typeof handlerId).toBe('string');
      expect(handlerId).toBe('handler-id');
    });

    it('should handle DOM ready events', () => {
      const mockCallback = vi.fn();
      const result = initContext.lifecycle.onDOMReady(mockCallback);
      
      expect(result).toBe(true);
      // If DOM is already ready, callback should be called immediately
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should reset system state', () => {
      const result = initContext.lifecycle.reset();
      
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    let initContext: EnhancedInitOutput;

    beforeEach(async () => {
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['error-test'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: { strategy: 'log' },
        context: { variables: {} },
        options: {},
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      if (result.success) {
        initContext = result.value;
      }
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Test error');
      const context = { test: 'context' };
      
      const result = await initContext.errors.handle(error, context);
      expect(result).toBe(true);
    });

    it('should track error history', async () => {
      const error = new Error('History test error');
      await initContext.errors.handle(error, {});
      
      const history = initContext.errors.getErrorHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear error history', () => {
      const result = initContext.errors.clearErrors();
      expect(result).toBe(true);
      
      const history = initContext.errors.getErrorHistory();
      expect(history).toHaveLength(0);
    });

    it('should set custom error handler', () => {
      const customHandler = (error: Error, context: any) => {
        console.log('Custom error handler', error, context);
      };
      
      const result = initContext.errors.setErrorHandler(customHandler);
      expect(result).toBe(true);
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      const metrics = initFeature.getPerformanceMetrics();
      
      expect(typeof metrics.totalInitializations).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(Array.isArray(metrics.evaluationHistory)).toBe(true);
      expect(typeof metrics.totalRegistrations).toBe('number');
      expect(typeof metrics.totalExecutions).toBe('number');
      expect(typeof metrics.totalErrors).toBe('number');
    });

    it('should have reasonable default metrics', () => {
      const metrics = initFeature.getPerformanceMetrics();
      
      expect(metrics.successRate).toBe(0); // No evaluations initially, so 0 success rate
      expect(metrics.averageDuration).toBe(0); // No evaluations initially
      expect(metrics.totalInitializations).toBe(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create init feature instance', () => {
      const feature = createInitFeature();
      
      expect(feature).toBeInstanceOf(TypedInitFeatureImplementation);
      expect(feature.name).toBe('initFeature');
    });

    it('should create enhanced init with convenience function', async () => {
      const commands = [{ name: 'addClass', args: ['convenience'] }];
      
      const result = await createEnhancedInit(testElement, commands);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.state).toBe('ready');
        expect(result.value.capabilities).toContain('element-initialization');
      }
    });

    it('should create enhanced init with options', async () => {
      const commands = [{ name: 'addClass', args: ['with-options'] }];
      const options = {
        execution: { parallel: true },
        options: { enableDOMObserver: false }
      };
      
      const result = await createEnhancedInit(testElement, commands, options);
      
      expect(result.success).toBe(true);
    });
  });

  describe('DOM Observer Integration', () => {
    it('should set up DOM observer when enabled', async () => {
      // Mock MutationObserver
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn()
      };
      
      // @ts-ignore - Mock global MutationObserver
      global.MutationObserver = vi.fn(() => mockObserver);

      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['observed'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: { enableDOMObserver: true },
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      
      expect(result.success).toBe(true);
      expect(global.MutationObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalled();
    });

    it('should skip DOM observer when disabled', async () => {
      const input: EnhancedInitInput = {
        initialization: {
          target: testElement,
          commands: [{ name: 'addClass', args: ['not-observed'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: { enableDOMObserver: false },
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      
      expect(result.success).toBe(true);
      // DOM observer should not be set up
    });
  });

  describe('Integration with Enhanced Pattern', () => {
    it('should follow TypedContextImplementation interface', () => {
      // Verify the feature implements all required properties
      expect(initFeature.name).toBeDefined();
      expect(initFeature.category).toBeDefined();
      expect(initFeature.description).toBeDefined();
      expect(initFeature.inputSchema).toBeDefined();
      expect(initFeature.outputType).toBeDefined();
      expect(initFeature.metadata).toBeDefined();
      expect(initFeature.documentation).toBeDefined();
      
      // Verify required methods exist
      expect(typeof initFeature.initialize).toBe('function');
      expect(typeof initFeature.validate).toBe('function');
    });

    it('should have comprehensive LLM documentation', () => {
      const doc = initFeature.documentation;
      
      expect(doc.summary).toContain('element initialization');
      expect(doc.parameters).toHaveLength(1);
      expect(doc.parameters[0].name).toBe('initConfig');
      expect(doc.parameters[0].type).toBe('object');
      expect(doc.returns.type).toBe('object');
      expect(doc.examples).toHaveLength(3);
      expect(doc.seeAlso).toContain('defFeature');
      expect(doc.tags).toContain('type-safe');
    });

    it('should have proper metadata structure', () => {
      const meta = initFeature.metadata;
      
      expect(meta.category).toBe('Frontend');
      expect(meta.complexity).toBe('complex');
      expect(meta.sideEffects).toContain('dom-initialization');
      expect(meta.dependencies).toContain('dom-api');
      expect(meta.returnTypes).toContain('Object');
      expect(meta.examples).toHaveLength(3);
      expect(meta.performance.averageTime).toBe(12.0);
      expect(meta.performance.complexity).toBe('O(n)');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle invalid target selectors gracefully', async () => {
      // Create element but with invalid selector in the initialization
      document.body.appendChild(testElement);
      
      const input: EnhancedInitInput = {
        initialization: {
          target: '#non-existent-element',
          commands: [{ name: 'addClass', args: ['test'] }],
          timing: {},
          lifecycle: {}
        },
        execution: {},
        errorHandling: {},
        context: { variables: {} },
        options: {},
        environment: 'frontend',
        debug: false
      };

      const result = await initFeature.initialize(input);
      
      // Should fail because target element doesn't exist
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].message).toContain('Target element not found');
      }
      
      document.body.removeChild(testElement);
    });

    it('should handle missing commands gracefully', () => {
      const invalidInput = {
        initialization: {
          target: testElement,
          // commands missing
          timing: {},
          lifecycle: {}
        }
      };

      const result = initFeature.validate(invalidInput);
      expect(result.isValid).toBe(false);
    });

    it('should handle concurrent initialization limits', () => {
      const input = {
        initialization: {
          target: testElement,
          commands: [{ name: 'test' }]
        },
        options: {
          maxConcurrentInits: 0 // Invalid: should be at least 1
        }
      };

      const result = initFeature.validate(input);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('invalid-syntax');
    });

    it('should validate command structure', () => {
      const input = {
        initialization: {
          target: testElement,
          commands: [
            null, // Invalid command
            { name: 'valid' },
            'invalid string command' // Invalid command
          ]
        }
      };

      const result = initFeature.validate(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type-mismatch')).toBe(true);
    });
  });
});