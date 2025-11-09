/**
 * Test suite for ExecutionContext system
 * Following TDD approach - tests first, implementation second
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '@/test-setup';
import { ExecutionContext } from '@types/core';
import { createContext, setContextValue, getContextValue, createChildContext } from './context';

describe('ExecutionContext System', () => {
  let testElement: HTMLElement;
  let context: ExecutionContext;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test Element</div>');
    document.body.appendChild(testElement);
    context = createContext(testElement);
  });

  describe('Context Creation', () => {
    it('should create a context with proper initial values', () => {
      expect(context.me).toBe(testElement);
      expect(context.it).toBe(null);
      expect(context.you).toBe(null);
      expect(context.result).toBe(null);
      expect(context.locals).toBeInstanceOf(Map);
      expect(context.globals).toBeInstanceOf(Map);
      expect(context.parent).toBe(undefined);
    });

    it('should initialize execution flags correctly', () => {
      expect(context.flags.halted).toBe(false);
      expect(context.flags.breaking).toBe(false);
      expect(context.flags.continuing).toBe(false);
      expect(context.flags.returning).toBe(false);
      expect(context.flags.async).toBe(false);
    });

    it('should allow creating context without element', () => {
      const noElementContext = createContext();
      expect(noElementContext.me).toBe(null);
      expect(noElementContext.locals).toBeInstanceOf(Map);
    });
  });

  describe('Context Variable Resolution', () => {
    it('should resolve "me" to current element', () => {
      expect(getContextValue(context, 'me')).toBe(testElement);
    });

    it('should maintain "it" across operations', () => {
      const testValue = { data: 'test' };
      setContextValue(context, 'it', testValue);
      expect(getContextValue(context, 'it')).toBe(testValue);
    });

    it('should handle local variables', () => {
      setContextValue(context, 'localVar', 'localValue');
      expect(getContextValue(context, 'localVar')).toBe('localValue');
      expect(context.locals.get('localVar')).toBe('localValue');
    });

    it('should handle global variables', () => {
      setContextValue(context, 'globalVar', 'globalValue', true);
      expect(getContextValue(context, 'globalVar')).toBe('globalValue');
      expect(context.globals.get('globalVar')).toBe('globalValue');
    });
  });

  describe('Context Scope Chain', () => {
    it('should create child contexts with proper parent linkage', () => {
      const childElement = createTestElement('<span>Child</span>');
      const childContext = createChildContext(context, childElement);

      expect(childContext.parent).toBe(context);
      expect(childContext.me).toBe(childElement);
      expect(childContext.globals).toBe(context.globals); // Shared globals
    });

    it('should resolve variables through scope chain', () => {
      // Set variable in parent
      setContextValue(context, 'parentVar', 'parentValue');

      // Create child context
      const childContext = createChildContext(context);

      // Child should see parent variable
      expect(getContextValue(childContext, 'parentVar')).toBe('parentValue');
    });

    it('should shadow parent variables with local ones', () => {
      // Set variable in parent
      setContextValue(context, 'shadowVar', 'parentValue');

      // Create child and override
      const childContext = createChildContext(context);
      setContextValue(childContext, 'shadowVar', 'childValue');

      expect(getContextValue(childContext, 'shadowVar')).toBe('childValue');
      expect(getContextValue(context, 'shadowVar')).toBe('parentValue');
    });

    it('should maintain proper isolation between sibling contexts', () => {
      const child1 = createChildContext(context);
      const child2 = createChildContext(context);

      setContextValue(child1, 'siblingVar', 'child1Value');
      setContextValue(child2, 'siblingVar', 'child2Value');

      expect(getContextValue(child1, 'siblingVar')).toBe('child1Value');
      expect(getContextValue(child2, 'siblingVar')).toBe('child2Value');
    });
  });

  describe('Context Switching', () => {
    it('should handle context element switching', () => {
      const newElement = createTestElement('<p>New Element</p>');
      context.me = newElement;
      context.you = testElement;

      expect(context.me).toBe(newElement);
      expect(context.you).toBe(testElement);
    });

    it('should handle "it" value updates', () => {
      const initialValue = 'initial';
      const newValue = { complex: 'object' };

      setContextValue(context, 'it', initialValue);
      expect(context.it).toBe(initialValue);

      setContextValue(context, 'it', newValue);
      expect(context.it).toBe(newValue);
    });
  });

  describe('Context Flags Management', () => {
    it('should handle halted flag correctly', () => {
      expect(context.flags.halted).toBe(false);
      context.flags.halted = true;
      expect(context.flags.halted).toBe(true);
    });

    it('should handle control flow flags', () => {
      context.flags.breaking = true;
      expect(context.flags.breaking).toBe(true);
      expect(context.flags.continuing).toBe(false);

      context.flags.breaking = false;
      context.flags.continuing = true;
      expect(context.flags.breaking).toBe(false);
      expect(context.flags.continuing).toBe(true);
    });

    it('should handle async execution flag', () => {
      expect(context.flags.async).toBe(false);
      context.flags.async = true;
      expect(context.flags.async).toBe(true);
    });
  });

  describe('Error Conditions', () => {
    it('should handle undefined variable access gracefully', () => {
      expect(getContextValue(context, 'undefinedVar')).toBe(undefined);
    });

    it('should handle null/undefined context values', () => {
      setContextValue(context, 'nullVar', null);
      setContextValue(context, 'undefinedVar', undefined);

      expect(getContextValue(context, 'nullVar')).toBe(null);
      expect(getContextValue(context, 'undefinedVar')).toBe(undefined);
    });
  });

  describe('Memory Management', () => {
    it('should allow context cleanup', () => {
      setContextValue(context, 'tempVar', 'tempValue');

      // Clear locals
      context.locals.clear();
      expect(getContextValue(context, 'tempVar')).toBe(undefined);
    });

    it('should maintain global variables across context cleanup', () => {
      setContextValue(context, 'globalVar', 'globalValue', true);
      context.locals.clear();

      expect(getContextValue(context, 'globalVar')).toBe('globalValue');
    });
  });
});
