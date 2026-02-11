/**
 * Pattern Generator
 *
 * Generates LanguagePattern objects from CommandSchema + LanguageProfile.
 * This solves the pattern explosion problem by deriving patterns from
 * high-level schema definitions rather than hand-writing each one.
 */

import type { LanguagePattern, PatternToken, ExtractionRule } from '../core/types';
import type { CommandSchema, RoleSpec } from '../schema';

/**
 * Minimal language profile interface for pattern generation.
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
 * Configuration for pattern generation.
 */
export interface GeneratorConfig {
  /** Base priority for generated patterns (default: 100) */
  readonly basePriority?: number;
  /** Include optional role variants (default: true) */
  readonly includeOptionalVariants?: boolean;
}

const defaultConfig: GeneratorConfig = {
  basePriority: 100,
  includeOptionalVariants: true,
};

/**
 * Generate a language pattern from a command schema and language profile.
 *
 * @param schema - Command schema defining the command structure
 * @param profile - Language profile with word order and keywords
 * @param config - Optional configuration
 * @returns Generated language pattern
 */
export function generatePattern(
  schema: CommandSchema,
  profile: PatternGenLanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern {
  const id = `${schema.action}-${profile.code}-generated`;
  const priority = config.basePriority ?? 100;

  // Get keyword translation
  const keyword = profile.keywords[schema.action];
  if (!keyword) {
    throw new Error(`No keyword translation for '${schema.action}' in ${profile.code}`);
  }

  // Build tokens based on word order
  const tokens = buildTokens(schema, profile, keyword.primary);

  // Build extraction rules
  const extraction = buildExtractionRules(schema, profile);

  // Build format string for documentation
  const format = buildFormatString(schema, profile, keyword.primary);

  return {
    id,
    language: profile.code,
    command: schema.action,
    priority,
    template: {
      format,
      tokens,
    },
    extraction,
  };
}

/**
 * Build pattern tokens based on word order and role markers.
 */
function buildTokens(
  schema: CommandSchema,
  profile: PatternGenLanguageProfile,
  keyword: string
): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Sort roles by word order
  const sortedRoles = sortRolesByWordOrder(schema.roles, profile.wordOrder);

  // For SVO: [action, patient, destination, source, ...]
  if (profile.wordOrder === 'SVO') {
    // Add keyword first
    tokens.push({ type: 'literal', value: keyword });

    // Add roles with markers
    for (const role of sortedRoles) {
      addRoleWithMarker(tokens, role, profile);
    }
  }
  // For SOV: [patient, destination, source, ..., action]
  else if (profile.wordOrder === 'SOV') {
    // Add roles with markers first
    for (const role of sortedRoles) {
      addRoleWithMarker(tokens, role, profile);
    }

    // Add keyword last
    tokens.push({ type: 'literal', value: keyword });
  }
  // For VSO: [action, destination, patient, source, ...]
  else if (profile.wordOrder === 'VSO') {
    // Add keyword first
    tokens.push({ type: 'literal', value: keyword });

    // Add roles with markers
    for (const role of sortedRoles) {
      addRoleWithMarker(tokens, role, profile);
    }
  }
  // Other word orders can be added as needed
  else {
    // Fallback to SVO-style ordering
    tokens.push({ type: 'literal', value: keyword });
    for (const role of sortedRoles) {
      addRoleWithMarker(tokens, role, profile);
    }
  }

  return tokens;
}

/**
 * Add a role token with its grammatical marker if needed.
 */
function addRoleWithMarker(
  tokens: PatternToken[],
  roleSpec: RoleSpec,
  profile: PatternGenLanguageProfile
): void {
  const marker = getMarkerForRole(roleSpec, profile);

  if (marker) {
    const markerInfo = profile.roleMarkers?.[roleSpec.role];
    const position = markerInfo?.position ?? 'before';

    if (position === 'before') {
      // Preposition: marker before role
      tokens.push({ type: 'literal', value: marker });
      tokens.push({
        type: 'role',
        role: roleSpec.role,
        optional: !roleSpec.required,
        expectedTypes: roleSpec.expectedTypes,
      });
    } else {
      // Postposition/particle: role before marker
      tokens.push({
        type: 'role',
        role: roleSpec.role,
        optional: !roleSpec.required,
        expectedTypes: roleSpec.expectedTypes,
      });
      tokens.push({ type: 'literal', value: marker });
    }
  } else {
    // No marker - just add the role
    tokens.push({
      type: 'role',
      role: roleSpec.role,
      optional: !roleSpec.required,
      expectedTypes: roleSpec.expectedTypes,
    });
  }
}

/**
 * Get the grammatical marker for a role from the profile.
 */
function getMarkerForRole(
  roleSpec: RoleSpec,
  profile: PatternGenLanguageProfile
): string | undefined {
  // Check for role-specific override first
  if (roleSpec.markerOverride?.[profile.code]) {
    return roleSpec.markerOverride[profile.code];
  }

  // Use profile's default marker for this role
  return profile.roleMarkers?.[roleSpec.role]?.primary;
}

/**
 * Sort roles by word order for pattern building.
 */
function sortRolesByWordOrder(roles: RoleSpec[], wordOrder: string): RoleSpec[] {
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

/**
 * Build extraction rules for capturing role values during parsing.
 */
function buildExtractionRules(
  schema: CommandSchema,
  profile: PatternGenLanguageProfile
): Record<string, ExtractionRule> {
  const rules: Record<string, ExtractionRule> = {};

  for (const roleSpec of schema.roles) {
    // Build the rule object correctly with readonly properties
    const marker = getMarkerForRole(roleSpec, profile);

    const rule: ExtractionRule = {
      ...(roleSpec.default !== undefined && { default: roleSpec.default }),
      ...(marker && { marker }),
    };

    rules[roleSpec.role] = rule;
  }

  return rules;
}

/**
 * Build a human-readable format string for the pattern.
 */
function buildFormatString(
  schema: CommandSchema,
  profile: PatternGenLanguageProfile,
  keyword: string
): string {
  const parts: string[] = [];

  if (profile.wordOrder === 'SVO' || profile.wordOrder === 'VSO') {
    parts.push(keyword);
  }

  for (const role of schema.roles) {
    const marker = getMarkerForRole(role, profile);
    const roleName = `{${role.role}}`;

    if (marker) {
      const markerInfo = profile.roleMarkers?.[role.role];
      if (markerInfo?.position === 'after') {
        parts.push(`${roleName} ${marker}`);
      } else {
        parts.push(`${marker} ${roleName}`);
      }
    } else {
      parts.push(roleName);
    }
  }

  if (profile.wordOrder === 'SOV') {
    parts.push(keyword);
  }

  return parts.join(' ');
}

/**
 * Generate multiple pattern variants (with and without optional roles).
 */
export function generatePatternVariants(
  schema: CommandSchema,
  profile: PatternGenLanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // Main pattern (all roles)
  patterns.push(generatePattern(schema, profile, config));

  // TODO: Generate variants with optional roles omitted
  // This can be added later when needed

  return patterns;
}
