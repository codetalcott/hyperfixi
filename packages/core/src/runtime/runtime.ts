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
import { createEnhancedSetCommand } from '../commands/data/enhanced-set';
import { createSimpleSetCommand } from '../commands/data/simple-set';
import { createEnhancedIncrementCommand } from '../commands/data/enhanced-increment';
import { createEnhancedDecrementCommand } from '../commands/data/enhanced-decrement';
import { createEnhancedRenderCommand } from '../commands/templates/enhanced-render';
import { createEnhancedLogCommand } from '../commands/utility/enhanced-log';

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
import { DefaultCommand, IncrementCommand, DecrementCommand } from '../commands/data/index';

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
    
    // Initialize enhanced command registry with all commands for complete system
    this.enhancedRegistry = EnhancedCommandRegistry.createWithDefaults();
    this.initializeEnhancedCommands();
  }

  /**
   * Register legacy command by adapting it to the enhanced registry
   */
  private registerLegacyCommand(command: { name: string; execute: (context: ExecutionContext, ...args: unknown[]) => Promise<unknown>; validate?: (args: unknown[]) => { isValid: boolean; errors: unknown[]; suggestions: string[] } }): void {
    // console.log('🔧 Registering legacy command:', command.name);
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
      
      // Register data commands (enhanced)
      try {
        const setCommand = createEnhancedSetCommand();
        // console.log('🔧 Registering Enhanced SET command:', setCommand.name);
        this.enhancedRegistry.register(setCommand);
        // console.log('✅ Enhanced SET command registered successfully');
      } catch (e) {
        // console.error('❌ Failed to register Enhanced SET command:', e);
      }
      
      // Register async commands
      this.enhancedRegistry.register(createWaitCommand());
      this.enhancedRegistry.register(createFetchCommand());
      
      // Register data commands (enhanced)
      try {
        const incrementCommand = createEnhancedIncrementCommand();
        // console.log('🔧 Registering Enhanced INCREMENT command:', incrementCommand.name);
        this.enhancedRegistry.register(incrementCommand);
        // console.log('✅ Enhanced INCREMENT command registered successfully');
      } catch (e) {
        // console.error('❌ Failed to register Enhanced INCREMENT command:', e);
      }
      
      try {
        const decrementCommand = createEnhancedDecrementCommand();
        // console.log('🔧 Registering Enhanced DECREMENT command:', decrementCommand.name);
        this.enhancedRegistry.register(decrementCommand);
        // console.log('✅ Enhanced DECREMENT command registered successfully');
      } catch (e) {
        // console.error('❌ Failed to register Enhanced DECREMENT command:', e);
      }
      
      // Register utility commands (enhanced)
      try {
        const logCommand = createEnhancedLogCommand();
        // console.log('🔧 Registering Enhanced LOG command:', logCommand.name);
        this.enhancedRegistry.register(logCommand);
        // console.log('✅ Enhanced LOG command registered successfully');
      } catch (e) {
        // console.error('❌ Failed to register Enhanced LOG command:', e);
      }
      
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
      
      // Register template commands (enhanced)
      try {
        const renderCommand = createEnhancedRenderCommand();
        // console.log('🔧 Registering Enhanced RENDER command:', renderCommand.name);
        this.enhancedRegistry.register(renderCommand);
        // console.log('✅ Enhanced RENDER command registered successfully');
      } catch (e) {
        // console.error('❌ Failed to register Enhanced RENDER command:', e);
        // Fallback to legacy command
        this.registerLegacyCommand(new RenderCommand());
      }
      
      if (this.options.enableErrorReporting) {
        // console.log(`Enhanced commands initialized: ${this.enhancedRegistry.getCommandNames().join(', ')}`);
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
        // console.error('Runtime execution error:', error);
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
          // console.error('Error executing command in sequence:', error, command);
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
          // console.error('Error executing object property:', error, property);
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
    
    // Special handling for commands with natural language syntax
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
    } else if ((name === 'add' || name === 'remove') && args.length === 3) {
      // Handle "add .class to #target" and "remove .class from #target" patterns
      // console.log(`🔧 ${name.toUpperCase()} Command Debug:`, {
        // name,
        // argsLength: args.length,
        // args: args.map(arg => ({ type: arg.type, value: (arg as any).value || (arg as any).name }))
      // });
      
      // For add/remove, the first argument (class) should be treated as a literal value, not evaluated as selector
      let classArg = args[0];
      if (classArg?.type === 'selector' || classArg?.type === 'literal') {
        classArg = classArg.value;
      } else if (classArg?.type === 'identifier') {
        classArg = classArg.name;
      } else {
        classArg = await this.execute(args[0], context);
      }
      
      const keywordArg = await this.execute(args[1], context); // 'to' or 'from'
      let target = args[2];
      
      // console.log(`🔧 ${name.toUpperCase()} Evaluated:`, {
        // classArg,
        // keywordArg,
        // targetNode: { type: target?.type, value: (target as any)?.value || (target as any)?.name }
      // });
      
      // Extract target selector/element
      if (target?.type === 'identifier' && target.name === 'me') {
        target = context.me;
      } else if (target?.type === 'selector') {
        target = target.value;
      } else if (target?.type === 'identifier') {
        target = target.name;
      } else if (target?.type === 'literal') {
        target = target.value;
      } else {
        const evaluated = await this.execute(target, context);
        target = evaluated;
      }
      
      // console.log(`🔧 ${name.toUpperCase()} Final Args:`, { classArg, target });
      
      // Debug target resolution
      if (typeof target === 'string' && target.startsWith('#')) {
        const elements = document.querySelectorAll(target);
        // console.log(`🔍 Target resolution debug for "${target}":`, {
          // selector: target,
          // foundElements: elements.length,
          // elements: Array.from(elements)
        // });
      }
      
      // Enhanced commands expect [classExpression, target]
      evaluatedArgs = [classArg, target];
    } else if (name === 'set' && args.length >= 3) {
      // Handle "set X to Y" and "set the property of element to value" patterns
      // console.log(`🔧 SET Command Debug:`, {
        // name,
        // argsLength: args.length,
        // args: args.map(arg => ({ type: arg.type, value: (arg as any).value || (arg as any).name }))
      // });
      
      // Find the "to" keyword that separates target from value
      let toIndex = -1;
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.type === 'identifier' && (arg as any).name === 'to') {
          toIndex = i;
          break;
        }
      }
      
      // console.log(`🔧 SET: Found 'to' at index:`, toIndex);
      
      if (toIndex === -1) {
        // No "to" found, fall back to normal evaluation
        // console.log(`🔧 SET: No 'to' keyword found, falling back to normal evaluation`);
        evaluatedArgs = await Promise.all(
          args.map(arg => this.execute(arg, context))
        );
      } else {
        // Split into target (before "to") and value (after "to")
        const targetArgs = args.slice(0, toIndex);
        const valueArgs = args.slice(toIndex + 1);
        
        // console.log('🔧 SET: Target args debug - length:', targetArgs.length);
        targetArgs.forEach((arg, i) => {
          // console.log(`🔧 SET: Target arg ${i}:`, {
            // type: arg.type,
            // name: (arg as any).name,
            // value: (arg as any).value,
            // object: (arg as any).object,
            // property: (arg as any).property,
            // computed: (arg as any).computed
          // });
        });
        
        // Construct target path from multiple args
        let target;
        if (targetArgs.length === 1) {
          // Simple case: "set count to X"
          const targetArg = targetArgs[0];
          // console.log('🔧 SET: Processing single target arg:', {
            // type: targetArg.type,
            // name: (targetArg as any).name,
            // value: (targetArg as any).value,
            // fullNode: targetArg
          // });
          
          if (targetArg.type === 'identifier') {
            target = (targetArg as any).name;
            // console.log('🔧 SET: Set target from identifier:', target);
          } else if (targetArg.type === 'literal') {
            target = (targetArg as any).value;
            // console.log('🔧 SET: Set target from literal:', target);
          } else if (targetArg.type === 'memberExpression') {
            // Handle memberExpression like "my textContent"
            // console.log('🚨 SET: MEMBEREXPRESSION DETECTED - PROCESSING NOW!');
            const memberExpr = targetArg as any;
            const objectName = memberExpr.object?.name || memberExpr.object?.value;
            const propertyName = memberExpr.property?.name || memberExpr.property?.value;
            
            // console.log('🔧 SET: MemberExpression details:', { objectName, propertyName, fullObject: memberExpr });
            
            if (['my', 'me', 'its', 'it', 'your', 'you'].includes(objectName)) {
              target = `${objectName} ${propertyName}`;
              // console.log('🔧 SET: Converted memberExpression to possessive:', { objectName, propertyName, target });
            } else {
              // Not a possessive, evaluate normally
              // console.log('🔧 SET: Not a possessive memberExpression, evaluating normally');
              target = await this.execute(targetArg, context);
            }
          } else if (targetArg.type === 'propertyOfExpression') {
            // Handle "the X of Y" pattern
            // console.log('🚨 SET: PROPERTYOFEXPRESSION DETECTED - THE X OF Y PATTERN!');
            const propOfExpr = targetArg as any;
            const property = propOfExpr.property?.name || propOfExpr.property?.value;
            const selector = propOfExpr.target?.value || propOfExpr.target?.name;
            
            // console.log('🔧 SET: PropertyOfExpression details:', { 
              // property, 
              // selector, 
              // fullObject: propOfExpr 
            // });
            
            // Create the string format expected by Enhanced SET command
            target = `the ${property} of ${selector}`;
            // console.log('🔧 SET: Converted propertyOfExpression to string:', { target });
          } else {
            // Fallback: try to evaluate the target arg
            // console.log('🔧 SET: Fallback - evaluating target arg:', targetArg);
            target = await this.execute(targetArg, context);
            // console.log('🔧 SET: Fallback result:', target);
          }
          
          // Safety check - ensure target is not undefined
          if (target === undefined || target === null) {
            // console.error('🚨 SET: Target is undefined/null after processing!', {
              // targetArg,
              // targetArgType: targetArg?.type,
              // targetArgName: (targetArg as any)?.name,
              // targetArgValue: (targetArg as any)?.value
            // });
            throw new Error(`Invalid target type: ${typeof target}. Target arg: ${JSON.stringify(targetArg)}`);
          }
        } else if (targetArgs.length === 2 && 
                   (targetArgs[0].type === 'identifier' || targetArgs[0].type === 'context_var') && 
                   ['my', 'me', 'its', 'it', 'your', 'you'].includes((targetArgs[0] as any).name || (targetArgs[0] as any).value)) {
          // Handle possessive syntax: "my textContent", "its value", etc.
          const possessive = (targetArgs[0] as any).name;
          const property = (targetArgs[1] as any).name || (targetArgs[1] as any).value;
          target = `${possessive} ${property}`;
          // console.log('🔧 SET: Detected possessive syntax:', { possessive, property, target });
        } else if (targetArgs.length === 3 && 
                   targetArgs[0].type === 'selector' &&
                   targetArgs[1].type === 'identifier' && (targetArgs[1] as any).name === "'s" &&
                   targetArgs[2].type === 'identifier') {
          // Handle selector possessive syntax: "#element's property"
          const selector = (targetArgs[0] as any).value;
          const property = (targetArgs[2] as any).name;
          target = { element: selector, property: property };
          // console.log('🔧 SET: Detected selector possessive syntax:', { selector, property, target });
        } else {
          // Complex case: "set the textContent of #element to X"
          // Parse: ["the", "textContent", "of", "#element"] -> { element: "#element", property: "textContent" }
          let property = null;
          let element = null;
          
          // Look for property name (first identifier after "the")
          for (let i = 0; i < targetArgs.length; i++) {
            const arg = targetArgs[i];
            if (arg.type === 'identifier' && (arg as any).name !== 'the' && (arg as any).name !== 'of') {
              property = (arg as any).name;
              break;
            }
          }
          
          // Look for element selector
          for (let i = 0; i < targetArgs.length; i++) {
            const arg = targetArgs[i];
            if (arg.type === 'selector') {
              element = (arg as any).value;
              break;
            }
          }
          
          if (property && element) {
            // Create a structured target for property setting
            target = { element, property };
          } else {
            // Fallback to simple concatenation
            target = targetArgs.map(arg => {
              if (arg.type === 'identifier') return (arg as any).name;
              if (arg.type === 'selector') return (arg as any).value;
              if (arg.type === 'literal') return (arg as any).value;
              return arg;
            }).join('.');
          }
        }
        
        // Evaluate value expression
        let value;
        // Debug: Check if this is a function call
        const isFunctionCall = this.isSimpleFunctionCall(valueArgs);
        // console.log('🔧 SET: Function call check:', { 
          // count: valueArgs.length, 
          // isFunctionCall,
          // firstThreeTypes: valueArgs.slice(0, 3).map(arg => arg.type),
          // firstThreeValues: valueArgs.slice(0, 3).map(arg => (arg as any).name || (arg as any).value)
        // });
        if (isFunctionCall) {
          // console.log('🔧 SET: Function call detected for evaluation');
        }
        
        if (valueArgs.length === 1) {
          value = await this.execute(valueArgs[0], context);
        } else if (this.isSimpleFunctionCall(valueArgs)) {
          // Handle function calls like Date(), Math.max(1, 2, 3), etc.
          // console.log('🔧 SET: Detected function call pattern, evaluating as function');
          value = await this.evaluateFunctionCall(valueArgs, context);
        } else if (valueArgs.length === 3 && valueArgs[1].type === 'identifier') {
          // Check if this is a binary expression pattern: value + operator + value
          const operatorNode = valueArgs[1];
          const operator = (operatorNode as any).name || (operatorNode as any).value;
          
          if (['+', '-', '*', '/', 'mod'].includes(operator)) {
            // Evaluate as binary expression
            const leftValue = await this.execute(valueArgs[0], context);
            const rightValue = await this.execute(valueArgs[2], context);
            
            // console.log('🔧 SET: Evaluating binary expression:', { leftValue, operator, rightValue });
            
            // Perform the operation
            switch (operator) {
              case '+':
                value = leftValue + rightValue; // String concatenation or numeric addition
                break;
              case '-':
                value = Number(leftValue) - Number(rightValue);
                break;
              case '*':
                value = Number(leftValue) * Number(rightValue);
                break;
              case '/':
                value = Number(leftValue) / Number(rightValue);
                break;
              case 'mod':
                value = Number(leftValue) % Number(rightValue);
                break;
              default:
                // Fallback to joining
                const valueResults = await Promise.all(
                  valueArgs.map(arg => this.execute(arg, context))
                );
                value = valueResults.join(' ');
            }
          } else {
            // Not a binary operator, fall back to joining
            const valueResults = await Promise.all(
              valueArgs.map(arg => this.execute(arg, context))
            );
            value = valueResults.join(' ');
          }
        } else {
          // Multiple value args - evaluate each and join
          const valueResults = await Promise.all(
            valueArgs.map(arg => this.execute(arg, context))
          );
          value = valueResults.join(' ');
        }
        
        // console.log(`🔧 SET Final Args:`, { target, value, targetType: typeof target });
        evaluatedArgs = [target, value];
      }
    } else if ((name === 'show' || name === 'hide') && args.length >= 1) {
      // Handle "show #element" and "hide #element" patterns
      // For show/hide, the argument should be treated as a selector string, not evaluated as a query
      let target = args[0];

      console.log(`🔍 ${name.toUpperCase()} arg node:`, {
        type: target?.type,
        value: (target as any)?.value,
        name: (target as any)?.name
      });

      // Extract target selector/element
      if (target?.type === 'identifier' && (target as any).name === 'me') {
        target = context.me;
      } else if (target?.type === 'selector' || target?.type === 'id_selector' || target?.type === 'class_selector') {
        // Keep as selector string
        target = (target as any).value;
        console.log(`🔍 ${name.toUpperCase()} extracted selector string:`, target);
      } else if (target?.type === 'identifier') {
        target = (target as any).name;
      } else if (target?.type === 'literal') {
        target = (target as any).value;
      } else {
        const evaluated = await this.execute(target, context);
        target = evaluated;
        console.log(`🔍 ${name.toUpperCase()} evaluated target:`, target, 'type:', typeof target);
      }

      evaluatedArgs = [target];
      console.log(`🔍 ${name.toUpperCase()} final evaluatedArgs:`, evaluatedArgs);
    } else {
      // For other commands, evaluate all arguments normally
      evaluatedArgs = await Promise.all(
        args.map(arg => this.execute(arg, context))
      );
      if (name === 'show' || name === 'hide') {
        console.log(`🔍 ${name.toUpperCase()} evaluatedArgs:`, evaluatedArgs, 'types:', evaluatedArgs.map(arg => typeof arg));
      }
    }

    // Execute through enhanced adapter
    // console.log(`🚀 Executing enhanced ${name} command with:`, evaluatedArgs);
    
    // Debug for SET command to see what args we actually have
    if (name === 'set') {
      // console.log(`🔍 SET COMMAND DEBUG:`, { 
        // evaluatedArgsLength: evaluatedArgs.length,
        // evaluatedArgs: evaluatedArgs,
        // conditionCheck: evaluatedArgs.length >= 2,
        // willUseStructuredPath: name === 'set' && evaluatedArgs.length >= 2
      // });
    }
    
    // Debug for add/remove commands to see class parsing
    if ((name === 'add' || name === 'remove') && evaluatedArgs.length >= 1) {
      // console.log(`🔍 ${name.toUpperCase()} class argument type:`, typeof evaluatedArgs[0], evaluatedArgs[0]);
    }
    
    let result;
    if (name === 'set' && evaluatedArgs.length >= 2) {
      // SET command expects input object format
      const [target, value] = evaluatedArgs;
      // console.log('🔧 SET: Converting args to input object:', { target, value });
      
      // Handle complex target object (for "the X of Y" syntax)
      let inputTarget;
      if (target && typeof target === 'object' && 'element' in target && 'property' in target) {
        // Convert structured target to "the X of Y" string format
        inputTarget = `the ${target.property} of ${target.element}`;
      } else {
        inputTarget = target;
      }
      
      const input = { target: inputTarget, value, toKeyword: 'to' as const };
      // console.log('🔧 SET: Final input object:', input);
      result = await adapter.execute(context, input);
    } else if ((name === 'increment' || name === 'decrement') && evaluatedArgs.length >= 1) {
      // INCREMENT/DECREMENT commands expect input object format
      const [target, ...rest] = evaluatedArgs;
      // console.log(`🔧 ${name.toUpperCase()}: Converting args to input object:`, { target, rest });
      
      // Build input object for increment/decrement
      let input: any = { target };
      
      // Handle "by" amount syntax
      if (rest.length >= 2 && rest[0] === 'by' && typeof rest[1] === 'number') {
        input.amount = rest[1];
        input.byKeyword = 'by';
      } else if (rest.length === 1 && typeof rest[0] === 'number') {
        input.amount = rest[0];
      }
      
      // Handle global scope (detect from target string)
      if (typeof target === 'string' && target.startsWith('global ')) {
        input.target = target.replace('global ', '');
        input.scope = 'global';
      }
      
      // console.log(`🔧 ${name.toUpperCase()}: Final input object:`, input);
      result = await adapter.execute(context, input);
    } else {
      result = await adapter.execute(context, ...evaluatedArgs);
    }
    
    // console.log(`✅ Enhanced ${name} command completed with result:`, result);
    return result;
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

    if (name === 'show' || name === 'hide') {
      console.log(`🔍 ${name.toUpperCase()} COMMAND ENTRY:`, { name, args, argsLength: args?.length });
    }

    // Debug logging for all commands
    // console.log('🎯 Executing command:', name, 'with args:', args, 'at', new Date().toLocaleTimeString());
    
    // Special debug for SET commands
    if (name.toLowerCase() === 'set') {
      // console.log('🔧 SET Command Detailed Debug:', {
        // name,
        // argsLength: args.length,
        // args: args.map(arg => ({ 
          // type: arg.type, 
          // value: (arg as any).value || (arg as any).name || (arg as any).operator,
          // raw: arg
        // })),
        // useEnhancedCommands: this.options.useEnhancedCommands,
        // hasEnhancedSet: this.enhancedRegistry.has('set'),
        // enhancedCommands: this.enhancedRegistry.getCommandNames()
      // });
    }
    
    // Debug logging for put command
    if (name === 'put') {
      // console.log('🔧 PUT Command Debug:', {
        // name,
        // useEnhancedCommands: this.options.useEnhancedCommands,
        // hasEnhancedPut: this.enhancedRegistry.has('put'),
        // availableCommands: this.enhancedRegistry.getCommandNames()
      // });
    }
    
    // Try enhanced commands first if enabled
    if (this.options.useEnhancedCommands && this.enhancedRegistry.has(name.toLowerCase())) {
      // console.log(`🚀 Using enhanced command path for: ${name}`);
      // console.log(`🚀 Enhanced registry commands:`, this.enhancedRegistry.getCommandNames());
      return await this.executeEnhancedCommand(name.toLowerCase(), args || [], context);
    } else {
      // console.log(`🔄 Using legacy command path for: ${name} (enhanced available: ${this.enhancedRegistry.has(name.toLowerCase())})`);
      // console.log(`🔄 Enhanced registry commands:`, this.enhancedRegistry.getCommandNames());
    }
    
    // For now, let commands handle their own argument evaluation
    // This ensures compatibility with how the commands are designed
    const rawArgs = args || [];

    switch (name.toLowerCase()) {
      case 'hide': {
        // console.log('🔄 EXECUTING HIDE COMMAND CASE');
        // These commands expect evaluated args
        const hideArgs = await Promise.all(rawArgs.map((arg: ExpressionNode) => this.execute(arg, context)));
        return this.executeHideCommand(hideArgs, context);
      }
      
      case 'show': {
        // console.log('🔄 EXECUTING SHOW COMMAND CASE');
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
        // console.log('🔄 EXECUTING SET COMMAND CASE IN RUNTIME SWITCH');
        // console.log('🚨 SET command case reached in runtime switch - should not happen with enhanced commands!');
        // console.log('🚨 Enhanced commands enabled:', this.options.useEnhancedCommands);
        // console.log('🚨 Enhanced registry has SET:', this.enhancedRegistry.has('set'));
        // console.log('🚨 Available enhanced commands:', this.enhancedRegistry.getCommandNames());
        // This should not be reached since SET command should go through enhanced registry
        throw new Error('SET command should be handled by enhanced registry');
      }
      
      case 'log': {
        // console.log('🚨 LOG command case reached in runtime switch - should not happen with enhanced commands!');
        // This should not be reached since LOG command should go through enhanced registry
        throw new Error('LOG command should be handled by enhanced registry');
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
    console.log('🔍 HIDE DEBUG:', { args, argsLength: args.length, firstArgType: typeof args[0], firstArg: args[0] });
    // When we have args like "hide me", the first arg is the evaluated "me" identifier
    // When we have no args like "hide", use context.me directly
    const target = args.length > 0 ? args[0] : context.me;

    if (!target) {
      throw new Error('Context element "me" is null');
    }

    if (this.isElement(target)) {
      console.log('🔍 HIDE: hiding element directly');
      target.style.display = 'none';
    } else if (typeof target === 'string') {
      console.log('🔍 HIDE: querying and hiding elements with selector:', target);
      // Selector string - query and hide elements
      const elements = this.queryElements(target, context);
      console.log('🔍 HIDE: found elements:', elements.length);
      elements.forEach(el => el.style.display = 'none');
    } else {
      console.log('🔍 HIDE: target is neither element nor string, type:', typeof target, target);
    }
  }

  /**
   * Execute show command
   */
  private executeShowCommand(args: unknown[], context: ExecutionContext): void {
    console.log('🔍 SHOW DEBUG:', { args, argsLength: args.length, firstArgType: typeof args[0], firstArg: args[0] });
    const target = args.length > 0 ? args[0] : context.me;

    if (!target) {
      throw new Error('Context element "me" is null');
    }

    if (this.isElement(target)) {
      console.log('🔍 SHOW: showing element directly');
      target.style.display = 'block';
    } else if (typeof target === 'string') {
      console.log('🔍 SHOW: querying and showing elements with selector:', target);
      // Selector string - query and show elements
      const elements = this.queryElements(target, context);
      console.log('🔍 SHOW: found elements:', elements.length);
      elements.forEach(el => el.style.display = 'block');
    } else {
      console.log('🔍 SHOW: target is neither element nor string, type:', typeof target, target);
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
    // console.log('🚀 RUNTIME: executePutCommand started', { 
      // argCount: rawArgs.length,
      // rawArgs: rawArgs.map(arg => ({ 
        // type: arg?.type, 
        // value: (arg as any)?.value || (arg as any)?.name,
        // raw: arg
      // })),
      // contextMe: context.me?.tagName || context.me?.constructor?.name
    // });
    
    // Process arguments: find content, preposition, and target
    let contentArg = null;
    let prepositionArg = null;
    let targetArg = null;
    
    // Find the preposition keyword to split the arguments
    let prepositionIndex = -1;
    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      if (arg?.type === 'literal' && 
          ['into', 'before', 'after', 'at'].includes(arg.value as string)) {
        prepositionIndex = i;
        prepositionArg = arg.value;
        break;
      }
    }
    
    if (prepositionIndex === -1) {
      // console.log('⚠️ RUNTIME: no preposition found in put command args');
      // Fallback to old logic
      if (rawArgs.length >= 3) {
        contentArg = rawArgs[0];
        prepositionArg = rawArgs[1];
        targetArg = rawArgs[2];
      }
    } else {
      // Split arguments around the preposition
      const contentArgs = rawArgs.slice(0, prepositionIndex);
      const targetArgs = rawArgs.slice(prepositionIndex + 1);
      
      // Use first content arg (or combine if multiple)
      contentArg = contentArgs.length === 1 ? contentArgs[0] : contentArgs[0];
      targetArg = targetArgs.length === 1 ? targetArgs[0] : targetArgs[0];
    }
    
    if (contentArg && prepositionArg && targetArg) {
      const content = await this.execute(contentArg, context);
      // console.log('🔍 RUNTIME: evaluated content', { content, type: typeof content });
      
      const preposition = prepositionArg;
      // console.log('🔍 RUNTIME: using preposition', { preposition, type: typeof preposition });
      
      let target = targetArg;
      // console.log('🔍 RUNTIME: target before processing', { 
        // target, 
        // type: target?.type,
        // name: (target as any)?.name,
        // value: (target as any)?.value
      // });
      
      // Handle target resolution - fix the [object Object] issue
      if (target?.type === 'identifier' && (target as any).name === 'me') {
        target = context.me;
        // console.log('🔍 RUNTIME: resolved "me" to context.me', { target });
      } else if (target?.type === 'identifier') {
        // For other identifiers, keep as string for CSS selector or context lookup
        target = (target as any).name;
        // console.log('🔍 RUNTIME: resolved identifier to name', { target });
      } else if (target?.type === 'literal') {
        target = (target as any).value;
        // console.log('🔍 RUNTIME: resolved literal to value', { target });
      } else if (target?.type === 'selector') {
        target = (target as any).value;
        // console.log('🔍 RUNTIME: resolved selector to value', { target });
      } else {
        // Only evaluate if it's not already a target we can handle
        if (typeof target === 'object' && target?.type) {
          target = await this.execute(target, context);
          // console.log('🔍 RUNTIME: evaluated complex target', { target });
        }
      }
      
      // console.log('✅ RUNTIME: calling putCommand.execute', { content, preposition, target });
      return this.putCommand.execute(context, content, preposition, target);
    }
    
    // console.log('⚠️ RUNTIME: fallback to raw args', { rawArgs });
    // Fallback: use raw args
    return this.putCommand.execute(context, ...rawArgs);
  }


  /**
   * Execute LOG command - output values to console
   */
  private executeLogCommand(args: unknown[], _context: ExecutionContext): void {
    // If no arguments, just log empty
    if (args.length === 0) {
      // console.log();
      return;
    }
    
    // Log all arguments
    // console.log(...args);
  }

  /**
   * Execute BEEP command - debugging output with enhanced formatting
   */
  private executeBeepCommand(args: unknown[], context: ExecutionContext): void {
    // If no arguments, beep with context info
    if (args.length === 0) {
      console.group('🔔 Beep! Hyperscript Context Debug');
      // console.log('me:', context.me);
      // console.log('it:', context.it);
      // console.log('you:', context.you);
      // console.log('locals:', context.locals);
      // console.log('globals:', context.globals);
      // console.log('variables:', context.variables);
      console.groupEnd();
      return;
    }
    
    // Debug each argument with enhanced formatting
    args.forEach((value, index) => {
      console.group(`🔔 Beep! Argument ${index + 1}`);
      // console.log('Value:', value);
      // console.log('Type:', this.getDetailedType(value));
      // console.log('Representation:', this.getSourceRepresentation(value));
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
   * Check if valueArgs represent a simple function call pattern like Date() or Math.max(1,2,3)
   */
  private isSimpleFunctionCall(valueArgs: ASTNode[]): boolean {
    if (valueArgs.length < 2) return false;
    
    // Pattern 1: identifier + opening parenthesis + closing parenthesis (e.g., Date())
    if (valueArgs.length === 3 &&
        valueArgs[0].type === 'identifier' &&
        (valueArgs[1] as any).value === '(' &&
        (valueArgs[2] as any).value === ')') {
      return true;
    }
    
    // Pattern 2: identifier + combined parentheses (e.g., Date + "()")
    if (valueArgs.length === 2 &&
        valueArgs[0].type === 'identifier' &&
        ((valueArgs[1] as any).value === ')' || (valueArgs[1] as any).name === ')')) {
      // console.log('🔧 SET: Found 2-token function pattern:', {
        // functionName: (valueArgs[0] as any).name,
        // secondToken: (valueArgs[1] as any).value || (valueArgs[1] as any).name
      // });
      return true;
    }
    
    // Pattern 3: Constructor call with 'new' keyword (e.g., new Date())
    if (this.isConstructorCall(valueArgs)) {
      // console.log('🔧 SET: Found constructor call pattern');
      return true;
    }
    
    // Pattern 4: Method call with arguments (e.g., Math.max(1, 5, 3))
    if (this.isMathMethodCall(valueArgs)) {
      // console.log('🔧 SET: Found Math method call pattern');
      return true;
    }
    
    return false;
  }

  /**
   * Check if this is a constructor call with 'new' keyword (e.g., new Date())
   */
  private isConstructorCall(valueArgs: ASTNode[]): boolean {
    if (valueArgs.length < 3) return false;
    
    // Debug the first few tokens
    // console.log('🔧 SET: Checking constructor pattern:', {
      // token0: { type: valueArgs[0].type, name: (valueArgs[0] as any).name, value: (valueArgs[0] as any).value },
      // token1: { type: valueArgs[1].type, name: (valueArgs[1] as any).name, value: (valueArgs[1] as any).value },
      // token2: { type: valueArgs[2].type, name: (valueArgs[2] as any).name, value: (valueArgs[2] as any).value }
    // });
    
    // Pattern: new + identifier + ) (e.g., new Date())
    // Check for different ways 'new' might be tokenized
    const firstToken = valueArgs[0];
    const isNewKeyword = (firstToken.type === 'keyword' && (firstToken as any).name === 'new') ||
                        (firstToken.type === 'identifier' && (firstToken as any).name === 'new') ||
                        ((firstToken as any).value === 'new');
    
    if (valueArgs.length === 3 &&
        isNewKeyword &&
        valueArgs[1].type === 'identifier' &&
        ((valueArgs[2] as any).value === ')' || (valueArgs[2] as any).name === ')')) {
      // console.log('🔧 SET: Constructor pattern matched!');
      return true;
    }
    
    return false;
  }

  /**
   * Check if this is a Math method call like Math.max(1, 5, 3)
   */
  private isMathMethodCall(valueArgs: ASTNode[]): boolean {
    if (valueArgs.length < 4) return false;
    
    // Debug the first few tokens
    // console.log('🔧 SET: Checking Math method pattern:', {
      // token0: { type: valueArgs[0].type, name: (valueArgs[0] as any).name, value: (valueArgs[0] as any).value },
      // token1: { type: valueArgs[1].type, name: (valueArgs[1] as any).name, value: (valueArgs[1] as any).value },
      // token2: { type: valueArgs[2].type, name: (valueArgs[2] as any).name, value: (valueArgs[2] as any).value },
      // lastToken: { type: valueArgs[valueArgs.length - 1].type, name: (valueArgs[valueArgs.length - 1] as any).name, value: (valueArgs[valueArgs.length - 1] as any).value }
    // });
    
    // Look for pattern: Math . methodName [args...] )
    if (valueArgs.length >= 4 &&
        valueArgs[0].type === 'identifier' && (valueArgs[0] as any).name === 'Math' &&
        ((valueArgs[1] as any).value === '.' || (valueArgs[1] as any).name === '.') &&
        valueArgs[2].type === 'identifier' &&
        ((valueArgs[valueArgs.length - 1] as any).value === ')' || (valueArgs[valueArgs.length - 1] as any).name === ')')) {
      // console.log('🔧 SET: Math method pattern matched!');
      return true;
    }
    
    return false;
  }

  /**
   * Evaluate a Math method call like Math.max(1, 5, 3)
   */
  private evaluateMathMethodCall(valueArgs: ASTNode[]): any {
    try {
      // Pattern: Math . methodName [args...] )
      const methodName = (valueArgs[2] as any).name;
      // console.log('🔧 SET: Evaluating Math method call:', methodName);
      
      // Extract arguments (everything between methodName and closing parenthesis)
      const argTokens = valueArgs.slice(3, -1); // Skip Math, ., methodName, and closing )
      const args: number[] = [];
      
      // console.log('🔧 SET: Raw arg tokens:', argTokens.map(token => ({
        // type: token.type,
        // name: (token as any).name,
        // value: (token as any).value
      // })));
      
      // Parse numeric arguments from tokens
      for (const token of argTokens) {
        const tokenValue = (token as any).name || (token as any).value;
        // console.log('🔧 SET: Processing token:', { type: token.type, tokenValue, isNumber: !isNaN(Number(tokenValue)) });
        
        if (token.type === 'number' || token.type === 'literal' || (token.type === 'identifier' && !isNaN(Number(tokenValue)))) {
          const value = (token.type === 'number' || token.type === 'literal') ? 
                        (token as any).value : Number(tokenValue);
          args.push(value);
          // console.log('🔧 SET: Added arg:', value);
        }
      }
      
      // console.log('🔧 SET: Math method args:', args);
      
      // Call the Math method
      const mathMethod = (Math as any)[methodName];
      if (typeof mathMethod === 'function') {
        const result = mathMethod(...args);
        // console.log('🔧 SET: Math method result:', result);
        return result;
      } else {
        console.warn('🔧 SET: Math method not found:', methodName);
        return `Math.${methodName}(${args.join(', ')})`;
      }
    } catch (error) {
      // console.error('🔧 SET: Math method call error:', error);
      return `Math.${(valueArgs[2] as any).name}(...)`;
    }
  }

  /**
   * Evaluate a constructor call with 'new' keyword like new Date()
   */
  private evaluateConstructorCall(valueArgs: ASTNode[]): any {
    try {
      // Pattern: new + constructorName + ) (e.g., new Date())
      const constructorName = (valueArgs[1] as any).name;
      // console.log('🔧 SET: Evaluating constructor call:', constructorName);
      
      // Try to resolve the constructor from global context
      const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                       (typeof window !== 'undefined' ? window : global);
      
      const constructor = (globalObj as any)[constructorName];
      if (typeof constructor === 'function') {
        const result = new constructor();
        // console.log('🔧 SET: Constructor call result:', result);
        return result;
      } else {
        console.warn('🔧 SET: Constructor not found:', constructorName);
        return `new ${constructorName}()`;
      }
    } catch (error) {
      // console.error('🔧 SET: Constructor call error:', error);
      return `new ${(valueArgs[1] as any).name}()`;
    }
  }

  /**
   * Evaluate a function call from parsed tokens
   */
  private async evaluateFunctionCall(valueArgs: ASTNode[], context: ExecutionContext): Promise<any> {
    // Handle constructor calls with 'new' keyword
    if (this.isConstructorCall(valueArgs)) {
      return this.evaluateConstructorCall(valueArgs);
    }
    
    // Handle Math method calls
    if (this.isMathMethodCall(valueArgs)) {
      return this.evaluateMathMethodCall(valueArgs);
    }
    
    if (valueArgs.length === 3 || valueArgs.length === 2) {
      // Simple function call: functionName() (either 3 tokens or 2 tokens)
      const functionName = (valueArgs[0] as any).name;
      // console.log('🔧 SET: Evaluating function call:', functionName);
      
      try {
        // Try to resolve the function from global context
        const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                         (typeof window !== 'undefined' ? window : global);
        
        const func = (globalObj as any)[functionName];
        if (typeof func === 'function') {
          const result = func();
          // console.log('🔧 SET: Function call result:', result);
          return result;
        } else {
          console.warn('🔧 SET: Function not found:', functionName);
          return `${functionName}()`;
        }
      } catch (error) {
        // console.error('🔧 SET: Function call error:', error);
        return `${functionName}()`;
      }
    }
    
    // Fallback to string concatenation
    const results = await Promise.all(
      valueArgs.map(arg => this.execute(arg, context))
    );
    return results.join(' ');
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