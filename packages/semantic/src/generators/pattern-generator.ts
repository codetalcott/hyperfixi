/**
 * Pattern Generator
 *
 * Generates LanguagePattern objects from CommandSchema + LanguageProfile.
 * This solves the pattern explosion problem by deriving patterns from
 * high-level definitions rather than hand-writing each one.
 */

import { createSchemaPatternGenerator, type SchemaPatternConfig } from '@lokascript/framework';
import type { LanguagePattern, PatternToken } from '../types';
import type { LanguageProfile } from './language-profiles';
import type { CommandSchema, RoleSpec } from './command-schemas';
import { getDefinedSchemas, withoutVariantOnlyRoles } from './command-schemas';

// Import word-order-specific event handler generators
import {
  generateSOVEventHandlerPattern,
  generateSOVPatientFirstEventHandlerPattern,
  generateSOVPatientFirstSourceFrontedEventHandlerPattern,
  generateSOVPatientFirstWithDestEventHandlerPattern,
  generateSOVCompactEventHandlerPattern,
  generateSOVSimpleEventHandlerPattern,
  generateSOVTemporalEventHandlerPattern,
  generateSOVTwoRoleEventHandlerPattern,
  generateSOVTwoRoleDestFirstEventHandlerPattern,
  generateSOVTwoRoleEventLastEventHandlerPattern,
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
 * Configuration for pattern generation: framework's `SchemaPatternConfig`
 * (basePriority, simple / alternative / verb-first variants).
 */
export type GeneratorConfig = SchemaPatternConfig;

const defaultConfig: GeneratorConfig = {
  basePriority: 100,
  generateSimpleVariants: true,
  generateAlternatives: true,
};

/**
 * Hyperscript's schemas through framework's schema-pattern generator (domains
 * rethink Phase 4.4). Their `svoPosition` / `sovPosition` sort ascending.
 */
const schemaPatterns = createSchemaPatternGenerator({ positionOrder: 'ascending' });

/**
 * Generate a pattern for a command in a specific language.
 */
export function generatePattern(
  schema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern {
  return schemaPatterns.generatePattern(schema, profile, config) as LanguagePattern;
}

/**
 * Generate a simple variant pattern (without optional roles).
 */
export function generateSimplePattern(
  schema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern | null {
  return schemaPatterns.generateSimplePattern(schema, profile, config) as LanguagePattern | null;
}

/**
 * Generate a verb-first fallback pattern for an SOV language (`トグル .active`
 * beside the canonical `.active を トグル`), below the canonical patterns.
 */
export function generateVerbFirstPattern(
  schema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern | null {
  return schemaPatterns.generateVerbFirstPattern(schema, profile, config) as LanguagePattern | null;
}

/**
 * Generate all pattern variants for a command in a language.
 */
export function generatePatternVariants(
  schema: CommandSchema,
  profile: LanguageProfile,
  config: GeneratorConfig = defaultConfig
): LanguagePattern[] {
  return schemaPatterns.generatePatternVariants(schema, profile, config) as LanguagePattern[];
}

/**
 * Build token(s) for a single role.
 *
 * Exported so the fused event-handler generators can build a wrapped command's
 * optional-role slots from the very same code the standalone command patterns
 * use — a hand-rolled copy there is what let the two drift apart in the first
 * place (see `appendRemainingOptionalRoles` in event-handlers-sov.ts).
 */
export function buildRoleToken(roleSpec: RoleSpec, profile: LanguageProfile): PatternToken[] {
  return schemaPatterns.buildRoleToken(roleSpec, profile) as PatternToken[];
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
      // A handler's fused patterns never carry a variant-only role.
      const eventHandlerPatterns = generateEventHandlerPatterns(
        withoutVariantOnlyRoles(schema),
        profile,
        config
      );
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

  // Roleless (bareKeyword) commands take no patient, but every fused shape
  // below hardwires a required {patient} role — fusing would swallow the next
  // token (a `then` connective, the following command's head) as junk patient.
  // They parse fine via the standard event pattern + bare command in the body.
  if (commandSchema.roles.length === 0) {
    return [];
  }

  // `js` is never fused either, for the opposite reason: its one role is not a
  // value, it is an opaque span of raw JavaScript that runs to the block's `end`.
  // No pattern slot can capture that — the matcher tokenizes and re-spaces it,
  // and `console.log("x")` comes back as `console .log ( "x" )`. The clause walk
  // has the two purpose-built consumers (`consumeJsBlock` /
  // `consumeVerbFinalJsBlock`), and a fused pattern's only effect is to reach the
  // verb FIRST and strand the body.
  //
  // It bit exactly where the marker shapes happened to line up: bn `ক্লিক তে জেএস`
  // and hi `click पर जेएस` match `{event} <marker> <verb>` outright, while ja
  // `クリック を で JS実行` and ko `클릭 을 에 JS실행` carry a second marker that
  // makes the same pattern miss — so ja/ko/tr/qu already took the clause walk and
  // bn/hi did not. That is a coincidence of surface, not a design.
  if (commandSchema.action === 'js') {
    return [];
  }

  // Check if this is a two-role command (like put, set)
  const requiredRoles = commandSchema.roles.filter(r => r.required);
  const hasTwoRequiredRoles = requiredRoles.length === 2;

  // Generate pattern based on word order
  if (profile.wordOrder === 'SOV') {
    if (hasTwoRequiredRoles) {
      // Two-role SOV pattern for put/set commands (event-first)
      // Japanese put: 入力 で "test" を #output に 入れる
      // Korean set: 변경 할 때 x 를 10 에 설정
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

      // Two-role SOV pattern (event-last variant) — the event phrase trails the
      // verb: Japanese put `"Done!" を 私 に 置く クリック で` (S4 put-content-basic).
      patterns.push(
        generateSOVTwoRoleEventLastEventHandlerPattern(
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

      // Variant 1b: Source-fronted (source phrase between patient and event,
      // both required) — qu's canonical order for source-carrying commands
      // (take/remove). Self-gates: null unless the schema has a source role
      // with a usable marker distinct from the event/patient markers.
      const sourceFronted = generateSOVPatientFirstSourceFrontedEventHandlerPattern(
        commandSchema,
        profile,
        keyword,
        eventMarker,
        config
      );
      if (sourceFronted) patterns.push(sourceFronted);

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

  // Below every pure head pattern (80–100 in a language's `on` set), their
  // relative order kept: the head wins wherever it matches, the fused forms
  // read what only they can (see EventHandlerConfig.headOutranksFused).
  if (profile.eventHandler.headOutranksFused) {
    return patterns.map(p => ({ ...p, priority: p.priority - 75 }));
  }
  return patterns;
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
