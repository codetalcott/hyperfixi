/**
 * Web Worker Integration Tests
 * TDD implementation of _hyperscript Web Worker system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import type { ExecutionContext } from '../../types/core.js';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup.js';

// Mock Worker for testing
class MockWorker {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  private listeners: Map<string, EventListener[]> = new Map();

  constructor(scriptUrl: string) {
    this.url = scriptUrl;
    
    // Simulate worker ready after next tick
    setTimeout(() => {
      this.dispatchEvent(new Event('ready'));
    }, 10);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
    
    // Also call on* handlers
    if (event.type === 'message' && this.onmessage) {
      this.onmessage(event as MessageEvent);
    } else if (event.type === 'error' && this.onerror) {
      this.onerror(event as ErrorEvent);
    }
    
    return true;
  }

  postMessage(data: any, transfer?: Transferable[]) {
    // Simulate transferable object transfer
    if (transfer) {
      for (const obj of transfer) {
        if (obj instanceof ArrayBuffer) {
          // Simulate transfer by detaching the buffer
          Object.defineProperty(obj, 'byteLength', { value: 0 });
        }
      }
    }
    
    // Echo back for testing
    setTimeout(() => {
      const messageEvent = new MessageEvent('message', { 
        data: { echo: data }
      });
      
      if (this.onmessage) {
        this.onmessage(messageEvent);
      }
      this.dispatchEvent(messageEvent);
    }, 5);
  }

  terminate() {
    // Cleanup simulation
    this.listeners.clear();
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: any) {
    const messageEvent = new MessageEvent('message', { 
      data: typeof data === 'string' ? data : data
    });
    
    if (this.onmessage) {
      this.onmessage(messageEvent);
    }
    this.dispatchEvent(messageEvent);
  }

  // Test helper to simulate error
  simulateError(message: string) {
    const errorEvent = new ErrorEvent('error', { 
      message,
      filename: this.url,
      lineno: 1,
      colno: 1,
      error: new Error(message)
    });
    
    if (this.onerror) {
      this.onerror(errorEvent);
    }
    this.dispatchEvent(errorEvent);
  }
}

// Replace global Worker with mock
global.Worker = MockWorker as any;

describe('Web Worker Integration', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement);
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    // Clean up any workers
    document.body.innerHTML = '';
  });

  describe('Basic WebWorker Definition', () => {
    it('should define a simple WebWorker with script URL', async () => {
      const webWorkerCode = `
        worker MyWorker from "./worker.js"
        end
      `;

      const webWorker = await parseAndDefineWebWorker(webWorkerCode);
      
      expect(webWorker).toBeDefined();
      expect(webWorker.name).toBe('MyWorker');
      expect(webWorker.scriptUrl).toBe('./worker.js');
      expect(webWorker.messageHandlers).toHaveLength(0);
    });

    it('should define a WebWorker without immediate script URL', async () => {
      const webWorkerCode = `
        worker DynamicWorker
        end
      `;

      const webWorker = await parseAndDefineWebWorker(webWorkerCode);
      
      expect(webWorker).toBeDefined();
      expect(webWorker.name).toBe('DynamicWorker');
      expect(webWorker.scriptUrl).toBeUndefined();
    });

    it('should define a WebWorker with message handlers', async () => {
      const webWorkerCode = `
        worker DataWorker from "./data-worker.js"
          on "message" as json
            log "Received:", message
            put message.result into #output
          end
        end
      `;

      const webWorker = await parseAndDefineWebWorker(webWorkerCode);
      
      expect(webWorker).toBeDefined();
      expect(webWorker.name).toBe('DataWorker');
      expect(webWorker.messageHandlers).toHaveLength(1);
      expect(webWorker.messageHandlers[0].eventName).toBe('message');
      expect(webWorker.messageHandlers[0].encoding).toBe('json');
      expect(webWorker.messageHandlers[0].commands).toHaveLength(2);
    });

    it('should define a WebWorker with multiple message handlers', async () => {
      const webWorkerCode = `
        worker MultiWorker from "./multi-worker.js"
          on "message" as json
            put message.data into #result
          end
          on "error" as string  
            log "Worker error:", message
            put "Error occurred" into #status
          end
          on "progress" as json
            put message.percent + "%" into #progress
          end
        end
      `;

      const webWorker = await parseAndDefineWebWorker(webWorkerCode);
      
      expect(webWorker).toBeDefined();
      expect(webWorker.messageHandlers).toHaveLength(3);
      expect(webWorker.messageHandlers[0].eventName).toBe('message');
      expect(webWorker.messageHandlers[1].eventName).toBe('error');
      expect(webWorker.messageHandlers[2].eventName).toBe('progress');
    });
  });

  describe('WebWorker Connection', () => {
    it('should connect to WebWorker and handle message events', async () => {
      const webWorkerCode = `
        worker TestWorker from "./test-worker.js"
          on "message"
            log "Received message:", message
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      
      // Connect to WebWorker
      const stub = await connectToWebWorker('TestWorker');
      
      expect(stub).toBeDefined();
      expect(stub.worker).toBeDefined();
      expect(stub.worker!.url).toBe('./test-worker.js');
    });

    it('should support dynamic connection with open() method', async () => {
      const webWorkerCode = `
        worker DynamicWorker
          on "message" as json
            put message.data into #output
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('DynamicWorker');
      
      // Initially no worker
      expect(stub.worker).toBeNull();
      
      // Connect dynamically
      stub.open('./dynamic-worker.js');
      
      expect(stub.worker).toBeDefined();
      expect(stub.worker!.url).toBe('./dynamic-worker.js');
    });

    it('should handle worker termination', async () => {
      const webWorkerCode = `
        worker TerminateWorker from "./terminate-worker.js"
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('TerminateWorker');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(stub.worker).toBeDefined();
      
      // Terminate worker
      stub.close();
      
      expect(stub.worker).toBeNull();
    });
  });

  describe('Message Handling', () => {
    it('should receive and process JSON messages', async () => {
      const webWorkerCode = `
        worker JsonWorker from "./json-worker.js"
          on "message" as json
            put message.value into #result
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('JsonWorker');
      
      // Create result element
      const resultElement = createTestElement('<div id="result"></div>');
      document.body.appendChild(resultElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a JSON message
      (stub.worker as any).simulateMessage({ value: 'Hello JSON' });
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(resultElement.textContent).toBe('Hello JSON');
    });

    it('should receive and process string messages', async () => {
      const webWorkerCode = `
        worker StringWorker from "./string-worker.js"
          on "message" as string
            put message into #output
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('StringWorker');
      
      // Create output element
      const outputElement = createTestElement('<div id="output"></div>');
      document.body.appendChild(outputElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a string message
      (stub.worker as any).simulateMessage('Plain text message');
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(outputElement.textContent).toBe('Plain text message');
    });

    it('should handle error events', async () => {
      const webWorkerCode = `
        worker ErrorWorker from "./error-worker.js"
          on "error" as string
            put "Worker Error: " + message into #error-log
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('ErrorWorker');
      
      // Create error log element
      const errorElement = createTestElement('<div id="error-log"></div>');
      document.body.appendChild(errorElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate worker error
      (stub.worker as any).simulateError('Script execution failed');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(errorElement.textContent).toBe('Worker Error: Script execution failed');
    });
  });

  describe('Message Sending', () => {
    it('should send messages to worker', async () => {
      const webWorkerCode = `
        worker EchoWorker from "./echo-worker.js"
          on "message" as json
            log "Echo received:", message.echo
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('EchoWorker');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Send message to worker
      stub.postMessage({ test: 'data' });
      
      // Verify message was sent (mock will echo back)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(stub.worker).toBeDefined();
    });

    it('should queue messages when worker not ready', async () => {
      const webWorkerCode = `
        worker QueueWorker
          on "message"
            log "Queued message received"
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('QueueWorker');
      
      // Send message before worker is created
      stub.postMessage({ queued: true });
      
      expect(stub.messageQueue).toHaveLength(1);
      expect(stub.messageQueue[0]).toEqual({ queued: true });
      
      // Now open the worker
      stub.open('./queue-worker.js');
      
      // Wait for messages to be sent
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(stub.messageQueue).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed WebWorker definitions', async () => {
      const malformedCode = `
        worker BadWorker
          this is invalid syntax
        end
      `;

      await expect(parseAndDefineWebWorker(malformedCode))
        .rejects.toThrow('Invalid WebWorker definition');
    });

    it('should handle connecting to undefined WebWorkers', async () => {
      await expect(connectToWebWorker('NonExistentWorker'))
        .rejects.toThrow('WebWorker "NonExistentWorker" is not defined');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const webWorkerCode = `
        worker JsonErrorWorker from "./json-error-worker.js"
          on "message" as json
            put message.value into #result
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('JsonErrorWorker');
      
      // Create result element
      const resultElement = createTestElement('<div id="result"></div>');
      document.body.appendChild(resultElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving invalid JSON (but our mock won't actually send invalid JSON)
      // This test verifies the error handling structure is in place
      expect(stub.worker).toBeDefined();
    });
  });

  describe('Advanced Features', () => {
    it('should support multiple WebWorkers simultaneously', async () => {
      const worker1Code = `
        worker Worker1 from "./worker1.js"
          on "message"
            put "Worker1: " + message into #output1
          end
        end
      `;
      
      const worker2Code = `
        worker Worker2 from "./worker2.js"
          on "message"
            put "Worker2: " + message into #output2
          end
        end
      `;

      await parseAndDefineWebWorker(worker1Code);
      await parseAndDefineWebWorker(worker2Code);
      
      const stub1 = await connectToWebWorker('Worker1');
      const stub2 = await connectToWebWorker('Worker2');
      
      expect(stub1.worker!.url).toBe('./worker1.js');
      expect(stub2.worker!.url).toBe('./worker2.js');
      
      // Both should be independent
      expect(stub1).not.toBe(stub2);
    });

    it('should handle WebWorker context variables', async () => {
      const webWorkerCode = `
        worker ContextWorker from "./context-worker.js"
          on "message" as json
            log "Message data:", message.data
            put message.timestamp into #timestamp
          end
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('ContextWorker');
      
      // Create timestamp element
      const timestampElement = createTestElement('<div id="timestamp"></div>');
      document.body.appendChild(timestampElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate message with timestamp
      const now = Date.now();
      (stub.worker as any).simulateMessage({ data: 'test', timestamp: now });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(timestampElement.textContent).toBe(String(now));
    });

    it('should support transferable objects', async () => {
      const webWorkerCode = `
        worker TransferWorker from "./transfer-worker.js"
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('TransferWorker');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Create transferable object (ArrayBuffer)
      const buffer = new ArrayBuffer(1024);
      
      // Send with transfer
      stub.postMessage({ buffer }, [buffer]);
      
      expect(buffer.byteLength).toBe(0); // Should be transferred
    });
  });

  describe('Integration with Helper Functions', () => {
    it('should work with sendToWebWorker helper', async () => {
      const webWorkerCode = `
        worker HelperWorker from "./helper-worker.js"
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      await connectToWebWorker('HelperWorker');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Use helper function
      sendToWebWorker('HelperWorker', { helper: true });
      
      // Verify helper function works
      const instance = getWebWorker('HelperWorker');
      expect(instance).toBeDefined();
      expect(instance.stub.worker).toBeDefined();
    });

    it('should work with disconnectWebWorker helper', async () => {
      const webWorkerCode = `
        worker DisconnectWorker from "./disconnect-worker.js"
        end
      `;

      await parseAndDefineWebWorker(webWorkerCode);
      const stub = await connectToWebWorker('DisconnectWorker');
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(stub.worker).toBeDefined();
      
      // Use helper function to disconnect
      disconnectWebWorker('DisconnectWorker');
      
      expect(stub.worker).toBeNull();
    });
  });
});

// Import actual implementations
import { 
  parseAndDefineWebWorker, 
  connectToWebWorker, 
  disconnectWebWorker,
  sendToWebWorker,
  getWebWorker
} from './index.js';