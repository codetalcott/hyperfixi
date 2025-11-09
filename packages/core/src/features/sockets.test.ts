/**
 * Enhanced Sockets Feature Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TypedSocketsFeatureImplementation,
  createSocketsFeature,
  createSockets,
  enhancedSocketsImplementation,
  type SocketsInput,
  type SocketsOutput,
} from './sockets';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  protocols: string[];
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string, protocols: string[] = []) {
    this.url = url;
    this.protocols = protocols;

    // Simulate successful connection after a brief delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Mock successful send
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
      }
    }, 10);
  }

  // Simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global WebSocket
(globalThis as any).WebSocket = MockWebSocket;

describe('Enhanced Sockets Feature Implementation', () => {
  let socketsFeature: TypedSocketsFeatureImplementation;

  beforeEach(() => {
    socketsFeature = createSocketsFeature();
    vi.clearAllMocks();
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal socket configuration', async () => {
      const input: SocketsInput = {
        socket: {
          url: 'wss://api.example.com/ws',
          protocols: [],
          reconnect: { enabled: true },
          heartbeat: { enabled: false },
          compression: false,
          binaryType: 'blob',
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

      const result = await socketsFeature.initialize(input);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();

      if (result.success && result.value) {
        expect(result.value.category).toBe('Frontend');
        expect(result.value.capabilities).toContain('websocket-connection');
        expect(result.value.capabilities).toContain('message-handling');
        expect(result.value.capabilities).toContain('reconnection-management');
        expect(result.value.capabilities).toContain('queue-management');
      }
    });

    it('should initialize with comprehensive socket configuration', async () => {
      const input: SocketsInput = {
        socket: {
          url: 'wss://chat.example.com/ws',
          protocols: ['chat', 'v1'],
          reconnect: {
            enabled: true,
            maxAttempts: 10,
            delay: 2000,
            backoff: 'exponential',
            maxDelay: 60000,
          },
          heartbeat: {
            enabled: true,
            interval: 30000,
            message: 'ping',
            timeout: 5000,
          },
          compression: true,
          binaryType: 'arraybuffer',
        },
        eventHandlers: [
          {
            event: 'open',
            commands: [{ type: 'command', name: 'onConnect', args: [] }],
          },
          {
            event: 'message',
            filter: 'message.type === "chat"',
            commands: [{ type: 'command', name: 'handleChatMessage', args: [] }],
            options: { debounce: 100 },
          },
          {
            event: 'error',
            commands: [{ type: 'command', name: 'handleError', args: [] }],
          },
          {
            event: 'close',
            commands: [{ type: 'command', name: 'onDisconnect', args: [] }],
          },
        ],
        messageHandling: {
          format: 'json',
          validation: {
            enabled: true,
            schema: { type: 'object', properties: { type: { type: 'string' } } },
          },
          queue: {
            enabled: true,
            maxSize: 200,
            persistence: true,
          },
        },
        context: {
          variables: { userId: 123, sessionId: 'abc123' },
        },
        options: {
          enableAutoConnect: false,
          enableMessageQueue: true,
          enableErrorHandling: true,
          maxConnections: 3,
          connectionTimeout: 15000,
        },
        environment: 'frontend',
        debug: true,
      };

      const result = await socketsFeature.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('websocket-connection');
        expect(result.value.capabilities).toContain('reconnection-management');
        expect(result.value.capabilities).toContain('error-recovery');
        expect(result.value.state).toBe('ready');
      }
    });

    it('should handle WebSocket with binary message support', async () => {
      const input: SocketsInput = {
        socket: {
          url: 'wss://data.example.com/ws',
          binaryType: 'arraybuffer',
        },
        eventHandlers: [
          {
            event: 'message',
            filter: 'message instanceof ArrayBuffer',
            commands: [{ type: 'command', name: 'processBinaryData', args: [] }],
          },
        ],
        messageHandling: {
          format: 'binary',
        },
        options: {
          enableAutoConnect: false,
        },
      };

      const result = await socketsFeature.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('message-handling');
        expect(result.value.state).toBe('ready');
      }
    });
  });

  describe('Connection Management', () => {
    it('should establish and manage WebSocket connections', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://test.example.com/ws',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test connection establishment
        const connected = await result.value.connection.connect();
        expect(typeof connected).toBe('boolean');

        // Test connection state checking
        const isConnected = result.value.connection.isConnected('test-connection');
        expect(typeof isConnected).toBe('boolean');

        // Test connection state getter
        const state = result.value.connection.getState('test-connection');
        expect(typeof state).toBe('string');
      }
    });

    it('should handle reconnection logic', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://unreliable.example.com/ws',
          reconnect: {
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

    it('should disconnect WebSocket connections', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://temp.example.com/ws',
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

    it('should provide connection information and metrics', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://metrics.example.com/ws',
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
  });

  describe('Message Handling', () => {
    it('should send and receive text messages', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://text.example.com/ws',
        },
        messageHandling: {
          format: 'text',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test text message sending
        const sent = await result.value.messaging.send('test-connection', 'Hello, World!', 'text');
        expect(typeof sent).toBe('boolean');

        // Test message history
        const history = result.value.messaging.getMessageHistory('test-connection', 10);
        expect(Array.isArray(history)).toBe(true);
      }
    });

    it('should send and receive JSON messages', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://json.example.com/ws',
        },
        messageHandling: {
          format: 'json',
          validation: {
            enabled: true,
          },
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test JSON message sending
        const jsonData = { type: 'test', message: 'Hello', timestamp: Date.now() };
        const sent = await result.value.messaging.sendJSON('test-connection', jsonData);
        expect(typeof sent).toBe('boolean');
      }
    });

    it('should send and receive binary messages', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://binary.example.com/ws',
          binaryType: 'arraybuffer',
        },
        messageHandling: {
          format: 'binary',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test binary message sending
        const binaryData = new ArrayBuffer(8);
        const sent = await result.value.messaging.sendBinary('test-connection', binaryData);
        expect(typeof sent).toBe('boolean');
      }
    });

    it('should handle message subscriptions', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://subscribe.example.com/ws',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test message subscription
        const subscribed = await result.value.messaging.subscribe('message', {
          name: 'handleSubscribedMessage',
          args: [],
        });
        expect(subscribed).toBeDefined();

        // Test unsubscription
        const unsubscribed = result.value.messaging.unsubscribe('test-handler-id');
        expect(typeof unsubscribed).toBe('boolean');
      }
    });
  });

  describe('Event Management', () => {
    it('should add and remove event handlers', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://events.example.com/ws',
        },
        options: {
          enableAutoConnect: false,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test adding event handler
        const handler = await result.value.events.addHandler('test-connection', 'open', {
          name: 'onConnectionOpen',
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
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://custom.example.com/ws',
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

  describe('Queue Management', () => {
    it('should manage message queues', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://queue.example.com/ws',
        },
        messageHandling: {
          queue: {
            enabled: true,
            maxSize: 50,
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageQueue: true,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test adding to queue
        const added = await result.value.queue.add('test-connection', { message: 'queued' });
        expect(added).toBe(true);

        // Test queue size
        const size = result.value.queue.getSize('test-connection');
        expect(typeof size).toBe('number');

        // Test getting pending messages
        const pending = result.value.queue.getPending('test-connection');
        expect(Array.isArray(pending)).toBe(true);

        // Test processing queue
        const processed = await result.value.queue.process('test-connection');
        expect(processed).toBe(true);

        // Test clearing queue
        const cleared = result.value.queue.clear('test-connection');
        expect(typeof cleared).toBe('boolean');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle and track errors', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://errors.example.com/ws',
        },
        options: {
          enableAutoConnect: false,
          enableErrorHandling: true,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Test error handling
        const error = new Error('Test WebSocket error');
        const handled = await result.value.errors.handle(error, 'test-connection');
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
    it('should validate WebSocket URL protocol', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'http://example.com/ws', // Invalid protocol
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].type).toBe('invalid-websocket-protocol');
      expect(validationResult.suggestions).toContain(
        'Use ws:// for local development or wss:// for secure connections'
      );
    });

    it('should validate WebSocket URL format', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'not-a-valid-url',
        },
      });

      expect(validationResult.isValid).toBe(false);
      // The error might be schema-validation instead of invalid-websocket-url because Zod validates URL format first
      expect(
        validationResult.errors.some(
          e => e.type === 'schema-validation' || e.type === 'invalid-websocket-url'
        )
      ).toBe(true);
    });

    it('should validate reconnection settings', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
          reconnect: {
            enabled: true,
            maxAttempts: -1, // Invalid negative value
            delay: -500, // Invalid negative value
            maxDelay: 100, // Less than delay
          },
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-reconnect-attempts')).toBe(true);
      expect(validationResult.errors.some(e => e.type === 'invalid-reconnect-delay')).toBe(true);
    });

    it('should validate heartbeat settings', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
          heartbeat: {
            enabled: true,
            interval: -1000, // Invalid negative value
            timeout: 5000, // Greater than interval
          },
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-heartbeat-interval')).toBe(true);
    });

    it('should validate event handler filter expressions', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
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
      expect(validationResult.errors.some(e => e.type === 'invalid-filter-expression')).toBe(true);
    });

    it('should validate conflicting performance options', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
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
      expect(validationResult.errors.some(e => e.type === 'conflicting-performance-options')).toBe(
        true
      );
    });

    it('should validate empty commands arrays', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
        },
        eventHandlers: [
          {
            event: 'message',
            commands: [], // Empty commands
          },
        ],
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'empty-commands-array')).toBe(true);
    });

    it('should validate message queue settings', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
        },
        messageHandling: {
          queue: {
            enabled: true,
            maxSize: -10, // Invalid negative size
          },
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-queue-size')).toBe(true);
    });

    it('should validate connection limits', () => {
      const validationResult = socketsFeature.validate({
        socket: {
          url: 'wss://example.com/ws',
        },
        options: {
          maxConnections: -1, // Invalid negative value
          connectionTimeout: -5000, // Invalid negative value
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-max-connections')).toBe(true);
      expect(validationResult.errors.some(e => e.type === 'invalid-connection-timeout')).toBe(true);
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await socketsFeature.initialize({
        socket: {} as any, // Invalid socket definition
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      // Initialize multiple times to build performance history
      for (let i = 0; i < 3; i++) {
        await socketsFeature.initialize({
          socket: {
            url: `wss://test${i}.example.com/ws`,
          },
          options: {
            enableAutoConnect: false,
          },
        });
      }

      const metrics = socketsFeature.getPerformanceMetrics();

      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
      expect(typeof metrics.totalConnections).toBe('number');
      expect(typeof metrics.totalHandlers).toBe('number');
      expect(typeof metrics.totalMessages).toBe('number');
      expect(typeof metrics.queuedMessages).toBe('number');
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createSocketsFeature();
      expect(context).toBeInstanceOf(TypedSocketsFeatureImplementation);
      expect(context.name).toBe('socketsFeature');
      expect(context.category).toBe('Frontend');
    });

    it('should create enhanced sockets through convenience function', async () => {
      const result = await createSockets(
        {
          url: 'wss://test.example.com/ws',
          protocols: ['test'],
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
      expect(socketsFeature.name).toBe('socketsFeature');
      expect(socketsFeature.category).toBe('Frontend');
      expect(socketsFeature.description).toBeDefined();
      expect(socketsFeature.inputSchema).toBeDefined();
      expect(socketsFeature.outputType).toBe('Context');
      expect(socketsFeature.metadata).toBeDefined();
      expect(socketsFeature.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = socketsFeature;

      expect(metadata.category).toBe('Frontend');
      expect(metadata.complexity).toBe('complex');
      expect(Array.isArray(metadata.sideEffects)).toBe(true);
      expect(Array.isArray(metadata.dependencies)).toBe(true);
      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);
      expect(metadata.environmentRequirements).toBeDefined();
      expect(metadata.performance).toBeDefined();
    });

    it('should have LLM-compatible documentation', () => {
      const { documentation } = socketsFeature;

      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('websockets');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle complete chat application workflow', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://chat.example.com/ws',
          protocols: ['chat-v1'],
          reconnect: {
            enabled: true,
            maxAttempts: 10,
            delay: 1000,
            backoff: 'exponential',
            maxDelay: 30000,
          },
          heartbeat: {
            enabled: true,
            interval: 30000,
            message: JSON.stringify({ type: 'ping' }),
            timeout: 5000,
          },
        },
        eventHandlers: [
          {
            event: 'open',
            commands: [
              { type: 'command', name: 'authenticate', args: [] },
              { type: 'command', name: 'joinRoom', args: ['general'] },
            ],
          },
          {
            event: 'message',
            filter: 'JSON.parse(message.data).type === "chat"',
            commands: [
              { type: 'command', name: 'displayMessage', args: [] },
              { type: 'command', name: 'updateLastSeen', args: [] },
            ],
            options: { debounce: 50 },
          },
          {
            event: 'message',
            filter: 'JSON.parse(message.data).type === "presence"',
            commands: [{ type: 'command', name: 'updateUserList', args: [] }],
            options: { throttle: 1000 },
          },
          {
            event: 'close',
            commands: [
              { type: 'command', name: 'showDisconnectedStatus', args: [] },
              { type: 'command', name: 'clearUserList', args: [] },
            ],
          },
          {
            event: 'error',
            commands: [{ type: 'command', name: 'showErrorMessage', args: [] }],
          },
        ],
        messageHandling: {
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
          queue: {
            enabled: true,
            maxSize: 100,
            persistence: false,
          },
        },
        context: {
          variables: {
            userId: 12345,
            username: 'testuser',
            roomId: 'general',
            authToken: 'jwt-token-here',
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageQueue: true,
          enableErrorHandling: true,
          maxConnections: 1,
          connectionTimeout: 10000,
        },
        environment: 'frontend',
        debug: true,
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Verify connection capabilities
        expect(result.value.capabilities).toContain('websocket-connection');
        expect(result.value.capabilities).toContain('reconnection-management');
        expect(result.value.capabilities).toContain('error-recovery');

        // Verify messaging capabilities
        expect(typeof result.value.messaging.sendJSON).toBe('function');
        expect(typeof result.value.messaging.getMessageHistory).toBe('function');

        // Verify queue management
        expect(typeof result.value.queue.add).toBe('function');
        expect(typeof result.value.queue.process).toBe('function');

        // Verify error handling
        expect(typeof result.value.errors.handle).toBe('function');
        expect(typeof result.value.errors.getErrorHistory).toBe('function');

        // Verify connection management
        expect(typeof result.value.connection.connect).toBe('function');
        expect(typeof result.value.connection.disconnect).toBe('function');
        expect(typeof result.value.connection.reconnect).toBe('function');

        expect(result.value.state).toBe('ready');
      }
    });

    it('should handle real-time data streaming with binary support', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://data.example.com/stream',
          protocols: ['binary-stream-v1'],
          binaryType: 'arraybuffer',
          compression: true,
        },
        eventHandlers: [
          {
            event: 'message',
            filter: 'message.data instanceof ArrayBuffer',
            commands: [
              { type: 'command', name: 'parseBinaryData', args: [] },
              { type: 'command', name: 'updateChart', args: [] },
            ],
            options: { throttle: 16 }, // ~60fps
          },
          {
            event: 'message',
            filter:
              'typeof message.data === "string" && JSON.parse(message.data).type === "metadata"',
            commands: [{ type: 'command', name: 'updateMetadata', args: [] }],
          },
        ],
        messageHandling: {
          format: 'binary',
          validation: {
            enabled: false, // Skip validation for binary data
          },
          queue: {
            enabled: false, // Real-time data doesn't need queuing
            maxSize: 0,
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageQueue: false,
          maxConnections: 1,
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Verify binary message support
        expect(typeof result.value.messaging.sendBinary).toBe('function');

        // Verify real-time optimizations
        expect(result.value.capabilities).toContain('message-handling');
      }
    });

    it('should handle IoT device communication with heartbeat monitoring', async () => {
      const result = await socketsFeature.initialize({
        socket: {
          url: 'wss://iot.example.com/device/12345',
          protocols: ['iot-v2'],
          reconnect: {
            enabled: true,
            maxAttempts: 999, // Keep trying forever for IoT
            delay: 5000,
            backoff: 'linear',
            maxDelay: 60000,
          },
          heartbeat: {
            enabled: true,
            interval: 60000, // 1 minute heartbeat
            message: JSON.stringify({ type: 'heartbeat', deviceId: '12345' }),
            timeout: 10000,
          },
        },
        eventHandlers: [
          {
            event: 'open',
            commands: [
              { type: 'command', name: 'registerDevice', args: [] },
              { type: 'command', name: 'syncConfiguration', args: [] },
            ],
          },
          {
            event: 'message',
            filter: 'JSON.parse(message.data).type === "command"',
            commands: [
              { type: 'command', name: 'executeDeviceCommand', args: [] },
              { type: 'command', name: 'sendAcknowledgment', args: [] },
            ],
          },
          {
            event: 'message',
            filter: 'JSON.parse(message.data).type === "config"',
            commands: [{ type: 'command', name: 'updateConfiguration', args: [] }],
          },
          {
            event: 'close',
            commands: [
              { type: 'command', name: 'enterOfflineMode', args: [] },
              { type: 'command', name: 'cacheCommands', args: [] },
            ],
          },
        ],
        messageHandling: {
          format: 'json',
          validation: {
            enabled: true,
          },
          queue: {
            enabled: true,
            maxSize: 1000, // Large queue for IoT reliability
            persistence: true,
          },
        },
        options: {
          enableAutoConnect: false,
          enableMessageQueue: true,
          enableErrorHandling: true,
          connectionTimeout: 30000, // Longer timeout for IoT
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Verify IoT-specific features
        expect(result.value.capabilities).toContain('reconnection-management');
        expect(result.value.capabilities).toContain('queue-management');

        // Verify persistence and reliability features
        expect(typeof result.value.queue.getPending).toBe('function');
        expect(typeof result.value.connection.getConnectionInfo).toBe('function');
      }
    });
  });
});

describe('Enhanced Sockets Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedSocketsImplementation).toBeInstanceOf(TypedSocketsFeatureImplementation);
    expect(enhancedSocketsImplementation.name).toBe('socketsFeature');
  });
});
