/**
 * BreakCommand - Decorated Implementation
 *
 * Exits from the current loop. Uses Stage 3 decorators.
 * Extends ControlFlowSignalBase for shared logic.
 *
 * Syntax: break
 */

import { commandMeta, command, createFactory } from '../decorators';
import { ControlFlowSignalBase } from './signal-base';

// Re-export for backward compatibility
export interface BreakCommandInput {}
export interface BreakCommandOutput {
  broken: true;
  timestamp: number;
}

/**
 * BreakCommand - Exits from the current loop
 */
@command({ name: 'break', category: 'control-flow' })
export class BreakCommand extends ControlFlowSignalBase {
  static readonly metadata = commandMeta({
    description: 'Exit from the current loop (repeat, for, while, until)',
    syntax: ['break'],
    examples: [
      'break',
      'if found then break',
      'repeat for item in items { if item == target then break }',
    ],
    sideEffects: ['control-flow'],
    category: 'control-flow',
    compatibility: 'standard',
  });

  get metadata() {
    return BreakCommand.metadata;
  }

  protected readonly signalType = 'break' as const;
  protected readonly errorMessage = 'BREAK_LOOP';
  protected readonly errorFlag = 'isBreak';
}

export const createBreakCommand = createFactory(BreakCommand);
export default BreakCommand;
