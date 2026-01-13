import { describe, it, expect, beforeEach } from 'vitest';
import { HyperFixiTemplateEngine } from './engine';
import { TemplateOptions, TemplateContext } from './types';
import { createComponent } from '@hyperfixi/component-schema';

describe('HyperFixiTemplateEngine', () => {
  let engine: HyperFixiTemplateEngine;

  beforeEach(() => {
    engine = new HyperFixiTemplateEngine();
  });

  describe('compilation with caching', () => {
    it('should compile template successfully', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const result = await engine.compile(template);

      expect(result.html).toContain('{{name}}');
      expect(result.variables).toContain('name');
    });

    it('should cache compilation results', async () => {
      const template = '<div>Hello, {{name}}!</div>';

      const result1 = await engine.compile(template);
      const result2 = await engine.compile(template);

      // Results should be identical (cached)
      expect(result1).toBe(result2);

      const stats = engine.getStats();
      expect(stats.cacheHits).toBe(1);
    });

    it('should not cache in development mode', async () => {
      const template = '<div>Hello, {{name}}!</div>';

      const result1 = await engine.compile(template, { development: true });
      const result2 = await engine.compile(template, { development: true });

      // Results should be different objects (not cached)
      expect(result1).not.toBe(result2);
    });

    it('should handle cache invalidation with different options', async () => {
      const template = '<div>Hello, {{name}}!</div>';

      const result1 = await engine.compile(template, { minify: false });
      const result2 = await engine.compile(template, { minify: true });

      expect(result1).not.toBe(result2);
    });
  });

  describe('template rendering', () => {
    it('should render compiled template with context', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const compiled = await engine.compile(template);

      const context: TemplateContext = {
        variables: { name: 'World' },
      };

      const rendered = await engine.render(compiled, context);
      expect(rendered).toBe('<div>Hello, World!</div>');
    });

    it('should compile and render in one step', async () => {
      const template = '<div>{{greeting}}, {{name}}!</div>';
      const context: TemplateContext = {
        variables: {
          greeting: 'Hello',
          name: 'Alice',
        },
      };

      const rendered = await engine.compileAndRender(template, context);
      expect(rendered).toBe('<div>Hello, Alice!</div>');
    });
  });

  describe('component registration', () => {
    it('should register and use components', async () => {
      const component = createComponent('greeting', 'Greeting Component', 'on click log "Hello!"');

      component.template = {
        html: '<div class="greeting">Hello, {{name}}!</div>',
        variables: {
          name: { type: 'string', required: true, description: 'Name to greet' },
        },
      };

      await engine.registerComponent(component);

      const template = '<greeting name="World"></greeting>';
      const rendered = await engine.compileAndRender(template);

      expect(rendered).toContain('Hello, World!');
    });

    it('should handle component dependencies', async () => {
      const button = createComponent('btn', 'Button', 'on click log "clicked"');
      button.template = {
        html: '<button class="btn">{{text}}</button>',
        variables: {
          text: { type: 'string', required: true, description: 'Button text' },
        },
      };

      const card = createComponent('card', 'Card', 'init add .card-loaded');
      card.template = {
        html: '<div class="card">{{children}}</div>',
      };
      card.dependencies = { components: ['btn'] };

      await engine.registerComponent(button);
      await engine.registerComponent(card);

      const template = '<card><btn text="Click me"></btn></card>';
      const compiled = await engine.compile(template);

      expect(compiled.components).toHaveLength(2);
      expect(compiled.components.some(c => c.id === 'btn')).toBe(true);
      expect(compiled.components.some(c => c.id === 'card')).toBe(true);
    });
  });

  describe('custom directives', () => {
    it('should support custom directives', async () => {
      engine.addDirective('repeat', {
        async process(directive, context) {
          const count = parseInt(directive.expression);
          const nodes = [];

          for (let i = 0; i < count; i++) {
            if (directive.children) {
              nodes.push(...directive.children);
            }
          }

          return nodes;
        },
      });

      const template = '<span hf-repeat="3">Hello </span>';
      const rendered = await engine.compileAndRender(template);

      expect(rendered).toBe('Hello Hello Hello ');
    });

    it('should handle directive validation', async () => {
      engine.addDirective('validate', {
        async process(directive, context) {
          return directive.children || [];
        },
        validate(directive) {
          const errors = [];
          if (!directive.expression) {
            errors.push('Expression is required');
          }
          return errors;
        },
      });

      const template = '<div hf-validate="">Content</div>';
      const result = await engine.compile(template);

      // Should have validation warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('template bundling', () => {
    it('should create template bundle', async () => {
      const templates = {
        home: '<div>Welcome to {{siteName}}</div>',
        about: '<div>About {{siteName}}</div>',
        contact: '<div>Contact us at {{email}}</div>',
      };

      const bundle = await engine.createBundle(templates);

      expect(bundle.html).toContain('Welcome to {{siteName}}');
      expect(bundle.html).toContain('About {{siteName}}');
      expect(bundle.html).toContain('Contact us at {{email}}');
      expect(bundle.metadata.version).toBe('1.0.0');
      expect(bundle.metadata.performance.bundleSize).toBeGreaterThan(0);
    });

    it('should combine hyperscript from multiple templates', async () => {
      const templates = {
        page1: '<button _="on click log \'page1\'">Page 1</button>',
        page2: '<button _="on click log \'page2\'">Page 2</button>',
      };

      const bundle = await engine.createBundle(templates);

      expect(bundle.hyperscript).toContain("on click log 'page1'");
      expect(bundle.hyperscript).toContain("on click log 'page2'");
    });

    it('should collect all dependencies in bundle', async () => {
      const component1 = createComponent('comp1', 'Component 1', 'on click log "1"');
      component1.dependencies = { css: ['comp1.css'], javascript: ['comp1.js'] };

      const component2 = createComponent('comp2', 'Component 2', 'on click log "2"');
      component2.dependencies = { css: ['comp2.css'], javascript: ['comp2.js'] };

      await engine.registerComponent(component1);
      await engine.registerComponent(component2);

      const templates = {
        page1: '<comp1></comp1>',
        page2: '<comp2></comp2>',
      };

      const bundle = await engine.createBundle(templates);

      expect(bundle.css).toContain('comp1.css');
      expect(bundle.css).toContain('comp2.css');
      expect(bundle.javascript).toContain('comp1.js');
      expect(bundle.javascript).toContain('comp2.js');
    });
  });

  describe('precompilation', () => {
    it('should precompile templates for performance', async () => {
      const templates = {
        template1: '<div>{{message1}}</div>',
        template2: '<div>{{message2}}</div>',
        template3: '<div>{{message3}}</div>',
      };

      const precompiled = await engine.precompile(templates);

      expect(Object.keys(precompiled)).toEqual(['template1', 'template2', 'template3']);
      expect(precompiled.template1.variables).toContain('message1');
      expect(precompiled.template2.variables).toContain('message2');
      expect(precompiled.template3.variables).toContain('message3');
    });

    it('should use precompiled templates efficiently', async () => {
      const templates = {
        template1: '<div>{{message}}</div>',
      };

      const precompiled = await engine.precompile(templates);
      const context: TemplateContext = {
        variables: { message: 'Hello' },
      };

      const rendered = await engine.render(precompiled.template1, context);
      expect(rendered).toBe('<div>Hello</div>');
    });
  });

  describe('hot reload', () => {
    it('should support hot reloading in development', async () => {
      const template = '<div>{{message}}</div>';

      // First compilation
      const result1 = await engine.compile(template);

      // Hot reload should bypass cache
      const result2 = await engine.hotReload(template, 'test-template');

      expect(result1).not.toBe(result2);
    });

    it('should clear cache on hot reload', async () => {
      const template = '<div>{{message}}</div>';

      // Cache the template
      await engine.compile(template);

      // Hot reload should clear cache
      await engine.hotReload(template, 'test');

      // Next compilation should be fresh
      const result = await engine.compile(template);
      expect(result).toBeDefined();
    });
  });

  describe('performance monitoring', () => {
    it('should provide compilation statistics', async () => {
      const template = '<div>{{message}}</div>';

      // Multiple compilations
      await engine.compile(template);
      await engine.compile(template); // Cache hit
      await engine.compile(template, { minify: true }); // Different options

      const stats = engine.getStats();
      expect(stats.totalCompilations).toBe(3);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(2);
    });

    it('should clear cache when requested', async () => {
      const template = '<div>{{message}}</div>';

      await engine.compile(template);
      engine.clearCache();

      const stats = engine.getStats();
      expect(stats.totalCompilations).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle template parsing errors', async () => {
      const template = '<div>{{unclosed';

      await expect(engine.compile(template)).rejects.toThrow();
    });

    it('should handle component registration errors', async () => {
      const invalidComponent = {
        id: '', // Invalid - empty ID
        name: 'Invalid',
        version: '1.0.0',
        hyperscript: 'on click log "test"',
      } as any;

      await expect(engine.registerComponent(invalidComponent)).rejects.toThrow();
    });

    it('should handle rendering errors gracefully', async () => {
      const template = '<div>{{message}}</div>';
      const compiled = await engine.compile(template);

      // Context with problematic data
      const context: TemplateContext = {
        variables: {
          message: {
            toString: () => {
              throw new Error('Cannot convert');
            },
          },
        },
      };

      // Should not throw, but handle gracefully
      const rendered = await engine.render(compiled, context);
      expect(rendered).toBeDefined();
    });
  });

  describe('complex integration scenarios', () => {
    it('should handle complex nested template with multiple features', async () => {
      // Register components
      const modal = createComponent(
        'modal',
        'Modal',
        'on show add .visible then wait 300ms then add .animated'
      );
      modal.template = {
        html: `
          <div class="modal-backdrop">
            <div class="modal-dialog">
              <div class="modal-header">
                <h4>{{title}}</h4>
                <button class="close" _="on click trigger hide">×</button>
              </div>
              <div class="modal-body">{{children}}</div>
            </div>
          </div>
        `,
        variables: {
          title: { type: 'string', required: true, description: 'Modal title' },
        },
      };
      modal.dependencies = { css: ['modal.css'] };

      const form = createComponent(
        'form',
        'Form',
        'on submit halt then fetch {{action}} with method: "POST" then put result into #result'
      );
      form.template = {
        html: `
          <form action="{{action}}" method="{{method}}">
            {{children}}
            <div id="result"></div>
          </form>
        `,
        variables: {
          action: { type: 'string', required: true, description: 'Form action URL' },
          method: { type: 'string', default: 'POST', description: 'HTTP method' },
        },
      };

      await engine.registerComponent(modal);
      await engine.registerComponent(form);

      engine.addDirective('if', {
        async process(directive, context) {
          // Mock implementation - in real app would evaluate condition
          const show = directive.expression === 'showModal';
          return show ? directive.children || [] : [];
        },
      });

      const template = `
        <div class="app" _="init fetch /api/config then put result into me">
          <button _="on click trigger showModal">Open Modal</button>
          
          <modal title="User Registration" hf-if="showModal">
            <form action="/api/register" method="POST">
              <div class="form-group">
                <label>Name:</label>
                <input type="text" name="name" _="on blur validate me" />
              </div>
              <div class="form-group">
                <label>Email:</label>
                <input type="email" name="email" _="on blur validate me" />
              </div>
              <button type="submit">Register</button>
            </form>
          </modal>
        </div>
      `;

      const result = await engine.compile(template);

      // Check compilation results
      expect(result.components).toHaveLength(2);
      expect(result.hyperscript.length).toBeGreaterThan(0);
      expect(result.css).toContain('modal.css');
      expect(result.variables).toContain('title');
      expect(result.variables).toContain('action');

      // Check rendering
      const context: TemplateContext = {
        variables: {
          title: 'User Registration',
          action: '/api/register',
          method: 'POST',
        },
      };

      const rendered = await engine.render(result, context);
      expect(rendered).toContain('User Registration');
      expect(rendered).toContain('/api/register');
      expect(rendered).toContain('on click trigger showModal');
    });
  });
});
