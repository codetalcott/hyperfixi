/**
 * Enhanced On Feature Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TypedOnFeatureImplementation,
  createOnFeature,
  createEnhancedOn,
  enhancedOnImplementation,
  type EnhancedOnInput,
  type EnhancedOnOutput
} from './enhanced-on.js';

describe('Enhanced On Feature Implementation', () => {
  let onFeature: TypedOnFeatureImplementation;
  
  beforeEach(() => {
    onFeature = createOnFeature();
    vi.clearAllMocks();
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal event configuration', async () => {
      const input: EnhancedOnInput = {
        event: {
          type: 'click',
        },
        commands: [{ type: 'command', name: 'log', args: ['clicked'] }],
        context: {
          variables: {},
        },
        options: {
          enableErrorHandling: true,
        },
      };

      const result = await onFeature.initialize(input);
      
      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      
      if (result.success && result.value) {
        expect(result.value.category).toBe('Frontend');
        expect(result.value.capabilities).toContain('event-listening');
        expect(result.value.capabilities).toContain('command-execution');
        expect(result.value.capabilities).toContain('event-filtering');
      }
    });

    it('should initialize with comprehensive event configuration', async () => {
      const input: EnhancedOnInput = {
        event: {
          type: 'submit',
          target: 'form.contact',
          preventDefault: true,
          throttle: 1000,
          filter: 'event.target.checkValidity()',
        },
        commands: [
          { type: 'command', name: 'log', args: ['Form submitted'] },
          { type: 'command', name: 'hide', args: [] }
        ],
        context: {
          variables: { debug: true },
          me: null,
        },
        options: {
          enableErrorHandling: true,
          enableEventCapture: true,
          enableAsyncExecution: true,
          maxCommandCount: 50,
        },
        environment: 'frontend',
        debug: true,
      };

      const result = await onFeature.initialize(input);
      
      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('event-listening');
        expect(result.value.capabilities).toContain('performance-optimization');
        expect(result.value.capabilities).toContain('error-handling');
        expect(result.value.state).toBe('ready');
      }
    });

    it('should handle keyboard events with debouncing', async () => {
      const input: EnhancedOnInput = {
        event: {
          type: 'keydown',
          target: 'input.search',
          debounce: 300,
          filter: 'event.key.length === 1', // Only letter/number keys
        },
        commands: [{ type: 'command', name: 'validateInput', args: [] }],
        options: {
          enableAsyncExecution: true,
        },
      };

      const result = await onFeature.initialize(input);
      
      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('performance-optimization');
        expect(result.value.state).toBe('ready');
      }
    });
  });

  describe('Event Management', () => {
    it('should create and manage event listeners', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'click',
          target: '.button',
        },
        commands: [{ type: 'command', name: 'toggle', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Test listener management
        const listeners = result.value.events.getListeners();
        expect(Array.isArray(listeners)).toBe(true);

        const clickListeners = result.value.events.getListeners('click');
        expect(Array.isArray(clickListeners)).toBe(true);
      }
    });

    it('should trigger custom events', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'custom:dataUpdate',
        },
        commands: [{ type: 'command', name: 'refreshView', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Test event triggering
        expect(typeof result.value.events.trigger).toBe('function');
        
        // Should not throw when triggering events
        expect(() => {
          result.value.events.trigger('custom:testEvent', { data: 'test' });
        }).not.toThrow();
      }
    });

    it('should pause and resume listeners', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'scroll',
          throttle: 100,
        },
        commands: [{ type: 'command', name: 'updateScrollPosition', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const listeners = result.value.events.getListeners('scroll');
        if (listeners.length > 0) {
          const listenerId = listeners[0].id;
          
          // Test pausing
          const paused = result.value.events.pauseListener(listenerId);
          expect(paused).toBe(true);

          // Test resuming
          const resumed = result.value.events.resumeListener(listenerId);
          expect(resumed).toBe(true);
        }
      }
    });

    it('should unlisten event handlers', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'input',
          debounce: 250,
        },
        commands: [{ type: 'command', name: 'validateField', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const listeners = result.value.events.getListeners('input');
        if (listeners.length > 0) {
          const listenerId = listeners[0].id;
          
          // Test unlistening
          const unlistened = result.value.events.unlisten(listenerId);
          expect(unlistened).toBe(true);
        }
      }
    });
  });

  describe('Command Execution', () => {
    it('should execute commands synchronously', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'click',
        },
        commands: [
          { type: 'command', name: 'log', args: ['Button clicked'] },
          { type: 'command', name: 'hide', args: [] }
        ],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Test command execution
        const commands = [
          { name: 'log', args: ['Test execution'] },
          { name: 'show', args: [] }
        ];
        
        const execResult = await result.value.execution.execute(commands, { me: null });
        expect(execResult).toBeDefined();
      }
    });

    it('should execute commands asynchronously', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'submit',
        },
        commands: [{ type: 'command', name: 'submitForm', args: [] }],
        options: {
          enableAsyncExecution: true,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Test async command execution
        const commands = [{ name: 'log', args: ['Async execution'] }];
        
        const execResult = await result.value.execution.executeAsync(commands, { me: null });
        expect(execResult).toBeDefined();
      }
    });

    it('should track execution history', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'change',
        },
        commands: [{ type: 'command', name: 'updateValue', args: [] }],
      });

      expect(result.success && result.value).toBeTruthy();
      
      if (result.success && result.value) {
        // Execute some commands to build history
        await result.value.execution.execute([{ name: 'log', args: ['test1'] }], {});
        await result.value.execution.execute([{ name: 'log', args: ['test2'] }], {});
        
        // Check execution history
        const history = result.value.execution.getExecutionHistory();
        expect(Array.isArray(history)).toBe(true);

        // Test history limits
        const limitedHistory = result.value.execution.getExecutionHistory(1);
        expect(Array.isArray(limitedHistory)).toBe(true);
        expect(limitedHistory.length).toBeLessThanOrEqual(1);
      }
    });

    it('should clear execution history', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'focus',
        },
        commands: [{ type: 'command', name: 'highlightField', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Clear history
        const cleared = result.value.execution.clearHistory();
        expect(cleared).toBe(true);
      }
    });
  });

  describe('Event Filtering', () => {
    it('should add and manage event filters', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'keydown',
          filter: 'event.key === "Enter"',
        },
        commands: [{ type: 'command', name: 'submitOnEnter', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Add a custom filter
        const added = result.value.filtering.addFilter('enterKey', 'event.key === "Enter" && !event.shiftKey');
        expect(added).toBe(true);

        // Get all filters
        const filters = result.value.filtering.getFilters();
        expect(Array.isArray(filters)).toBe(true);

        // Test filter with mock event
        const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        const testResult = result.value.filtering.testFilter('enterKey', mockEvent);
        expect(typeof testResult).toBe('boolean');
      }
    });

    it('should remove filters', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'click',
        },
        commands: [{ type: 'command', name: 'handleClick', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Add then remove filter
        result.value.filtering.addFilter('testFilter', 'event.buttons === 1');
        const removed = result.value.filtering.removeFilter('testFilter');
        expect(removed).toBe(true);
      }
    });

    it('should handle invalid filter expressions', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'mouseover',
        },
        commands: [{ type: 'command', name: 'showTooltip', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Try to add invalid filter
        const added = result.value.filtering.addFilter('invalidFilter', 'invalid javascript syntax [[[');
        expect(added).toBe(false);
      }
    });
  });

  describe('Performance Control', () => {
    it('should manage throttling settings', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'scroll',
          throttle: 100,
        },
        commands: [{ type: 'command', name: 'updateScrollbar', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const listeners = result.value.events.getListeners('scroll');
        if (listeners.length > 0) {
          const listenerId = listeners[0].id;
          
          // Test throttle control
          const throttled = result.value.performance.throttle(listenerId, 200);
          expect(throttled).toBe(true);

          // Test throttle delay setting
          const delaySet = result.value.performance.setThrottleDelay(listenerId, 150);
          expect(delaySet).toBe(true);
        }
      }
    });

    it('should manage debouncing settings', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'input',
          debounce: 300,
        },
        commands: [{ type: 'command', name: 'searchAsYouType', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const listeners = result.value.events.getListeners('input');
        if (listeners.length > 0) {
          const listenerId = listeners[0].id;
          
          // Test debounce control
          const debounced = result.value.performance.debounce(listenerId, 500);
          expect(debounced).toBe(true);

          // Test debounce delay setting
          const delaySet = result.value.performance.setDebounceDelay(listenerId, 400);
          expect(delaySet).toBe(true);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle and track errors', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'error',
        },
        commands: [{ type: 'command', name: 'logError', args: [] }],
        options: {
          enableErrorHandling: true,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Test error handling
        const error = new Error('Test error');
        const handled = await result.value.errors.handle(error, { context: 'test' });
        expect(handled).toBe(true);

        // Check error history
        const errorHistory = result.value.errors.getErrorHistory();
        expect(Array.isArray(errorHistory)).toBe(true);
      }
    });

    it('should clear error history', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'click',
        },
        commands: [{ type: 'command', name: 'risky', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Clear errors
        const cleared = result.value.errors.clearErrors();
        expect(cleared).toBe(true);
      }
    });

    it('should set custom error handlers', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'unhandledrejection',
        },
        commands: [{ type: 'command', name: 'reportError', args: [] }],
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Set custom error handler
        const customHandler = (error: Error, context: any) => {
          console.warn('Custom error handler:', error.message);
        };
        
        const handlerSet = result.value.errors.setErrorHandler(customHandler);
        expect(handlerSet).toBe(true);
      }
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate event type', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'invalidEventType123',
        },
        commands: [{ type: 'command', name: 'log', args: [] }],
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].type).toBe('invalid-event-type');
      expect(validationResult.suggestions).toContain('Use standard DOM event types like "click", "input", "submit", "keydown", etc.');
    });

    it('should validate target selector', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'click',
          target: '>>>invalid-selector<<<',
        },
        commands: [{ type: 'command', name: 'log', args: [] }],
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.errors.some(e => e.type === 'invalid-target-selector')).toBe(true);
    });

    it('should validate conflicting performance options', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'scroll',
          throttle: 100,
          debounce: 200, // Cannot have both
        },
        commands: [{ type: 'command', name: 'log', args: [] }],
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'conflicting-performance-options')).toBe(true);
    });

    it('should validate timing values', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'input',
          throttle: -100, // Invalid negative value
        },
        commands: [{ type: 'command', name: 'log', args: [] }],
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-throttle-delay')).toBe(true);
    });

    it('should validate empty commands array', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'click',
        },
        commands: [], // Empty commands array
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'empty-commands-array')).toBe(true);
    });

    it('should validate command count limits', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'change',
        },
        commands: Array.from({length: 150}, (_, i) => ({ name: `command${i}`, args: [] })), // Too many commands
        options: {
          maxCommandCount: 100,
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'too-many-commands')).toBe(true);
    });

    it('should validate filter expressions', () => {
      const validationResult = onFeature.validate({
        event: {
          type: 'keydown',
          filter: 'invalid javascript syntax <<<', // Invalid expression
        },
        commands: [{ type: 'command', name: 'log', args: [] }],
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-filter-expression')).toBe(true);
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await onFeature.initialize({
        event: {} as any, // Invalid event definition
        commands: [],
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
        await onFeature.initialize({
          event: {
            type: `testEvent${i}`,
          },
          commands: [{ type: 'command', name: 'log', args: [`Event ${i}`] }],
        });
      }

      const metrics = onFeature.getPerformanceMetrics();
      
      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
      expect(typeof metrics.totalListeners).toBe('number');
      expect(typeof metrics.totalExecutions).toBe('number');
      expect(typeof metrics.averageExecutionTime).toBe('number');
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createOnFeature();
      expect(context).toBeInstanceOf(TypedOnFeatureImplementation);
      expect(context.name).toBe('onFeature');
      expect(context.category).toBe('Frontend');
    });

    it('should create enhanced on through convenience function', async () => {
      const result = await createEnhancedOn(
        {
          type: 'click',
          target: '.test-button',
        },
        [{ name: 'log', args: ['Clicked!'] }],
        {
          environment: 'frontend',
        }
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pattern Compliance', () => {
    it('should have required enhanced pattern properties', () => {
      expect(onFeature.name).toBe('onFeature');
      expect(onFeature.category).toBe('Frontend');
      expect(onFeature.description).toBeDefined();
      expect(onFeature.inputSchema).toBeDefined();
      expect(onFeature.outputType).toBe('Context');
      expect(onFeature.metadata).toBeDefined();
      expect(onFeature.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = onFeature;
      
      expect(metadata.category).toBe('Frontend');
      expect(metadata.complexity).toBe('complex');
      expect(Array.isArray(metadata.sideEffects)).toBe(true);
      expect(Array.isArray(metadata.dependencies)).toBe(true);
      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);
      expect(metadata.environmentRequirements).toBeDefined();
      expect(metadata.performance).toBeDefined();
    });

    it('should have LLM-compatible documentation', () => {
      const { documentation } = onFeature;
      
      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('events');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle complete event handling workflow', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'submit',
          target: 'form.contact',
          preventDefault: true,
          throttle: 2000,
          filter: 'event.target.checkValidity() && !event.target.classList.contains("submitting")',
        },
        commands: [
          { type: 'command', name: 'addClass', args: ['submitting'] },
          { type: 'command', name: 'log', args: ['Submitting form...'] },
          { type: 'command', name: 'fetch', args: ['/api/contact', 'POST'] },
          { type: 'command', name: 'removeClass', args: ['submitting'] },
          { type: 'command', name: 'showMessage', args: ['Form submitted successfully!'] }
        ],
        context: {
          variables: { 
            apiEndpoint: '/api/contact',
            timeout: 5000,
            retries: 3
          },
        },
        options: {
          enableErrorHandling: true,
          enableEventCapture: true,
          enableAsyncExecution: true,
          maxCommandCount: 20,
        },
        environment: 'frontend',
        debug: true,
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Verify event registration
        const listeners = result.value.events.getListeners('submit');
        expect(listeners.length).toBeGreaterThan(0);

        // Verify listener configuration
        const listener = listeners[0];
        expect(listener.eventType).toBe('submit');
        expect(listener.target).toBe('form.contact');
        expect(listener.options.throttle).toBe(2000);
        expect(listener.options.filter).toContain('checkValidity');

        // Verify command execution capabilities
        const execResult = await result.value.execution.execute(
          [{ name: 'log', args: ['Test execution'] }],
          { me: null }
        );
        expect(execResult).toBeDefined();

        // Verify filtering capabilities
        const filterAdded = result.value.filtering.addFilter(
          'validForm',
          'event.target.checkValidity()'
        );
        expect(filterAdded).toBe(true);

        // Verify performance controls
        if (listeners.length > 0) {
          const listenerId = listeners[0].id;
          const throttleSet = result.value.performance.setThrottleDelay(listenerId, 1500);
          expect(throttleSet).toBe(true);
        }

        // Verify error handling
        const error = new Error('Form validation failed');
        const handled = await result.value.errors.handle(error, { form: 'contact' });
        expect(handled).toBe(true);

        // Verify context state
        expect(result.value.state).toBe('ready');
        expect(result.value.capabilities).toContain('event-listening');
        expect(result.value.capabilities).toContain('performance-optimization');
        expect(result.value.capabilities).toContain('error-handling');
      }
    });

    it('should handle complex keyboard interaction patterns', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'keydown',
          target: 'textarea.editor',
          filter: '(event.ctrlKey || event.metaKey) && event.key === "s"', // Ctrl+S or Cmd+S
          preventDefault: true,
        },
        commands: [
          { type: 'command', name: 'preventDefault', args: [] },
          { type: 'command', name: 'addClass', args: ['saving'] },
          { type: 'command', name: 'autoSave', args: [] },
          { type: 'command', name: 'removeClass', args: ['saving'] },
          { type: 'command', name: 'showNotification', args: ['Document saved'] }
        ],
        context: {
          variables: { autoSaveDelay: 500, maxRetries: 3 },
        },
        options: {
          enableAsyncExecution: true,
          maxCommandCount: 10,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const listeners = result.value.events.getListeners('keydown');
        expect(listeners.length).toBeGreaterThan(0);

        const listener = listeners[0];
        expect(listener.eventType).toBe('keydown');
        expect(listener.options.filter).toContain('ctrlKey');
        expect(listener.commands.length).toBe(5);
      }
    });

    it('should handle high-frequency events with performance optimization', async () => {
      const result = await onFeature.initialize({
        event: {
          type: 'scroll',
          target: 'window',
          throttle: 16, // ~60fps
        },
        commands: [
          { type: 'command', name: 'updateScrollPosition', args: [] },
          { type: 'command', name: 'updateProgressBar', args: [] },
          { type: 'command', name: 'lazyLoadImages', args: [] }
        ],
        options: {
          enableAsyncExecution: true,
        },
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        const listeners = result.value.events.getListeners('scroll');
        expect(listeners.length).toBeGreaterThan(0);

        const listener = listeners[0];
        expect(listener.options.throttle).toBe(16);
        expect(listener.isActive).toBe(true);
        
        // Test performance management
        const throttleAdjusted = result.value.performance.setThrottleDelay(listener.id, 33); // 30fps
        expect(throttleAdjusted).toBe(true);
      }
    });
  });
});

describe('Enhanced On Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedOnImplementation).toBeInstanceOf(TypedOnFeatureImplementation);
    expect(enhancedOnImplementation.name).toBe('onFeature');
  });
});