/**
 * EventSource Integration Type Definitions
 * Types for _hyperscript EventSource (SSE) functionality
 */

export interface EventSourceDefinition {
  name: string;
  url?: string;
  withCredentials: boolean;
  messageHandlers: MessageHandlerDefinition[];
}

export interface MessageHandlerDefinition {
  eventName: string;
  encoding: 'json' | 'string' | '';
  commands: any[]; // Will be parsed hyperscript commands
}

export interface EventSourceStub {
  eventSource: EventSource | null;
  listeners: EventSourceListener[];
  retryCount: number;
  open(url?: string): void;
  close(): void;
  addEventListener(type: string, handler: EventListener, options?: any): void;
}

export interface EventSourceListener {
  type: string;
  handler: EventListener;
  options?: any;
}

export interface EventSourceInstance {
  definition: EventSourceDefinition;
  stub: EventSourceStub;
  isConnected: boolean;
}

export interface EventSourceRegistry {
  define(eventSource: EventSourceDefinition): EventSourceStub;
  get(name: string): EventSourceInstance | undefined;
  connect(name: string, url?: string): Promise<EventSourceStub>;
  disconnect(name: string): void;
}

export interface EventSourceParser {
  parse(eventSourceCode: string): EventSourceDefinition;
  parseMessageHandler(handlerCode: string): MessageHandlerDefinition;
}