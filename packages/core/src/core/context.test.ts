/**
 * Test suite for ExecutionContext system
 * Following TDD approach - tests first, implementation second
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestElement } from '@/test-setup';
import type { ExecutionContext } from '../types/core';
import {
  createContext,
  setContextValue,
  getContextValue,
  createChildContext,
  getSharedGlobals,
  ensureContext,
  hasContextValue,
  deleteContextValue,
  snapshotContext,
  restoreContext,
  cloneContext,
  mergeContexts,
  getContextVariableNames,
} from './context';

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

  describe('getSharedGlobals', () => {
    it('should return a Map', () => {
      expect(getSharedGlobals()).toBeInstanceOf(Map);
    });

    it('should return the same instance every time', () => {
      expect(getSharedGlobals()).toBe(getSharedGlobals());
    });

    it('should be the default globals for createContext', () => {
      const ctx = createContext();
      expect(ctx.globals).toBe(getSharedGlobals());
    });

    it('should not be used when custom globals are provided', () => {
      const custom = new Map<string, any>();
      const ctx = createContext(null, custom);
      expect(ctx.globals).toBe(custom);
      expect(ctx.globals).not.toBe(getSharedGlobals());
    });
  });

  describe('ensureContext', () => {
    it('should create fresh context when no argument provided', () => {
      const ctx = ensureContext();
      expect(ctx.locals).toBeInstanceOf(Map);
      expect(ctx.globals).toBeInstanceOf(Map);
      expect(ctx.me).toBe(null);
    });

    it('should create fresh context for null input', () => {
      const ctx = ensureContext(null);
      expect(ctx.locals).toBeInstanceOf(Map);
    });

    it('should create fresh context for undefined input', () => {
      const ctx = ensureContext(undefined);
      expect(ctx.locals).toBeInstanceOf(Map);
    });

    it('should pass through complete contexts unchanged', () => {
      // A complete context has locals Map and globals Map
      expect(ensureContext(context)).toBe(context);
    });

    it('should merge partial context with me element', () => {
      const el = createTestElement('<span>Partial</span>');
      const ctx = ensureContext({ me: el });
      expect(ctx.me).toBe(el);
      expect(ctx.locals).toBeInstanceOf(Map);
      expect(ctx.globals).toBeInstanceOf(Map);
    });

    it('should merge partial context with it/you/result values', () => {
      const ctx = ensureContext({ it: 'test-it', you: 'test-you', result: 42 });
      expect(ctx.it).toBe('test-it');
      expect(ctx.you).toBe('test-you');
      expect(ctx.result).toBe(42);
    });

    it('should ignore non-Element me values', () => {
      const ctx = ensureContext({ me: 'not-an-element' });
      expect(ctx.me).toBe(null);
    });
  });

  describe('hasContextValue', () => {
    it('should return true for special variables', () => {
      expect(hasContextValue(context, 'me')).toBe(true);
      expect(hasContextValue(context, 'it')).toBe(true);
      expect(hasContextValue(context, 'you')).toBe(true);
      expect(hasContextValue(context, 'result')).toBe(true);
    });

    it('should return true for existing local variable', () => {
      setContextValue(context, 'localVar', 'value');
      expect(hasContextValue(context, 'localVar')).toBe(true);
    });

    it('should return false for non-existent variable', () => {
      expect(hasContextValue(context, 'doesNotExist')).toBe(false);
    });

    it('should check parent scope chain', () => {
      setContextValue(context, 'parentVar', 'value');
      const child = createChildContext(context);
      expect(hasContextValue(child, 'parentVar')).toBe(true);
    });

    it('should check global scope', () => {
      setContextValue(context, 'globalVar', 'value', true);
      const child = createChildContext(context);
      expect(hasContextValue(child, 'globalVar')).toBe(true);
    });
  });

  describe('deleteContextValue', () => {
    it('should not delete special variables', () => {
      expect(deleteContextValue(context, 'me')).toBe(false);
      expect(deleteContextValue(context, 'it')).toBe(false);
      expect(deleteContextValue(context, 'you')).toBe(false);
      expect(deleteContextValue(context, 'result')).toBe(false);
    });

    it('should delete local variable', () => {
      setContextValue(context, 'localVar', 'value');
      expect(deleteContextValue(context, 'localVar')).toBe(true);
      expect(getContextValue(context, 'localVar')).toBe(undefined);
    });

    it('should delete global variable', () => {
      setContextValue(context, 'globalVar', 'value', true);
      expect(deleteContextValue(context, 'globalVar')).toBe(true);
      expect(getContextValue(context, 'globalVar')).toBe(undefined);
    });

    it('should return false for non-existent variable', () => {
      expect(deleteContextValue(context, 'doesNotExist')).toBe(false);
    });
  });

  describe('snapshotContext', () => {
    it('should capture special variables', () => {
      context.it = 'test-it';
      context.result = 42;
      const snap = snapshotContext(context);
      expect(snap.me).toBe(testElement);
      expect(snap.it).toBe('test-it');
      expect(snap.result).toBe(42);
    });

    it('should serialize locals to plain object', () => {
      setContextValue(context, 'x', 1);
      setContextValue(context, 'y', 2);
      const snap = snapshotContext(context);
      expect(snap.locals).toEqual({ x: 1, y: 2 });
    });

    it('should serialize globals to plain object', () => {
      setContextValue(context, 'g', 'global', true);
      const snap = snapshotContext(context);
      expect(snap.globals.g).toBe('global');
    });
  });

  describe('restoreContext', () => {
    it('should restore special variables', () => {
      const snap = { me: null, it: 'restored', you: null, result: 99 };
      restoreContext(context, snap);
      expect(context.it).toBe('restored');
      expect(context.result).toBe(99);
    });

    it('should restore locals from snapshot', () => {
      setContextValue(context, 'old', 'value');
      restoreContext(context, { locals: { newVar: 'newValue' } });
      expect(context.locals.get('newVar')).toBe('newValue');
      expect(context.locals.has('old')).toBe(false);
    });

    it('should non-destructively update globals', () => {
      // Set up: another context sharing the same globals
      const other = createContext(null, context.globals);
      setContextValue(context, 'shared', 'original', true);
      setContextValue(context, 'toRemove', 'gone', true);

      // Restore with only 'shared' — 'toRemove' should be deleted
      restoreContext(context, { globals: { shared: 'updated' } });

      expect(context.globals.get('shared')).toBe('updated');
      expect(context.globals.has('toRemove')).toBe(false);
      // Other context sees the same changes (shared reference)
      expect(other.globals.get('shared')).toBe('updated');
    });
  });

  describe('cloneContext', () => {
    it('should create independent locals', () => {
      setContextValue(context, 'x', 1);
      const cloned = cloneContext(context);
      setContextValue(cloned, 'x', 99);
      expect(getContextValue(context, 'x')).toBe(1);
      expect(getContextValue(cloned, 'x')).toBe(99);
    });

    it('should share globals reference', () => {
      const cloned = cloneContext(context);
      expect(cloned.globals).toBe(context.globals);
    });

    it('should copy special variables', () => {
      context.it = 'test';
      context.result = 42;
      const cloned = cloneContext(context);
      expect(cloned.it).toBe('test');
      expect(cloned.result).toBe(42);
    });

    it('should preserve parent reference', () => {
      const parent = createContext();
      const child = createChildContext(parent);
      const cloned = cloneContext(child);
      expect(cloned.parent).toBe(parent);
    });
  });

  describe('mergeContexts', () => {
    it('should merge locals from source to target', () => {
      const source = createContext();
      setContextValue(source, 'a', 1);
      setContextValue(source, 'b', 2);
      mergeContexts(context, source);
      expect(getContextValue(context, 'a')).toBe(1);
      expect(getContextValue(context, 'b')).toBe(2);
    });

    it('should let source locals overwrite target locals', () => {
      setContextValue(context, 'x', 'original');
      const source = createContext();
      setContextValue(source, 'x', 'overwritten');
      mergeContexts(context, source);
      expect(getContextValue(context, 'x')).toBe('overwritten');
    });

    it('should update special variables from source', () => {
      const source = createContext();
      source.it = 'merged-it';
      source.result = 'merged-result';
      mergeContexts(context, source);
      expect(context.it).toBe('merged-it');
      expect(context.result).toBe('merged-result');
    });

    it('should propagate null special vars', () => {
      context.it = 'not-null';
      const source = createContext();
      // source.it is null by default
      mergeContexts(context, source);
      // null is a valid value, but mergeContexts checks !== undefined
      // source.it is null (not undefined), so it should NOT be merged
      // Actually source.it starts as null, which !== undefined, so it DOES merge
      expect(context.it).toBe(null);
    });

    it('should not modify source context', () => {
      const source = createContext();
      setContextValue(source, 'srcVar', 'srcVal');
      setContextValue(context, 'tgtVar', 'tgtVal');
      mergeContexts(context, source);
      expect(source.locals.has('tgtVar')).toBe(false);
    });
  });

  describe('getContextVariableNames', () => {
    it('should include special variable names', () => {
      const names = getContextVariableNames(context);
      expect(names).toContain('me');
      expect(names).toContain('it');
      expect(names).toContain('you');
      expect(names).toContain('result');
    });

    it('should include local variable names', () => {
      setContextValue(context, 'localA', 1);
      setContextValue(context, 'localB', 2);
      const names = getContextVariableNames(context);
      expect(names).toContain('localA');
      expect(names).toContain('localB');
    });

    it('should include global variable names', () => {
      setContextValue(context, 'globalG', 'g', true);
      const names = getContextVariableNames(context);
      expect(names).toContain('globalG');
    });

    it('should include parent variable names', () => {
      setContextValue(context, 'parentVar', 'val');
      const child = createChildContext(context);
      const names = getContextVariableNames(child);
      expect(names).toContain('parentVar');
    });

    it('should return sorted array', () => {
      setContextValue(context, 'zebra', 1);
      setContextValue(context, 'apple', 2);
      const names = getContextVariableNames(context);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    it('should deduplicate variable names', () => {
      setContextValue(context, 'dup', 'local');
      setContextValue(context, 'dup', 'global', true);
      const names = getContextVariableNames(context);
      const dupCount = names.filter(n => n === 'dup').length;
      expect(dupCount).toBe(1);
    });
  });
});
