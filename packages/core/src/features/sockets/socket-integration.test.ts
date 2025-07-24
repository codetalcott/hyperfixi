/**
 * Socket Integration Tests
 * TDD implementation of _hyperscript socket system with WebSocket support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import type { ExecutionContext } from '../../types/core.js';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup.js';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    
    // Simulate connection after next tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Simulate successful send
    console.log('MockWebSocket sending:', data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;

describe('Socket Integration', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement);
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    // Clean up any open sockets
    document.body.innerHTML = '';
  });

  describe('Basic Socket Definition', () => {
    it('should define a simple socket with URL', async () => {
      const socketCode = `
        socket MySocket ws://localhost:8080/ws
      `;

      const socket = await parseAndDefineSocket(socketCode);
      
      expect(socket).toBeDefined();
      expect(socket.name).toBe('MySocket');
      expect(socket.url).toBe('ws://localhost:8080/ws');
      expect(socket.messageHandler).toBeUndefined();
    });

    it('should define a socket with message handler', async () => {
      const socketCode = `
        socket ChatSocket ws://localhost:8080/chat
          on message as json
            log message
            put message.content into #chat-log
          end
        end
      `;

      const socket = await parseAndDefineSocket(socketCode);
      
      expect(socket).toBeDefined();
      expect(socket.name).toBe('ChatSocket');
      expect(socket.url).toBe('ws://localhost:8080/chat');
      expect(socket.messageHandler).toBeDefined();
      expect(socket.messageHandler!.asJson).toBe(true);
      expect(socket.messageHandler!.commands).toHaveLength(2);
    });

    it('should define a socket with timeout', async () => {
      const socketCode = `
        socket ApiSocket wss://api.example.com/ws with timeout 5000ms
          on message as json
            log "API response:", message
          end
        end
      `;

      const socket = await parseAndDefineSocket(socketCode);
      
      expect(socket).toBeDefined();
      expect(socket.name).toBe('ApiSocket');
      expect(socket.timeout).toBe(5000);
    });
  });

  describe('Socket Connection', () => {
    it('should connect to a socket and handle connection events', async () => {
      const socketCode = `
        socket TestSocket ws://localhost:8080/test
          on message
            log "Received:", message
          end
        end
      `;

      await parseAndDefineSocket(socketCode);
      
      // Connect to socket
      const socketInstance = await connectToSocket('TestSocket');
      
      expect(socketInstance).toBeDefined();
      expect(socketInstance.webSocket).toBeDefined();
      expect(socketInstance.isConnected).toBe(false); // Still connecting
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(socketInstance.isConnected).toBe(true);
    });

    it('should handle connection failures gracefully', async () => {
      const socketCode = `
        socket FailSocket ws://nonexistent:9999/fail
      `;

      await parseAndDefineSocket(socketCode);
      
      // Mock connection failure
      const originalWebSocket = global.WebSocket;
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 10);
        }
      } as any;

      await expect(connectToSocket('FailSocket')).rejects.toThrow('Socket connection failed');
      
      global.WebSocket = originalWebSocket;
    });
  });

  describe('Message Handling', () => {
    it('should receive and process JSON messages', async () => {
      const socketCode = `
        socket JsonSocket ws://localhost:8080/json
          on message as json
            set #result's textContent to message.value
          end
        end
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('JsonSocket');
      
      // Create result element
      const resultElement = createTestElement('<div id="result"></div>');
      document.body.appendChild(resultElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a JSON message
      (socketInstance.webSocket as any).simulateMessage({ value: 'Hello World' });
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(resultElement.textContent).toBe('Hello World');
    });

    it('should receive and process plain text messages', async () => {
      const socketCode = `
        socket TextSocket ws://localhost:8080/text
          on message
            put message into #output
          end
        end
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('TextSocket');
      
      // Create output element
      const outputElement = createTestElement('<div id="output"></div>');
      document.body.appendChild(outputElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a text message
      if (socketInstance.webSocket.onmessage) {
        socketInstance.webSocket.onmessage(new MessageEvent('message', { data: 'Plain text message' }));
      }
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(outputElement.textContent).toBe('Plain text message');
    });
  });

  describe('Message Sending', () => {
    it('should send messages to socket', async () => {
      const socketCode = `
        socket SendSocket ws://localhost:8080/send
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('SendSocket');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Mock the send method to capture sent data
      const sentMessages: string[] = [];
      socketInstance.webSocket.send = vi.fn((data: string) => {
        sentMessages.push(data);
      });
      
      // Send a message
      await sendToSocket('SendSocket', { type: 'chat', message: 'Hello!' });
      
      expect(sentMessages).toHaveLength(1);
      expect(JSON.parse(sentMessages[0])).toEqual({ type: 'chat', message: 'Hello!' });
    });

    it('should handle send errors when socket is not connected', async () => {
      const socketCode = `
        socket ClosedSocket ws://localhost:8080/closed
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('ClosedSocket');
      
      // Close the socket
      socketInstance.webSocket.close();
      
      // Try to send a message
      await expect(sendToSocket('ClosedSocket', { test: 'message' }))
        .rejects.toThrow('Socket is not connected');
    });
  });

  describe('RPC Functionality', () => {
    it('should make RPC calls and handle responses', async () => {
      const socketCode = `
        socket RpcSocket ws://localhost:8080/rpc with timeout 1000ms
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('RpcSocket');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Mock the send method to capture RPC calls
      const sentMessages: string[] = [];
      socketInstance.webSocket.send = vi.fn((data: string) => {
        sentMessages.push(data);
        
        // Simulate server response
        const rpcCall = JSON.parse(data);
        setTimeout(() => {
          (socketInstance.webSocket as any).simulateMessage({
            iid: rpcCall.iid,
            return: rpcCall.args[0] + 1
          });
        }, 10);
      });
      
      // Make RPC call
      const result = await makeRpcCall('RpcSocket', 'increment', [41]);
      
      expect(result).toBe(42);
      expect(sentMessages).toHaveLength(1);
      
      const rpcCall = JSON.parse(sentMessages[0]);
      expect(rpcCall.function).toBe('increment');
      expect(rpcCall.args).toEqual([41]);
      expect(rpcCall.iid).toBeDefined();
    });

    it('should handle RPC errors', async () => {
      const socketCode = `
        socket ErrorSocket ws://localhost:8080/error
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('ErrorSocket');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Mock error response
      socketInstance.webSocket.send = vi.fn((data: string) => {
        const rpcCall = JSON.parse(data);
        setTimeout(() => {
          (socketInstance.webSocket as any).simulateMessage({
            iid: rpcCall.iid,
            throw: 'Function not found: ' + rpcCall.function
          });
        }, 10);
      });
      
      await expect(makeRpcCall('ErrorSocket', 'nonexistent', []))
        .rejects.toThrow('Function not found: nonexistent');
    });

    it('should handle RPC timeouts', async () => {
      const socketCode = `
        socket TimeoutSocket ws://localhost:8080/timeout with timeout 100ms
      `;

      await parseAndDefineSocket(socketCode);
      const socketInstance = await connectToSocket('TimeoutSocket');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Mock no response (timeout scenario)
      socketInstance.webSocket.send = vi.fn();
      
      await expect(makeRpcCall('TimeoutSocket', 'slowFunction', []))
        .rejects.toThrow('RPC call timed out');
    });
  });

  describe('Multiple Sockets', () => {
    it('should manage multiple sockets independently', async () => {
      const socket1Code = `
        socket Socket1 ws://localhost:8080/socket1
      `;
      
      const socket2Code = `
        socket Socket2 ws://localhost:8080/socket2
      `;

      await parseAndDefineSocket(socket1Code);
      await parseAndDefineSocket(socket2Code);
      
      const instance1 = await connectToSocket('Socket1');
      const instance2 = await connectToSocket('Socket2');
      
      expect(instance1.definition.name).toBe('Socket1');
      expect(instance2.definition.name).toBe('Socket2');
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed socket definitions', async () => {
      const malformedCode = `
        socket BadSocket
          this is invalid syntax
        end
      `;

      await expect(parseAndDefineSocket(malformedCode))
        .rejects.toThrow('Invalid socket definition');
    });

    it('should handle connecting to undefined sockets', async () => {
      await expect(connectToSocket('NonExistentSocket'))
        .rejects.toThrow('Socket "NonExistentSocket" is not defined');
    });
  });
});

// Import actual implementations
import { parseAndDefineSocket, connectToSocket, sendToSocket, makeRpcCall } from './index.js';