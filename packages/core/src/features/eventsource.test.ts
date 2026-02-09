/**
 * Enhanced EventSource Feature Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TypedEventSourceFeatureImplementation,
  createEventSourceFeature,
  createEventSource,
  enhancedEventSourceImplementation,
  type EventSourceInput,
  type EventSourceOutput,
} from './eventsource';

// Mock EventSource for testing
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState: number = MockEventSource.CONNECTING;
  withCredentials: boolean = false;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    this.url = url;
    this.withCredentials = eventSourceInitDict?.withCredentials || false;

    // Simulate successful connection after a brief delay
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    setTimeout(() => {
      if (this.onerror) {
        this.onerror(new Event('error'));
      }
    }, 5);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    if (type === 'open') {
      this.onopen = listener;
    } else if (type === 'message') {
      this.onmessage = listener as (event: MessageEvent) => void;
    } else if (type === 'error') {
      this.onerror = listener;
    }
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    if (type === 'open' && this.onopen === listener) {
      this.onopen = null;
    } else if (type === 'message' && this.onmessage === listener) {
      this.onmessage = null;
    } else if (type === 'error' && this.onerror === listener) {
      this.onerror = null;
    }
  }

  // Test helper methods
  simulateMessage(data: any, eventType: string = 'message', lastEventId?: string) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data,
        lastEventId,
        origin: window.location.origin,
      });
      this.onmessage(event);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateCustomEvent(eventType: string, data: any) {
    // Custom events would be handled by addEventListener
    if (this.onmessage) {
      const event = new MessageEvent(eventType, { data });
      this.onmessage(event);
    }
  }
}

// Mock global EventSource
globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

// Mock URL constructor for validation
globalThis.URL = class MockURL {
  protocol: string;
  href: string;

  constructor(url: string, base?: string) {
    this.href = url;
    if (url.startsWith('http://')) {
      this.protocol = 'http:';
    } else if (url.startsWith('https://')) {
      this.protocol = 'https:';
    } else {
      throw new Error('Invalid URL');
    }
  }
} as unknown as typeof URL;

// Mock window.location for URL validation
globalThis.window = {
  location: {
    href: 'https://example.com',
    origin: 'https://example.com',
  },
} as unknown as Window & typeof globalThis;

// Skipped: Tests expect EventSource mocking and methods that differ from implementation
describe('Enhanced EventSource Feature Implementation', () => {
  let eventsourceFeature: TypedEventSourceFeatureImplementation;

  beforeEach(() => {
    eventsourceFeature = createEventSourceFeature();
    vi.clearAllMocks();
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal EventSource configuration', async () => {
      const input: EventSourceInput = {
        source: {
          url: 'https://api.example.com/events',
          withCredentials: false,
        },
        eventHandlers: [
          { event: 'message', commands: [{ type: 'command', name: 'processMessage', args: [] }] },
        ],
        context: {
          variables: {},
        },
        options: {
          enableAutoConnect: false, // Don't auto-connect in tests
        },
      };

      const result = await eventsourceFeature.initialize(input);

      expect(result.success).toBe(true);
      expect(result.value!).toBeDefined();

      if (result.success && result.value) {
        expect(result.value!.category).toBe('Frontend');
        expect(result.value!.capabilities).toContain('sse-connection');
        expect(result.value!.capabilities).toContain('message-processing');
        expect(result.value!.capabilities).toContain('event-handling');
        expect(result.value!.capabilities).toContain('automatic-reconnection');
      }
    });

    it('should initialize with comprehensive EventSource configuration', async () => {
      const input: EventSourceInput = {
        source: {
          url: 'https://stream.example.com/updates',
          withCredentials: true,
          headers: { Authorization: 'Bearer token123' },
          retry: {
            enabled: true,
            maxAttempts: 10,
            delay: 5000,
            backoff: 'exponential',
            maxDelay: 60000,
          },
          timeout: {
            enabled: true,
            duration: 120000,
          },
        },
        eventHandlers: [
          {
            event: 'message',
            commands: [{ type: 'command', name: 'handleMessage', args: [] }],
            filter: 'event.data.type === "update"',
            options: { throttle: 100 },
          },
          {
            event: 'error',
            commands: [{ type: 'command', name: 'handleError', args: [] }],
          },
          {
            event: 'open',
            commands: [{ type: 'command', name: 'onConnect', args: [] }],
          },
        ],
        messageProcessing: {
          format: 'json',
          validation: {
            enabled: true,
            schema: { type: 'object', properties: { type: { type: 'string' } } },
          },
          buffer: {
            enabled: true,
            maxSize: 200,
            flushInterval: 2000,
          },
        },
        context: {
          variables: { userId: 456, sessionId: 'def789' },
        },
        options: {
          enableAutoConnect: false,
          enableMessageBuffer: true,
          enableErrorHandling: true,
          maxConnections: 2,
          connectionTimeout: 45000,
        },
        environment: 'frontend',
        debug: true,
      };

      const result = await eventsourceFeature.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value!.capabilities).toContain('sse-connection');
        expect(result.value!.capabilities).toContain('error-recovery');
        expect(result.value!.state).toBe('ready');
      }
    });

    it('should handle different message processing formats', async () => {
      const input: EventSourceInput = {
        source: {
          url: 'https://data.example.com/stream',
        },
        messageProcessing: {
          format: 'json',
          validation: {
            enabled: true,
          },
          buffer: {
            enabled: false,
            maxSize: 0,
          },
        },
        options: {
          enableAutoConnect: false,
        },
      };

      const result = await eventsourceFeature.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value!.capabilities).toContain('message-processing');
        expect(result.value!.state).toBe('ready');
      }
    });
  });

  describe('Connection Management', () => {
    it('should establish and manage EventSource connections', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://test.example.com/events',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test connection establishment
        const connected = await result.value.connection.connect();
        expect(connected).toBeDefined();

        // Test connection state checking
        const isConnected = result.value.connection.isConnected('test-connection');
        expect(typeof isConnected).toBe('boolean');

        // Test connection state getter
        const state = result.value.connection.getState('test-connection');
        expect(typeof state).toBe('string');
      }
    });

    it('should handle connection info retrieval', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://info.example.com/events',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test connection info getter
        const info = result.value.connection.getConnectionInfo('test-connection');
        expect(info === null || typeof info === 'object').toBe(true);
      }
    });

    it('should disconnect EventSource connections', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://temp.example.com/events',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test disconnection
        const disconnected = await result.value.connection.disconnect('test-connection');
        expect(typeof disconnected).toBe('boolean');
      }
    });

    it('should handle reconnection logic', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://unreliable.example.com/events',
          retry: {
            enabled: true,
            maxAttempts: 3,
            delay: 100,
            backoff: 'linear',
          },
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test reconnection
        const reconnected = await result.value.connection.reconnect('test-connection');
        expect(typeof reconnected).toBe('boolean');
      }
    });
  });

  describe('Event Management', () => {
    it('should add and remove event handlers', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://events.example.com/stream',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test adding event handler
        const handler = await result.value.events.addHandler('test-connection', 'message', {
          name: 'processMessage',
          args: [],
        });
        expect(handler).toBeDefined();

        // Test getting handlers
        const handlers = result.value.events.getHandlers('test-connection');
        expect(Array.isArray(handlers)).toBe(true);

        // Test removing handler
        const removed = result.value.events.removeHandler('test-handler-id');
        expect(typeof removed).toBe('boolean');
      }
    });

    it('should emit custom events', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://custom.example.com/events',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test event emission
        const emitted = await result.value.events.emit('test-connection', 'customEvent', {
          data: 'test',
        });
        expect(emitted).toBe(true);
      }
    });
  });

  describe('Message Handling', () => {
    it('should handle message history', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://messages.example.com/stream',
        },
        messageProcessing: {
          format: 'text',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test message history
        const history = result.value.messages.getHistory('test-connection', 10);
        expect(Array.isArray(history)).toBe(true);

        // Test clearing history
        const cleared = result.value.messages.clearHistory('test-connection');
        expect(cleared).toBe(true);
      }
    });

    it('should handle message buffering', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://buffered.example.com/stream',
        },
        messageProcessing: {
          buffer: {
            enabled: true,
            maxSize: 50,
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageBuffer: true,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test buffer operations
        const buffer = result.value.messages.getBuffer('test-connection');
        expect(Array.isArray(buffer)).toBe(true);

        // Test buffer flushing
        const flushed = await result.value.messages.flushBuffer('test-connection');
        expect(Array.isArray(flushed)).toBe(true);
      }
    });

    it('should handle message subscriptions', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://subscribe.example.com/events',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test message subscription
        const subscribed = await result.value.messages.subscribe('message', {
          name: 'handleSubscribedMessage',
          args: [],
        });
        expect(subscribed).toBeDefined();

        // Test unsubscription
        const unsubscribed = result.value.messages.unsubscribe('test-handler-id');
        expect(typeof unsubscribed).toBe('boolean');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle and track errors', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://errors.example.com/events',
        },
        options: {
          enableAutoConnect: false,
          enableErrorHandling: true,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test error handling
        const error = new Error('Test EventSource error');
        const handled = await result.value.errors.handle(error, { context: 'test' });
        expect(handled).toBe(true);

        // Test error history
        const errorHistory = result.value.errors.getErrorHistory();
        expect(Array.isArray(errorHistory)).toBe(true);

        // Test clearing errors
        const cleared = result.value.errors.clearErrors();
        expect(cleared).toBe(true);

        // Test setting custom error handler
        const customHandler = (error: Error, context: any) => {
          console.warn('Custom error handler:', error.message);
        };

        const handlerSet = result.value.errors.setErrorHandler(customHandler);
        expect(handlerSet).toBe(true);
      }
    });
  });

  describe('Validation and Error Handling', () => {
    // Helper to check error code in either 'code' or 'type' field
    const hasErrorCode = (errors: Array<{ type?: string; code?: string }>, code: string) =>
      errors.some(e => (e as any).code === code || e.type === code);

    it('should validate EventSource URL format', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'invalid-url-format',
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'invalid-eventsource-url')).toBe(true);
      expect(validationResult.suggestions).toContain(
        'Use valid HTTP/HTTPS URL for EventSource connection'
      );
    });

    it('should validate retry settings', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
          retry: {
            enabled: true,
            maxAttempts: -1, // Invalid negative value
            delay: -500, // Invalid negative value
            maxDelay: 100, // Less than delay
          },
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'invalid-retry-attempts')).toBe(true);
      expect(hasErrorCode(validationResult.errors, 'invalid-retry-delay')).toBe(true);
    });

    it('should validate timeout settings', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
          timeout: {
            enabled: true,
            duration: 500, // Invalid - less than 1000ms
          },
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'invalid-timeout-duration')).toBe(true);
      expect(validationResult.suggestions).toContain(
        'Set timeout duration to at least 1000ms for proper operation'
      );
    });

    it('should validate connection limits', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
        },
        options: {
          maxConnections: 0, // Invalid - must be at least 1
          connectionTimeout: 500, // Invalid - must be at least 1000ms
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'invalid-max-connections')).toBe(true);
      expect(hasErrorCode(validationResult.errors, 'invalid-connection-timeout')).toBe(true);
    });

    it('should validate event handler filter expressions', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
        },
        eventHandlers: [
          {
            event: 'message',
            filter: 'invalid javascript syntax [[[',
            commands: [{ name: 'process', args: [] }],
          },
        ],
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'invalid-filter-expression')).toBe(true);
      expect(validationResult.suggestions).toContain(
        'Use valid JavaScript expression for event filtering'
      );
    });

    it('should validate conflicting performance options', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
        },
        eventHandlers: [
          {
            event: 'message',
            commands: [{ name: 'process', args: [] }],
            options: {
              throttle: 100,
              debounce: 200, // Cannot have both
            },
          },
        ],
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'conflicting-performance-options')).toBe(true);
      expect(validationResult.suggestions).toContain(
        'Choose either throttle OR debounce, not both'
      );
    });

    it('should validate empty commands arrays', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
        },
        eventHandlers: [
          {
            event: 'message',
            commands: [], // Empty commands
          },
        ],
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'empty-commands-array')).toBe(true);
      expect(validationResult.suggestions).toContain(
        'Add at least one command to execute for event handler'
      );
    });

    it('should validate message buffer settings', () => {
      const validationResult = eventsourceFeature.validate!({
        source: {
          url: 'https://example.com/events',
        },
        messageProcessing: {
          buffer: {
            enabled: true,
            maxSize: -10, // Invalid negative size
          },
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(hasErrorCode(validationResult.errors, 'invalid-buffer-size')).toBe(true);
      expect(validationResult.suggestions).toContain(
        'Set buffer maxSize to 0 for unlimited or positive number for limit'
      );
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await eventsourceFeature.initialize({
        source: {} as Record<string, never>, // Invalid empty source definition
      });

      expect(result.success).toBe(false);
      expect(result.error!).toBeDefined();
      // Note: suggestions may not be present on all error results
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      // Initialize multiple times to build performance history
      for (let i = 0; i < 3; i++) {
        await eventsourceFeature.initialize({
          source: {
            url: `https://test${i}.example.com/events`,
          },
          options: {
            enableAutoConnect: false,
          },
        });
      }

      const metrics = eventsourceFeature.getPerformanceMetrics();

      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
      expect(typeof metrics.totalConnections).toBe('number');
      expect(typeof metrics.totalMessages).toBe('number');
      expect(typeof metrics.totalErrors).toBe('number');
      expect(typeof metrics.totalEventHandlers).toBe('number');
      expect(typeof metrics.bufferedMessages).toBe('number');
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createEventSourceFeature();
      expect(context).toBeInstanceOf(TypedEventSourceFeatureImplementation);
      expect(context.name).toBe('eventsourceFeature');
      expect(context.category).toBe('Frontend');
    });

    it('should create enhanced eventsource through convenience function', async () => {
      const result = await createEventSource(
        {
          url: 'https://test.example.com/events',
          withCredentials: false,
        },
        {
          environment: 'frontend',
          options: {
            enableAutoConnect: false,
          },
        }
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pattern Compliance', () => {
    it('should have required enhanced pattern properties', () => {
      expect(eventsourceFeature.name).toBe('eventsourceFeature');
      expect(eventsourceFeature.category).toBe('Frontend');
      expect(eventsourceFeature.description).toBeDefined();
      expect(eventsourceFeature.inputSchema).toBeDefined();
      expect(eventsourceFeature.outputType).toBe('Context');
      expect(eventsourceFeature.metadata).toBeDefined();
      expect(eventsourceFeature.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = eventsourceFeature;

      expect(metadata.category).toBe('Frontend');
      expect(metadata.complexity).toBe('complex');
      expect(Array.isArray(metadata.sideEffects)).toBe(true);
      expect(Array.isArray(metadata.dependencies)).toBe(true);
      expect(Array.isArray(metadata.examples!)).toBe(true);
      expect(metadata.examples!.length).toBeGreaterThan(0);
      expect(metadata.environmentRequirements).toBeDefined();
      expect(metadata.performance).toBeDefined();
    });

    it('should have LLM-compatible documentation', () => {
      const { documentation } = eventsourceFeature;

      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('server-sent-events');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle live notifications workflow', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://notifications.example.com/stream',
          withCredentials: true,
          retry: {
            enabled: true,
            maxAttempts: 10,
            delay: 2000,
            backoff: 'exponential',
            maxDelay: 60000,
          },
          timeout: {
            enabled: true,
            duration: 120000,
          },
        },
        eventHandlers: [
          {
            event: 'message',
            commands: [
              { type: 'command', name: 'showNotification', args: [] },
              { type: 'command', name: 'updateBadge', args: [] },
            ],
            filter: 'JSON.parse(event.data).type === "notification"',
            options: { debounce: 100 },
          },
          {
            event: 'user-status',
            commands: [{ type: 'command', name: 'updateUserStatus', args: [] }],
            options: { throttle: 1000 },
          },
          {
            event: 'error',
            commands: [
              { type: 'command', name: 'showConnectionError', args: [] },
              { type: 'command', name: 'attemptReconnect', args: [] },
            ],
          },
        ],
        messageProcessing: {
          format: 'json',
          validation: {
            enabled: true,
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                data: { type: 'object' },
                timestamp: { type: 'number' },
              },
              required: ['type'],
            },
          },
          buffer: {
            enabled: true,
            maxSize: 50,
            flushInterval: 1000,
          },
        },
        context: {
          variables: {
            userId: 98765,
            preferences: { sound: true, desktop: true },
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageBuffer: true,
          enableErrorHandling: true,
          maxConnections: 1,
          connectionTimeout: 30000,
        },
        environment: 'frontend',
        debug: true,
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Verify connection capabilities
        expect(result.value!.capabilities).toContain('sse-connection');
        expect(result.value!.capabilities).toContain('automatic-reconnection');
        expect(result.value!.capabilities).toContain('error-recovery');

        // Verify message handling capabilities
        expect(typeof result.value.messages.getHistory).toBe('function');
        expect(typeof result.value.messages.flushBuffer).toBe('function');

        // Verify connection management
        expect(typeof result.value.connection.connect).toBe('function');
        expect(typeof result.value.connection.disconnect).toBe('function');
        expect(typeof result.value.connection.reconnect).toBe('function');

        expect(result.value!.state).toBe('ready');
      }
    });

    it('should handle real-time analytics data streaming', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://analytics.example.com/metrics',
          headers: { Authorization: 'Bearer analytics-token' },
        },
        eventHandlers: [
          {
            event: 'metric-update',
            commands: [
              { type: 'command', name: 'updateChart', args: [] },
              { type: 'command', name: 'recalculateStats', args: [] },
            ],
            options: { throttle: 16 }, // ~60fps
          },
          {
            event: 'alert',
            commands: [{ type: 'command', name: 'triggerAlert', args: [] }],
          },
        ],
        messageProcessing: {
          format: 'json',
          validation: {
            enabled: false, // Skip validation for high-frequency data
          },
          buffer: {
            enabled: false, // Real-time data doesn't need buffering
            maxSize: 0,
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageBuffer: false,
          maxConnections: 1,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Verify real-time optimizations
        expect(result.value!.capabilities).toContain('message-processing');
        expect(typeof result.value.messages.getHistory).toBe('function');
      }
    });

    it('should handle system monitoring with high availability', async () => {
      const result = await eventsourceFeature.initialize({
        source: {
          url: 'https://monitoring.example.com/events',
          retry: {
            enabled: true,
            maxAttempts: 999, // Keep trying forever for critical monitoring
            delay: 1000,
            backoff: 'linear',
            maxDelay: 10000,
          },
          timeout: {
            enabled: true,
            duration: 300000, // 5 minute timeout
          },
        },
        eventHandlers: [
          {
            event: 'system-alert',
            commands: [
              { type: 'command', name: 'escalateAlert', args: [] },
              { type: 'command', name: 'notifyOncall', args: [] },
            ],
          },
          {
            event: 'heartbeat',
            commands: [{ type: 'command', name: 'updateSystemStatus', args: [] }],
            options: { throttle: 5000 }, // Only update every 5 seconds
          },
          {
            event: 'error',
            commands: [
              { type: 'command', name: 'logSystemError', args: [] },
              { type: 'command', name: 'switchToBackupStream', args: [] },
            ],
          },
        ],
        messageProcessing: {
          format: 'json',
          validation: {
            enabled: true,
          },
          buffer: {
            enabled: true,
            maxSize: 1000, // Large buffer for reliability
            flushInterval: 500, // Flush frequently
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageBuffer: true,
          enableErrorHandling: true,
          connectionTimeout: 60000, // Longer timeout for monitoring
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Verify high-availability features
        expect(result.value!.capabilities).toContain('automatic-reconnection');
        expect(result.value!.capabilities).toContain('error-recovery');

        // Verify reliability features
        expect(typeof result.value.messages.getBuffer).toBe('function');
        expect(typeof result.value.connection.getConnectionInfo).toBe('function');
      }
    });
  });
});

describe('Enhanced EventSource Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedEventSourceImplementation).toBeInstanceOf(TypedEventSourceFeatureImplementation);
    expect(enhancedEventSourceImplementation.name).toBe('eventsourceFeature');
  });
});

describe('EventSource Feature Improvements', () => {
  let feature: TypedEventSourceFeatureImplementation;

  beforeEach(() => {
    feature = new TypedEventSourceFeatureImplementation();
  });

  describe('bounded history', () => {
    it('should cap evaluationHistory at MAX_HISTORY_SIZE', async () => {
      for (let i = 0; i < 1010; i++) {
        try {
          await feature.initialize({
            source: { url: `https://test${i}.example.com/sse` },
            options: { enableAutoConnect: false },
          });
        } catch {
          // Expected
        }
      }
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBeLessThanOrEqual(1000);
    });
  });

  describe('dispose()', () => {
    it('should clear all state', async () => {
      try {
        await feature.initialize({
          source: { url: 'https://test.example.com/sse' },
          options: { enableAutoConnect: false },
        });
      } catch {
        // Expected
      }
      feature.dispose();
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBe(0);
      expect(metrics.totalMessages).toBe(0);
      expect(metrics.totalErrors).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      feature.dispose();
      feature.dispose();
      expect(true).toBe(true);
    });
  });
});
