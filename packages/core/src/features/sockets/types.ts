/**
 * Socket System Type Definitions
 * Types for _hyperscript socket definitions and RPC functionality
 */

export interface SocketDefinition {
  name: string;
  url: string;
  timeout?: number;
  messageHandler?: MessageHandler;
}

export interface MessageHandler {
  asJson: boolean;
  commands: any[]; // Will be parsed hyperscript commands
}

export interface SocketInstance {
  definition: SocketDefinition;
  webSocket: WebSocket;
  isConnected: boolean;
  pendingRpcCalls: Map<string, PendingRpcCall>;
  messageListeners: Set<MessageListener>;
}

export interface PendingRpcCall {
  id: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout?: NodeJS.Timeout;
}

export interface MessageListener {
  (message: any, event: MessageEvent): void;
}

export interface RpcMessage {
  iid: string;
  function: string;
  args: any[];
}

export interface RpcResponse {
  iid: string;
  return?: any;
  throw?: string;
}

export interface SocketRegistry {
  define(socket: SocketDefinition): void;
  get(name: string): SocketInstance | undefined;
  connect(name: string): Promise<SocketInstance>;
  disconnect(name: string): void;
  send(name: string, message: any): void;
  rpc(name: string, functionName: string, args: any[], timeout?: number): Promise<any>;
}

export interface SocketParser {
  parse(socketCode: string): SocketDefinition;
  parseMessageHandler(handlerCode: string): MessageHandler;
}