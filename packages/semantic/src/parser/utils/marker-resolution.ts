/**
 * Marker Resolution Utility
 *
 * Shared utilities for resolving role markers from language profiles.
 * Used by pattern-generator to build tokens and extraction rules.
 */

import type { SemanticRole } from '../../types';
import type { LanguageProfile, RoleMarker } from '../../generators/language-profiles';
import { resolveMarkerForRole, type RoleSpecWithMarker } from '@lokascript/framework';

// The generator's marker rules moved to framework with it (domains rethink
// Phase 4.4); semantic's readers import them from here as before.
export {
  legacyMarkerAlternatives,
  resolveMarkerForRole,
  schemaMarkerAlternatives,
} from '@lokascript/framework';
export type { ResolvedMarker, RoleSpecWithMarker } from '@lokascript/framework';

/**
 * Get all markers (primary + alternatives) for a role.
 *
 * @param roleSpec Role specification
 * @param profile Language profile
 * @returns Array of marker strings, or empty array if no markers
 */
export function getAllMarkersForRole(
  roleSpec: RoleSpecWithMarker,
  profile: LanguageProfile
): string[] {
  const resolved = resolveMarkerForRole(roleSpec, profile);
  if (!resolved || !resolved.primary) {
    return [];
  }

  const markers = [resolved.primary];
  if (resolved.alternatives) {
    markers.push(...resolved.alternatives);
  }
  return markers;
}

/**
 * Get the default role marker from a language profile.
 *
 * @param profile Language profile
 * @param role Semantic role
 * @returns Role marker or undefined
 */
export function getDefaultRoleMarker(
  profile: LanguageProfile,
  role: SemanticRole
): RoleMarker | undefined {
  return profile.roleMarkers[role];
}

/**
 * The role-concept names a marker token normalizes to.
 *
 * A language's role markers (de `zu`, ms `ke`, ja `に`) tokenize as keywords
 * whose `normalized` form is the CONCEPT they mark — `destination`, `source`,
 * … — not a word any user ever wrote. Two consumers need to recognize that:
 * `PatternMatcher.isRoleMarkerConcept` (a possessive head normalizing to one is
 * a mis-read) and the fused body-walk swap in `SemanticParser` (a capture whose
 * literal value IS a concept name can only be a swallowed marker).
 *
 * Shared so the two cannot drift apart.
 */
export const ROLE_MARKER_CONCEPTS: ReadonlySet<string> = new Set([
  'destination',
  'source',
  'patient',
  'object',
  'event',
  'eventmarker',
  'manner',
  'instrument',
  // ms `dengan`, the `with` of `sembunyi saya dengan *opacity` (hide me with
  // *opacity): read as a property, `saya dengan` was the possessive `my dengan`.
  'style',
]);
