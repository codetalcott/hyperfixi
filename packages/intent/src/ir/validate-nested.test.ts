/**
 * `validateProtocolJSON` reads every node, not the root alone, and the `trigger`
 * shorthand keeps what its command holds.
 *
 * Both were found by review (2026-11-12). The validator checked the root's roles
 * and stopped, so a value it refuses at the root (a literal that is an array)
 * passed inside a handler's `body`, and `<lse-intent>`'s allow list, which
 * validates first, ran it as code.
 */
import { describe, it, expect } from 'vitest';
import { fromProtocolJSON, validateProtocolJSON } from '../index';
import type { ProtocolNodeJSON } from '../index';

const badLiteral = { type: 'literal', value: ['.a then call alert(1)'] };
const command = (roles: Record<string, unknown>) => ({ action: 'toggle', roles });
const handler = (body: unknown) => ({
  kind: 'event-handler',
  action: 'on',
  roles: { event: { type: 'literal', value: 'click' } },
  body,
});

const codes = (json: unknown) => validateProtocolJSON(json).map(d => d.code);

describe('validateProtocolJSON: nested nodes', () => {
  it('refuses at the root what it refuses inside (the control)', () => {
    expect(codes(command({ patient: badLiteral }))).toEqual(['INVALID_VALUE']);
  });

  it.each([
    ['a handler body', handler([command({ patient: badLiteral })]), 'body[0]'],
    [
      'a compound statement',
      { kind: 'compound', action: 'then', statements: [command({ patient: badLiteral })] },
      'statements[0]',
    ],
    [
      'a then branch',
      { action: 'if', roles: {}, thenBranch: [command({ patient: badLiteral })] },
      'thenBranch[0]',
    ],
    [
      'an else branch',
      { action: 'if', roles: {}, thenBranch: [], elseBranch: [command({ patient: badLiteral })] },
      'elseBranch[0]',
    ],
    [
      'a loop body',
      {
        action: 'repeat',
        roles: {},
        loopVariant: 'forever',
        loopBody: [command({ patient: badLiteral })],
      },
      'loopBody[0]',
    ],
    [
      'two levels down',
      handler([{ action: 'if', roles: {}, thenBranch: [command({ patient: badLiteral })] }]),
      'body[0].thenBranch[0]',
    ],
  ])('reads %s', (_name, json, path) => {
    const diagnostics = validateProtocolJSON(json);
    expect(diagnostics.map(d => d.code)).toEqual(['INVALID_VALUE']);
    expect(diagnostics[0].message.startsWith(`${path}: `)).toBe(true);
  });

  it('refuses a child that is not a node, so the reader never sees it', () => {
    expect(codes({ kind: 'compound', action: 'then', statements: [null] })).toEqual([
      'INVALID_CHILD',
    ]);
    expect(codes(handler(['toggle .a']))).toEqual(['INVALID_CHILD']);
    expect(codes({ action: 'if', roles: {}, thenBranch: 'x' })).toEqual(['INVALID_CHILDREN']);
  });

  it('reports a missing action on an inner node', () => {
    expect(codes(handler([{ roles: {} }]))).toEqual(['MISSING_ACTION']);
  });

  it('accepts a well-formed nested node', () => {
    const json = handler([
      {
        action: 'if',
        roles: {},
        thenBranch: [command({ patient: { type: 'selector', value: '.a' } })],
      },
    ]);
    expect(validateProtocolJSON(json)).toEqual([]);
  });

  it('stops at a bound on a cyclic object', () => {
    const loop: Record<string, unknown> = { action: 'tell', roles: {} };
    loop.body = [loop];
    expect(codes(loop)).toEqual(['TOO_DEEP']);
  });
});

describe('fromProtocolJSON: the trigger shorthand keeps the command whole', () => {
  it('keeps a block command’s body', () => {
    const json = {
      action: 'tell',
      roles: { destination: { type: 'selector', value: '#d' } },
      body: [command({ patient: { type: 'selector', value: '.a' } })],
      trigger: { event: 'click' },
    } as unknown as ProtocolNodeJSON;
    const node = fromProtocolJSON(json) as unknown as {
      kind: string;
      body: Array<{ action: string; body?: Array<{ action: string }> }>;
    };
    expect(node.kind).toBe('event-handler');
    expect(node.body).toHaveLength(1);
    expect(node.body[0].action).toBe('tell');
    expect(node.body[0].body?.map(c => c.action)).toEqual(['toggle']);
  });

  it('keeps a conditional’s branches', () => {
    const json = {
      action: 'if',
      roles: {},
      thenBranch: [command({ patient: { type: 'selector', value: '.a' } })],
      trigger: { event: 'click' },
    } as unknown as ProtocolNodeJSON;
    const node = fromProtocolJSON(json) as unknown as {
      body: Array<{ kind: string; thenBranch?: unknown[] }>;
    };
    expect(node.body[0].kind).toBe('conditional');
    expect(node.body[0].thenBranch).toHaveLength(1);
  });

  it('reads a plain command under a trigger as before', () => {
    const node = fromProtocolJSON({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.a' } },
      trigger: { event: 'click' },
    }) as unknown as {
      kind: string;
      roles: Map<string, unknown>;
      body: Array<{ action: string; roles: Map<string, unknown> }>;
    };
    expect(node.kind).toBe('event-handler');
    expect([...node.roles.keys()].sort()).toEqual(['event', 'patient']);
    expect(node.body[0].action).toBe('toggle');
    expect([...node.body[0].roles.keys()]).toEqual(['patient']);
  });
});
