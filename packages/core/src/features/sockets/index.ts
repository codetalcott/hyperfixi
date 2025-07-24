/**
 * Socket System Integration
 * Main entry point for socket functionality
 */

import { HyperscriptSocketParser } from './parser.js';
import { globalSocketRegistry } from './registry.js';
import type { SocketDefinition } from './types.js';

// Initialize parser
const socketParser = new HyperscriptSocketParser();

/**
 * Parse and define a socket from hyperscript code
 */
export async function parseAndDefineSocket(socketCode: string): Promise<SocketDefinition> {
  const socket = socketParser.parse(socketCode);
  globalSocketRegistry.define(socket);
  return socket;
}

/**
 * Connect to a defined socket
 */
export async function connectToSocket(socketName: string): Promise<any> {
  return await globalSocketRegistry.connect(socketName);
}

/**
 * Send a message to a socket
 */
export async function sendToSocket(socketName: string, message: any): Promise<void> {
  globalSocketRegistry.send(socketName, message);
}

/**
 * Make an RPC call to a socket
 */
export async function makeRpcCall(socketName: string, functionName: string, args: any[], timeout?: number): Promise<any> {
  return await globalSocketRegistry.rpc(socketName, functionName, args, timeout);
}

/**
 * Disconnect from a socket
 */
export function disconnectSocket(socketName: string): void {
  globalSocketRegistry.disconnect(socketName);
}

/**
 * Get a socket instance
 */
export function getSocket(socketName: string): any {
  return globalSocketRegistry.get(socketName);
}

// Export for testing and integration
export { socketParser, globalSocketRegistry };
export * from './types.js';