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

// Element property access helpers
export {
  getElementProperty,
  setElementProperty,
  getElementValue,
  setElementValue,
  isEmpty,
  isPlainObject,
} from './element-property-access';

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
  resolvePossessive,
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

// URL validation helpers
export {
  validateUrl,
  isExternalUrl,
  isSafeUrl,
  normalizeUrl,
  extractSearchParams,
  buildUrlWithParams,
} from './url-validation';

// Style manipulation helpers (Phase 3)
export {
  parseCSSProperty,
  isCSSPropertySyntax,
  parseToggleableCSSProperty,
  getComputedStyleValue,
  setStyleValue,
  removeStyleProperty,
  toggleCSSProperty,
  isDisplayNone,
  isVisibilityHidden,
  isOpacityZero,
} from './style-manipulation';
export type { ToggleableCSSProperty, ParsedCSSProperty } from './style-manipulation';

// Selector type detection helpers (Phase 3)
export {
  detectSelectorType,
  isSmartElementTag,
  isSmartElementSelector,
  extractSelectorValue,
  isClassSelectorNode,
  isIdSelectorNode,
  isBareSmartElementNode,
  SMART_ELEMENT_TAGS,
  // Phase 4: First argument evaluation helpers
  evaluateFirstArg,
  detectInputType,
} from './selector-type-detection';
export type {
  SelectorType,
  SmartElementTag,
  // Phase 4: First argument types
  CommandInputType,
  ParsedFirstArg,
} from './selector-type-detection';

// Input validation helpers (Phase 3)
export {
  validateTargetArray,
  isValidTargetArray,
  validateStringArray,
  isValidStringArray,
  validateTypeDiscriminator,
  isValidType,
  validateDefined,
  isDefined,
  validateNonEmptyString,
  isNonEmptyString,
  combineValidations,
  createValidator,
} from './input-validator';
export type { ValidationResult as InputValidationResult } from './input-validator';

// Smart element helpers (Phase 3)
export {
  detectSmartElementType,
  resolveSmartElementTargets,
  toggleDialog,
  toggleDetails,
  toggleSelect,
  toggleSmartElement,
  isSmartElement,
  isDialogElement,
  isDetailsElement,
  isSelectElement,
  isSummaryElement,
} from './smart-element';
export type { SmartElementType, DialogMode } from './smart-element';

// DOM mutation helpers (Phase 3)
export {
  toInsertPosition,
  looksLikeHTML,
  insertContent,
  insertContentSemantic,
  removeElement,
  removeElements,
  swapElements,
  cloneElement,
  createElementFromHTML,
  setInnerHTML,
  setTextContent,
  clearElement,
} from './dom-mutation';
export type { ContentInsertPosition, SemanticPosition } from './dom-mutation';

// Batch DOM operations (Phase 4 - Consolidation)
export {
  batchApply,
  batchApplyItems,
  batchAddClasses,
  batchRemoveClasses,
  batchToggleClasses,
  batchSetAttribute,
  batchRemoveAttribute,
  batchToggleAttribute,
  toggleAttribute,
  batchSetStyles,
  batchRemoveStyles,
} from './batch-dom-operations';

// Event waiting helpers (Phase 4 - Consolidation)
export {
  waitForEvent,
  waitForTime,
  waitForTransitionEnd,
  waitForAnimationComplete,
  waitForFirst,
  createGuardedFinisher,
  createOnceGuard,
  createCleanupManager,
} from './event-waiting';
export type {
  EventWaitResult,
  TransitionWaitResult,
  AnimationWaitResult,
  WaitCondition,
  RaceResult,
} from './event-waiting';

// Temporal modifiers (Phase 4 - Consolidation)
export {
  createReversionFn,
  setupDurationReversion,
  setupEventReversion,
  setupTemporalModifiers,
  setupTemporalModifiersForElements,
} from './temporal-modifiers';
export type {
  ToggleType,
  CleanupFn,
  TemporalModifierOptions,
} from './temporal-modifiers';

// Loop execution helpers (Phase 5 - Size Optimization)
export {
  executeLoop,
  createForLoopConfig,
  createTimesLoopConfig,
  createWhileLoopConfig,
  createUntilLoopConfig,
  createUntilEventLoopConfig,
  createForeverLoopConfig,
} from './loop-executor';
export type {
  LoopConfig,
  LoopIterationContext,
  LoopResult,
} from './loop-executor';
