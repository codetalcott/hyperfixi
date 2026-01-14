/**
 * Parser Utilities
 *
 * Shared utilities for pattern-generator and pattern-matcher.
 */

export {
  ROLE_PRIORITY,
  getRolePriority,
  sortRolesByPriority,
  sortRolesByWordOrder,
  type WordOrder,
  type RoleWithPosition,
} from './role-positioning';

export {
  resolveMarkerForRole,
  getAllMarkersForRole,
  getDefaultRoleMarker,
  type RoleSpecWithMarker,
  type ResolvedMarker,
} from './marker-resolution';

export {
  isTypeCompatible,
  validateValueType,
  isCSSSelector,
  isClassName,
  isIdSelector,
  isCSSPropertyRef,
  isNumericValue,
  isPropertyName,
  isVariableRef,
  isBuiltInReference,
} from './type-validation';
