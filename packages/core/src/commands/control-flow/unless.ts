/**
 * UnlessCommand - Re-export from consolidated ConditionalCommand
 *
 * This file exists for backwards compatibility.
 * All functionality is now in if.ts (ConditionalCommand).
 */

export {
  ConditionalCommand as UnlessCommand,
  createUnlessCommand,
  type UnlessCommandInput,
  type ConditionalCommandOutput as UnlessCommandOutput,
} from './if';

export { ConditionalCommand as default } from './if';
