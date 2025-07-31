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
} from '../types/base-types';

import { ExpressionEvaluator } from '../core/expression-evaluator';
import { PutCommand } from '../commands/dom/put';
// SetCommand now imported from data/index.js above

// Enhanced command imports
import { EnhancedCommandRegistry } from './enhanced-command-adapter';
import { createHideCommand } from '../commands/dom/hide';
import { createShowCommand } from '../commands/dom/show';
import { createToggleCommand } from '../commands/dom/toggle';
import { createAddCommand } from '../commands/dom/add';
import { createRemoveCommand } from '../commands/dom/remove';
import { createSendCommand } from '../commands/events/send';
import { createTriggerCommand } from '../commands/events/trigger';
import { createWaitCommand } from '../legacy/commands/async/wait';
import { createFetchCommand } from '../legacy/commands/async/fetch';
import { createPutCommand } from '../commands/dom/put';

// Additional command imports
// IncrementCommand and DecrementCommand now imported from data/index.js above
import { MakeCommand } from '../commands/creation/index';
import { AppendCommand } from '../commands/content/index';
import { CallCommand } from '../commands/execution/index';
// JSCommand and TellCommand now imported from advanced/index.js above
import { PickCommand } from '../commands/utility/index';
import { GoCommand } from '../commands/navigation/go';

// Control flow commands
import { 
  IfCommand, 
  HaltCommand, 
  BreakCommand, 
  ContinueCommand, 
  ReturnCommand, 
  ThrowCommand, 
  UnlessCommand, 
  RepeatCommand 
} from '../commands/control-flow/index';

// Animation commands
import { 
  MeasureCommand, 
  SettleCommand, 
  TakeCommand, 
  TransitionCommand 
} from '../commands/animation/index';

// Data commands
import { DefaultCommand, SetCommand, IncrementCommand, DecrementCommand } from '../commands/data/index';

// Advanced commands
import { BeepCommand, AsyncCommand, TellCommand, JSCommand } from '../commands/advanced/index';

// Template commands
import { RenderCommand } from '../commands/templates/index';

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
   * Register legacy command by adapting it to the enhanced registry
   */
  private registerLegacyCommand(command: { name: string; execute: (context: ExecutionContext, ...args: unknown[]) => Promise<unknown>; validate?: (args: unknown[]) => { isValid: boolean; errors: unknown[]; suggestions: string[] } }): void {
    // Create an adapter for legacy commands to work with enhanced registry
    const adapter = {
      name: command.name,
      syntax: command.syntax || `${command.name} [args...]`,
      description: command.description || `${command.name} command`,
      inputSchema: null, // Legacy commands don't have schemas
      outputType: 'unknown' as const,
      
      async execute(context: ExecutionContext, ...args: unknown[]): Promise<unknown> {
        return await command.execute(context, ...args);
      },
      
      validate(args: unknown[]): { isValid: boolean; errors: unknown[]; suggestions: string[] } {
        try {
          const validationResult = command.validate ? command.validate(args) : null;
          if (validationResult) {
            return {
              isValid: false,
              errors: [{ message: validationResult }],
              suggestions: []
            };
          }
          return { isValid: true, errors: [], suggestions: [] };
        } catch {
          return { isValid: true, errors: [], suggestions: [] };
        }
      }
    };
    
    this.enhancedRegistry.register(adapter);
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
      this.enhancedRegistry.register(createPutCommand());
      
      // Register event commands
      this.enhancedRegistry.register(createSendCommand());
      this.enhancedRegistry.register(createTriggerCommand());
      
      // Register async commands
      this.enhancedRegistry.register(createWaitCommand());
      this.enhancedRegistry.register(createFetchCommand());
      
      // Register data commands (legacy interface - need adapters)
      this.registerLegacyCommand(new IncrementCommand());
      this.registerLegacyCommand(new DecrementCommand());
      
      // Register content/creation commands
      this.registerLegacyCommand(new MakeCommand());
      this.registerLegacyCommand(new AppendCommand());
      
      // Register execution commands
      this.registerLegacyCommand(new CallCommand());
      
      // Register advanced commands
      this.registerLegacyCommand(new JSCommand());
      this.registerLegacyCommand(new TellCommand());
      
      // Register utility commands
      this.registerLegacyCommand(new PickCommand());
      
      // Register navigation commands (has TypedCommandImplementation)
      this.enhancedRegistry.register(new GoCommand());
      
      // Register control flow commands
      this.registerLegacyCommand(new IfCommand());
      this.registerLegacyCommand(new HaltCommand());
      this.registerLegacyCommand(new BreakCommand());
      this.registerLegacyCommand(new ContinueCommand());
      this.registerLegacyCommand(new ReturnCommand());
      this.registerLegacyCommand(new ThrowCommand());
      this.registerLegacyCommand(new UnlessCommand());
      this.registerLegacyCommand(new RepeatCommand());
      
      // Register animation commands
      this.registerLegacyCommand(new MeasureCommand());
      this.registerLegacyCommand(new SettleCommand());
      this.registerLegacyCommand(new TakeCommand());
      this.registerLegacyCommand(new TransitionCommand());
      
      // Register additional data commands
      this.registerLegacyCommand(new DefaultCommand());
      
      // Register advanced commands
      this.enhancedRegistry.register(new BeepCommand());
      this.registerLegacyCommand(new AsyncCommand());
      
      // Register template commands
      this.registerLegacyCommand(new RenderCommand());
      
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
        
        case 'CommandSequence': {
          return await this.executeCommandSequence(node as { commands: ASTNode[] }, context);
        }
        
        case 'objectLiteral': {
          return await this.executeObjectLiteral(node as { properties: Array<{ key: ASTNode; value: ASTNode }> }, context);
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
   * Execute a command sequence (multiple commands in order)
   */
  private async executeCommandSequence(node: { commands: ASTNode[] }, context: ExecutionContext): Promise<unknown> {
    if (!node.commands || !Array.isArray(node.commands)) {
      console.warn('CommandSequence node has no commands array:', node);
      return;
    }

    let lastResult: unknown = undefined;
    
    // Execute each command in sequence
    for (const command of node.commands) {
      try {
        lastResult = await this.execute(command, context);
      } catch (error) {
        if (this.options.enableErrorReporting) {
          console.error('Error executing command in sequence:', error, command);
        }
        throw error;
      }
    }
    
    // Return the result of the last command
    return lastResult;
  }

  /**
   * Execute an object literal node (convert to JavaScript object)
   */
  private async executeObjectLiteral(node: { properties: Array<{ key: ASTNode; value: ASTNode }> }, context: ExecutionContext): Promise<Record<string, unknown>> {
    if (!node.properties || !Array.isArray(node.properties)) {
      console.warn('ObjectLiteral node has no properties array:', node);
      return {};
    }

    const result: Record<string, unknown> = {};
    
    // Evaluate each property
    for (const property of node.properties) {
      try {
        // Evaluate the key
        let key: string;
        if (property.key.type === 'identifier') {
          // For object literal keys that are identifiers, we usually want the name directly
          // unless it's meant to be evaluated as a variable
          // In hyperscript, {name: value} uses 'name' as literal key
          // But {[name]: value} or {(name): value} would evaluate 'name' as variable
          key = (property.key as { name: string }).name;
        } else if (property.key.type === 'literal') {
          key = String((property.key as { value: unknown }).value);
        } else {
          // For other key types, evaluate them
          const evaluatedKey = await this.execute(property.key, context);
          key = String(evaluatedKey);
        }
        
        // Evaluate the value
        const value = await this.execute(property.value, context);
        
        // Add to result object
        result[key] = value;
      } catch (error) {
        if (this.options.enableErrorReporting) {
          console.error('Error executing object property:', error, property);
        }
        throw error;
      }
    }
    
    return result;
  }

  /**
   * Execute enhanced command with adapter
   */
  private async executeEnhancedCommand(name: string, args: ExpressionNode[], context: ExecutionContext): Promise<unknown> {
    const adapter = this.enhancedRegistry.getAdapter(name);
    if (!adapter) {
      throw new Error(`Enhanced command not found: ${name}`);
    }

    let evaluatedArgs: unknown[];
    
    // Special handling for PUT command - target should be handled specially
    if (name === 'put' && args.length >= 3) {
      // For put command: evaluate content and position, but handle target specially
      const content = await this.execute(args[0], context);
      const position = await this.execute(args[1], context);
      let target = args[2];
      
      // Handle target resolution for enhanced put command
      if (target?.type === 'identifier' && target.name === 'me') {
        target = context.me;
      } else if (target?.type === 'selector') {
        // Keep selector as string for enhanced put command
        target = target.value;
      } else if (target?.type === 'identifier') {
        // For other identifiers, keep as string
        target = target.name;
      } else if (target?.type === 'literal') {
        target = target.value;
      } else {
        // Evaluate and extract first element if it's an array
        const evaluated = await this.execute(target, context);
        if (Array.isArray(evaluated) && evaluated.length > 0 && evaluated[0] instanceof HTMLElement) {
          target = evaluated[0];
        } else {
          target = evaluated;
        }
      }
      
      evaluatedArgs = [content, position, target];
    } else {
      // For other commands, evaluate all arguments normally
      evaluatedArgs = await Promise.all(
        args.map(arg => this.execute(arg, context))
      );
    }

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
      // For pattern-based execution, we need to handle different command types
      let args: ASTNode[];
      if (commandName === 'remove' || commandName === 'add') {
        // For remove/add, pass the class name directly (strip . if present)
        const className = selector.startsWith('.') ? selector.slice(1) : selector;
        args = [{ type: 'literal', value: className }];
      } else {
        // For other commands (hide/show), pass selector as is
        args = selector ? [{ type: 'literal', value: selector }] : [];
      }
      return await this.executeEnhancedCommand(commandName, args, context);
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
    
    // Debug logging for all commands
    console.log('🎯 Executing command:', name, 'with args:', args);
    
    // Debug logging for put command
    if (name === 'put') {
      console.log('🔧 PUT Command Debug:', {
        name,
        useEnhancedCommands: this.options.useEnhancedCommands,
        hasEnhancedPut: this.enhancedRegistry.has('put'),
        availableCommands: this.enhancedRegistry.getCommandNames()
      });
    }
    
    // Try enhanced commands first if enabled
    if (this.options.useEnhancedCommands && this.enhancedRegistry.has(name.toLowerCase())) {
      console.log(`🔧 Using enhanced command: ${name}`);
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
        console.log('🚨 SET command case reached in runtime switch!');
        // Set command should get mixed arguments - variable name raw, value evaluated  
        return await this.executeSetCommand(rawArgs, context);
      }
      
      case 'log': {
        console.log('🚨 LOG command case reached in runtime switch!');
        // Log command evaluates all arguments and logs them
        const logArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        console.log('🔧 LOG command about to execute with args:', logArgs);
        return this.executeLogCommand(logArgs, context);
      }
      
      case 'beep':
      case 'beep!': {
        // Beep command for debugging - evaluates all arguments and logs them
        const beepArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeBeepCommand(beepArgs, context);
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
    console.log('🔧 SET command executing with args:', rawArgs);
    
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
      
      console.log('🔧 SET command processed:', { varName, toKeyword, value });
      
      // Handle special context variables directly
      if (varName === 'result') {
        context.result = value;
        return;
      }
      
      // Use the enhanced command API
      const input = {
        target: varName,
        value: value,
        toKeyword: 'to' as const
      };
      
      const typedContext = context as any; // Cast to avoid type issues for now
      
      try {
        const result = await this.setCommand.execute(input, typedContext);
        console.log('🔧 SET command completed:', result);
        return;
      } catch (error) {
        console.error('❌ SET command failed:', error);
        throw error;
      }
    }
    
    throw new Error('SET command requires at least 3 arguments (variable, "to", value)');
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
   * Execute BEEP command - debugging output with enhanced formatting
   */
  private executeBeepCommand(args: unknown[], context: ExecutionContext): void {
    // If no arguments, beep with context info
    if (args.length === 0) {
      console.group('🔔 Beep! Hyperscript Context Debug');
      console.log('me:', context.me);
      console.log('it:', context.it);
      console.log('you:', context.you);
      console.log('locals:', context.locals);
      console.log('globals:', context.globals);
      console.log('variables:', context.variables);
      console.groupEnd();
      return;
    }
    
    // Debug each argument with enhanced formatting
    args.forEach((value, index) => {
      console.group(`🔔 Beep! Argument ${index + 1}`);
      console.log('Value:', value);
      console.log('Type:', this.getDetailedType(value));
      console.log('Representation:', this.getSourceRepresentation(value));
      console.groupEnd();
    });
  }

  /**
   * Get detailed type information for beep command
   */
  private getDetailedType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (Array.isArray(value)) return 'array';
    if (value instanceof HTMLElement) return 'HTMLElement';
    if (value instanceof Date) return 'Date';
    if (value instanceof RegExp) return 'RegExp';
    if (value instanceof Error) return 'Error';
    
    return typeof value;
  }

  /**
   * Get source representation for beep command
   */
  private getSourceRepresentation(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value.toString();
    }
    
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }
    
    if (value instanceof HTMLElement) {
      const tag = value.tagName.toLowerCase();
      const id = value.id ? `#${value.id}` : '';
      const classes = value.className ? `.${value.className.split(' ').join('.')}` : '';
      return `<${tag}${id}${classes}/>`;
    }
    
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    
    if (typeof value === 'object') {
      try {
        const keys = Object.keys(value);
        return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
      } catch {
        return '[Object]';
      }
    }
    
    return String(value);
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
  private isElement(obj: unknown): obj is HTMLElement {
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
      const returnObj: { valid: boolean; error?: string; suggestions?: string[] } = {
        valid: result.success
      };
      if (result.error?.message) {
        returnObj.error = result.error.message;
      }
      if (result.error?.suggestions) {
        returnObj.suggestions = result.error.suggestions;
      }
      return returnObj;
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