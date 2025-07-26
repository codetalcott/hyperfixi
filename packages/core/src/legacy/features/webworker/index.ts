/**
 * Web Worker System Integration
 * Main entry point for Web Worker functionality
 */

import { HyperscriptWebWorkerParser } from './parser.js';
import { globalWebWorkerRegistry } from './registry.js';
import type { WebWorkerDefinition, WebWorkerStub } from './types.js';

// Initialize parser
const webWorkerParser = new HyperscriptWebWorkerParser();

/**
 * Parse and define a WebWorker from hyperscript code
 */
export async function parseAndDefineWebWorker(webWorkerCode: string): Promise<WebWorkerDefinition> {
  const webWorker = webWorkerParser.parse(webWorkerCode);
  globalWebWorkerRegistry.define(webWorker);
  return webWorker;
}

/**
 * Connect to a defined WebWorker
 */
export async function connectToWebWorker(webWorkerName: string, scriptUrl?: string): Promise<WebWorkerStub> {
  return await globalWebWorkerRegistry.connect(webWorkerName, scriptUrl);
}

/**
 * Disconnect from a WebWorker
 */
export function disconnectWebWorker(webWorkerName: string): void {
  globalWebWorkerRegistry.disconnect(webWorkerName);
}

/**
 * Get a WebWorker instance
 */
export function getWebWorker(webWorkerName: string): any {
  return globalWebWorkerRegistry.get(webWorkerName);
}

/**
 * Send message to WebWorker
 */
export function sendToWebWorker(webWorkerName: string, data: any, transfer?: Transferable[]): void {
  const instance = globalWebWorkerRegistry.get(webWorkerName);
  if (instance && instance.stub.worker) {
    instance.stub.postMessage(data, transfer);
  }
}

// Export for testing and integration
export { webWorkerParser, globalWebWorkerRegistry };
export * from './types.js';