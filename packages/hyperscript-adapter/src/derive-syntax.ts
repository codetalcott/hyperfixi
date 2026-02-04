/**
 * Derive SYNTAX tables from CommandSchema definitions.
 *
 * Instead of maintaining a hand-coded SYNTAX table that can drift from
 * the canonical schemas, this module generates it from the semantic
 * package's command-schemas + language profile.
 *
 * The generated table maps each command to ordered [role, preposition]
 * tuples for rendering.
 */

import type { CommandSchema, RoleSpec, LanguageProfile } from '@lokascript/semantic';
import type { RoleMarker } from '@lokascript/semantic/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyntaxEntry = readonly [string, string][];
export type SyntaxTable = Record<string, SyntaxEntry>;

// ---------------------------------------------------------------------------
// Overrides for commands whose rendering doesn't cleanly derive from
// schema roles (different role names, simplified structure, etc.)
// ---------------------------------------------------------------------------

/**
 * Commands where the SYNTAX rendering uses a different mapping
 * than what derives from schema roles + language profile.
 *
 * - repeat: Schema has loopType/quantity/event/source, but English renders
 *           as "repeat N" or "repeat until <condition>" using simplified roles
 */
const RENDER_OVERRIDES: SyntaxTable = {
  repeat: [
    ['quantity', ''],
    ['condition', 'until'],
  ],
};

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * Resolve the preposition for a role in a specific command and language.
 *
 * Priority:
 * 1. Render-specific override for this language (renderOverride[lang])
 * 2. Command-specific marker override for this language (markerOverride[lang])
 * 3. Language profile's default roleMarker for this role
 * 4. '' (no preposition)
 */
function resolvePreposition(roleSpec: RoleSpec, profile: LanguageProfile, lang: string): string {
  // 1. Render-time override for this language
  if (roleSpec.renderOverride?.[lang] !== undefined) {
    return roleSpec.renderOverride[lang];
  }

  // 2. Command-specific marker override for this language
  if (roleSpec.markerOverride?.[lang] !== undefined) {
    return roleSpec.markerOverride[lang];
  }

  // 3. Profile default for this role
  const roleMarker = (profile.roleMarkers as Record<string, RoleMarker | undefined>)[roleSpec.role];
  if (roleMarker) {
    return roleMarker.primary;
  }

  // 4. No preposition
  return '';
}

/**
 * Derive the SYNTAX table from command schemas and a language profile.
 *
 * For each command:
 * - Sort roles by position (svoPosition for SVO/VSO, sovPosition for SOV)
 * - Resolve each role's preposition for the given language
 * - Return [role, preposition] tuples
 *
 * Commands in RENDER_OVERRIDES use their manual entry instead (English only).
 */
export function deriveSyntax(
  schemas: Record<string, CommandSchema>,
  profile: LanguageProfile,
  lang: string
): SyntaxTable {
  const syntax: Record<string, [string, string][]> = {};
  const isSov = profile.wordOrder === 'SOV';

  for (const [action, schema] of Object.entries(schemas)) {
    // Use manual override for commands that don't derive cleanly (English only)
    if (lang === 'en' && RENDER_OVERRIDES[action]) {
      syntax[action] = RENDER_OVERRIDES[action] as [string, string][];
      continue;
    }

    // Sort roles by position appropriate for word order
    const sortedRoles = [...schema.roles].sort((a, b) => {
      const posA = isSov ? (a.sovPosition ?? 99) : (a.svoPosition ?? 99);
      const posB = isSov ? (b.sovPosition ?? 99) : (b.svoPosition ?? 99);
      return posA - posB;
    });

    // Derive [role, preposition] tuples
    syntax[action] = sortedRoles.map(roleSpec => [
      roleSpec.role,
      resolvePreposition(roleSpec, profile, lang),
    ]);
  }

  return syntax;
}

/**
 * Derive the English SYNTAX table.
 * Convenience wrapper that calls deriveSyntax with 'en'.
 */
export function deriveEnglishSyntax(
  schemas: Record<string, CommandSchema>,
  englishProfile: LanguageProfile
): SyntaxTable {
  return deriveSyntax(schemas, englishProfile, 'en');
}
