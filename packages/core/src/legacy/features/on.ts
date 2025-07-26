/**
 * "On" Feature System for Hyperscript Event Handling
 * Handles event binding syntax like "on click", "on submit", etc.
 */

import type { ExecutionContext } from '../types/core';
import type { HyperscriptEventManager } from '../core/events';
import { createEventManager, registerEventListener, unregisterEventListener } from '../core/events';

// AST node type for commands (simplified for the feature system)
interface ASTCommandNode {
  type: 'command';
  name: string;
  args: ASTNode[];
}

interface ASTNode {
  type: string;
  name?: string;
  value?: any;
  [key: string]: any;
}

/**
 * OnFeature class for handling "on" event syntax
 */
export class OnFeature {
  private eventManager: HyperscriptEventManager;
  private registeredListeners: Map<string, {
    element: HTMLElement;
    eventType: string;
    commands: ASTCommandNode[];
    context: ExecutionContext;
  }>;

  constructor(eventManager?: HyperscriptEventManager) {
    this.eventManager = eventManager || createEventManager();
    this.registeredListeners = new Map();
  }

  /**
   * Register an event listener for hyperscript "on" syntax
   */
  register(
    element: HTMLElement,
    eventType: string,
    commands: ASTCommandNode[],
    context: ExecutionContext,
    options?: AddEventListenerOptions & { delegated?: boolean }
  ): string {
    const handler = this.createEventHandler(commands, context);
    
    const listenerId = registerEventListener(
      this.eventManager,
      element,
      eventType,
      handler,
      options
    );

    // Store listener info for potential unregistration
    this.registeredListeners.set(listenerId, {
      element,
      eventType,
      commands,
      context,
    });

    return listenerId;
  }

  /**
   * Unregister an event listener
   */
  unregister(listenerId: string): boolean {
    const success = unregisterEventListener(this.eventManager, listenerId);
    
    if (success) {
      this.registeredListeners.delete(listenerId);
    }
    
    return success;
  }

  /**
   * Handle event execution (for direct invocation)
   */
  async handleEvent(
    event: Event,
    commands: ASTCommandNode[],
    context: ExecutionContext
  ): Promise<void> {
    const eventContext = this.createEventContext(event, context);
    await this.executeCommands(commands, eventContext);
  }

  /**
   * Create an event handler function that executes hyperscript commands
   */
  private createEventHandler(
    commands: ASTCommandNode[],
    baseContext: ExecutionContext
  ): EventListener {
    return async (event: Event) => {
      try {
        const eventContext = this.createEventContext(event, baseContext);
        await this.executeCommands(commands, eventContext);
      } catch (error) {
        this.handleError(event.target as HTMLElement, error as Error, commands);
      }
    };
  }

  /**
   * Create execution context with event-specific variables
   */
  private createEventContext(event: Event, baseContext: ExecutionContext): ExecutionContext {
    const eventContext: ExecutionContext = {
      ...baseContext,
      locals: new Map(baseContext.locals),
      globals: new Map(baseContext.globals),
    };

    // Add event-specific context variables
    eventContext.locals.set('event', event);
    eventContext.locals.set('target', event.target);
    eventContext.locals.set('currentTarget', event.currentTarget);
    
    // Update 'it' to point to the event target for convenience
    eventContext.it = event.target as any;

    return eventContext;
  }

  /**
   * Execute a sequence of hyperscript commands
   */
  private async executeCommands(
    commands: ASTCommandNode[],
    context: ExecutionContext
  ): Promise<void> {
    for (const command of commands) {
      try {
        await this.executeCommand(command, context);
      } catch (error) {
        // Log individual command errors but continue with remaining commands
        console.error(`Error executing command ${command.name}:`, error);
        
        // Emit error event but don't stop execution
        if (context.me) {
          const errorEvent = new CustomEvent('hyperscript:error', {
            detail: { 
              error: error as Error, 
              command,
              context 
            },
            bubbles: true,
          });
          (context.me as HTMLElement).dispatchEvent(errorEvent);
        }
      }
    }
  }

  /**
   * Execute a single hyperscript command
   */
  private async executeCommand(
    command: ASTCommandNode,
    context: ExecutionContext
  ): Promise<any> {
    // Check for global command executor (injected by runtime/testing)
    const globalExecutor = (globalThis as any).__hyperscriptExecuteCommand;
    
    if (globalExecutor) {
      return await globalExecutor(context, command);
    }

    // Fallback: basic command execution for common commands
    return this.executeBasicCommand(command, context);
  }

  /**
   * Basic command execution for simple commands (fallback)
   */
  private async executeBasicCommand(
    command: ASTCommandNode,
    context: ExecutionContext
  ): Promise<any> {
    const element = context.me as HTMLElement;
    
    switch (command.name) {
      case 'hide':
        if (element) {
          element.style.display = 'none';
        }
        break;
        
      case 'show':
        if (element) {
          element.style.display = '';
        }
        break;
        
      case 'toggle':
        if (element) {
          if (element.style.display === 'none') {
            element.style.display = '';
          } else {
            element.style.display = 'none';
          }
        }
        break;
        
      case 'add':
        if (element && command.args.length > 0) {
          const className = this.evaluateArgument(command.args[0], context);
          if (className && typeof className === 'string') {
            element.classList.add(className);
          }
        }
        break;
        
      case 'remove':
        if (element && command.args.length > 0) {
          const className = this.evaluateArgument(command.args[0], context);
          if (className && typeof className === 'string') {
            element.classList.remove(className);
          }
        }
        break;
        
      case 'log':
        if (command.args.length > 0) {
          const value = this.evaluateArgument(command.args[0], context);
          console.log(value);
        }
        break;
        
      case 'wait':
        if (command.args.length > 0) {
          const delay = this.evaluateArgument(command.args[0], context);
          if (typeof delay === 'number') {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        break;
        
      case 'set':
        if (element && command.args.length >= 2) {
          const target = command.args[0];
          const value = this.evaluateArgument(command.args[1], context);
          
          if (target.type === 'property' && target.property) {
            (element as any)[target.property] = value;
          }
        }
        break;
        
      case 'increment':
        if (element && command.args.length > 0) {
          const target = command.args[0];
          
          if (target.type === 'property' && target.property) {
            const currentValue = (element as any)[target.property] || 0;
            (element as any)[target.property] = currentValue + 1;
          }
        }
        break;
        
      case 'put':
        if (command.args.length >= 2) {
          const value = this.evaluateArgument(command.args[0], context);
          const target = command.args[1];
          
          if (target.type === 'identifier' && target.name === 'me' && element) {
            element.textContent = String(value);
          }
        }
        break;
        
      default:
        throw new Error(`Unknown command: ${command.name}`);
    }
  }

  /**
   * Evaluate a command argument (simplified evaluation)
   */
  private evaluateArgument(arg: ASTNode, context: ExecutionContext): any {
    switch (arg.type) {
      case 'literal':
        return arg.value;
        
      case 'identifier':
        // Check locals first, then globals, then context properties
        if (context.locals.has(arg.name!)) {
          return context.locals.get(arg.name!);
        }
        if (context.globals.has(arg.name!)) {
          return context.globals.get(arg.name!);
        }
        
        // Check for built-in context references
        switch (arg.name) {
          case 'me':
            return context.me;
          case 'it':
            return context.it;
          case 'you':
            return context.you;
          default:
            return undefined;
        }
        
      case 'property':
        // Handle property access like my.clickCount
        if (arg.target && arg.target.type === 'identifier' && arg.target.name === 'me') {
          const element = context.me as HTMLElement;
          return (element as any)[arg.property];
        }
        return undefined;
        
      default:
        return undefined;
    }
  }

  /**
   * Handle execution errors
   */
  private handleError(element: HTMLElement | null, error: Error, commands: ASTCommandNode[]): void {
    console.error('Error in hyperscript event handler:', error);
    
    if (element) {
      const errorEvent = new CustomEvent('hyperscript:error', {
        detail: { 
          error, 
          commands,
          message: error.message 
        },
        bubbles: true,
      });
      element.dispatchEvent(errorEvent);
    }
  }

  /**
   * Get the event manager (for debugging/testing)
   */
  getEventManager(): HyperscriptEventManager {
    return this.eventManager;
  }

  /**
   * Get registered listeners count (for debugging/testing)
   */
  getListenerCount(): number {
    return this.registeredListeners.size;
  }

  /**
   * Get all registered listener IDs (for debugging/testing)
   */
  getListenerIds(): string[] {
    return Array.from(this.registeredListeners.keys());
  }
}

/**
 * Factory function to create OnFeature instances
 */
export function createOnFeature(eventManager?: HyperscriptEventManager): OnFeature {
  return new OnFeature(eventManager);
}

/**
 * Default OnFeature instance for convenience
 */
let defaultOnFeature: OnFeature | null = null;

/**
 * Get or create the default OnFeature instance
 */
export function getDefaultOnFeature(): OnFeature {
  if (!defaultOnFeature) {
    defaultOnFeature = createOnFeature();
  }
  return defaultOnFeature;
}

/**
 * Reset the default OnFeature instance (useful for testing)
 */
export function resetDefaultOnFeature(): void {
  defaultOnFeature = null;
}