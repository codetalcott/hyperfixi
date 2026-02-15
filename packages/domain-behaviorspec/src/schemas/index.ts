/**
 * BehaviorSpec Command Schemas
 *
 * Defines the semantic structure of interaction testing commands using
 * the framework's defineCommand/defineRole helpers. Each command type
 * maps to a distinct testing concept: setup, interaction, assertion,
 * timing, and negation.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

// =============================================================================
// TEST — Named test scenario
// =============================================================================

export const testSchema = defineCommand({
  action: 'test',
  description: 'Define a named test scenario',
  category: 'structure',
  primaryRole: 'name',
  roles: [
    defineRole({
      role: 'name',
      description: 'Test scenario name (quoted string)',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// GIVEN — Precondition setup
// =============================================================================

export const givenSchema = defineCommand({
  action: 'given',
  description: 'Define a test precondition (page, viewport, or element state)',
  category: 'setup',
  primaryRole: 'subject',
  roles: [
    defineRole({
      role: 'subject',
      description: 'What the precondition applies to (page, viewport, element)',
      required: true,
      expectedTypes: ['expression', 'selector'],
      svoPosition: 2,
      sovPosition: 2,
    }),
    defineRole({
      role: 'value',
      description: 'Precondition value (URL, dimensions, state)',
      required: false,
      expectedTypes: ['expression', 'literal'],
      greedy: true,
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// WHEN — User interaction
// =============================================================================

export const whenSchema = defineCommand({
  action: 'when',
  description: 'Define a user interaction',
  category: 'interaction',
  primaryRole: 'action',
  roles: [
    defineRole({
      role: 'actor',
      description: 'Who performs the action (user, system)',
      required: false,
      expectedTypes: ['expression'],
      svoPosition: 3,
      sovPosition: 3,
    }),
    defineRole({
      role: 'action',
      description: 'Interaction type (clicks, types, submits, scrolls, hovers, drags)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'target',
      description: 'Element to interact with',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'on',
        es: 'en',
        ja: 'を',
        ar: 'على',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target for directional actions (types X into Y)',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 0,
      sovPosition: 0,
      markerOverride: {
        en: 'into',
        es: 'dentro',
        ja: 'に',
        ar: 'في',
      },
    }),
  ],
});

// =============================================================================
// EXPECT — Assertion
// =============================================================================

export const expectSchema = defineCommand({
  action: 'expect',
  description: 'Assert an expected outcome',
  category: 'assertion',
  primaryRole: 'target',
  roles: [
    defineRole({
      role: 'target',
      description: 'Element or concept being asserted',
      required: true,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 3,
      sovPosition: 3,
    }),
    defineRole({
      role: 'assertion',
      description:
        'What to assert (appears, disappears, has, shows, changes, increases, decreases)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      sovPosition: 1,
    }),
    defineRole({
      role: 'value',
      description: 'Expected value or descriptor (class name, text, amount)',
      required: false,
      expectedTypes: ['literal', 'expression'],
      greedy: true,
      svoPosition: 1,
      sovPosition: 2,
      markerOverride: {
        en: 'saying',
        es: 'diciendo',
        ja: 'と',
        ar: 'يقول',
      },
    }),
  ],
});

// =============================================================================
// AFTER — Timing modifier
// =============================================================================

export const afterSchema = defineCommand({
  action: 'after',
  description: 'Wait for a specified duration',
  category: 'timing',
  primaryRole: 'duration',
  roles: [
    defineRole({
      role: 'duration',
      description: 'Time to wait (e.g., 300ms, 2s, 2 seconds)',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// NOT — Negation modifier
// =============================================================================

export const notSchema = defineCommand({
  action: 'not',
  description: 'Negate the following assertion',
  category: 'modifier',
  primaryRole: 'content',
  roles: [
    defineRole({
      role: 'content',
      description: 'The assertion being negated',
      required: true,
      expectedTypes: ['expression'],
      greedy: true,
      svoPosition: 1,
      sovPosition: 1,
    }),
  ],
});

// =============================================================================
// All Schemas
// =============================================================================

export const allSchemas = [
  testSchema,
  givenSchema,
  whenSchema,
  expectSchema,
  afterSchema,
  notSchema,
];
