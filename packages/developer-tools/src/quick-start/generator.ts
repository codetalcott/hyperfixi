/**
 * Quick Start Generator
 * Simplified API for code generation and scaffolding
 */

import { createProject, createComponent, createTemplate, generateCode } from '../generator';
import type { ScaffoldOptions, ComponentDefinition, GeneratorConfig } from '../types';

/**
 * Quick start generator with sensible defaults
 */
export function quickStartGenerator(
  options: {
    typescript?: boolean;
    testing?: boolean;
    linting?: boolean;
    git?: boolean;
    install?: boolean;
  } = {}
) {
  const {
    typescript = false,
    testing = true,
    linting = true,
    git = true,
    install = true,
  } = options;

  return {
    /**
     * Create a new project with minimal setup
     */
    async createBasicProject(name: string, description?: string): Promise<void> {
      const scaffoldOptions: ScaffoldOptions = {
        template: 'basic',
        name,
        description,
        author: '',
        license: 'MIT',
        features: [],
        typescript,
        testing,
        linting,
        git,
        install,
      };

      await createProject(scaffoldOptions);
    },

    /**
     * Create a project with specific features
     */
    async createProjectWithFeatures(
      name: string,
      features: string[],
      options: Partial<ScaffoldOptions> = {}
    ): Promise<void> {
      const scaffoldOptions: ScaffoldOptions = {
        template: 'basic',
        name,
        description: options.description,
        author: options.author || '',
        license: options.license || 'MIT',
        features,
        typescript,
        testing,
        linting,
        git,
        install,
        ...options,
      };

      await createProject(scaffoldOptions);
    },

    /**
     * Create a multi-tenant project
     */
    async createMultiTenantProject(name: string, description?: string): Promise<void> {
      const scaffoldOptions: ScaffoldOptions = {
        template: 'multi-tenant',
        name,
        description,
        author: '',
        license: 'MIT',
        features: ['multi-tenant'],
        typescript,
        testing,
        linting,
        git,
        install,
      };

      await createProject(scaffoldOptions);
    },

    /**
     * Create an analytics-enabled project
     */
    async createAnalyticsProject(name: string, description?: string): Promise<void> {
      const scaffoldOptions: ScaffoldOptions = {
        template: 'analytics',
        name,
        description,
        author: '',
        license: 'MIT',
        features: ['analytics'],
        typescript,
        testing,
        linting,
        git,
        install,
      };

      await createProject(scaffoldOptions);
    },

    /**
     * Create a simple interactive component
     */
    async createInteractiveComponent(options: {
      name: string;
      description?: string;
      event?: string;
      action?: string;
    }): Promise<void> {
      const { name, description, event = 'click', action = 'log "Component clicked!"' } = options;

      await createComponent({
        name,
        description: description || `${name} interactive component`,
        category: 'interactive',
        typescript,
      });
    },

    /**
     * Create a form component
     */
    async createFormComponent(options: {
      name: string;
      description?: string;
      fields?: Array<{ name: string; type: string; required?: boolean }>;
    }): Promise<void> {
      const { name, description, fields = [] } = options;

      await createComponent({
        name,
        description: description || `${name} form component`,
        category: 'forms',
        typescript,
      });
    },

    /**
     * Generate component from template
     */
    async generateComponentFromTemplate(
      template: string,
      data: Record<string, any>
    ): Promise<string> {
      const config: GeneratorConfig = {
        target: typescript ? 'typescript' : 'javascript',
        format: 'module',
        optimization: {
          minify: false,
          comments: true,
          sourceMaps: false,
        },
        typescript: {
          strict: true,
          target: 'ES2020',
          moduleResolution: 'bundler',
        },
      };

      const result = await generateCode(template, data, config);
      return result.files[0]?.content || '';
    },

    /**
     * Generate a complete page with components
     */
    async generatePage(options: {
      title: string;
      components: Array<{
        id: string;
        props?: Record<string, any>;
      }>;
      styles?: string;
      scripts?: string;
    }): Promise<string> {
      const { title, components, styles = '', scripts = '' } = options;

      const componentHTML = components
        .map(({ id, props = {} }) => {
          // This would use actual component templates
          return `<div class="component component-${id}" data-component="${id}">
  <!-- ${id} component -->
</div>`;
        })
        .join('\n    ');

      const pageTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 2rem;
            line-height: 1.6;
        }
        
        .component {
            margin: 1rem 0;
            padding: 1rem;
            border: 1px solid #e1e5e9;
            border-radius: 0.5rem;
        }
        
        {{styles}}
    </style>
</head>
<body>
    <h1>{{title}}</h1>
    
    {{components}}
    
    <script>
        {{scripts}}
    </script>
</body>
</html>`;

      return this.generateComponentFromTemplate(pageTemplate, {
        title,
        components: componentHTML,
        styles,
        scripts,
      });
    },

    /**
     * Quick starter templates
     */
    templates: {
      /**
       * Landing page template
       */
      landingPage: (title: string, subtitle: string) => ({
        template: 'landing-page',
        data: { title, subtitle },
      }),

      /**
       * Dashboard template
       */
      dashboard: (title: string) => ({
        template: 'dashboard',
        data: { title },
      }),

      /**
       * Blog template
       */
      blog: (title: string, posts: Array<{ title: string; content: string }>) => ({
        template: 'blog',
        data: { title, posts },
      }),

      /**
       * Contact form template
       */
      contactForm: (title: string, fields: string[]) => ({
        template: 'contact-form',
        data: { title, fields },
      }),
    },

    /**
     * Utility functions
     */
    utils: {
      /**
       * Validate project name
       */
      validateProjectName(name: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!name) {
          errors.push('Project name is required');
        }

        if (name && !/^[a-z][a-z0-9-]*$/.test(name)) {
          errors.push(
            'Project name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens'
          );
        }

        if (name && name.length > 50) {
          errors.push('Project name must be 50 characters or less');
        }

        const reservedNames = ['node_modules', 'dist', 'build', 'src', 'test', 'tests'];
        if (reservedNames.includes(name)) {
          errors.push(`"${name}" is a reserved name and cannot be used`);
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      },

      /**
       * Generate random project name
       */
      generateProjectName(): string {
        const adjectives = [
          'awesome',
          'clever',
          'dynamic',
          'elegant',
          'fantastic',
          'great',
          'innovative',
          'modern',
          'smart',
          'vibrant',
        ];
        const nouns = [
          'app',
          'project',
          'site',
          'tool',
          'widget',
          'component',
          'interface',
          'platform',
          'system',
          'solution',
        ];

        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 1000);

        return `${adjective}-${noun}-${number}`;
      },

      /**
       * Convert string to component ID
       */
      toComponentId(name: string): string {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      },

      /**
       * Convert string to PascalCase
       */
      toPascalCase(str: string): string {
        return str
          .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
          .replace(/^(.)/, (_, c) => c.toUpperCase());
      },

      /**
       * Convert string to camelCase
       */
      toCamelCase(str: string): string {
        const pascal = this.toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
      },
    },
  };
}
