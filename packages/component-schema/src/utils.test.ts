import { describe, it, expect } from 'vitest';
import {
  createComponent,
  createTemplatedComponent,
  createCollection,
  mergeComponents,
  extractTemplateVariables,
  generateTemplateVariableDefinitions,
  analyzeComplexity,
  generateMetadata,
  createExample,
  checkCircularDependencies,
  getTopologicalOrder,
} from './utils';
import { ComponentDefinition, ComponentCollection, TemplateVariable } from './types';

describe('Component Utils', () => {
  describe('createComponent', () => {
    it('should create a basic component', () => {
      const component = createComponent('test-id', 'Test Component', 'on click toggle .active');

      expect(component.id).toBe('test-id');
      expect(component.name).toBe('Test Component');
      expect(component.version).toBe('1.0.0');
      expect(component.hyperscript).toBe('on click toggle .active');
    });

    it('should create a component with custom version', () => {
      const component = createComponent(
        'test-id',
        'Test Component',
        'on click toggle .active',
        '2.0.0'
      );

      expect(component.version).toBe('2.0.0');
    });

    it('should create a component with hyperscript array', () => {
      const hyperscript = ['on click toggle .active', 'on mouseover add .hover'];
      const component = createComponent('test-id', 'Test Component', hyperscript);

      expect(component.hyperscript).toEqual(hyperscript);
    });
  });

  describe('createTemplatedComponent', () => {
    it('should create a component with template', () => {
      const template = {
        html: '<button>{{buttonText}}</button>',
        variables: {
          buttonText: {
            type: 'string' as const,
            required: true,
            description: 'Button text',
          },
        },
      };

      const component = createTemplatedComponent(
        'templated-component',
        'Templated Component',
        'on click toggle .active',
        template
      );

      expect(component.template).toEqual(template);
      expect(component.template?.variables?.buttonText.type).toBe('string');
    });
  });

  describe('createCollection', () => {
    it('should create a basic collection', () => {
      const components = {
        'component-1': createComponent('component-1', 'Component 1', 'on click toggle .active'),
      };

      const collection = createCollection('Test Collection', components);

      expect(collection.name).toBe('Test Collection');
      expect(collection.version).toBe('1.0.0');
      expect(collection.components).toEqual(components);
    });
  });

  describe('mergeComponents', () => {
    it('should merge two components', () => {
      const base: ComponentDefinition = {
        id: 'base-component',
        name: 'Base Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
        tags: ['base', 'component'],
        metadata: {
          keywords: ['base'],
        },
      };

      const override: Partial<ComponentDefinition> = {
        description: 'Extended component',
        tags: ['extended'],
        metadata: {
          keywords: ['extended'],
          author: 'Test Author',
        },
      };

      const merged = mergeComponents(base, override);

      expect(merged.description).toBe('Extended component');
      expect(merged.tags).toEqual(['base', 'component', 'extended']);
      expect(merged.metadata?.keywords).toEqual(['base', 'extended']);
      expect(merged.metadata?.author).toBe('Test Author');
    });

    it('should merge template variables', () => {
      const base: ComponentDefinition = {
        id: 'base-component',
        name: 'Base Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
        template: {
          variables: {
            baseVar: {
              type: 'string',
              description: 'Base variable',
            },
          },
        },
      };

      const override: Partial<ComponentDefinition> = {
        template: {
          variables: {
            extendedVar: {
              type: 'number',
              description: 'Extended variable',
            },
          },
        },
      };

      const merged = mergeComponents(base, override);

      expect(merged.template?.variables?.baseVar).toBeDefined();
      expect(merged.template?.variables?.extendedVar).toBeDefined();
    });
  });

  describe('extractTemplateVariables', () => {
    it('should extract variables from hyperscript string', () => {
      const hyperscript = 'on click fetch /api/users/{{userId}} then put result into #{{resultId}}';
      const variables = extractTemplateVariables(hyperscript);

      expect(variables).toEqual(['resultId', 'userId']);
    });

    it('should extract variables from hyperscript array', () => {
      const hyperscript = [
        'on click fetch /api/users/{{userId}}',
        'on submit put {{formData}} into #{{targetId}}',
      ];
      const variables = extractTemplateVariables(hyperscript);

      expect(variables).toEqual(['formData', 'targetId', 'userId']);
    });

    it('should extract variables from HTML template', () => {
      const hyperscript = 'on click toggle .active';
      const html = '<button class="{{buttonClass}}">{{buttonText}}</button>';
      const variables = extractTemplateVariables(hyperscript, html);

      expect(variables).toEqual(['buttonClass', 'buttonText']);
    });

    it('should handle duplicate variables', () => {
      const hyperscript = 'on click fetch /api/users/{{userId}} then log {{userId}}';
      const variables = extractTemplateVariables(hyperscript);

      expect(variables).toEqual(['userId']);
    });
  });

  describe('generateTemplateVariableDefinitions', () => {
    it('should generate basic string variables', () => {
      const variables = ['userName', 'message'];
      const definitions = generateTemplateVariableDefinitions(variables);

      expect(definitions.userName.type).toBe('string');
      expect(definitions.message.type).toBe('string');
      expect(definitions.userName.required).toBe(false);
    });

    it('should infer number types from variable names', () => {
      const variables = ['userId', 'count', 'index'];
      const definitions = generateTemplateVariableDefinitions(variables);

      expect(definitions.userId.type).toBe('number');
      expect(definitions.count.type).toBe('number');
      expect(definitions.index.type).toBe('number');
    });

    it('should infer boolean types from variable names', () => {
      const variables = ['isActive', 'hasData', 'enabled'];
      const definitions = generateTemplateVariableDefinitions(variables);

      expect(definitions.isActive.type).toBe('boolean');
      expect(definitions.hasData.type).toBe('boolean');
      expect(definitions.enabled.type).toBe('boolean');
    });

    it('should infer array types from variable names', () => {
      const variables = ['itemList', 'items'];
      const definitions = generateTemplateVariableDefinitions(variables);

      expect(definitions.itemList.type).toBe('array');
      expect(definitions.items.type).toBe('array');
    });
  });

  describe('analyzeComplexity', () => {
    it('should calculate complexity for simple component', () => {
      const component: ComponentDefinition = {
        id: 'simple-component',
        name: 'Simple Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
      };

      const complexity = analyzeComplexity(component);
      expect(complexity).toBeGreaterThan(1);
      expect(complexity).toBeLessThanOrEqual(10);
    });

    it('should calculate higher complexity for complex component', () => {
      const component: ComponentDefinition = {
        id: 'complex-component',
        name: 'Complex Component',
        version: '1.0.0',
        hyperscript: [
          'on click fetch /api/data then put result into #target',
          'on submit halt then validate then post to /api/save',
          'on keydown if event.key == "Escape" then hide #modal',
        ],
        dependencies: {
          components: ['dependency-1', 'dependency-2'],
        },
        template: {
          variables: {
            var1: { type: 'string' },
            var2: { type: 'number' },
            var3: { type: 'boolean' },
          },
        },
      };

      const complexity = analyzeComplexity(component);
      expect(complexity).toBeGreaterThan(3);
    });

    it('should cap complexity at 10', () => {
      const component: ComponentDefinition = {
        id: 'super-complex-component',
        name: 'Super Complex Component',
        version: '1.0.0',
        hyperscript: Array(20)
          .fill('on click fetch /api/data then put result into #target')
          .join(' '),
        dependencies: {
          components: Array(20)
            .fill('dependency')
            .map((_, i) => `dependency-${i}`),
        },
      };

      const complexity = analyzeComplexity(component);
      expect(complexity).toBe(10);
    });
  });

  describe('generateMetadata', () => {
    it('should generate metadata for component without existing metadata', () => {
      const component: ComponentDefinition = {
        id: 'test-component',
        name: 'Test Component',
        description: 'A simple test component for validation',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
        category: 'ui-interaction',
      };

      const enhanced = generateMetadata(component);

      expect(enhanced.metadata).toBeDefined();
      expect(enhanced.metadata?.keywords).toContain('test');
      expect(enhanced.metadata?.keywords).toContain('component');
      expect(enhanced.metadata?.keywords).toContain('ui-interaction');
      expect(enhanced.metadata?.created).toBeDefined();
      expect(enhanced.metadata?.updated).toBeDefined();
      expect(enhanced.validation?.complexity).toBeDefined();
    });

    it('should preserve existing metadata', () => {
      const component: ComponentDefinition = {
        id: 'test-component',
        name: 'Test Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
        metadata: {
          author: 'Original Author',
          keywords: ['original', 'keywords'],
          created: '2023-01-01T00:00:00Z',
        },
      };

      const enhanced = generateMetadata(component);

      expect(enhanced.metadata?.author).toBe('Original Author');
      expect(enhanced.metadata?.keywords).toEqual(['original', 'keywords']);
      expect(enhanced.metadata?.created).toBe('2023-01-01T00:00:00Z');
      expect(enhanced.metadata?.updated).toBeDefined();
    });
  });

  describe('createExample', () => {
    it('should create a basic example', () => {
      const example = createExample('Basic Example', '<button>Click me</button>');

      expect(example.name).toBe('Basic Example');
      expect(example.html).toBe('<button>Click me</button>');
    });

    it('should create an example with variables and description', () => {
      const variables = { buttonText: 'Custom Text' };
      const example = createExample(
        'Custom Example',
        '<button>{{buttonText}}</button>',
        variables,
        'Example with custom button text'
      );

      expect(example.variables).toEqual(variables);
      expect(example.description).toBe('Example with custom button text');
    });
  });

  describe('checkCircularDependencies', () => {
    it('should detect no circular dependencies in valid collection', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'component-a': {
            id: 'component-a',
            name: 'Component A',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
          },
          'component-b': {
            id: 'component-b',
            name: 'Component B',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
            dependencies: {
              components: ['component-a'],
            },
          },
        },
      };

      const cycles = checkCircularDependencies(collection);
      expect(cycles).toHaveLength(0);
    });

    it('should detect circular dependencies', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'component-a': {
            id: 'component-a',
            name: 'Component A',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
            dependencies: {
              components: ['component-b'],
            },
          },
          'component-b': {
            id: 'component-b',
            name: 'Component B',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
            dependencies: {
              components: ['component-a'],
            },
          },
        },
      };

      const cycles = checkCircularDependencies(collection);
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('component-a');
      expect(cycles[0]).toContain('component-b');
    });
  });

  describe('getTopologicalOrder', () => {
    it('should return components in dependency order', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'component-c': {
            id: 'component-c',
            name: 'Component C',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
            dependencies: {
              components: ['component-a', 'component-b'],
            },
          },
          'component-a': {
            id: 'component-a',
            name: 'Component A',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
          },
          'component-b': {
            id: 'component-b',
            name: 'Component B',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
            dependencies: {
              components: ['component-a'],
            },
          },
        },
      };

      const order = getTopologicalOrder(collection);

      expect(order.indexOf('component-a')).toBeLessThan(order.indexOf('component-b'));
      expect(order.indexOf('component-b')).toBeLessThan(order.indexOf('component-c'));
    });
  });
});
