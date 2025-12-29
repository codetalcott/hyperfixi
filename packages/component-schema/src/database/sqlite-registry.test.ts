/**
 * Tests for SqliteComponentRegistry
 */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SqliteComponentRegistry } from './sqlite-registry';
import { createComponent, createCollection } from '../utils';
import { ComponentDefinition, ComponentCollection } from '../types';
import { resetConnection } from './connection';

// Use a test-specific database path
const TEST_DB_PATH = path.join(__dirname, '../../test-components.db');

describe('SqliteComponentRegistry', () => {
  let registry: SqliteComponentRegistry;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Also clean up WAL files if they exist
    if (fs.existsSync(`${TEST_DB_PATH}-wal`)) {
      fs.unlinkSync(`${TEST_DB_PATH}-wal`);
    }
    if (fs.existsSync(`${TEST_DB_PATH}-shm`)) {
      fs.unlinkSync(`${TEST_DB_PATH}-shm`);
    }

    // Reset connection to ensure clean state
    resetConnection();

    registry = new SqliteComponentRegistry({ dbPath: TEST_DB_PATH });
    await registry.initialize();
  });

  afterEach(() => {
    registry.close();
  });

  afterAll(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(`${TEST_DB_PATH}-wal`)) {
      fs.unlinkSync(`${TEST_DB_PATH}-wal`);
    }
    if (fs.existsSync(`${TEST_DB_PATH}-shm`)) {
      fs.unlinkSync(`${TEST_DB_PATH}-shm`);
    }
  });

  describe('initialization', () => {
    it('creates schema on initialize', async () => {
      const count = await registry.count();
      expect(count).toBe(0);
    });

    it('can initialize multiple times safely', async () => {
      await registry.initialize();
      await registry.initialize();
      const count = await registry.count();
      expect(count).toBe(0);
    });
  });

  describe('CRUD operations', () => {
    it('registers a component', async () => {
      const component = createComponent('test-comp', 'Test Component', 'on click toggle .active');
      await registry.register(component);

      const retrieved = await registry.get('test-comp');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test Component');
    });

    it('updates existing component on register', async () => {
      const component = createComponent('test-comp', 'Test Component', 'on click toggle .active');
      await registry.register(component);

      const updated = createComponent('test-comp', 'Updated Component', 'on click toggle .updated');
      await registry.register(updated);

      const retrieved = await registry.get('test-comp');
      expect(retrieved?.name).toBe('Updated Component');
      expect(retrieved?.hyperscript).toBe('on click toggle .updated');
    });

    it('unregisters a component', async () => {
      const component = createComponent('test-comp', 'Test Component', 'on click toggle .active');
      await registry.register(component);

      await registry.unregister('test-comp');

      const retrieved = await registry.get('test-comp');
      expect(retrieved).toBeNull();
    });

    it('throws when unregistering non-existent component', async () => {
      await expect(registry.unregister('non-existent')).rejects.toThrow('not found');
    });

    it('returns null for non-existent component', async () => {
      const retrieved = await registry.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('throws on invalid component', async () => {
      const invalid = { id: 'x', name: 'X', version: '1.0.0', hyperscript: 'on click' };
      await expect(registry.register(invalid as ComponentDefinition)).rejects.toThrow();
    });
  });

  describe('list and filtering', () => {
    beforeEach(async () => {
      // Register test components
      await registry.register({
        ...createComponent('form-input', 'Form Input', 'on input validate me'),
        category: 'form',
        tags: ['input', 'validation'],
        metadata: { author: 'Alice Smith', keywords: ['form', 'input'] },
        validation: { complexity: 3 },
      });

      await registry.register({
        ...createComponent('nav-menu', 'Navigation Menu', 'on click toggle .open'),
        category: 'navigation',
        tags: ['menu', 'dropdown'],
        metadata: { author: 'Bob Jones', keywords: ['navigation', 'menu'] },
        validation: { complexity: 5 },
      });

      await registry.register({
        ...createComponent('modal-dialog', 'Modal Dialog', 'on open add .visible'),
        category: 'ui-interaction',
        tags: ['modal', 'popup'],
        metadata: { author: 'Alice Smith', keywords: ['modal', 'dialog'] },
        validation: { complexity: 7 },
      });
    });

    it('lists all components', async () => {
      const all = await registry.list();
      expect(all.length).toBe(3);
    });

    it('filters by category', async () => {
      const forms = await registry.list({ category: 'form' });
      expect(forms.length).toBe(1);
      expect(forms[0].id).toBe('form-input');
    });

    it('filters by version', async () => {
      const v1 = await registry.list({ version: '1.0.0' });
      expect(v1.length).toBe(3);
    });

    it('filters by tags', async () => {
      const withModal = await registry.list({ tags: ['modal'] });
      expect(withModal.length).toBe(1);
      expect(withModal[0].id).toBe('modal-dialog');

      const withMenuOrModal = await registry.list({ tags: ['menu', 'modal'] });
      expect(withMenuOrModal.length).toBe(2);
    });

    it('filters by author', async () => {
      const alice = await registry.list({ author: 'alice' });
      expect(alice.length).toBe(2);
    });

    it('filters by keywords', async () => {
      const formKeyword = await registry.list({ keywords: ['form'] });
      expect(formKeyword.length).toBe(1);
      expect(formKeyword[0].id).toBe('form-input');
    });

    it('filters by complexity range', async () => {
      const simple = await registry.list({ complexity: { max: 4 } });
      expect(simple.length).toBe(1);
      expect(simple[0].id).toBe('form-input');

      const complex = await registry.list({ complexity: { min: 6 } });
      expect(complex.length).toBe(1);
      expect(complex[0].id).toBe('modal-dialog');

      const medium = await registry.list({ complexity: { min: 4, max: 6 } });
      expect(medium.length).toBe(1);
      expect(medium[0].id).toBe('nav-menu');
    });

    it('combines multiple filters', async () => {
      const result = await registry.list({
        author: 'alice',
        complexity: { min: 5 },
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('modal-dialog');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await registry.register({
        ...createComponent('toggle-button', 'Toggle Button', 'on click toggle .active'),
        description: 'A button that toggles state',
        tags: ['button', 'toggle'],
      });

      await registry.register({
        ...createComponent('submit-form', 'Form Submit', 'on submit fetch /api/submit'),
        description: 'Handle form submission',
        tags: ['form', 'submit'],
      });
    });

    it('searches by name', async () => {
      const results = await registry.search('toggle');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('toggle-button');
    });

    it('searches by description', async () => {
      const results = await registry.search('submission');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('submit-form');
    });

    it('returns empty for no matches', async () => {
      const results = await registry.search('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('collections', () => {
    it('imports a collection', async () => {
      const collection = createCollection('UI Kit', {
        'ui-button': createComponent('ui-button', 'Button', 'on click toggle .pressed'),
        'ui-card': createComponent('ui-card', 'Card', 'on hover add .elevated'),
      });

      await registry.importCollection(collection);

      const all = await registry.list();
      expect(all.length).toBe(2);
    });

    it('exports a collection', async () => {
      await registry.register(createComponent('comp-a', 'Component A', 'on click'));
      await registry.register(createComponent('comp-b', 'Component B', 'on hover'));
      await registry.register(createComponent('comp-c', 'Component C', 'on load'));

      const exported = await registry.exportCollection(['comp-a', 'comp-c'], {
        name: 'Exported Kit',
      });

      expect(exported.name).toBe('Exported Kit');
      expect(Object.keys(exported.components)).toEqual(['comp-a', 'comp-c']);
      expect(exported.manifest?.statistics?.totalComponents).toBe(2);
    });
  });

  describe('count and clear', () => {
    it('counts components', async () => {
      expect(await registry.count()).toBe(0);

      await registry.register(createComponent('comp-a', 'A', 'on click'));
      expect(await registry.count()).toBe(1);

      await registry.register(createComponent('comp-b', 'B', 'on hover'));
      expect(await registry.count()).toBe(2);
    });

    it('clears all components', async () => {
      await registry.register(createComponent('comp-a', 'A', 'on click'));
      await registry.register(createComponent('comp-b', 'B', 'on hover'));

      await registry.clear();

      expect(await registry.count()).toBe(0);
    });
  });

  describe('data persistence', () => {
    it('persists data across registry instances', async () => {
      await registry.register(createComponent('persistent', 'Persistent', 'on click'));
      registry.close();

      // Create new registry instance with same database
      resetConnection();
      const newRegistry = new SqliteComponentRegistry({ dbPath: TEST_DB_PATH });
      await newRegistry.initialize();

      const retrieved = await newRegistry.get('persistent');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Persistent');

      newRegistry.close();
    });
  });

  describe('component with all fields', () => {
    it('stores and retrieves all component fields', async () => {
      const fullComponent: ComponentDefinition = {
        id: 'full-component',
        name: 'Full Component',
        description: 'A component with all fields',
        version: '2.0.0',
        category: 'ui-interaction',
        tags: ['complete', 'test'],
        hyperscript: ['on click toggle .active', 'on hover add .highlight'],
        template: {
          html: '<button>{{label}}</button>',
          variables: {
            label: { type: 'string', required: true },
          },
        },
        dependencies: {
          components: ['base-button'],
          css: ['styles.css'],
        },
        configuration: {
          compilation: { minify: true },
        },
        metadata: {
          author: 'Test Author',
          keywords: ['test', 'full'],
        },
        validation: {
          complexity: 5,
        },
        testing: {
          unit: [{ name: 'click test', action: 'click .button', expected: 'toggles active class' }],
        },
      };

      await registry.register(fullComponent);
      const retrieved = await registry.get('full-component');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('full-component');
      expect(retrieved?.description).toBe('A component with all fields');
      expect(retrieved?.version).toBe('2.0.0');
      expect(retrieved?.category).toBe('ui-interaction');
      expect(retrieved?.tags).toEqual(['complete', 'test']);
      expect(retrieved?.hyperscript).toEqual(['on click toggle .active', 'on hover add .highlight']);
      expect(retrieved?.template?.variables?.label.type).toBe('string');
      expect(retrieved?.dependencies?.components).toEqual(['base-button']);
      expect(retrieved?.configuration?.compilation?.minify).toBe(true);
      expect(retrieved?.metadata?.author).toBe('Test Author');
      expect(retrieved?.validation?.complexity).toBe(5);
      expect(retrieved?.testing?.unit?.[0].name).toBe('click test');
    });
  });
});
