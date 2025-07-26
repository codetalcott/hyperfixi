/**
 * Web Worker Integration Type Definitions
 * Types for _hyperscript Web Worker functionality
 */

export interface WebWorkerDefinition {
  name: string;
  scriptUrl?: string;
  messageHandlers: MessageHandlerDefinition[];
}

export interface MessageHandlerDefinition {
  eventName: string; // 'message', 'error', custom event types
  encoding: 'json' | 'string' | '';
  commands: any[]; // Will be parsed hyperscript commands
}

export interface WebWorkerStub {
  worker: Worker | null;
  listeners: WebWorkerListener[];
  messageQueue: any[]; // Messages queued before worker is ready
  open(scriptUrl?: string): void;
  close(): void;
  postMessage(data: any, transfer?: Transferable[]): void;
  addEventListener(type: string, handler: EventListener, options?: any): void;
}

export interface WebWorkerListener {
  type: string;
  handler: EventListener;
  options?: any;
}

export interface WebWorkerInstance {
  definition: WebWorkerDefinition;
  stub: WebWorkerStub;
  isConnected: boolean;
}

export interface WebWorkerRegistry {
  define(webWorker: WebWorkerDefinition): WebWorkerStub;
  get(name: string): WebWorkerInstance | undefined;
  connect(name: string, scriptUrl?: string): Promise<WebWorkerStub>;
  disconnect(name: string): void;
}

export interface WebWorkerParser {
  parse(webWorkerCode: string): WebWorkerDefinition;
  parseMessageHandler(handlerCode: string): MessageHandlerDefinition;
}