/**
 * Web Worker Registry Implementation
 * Manages Web Worker connections and message handling
 */

import type { 
  WebWorkerDefinition, 
  WebWorkerInstance, 
  WebWorkerStub,
  WebWorkerListener,
  WebWorkerRegistry as IWebWorkerRegistry,
  MessageHandlerDefinition
} from './types.js';

export class WebWorkerRegistry implements IWebWorkerRegistry {
  private definitions = new Map<string, WebWorkerDefinition>();
  private instances = new Map<string, WebWorkerInstance>();

  define(webWorker: WebWorkerDefinition): WebWorkerStub {
    this.definitions.set(webWorker.name, webWorker);
    
    // Create the stub object similar to EventSource implementation
    const stub = this.createWebWorkerStub(webWorker);
    
    // If script URL is provided, connect immediately
    if (webWorker.scriptUrl) {
      stub.open(webWorker.scriptUrl);
    }
    
    // Store instance
    this.instances.set(webWorker.name, {
      definition: webWorker,
      stub,
      isConnected: false
    });
    
    return stub;
  }

  get(name: string): WebWorkerInstance | undefined {
    return this.instances.get(name);
  }

  async connect(name: string, scriptUrl?: string): Promise<WebWorkerStub> {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new Error(`WebWorker "${name}" is not defined`);
    }

    // Return existing instance if already defined
    const existing = this.instances.get(name);
    if (existing) {
      if (scriptUrl) {
        existing.stub.open(scriptUrl);
      }
      return existing.stub;
    }

    // Create new stub and connect
    const stub = this.createWebWorkerStub(definition);
    if (scriptUrl || definition.scriptUrl) {
      stub.open(scriptUrl || definition.scriptUrl!);
    }
    
    this.instances.set(name, {
      definition,
      stub,
      isConnected: false
    });
    
    return stub;
  }

  disconnect(name: string): void {
    const instance = this.instances.get(name);
    if (instance) {
      instance.stub.close();
      this.instances.delete(name);
    }
  }

  private createWebWorkerStub(definition: WebWorkerDefinition): WebWorkerStub {
    const stub: WebWorkerStub = {
      worker: null,
      listeners: [],
      messageQueue: [],
      
      open: (scriptUrl?: string) => {
        // Calculate URL if not provided
        if (scriptUrl === undefined) {
          if (definition.scriptUrl) {
            scriptUrl = definition.scriptUrl;
          } else {
            throw new Error('No script URL defined for WebWorker');
          }
        }

        // Guard multiple opens on the same worker
        if (stub.worker) {
          // If we're opening a new script, terminate the old one first
          if (scriptUrl !== definition.scriptUrl) {
            stub.worker.terminate();
          } else {
            // Already have the right worker
            return;
          }
        }

        // Create the worker
        stub.worker = new Worker(scriptUrl);

        // Set up event listeners
        this.setupWebWorkerListeners(stub, definition);
        
        // Send any queued messages
        while (stub.messageQueue.length > 0) {
          const message = stub.messageQueue.shift();
          stub.worker.postMessage(message);
        }
        
        // Update connection status
        const instance = this.instances.get(definition.name);
        if (instance) {
          instance.isConnected = true;
        }
      },
      
      close: () => {
        if (stub.worker) {
          stub.worker.terminate();
          stub.worker = null;
          stub.messageQueue = [];
          
          // Update connection status
          const instance = this.instances.get(definition.name);
          if (instance) {
            instance.isConnected = false;
          }
        }
      },
      
      postMessage: (data: any, transfer?: Transferable[]) => {
        if (stub.worker) {
          stub.worker.postMessage(data, transfer);
        } else {
          // Queue message if worker not ready
          stub.messageQueue.push(data);
        }
      },
      
      addEventListener: (type: string, handler: EventListener, options?: any) => {
        stub.listeners.push({
          type,
          handler,
          options
        });

        if (stub.worker) {
          stub.worker.addEventListener(type, handler, options);
        }
      }
    };

    // Add message handlers from definition
    for (const handler of definition.messageHandlers) {
      const eventListener = this.createMessageHandler(handler, stub);
      stub.listeners.push({
        type: handler.eventName,
        handler: eventListener
      });
    }

    return stub;
  }

  private setupWebWorkerListeners(stub: WebWorkerStub, definition: WebWorkerDefinition): void {
    if (!stub.worker) return;

    // Add all registered listeners
    for (const listener of stub.listeners) {
      stub.worker.addEventListener(listener.type, listener.handler, listener.options);
    }
  }

  private createMessageHandler(handlerDef: MessageHandlerDefinition, stub: WebWorkerStub): EventListener {
    return async (event: Event) => {
      try {
        let data: any;
        
        // Handle different event types
        if (event.type === 'error') {
          const errorEvent = event as ErrorEvent;
          data = errorEvent.message;
        } else {
          const messageEvent = event as MessageEvent;
          data = this.decodeMessage(messageEvent.data, handlerDef.encoding);
        }
        
        // Create context for command execution  
        const context = {
          me: stub,
          message: data,
          event: event,
          it: data,
          result: data,
          worker: stub.worker
        };

        // Execute handler commands
        for (const command of handlerDef.commands) {
          await this.executeCommand(command, context);
        }
      } catch (error) {
        console.error('Error in WebWorker message handler:', error);
      }
    };
  }

  private decodeMessage(data: any, encoding: string): any {
    // Force JSON encoding
    if (encoding === 'json') {
      try {
        return typeof data === 'string' ? JSON.parse(data) : data;
      } catch (error) {
        console.error('Failed to parse WebWorker message as JSON:', data);
        throw error;
      }
    }

    // Otherwise, return the data without modification
    return data;
  }

  private async executeCommand(command: any, context: any): Promise<void> {
    // Mock implementation for testing - in real implementation,
    // this would delegate to the hyperscript command execution system
    
    if (typeof command === 'string') {
      await this.mockExecuteHyperscriptCommand(command, context);
    }
  }

  private async mockExecuteHyperscriptCommand(command: string, context: any): Promise<void> {
    // Mock implementation for testing purposes
    
    if (command.includes('log ')) {
      const match = command.match(/log (.+)/);
      if (match) {
        const values = this.parseLogArguments(match[1], context);
        console.log(...values);
      }
    } else if (command.includes('put ') && command.includes(' into ')) {
      const match = command.match(/put (.+) into (.+)/);
      if (match) {
        const value = this.evaluateMockExpression(match[1], context);
        const target = match[2].trim();
        
        // Handle CSS selector targets
        if (target.startsWith('#')) {
          const element = document.querySelector(target);
          if (element) {
            element.textContent = String(value);
          }
        }
      }
    } else if (command.includes('send ') && command.includes(' to worker')) {
      const match = command.match(/send (.+) to worker/);
      if (match) {
        const value = this.evaluateMockExpression(match[1], context);
        if (context.worker) {
          context.worker.postMessage(value);
        }
      }
    } else if (command.includes('post ') && command.includes(' to ')) {
      const match = command.match(/post (.+) to (.+)/);
      if (match) {
        const value = this.evaluateMockExpression(match[1], context);
        const target = this.evaluateMockExpression(match[2], context);
        
        if (target && target.postMessage) {
          target.postMessage(value);
        }
      }
    }
  }

  private parseLogArguments(args: string, context: any): any[] {
    // Handle comma-separated log arguments like: log "Received:", message
    const argParts = this.splitArguments(args);
    return argParts.map(arg => this.evaluateMockExpression(arg, context));
  }

  private splitArguments(args: string): string[] {
    // Simple argument splitting that respects quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < args.length; i++) {
      const char = args[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        current += char;
      } else if (!inQuotes && char === ',') {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
  }

  private evaluateMockExpression(expression: string, context: any): any {
    expression = expression.trim();
    
    // Handle string concatenation FIRST (before quoted strings)
    if (expression.includes(' + ')) {
      const parts = expression.split(' + ').map(part => part.trim());
      const values = parts.map(part => this.evaluateMockExpression(part, context));
      return values.map(v => String(v)).join('');
    }
    
    // Handle quoted strings
    if ((expression.startsWith('"') && expression.endsWith('"')) ||
        (expression.startsWith("'") && expression.endsWith("'"))) {
      return expression.slice(1, -1);
    }
    
    // Handle context variables
    if (context.hasOwnProperty(expression)) {
      return context[expression];
    }
    
    // Handle property access like message.value
    if (expression.includes('.')) {
      const parts = expression.split('.');
      let value = context;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return undefined;
        }
      }
      return value;
    }
    
    return expression;
  }
}

// Global registry instance
export const globalWebWorkerRegistry = new WebWorkerRegistry();