/**
 * Optimized Template Executor Tests
 * Following TDD approach - tests for performance-optimized template execution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OptimizedTemplateExecutor } from './template-executor-optimized';
import { TemplateCompiler } from './template-compiler';
import '../../test-setup.js';

describe('Optimized Template Execution', () => {
  let executor: OptimizedTemplateExecutor;
  let compiler: TemplateCompiler;

  beforeEach(() => {
    executor = new OptimizedTemplateExecutor();
    compiler = new TemplateCompiler();
  });

  describe('Memory-Safe Template Execution', () => {
    it('should execute simple templates without memory leaks', async () => {
      const template = `<div>Hello \${name}!</div>`;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['name', 'World']]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toBe('<div>Hello World!</div>');
      // Verify buffer is properly managed
      expect(context.meta.__ht_template_result).toBeInstanceOf(Array);
    });

    it('should handle repeat loops without infinite recursion', async () => {
      const template = `
        <ul>
          @repeat in items
            @set current to it
            <li>\${current}</li>
          @end
        </ul>
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['items', ['apple', 'banana']]]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>apple</li>');
      expect(result).toContain('<li>banana</li>');
      expect(result).toContain('</ul>');
    });

    it('should process large datasets efficiently', async () => {
      const largeItems = Array.from({ length: 100 }, (_, i) => `item${i}`);

      const template = `
        @repeat in items
          <div>\${it}</div>
        @end
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['items', largeItems]]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const startTime = Date.now();
      const result = await executor.executeTemplate(compiled, context);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 1 second for 100 items)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should contain all items
      expect(result).toContain('<div>item0</div>');
      expect(result).toContain('<div>item99</div>');
    });
  });

  describe('Simplified Command Processing', () => {
    it('should execute templates with streamlined command interpretation', async () => {
      const template = `
        @set greeting to "Hello"
        @repeat in names
          @set message to greeting + " " + it + "!"
          <p>\${message}</p>
        @end
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['names', ['Alice', 'Bob']]]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<p>Hello Alice!</p>');
      expect(result).toContain('<p>Hello Bob!</p>');
    });

    it('should handle conditional logic without stack overflow', async () => {
      const template = `
        @repeat in users
          @if it.active
            <div class="active">\${it.name}</div>
          @else
            <div class="inactive">\${it.name}</div>
          @end
        @end
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([
          [
            'users',
            [
              { name: 'Alice', active: true },
              { name: 'Bob', active: false },
              { name: 'Charlie', active: true },
            ],
          ],
        ]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<div class="active">Alice</div>');
      expect(result).toContain('<div class="inactive">Bob</div>');
      expect(result).toContain('<div class="active">Charlie</div>');
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle malformed templates gracefully', async () => {
      const template = `
        @repeat in nonexistent
          <div>\${it}</div>
        @end
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      // Should not throw or hang
      const result = await executor.executeTemplate(compiled, context);

      expect(typeof result).toBe('string');
    });

    it('should prevent infinite loops in complex nested structures', async () => {
      const template = `
        @repeat in outer
          @repeat in it.inner
            @if it.condition
              <span>\${it.value}</span>
            @end
          @end
        @end
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([
          [
            'outer',
            [
              {
                inner: [
                  { condition: true, value: 'A' },
                  { condition: false, value: 'B' },
                ],
              },
            ],
          ],
        ]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<span>A</span>');
      expect(result).not.toContain('<span>B</span>');
    });
  });
});
