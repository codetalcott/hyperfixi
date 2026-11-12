/**
 * The wire format's node type is a union discriminated by `kind`. These lines
 * are checked by `tsc` (the package's typecheck includes tests): each
 * `@ts-expect-error` fails the typecheck if the shape below it becomes legal.
 */
import { describe, it, expect } from 'vitest';
import { fromProtocolJSON, toProtocolJSON, validateProtocolJSON } from '../index';
import type { ProtocolNodeJSON } from '../index';

const toggle: ProtocolNodeJSON = {
  action: 'toggle',
  roles: { patient: { type: 'selector', value: '.a' } },
};

describe('ProtocolNodeJSON', () => {
  it('accepts each kind in its own shape', () => {
    const nodes: ProtocolNodeJSON[] = [
      toggle,
      { ...toggle, trigger: { event: 'click' } },
      { kind: 'command', action: 'if', roles: {}, thenBranch: [toggle], elseBranch: [toggle] },
      { kind: 'command', action: 'repeat', roles: {}, loopVariant: 'forever', loopBody: [toggle] },
      { kind: 'command', action: 'tell', roles: {}, body: [toggle] },
      { kind: 'event-handler', action: 'on', roles: {}, body: [toggle, toggle] },
      { kind: 'compound', action: 'compound', chainType: 'then', statements: [toggle, toggle] },
    ];
    for (const node of nodes) {
      expect(validateProtocolJSON(node).filter(d => d.severity === 'error')).toEqual([]);
      expect(toProtocolJSON(fromProtocolJSON(node), { lossy: 'allow' }).action).toBeDefined();
    }
  });

  it('rejects a field on the wrong kind, at compile time', () => {
    const wrong: ProtocolNodeJSON[] = [
      // @ts-expect-error a compound has statements, not branches
      { kind: 'compound', action: 'compound', statements: [toggle], thenBranch: [toggle] },
      // @ts-expect-error a command has no statements
      { kind: 'command', action: 'toggle', roles: {}, statements: [toggle] },
      // @ts-expect-error an event handler needs a body
      { kind: 'event-handler', action: 'on', roles: {} },
      // @ts-expect-error the compact trigger form is a command, not an event-handler
      {
        kind: 'event-handler',
        action: 'on',
        roles: {},
        body: [toggle],
        trigger: { event: 'click' },
      },
      // @ts-expect-error a compound needs statements
      { kind: 'compound', action: 'compound' },
      // @ts-expect-error not a chain type (pipe was removed in LSE 3.0)
      { kind: 'compound', action: 'compound', statements: [toggle], chainType: 'pipe' },
    ];
    expect(wrong).toHaveLength(6);
  });
});
