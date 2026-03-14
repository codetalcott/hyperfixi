import { describe, it, expect } from 'vitest';
import {
  toProtocolJSON,
  fromProtocolJSON,
  validateProtocolJSON,
  toEnvelopeJSON,
  fromEnvelopeJSON,
  isEnvelope,
} from './protocol-json';
import {
  createCommandNode,
  createEventHandlerNode,
  createCompoundNode,
  createConditionalNode,
  createLoopNode,
  createTryNode,
  createAsyncNode,
  createMatchNode,
  createSelector,
  createLiteral,
  createReference,
  createExpression,
  createFlag,
  createPropertyPath,
} from '../core/types';
import type { CommandSemanticNode, CompoundSemanticNode } from '../core/types';
import type { ProtocolNodeJSON, LSEEnvelopeJSON } from './types';

// Fixture loading helpers
import { readFileSync } from 'fs';
import { join } from 'path';

const FIXTURE_DIR = join(__dirname, '../../../../protocol/test-fixtures');

function loadFixtures<T = Record<string, unknown>>(filename: string): T[] {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, filename), 'utf-8'));
}

// ---------------------------------------------------------------------------
// toProtocolJSON
// ---------------------------------------------------------------------------

describe('toProtocolJSON', () => {
  describe('command node', () => {
    it('serializes action and roles', () => {
      const node = createCommandNode('toggle', {
        patient: createSelector('.active'),
      });
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('command');
      expect(json.action).toBe('toggle');
      expect(json.roles['patient']).toEqual({ type: 'selector', value: '.active' });
    });

    it('preserves selectorKind on selector values (v1.1)', () => {
      const node = createCommandNode('toggle', {
        patient: createSelector('.active', 'class'),
        destination: createSelector('#button', 'id'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['patient']).toEqual({
        type: 'selector',
        value: '.active',
        selectorKind: 'class',
      });
      expect(json.roles['destination']).toEqual({
        type: 'selector',
        value: '#button',
        selectorKind: 'id',
      });
    });

    it('serializes literal values with dataType', () => {
      const node = createCommandNode('wait', {
        duration: createLiteral('500ms', 'duration'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['duration']).toEqual({
        type: 'literal',
        value: '500ms',
        dataType: 'duration',
      });
    });

    it('serializes literal values without dataType', () => {
      const node = createCommandNode('fetch', {
        source: createLiteral('/api/users'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['source']).toEqual({ type: 'literal', value: '/api/users' });
      expect('dataType' in json.roles['source']).toBe(false);
    });

    it('serializes reference values', () => {
      const node = createCommandNode('remove', {
        patient: createReference('me'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['patient']).toEqual({ type: 'reference', value: 'me' });
    });

    it('serializes expression values', () => {
      const node = createCommandNode('set', {
        goal: createExpression('x + 1'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['goal']).toEqual({ type: 'expression', raw: 'x + 1' });
    });

    it('flattens property-path to expression', () => {
      const node = createCommandNode('put', {
        patient: createPropertyPath(createReference('me'), 'value'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['patient'].type).toBe('expression');
      expect(typeof (json.roles['patient'] as { raw: string }).raw).toBe('string');
    });

    it('serializes flag values', () => {
      const node = createCommandNode('column', {
        'primary-key': createFlag('primary-key', true),
        nullable: createFlag('nullable', false),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['primary-key']).toEqual({
        type: 'flag',
        name: 'primary-key',
        enabled: true,
      });
      expect(json.roles['nullable']).toEqual({
        type: 'flag',
        name: 'nullable',
        enabled: false,
      });
    });
  });

  describe('event-handler node', () => {
    it('serializes body array recursively', () => {
      const body = createCommandNode('toggle', { patient: createSelector('.active') });
      const node = createEventHandlerNode('on', { event: createLiteral('click', 'string') }, [
        body,
      ]);
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('event-handler');
      expect(json.action).toBe('on');
      expect(json.body).toHaveLength(1);
      expect(json.body![0].kind).toBe('command');
      expect(json.body![0].action).toBe('toggle');
    });

    it('serializes nested event-handler body', () => {
      const inner = createCommandNode('add', { patient: createSelector('.highlight') });
      const outer = createCommandNode('remove', { patient: createSelector('.active') });
      const node = createEventHandlerNode('on', { event: createLiteral('click', 'string') }, [
        inner,
        outer,
      ]);
      const json = toProtocolJSON(node);
      expect(json.body).toHaveLength(2);
      expect(json.body![1].action).toBe('remove');
    });
  });

  describe('compound node', () => {
    it('serializes with fixed action "compound" and omitted roles', () => {
      const a = createCommandNode('add', { patient: createSelector('.loading') });
      const b = createCommandNode('fetch', { source: createLiteral('/api', 'string') });
      const node = createCompoundNode([a, b], 'then');
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('compound');
      expect(json.action).toBe('compound');
      expect(json.roles).toBeUndefined();
      expect(json.statements).toHaveLength(2);
      expect(json.chainType).toBe('then');
    });

    it('serializes statements recursively', () => {
      const node = createCompoundNode(
        [
          createCommandNode('add', { patient: createSelector('.a') }),
          createCommandNode('remove', { patient: createSelector('.b') }),
        ],
        'and'
      );
      const json = toProtocolJSON(node);
      expect(json.statements![0].action).toBe('add');
      expect(json.statements![1].action).toBe('remove');
    });
  });

  describe('TS-only node kinds (lossless v1.1 encoding)', () => {
    it('encodes conditional as command with thenBranch/elseBranch', () => {
      const thenBranch = [createCommandNode('toggle', { patient: createSelector('.active') })];
      const elseBranch = [createCommandNode('remove', { patient: createSelector('.active') })];
      const node = createConditionalNode(
        'if',
        { condition: createExpression('x > 0') },
        thenBranch,
        elseBranch
      );
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('command');
      expect(json.action).toBe('if');
      expect(json.thenBranch).toHaveLength(1);
      expect(json.thenBranch![0].action).toBe('toggle');
      expect(json.elseBranch).toHaveLength(1);
      expect(json.elseBranch![0].action).toBe('remove');
    });

    it('encodes loop as command with loopVariant/loopBody', () => {
      const body = [createCommandNode('toggle', { patient: createSelector('.active') })];
      const node = createLoopNode(
        'repeat',
        { count: createLiteral(5, 'number') },
        'times',
        body,
        'item'
      );
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('command');
      expect(json.action).toBe('repeat');
      expect(json.loopVariant).toBe('times');
      expect(json.loopBody).toHaveLength(1);
      expect(json.loopBody![0].action).toBe('toggle');
      expect(json.loopVariable).toBe('item');
    });
  });
});

// ---------------------------------------------------------------------------
// fromProtocolJSON
// ---------------------------------------------------------------------------

describe('fromProtocolJSON', () => {
  it('deserializes command node', () => {
    const json = {
      kind: 'command' as const,
      action: 'toggle',
      roles: { patient: { type: 'selector' as const, value: '.active' } },
    };
    const node = fromProtocolJSON(json);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toEqual({ type: 'selector', value: '.active' });
  });

  it('deserializes event-handler with body', () => {
    const json = {
      kind: 'event-handler' as const,
      action: 'on',
      roles: { event: { type: 'literal' as const, value: 'click', dataType: 'string' as const } },
      body: [
        {
          kind: 'command' as const,
          action: 'toggle',
          roles: { patient: { type: 'selector' as const, value: '.active' } },
        },
      ],
    };
    const node = fromProtocolJSON(json);
    expect(node.kind).toBe('event-handler');
    const eh = node as import('../core/types').EventHandlerSemanticNode;
    expect(eh.body).toHaveLength(1);
    expect(eh.body[0].action).toBe('toggle');
  });

  it('deserializes compound with statements', () => {
    const json = {
      kind: 'compound' as const,
      action: 'compound',
      roles: {},
      statements: [
        {
          kind: 'command' as const,
          action: 'add',
          roles: { patient: { type: 'selector' as const, value: '.loading' } },
        },
      ],
      chainType: 'then' as const,
    };
    const node = fromProtocolJSON(json);
    expect(node.kind).toBe('compound');
    const c = node as import('../core/types').CompoundSemanticNode;
    expect(c.statements).toHaveLength(1);
    expect(c.chainType).toBe('then');
  });

  it('restores roles as ReadonlyMap', () => {
    const json = {
      kind: 'command' as const,
      action: 'toggle',
      roles: {
        patient: { type: 'selector' as const, value: '.active' },
        destination: { type: 'selector' as const, value: '#button' },
      },
    };
    const node = fromProtocolJSON(json);
    expect(node.roles).toBeInstanceOf(Map);
    expect(node.roles.size).toBe(2);
  });

  it('restores all value types', () => {
    const json = {
      kind: 'command' as const,
      action: 'test',
      roles: {
        sel: { type: 'selector' as const, value: '.active' },
        lit: { type: 'literal' as const, value: 42, dataType: 'number' as const },
        ref: { type: 'reference' as const, value: 'me' },
        expr: { type: 'expression' as const, raw: 'x + 1' },
        flag: { type: 'flag' as const, name: 'primary-key', enabled: true },
      },
    };
    const node = fromProtocolJSON(json);
    expect(node.roles.get('sel')).toEqual({ type: 'selector', value: '.active' });
    expect(node.roles.get('lit')).toEqual({ type: 'literal', value: 42, dataType: 'number' });
    expect(node.roles.get('ref')).toEqual({ type: 'reference', value: 'me' });
    expect(node.roles.get('expr')).toEqual({ type: 'expression', raw: 'x + 1' });
    expect(node.roles.get('flag')).toEqual({ type: 'flag', name: 'primary-key', enabled: true });
  });

  it('defaults compound chainType to sequential when absent', () => {
    const json = {
      kind: 'compound' as const,
      action: 'compound',
      roles: {},
      statements: [],
    };
    const node = fromProtocolJSON(json);
    const c = node as import('../core/types').CompoundSemanticNode;
    expect(c.chainType).toBe('sequential');
  });

  it('defaults kind to command when absent', () => {
    const json = {
      action: 'toggle',
      roles: { patient: { type: 'selector' as const, value: '.active' } },
    };
    const node = fromProtocolJSON(json as any);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toEqual({ type: 'selector', value: '.active' });
  });

  it('deserializes trigger sugar into event handler', () => {
    const json = {
      action: 'toggle',
      roles: { patient: { type: 'selector' as const, value: '.active' } },
      trigger: { event: 'click' },
    };
    const node = fromProtocolJSON(json as any);
    expect(node.kind).toBe('event-handler');
    expect(node.action).toBe('on');
    const eh = node as import('../core/types').EventHandlerSemanticNode;
    expect(eh.body).toHaveLength(1);
    expect(eh.body[0].action).toBe('toggle');
    expect(eh.body[0].roles.get('patient')).toEqual({ type: 'selector', value: '.active' });
  });

  it('accepts expression value with value instead of raw', () => {
    const json = {
      kind: 'command' as const,
      action: 'set',
      roles: { goal: { type: 'expression' as const, value: 'x + 1' } },
    };
    const node = fromProtocolJSON(json as any);
    expect(node.roles.get('goal')).toEqual({ type: 'expression', raw: 'x + 1' });
  });

  it('accepts flag value shorthand', () => {
    const json = {
      kind: 'command' as const,
      action: 'column',
      roles: { 'primary-key': { type: 'flag' as const, value: true } },
    };
    const node = fromProtocolJSON(json as any);
    expect(node.roles.get('primary-key')).toEqual({ type: 'flag', name: 'true', enabled: true });
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  it('command node round-trips', () => {
    const original = createCommandNode('toggle', {
      patient: createSelector('.active'),
      destination: createSelector('#button'),
    });
    const restored = fromProtocolJSON(toProtocolJSON(original));
    expect(restored.kind).toBe('command');
    expect(restored.action).toBe('toggle');
    expect(restored.roles.get('patient')).toEqual({ type: 'selector', value: '.active' });
    expect(restored.roles.get('destination')).toEqual({ type: 'selector', value: '#button' });
  });

  it('event-handler node round-trips', () => {
    const original = createEventHandlerNode('on', { event: createLiteral('click', 'string') }, [
      createCommandNode('toggle', { patient: createSelector('.active') }),
    ]);
    const restored = fromProtocolJSON(toProtocolJSON(original));
    expect(restored.kind).toBe('event-handler');
    const eh = restored as import('../core/types').EventHandlerSemanticNode;
    expect(eh.body[0].action).toBe('toggle');
  });

  it('compound node round-trips', () => {
    const original = createCompoundNode(
      [
        createCommandNode('add', { patient: createSelector('.loading') }),
        createCommandNode('fetch', { source: createLiteral('/api', 'string') }),
      ],
      'then'
    );
    const restored = fromProtocolJSON(toProtocolJSON(original));
    expect(restored.kind).toBe('compound');
    const c = restored as import('../core/types').CompoundSemanticNode;
    expect(c.statements).toHaveLength(2);
    expect(c.chainType).toBe('then');
  });

  it('conditional round-trip is lossless (v1.1)', () => {
    const original = createConditionalNode('if', { condition: createExpression('x > 0') }, [
      createCommandNode('show', { patient: createSelector('#result') }),
    ]);
    const protocol = toProtocolJSON(original);
    const restored = fromProtocolJSON(protocol);
    expect(restored.kind).toBe('conditional');
    expect(restored.action).toBe('if');
    const cond = restored as import('../core/types').ConditionalSemanticNode;
    expect(cond.thenBranch).toHaveLength(1);
    expect(cond.thenBranch[0].action).toBe('show');
  });

  it('loop round-trip is lossless (v1.1)', () => {
    const body = [createCommandNode('wait', { duration: createLiteral('1s', 'duration') })];
    const original = createLoopNode('repeat', {}, 'forever', body);
    const protocol = toProtocolJSON(original);
    const restored = fromProtocolJSON(protocol);
    expect(restored.kind).toBe('loop');
    const loop = restored as import('../core/types').LoopSemanticNode;
    expect(loop.loopVariant).toBe('forever');
    expect(loop.body).toHaveLength(1);
    expect(loop.body[0].action).toBe('wait');
  });
});

// ---------------------------------------------------------------------------
// validateProtocolJSON
// ---------------------------------------------------------------------------

describe('validateProtocolJSON', () => {
  const validCommand = {
    kind: 'command',
    action: 'toggle',
    roles: { patient: { type: 'selector', value: '.active' } },
  };

  it('accepts valid command node', () => {
    expect(validateProtocolJSON(validCommand)).toEqual([]);
  });

  it('accepts valid event-handler node', () => {
    const json = {
      kind: 'event-handler',
      action: 'on',
      roles: { event: { type: 'literal', value: 'click', dataType: 'string' } },
      body: [validCommand],
    };
    expect(validateProtocolJSON(json)).toEqual([]);
  });

  it('accepts valid compound node', () => {
    const json = {
      kind: 'compound',
      action: 'compound',
      roles: {},
      statements: [validCommand],
      chainType: 'then',
    };
    expect(validateProtocolJSON(json)).toEqual([]);
  });

  it('rejects null', () => {
    const errors = validateProtocolJSON(null);
    expect(errors.some(e => e.code === 'INVALID_ROOT')).toBe(true);
  });

  it('accepts missing kind (defaults to command)', () => {
    const errors = validateProtocolJSON({ action: 'toggle', roles: {} });
    expect(errors).toEqual([]);
  });

  it('rejects invalid kind', () => {
    const errors = validateProtocolJSON({ kind: 'conditional', action: 'if', roles: {} });
    expect(errors.some(e => e.code === 'INVALID_KIND')).toBe(true);
  });

  it('rejects missing action', () => {
    const errors = validateProtocolJSON({ kind: 'command', roles: {} });
    expect(errors.some(e => e.code === 'MISSING_ACTION')).toBe(true);
  });

  it('rejects empty action string', () => {
    const errors = validateProtocolJSON({ kind: 'command', action: '', roles: {} });
    expect(errors.some(e => e.code === 'INVALID_ACTION')).toBe(true);
  });

  it('rejects missing roles', () => {
    const errors = validateProtocolJSON({ kind: 'command', action: 'toggle' });
    expect(errors.some(e => e.code === 'MISSING_ROLES')).toBe(true);
  });

  it('rejects roles as array', () => {
    const errors = validateProtocolJSON({ kind: 'command', action: 'toggle', roles: [] });
    expect(errors.some(e => e.code === 'INVALID_ROLES')).toBe(true);
  });

  it('rejects invalid role value type', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'toggle',
      roles: { patient: { type: 'conditional' } },
    });
    expect(errors.some(e => e.code === 'INVALID_VALUE_TYPE')).toBe(true);
  });

  it('rejects event-handler without body', () => {
    const errors = validateProtocolJSON({
      kind: 'event-handler',
      action: 'on',
      roles: {},
    });
    expect(errors.some(e => e.code === 'MISSING_BODY')).toBe(true);
  });

  it('rejects compound without statements', () => {
    const errors = validateProtocolJSON({
      kind: 'compound',
      action: 'compound',
      roles: {},
    });
    expect(errors.some(e => e.code === 'MISSING_STATEMENTS')).toBe(true);
  });

  it('rejects compound with invalid chainType', () => {
    const errors = validateProtocolJSON({
      kind: 'compound',
      action: 'compound',
      roles: {},
      statements: [],
      chainType: 'invalid',
    });
    expect(errors.some(e => e.code === 'INVALID_CHAIN_TYPE')).toBe(true);
  });

  it('rejects flag without name', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'column',
      roles: { 'primary-key': { type: 'flag', enabled: true } },
    });
    expect(errors.some(e => e.code === 'MISSING_FLAG_NAME')).toBe(true);
  });

  it('rejects flag without enabled', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'column',
      roles: { 'primary-key': { type: 'flag', name: 'primary-key' } },
    });
    expect(errors.some(e => e.code === 'MISSING_FLAG_ENABLED')).toBe(true);
  });

  it('accepts expression with value as fallback for raw', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'set',
      roles: { goal: { type: 'expression', value: 'x + 1' } },
    });
    expect(errors).toEqual([]);
  });

  it('rejects expression without raw or value', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'set',
      roles: { goal: { type: 'expression' } },
    });
    expect(errors.some(e => e.code === 'MISSING_EXPRESSION_RAW')).toBe(true);
  });

  // Unified format: trigger sugar, optional kind, value fallbacks
  it('accepts trigger sugar and wraps in event handler', () => {
    const errors = validateProtocolJSON({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    });
    expect(errors).toEqual([]);
  });

  it('rejects trigger with missing event', () => {
    const errors = validateProtocolJSON({
      action: 'toggle',
      roles: {},
      trigger: { modifiers: {} },
    });
    expect(errors.some(e => e.code === 'INVALID_TRIGGER')).toBe(true);
  });

  it('accepts flag with value shorthand', () => {
    const errors = validateProtocolJSON({
      action: 'column',
      roles: { 'primary-key': { type: 'flag', value: true } },
    });
    expect(errors).toEqual([]);
  });

  // v1.2 validation
  it('accepts pipe as valid chainType (v1.2)', () => {
    expect(
      validateProtocolJSON({
        kind: 'compound',
        action: 'compound',
        roles: {},
        statements: [],
        chainType: 'pipe',
      })
    ).toEqual([]);
  });

  it('validates diagnostics array entries (v1.2)', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'toggle',
      roles: {},
      diagnostics: [{ level: 'invalid' }],
    });
    expect(errors.some(e => e.code === 'INVALID_DIAGNOSTIC_LEVEL')).toBe(true);
  });

  it('validates annotations array entries (v1.2)', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'toggle',
      roles: {},
      annotations: [{}],
    });
    expect(errors.some(e => e.code === 'MISSING_ANNOTATION_NAME')).toBe(true);
  });

  it('validates asyncVariant (v1.2)', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'all',
      roles: {},
      asyncVariant: 'invalid',
    });
    expect(errors.some(e => e.code === 'INVALID_ASYNC_VARIANT')).toBe(true);
  });

  it('validates arms entries (v1.2)', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'match',
      roles: {},
      arms: [{ pattern: null }],
    });
    expect(
      errors.some(e => e.code === 'MISSING_ARM_PATTERN' || e.code === 'MISSING_ARM_BODY')
    ).toBe(true);
  });
});

// ===========================================================================
// v1.2: try/catch/finally
// ===========================================================================

describe('v1.2: try/catch/finally', () => {
  it('createTryNode produces correct structure', () => {
    const body = [createCommandNode('fetch', { source: createLiteral('/api', 'string') })];
    const catchBranch = [createCommandNode('log', { patient: createLiteral('error', 'string') })];
    const node = createTryNode(body, catchBranch);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('try');
    expect(node.body).toHaveLength(1);
    expect(node.catchBranch).toHaveLength(1);
    expect(node.finallyBranch).toBeUndefined();
  });

  it('serializes try/catch/finally to protocol JSON', () => {
    const node = createTryNode(
      [createCommandNode('fetch', { source: createLiteral('/api/users', 'string') })],
      [createCommandNode('show', { patient: createSelector('#error-message') })],
      [createCommandNode('remove', { patient: createSelector('.loading') })]
    );
    const json = toProtocolJSON(node);
    expect(json.kind).toBe('command');
    expect(json.action).toBe('try');
    expect(json.body).toHaveLength(1);
    expect(json.catchBranch).toHaveLength(1);
    expect(json.finallyBranch).toHaveLength(1);
  });

  it('deserializes try/catch/finally from protocol JSON', () => {
    const json: ProtocolNodeJSON = {
      kind: 'command',
      action: 'try',
      roles: {},
      body: [
        {
          kind: 'command',
          action: 'fetch',
          roles: { source: { type: 'literal', value: '/api', dataType: 'string' } },
        },
      ],
      catchBranch: [
        {
          kind: 'command',
          action: 'log',
          roles: { patient: { type: 'literal', value: 'error', dataType: 'string' } },
        },
      ],
      finallyBranch: [
        {
          kind: 'command',
          action: 'remove',
          roles: { patient: { type: 'selector', value: '.loading' } },
        },
      ],
    };
    const node = fromProtocolJSON(json) as CommandSemanticNode;
    expect(node.kind).toBe('command');
    expect(node.action).toBe('try');
    expect(node.body).toHaveLength(1);
    expect(node.catchBranch).toHaveLength(1);
    expect(node.finallyBranch).toHaveLength(1);
  });

  describe('fixture conformance: try-catch.json', () => {
    const fixtures = loadFixtures('try-catch.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput: ProtocolNodeJSON;
        expectedRoundTrip?: boolean;
      };
      if (f.expectedRoundTrip) {
        it(`${f.id}: ${f.description}`, () => {
          const node = fromProtocolJSON(f.jsonInput);
          const roundTripped = toProtocolJSON(node);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});

// ===========================================================================
// v1.2: async coordination (all/race)
// ===========================================================================

describe('v1.2: async coordination', () => {
  it('createAsyncNode produces correct structure', () => {
    const body = [
      createCommandNode('fetch', { source: createLiteral('/api/user', 'string') }),
      createCommandNode('fetch', { source: createLiteral('/api/prefs', 'string') }),
    ];
    const node = createAsyncNode('all', body);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('all');
    expect(node.asyncVariant).toBe('all');
    expect(node.asyncBody).toHaveLength(2);
  });

  it('serializes async all to protocol JSON', () => {
    const node = createAsyncNode('all', [
      createCommandNode('fetch', { source: createLiteral('/api/user', 'string') }),
    ]);
    const json = toProtocolJSON(node);
    expect(json.asyncVariant).toBe('all');
    expect(json.asyncBody).toHaveLength(1);
  });

  it('deserializes async race from protocol JSON', () => {
    const json: ProtocolNodeJSON = {
      kind: 'command',
      action: 'race',
      roles: {},
      asyncVariant: 'race',
      asyncBody: [
        {
          kind: 'command',
          action: 'fetch',
          roles: { source: { type: 'literal', value: '/cache', dataType: 'string' } },
        },
        {
          kind: 'command',
          action: 'fetch',
          roles: { source: { type: 'literal', value: '/api', dataType: 'string' } },
        },
      ],
    };
    const node = fromProtocolJSON(json) as CommandSemanticNode;
    expect(node.asyncVariant).toBe('race');
    expect(node.asyncBody).toHaveLength(2);
  });

  describe('fixture conformance: async-coordination.json', () => {
    const fixtures = loadFixtures('async-coordination.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput: ProtocolNodeJSON;
        expectedRoundTrip?: boolean;
      };
      if (f.expectedRoundTrip) {
        it(`${f.id}: ${f.description}`, () => {
          const node = fromProtocolJSON(f.jsonInput);
          const roundTripped = toProtocolJSON(node);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});

// ===========================================================================
// v1.2: match/arms
// ===========================================================================

describe('v1.2: match', () => {
  it('createMatchNode produces correct structure', () => {
    const arms = [
      {
        pattern: createLiteral('200', 'string'),
        body: [createCommandNode('show', { patient: createSelector('#success') })],
      },
      {
        pattern: createLiteral('404', 'string'),
        body: [createCommandNode('show', { patient: createSelector('#not-found') })],
      },
    ];
    const node = createMatchNode({ patient: createReference('result') }, arms, [
      createCommandNode('log', { patient: createReference('result') }),
    ]);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('match');
    expect(node.arms).toHaveLength(2);
    expect(node.defaultArm).toHaveLength(1);
  });

  it('serializes match arms to protocol JSON', () => {
    const node = createMatchNode({ patient: createReference('result') }, [
      {
        pattern: createLiteral('ok', 'string'),
        body: [createCommandNode('toggle', { patient: createSelector('.active') })],
      },
    ]);
    const json = toProtocolJSON(node);
    expect(json.arms).toHaveLength(1);
    expect(json.arms![0].pattern).toEqual({ type: 'literal', value: 'ok', dataType: 'string' });
    expect(json.arms![0].body).toHaveLength(1);
    expect(json.defaultArm).toBeUndefined();
  });

  it('deserializes match with default arm from protocol JSON', () => {
    const json: ProtocolNodeJSON = {
      kind: 'command',
      action: 'match',
      roles: { patient: { type: 'reference', value: 'result' } },
      arms: [
        {
          pattern: { type: 'literal', value: '200', dataType: 'string' },
          body: [
            {
              kind: 'command',
              action: 'show',
              roles: { patient: { type: 'selector', value: '#success' } },
            },
          ],
        },
      ],
      defaultArm: [
        {
          kind: 'command',
          action: 'log',
          roles: { patient: { type: 'reference', value: 'result' } },
        },
      ],
    };
    const node = fromProtocolJSON(json) as CommandSemanticNode;
    expect(node.arms).toHaveLength(1);
    expect(node.defaultArm).toHaveLength(1);
    expect(node.roles.get('patient')).toEqual({ type: 'reference', value: 'result' });
  });

  describe('fixture conformance: match.json', () => {
    const fixtures = loadFixtures('match.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput: ProtocolNodeJSON;
        expectedRoundTrip?: boolean;
      };
      if (f.expectedRoundTrip) {
        it(`${f.id}: ${f.description}`, () => {
          const node = fromProtocolJSON(f.jsonInput);
          const roundTripped = toProtocolJSON(node);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});

// ===========================================================================
// v1.2: annotations
// ===========================================================================

describe('v1.2: annotations', () => {
  it('serializes annotations on command node', () => {
    const node: CommandSemanticNode = {
      ...createCommandNode('fetch', { source: createLiteral('/api', 'string') }),
      annotations: [{ name: 'timeout', value: '5s' }],
    };
    const json = toProtocolJSON(node);
    expect(json.annotations).toEqual([{ name: 'timeout', value: '5s' }]);
  });

  it('serializes annotation without value', () => {
    const node: CommandSemanticNode = {
      ...createCommandNode('toggle', { patient: createSelector('.active') }),
      annotations: [{ name: 'deprecated' }],
    };
    const json = toProtocolJSON(node);
    expect(json.annotations).toEqual([{ name: 'deprecated' }]);
  });

  it('deserializes annotations from protocol JSON', () => {
    const json: ProtocolNodeJSON = {
      kind: 'command',
      action: 'fetch',
      roles: { source: { type: 'literal', value: '/api', dataType: 'string' } },
      annotations: [
        { name: 'retry', value: '3' },
        { name: 'timeout', value: '10s' },
      ],
    };
    const node = fromProtocolJSON(json);
    expect(node.annotations).toHaveLength(2);
    expect(node.annotations![0].name).toBe('retry');
    expect(node.annotations![1].value).toBe('10s');
  });

  it('omits annotations field when empty', () => {
    const node = createCommandNode('toggle', { patient: createSelector('.active') });
    const json = toProtocolJSON(node);
    expect(json.annotations).toBeUndefined();
  });

  describe('fixture conformance: annotations.json', () => {
    const fixtures = loadFixtures('annotations.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput: ProtocolNodeJSON;
        expectedRoundTrip?: boolean;
      };
      if (f.expectedRoundTrip) {
        it(`${f.id}: ${f.description}`, () => {
          const node = fromProtocolJSON(f.jsonInput);
          const roundTripped = toProtocolJSON(node);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});

// ===========================================================================
// v1.2: diagnostics (type constraints)
// ===========================================================================

describe('v1.2: diagnostics', () => {
  it('serializes diagnostics on command node', () => {
    const node: CommandSemanticNode = {
      ...createCommandNode('toggle', { patient: createSelector('#button', 'id') }),
      diagnostics: [
        {
          severity: 'error',
          message: "toggle.patient expects selector kind [class, attribute], got 'id'",
          code: 'SCHEMA_SELECTOR_KIND_MISMATCH',
          source: 'schema',
        },
      ],
    };
    const json = toProtocolJSON(node);
    expect(json.diagnostics).toHaveLength(1);
    expect(json.diagnostics![0].level).toBe('error');
    expect(json.diagnostics![0].code).toBe('SCHEMA_SELECTOR_KIND_MISMATCH');
    expect(json.diagnostics![0].source).toBe('schema');
  });

  it('deserializes diagnostics from protocol JSON', () => {
    const json: ProtocolNodeJSON = {
      kind: 'command',
      action: 'toggle',
      roles: { patient: { type: 'literal', value: 'hello', dataType: 'string' } },
      diagnostics: [
        {
          level: 'error',
          role: 'patient',
          message: "toggle.patient expects type [selector], got 'literal'",
          code: 'SCHEMA_VALUE_TYPE_MISMATCH',
        },
      ],
    };
    const node = fromProtocolJSON(json);
    expect(node.diagnostics).toHaveLength(1);
    expect(node.diagnostics![0].code).toBe('SCHEMA_VALUE_TYPE_MISMATCH');
    expect(node.diagnostics![0].severity).toBe('error');
  });

  describe('fixture conformance: type-constraints.json', () => {
    const fixtures = loadFixtures('type-constraints.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput: ProtocolNodeJSON;
        expectedRoundTrip?: boolean;
      };
      if (f.expectedRoundTrip) {
        it(`${f.id}: ${f.description}`, () => {
          const node = fromProtocolJSON(f.jsonInput);
          const roundTripped = toProtocolJSON(node);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});

// ===========================================================================
// v1.2: pipe chainType
// ===========================================================================

describe('v1.2: pipe', () => {
  it('serializes pipe compound node', () => {
    const node = createCompoundNode(
      [
        createCommandNode('fetch', { source: createLiteral('/api/users', 'string') }),
        createCommandNode('put', { destination: createSelector('#user-list') }),
      ],
      'pipe'
    );
    const json = toProtocolJSON(node);
    expect(json.chainType).toBe('pipe');
    expect(json.statements).toHaveLength(2);
  });

  it('deserializes pipe compound node', () => {
    const json: ProtocolNodeJSON = {
      kind: 'compound',
      action: 'compound',
      roles: {},
      chainType: 'pipe',
      statements: [
        {
          kind: 'command',
          action: 'fetch',
          roles: { source: { type: 'literal', value: '/api', dataType: 'string' } },
        },
        {
          kind: 'command',
          action: 'put',
          roles: { destination: { type: 'selector', value: '#list' } },
        },
      ],
    };
    const node = fromProtocolJSON(json) as CompoundSemanticNode;
    expect(node.chainType).toBe('pipe');
    expect(node.statements).toHaveLength(2);
  });

  describe('fixture conformance: pipe.json', () => {
    const fixtures = loadFixtures('pipe.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput: ProtocolNodeJSON;
        expectedRoundTrip?: boolean;
      };
      if (f.expectedRoundTrip) {
        it(`${f.id}: ${f.description}`, () => {
          const node = fromProtocolJSON(f.jsonInput);
          const roundTripped = toProtocolJSON(node);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});

// ===========================================================================
// v1.2: version envelope
// ===========================================================================

describe('v1.2: envelope', () => {
  it('serializes envelope with nodes', () => {
    const envelope = {
      lseVersion: '1.2',
      nodes: [
        createCommandNode('toggle', { patient: createSelector('.active') }),
        createCommandNode('add', { patient: createSelector('.highlight') }),
      ],
    };
    const json = toEnvelopeJSON(envelope);
    expect(json.lseVersion).toBe('1.2');
    expect(json.nodes).toHaveLength(2);
    expect(json.features).toBeUndefined();
  });

  it('serializes envelope with features', () => {
    const envelope = {
      lseVersion: '1.2',
      features: ['diagnostics', 'version-header'] as readonly string[],
      nodes: [createCommandNode('fetch', { source: createLiteral('/api', 'string') })],
    };
    const json = toEnvelopeJSON(envelope);
    expect(json.features).toEqual(['diagnostics', 'version-header']);
  });

  it('deserializes envelope', () => {
    const json: LSEEnvelopeJSON = {
      lseVersion: '1.2',
      nodes: [
        {
          kind: 'command',
          action: 'toggle',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      ],
    };
    const envelope = fromEnvelopeJSON(json);
    expect(envelope.lseVersion).toBe('1.2');
    expect(envelope.nodes).toHaveLength(1);
    expect(envelope.nodes[0].action).toBe('toggle');
  });

  it('isEnvelope detects envelope', () => {
    expect(isEnvelope({ lseVersion: '1.2', nodes: [] })).toBe(true);
    expect(isEnvelope({ kind: 'command', action: 'toggle', roles: {} })).toBe(false);
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope('string')).toBe(false);
  });

  describe('fixture conformance: version-envelope.json', () => {
    const fixtures = loadFixtures('version-envelope.json');
    for (const fixture of fixtures) {
      const f = fixture as {
        id: string;
        description: string;
        jsonInput?: LSEEnvelopeJSON;
        expectedRoundTrip?: boolean;
        streamingInput?: string;
      };
      // Only test JSON round-trips (skip streaming fixtures)
      if (f.expectedRoundTrip && f.jsonInput && !f.streamingInput) {
        it(`${f.id}: ${f.description}`, () => {
          const envelope = fromEnvelopeJSON(f.jsonInput!);
          const roundTripped = toEnvelopeJSON(envelope);
          expect(roundTripped).toEqual(f.jsonInput);
        });
      }
    }
  });
});
