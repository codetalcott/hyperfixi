/**
 * Command Helpers - Shared utilities for command implementations
 *
 * This module provides common functionality used across multiple commands,
 * reducing code duplication and bundle size.
 *
 * Estimated bundle size savings:
 * - variable-access: ~290 lines saved per command (increment, decrement, set, get, bind)
 * - element-resolution: ~60 lines saved per command (transition, settle, toggle, etc.)
 * - duration-parsing: ~35 lines saved per command (wait, transition, settle)
 *
 * Total estimated savings: ~12-15 KB
 */

// Variable access helpers
export {
  convertToNumber,
  getVariableValue,
  setVariableValue,
  resolveElementRef,
  getElementPropertyValue,
  setElementPropertyValue,
  getCurrentNumericValue,
  setTargetValue,
} from './variable-access';

// Element resolution helpers
export {
  resolveElement,
  resolveElements,
  resolveTargetsFromArgs,
  asHTMLElement,
  isContextRef,
  isCSSSelector,
  findClosest,
  findAll,
} from './element-resolution';
export type { ResolveTargetsOptions } from './element-resolution';

// Duration parsing helpers
export {
  parseDuration,
  parseDurationStrict,
  parseCSSDurations,
  calculateMaxAnimationTime,
  camelToKebab,
  kebabToCamel,
  formatDuration,
} from './duration-parsing';

// Class manipulation helpers
export {
  parseClasses,
  isValidClassName,
  normalizeClassName,
} from './class-manipulation';

// Attribute manipulation helpers
export {
  isAttributeSyntax,
  parseAttribute,
  parseAttributeName,
  parseAttributeWithValue,
} from './attribute-manipulation';

// Event helpers
export {
  createCustomEvent,
  parseEventValue,
  dispatchCustomEvent,
} from './event-helpers';
export type { EventOptions } from './event-helpers';

// Condition helpers
export {
  evaluateCondition,
  isTruthy,
} from './condition-helpers';
