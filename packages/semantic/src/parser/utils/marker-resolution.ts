/**
 * Marker Resolution Utility
 *
 * Shared utilities for resolving role markers from language profiles.
 * Used by pattern-generator to build tokens and extraction rules.
 */

import type { SemanticRole } from '../../types';
import type { LanguageProfile, RoleMarker } from '../../generators/language-profiles';

/**
 * Minimum interface for role specs that can have marker resolution.
 * Compatible with the RoleSpec type from command-schemas.
 */
export interface RoleSpecWithMarker {
  role: SemanticRole;
  markerOverride?: Record<string, string | undefined>;
  markerLegacy?: Record<string, readonly string[]>;
  markerVariants?: Record<string, readonly string[]>;
  methodCarrier?: SemanticRole;
}

/**
 * Resolved marker information for a role.
 */
export interface ResolvedMarker {
  /** Primary marker string (may be empty string for no marker) */
  primary: string;
  /** Alternative markers */
  alternatives?: string[];
  /** Position relative to role value */
  position: 'before' | 'after';
  /** Whether this is an override marker */
  isOverride: boolean;
}

/**
 * Resolve the marker for a role in a specific language.
 *
 * Checks for command-specific marker overrides first,
 * then falls back to the default marker from the language profile.
 *
 * @param roleSpec Role specification with optional override
 * @param profile Language profile with role markers
 * @returns Resolved marker info, or null if no marker
 */
export function resolveMarkerForRole(
  roleSpec: RoleSpecWithMarker,
  profile: LanguageProfile
): ResolvedMarker | null {
  // Check for command-specific marker override first
  const overrideMarker = roleSpec.markerOverride?.[profile.code];
  const defaultMarker = profile.roleMarkers[roleSpec.role];

  if (overrideMarker !== undefined) {
    // Use override marker (can be empty string to suppress default marker).
    // markerLegacy entries stay accepted, so correcting an override does not
    // stop the marker a previous release rendered from parsing.
    const alternatives = legacyMarkerAlternatives(roleSpec, profile.code, overrideMarker);
    return {
      primary: overrideMarker,
      ...(alternatives && { alternatives }),
      position: defaultMarker?.position ?? 'before',
      isOverride: true,
    };
  }

  if (defaultMarker && defaultMarker.primary) {
    const result: ResolvedMarker = {
      primary: defaultMarker.primary,
      position: defaultMarker.position,
      isOverride: false,
    };
    if (defaultMarker.alternatives) {
      result.alternatives = defaultMarker.alternatives;
    }
    return result;
  }

  return null;
}

/**
 * Alternatives an OVERRIDE marker accepts: the role's {@link RoleSpecWithMarker.markerLegacy}
 * entries for this language, minus the override itself.
 *
 * Every generator that resolves a marker has its own override branch, and each
 * one used to drop alternatives entirely — so correcting a marker silently
 * stopped the previous one parsing. This is the single definition of what an
 * override still accepts; call it from each of those branches.
 *
 * Prefer {@link schemaMarkerAlternatives}, which also merges `markerVariants`.
 * This narrower entry point remains for callers that must exclude variants.
 */
export function legacyMarkerAlternatives(
  roleSpec: RoleSpecWithMarker,
  languageCode: string,
  overrideMarker: string
): string[] | undefined {
  const legacy = roleSpec.markerLegacy?.[languageCode];
  if (!legacy?.length) return undefined;
  const alternatives = [...new Set(legacy)].filter(a => a && a !== overrideMarker);
  return alternatives.length ? alternatives : undefined;
}

/**
 * Every schema-declared alternative a role's marker accepts in this language:
 * `markerLegacy` ∪ `markerVariants`, minus the marker itself.
 *
 * **The single definition — call it from every branch of every generator.** The
 * two fields used to sit on DIFFERENT branches: the override branch read only
 * `markerLegacy`, the profile-default branch only `markerVariants`. So giving a
 * language a `markerOverride` silently deleted its `markerVariants`, and giving
 * it `markerVariants` did nothing at all wherever an override existed. Both
 * halves were live: tr `set`'s dative allomorphs (`e|a|ye|ya`) were declared as
 * variants but dropped by the tr override, so `… doğru ya ayarla` parsed only
 * inside an event handler — the one generator that happened to merge both.
 *
 * `markerVariants` are held out for a role with a {@link RoleSpecWithMarker.methodCarrier}:
 * there they are not synonyms but distinct command shapes recorded into another
 * role (`put`'s `into|before|after` → `method`), and merging them as synonyms is
 * what broke `put-before`/`put-after` in 23 languages at once. That flag is the
 * discriminator because it is set on exactly the role whose variants carry
 * meaning — pinned by `schema-consistency.test.ts`, which fails if a new
 * `markerVariants` appears without that decision being made.
 */
export function schemaMarkerAlternatives(
  roleSpec: RoleSpecWithMarker,
  languageCode: string,
  marker: string
): string[] | undefined {
  const legacy = roleSpec.markerLegacy?.[languageCode] ?? [];
  const variants = roleSpec.methodCarrier ? [] : (roleSpec.markerVariants?.[languageCode] ?? []);
  const alternatives = [...new Set([...legacy, ...variants])].filter(a => a && a !== marker);
  return alternatives.length ? alternatives : undefined;
}

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
]);
