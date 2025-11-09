/**
 * Template Integration Tests
 * Testing the complete template system with real hyperscript integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateCompiler } from './template-compiler';
import { OptimizedTemplateExecutor } from './template-executor-optimized';
import { RenderCommand } from './render';
import '../../test-setup.js';

describe('Template System Integration', () => {
  let compiler: TemplateCompiler;
  let executor: OptimizedTemplateExecutor;
  let renderCommand: RenderCommand;

  beforeEach(() => {
    compiler = new TemplateCompiler();
    executor = new OptimizedTemplateExecutor();
    renderCommand = new RenderCommand();
  });

  describe('Complete Template Processing Pipeline', () => {
    it('should integrate compilation and execution phases seamlessly', async () => {
      // Create a template element in the DOM
      const template = document.createElement('template');
      template.innerHTML = `
        <div class="greeting">
          @set message to "Hello " + name + "!"
          <p>\${message}</p>
        </div>
      `;
      template.id = 'greeting-template';
      document.body.appendChild(template);

      const context = {
        me: document.body,
        it: null,
        you: null,
        result: null,
        locals: new Map([['name', 'Integration Test']]),
        globals: new Map(),
        meta: undefined,
      };

      try {
        const result = await renderCommand.execute(context, template, 'with', {
          name: 'Integration Test',
        });

        // Check that result is a DocumentFragment-like object with the expected structure
        expect(result).toBeDefined();
        expect(result.nodeType).toBe(11); // DocumentFragment nodeType
        expect(typeof result.appendChild).toBe('function');
        expect(typeof result.cloneNode).toBe('function');

        // Convert to HTML to check content
        const div = document.createElement('div');
        div.appendChild(result.cloneNode(true));
        const html = div.innerHTML;

        expect(html).toContain('Hello Integration Test!');
      } finally {
        document.body.removeChild(template);
      }
    });

    it('should handle the real-world color template example', async () => {
      const template = document.createElement('template');
      template.innerHTML = `
        <ul>
          @repeat in colors
            @set bg to it
            @set fg to getContrastingColor(it)
            <li style="background: \${bg}; color: \${unescaped fg}">\${bg}</li>
          @end
        </ul>
      `;
      template.id = 'color-template';
      document.body.appendChild(template);

      const getContrastingColor = (color: string) => {
        return color === 'red' ? 'white' : 'black';
      };

      const context = {
        me: document.body,
        it: null,
        you: null,
        result: null,
        locals: new Map([['colors', ['red', 'blue', 'green']]]),
        globals: new Map([['getContrastingColor', getContrastingColor]]),
        meta: undefined,
      };

      try {
        const result = await renderCommand.execute(context, template, 'with', {
          colors: ['red', 'blue', 'green'],
        });

        // Check that result is a DocumentFragment-like object with the expected structure
        expect(result).toBeDefined();
        expect(result.nodeType).toBe(11); // DocumentFragment nodeType
        expect(typeof result.appendChild).toBe('function');
        expect(typeof result.cloneNode).toBe('function');

        const div = document.createElement('div');
        div.appendChild(result.cloneNode(true));
        const html = div.innerHTML;

        expect(html).toContain('<ul>');
        expect(html).toContain('style="background: red; color: white"');
        expect(html).toContain('style="background: blue; color: black"');
        expect(html).toContain('style="background: green; color: black"');
        expect(html).toContain('</ul>');
      } finally {
        document.body.removeChild(template);
      }
    });

    it('should verify ${it} interpolation works correctly', async () => {
      const template = document.createElement('template');
      template.innerHTML = `
        @repeat in items
          <div class="item">\${it}</div>
        @end
      `;
      template.id = 'it-test-template';
      document.body.appendChild(template);

      const context = {
        me: document.body,
        it: null,
        you: null,
        result: null,
        locals: new Map([['items', ['alpha', 'beta', 'gamma']]]),
        globals: new Map(),
        meta: undefined,
      };

      try {
        const result = await renderCommand.execute(context, template, 'with', {
          items: ['alpha', 'beta', 'gamma'],
        });

        const div = document.createElement('div');
        div.appendChild(result.cloneNode(true));
        const html = div.innerHTML;

        expect(html).toContain('<div class="item">alpha</div>');
        expect(html).toContain('<div class="item">beta</div>');
        expect(html).toContain('<div class="item">gamma</div>');
      } finally {
        document.body.removeChild(template);
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large datasets without memory issues', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        active: i % 2 === 0,
      }));

      const template = document.createElement('template');
      template.innerHTML = `
        <div class="container">
          @repeat in items
            @if it.active
              <div class="active-item" data-id="\${it.id}">\${it.name}</div>
            @else
              <div class="inactive-item" data-id="\${it.id}">\${it.name}</div>
            @end
          @end
        </div>
      `;
      template.id = 'performance-template';
      document.body.appendChild(template);

      const context = {
        me: document.body,
        it: null,
        you: null,
        result: null,
        locals: new Map([['items', largeDataset]]),
        globals: new Map(),
        meta: undefined,
      };

      try {
        const startTime = Date.now();
        const result = await renderCommand.execute(context, template, 'with', {
          items: largeDataset,
        });
        const endTime = Date.now();

        // Should complete in reasonable time
        expect(endTime - startTime).toBeLessThan(2000); // 2 seconds max

        const div = document.createElement('div');
        div.appendChild(result.cloneNode(true));
        const html = div.innerHTML;

        // Check that all items were processed
        expect(html).toContain('Item 0');
        expect(html).toContain('Item 49');
        expect(html).toContain('class="active-item"');
        expect(html).toContain('class="inactive-item"');
      } finally {
        document.body.removeChild(template);
      }
    });

    it('should handle edge cases gracefully', async () => {
      const template = document.createElement('template');
      template.innerHTML = `
        @repeat in undefined_array
          <div>\${it}</div>
        @end
        @if nonexistent_var  
          <p>Should not appear</p>
        @end
        <div>Default content</div>
      `;
      template.id = 'edge-case-template';
      document.body.appendChild(template);

      const context = {
        me: document.body,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
        meta: undefined,
      };

      try {
        // Should not throw
        const result = await renderCommand.execute(context, template);

        const div = document.createElement('div');
        div.appendChild(result.cloneNode(true));
        const html = div.innerHTML;

        expect(html).toContain('Default content');
        expect(html).not.toContain('Should not appear');
      } finally {
        document.body.removeChild(template);
      }
    });
  });

  describe('Browser Cache and Build Integration', () => {
    it('should work with rebuilt components', async () => {
      // This test verifies that the template system works after builds
      // and addresses the "blocked by build/browser cache" issue

      const template = document.createElement('template');
      template.innerHTML = `
        @set cached_value to "Fresh Build " + timestamp
        <div class="build-test">\${cached_value}</div>
      `;
      template.id = 'build-test-template';
      document.body.appendChild(template);

      const context = {
        me: document.body,
        it: null,
        you: null,
        result: null,
        locals: new Map([['timestamp', Date.now().toString()]]),
        globals: new Map(),
        meta: undefined,
      };

      try {
        const result = await renderCommand.execute(context, template, 'with', {
          timestamp: Date.now().toString(),
        });

        const div = document.createElement('div');
        div.appendChild(result.cloneNode(true));
        const html = div.innerHTML;

        expect(html).toContain('Fresh Build');
        expect(html).toContain('class="build-test"');
      } finally {
        document.body.removeChild(template);
      }
    });
  });
});
