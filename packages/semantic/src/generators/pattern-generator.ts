/**
 * Pattern Generator
 *
 * Generates LanguagePattern objects from CommandSchema + LanguageProfile.
 * This solves the pattern explosion problem by deriving patterns from
 * high-level definitions rather than hand-writing each one.
 */

import type { LanguagePattern, PatternToken, ExtractionRule } from '../types';
import type { LanguageProfile, KeywordTranslation, RoleMarker } from './language-profiles';
import type { CommandSchema, RoleSpec } from './command-schemas';
import { getDefinedSchemas } from './command-schemas';

// Import shared utilities
import { sortRolesByWordOrder } from '../parser/utils/role-positioning';
import { resolveMarkerForRole } from '../parser/utils/marker-resolution';

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
      // Two-role SOV pattern for put/set commands
      // Japanese put: 入力 で "test" を #output に 入れる
      // Korean set: 변경 할 때 x 를 10 으로 설정
      patterns.push(
        generateSOVTwoRoleEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );
    } else {
      // SOV: [event] [eventMarker] [destination? destMarker?] [patient] [patientMarker] [verb]
      // Japanese: クリック で #button の .active を 切り替え
      // Korean: 클릭 할 때 #button 의 .active 를 토글
      // Turkish: tıklama da #button ın .active i değiştir
      patterns.push(
        generateSOVEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );

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
    }
  } else if (profile.wordOrder === 'VSO') {
    if (hasTwoRequiredRoles) {
      // Two-role VSO pattern for put/set commands
      // Arabic put: عند الإدخال ضع "test" في #output
      patterns.push(
        generateVSOTwoRoleEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
      );
    } else {
      // VSO: [eventMarker] [event] [verb] [patient] [على destination?]
      // Arabic: عند النقر بدّل .active على #button
      patterns.push(
        generateVSOEventHandlerPattern(commandSchema, profile, keyword, eventMarker, config)
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

/**
 * Generate SOV event handler pattern (Japanese, Korean, Turkish).
 */
function generateSOVEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Event marker (after event in SOV)
  // Handle multi-word markers like Korean "할 때" by splitting into separate tokens
  if (eventMarker.position === 'after') {
    const markerWords = eventMarker.primary.split(/\s+/);
    if (markerWords.length > 1) {
      // Multi-word marker: create a token for each word
      for (const word of markerWords) {
        tokens.push({ type: 'literal', value: word });
      }
    } else {
      // Single-word marker: include alternatives
      const markerToken: PatternToken = eventMarker.alternatives
        ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
        : { type: 'literal', value: eventMarker.primary };
      tokens.push(markerToken);
    }
  }

  // Optional destination with its marker
  const destMarker = profile.roleMarkers.destination;
  if (destMarker) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [
        { type: 'role', role: 'destination', optional: true },
        destMarker.alternatives
          ? { type: 'literal', value: destMarker.primary, alternatives: destMarker.alternatives }
          : { type: 'literal', value: destMarker.primary },
      ],
    });
  }

  // Patient role
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Patient marker (postposition/particle after patient)
  const patientMarker = profile.roleMarkers.patient;
  if (patientMarker) {
    const patMarkerToken: PatternToken = patientMarker.alternatives
      ? { type: 'literal', value: patientMarker.primary, alternatives: patientMarker.alternatives }
      : { type: 'literal', value: patientMarker.primary };
    tokens.push(patMarkerToken);
  }

  // Command verb at end (SOV)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 50, // Higher priority than simple commands
    template: {
      format: `{event} ${eventMarker.primary} {destination?} {patient} ${patientMarker?.primary || ''} ${keyword.primary}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination', default: { type: 'reference', value: 'me' } },
    },
  };
}

/**
 * Generate SOV compact event handler pattern for languages with no-space forms.
 *
 * This handles Korean compact forms where the event marker is attached directly
 * to the event word without a space:
 * - 클릭할때 .active를토글 (click+when toggle .active)
 *
 * The pattern uses a single token for the no-space marker alternatives.
 */
function generateSOVCompactEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Event marker as single token (using no-space alternatives)
  // Filter alternatives to only include no-space versions
  const noSpaceAlternatives =
    eventMarker.alternatives?.filter(alt => !alt.includes(' ') && alt.length > 1) || [];

  if (noSpaceAlternatives.length > 0) {
    tokens.push({
      type: 'literal',
      value: noSpaceAlternatives[0],
      alternatives: noSpaceAlternatives.slice(1),
    });
  }

  // Optional destination with its marker
  const destMarker = profile.roleMarkers.destination;
  if (destMarker) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [
        { type: 'role', role: 'destination', optional: true },
        destMarker.alternatives
          ? { type: 'literal', value: destMarker.primary, alternatives: destMarker.alternatives }
          : { type: 'literal', value: destMarker.primary },
      ],
    });
  }

  // Patient role
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Patient marker (postposition/particle after patient)
  const patientMarker = profile.roleMarkers.patient;
  if (patientMarker) {
    const patMarkerToken: PatternToken = patientMarker.alternatives
      ? { type: 'literal', value: patientMarker.primary, alternatives: patientMarker.alternatives }
      : { type: 'literal', value: patientMarker.primary };
    tokens.push(patMarkerToken);
  }

  // Command verb at end (SOV)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-compact`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 52, // Slightly higher priority for compact forms
    template: {
      format: `{event}${noSpaceAlternatives[0] || ''} {patient} ${keyword.primary}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination', default: { type: 'reference', value: 'me' } },
    },
  };
}

/**
 * Generate VSO event handler pattern (Arabic).
 */
function generateVSOEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Event marker (before event in VSO)
  if (eventMarker.position === 'before') {
    const markerToken: PatternToken = eventMarker.alternatives
      ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
      : { type: 'literal', value: eventMarker.primary };
    tokens.push(markerToken);
  }

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Command verb (verb comes early in VSO)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Patient role
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Optional destination with preposition
  const destMarker = profile.roleMarkers.destination;
  if (destMarker) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [
        destMarker.alternatives
          ? { type: 'literal', value: destMarker.primary, alternatives: destMarker.alternatives }
          : { type: 'literal', value: destMarker.primary },
        { type: 'role', role: 'destination', optional: true },
      ],
    });
  }

  return {
    id: `${commandSchema.action}-event-${profile.code}-vso`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 50, // Higher priority than simple commands
    template: {
      format: `${eventMarker.primary} {event} ${keyword.primary} {patient} ${destMarker?.primary || ''} {destination?}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination', default: { type: 'reference', value: 'me' } },
    },
  };
}

/**
 * Generate SOV two-role event handler pattern (for put/set commands).
 *
 * Patterns:
 * - Japanese put: 入力 で "test" を #output に 入れる
 *   [event] [eventMarker] [patient] [patientMarker] [destination] [destMarker] [verb]
 * - Korean set: 변경 할 때 x 를 10 으로 설정
 *   [event] [eventMarker] [role1] [role1Marker] [role2] [role2Marker] [verb]
 * - Turkish put: giriş de "test" i #output a koy
 *   [event] [eventMarker] [patient] [patientMarker] [destination] [destMarker] [verb]
 */
function generateSOVTwoRoleEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Event marker (after event in SOV)
  // Handle multi-word markers like Korean "할 때" by splitting into separate tokens
  if (eventMarker.position === 'after') {
    const markerWords = eventMarker.primary.split(/\s+/);
    if (markerWords.length > 1) {
      // Multi-word marker: create a token for each word
      for (const word of markerWords) {
        tokens.push({ type: 'literal', value: word });
      }
    } else {
      // Single-word marker: include alternatives
      const markerToken: PatternToken = eventMarker.alternatives
        ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
        : { type: 'literal', value: eventMarker.primary };
      tokens.push(markerToken);
    }
  }

  // Get the two required roles from the schema
  const requiredRoles = commandSchema.roles.filter(r => r.required);

  // Sort by SOV position (lower number = earlier in sentence)
  const sortedRoles = [...requiredRoles].sort((a, b) => {
    const aPos = a.sovPosition ?? 999;
    const bPos = b.sovPosition ?? 999;
    return aPos - bPos;
  });

  // Add each role with its marker
  for (const roleSpec of sortedRoles) {
    // Add the role
    tokens.push({ type: 'role', role: roleSpec.role, optional: false });

    // Get marker for this role - check for override first
    let marker: string | undefined;
    let markerAlternatives: string[] | undefined;

    if (roleSpec.markerOverride && roleSpec.markerOverride[profile.code]) {
      // Use the override marker
      marker = roleSpec.markerOverride[profile.code];
    } else {
      // Use default role marker from profile
      const roleMarker = profile.roleMarkers[roleSpec.role];
      if (roleMarker) {
        marker = roleMarker.primary;
        markerAlternatives = roleMarker.alternatives;
      }
    }

    // Add the marker token
    if (marker) {
      const markerToken: PatternToken = markerAlternatives
        ? { type: 'literal', value: marker, alternatives: markerAlternatives }
        : { type: 'literal', value: marker };
      tokens.push(markerToken);
    }
  }

  // Command verb at end (SOV)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Build format string
  const roleNames = sortedRoles.map(r => `{${r.role}}`).join(' ');

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-2role`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 55, // Higher priority than single-role patterns
    template: {
      format: `{event} ${eventMarker.primary} ${roleNames} ${keyword.primary}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination' },
    },
  };
}

/**
 * Generate VSO two-role event handler pattern (for put/set commands).
 *
 * Patterns:
 * - Arabic put: عند الإدخال ضع "test" في #output
 *   [eventMarker] [event] [verb] [patient] [destPrep] [destination]
 * - Arabic set: عند التغيير عيّن x إلى 10
 *   [eventMarker] [event] [verb] [destination] [patientPrep] [patient]
 */
function generateVSOTwoRoleEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Event marker (before event in VSO)
  if (eventMarker.position === 'before') {
    const markerToken: PatternToken = eventMarker.alternatives
      ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
      : { type: 'literal', value: eventMarker.primary };
    tokens.push(markerToken);
  }

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Command verb (verb comes early in VSO)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Get the two required roles from the schema
  const requiredRoles = commandSchema.roles.filter(r => r.required);

  // Sort by SVO position for VSO (role order is similar)
  const sortedRoles = [...requiredRoles].sort((a, b) => {
    const aPos = a.svoPosition ?? 999;
    const bPos = b.svoPosition ?? 999;
    return aPos - bPos;
  });

  // Add each role with its preposition/marker
  for (const roleSpec of sortedRoles) {
    // Get marker for this role - check for override first
    let marker: string | undefined;
    let markerAlternatives: string[] | undefined;

    if (roleSpec.markerOverride && roleSpec.markerOverride[profile.code]) {
      // Use the override marker
      marker = roleSpec.markerOverride[profile.code];
    } else {
      // Use default role marker from profile
      const roleMarker = profile.roleMarkers[roleSpec.role];
      if (roleMarker) {
        marker = roleMarker.primary;
        markerAlternatives = roleMarker.alternatives;
      }
    }

    // In VSO, prepositions come BEFORE the noun (prepositional languages)
    if (marker) {
      const markerToken: PatternToken = markerAlternatives
        ? { type: 'literal', value: marker, alternatives: markerAlternatives }
        : { type: 'literal', value: marker };
      tokens.push(markerToken);
    }

    // Add the role
    tokens.push({ type: 'role', role: roleSpec.role, optional: false });
  }

  // Build format string
  const roleNames = sortedRoles.map(r => `{${r.role}}`).join(' ');

  return {
    id: `${commandSchema.action}-event-${profile.code}-vso-2role`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 55, // Higher priority than single-role patterns
    template: {
      format: `${eventMarker.primary} {event} ${keyword.primary} ${roleNames}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination' },
    },
  };
}

/**
 * Generate VSO negated event handler pattern.
 *
 * Patterns:
 * - Arabic: عند عدم التركيز أخف #tooltip
 *   [eventMarker] [negation] [event] [verb] [patient]
 *
 * Used for events expressed as negation + opposite action:
 * - عدم التركيز = "not focusing" = blur
 */
function generateVSONegatedEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];
  const negationMarker = profile.eventHandler?.negationMarker;

  // Event marker (before event in VSO)
  if (eventMarker.position === 'before') {
    const markerToken: PatternToken = eventMarker.alternatives
      ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
      : { type: 'literal', value: eventMarker.primary };
    tokens.push(markerToken);
  }

  // Negation marker (e.g., عدم = "not/lack of")
  if (negationMarker) {
    const negToken: PatternToken = negationMarker.alternatives
      ? {
          type: 'literal',
          value: negationMarker.primary,
          alternatives: negationMarker.alternatives,
        }
      : { type: 'literal', value: negationMarker.primary };
    tokens.push(negToken);
  }

  // Event role (the action being negated, e.g., التركيز = "the focusing")
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Command verb (verb comes early in VSO)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Patient role
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Optional destination with preposition
  const destMarker = profile.roleMarkers.destination;
  if (destMarker) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [
        destMarker.alternatives
          ? { type: 'literal', value: destMarker.primary, alternatives: destMarker.alternatives }
          : { type: 'literal', value: destMarker.primary },
        { type: 'role', role: 'destination', optional: true },
      ],
    });
  }

  return {
    id: `${commandSchema.action}-event-${profile.code}-vso-negated`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 48, // Slightly lower priority than standard patterns
    template: {
      format: `${eventMarker.primary} ${negationMarker?.primary || ''} {event} ${keyword.primary} {patient} ${destMarker?.primary || ''} {destination?}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination', default: { type: 'reference', value: 'me' } },
    },
  };
}

/**
 * Generate VSO proclitic event handler pattern (for Arabic chained events).
 *
 * Patterns:
 * - Arabic: والنقر بدّل .active
 *   [proclitic] [event] [verb] [patient]
 * - Arabic: فالتحويم أضف .highlight
 *   [proclitic] [event] [verb] [patient]
 *
 * These patterns have a conjunction proclitic (و = and, ف = then) attached to
 * the event, without the عند event marker. Used for chained/consequent events.
 */
function generateVSOProcliticEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Required conjunction token (و = and, ف = then)
  // The conjunction must be present for this pattern - it distinguishes chained events from regular commands
  // Use normalized values since proclitics are tokenized as conjunction tokens
  tokens.push({
    type: 'literal',
    value: 'and', // Matches normalized 'and' (Arabic: و)
    alternatives: ['then'], // Also matches normalized 'then' (Arabic: ف)
  });

  // Event role (the event name, e.g., النقر = the click)
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Command verb (verb comes early in VSO)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Patient role
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Optional destination with preposition
  const destMarker = profile.roleMarkers.destination;
  if (destMarker) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [
        destMarker.alternatives
          ? { type: 'literal', value: destMarker.primary, alternatives: destMarker.alternatives }
          : { type: 'literal', value: destMarker.primary },
        { type: 'role', role: 'destination', optional: true },
      ],
    });
  }

  return {
    id: `${commandSchema.action}-event-${profile.code}-vso-proclitic`,
    language: profile.code,
    command: 'on', // This is an event handler pattern
    priority: (config.basePriority ?? 100) + 45, // Lower priority than standard patterns
    template: {
      format: `[proclitic?] {event} ${keyword.primary} {patient} ${destMarker?.primary || ''} {destination?}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action }, // Extract the wrapped command
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination', default: { type: 'reference', value: 'me' } },
    },
  };
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
    expectedTypes: roleSpec.expectedTypes as any,
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
