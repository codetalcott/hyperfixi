import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentValidator, validateComponent, validateCollection } from './validator';
import { ComponentDefinition, ComponentCollection } from './types';

describe('ComponentValidator', () => {
  let validator: ComponentValidator;

  beforeEach(() => {
    validator = new ComponentValidator();
  });

  describe('validateComponent', () => {
    it('should validate a minimal valid component', () => {
      const component: ComponentDefinition = {
        id: 'test-component',
        name: 'Test Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
      };

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a comprehensive component', () => {
      const component: ComponentDefinition = {
        id: 'comprehensive-component',
        name: 'Comprehensive Component',
        description: 'A component with all possible properties',
        version: '2.1.0',
        category: 'ui-interaction',
        tags: ['button', 'interactive'],
        hyperscript: ['on click toggle .active', 'on mouseover add .hover'],
        template: {
          html: '<button class="{{buttonClass}}">{{buttonText}}</button>',
          variables: {
            buttonClass: {
              type: 'string',
              default: 'btn',
              description: 'Button CSS class',
            },
            buttonText: {
              type: 'string',
              required: true,
              description: 'Button text',
            },
          },
          slots: {
            content: {
              description: 'Button content',
              required: true,
            },
          },
        },
        dependencies: {
          components: ['base-component'],
          css: ['styles.css'],
          javascript: ['behavior.js'],
        },
        configuration: {
          compilation: {
            minify: true,
            compatibility: 'modern',
          },
          deployment: {
            environments: ['production'],
            frameworks: ['express'],
          },
        },
        metadata: {
          author: 'Test Author',
          license: 'MIT',
          keywords: ['test', 'component'],
          examples: [
            {
              name: 'Basic Example',
              html: '<button>Click me</button>',
            },
          ],
        },
        validation: {
          events: ['click', 'mouseover'],
          selectors: ['.active', '.hover'],
          commands: ['toggle', 'add'],
          complexity: 3,
        },
        testing: {
          unit: [
            {
              name: 'Click toggles active',
              action: 'click button',
              expected: 'button has class active',
            },
          ],
        },
      };

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject component with invalid id', () => {
      const component: ComponentDefinition = {
        id: 'Invalid_ID',
        name: 'Test Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
      };

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('id'))).toBe(true);
    });

    it('should reject component with missing required fields', () => {
      const component = {
        name: 'Test Component',
        hyperscript: 'on click toggle .active',
      } as ComponentDefinition;

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject component with invalid version format', () => {
      const component: ComponentDefinition = {
        id: 'test-component',
        name: 'Test Component',
        version: 'invalid-version',
        hyperscript: 'on click toggle .active',
      };

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('version'))).toBe(true);
    });

    it('should validate component with hyperscript array', () => {
      const component: ComponentDefinition = {
        id: 'multi-script-component',
        name: 'Multi Script Component',
        version: '1.0.0',
        hyperscript: ['on click toggle .active', 'on mouseover add .hover'],
      };

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about unused template variables', () => {
      const component: ComponentDefinition = {
        id: 'unused-var-component',
        name: 'Unused Variable Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
        template: {
          variables: {
            unusedVar: {
              type: 'string',
              description: 'This variable is not used',
            },
          },
        },
      };

      const result = validator.validateComponent(component);
      expect(result.warnings.some(w => w.message.includes('not used'))).toBe(true);
    });

    it('should detect self-dependency error', () => {
      const component: ComponentDefinition = {
        id: 'self-dependent',
        name: 'Self Dependent Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
        dependencies: {
          components: ['self-dependent'],
        },
      };

      const result = validator.validateComponent(component);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('depend on itself'))).toBe(true);
    });
  });

  describe('validateCollection', () => {
    it('should validate a valid collection', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'component-1': {
            id: 'component-1',
            name: 'Component 1',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
          },
          'component-2': {
            id: 'component-2',
            name: 'Component 2',
            version: '1.0.0',
            hyperscript: 'on click add .selected',
          },
        },
      };

      const result = validator.validateCollection(collection);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject collection with duplicate component IDs', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'component-a': {
            id: 'duplicate-id',
            name: 'Component A',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
          },
          'component-b': {
            id: 'duplicate-id',
            name: 'Component B',
            version: '1.0.0',
            hyperscript: 'on click add .selected',
          },
        },
      };

      const result = validator.validateCollection(collection);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate component ID'))).toBe(true);
    });

    it('should validate collection with external component references', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'internal-component': {
            id: 'internal-component',
            name: 'Internal Component',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
          },
          'external-component': './external-component.json',
        },
      };

      const result = validator.validateCollection(collection);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about missing internal dependencies', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'dependent-component': {
            id: 'dependent-component',
            name: 'Dependent Component',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
            dependencies: {
              components: ['missing-component'],
            },
          },
        },
      };

      const result = validator.validateCollection(collection);
      expect(result.warnings.some(w => w.message.includes('not found in collection'))).toBe(true);
    });
  });

  describe('convenience functions', () => {
    it('should export validateComponent function', () => {
      const component: ComponentDefinition = {
        id: 'test-component',
        name: 'Test Component',
        version: '1.0.0',
        hyperscript: 'on click toggle .active',
      };

      const result = validateComponent(component);
      expect(result.valid).toBe(true);
    });

    it('should export validateCollection function', () => {
      const collection: ComponentCollection = {
        name: 'Test Collection',
        version: '1.0.0',
        components: {
          'test-component': {
            id: 'test-component',
            name: 'Test Component',
            version: '1.0.0',
            hyperscript: 'on click toggle .active',
          },
        },
      };

      const result = validateCollection(collection);
      expect(result.valid).toBe(true);
    });
  });
});
