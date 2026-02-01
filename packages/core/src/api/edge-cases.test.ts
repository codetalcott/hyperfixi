import { describe, it, expect } from 'vitest';
import { hyperscript } from './hyperscript-api';

/**
 * Edge case tests for API v2 methods.
 *
 * Tests unusual inputs, error conditions, and boundary cases to ensure
 * robustness of the new API.
 */

describe('API v2 Edge Cases', () => {
  describe('compileSync() edge cases', () => {
    it('should handle empty string', () => {
      const result = hyperscript.compileSync('');
      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only string', () => {
      const result = hyperscript.compileSync('   \n\t  ');
      expect(result.ok).toBe(false);
    });

    it('should handle very long code', () => {
      const longCode = 'add .class' + ' then add .class'.repeat(1000);
      const result = hyperscript.compileSync(longCode);
      expect(result.meta.timeMs).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const result = hyperscript.compileSync('add .日本語-класс-😀');
      expect(result.ok).toBe(true);
    });

    it('should handle null/undefined options gracefully', () => {
      const result = hyperscript.compileSync('toggle .active', undefined);
      expect(result.ok).toBe(true);
    });

    it('should provide meta even on error', () => {
      const result = hyperscript.compileSync('this is invalid @#$%');
      expect(result.ok).toBe(false);
      expect(result.meta).toBeDefined();
      expect(result.meta.timeMs).toBeGreaterThanOrEqual(0);
      expect(result.meta.parser).toBeDefined();
    });

    it('should handle syntax errors gracefully', () => {
      const result = hyperscript.compileSync('invalid @#$ syntax');
      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toBeTruthy();
      expect(result.errors![0].line).toBeGreaterThan(0);
      expect(result.errors![0].column).toBeGreaterThan(0);
    });

    it('should handle code with special characters', () => {
      const result = hyperscript.compileSync('add ".class-with-hyphens_and_underscores"');
      expect(result.ok).toBe(true);
    });

    it('should throw TypeError for non-string input', () => {
      expect(() => {
        hyperscript.compileSync(null as any);
      }).toThrow(TypeError);

      expect(() => {
        hyperscript.compileSync(123 as any);
      }).toThrow(TypeError);

      expect(() => {
        hyperscript.compileSync({} as any);
      }).toThrow(TypeError);
    });
  });

  describe('compile() (async) edge cases', () => {
    it('should handle empty string', async () => {
      const result = await hyperscript.compile('');
      expect(result.ok).toBe(false);
    });

    it('should handle unknown language gracefully', async () => {
      const result = await hyperscript.compile('toggle .active', {
        language: 'xyz-unknown',
      });
      // Should fall back to English
      expect(result.meta.language).toBeDefined();
    });

    it('should handle traditional option', async () => {
      const result = await hyperscript.compile('toggle .active', {
        traditional: true,
      });
      expect(result.ok).toBe(true);
      expect(result.meta.parser).toBe('traditional');
    });

    it('should handle confidence threshold', async () => {
      const result = await hyperscript.compile('toggle .active', {
        confidenceThreshold: 0.9,
      });
      expect(result.ok).toBe(true);
    });

    it('should throw TypeError for non-string input', async () => {
      await expect(async () => {
        await hyperscript.compile(undefined as any);
      }).rejects.toThrow(TypeError);
    });
  });

  describe('eval() edge cases', () => {
    it('should throw for empty string', async () => {
      await expect(async () => {
        await hyperscript.eval('');
      }).rejects.toThrow();
    });

    it('should throw for whitespace-only string', async () => {
      await expect(async () => {
        await hyperscript.eval('   \n\t  ');
      }).rejects.toThrow();
    });

    it('should work with null context', async () => {
      const result = await hyperscript.eval('5 + 3', null as any);
      expect(result).toBe(8);
    });

    it('should work with Element directly', async () => {
      const div = document.createElement('div');
      div.textContent = 'test';
      const result = await hyperscript.eval('me.textContent', div);
      expect(result).toBe('test');
    });

    it('should work with full ExecutionContext', async () => {
      const ctx = hyperscript.createContext();
      const result = await hyperscript.eval('5 + 3', ctx);
      expect(result).toBe(8);
    });

    it('should throw on compilation error', async () => {
      await expect(async () => {
        await hyperscript.eval('invalid @#$%');
      }).rejects.toThrow(/Compilation failed/);
    });

    it('should throw on execution error', async () => {
      await expect(async () => {
        await hyperscript.eval('throw "test error"');
      }).rejects.toThrow();
    });

    it('should handle complex expressions', async () => {
      const result = await hyperscript.eval('(5 + 3) * 2 - 1');
      expect(result).toBe(15);
    });

    it('should handle string operations', async () => {
      const result = await hyperscript.eval('"hello" + " " + "world"');
      expect(result).toBe('hello world');
    });

    it('should throw for non-string code', async () => {
      await expect(async () => {
        await hyperscript.eval(123 as any);
      }).rejects.toThrow();
    });
  });

  describe('validate() edge cases', () => {
    it('should validate empty string as invalid', async () => {
      const result = await hyperscript.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate whitespace-only as invalid', async () => {
      const result = await hyperscript.validate('   \n\t  ');
      expect(result.valid).toBe(false);
    });

    it('should validate simple valid code', async () => {
      const result = await hyperscript.validate('toggle .active');
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate complex valid code', async () => {
      const result = await hyperscript.validate(
        'add .loading then wait 500ms then remove .loading'
      );
      expect(result.valid).toBe(true);
    });

    it('should provide detailed error for invalid code', async () => {
      const result = await hyperscript.validate('invalid @#$ syntax');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0].message).toBeTruthy();
      expect(result.errors![0].line).toBeGreaterThan(0);
    });

    it('should validate with language option', async () => {
      const result = await hyperscript.validate('toggle .active', {
        language: 'en',
      });
      expect(result.valid).toBe(true);
    });

    it('should validate with traditional parser', async () => {
      const result = await hyperscript.validate('toggle .active', {
        traditional: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should handle multiple errors', async () => {
      const result = await hyperscript.validate('invalid @#$ then another @#$');
      expect(result.valid).toBe(false);
      // Should have at least one error
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('createContext() edge cases', () => {
    it('should create context with null element', () => {
      const ctx = hyperscript.createContext(null);
      expect(ctx).toBeDefined();
      expect(ctx.me).toBeNull();
    });

    it('should create context with undefined element', () => {
      const ctx = hyperscript.createContext(undefined);
      expect(ctx).toBeDefined();
      expect(ctx.me).toBeNull();
    });

    it('should create context with valid element', () => {
      const div = document.createElement('div');
      const ctx = hyperscript.createContext(div);
      expect(ctx.me).toBe(div);
    });

    it('should create child context with null parent', () => {
      const ctx = hyperscript.createContext(null, null as any);
      expect(ctx).toBeDefined();
    });

    it('should create child context with undefined parent', () => {
      const ctx = hyperscript.createContext(null, undefined);
      expect(ctx).toBeDefined();
    });

    it('should create child context that inherits globals', () => {
      const parent = hyperscript.createContext();
      parent.globals?.set('test', 'value');

      const child = hyperscript.createContext(null, parent);
      expect(child.globals?.get('test')).toBe('value');
    });

    it('should create child context with separate locals', () => {
      const parent = hyperscript.createContext();
      parent.locals?.set('parentLocal', 'value');

      const child = hyperscript.createContext(null, parent);
      child.locals?.set('childLocal', 'value');

      // Parent should not see child's locals
      expect(parent.locals?.get('childLocal')).toBeUndefined();
      // Child should not see parent's locals
      expect(child.locals?.get('parentLocal')).toBeUndefined();
    });
  });

  describe('CompileResult structure', () => {
    it('should have consistent meta structure on success', () => {
      const result = hyperscript.compileSync('toggle .active');
      expect(result.ok).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.parser).toBeDefined();
      expect(result.meta.language).toBeDefined();
      expect(result.meta.timeMs).toBeGreaterThanOrEqual(0);
      expect(result.ast).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should have consistent meta structure on failure', () => {
      const result = hyperscript.compileSync('invalid @#$');
      expect(result.ok).toBe(false);
      expect(result.meta).toBeDefined();
      expect(result.meta.parser).toBeDefined();
      expect(result.meta.language).toBeDefined();
      expect(result.meta.timeMs).toBeGreaterThanOrEqual(0);
      expect(result.ast).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should provide error location information', () => {
      const result = hyperscript.compileSync('invalid @#$ syntax');
      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      const error = result.errors![0];
      expect(error.line).toBeGreaterThan(0);
      expect(error.column).toBeGreaterThan(0);
      expect(error.message).toBeTruthy();
    });
  });

  describe('Concurrent compilation', () => {
    it('should handle multiple compilations simultaneously', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(hyperscript.compile(`toggle .class${i}`));
      }
      const results = await Promise.all(promises);
      results.forEach((result, _i) => {
        expect(result.ok).toBe(true);
      });
    });

    it('should handle mixed sync/async compilation', async () => {
      const syncResults = [];
      const asyncPromises = [];

      for (let i = 0; i < 5; i++) {
        syncResults.push(hyperscript.compileSync(`toggle .sync${i}`));
        asyncPromises.push(hyperscript.compile(`toggle .async${i}`));
      }

      const asyncResults = await Promise.all(asyncPromises);

      syncResults.forEach(result => expect(result.ok).toBe(true));
      asyncResults.forEach(result => expect(result.ok).toBe(true));
    });
  });
});
