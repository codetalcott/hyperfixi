/**
 * Hyperscript Runtime System
 * Executes parsed AST nodes with proper context management and DOM integration
 */

import type { 
  ASTNode, 
  ExecutionContext, 
  CommandNode, 
  ExpressionNode,
  EventHandlerNode
} from '../types/core.js';

import { ExpressionEvaluator } from '../core/expression-evaluator.js';
import { PutCommand } from '../commands/dom/put.js';
import { SetCommand } from '../commands/data/set.js';

// Enhanced command imports
import { EnhancedCommandRegistry } from './enhanced-command-adapter.js';
import { createHideCommand } from '../commands/dom/hide.js';
import { createShowCommand } from '../commands/dom/show.js';
import { createToggleCommand } from '../commands/dom/toggle.js';
import { createAddCommand } from '../commands/dom/add.js';
import { createRemoveCommand } from '../commands/dom/remove.js';
import { createSendCommand } from '../commands/events/send.js';
import { createTriggerCommand } from '../commands/events/trigger.js';
import { createWaitCommand } from '../commands/async/wait.js';
import { createFetchCommand } from '../commands/async/fetch.js';

export interface RuntimeOptions {
  enableAsyncCommands?: boolean;
  commandTimeout?: number;
  enableErrorReporting?: boolean;
  useEnhancedCommands?: boolean;
}

export class Runtime {
  private options: RuntimeOptions;
  private expressionEvaluator: ExpressionEvaluator;
  private putCommand: PutCommand;
  private setCommand: SetCommand;
  private enhancedRegistry: EnhancedCommandRegistry;
  
  constructor(options: RuntimeOptions = {}) {
    this.options = {
      enableAsyncCommands: true,
      commandTimeout: 10000, // 10 seconds
      enableErrorReporting: true,
      useEnhancedCommands: true,
      ...options
    };
    
    this.expressionEvaluator = new ExpressionEvaluator();
    this.putCommand = new PutCommand();
    this.setCommand = new SetCommand();
    
    // Initialize enhanced command registry
    this.enhancedRegistry = new EnhancedCommandRegistry();
    this.initializeEnhancedCommands();
  }

  /**
   * Initialize enhanced commands in the registry
   */
  private initializeEnhancedCommands(): void {
    if (!this.options.useEnhancedCommands) {
      return;
    }

    try {
      // Register DOM commands
      this.enhancedRegistry.register(createHideCommand());
      this.enhancedRegistry.register(createShowCommand());
      this.enhancedRegistry.register(createToggleCommand());
      this.enhancedRegistry.register(createAddCommand());
      this.enhancedRegistry.register(createRemoveCommand());
      
      // Register event commands
      this.enhancedRegistry.register(createSendCommand());
      this.enhancedRegistry.register(createTriggerCommand());
      
      // Register async commands
      this.enhancedRegistry.register(createWaitCommand());
      this.enhancedRegistry.register(createFetchCommand());
      
      if (this.options.enableErrorReporting) {
        console.log(`Enhanced commands initialized: ${this.enhancedRegistry.getCommandNames().join(', ')}`);
      }
    } catch (error) {
      if (this.options.enableErrorReporting) {
        console.warn('Failed to initialize some enhanced commands:', error);
      }
      // Fallback to legacy commands if enhanced initialization fails
      this.options.useEnhancedCommands = false;
    }
  }

  /**
   * Execute an AST node within the given execution context
   */
  async execute(node: ASTNode, context: ExecutionContext): Promise<unknown> {
    try {
      switch (node.type) {
        case 'command': {
          return await this.executeCommand(node as CommandNode, context);
        }
        
        case 'eventHandler': {
          return await this.executeEventHandler(node as EventHandlerNode, context);
        }
        
        default: {
          // For all other node types, use the expression evaluator
          const result = await this.expressionEvaluator.evaluate(node, context);
          
          // Check if the result is a command-selector pattern from space operator
          if (result && typeof result === 'object' && result.command && result.selector) {
            return await this.executeCommandFromPattern(result.command, result.selector, context);
          }
          
          return result;
        }
      }
    } catch (error) {
      if (this.options.enableErrorReporting) {
        console.error('Runtime execution error:', error);
      }
      throw error;
    }
  }

  /**
   * Execute enhanced command with adapter
   */
  private async executeEnhancedCommand(name: string, args: ExpressionNode[], context: ExecutionContext): Promise<unknown> {
    const adapter = this.enhancedRegistry.getAdapter(name);
    if (!adapter) {
      throw new Error(`Enhanced command not found: ${name}`);
    }

    // Evaluate arguments in current context
    const evaluatedArgs = await Promise.all(
      args.map(arg => this.execute(arg, context))
    );

    // Execute through enhanced adapter
    return await adapter.execute(context, ...evaluatedArgs);
  }

  /**
   * Execute a command from a command-selector pattern (e.g., "add .active")
   */
  private async executeCommandFromPattern(command: string, selector: string, context: ExecutionContext): Promise<unknown> {
    const commandName = command.toLowerCase();
    
    // Try enhanced commands first if available
    if (this.options.useEnhancedCommands && this.enhancedRegistry.has(commandName)) {
      return await this.executeEnhancedCommand(commandName, [{ type: 'literal', value: selector }], context);
    }

    // Fallback to legacy command handling
    switch (commandName) {
      case 'add': {
        return this.executeAddCommand([selector], context);
      }
      case 'remove': {
        return this.executeRemoveCommand([selector], context);
      }
      case 'hide': {
        return this.executeHideCommand([selector], context);
      }
      case 'show': {
        return this.executeShowCommand([selector], context);
      }
      default: {
        // For unknown commands, create a proper command node
        const commandNode: CommandNode = {
          type: 'command',
          name: command,
          args: [{ type: 'literal', value: selector }]
        };
        return await this.executeCommand(commandNode, context);
      }
    }
  }

  /**
   * Execute a command node (hide, show, wait, add, remove, etc.)
   */
  private async executeCommand(node: CommandNode, context: ExecutionContext): Promise<unknown> {
    const { name, args } = node;
    
    // Try enhanced commands first if enabled
    if (this.options.useEnhancedCommands && this.enhancedRegistry.has(name.toLowerCase())) {
      return await this.executeEnhancedCommand(name.toLowerCase(), args || [], context);
    }
    
    // For now, let commands handle their own argument evaluation
    // This ensures compatibility with how the commands are designed
    const rawArgs = args || [];

    switch (name.toLowerCase()) {
      case 'hide': {
        // These commands expect evaluated args
        const hideArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeHideCommand(hideArgs, context);
      }
      
      case 'show': {
        const showArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeShowCommand(showArgs, context);
      }
      
      case 'wait': {
        const waitArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeWaitCommand(waitArgs, context);
      }
      
      case 'add': {
        const addArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeAddCommand(addArgs, context);
      }
      
      case 'remove': {
        const removeArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeRemoveCommand(removeArgs, context);
      }
      
      case 'put': {
        // Put command should get mixed arguments - content evaluated, target as raw string/element
        return await this.executePutCommand(rawArgs, context);
      }
      
      case 'set': {
        // Set command should get mixed arguments - variable name raw, value evaluated  
        return await this.executeSetCommand(rawArgs, context);
      }
      
      case 'log': {
        // Log command evaluates all arguments and logs them
        const logArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeLogCommand(logArgs, context);
      }
      
      default: {
        throw new Error(`Unknown command: ${name}`);
      }
    }
  }


  /**
   * Execute an event handler node (on click, on change, etc.)
   */
  private async executeEventHandler(node: EventHandlerNode, context: ExecutionContext): Promise<void> {
    const { event, commands, selector } = node;
    
    // Determine target element(s)
    const targets = selector 
      ? this.queryElements(selector, context)
      : context.me ? [context.me] : [];
    
    if (targets.length === 0) {
      console.warn(`No elements found for event handler: ${event}`);
      return;
    }
    
    // Create event handler function
    const eventHandler = async (domEvent: Event) => {
      // Create new context for event execution
      const eventContext: ExecutionContext = {
        ...context,
        me: domEvent.target as HTMLElement,
        it: domEvent,
        event: domEvent
      };
      
      // Execute all commands in sequence
      for (const command of commands) {
        await this.execute(command, eventContext);
      }
    };
    
    // Bind event handlers to all target elements
    for (const target of targets) {
      target.addEventListener(event, eventHandler);
      
      // Store event handler for potential cleanup
      if (!context.events) {
        context.events = new Map();
      }
      const eventKey = `${event}-${targets.indexOf(target)}`;
      context.events.set(eventKey, { target, event, handler: eventHandler });
    }
  }

  /**
   * Execute hide command
   */
  private executeHideCommand(args: unknown[], context: ExecutionContext): void {
    // When we have args like "hide me", the first arg is the evaluated "me" identifier
    // When we have no args like "hide", use context.me directly
    const target = args.length > 0 ? args[0] : context.me;
    
    if (!target) {
      throw new Error('Context element "me" is null');
    }
    
    if (this.isElement(target)) {
      target.style.display = 'none';
    } else if (typeof target === 'string') {
      // Selector string - query and hide elements
      const elements = this.queryElements(target, context);
      elements.forEach(el => el.style.display = 'none');
    }
  }

  /**
   * Execute show command
   */
  private executeShowCommand(args: unknown[], context: ExecutionContext): void {
    const target = args.length > 0 ? args[0] : context.me;
    
    if (!target) {
      throw new Error('Context element "me" is null');
    }
    
    if (this.isElement(target)) {
      target.style.display = 'block';
    } else if (typeof target === 'string') {
      // Selector string - query and show elements
      const elements = this.queryElements(target, context);
      elements.forEach(el => el.style.display = 'block');
    }
  }

  /**
   * Execute wait command with time delays
   */
  private async executeWaitCommand(args: unknown[], _context: ExecutionContext): Promise<void> {
    if (args.length === 0) {
      throw new Error('Wait command requires a time argument');
    }
    
    const timeArg = args[0];
    let milliseconds = 0;
    
    if (typeof timeArg === 'string') {
      // Parse time expressions like "500ms", "2s", "1.5s"
      const match = timeArg.match(/^(\d+(?:\.\d+)?)(ms|s|seconds?)$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        
        if (unit === 'ms') {
          milliseconds = value;
        } else if (unit === 's' || unit.startsWith('second')) {
          milliseconds = value * 1000;
        }
      } else {
        throw new Error(`Invalid time format: ${timeArg}`);
      }
    } else if (typeof timeArg === 'number') {
      milliseconds = timeArg;
    }
    
    if (milliseconds > 0) {
      await new Promise(resolve => setTimeout(resolve, milliseconds));
    }
  }

  /**
   * Execute add command (add classes)
   */
  private executeAddCommand(args: unknown[], context: ExecutionContext): void {
    const target = context.me;
    if (!target) {
      throw new Error('Context element "me" is null');
    }
    
    args.forEach(arg => {
      if (typeof arg === 'string') {
        // Remove leading dot if present
        const className = arg.startsWith('.') ? arg.slice(1) : arg;
        target.classList.add(className);
      } else if (Array.isArray(arg)) {
        // Handle element arrays from selector evaluation - extract class name from original selector
        // This case occurs when selector nodes are evaluated to elements
        // For add/remove class operations, we need the class name, not the elements
        console.warn('Add command received element array instead of class name');
      }
    });
  }

  /**
   * Execute remove command (remove classes)
   */
  private executeRemoveCommand(args: unknown[], context: ExecutionContext): void {
    const target = context.me;
    if (!target) {
      throw new Error('Context element "me" is null');
    }
    
    args.forEach(arg => {
      if (typeof arg === 'string') {
        // Remove leading dot if present
        const className = arg.startsWith('.') ? arg.slice(1) : arg;
        target.classList.remove(className);
      }
    });
  }

  /**
   * Execute put command (set content)
   */
  private async executePutCommand(rawArgs: ExpressionNode[], context: ExecutionContext): Promise<void> {
    // Process arguments: content (evaluate), preposition (evaluate), target (special handling)
    if (rawArgs.length >= 3) {
      const content = await this.execute(rawArgs[0], context);
      const preposition = await this.execute(rawArgs[1], context);
      let target = rawArgs[2];
      
      // Handle target resolution - fix the [object Object] issue
      if (target?.type === 'identifier' && target.name === 'me') {
        target = context.me;
      } else if (target?.type === 'identifier') {
        // For other identifiers, keep as string for CSS selector or context lookup
        target = target.name;
      } else if (target?.type === 'literal') {
        target = target.value;
      } else if (target?.type === 'selector') {
        target = target.value;
      } else {
        // Only evaluate if it's not already a target we can handle
        if (typeof target === 'object' && target?.type) {
          target = await this.execute(target, context);
        }
      }
      
      return this.putCommand.execute(context, content, preposition, target);
    }
    
    // Fallback: use raw args
    return this.putCommand.execute(context, ...rawArgs);
  }

  /**
   * Execute set command (set variables)
   */
  private async executeSetCommand(rawArgs: ExpressionNode[], context: ExecutionContext): Promise<void> {
    // Process arguments: variable name (raw), "to" (evaluate), value (evaluate)
    if (rawArgs.length >= 3) {
      let varName = rawArgs[0];
      if (varName?.type === 'identifier') {
        varName = varName.name;
      } else if (varName?.type === 'literal') {
        varName = varName.value;
      } else {
        varName = String(varName);
      }
      
      const toKeyword = await this.execute(rawArgs[1], context);
      const value = await this.execute(rawArgs[2], context);
      
      // Handle special context variables directly
      if (varName === 'result') {
        context.result = value;
        return;
      }
      
      return this.setCommand.execute(context, varName, toKeyword, value);
    }
    
    // Fallback: use raw args
    return this.setCommand.execute(context, ...rawArgs);
  }

  /**
   * Execute LOG command - output values to console
   */
  private executeLogCommand(args: unknown[], _context: ExecutionContext): void {
    // If no arguments, just log empty
    if (args.length === 0) {
      console.log();
      return;
    }
    
    // Log all arguments
    console.log(...args);
  }





  /**
   * Query DOM elements by selector
   */
  private queryElements(selector: string, context: ExecutionContext): HTMLElement[] {
    if (!context.me || typeof document === 'undefined') {
      return [];
    }
    
    // Query from document or current element's context
    const root = document;
    const elements = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
    
    return elements;
  }

  /**
   * Check if an object is an HTML element (works in both browser and Node.js)
   */
  private isElement(obj: any): obj is HTMLElement {
    // First check if it's a real HTMLElement (in browser environment)
    if (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement) {
      return true;
    }
    
    // Fallback: check for element-like properties (for mocks and Node.js)
    return obj && 
           typeof obj === 'object' && 
           obj.style && 
           typeof obj.style === 'object' &&
           obj.classList;
  }

  /**
   * Get available command names (both enhanced and legacy)
   */
  getAvailableCommands(): string[] {
    const commands = new Set<string>();
    
    // Add enhanced commands
    if (this.options.useEnhancedCommands) {
      this.enhancedRegistry.getCommandNames().forEach((name: string) => commands.add(name));
    }
    
    // Add legacy commands
    ['hide', 'show', 'wait', 'add', 'remove', 'put', 'set', 'log'].forEach(name => commands.add(name));
    
    return Array.from(commands);
  }

  /**
   * Validate command before execution
   */
  validateCommand(name: string, input: unknown): { valid: boolean; error?: string; suggestions?: string[] } {
    // Try enhanced validation first
    if (this.options.useEnhancedCommands && this.enhancedRegistry.has(name.toLowerCase())) {
      const result = this.enhancedRegistry.validateCommand(name.toLowerCase(), input);
      return {
        valid: result.success,
        error: result.error?.message,
        suggestions: result.error?.suggestions
      };
    }
    
    // Basic validation for legacy commands
    const availableCommands = this.getAvailableCommands();
    if (!availableCommands.includes(name.toLowerCase())) {
      return {
        valid: false,
        error: `Unknown command: ${name}`,
        suggestions: [`Available commands: ${availableCommands.join(', ')}`]
      };
    }
    
    return { valid: true };
  }

  /**
   * Get enhanced command registry (for debugging/inspection)
   */
  getEnhancedRegistry(): EnhancedCommandRegistry {
    return this.enhancedRegistry;
  }

  /**
   * Check if enhanced commands are enabled
   */
  isUsingEnhancedCommands(): boolean {
    return this.options.useEnhancedCommands === true;
  }
}