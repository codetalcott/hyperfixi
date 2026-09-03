/**
 * Registry System Tests
 *
 * Tests for EventSourceRegistry and the unified registry.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventSourceRegistry,
  createEventSourceRegistry,
  type EventSource,
  type EventSourceSubscribeOptions,
} from './event-source-registry';
import {
  createRegistry,
  commands,
  eventSources,
  definePlugin,
  type LokaScriptPlugin,
} from './index';
import type { ExecutionContext } from '../types/core';
import { debug } from '../utils/debug';

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
      // Diagnostics route through the debug system (debug.runtime), not
      // console.warn — see event-source-registry.ts.
      const warnSpy = vi.spyOn(debug, 'runtime').mockImplementation(() => {});
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

describe('Unified Registry', () => {
  describe('createRegistry', () => {
    it('should create registry with all sub-registries', () => {
      const registry = createRegistry();

      expect(registry.commands).toBeDefined();
      expect(registry.eventSources).toBeDefined();
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

      const plugin: LokaScriptPlugin = {
        name: 'test-plugin',
        commands: [mockCommand as any],
      };

      registry.use(plugin);

      expect(registry.commands.has('test-cmd')).toBe(true);
    });

    it('should install plugin event sources', () => {
      const registry = createRegistry();
      const source = createMockEventSource('plugin-source');

      const plugin: LokaScriptPlugin = {
        name: 'test-plugin',
        eventSources: [source],
      };

      registry.use(plugin);

      expect(registry.eventSources.has('plugin-source')).toBe(true);
    });

    it('should call plugin setup function', () => {
      const registry = createRegistry();
      const setupFn = vi.fn();

      const plugin: LokaScriptPlugin = {
        name: 'test-plugin',
        setup: setupFn,
      };

      registry.use(plugin);

      expect(setupFn).toHaveBeenCalledWith(registry);
    });

    it('should warn on duplicate plugin installation', () => {
      // Diagnostics route through debug.runtime, not console.warn — see index.ts.
      const warnSpy = vi.spyOn(debug, 'runtime').mockImplementation(() => {});
      const registry = createRegistry();

      const plugin: LokaScriptPlugin = {
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
});
