/**
 * Animation Commands Export Module
 * Provides all animation commands for hyperscript
 */

export { EnhancedMeasureCommand as MeasureCommand } from './enhanced-measure';
export { EnhancedSettleCommand as SettleCommand } from './enhanced-settle';
export { EnhancedTakeCommand as TakeCommand } from './enhanced-take';
export { EnhancedTransitionCommand as TransitionCommand } from './enhanced-transition';

// Create instances with default options for easy access
export const animationCommands = {
  measure: new EnhancedMeasureCommand(),
  settle: new EnhancedSettleCommand(),
  take: new EnhancedTakeCommand(),
  transition: new EnhancedTransitionCommand(),
} as const;