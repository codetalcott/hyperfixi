/**
 * Unit tests for `inferRolesFromSchema` — the schema-driven role-inference
 * function. Tests use a minimal in-memory node shape and a stub adapter so
 * the function is exercised independent of any consumer (core, framework).
 */
import { describe, it, expect } from 'vitest';
import { inferRolesFromSchema, type ValueAdapter } from './infer-roles';
import type { CommandSchema } from '../schema';

// =============================================================================
// Test fixture: minimal node shape + adapter
// =============================================================================

type TestNode =
  | { type: 'identifier'; name: string }
  | { type: 'selector'; value: string }
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'reference'; value: string };

const adapter: ValueAdapter<TestNode, TestNode> = {
  getIdentifierName(node) {
    return node.type === 'identifier' ? node.name : undefined;
  },
  convertValue(node) {
    return node;
  },
  createLiteralValue(text) {
    return { type: 'literal', value: text };
  },
};

const id = (name: string): TestNode => ({ type: 'identifier', name });
const sel = (value: string): TestNode => ({ type: 'selector', value });
const lit = (value: string | number | boolean): TestNode => ({ type: 'literal', value });
const ref = (value: string): TestNode => ({ type: 'reference', value });

// =============================================================================
// Test schemas (minimal versions of the shipping ones)
// =============================================================================

const toggleSchema: CommandSchema = {
  action: 'toggle',
  description: 'toggle',
  category: 'dom',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'patient',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
    },
  ],
};

const removeSchema: CommandSchema = {
  action: 'remove',
  description: 'remove',
  category: 'dom',
  primaryRole: 'patient',
  targetRole: 'source',
  roles: [
    {
      role: 'patient',
      description: 'patient',
      required: true,
      expectedTypes: ['selector'],
      svoPosition: 1,
    },
  ],
};

const setSchema: CommandSchema = {
  action: 'set',
  description: 'set',
  category: 'variable',
  primaryRole: 'destination',
  roles: [
    {
      role: 'destination',
      description: 'destination',
      required: true,
      expectedTypes: ['selector', 'reference', 'expression'],
      svoPosition: 1,
      markerOverride: { en: '' }, // explicit no marker
    },
    {
      role: 'patient',
      description: 'patient',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 2,
      markerOverride: { en: 'to' },
    },
  ],
};

const incrementSchema: CommandSchema = {
  action: 'increment',
  description: 'increment',
  category: 'variable',
  primaryRole: 'destination',
  roles: [
    {
      role: 'destination',
      description: 'destination',
      required: true,
      expectedTypes: ['reference', 'expression'],
      svoPosition: 1,
    },
    {
      role: 'quantity',
      description: 'quantity',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 2,
      markerOverride: { en: 'by' },
    },
  ],
};

const fetchSchema: CommandSchema = {
  action: 'fetch',
  description: 'fetch',
  category: 'async',
  primaryRole: 'source',
  roles: [
    {
      role: 'source',
      description: 'source',
      required: true,
      expectedTypes: ['literal', 'expression'],
      svoPosition: 1,
    },
    {
      role: 'responseType',
      description: 'responseType',
      required: false,
      expectedTypes: ['literal'],
      svoPosition: 2,
      markerOverride: { en: 'as' },
    },
  ],
};

const putSchema: CommandSchema = {
  action: 'put',
  description: 'put',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'patient',
      required: true,
      expectedTypes: ['literal', 'selector', 'reference', 'expression'],
      svoPosition: 1,
    },
    {
      role: 'destination',
      description: 'destination',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 2,
      markerOverride: { en: 'into' },
      markerVariants: { en: ['before', 'after'] },
      methodCarrier: 'method',
    },
  ],
};

const scrollSchema: CommandSchema = {
  action: 'scroll',
  description: 'scroll',
  category: 'navigation',
  primaryRole: 'destination',
  argSkipTokens: [
    'top',
    'bottom',
    'middle',
    'center',
    'nearest',
    'left',
    'right',
    'smoothly',
    'instantly',
    'the',
    'of',
  ],
  roles: [
    {
      role: 'destination',
      description: 'destination',
      required: true,
      expectedTypes: ['selector', 'reference'],
      svoPosition: 1,
      markerOverride: { en: 'to' },
    },
  ],
};

const pushSchema: CommandSchema = {
  action: 'push',
  description: 'push',
  category: 'navigation',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'patient',
      required: true,
      expectedTypes: ['literal'],
      svoPosition: 1,
      markerOverride: { en: 'url' },
    },
  ],
};

const processSchema: CommandSchema = {
  action: 'process',
  description: 'process',
  category: 'dom-content',
  primaryRole: 'patient',
  roles: [
    {
      role: 'patient',
      description: 'patient',
      required: true,
      expectedTypes: ['literal', 'reference'],
      svoPosition: 1,
      markerOverride: { en: 'partials in' },
    },
  ],
};

// =============================================================================
// Tests
// =============================================================================

describe('inferRolesFromSchema', () => {
  describe('positional / bare-arg', () => {
    it('toggle .active — patient from args[0]', () => {
      const roles = inferRolesFromSchema(
        toggleSchema,
        [sel('.active')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ patient: sel('.active') });
    });

    it('toggle .active on #button — target → destination via default targetRole', () => {
      const roles = inferRolesFromSchema(
        toggleSchema,
        [sel('.active')],
        undefined,
        sel('#button'),
        adapter
      );
      expect(roles).toEqual({ patient: sel('.active'), destination: sel('#button') });
    });

    it('toggle with no args — empty role map', () => {
      const roles = inferRolesFromSchema(toggleSchema, [], undefined, undefined, adapter);
      expect(roles).toEqual({});
    });
  });

  describe('targetRole', () => {
    it('remove .active from #button — target → source (not destination)', () => {
      const roles = inferRolesFromSchema(
        removeSchema,
        [sel('.active')],
        undefined,
        sel('#button'),
        adapter
      );
      expect(roles).toEqual({ patient: sel('.active'), source: sel('#button') });
    });
  });

  describe('marker on modifier', () => {
    it('set $x to 5 — destination=$x (positional), patient=5 (modifier `to`)', () => {
      const roles = inferRolesFromSchema(
        setSchema,
        [ref('$x')],
        { to: lit(5) },
        undefined,
        adapter
      );
      expect(roles).toEqual({ destination: ref('$x'), patient: lit(5) });
    });

    it('fetch /api as json — source=/api, responseType=json (modifier as node)', () => {
      const roles = inferRolesFromSchema(
        fetchSchema,
        [lit('/api')],
        { as: id('json') },
        undefined,
        adapter
      );
      expect(roles).toEqual({ source: lit('/api'), responseType: id('json') });
    });

    it('fetch /api as "json" — string-shaped modifier wrapped as literal', () => {
      const roles = inferRolesFromSchema(
        fetchSchema,
        [lit('/api')],
        { as: 'json' },
        undefined,
        adapter
      );
      expect(roles).toEqual({ source: lit('/api'), responseType: lit('json') });
    });

    it('increment :count by 5 — destination=:count, quantity=5', () => {
      const roles = inferRolesFromSchema(
        incrementSchema,
        [ref(':count')],
        { by: lit(5) },
        undefined,
        adapter
      );
      expect(roles).toEqual({ destination: ref(':count'), quantity: lit(5) });
    });
  });

  describe('multi-marker + methodCarrier', () => {
    it('put "x" into #out — destination=#out, method=literal "into"', () => {
      const roles = inferRolesFromSchema(
        putSchema,
        [lit('x')],
        { into: sel('#out') },
        undefined,
        adapter
      );
      expect(roles).toEqual({
        patient: lit('x'),
        destination: sel('#out'),
        method: lit('into'),
      });
    });

    it('put "x" before #out — destination=#out, method=literal "before"', () => {
      const roles = inferRolesFromSchema(
        putSchema,
        [lit('x')],
        { before: sel('#out') },
        undefined,
        adapter
      );
      expect(roles).toEqual({
        patient: lit('x'),
        destination: sel('#out'),
        method: lit('before'),
      });
    });

    it('put "x" after #out — destination=#out, method=literal "after"', () => {
      const roles = inferRolesFromSchema(
        putSchema,
        [lit('x')],
        { after: sel('#out') },
        undefined,
        adapter
      );
      expect(roles).toEqual({
        patient: lit('x'),
        destination: sel('#out'),
        method: lit('after'),
      });
    });

    it('put "x" with no destination modifier — only patient set', () => {
      const roles = inferRolesFromSchema(putSchema, [lit('x')], undefined, undefined, adapter);
      expect(roles).toEqual({ patient: lit('x') });
    });

    it('put "x" — target falls back to destination (default targetRole)', () => {
      const roles = inferRolesFromSchema(putSchema, [lit('x')], undefined, sel('#out'), adapter);
      expect(roles).toEqual({ patient: lit('x'), destination: sel('#out') });
    });
  });

  describe('marker in args (single)', () => {
    it('scroll to #target — destination from arg after `to` identifier', () => {
      const roles = inferRolesFromSchema(
        scrollSchema,
        [id('to'), sel('#target')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ destination: sel('#target') });
    });

    it('scroll to bottom of #chat smoothly — argSkipTokens skip non-role keywords', () => {
      const roles = inferRolesFromSchema(
        scrollSchema,
        [id('to'), id('bottom'), id('of'), sel('#chat'), id('smoothly')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ destination: sel('#chat') });
    });

    it('push url "/page/2" — patient from arg after `url` identifier', () => {
      const roles = inferRolesFromSchema(
        pushSchema,
        [id('url'), lit('/page/2')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ patient: lit('/page/2') });
    });
  });

  describe('marker in args (multi-word)', () => {
    it('process partials in it — multi-word marker matches consecutive identifiers', () => {
      const roles = inferRolesFromSchema(
        processSchema,
        [id('partials'), id('in'), ref('it')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ patient: ref('it') });
    });

    it('process with mismatched first word — no match', () => {
      const roles = inferRolesFromSchema(
        processSchema,
        [id('process'), id('in'), ref('it')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({});
    });
  });

  describe('marker not present', () => {
    it('scroll #target (no `to` marker) — destination not inferred from args', () => {
      const roles = inferRolesFromSchema(
        scrollSchema,
        [sel('#target')],
        undefined,
        undefined,
        adapter
      );
      // Without the marker, schema-driven inference can't tell which arg is destination.
      // The bridge's existing `firstNonMarkerArg` was lenient here; schema-driven is stricter.
      expect(roles).toEqual({});
    });
  });

  describe('precedence', () => {
    it('modifier hit takes precedence over target', () => {
      const roles = inferRolesFromSchema(
        putSchema,
        [lit('x')],
        { into: sel('#mod') },
        sel('#tgt'),
        adapter
      );
      // Modifier wins; target is not used since destination is already set.
      expect(roles).toEqual({
        patient: lit('x'),
        destination: sel('#mod'),
        method: lit('into'),
      });
    });

    it('longest-match-first: multi-word markers match before bare-word overlaps', () => {
      // Hypothetical schema where one role has marker `in` and another has `partials in`.
      // Verifies that `partials in` wins when both could match.
      const overlapSchema: CommandSchema = {
        action: 'overlap',
        description: 'overlap',
        category: 'test',
        primaryRole: 'patient',
        roles: [
          {
            role: 'patient',
            description: 'patient',
            required: true,
            expectedTypes: ['literal', 'reference'],
            svoPosition: 1,
            markerOverride: { en: 'partials in' },
          },
          {
            role: 'destination',
            description: 'destination',
            required: false,
            expectedTypes: ['selector'],
            svoPosition: 2,
            markerOverride: { en: 'in' },
          },
        ],
      };
      // For "partials in it" — `partials in` matches first (longest), patient = it.
      // The bare `in` is already consumed; destination not set.
      const roles = inferRolesFromSchema(
        overlapSchema,
        [id('partials'), id('in'), ref('it')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ patient: ref('it') });
    });
  });

  describe('positional pass with multiple roles + svoPosition', () => {
    // Surface order matches semantic's sort convention (ascending = earlier first):
    // role 'a' at svoPosition 1, role 'b' at svoPosition 2 → a, b in surface.
    const fooSchema: CommandSchema = {
      action: 'foo',
      description: 'foo',
      category: 'test',
      primaryRole: 'a',
      roles: [
        {
          role: 'a',
          description: 'a',
          required: true,
          expectedTypes: ['literal'],
          svoPosition: 1, // lower = earlier (matches @lokascript/semantic's sort)
        },
        {
          role: 'b',
          description: 'b',
          required: true,
          expectedTypes: ['literal'],
          svoPosition: 2,
        },
      ],
    };

    it('assigns positional roles by svoPosition ascending', () => {
      const roles = inferRolesFromSchema(
        fooSchema,
        [lit('x'), lit('y')],
        undefined,
        undefined,
        adapter
      );
      expect(roles).toEqual({ a: lit('x'), b: lit('y') });
    });
  });
});
