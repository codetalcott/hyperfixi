/**
 * Behavior Registry Implementation
 * Manages behavior definitions and instances
 */

import type { 
  BehaviorDefinition, 
  BehaviorInstance, 
  BehaviorRegistry as IBehaviorRegistry 
} from './types.js';
import { getDefaultOnFeature } from '../on.js';
import type { ExecutionContext } from '../../types/core.js';

export class BehaviorRegistry implements IBehaviorRegistry {
  private definitions = new Map<string, BehaviorDefinition>();
  private instances = new WeakMap<HTMLElement, Map<string, BehaviorInstance>>();

  define(behavior: BehaviorDefinition): void {
    this.definitions.set(behavior.name, behavior);
  }

  get(name: string): BehaviorDefinition | undefined {
    return this.definitions.get(name);
  }

  async install(behaviorName: string, element: HTMLElement, parameters?: Record<string, any>): Promise<BehaviorInstance> {
    const definition = this.definitions.get(behaviorName);
    if (!definition) {
      throw new Error(`Behavior "${behaviorName}" is not defined`);
    }

    // Create parameter map with defaults
    const parameterValues = new Map<string, any>();
    
    // Set provided parameters
    if (parameters) {
      for (const [key, value] of Object.entries(parameters)) {
        parameterValues.set(key, value);
      }
    }

    // Create behavior instance
    const instance: BehaviorInstance = {
      definition,
      element,
      parameterValues,
      isInitialized: false,
      eventListeners: new Map()
    };

    // Store instance on element
    if (!this.instances.has(element)) {
      this.instances.set(element, new Map());
    }
    this.instances.get(element)!.set(behaviorName, instance);

    // Execute init block if present
    if (definition.initBlock) {
      await this.executeInitBlock(instance);
    }

    // Install event handlers
    await this.installEventHandlers(instance);

    instance.isInitialized = true;
    return instance;
  }

  uninstall(behaviorName: string, element: HTMLElement): void {
    const elementInstances = this.instances.get(element);
    if (!elementInstances) {
      return;
    }

    const instance = elementInstances.get(behaviorName);
    if (!instance) {
      return;
    }

    const onFeature = getDefaultOnFeature();

    // Remove event listeners using OnFeature
    for (const [listenerKey, listenerId] of instance.eventListeners) {
      if (typeof listenerId === 'string') {
        onFeature.unregister(listenerId);
      }
    }

    // Remove instance
    elementInstances.delete(behaviorName);
    
    // Clean up if no more instances
    if (elementInstances.size === 0) {
      this.instances.delete(element);
    }
  }

  getInstalled(element: HTMLElement): BehaviorInstance[] {
    const elementInstances = this.instances.get(element);
    if (!elementInstances) {
      return [];
    }
    return Array.from(elementInstances.values());
  }

  private async executeInitBlock(instance: BehaviorInstance): Promise<void> {
    const { definition, element, parameterValues } = instance;
    
    if (!definition.initBlock) {
      return;
    }

    const onFeature = getDefaultOnFeature();

    // Create execution context with behavior parameters
    const context: ExecutionContext = {
      me: element,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals: new Map(),
      flags: { halted: false, breaking: false, continuing: false, returning: false, async: false },
    };

    // Add behavior parameters to context
    for (const [key, value] of parameterValues) {
      context.locals.set(key, value);
    }

    // Convert commands to AST format and execute them
    const commands = definition.initBlock.commands.map(cmd => this.convertToASTCommand(cmd));
    
    // Create a fake event for init execution
    const initEvent = new CustomEvent('init', { detail: { source: 'behavior-init' } });
    
    await onFeature.handleEvent(initEvent, commands, context);
  }

  private async installEventHandlers(instance: BehaviorInstance): Promise<void> {
    const { definition, element } = instance;
    const onFeature = getDefaultOnFeature();

    for (const handler of definition.eventHandlers) {
      // Convert hyperscript commands to AST command nodes
      const commands = handler.commands.map(cmd => this.convertToASTCommand(cmd));
      
      // Create execution context for behavior
      const context: ExecutionContext = {
        me: element,
        it: null,
        you: null,
        result: null,
        locals: new Map(),
        globals: new Map(),
        flags: { halted: false, breaking: false, continuing: false, returning: false, async: false },
      };

      // Add behavior parameters to context
      for (const [key, value] of instance.parameterValues) {
        context.locals.set(key, value);
      }
      
      // Determine event target (element or specified source)
      const eventTarget = handler.eventSource 
        ? this.resolveEventSource(handler.eventSource, element, instance.parameterValues)
        : element;

      // Use OnFeature to register the event handler
      const listenerId = onFeature.register(eventTarget as HTMLElement, handler.event, commands, context);
      
      // Store listener ID for cleanup
      const listenerKey = `${handler.event}-${definition.name}`;
      instance.eventListeners.set(listenerKey, listenerId as any);
    }
  }

  /**
   * Convert hyperscript command string to AST command node for OnFeature
   */
  private convertToASTCommand(command: any): any {
    if (typeof command === 'string') {
      // Parse basic command patterns
      const trimmed = command.trim();
      
      // Handle "increment my.property"
      if (trimmed.startsWith('increment my.')) {
        const property = trimmed.replace('increment my.', '');
        return {
          type: 'command',
          name: 'increment',
          args: [{ type: 'property', target: { type: 'identifier', name: 'me' }, property }]
        };
      }
      
      // Handle "put X into Y"
      if (trimmed.includes('put ') && trimmed.includes(' into ')) {
        const match = trimmed.match(/put (.+) into (.+)/);
        if (match) {
          return {
            type: 'command',
            name: 'put',
            args: [
              this.parseExpression(match[1].trim()),
              this.parseExpression(match[2].trim())
            ]
          };
        }
      }
      
      // Handle "set my.property to value"
      if (trimmed.includes('set my.') && trimmed.includes(' to ')) {
        const match = trimmed.match(/set my\.(\w+) to (.+)/);
        if (match) {
          return {
            type: 'command',
            name: 'set',
            args: [
              { type: 'property', target: { type: 'identifier', name: 'me' }, property: match[1] },
              this.parseExpression(match[2].trim())
            ]
          };
        }
      }
      
      // Handle "toggle .class on me"
      if (trimmed.includes('toggle .') && trimmed.includes(' on me')) {
        const match = trimmed.match(/toggle \.(\w+) on me/);
        if (match) {
          return {
            type: 'command',
            name: 'toggle',
            args: [{ type: 'literal', value: match[1] }]
          };
        }
      }
      
      // Handle "add .class to me"
      if (trimmed.includes('add .') && trimmed.includes(' to me')) {
        const match = trimmed.match(/add \.(\w+) to me/);
        if (match) {
          return {
            type: 'command',
            name: 'add',
            args: [{ type: 'literal', value: match[1] }]
          };
        }
      }
      
      // Handle "remove .class from me"
      if (trimmed.includes('remove .') && trimmed.includes(' from me')) {
        const match = trimmed.match(/remove \.(\w+) from me/);
        if (match) {
          return {
            type: 'command',
            name: 'remove',
            args: [{ type: 'literal', value: match[1] }]
          };
        }
      }
      
      // Handle basic commands like "log message"
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 1) {
        const commandName = parts[0];
        const args = parts.slice(1).map(arg => this.parseExpression(arg));
        
        return {
          type: 'command',
          name: commandName,
          args
        };
      }
    }
    
    return command;
  }
  
  /**
   * Parse expression into AST node
   */
  private parseExpression(expr: string): any {
    const trimmed = expr.trim();
    
    // Handle quoted strings
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return { type: 'literal', value: trimmed.slice(1, -1) };
    }
    
    // Handle numbers
    if (/^\d+$/.test(trimmed)) {
      return { type: 'literal', value: parseInt(trimmed) };
    }
    
    // Handle property access like "my.property"
    if (trimmed.startsWith('my.')) {
      const property = trimmed.slice(3);
      return { type: 'property', target: { type: 'identifier', name: 'me' }, property };
    }
    
    // Handle identifiers
    return { type: 'identifier', name: trimmed };
  }

  private resolveEventSource(eventSource: string, contextElement: HTMLElement, parameterValues?: Map<string, any>): EventTarget {
    // Handle different event source formats:
    // - CSS selectors (#id, .class, element)  
    // - Parameter references (removeButton)
    // - Special keywords (me, document, window)

    if (eventSource === 'me') {
      return contextElement;
    }

    if (eventSource === 'document') {
      return document;
    }

    if (eventSource === 'window') {
      return window;
    }

    // Check if it's a parameter reference
    if (parameterValues && parameterValues.has(eventSource)) {
      const element = parameterValues.get(eventSource);
      if (element && element.addEventListener) {
        return element;
      }
    }

    // Try CSS selector
    if (eventSource.startsWith('#') || eventSource.startsWith('.') || eventSource.includes('[')) {
      const element = document.querySelector(eventSource);
      if (element) {
        return element;
      }
    }

    // Default to context element if source not found
    return contextElement;
  }
}

// Global registry instance
export const globalBehaviorRegistry = new BehaviorRegistry();