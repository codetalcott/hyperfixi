/**
 * Runtime Integration Tests
 *
 * Tests the integration between the registry system and runtime.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RegistryIntegration,
  createRegistryIntegration,
  getDefaultRegistryIntegration,
  resetDefaultRegistryIntegration,
} from './runtime-integration';
import { createRegistry } from './index';
import type { ExecutionContext } from '../types/core';
import type { EventSource } from './event-source-registry';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockContext(): ExecutionContext {
  return {
    me: null,
    you: null,
    it: null,
    event: null,
    locals: new Map(),
    globals: new Map(),
    result: undefined,
  };
}

function createMockEventSource(name: string): EventSource {
  return {
    name,
    description: `Mock ${name} event source`,
    supportedEvents: ['event1', 'event2'],

    subscribe(_options, _context) {
      return {
        id: `${name}_sub`,
        source: name,
        event: 'event1',
        unsubscribe: () => {},
      };
    },
  };
}

// ============================================================================
// RegistryIntegration Tests
// ============================================================================

describe('RegistryIntegration', () => {
  describe('Context Provider Integration', () => {
    it('should enhance context with registered providers', () => {
      const registry = createRegistry();

      // Create integration with the same registry
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      // Register a provider
      registry.context.register('myData', () => ({ foo: 'bar' }));

      // Create base context
      const baseContext = createMockContext();

      // Enhance context
      const enhanced = integration.enhanceContext(baseContext);

      // Provider should be accessible as a property
      expect((enhanced as any).myData).toEqual({ foo: 'bar' });
    });

    it('should lazily evaluate providers', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      const providerFn = vi.fn(() => 'computed-value');
      registry.context.register('computed', providerFn);

      const baseContext = createMockContext();
      const enhanced = integration.enhanceContext(baseContext);

      // Provider should not be called yet
      expect(providerFn).not.toHaveBeenCalled();

      // Access the provider
      const value = (enhanced as any).computed;

      // Provider should now be called
      expect(providerFn).toHaveBeenCalledOnce();
      expect(value).toBe('computed-value');
    });

    it('should cache enhanced contexts', () => {
      const integration = createRegistryIntegration();
      const baseContext = createMockContext();

      const enhanced1 = integration.enhanceContext(baseContext);
      const enhanced2 = integration.enhanceContext(baseContext);

      // Should return the same enhanced context
      expect(enhanced1).toBe(enhanced2);
    });

    it('should respect enableContextProviders option', () => {
      const integration = createRegistryIntegration({
        enableContextProviders: false,
      });

      const baseContext = createMockContext();
      const enhanced = integration.enhanceContext(baseContext);

      // Should return the same context (not enhanced)
      expect(enhanced).toBe(baseContext);
    });
  });

  describe('Event Source Integration', () => {
    it('should get registered event source by name', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      const mockSource = createMockEventSource('custom');
      registry.eventSources.register('custom', mockSource);

      const source = integration.getEventSource('custom');

      expect(source).toBe(mockSource);
    });

    it('should find event source by supported event', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      const mockSource = createMockEventSource('custom');
      registry.eventSources.register('custom', mockSource);

      // 'event1' is in mockSource.supportedEvents
      const source = integration.getEventSource('event1');

      expect(source).toBe(mockSource);
    });

    it('should return undefined for unknown event source', () => {
      const integration = createRegistryIntegration();

      const source = integration.getEventSource('unknown');

      expect(source).toBeUndefined();
    });

    it('should check if event source exists', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      const mockSource = createMockEventSource('custom');
      registry.eventSources.register('custom', mockSource);

      expect(integration.hasEventSource('custom')).toBe(true);
      expect(integration.hasEventSource('event1')).toBe(true); // supported event
      expect(integration.hasEventSource('unknown')).toBe(false);
    });

    it('should subscribe to event source', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      const mockSource = createMockEventSource('custom');
      const subscribeSpy = vi.spyOn(mockSource, 'subscribe');
      registry.eventSources.register('custom', mockSource);

      const context = createMockContext();
      const subscription = integration.subscribeToEventSource(
        'custom',
        { event: 'event1', handler: vi.fn() },
        context
      );

      expect(subscribeSpy).toHaveBeenCalled();
      expect(subscription).toBeDefined();
      expect(subscription.source).toBe('custom');
    });

    it('should respect enableEventSources option', () => {
      const integration = createRegistryIntegration({
        enableEventSources: false,
      });

      const source = integration.getEventSource('custom');

      expect(source).toBeUndefined();
    });

    it('should throw when subscribing with event sources disabled', () => {
      const integration = createRegistryIntegration({
        enableEventSources: false,
      });

      const context = createMockContext();

      expect(() =>
        integration.subscribeToEventSource('custom', { event: 'event1', handler: vi.fn() }, context)
      ).toThrow('Event sources are disabled');
    });
  });

  describe('Introspection', () => {
    it('should list event source names', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      registry.eventSources.register('source1', createMockEventSource('source1'));
      registry.eventSources.register('source2', createMockEventSource('source2'));

      const names = integration.getEventSourceNames();

      expect(names).toContain('source1');
      expect(names).toContain('source2');
    });

    it('should list context provider names', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      registry.context.register('provider1', () => 'value1');
      registry.context.register('provider2', () => 'value2');

      const names = integration.getContextProviderNames();

      expect(names).toContain('provider1');
      expect(names).toContain('provider2');
    });
  });

  describe('Cleanup', () => {
    it('should destroy event sources on destroy', () => {
      const registry = createRegistry();
      const integration = createRegistryIntegration({
        registry: {
          context: registry.context,
          eventSources: registry.eventSources,
        },
      });

      const mockSource = createMockEventSource('custom');
      const destroySpy = vi.fn();
      mockSource.destroy = destroySpy;

      registry.eventSources.register('custom', mockSource);

      integration.destroy();

      expect(destroySpy).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Factory Tests
// ============================================================================

describe('createRegistryIntegration', () => {
  it('should create integration instance', () => {
    const integration = createRegistryIntegration();

    expect(integration).toBeInstanceOf(RegistryIntegration);
  });

  it('should accept options', () => {
    const integration = createRegistryIntegration({
      enableContextProviders: false,
      enableEventSources: false,
    });

    const baseContext = createMockContext();
    const enhanced = integration.enhanceContext(baseContext);

    // Should not enhance
    expect(enhanced).toBe(baseContext);
  });
});

// ============================================================================
// Global Integration Tests
// ============================================================================

describe('getDefaultRegistryIntegration', () => {
  beforeEach(() => {
    resetDefaultRegistryIntegration();
  });

  it('should return singleton instance', () => {
    const integration1 = getDefaultRegistryIntegration();
    const integration2 = getDefaultRegistryIntegration();

    expect(integration1).toBe(integration2);
  });

  it('should create new instance after reset', () => {
    const integration1 = getDefaultRegistryIntegration();
    resetDefaultRegistryIntegration();
    const integration2 = getDefaultRegistryIntegration();

    expect(integration1).not.toBe(integration2);
  });
});
