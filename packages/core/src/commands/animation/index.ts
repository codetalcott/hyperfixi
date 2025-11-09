/**
 * Animation Commands Export Module
 * Provides all animation commands for hyperscript
 */

import { MeasureCommand } from './measure';
import { SettleCommand } from './settle';
import { TakeCommand } from './take';
import { TransitionCommand } from './transition';

export { MeasureCommand as MeasureCommand } from './measure';
export { SettleCommand as SettleCommand } from './settle';
export { TakeCommand as TakeCommand } from './take';
export { TransitionCommand as TransitionCommand, createTransitionCommand } from './transition';

// Create instances with default options for easy access
export const animationCommands = {
  measure: new MeasureCommand(),
  settle: new SettleCommand(),
  take: new TakeCommand(),
  transition: new TransitionCommand(),
} as const;
