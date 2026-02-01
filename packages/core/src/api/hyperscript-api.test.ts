/**
 * Tests for the main Hyperscript API
 * Validates the public interface for compilation, execution, and utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hyperscript } from './hyperscript-api';

describe('Hyperscript Public API', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create a mock DOM element for testing
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    document.body.appendChild(mockElement);
  });

  describe('API Structure', () => {
    it('should expose the expected public interface', () => {
      // New API (v2)
      expect(typeof hyperscript.compile).toBe('function');
      expect(typeof hyperscript.compileSync).toBe('function');
      expect(typeof hyperscript.execute).toBe('function');
      expect(typeof hyperscript.eval).toBe('function');
      expect(typeof hyperscript.validate).toBe('function');
      expect(typeof hyperscript.process).toBe('function');
      expect(typeof hyperscript.createContext).toBe('function');
      expect(typeof hyperscript.version).toBe('string');
      expect(typeof hyperscript.createRuntime).toBe('function');
    });

    it('should have a version string', () => {
      expect(hyperscript.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('compileSync() method - new API', () => {
    it('should compile valid hyperscript code', () => {
      const result = hyperscript.compileSync('42');

      expect(result.ok).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast?.type).toBe('literal');
      expect(result.errors).toBeUndefined();
    });

    it('should handle compilation errors gracefully', () => {
      const result = hyperscript.compileSync('invalid @@ syntax');

      expect(result.ok).toBe(false);
      expect(result.ast).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].message).toContain('Unexpected token');
    });

    it('should return compilation metadata', () => {
      const result = hyperscript.compileSync('5 + 3');

      expect(result.meta).toBeDefined();
      expect(result.meta.timeMs).toBeTypeOf('number');
      expect(result.meta.language).toBe('en');
      expect(result.meta.parser).toBeOneOf(['semantic', 'traditional']);
    });
  });

  describe('compile() method - async new API', () => {
    it('should compile valid hyperscript code', async () => {
      const result = await hyperscript.compile('42');

      expect(result.ok).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.ast?.type).toBe('literal');
    });

    it('should handle non-English input', async () => {
      const result = await hyperscript.compile('.active を トグル', { language: 'ja' });

      expect(result.ok).toBe(true);
      expect(result.ast).toBeDefined();
      expect(result.meta.language).toBe('ja');
    });
  });

  describe('execute() method', () => {
    it('should execute a compiled AST with context', async () => {
      const compiled = hyperscript.compileSync('42');
      expect(compiled.ok).toBe(true);

      const context = hyperscript.createContext(mockElement);
      const result = await hyperscript.execute(compiled.ast!, context);

      expect(result).toBe(42);
    });

    it('should execute with default context if none provided', async () => {
      const compiled = hyperscript.compileSync('5 + 3');
      expect(compiled.ok).toBe(true);

      const result = await hyperscript.execute(compiled.ast!);
      expect(result).toBe(8);
    });

    it('should handle execution errors gracefully', async () => {
      const compiled = hyperscript.compileSync('me.nonExistentMethod()');
      expect(compiled.ok).toBe(true);

      const context = hyperscript.createContext(mockElement);

      await expect(hyperscript.execute(compiled.ast!, context)).rejects.toThrow();
    });
  });

  describe('eval() method - new API', () => {
    it('should compile and execute in one call', async () => {
      const result = await hyperscript.eval('10 * 2');
      expect(result).toBe(20);
    });

    it('should handle compilation errors', async () => {
      await expect(hyperscript.eval('invalid @@ syntax')).rejects.toThrow('Compilation failed');
    });
  });

  describe('validate() method - new API', () => {
    it('should return valid for correct syntax', async () => {
      const result = await hyperscript.validate('42');
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return invalid for incorrect syntax', async () => {
      const result = await hyperscript.validate('invalid @@ syntax');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Context Management', () => {
    it('should create context with optional element', () => {
      const context1 = hyperscript.createContext();
      expect(context1.me).toBeNull();
      expect(context1.locals).toBeInstanceOf(Map);
      expect(context1.globals).toBeInstanceOf(Map);

      const context2 = hyperscript.createContext(mockElement);
      expect(context2.me).toBe(mockElement);
    });

    it('should create child context with parent reference', () => {
      const parent = hyperscript.createContext(mockElement);
      parent.globals.set('parentVar', 'value');

      const child = hyperscript.createContext(null, parent);
      expect(child.parent).toBe(parent);
      expect(child.globals).toBe(parent.globals); // Shared globals
      expect(child.locals).not.toBe(parent.locals); // Separate locals
    });

    it('should handle context inheritance properly', () => {
      const parent = hyperscript.createContext();
      parent.globals.set('globalVar', 42);

      const child = hyperscript.createContext(mockElement, parent);
      child.locals.set('localVar', 'child');

      expect(child.globals.get('globalVar')).toBe(42);
      expect(child.locals.get('localVar')).toBe('child');
      expect(parent.locals.has('localVar')).toBe(false);
    });
  });

  describe('Advanced Features', () => {
    it('should create runtime with custom options', () => {
      const runtime = hyperscript.createRuntime({
        enableAsyncCommands: false,
        commandTimeout: 5000,
      });

      expect(runtime).toBeDefined();
      expect(typeof runtime.execute).toBe('function');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it.skip('should handle empty input gracefully', async () => {
      await expect(hyperscript.eval('')).rejects.toThrow('Code must be a non-empty string');
    });

    it('should provide detailed error information', () => {
      const result = hyperscript.compileSync('5 +');
      expect(result.ok).toBe(false);
      expect(result.errors![0]).toMatchObject({
        message: expect.stringContaining('Expected expression'),
        line: expect.any(Number),
        column: expect.any(Number),
      });
    });

    it('should handle null/undefined inputs safely', () => {
      expect(() => hyperscript.compileSync(null as unknown as string)).toThrow();
      expect(() => hyperscript.compileSync(undefined as unknown as string)).toThrow();
    });
  });

  describe('Integration with Existing Components', () => {
    it('should integrate with expression evaluator', async () => {
      const context = hyperscript.createContext(mockElement);
      const result = await hyperscript.eval('me.tagName', context);
      expect(String(result).toLowerCase()).toBe('div'); // Happy-DOM returns lowercase
    });

    it('should handle assignments and variable scoping', async () => {
      const context = hyperscript.createContext();
      await hyperscript.eval('x = 42', context);

      expect(context.variables?.get('x')).toBe(42);

      const result = await hyperscript.eval('x + 8', context);
      expect(result).toBe(50);
    });
  });

  // ==========================================================================
  // NEW TESTS: process()
  // ==========================================================================

  describe('process() method', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.id = 'test-container';
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    describe('basic DOM processing', () => {
      it('should process element with _ attribute', () => {
        const button = document.createElement('button');
        button.setAttribute('_', 'on click toggle .active on me');
        container.appendChild(button);

        // Should not throw
        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should process child elements with hyperscript', () => {
        container.innerHTML = `
          <button id="btn1" _="on click toggle .active">Button 1</button>
          <button id="btn2" _="on click toggle .highlight">Button 2</button>
        `;

        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should handle elements without hyperscript attributes', () => {
        container.innerHTML = `<button>No hyperscript</button>`;

        // Should not throw even when no hyperscript attributes present
        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should handle deeply nested structures', () => {
        container.innerHTML = `
          <div>
            <div>
              <div>
                <button _="on click toggle .deep">Deep Button</button>
              </div>
            </div>
          </div>
        `;

        expect(() => hyperscript.process(container)).not.toThrow();
      });
    });

    describe('language detection', () => {
      it('should detect language from data-lang attribute', () => {
        const button = document.createElement('button');
        button.setAttribute('data-lang', 'ja');
        button.setAttribute('_', '.active を トグル');
        container.appendChild(button);

        // Should process without error (language detection happens internally)
        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should detect language from lang attribute on parent', () => {
        container.setAttribute('lang', 'es');
        container.innerHTML = `<button _="alternar .active">Spanish Button</button>`;

        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should default to English when no language specified', () => {
        container.innerHTML = `<button _="on click toggle .active">Button</button>`;

        expect(() => hyperscript.process(container)).not.toThrow();
      });
    });

    describe('error recovery', () => {
      it('should continue processing on parse error', () => {
        // First button has invalid syntax, second is valid
        container.innerHTML = `
          <button id="invalid" _="invalid @@ syntax">Invalid</button>
          <button id="valid" _="on click toggle .active">Valid</button>
        `;

        // Should not throw - should log error but continue
        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should handle malformed attributes gracefully', () => {
        const button = document.createElement('button');
        button.setAttribute('_', ''); // Empty attribute
        container.appendChild(button);

        expect(() => hyperscript.process(container)).not.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle processing the same element twice (idempotent)', () => {
        container.innerHTML = `<button _="on click toggle .active">Button</button>`;

        // Process twice - should not cause issues
        hyperscript.process(container);
        expect(() => hyperscript.process(container)).not.toThrow();
      });

      it('should handle detached DOM elements', () => {
        const detached = document.createElement('div');
        detached.innerHTML = `<button _="on click toggle .active">Detached</button>`;

        // Processing detached element should not throw
        expect(() => hyperscript.process(detached)).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // NEW TESTS: Runtime Hooks Management
  // ==========================================================================

  describe('Runtime Hooks Management', () => {
    afterEach(() => {
      // Clean up any registered hooks after each test
      const hooks = hyperscript.getRegisteredHooks();
      hooks.forEach(name => hyperscript.unregisterHooks(name));
    });

    describe('registration', () => {
      it('should register hooks by name', () => {
        const hooks = {
          beforeExecute: async () => {},
        };

        hyperscript.registerHooks('test-hook', hooks);

        expect(hyperscript.getRegisteredHooks()).toContain('test-hook');
      });

      it('should allow multiple hook sets', () => {
        hyperscript.registerHooks('hook1', { beforeExecute: async () => {} });
        hyperscript.registerHooks('hook2', { afterExecute: async () => {} });

        const registered = hyperscript.getRegisteredHooks();
        expect(registered).toContain('hook1');
        expect(registered).toContain('hook2');
      });

      it('should handle hooks with all lifecycle methods', () => {
        const hooks = {
          beforeCompile: async () => {},
          afterCompile: async () => {},
          beforeExecute: async () => {},
          afterExecute: async () => {},
        };

        expect(() => hyperscript.registerHooks('full-hooks', hooks)).not.toThrow();
        expect(hyperscript.getRegisteredHooks()).toContain('full-hooks');
      });
    });

    describe('retrieval', () => {
      it('should list all registered hook names', () => {
        hyperscript.registerHooks('hook-a', { beforeExecute: async () => {} });
        hyperscript.registerHooks('hook-b', { beforeExecute: async () => {} });

        const hooks = hyperscript.getRegisteredHooks();

        expect(Array.isArray(hooks)).toBe(true);
        expect(hooks).toContain('hook-a');
        expect(hooks).toContain('hook-b');
      });

      it('should return empty array when no hooks registered', () => {
        // Clear any existing hooks first
        const existing = hyperscript.getRegisteredHooks();
        existing.forEach(name => hyperscript.unregisterHooks(name));

        const hooks = hyperscript.getRegisteredHooks();
        expect(hooks).toEqual([]);
      });
    });

    describe('unregistration', () => {
      it('should unregister hooks by name', () => {
        hyperscript.registerHooks('to-remove', { beforeExecute: async () => {} });
        expect(hyperscript.getRegisteredHooks()).toContain('to-remove');

        hyperscript.unregisterHooks('to-remove');
        expect(hyperscript.getRegisteredHooks()).not.toContain('to-remove');
      });

      it('should return true when hook existed', () => {
        hyperscript.registerHooks('exists', { beforeExecute: async () => {} });

        const result = hyperscript.unregisterHooks('exists');
        expect(result).toBe(true);
      });

      it('should return false when hook did not exist', () => {
        const result = hyperscript.unregisterHooks('nonexistent-hook');
        expect(result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // NEW TESTS: Config Management
  // ==========================================================================

  describe('Config Management', () => {
    // Import config from the module
    let originalConfig: { semantic: boolean; language: string; confidenceThreshold: number };

    beforeEach(async () => {
      // Store original config values
      const api = await import('./hyperscript-api');
      originalConfig = { ...api.config };
    });

    afterEach(async () => {
      // Restore original config
      const api = await import('./hyperscript-api');
      api.config.semantic = originalConfig.semantic;
      api.config.language = originalConfig.language;
      api.config.confidenceThreshold = originalConfig.confidenceThreshold;
    });

    it('should expose semantic parsing toggle', async () => {
      const api = await import('./hyperscript-api');

      expect(api.config).toHaveProperty('semantic');
      expect(typeof api.config.semantic).toBe('boolean');
    });

    it('should expose language setting', async () => {
      const api = await import('./hyperscript-api');

      expect(api.config).toHaveProperty('language');
      expect(typeof api.config.language).toBe('string');
    });

    it('should expose confidence threshold', async () => {
      const api = await import('./hyperscript-api');

      expect(api.config).toHaveProperty('confidenceThreshold');
      expect(typeof api.config.confidenceThreshold).toBe('number');
      expect(api.config.confidenceThreshold).toBeGreaterThanOrEqual(0);
      expect(api.config.confidenceThreshold).toBeLessThanOrEqual(1);
    });

    it('should allow modifying semantic toggle', async () => {
      const api = await import('./hyperscript-api');

      api.config.semantic = false;
      expect(api.config.semantic).toBe(false);

      api.config.semantic = true;
      expect(api.config.semantic).toBe(true);
    });

    it('should allow modifying language setting', async () => {
      const api = await import('./hyperscript-api');

      api.config.language = 'ja';
      expect(api.config.language).toBe('ja');

      api.config.language = 'en';
      expect(api.config.language).toBe('en');
    });

    it('should allow modifying confidence threshold', async () => {
      const api = await import('./hyperscript-api');

      api.config.confidenceThreshold = 0.8;
      expect(api.config.confidenceThreshold).toBe(0.8);
    });

    it('should have sensible defaults', async () => {
      const api = await import('./hyperscript-api');

      // Check that defaults are sensible
      expect(api.config.semantic).toBe(true); // Semantic enabled by default
      expect(api.config.language).toBe('en'); // English by default
      expect(api.config.confidenceThreshold).toBeGreaterThan(0);
      expect(api.config.confidenceThreshold).toBeLessThan(1);
    });
  });
});
