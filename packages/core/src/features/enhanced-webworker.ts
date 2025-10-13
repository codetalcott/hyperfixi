
// Missing number validator - add to lightweight-validators.ts if needed
const createNumberValidator = () => v.string({ pattern: /^\d+$/ });

/**
 * Enhanced WebWorker Feature Implementation
 * Type-safe Web Worker management feature with enhanced validation and LLM integration
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
// Enhanced WebWorker Feature Input/Output Schemas
// ============================================================================

export const EnhancedWebWorkerInputSchema = v.object({
  /** Worker configuration */
  worker: z.object({
    script: v.string().min(1), // Script URL or inline code
    type: z.enum(['module', 'classic']).default('classic'),
    name: v.string().optional(), // Worker name for debugging
    credentials: z.enum(['omit', 'same-origin', 'include']).default('same-origin'),
    inline: v.boolean().default(false), // Whether script is inline code vs URL
  }),
  /** Message handling configuration */
  messaging: v.object({
    format: z.enum(['json', 'text', 'binary']).default('json'),
    serialization: z.enum(['structured-clone', 'json']).default('structured-clone'),
    transferables: v.array(v.string()).default([]), // Transferable object types
    validation: z.object({
      enabled: v.boolean().default(true),
      schema: v.any().optional(), // JSON schema for message validation
    }).default({}),
    queue: v.object({
      enabled: v.boolean().default(true),
      maxSize: v.number().min(0).default(100), // 0 = unlimited
      persistence: v.boolean().default(false),
    }).default({}),
  }).default({}),
  /** Event handlers */
  eventHandlers: v.array(v.object({
    event: z.enum(['message', 'error', 'messageerror']),
    commands: v.array(v.any()).min(1),
    filter: v.string().optional(), // Message filter expression
    options: z.object({
      throttle: v.number().optional(),
      debounce: v.number().optional(),
    }).optional(),
  })).default([]),
  /** Execution context */
  context: v.object({
    variables: z.record(v.any()).default({}),
    me: v.any().optional(),
    it: v.any().optional(),
    target: v.any().optional(),
  }).default({}),
  /** Feature options */
  options: v.object({
    enableAutoStart: v.boolean().default(true),
    enableMessageQueue: v.boolean().default(true),
    enableErrorHandling: v.boolean().default(true),
    maxWorkers: v.number().default(4),
    workerTimeout: v.number().default(30000), // 30 seconds
    terminationTimeout: v.number().default(5000), // 5 seconds
  }).default({}),
  /** Environment settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('frontend'),
  debug: v.boolean().default(false),
});

export const EnhancedWebWorkerOutputSchema = v.object({
  /** Context identifier */
  contextId: v.string(),
  timestamp: v.number(),
  category: v.literal('Frontend'),
  capabilities: v.array(v.string()),
  state: z.enum(['ready', 'starting', 'running', 'terminating', 'terminated', 'error']),
  
  /** Worker management */
  workers: z.object({
    create: v.any(),
    terminate: v.any(),
    restart: v.any(),
    getWorker: v.any(),
    listWorkers: v.any(),
    getWorkerInfo: v.any(),
  }),
  
  /** Message handling */
  messaging: v.object({
    send: v.any(),
    sendJSON: v.any(),
    sendBinary: v.any(),
    broadcast: v.any(),
    getMessageHistory: v.any(),
    subscribe: v.any(),
    unsubscribe: v.any(),
  }),
  
  /** Event management */
  events: v.object({
    addHandler: v.any(),
    removeHandler: v.any(),
    getHandlers: v.any(),
    emit: v.any(),
  }),
  
  /** Queue management */
  queue: v.object({
    add: v.any(),
    process: v.any(),
    getSize: v.any(),
    getPending: v.any(),
    clear: v.any(),
  }),
  
  /** Error handling */
  errors: v.object({
    handle: v.any(),
    getErrorHistory: v.any(),
    clearErrors: v.any(),
    setErrorHandler: v.any(),
  }),
});

export type EnhancedWebWorkerInput = z.infer<typeof EnhancedWebWorkerInputSchema>;
export type EnhancedWebWorkerOutput = z.infer<typeof EnhancedWebWorkerOutputSchema>;

// ============================================================================
// Web Worker Management Types
// ============================================================================

export interface WorkerInstance {
  id: string;
  name?: string;
  worker: Worker;
  script: string;
  type: 'module' | 'classic';
  state: 'starting' | 'running' | 'terminating' | 'terminated' | 'error';
  createdAt: number;
  lastMessageTime: number;
  messageCount: number;
  errorCount: number;
  isTerminating: boolean;
}

export interface WorkerMessage {
  id: string;
  workerId: string;
  type: 'outgoing' | 'incoming';
  data: any;
  transferables?: Transferable[];
  timestamp: number;
  format: 'json' | 'text' | 'binary';
  size?: number;
  error?: Error;
}

export interface WorkerEventHandler {
  id: string;
  workerId: string;
  eventType: 'message' | 'error' | 'messageerror';
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

// ============================================================================
// Enhanced WebWorker Feature Context Implementation
// ============================================================================

export class TypedWebWorkerFeatureImplementation {
  public readonly name = 'webworkerFeature';
  public readonly category = 'Frontend' as const;
  public readonly description = 'Type-safe Web Worker management feature with message handling, event processing, and comprehensive error management';
  public readonly inputSchema = EnhancedWebWorkerInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  private evaluationHistory: Array<{
    input: EnhancedWebWorkerInput;
    output?: EnhancedWebWorkerOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  private workers: Map<string, WorkerInstance> = new Map();
  private messageHistory: WorkerMessage[] = [];
  private eventHandlers: Map<string, WorkerEventHandler> = new Map();
  private messageQueue: Map<string, WorkerMessage[]> = new Map();
  private errorHistory: Array<{ error: Error; timestamp: number; context: any }> = [];
  private throttleTimers: Map<string, number> = new Map();
  private debounceTimers: Map<string, number> = new Map();

  public readonly metadata: ContextMetadata = {
    category: 'Frontend',
    complexity: 'complex',
    sideEffects: ['worker-creation', 'message-passing', 'background-execution'],
    dependencies: ['web-worker-api', 'message-channel', 'transferable-objects'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ worker: { script: "./worker.js" }, messaging: { format: "json" } }',
        description: 'Create a Web Worker for background JavaScript execution',
        expectedOutput: 'TypedWebWorkerContext with worker management and message handling'
      },
      {
        input: '{ worker: { script: "self.onmessage = e => self.postMessage(e.data * 2)", inline: true } }',
        description: 'Create inline worker for simple calculations',
        expectedOutput: 'Worker context with inline script execution'
      },
      {
        input: '{ worker: { script: "./data-processor.js", type: "module" }, messaging: { transferables: ["ArrayBuffer"] } }',
        description: 'Module worker with transferable object support for large data processing',
        expectedOutput: 'High-performance worker context with zero-copy data transfer'
      }
    ],
    relatedContexts: ['socketsFeature', 'onFeature', 'executionContext'],
    frameworkDependencies: ['web-worker-api', 'hyperscript-runtime'],
    environmentRequirements: {
      browser: true,
      server: false,
      nodejs: false
    },
    performance: {
      averageTime: 25.0,
      complexity: 'O(n)' // n = number of workers managed
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates and manages Web Workers for background JavaScript execution with type-safe message handling, event processing, and comprehensive error recovery',
    parameters: [
      {
        name: 'workerConfig',
        type: 'EnhancedWebWorkerInput',
        description: 'Web Worker configuration including script source, messaging format, event handlers, and performance options',
        optional: false,
        examples: [
          '{ worker: { script: "./worker.js" }, messaging: { format: "json" } }',
          '{ worker: { script: "worker-code", inline: true }, options: { maxWorkers: 2 } }',
          '{ worker: { script: "./module-worker.js", type: "module" }, messaging: { transferables: ["ArrayBuffer"] } }'
        ]
      }
    ],
    returns: {
      type: 'EnhancedWebWorkerContext',
      description: 'Web Worker management context with worker lifecycle, message handling, queue management, and error recovery capabilities',
      examples: [
        'context.workers.create(config) → worker instance ID',
        'context.messaging.sendJSON(workerId, data) → send JSON message to worker',
        'context.queue.add(workerId, message) → queue message for worker',
        'context.workers.terminate(workerId) → gracefully terminate worker'
      ]
    },
    examples: [
      {
        title: 'Basic worker creation',
        code: 'const workerContext = await createWebWorkerFeature({ worker: { script: "./calc-worker.js" } })',
        explanation: 'Create a Web Worker for background calculations',
        output: 'Worker context with calculation worker ready'
      },
      {
        title: 'Message passing with transferables',
        code: 'await workerContext.messaging.sendBinary(workerId, arrayBuffer, ["ArrayBuffer"])',
        explanation: 'Send large binary data to worker using transferable objects for zero-copy transfer',
        output: 'High-performance message transfer without copying data'
      },
      {
        title: 'Worker event handling',
        code: 'await workerContext.events.addHandler(workerId, "message", { name: "processResult", args: [] })',
        explanation: 'Add event handler for worker messages with command execution',
        output: 'Event-driven worker communication with hyperscript integration'
      }
    ],
    seeAlso: ['socketsFeature', 'onFeature', 'messagingSystem', 'backgroundExecution'],
    tags: ['webworkers', 'background-execution', 'message-passing', 'transferables', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: EnhancedWebWorkerInput): Promise<EvaluationResult<EnhancedWebWorkerOutput>> {
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

      // Initialize worker system
      const config = await this.initializeConfig(input);
      
      // Create enhanced webworker context
      const context: EnhancedWebWorkerOutput = {
        contextId: `webworker-${Date.now()}`,
        timestamp: startTime,
        category: 'Frontend',
        capabilities: ['worker-management', 'message-handling', 'background-execution', 'transferable-objects', 'error-recovery'],
        state: 'ready',
        
        // Worker management
        workers: {
          create: this.createWorkerCreator(config),
          terminate: this.createWorkerTerminator(),
          restart: this.createWorkerRestarter(),
          getWorker: this.createWorkerGetter(),
          listWorkers: this.createWorkerLister(),
          getWorkerInfo: this.createWorkerInfoGetter(),
        },
        
        // Message handling
        messaging: {
          send: this.createMessageSender(),
          sendJSON: this.createJSONSender(),
          sendBinary: this.createBinarySender(),
          broadcast: this.createBroadcaster(),
          getMessageHistory: this.createMessageHistoryGetter(),
          subscribe: this.createMessageSubscriber(),
          unsubscribe: this.createMessageUnsubscriber(),
        },
        
        // Event management
        events: {
          addHandler: this.createEventHandlerAdder(),
          removeHandler: this.createEventHandlerRemover(),
          getHandlers: this.createEventHandlerGetter(),
          emit: this.createEventEmitter(),
        },
        
        // Queue management
        queue: {
          add: this.createQueueAdder(),
          process: this.createQueueProcessor(),
          getSize: this.createQueueSizeGetter(),
          getPending: this.createPendingGetter(),
          clear: this.createQueueClearer(),
        },
        
        // Error handling
        errors: {
          handle: this.createErrorHandler(),
          getErrorHistory: this.createErrorHistoryGetter(),
          clearErrors: this.createErrorClearer(),
          setErrorHandler: this.createErrorHandlerSetter(),
        }
      };

      // Create initial worker if script provided
      if (input.worker.script && input.options?.enableAutoStart !== false) {
        await this.createWorker(input.worker, input.context || {});
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
          message: `WebWorker feature initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Verify worker script URL is accessible',
          'Check browser supports Web Workers',
          'Ensure script has valid JavaScript syntax',
          'Validate worker configuration parameters'
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
          suggestions: ['Provide a valid Web Worker configuration object']
        };
      }

      // Pre-validation checks for specific error cases that Zod might not catch properly
      const inputData = input as any;
      const errors: Array<{ type: string; message: string; path?: string }> = [];
      const suggestions: string[] = [];

      // Check for negative queue size before Zod validation
      if (inputData.messaging?.queue?.maxSize !== undefined && inputData.messaging.queue.maxSize < 0) {
        errors.push({
          type: 'invalid-queue-size',
          message: 'Queue size must be non-negative (0 = unlimited)',
          path: 'messaging.queue.maxSize'
        });
        suggestions.push('Set queue maxSize to 0 for unlimited or positive number for limit');
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
      const data = parsed as EnhancedWebWorkerInput;

      // Validate worker script
      if (data.worker) {
        if (!data.worker.inline && !this.isValidWorkerScript(data.worker.script)) {
          errors.push({
            type: 'invalid-worker-script',
            message: `Invalid worker script: "${data.worker.script}"`,
            path: 'worker.script'
          });
          suggestions.push('Provide valid JavaScript file URL or inline script code');
        }

        // Validate inline script syntax
        if (data.worker.inline) {
          try {
            // Basic syntax validation - allow import statements for module workers
            if (data.worker.type === 'module' && data.worker.script.includes('import')) {
              // Skip Function constructor validation for module scripts with imports
              // as they require module context to resolve imports
            } else {
              new Function(data.worker.script);
            }
          } catch (syntaxError) {
            errors.push({
              type: 'invalid-inline-script',
              message: `Invalid inline script syntax: ${data.worker.script}`,
              path: 'worker.script'
            });
            suggestions.push('Ensure inline script has valid JavaScript syntax');
          }
        }
      }

      // Message queue settings are validated in pre-validation above

      // Validate worker limits
      if (data.options) {
        if (data.options.maxWorkers < 1) {
          errors.push({
            type: 'invalid-max-workers',
            message: 'maxWorkers must be at least 1',
            path: 'options.maxWorkers'
          });
          suggestions.push('Set maxWorkers to at least 1');
        }

        if (data.options.workerTimeout < 1000) {
          errors.push({
            type: 'invalid-worker-timeout',
            message: 'Worker timeout must be at least 1000ms',
            path: 'options.workerTimeout'
          });
          suggestions.push('Set worker timeout to at least 1000ms for proper operation');
        }

        if (data.options.terminationTimeout < 1000) {
          errors.push({
            type: 'invalid-termination-timeout',
            message: 'Termination timeout must be at least 1000ms',
            path: 'options.terminationTimeout'
          });
          suggestions.push('Set termination timeout to at least 1000ms for graceful shutdown');
        }
      }

      // Validate event handlers (empty commands arrays are validated in pre-validation above)
      if (data.eventHandlers && data.eventHandlers.length > 0) {
        for (const handler of data.eventHandlers) {
          // Commands validation is handled in pre-validation

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
              new Function('message', `return ${handler.filter}`);
            } catch (filterError) {
              errors.push({
                type: 'invalid-filter-expression',
                message: `Invalid filter expression: ${handler.filter}`,
                path: 'eventHandlers.filter'
              });
              suggestions.push('Use valid JavaScript expression for message filtering');
            }
          }
        }
      }

      // Check Web Worker support
      if (typeof Worker === 'undefined') {
        errors.push({
          type: 'webworker-not-supported',
          message: 'Web Workers are not supported in this environment',
        });
        suggestions.push('Web Workers require a browser environment');
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
          'Ensure input matches EnhancedWebWorkerInput schema',
          'Check worker configuration structure',
          'Verify messaging and event handler configurations'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeConfig(input: EnhancedWebWorkerInput) {
    return {
      ...input.options,
      environment: input.environment,
      debug: input.debug,
      initialized: Date.now()
    };
  }

  private async createWorker(workerConfig: any, context: any): Promise<WorkerInstance> {
    const id = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let worker: Worker;
    
    if (workerConfig.inline) {
      // Create worker from inline script
      const blob = new Blob([workerConfig.script], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url, { 
        type: workerConfig.type || 'classic',
        name: workerConfig.name || id
      });
      // Clean up blob URL after worker creation
      URL.revokeObjectURL(url);
    } else {
      // Create worker from script URL
      worker = new Worker(workerConfig.script, {
        type: workerConfig.type || 'classic',
        name: workerConfig.name || id
      });
    }

    const instance: WorkerInstance = {
      id,
      name: workerConfig.name,
      worker,
      script: workerConfig.script,
      type: workerConfig.type || 'classic',
      state: 'starting',
      createdAt: Date.now(),
      lastMessageTime: 0,
      messageCount: 0,
      errorCount: 0,
      isTerminating: false,
    };

    // Set up event listeners
    worker.onmessage = (event) => {
      instance.messageCount++;
      instance.lastMessageTime = Date.now();
      this.handleWorkerMessage(instance, event);
    };

    worker.onerror = (event) => {
      instance.errorCount++;
      instance.state = 'error';
      this.handleWorkerError(instance, event);
    };

    worker.onmessageerror = (event) => {
      instance.errorCount++;
      this.handleWorkerMessageError(instance, event);
    };

    this.workers.set(id, instance);
    instance.state = 'running';
    
    return instance;
  }

  private handleWorkerMessage(worker: WorkerInstance, event: MessageEvent): void {
    const message: WorkerMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workerId: worker.id,
      type: 'incoming',
      data: event.data,
      timestamp: Date.now(),
      format: this.detectMessageFormat(event.data),
    };

    this.messageHistory.push(message);

    // Process event handlers
    this.processEventHandlers(worker.id, 'message', event);
  }

  private handleWorkerError(worker: WorkerInstance, event: ErrorEvent): void {
    const error = new Error(`Worker error: ${event.message}`);
    this.errorHistory.push({
      error,
      timestamp: Date.now(),
      context: { worker, event }
    });

    // Process error event handlers
    this.processEventHandlers(worker.id, 'error', event);
  }

  private handleWorkerMessageError(worker: WorkerInstance, event: MessageEvent): void {
    const error = new Error('Worker message error: Failed to deserialize message');
    this.errorHistory.push({
      error,
      timestamp: Date.now(),
      context: { worker, event }
    });

    // Process messageerror event handlers
    this.processEventHandlers(worker.id, 'messageerror', event);
  }

  private processEventHandlers(workerId: string, eventType: string, event: Event): void {
    const handlers = Array.from(this.eventHandlers.values())
      .filter(h => h.workerId === workerId && h.eventType === eventType && h.isActive);

    for (const handler of handlers) {
      this.executeEventHandler(handler, event);
    }
  }

  private async executeEventHandler(handler: WorkerEventHandler, event: Event): Promise<void> {
    try {
      // Apply filter if provided
      if (handler.filter && !this.testMessageFilter(event, handler.filter)) {
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
        console.log(command.args?.[0] || 'Worker message received', context.event?.data);
        break;
      case 'processMessage':
        // Would process worker message data
        break;
      default:
        // Would delegate to global command executor
        break;
    }
    return undefined;
  }

  private isValidWorkerScript(script: string): boolean {
    // Basic validation for worker script URLs
    if (script.startsWith('http://') || script.startsWith('https://')) {
      return true;
    }
    if (script.startsWith('./') || script.startsWith('../') || script.startsWith('/')) {
      return true;
    }
    return false;
  }

  private detectMessageFormat(data: any): 'json' | 'text' | 'binary' {
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      return 'binary';
    }
    if (typeof data === 'string') {
      return 'text';
    }
    return 'json';
  }

  private testMessageFilter(event: Event, filter: string): boolean {
    try {
      const filterFunction = new Function('message', `return ${filter}`);
      return Boolean(filterFunction(event));
    } catch {
      return true; // If filter fails, allow message through
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
  private createWorkerCreator(config: any) {
    return async (workerConfig: any) => {
      if (this.workers.size >= (config.maxWorkers || 4)) {
        throw new Error('Maximum number of workers reached');
      }
      return await this.createWorker(workerConfig, {});
    };
  }

  private createWorkerTerminator() {
    return async (workerId: string, timeout?: number) => {
      const worker = this.workers.get(workerId);
      if (!worker) return false;

      worker.isTerminating = true;
      worker.state = 'terminating';

      // Graceful termination with timeout
      const terminationTimeout = timeout || 5000;
      setTimeout(() => {
        if (worker.state === 'terminating') {
          worker.worker.terminate();
          worker.state = 'terminated';
          this.workers.delete(workerId);
        }
      }, terminationTimeout);

      return true;
    };
  }

  private createWorkerRestarter() {
    return async (workerId: string) => {
      const worker = this.workers.get(workerId);
      if (!worker) return false;

      // Terminate existing worker
      worker.worker.terminate();
      this.workers.delete(workerId);

      // Create new worker with same configuration
      const newWorker = await this.createWorker({
        script: worker.script,
        type: worker.type,
        name: worker.name,
        inline: false,
      }, {});

      return newWorker.id;
    };
  }

  private createWorkerGetter() {
    return (workerId: string) => {
      return this.workers.get(workerId) || null;
    };
  }

  private createWorkerLister() {
    return () => {
      return Array.from(this.workers.keys());
    };
  }

  private createWorkerInfoGetter() {
    return (workerId: string) => {
      const worker = this.workers.get(workerId);
      if (!worker) return null;

      return {
        id: worker.id,
        name: worker.name,
        state: worker.state,
        createdAt: worker.createdAt,
        messageCount: worker.messageCount,
        errorCount: worker.errorCount,
        lastMessageTime: worker.lastMessageTime,
      };
    };
  }

  private createMessageSender() {
    return async (workerId: string, data: any, transferables?: Transferable[]) => {
      const worker = this.workers.get(workerId);
      if (!worker || worker.state !== 'running') return false;

      try {
        worker.worker.postMessage(data, transferables || []);
        
        const message: WorkerMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workerId,
          type: 'outgoing',
          data,
          transferables,
          timestamp: Date.now(),
          format: this.detectMessageFormat(data),
        };

        this.messageHistory.push(message);
        return true;
      } catch (error) {
        this.errorHistory.push({
          error: error as Error,
          timestamp: Date.now(),
          context: { workerId, data }
        });
        return false;
      }
    };
  }

  private createJSONSender() {
    return async (workerId: string, data: any) => {
      return await this.createMessageSender()(workerId, data);
    };
  }

  private createBinarySender() {
    return async (workerId: string, data: ArrayBuffer | Uint8Array) => {
      const transferables = data instanceof ArrayBuffer ? [data] : [];
      return await this.createMessageSender()(workerId, data, transferables);
    };
  }

  private createBroadcaster() {
    return async (data: any, transferables?: Transferable[]) => {
      const results = [];
      for (const workerId of this.workers.keys()) {
        const result = await this.createMessageSender()(workerId, data, transferables);
        results.push(result);
      }
      return results.every(r => r);
    };
  }

  private createMessageHistoryGetter() {
    return (workerId?: string, limit?: number) => {
      let messages = this.messageHistory;
      
      if (workerId) {
        messages = messages.filter(m => m.workerId === workerId);
      }
      
      if (limit) {
        messages = messages.slice(-limit);
      }
      
      return messages;
    };
  }

  private createMessageSubscriber() {
    return async (eventType: 'message' | 'error' | 'messageerror', command: any) => {
      const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const handler: WorkerEventHandler = {
        id: handlerId,
        workerId: '', // For all workers
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

  private createEventHandlerAdder() {
    return async (workerId: string, eventType: 'message' | 'error' | 'messageerror', command: any) => {
      const handlerId = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const handler: WorkerEventHandler = {
        id: handlerId,
        workerId,
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
    return (workerId?: string) => {
      if (workerId) {
        return Array.from(this.eventHandlers.values()).filter(h => h.workerId === workerId);
      }
      return Array.from(this.eventHandlers.values());
    };
  }

  private createEventEmitter() {
    return async (workerId: string, eventType: string, data?: any) => {
      // Would emit custom events to worker
      return true;
    };
  }

  private createQueueAdder() {
    return async (workerId: string, message: any) => {
      if (!this.messageQueue.has(workerId)) {
        this.messageQueue.set(workerId, []);
      }
      
      const queue = this.messageQueue.get(workerId)!;
      queue.push({
        id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workerId,
        type: 'outgoing',
        data: message,
        timestamp: Date.now(),
        format: this.detectMessageFormat(message),
      });
      
      return true;
    };
  }

  private createQueueProcessor() {
    return async (workerId: string) => {
      const queue = this.messageQueue.get(workerId);
      if (!queue || queue.length === 0) return true;

      const worker = this.workers.get(workerId);
      if (!worker || worker.state !== 'running') return false;

      try {
        for (const message of queue) {
          worker.worker.postMessage(message.data);
          this.messageHistory.push(message);
        }
        
        queue.length = 0; // Clear queue
        return true;
      } catch (error) {
        this.errorHistory.push({
          error: error as Error,
          timestamp: Date.now(),
          context: { workerId, queueSize: queue.length }
        });
        return false;
      }
    };
  }

  private createQueueSizeGetter() {
    return (workerId: string) => {
      const queue = this.messageQueue.get(workerId);
      return queue ? queue.length : 0;
    };
  }

  private createPendingGetter() {
    return (workerId: string) => {
      const queue = this.messageQueue.get(workerId);
      return queue ? queue.slice() : [];
    };
  }

  private createQueueClearer() {
    return (workerId: string) => {
      const queue = this.messageQueue.get(workerId);
      if (queue) {
        queue.length = 0;
        return true;
      }
      return false;
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

  private trackPerformance(startTime: number, success: boolean, output?: EnhancedWebWorkerOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as EnhancedWebWorkerInput, // Would store actual input in real implementation
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
      totalWorkers: this.workers.size,
      totalMessages: this.messageHistory.length,
      totalErrors: this.errorHistory.length,
      totalEventHandlers: this.eventHandlers.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0)
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createWebWorkerFeature(): TypedWebWorkerFeatureImplementation {
  return new TypedWebWorkerFeatureImplementation();
}

export async function createEnhancedWebWorker(
  worker: Partial<EnhancedWebWorkerInput['worker']>,
  options?: Partial<EnhancedWebWorkerInput>
): Promise<EvaluationResult<EnhancedWebWorkerOutput>> {
  const webworkerFeature = new TypedWebWorkerFeatureImplementation();
  return webworkerFeature.initialize({
    worker: {
      script: '',
      type: 'classic',
      credentials: 'same-origin',
      inline: false,
      ...worker
    },
    messaging: {
      format: 'json',
      serialization: 'structured-clone',
      transferables: [],
      validation: { enabled: true },
      queue: { enabled: true, maxSize: 100, persistence: false },
    },
    eventHandlers: [],
    context: {
      variables: {},
    },
    options: {
      enableAutoStart: true,
      enableMessageQueue: true,
      enableErrorHandling: true,
      maxWorkers: 4,
      workerTimeout: 30000,
      terminationTimeout: 5000,
    },
    environment: 'frontend',
    debug: false,
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedWebWorkerImplementation = new TypedWebWorkerFeatureImplementation();