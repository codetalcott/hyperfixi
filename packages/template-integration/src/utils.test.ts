import { describe, it, expect } from 'vitest';
import {
  extractTemplateVariables,
  validateTemplate,
  optimizeTemplate,
  nodesToHtml,
  createTemplateContext,
  mergeTemplateContexts,
  analyzeTemplateComplexity,
  TemplatePerformanceMonitor,
  debugTemplate,
} from './utils';
import { TemplateNode, TemplateContext } from './types';

describe('Template Utils', () => {
  describe('extractTemplateVariables', () => {
    it('should extract simple variables', () => {
      const template = 'Hello {{name}}, welcome to {{site}}!';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual(['name', 'site']);
    });

    it('should handle custom delimiters', () => {
      const template = 'Hello [[name]], welcome to [[site]]!';
      const variables = extractTemplateVariables(template, { start: '[[', end: ']]' });

      expect(variables).toEqual(['name', 'site']);
    });

    it('should handle nested expressions', () => {
      const template = '{{user.name}} works at {{company.name}}';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual(['company.name', 'user.name']);
    });

    it('should handle duplicate variables', () => {
      const template = '{{name}} and {{name}} are friends';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual(['name']);
    });

    it('should handle empty template', () => {
      const variables = extractTemplateVariables('');
      expect(variables).toEqual([]);
    });

    it('should handle template without variables', () => {
      const template = 'No variables here';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual([]);
    });
  });

  describe('validateTemplate', () => {
    it('should detect mismatched template delimiters', () => {
      const template = 'Hello {{name} - missing closing';
      const warnings = validateTemplate(template);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('invalid-hyperscript');
      expect(warnings[0].message).toContain('Mismatched template variable delimiters');
    });

    it('should detect unclosed HTML tags', () => {
      const template = '<div><p>Content</div>';
      const warnings = validateTemplate(template);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('Unclosed tag: <p>');
    });

    it('should detect unexpected closing tags', () => {
      const template = '<div></p></div>';
      const warnings = validateTemplate(template);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('Unexpected closing tag: </p>');
    });

    it('should handle self-closing tags correctly', () => {
      const template = '<div><br/><img src="test.jpg"/></div>';
      const warnings = validateTemplate(template);

      expect(warnings).toHaveLength(0);
    });

    it('should validate well-formed template', () => {
      const template = '<div>Hello {{name}}!</div>';
      const warnings = validateTemplate(template);

      expect(warnings).toHaveLength(0);
    });
  });

  describe('optimizeTemplate', () => {
    it('should remove empty text nodes', () => {
      const nodes: TemplateNode[] = [
        { type: 'text', content: 'Hello' },
        { type: 'text', content: '' },
        { type: 'text', content: 'World' },
      ];

      const optimized = optimizeTemplate(nodes);
      expect(optimized).toHaveLength(2);
    });

    it('should merge adjacent text nodes', () => {
      const nodes: TemplateNode[] = [
        {
          type: 'element',
          tagName: 'div',
          children: [
            { type: 'text', content: 'Hello ' },
            { type: 'text', content: 'World' },
          ],
        },
      ];

      const optimized = optimizeTemplate(nodes);
      expect(optimized[0].children).toHaveLength(1);
      expect(optimized[0].children![0].content).toBe('Hello World');
    });

    it('should preserve non-text nodes', () => {
      const nodes: TemplateNode[] = [
        { type: 'text', content: 'Before' },
        { type: 'element', tagName: 'span', children: [] },
        { type: 'text', content: 'After' },
      ];

      const optimized = optimizeTemplate(nodes);
      expect(optimized).toHaveLength(3);
    });
  });

  describe('nodesToHtml', () => {
    it('should convert text nodes to HTML', () => {
      const nodes: TemplateNode[] = [{ type: 'text', content: 'Hello World' }];

      const html = nodesToHtml(nodes);
      expect(html).toBe('Hello World');
    });

    it('should convert element nodes to HTML', () => {
      const nodes: TemplateNode[] = [
        {
          type: 'element',
          tagName: 'div',
          attributes: { class: 'container' },
          children: [{ type: 'text', content: 'Content' }],
        },
      ];

      const html = nodesToHtml(nodes);
      expect(html).toBe('<div class="container">Content</div>');
    });

    it('should handle self-closing elements', () => {
      const nodes: TemplateNode[] = [
        {
          type: 'element',
          tagName: 'br',
          attributes: {},
        },
      ];

      const html = nodesToHtml(nodes);
      expect(html).toBe('<br />');
    });

    it('should escape HTML in text content', () => {
      const nodes: TemplateNode[] = [{ type: 'text', content: '<script>alert("xss")</script>' }];

      const html = nodesToHtml(nodes);
      expect(html).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });

  describe('createTemplateContext', () => {
    it('should create context with variables', () => {
      const context = createTemplateContext({ name: 'John', age: 30 });

      expect(context.variables).toEqual({ name: 'John', age: 30 });
      expect(context.components).toEqual({});
      expect(context.functions).toEqual({});
    });

    it('should merge additional options', () => {
      const context = createTemplateContext(
        { name: 'John' },
        {
          request: { url: '/test' },
          user: { id: '123' },
        }
      );

      expect(context.variables).toEqual({ name: 'John' });
      expect(context.request?.url).toBe('/test');
      expect(context.user?.id).toBe('123');
    });
  });

  describe('mergeTemplateContexts', () => {
    it('should merge multiple contexts', () => {
      const context1: TemplateContext = {
        variables: { a: 1, b: 2 },
        components: { comp1: {} as any },
      };

      const context2: TemplateContext = {
        variables: { b: 3, c: 4 },
        functions: { func1: () => {} },
      };

      const merged = mergeTemplateContexts(context1, context2);

      expect(merged.variables).toEqual({ a: 1, b: 3, c: 4 });
      expect(merged.components).toHaveProperty('comp1');
      expect(merged.functions).toHaveProperty('func1');
    });

    it('should handle nested object merging', () => {
      const context1: TemplateContext = {
        variables: {},
        request: { url: '/test', headers: { 'content-type': 'json' } },
      };

      const context2: TemplateContext = {
        variables: {},
        request: { params: { id: '123' } },
      };

      const merged = mergeTemplateContexts(context1, context2);

      expect(merged.request?.url).toBe('/test');
      expect(merged.request?.params?.id).toBe('123');
      expect(merged.request?.headers).toEqual({ 'content-type': 'json' });
    });
  });

  describe('analyzeTemplateComplexity', () => {
    it('should analyze simple template', () => {
      const nodes: TemplateNode[] = [
        {
          type: 'element',
          tagName: 'div',
          children: [{ type: 'text', content: 'Hello {{name}}!' }],
        },
      ];

      const analysis = analyzeTemplateComplexity(nodes);

      expect(analysis.nodeCount).toBe(2); // div + text
      expect(analysis.depth).toBe(1);
      expect(analysis.variableCount).toBe(1);
      expect(analysis.directiveCount).toBe(0);
      expect(analysis.componentCount).toBe(0);
    });

    it('should analyze complex nested template', () => {
      const nodes: TemplateNode[] = [
        {
          type: 'element',
          tagName: 'div',
          children: [
            {
              type: 'directive',
              directive: { name: 'if', expression: 'showContent' },
            },
            {
              type: 'component',
              component: {} as any,
            },
            {
              type: 'element',
              tagName: 'section',
              attributes: { 'data-user': '{{userId}}' },
              children: [{ type: 'text', content: 'Welcome {{userName}}!' }],
            },
          ],
        },
      ];

      const analysis = analyzeTemplateComplexity(nodes);

      expect(analysis.nodeCount).toBe(5);
      expect(analysis.depth).toBe(2);
      expect(analysis.variableCount).toBe(2); // userId, userName
      expect(analysis.directiveCount).toBe(1);
      expect(analysis.componentCount).toBe(1);
    });
  });

  describe('TemplatePerformanceMonitor', () => {
    it('should track operation timing', () => {
      const monitor = new TemplatePerformanceMonitor();

      const endTiming = monitor.startTiming('test-operation');

      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }

      endTiming();

      const stats = monitor.getStats('test-operation');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(1);
      expect(stats!.total).toBeGreaterThan(0);
    });

    it('should calculate statistics across multiple operations', () => {
      const monitor = new TemplatePerformanceMonitor();

      // Run multiple operations
      for (let i = 0; i < 5; i++) {
        const endTiming = monitor.startTiming('parse');
        setTimeout(() => {}, 1); // Simulate async work
        endTiming();
      }

      const stats = monitor.getStats('parse');
      expect(stats!.count).toBe(5);
      expect(stats!.average).toBe(stats!.total / 5);
      expect(stats!.min).toBeLessThanOrEqual(stats!.max);
    });

    it('should return null for unknown operations', () => {
      const monitor = new TemplatePerformanceMonitor();
      const stats = monitor.getStats('unknown');

      expect(stats).toBeNull();
    });

    it('should reset all metrics', () => {
      const monitor = new TemplatePerformanceMonitor();

      const endTiming = monitor.startTiming('test');
      endTiming();

      expect(monitor.getStats('test')).toBeDefined();

      monitor.reset();
      expect(monitor.getStats('test')).toBeNull();
    });

    it('should get all stats', () => {
      const monitor = new TemplatePerformanceMonitor();

      const end1 = monitor.startTiming('operation1');
      end1();

      const end2 = monitor.startTiming('operation2');
      end2();

      const allStats = monitor.getAllStats();
      expect(Object.keys(allStats)).toEqual(['operation1', 'operation2']);
    });
  });

  describe('debugTemplate', () => {
    it('should identify variables and provide debugging info', () => {
      const template = 'Hello {{name}}, your score is {{score}}!';
      const context: TemplateContext = {
        variables: { name: 'John', unusedVar: 'test' },
      };

      const debug = debugTemplate(template, context);

      expect(debug.variables).toEqual(['name', 'score']);
      expect(debug.missingVariables).toEqual(['score']);
      expect(debug.unusedVariables).toEqual(['unusedVar']);
    });

    it('should validate template and return warnings', () => {
      const template = '<div>{{name}</div>'; // Missing closing brace
      const debug = debugTemplate(template);

      expect(debug.warnings.length).toBeGreaterThan(0);
    });

    it('should handle perfect template with no issues', () => {
      const template = '<div>Hello {{name}}!</div>';
      const context: TemplateContext = {
        variables: { name: 'World' },
      };

      const debug = debugTemplate(template, context);

      expect(debug.missingVariables).toHaveLength(0);
      expect(debug.unusedVariables).toHaveLength(0);
      expect(debug.warnings).toHaveLength(0);
    });

    it('should handle template without context', () => {
      const template = 'Hello {{name}}!';
      const debug = debugTemplate(template);

      expect(debug.variables).toEqual(['name']);
      expect(debug.missingVariables).toEqual(['name']);
      expect(debug.unusedVariables).toEqual([]);
    });
  });
});
