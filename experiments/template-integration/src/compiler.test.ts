import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateCompiler } from './compiler';
import { TemplateOptions, TemplateContext } from './types';
import { createComponent } from '@lokascript/component-schema';

describe('TemplateCompiler', () => {
  let compiler: TemplateCompiler;

  beforeEach(() => {
    compiler = new TemplateCompiler();
  });

  describe('basic compilation', () => {
    it('should compile simple template', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const result = await compiler.compile(template);

      expect(result.html).toContain('<div>Hello, {{name}}!</div>');
      expect(result.variables).toContain('name');
      expect(result.hyperscript).toHaveLength(0);
      expect(result.components).toHaveLength(0);
    });

    it('should compile template with hyperscript', async () => {
      const template = '<button _="on click toggle .active">Toggle</button>';
      const result = await compiler.compile(template);

      expect(result.html).toContain('<button _="on click toggle .active">Toggle</button>');
      expect(result.hyperscript).toHaveLength(1);
      expect(result.hyperscript[0]).toBe('on click toggle .active');
    });

    it('should extract CSS and JavaScript dependencies', async () => {
      const component = createComponent('test-component', 'Test Component', 'on click log "test"');

      component.dependencies = {
        css: ['styles.css'],
        javascript: ['script.js'],
      };

      await compiler.registerComponent(component);

      const template = '<test-component></test-component>';
      const result = await compiler.compile(template);

      expect(result.css).toContain('styles.css');
      expect(result.javascript).toContain('script.js');
    });
  });

  describe('template rendering', () => {
    it('should render template with variables', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const compiled = await compiler.compile(template);

      const context: TemplateContext = {
        variables: { name: 'World' },
      };

      const rendered = await compiler.render(compiled, context);
      expect(rendered).toBe('<div>Hello, World!</div>');
    });

    it('should handle missing variables gracefully', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const compiled = await compiler.compile(template);

      const rendered = await compiler.render(compiled, {});
      expect(rendered).toBe('<div>Hello, !</div>');
    });

    it('should escape HTML in variables', async () => {
      const template = '<div>{{content}}</div>';
      const compiled = await compiler.compile(template);

      const context: TemplateContext = {
        variables: { content: '<script>alert("xss")</script>' },
      };

      const rendered = await compiler.render(compiled, context);
      expect(rendered).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
    });
  });

  describe('component integration', () => {
    it('should compile and render components', async () => {
      const component = createComponent(
        'greeting',
        'Greeting Component',
        'on click log "Hello from component"'
      );

      component.template = {
        html: '<div class="greeting">Hello, {{name}}!</div>',
        variables: {
          name: {
            type: 'string',
            required: true,
            description: 'Name to greet',
          },
        },
      };

      await compiler.registerComponent(component);

      const template = '<greeting name="World"></greeting>';
      const compiled = await compiler.compile(template);
      const rendered = await compiler.render(compiled, {});

      expect(rendered).toContain('Hello, World!');
      expect(compiled.components).toHaveLength(1);
      expect(compiled.components[0].id).toBe('greeting');
    });

    it('should handle component with children', async () => {
      const component = createComponent('card', 'Card Component', 'on click toggle .expanded');

      component.template = {
        html: '<div class="card"><div class="content">{{children}}</div></div>',
      };

      await compiler.registerComponent(component);

      const template = '<card><p>Card content</p></card>';
      const compiled = await compiler.compile(template);
      const rendered = await compiler.render(compiled, {});

      expect(rendered).toContain('<p>Card content</p>');
    });

    it('should handle nested components', async () => {
      const button = createComponent('button', 'Button', 'on click log "clicked"');
      button.template = {
        html: '<button class="btn">{{text}}</button>',
        variables: {
          text: { type: 'string', required: true, description: 'Button text' },
        },
      };

      const modal = createComponent('modal', 'Modal', 'on show add .visible');
      modal.template = {
        html: '<div class="modal">{{children}}</div>',
      };
      modal.dependencies = { components: ['button'] };

      await compiler.registerComponent(button);
      await compiler.registerComponent(modal);

      const template = '<modal><button text="Close">Close Modal</button></modal>';
      const compiled = await compiler.compile(template);

      expect(compiled.components).toHaveLength(2);
      expect(compiled.components.map(c => c.id)).toContain('button');
      expect(compiled.components.map(c => c.id)).toContain('modal');
    });
  });

  describe('directive processing', () => {
    it('should handle conditional directives', async () => {
      compiler.addDirective('if', {
        async process(directive, context) {
          // Simple mock implementation
          const condition = directive.expression === 'true';
          return condition ? directive.children || [] : [];
        },
      });

      const template = '<div hf-if="true">Visible</div><div hf-if="false">Hidden</div>';
      const result = await compiler.compile(template);

      expect(result.html).toContain('Visible');
      expect(result.html).not.toContain('Hidden');
    });

    it('should handle custom directives', async () => {
      compiler.addDirective('uppercase', {
        async process(directive, context) {
          const text = directive.expression.toUpperCase();
          return [
            {
              type: 'text',
              content: text,
            },
          ];
        },
      });

      const template = '<span hf-uppercase="hello world"></span>';
      const result = await compiler.compile(template);

      expect(result.html).toContain('HELLO WORLD');
    });
  });

  describe('performance and optimization', () => {
    it('should provide performance metrics', async () => {
      const template = '<div>{{message}}</div>';
      const result = await compiler.compile(template);

      expect(result.performance).toBeDefined();
      expect(result.performance!.parseTime).toBeGreaterThan(0);
      expect(result.performance!.compileTime).toBeGreaterThan(0);
      expect(result.performance!.totalTime).toBeGreaterThan(0);
    });

    it('should handle large templates efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const template = `
        <div>
          ${items.map(i => `<div class="item-${i}">Item {{item${i}}}</div>`).join('')}
        </div>
      `;

      const startTime = performance.now();
      const result = await compiler.compile(template);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should compile in less than 1 second
      expect(result.variables).toHaveLength(1000);
    });
  });

  describe('error handling and warnings', () => {
    it('should generate warnings for unused variables', async () => {
      const component = createComponent('test', 'Test', 'on click log "test"');
      component.template = {
        variables: {
          unusedVar: { type: 'string', description: 'Unused variable' },
          usedVar: { type: 'string', description: 'Used variable' },
        },
        html: '<div>{{usedVar}}</div>',
      };

      await compiler.registerComponent(component);

      const template = '<test></test>';
      const result = await compiler.compile(template);

      const unusedWarning = result.warnings.find(
        w => w.type === 'unused-variable' && w.message.includes('unusedVar')
      );
      expect(unusedWarning).toBeDefined();
    });

    it('should warn about missing components', async () => {
      const template = '<nonexistent-component></nonexistent-component>';
      const result = await compiler.compile(template);

      const missingWarning = result.warnings.find(w => w.type === 'missing-component');
      expect(missingWarning).toBeDefined();
    });

    it('should handle compilation errors gracefully', async () => {
      const template = '<div>{{unclosed variable</div>';

      await expect(compiler.compile(template)).rejects.toThrow();
    });
  });

  describe('minification', () => {
    it('should minify HTML when enabled', async () => {
      const template = `
        <div class="container">
          <p>   Some text with   whitespace   </p>
          <!-- Comment to remove -->
        </div>
      `;

      const result = await compiler.compile(template, { minify: true });

      expect(result.html).not.toContain('<!--');
      expect(result.html.length).toBeLessThan(template.length);
    });

    it('should preserve content when minification is disabled', async () => {
      const template = `
        <div class="container">
          <p>   Some text   </p>
          <!-- Important comment -->
        </div>
      `;

      const result = await compiler.compile(template, { minify: false });

      expect(result.html).toContain('<!--');
      expect(result.html.length).toBeGreaterThan(100);
    });
  });

  describe('complex integration scenarios', () => {
    it('should compile complex real-world template', async () => {
      // Register components
      const userCard = createComponent(
        'user-card',
        'User Card',
        'on click fetch /api/user/{{userId}} then put result.name into .name'
      );
      userCard.template = {
        html: `
          <div class="user-card" data-user-id="{{userId}}">
            <div class="avatar">
              <img src="{{avatar}}" alt="{{name}} avatar" />
            </div>
            <div class="info">
              <div class="name">{{name}}</div>
              <div class="role">{{role}}</div>
            </div>
            <div class="actions">{{children}}</div>
          </div>
        `,
        variables: {
          userId: { type: 'string', required: true, description: 'User ID' },
          name: { type: 'string', required: true, description: 'User name' },
          avatar: { type: 'string', description: 'Avatar URL' },
          role: { type: 'string', description: 'User role' },
        },
      };

      await compiler.registerComponent(userCard);

      const template = `
        <div class="user-list" _="init fetch /api/users then put result into me">
          <user-card userId="1" name="John Doe" role="Admin">
            <button _="on click call deleteUser with '1'">Delete</button>
          </user-card>
          <user-card userId="2" name="Jane Smith" role="User">
            <button _="on click call editUser with '2'">Edit</button>
          </user-card>
        </div>
      `;

      const result = await compiler.compile(template);

      expect(result.components).toHaveLength(1);
      expect(result.hyperscript).toHaveLength(3); // 1 container + 2 buttons
      expect(result.variables).toContain('userId');
      expect(result.variables).toContain('name');
      expect(result.variables).toContain('role');

      const rendered = await compiler.render(result, {});
      expect(rendered).toContain('John Doe');
      expect(rendered).toContain('Jane Smith');
      expect(rendered).toContain('data-user-id="1"');
      expect(rendered).toContain('data-user-id="2"');
    });
  });
});
