/**
 * Pattern Generator
 *
 * Generates LanguagePattern objects from CommandSchema + LanguageProfile.
 * This solves the pattern explosion problem by deriving patterns from
 * high-level definitions rather than hand-writing each one.
 */

import type { LanguagePattern, PatternToken, ExtractionRule } from '../types';
import type { LanguageProfile } from './language-profiles';
import type { CommandSchema, RoleSpec } from './command-schemas';
import { getDefinedSchemas } from './command-schemas';

// Import shared utilities
import { sortRolesByWordOrder } from '../parser/utils/role-positioning';
import { resolveMarkerForRole } from '../parser/utils/marker-resolution';

// Import word-order-specific event handler generators
import {
  generateSOVEventHandlerPattern,
  generateSOVPatientFirstEventHandlerPattern,
  generateSOVPatientFirstWithDestEventHandlerPattern,
  generateSOVCompactEventHandlerPattern,
  generateSOVSimpleEventHandlerPattern,
  generateSOVTemporalEventHandlerPattern,
  generateSOVTwoRoleEventHandlerPattern,
  generateSOVTwoRoleDestFirstEventHandlerPattern,
} from './event-handlers-sov';
import {
  generateVSOEventHandlerPattern,
  generateVSOVerbFirstEventHandlerPattern,
  generateVSOVerbFirstTwoRoleEventHandlerPattern,
  generateVSOTwoRoleEventHandlerPattern,
  generateVSONegatedEventHandlerPattern,
  generateVSOProcliticEventHandlerPattern,
} from './event-handlers-vso';

// Note: languageProfiles is no longer imported here.
// Pattern generation for specific languages uses the registry instead.

// Import registry functions - this is safe because:
// 1. Registry doesn't import pattern-generator
// 2. The circular path is: pattern-generator -> registry -> pattern-generator
//    But registry only uses setPatternGenerator which is exported, not module-level code
import {
  getRegisteredLanguages as registryGetLanguages,
  tryGetProfile as registryTryGetProfile,
} from '../registry';

function getAllRegisteredProfiles(): LanguageProfile[] {
  const languages = registryGetLanguages();
  return languages
    .map((lang: string) => registryTryGetProfile(lang))
    .filter((p): p is LanguageProfile => p !== undefined);
}

// =============================================================================
// Pattern Generator
// =============================================================================

/**
 * Configuration for pattern generation.
 */
export interface GeneratorConfig {
  /** Base priority for generated patterns (higher = checked first) */
  basePriority?: number;
  /** Whether to generate simple patterns (without optional roles) */
  generateSimpleVariants?: boolean;
  /** Whether to generate alternative keyword patterns */
  generateAlternatives?: boolean;
}

const defaultConfig: GeneratorConfig = {
  basePriority: 100,
  generateSimpleVariants: true,
  generateAlternatives: true,
};

/**
 * Generate a pattern for a command in a specific language.
 */
export function generatePattern(
  schema: CommandSchema,
  profile: LanguageProfile,
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
  const tokens = buildTokens(schema, profile, keyword);

  // Build extraction rules with defaults for optional roles
  // This ensures defaults are applied even when optional groups don't match
  const extraction = buildExtractionRulesWithDefaults(schema, profile);

  // Build template format string (for documentation)
  const format = buildFormatString(schema, profile, keyword);

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
 * Generate a simple variant pattern (without optional roles).
 */
export function generateSimplePattern(
  schema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern | null {
  // Only generate simple variant if there are optional roles
  const optionalRoles = schema.roles.filter(r => !r.required);
  if (optionalRoles.length === 0) {
    return null;
  }

  const requiredRoles = schema.roles.filter(r => r.required);
  const simpleSchema: CommandSchema = {
    ...schema,
    roles: requiredRoles,
  };

  const pattern = generatePattern(simpleSchema, profile, config);

  // Adjust for simple variant
  return {
    ...pattern,
    id: `${schema.action}-${profile.code}-simple`,
    priority: (config.basePriority ?? 100) - 5, // Lower priority than full pattern (was -10)
    extraction: buildExtractionRulesWithDefaults(schema, profile),
  };
}

/**
 * Generate all pattern variants for a command in a language.
 */
export function generatePatternVariants(
  schema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // Main pattern
  patterns.push(generatePattern(schema, profile, config));

  // Simple variant (without optional roles)
  if (config.generateSimpleVariants) {
    const simple = generateSimplePattern(schema, profile, config);
    if (simple) {
      patterns.push(simple);
    }
  }

  return patterns;
}

/**
 * Generate patterns for all commands in a specific language.
 */
export function generatePatternsForLanguage(
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];
  const schemas = getDefinedSchemas();

  for (const schema of schemas) {
    // Skip if no keyword translation exists
    if (!profile.keywords[schema.action]) {
      continue;
    }

    // Generate simple command patterns
    const variants = generatePatternVariants(schema, profile, config);
    patterns.push(...variants);

    // Generate event handler patterns (on [event] [command] [patient])
    // Only generate for languages with eventHandler configuration
    if (profile.eventHandler?.eventMarker) {
      const eventHandlerPatterns = generateEventHandlerPatterns(schema, profile, config);
      patterns.push(...eventHandlerPatterns);
    }
  }

  return patterns;
}

/**
 * Generate patterns for a command across specified profiles.
 *
 * @param schema Command schema to generate patterns for
 * @param profiles Array of language profiles to generate patterns for (defaults to all registered)
 * @param config Generator configuration
 */
export function generatePatternsForCommand(
  schema: CommandSchema,
  profiles?: LanguageProfile[],
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // If no profiles provided, use all registered profiles
  const profilesToUse = profiles ?? getAllRegisteredProfiles();

  for (const profile of profilesToUse) {
    // Skip if no keyword translation exists
    if (!profile.keywords[schema.action]) {
      continue;
    }

    const variants = generatePatternVariants(schema, profile, config);
    patterns.push(...variants);
  }

  return patterns;
}

/**
 * Generate all patterns for all commands across specified profiles.
 *
 * @param profiles Array of language profiles to generate patterns for (defaults to all registered)
 * @param config Generator configuration
 */
export function generateAllPatterns(
  profiles?: LanguageProfile[],
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // If no profiles provided, use all registered profiles
  const profilesToUse = profiles ?? getAllRegisteredProfiles();

  for (const profile of profilesToUse) {
    const langPatterns = generatePatternsForLanguage(profile, config);
    patterns.push(...langPatterns);
  }

  return patterns;
}

/**
 * Generate event handler patterns for a command in a specific language.
 *
 * Creates patterns that wrap commands with event handlers (e.g., "on click toggle .active").
 * Automatically handles SOV, SVO, and VSO word orders based on language profile.
 *
 * @param commandSchema - The command to wrap (toggle, add, remove, etc.)
 * @param profile - Language profile with eventHandler configuration
 * @param config - Generator configuration
 * @returns Array of event handler patterns (empty if profile lacks eventHandler config)
 */
export function generateEventHandlerPatterns(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  // Only generate if profile has eventHandler configuration
  if (!profile.eventHandler || !profile.eventHandler.eventMarker) {
    return [];
  }

  const patterns: LanguagePattern[] = [];
  const eventMarker = profile.eventHandler.eventMarker;
  const keyword = profile.keywords[commandSchema.action];

  if (!keyword) {
    return []; // No translation for this command
  }

  // Check if this is a two-role command (like put, set)
  const requiredRoles = commandSchema.roles.filter(r => r.required);
  const hasTwoRequiredRoles = requiredRoles.length === 2;

  // Generate pattern based on word order
  if (profile.wordOrder === 'SOV') {
    if (hasTwoRequiredRoles) {
      // Two-role SOV pattern for put/set commands (event-first)
      // Japanese put: 入力 で "test" を #output に 入れる
      // Korean set: 변경 할 때 x 를 10 으로 설정
      patterns.push(
        generateSOVTwoRoleEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );

      // Two-role SOV pattern (destination-first variant)
      // Bengali set: @disabled কে ক্লিক এ সেট সত্য তে
      // Quechua set: x ta ñitiy pi 10 man churay
      patterns.push(
        generateSOVTwoRoleDestFirstEventHandlerPattern(
          commandSchema,
          profile,
          keyword,
          eventMarker,
          config
        )
      );
    } else {
      // SOV: [event] [eventMarker] [destination? destMarker?] [patient] [patientMarker] [verb]
      // Japanese: クリック で #button の .active を 切り替え
      // Korean: 클릭 할 때 #button 의 .active 를 토글
      // Turkish: tıklama da #button ın .active i değiştir
      patterns.push(
        generateSOVEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );

      // Patient-first SOV variants: patient before event (common in Bengali, Quechua)
      // Bengali: .active কে ক্লিক এ টগল  (patient + event + verb)
      // Quechua: .highlight ta noqa man ñitiy pi yapay  (patient + dest + event + verb)
      // Both orders are valid in SOV languages depending on topic/focus.

      // Variant 1: Simple (no destination) — higher priority
      patterns.push(
        generateSOVPatientFirstEventHandlerPattern(
          commandSchema,
          profile,
          keyword,
          eventMarker,
          config
        )
      );

      // Variant 2: With destination (required, not optional) — lower priority
      // Only add if destination marker differs from event marker to avoid collision
      const destMarkerCheck = profile.roleMarkers.destination;
      if (destMarkerCheck && destMarkerCheck.primary !== eventMarker.primary) {
        patterns.push(
          generateSOVPatientFirstWithDestEventHandlerPattern(
            commandSchema,
            profile,
            keyword,
            eventMarker,
            config
          )
        );
      }

      // For multi-word event markers with no-space alternatives (Korean compact forms),
      // also generate a pattern that accepts the compact form
      // Example: 클릭할때 .active를토글 (할때 as single token)
      const markerWords = eventMarker.primary.split(/\s+/);
      const hasNoSpaceAlternative = eventMarker.alternatives?.some(
        alt => !alt.includes(' ') && alt.length > 1
      );
      if (markerWords.length > 1 && hasNoSpaceAlternative) {
        patterns.push(
          generateSOVCompactEventHandlerPattern(
            commandSchema,
            profile,
            keyword,
            eventMarker,
            config
          )
        );
      }

      // Add simple pattern (no patient required, defaults to 'me')
      // Supports: クリック で 増加 (click on increment)
      patterns.push(
        generateSOVSimpleEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );

      // Add temporal pattern if temporalMarkers defined
      // Supports: クリック の 時 .active を 切り替え (click's time toggle .active)
      const temporalPattern = generateSOVTemporalEventHandlerPattern(
        commandSchema,
        profile,
        keyword,
        config
      );
      if (temporalPattern) {
        patterns.push(temporalPattern);
      }
    }
  } else if (profile.wordOrder === 'VSO') {
    if (hasTwoRequiredRoles) {
      // Two-role VSO pattern for put/set commands (event-first)
      // Arabic put: عند الإدخال ضع "test" في #output
      patterns.push(
        generateVSOTwoRoleEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );

      // Two-role VSO verb-first variant (event handler at end)
      // Tagalog: itakda aking *background sa "red" kapag click
      patterns.push(
        generateVSOVerbFirstTwoRoleEventHandlerPattern(
          commandSchema,
          profile,
          keyword,
          eventMarker,
          config
        )
      );
    } else {
      // VSO: [eventMarker] [event] [verb] [patient] [على destination?]
      // Arabic: عند النقر بدّل .active على #button
      patterns.push(
        generateVSOEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );

      // VSO verb-first variant: [verb] [patient] [eventMarker] [event]
      // Tagalog: alisin ako kapag click (remove me on click)
      // Tagalog: palitan .active kapag click (toggle .active on click)
      patterns.push(
        generateVSOVerbFirstEventHandlerPattern(
          commandSchema,
          profile,
          keyword,
          eventMarker,
          config
        )
      );

      // Add negated event pattern variant for languages with negation markers
      // Pattern: [eventMarker] [negation] [event] [verb] [patient]
      // Example: عند عدم التركيز أخف #tooltip = "on blur hide #tooltip"
      if (profile.eventHandler?.negationMarker) {
        patterns.push(
          generateVSONegatedEventHandlerPattern(
            commandSchema,
            profile,
            keyword,
            eventMarker,
            config
          )
        );
      }

      // Add proclitic-prefixed pattern variant for Arabic
      // Pattern: [proclitic]? [event] [verb] [patient]
      // Example: والنقر بدّل .active (and click toggle .active)
      if (profile.tokenization?.prefixes) {
        patterns.push(
          generateVSOProcliticEventHandlerPattern(commandSchema, profile, keyword, config)
        );
      }
    }
  } else {
    // SVO: Use VSO pattern structure for event handlers
    if (hasTwoRequiredRoles) {
      patterns.push(
        generateVSOTwoRoleEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );
    } else {
      patterns.push(
        generateVSOEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );
    }
  }

  return patterns;
}

// =============================================================================
// Token Building
// =============================================================================

/**
 * Build pattern tokens based on word order.
 */
function buildTokens(
  schema: CommandSchema,
  profile: LanguageProfile,
  keyword: { primary: string; alternatives?: string[] }
): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Get verb token
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };

  // Get role tokens sorted by position
  const roleTokens = buildRoleTokens(schema, profile);

  // Arrange based on word order
  switch (profile.wordOrder) {
    case 'SVO':
      // Verb first, then roles in order
      tokens.push(verbToken);
      tokens.push(...roleTokens);
      break;

    case 'SOV':
      // Roles first (reversed for SOV), then verb
      tokens.push(...roleTokens);
      tokens.push(verbToken);
      break;

    case 'VSO':
      // Verb first, then subject, then object
      tokens.push(verbToken);
      tokens.push(...roleTokens);
      break;

    default:
      // Default to SVO
      tokens.push(verbToken);
      tokens.push(...roleTokens);
  }

  return tokens;
}

/**
 * Build tokens for roles.
 */
function buildRoleTokens(schema: CommandSchema, profile: LanguageProfile): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Sort roles by position using shared utility
  const sortedRoles = sortRolesByWordOrder(schema.roles, profile.wordOrder);

  for (const roleSpec of sortedRoles) {
    const roleToken = buildRoleToken(roleSpec, profile);

    if (!roleSpec.required) {
      // Wrap optional roles in a group
      tokens.push({
        type: 'group',
        optional: true,
        tokens: roleToken,
      });
    } else {
      tokens.push(...roleToken);
    }
  }

  return tokens;
}

/**
 * Build token(s) for a single role.
 */
function buildRoleToken(roleSpec: RoleSpec, profile: LanguageProfile): PatternToken[] {
  const tokens: PatternToken[] = [];

  // Check for command-specific marker override first
  const overrideMarker = roleSpec.markerOverride?.[profile.code];
  const defaultMarker = profile.roleMarkers[roleSpec.role];

  // Role value token
  const roleValueToken: PatternToken = {
    type: 'role',
    role: roleSpec.role,
    optional: !roleSpec.required,
    expectedTypes: roleSpec.expectedTypes,
  };

  // Use override marker if available, otherwise use default
  if (overrideMarker !== undefined) {
    // Command-specific marker override
    const position = defaultMarker?.position ?? 'before';
    if (position === 'before') {
      if (overrideMarker) {
        tokens.push({ type: 'literal', value: overrideMarker });
      }
      tokens.push(roleValueToken);
    } else {
      tokens.push(roleValueToken);
      if (overrideMarker) {
        tokens.push({ type: 'literal', value: overrideMarker });
      }
    }
  } else if (defaultMarker) {
    if (defaultMarker.position === 'before') {
      // Preposition: "on #button"
      if (defaultMarker.primary) {
        const markerToken: PatternToken = defaultMarker.alternatives
          ? {
              type: 'literal',
              value: defaultMarker.primary,
              alternatives: defaultMarker.alternatives,
            }
          : { type: 'literal', value: defaultMarker.primary };
        tokens.push(markerToken);
      }
      tokens.push(roleValueToken);
    } else {
      // Postposition/particle: "#button に"
      tokens.push(roleValueToken);
      const markerToken: PatternToken = defaultMarker.alternatives
        ? {
            type: 'literal',
            value: defaultMarker.primary,
            alternatives: defaultMarker.alternatives,
          }
        : { type: 'literal', value: defaultMarker.primary };
      tokens.push(markerToken);
    }
  } else {
    // No marker, just the role value
    tokens.push(roleValueToken);
  }

  return tokens;
}

// =============================================================================
// Extraction Rules Building
// =============================================================================

/**
 * Build extraction rules for a pattern.
 */
function buildExtractionRules(
  schema: CommandSchema,
  profile: LanguageProfile
): Record<string, ExtractionRule> {
  const rules: Record<string, ExtractionRule> = {};

  for (const roleSpec of schema.roles) {
    // Check for command-specific marker override first
    const overrideMarker = roleSpec.markerOverride?.[profile.code];
    const defaultMarker = profile.roleMarkers[roleSpec.role];

    if (overrideMarker !== undefined) {
      // Use the override marker
      rules[roleSpec.role] = overrideMarker ? { marker: overrideMarker } : {};
    } else if (defaultMarker && defaultMarker.primary) {
      rules[roleSpec.role] = defaultMarker.alternatives
        ? { marker: defaultMarker.primary, markerAlternatives: defaultMarker.alternatives }
        : { marker: defaultMarker.primary };
    } else {
      rules[roleSpec.role] = {};
    }
  }

  return rules;
}

/**
 * Build extraction rules with defaults for optional roles.
 */
function buildExtractionRulesWithDefaults(
  schema: CommandSchema,
  profile: LanguageProfile
): Record<string, ExtractionRule> {
  const baseRules = buildExtractionRules(schema, profile);
  const rules: Record<string, ExtractionRule> = {};

  // Copy base rules and add defaults for optional roles
  for (const roleSpec of schema.roles) {
    const baseRule = baseRules[roleSpec.role] || {};

    if (!roleSpec.required && roleSpec.default) {
      rules[roleSpec.role] = { ...baseRule, default: roleSpec.default };
    } else {
      rules[roleSpec.role] = baseRule;
    }
  }

  return rules;
}

// =============================================================================
// Format String Building
// =============================================================================

/**
 * Build a human-readable format string for documentation.
 */
function buildFormatString(
  schema: CommandSchema,
  profile: LanguageProfile,
  keyword: { primary: string }
): string {
  const parts: string[] = [];

  // Sort roles by position using shared utility
  const sortedRoles = sortRolesByWordOrder(schema.roles, profile.wordOrder);

  // Build role parts
  const roleParts = sortedRoles.map(roleSpec => {
    // Use shared marker resolution utility
    const resolved = resolveMarkerForRole(roleSpec, profile);
    let part = '';

    if (resolved && resolved.primary) {
      // Has a marker
      if (resolved.position === 'before') {
        part = `${resolved.primary} {${roleSpec.role}}`;
      } else {
        part = `{${roleSpec.role}} ${resolved.primary}`;
      }
    } else {
      // No marker
      part = `{${roleSpec.role}}`;
    }

    return roleSpec.required ? part : `[${part}]`;
  });

  // Arrange based on word order
  switch (profile.wordOrder) {
    case 'SVO':
    case 'VSO':
      parts.push(keyword.primary, ...roleParts);
      break;
    case 'SOV':
      parts.push(...roleParts, keyword.primary);
      break;
    default:
      parts.push(keyword.primary, ...roleParts);
  }

  return parts.join(' ');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a summary of what patterns can be generated.
 * Note: This requires the registry to have languages registered.
 */
export function getGeneratorSummary(): {
  languages: string[];
  commands: string[];
  totalPatterns: number;
} {
  const languages = registryGetLanguages();
  const commands = getDefinedSchemas().map(s => s.action);

  // Estimate total patterns (2 variants per command per language)
  let totalPatterns = 0;
  for (const lang of languages) {
    const profile = registryTryGetProfile(lang);
    if (profile) {
      for (const schema of getDefinedSchemas()) {
        if (profile.keywords[schema.action]) {
          totalPatterns += 2; // Full + simple variant
        }
      }
    }
  }

  return { languages, commands, totalPatterns };
}

/**
 * Validate that all required keywords exist for a language.
 */
export function validateLanguageKeywords(
  profile: LanguageProfile,
  schemas: CommandSchema[] = getDefinedSchemas()
): { missing: string[]; available: string[] } {
  const missing: string[] = [];
  const available: string[] = [];

  for (const schema of schemas) {
    if (profile.keywords[schema.action]) {
      available.push(schema.action);
    } else {
      missing.push(schema.action);
    }
  }

  return { missing, available };
}
