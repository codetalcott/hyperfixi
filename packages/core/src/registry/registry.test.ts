/**
 * Registry System Tests
 *
 * Tests for EventSourceRegistry, ContextProviderRegistry, and unified registry.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventSourceRegistry,
  createEventSourceRegistry,
  type EventSource,
  type EventSourceSubscribeOptions,
} from './event-source-registry';
import {
  ContextProviderRegistry,
  createContextProviderRegistry,
  meProvider,
  itProvider,
} from './context-provider-registry';
import {
  createRegistry,
  commands,
  eventSources,
  context,
  definePlugin,
  type HyperFixiPlugin,
} from './index';
import type { ExecutionContext } from '../types/core';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    me: null,
    you: null,
    it: null,
    event: null,
    locals: new Map(),
    globals: new Map(),
    result: undefined,
    ...overrides,
  };
}

function createMockEventSource(name: string): EventSource {
  const subscriptions = new Map<string, any>();
  let nextId = 1;

  return {
    name,
    description: `Mock ${name} event source`,
    supportedEvents: ['event1', 'event2', 'event3'],

    subscribe(options: EventSourceSubscribeOptions, context: ExecutionContext) {
      const id = `${name}_${nextId++}`;
      subscriptions.set(id, { options, context });

      return {
        id,
        source: name,
        event: options.event,
        unsubscribe: () => {
          subscriptions.delete(id);
        },
      };
    },

    supports(event: string) {
      return this.supportedEvents!.includes(event);
    },

    destroy() {
      subscriptions.clear();
    },
  };
}

// ============================================================================
// EventSourceRegistry Tests
// ============================================================================

describe('EventSourceRegistry', () => {
  let registry: EventSourceRegistry;

  beforeEach(() => {
    registry = createEventSourceRegistry();
  });

  describe('register/unregister', () => {
    it('should register an event source', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toBe(source);
    });

    it('should normalize names to lowercase', () => {
      const source = createMockEventSource('Test');
      registry.register('TEST', source);

      expect(registry.has('test')).toBe(true);
      expect(registry.has('TEST')).toBe(true);
      expect(registry.has('Test')).toBe(true);
    });

    it('should unregister an event source', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      const result = registry.unregister('test');

      expect(result).toBe(true);
      expect(registry.has('test')).toBe(false);
    });

    it('should return false when unregistering non-existent source', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });

    it('should warn when overwriting existing source', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const source1 = createMockEventSource('test');
      const source2 = createMockEventSource('test');

      registry.register('test', source1);
      registry.register('test', source2);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting existing event source')
      );
      warnSpy.mockRestore();
    });
  });

  describe('subscribe/unsubscribe', () => {
    it('should subscribe to an event source', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      const handler = vi.fn();
      const context = createMockContext();

      const subscription = registry.subscribe('test', { event: 'event1', handler }, context);

      expect(subscription).toBeDefined();
      expect(subscription!.source).toBe('test');
      expect(subscription!.event).toBe('event1');
    });

    it('should return undefined for unknown source', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const handler = vi.fn();
      const context = createMockContext();

      const subscription = registry.subscribe('nonexistent', { event: 'event1', handler }, context);

      expect(subscription).toBeUndefined();
      warnSpy.mockRestore();
    });

    it('should track subscriptions', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      const handler = vi.fn();
      const context = createMockContext();

      registry.subscribe('test', { event: 'event1', handler }, context);
      registry.subscribe('test', { event: 'event2', handler }, context);

      const subs = registry.getSubscriptions();
      expect(subs).toHaveLength(2);
    });

    it('should unsubscribe by ID', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      const handler = vi.fn();
      const context = createMockContext();

      const subscription = registry.subscribe('test', { event: 'event1', handler }, context);

      const result = registry.unsubscribe(subscription!.id);

      expect(result).toBe(true);
      expect(registry.getSubscriptions()).toHaveLength(0);
    });
  });

  describe('findSourceForEvent', () => {
    it('should find source that supports an event', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      const found = registry.findSourceForEvent('event1');
      expect(found).toBe('test');
    });

    it('should return undefined for unsupported events', () => {
      const source = createMockEventSource('test');
      registry.register('test', source);

      const found = registry.findSourceForEvent('unknown_event');
      expect(found).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('should cleanup all subscriptions and sources', () => {
      const source = createMockEventSource('test');
      const destroySpy = vi.spyOn(source, 'destroy');

      registry.register('test', source);

      const handler = vi.fn();
      const context = createMockContext();
      registry.subscribe('test', { event: 'event1', handler }, context);

      registry.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(registry.getSourceNames()).toHaveLength(0);
      expect(registry.getSubscriptions()).toHaveLength(0);
    });
  });
});

// ============================================================================
// ContextProviderRegistry Tests
// ============================================================================

describe('ContextProviderRegistry', () => {
  let registry: ContextProviderRegistry;

  beforeEach(() => {
    registry = createContextProviderRegistry();
  });

  describe('register/unregister', () => {
    it('should register a provider function', () => {
      registry.register('test', () => 'test-value');

      expect(registry.has('test')).toBe(true);
    });

    it('should register a full provider object', () => {
      registry.register('test', {
        name: 'test',
        provide: () => 'test-value',
        description: 'Test provider',
      });

      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')?.description).toBe('Test provider');
    });

    it('should normalize names to lowercase', () => {
      registry.register('TEST', () => 'value');

      expect(registry.has('test')).toBe(true);
      expect(registry.has('TEST')).toBe(true);
    });

    it('should unregister a provider', () => {
      registry.register('test', () => 'value');
      const result = registry.unregister('test');

      expect(result).toBe(true);
      expect(registry.has('test')).toBe(false);
    });
  });

  describe('resolve', () => {
    it('should resolve a sync provider', async () => {
      registry.register('test', () => 'sync-value');
      const context = createMockContext();

      const value = await registry.resolve('test', context);
      expect(value).toBe('sync-value');
    });

    it('should resolve an async provider', async () => {
      registry.register('test', async () => {
        await new Promise(r => setTimeout(r, 10));
        return 'async-value';
      });
      const context = createMockContext();

      const value = await registry.resolve('test', context);
      expect(value).toBe('async-value');
    });

    it('should return undefined for unknown provider', async () => {
      const context = createMockContext();
      const value = await registry.resolve('nonexistent', context);

      expect(value).toBeUndefined();
    });

    it('should cache provider results when cache is enabled', async () => {
      let callCount = 0;
      registry.register(
        'test',
        () => {
          callCount++;
          return `value-${callCount}`;
        },
        { cache: true }
      );

      const context = createMockContext();
      const cache = new Map();

      const value1 = await registry.resolve('test', context, cache);
      const value2 = await registry.resolve('test', context, cache);

      expect(value1).toBe('value-1');
      expect(value2).toBe('value-1'); // Same cached value
      expect(callCount).toBe(1); // Called only once
    });

    it('should pass context to provider function', async () => {
      registry.register('test', ctx => ctx.locals.get('myValue'));

      const context = createMockContext({
        locals: new Map([['myValue', 'from-context']]),
      });

      const value = await registry.resolve('test', context);
      expect(value).toBe('from-context');
    });

    it('should resolve dependencies before provider', async () => {
      const order: string[] = [];

      registry.register('dep', () => {
        order.push('dep');
        return 'dep-value';
      });

      registry.register(
        'main',
        () => {
          order.push('main');
          return 'main-value';
        },
        { dependencies: ['dep'] }
      );

      const context = createMockContext();
      const cache = new Map();

      await registry.resolve('main', context, cache);

      expect(order).toEqual(['dep', 'main']);
    });
  });

  describe('resolveSync', () => {
    it('should resolve sync provider synchronously', () => {
      registry.register('test', () => 'sync-value');
      const context = createMockContext();

      const value = registry.resolveSync('test', context);
      expect(value).toBe('sync-value');
    });

    it('should throw for async provider', () => {
      registry.register('test', async () => 'async-value');
      const context = createMockContext();

      expect(() => registry.resolveSync('test', context)).toThrow(/is async/);
    });
  });

  describe('enhance', () => {
    it('should create proxy with provider getters', () => {
      registry.register('custom', () => 'custom-value');
      const context = createMockContext({ me: document.body as Element });

      const enhanced = registry.enhance(context);

      expect(enhanced.me).toBe(document.body);
      expect((enhanced as any).custom).toBe('custom-value');
    });

    it('should report has() for registered providers', () => {
      registry.register('custom', () => 'value');
      const context = createMockContext();

      const enhanced = registry.enhance(context);

      expect('custom' in enhanced).toBe(true);
      expect('unknown' in enhanced).toBe(false);
    });
  });

  describe('resolveAll', () => {
    it('should resolve all providers', async () => {
      registry.register('a', () => 'value-a');
      registry.register('b', () => 'value-b');
      registry.registerGlobal('global', () => 'global-value');

      const context = createMockContext();
      const all = await registry.resolveAll(context);

      expect(all.a).toBe('value-a');
      expect(all.b).toBe('value-b');
      expect(all.global).toBe('global-value');
    });
  });

  describe('built-in providers', () => {
    it('meProvider should return context.me', () => {
      const el = document.createElement('div');
      const context = createMockContext({ me: el });

      const value = meProvider.provide(context);
      expect(value).toBe(el);
    });

    it('itProvider should return context.it', () => {
      const context = createMockContext({ it: 'test-it-value' });

      const value = itProvider.provide(context);
      expect(value).toBe('test-it-value');
    });
  });
});

// ============================================================================
// Unified Registry Tests
// ============================================================================

describe('Unified Registry', () => {
  describe('createRegistry', () => {
    it('should create registry with all sub-registries', () => {
      const registry = createRegistry();

      expect(registry.commands).toBeDefined();
      expect(registry.eventSources).toBeDefined();
      expect(registry.context).toBeDefined();
    });

    it('should accept custom sub-registries', () => {
      const customEventSources = createEventSourceRegistry();
      const registry = createRegistry({ eventSources: customEventSources });

      expect(registry.eventSources).toBe(customEventSources);
    });
  });

  describe('plugin system', () => {
    it('should install plugin commands', () => {
      const registry = createRegistry();
      const mockCommand = {
        name: 'test-cmd',
        execute: vi.fn(),
      };

      const plugin: HyperFixiPlugin = {
        name: 'test-plugin',
        commands: [mockCommand as any],
      };

      registry.use(plugin);

      expect(registry.commands.has('test-cmd')).toBe(true);
    });

    it('should install plugin event sources', () => {
      const registry = createRegistry();
      const source = createMockEventSource('plugin-source');

      const plugin: HyperFixiPlugin = {
        name: 'test-plugin',
        eventSources: [source],
      };

      registry.use(plugin);

      expect(registry.eventSources.has('plugin-source')).toBe(true);
    });

    it('should install plugin context providers', () => {
      const registry = createRegistry();

      const plugin: HyperFixiPlugin = {
        name: 'test-plugin',
        contextProviders: [{ name: 'custom', provide: () => 'custom-value' }],
      };

      registry.use(plugin);

      expect(registry.context.has('custom')).toBe(true);
    });

    it('should call plugin setup function', () => {
      const registry = createRegistry();
      const setupFn = vi.fn();

      const plugin: HyperFixiPlugin = {
        name: 'test-plugin',
        setup: setupFn,
      };

      registry.use(plugin);

      expect(setupFn).toHaveBeenCalledWith(registry);
    });

    it('should warn on duplicate plugin installation', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const registry = createRegistry();

      const plugin: HyperFixiPlugin = {
        name: 'test-plugin',
      };

      registry.use(plugin);
      registry.use(plugin);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already installed'));
      warnSpy.mockRestore();
    });
  });

  describe('definePlugin', () => {
    it('should return plugin definition unchanged', () => {
      const plugin = definePlugin({
        name: 'my-plugin',
        version: '1.0.0',
        commands: [],
      });

      expect(plugin.name).toBe('my-plugin');
      expect(plugin.version).toBe('1.0.0');
    });
  });
});

// ============================================================================
// Shorthand Accessors Tests
// ============================================================================

describe('Shorthand Accessors', () => {
  // Note: These tests modify the global default registry
  // In a real test suite, you'd want to reset between tests

  describe('commands shorthand', () => {
    it('should register commands via shorthand', () => {
      const mockCommand = {
        name: 'shorthand-cmd',
        execute: vi.fn(),
      };

      commands.register(mockCommand as any);

      expect(commands.has('shorthand-cmd')).toBe(true);
    });

    it('should list command names', () => {
      const names = commands.names();
      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('eventSources shorthand', () => {
    it('should register event sources via shorthand', () => {
      const source = createMockEventSource('shorthand-source');

      eventSources.register('shorthand-source', source);

      expect(eventSources.has('shorthand-source')).toBe(true);
    });

    it('should list source names', () => {
      const names = eventSources.names();
      expect(Array.isArray(names)).toBe(true);
    });
  });

  describe('context shorthand', () => {
    it('should register context providers via shorthand', () => {
      context.register('shorthand-ctx', () => 'value');

      expect(context.has('shorthand-ctx')).toBe(true);
    });

    it('should list provider names', () => {
      const names = context.names();
      expect(Array.isArray(names)).toBe(true);
    });
  });
});
