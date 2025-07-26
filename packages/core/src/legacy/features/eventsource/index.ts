/**
 * EventSource System Integration
 * Main entry point for EventSource functionality
 */

import { HyperscriptEventSourceParser } from './parser.js';
import { globalEventSourceRegistry } from './registry.js';
import type { EventSourceDefinition, EventSourceStub } from './types.js';

// Initialize parser
const eventSourceParser = new HyperscriptEventSourceParser();

/**
 * Parse and define an EventSource from hyperscript code
 */
export async function parseAndDefineEventSource(eventSourceCode: string): Promise<EventSourceDefinition> {
  const eventSource = eventSourceParser.parse(eventSourceCode);
  globalEventSourceRegistry.define(eventSource);
  return eventSource;
}

/**
 * Connect to a defined EventSource
 */
export async function connectToEventSource(eventSourceName: string, url?: string): Promise<EventSourceStub> {
  return await globalEventSourceRegistry.connect(eventSourceName, url);
}

/**
 * Disconnect from an EventSource
 */
export function disconnectEventSource(eventSourceName: string): void {
  globalEventSourceRegistry.disconnect(eventSourceName);
}

/**
 * Get an EventSource instance
 */
export function getEventSource(eventSourceName: string): any {
  return globalEventSourceRegistry.get(eventSourceName);
}

// Export for testing and integration
export { eventSourceParser, globalEventSourceRegistry };
export * from './types.js';