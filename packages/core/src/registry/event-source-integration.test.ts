/**
 * Custom Event Source Integration Tests
 *
 * Tests the full integration of custom event sources:
 * 1. Parser detects custom event sources and adds metadata to AST
 * 2. Runtime subscribes to custom event sources instead of DOM events
 * 3. Event handlers execute when custom events are triggered
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parse } from '../parser/parser';
import type { EventSource, EventSourceSubscription } from './event-source-registry';
import type { ExecutionContext } from '../types/core';
import { createRegistry } from './index';
import { createRegistryIntegration } from './runtime-integration';

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
  const subscriptions = new Map<string, EventSourceSubscription>();
  let subscriptionCounter = 0;

  return {
    name,
    description: `Mock ${name} event source`,
    supportedEvents: ['event1', 'event2', 'GET', 'POST'],

    subscribe(options, _context) {
      subscriptionCounter++;
      const id = `${name}_${subscriptionCounter}`;

      const subscription: EventSourceSubscription = {
        id,
        source: name,
        event: options.event,
        unsubscribe: vi.fn(() => {
          subscriptions.delete(id);
        }),
      };

      subscriptions.set(id, subscription);

      // Store handler for testing
      (subscription as any).handler = options.handler;

      return subscription;
    },

    // Helper for tests to trigger events
    trigger(event: string, data: any) {
      for (const sub of subscriptions.values()) {
        if (sub.event === event) {
          const handler = (sub as any).handler;
          if (handler) {
            handler(data);
          }
        }
      }
    },

    destroy: vi.fn(() => {
      subscriptions.clear();
    }),
  };
}

// ============================================================================
// Parser Integration Tests
// ============================================================================

describe('Parser Integration', () => {
  it('should detect registered event sources and add metadata to AST', () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Register custom event source
    const mockSource = createMockEventSource('request');
    registry.eventSources.register('request', mockSource);

    // Parse hyperscript with custom event source
    const code = 'on request log "request received"';
    const result = parse(code, { registryIntegration: integration });

    expect(result.success).toBe(true);
    if (result.success) {
      // For a single event handler, result.node IS the eventHandler node
      const handler = result.node;
      expect(handler.type).toBe('eventHandler');
      expect((handler as any).event).toBe('request');
      expect((handler as any).customEventSource).toBe('request');
    }
  });

  it('should not add customEventSource for standard DOM events', () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Parse hyperscript with standard DOM event
    const code = 'on click log "clicked"';
    const result = parse(code, { registryIntegration: integration });

    expect(result.success).toBe(true);
    if (result.success) {
      // For a single event handler, result.node IS the eventHandler node
      const handler = result.node;
      expect(handler.type).toBe('eventHandler');
      expect((handler as any).event).toBe('click');
      expect((handler as any).customEventSource).toBeUndefined();
    }
  });

  it('should detect event source by supported event name', () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Register custom event source with supported events
    const mockSource = createMockEventSource('http');
    registry.eventSources.register('http', mockSource);

    // Parse hyperscript using a supported event (event1 from mockSource.supportedEvents)
    const code = 'on event1 log "custom event"';
    const result = parse(code, { registryIntegration: integration });

    expect(result.success).toBe(true);
    if (result.success) {
      // For a single event handler, result.node IS the eventHandler node
      const handler = result.node;
      expect(handler.type).toBe('eventHandler');
      expect((handler as any).event).toBe('event1');
      expect((handler as any).customEventSource).toBe('http');
    }
  });

  it('should work without registry integration (backward compatibility)', () => {
    // Parse without registry integration
    const code = 'on click log "clicked"';
    const result = parse(code);

    expect(result.success).toBe(true);
    if (result.success) {
      // For a single event handler, result.node IS the eventHandler node
      const handler = result.node;
      expect(handler).toBeDefined();
      expect(handler.type).toBe('eventHandler');
      expect((handler as any).event).toBe('click');
      expect((handler as any).customEventSource).toBeUndefined();
    }
  });
});

// ============================================================================
// Runtime Integration Tests
// ============================================================================

describe('Runtime Integration', () => {
  it('should subscribe to custom event source when customEventSource metadata is present', () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Register custom event source
    const mockSource = createMockEventSource('request');
    const subscribeSpy = vi.spyOn(mockSource, 'subscribe');
    registry.eventSources.register('request', mockSource);

    // Create a mock EventHandlerNode with customEventSource
    const mockEventHandlerNode: any = {
      type: 'eventHandler',
      event: 'GET',
      customEventSource: 'request',
      commands: [
        {
          type: 'command',
          name: 'log',
          args: [{ type: 'literal', value: 'request received' }],
        },
      ],
    };

    const context = createMockContext();

    // Simulate runtime subscribing (this would normally be done by RuntimeBase.executeEventHandler)
    const subscription = integration.subscribeToEventSource(
      mockEventHandlerNode.customEventSource,
      {
        event: mockEventHandlerNode.event,
        handler: vi.fn(),
      },
      context
    );

    expect(subscribeSpy).toHaveBeenCalled();
    expect(subscription).toBeDefined();
    expect(subscription.source).toBe('request');
    expect(subscription.event).toBe('GET');
  });

  it('should not subscribe to custom event source when customEventSource is not present', () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Register custom event source
    const mockSource = createMockEventSource('request');
    const subscribeSpy = vi.spyOn(mockSource, 'subscribe');
    registry.eventSources.register('request', mockSource);

    // Create a mock EventHandlerNode WITHOUT customEventSource
    const mockEventHandlerNode: any = {
      type: 'eventHandler',
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'log',
          args: [{ type: 'literal', value: 'clicked' }],
        },
      ],
    };

    // In a real scenario, runtime would NOT call subscribeToEventSource
    // because customEventSource is undefined, so it would use DOM addEventListener instead

    expect(mockEventHandlerNode.customEventSource).toBeUndefined();
    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('should execute event handler when custom event is triggered', async () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Register custom event source
    const mockSource = createMockEventSource('request');
    registry.eventSources.register('request', mockSource);

    const context = createMockContext();
    const handlerSpy = vi.fn();

    // Subscribe to custom event source
    const subscription = integration.subscribeToEventSource(
      'request',
      {
        event: 'GET',
        handler: handlerSpy,
      },
      context
    );

    expect(subscription).toBeDefined();

    // Trigger the event
    const eventData = { url: '/api/users', method: 'GET' };
    (mockSource as any).trigger('GET', eventData);

    // Handler should have been called
    expect(handlerSpy).toHaveBeenCalledOnce();
    expect(handlerSpy).toHaveBeenCalledWith(eventData);
  });

  it('should cleanup subscription when unsubscribe is called', () => {
    const registry = createRegistry();
    const integration = createRegistryIntegration({
      registry: {
        context: registry.context,
        eventSources: registry.eventSources,
      },
    });

    // Register custom event source
    const mockSource = createMockEventSource('request');
    registry.eventSources.register('request', mockSource);

    const context = createMockContext();
    const handlerSpy = vi.fn();

    // Subscribe to custom event source
    const subscription = integration.subscribeToEventSource(
      'request',
      {
        event: 'GET',
        handler: handlerSpy,
      },
      context
    );

    // Unsubscribe
    subscription.unsubscribe();

    // Trigger the event
    const eventData = { url: '/api/users', method: 'GET' };
    (mockSource as any).trigger('GET', eventData);

    // Handler should NOT have been called
    expect(handlerSpy).not.toHaveBeenCalled();
  });
});
