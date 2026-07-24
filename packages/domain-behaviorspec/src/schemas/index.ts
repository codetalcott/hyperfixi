/**
 * BehaviorSpec Command Schemas
 *
 * Defines the semantic structure of interaction testing commands using
 * the framework's defineCommand/defineRole helpers. Each command type
 * maps to a distinct testing concept: setup, interaction, assertion,
 * timing, and negation.
 */

import { defineCommand, defineRole } from '@lokascript/framework';

/** The languages this domain ships, in profile order. */
const LANGUAGES = ['en', 'es', 'ja', 'ar', 'ko', 'zh', 'fr', 'tr'] as const;

/**
 * Render this role with no marker in every language.
 *
 * `renderOverride: { '*': '' }` would be shorter, but `'*'` deliberately ranks
 * BELOW a per-language `markerOverride` — so it cannot suppress a marker the
 * role itself declares. Naming each language is the only way to say "the
 * parser accepts this marker; the renderer never writes it".
 */
const bareInEveryLanguage = (): Record<string, string> =>
  Object.fromEntries(LANGUAGES.map(code => [code, '']));

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
      // `renderTest` names the scenario after the verb in every language,
      // SOV included: `テスト "ログイン"`, not `"ログイン" テスト`. A test
      // header reads as a label, and the label follows the word `test`.
      sovSlot: 'postVerb',
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
      // `given #email is empty` — the value trails its subject bare. The
      // profile's `saying`/`と` marker stays parseable, never written.
      renderOverride: { '*': '' },
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
      // SOV puts the verb of the interaction last of the roles, after both its
      // target and its destination: `user #email を #form に types 操作`.
      // (Higher position = earlier, so this is the lowest.)
      sovPosition: 0,
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
        ko: '을',
        zh: '在',
        fr: 'sur',
        tr: 'üzerinde',
      },
    }),
    defineRole({
      role: 'destination',
      description: 'Target for directional actions (types X into Y)',
      required: false,
      expectedTypes: ['selector', 'expression'],
      svoPosition: 0,
      sovPosition: 1,
      markerOverride: {
        en: 'into',
        es: 'dentro',
        ja: 'に',
        ar: 'في',
        ko: '에',
        zh: '到',
        fr: 'dans',
        tr: 'içine',
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
      // `expect #result …`, `#result … 期待` — the subject of the assertion
      // leads, with no marker. The profile's `on`/`を` stays parseable.
      renderOverride: { '*': '' },
    }),
    defineRole({
      role: 'assertion',
      description:
        'What to assert (appears, disappears, has, shows, changes, increases, decreases)',
      required: true,
      expectedTypes: ['expression'],
      svoPosition: 2,
      // `#result appears "welcome" 期待` — the assertion precedes the value it
      // is about, in SOV as in SVO. (Higher position = earlier.)
      sovPosition: 2,
    }),
    defineRole({
      role: 'value',
      description: 'Expected value or descriptor (class name, text, amount)',
      required: false,
      expectedTypes: ['literal', 'expression'],
      greedy: true,
      svoPosition: 1,
      sovPosition: 1,
      markerOverride: {
        en: 'saying',
        es: 'diciendo',
        ja: 'と',
        ar: 'يقول',
        ko: '으로',
        zh: '显示',
        fr: 'disant',
        tr: 'diyen',
      },
      // `expect #result shows "welcome"` — `saying` is an input convenience,
      // never written back.
      renderOverride: bareInEveryLanguage(),
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
      // `not` is a prefix modifier, not a verb: it precedes what it negates in
      // every language (`否定 visible`), so SOV does not move it to the end.
      sovSlot: 'postVerb',
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
