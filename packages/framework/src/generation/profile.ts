/**
 * A domain's language profile, and the role order its sentences use.
 */

import type { RoleSpec } from '../schema';

/**
 * A domain's language profile as framework reads it: word order, command
 * keywords, and role markers (with the side of the value each attaches to).
 */
export interface PatternGenLanguageProfile {
  readonly code: string;
  readonly wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OSV' | 'OVS' | 'free';
  readonly keywords: Record<string, { primary: string; alternatives?: string[] }>;
  readonly roleMarkers?: Record<
    string,
    { primary: string; alternatives?: string[]; position?: 'before' | 'after' }
  >;
}

/**
 * Sort roles by word order: descending `svoPosition` (or `sovPosition` in an
 * SOV language) — higher values come first. The schema renderer
 * (`createSchemaRenderer`) orders roles with it, as the core's pattern
 * generator does (`createSchemaPatternGenerator` with `positionOrder:
 * 'descending'`), so a rendered surface re-parses.
 */
export function sortRolesByWordOrder(roles: RoleSpec[], wordOrder: string): RoleSpec[] {
  const sorted = [...roles];

  if (wordOrder === 'SVO') {
    // Sort by svoPosition (higher = earlier)
    sorted.sort((a, b) => (b.svoPosition ?? 0) - (a.svoPosition ?? 0));
  } else if (wordOrder === 'SOV') {
    // Sort by sovPosition (higher = earlier)
    sorted.sort((a, b) => (b.sovPosition ?? 0) - (a.sovPosition ?? 0));
  }
  // VSO and others use SVO-style ordering

  return sorted;
}
