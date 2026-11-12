/**
 * One node model: a parser's own node type is an instance of BaseNode and its
 * kinds extend the field sets, so it cannot drift from this package's, and the
 * writers take it without a cast. The `@ts-expect-error` lines are read by the
 * package's typecheck: each fails it if the line below becomes legal.
 */
import { describe, it, expect } from 'vitest';
import {
  createCommandNode,
  createSelector,
  findUnencodable,
  renderExplicit,
  toProtocolJSON,
} from './index';
import type {
  AnyNode,
  BaseNode,
  ConditionalFields,
  EventHandlerFields,
  EventModifiers,
  SelectorValue,
  SemanticNode,
  SemanticValue,
} from './index';

// A parser's own model, as `@lokascript/semantic` builds its: more kinds, narrower
// names, values with more fields.
type MyKind = 'command' | 'event-handler' | 'conditional' | 'behavior';
type MyAction = 'toggle' | 'on' | 'if' | 'behavior';
type MyRole = 'patient' | 'destination' | 'event';
interface MySelector extends SelectorValue {
  readonly scope?: MyValue;
}
type MyValue = Exclude<SemanticValue, SelectorValue> | MySelector;
interface MyNode extends BaseNode<MyKind, MyAction, MyRole, MyValue> {}
interface MyHandler extends MyNode, EventHandlerFields<MyNode, MyValue> {
  readonly kind: 'event-handler';
  readonly eventModifiers?: EventModifiers<MyValue> & { readonly every?: boolean };
  readonly catchBody?: MyNode[];
}

describe('one node model', () => {
  it("a parser's own node goes to the writers as it is", () => {
    const mine: MyNode = {
      kind: 'behavior',
      action: 'behavior',
      roles: new Map<MyRole, MyValue>(),
    };
    const any: AnyNode = mine;
    // No cast: the writers read kind and fields at run time, and say what they cannot carry.
    expect(findUnencodable(mine, 'json')).toEqual(["kind 'behavior'"]);
    expect(() => toProtocolJSON(mine)).toThrow(/kind 'behavior'/);
    expect(renderExplicit(any, { lossy: 'allow' })).toBe('[behavior]');
  });

  it("this package's node is one instance of the base", () => {
    const node: SemanticNode = createCommandNode('toggle', { patient: createSelector('.a') });
    const base: BaseNode = node;
    expect(base.kind).toBe('command');
  });

  it('a model that does not fit the base does not compile', () => {
    // @ts-expect-error a value type must be a SemanticValue
    type BadValue = BaseNode<'command', string, string, { type: 'colour'; value: string }>;

    // @ts-expect-error a kind's field cannot change type: thenBranch holds nodes
    interface BadConditional extends MyNode, ConditionalFields<MyNode> {
      readonly thenBranch: string;
    }

    // @ts-expect-error nor can a handler's body
    interface BadHandler extends MyHandler {
      readonly body: string[];
    }

    const witness: [BadValue?, BadConditional?, BadHandler?] = [];
    expect(witness).toEqual([]);
  });
});
