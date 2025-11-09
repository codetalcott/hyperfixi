/**
 * Unified Command System for HyperFixi
 * Consolidates all enhanced commands with async execution,
 * context management, and comprehensive error handling
 */

import type { TypedExecutionContext } from '../types/core';

// Import all enhanced commands
import { createAllEnhancedCommands } from './command-registry';

// Create the command registry
const enhancedCommandRegistry = createAllEnhancedCommands();

// Import performance profiler
import { performanceProfiler } from './command-performance-profiler';

/**
 * Command execution options for advanced control
 */
export interface CommandExecutionOptions {
  async?: boolean; // Execute command asynchronously
  timeout?: number; // Execution timeout in milliseconds
  retryCount?: number; // Number of retry attempts on failure
  retryDelay?: number; // Delay between retries in milliseconds
  onProgress?: (progress: number) => void; // Progress callback
  onError?: (error: Error) => void; // Error callback
  debug?: boolean; // Enable debug logging
  trace?: boolean; // Enable execution tracing
  profile?: boolean; // Enable performance profiling
}

/**
 * Command execution result with comprehensive metadata
 */
export interface CommandExecutionResult<T = any> {
  success: boolean;
  value?: T;
  error?: Error;
  executionTime: number;
  retryCount?: number;
  context: {
    commandName: string;
    args: any[];
    timestamp: number;
    traceId?: string;
  };
}

/**
 * Command context manager for maintaining state across executions
 */
export class CommandContextManager {
  private contexts: Map<string, TypedExecutionContext> = new Map();
  private history: CommandExecutionResult[] = [];
  private maxHistorySize = 1000;

  /**
   * Create or get a command execution context
   */
  getContext(id: string = 'default'): TypedExecutionContext {
    if (!this.contexts.has(id)) {
      this.contexts.set(id, this.createDefaultContext());
    }
    return this.contexts.get(id)!;
  }

  /**
   * Update context after command execution
   */
  updateContext(id: string, updates: Partial<TypedExecutionContext>): void {
    const context = this.getContext(id);
    Object.assign(context, updates);
  }

  /**
   * Record command execution in history
   */
  recordExecution(result: CommandExecutionResult): void {
    this.history.push(result);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get command execution history
   */
  getHistory(limit?: number): CommandExecutionResult[] {
    return limit ? this.history.slice(-limit) : [...this.history];
  }

  /**
   * Clear a specific context or all contexts
   */
  clearContext(id?: string): void {
    if (id) {
      this.contexts.delete(id);
    } else {
      this.contexts.clear();
    }
  }

  /**
   * Create a default execution context
   */
  private createDefaultContext(): TypedExecutionContext {
    return {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      // parent is optional, omitted for default context
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
      expressionStack: [],
      evaluationDepth: 0,
      validationMode: 'strict',
      evaluationHistory: [],
    };
  }
}

/**
 * Async command executor with retry logic and timeouts
 */
export class AsyncCommandExecutor {
  private activeCommands: Map<string, AbortController> = new Map();

  /**
   * Execute a command asynchronously with advanced control
   */
  async executeAsync<T>(
    commandName: string,
    args: any[],
    context: TypedExecutionContext,
    options: CommandExecutionOptions = {}
  ): Promise<CommandExecutionResult<T>> {
    const startTime = performance.now();
    const traceId = options.trace ? this.generateTraceId() : undefined;

    if (options.debug) {
      console.log(`[Command Debug] Executing: ${commandName}`, { args, traceId });
    }

    try {
      // Execute with timeout if specified
      const result = await this.executeWithTimeout(
        () => this.executeWithRetry(commandName, args, context, options),
        options.timeout
      );

      const executionTime = performance.now() - startTime;

      return {
        success: true,
        value: result as T,
        executionTime,
        retryCount: options.retryCount || 0,
        context: {
          commandName,
          args,
          timestamp: Date.now(),
          ...(traceId !== undefined && { traceId }),
        },
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;

      if (options.onError) {
        options.onError(error as Error);
      }

      return {
        success: false,
        error: error as Error,
        executionTime,
        context: {
          commandName,
          args,
          timestamp: Date.now(),
          ...(traceId !== undefined && { traceId }),
        },
      };
    }
  }

  /**
   * Execute command with retry logic
   */
  private async executeWithRetry<T>(
    commandName: string,
    args: any[],
    context: TypedExecutionContext,
    options: CommandExecutionOptions
  ): Promise<T> {
    const maxRetries = options.retryCount || 0;
    const retryDelay = options.retryDelay || 1000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0 && options.debug) {
          console.log(`[Command Debug] Retry attempt ${attempt} for ${commandName}`);
        }

        // Get command from registry
        const command = enhancedCommandRegistry.get(commandName);
        if (!command) {
          throw new Error(`Command not found: ${commandName}`);
        }

        // Execute the command
        const result = await command.execute(args, context);

        if (options.onProgress) {
          options.onProgress(100);
        }

        return result as T;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          await this.delay(retryDelay);
        }
      }
    }

    throw lastError || new Error(`Command execution failed after ${maxRetries + 1} attempts`);
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout?: number): Promise<T> {
    if (!timeout) {
      return fn();
    }

    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Command execution timed out after ${timeout}ms`)),
          timeout
        );
      }),
    ]);
  }

  /**
   * Cancel an active command execution
   */
  cancelCommand(traceId: string): boolean {
    const controller = this.activeCommands.get(traceId);
    if (controller) {
      controller.abort();
      this.activeCommands.delete(traceId);
      return true;
    }
    return false;
  }

  /**
   * Generate unique trace ID for command execution
   */
  private generateTraceId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Enhanced error handler for command execution
 */
export class CommandErrorHandler {
  private errorHandlers: Map<string, (error: Error, context: any) => void> = new Map();
  private globalErrorHandler?: (error: Error, context: any) => void;

  /**
   * Register error handler for specific command
   */
  registerErrorHandler(commandName: string, handler: (error: Error, context: any) => void): void {
    this.errorHandlers.set(commandName, handler);
  }

  /**
   * Set global error handler
   */
  setGlobalErrorHandler(handler: (error: Error, context: any) => void): void {
    this.globalErrorHandler = handler;
  }

  /**
   * Handle command execution error
   */
  handleError(error: Error, commandName: string, context: any): void {
    // Try command-specific handler first
    const handler = this.errorHandlers.get(commandName);
    if (handler) {
      handler(error, context);
      return;
    }

    // Fall back to global handler
    if (this.globalErrorHandler) {
      this.globalErrorHandler(error, context);
      return;
    }

    // Default error handling
    console.error(`[Command Error] ${commandName}:`, error);
  }

  /**
   * Create detailed error report
   */
  createErrorReport(error: Error, result: CommandExecutionResult): string {
    return `
Command Execution Error Report
=============================
Command: ${result.context.commandName}
Timestamp: ${new Date(result.context.timestamp).toISOString()}
Execution Time: ${result.executionTime}ms
${result.context.traceId ? `Trace ID: ${result.context.traceId}` : ''}

Error Details:
${error.name}: ${error.message}

Stack Trace:
${error.stack}

Arguments:
${JSON.stringify(result.context.args, null, 2)}
    `.trim();
  }
}

/**
 * Command debugging utilities
 */
export class CommandDebugger {
  private breakpoints: Set<string> = new Set();
  private watchedCommands: Set<string> = new Set();
  private stepMode = false;

  /**
   * Set breakpoint on command
   */
  setBreakpoint(commandName: string): void {
    this.breakpoints.add(commandName);
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(commandName: string): void {
    this.breakpoints.delete(commandName);
  }

  /**
   * Watch command execution
   */
  watchCommand(commandName: string): void {
    this.watchedCommands.add(commandName);
  }

  /**
   * Enable/disable step mode
   */
  setStepMode(enabled: boolean): void {
    this.stepMode = enabled;
  }

  /**
   * Check if should break on command
   */
  shouldBreak(commandName: string): boolean {
    return this.breakpoints.has(commandName) || this.stepMode;
  }

  /**
   * Log command execution if watched
   */
  logIfWatched(commandName: string, phase: 'start' | 'end' | 'error', data: any): void {
    if (this.watchedCommands.has(commandName)) {
      console.log(`[Command Watch] ${commandName} - ${phase}:`, data);
    }
  }
}

/**
 * Main Unified Command System
 */
export class UnifiedCommandSystem {
  private contextManager = new CommandContextManager();
  private asyncExecutor = new AsyncCommandExecutor();
  private errorHandler = new CommandErrorHandler();
  private debugger = new CommandDebugger();

  /**
   * Execute a command with full feature support
   */
  async execute<T = any>(
    commandName: string,
    args: any[] = [],
    options: CommandExecutionOptions & { contextId?: string } = {}
  ): Promise<CommandExecutionResult<T>> {
    const context = this.contextManager.getContext(options.contextId);

    // Start performance profiling if enabled
    let profileId = '';
    if (options.profile) {
      profileId = performanceProfiler.startProfiling(commandName, args, context);
    }

    // Debug support
    if (this.debugger.shouldBreak(commandName)) {
      debugger; // Actual debugger breakpoint
    }

    this.debugger.logIfWatched(commandName, 'start', { args, context });

    try {
      // Execute the command
      const result = await this.asyncExecutor.executeAsync<T>(commandName, args, context, options);

      // End performance profiling
      if (options.profile && profileId) {
        performanceProfiler.endProfiling(profileId, result);
      }

      // Record in history
      this.contextManager.recordExecution(result);

      // Update context with result
      if (result.success && result.value !== undefined) {
        this.contextManager.updateContext(options.contextId || 'default', {
          result: result.value,
        });
      }

      this.debugger.logIfWatched(commandName, 'end', result);

      return result;
    } catch (error) {
      this.debugger.logIfWatched(commandName, 'error', error);

      const result: CommandExecutionResult<T> = {
        success: false,
        error: error as Error,
        executionTime: 0,
        context: {
          commandName,
          args,
          timestamp: Date.now(),
        },
      };

      // End performance profiling for errors too
      if (options.profile && profileId) {
        performanceProfiler.endProfiling(profileId, result);
      }

      this.errorHandler.handleError(error as Error, commandName, context);
      this.contextManager.recordExecution(result);

      return result;
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence(
    commands: Array<{ name: string; args: any[] }>,
    options: CommandExecutionOptions & { contextId?: string } = {}
  ): Promise<CommandExecutionResult[]> {
    const results: CommandExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.execute(command.name, command.args, options);
      results.push(result);

      // Stop on error unless specified otherwise
      if (!result.success && !options.onError) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple commands in parallel
   */
  async executeParallel(
    commands: Array<{ name: string; args: any[] }>,
    options: CommandExecutionOptions & { contextId?: string } = {}
  ): Promise<CommandExecutionResult[]> {
    const promises = commands.map(command => this.execute(command.name, command.args, options));

    return Promise.all(promises);
  }

  /**
   * Get command execution history
   */
  getHistory(limit?: number): CommandExecutionResult[] {
    return this.contextManager.getHistory(limit);
  }

  /**
   * Get or set context
   */
  getContext(id?: string): TypedExecutionContext {
    return this.contextManager.getContext(id);
  }

  /**
   * Clear context
   */
  clearContext(id?: string): void {
    this.contextManager.clearContext(id);
  }

  /**
   * Register error handler
   */
  onError(
    commandName: string | ((error: Error, context: any) => void),
    handler?: (error: Error, context: any) => void
  ): void {
    if (typeof commandName === 'string' && handler) {
      this.errorHandler.registerErrorHandler(commandName, handler);
    } else if (typeof commandName === 'function') {
      this.errorHandler.setGlobalErrorHandler(commandName);
    }
  }

  /**
   * Debug utilities
   */
  debug = {
    setBreakpoint: (cmd: string) => this.debugger.setBreakpoint(cmd),
    removeBreakpoint: (cmd: string) => this.debugger.removeBreakpoint(cmd),
    watch: (cmd: string) => this.debugger.watchCommand(cmd),
    stepMode: (enabled: boolean) => this.debugger.setStepMode(enabled),
  };

  /**
   * Performance monitoring utilities
   */
  performance = {
    enable: () => performanceProfiler.enable(),
    disable: () => performanceProfiler.disable(),
    getStats: (commandName?: string) =>
      commandName ? performanceProfiler.getStats(commandName) : performanceProfiler.getAllStats(),
    identifyBottlenecks: () => performanceProfiler.identifyBottlenecks(),
    generateOptimizations: () => performanceProfiler.generateOptimizations(),
    generateReport: () => performanceProfiler.generateReport(),
    clearMetrics: () => performanceProfiler.clearMetrics(),
    enableAutoReporting: (interval?: number) => performanceProfiler.enableAutoReporting(interval),
    exportMetrics: () => performanceProfiler.exportMetrics(),
    importMetrics: (metrics: any) => performanceProfiler.importMetrics(metrics),
  };
}

// Export singleton instance
export const commandSystem = new UnifiedCommandSystem();

// Note: CommandContextManager, AsyncCommandExecutor, CommandErrorHandler, and CommandDebugger
// are already exported via 'export class' declarations above
