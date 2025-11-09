/**
 * Template Compiler Tests
 * Following TDD approach - tests define expected behavior before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateCompiler } from './template-compiler';
import '../../test-setup.js'; // Import DOM setup

describe('Template Compiler - Two-Phase Processing', () => {
  let compiler: TemplateCompiler;

  beforeEach(() => {
    compiler = new TemplateCompiler();
  });

  describe('Phase 1: Template Compilation', () => {
    it('should convert @ lines to hyperscript commands', () => {
      const template = `
        <ul>
          @repeat in colors
            @set bg to it
            @set fg to getContrastingColor(it)
            <li style="background: \${bg}; color: \${unescaped fg}">\${bg}</li>
          @end
        </ul>
      `;

      const compiled = compiler.compileTemplate(template);

      // Expected: @ lines become hyperscript commands
      expect(compiled.commands).toContain('repeat in colors');
      expect(compiled.commands).toContain('set bg to it');
      expect(compiled.commands).toContain('set fg to getContrastingColor(it)');
      expect(compiled.commands).toContain('end');

      // Expected: content includes processed HTML with escape directives
      expect(compiled.content).toContain('<ul>');
      expect(compiled.content).toContain('${escape html bg}');
      expect(compiled.content).toContain('${fg}'); // unescaped should preserve original
      expect(compiled.content).toContain('</ul>');
    });

    it('should handle nested @ directives correctly', () => {
      const template = `
        @repeat in items
          @if item.active
            @set status to "active"
            <div class="\${status}">\${item.name}</div>
          @else
            @set status to "inactive"
            <div class="\${status}">\${item.name}</div>
          @end
        @end
      `;

      const compiled = compiler.compileTemplate(template);

      expect(compiled.commands).toContain('repeat in items');
      expect(compiled.commands).toContain('if item.active');
      expect(compiled.commands).toContain('set status to "active"');
      expect(compiled.commands).toContain('else');
      expect(compiled.commands).toContain('set status to "inactive"');
      expect(compiled.commands).toContain('end'); // For @if
      expect(compiled.commands.filter(c => c === 'end')).toHaveLength(2); // One for @if, one for @repeat
    });

    it('should automatically escape HTML in ${} expressions', () => {
      const template = `
        <div>\${userInput}</div>
        <div>\${unescaped htmlContent}</div>
      `;

      const compiled = compiler.compileTemplate(template);

      // Normal ${} should be converted to ${escape html userInput}
      expect(compiled.content).toContain('${escape html userInput}');

      // ${unescaped ...} should remain as-is (just remove unescaped prefix)
      expect(compiled.content).toContain('${htmlContent}');
    });

    it('should convert content lines to template result buffer calls', () => {
      const template = `
        <div>Hello \${name}</div>
        @repeat in items
          <span>\${it}</span>
        @end
      `;

      const compiled = compiler.compileTemplate(template);

      // Content calls should be generated for non-directive lines
      expect(compiled.contentCalls.length).toBeGreaterThan(0);

      // Check that content processing includes HTML escaping
      expect(compiled.content).toContain('${escape html name}');
      expect(compiled.content).toContain('${escape html it}');
    });
  });

  describe('Phase 2: Template Execution Context', () => {
    it('should create proper template execution context with result buffer', () => {
      const baseContext = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['colors', ['red', 'green', 'blue']]]),
      };

      const templateContext = compiler.createTemplateExecutionContext(baseContext);

      // Should have meta scope with template result buffer
      expect(templateContext.meta).toBeDefined();
      expect(templateContext.meta.__ht_template_result).toBeInstanceOf(Array);
      expect(templateContext.meta.__ht_template_result).toEqual([]);
    });

    it('should preserve original context while adding template-specific meta', () => {
      const baseContext = {
        me: document.createElement('div'),
        it: 'test-value',
        you: null,
        result: 'previous-result',
        locals: new Map([['var1', 'value1']]),
        globals: new Map([['globalFunc', () => 'test']]),
      };

      const templateContext = compiler.createTemplateExecutionContext(baseContext);

      // Original context should be preserved
      expect(templateContext.me).toBe(baseContext.me);
      expect(templateContext.it).toBe(baseContext.it);
      expect(templateContext.result).toBe(baseContext.result);
      expect(templateContext.locals).toBe(baseContext.locals);
      expect(templateContext.globals).toBe(baseContext.globals);

      // Template meta should be added
      expect(templateContext.meta.__ht_template_result).toBeInstanceOf(Array);
    });
  });

  describe('Complete Two-Phase Processing', () => {
    it('should compile templates correctly for later execution', () => {
      const template = `
        <ul>
          @repeat in colors
            @set bg to it
            <li style="background: \${bg}">\${bg}</li>
          @end
        </ul>
      `;

      const compiled = compiler.compileTemplate(template);

      // Verify compilation structure
      expect(compiled.commands).toEqual(['repeat in colors', 'set bg to it', 'end']);

      expect(compiled.content).toContain('<ul>');
      expect(compiled.content).toContain(
        '<li style="background: ${escape html bg}">${escape html bg}</li>'
      );
      expect(compiled.content).toContain('</ul>');
    });

    it('should create proper execution context with template buffer', () => {
      const baseContext = {
        me: null,
        it: null,
        you: null,
        result: null,
        locals: new Map([['colors', ['red', 'yellow']]]),
        globals: new Map([
          ['getContrastingColor', (color: string) => (color === 'red' ? 'white' : 'black')],
        ]),
      };

      const templateContext = compiler.createTemplateExecutionContext(baseContext);

      // Should have result buffer
      expect(templateContext.meta?.__ht_template_result).toBeInstanceOf(Array);
      expect(templateContext.meta?.__ht_template_result).toEqual([]);

      // Original context preserved
      expect(templateContext.locals).toBe(baseContext.locals);
      expect(templateContext.globals).toBe(baseContext.globals);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed @ directives gracefully', () => {
      const template = `
        @invalid directive syntax
        <div>Content</div>
      `;

      expect(() => {
        compiler.compileTemplate(template);
      }).not.toThrow();
    });

    it('should handle missing @end directives', () => {
      const template = `
        @repeat in items
          <div>\${it}</div>
        <!-- Missing @end -->
      `;

      expect(() => {
        compiler.compileTemplate(template);
      }).toThrow('Missing @end directive for @repeat');
    });
  });
});
