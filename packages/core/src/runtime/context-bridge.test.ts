/**
 * Context Bridge Integration Tests
 * Verifies TypedExecutionContext <-> ExecutionContext conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextBridge } from './command-adapter';
import type { ExecutionContext } from '../types/core';

describe('ContextBridge', () => {
  let mockElement: HTMLElement;
  let baseContext: ExecutionContext;

  beforeEach(() => {
    // Create mock DOM element
    mockElement = {
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as HTMLElement;

    // Create base execution context
    baseContext = {
      me: mockElement,
      it: 'test-value',
      you: null,
      result: undefined,
      event: undefined,
      variables: new Map([['testVar', 'testValue']]),
      locals: new Map([['localVar', 'localValue']]),
      globals: new Map([['globalVar', 'globalValue']]),
      events: new Map(),
      meta: { testMeta: 'metaValue' },
    };
  });

  describe('toTyped conversion', () => {
    it.skip('should convert ExecutionContext to TypedExecutionContext', () => {
      const typedContext = ContextBridge.toTyped(baseContext);

      // Check core properties
      expect(typedContext.me).toBe(mockElement);
      expect(typedContext.it).toBe('test-value');
      expect(typedContext.you).toBe(null);
      expect(typedContext.result).toBe(undefined);
      expect(typedContext.event).toBe(undefined);

      // Check variable storage
      expect(typedContext.variables!).toBe(baseContext.variables);
      expect(typedContext.locals).toBe(baseContext.locals);
      expect(typedContext.globals).toBe(baseContext.globals);

      // Check runtime state
      expect(typedContext.events).toBe(baseContext.events);
      expect(typedContext.meta!).toBe(baseContext.meta);

      // Check enhanced features
      expect(typedContext.errors).toEqual([]);
      expect(typedContext.commandHistory).toEqual([]);
      expect(typedContext.validationMode).toBe('strict');
    });

    it('should handle missing optional properties', () => {
      const minimalContext: ExecutionContext = {
        me: mockElement,
        it: null,
        you: null,
        result: undefined,
        event: undefined,
      };

      const typedContext = ContextBridge.toTyped(minimalContext);

      expect(typedContext.variables!).toEqual(new Map());
      expect(typedContext.locals).toEqual(new Map());
      expect(typedContext.globals).toEqual(new Map());
      expect(typedContext.meta!).toEqual({});
      expect(typedContext.events).toBe(undefined);
    });
  });

  describe('fromTyped conversion', () => {
    it('should update ExecutionContext from TypedExecutionContext', () => {
      const typedContext = ContextBridge.toTyped(baseContext);

      // Modify typed context
      typedContext.result = 'new-result';
      typedContext.it = 'modified-it';
      typedContext.variables!.set('newVar', 'newValue');
      typedContext.meta!.newMeta = 'newMetaValue';

      const updatedContext = ContextBridge.fromTyped(typedContext, baseContext);

      expect(updatedContext.result).toBe('new-result');
      expect(updatedContext.it).toBe('modified-it');
      expect(updatedContext.variables!.get('newVar')).toBe('newValue');
      expect(updatedContext.meta!.newMeta).toBe('newMetaValue');

      // Original references should be preserved where appropriate
      expect(updatedContext.me).toBe(mockElement);
    });

    it('should preserve original context structure', () => {
      const typedContext = ContextBridge.toTyped(baseContext);
      const updatedContext = ContextBridge.fromTyped(typedContext, baseContext);

      // Should have all original properties plus any modifications
      expect(Object.keys(updatedContext)).toContain('me');
      expect(Object.keys(updatedContext)).toContain('it');
      expect(Object.keys(updatedContext)).toContain('variables');
      expect(Object.keys(updatedContext)).toContain('meta');
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain data integrity through round-trip conversion', () => {
      const typedContext = ContextBridge.toTyped(baseContext);
      const backToOriginal = ContextBridge.fromTyped(typedContext, baseContext);

      expect(backToOriginal.me).toBe(baseContext.me);
      expect(backToOriginal.it).toBe(baseContext.it);
      expect(backToOriginal.variables).toBe(baseContext.variables);
      expect(backToOriginal.locals).toBe(baseContext.locals);
      expect(backToOriginal.globals).toBe(baseContext.globals);
      expect(backToOriginal.meta).toBe(baseContext.meta);
    });

    it.skip('should handle context modifications during round-trip', () => {
      const typedContext = ContextBridge.toTyped(baseContext);

      // Simulate command execution modifying context
      typedContext.result = { status: 'success', data: 'command-result' };
      typedContext.errors.push('warning: test warning');
      typedContext.commandHistory.push('hide .example');

      const finalContext = ContextBridge.fromTyped(typedContext, baseContext);

      expect(finalContext.result).toEqual({ status: 'success', data: 'command-result' });
      // Enhanced properties don't need to be copied back to ExecutionContext
      expect(finalContext).not.toHaveProperty('errors');
      expect(finalContext).not.toHaveProperty('commandHistory');
    });
  });

  describe('enhanced features integration', () => {
    it.skip('should provide enhanced context features for typed commands', () => {
      const typedContext = ContextBridge.toTyped(baseContext);

      // Enhanced features should be available
      expect(Array.isArray(typedContext.errors)).toBe(true);
      expect(Array.isArray(typedContext.commandHistory)).toBe(true);
      expect(typeof typedContext.validationMode).toBe('string');

      // Should be mutable for command use
      typedContext.errors.push('test error');
      typedContext.commandHistory.push('test command');

      expect(typedContext.errors).toContain('test error');
      expect(typedContext.commandHistory).toContain('test command');
    });

    it('should support different validation modes', () => {
      const typedContext = ContextBridge.toTyped(baseContext);

      expect(typedContext.validationMode).toBe('strict');

      typedContext.validationMode = 'lenient';
      expect(typedContext.validationMode).toBe('lenient');
    });
  });

  describe('error handling', () => {
    it('should handle null/undefined contexts gracefully', () => {
      const nullContext = {
        me: null,
        it: null,
        you: null,
        result: undefined,
        event: undefined,
      } as ExecutionContext;

      const typedContext = ContextBridge.toTyped(nullContext);

      expect(typedContext.me).toBe(null);
      expect(typedContext.it).toBe(null);
      expect(typedContext.variables!).toEqual(new Map());
    });

    it('should handle context with missing properties', () => {
      const partialContext = {
        me: mockElement,
        it: 'test',
      } as ExecutionContext;

      const typedContext = ContextBridge.toTyped(partialContext);

      expect(typedContext.me).toBe(mockElement);
      expect(typedContext.it).toBe('test');
      expect(typedContext.you).toBe(undefined);
      expect(typedContext.result).toBe(undefined);
    });
  });
});
