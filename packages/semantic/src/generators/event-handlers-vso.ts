/**
 * VSO Event Handler Pattern Generators
 *
 * Generates event handler patterns for Verb-Subject-Object languages:
 * Arabic, Tagalog. Also reused by SVO languages as fallback.
 *
 * Extracted from pattern-generator.ts for maintainability.
 */

import type { LanguagePattern, PatternToken } from '../types';
import type { LanguageProfile, KeywordTranslation, RoleMarker } from './language-profiles';
import type { CommandSchema } from './command-schemas';
import type { GeneratorConfig } from './pattern-generator';

/**
 * Generate VSO event handler pattern (Arabic).
 */
export function generateVSOEventHandlerPattern(
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
 * Generate VSO verb-first event handler pattern.
 *
 * For languages (like Tagalog) where the command comes before the event handler:
 * - Tagalog: alisin ako kapag click  (remove me on click)
 *   [verb] [patient] [eventMarker] [event]
 * - Tagalog: palitan .active kapag click  (toggle .active on click)
 *   [verb] [patient] [eventMarker] [event]
 */
export function generateVSOVerbFirstEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Command verb first (VSO)
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

  // Event marker at end
  if (eventMarker.position === 'before') {
    const markerToken: PatternToken = eventMarker.alternatives
      ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
      : { type: 'literal', value: eventMarker.primary };
    tokens.push(markerToken);
  }

  // Event role at end
  tokens.push({ type: 'role', role: 'event', optional: false });

  return {
    id: `${commandSchema.action}-event-${profile.code}-vso-verb-first`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 45, // Slightly lower than event-first variant
    template: {
      format: `${keyword.primary} {patient} ${destMarker?.primary || ''} {destination?} ${eventMarker.primary} {event}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action },
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination', default: { type: 'reference', value: 'me' } },
    },
  };
}

/**
 * Generate VSO verb-first two-role event handler pattern.
 *
 * For two-role commands (put/set) in VSO languages with event handler at end:
 * - Tagalog set: itakda aking *background sa "red" kapag click
 *   [verb] [role1] [role1Marker] [role2] [eventMarker] [event]
 */
export function generateVSOVerbFirstTwoRoleEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Command verb first
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Get the two required roles from the schema
  const requiredRoles = commandSchema.roles.filter(r => r.required);
  const sortedRoles = [...requiredRoles].sort((a, b) => {
    const aPos = a.svoPosition ?? 999;
    const bPos = b.svoPosition ?? 999;
    return aPos - bPos;
  });

  // Add each role with its marker (preposition before role for VSO)
  for (const roleSpec of sortedRoles) {
    let marker: string | undefined;
    let markerAlternatives: string[] | undefined;

    // Check for override — use !== undefined to allow empty string overrides
    if (roleSpec.markerOverride && roleSpec.markerOverride[profile.code] !== undefined) {
      marker = roleSpec.markerOverride[profile.code];
    } else {
      const roleMarker = profile.roleMarkers[roleSpec.role];
      if (roleMarker) {
        marker = roleMarker.primary;
        markerAlternatives = roleMarker.alternatives;
      }
    }

    // VSO languages use prepositions — marker comes BEFORE the role
    if (marker) {
      const markerToken: PatternToken = markerAlternatives
        ? { type: 'literal', value: marker, alternatives: markerAlternatives }
        : { type: 'literal', value: marker };
      tokens.push(markerToken);
    }

    tokens.push({ type: 'role', role: roleSpec.role, optional: false });
  }

  // Event marker at end
  if (eventMarker.position === 'before') {
    const markerToken: PatternToken = eventMarker.alternatives
      ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
      : { type: 'literal', value: eventMarker.primary };
    tokens.push(markerToken);
  }

  // Event role at end
  tokens.push({ type: 'role', role: 'event', optional: false });

  const roleNames = sortedRoles.map(r => `{${r.role}}`).join(' ');

  return {
    id: `${commandSchema.action}-event-${profile.code}-vso-verb-first-2role`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 48,
    template: {
      format: `${keyword.primary} ${roleNames} ${eventMarker.primary} {event}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action },
      event: { fromRole: 'event' },
      ...Object.fromEntries(sortedRoles.map(r => [r.role, { fromRole: r.role }])),
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
export function generateVSOTwoRoleEventHandlerPattern(
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

    if (roleSpec.markerOverride && roleSpec.markerOverride[profile.code] !== undefined) {
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
      ...Object.fromEntries(sortedRoles.map(r => [r.role, { fromRole: r.role }])),
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
export function generateVSONegatedEventHandlerPattern(
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
export function generateVSOProcliticEventHandlerPattern(
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
