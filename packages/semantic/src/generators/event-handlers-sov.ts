/**
 * SOV Event Handler Pattern Generators
 *
 * Generates event handler patterns for Subject-Object-Verb languages:
 * Japanese, Korean, Turkish, Bengali, Quechua, Hindi.
 *
 * Extracted from pattern-generator.ts for maintainability.
 */

import type { LanguagePattern, PatternToken } from '../types';
import type { LanguageProfile, KeywordTranslation, RoleMarker } from './language-profiles';
import type { CommandSchema } from './command-schemas';
import type { GeneratorConfig } from './pattern-generator';

/**
 * Generate SOV event handler pattern (Japanese, Korean, Turkish).
 */
export function generateSOVEventHandlerPattern(
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
 * Generate patient-first SOV event handler pattern (simple, no destination).
 *
 * Alternative SOV ordering where the patient precedes the event:
 * - Bengali: .active কে ক্লিক এ টগল  (patient কে event এ verb)
 * - Quechua: .active ta ñitiy pi tikray  (patient ta event pi verb)
 *
 * No optional destination group to avoid greedy match issues when
 * destination and event markers collide (e.g., Bengali তে/এ).
 */
export function generateSOVPatientFirstEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Patient role first
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Patient marker (postposition after patient)
  const patientMarker = profile.roleMarkers.patient;
  if (patientMarker) {
    const patMarkerToken: PatternToken = patientMarker.alternatives
      ? { type: 'literal', value: patientMarker.primary, alternatives: patientMarker.alternatives }
      : { type: 'literal', value: patientMarker.primary };
    tokens.push(patMarkerToken);
  }

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Event marker (after event in SOV)
  if (eventMarker.position === 'after') {
    const markerWords = eventMarker.primary.split(/\s+/);
    if (markerWords.length > 1) {
      for (const word of markerWords) {
        tokens.push({ type: 'literal', value: word });
      }
    } else {
      const markerToken: PatternToken = eventMarker.alternatives
        ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
        : { type: 'literal', value: eventMarker.primary };
      tokens.push(markerToken);
    }
  }

  // Command verb at end (SOV)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-patient-first`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 45,
    template: {
      format: `{patient} ${patientMarker?.primary || ''} {event} ${eventMarker.primary} ${keyword.primary}`,
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
 * Generate patient-first SOV event handler pattern with required destination.
 *
 * For patterns like:
 * - Quechua: .highlight ta noqa man ñitiy pi yapay  (patient ta dest man event pi verb)
 *
 * Destination is REQUIRED (not optional) to avoid greedy match ambiguity.
 * Only generated when destination and event markers are different.
 */
export function generateSOVPatientFirstWithDestEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Patient role first
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Patient marker
  const patientMarker = profile.roleMarkers.patient;
  if (patientMarker) {
    const patMarkerToken: PatternToken = patientMarker.alternatives
      ? { type: 'literal', value: patientMarker.primary, alternatives: patientMarker.alternatives }
      : { type: 'literal', value: patientMarker.primary };
    tokens.push(patMarkerToken);
  }

  // Required destination with its marker
  const destMarker = profile.roleMarkers.destination;
  if (destMarker) {
    tokens.push({ type: 'role', role: 'destination', optional: false });
    tokens.push(
      destMarker.alternatives
        ? { type: 'literal', value: destMarker.primary, alternatives: destMarker.alternatives }
        : { type: 'literal', value: destMarker.primary }
    );
  }

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Event marker (after event in SOV)
  if (eventMarker.position === 'after') {
    const markerWords = eventMarker.primary.split(/\s+/);
    if (markerWords.length > 1) {
      for (const word of markerWords) {
        tokens.push({ type: 'literal', value: word });
      }
    } else {
      const markerToken: PatternToken = eventMarker.alternatives
        ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
        : { type: 'literal', value: eventMarker.primary };
      tokens.push(markerToken);
    }
  }

  // Command verb at end (SOV)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-patient-first-dest`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 40, // Lower than simple patient-first
    template: {
      format: `{patient} ${patientMarker?.primary || ''} {destination} ${destMarker?.primary || ''} {event} ${eventMarker.primary} ${keyword.primary}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action },
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
      destination: { fromRole: 'destination' },
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
export function generateSOVCompactEventHandlerPattern(
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
 * Generate SOV simple event handler pattern (patient optional, defaults to 'me').
 *
 * Supports patterns like:
 * - Japanese: クリック で 増加 (click on increment)
 * - Korean: 클릭 할 때 증가 (click when increment)
 * - Turkish: tıklama da artır (click on increment)
 *
 * The patient is not explicitly specified - it defaults to 'me' (current element).
 */
export function generateSOVSimpleEventHandlerPattern(
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
  if (eventMarker.position === 'after') {
    const markerWords = eventMarker.primary.split(/\s+/);
    if (markerWords.length > 1) {
      // Multi-word marker: create a token for each word
      for (const word of markerWords) {
        tokens.push({ type: 'literal', value: word });
      }
    } else {
      const markerToken: PatternToken = eventMarker.alternatives
        ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
        : { type: 'literal', value: eventMarker.primary };
      tokens.push(markerToken);
    }
  }

  // Command verb at end (SOV) - no patient required
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-simple`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 48, // Lower than full pattern (50) but higher than base
    template: {
      format: `{event} ${eventMarker.primary} ${keyword.primary}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action },
      event: { fromRole: 'event' },
      patient: { default: { type: 'reference', value: 'me' } }, // Default to 'me'
    },
  };
}

/**
 * Generate SOV temporal event handler pattern.
 *
 * Supports patterns with temporal markers like:
 * - Japanese: クリック 時 .active を 切り替え (click time toggle .active)
 * - Japanese: クリック の 時 .active を 切り替え (click's time toggle .active)
 *
 * Uses profile.eventHandler.temporalMarkers for language-specific temporal words.
 */
export function generateSOVTemporalEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  config: GeneratorConfig
): LanguagePattern | null {
  const temporalMarkers = profile.eventHandler?.temporalMarkers;
  if (!temporalMarkers || temporalMarkers.length === 0) return null;

  const tokens: PatternToken[] = [];

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Optional possessive marker (の in Japanese)
  if (profile.possessive?.marker) {
    tokens.push({
      type: 'group',
      optional: true,
      tokens: [{ type: 'literal', value: profile.possessive.marker }],
    });
  }

  // Temporal marker (時, とき in Japanese)
  tokens.push({
    type: 'literal',
    value: temporalMarkers[0],
    alternatives: temporalMarkers.slice(1),
  });

  // Patient role
  tokens.push({ type: 'role', role: 'patient', optional: false });

  // Patient marker
  const patientMarker = profile.roleMarkers.patient;
  if (patientMarker?.primary) {
    const patMarkerToken: PatternToken = patientMarker.alternatives
      ? { type: 'literal', value: patientMarker.primary, alternatives: patientMarker.alternatives }
      : { type: 'literal', value: patientMarker.primary };
    tokens.push(patMarkerToken);
  }

  // Command verb at end
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-temporal`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 49, // Between simple and full pattern
    template: {
      format: `{event} ${temporalMarkers[0]} {patient} ${keyword.primary}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action },
      event: { fromRole: 'event' },
      patient: { fromRole: 'patient' },
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
export function generateSOVTwoRoleEventHandlerPattern(
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
      ...Object.fromEntries(sortedRoles.map(r => [r.role, { fromRole: r.role }])),
    },
  };
}

/**
 * Generate destination-first SOV two-role event handler pattern.
 *
 * For languages where the roles precede the event in SOV order:
 * - Bengali: @disabled কে ক্লিক এ সেট সত্য তে
 *   [destination] [destMarker] [event] [eventMarker] [verb] [patient] [patientMarker]
 * - Bengali: "Hello" কে ক্লিক এ রাখুন #output তে
 *   [patient] [patientMarker] [event] [eventMarker] [verb] [destination] [destMarker]
 */
export function generateSOVTwoRoleDestFirstEventHandlerPattern(
  commandSchema: CommandSchema,
  profile: LanguageProfile,
  keyword: KeywordTranslation,
  eventMarker: RoleMarker,
  config: GeneratorConfig
): LanguagePattern {
  const tokens: PatternToken[] = [];

  // Get the two required roles from the schema
  const requiredRoles = commandSchema.roles.filter(r => r.required);
  const sortedRoles = [...requiredRoles].sort((a, b) => {
    const aPos = a.sovPosition ?? 999;
    const bPos = b.sovPosition ?? 999;
    return aPos - bPos;
  });

  // First role before event
  const firstRole = sortedRoles[0];
  tokens.push({ type: 'role', role: firstRole.role, optional: false });

  // First role marker
  let firstMarker: string | undefined;
  if (firstRole.markerOverride && firstRole.markerOverride[profile.code] !== undefined) {
    firstMarker = firstRole.markerOverride[profile.code];
  } else {
    const roleMarker = profile.roleMarkers[firstRole.role];
    if (roleMarker) firstMarker = roleMarker.primary;
  }
  if (firstMarker) {
    tokens.push({ type: 'literal', value: firstMarker });
  }

  // Event role
  tokens.push({ type: 'role', role: 'event', optional: false });

  // Event marker
  if (eventMarker.position === 'after') {
    const markerWords = eventMarker.primary.split(/\s+/);
    if (markerWords.length > 1) {
      for (const word of markerWords) {
        tokens.push({ type: 'literal', value: word });
      }
    } else {
      const markerToken: PatternToken = eventMarker.alternatives
        ? { type: 'literal', value: eventMarker.primary, alternatives: eventMarker.alternatives }
        : { type: 'literal', value: eventMarker.primary };
      tokens.push(markerToken);
    }
  }

  // Command verb (between event and second role in this variant)
  const verbToken: PatternToken = keyword.alternatives
    ? { type: 'literal', value: keyword.primary, alternatives: keyword.alternatives }
    : { type: 'literal', value: keyword.primary };
  tokens.push(verbToken);

  // Second role after verb
  const secondRole = sortedRoles[1];
  tokens.push({ type: 'role', role: secondRole.role, optional: false });

  // Second role marker
  let secondMarker: string | undefined;
  let secondMarkerAlts: string[] | undefined;
  if (secondRole.markerOverride && secondRole.markerOverride[profile.code] !== undefined) {
    secondMarker = secondRole.markerOverride[profile.code];
  } else {
    const roleMarker = profile.roleMarkers[secondRole.role];
    if (roleMarker) {
      secondMarker = roleMarker.primary;
      secondMarkerAlts = roleMarker.alternatives;
    }
  }
  if (secondMarker) {
    const markerToken: PatternToken = secondMarkerAlts
      ? { type: 'literal', value: secondMarker, alternatives: secondMarkerAlts }
      : { type: 'literal', value: secondMarker };
    tokens.push(markerToken);
  }

  return {
    id: `${commandSchema.action}-event-${profile.code}-sov-2role-dest-first`,
    language: profile.code,
    command: 'on',
    priority: (config.basePriority ?? 100) + 48, // Slightly lower than event-first two-role
    template: {
      format: `{${firstRole.role}} {event} ${eventMarker.primary} ${keyword.primary} {${secondRole.role}}`,
      tokens,
    },
    extraction: {
      action: { value: commandSchema.action },
      event: { fromRole: 'event' },
      [firstRole.role]: { fromRole: firstRole.role },
      [secondRole.role]: { fromRole: secondRole.role },
    },
  };
}
