/**
 * EventSource Integration Tests
 * TDD implementation of _hyperscript EventSource (SSE) system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../test-setup.js';
import type { ExecutionContext } from '../../types/core.js';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup.js';

// Mock EventSource for testing
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number;
  withCredentials: boolean;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private listeners: Map<string, EventListener[]> = new Map();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = options?.withCredentials || false;
    this.readyState = MockEventSource.CONNECTING;
    
    // Simulate connection after next tick
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
      this.dispatchEvent(new Event('open'));
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
    if (event.type === 'open' && this.onopen) {
      this.onopen(event);
    } else if (event.type === 'message' && this.onmessage) {
      this.onmessage(event as MessageEvent);
    } else if (event.type === 'error' && this.onerror) {
      this.onerror(event);
    }
    
    return true;
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
    this.dispatchEvent(new CloseEvent('close'));
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: any, eventType: string = 'message') {
    const messageEvent = new MessageEvent('message', { 
      data: typeof data === 'string' ? data : JSON.stringify(data),
      type: eventType
    });
    
    if (this.onmessage) {
      this.onmessage(messageEvent);
    }
    this.dispatchEvent(messageEvent);
  }

  // Test helper to simulate error
  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    const errorEvent = new Event('error');
    if (this.onerror) {
      this.onerror(errorEvent);
    }
    this.dispatchEvent(errorEvent);
  }
}

// Replace global EventSource with mock
global.EventSource = MockEventSource as any;

describe('EventSource Integration', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement);
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    // Clean up any open event sources
    document.body.innerHTML = '';
  });

  describe('Basic EventSource Definition', () => {
    it('should define a simple EventSource with URL', async () => {
      const eventSourceCode = `
        eventsource MyEventSource from "http://localhost:8080/events"
        end
      `;

      const eventSource = await parseAndDefineEventSource(eventSourceCode);
      
      expect(eventSource).toBeDefined();
      expect(eventSource.name).toBe('MyEventSource');
      expect(eventSource.url).toBe('http://localhost:8080/events');
      expect(eventSource.withCredentials).toBe(false);
      expect(eventSource.messageHandlers).toHaveLength(0);
    });

    it('should define an EventSource with credentials', async () => {
      const eventSourceCode = `
        eventsource SecureSource from "https://api.example.com/events" with credentials
        end
      `;

      const eventSource = await parseAndDefineEventSource(eventSourceCode);
      
      expect(eventSource).toBeDefined();
      expect(eventSource.name).toBe('SecureSource');
      expect(eventSource.withCredentials).toBe(true);
    });

    it('should define an EventSource with message handlers', async () => {
      const eventSourceCode = `
        eventsource ChatSource from "http://localhost:8080/chat"
          on "message" as json
            log "Received:", message
            put message.content into #chat-log
          end
        end
      `;

      const eventSource = await parseAndDefineEventSource(eventSourceCode);
      
      expect(eventSource).toBeDefined();
      expect(eventSource.name).toBe('ChatSource');
      expect(eventSource.messageHandlers).toHaveLength(1);
      expect(eventSource.messageHandlers[0].eventName).toBe('message');
      expect(eventSource.messageHandlers[0].encoding).toBe('json');
      expect(eventSource.messageHandlers[0].commands).toHaveLength(2);
    });

    it('should define an EventSource with multiple message handlers', async () => {
      const eventSourceCode = `
        eventsource MultiSource from "http://localhost:8080/multi"
          on "userJoined" as json
            put message.username + " joined" into #status
          end
          on "userLeft" as json  
            put message.username + " left" into #status
          end
          on "message" as string
            log "Raw message:", message
          end
        end
      `;

      const eventSource = await parseAndDefineEventSource(eventSourceCode);
      
      expect(eventSource).toBeDefined();
      expect(eventSource.messageHandlers).toHaveLength(3);
      expect(eventSource.messageHandlers[0].eventName).toBe('userJoined');
      expect(eventSource.messageHandlers[1].eventName).toBe('userLeft');
      expect(eventSource.messageHandlers[2].eventName).toBe('message');
    });
  });

  describe('EventSource Connection', () => {
    it('should connect to EventSource and handle connection events', async () => {
      const eventSourceCode = `
        eventsource TestSource from "http://localhost:8080/test"
          on "message"
            log "Received message:", message
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      
      // Connect to EventSource
      const stub = await connectToEventSource('TestSource');
      
      expect(stub).toBeDefined();
      expect(stub.eventSource).toBeDefined();
      expect(stub.eventSource!.url).toBe('http://localhost:8080/test');
      expect(stub.eventSource!.readyState).toBe(MockEventSource.CONNECTING);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(stub.eventSource!.readyState).toBe(MockEventSource.OPEN);
    });

    it('should handle connection failures with retry logic', async () => {
      const eventSourceCode = `
        eventsource FailSource from "http://nonexistent:9999/fail"
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('FailSource');
      
      // Wait for connection attempt
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate connection error
      (stub.eventSource as any).simulateError();
      
      expect(stub.retryCount).toBe(1); // Should be incremented after error
      
      // Wait for retry logic to kick in
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(stub.retryCount).toBeGreaterThan(0);
    });

    it('should support dynamic connection with open() method', async () => {
      const eventSourceCode = `
        eventsource DynamicSource
          on "message" as json
            put message.data into #output
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('DynamicSource');
      
      // Initially no connection
      expect(stub.eventSource).toBeNull();
      
      // Connect dynamically
      stub.open('http://localhost:8080/dynamic');
      
      expect(stub.eventSource).toBeDefined();
      expect(stub.eventSource!.url).toBe('http://localhost:8080/dynamic');
    });
  });

  describe('Message Handling', () => {
    it('should receive and process JSON messages', async () => {
      const eventSourceCode = `
        eventsource JsonSource from "http://localhost:8080/json"
          on "message" as json
            put message.value into #result
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('JsonSource');
      
      // Create result element
      const resultElement = createTestElement('<div id="result"></div>');
      document.body.appendChild(resultElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a JSON message
      (stub.eventSource as any).simulateMessage({ value: 'Hello JSON' });
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(resultElement.textContent).toBe('Hello JSON');
    });

    it('should receive and process string messages', async () => {
      const eventSourceCode = `
        eventsource StringSource from "http://localhost:8080/string"
          on "message" as string
            put message into #output
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('StringSource');
      
      // Create output element
      const outputElement = createTestElement('<div id="output"></div>');
      document.body.appendChild(outputElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving a string message
      (stub.eventSource as any).simulateMessage('Plain text message');
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(outputElement.textContent).toBe('Plain text message');
    });

    it('should handle custom event types', async () => {
      const eventSourceCode = `
        eventsource CustomSource from "http://localhost:8080/custom"
          on "userJoined" as json
            put "User " + message.username + " joined" into #status
          end
          on "userLeft" as json
            put "User " + message.username + " left" into #status
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('CustomSource');
      
      // Create status element
      const statusElement = createTestElement('<div id="status"></div>');
      document.body.appendChild(statusElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate custom event
      const customEvent = new MessageEvent('userJoined', {
        data: JSON.stringify({ username: 'alice' })
      });
      
      stub.eventSource!.dispatchEvent(customEvent);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(statusElement.textContent).toBe('User alice joined');
    });
  });

  describe('Connection Management', () => {
    it('should handle connection open and close events', async () => {
      const eventSourceCode = `
        eventsource ConnectionSource from "http://localhost:8080/connection"
          on "open"
            put "Connected" into #status
          end
          on "close"
            put "Disconnected" into #status
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('ConnectionSource');
      
      // Create status element
      const statusElement = createTestElement('<div id="status"></div>');
      document.body.appendChild(statusElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(statusElement.textContent).toBe('Connected');
      
      // Close connection
      stub.close();
      
      // Wait for close processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(statusElement.textContent).toBe('Disconnected');
    });

    it('should reconnect on connection failure', async () => {
      const eventSourceCode = `
        eventsource ReconnectSource from "http://localhost:8080/reconnect"
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('ReconnectSource');
      
      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const initialRetryCount = stub.retryCount;
      
      // Simulate connection failure
      (stub.eventSource as any).simulateError();
      
      // Wait for retry logic
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(stub.retryCount).toBeGreaterThan(initialRetryCount);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed EventSource definitions', async () => {
      const malformedCode = `
        eventsource BadSource
          this is invalid syntax
        end
      `;

      await expect(parseAndDefineEventSource(malformedCode))
        .rejects.toThrow('Invalid EventSource definition');
    });

    it('should handle connecting to undefined EventSources', async () => {
      await expect(connectToEventSource('NonExistentSource'))
        .rejects.toThrow('EventSource "NonExistentSource" is not defined');
    });

    it('should handle JSON parsing errors gracefully', async () => {
      const eventSourceCode = `
        eventsource JsonErrorSource from "http://localhost:8080/jsonerror"
          on "message" as json
            put message.value into #result
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('JsonErrorSource');
      
      // Create result element
      const resultElement = createTestElement('<div id="result"></div>');
      document.body.appendChild(resultElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate receiving invalid JSON
      (stub.eventSource as any).simulateMessage('invalid json {');
      
      // Wait for processing - should not crash
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Element should remain unchanged due to JSON error
      expect(resultElement.textContent).toBe('');
    });
  });

  describe('Advanced Features', () => {
    it('should support multiple EventSources simultaneously', async () => {
      const source1Code = `
        eventsource Source1 from "http://localhost:8080/source1"
          on "message"
            put "Source1: " + message into #output1
          end
        end
      `;
      
      const source2Code = `
        eventsource Source2 from "http://localhost:8080/source2"
          on "message"
            put "Source2: " + message into #output2
          end
        end
      `;

      await parseAndDefineEventSource(source1Code);
      await parseAndDefineEventSource(source2Code);
      
      const stub1 = await connectToEventSource('Source1');
      const stub2 = await connectToEventSource('Source2');
      
      expect(stub1.eventSource!.url).toBe('http://localhost:8080/source1');
      expect(stub2.eventSource!.url).toBe('http://localhost:8080/source2');
      
      // Both should be independent
      expect(stub1).not.toBe(stub2);
    });

    it('should handle EventSource variables in hyperscript context', async () => {
      const eventSourceCode = `
        eventsource ContextSource from "http://localhost:8080/context"
          on "message" as json
            log me
            log event
            put event.type into #event-type
          end
        end
      `;

      await parseAndDefineEventSource(eventSourceCode);
      const stub = await connectToEventSource('ContextSource');
      
      // Create event type element
      const eventTypeElement = createTestElement('<div id="event-type"></div>');
      document.body.appendChild(eventTypeElement);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Simulate message
      (stub.eventSource as any).simulateMessage({ test: 'data' });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(eventTypeElement.textContent).toBe('message');
    });
  });
});

// Import actual implementations
import { parseAndDefineEventSource, connectToEventSource } from './index.js';