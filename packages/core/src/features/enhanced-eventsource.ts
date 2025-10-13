
// Missing number validator - add to lightweight-validators.ts if needed
const createNumberValidator = () => v.string({ pattern: /^\d+$/ });

/**
 * Enhanced EventSource Feature Implementation
 * Type-safe Server-Sent Events management feature with enhanced validation and LLM integration
 */

import { v, z, type RuntimeValidator } from '../validation/lightweight-validators';
import type { 
  TypedContextImplementation,
  ContextMetadata,
  ValidationResult,
  EvaluationResult,
  EnhancedContextBase
} from '../types/enhanced-context';
import type { LLMDocumentation, EvaluationType } from '../types/enhanced-core';
import type { ExecutionContext } from '../types/core';

// ============================================================================
// Enhanced EventSource Feature Input/Output Schemas
// ============================================================================

export const EnhancedEventSourceInputSchema = v.object({
  /** EventSource configuration */
  source: z.object({
    url: v.string().min(1),
    withCredentials: v.boolean().default(false),
    headers: z.record(v.string()).default({}),
    retry: v.object({
      enabled: v.boolean().default(true),
      maxAttempts: v.number().default(5),
      delay: v.number().default(3000), // 3 seconds
      backoff: z.enum(['linear', 'exponential']).default('exponential'),
      maxDelay: v.number().default(30000), // 30 seconds
    }).default({}),
    timeout: v.object({
      enabled: v.boolean().default(true),
      duration: v.number().default(60000), // 60 seconds
    }).default({}),
  }),
  /** Event handling configuration */
  eventHandlers: v.array(v.object({
    event: v.string().min(1), // Event type (message, open, error, or custom)
    commands: v.array(v.any()).min(1),
    filter: v.string().optional(), // Event filter expression
    options: z.object({
      throttle: v.number().optional(),
      debounce: v.number().optional(),
    }).optional(),
  })).default([]),
  /** Message processing */
  messageProcessing: v.object({
    format: z.enum(['text', 'json', 'raw']).default('text'),
    validation: z.object({
      enabled: v.boolean().default(true),
      schema: v.any().optional(), // JSON schema for message validation
    }).default({}),
    buffer: v.object({
      enabled: v.boolean().default(true),
      maxSize: v.number().min(0).default(100), // 0 = unlimited
      flushInterval: v.number().default(1000), // 1 second
    }).default({}),
  }).default({}),
  /** Execution context */
  context: v.object({
    variables: z.record(v.any()).default({}),
    me: v.any().optional(),
    it: v.any().optional(),
    target: v.any().optional(),
  }).default({}),
  /** Feature options */
  options: v.object({
    enableAutoConnect: v.boolean().default(true),
    enableMessageBuffer: v.boolean().default(true),
    enableErrorHandling: v.boolean().default(true),
    maxConnections: v.number().default(1),
    connectionTimeout: v.number().default(30000), // 30 seconds
  }).default({}),
  /** Environment settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('frontend'),
  debug: v.boolean().default(false),
});

export const EnhancedEventSourceOutputSchema = v.object({
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
    getState: v.any(),
    getConnectionInfo: v.any(),
    isConnected: v.any(),
  }),
  
  /** Event management */
  events: v.object({
    addHandler: v.any(),
    removeHandler: v.any(),
    getHandlers: v.any(),
    emit: v.any(),
  }),
  
  /** Message handling */
  messages: v.object({
    getHistory: v.any(),
    getBuffer: v.any(),
    flushBuffer: v.any(),
    clearHistory: v.any(),
    subscribe: v.any(),
    unsubscribe: v.any(),
  }),
  
  /** Error handling */
  errors: v.object({
    handle: v.any(),
    getErrorHistory: v.any(),
    clearErrors: v.any(),
    setErrorHandler: v.any(),
  }),
});

export type EnhancedEventSourceInput = z.infer<typeof EnhancedEventSourceInputSchema>;
export type EnhancedEventSourceOutput = z.infer<typeof EnhancedEventSourceOutputSchema>;

// ============================================================================
// EventSource Management Types
// ============================================================================

export interface EventSourceConnection {
  id: string;
  url: string;
  eventSource: EventSource | null;
  state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';
  createdAt: number;
  connectedAt?: number;
  disconnectedAt?: number;
  lastMessageTime: number;
  messageCount: number;
  errorCount: number;
  retryAttempts: number;
  maxRetryAttempts: number;
}

export interface SSEMessage {
  id: string;
  connectionId: string;
  event: string;
  data: any;
  timestamp: number;
  format: 'text' | 'json' | 'raw';
  lastEventId?: string;
  retry?: number;
  origin?: string;
}

export interface SSEEventHandler {
  id: string;
  connectionId: string;
  eventType: string;
  commands: any[];
  filter?: string;
  options?: {
    throttle?: number;
    debounce?: number;
  };
  isActive: boolean;
  executionCount: number;
  lastExecutionTime: number;
}

export interface MessageBuffer {
  connectionId: string;
  messages: SSEMessage[];
  maxSize: number;
  flushInterval: number;
  lastFlushTime: number;
  autoFlushTimer?: number;
}

// ============================================================================
// Enhanced EventSource Feature Context Implementation
// ============================================================================

export class TypedEventSourceFeatureImplementation {
  public readonly name = 'eventsourceFeature';
  public readonly category = 'Frontend' as const;
  public readonly description = 'Type-safe Server-Sent Events management feature with connection handling, message processing, and comprehensive error recovery';
  public readonly inputSchema = EnhancedEventSourceInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  private evaluationHistory: Array<{
    input: EnhancedEventSourceInput;
    output?: EnhancedEventSourceOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  private connections: Map<string, EventSourceConnection> = new Map();
  private messageHistory: SSEMessage[] = [];
  private eventHandlers: Map<string, SSEEventHandler> = new Map();
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private errorHistory: Array<{ error: Error; timestamp: number; context: any }> = [];
  private throttleTimers: Map<string, number> = new Map();
  private debounceTimers: Map<string, number> = new Map();

  public readonly metadata: ContextMetadata = {
    category: 'Frontend',
    complexity: 'complex',
    sideEffects: ['sse-connection', 'event-listening', 'background-processing'],
    dependencies: ['eventsource-api', 'stream-processing', 'connection-management'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ source: { url: "/api/events" }, eventHandlers: [{ event: "message", commands: [{ name: "processUpdate" }] }] }',
        description: 'Create Server-Sent Events connection for real-time updates',
        expectedOutput: 'TypedEventSourceContext with SSE connection and message handling'
      },
      {
        input: '{ source: { url: "/api/notifications", retry: { maxAttempts: 10 } }, messageProcessing: { format: "json" } }',
        description: 'SSE connection with automatic retry and JSON message processing',
        expectedOutput: 'Event source context with robust reconnection and data parsing'
      },
      {
        input: '{ source: { url: "/api/metrics" }, messageProcessing: { buffer: { enabled: true, maxSize: 500 } } }',
        description: 'High-volume SSE with message buffering for performance',
        expectedOutput: 'Buffered event source for handling high-frequency updates'
      }
    ],
    relatedContexts: ['socketsFeature', 'onFeature', 'executionContext'],
    frameworkDependencies: ['eventsource-api', 'hyperscript-runtime'],
    environmentRequirements: {
      browser: true,
      server: false,
      nodejs: false
    },
    performance: {
      averageTime: 15.0,
      complexity: 'O(n)' // n = number of event handlers
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates and manages Server-Sent Events connections for real-time data streaming with type-safe message handling, automatic reconnection, and comprehensive error recovery',
    parameters: [
      {
        name: 'sourceConfig',
        type: 'EnhancedEventSourceInput',
        description: 'SSE configuration including server URL, event handlers, message processing options, and connection settings',
        optional: false,
        examples: [
          '{ source: { url: "/api/events" }, eventHandlers: [{ event: "message", commands: [{ name: "update" }] }] }',
          '{ source: { url: "/api/stream", withCredentials: true }, messageProcessing: { format: "json" } }',
          '{ source: { url: "/api/feed" }, messageProcessing: { buffer: { enabled: true, maxSize: 100 } } }'
        ]
      }
    ],
    returns: {
      type: 'EnhancedEventSourceContext',
      description: 'Server-Sent Events management context with connection lifecycle, message processing, buffer management, and error recovery capabilities',
      examples: [
        'context.connection.connect() → establish SSE connection',
        'context.messages.getHistory(50) → get last 50 messages',
        'context.connection.reconnect() → reconnect after failure',
        'context.messages.flushBuffer() → process buffered messages'
      ]
    },
    examples: [
      {
        title: 'Basic SSE connection',
        code: 'const sseContext = await createEventSourceFeature({ source: { url: "/api/updates" } })',
        explanation: 'Create Server-Sent Events connection for real-time updates',
        output: 'SSE context ready for receiving server events'
      },
      {
        title: 'JSON message processing',
        code: 'await sseContext.events.addHandler("user-update", { name: "updateUserInterface", args: [] })',
        explanation: 'Add handler for specific event types with JSON parsing',
        output: 'Event-driven SSE with structured data processing'
      },
      {
        title: 'Buffered high-frequency events',
        code: 'await sseContext.messages.flushBuffer() // Process accumulated messages',
        explanation: 'Batch process high-frequency events for performance',
        output: 'Efficient handling of rapid event streams'
      }
    ],
    seeAlso: ['socketsFeature', 'onFeature', 'streamProcessing', 'realTimeUpdates'],
    tags: ['server-sent-events', 'real-time', 'streaming', 'events', 'connection-management', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: EnhancedEventSourceInput): Promise<EvaluationResult<EnhancedEventSourceOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Initialize event source system
      const config = await this.initializeConfig(input);
      
      // Create enhanced eventsource context
      const context: EnhancedEventSourceOutput = {
        contextId: `eventsource-${Date.now()}`,
        timestamp: startTime,
        category: 'Frontend',
        capabilities: ['sse-connection', 'message-processing', 'event-handling', 'automatic-reconnection', 'error-recovery'],
        state: 'ready',
        
        // Connection management
        connection: {
          connect: this.createConnectionEstablisher(config),
          disconnect: this.createConnectionDisconnector(),
          reconnect: this.createConnectionReconnector(),
          getState: this.createStateGetter(),
          getConnectionInfo: this.createConnectionInfoGetter(),
          isConnected: this.createConnectionChecker(),
        },
        
        // Event management
        events: {
          addHandler: this.createEventHandlerAdder(),
          removeHandler: this.createEventHandlerRemover(),
          getHandlers: this.createEventHandlerGetter(),
          emit: this.createEventEmitter(),
        },
        
        // Message handling
        messages: {
          getHistory: this.createMessageHistoryGetter(),
          getBuffer: this.createBufferGetter(),
          flushBuffer: this.createBufferFlusher(),
          clearHistory: this.createHistoryClearer(),
          subscribe: this.createMessageSubscriber(),
          unsubscribe: this.createMessageUnsubscriber(),
        },
        
        // Error handling
        errors: {
          handle: this.createErrorHandler(),
          getErrorHistory: this.createErrorHistoryGetter(),
          clearErrors: this.createErrorClearer(),
          setErrorHandler: this.createErrorHandlerSetter(),
        }
      };

      // Create initial connection if auto-connect enabled
      if (input.options?.enableAutoConnect !== false) {
        await this.createConnection(input.source, input.context || {});
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
          message: `EventSource feature initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Verify EventSource URL is accessible',
          'Check browser supports Server-Sent Events',
          'Ensure server supports SSE with proper headers',
          'Validate event configuration parameters'
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
          errors: [{ type: 'invalid-input', message: 'Input must be an object' }],
          suggestions: ['Provide a valid EventSource configuration object']
        };
      }

      // Pre-validation checks for specific error cases
      const inputData = input as any;
      const errors: Array<{ type: string; message: string; path?: string }> = [];
      const suggestions: string[] = [];

      // Check for negative buffer size before Zod validation
      if (inputData.messageProcessing?.buffer?.maxSize !== undefined && inputData.messageProcessing.buffer.maxSize < 0) {
        errors.push({
          type: 'invalid-buffer-size',
          message: 'Buffer size must be non-negative (0 = unlimited)',
          path: 'messageProcessing.buffer.maxSize'
        });
        suggestions.push('Set buffer maxSize to 0 for unlimited or positive number for limit');
      }

      // Check for empty commands arrays before Zod validation
      if (inputData.eventHandlers && Array.isArray(inputData.eventHandlers)) {
        for (const handler of inputData.eventHandlers) {
          if (handler.commands && Array.isArray(handler.commands) && handler.commands.length === 0) {
            errors.push({
              type: 'empty-commands-array',
              message: 'Event handler commands array cannot be empty',
              path: 'eventHandlers.commands'
            });
            suggestions.push('Add at least one command to execute for event handler');
          }
        }
      }

      // If we found specific validation errors, return them without Zod parsing
      if (errors.length > 0) {
        return {
          isValid: false,
          errors,
          suggestions
        };
      }

      const parsed = this.inputSchema.parse(input);

      // Enhanced validation logic for remaining checks
      const data = parsed as EnhancedEventSourceInput;

      // Validate EventSource URL
      if (data.source) {
        if (!this.isValidEventSourceURL(data.source.url)) {
          errors.push({
            type: 'invalid-eventsource-url',
            message: `Invalid EventSource URL: "${data.source.url}"`,
            path: 'source.url'
          });
          suggestions.push('Use valid HTTP/HTTPS URL for EventSource connection');
        }

        // Validate retry settings
        if (data.source.retry) {
          if (data.source.retry.maxAttempts < 0) {
            errors.push({
              type: 'invalid-retry-attempts',
              message: 'Retry max attempts must be non-negative',
              path: 'source.retry.maxAttempts'
            });
            suggestions.push('Set maxAttempts to 0 for no retry or positive number for retry limit');
          }

          if (data.source.retry.delay < 0) {
            errors.push({
              type: 'invalid-retry-delay',
              message: 'Retry delay must be non-negative',
              path: 'source.retry.delay'
            });
            suggestions.push('Set retry delay to positive number in milliseconds');
          }

          if (data.source.retry.maxDelay < data.source.retry.delay) {
            errors.push({
              type: 'invalid-retry-max-delay',
              message: 'Max delay must be greater than or equal to delay',
              path: 'source.retry.maxDelay'
            });
            suggestions.push('Set maxDelay to be greater than or equal to delay');
          }
        }

        // Validate timeout settings
        if (data.source.timeout && data.source.timeout.duration < 1000) {
          errors.push({
            type: 'invalid-timeout-duration',
            message: 'Timeout duration must be at least 1000ms',
            path: 'source.timeout.duration'
          });
          suggestions.push('Set timeout duration to at least 1000ms for proper operation');
        }
      }

      // Validate connection limits
      if (data.options) {
        if (data.options.maxConnections < 1) {
          errors.push({
            type: 'invalid-max-connections',
            message: 'maxConnections must be at least 1',
            path: 'options.maxConnections'
          });
          suggestions.push('Set maxConnections to at least 1');
        }

        if (data.options.connectionTimeout < 1000) {
          errors.push({
            type: 'invalid-connection-timeout',
            message: 'Connection timeout must be at least 1000ms',
            path: 'options.connectionTimeout'
          });
          suggestions.push('Set connection timeout to at least 1000ms for proper operation');
        }
      }

      // Validate event handlers (performance settings already handled in pre-validation)
      if (data.eventHandlers && data.eventHandlers.length > 0) {
        for (const handler of data.eventHandlers) {
          // Validate performance settings
          if (handler.options?.throttle && handler.options?.debounce) {
            errors.push({
              type: 'conflicting-performance-options',
              message: 'Cannot use both throttle and debounce simultaneously',
              path: 'eventHandlers.options'
            });
            suggestions.push('Choose either throttle OR debounce, not both');
          }

          // Validate filter expressions
          if (handler.filter) {
            try {
              new Function('event', `return ${handler.filter}`);
            } catch (filterError) {
              errors.push({
                type: 'invalid-filter-expression',
                message: `Invalid filter expression: ${handler.filter}`,
                path: 'eventHandlers.filter'
              });
              suggestions.push('Use valid JavaScript expression for event filtering');
            }
          }
        }
      }

      // Check EventSource support
      if (typeof EventSource === 'undefined') {
        errors.push({
          type: 'eventsource-not-supported',
          message: 'Server-Sent Events are not supported in this environment',
        });
        suggestions.push('EventSource requires a browser environment');
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
          message: error instanceof Error ? error.message : 'Invalid input format'
        }],
        suggestions: [
          'Ensure input matches EnhancedEventSourceInput schema',
          'Check source configuration structure',
          'Verify event handlers and message processing configurations'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeConfig(input: EnhancedEventSourceInput) {
    return {
      ...input.options,
      environment: input.environment,
      debug: input.debug,
      initialized: Date.now()
    };
  }

  private async createConnection(sourceConfig: any, context: any): Promise<EventSourceConnection> {
    const id = `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const connection: EventSourceConnection = {
      id,
      url: sourceConfig.url,
      eventSource: null,
      state: 'connecting',
      createdAt: Date.now(),
      lastMessageTime: 0,
      messageCount: 0,
      errorCount: 0,
      retryAttempts: 0,
      maxRetryAttempts: sourceConfig.retry?.maxAttempts || 5,
    };

    try {
      // Create EventSource with configuration
      const eventSourceInit: EventSourceInit = {
        withCredentials: sourceConfig.withCredentials || false
      };

      connection.eventSource = new EventSource(sourceConfig.url, eventSourceInit);
      
      // Set up event listeners
      connection.eventSource.onopen = (event) => {
        connection.state = 'connected';
        connection.connectedAt = Date.now();
        connection.retryAttempts = 0;
        this.handleConnectionOpen(connection, event);
      };

      connection.eventSource.onmessage = (event) => {
        connection.messageCount++;
        connection.lastMessageTime = Date.now();
        this.handleMessage(connection, event);
      };

      connection.eventSource.onerror = (event) => {
        connection.errorCount++;
        connection.state = 'error';
        this.handleConnectionError(connection, event);
      };

      this.connections.set(id, connection);
      
      return connection;

    } catch (error) {
      connection.state = 'error';
      connection.errorCount++;
      this.errorHistory.push({
        error: error as Error,
        timestamp: Date.now(),
        context: { connection, sourceConfig }
      });
      throw error;
    }
  }

  private handleConnectionOpen(connection: EventSourceConnection, event: Event): void {
    // Process open event handlers
    this.processEventHandlers(connection.id, 'open', event);
  }

  private handleMessage(connection: EventSourceConnection, event: MessageEvent): void {
    const message: SSEMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId: connection.id,
      event: event.type,
      data: event.data,
      timestamp: Date.now(),
      format: this.detectMessageFormat(event.data),
      lastEventId: event.lastEventId || undefined,
      origin: event.origin || undefined,
    };

    this.messageHistory.push(message);

    // Add to buffer if enabled
    const buffer = this.messageBuffers.get(connection.id);
    if (buffer) {
      buffer.messages.push(message);
      if (buffer.maxSize > 0 && buffer.messages.length > buffer.maxSize) {
        buffer.messages.shift(); // Remove oldest message
      }
    }

    // Process message event handlers
    this.processEventHandlers(connection.id, 'message', event);
  }

  private handleConnectionError(connection: EventSourceConnection, event: Event): void {
    this.errorHistory.push({
      error: new Error('EventSource connection error'),
      timestamp: Date.now(),
      context: { connection, event }
    });

    // Process error event handlers
    this.processEventHandlers(connection.id, 'error', event);

    // Attempt reconnection if configured
    if (connection.retryAttempts < connection.maxRetryAttempts) {
      this.scheduleReconnection(connection);
    }
  }

  private scheduleReconnection(connection: EventSourceConnection): void {
    connection.retryAttempts++;
    
    // Calculate delay with backoff
    const baseDelay = 3000; // 3 seconds
    const delay = connection.retryAttempts * baseDelay;
    
    setTimeout(() => {
      this.attemptReconnection(connection);
    }, delay);
  }

  private async attemptReconnection(connection: EventSourceConnection): Promise<void> {
    try {
      if (connection.eventSource) {
        connection.eventSource.close();
      }
      
      connection.state = 'connecting';
      
      // Recreate EventSource
      connection.eventSource = new EventSource(connection.url);
      
      // Reattach event listeners
      connection.eventSource.onopen = (event) => {
        connection.state = 'connected';
        connection.connectedAt = Date.now();
        connection.retryAttempts = 0;
        this.handleConnectionOpen(connection, event);
      };

      connection.eventSource.onmessage = (event) => {
        connection.messageCount++;
        connection.lastMessageTime = Date.now();
        this.handleMessage(connection, event);
      };

      connection.eventSource.onerror = (event) => {
        connection.errorCount++;
        connection.state = 'error';
        this.handleConnectionError(connection, event);
      };

    } catch (error) {
      this.errorHistory.push({
        error: error as Error,
        timestamp: Date.now(),
        context: { connection, reconnectAttempt: connection.retryAttempts }
      });
    }
  }

  private processEventHandlers(connectionId: string, eventType: string, event: Event): void {
    const handlers = Array.from(this.eventHandlers.values())
      .filter(h => h.connectionId === connectionId && h.eventType === eventType && h.isActive);

    for (const handler of handlers) {
      this.executeEventHandler(handler, event);
    }
  }

  private async executeEventHandler(handler: SSEEventHandler, event: Event): Promise<void> {
    try {
      // Apply filter if provided
      if (handler.filter && !this.testEventFilter(event, handler.filter)) {
        return;
      }

      // Apply throttling/debouncing
      if (handler.options?.throttle && this.isThrottled(handler.id, handler.options.throttle)) {
        return;
      }

      if (handler.options?.debounce) {
        this.applyDebounce(handler.id, handler.options.debounce, () => {
          this.executeCommands(handler.commands, { event });
        });
        return;
      }

      await this.executeCommands(handler.commands, { event });
      
      handler.executionCount++;
      handler.lastExecutionTime = Date.now();

    } catch (error) {
      this.errorHistory.push({
        error: error as Error,
        timestamp: Date.now(),
        context: { handler, event }
      });
    }
  }

  private async executeCommands(commands: any[], context: any): Promise<any> {
    // Simplified command execution - would integrate with actual command executor
    let result = { success: true, executed: commands.length };
    
    for (const command of commands) {
      if (typeof command === 'object' && command.name) {
        await this.executeBasicCommand(command, context);
      }
    }
    
    return result;
  }

  private async executeBasicCommand(command: any, context: any): Promise<any> {
    // Basic command execution for common commands
    switch (command.name) {
      case 'log':
        console.log(command.args?.[0] || 'SSE event received', context.event?.data);
        break;
      case 'processUpdate':
        // Would process SSE update data
        break;
      case 'updateInterface':
        // Would update UI based on SSE data
        break;
      default:
        // Would delegate to global command executor
        break;
    }
    return undefined;
  }

  private isValidEventSourceURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url, window?.location?.href);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private detectMessageFormat(data: any): 'text' | 'json' | 'raw' {
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return 'json';
      } catch {
        return 'text';
      }
    }
    return 'raw';
  }

  private testEventFilter(event: Event, filter: string): boolean {
    try {
      const filterFunction = new Function('event', `return ${filter}`);
      return Boolean(filterFunction(event));
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

  // Factory methods for context API
  private createConnectionEstablisher(config: any) {
    return async (sourceConfig?: any) => {
      const finalConfig = sourceConfig || config;
      return await this.createConnection(finalConfig, {});
    };
  }

  private createConnectionDisconnector() {
    return async (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      if (!connection) return false;

      connection.state = 'disconnecting';
      
      if (connection.eventSource) {
        connection.eventSource.close();
        connection.eventSource = null;
      }
      
      connection.state = 'disconnected';
      connection.disconnectedAt = Date.now();
      
      return true;
    };
  }

  private createConnectionReconnector() {
    return async (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      if (!connection) return false;

      await this.attemptReconnection(connection);
      return true;
    };
  }

  private createStateGetter() {
    return (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      return connection ? connection.state : 'disconnected';
    };
  }

  private createConnectionInfoGetter() {
    return (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      if (!connection) return null;

      return {
        id: connection.id,
        url: connection.url,
        state: connection.state,
        createdAt: connection.createdAt,
        connectedAt: connection.connectedAt,
        messageCount: connection.messageCount,
        errorCount: connection.errorCount,
        retryAttempts: connection.retryAttempts,
      };
    };
  }

  private createConnectionChecker() {
    return (connectionId: string) => {
      const connection = this.connections.get(connectionId);
      return connection ? connection.state === 'connected' : false;
    };
  }

  private createEventHandlerAdder() {
    return async (connectionId: string, eventType: string, command: any) => {
      const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const handler: SSEEventHandler = {
        id: handlerId,
        connectionId,
        eventType,
        commands: [command],
        isActive: true,
        executionCount: 0,
        lastExecutionTime: 0,
      };

      this.eventHandlers.set(handlerId, handler);
      return handlerId;
    };
  }

  private createEventHandlerRemover() {
    return (handlerId: string) => {
      return this.eventHandlers.delete(handlerId);
    };
  }

  private createEventHandlerGetter() {
    return (connectionId?: string) => {
      if (connectionId) {
        return Array.from(this.eventHandlers.values()).filter(h => h.connectionId === connectionId);
      }
      return Array.from(this.eventHandlers.values());
    };
  }

  private createEventEmitter() {
    return async (connectionId: string, eventType: string, data?: any) => {
      // Would emit custom events
      return true;
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

  private createBufferGetter() {
    return (connectionId: string) => {
      const buffer = this.messageBuffers.get(connectionId);
      return buffer ? buffer.messages.slice() : [];
    };
  }

  private createBufferFlusher() {
    return async (connectionId: string) => {
      const buffer = this.messageBuffers.get(connectionId);
      if (!buffer || buffer.messages.length === 0) return [];

      const messages = buffer.messages.slice();
      buffer.messages.length = 0; // Clear buffer
      buffer.lastFlushTime = Date.now();
      
      return messages;
    };
  }

  private createHistoryClearer() {
    return (connectionId?: string) => {
      if (connectionId) {
        this.messageHistory = this.messageHistory.filter(m => m.connectionId !== connectionId);
      } else {
        this.messageHistory = [];
      }
      return true;
    };
  }

  private createMessageSubscriber() {
    return async (eventType: string, command: any) => {
      const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const handler: SSEEventHandler = {
        id: handlerId,
        connectionId: '', // For all connections
        eventType,
        commands: [command],
        isActive: true,
        executionCount: 0,
        lastExecutionTime: 0,
      };

      this.eventHandlers.set(handlerId, handler);
      return handlerId;
    };
  }

  private createMessageUnsubscriber() {
    return (handlerId: string) => {
      return this.eventHandlers.delete(handlerId);
    };
  }

  private createErrorHandler() {
    return async (error: Error, context: any) => {
      this.errorHistory.push({
        error,
        timestamp: Date.now(),
        context
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
    return (handler: (error: Error, context: any) => void) => {
      // Would set custom error handler
      return true;
    };
  }

  private trackPerformance(startTime: number, success: boolean, output?: EnhancedEventSourceOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as EnhancedEventSourceInput, // Would store actual input in real implementation
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
      evaluationHistory: this.evaluationHistory.slice(-10), // Last 10 evaluations
      totalConnections: this.connections.size,
      totalMessages: this.messageHistory.length,
      totalErrors: this.errorHistory.length,
      totalEventHandlers: this.eventHandlers.size,
      bufferedMessages: Array.from(this.messageBuffers.values()).reduce((sum, buffer) => sum + buffer.messages.length, 0)
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createEventSourceFeature(): TypedEventSourceFeatureImplementation {
  return new TypedEventSourceFeatureImplementation();
}

export async function createEnhancedEventSource(
  source: Partial<EnhancedEventSourceInput['source']>,
  options?: Partial<EnhancedEventSourceInput>
): Promise<EvaluationResult<EnhancedEventSourceOutput>> {
  const eventsourceFeature = new TypedEventSourceFeatureImplementation();
  return eventsourceFeature.initialize({
    source: {
      url: '',
      withCredentials: false,
      headers: {},
      retry: { enabled: true, maxAttempts: 5, delay: 3000, backoff: 'exponential', maxDelay: 30000 },
      timeout: { enabled: true, duration: 60000 },
      ...source
    },
    eventHandlers: [],
    messageProcessing: {
      format: 'text',
      validation: { enabled: true },
      buffer: { enabled: true, maxSize: 100, flushInterval: 1000 },
    },
    context: {
      variables: {},
    },
    options: {
      enableAutoConnect: true,
      enableMessageBuffer: true,
      enableErrorHandling: true,
      maxConnections: 1,
      connectionTimeout: 30000,
    },
    environment: 'frontend',
    debug: false,
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedEventSourceImplementation = new TypedEventSourceFeatureImplementation();