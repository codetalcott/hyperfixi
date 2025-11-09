/**
 * Template Execution Tests
 * Following TDD approach - tests define expected execution behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateExecutor } from './template-executor';
import { TemplateCompiler, type CompiledTemplate } from './template-compiler';
import '../../test-setup.js'; // Import DOM setup

describe('Template Execution Phase', () => {
  let executor: TemplateExecutor;
  let compiler: TemplateCompiler;

  beforeEach(() => {
    executor = new TemplateExecutor();
    compiler = new TemplateCompiler();
  });

  describe('Basic Template Execution', () => {
    it('should execute simple templates with variable interpolation', async () => {
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
    });

    it('should execute templates with HTML escaping', async () => {
      const template = `<div>\${userInput}</div><div>\${unescaped htmlContent}</div>`;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([
          ['userInput', '<script>alert("xss")</script>'],
          ['htmlContent', '<strong>Bold</strong>'],
        ]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      // userInput should be escaped, htmlContent should not be
      expect(result).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(result).toContain('<strong>Bold</strong>');
    });
  });

  describe('Template Commands Execution', () => {
    it('should execute @set commands properly', async () => {
      const template = `
        @set greeting to "Hello"
        @set target to "World"
        <div>\${greeting} \${target}!</div>
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

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('Hello World!');
      // Variables should be set in context
      expect(context.locals.get('greeting')).toBe('Hello');
      expect(context.locals.get('target')).toBe('World');
    });

    it('should execute @repeat commands with proper iteration', async () => {
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
        locals: new Map([['items', ['apple', 'banana', 'cherry']]]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>apple</li>');
      expect(result).toContain('<li>banana</li>');
      expect(result).toContain('<li>cherry</li>');
      expect(result).toContain('</ul>');
    });

    it('should execute @if/@else/@end commands with conditional logic', async () => {
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
            ],
          ],
        ]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<div class="active">Alice</div>');
      expect(result).toContain('<div class="inactive">Bob</div>');
    });
  });

  describe('Function Calls in Templates', () => {
    it('should execute function calls within template expressions', async () => {
      const template = `
        @repeat in colors
          @set contrast to getContrastingColor(it)
          <div style="background: \${it}; color: \${contrast}">\${it}</div>
        @end
      `;
      const compiled = compiler.compileTemplate(template);

      const mockGetContrastingColor = (color: string) => {
        return color === 'red' ? 'white' : 'black';
      };

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['colors', ['red', 'blue']]]),
        globals: new Map([['getContrastingColor', mockGetContrastingColor]]),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('style="background: red; color: white"');
      expect(result).toContain('style="background: blue; color: black"');
    });

    it('should handle nested function calls and complex expressions', async () => {
      const template = `
        @set processed to transform(capitalize(name))
        <h1>\${processed}</h1>
      `;
      const compiled = compiler.compileTemplate(template);

      const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
      const transform = (str: string) => `*** ${str} ***`;

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['name', 'john']]),
        globals: new Map([
          ['capitalize', capitalize],
          ['transform', transform],
        ]),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<h1>*** John ***</h1>');
    });
  });

  describe('Template Result Buffer Management', () => {
    it('should properly manage the template result buffer', async () => {
      const template = `
        <header>Start</header>
        @repeat in items
          <div>\${it}</div>
        @end
        <footer>End</footer>
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['items', ['A', 'B']]]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      const result = await executor.executeTemplate(compiled, context);

      // Should contain all parts in order
      expect(result).toMatch(
        /<header>Start<\/header>.*<div>A<\/div>.*<div>B<\/div>.*<footer>End<\/footer>/s
      );

      // Buffer should be consumed (implementation detail)
      expect(context.meta.__ht_template_result).toBeInstanceOf(Array);
    });

    it('should handle empty templates gracefully', async () => {
      const template = ``;
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

      const result = await executor.executeTemplate(compiled, context);

      expect(result).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined variables gracefully', async () => {
      const template = `<div>\${undefined_var}</div>`;
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

      const result = await executor.executeTemplate(compiled, context);

      // Should render empty string for undefined variables
      expect(result).toBe('<div></div>');
    });

    it('should handle function call errors gracefully', async () => {
      const template = `
        @set result to nonExistentFunction(value)
        <div>\${result}</div>
      `;
      const compiled = compiler.compileTemplate(template);

      const context = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['value', 'test']]),
        globals: new Map(),
        meta: { __ht_template_result: [] },
      };

      // Should not throw, but handle gracefully
      const result = await executor.executeTemplate(compiled, context);

      expect(result).toContain('<div>');
      expect(result).toContain('</div>');
    });
  });
});
