/**
 * EventSource Registry Implementation
 * Manages EventSource connections and message handling
 */

import type { 
  EventSourceDefinition, 
  EventSourceInstance, 
  EventSourceStub,
  EventSourceListener,
  EventSourceRegistry as IEventSourceRegistry,
  MessageHandlerDefinition
} from './types.js';

export class EventSourceRegistry implements IEventSourceRegistry {
  private definitions = new Map<string, EventSourceDefinition>();
  private instances = new Map<string, EventSourceInstance>();

  define(eventSource: EventSourceDefinition): EventSourceStub {
    this.definitions.set(eventSource.name, eventSource);
    
    // Create the stub object similar to _hyperscript implementation
    const stub = this.createEventSourceStub(eventSource);
    
    // If URL is provided, connect immediately
    if (eventSource.url) {
      stub.open(eventSource.url);
    }
    
    // Store instance
    this.instances.set(eventSource.name, {
      definition: eventSource,
      stub,
      isConnected: false
    });
    
    return stub;
  }

  get(name: string): EventSourceInstance | undefined {
    return this.instances.get(name);
  }

  async connect(name: string, url?: string): Promise<EventSourceStub> {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new Error(`EventSource "${name}" is not defined`);
    }

    // Return existing instance if already defined
    const existing = this.instances.get(name);
    if (existing) {
      if (url) {
        existing.stub.open(url);
      }
      return existing.stub;
    }

    // Create new stub and connect
    const stub = this.createEventSourceStub(definition);
    if (url || definition.url) {
      stub.open(url || definition.url!);
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

  private createEventSourceStub(definition: EventSourceDefinition): EventSourceStub {
    const stub: EventSourceStub = {
      eventSource: null,
      listeners: [],
      retryCount: 0,
      
      open: (url?: string) => {
        // Calculate default values for URL argument
        if (url === undefined) {
          if (stub.eventSource?.url) {
            url = stub.eventSource.url;
          } else {
            throw new Error('No URL defined for EventSource');
          }
        }

        // Guard multiple opens on the same EventSource
        if (stub.eventSource) {
          // If we're opening a new URL, close the old one first
          if (url !== stub.eventSource.url) {
            stub.eventSource.close();
          } else if (stub.eventSource.readyState !== EventSource.CLOSED) {
            // Already have the right connection open
            return;
          }
        }

        // Open the EventSource
        stub.eventSource = new EventSource(url, {
          withCredentials: definition.withCredentials
        });

        // Set up event listeners
        this.setupEventSourceListeners(stub, definition);
        
        // Update connection status
        const instance = this.instances.get(definition.name);
        if (instance) {
          instance.isConnected = true;
        }
      },
      
      close: () => {
        if (stub.eventSource) {
          stub.eventSource.close();
          stub.retryCount = 0;
          
          // Update connection status
          const instance = this.instances.get(definition.name);
          if (instance) {
            instance.isConnected = false;
          }
        }
      },
      
      addEventListener: (type: string, handler: EventListener, options?: any) => {
        stub.listeners.push({
          type,
          handler,
          options
        });

        if (stub.eventSource) {
          stub.eventSource.addEventListener(type, handler);
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

  private setupEventSourceListeners(stub: EventSourceStub, definition: EventSourceDefinition): void {
    if (!stub.eventSource) return;

    // On successful connection - reset retry count
    stub.eventSource.addEventListener('open', () => {
      stub.retryCount = 0;
    });

    // On connection error - use exponential backoff to retry
    stub.eventSource.addEventListener('error', () => {
      if (stub.eventSource?.readyState === EventSource.CLOSED) {
        stub.retryCount = Math.min(7, stub.retryCount + 1);
        const timeout = Math.random() * Math.pow(2, stub.retryCount) * 500;
        setTimeout(() => {
          stub.open();
        }, timeout);
      }
    });

    // Add all registered listeners
    for (const listener of stub.listeners) {
      stub.eventSource.addEventListener(listener.type, listener.handler, listener.options);
    }
  }

  private createMessageHandler(handlerDef: MessageHandlerDefinition, stub: EventSourceStub): EventListener {
    return async (event: Event) => {
      const messageEvent = event as MessageEvent;
      
      try {
        // Decode message data based on encoding
        const data = this.decodeMessage(messageEvent.data, handlerDef.encoding);
        
        // Create context for command execution  
        const context = {
          me: stub,
          message: data,
          event: messageEvent,
          it: data,
          result: data
        };

        // Execute handler commands
        for (const command of handlerDef.commands) {
          await this.executeCommand(command, context);
        }
      } catch (error) {
        console.error('Error in EventSource message handler:', error);
      }
    };
  }

  private decodeMessage(data: string, encoding: string): any {
    // Force JSON encoding
    if (encoding === 'json') {
      try {
        return JSON.parse(data);
      } catch (error) {
        console.error('Failed to parse EventSource message as JSON:', data);
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
        const expression = match[1].trim();
        const value = this.evaluateMockExpression(expression, context);
        const target = match[2].trim();
        
        // Handle CSS selector targets
        if (target.startsWith('#')) {
          const element = document.querySelector(target);
          if (element) {
            element.textContent = String(value);
          }
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
export const globalEventSourceRegistry = new EventSourceRegistry();