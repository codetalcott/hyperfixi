/**
 * ReplaceUrlCommand - Re-export from consolidated HistoryCommand
 *
 * This file exists for backwards compatibility.
 * All functionality is now in push-url.ts (HistoryCommand).
 */

export {
  HistoryCommand as ReplaceUrlCommand,
  createReplaceUrlCommand,
  type ReplaceUrlCommandInput,
  type ReplaceUrlCommandOutput,
} from './push-url';

export { HistoryCommand as default } from './push-url';
