import { describe, it, expect } from 'vitest';
import { toProtocolJSON, fromProtocolJSON, validateProtocolJSON } from './protocol-json';
import {
  createCommandNode,
  createEventHandlerNode,
  createCompoundNode,
  createConditionalNode,
  createLoopNode,
  createSelector,
  createLiteral,
  createReference,
  createExpression,
  createFlag,
  createPropertyPath,
} from '../core/types';

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

    it('strips selectorKind from selector values', () => {
      const node = createCommandNode('toggle', {
        patient: createSelector('.active', 'class'),
        destination: createSelector('#button', 'id'),
      });
      const json = toProtocolJSON(node);
      expect(json.roles['patient']).toEqual({ type: 'selector', value: '.active' });
      expect(json.roles['destination']).toEqual({ type: 'selector', value: '#button' });
      // selectorKind must not appear
      expect('selectorKind' in json.roles['patient']).toBe(false);
      expect('selectorKind' in json.roles['destination']).toBe(false);
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
    it('serializes with fixed action "compound" and empty roles', () => {
      const a = createCommandNode('add', { patient: createSelector('.loading') });
      const b = createCommandNode('fetch', { source: createLiteral('/api', 'string') });
      const node = createCompoundNode([a, b], 'then');
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('compound');
      expect(json.action).toBe('compound');
      expect(json.roles).toEqual({});
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

  describe('TS-only node kinds (lossy downgrade)', () => {
    it('downgrades conditional to command', () => {
      const thenBranch = [createCommandNode('toggle', { patient: createSelector('.active') })];
      const node = createConditionalNode(
        'if',
        { condition: createExpression('x > 0') },
        thenBranch
      );
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('command');
      expect(json.action).toBe('if');
      // thenBranch is dropped
      expect('thenBranch' in json).toBe(false);
      expect('body' in json).toBe(false);
    });

    it('downgrades loop to command', () => {
      const body = [createCommandNode('toggle', { patient: createSelector('.active') })];
      const node = createLoopNode('repeat', { count: createLiteral(5, 'number') }, 'times', body);
      const json = toProtocolJSON(node);
      expect(json.kind).toBe('command');
      expect(json.action).toBe('repeat');
      // body is dropped
      expect('body' in json).toBe(false);
      expect('statements' in json).toBe(false);
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

  it('conditional downgrade is one-way (lossy)', () => {
    const original = createConditionalNode('if', { condition: createExpression('x > 0') }, [
      createCommandNode('show', { patient: createSelector('#result') }),
    ]);
    const protocol = toProtocolJSON(original);
    // Downgraded to command — fromProtocolJSON produces a command, not conditional
    const restored = fromProtocolJSON(protocol);
    expect(restored.kind).toBe('command');
    expect(restored.action).toBe('if');
    // thenBranch is gone
    expect('thenBranch' in restored).toBe(false);
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

  it('rejects missing kind', () => {
    const errors = validateProtocolJSON({ action: 'toggle', roles: {} });
    expect(errors.some(e => e.code === 'MISSING_KIND')).toBe(true);
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

  it('rejects expression without raw', () => {
    const errors = validateProtocolJSON({
      kind: 'command',
      action: 'set',
      roles: { goal: { type: 'expression', value: 'x + 1' } },
    });
    expect(errors.some(e => e.code === 'MISSING_EXPRESSION_RAW')).toBe(true);
  });
});
