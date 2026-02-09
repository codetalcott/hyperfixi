import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BehaviorModule, BehaviorSchema } from './schemas/types';

// Initialize the registry with schemas and loaders (same side-effect as index.ts)
import './loaders';

import {
  registerBehavior,
  registerSchema,
  registerLoader,
  getBehavior,
  tryGetBehavior,
  getSchema,
  tryGetSchema,
  isRegistered,
  hasLoader,
  getRegisteredBehaviors,
  getAvailableBehaviors,
  getBehaviorsByCategory,
  getBehaviorsByTier,
  getAllSchemas,
  getAllSchemasRecord,
  loadBehavior,
  preloadTier,
  preloadCategory,
  loadAll,
  registerWithRuntime,
  registerAllWithRuntime,
} from './registry';

// Create test fixtures
function createMockSchema(overrides: Partial<BehaviorSchema> = {}): BehaviorSchema {
  return {
    name: 'TestBehavior',
    category: 'ui',
    tier: 'core',
    version: '1.0.0',
    description: 'Test behavior',
    parameters: [],
    events: [],
    source: 'behavior TestBehavior\nend',
    ...overrides,
  };
}

function createMockModule(overrides: Partial<BehaviorModule> = {}): BehaviorModule {
  const schema = createMockSchema(overrides.metadata ? { ...overrides.metadata } : undefined);
  return {
    source: schema.source,
    metadata: schema,
    register: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('registry', () => {
  // Note: The registry is a module-level singleton, so loaders.ts has already
  // populated it with the 5 real behavior schemas. Tests build on this state.

  describe('registerBehavior', () => {
    it('should register a behavior and its schema', () => {
      const module = createMockModule({
        metadata: createMockSchema({ name: 'RegTest' }),
      });
      registerBehavior('RegTest', module);
      expect(getBehavior('RegTest')).toBe(module);
      expect(getSchema('RegTest').name).toBe('RegTest');
    });
  });

  describe('getBehavior / tryGetBehavior', () => {
    it('should throw for unregistered behavior', () => {
      expect(() => getBehavior('NonExistent')).toThrowError(/not registered/);
    });

    it('should suggest lazy loading in error message', () => {
      expect(() => getBehavior('NonExistent')).toThrowError(/loadBehavior/);
    });

    it('tryGetBehavior should return undefined for unregistered', () => {
      expect(tryGetBehavior('NonExistent')).toBeUndefined();
    });
  });

  describe('getSchema / tryGetSchema', () => {
    it('should throw for unregistered schema', () => {
      expect(() => getSchema('NonExistent')).toThrowError(/not registered/);
    });

    it('should suggest tryGetSchema in error message', () => {
      expect(() => getSchema('NonExistent')).toThrowError(/tryGetSchema/);
    });

    it('tryGetSchema should return undefined for unregistered', () => {
      expect(tryGetSchema('NonExistent')).toBeUndefined();
    });

    it('should return schema for registered behavior', () => {
      const schema = getSchema('Draggable');
      expect(schema.name).toBe('Draggable');
      expect(schema.category).toBe('ui');
    });
  });

  describe('isRegistered / hasLoader', () => {
    it('hasLoader should return true for registered loaders', () => {
      expect(hasLoader('Draggable')).toBe(true);
      expect(hasLoader('NonExistent')).toBe(false);
    });
  });

  describe('metadata queries', () => {
    it('getAllSchemasRecord should return record keyed by name', () => {
      const record = getAllSchemasRecord();
      expect(record.Draggable).toBeDefined();
      expect(record.Draggable.category).toBe('ui');
    });
  });

  describe('loadBehavior', () => {
    it('should load via registered loader', async () => {
      const module = await loadBehavior('Toggleable');
      expect(module).toBeDefined();
      expect(module.metadata.name).toBe('Toggleable');
    });

    it('should return cached module on second load', async () => {
      const first = await loadBehavior('Toggleable');
      const second = await loadBehavior('Toggleable');
      expect(first).toBe(second);
    });

    it('should throw for behavior with no loader', async () => {
      await expect(loadBehavior('NonExistent')).rejects.toThrowError(/No loader/);
    });
  });

  describe('preloadTier / preloadCategory', () => {
    it('preloadTier should load all behaviors in a tier', async () => {
      await preloadTier('core');
      expect(isRegistered('Draggable')).toBe(true);
      expect(isRegistered('Toggleable')).toBe(true);
    });

    it('preloadCategory should load all behaviors in a category', async () => {
      await preloadCategory('ui');
      expect(isRegistered('Draggable')).toBe(true);
    });

    it('preloadTier should warn on load failure', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Register a loader that fails
      registerLoader('FailBehavior', () => Promise.reject(new Error('test fail')));
      registerSchema(createMockSchema({ name: 'FailBehavior', tier: 'optional' }));

      await preloadTier('optional');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('FailBehavior'),
        expect.any(Error)
      );
      warnSpy.mockRestore();
    });
  });

  describe('loadAll', () => {
    it('should load all available behaviors', async () => {
      await loadAll();
      const registered = getRegisteredBehaviors();
      expect(registered).toContain('Draggable');
      expect(registered).toContain('Toggleable');
      expect(registered).toContain('Removable');
      expect(registered).toContain('Sortable');
      expect(registered).toContain('Resizable');
    });
  });

  describe('registerWithRuntime', () => {
    it('should load and call module.register', async () => {
      const mockInstance = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: {} }),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      // Load first so module is available
      await loadBehavior('Draggable');

      await registerWithRuntime('Draggable', mockInstance);
      expect(mockInstance.compileSync).toHaveBeenCalled();
    });
  });

  describe('registerAllWithRuntime', () => {
    it('should register all loaded behaviors', async () => {
      const mockInstance = {
        compileSync: vi.fn().mockReturnValue({ ok: true, ast: {} }),
        execute: vi.fn().mockResolvedValue(undefined),
        createContext: vi.fn().mockReturnValue({ locals: new Map(), globals: new Map() }),
      };

      await loadAll();
      await registerAllWithRuntime(mockInstance);
      // Each behavior calls compileSync once
      expect(mockInstance.compileSync.mock.calls.length).toBeGreaterThanOrEqual(5);
    });
  });
});
