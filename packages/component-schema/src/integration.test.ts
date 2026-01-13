/**
 * Integration tests for component-schema package
 * Tests the public API used by consumer packages (template-integration, ssr-support)
 */
import { describe, it, expect } from 'vitest';
import {
  createComponent,
  createTemplatedComponent,
  createCollection,
  validateComponent,
  validateCollection,
  createRegistry,
  mergeComponents,
  analyzeComplexity,
  generateMetadata,
  extractTemplateVariables,
  checkCircularDependencies,
  getTopologicalOrder,
  ComponentDefinition,
  ComponentCollection,
  ComponentFilter,
} from './index';

describe('Integration: Consumer Package Usage Patterns', () => {
  describe('template-integration usage', () => {
    it('creates components with createComponent', () => {
      const component = createComponent(
        'toggle-button',
        'Toggle Button',
        'on click toggle .active'
      );

      expect(component.id).toBe('toggle-button');
      expect(component.name).toBe('Toggle Button');
      expect(component.version).toBe('1.0.0');
      expect(component.hyperscript).toBe('on click toggle .active');
    });

    it('creates templated components for variable substitution', () => {
      const component = createTemplatedComponent(
        'counter-display',
        'Counter Display',
        'on click increment {{target}}',
        {
          variables: {
            target: { type: 'string', required: true, description: 'Target selector' },
          },
        }
      );

      expect(component.template?.variables).toBeDefined();
      expect(component.template?.variables?.target.type).toBe('string');
    });

    it('creates collections for grouping components', () => {
      const button = createComponent('btn', 'Button', 'on click toggle .active');
      const modal = createComponent('modal', 'Modal', 'on click toggle .visible');

      const collection = createCollection('UI Components', { btn: button, modal: modal });

      expect(collection.name).toBe('UI Components');
      expect(collection.version).toBe('1.0.0');
      expect(Object.keys(collection.components)).toHaveLength(2);
    });

    it('validates components before processing', () => {
      const component = createComponent(
        'valid-component',
        'Valid Component',
        'on click log "clicked"'
      );

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates collections with multiple components', () => {
      const collection = createCollection('Test Collection', {
        'comp-a': createComponent('comp-a', 'Component A', 'on click toggle .active'),
        'comp-b': createComponent('comp-b', 'Component B', 'on mouseover add .hover'),
      });

      const result = validateCollection(collection);
      expect(result.valid).toBe(true);
    });
  });

  describe('ssr-support usage', () => {
    it('creates components for server-side rendering', () => {
      const component: ComponentDefinition = {
        ...createComponent(
          'ssr-component',
          'SSR Component',
          'on load fetch /api/data then put result into me'
        ),
        category: 'data',
      };

      expect(component.category).toBe('data');
    });

    it('supports array hyperscript for multiple behaviors', () => {
      const component = createComponent('multi-behavior', 'Multi Behavior', [
        'on click toggle .active',
        'on mouseenter add .hover',
        'on mouseleave remove .hover',
      ]);

      expect(Array.isArray(component.hyperscript)).toBe(true);
      expect((component.hyperscript as string[]).length).toBe(3);
    });
  });

  describe('Round-trip serialization', () => {
    it('serializes and deserializes component correctly', () => {
      const original: ComponentDefinition = {
        ...createComponent(
          'serialized-component',
          'Serialized Component',
          'on click increment #counter'
        ),
        category: 'ui-interaction',
        tags: ['counter', 'increment'],
        metadata: {
          author: 'Test Author',
          keywords: ['test', 'serialization'],
        },
      };

      const serialized = JSON.stringify(original);
      const deserialized: ComponentDefinition = JSON.parse(serialized);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.hyperscript).toBe(original.hyperscript);
      expect(deserialized.category).toBe(original.category);
      expect(deserialized.tags).toEqual(original.tags);
      expect(deserialized.metadata?.author).toBe(original.metadata?.author);

      // Validate deserialized component
      const result = validateComponent(deserialized);
      expect(result.valid).toBe(true);
    });

    it('serializes and deserializes collection correctly', () => {
      const original: ComponentCollection = {
        ...createCollection('Test Collection', {
          'comp-a': createComponent('comp-a', 'Component A', 'on click toggle .active'),
          'comp-b': createComponent('comp-b', 'Component B', 'on mouseover add .hover'),
        }),
        author: 'Test Author',
      };

      const serialized = JSON.stringify(original);
      const deserialized: ComponentCollection = JSON.parse(serialized);

      expect(deserialized.name).toBe(original.name);
      expect(Object.keys(deserialized.components)).toEqual(['comp-a', 'comp-b']);

      const result = validateCollection(deserialized);
      expect(result.valid).toBe(true);
    });
  });

  describe('Registry operations', () => {
    it('creates memory registry and performs CRUD', async () => {
      const registry = createRegistry('memory');

      const component = createComponent('registry-test', 'Registry Test', 'on click');

      await registry.register(component);
      const retrieved = await registry.get('registry-test');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Registry Test');

      await registry.unregister('registry-test');
      const afterDelete = await registry.get('registry-test');
      expect(afterDelete).toBeNull();
    });

    it('filters components by category', async () => {
      const registry = createRegistry('memory');

      const form1: ComponentDefinition = {
        ...createComponent('form-1', 'Form 1', 'on submit'),
        category: 'form',
      };

      const nav1: ComponentDefinition = {
        ...createComponent('nav-1', 'Nav 1', 'on click'),
        category: 'navigation',
      };

      await registry.register(form1);
      await registry.register(nav1);

      const filter: ComponentFilter = { category: 'form' };
      const results = await registry.list(filter);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('form-1');
    });

    it('searches components by query', async () => {
      const registry = createRegistry('memory');

      const modal: ComponentDefinition = {
        ...createComponent('modal-dialog', 'Modal Dialog', 'on click toggle .visible'),
        description: 'A reusable modal dialog component',
      };

      const tooltip = createComponent('tooltip', 'Tooltip', 'on mouseenter show');

      await registry.register(modal);
      await registry.register(tooltip);

      const results = await registry.search('modal');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('modal-dialog');
    });

    it('filters by author metadata', async () => {
      const registry = createRegistry('memory');

      const comp1: ComponentDefinition = {
        ...createComponent('comp-1', 'Component 1', 'on click'),
        metadata: { author: 'Alice Smith' },
      };

      const comp2: ComponentDefinition = {
        ...createComponent('comp-2', 'Component 2', 'on hover'),
        metadata: { author: 'Bob Jones' },
      };

      await registry.register(comp1);
      await registry.register(comp2);

      const results = await registry.list({ author: 'alice' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('comp-1');
    });

    it('filters by complexity range', async () => {
      const registry = createRegistry('memory');

      const simple: ComponentDefinition = {
        ...createComponent('simple', 'Simple', 'on click toggle .active'),
        validation: { complexity: 2 },
      };

      const complex: ComponentDefinition = {
        ...createComponent(
          'complex',
          'Complex',
          'on click fetch /api then put result into #target'
        ),
        validation: { complexity: 7 },
      };

      await registry.register(simple);
      await registry.register(complex);

      const simpleResults = await registry.list({ complexity: { max: 3 } });
      expect(simpleResults.length).toBe(1);
      expect(simpleResults[0].id).toBe('simple');

      const complexResults = await registry.list({ complexity: { min: 5 } });
      expect(complexResults.length).toBe(1);
      expect(complexResults[0].id).toBe('complex');
    });
  });

  describe('Utility functions', () => {
    it('merges components correctly', () => {
      const base: ComponentDefinition = {
        ...createComponent('base', 'Base', 'on click'),
        tags: ['original'],
      };

      const extension: ComponentDefinition = {
        ...createComponent('extended', 'Extended', 'on click toggle .active'),
        tags: ['extended'],
        category: 'ui-interaction',
      };

      const merged = mergeComponents(base, extension);
      expect(merged.id).toBe('extended');
      expect(merged.hyperscript).toBe('on click toggle .active');
      expect(merged.tags).toContain('original');
      expect(merged.tags).toContain('extended');
      expect(merged.category).toBe('ui-interaction');
    });

    it('analyzes component complexity', () => {
      const simple = createComponent('simple', 'Simple', 'on click toggle .active');

      const complex = createComponent('complex', 'Complex', [
        'on click fetch /api/data then put result into #container',
        'on load trigger dataLoaded',
        'on dataLoaded wait 500ms then add .loaded',
      ]);

      expect(analyzeComplexity(simple)).toBeLessThan(analyzeComplexity(complex));
    });

    it('generates metadata from component', () => {
      const component: ComponentDefinition = {
        ...createComponent('meta-test', 'Meta Test', 'on click toggle .active'),
        description: 'A test component for metadata generation',
      };

      const result = generateMetadata(component);
      expect(result.metadata?.keywords).toBeDefined();
      expect(result.metadata?.generatedAt || result.metadata?.updated).toBeDefined();
    });

    it('extracts template variables from hyperscript', () => {
      const variables = extractTemplateVariables('on click toggle {{className}} on {{target}}');
      expect(variables).toContain('className');
      expect(variables).toContain('target');
    });

    it('detects circular dependencies', () => {
      const collection = createCollection('Circular Test', {
        a: {
          ...createComponent('a', 'A', 'on click'),
          dependencies: { components: ['b'] },
        },
        b: {
          ...createComponent('b', 'B', 'on click'),
          dependencies: { components: ['c'] },
        },
        c: {
          ...createComponent('c', 'C', 'on click'),
          dependencies: { components: ['a'] },
        },
      });

      const circular = checkCircularDependencies(collection);
      expect(circular.length).toBeGreaterThan(0);
    });

    it('returns topological order for dependencies', () => {
      const collection = createCollection('Dependency Test', {
        app: {
          ...createComponent('app', 'App', 'on load'),
          dependencies: { components: ['button', 'modal'] },
        },
        button: createComponent('button', 'Button', 'on click'),
        modal: {
          ...createComponent('modal', 'Modal', 'on open'),
          dependencies: { components: ['button'] },
        },
      });

      const order = getTopologicalOrder(collection);
      const buttonIndex = order.indexOf('button');
      const modalIndex = order.indexOf('modal');
      const appIndex = order.indexOf('app');

      expect(buttonIndex).toBeLessThan(modalIndex);
      expect(buttonIndex).toBeLessThan(appIndex);
      expect(modalIndex).toBeLessThan(appIndex);
    });
  });
});
