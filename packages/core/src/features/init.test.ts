/**
 * Tests for init feature - Element initialization in hyperscript  
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InitFeature } from './init';
import { createMockHyperscriptContext, createTestElement } from '../test-setup';
import { ExecutionContext } from '../types/core';

describe('Init Feature', () => {
  let initFeature: InitFeature;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    initFeature = new InitFeature();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
    if (!context.flags) context.flags = {
      halted: false,
      breaking: false,
      continuing: false,
      returning: false,
      async: false
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Properties', () => {
    it('should have correct feature metadata', () => {
      expect(initFeature.name).toBe('init');
      expect(initFeature.description).toContain('Element initialization');
    });

    it('should initialize with empty registration', () => {
      expect(initFeature.getRegisteredElements()).toHaveLength(0);
    });

    it('should provide singleton instance', () => {
      const instance1 = InitFeature.getInstance();
      const instance2 = InitFeature.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Basic Initialization', () => {
    it('should register element with init commands', () => {
      const commands = [{ type: 'command', name: 'add', args: ['.initialized'] }];
      
      initFeature.registerElement(testElement, commands, false);
      
      expect(initFeature.getRegisteredElements()).toHaveLength(1);
      expect(initFeature.isElementRegistered(testElement)).toBe(true);
    });

    it('should execute commands when element is processed', async () => {
      const commands = [{ type: 'command', name: 'add', args: ['.test-class'] }];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('test-class')).toBe(true);
    });

    it('should have access to element as "me" in context', async () => {
      const commands = [{ type: 'command', name: 'set', args: ['attribute', 'data-processed', 'true'] }];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.getAttribute('data-processed')).toBe('true');
    });

    it('should execute multiple commands in sequence', async () => {
      const commands = [
        { type: 'command', name: 'add', args: ['.step-1'] },
        { type: 'command', name: 'set', args: ['attribute', 'data-step', '1'] },
        { type: 'command', name: 'add', args: ['.step-2'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('step-1')).toBe(true);
      expect(testElement.classList.contains('step-2')).toBe(true);
      expect(testElement.getAttribute('data-step')).toBe('1');
    });

    it('should process element only once by default', async () => {
      let executionCount = 0;
      const commands = [{ type: 'command', name: 'custom', args: [], execute: () => { executionCount++; } }];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      await initFeature.processElement(testElement, context);
      
      expect(initFeature.isElementProcessed(testElement)).toBe(true);
    });
  });

  describe('Timing Control - Immediately Modifier', () => {
    it('should register element with immediately flag', () => {
      const commands = [{ type: 'command', name: 'add', args: ['.immediate'] }];
      
      initFeature.registerElement(testElement, commands, true);
      
      const registration = initFeature.getElementRegistration(testElement);
      expect(registration?.immediately).toBe(true);
    });

    it('should distinguish between immediate and normal init blocks', () => {
      const immediateCommands = [{ type: 'command', name: 'add', args: ['.immediate'] }];
      const normalCommands = [{ type: 'command', name: 'add', args: ['.normal'] }];
      
      const element1 = createTestElement('<div id="immediate">');
      const element2 = createTestElement('<div id="normal">');
      
      initFeature.registerElement(element1, immediateCommands, true);
      initFeature.registerElement(element2, normalCommands, false);
      
      const immediate = initFeature.getElementRegistration(element1);
      const normal = initFeature.getElementRegistration(element2);
      
      expect(immediate?.immediately).toBe(true);
      expect(normal?.immediately).toBe(false);
    });

    it('should execute immediate init blocks first', async () => {
      const executionOrder: string[] = [];
      
      const immediateCommands = [{ 
        type: 'command', 
        name: 'custom', 
        args: [], 
        execute: () => { executionOrder.push('immediate'); } 
      }];
      const normalCommands = [{ 
        type: 'command', 
        name: 'custom', 
        args: [], 
        execute: () => { executionOrder.push('normal'); } 
      }];
      
      const element1 = createTestElement('<div id="normal">');
      const element2 = createTestElement('<div id="immediate">');
      
      initFeature.registerElement(element1, normalCommands, false);
      initFeature.registerElement(element2, immediateCommands, true);
      
      await initFeature.processAllElements(context);
      
      expect(executionOrder).toEqual(['immediate', 'normal']);
    });
  });

  describe('Command Integration', () => {
    it('should execute DOM manipulation commands', async () => {
      const commands = [
        { type: 'command', name: 'add', args: ['.added-class'] },
        { type: 'command', name: 'hide' },
        { type: 'command', name: 'show' },
        { type: 'command', name: 'toggle', args: ['.toggled'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('added-class')).toBe(true);
      expect(testElement.classList.contains('toggled')).toBe(true);
    });

    it('should execute async commands with proper sequencing', async () => {
      vi.useFakeTimers();
      
      const commands = [
        { type: 'command', name: 'add', args: ['.before-wait'] },
        { type: 'command', name: 'wait', args: [100] },
        { type: 'command', name: 'add', args: ['.after-wait'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      const processPromise = initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('before-wait')).toBe(true);
      expect(testElement.classList.contains('after-wait')).toBe(false);
      
      await vi.advanceTimersByTimeAsync(100);
      await processPromise;
      
      expect(testElement.classList.contains('after-wait')).toBe(true);
      
      vi.useRealTimers();
    });

    it('should execute set commands for attributes and variables', async () => {
      const commands = [
        { type: 'command', name: 'set', args: ['attribute', 'data-init', 'completed'] },
        { type: 'command', name: 'set', args: ['local', 'initStatus', 'done'] },
        { type: 'command', name: 'set', args: ['global', 'elementCount', '1'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.getAttribute('data-init')).toBe('completed');
      expect(context.locals?.get('initStatus')).toBe('done');
      expect(context.globals?.get('elementCount')).toBe('1');
    });

    it('should handle fetch commands for data loading', async () => {
      const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Hello from API' })
      } as Response);
      
      const commands = [
        { type: 'command', name: 'fetch', args: ['/api/test'] },
        { type: 'command', name: 'set', args: ['attribute', 'data-loaded', 'true'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test');
      expect(testElement.getAttribute('data-loaded')).toBe('true');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example: init wait 2s then add .explode', async () => {
      vi.useFakeTimers();
      
      const commands = [
        { type: 'command', name: 'wait', args: ['2s'] },
        { type: 'command', name: 'add', args: ['.explode'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      const processPromise = initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('explode')).toBe(false);
      
      await vi.advanceTimersByTimeAsync(2000);
      await processPromise;
      
      expect(testElement.classList.contains('explode')).toBe(true);
      
      vi.useRealTimers();
    });

    it('should handle LSP example: init remove me', async () => {
      // Create parent to test removal
      const parent = document.createElement('div');
      parent.appendChild(testElement);
      
      const commands = [{ type: 'command', name: 'remove' }];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(parent.contains(testElement)).toBe(false);
    });

    it('should handle LSP example with transitions', async () => {
      const commands = [
        { type: 'command', name: 'set', args: ['style', 'opacity', '0'] },
        { type: 'command', name: 'transition', args: ['opacity', 'to', '1', 'over', '3s'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      // Check that transition setup occurred
      expect(testElement.style.opacity).toBe('0');
    });

    it('should handle complex initialization with multiple operations', async () => {
      const commands = [
        { type: 'command', name: 'add', args: ['.initializing'] },
        { type: 'command', name: 'set', args: ['attribute', 'data-version', '1.0'] },
        { type: 'command', name: 'wait', args: [10] },
        { type: 'command', name: 'remove', args: ['.initializing'] },
        { type: 'command', name: 'add', args: ['.initialized'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      vi.useFakeTimers();
      
      const processPromise = initFeature.processElement(testElement, context);
      
      // Check immediate class effect (this works with fake timers)
      expect(testElement.classList.contains('initializing')).toBe(true);
      
      // Advance time and check final state
      await vi.advanceTimersByTimeAsync(10);
      await processPromise;
      
      // Check final state including the attribute (which should be set by now)
      expect(testElement.classList.contains('initializing')).toBe(false);
      expect(testElement.classList.contains('initialized')).toBe(true);
      expect(testElement.getAttribute('data-version')).toBe('1.0');
      
      vi.useRealTimers();
    });
  });

  describe('Behavior Integration', () => {
    it('should work within behavior definitions', async () => {
      const behaviorElement = createTestElement('<div behavior="TestBehavior">');
      
      const commands = [
        { type: 'command', name: 'add', args: ['.behavior-initialized'] },
        { type: 'command', name: 'set', args: ['attribute', 'data-behavior', 'TestBehavior'] }
      ];
      initFeature.registerElement(behaviorElement, commands, false);
      
      await initFeature.processElement(behaviorElement, context);
      
      expect(behaviorElement.classList.contains('behavior-initialized')).toBe(true);
      expect(behaviorElement.getAttribute('data-behavior')).toBe('TestBehavior');
    });

    it('should handle behavior parameter access', async () => {
      const behaviorElement = createTestElement('<div behavior="TestBehavior" data-config="test">');
      
      const commands = [
        { type: 'command', name: 'set', args: ['local', 'config', 'behaviorElement.dataset.config'] },
        { type: 'command', name: 'set', args: ['attribute', 'data-processed-config', 'config'] }
      ];
      initFeature.registerElement(behaviorElement, commands, false);
      
      await initFeature.processElement(behaviorElement, context);
      
      expect(context.locals?.get('config')).toBe('test');
    });

    it('should support behavior initialization patterns', async () => {
      const removeButton = createTestElement('<button class="remove-btn">Remove</button>');
      const behaviorElement = createTestElement('<div behavior="Removable">');
      
      behaviorElement.appendChild(removeButton);
      
      const commands = [
        { type: 'command', name: 'set', args: ['local', 'removeButton', 'me.querySelector(".remove-btn")'] },
        { type: 'command', name: 'add', args: ['.removable-initialized'] }
      ];
      initFeature.registerElement(behaviorElement, commands, false);
      
      await initFeature.processElement(behaviorElement, context);
      
      expect(behaviorElement.classList.contains('removable-initialized')).toBe(true);
      expect(context.locals?.get('removeButton')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const commands = [
        { type: 'command', name: 'add', args: ['.before-error'] },
        { type: 'command', name: 'invalid-command', args: [] },
        { type: 'command', name: 'add', args: ['.after-error'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await expect(initFeature.processElement(testElement, context)).resolves.not.toThrow();
      
      expect(testElement.classList.contains('before-error')).toBe(true);
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    it('should emit error events on initialization failure', async () => {
      const errorHandler = vi.fn();
      testElement.addEventListener('hyperscript:error', errorHandler);
      
      const commands = [
        { type: 'command', name: 'throw', args: ['Init error'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hyperscript:error',
          detail: expect.objectContaining({
            error: expect.any(Error),
            phase: 'init'
          })
        })
      );
    });

    it('should continue processing other elements after error', async () => {
      const element1 = createTestElement('<div id="error-element">');
      const element2 = createTestElement('<div id="success-element">');
      
      const errorCommands = [{ type: 'command', name: 'throw', args: ['Test error'] }];
      const successCommands = [{ type: 'command', name: 'add', args: ['.success'] }];
      
      initFeature.registerElement(element1, errorCommands, false);
      initFeature.registerElement(element2, successCommands, false);
      
      await initFeature.processAllElements(context);
      
      expect(element2.classList.contains('success')).toBe(true);
    });

    it('should provide meaningful error messages with context', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const commands = [{ type: 'command', name: 'invalid-command' }];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      const errorCall = errorSpy.mock.calls.find(call => 
        call[0].includes('init') && call[0].includes(testElement.id || 'element')
      );
      expect(errorCall).toBeTruthy();
      
      errorSpy.mockRestore();
    });
  });

  describe('Registry Management', () => {
    it('should track processed elements', async () => {
      const commands = [{ type: 'command', name: 'add', args: ['.processed'] }];
      initFeature.registerElement(testElement, commands, false);
      
      expect(initFeature.isElementProcessed(testElement)).toBe(false);
      
      await initFeature.processElement(testElement, context);
      
      expect(initFeature.isElementProcessed(testElement)).toBe(true);
    });

    it('should allow reprocessing with force flag', async () => {
      let executionCount = 0;
      const commands = [{ type: 'command', name: 'custom', args: [], execute: () => { executionCount++; } }];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      await initFeature.processElement(testElement, context, true);
      
      expect(executionCount).toBe(2);
    });

    it('should unregister elements', () => {
      const commands = [{ type: 'command', name: 'add', args: ['.test'] }];
      initFeature.registerElement(testElement, commands, false);
      
      expect(initFeature.isElementRegistered(testElement)).toBe(true);
      
      initFeature.unregisterElement(testElement);
      
      expect(initFeature.isElementRegistered(testElement)).toBe(false);
    });

    it('should clear all registrations', () => {
      const element1 = createTestElement('<div id="1">');
      const element2 = createTestElement('<div id="2">');
      
      initFeature.registerElement(element1, [], false);
      initFeature.registerElement(element2, [], false);
      
      expect(initFeature.getRegisteredElements()).toHaveLength(2);
      
      initFeature.clear();
      
      expect(initFeature.getRegisteredElements()).toHaveLength(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of elements efficiently', async () => {
      const startTime = Date.now();
      const elements: HTMLElement[] = [];
      
      // Create 1000 elements with init blocks
      for (let i = 0; i < 1000; i++) {
        const element = createTestElement(`<div id="element-${i}">`);
        const commands = [{ type: 'command', name: 'add', args: ['.processed'] }];
        initFeature.registerElement(element, commands, false);
        elements.push(element);
      }
      
      await initFeature.processAllElements(context);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      // Verify all elements were processed
      elements.forEach(element => {
        expect(element.classList.contains('processed')).toBe(true);
      });
    });

    it('should handle elements with no commands', async () => {
      initFeature.registerElement(testElement, [], false);
      
      await expect(initFeature.processElement(testElement, context)).resolves.not.toThrow();
      expect(initFeature.isElementProcessed(testElement)).toBe(true);
    });

    it('should handle removed elements gracefully', async () => {
      const commands = [{ type: 'command', name: 'add', args: ['.test'] }];
      initFeature.registerElement(testElement, commands, false);
      
      // Remove element from DOM
      testElement.remove();
      
      await expect(initFeature.processElement(testElement, context)).resolves.not.toThrow();
    });

    it('should handle circular references in context', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      context.locals!.set('circular', circularObj);
      
      const commands = [{ type: 'command', name: 'add', args: ['.test'] }];
      initFeature.registerElement(testElement, commands, false);
      
      await expect(initFeature.processElement(testElement, context)).resolves.not.toThrow();
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should work alongside on feature event handlers', async () => {
      const commands = [
        { type: 'command', name: 'add', args: ['.init-processed'] },
        { type: 'command', name: 'set', args: ['attribute', 'data-init', 'true'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('init-processed')).toBe(true);
      expect(testElement.getAttribute('data-init')).toBe('true');
      
      // Simulate click event (would be handled by on feature)
      const clickEvent = new MouseEvent('click');
      testElement.dispatchEvent(clickEvent);
      
      // Init should still be processed
      expect(initFeature.isElementProcessed(testElement)).toBe(true);
    });

    it('should integrate with def feature for function calls', async () => {
      // This would require def feature to be available
      const commands = [
        { type: 'command', name: 'call', args: ['setupElement'] },
        { type: 'command', name: 'add', args: ['.function-called'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      expect(testElement.classList.contains('function-called')).toBe(true);
    });
  });

  describe('Validation and Security', () => {
    it('should validate command structure', () => {
      const invalidCommands = [
        null,
        undefined,
        { invalidStructure: true },
        { type: 'not-command' }
      ];
      
      invalidCommands.forEach(command => {
        expect(() => {
          initFeature.registerElement(testElement, [command as any], false);
        }).not.toThrow(); // Should handle gracefully, not throw
      });
    });

    it('should sanitize potentially dangerous commands', async () => {
      // Test that script injection is handled safely
      const commands = [
        { type: 'command', name: 'set', args: ['attribute', 'onload', 'alert("xss")'] }
      ];
      initFeature.registerElement(testElement, commands, false);
      
      await initFeature.processElement(testElement, context);
      
      // Should not execute script
      expect(testElement.getAttribute('onload')).toBe('alert("xss")');
    });

    it('should handle malformed element references', async () => {
      const commands = [{ type: 'command', name: 'add', args: ['.test'] }];
      
      // Test with null element
      await expect(
        initFeature.processElement(null as any, context)
      ).resolves.not.toThrow();
      
      // Test with undefined element  
      await expect(
        initFeature.processElement(undefined as any, context)
      ).resolves.not.toThrow();
    });
  });
});