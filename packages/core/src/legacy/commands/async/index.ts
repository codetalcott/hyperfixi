/**
 * Async Commands Export Module
 * Provides asynchronous commands with event integration
 */

import { FetchCommand } from './fetch';
import { WaitCommand } from './wait';

export { FetchCommand } from './fetch';
export { WaitCommand } from './wait';
export type { FetchCommandOptions } from './fetch';

// Create instances with default options for easy access
export const asyncCommands = {
  fetch: new FetchCommand(),
  wait: new WaitCommand(),
} as const;