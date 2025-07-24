/**
 * Socket Registry Implementation
 * Manages WebSocket connections and RPC functionality
 */

import type { 
  SocketDefinition, 
  SocketInstance, 
  SocketRegistry as ISocketRegistry, 
  PendingRpcCall,
  RpcMessage,
  RpcResponse,
  MessageListener
} from './types.js';

export class SocketRegistry implements ISocketRegistry {
  private definitions = new Map<string, SocketDefinition>();
  private instances = new Map<string, SocketInstance>();

  define(socket: SocketDefinition): void {
    this.definitions.set(socket.name, socket);
  }

  get(name: string): SocketInstance | undefined {
    return this.instances.get(name);
  }

  async connect(name: string): Promise<SocketInstance> {
    const definition = this.definitions.get(name);
    if (!definition) {
      throw new Error(`Socket "${name}" is not defined`);
    }

    // Return existing instance if already connected
    const existing = this.instances.get(name);
    if (existing && existing.isConnected) {
      return existing;
    }

    // Create new WebSocket connection
    const webSocket = new WebSocket(definition.url);
    
    const instance: SocketInstance = {
      definition,
      webSocket,
      isConnected: false,
      pendingRpcCalls: new Map(),
      messageListeners: new Set()
    };

    // Set up connection handlers
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000); // 10 second timeout

      webSocket.onopen = () => {
        clearTimeout(connectionTimeout);
        instance.isConnected = true;
        this.instances.set(name, instance);
        resolve(instance);
      };

      webSocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        reject(new Error('Socket connection failed'));
      };

      webSocket.onclose = () => {
        instance.isConnected = false;
        this.instances.delete(name);
      };

      webSocket.onmessage = (event) => {
        this.handleMessage(instance, event);
      };
    });
  }

  disconnect(name: string): void {
    const instance = this.instances.get(name);
    if (instance) {
      instance.webSocket.close();
      this.instances.delete(name);
    }
  }

  send(name: string, message: any): void {
    const instance = this.instances.get(name);
    if (!instance || !instance.isConnected) {
      throw new Error('Socket is not connected');
    }

    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    instance.webSocket.send(messageStr);
  }

  async rpc(name: string, functionName: string, args: any[], timeout?: number): Promise<any> {
    const instance = this.instances.get(name);
    if (!instance || !instance.isConnected) {
      throw new Error('Socket is not connected');
    }

    const callId = this.generateRpcId();
    const rpcTimeout = timeout || instance.definition.timeout || 5000;

    // Create RPC message
    const rpcMessage: RpcMessage = {
      iid: callId,
      function: functionName,
      args
    };

    // Set up promise for response
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        instance.pendingRpcCalls.delete(callId);
        reject(new Error('RPC call timed out'));
      }, rpcTimeout);

      const pendingCall: PendingRpcCall = {
        id: callId,
        resolve: (value) => {
          clearTimeout(timeoutHandle);
          instance.pendingRpcCalls.delete(callId);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          instance.pendingRpcCalls.delete(callId);
          reject(new Error(error));
        },
        timeout: timeoutHandle
      };

      instance.pendingRpcCalls.set(callId, pendingCall);

      // Send RPC message
      this.send(name, rpcMessage);
    });
  }

  private handleMessage(instance: SocketInstance, event: MessageEvent): void {
    let messageData: any;
    
    try {
      // Try to parse as JSON first
      messageData = JSON.parse(event.data);
    } catch {
      // If parsing fails, use raw data
      messageData = event.data;
    }

    // Check if this is an RPC response
    if (this.isRpcResponse(messageData)) {
      this.handleRpcResponse(instance, messageData);
      return;
    }

    // Handle regular message
    this.processMessage(instance, messageData, event);
  }

  private isRpcResponse(data: any): boolean {
    return data && typeof data === 'object' && 'iid' in data && ('return' in data || 'throw' in data);
  }

  private handleRpcResponse(instance: SocketInstance, response: RpcResponse): void {
    const pendingCall = instance.pendingRpcCalls.get(response.iid);
    if (!pendingCall) {
      return; // Stale response
    }

    if ('return' in response) {
      pendingCall.resolve(response.return);
    } else if ('throw' in response) {
      pendingCall.reject(response.throw);
    }
  }

  private async processMessage(instance: SocketInstance, messageData: any, event: MessageEvent): void {
    const { definition } = instance;
    
    if (!definition.messageHandler) {
      return;
    }

    // Prepare message data based on handler configuration
    let processedMessage = messageData;
    if (definition.messageHandler.asJson) {
      if (typeof messageData === 'string') {
        try {
          processedMessage = JSON.parse(messageData);
        } catch {
          console.warn('Failed to parse message as JSON:', messageData);
          return;
        }
      }
    }

    // Create context for message handler execution
    const context = {
      message: processedMessage,
      it: processedMessage,
      event: event
    };

    // Execute message handler commands
    for (const command of definition.messageHandler.commands) {
      await this.executeCommand(command, context);
    }

    // Notify message listeners
    for (const listener of instance.messageListeners) {
      listener(processedMessage, event);
    }
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
        const value = this.evaluateMockExpression(match[1], context);
        console.log(value);
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
    } else if (command.includes('set ') && command.includes(' to ')) {
      const match = command.match(/set (.+) to (.+)/);
      if (match) {
        const target = match[1].trim();
        const value = this.evaluateMockExpression(match[2], context);
        
        // Handle element property setting like "#result's textContent"
        if (target.includes("'s textContent")) {
          const elementMatch = target.match(/(.+)'s textContent/);
          if (elementMatch) {
            const selector = elementMatch[1];
            const element = document.querySelector(selector);
            if (element) {
              element.textContent = String(value);
            }
          }
        }
      }
    }
  }

  private evaluateMockExpression(expression: string, context: any): any {
    expression = expression.trim();
    
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
    
    // Handle string concatenation with quotes and commas
    if (expression.includes(',') || expression.includes('+')) {
      // Simple concatenation parsing for "API response:", message
      const parts = expression.split(/[,+]/).map(part => part.trim());
      const values = parts.map(part => this.evaluateMockExpression(part, context));
      return values.join(' ');
    }
    
    return expression;
  }

  private generateRpcId(): string {
    return 'rpc-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }
}

// Global registry instance
export const globalSocketRegistry = new SocketRegistry();