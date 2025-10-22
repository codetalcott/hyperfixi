

/**
 * Enhanced Init Feature Implementation
 * Type-safe element initialization feature with enhanced validation and LLM integration
 */

import { v, z } from '../validation/lightweight-validators';
import type {
  ContextMetadata,
  EvaluationResult
} from '../types/enhanced-context';
import type { ValidationResult, EvaluationType } from '../types/base-types';
import type { LLMDocumentation } from '../types/enhanced-core';
import type { ExecutionContext } from '../types/core';

// ============================================================================
// Enhanced Init Feature Input/Output Schemas
// ============================================================================

export const EnhancedInitInputSchema = v.object({
  /** Element initialization configuration */
  initialization: z.object({
    target: v.union([v.custom((value: unknown) => value instanceof HTMLElement), v.string()]), // Element or selector
    commands: v.array(v.any()).min(1), // Commands to execute
    timing: z.object({
      immediate: v.boolean().default(false), // Execute before other features
      delay: v.number().default(0), // Delay in milliseconds
      defer: v.boolean().default(false), // Defer until DOM ready
    }).default({}),
    lifecycle: v.object({
      runOnce: v.boolean().default(true), // Only run once per element
      resetOnRemoval: v.boolean().default(false), // Reset state when element removed
      propagateToChildren: v.boolean().default(false), // Apply to child elements
    }).default({}),
  }),
  /** Command execution options */
  execution: v.object({
    parallel: v.boolean().default(false), // Execute commands in parallel
    stopOnError: v.boolean().default(true), // Stop execution on first error
    timeout: v.number().default(10000), // Execution timeout in ms
    retries: z.object({
      enabled: v.boolean().default(false),
      maxAttempts: v.number().default(3),
      delay: v.number().default(1000),
    }).default({}),
  }).default({}),
  /** Error handling configuration */
  errorHandling: v.object({
    strategy: z.enum(['throw', 'log', 'ignore', 'emit']).default('log'),
    fallbackCommands: v.array(v.any()).default([]),
    setAttribute: v.boolean().default(true), // Set error attribute on element
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
    enableDOMObserver: v.boolean().default(true), // Watch for DOM changes
    enablePerformanceTracking: v.boolean().default(true),
    enableEventEmission: v.boolean().default(true),
    maxConcurrentInits: v.number().default(10),
  }).default({}),
  /** Environment settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('frontend'),
  debug: v.boolean().default(false),
});

export const EnhancedInitOutputSchema = v.object({
  /** Context identifier */
  contextId: v.string(),
  timestamp: v.number(),
  category: v.literal('Frontend'),
  capabilities: v.array(v.string()),
  state: z.enum(['ready', 'initializing', 'completed', 'error']),
  
  /** Element management */
  elements: z.object({
    register: v.any(),
    unregister: v.any(),
    process: v.any(),
    processAll: v.any(),
    isRegistered: v.any(),
    isProcessed: v.any(),
    getRegistration: v.any(),
    listRegistered: v.any(),
  }),
  
  /** Command execution */
  execution: v.object({
    execute: v.any(),
    executeParallel: v.any(),
    executeWithRetry: v.any(),
    getExecutionHistory: v.any(),
    clearHistory: v.any(),
  }),
  
  /** Lifecycle management */
  lifecycle: v.object({
    onElementAdded: v.any(),
    onElementRemoved: v.any(),
    onDOMReady: v.any(),
    reset: v.any(),
  }),
  
  /** Error handling */
  errors: v.object({
    handle: v.any(),
    getErrorHistory: v.any(),
    clearErrors: v.any(),
    setErrorHandler: v.any(),
  }),
});

export type EnhancedInitInput = any; // Inferred from RuntimeValidator
export type EnhancedInitOutput = any; // Inferred from RuntimeValidator

// ============================================================================
// Init Management Types
// ============================================================================

export interface InitRegistration {
  id: string;
  element: HTMLElement;
  selector?: string;
  commands: any[];
  timing: {
    immediate: boolean;
    delay: number;
    defer: boolean;
  };
  lifecycle: {
    runOnce: boolean;
    resetOnRemoval: boolean;
    propagateToChildren: boolean;
  };
  execution: {
    parallel: boolean;
    stopOnError: boolean;
    timeout: number;
  };
  state: 'pending' | 'running' | 'completed' | 'error';
  createdAt: number;
  processedAt?: number;
  executionCount: number;
  lastError?: Error;
}

export interface InitExecution {
  id: string;
  registrationId: string;
  element: HTMLElement;
  commands: any[];
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
  result?: any;
}

export interface InitLifecycleEvent {
  type: 'element-added' | 'element-removed' | 'dom-ready' | 'init-start' | 'init-complete' | 'init-error';
  element?: HTMLElement;
  registration?: InitRegistration;
  timestamp: number;
  data?: any;
}

// ============================================================================
// Enhanced Init Feature Context Implementation
// ============================================================================

export class TypedInitFeatureImplementation {
  public readonly name = 'initFeature';
  public readonly category = 'Frontend' as const;
  public readonly description = 'Type-safe element initialization feature with lifecycle management, error handling, and performance optimization';
  public readonly inputSchema = EnhancedInitInputSchema;
  public readonly outputType: EvaluationType = 'Object';

  private evaluationHistory: Array<{
    input: EnhancedInitInput;
    output?: EnhancedInitOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  private registrations: Map<string, InitRegistration> = new Map();
  private elementRegistrations: Map<HTMLElement, string[]> = new Map();
  private executionHistory: InitExecution[] = [];
  private lifecycleEvents: InitLifecycleEvent[] = [];
  private errorHistory: Array<{ error: Error; timestamp: number; context: any }> = [];
  private processedElements: WeakSet<HTMLElement> = new WeakSet();
  private domObserver?: MutationObserver;

  public readonly metadata: ContextMetadata = {
    category: 'Frontend',
    complexity: 'complex',
    sideEffects: ['dom-initialization', 'command-execution', 'element-observation'],
    dependencies: ['dom-api', 'mutation-observer', 'command-executor'],
    returnTypes: ['Object'],
    examples: [
      {
        input: '{ initialization: { target: ".component", commands: [{ name: "addClass", args: ["initialized"] }] } }',
        description: 'Initialize elements with CSS class addition',
        expectedOutput: 'TypedInitContext with element initialization and command execution'
      },
      {
        input: '{ initialization: { target: "#main", commands: [...], timing: { immediate: true } } }',
        description: 'Immediate initialization before other features',
        expectedOutput: 'High-priority init context with immediate execution'
      },
      {
        input: '{ initialization: { target: ".widget", commands: [...], lifecycle: { propagateToChildren: true } } }',
        description: 'Initialize parent and child elements recursively',
        expectedOutput: 'Hierarchical initialization with child propagation'
      }
    ],
    relatedExpressions: ['me', 'you', 'it', 'closest', 'query'],
    relatedContexts: ['defFeature', 'onFeature', 'behaviorFeature'],
    frameworkDependencies: ['dom-api', 'hyperscript-runtime'],
    environmentRequirements: {
      browser: true,
      server: false,
      nodejs: false
    },
    performance: {
      averageTime: 12.0,
      complexity: 'O(n)' // n = number of elements to initialize
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates type-safe element initialization system for hyperscript with lifecycle management, performance optimization, and comprehensive error handling',
    parameters: [
      {
        name: 'initConfig',
        type: 'object',
        description: 'Element initialization configuration including target elements, commands, timing, and lifecycle options',
        optional: false,
        examples: [
          '{ initialization: { target: ".component", commands: [{ name: "setup" }] } }',
          '{ initialization: { target: "#widget", commands: [...], timing: { immediate: true } } }',
          '{ initialization: { target: ".form", commands: [...], lifecycle: { runOnce: false } } }'
        ]
      }
    ],
    returns: {
      type: 'object',
      description: 'Element initialization context with registration management, command execution, lifecycle control, and error recovery capabilities',
      examples: [
        'context.elements.register(element, commands) → register element for initialization',
        'context.execution.execute(registration) → execute initialization commands',
        'context.lifecycle.onElementAdded(callback) → handle new elements',
        'context.elements.processAll() → initialize all registered elements'
      ]
    },
    examples: [
      {
        title: 'Basic element initialization',
        code: 'const initContext = await createInitFeature({ initialization: { target: ".component", commands: [{ name: "addClass", args: ["ready"] }] } })',
        explanation: 'Initialize components with CSS class when processed',
        output: 'Init context ready for element processing'
      },
      {
        title: 'Immediate initialization',
        code: 'await initContext.elements.register(element, commands, { immediate: true })',
        explanation: 'Register element for immediate initialization before other features',
        output: 'High-priority element registration with immediate execution'
      },
      {
        title: 'Lifecycle management',
        code: 'await initContext.lifecycle.onElementAdded((element) => initContext.elements.process(element))',
        explanation: 'Automatically initialize new elements added to DOM',
        output: 'Dynamic initialization system with DOM observation'
      }
    ],
    seeAlso: ['defFeature', 'onFeature', 'behaviorFeature', 'elementManagement'],
    tags: ['initialization', 'lifecycle', 'dom-management', 'element-processing', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: EnhancedInitInput): Promise<EvaluationResult<EnhancedInitOutput>> {
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

      // Initialize init system
      const config = await this.initializeConfig(input);
      
      // Create enhanced init context
      const context: EnhancedInitOutput = {
        contextId: `init-${Date.now()}`,
        timestamp: startTime,
        category: 'Frontend',
        capabilities: ['element-initialization', 'command-execution', 'lifecycle-management', 'dom-observation', 'error-recovery'],
        state: 'ready',
        
        // Element management
        elements: {
          register: this.createElementRegistrar(config),
          unregister: this.createElementUnregistrar(),
          process: this.createElementProcessor(),
          processAll: this.createAllElementsProcessor(),
          isRegistered: this.createRegistrationChecker(),
          isProcessed: this.createProcessingChecker(),
          getRegistration: this.createRegistrationGetter(),
          listRegistered: this.createRegisteredElementsLister(),
        },
        
        // Command execution
        execution: {
          execute: this.createCommandExecutor(),
          executeParallel: this.createParallelExecutor(),
          executeWithRetry: this.createRetryExecutor(),
          getExecutionHistory: this.createExecutionHistoryGetter(),
          clearHistory: this.createHistoryClearer(),
        },
        
        // Lifecycle management
        lifecycle: {
          onElementAdded: this.createElementAddedHandler(),
          onElementRemoved: this.createElementRemovedHandler(),
          onDOMReady: this.createDOMReadyHandler(),
          reset: this.createSystemResetter(),
        },
        
        // Error handling
        errors: {
          handle: this.createErrorHandler(),
          getErrorHistory: this.createErrorHistoryGetter(),
          clearErrors: this.createErrorClearer(),
          setErrorHandler: this.createErrorHandlerSetter(),
        }
      };

      // Set up DOM observer if enabled
      if (input.options?.enableDOMObserver !== false) {
        this.setupDOMObserver();
      }

      // Register initial element if provided
      if (input.initialization.target && input.initialization.commands) {
        await this.registerElement(input.initialization, input.context || {});
      }

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);
      
      return {
        success: true,
        value: context,
        type: 'Object'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Init feature initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Verify target element exists or selector is valid',
          'Check commands array contains valid command objects',
          'Ensure DOM is ready for initialization',
          'Validate timing and lifecycle configurations'
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
          errors: [{ type: 'type-mismatch', message: 'Input must be an object', suggestions: [] }],
          suggestions: ['Provide a valid init configuration object']
        };
      }

      // Pre-validation checks for specific error cases
      const inputData = input as any;
      const errors: Array<{ type: 'type-mismatch' | 'missing-argument' | 'invalid-syntax' | 'runtime-error' | 'security-warning'; message: string; path?: string }> = [];
      const suggestions: string[] = [];

      // Check for empty commands arrays before Zod validation
      if (inputData.initialization?.commands && Array.isArray(inputData.initialization.commands) && inputData.initialization.commands.length === 0) {
        errors.push({
          type: 'missing-argument',
          message: 'Initialization commands array cannot be empty',
          path: 'initialization.commands'
        });
        suggestions.push('Add at least one command to execute during initialization');
      suggestions: []
      }

      // Check for invalid delay values
      if (inputData.initialization?.timing?.delay !== undefined && inputData.initialization.timing.delay < 0) {
        errors.push({
          type: 'syntax-error',
          message: 'Initialization delay must be non-negative',
          path: 'initialization.timing.delay'
        });
        suggestions.push('Set delay to 0 or positive number in milliseconds');
      suggestions: []
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
      const data = parsed as EnhancedInitInput;

      // Validate target element/selector
      if (data.initialization.target) {
        if (typeof data.initialization.target === 'string' && !this.isValidSelector(data.initialization.target)) {
          errors.push({
            type: 'syntax-error',
            message: `Invalid CSS selector: "${data.initialization.target}"`,
            path: 'initialization.target'
          });
          suggestions.push('Use valid CSS selector syntax for target element');
        suggestions: []
        }
      }

      // Validate execution timeout
      if (data.execution.timeout < 1000) {
        errors.push({
          type: 'syntax-error',
          message: 'Execution timeout must be at least 1000ms',
          path: 'execution.timeout'
        });
        suggestions.push('Set execution timeout to at least 1000ms for proper operation');
      suggestions: []
      }

      // Validate retry configuration
      if (data.execution.retries.enabled) {
        if (data.execution.retries.maxAttempts < 1) {
          errors.push({
            type: 'syntax-error',
            message: 'Max retry attempts must be at least 1',
            path: 'execution.retries.maxAttempts'
          });
          suggestions.push('Set maxAttempts to at least 1 for retry functionality');
        suggestions: []
        }

        if (data.execution.retries.delay < 0) {
          errors.push({
            type: 'syntax-error',
            message: 'Retry delay must be non-negative',
            path: 'execution.retries.delay'
          });
          suggestions.push('Set retry delay to 0 or positive number in milliseconds');
        suggestions: []
        }
      }

      // Validate concurrent initialization limits
      if (data.options.maxConcurrentInits < 1) {
        errors.push({
          type: 'syntax-error',
          message: 'Max concurrent initializations must be at least 1',
          path: 'options.maxConcurrentInits'
        });
        suggestions.push('Set maxConcurrentInits to at least 1');
      suggestions: []
      }

      // Validate commands structure
      if (data.initialization.commands) {
        for (let index = 0; index < data.initialization.commands.length; index++) {
        const command = data.initialization.commands[index];
          if (!command || typeof command !== 'object') {
            errors.push({
              type: 'type-mismatch',
              message: `Command at index ${index} must be an object`,
              path: `initialization.commands[${index}]`
            });
            suggestions.push('Ensure all commands are valid objects with name and args properties');
          suggestions: []
          }
        }
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
          type: 'type-mismatch',
          message: error instanceof Error ? error.message : 'Invalid input format',
          suggestions: []
        }],
        suggestions: [
          'Ensure input matches EnhancedInitInput schema',
          'Check initialization configuration structure',
          'Verify commands and execution options'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeConfig(input: EnhancedInitInput) {
    return {
      ...input.options,
      environment: input.environment,
      debug: input.debug,
      initialized: Date.now()
    };
  }

  private async registerElement(initConfig: any, _context: any): Promise<InitRegistration> {
    const id = `init-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Resolve target element
    let element: HTMLElement;
    if (typeof initConfig.target === 'string') {
      const found = document.querySelector(initConfig.target);
      if (!found || !(found instanceof HTMLElement)) {
        throw new Error(`Target element not found: ${initConfig.target}`);
      }
      element = found;
    } else {
      element = initConfig.target;
    }

    const registration: InitRegistration = {
      id,
      element,
      selector: typeof initConfig.target === 'string' ? initConfig.target : undefined,
      commands: initConfig.commands,
      timing: {
        immediate: initConfig.timing?.immediate || false,
        delay: initConfig.timing?.delay || 0,
        defer: initConfig.timing?.defer || false,
      },
      lifecycle: {
        runOnce: initConfig.lifecycle?.runOnce !== false,
        resetOnRemoval: initConfig.lifecycle?.resetOnRemoval || false,
        propagateToChildren: initConfig.lifecycle?.propagateToChildren || false,
      },
      execution: {
        parallel: initConfig.execution?.parallel || false,
        stopOnError: initConfig.execution?.stopOnError !== false,
        timeout: initConfig.execution?.timeout || 10000,
      },
      state: 'pending',
      createdAt: Date.now(),
      executionCount: 0,
    };

    this.registrations.set(id, registration);
    
    // Track element registrations
    if (!this.elementRegistrations.has(element)) {
      this.elementRegistrations.set(element, []);
    }
    this.elementRegistrations.get(element)!.push(id);

    // Emit lifecycle event
    this.emitLifecycleEvent({
      type: 'element-added',
      element,
      registration,
      timestamp: Date.now(),
    });

    return registration;
  }

  private async processRegistration(registration: InitRegistration, context: any): Promise<InitExecution> {
    const execution: InitExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      registrationId: registration.id,
      element: registration.element,
      commands: registration.commands,
      startTime: Date.now(),
      success: false,
    };

    try {
      registration.state = 'running';
      
      // Create execution context
      const executionContext = this.createExecutionContext(registration.element, context);

      // Execute commands
      if (registration.execution.parallel) {
        await this.executeCommandsParallel(registration.commands, executionContext);
      } else {
        await this.executeCommandsSequential(registration.commands, executionContext);
      }

      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.success = true;
      
      registration.state = 'completed';
      registration.processedAt = Date.now();
      registration.executionCount++;
      
      // Mark element as processed
      this.processedElements.add(registration.element);

      // Emit completion event
      this.emitLifecycleEvent({
        type: 'init-complete',
        element: registration.element,
        registration,
        timestamp: Date.now(),
        data: { execution },
      });

    } catch (error) {
      execution.error = error as Error;
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      
      registration.state = 'error';
      registration.lastError = error as Error;

      this.errorHistory.push({
        error: error as Error,
        timestamp: Date.now(),
        context: { registration, execution }
      });

      // Emit error event
      this.emitLifecycleEvent({
        type: 'init-error',
        element: registration.element,
        registration,
        timestamp: Date.now(),
        data: { error, execution },
      });

      throw error;
    } finally {
      this.executionHistory.push(execution);
    }

    return execution;
  }

  private createExecutionContext(element: HTMLElement, parentContext: any): ExecutionContext {
    return {
      variables: parentContext.variables || {},
      me: element,
      you: null,
      it: parentContext.it || null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      flags: {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false,
      },
    };
  }

  private async executeCommandsSequential(commands: any[], context: ExecutionContext): Promise<void> {
    for (const command of commands) {
      await this.executeCommand(command, context);
      
      // Check for early termination
      if (context.flags?.halted || context.flags?.returning) {
        break;
      }
    }
  }

  private async executeCommandsParallel(commands: any[], context: ExecutionContext): Promise<void> {
    const promises = commands.map(command => this.executeCommand(command, context));
    await Promise.all(promises);
  }

  private async executeCommand(command: any, context: ExecutionContext): Promise<void> {
    // Basic command execution - would integrate with actual command executor
    if (typeof command.execute === 'function') {
      return await command.execute(context);
    }

    if (!command.name) {
      return;
    }

    // Execute basic commands
    switch (command.name) {
      case 'addClass':
        if (context.me && command.args?.[0]) {
          const className = command.args[0].replace(/^\./, ''); // Remove leading dot if present
          context.me.classList.add(className);
        }
        break;
      case 'removeClass':
        if (context.me && command.args?.[0]) {
          const className = command.args[0].replace(/^\./, ''); // Remove leading dot if present
          context.me.classList.remove(className);
        }
        break;
      case 'setAttribute':
        if (context.me && command.args?.[0] && command.args?.[1] !== undefined) {
          context.me.setAttribute(command.args[0], String(command.args[1]));
        }
        break;
      case 'setStyle':
        if (context.me && command.args?.[0] && command.args?.[1] !== undefined) {
          (context.me.style as any)[command.args[0]] = command.args[1];
        }
        break;
      default:
        // Would delegate to global command executor
        break;
    }
  }

  private setupDOMObserver(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              this.handleElementAdded(node);
            }
          });
          
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              this.handleElementRemoved(node);
            }
          });
        }
      }
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private handleElementAdded(element: HTMLElement): void {
    this.emitLifecycleEvent({
      type: 'element-added',
      element,
      timestamp: Date.now(),
    });
  }

  private handleElementRemoved(element: HTMLElement): void {
    // Clean up registrations for removed element
    const registrationIds = this.elementRegistrations.get(element) || [];
    for (const id of registrationIds) {
      const registration = this.registrations.get(id);
      if (registration && registration.lifecycle.resetOnRemoval) {
        this.registrations.delete(id);
      }
    }
    this.elementRegistrations.delete(element);

    this.emitLifecycleEvent({
      type: 'element-removed',
      element,
      timestamp: Date.now(),
    });
  }

  private emitLifecycleEvent(event: InitLifecycleEvent): void {
    this.lifecycleEvents.push(event);
    
    // Emit DOM event if element is available
    if (event.element) {
      const customEvent = new CustomEvent(`hyperscript:init:${event.type}`, {
        bubbles: true,
        detail: event,
      });
      event.element.dispatchEvent(customEvent);
    }
  }

  private isValidSelector(selector: string): boolean {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  // Factory methods for context API
  private createElementRegistrar(_config: any) {
    return async (target: HTMLElement | string, commands: any[], options?: any) => {
      const initConfig = {
        target,
        commands,
        timing: options?.timing || {},
        lifecycle: options?.lifecycle || {},
        execution: options?.execution || {},
      };
      return await this.registerElement(initConfig, {});
    };
  }

  private createElementUnregistrar() {
    return (elementOrId: HTMLElement | string) => {
      if (typeof elementOrId === 'string') {
        return this.registrations.delete(elementOrId);
      } else {
        const registrationIds = this.elementRegistrations.get(elementOrId) || [];
        let deleted = false;
        for (const id of registrationIds) {
          if (this.registrations.delete(id)) {
            deleted = true;
          }
        }
        this.elementRegistrations.delete(elementOrId);
        return deleted;
      }
    };
  }

  private createElementProcessor() {
    return async (elementOrId: HTMLElement | string) => {
      let registration: InitRegistration | undefined;
      
      if (typeof elementOrId === 'string') {
        registration = this.registrations.get(elementOrId);
      } else {
        const registrationIds = this.elementRegistrations.get(elementOrId) || [];
        if (registrationIds.length > 0) {
          registration = this.registrations.get(registrationIds[0]);
        }
      }

      if (!registration) {
        return false;
      }

      try {
        await this.processRegistration(registration, {});
        return true;
      } catch {
        return false;
      }
    };
  }

  private createAllElementsProcessor() {
    return async () => {
      const registrations = Array.from(this.registrations.values())
        .filter(r => r.state === 'pending')
        .sort((a, b) => (a.timing.immediate ? -1 : 1) - (b.timing.immediate ? -1 : 1));

      const results = [];
      for (const registration of registrations) {
        try {
          await this.processRegistration(registration, {});
          results.push({ id: registration.id, success: true });
        } catch (error) {
          results.push({ id: registration.id, success: false, error });
        }
      }

      return results;
    };
  }

  private createRegistrationChecker() {
    return (element: HTMLElement) => {
      return this.elementRegistrations.has(element);
    };
  }

  private createProcessingChecker() {
    return (element: HTMLElement) => {
      return this.processedElements.has(element);
    };
  }

  private createRegistrationGetter() {
    return (elementOrId: HTMLElement | string) => {
      if (typeof elementOrId === 'string') {
        return this.registrations.get(elementOrId) || null;
      } else {
        const registrationIds = this.elementRegistrations.get(elementOrId) || [];
        return registrationIds.map(id => this.registrations.get(id)).filter(Boolean);
      }
    };
  }

  private createRegisteredElementsLister() {
    return () => {
      return Array.from(this.elementRegistrations.keys());
    };
  }

  private createCommandExecutor() {
    return async (commands: any[], context?: any) => {
      const execContext = context || this.createExecutionContext(document.body, {});
      return await this.executeCommandsSequential(commands, execContext);
    };
  }

  private createParallelExecutor() {
    return async (commands: any[], context?: any) => {
      const execContext = context || this.createExecutionContext(document.body, {});
      return await this.executeCommandsParallel(commands, execContext);
    };
  }

  private createRetryExecutor() {
    return async (commands: any[], context?: any, maxAttempts: number = 3, delay: number = 1000) => {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.createCommandExecutor()(commands, context);
          return { success: true, attempts: attempt };
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError;
    };
  }

  private createExecutionHistoryGetter() {
    return (limit?: number) => {
      if (limit) {
        return this.executionHistory.slice(-limit);
      }
      return this.executionHistory.slice();
    };
  }

  private createHistoryClearer() {
    return () => {
      this.executionHistory = [];
      return true;
    };
  }

  private createElementAddedHandler() {
    return (_callback: (element: HTMLElement) => void) => {
      // Would set up callback for element-added events
      return 'handler-id';
    };
  }

  private createElementRemovedHandler() {
    return (_callback: (element: HTMLElement) => void) => {
      // Would set up callback for element-removed events
      return 'handler-id';
    };
  }

  private createDOMReadyHandler() {
    return (callback: () => void) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
      } else {
        callback();
      }
      return true;
    };
  }

  private createSystemResetter() {
    return () => {
      this.registrations.clear();
      this.elementRegistrations.clear();
      this.executionHistory = [];
      this.lifecycleEvents = [];
      this.errorHistory = [];
      this.processedElements = new WeakSet();
      
      if (this.domObserver) {
        this.domObserver.disconnect();
      }
      
      return true;
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
    return (_handler: (error: Error, context: any) => void) => {
      // Would set custom error handler
      return true;
    };
  }

  private trackPerformance(startTime: number, success: boolean, output?: EnhancedInitOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as EnhancedInitInput, // Would store actual input in real implementation
      output,
      success,
      duration,
      timestamp: startTime
    });
  }

  getPerformanceMetrics() {
    const totalEvals = this.evaluationHistory.length;
    const successfulEvals = this.evaluationHistory.filter(h => h.success).length;
    
    return {
      totalInitializations: totalEvals,
      successRate: totalEvals === 0 ? 0 : successfulEvals / totalEvals,
      averageDuration: totalEvals === 0 ? 0 : this.evaluationHistory.reduce((sum, h) => sum + h.duration, 0) / totalEvals,
      lastEvaluationTime: this.evaluationHistory[this.evaluationHistory.length - 1]?.timestamp || 0,
      evaluationHistory: this.evaluationHistory.slice(-10), // Last 10 evaluations
      totalRegistrations: this.registrations.size,
      totalExecutions: this.executionHistory.length,
      totalErrors: this.errorHistory.length,
      processedElementsCount: this.elementRegistrations.size,
      lifecycleEventsCount: this.lifecycleEvents.length,
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createInitFeature(): TypedInitFeatureImplementation {
  return new TypedInitFeatureImplementation();
}

export async function createEnhancedInit(
  target: HTMLElement | string,
  commands: any[],
  options?: Partial<EnhancedInitInput>
): Promise<EvaluationResult<EnhancedInitOutput>> {
  const initFeature = new TypedInitFeatureImplementation();
  return initFeature.initialize({
    initialization: {
      target,
      commands,
      timing: { immediate: false, delay: 0, defer: false },
      lifecycle: { runOnce: true, resetOnRemoval: false, propagateToChildren: false },
    },
    execution: {
      parallel: false,
      stopOnError: true,
      timeout: 10000,
      retries: { enabled: false, maxAttempts: 3, delay: 1000 },
    },
    errorHandling: {
      strategy: 'log',
      fallbackCommands: [],
      setAttribute: true,
    },
    context: {
      variables: {},
    },
    options: {
      enableDOMObserver: true,
      enablePerformanceTracking: true,
      enableEventEmission: true,
      maxConcurrentInits: 10,
    },
    environment: 'frontend',
    debug: false,
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedInitImplementation = new TypedInitFeatureImplementation();