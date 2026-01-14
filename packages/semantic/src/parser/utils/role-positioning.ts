/**
 * Role Positioning Utility
 *
 * Shared utilities for sorting and positioning semantic roles based on word order.
 * Used by pattern-generator and pattern-matcher to ensure consistent behavior.
 */

import type { SemanticRole } from '../../types';
import type { WordOrder } from '../../generators/profiles/types';

/**
 * Priority order for semantic roles used in pattern matching.
 * Lower number = higher priority (comes first in pattern).
 * Only includes roles commonly used in patterns.
 */
export const ROLE_PRIORITY: Partial<Record<SemanticRole, number>> = {
  patient: 1,
  destination: 2,
  source: 3,
  style: 4,
  manner: 5,
  goal: 6,
};

/**
 * Get the priority of a semantic role.
 * Returns 99 for unknown/unlisted roles.
 */
export function getRolePriority(role: SemanticRole): number {
  return ROLE_PRIORITY[role] ?? 99;
}

/**
 * Sort semantic roles by their priority.
 * Patient comes first, then destination, source, etc.
 */
export function sortRolesByPriority(roles: SemanticRole[]): SemanticRole[] {
  return [...roles].sort((a, b) => getRolePriority(a) - getRolePriority(b));
}

// Re-export for convenience
export type { WordOrder };

/**
 * Minimum interface for roles that can be sorted by position.
 */
export interface RoleWithPosition {
  role: SemanticRole;
  sovPosition?: number;
  svoPosition?: number;
}

/**
 * Sort roles by their position for a given word order.
 *
 * @param roles Array of role specs with position info
 * @param wordOrder The word order to use (SVO, SOV, VSO)
 * @returns Sorted array of roles
 */
export function sortRolesByWordOrder<T extends RoleWithPosition>(
  roles: readonly T[],
  wordOrder: WordOrder
): T[] {
  const sortKey = wordOrder === 'SOV' ? 'sovPosition' : 'svoPosition';
  return [...roles].sort((a, b) => {
    const aPos = a[sortKey] ?? 99;
    const bPos = b[sortKey] ?? 99;
    return aPos - bPos;
  });
}
