/**
 * The writers refuse what they cannot carry (see encodable.ts), and the readers
 * give back what the writers wrote.
 */
import { describe, it, expect } from 'vitest';
import {
  LossyEncodingError,
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createCompoundNode,
  createSelector,
  createReference,
  createExpression,
  createLiteral,
  findUnencodable,
  fromProtocolJSON,
  parseExplicit,
  renderExplicit,
  toProtocolJSON,
  validateProtocolJSON,
  type SemanticNode,
  type CommandSemanticNode,
  type ConditionalSemanticNode,
} from '../index';

const toggle = () => createCommandNode('toggle', { patient: createSelector('.a') });
const lossesOf = (fn: () => unknown): readonly string[] => {
  try {
    fn();
  } catch (err) {
    if (err instanceof LossyEncodingError) return err.losses;
    throw err;
  }
  return [];
};

describe('toProtocolJSON refuses what the wire format cannot carry', () => {
  it('a node kind it has no node for (was: returned undefined)', () => {
    const feature = { kind: 'feature', action: 'init', roles: new Map(), body: [toggle()] };
    const node = feature as unknown as SemanticNode;
    expect(lossesOf(() => toProtocolJSON(node))).toEqual(["kind 'feature'"]);
    expect(toProtocolJSON(node, { lossy: 'allow' })).toMatchObject({
      kind: 'command',
      action: 'init',
      body: [{ action: 'toggle' }],
    });
  });

  it('an event modifier the trigger form has no key for (was: dropped)', () => {
    const node = createEventHandlerNode(
      'on',
      { event: createLiteral('click') },
      [toggle()],
      undefined,
      { from: createSelector('#x'), debounce: 200 }
    );
    expect(lossesOf(() => toProtocolJSON(node))).toEqual(['event-handler.eventModifiers.from']);
  });

  it('carries the modifiers the trigger form does have keys for', () => {
    const node = createEventHandlerNode(
      'on',
      { event: createLiteral('click') },
      [toggle()],
      undefined,
      { once: true, debounce: 200 }
    );
    const json = toProtocolJSON(node);
    expect(json.trigger).toEqual({ event: 'click', modifiers: { once: true, debounce: 200 } });
    expect((fromProtocolJSON(json) as { eventModifiers?: unknown }).eventModifiers).toEqual({
      once: true,
      debounce: 200,
    });
  });

  it('any modifier on a handler written in the verbose form', () => {
    const node = createEventHandlerNode(
      'on',
      { event: createLiteral('click') },
      [toggle(), toggle()],
      undefined,
      { once: true }
    );
    expect(lossesOf(() => toProtocolJSON(node))).toEqual(['event-handler.eventModifiers.once']);
  });

  it('a field a parser added that no writer knows, at any depth', () => {
    const inner = { ...toggle(), verbatimClause: 'with *opacity' } as SemanticNode;
    const scoped = createCommandNode('add', {
      patient: { ...createSelector('<p/>'), scope: createReference('me') } as never,
    });
    const node = createEventHandlerNode('on', { event: createLiteral('click') }, [inner, scoped]);
    expect(lossesOf(() => toProtocolJSON(node))).toEqual([
      'command.verbatimClause',
      'add.patient.scope',
    ]);
  });

  it('does not count empty fields, positions or metadata', () => {
    const node = {
      ...createCommandNode('toggle', {
        patient: { ...createSelector('.a'), position: { start: 0, end: 2 } } as never,
        destination: { ...createReference('me'), implicit: true } as never,
      }),
      metadata: { sourceLanguage: 'en' },
      catchBranch: [],
      doNotThrow: false,
    } as SemanticNode;
    expect(findUnencodable(node, 'json')).toEqual([]);
    expect(findUnencodable(node, 'bracket')).toEqual([]);
  });

  it('keeps a role named __proto__ (was: set the prototype, role gone)', () => {
    const json = toProtocolJSON(parseExplicit('[toggle __proto__:.active]'));
    expect(Object.keys(json.roles ?? {})).toEqual(['__proto__']);
    expect(JSON.parse(JSON.stringify(json)).roles['__proto__']).toMatchObject({ value: '.active' });
  });
});

describe('fromProtocolJSON reads back what toProtocolJSON wrote', () => {
  const back = (node: SemanticNode) =>
    fromProtocolJSON(JSON.parse(JSON.stringify(toProtocolJSON(node))));

  it('a block command keeps its action and roles (was: every one became `try`)', () => {
    const tell = {
      ...createCommandNode('tell', { destination: createSelector('#d2') }),
      body: [toggle()],
    } as SemanticNode;
    const read = back(tell) as CommandSemanticNode;
    expect(read.action).toBe('tell');
    expect(read.roles.get('destination' as never)).toMatchObject({ value: '#d2' });
    expect(read.body?.map(n => n.action)).toEqual(['toggle']);
  });

  it('an `if` with only an else branch keeps it (was: read as a plain command)', () => {
    const node = createConditionalNode(
      'if',
      { condition: createExpression('false') },
      [],
      [toggle()]
    );
    const read = back(node) as ConditionalSemanticNode;
    expect(read.kind).toBe('conditional');
    expect(read.thenBranch).toEqual([]);
    expect(read.elseBranch?.map(n => n.action)).toEqual(['toggle']);
  });
});

describe('renderExplicit refuses what bracket syntax cannot carry', () => {
  it('an expression of several words (the parser splits it)', () => {
    const node = createCommandNode('add', {
      patient: createSelector('.a'),
      condition: createExpression('it matches .b'),
    });
    expect(lossesOf(() => renderExplicit(node))[0]).toMatch(/^does not read back/);
    expect(renderExplicit(node, { lossy: 'allow' })).toBe(
      '[add patient:.a condition:it matches .b]'
    );
  });

  it('a body of several commands (read back as one command and strays, with no error)', () => {
    const node = createEventHandlerNode('on', { event: createLiteral('click') }, [
      toggle(),
      createCommandNode('add', { patient: createSelector('.b') }),
    ]);
    const error = (() => {
      try {
        renderExplicit(node);
      } catch (err) {
        return err as LossyEncodingError;
      }
    })();
    expect(error).toBeInstanceOf(LossyEncodingError);
    expect(error?.surface).toBe('bracket');
    expect(error?.losses[0]).toMatch(/^reads back as /);
    expect(error?.partial).toBe('[on event:click body:[toggle patient:.a] [add patient:.b]]');
  });

  it('any event modifier, and a kind it has no bracket for', () => {
    const handler = createEventHandlerNode(
      'on',
      { event: createLiteral('click') },
      [toggle()],
      undefined,
      { once: true }
    );
    expect(lossesOf(() => renderExplicit(handler))).toEqual(['event-handler.eventModifiers.once']);
    const def = {
      kind: 'def',
      action: 'def',
      roles: new Map(),
      name: 'f',
    } as unknown as SemanticNode;
    expect(lossesOf(() => renderExplicit(def))).toEqual(["kind 'def'"]);
  });

  it('writes what it can carry, compounds and block commands included', () => {
    const tell = {
      ...createCommandNode('tell', { destination: createSelector('#d2') }),
      body: [toggle()],
    } as SemanticNode;
    expect(renderExplicit(tell)).toBe('[tell destination:#d2 body:[toggle patient:.a]]');
    // …and the parser gives the block back as commands, not as one opaque role.
    const read = parseExplicit(renderExplicit(tell)) as CommandSemanticNode;
    expect(read.body?.map(n => n.action)).toEqual(['toggle']);
    expect(read.roles.has('body' as never)).toBe(false);

    const chain = createCompoundNode([toggle(), toggle()], 'then');
    expect(renderExplicit(chain)).toBe('[toggle patient:.a] then [toggle patient:.a]');
  });
});

describe('the marks a renderer reads', () => {
  const implicitMe = { ...createReference('me'), implicit: true as const };

  it('JSON carries implicit, quoted and interpolates', () => {
    const node = createCommandNode('send', {
      event: { ...createLiteral('a-b', 'string'), quoted: true as const },
      source: { ...createLiteral('/api/${id}', 'string'), interpolates: true as const },
      destination: implicitMe,
    });
    const wire = JSON.parse(JSON.stringify(toProtocolJSON(node)));
    expect(wire.roles.event.quoted).toBe(true);
    expect(wire.roles.source.interpolates).toBe(true);
    expect(wire.roles.destination.implicit).toBe(true);
    expect(fromProtocolJSON(wire).roles).toEqual(node.roles);
  });

  it('JSON writes a property path as itself, owner marks and all', () => {
    const path = {
      type: 'property-path' as const,
      object: createSelector('#d2', 'id'),
      property: '*color',
      access: 'possessive' as const,
    };
    const node = createCommandNode('put', { destination: path });
    const wire = JSON.parse(JSON.stringify(toProtocolJSON(node)));
    expect(wire.roles.destination).toEqual({
      type: 'property-path',
      object: { type: 'selector', value: '#d2', selectorKind: 'id' },
      property: '*color',
      access: 'possessive',
    });
    expect(fromProtocolJSON(wire).roles.get('destination')).toEqual(path);
  });

  it('JSON still reads the older one-string property path, as an expression', () => {
    const node = fromProtocolJSON({
      action: 'get',
      roles: { patient: { type: 'property-path', value: "#a's b" } },
    });
    expect(node.roles.get('patient')).toEqual(createExpression("#a's b"));
  });

  it('validation rejects a property path whose owner is not a value', () => {
    const codes = (roles: unknown) =>
      validateProtocolJSON({ action: 'get', roles }).map(d => d.code);
    expect(codes({ p: { type: 'property-path', object: 'me', property: 'x' } })).toContain(
      'INVALID_PATH_OBJECT'
    );
    expect(
      codes({ p: { type: 'property-path', object: { type: 'nope' }, property: 'x' } })
    ).toContain('INVALID_VALUE_TYPE');
    expect(
      codes({ p: { type: 'property-path', object: { type: 'reference', value: 'me' } } })
    ).toContain('MISSING_PATH_PROPERTY');
    expect(codes({ p: { type: 'property-path' } })).toContain('MISSING_PATH_OBJECT');
  });

  it('bracket syntax leaves an implicit reference out', () => {
    const node = createCommandNode('toggle', {
      patient: createSelector('.a'),
      destination: implicitMe,
    });
    expect(renderExplicit(node)).toBe('[toggle patient:.a]');
  });

  it('bracket syntax writes an implicit word of the command', () => {
    const node = createCommandNode('put', {
      patient: createSelector('#a'),
      manner: { ...createLiteral('before'), implicit: true as const },
    });
    expect(renderExplicit(node)).toBe('[put patient:#a manner:before]');
  });

  it('bracket syntax refuses a bare literal of several words', () => {
    const node = createCommandNode('add', { patient: createLiteral('{color: red; top: 0}') });
    expect(lossesOf(() => renderExplicit(node)).join()).toContain(
      'a bare literal of several words'
    );
  });

  it('the bracket reader reads an object literal as code', () => {
    const node = parseExplicit('[render patient:"x" style:{name:"World"}]');
    expect(node.roles.get('patient')).toEqual(createLiteral('x', 'string'));
    expect(node.roles.get('style')).toEqual(createExpression('{name:"World"}'));
  });
});
