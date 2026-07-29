/**
 * ContinueCommand - Decorated Implementation
 *
 * Skips to the next iteration of the current loop. Uses Stage 3 decorators.
 * Extends ControlFlowSignalBase for shared logic.
 *
 * Syntax: continue
 */

import { commandMeta, command, createFactory } from '../decorators';
import { ControlFlowSignalBase } from './signal-base';

// Re-export for backward compatibility
export interface ContinueCommandInput {}
export interface ContinueCommandOutput {
  continued: true;
  timestamp: number;
}

/**
 * ContinueCommand - Skips to next loop iteration
 */
@command({ name: 'continue', category: 'control-flow' })
export class ContinueCommand extends ControlFlowSignalBase {
  static readonly metadata = commandMeta({
    description: 'Skip to the next iteration of the current loop',
    syntax: ['continue'],
    examples: [
      'continue',
      'if item.isInvalid then continue',
      'repeat for item in items { if item.skip then continue; process item }',
    ],
    sideEffects: ['control-flow'],
    category: 'control-flow',
    compatibility: 'standard',
  });

  get metadata() {
    return ContinueCommand.metadata;
  }

  protected readonly signalType = 'continue' as const;
  protected readonly errorMessage = 'CONTINUE_LOOP';
  protected readonly errorFlag = 'isContinue';
}

export const createContinueCommand = createFactory(ContinueCommand);
export default ContinueCommand;
