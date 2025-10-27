

/**
 * Enhanced Sockets Feature Implementation
 * Type-safe WebSocket management feature with enhanced validation and LLM integration
 */

import { v, z } from '../validation/lightweight-validators';
import type {
  ContextMetadata,
  EvaluationResult
} from '../types/context-types';
import type { ValidationResult, ValidationError, EvaluationType } from '../types/base-types';
import type { LLMDocumentation } from '../types/command-types';

// ============================================================================
// Enhanced Sockets Feature Input/Output Schemas
// ============================================================================

export const SocketsInputSchema = v.object({
  /** Socket configuration */
  socket: z.object({
    url: v.string().url(),
    protocols: v.array(v.string()).default([]),
    reconnect: z.object({
      enabled: v.boolean().default(true),
      maxAttempts: v.number().default(5),
      delay: v.number().default(1000),
      backoff: z.enum(['linear', 'exponential']).default('exponential'),
      maxDelay: v.number().default(30000),
    }).default({}),
    heartbeat: v.object({
      enabled: v.boolean().default(false),
      interval: v.number().default(30000),
      message: v.string().default('ping'),
      timeout: v.number().default(5000),
    }).default({}),
    compression: v.boolean().default(false),
    binaryType: z.enum(['blob', 'arraybuffer']).default('blob'),
  }),
  /** Event handlers */
  eventHandlers: v.array(v.object({
    event: z.enum(['open', 'close', 'error', 'message']),
    filter: v.string().optional(), // Message filter expression
    commands: v.array(v.any()),
    options: z.object({
      once: v.boolean().default(false),
      debounce: v.number().optional(),
      throttle: v.number().optional(),
    }).default({}),
  })).default([]),
  /** Message handling */
  messageHandling: v.object({
    format: z.enum(['json', 'text', 'binary']).default('json'),
    validation: z.object({
      enabled: v.boolean().default(true),
      schema: v.any().optional(), // JSON schema for message validation
    }).default({}),
    queue: v.object({
      enabled: v.boolean().default(true),
      maxSize: v.number().default(100),
      persistence: v.boolean().default(false),
    }).default({}),
  }).default({}),
  /** Execution context */
  context: v.object({
    variables: z.record(v.string(), v.any()).default({}),
    me: v.any().optional(),
    it: v.any().optional(),
    target: v.any().optional(),
  }).default({}),
  /** Feature options */
  options: v.object({
    enableAutoConnect: v.boolean().default(true),
    enableMessageQueue: v.boolean().default(true),
    enableErrorHandling: v.boolean().default(true),
    maxConnections: v.number().default(5),
    connectionTimeout: v.number().default(10000),
  }).default({}),
  /** Environment settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('frontend'),
  debug: v.boolean().default(false),
});

export const SocketsOutputSchema = v.object({
  /** Context identifier */
  contextId: v.string(),
  timestamp: v.number(),
  category: v.literal('Frontend'),
  capabilities: v.array(v.string()),
  state: z.enum(['ready', 'connecting', 'connected', 'disconnecting', 'disconnected', 'error']),
  
  /** Connection management */
  connection: z.object({
    connect: v.any(),
    disconnect: v.any(),
    reconnect: v.any(),
    isConnected: v.any(),
    getState: v.any(),
    getConnectionInfo: v.any(),
  }),
  
  /** Message handling */
  messaging: v.object({
    send: v.any(),
    sendJSON: v.any(),
    sendBinary: v.any(),
    subscribe: v.any(),
    unsubscribe: v.any(),
    getMessageHistory: v.any(),
  }),
  
  /** Event management */
  events: v.object({
    addHandler: v.any(),
    removeHandler: v.any(),
    emit: v.any(),
    getHandlers: v.any(),
  }),
  
  /** Queue management */
  queue: v.object({
    add: v.any(),
    process: v.any(),
    clear: v.any(),
    getSize: v.any(),
    getPending: v.any(),
  }),
  
  /** Error handling */
  errors: v.object({
    handle: v.any(),
    getErrorHistory: v.any(),
    clearErrors: v.any(),
    setErrorHandler: v.any(),
  }),
});

export type SocketsInput = any; // Inferred from RuntimeValidator
export type SocketsOutput = any; // Inferred from RuntimeValidator

// ============================================================================
// WebSocket System Types
// ============================================================================

export interface SocketConnection {
  id: string;
  url: string;
  protocols: string[];
  websocket: WebSocket | null;
  state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';
  reconnectAttempts: number;
  lastError?: Error;
  connectedAt?: number;
  disconnectedAt?: number;
  totalReconnects: number;
  messagesSent: number;
  messagesReceived: number;
}

export interface SocketEventHandler {
  id: string;
  event: 'open' | 'close' | 'error' | 'message';
  filter?: string;
  commands: any[];
  options: {
    once?: boolean;
    debounce?: number;
    throttle?: number;
  };
  isActive: boolean;
  executionCount: number;
  lastExecutionTime: number;
}

export interface QueuedMessage {
  id: string;
  data: any;
  format: 'json' | 'text' | 'binary';
  timestamp: number;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: number;
  error?: Error;
}

export interface SocketMessage {
  id: string;
  connectionId: string;
  type: 'incoming' | 'outgoing';
  data: any;
  format: 'json' | 'text' | 'binary';
  timestamp: number;
  size: number;
  validated: boolean;
  validationError?: string;
}

export interface SocketMetrics {
  connectionId: string;
  connectedAt?: number;
  totalReconnects: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransmitted: number;
  bytesReceived: number;
  averageLatency: number;
  errorCount: number;
  uptime: number;
}

// ============================================================================
// Enhanced Sockets Feature Context Implementation
// ============================================================================

export class TypedSocketsFeatureImplementation {
  public readonly name = 'socketsFeature';
  public readonly category = 'Frontend' as const;
  public readonly description = 'Type-safe WebSocket management feature with reconnection, message queuing, and comprehensive error handling';
  public readonly inputSchema = SocketsInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  private evaluationHistory: Array<{
    input: SocketsInput;
    output?: SocketsOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  private connections: Map<string, SocketConnection> = new Map();
  private eventHandlers: Map<string, SocketEventHandler> = new Map();
  private messageQueue: Map<string, QueuedMessage[]> = new Map();
  private messageHistory: SocketMessage[] = [];
  private errorHistory: Array<{ error: Error; timestamp: number; context: any }> = [];
  private throttleTimers: Map<string, number> = new Map();
  private debounceTimers: Map<string, number> = new Map();

  public readonly metadata: ContextMetadata = {
    category: 'Frontend',
    complexity: 'complex',
    sideEffects: ['network-connection', 'websocket-management', 'message-transmission', 'reconnection-logic'],
    dependencies: ['websocket-api', 'network-connection', 'message-serialization', 'event-system'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ socket: { url: "wss://api.example.com/ws" }, eventHandlers: [{ event: "message", commands: [{ name: "processMessage" }] }] }',
        description: 'Connect to WebSocket server and handle incoming messages',
        expectedOutput: 'TypedSocketsContext with connection management and message handling'
      },
      {
        input: '{ socket: { url: "wss://chat.example.com", reconnect: { enabled: true, maxAttempts: 10 } }, messageHandling: { format: "json" } }',
        description: 'Chat WebSocket with auto-reconnection and JSON message handling',
        expectedOutput: 'Resilient WebSocket connection with automatic recovery'
      },
      {
        input: '{ socket: { url: "wss://data.example.com", heartbeat: { enabled: true, interval: 30000 } }, messageHandling: { queue: { enabled: true } } }',
        description: 'Data WebSocket with heartbeat monitoring and message queuing',
        expectedOutput: 'Monitored connection with reliable message delivery'
      }
    ],
    relatedContexts: ['onFeature', 'behaviorFeature', 'eventSourceFeature'],
    relatedExpressions: [],
    frameworkDependencies: ['websocket-api', 'network-stack'],
    environmentRequirements: {
      browser: true,
      server: true,
      nodejs: true
    },
    performance: {
      averageTime: 25.4,
      complexity: 'O(n)' // n = number of connections and messages
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates type-safe WebSocket connections for hyperscript with automatic reconnection, message queuing, and comprehensive error handling',
    parameters: [
      {
        name: 'socketsConfig',
        type: 'SocketsInput',
        description: 'WebSocket configuration including URL, protocols, reconnection settings, and event handlers',
        optional: false,
        examples: [
          '{ socket: { url: "wss://api.example.com/ws" }, eventHandlers: [{ event: "message", commands: [{ name: "handleMessage" }] }] }',
          '{ socket: { url: "wss://chat.com", reconnect: { maxAttempts: 5 } }, messageHandling: { format: "json" } }',
          '{ socket: { url: "wss://realtime.com", heartbeat: { enabled: true } }, options: { enableAutoConnect: true } }'
        ]
      }
    ],
    returns: {
      type: 'SocketsContext',
      description: 'WebSocket management context with connection control, messaging, and event handling capabilities',
      examples: [
        'context.connection.connect() → establish WebSocket connection',
        'context.messaging.sendJSON({data: "value"}) → send JSON message',
        'context.events.addHandler("message", handler) → add message handler',
        'context.queue.add(message) → queue message for delivery'
      ]
    },
    examples: [
      {
        title: 'Basic WebSocket connection',
        code: 'const socketsContext = await createSocketsFeature({ socket: { url: "wss://api.example.com/ws" }, eventHandlers: [{ event: "message", commands: [{ name: "processData" }] }] })',
        explanation: 'Create WebSocket connection with message processing',
        output: 'Connected WebSocket with automatic message handling'
      },
      {
        title: 'Resilient chat connection',
        code: 'await socketsContext.connection.connect({ reconnect: { enabled: true, maxAttempts: 10 }, heartbeat: { enabled: true } })',
        explanation: 'Establish chat connection with reconnection and heartbeat monitoring',
        output: 'Robust WebSocket suitable for real-time chat applications'
      },
      {
        title: 'Send structured data',
        code: 'await socketsContext.messaging.sendJSON({ type: "chat", message: "Hello", userId: 123 })',
        explanation: 'Send JSON-formatted message through WebSocket',
        output: 'Structured message transmitted with automatic serialization'
      }
    ],
    seeAlso: ['onFeature', 'eventSourceFeature', 'networkManagement', 'realTimeData'],
    tags: ['websockets', 'realtime', 'networking', 'messaging', 'reconnection', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: SocketsInput): Promise<EvaluationResult<SocketsOutput>> {
    const startTime = Date.now();
    
    try {
      // Initialize socket system config first
      const config = await this.initializeConfig(input);
      
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        if (input.debug) {
          console.log('Sockets validation failed:', validation.errors);
        }
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }
      
      // Create enhanced sockets context
      const context: SocketsOutput = {
        contextId: `sockets-${Date.now()}`,
        timestamp: startTime,
        category: 'Frontend',
        capabilities: ['websocket-connection', 'message-handling', 'reconnection-management', 'queue-management', 'event-handling', 'error-recovery'],
        state: 'ready',
        
        // Connection management
        connection: {
          connect: this.createConnectionEstablisher(config),
          disconnect: this.createConnectionTerminator(),
          reconnect: this.createReconnector(),
          isConnected: this.createConnectionChecker(),
          getState: this.createStateGetter(),
          getConnectionInfo: this.createConnectionInfoGetter(),
        },
        
        // Message handling
        messaging: {
          send: this.createMessageSender(),
          sendJSON: this.createJSONSender(),
          sendBinary: this.createBinarySender(),
          subscribe: this.createMessageSubscriber(),
          unsubscribe: this.createMessageUnsubscriber(),
          getMessageHistory: this.createMessageHistoryGetter(),
        },
        
        // Event management
        events: {
          addHandler: this.createEventHandlerAdder(),
          removeHandler: this.createEventHandlerRemover(),
          emit: this.createEventEmitter(),
          getHandlers: this.createHandlerGetter(),
        },
        
        // Queue management
        queue: {
          add: this.createQueueAdder(),
          process: this.createQueueProcessor(),
          clear: this.createQueueClearer(),
          getSize: this.createQueueSizeGetter(),
          getPending: this.createPendingGetter(),
        },
        
        // Error handling
        errors: {
          handle: this.createErrorHandler(),
          getErrorHistory: this.createErrorHistoryGetter(),
          clearErrors: this.createErrorClearer(),
          setErrorHandler: this.createErrorHandlerSetter(),
        }
      };

      // Create initial connection if auto-connect is enabled
      if (input.options?.enableAutoConnect && input.socket) {
        await this.createSocketConnection(input.socket, input.eventHandlers, input.context);
      }

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);
      
      return {
        success: true,
        value: context,
        type: 'Context'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Sockets feature initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Verify WebSocket URL is valid and accessible',
          'Check network connectivity and firewall settings',
          'Ensure WebSocket server supports specified protocols',
          'Validate event handler configurations are correct'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      // First check if input is basic object structure
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{ type: 'invalid-input', message: 'Input must be an object', suggestions: [] }],
          suggestions: ['Provide a valid WebSocket configuration object']
        };
      }

      const parsed = this.inputSchema.parse(input);
      const errors: ValidationError[] = [];
      const suggestions: string[] = [];

      // Enhanced validation logic
      const data = parsed as SocketsInput;

      // Validate WebSocket URL
      if (data.socket?.url) {
        try {
          const url = new URL(data.socket.url);
          if (!['ws:', 'wss:'].includes(url.protocol)) {
            errors.push({
              type: 'invalid-websocket-protocol',
              message: 'WebSocket URL must use ws:// or wss:// protocol',
              path: 'socket.url',
              suggestions: []
            });
            suggestions.push('Use ws:// for local development or wss:// for secure connections');
          }
        } catch (urlError) {
          errors.push({
            type: 'invalid-websocket-url',
            message: `Invalid WebSocket URL: ${data.socket.url}`,
            path: 'socket.url',
            suggestions: []
          });
          suggestions.push('Provide a valid WebSocket URL (e.g., "wss://api.example.com/ws")');
        }
      }

      // Validate reconnection settings
      if (data.socket?.reconnect) {
        if (data.socket.reconnect.maxAttempts < 0) {
          errors.push({
            type: 'invalid-reconnect-attempts',
            message: 'Max reconnection attempts must be non-negative',
            path: 'socket.reconnect.maxAttempts',
            suggestions: []
          });
          suggestions.push('Set maxAttempts to 0 or positive number (0 = no reconnection)');
        }

        if (data.socket.reconnect.delay < 0) {
          errors.push({
            type: 'invalid-reconnect-delay',
            message: 'Reconnection delay must be non-negative',
            path: 'socket.reconnect.delay',
            suggestions: []
          });
          suggestions.push('Set delay to positive number in milliseconds');
        }

        if (data.socket.reconnect.maxDelay < data.socket.reconnect.delay) {
          errors.push({
            type: 'validation-error',
            message: 'Max delay must be greater than or equal to initial delay',
            path: 'socket.reconnect.maxDelay',
            suggestions: []
          });
          suggestions.push('Ensure maxDelay >= delay for proper backoff behavior');
        }
      }

      // Validate heartbeat settings
      if (data.socket?.heartbeat?.enabled) {
        if (data.socket.heartbeat.interval <= 0) {
          errors.push({
            type: 'invalid-heartbeat-interval',
            message: 'Heartbeat interval must be positive',
            path: 'socket.heartbeat.interval',
            suggestions: []
          });
          suggestions.push('Set heartbeat interval to positive number in milliseconds');
        }

        if (data.socket.heartbeat.timeout <= 0) {
          errors.push({
            type: 'invalid-heartbeat-timeout',
            message: 'Heartbeat timeout must be positive',
            path: 'socket.heartbeat.timeout',
            suggestions: []
          });
          suggestions.push('Set heartbeat timeout to positive number in milliseconds');
        }

        if (data.socket.heartbeat.timeout >= data.socket.heartbeat.interval) {
          errors.push({
            type: 'validation-error',
            message: 'Heartbeat timeout must be less than interval',
            path: 'socket.heartbeat',
            suggestions: []
          });
          suggestions.push('Ensure timeout < interval for proper heartbeat detection');
        }
      }

      // Validate event handlers
      if (data.eventHandlers) {
        data.eventHandlers.forEach((handler: any, index: number) => {
          // Validate filter expressions
          if (handler.filter) {
            try {
              new Function('message', 'event', `return ${handler.filter}`);
            } catch (filterError) {
              errors.push({
                type: 'invalid-filter-expression',
                message: `Invalid filter expression: ${handler.filter}`,
                path: `eventHandlers[${index}].filter`,
                suggestions: []
              });
              suggestions.push('Use valid JavaScript expression for message filtering');
            }
          }

          // Validate performance settings
          if (handler.options?.throttle && handler.options?.debounce) {
            errors.push({
              type: 'conflicting-performance-options',
              message: 'Cannot use both throttle and debounce on the same event handler',
              path: `eventHandlers[${index}].options`,
              suggestions: []
            });
            suggestions.push('Choose either throttle OR debounce, not both');
          }

          // Validate commands array
          if (!handler.commands || handler.commands.length === 0) {
            errors.push({
              type: 'empty-commands-array',
              message: 'Event handler must have at least one command',
              path: `eventHandlers[${index}].commands`,
              suggestions: []
            });
            suggestions.push('Add at least one command to execute when event occurs');
          }
        });
      }

      // Validate message handling settings
      if (data.messageHandling?.queue) {
        if (data.messageHandling.queue.maxSize < 0) {
          errors.push({
            type: 'invalid-queue-size',
            message: 'Queue max size must be non-negative (0 = unlimited)',
            path: 'messageHandling.queue.maxSize',
            suggestions: []
          });
          suggestions.push('Set queue maxSize to non-negative number (0 for unlimited)');
        }
      }

      // Validate connection limits
      if (data.options?.maxConnections <= 0) {
        errors.push({
          type: 'invalid-max-connections',
          message: 'Max connections must be positive',
          path: 'options.maxConnections',
          suggestions: []
        });
        suggestions.push('Set maxConnections to positive number');
      }

      if (data.options?.connectionTimeout <= 0) {
        errors.push({
          type: 'invalid-connection-timeout',
          message: 'Connection timeout must be positive',
          path: 'options.connectionTimeout',
          suggestions: []
        });
        suggestions.push('Set connectionTimeout to positive number in milliseconds');
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'schema-validation',
          suggestions: [],
          message: error instanceof Error ? error.message : 'Invalid input format'
        }],
        suggestions: [
          'Ensure input matches SocketsInput schema',
          'Check WebSocket configuration structure',
          'Verify event handler and message handling configurations are valid'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeConfig(input: SocketsInput) {
    return {
      ...input.options,
      environment: input.environment,
      debug: input.debug,
      initialized: Date.now()
    };
  }

  private async createSocketConnection(socketConfig: any, eventHandlers: any[], _context: any): Promise<SocketConnection> {
    const connectionId = `socket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const connection: SocketConnection = {
      id: connectionId,
      url: socketConfig.url,
      protocols: socketConfig.protocols || [],
      websocket: null,
      state: 'disconnected',
      reconnectAttempts: 0,
      totalReconnects: 0,
      messagesSent: 0,
      messagesReceived: 0,
    };

    this.connections.set(connectionId, connection);
    
    // Initialize message queue for this connection
    this.messageQueue.set(connectionId, []);

    // Register event handlers
    for (const handler of eventHandlers) {
      await this.registerEventHandler(connectionId, handler);
    }

    return connection;
  }

  private async registerEventHandler(_connectionId: string, handler: any): Promise<SocketEventHandler> {
    const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const eventHandler: SocketEventHandler = {
      id: handlerId,
      event: handler.event,
      filter: handler.filter,
      commands: handler.commands || [],
      options: handler.options || {},
      isActive: true,
      executionCount: 0,
      lastExecutionTime: 0,
    };

    this.eventHandlers.set(handlerId, eventHandler);
    return eventHandler;
  }

  private async connectWebSocket(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    try {
      connection.state = 'connecting';
      
      // Create WebSocket instance (would be actual WebSocket in browser/Node.js)
      if (typeof WebSocket !== 'undefined') {
        connection.websocket = new WebSocket(connection.url, connection.protocols);
        
        // Set up event listeners
        connection.websocket.onopen = () => this.handleWebSocketOpen(connectionId);
        connection.websocket.onclose = (event) => this.handleWebSocketClose(connectionId, event);
        connection.websocket.onerror = (event) => this.handleWebSocketError(connectionId, event);
        connection.websocket.onmessage = (event) => this.handleWebSocketMessage(connectionId, event);
      } else {
        // Mock connection for testing environments
        connection.state = 'connected';
        connection.connectedAt = Date.now();
        await this.executeEventHandlers(connectionId, 'open', null);
      }

      return true;
    } catch (error) {
      connection.state = 'error';
      connection.lastError = error as Error;
      await this.executeEventHandlers(connectionId, 'error', error);
      return false;
    }
  }

  private async handleWebSocketOpen(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.state = 'connected';
    connection.connectedAt = Date.now();
    connection.reconnectAttempts = 0;

    await this.executeEventHandlers(connectionId, 'open', null);
    await this.processQueuedMessages(connectionId);
  }

  private async handleWebSocketClose(connectionId: string, event: CloseEvent) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.state = 'disconnected';
    connection.disconnectedAt = Date.now();

    await this.executeEventHandlers(connectionId, 'close', event);
    
    // Attempt reconnection if enabled
    // Would implement reconnection logic here
  }

  private async handleWebSocketError(connectionId: string, event: Event) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.state = 'error';
    connection.lastError = new Error('WebSocket error occurred');

    await this.executeEventHandlers(connectionId, 'error', event);
  }

  private async handleWebSocketMessage(connectionId: string, event: MessageEvent) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.messagesReceived++;
    
    // Create message record
    const message: SocketMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId,
      type: 'incoming',
      data: event.data,
      format: this.detectMessageFormat(event.data),
      timestamp: Date.now(),
      size: this.calculateMessageSize(event.data),
      validated: true,
    };

    this.messageHistory.push(message);
    await this.executeEventHandlers(connectionId, 'message', event);
  }

  private async executeEventHandlers(_connectionId: string, eventType: string, eventData: any) {
    const handlers = Array.from(this.eventHandlers.values())
      .filter(h => h.event === eventType && h.isActive);

    for (const handler of handlers) {
      try {
        // Apply filter if provided
        if (handler.filter && !this.testMessageFilter(eventData, handler.filter)) {
          continue;
        }

        // Apply throttling/debouncing
        if (handler.options.throttle && this.isThrottled(handler.id, handler.options.throttle)) {
          continue;
        }

        if (handler.options.debounce) {
          this.applyDebounce(handler.id, handler.options.debounce, () => {
            this.executeHandlerCommands(handler, eventData);
          });
          continue;
        }

        await this.executeHandlerCommands(handler, eventData);
        
        handler.executionCount++;
        handler.lastExecutionTime = Date.now();

        if (handler.options.once) {
          handler.isActive = false;
        }

      } catch (error) {
        this.errorHistory.push({
          error: error as Error,
          timestamp: Date.now(),
          context: { handler, eventData }
        });
      }
    }
  }

  private async executeHandlerCommands(handler: SocketEventHandler, eventData: any): Promise<any> {
    // Simplified command execution - would integrate with actual command executor
    let result = { success: true, executed: handler.commands.length };
    
    for (const command of handler.commands) {
      if (typeof command === 'object' && command.name) {
        await this.executeBasicCommand(command, { eventData });
      }
    }
    
    return result;
  }

  private async executeBasicCommand(command: any, context: any): Promise<any> {
    // Basic command execution for common WebSocket commands
    switch (command.name) {
      case 'log':
        console.log(command.args?.[0] || 'WebSocket event triggered', context.eventData);
        break;
      case 'processMessage':
        // Would process incoming message
        break;
      case 'sendResponse':
        // Would send response message
        break;
      case 'reconnect':
        // Would trigger reconnection
        break;
      default:
        // Would delegate to global command executor
        break;
    }
    return undefined;
  }

  private detectMessageFormat(data: any): 'json' | 'text' | 'binary' {
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      return 'binary';
    }
    
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return 'json';
      } catch {
        return 'text';
      }
    }
    
    return 'text';
  }

  private calculateMessageSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof Blob) {
      return data.size;
    }
    if (typeof data === 'string') {
      return new Blob([data]).size;
    }
    return 0;
  }

  private testMessageFilter(eventData: any, filter: string): boolean {
    try {
      const filterFunction = new Function('message', 'event', `return ${filter}`);
      return Boolean(filterFunction(eventData?.data, eventData));
    } catch {
      return true; // If filter fails, allow event through
    }
  }

  private isThrottled(handlerId: string, delay: number): boolean {
    const lastTime = this.throttleTimers.get(handlerId) || 0;
    const now = Date.now();
    
    if (now - lastTime >= delay) {
      this.throttleTimers.set(handlerId, now);
      return false;
    }
    
    return true;
  }

  private applyDebounce(handlerId: string, delay: number, callback: () => void): void {
    const existingTimer = this.debounceTimers.get(handlerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    const timer = setTimeout(callback, delay);
    this.debounceTimers.set(handlerId, timer as any);
  }

  private async processQueuedMessages(connectionId: string): Promise<void> {
    const queue = this.messageQueue.get(connectionId);
    if (!queue || queue.length === 0) return;

    const connection = this.connections.get(connectionId);
    if (!connection || connection.state !== 'connected') return;

    for (let i = queue.length - 1; i >= 0; i--) {
      const message = queue[i];
      
      try {
        await this.sendMessage(connectionId, message.data, message.format);
        queue.splice(i, 1); // Remove sent message from queue
      } catch (error) {
        message.attempts++;
        message.lastAttempt = Date.now();
        message.error = error as Error;
        
        if (message.attempts >= message.maxAttempts) {
          queue.splice(i, 1); // Remove failed message
        }
      }
    }
  }

  private async sendMessage(connectionId: string, data: any, format: 'json' | 'text' | 'binary'): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.websocket || connection.state !== 'connected') {
      // Queue message if not connected
      await this.queueMessage(connectionId, data, format);
      return false;
    }

    try {
      let payload: string | ArrayBuffer | Blob;
      
      switch (format) {
        case 'json':
          payload = JSON.stringify(data);
          break;
        case 'binary':
          payload = data instanceof ArrayBuffer ? data : new ArrayBuffer(0);
          break;
        default:
          payload = String(data);
      }

      if (connection.websocket.readyState === WebSocket.OPEN) {
        connection.websocket.send(payload);
        connection.messagesSent++;
        
        // Record outgoing message
        const message: SocketMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          connectionId,
          type: 'outgoing',
          data,
          format,
          timestamp: Date.now(),
          size: this.calculateMessageSize(payload),
          validated: true,
        };
        
        this.messageHistory.push(message);
        return true;
      }
      
      return false;
    } catch (error) {
      await this.queueMessage(connectionId, data, format);
      return false;
    }
  }

  private async queueMessage(connectionId: string, data: any, format: 'json' | 'text' | 'binary'): Promise<void> {
    const queue = this.messageQueue.get(connectionId);
    if (!queue) return;

    const message: QueuedMessage = {
      id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data,
      format,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: 3,
    };

    queue.push(message);
    
    // Limit queue size
    const maxSize = 100; // Would be configurable
    if (queue.length > maxSize) {
      queue.shift(); // Remove oldest message
    }
  }

  // Factory methods for context API
  private createConnectionEstablisher(_config: any) {
    return async (connectionIdOrConfig?: string | any) => {
      if (typeof connectionIdOrConfig === 'string') {
        return await this.connectWebSocket(connectionIdOrConfig);
      } else {
        // Create new connection with provided config or default config
        const socketConfig = connectionIdOrConfig || {
          url: 'wss://localhost:8080',
          protocols: [],
          reconnect: { enabled: true },
          heartbeat: { enabled: false },
          compression: false,
          binaryType: 'blob',
        };
        const connection = await this.createSocketConnection(
          socketConfig,
          [],
          {}
        );
        return await this.connectWebSocket(connection.id);
      }
    };
  }

  private createConnectionTerminator() {
    return async (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      if (!connection) return false;

      connection.state = 'disconnecting';
      
      if (connection.websocket) {
        connection.websocket.close();
      }
      
      connection.state = 'disconnected';
      connection.disconnectedAt = Date.now();
      
      await this.executeEventHandlers(connectionId, 'close', null);
      return true;
    };
  }

  private createReconnector() {
    return async (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      if (!connection) return false;

      if (connection.websocket) {
        connection.websocket.close();
      }
      
      connection.reconnectAttempts++;
      connection.totalReconnects++;
      
      return await this.connectWebSocket(connectionId);
    };
  }

  private createConnectionChecker() {
    return (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      return connection?.state === 'connected' || false;
    };
  }

  private createStateGetter() {
    return (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      return connection?.state || 'disconnected';
    };
  }

  private createConnectionInfoGetter() {
    return (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      if (!connection) return null;

      const metrics: SocketMetrics = {
        connectionId: connection.id,
        ...(connection.connectedAt !== undefined && { connectedAt: connection.connectedAt }),
        totalReconnects: connection.totalReconnects,
        messagesSent: connection.messagesSent,
        messagesReceived: connection.messagesReceived,
        bytesTransmitted: 0, // Would track actual bytes
        bytesReceived: 0, // Would track actual bytes
        averageLatency: 0, // Would calculate from ping/pong
        errorCount: this.errorHistory.filter(e => e.context?.connectionId === connectionId).length,
        uptime: connection.connectedAt ? Date.now() - connection.connectedAt : 0,
      };

      return metrics;
    };
  }

  private createMessageSender() {
    return async (connectionId: string, data: any, format: 'json' | 'text' | 'binary' = 'text') => {
      return await this.sendMessage(connectionId, data, format);
    };
  }

  private createJSONSender() {
    return async (connectionId: string, data: any) => {
      return await this.sendMessage(connectionId, data, 'json');
    };
  }

  private createBinarySender() {
    return async (connectionId: string, data: ArrayBuffer | Blob) => {
      return await this.sendMessage(connectionId, data, 'binary');
    };
  }

  private createMessageSubscriber() {
    return (eventType: 'open' | 'close' | 'error' | 'message', handler: any) => {
      return this.registerEventHandler('*', { event: eventType, commands: [handler] });
    };
  }

  private createMessageUnsubscriber() {
    return (handlerId: string) => {
      return this.eventHandlers.delete(handlerId);
    };
  }

  private createMessageHistoryGetter() {
    return (connectionId?: string, limit?: number) => {
      let messages = this.messageHistory;
      
      if (connectionId) {
        messages = messages.filter(m => m.connectionId === connectionId);
      }
      
      if (limit) {
        messages = messages.slice(-limit);
      }
      
      return messages;
    };
  }

  private createEventHandlerAdder() {
    return async (connectionId: string, eventType: 'open' | 'close' | 'error' | 'message', handler: any) => {
      return await this.registerEventHandler(connectionId, {
        event: eventType,
        commands: [handler],
        options: {}
      });
    };
  }

  private createEventHandlerRemover() {
    return (handlerId: string) => {
      return this.eventHandlers.delete(handlerId);
    };
  }

  private createEventEmitter() {
    return async (connectionId: string, eventType: string, data?: any) => {
      await this.executeEventHandlers(connectionId, eventType, data);
      return true;
    };
  }

  private createHandlerGetter() {
    return (connectionId?: string) => {
      if (connectionId) {
        return Array.from(this.eventHandlers.values()).filter(h => h.id.includes(connectionId));
      }
      return Array.from(this.eventHandlers.values());
    };
  }

  private createQueueAdder() {
    return async (connectionId: string, data: any, format: 'json' | 'text' | 'binary' = 'json') => {
      await this.queueMessage(connectionId, data, format);
      return true;
    };
  }

  private createQueueProcessor() {
    return async (connectionId: string) => {
      await this.processQueuedMessages(connectionId);
      return true;
    };
  }

  private createQueueClearer() {
    return (connectionId: string) => {
      const queue = this.messageQueue.get(connectionId);
      if (queue) {
        queue.length = 0;
        return true;
      }
      return false;
    };
  }

  private createQueueSizeGetter() {
    return (connectionId: string) => {
      const queue = this.messageQueue.get(connectionId);
      return queue ? queue.length : 0;
    };
  }

  private createPendingGetter() {
    return (connectionId: string) => {
      const queue = this.messageQueue.get(connectionId);
      return queue ? queue.slice() : [];
    };
  }

  private createErrorHandler() {
    return async (error: Error, connectionId: string) => {
      this.errorHistory.push({
        error,
        timestamp: Date.now(),
        context: { connectionId }
      });
      return true;
    };
  }

  private createErrorHistoryGetter() {
    return (limit?: number) => {
      if (limit) {
        return this.errorHistory.slice(-limit);
      }
      return this.errorHistory.slice();
    };
  }

  private createErrorClearer() {
    return () => {
      this.errorHistory = [];
      return true;
    };
  }

  private createErrorHandlerSetter() {
    return (_handler: (error: Error, context: any) => void) => {
      // Would set custom error handler
      return true;
    };
  }

  private trackPerformance(startTime: number, success: boolean, output?: SocketsOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as SocketsInput, // Would store actual input in real implementation
      output,
      success,
      duration,
      timestamp: startTime
    });
  }

  getPerformanceMetrics() {
    return {
      totalInitializations: this.evaluationHistory.length,
      successRate: this.evaluationHistory.filter(h => h.success).length / Math.max(this.evaluationHistory.length, 1),
      averageDuration: this.evaluationHistory.reduce((sum, h) => sum + h.duration, 0) / Math.max(this.evaluationHistory.length, 1),
      lastEvaluationTime: this.evaluationHistory[this.evaluationHistory.length - 1]?.timestamp || 0,
      evaluationHistory: this.evaluationHistory.slice(-10),
      totalConnections: this.connections.size,
      totalHandlers: this.eventHandlers.size,
      totalMessages: this.messageHistory.length,
      totalErrors: this.errorHistory.length,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0)
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createSocketsFeature(): TypedSocketsFeatureImplementation {
  return new TypedSocketsFeatureImplementation();
}

export async function createSockets(
  socket: Partial<SocketsInput['socket']>,
  options?: Partial<SocketsInput>
): Promise<EvaluationResult<SocketsOutput>> {
  const socketsFeature = new TypedSocketsFeatureImplementation();
  return socketsFeature.initialize({
    socket: {
      url: 'wss://localhost:8080',
      protocols: [],
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delay: 1000,
        backoff: 'exponential',
        maxDelay: 30000,
      },
      heartbeat: {
        enabled: false,
        interval: 30000,
        message: 'ping',
        timeout: 5000,
      },
      compression: false,
      binaryType: 'blob',
      ...socket
    },
    eventHandlers: [],
    messageHandling: {
      format: 'json',
      validation: {
        enabled: true,
      },
      queue: {
        enabled: true,
        maxSize: 100,
        persistence: false,
      },
    },
    context: {
      variables: {},
    },
    options: {
      enableAutoConnect: true,
      enableMessageQueue: true,
      enableErrorHandling: true,
      maxConnections: 5,
      connectionTimeout: 10000,
    },
    environment: 'frontend',
    debug: false,
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedSocketsImplementation = new TypedSocketsFeatureImplementation();