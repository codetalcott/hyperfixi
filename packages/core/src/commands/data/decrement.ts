/**
 * DecrementCommand - Re-export from consolidated NumericModifyCommand
 *
 * This file exists for backwards compatibility.
 * All functionality is now in increment.ts (NumericModifyCommand).
 */

export {
  NumericModifyCommand as DecrementCommand,
  createDecrementCommand,
  type DecrementCommandInput,
} from './increment';

export { NumericModifyCommand as default } from './increment';
