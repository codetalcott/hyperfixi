/**
 * Behavior Registry Implementation
 * Manages behavior definitions and instances
 */

import type { 
  BehaviorDefinition, 
  BehaviorInstance, 
  BehaviorRegistry as IBehaviorRegistry 
} from './types.js';

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

    // Remove event listeners
    for (const [listenerKey, listener] of instance.eventListeners) {
      const eventType = listenerKey.split('-')[0];
      element.removeEventListener(eventType, listener);
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

    // Create execution context with behavior parameters
    const context = this.createBehaviorContext(element, parameterValues);

    // Execute init commands sequentially
    for (const command of definition.initBlock.commands) {
      if (typeof command === 'string') {
        // Handle multi-line commands (split and execute each)
        const commandLines = command.split('\n').map(line => line.trim()).filter(line => line);
        for (const line of commandLines) {
          await this.executeCommand(line, context);
        }
      } else {
        await this.executeCommand(command, context);
      }
    }
  }

  private async installEventHandlers(instance: BehaviorInstance): Promise<void> {
    const { definition, element } = instance;

    for (const handler of definition.eventHandlers) {
      const listener = await this.createEventListener(instance, handler);
      
      // Determine event target (element or specified source)
      const eventTarget = handler.eventSource 
        ? this.resolveEventSource(handler.eventSource, element, instance.parameterValues)
        : element;

      eventTarget.addEventListener(handler.event, listener);
      
      // Store listener with unique key to handle multiple behaviors
      const listenerKey = `${handler.event}-${definition.name}`;
      instance.eventListeners.set(listenerKey, listener);
    }
  }

  private async createEventListener(
    instance: BehaviorInstance, 
    handler: EventHandlerDefinition
  ): Promise<EventListener> {
    return async (event: Event) => {
      try {
        const context = this.createBehaviorContext(
          instance.element, 
          instance.parameterValues,
          { event, it: event }
        );

        // Execute handler commands sequentially
        console.log('Executing behavior commands:', handler.commands);
        for (const command of handler.commands) {
          if (typeof command === 'string') {
            console.log('Executing command:', command);
            await this.executeCommand(command, context);
          }
        }
      } catch (error) {
        console.error('Error in behavior event handler:', error);
      }
    };
  }

  private createBehaviorContext(
    element: HTMLElement, 
    parameterValues: Map<string, any>,
    additionalContext?: Record<string, any>
  ): any {
    const context = {
      me: element,
      ...additionalContext
    };

    // Add parameter values to context
    for (const [key, value] of parameterValues) {
      context[key] = value;
    }

    return context;
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
      const paramValue = parameterValues.get(eventSource);
      if (paramValue && paramValue.addEventListener) {
        return paramValue;
      }
    }

    // Try as CSS selector
    const element = document.querySelector(eventSource);
    if (element) {
      return element;
    }

    // Default to context element if source not found
    return contextElement;
  }

  private async executeCommand(command: any, context: any): Promise<void> {
    // This is a placeholder - in real implementation, this would delegate
    // to the hyperscript command execution system
    
    if (typeof command === 'string') {
      // Mock implementation for testing
      await this.mockExecuteHyperscriptCommand(command, context);
    }
  }

  private async mockExecuteHyperscriptCommand(command: string, context: any): Promise<void> {
    // Mock implementation for testing purposes
    // This simulates hyperscript command execution
    
    const element = context.me;
    
    // Handle common commands for testing
    if (command.includes('set my.') && command.includes('to')) {
      const match = command.match(/set my\.(\w+) to (.+)/);
      if (match) {
        const property = match[1];
        const value = this.evaluateMockExpression(match[2], context);
        (element as any)[property] = value;
      }
    } else if (command.includes('increment my.')) {
      const match = command.match(/increment my\.(\w+)/);
      if (match) {
        const property = match[1];
        (element as any)[property] = ((element as any)[property] || 0) + 1;
      }
    } else if (command.includes('put') && command.includes('into me')) {
      const match = command.match(/put (.+) into me/);
      if (match) {
        const value = this.evaluateMockExpression(match[1], context);
        element.textContent = String(value);
      }
    } else if (command.includes('add .') && command.includes('to me')) {
      const match = command.match(/add \.(\w+) to me/);
      if (match) {
        element.classList.add(match[1]);
      }
    } else if (command.includes('remove .') && command.includes('from me')) {
      const match = command.match(/remove \.(\w+) from me/);
      if (match) {
        element.classList.remove(match[1]);
      }
    } else if (command.includes('remove me')) {
      element.remove();
    } else if (command.includes('toggle') && command.includes('on')) {
      const match = command.match(/toggle (?:the )?(.+) on (.+)/);
      if (match) {
        const className = this.evaluateMockExpression(match[1], context);
        const targetElement = this.evaluateMockExpression(match[2], context);
        if (targetElement && targetElement.classList) {
          targetElement.classList.toggle(className);
        }
      }
    } else if (command.includes('toggle ') && command.includes(' on me')) {
      const match = command.match(/toggle (?:the )?(.+) on me/);
      if (match) {
        const className = this.evaluateMockExpression(match[1], context);
        context.me.classList.toggle(className);
      }
    } else if (command.includes('log')) {
      const match = command.match(/log (.+)/);
      if (match) {
        const value = this.evaluateMockExpression(match[1], context);
        console.log(value);
      }
    } else if (command.includes('if no ') && command.includes('set')) {
      // Handle "if no param set param to value"
      const match = command.match(/if no (\w+) set (?:the )?(\w+) to (.+)/);
      if (match) {
        const checkParam = match[1];
        const setParam = match[2];
        const value = this.evaluateMockExpression(match[3], context);
        
        if (!context[checkParam] || context[checkParam] === undefined || context[checkParam] === null) {
          context[setParam] = value;
        }
      }
    } else if (command.includes('if ') && command.includes('matches')) {
      // Handle "if element matches Element then add .valid to me else add .invalid to me"
      const match = command.match(/if (\w+) matches (\w+) then (.+) else (.+)/);
      if (match) {
        const element = context[match[1]];
        const type = match[2];
        const thenCommand = match[3];
        const elseCommand = match[4];
        
        // Simple type checking for testing
        const isElementType = element && element.nodeType === Node.ELEMENT_NODE;
        
        if (type === 'Element' && isElementType) {
          await this.mockExecuteHyperscriptCommand(thenCommand, context);
        } else {
          await this.mockExecuteHyperscriptCommand(elseCommand, context);
        }
      }
    } else if (command.includes('wait') && command.includes('then')) {
      // Handle "wait X ms then Y"
      const match = command.match(/wait (.+) ms then (.+)/);
      if (match) {
        const timeExpr = match[1];
        const thenCommand = match[2];
        const timeout = this.evaluateMockExpression(timeExpr, context);
        
        setTimeout(() => {
          this.mockExecuteHyperscriptCommand(thenCommand, context);
        }, timeout);
      }
    } else if (command.includes('add (') && command.includes('to me')) {
      // Handle "add ("class-" + value) to me"
      const match = command.match(/add \((.+)\) to me/);
      if (match) {
        const classExpr = match[1];
        const className = this.evaluateMockExpression(classExpr, context);
        element.classList.add(className);
      }
    }
  }

  private evaluateMockExpression(expression: string, context: any): any {
    // Mock expression evaluation for testing
    expression = expression.trim();
    
    if (expression.startsWith('"') && expression.endsWith('"')) {
      return expression.slice(1, -1);
    }
    
    if (expression.startsWith('my.')) {
      const property = expression.slice(3);
      return (context.me as any)[property];
    }
    
    if (expression === 'Date.now()') {
      return Date.now();
    }
    
    if (expression === 'me') {
      return context.me;
    }
    
    // Handle numbers
    if (/^\d+$/.test(expression)) {
      return parseInt(expression);
    }
    
    // Handle boolean literals  
    if (expression === 'true') {
      return true;
    }
    if (expression === 'false') {
      return false;
    }
    
    if (context.hasOwnProperty(expression)) {
      return context[expression];
    }
    
    // Handle string concatenation
    if (expression.includes(' + ')) {
      const parts = expression.split(' + ').map(part => {
        part = part.trim();
        if (part.startsWith('"') && part.endsWith('"')) {
          return part.slice(1, -1);
        }
        if (part.startsWith('my.')) {
          return (context.me as any)[part.slice(3)];
        }
        if (context.hasOwnProperty(part)) {
          return context[part];
        }
        return part;
      });
      return parts.join('');
    }
    
    return expression;
  }
}

// Global registry instance
export const globalBehaviorRegistry = new BehaviorRegistry();