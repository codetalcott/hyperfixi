import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setCurrentEntity, resetClient, getCurrentEntity } from '../src/siren-client';
import { followCommand } from '../src/commands/follow';
import { executeActionCommand } from '../src/commands/execute-action';
import type { SirenEntity } from '../src/types';
import type { TypedExecutionContext } from '@hyperfixi/core';

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  resetClient();
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/vnd.siren+json' },
  });
}

function makeContext(): TypedExecutionContext {
  return {
    me: null,
    it: undefined,
    you: null,
    result: undefined,
    variables: new Map(),
    locals: new Map(),
    globals: new Map(),
    meta: {},
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: 'strict',
    evaluationHistory: [],
  } as TypedExecutionContext;
}

// Simple evaluator mock that returns AST node values
const mockEvaluator = {
  evaluate: vi.fn(async (node: any) => {
    if (node.type === 'literal') return node.value;
    if (node.type === 'identifier') return node.name;
    return node.value ?? node.name;
  }),
} as any;

const orderEntity: SirenEntity = {
  class: ['order'],
  properties: { id: 1, status: 'pending' },
  actions: [
    {
      name: 'ship',
      href: '/orders/1/ship',
      method: 'POST',
      type: 'application/json',
      fields: [
        { name: 'carrier', type: 'text', value: 'standard' },
        { name: 'trackingId', type: 'text' },
      ],
    },
    { name: 'cancel', href: '/orders/1/cancel', method: 'DELETE' },
  ],
  links: [
    { rel: ['self'], href: '/orders/1' },
    { rel: ['collection'], href: '/orders' },
    { rel: ['next'], href: '/orders/2' },
  ],
};

const nextEntity: SirenEntity = {
  class: ['order'],
  properties: { id: 2, status: 'shipped' },
  links: [{ rel: ['self'], href: '/orders/2' }],
};

describe('follow command', () => {
  beforeEach(() => {
    setCurrentEntity(orderEntity, 'https://api.test/orders/1');
  });

  it('follows a link by rel', async () => {
    mockFetch.mockResolvedValue(jsonResponse(nextEntity));

    const input = await followCommand.parseInput(
      {
        args: [
          { type: 'identifier', name: 'siren' },
          { type: 'identifier', name: 'link' },
          { type: 'literal', value: 'next' },
        ],
        modifiers: {},
      },
      mockEvaluator,
      {} as any
    );

    expect(input.rel).toBe('next');

    const ctx = makeContext();
    await followCommand.execute(input, ctx);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/orders/2');
    expect(getCurrentEntity()).toEqual(nextEntity);
  });

  it('works with shorthand syntax (just rel)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(nextEntity));

    const input = await followCommand.parseInput(
      {
        args: [{ type: 'literal', value: 'collection' }],
        modifiers: {},
      },
      mockEvaluator,
      {} as any
    );

    expect(input.rel).toBe('collection');
  });

  it('throws when link not found', async () => {
    const input = { rel: 'nonexistent' };
    const ctx = makeContext();

    await expect(followCommand.execute(input, ctx)).rejects.toThrow(
      "Siren link 'nonexistent' not found"
    );
  });

  it('throws when no current entity', async () => {
    resetClient();
    const input = { rel: 'self' };
    const ctx = makeContext();

    await expect(followCommand.execute(input, ctx)).rejects.toThrow('no current Siren entity');
  });

  it('throws when no args provided', async () => {
    await expect(
      followCommand.parseInput({ args: [], modifiers: {} }, mockEvaluator, {} as any)
    ).rejects.toThrow('requires a link rel');
  });
});

describe('execute command', () => {
  beforeEach(() => {
    setCurrentEntity(orderEntity, 'https://api.test/orders/1');
  });

  it('executes an action by name', async () => {
    mockFetch.mockResolvedValue(jsonResponse(nextEntity));

    const input = await executeActionCommand.parseInput(
      {
        args: [
          { type: 'identifier', name: 'siren' },
          { type: 'identifier', name: 'action' },
          { type: 'literal', value: 'cancel' },
        ],
        modifiers: {},
      },
      mockEvaluator,
      {} as any
    );

    expect(input.name).toBe('cancel');
    expect(input.data).toBeUndefined();

    const ctx = makeContext();
    await executeActionCommand.execute(input, ctx);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/orders/1/cancel');
    expect(opts.method).toBe('DELETE');
  });

  it('executes with user data, reconciled with field defaults', async () => {
    mockFetch.mockResolvedValue(jsonResponse(nextEntity));

    const input = await executeActionCommand.parseInput(
      {
        args: [
          { type: 'literal', value: 'ship' },
          { type: 'identifier', name: 'with' },
          { type: 'literal', value: { trackingId: 'TRK-123' } },
        ],
        modifiers: {},
      },
      mockEvaluator,
      {} as any
    );

    expect(input.name).toBe('ship');
    expect(input.data).toEqual({ trackingId: 'TRK-123' });

    const ctx = makeContext();
    await executeActionCommand.execute(input, ctx);

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    // Field default 'carrier: standard' + user override 'trackingId: TRK-123'
    expect(body.carrier).toBe('standard');
    expect(body.trackingId).toBe('TRK-123');
  });

  it('uses GET without body for GET actions', async () => {
    const getEntity: SirenEntity = {
      actions: [{ name: 'refresh', href: '/orders/1' }],
      links: [{ rel: ['self'], href: '/orders/1' }],
    };
    setCurrentEntity(getEntity, 'https://api.test/orders/1');
    mockFetch.mockResolvedValue(jsonResponse(nextEntity));

    const input = { name: 'refresh', data: undefined };
    const ctx = makeContext();
    await executeActionCommand.execute(input, ctx);

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('GET');
    expect(opts.body).toBeUndefined();
  });

  it('throws when action not found', async () => {
    const input = { name: 'nonexistent', data: undefined };
    const ctx = makeContext();

    await expect(executeActionCommand.execute(input, ctx)).rejects.toThrow(
      "Siren action 'nonexistent' not found"
    );
  });

  it('throws when no current entity', async () => {
    resetClient();
    const input = { name: 'ship', data: undefined };
    const ctx = makeContext();

    await expect(executeActionCommand.execute(input, ctx)).rejects.toThrow(
      'no current Siren entity'
    );
  });

  it('throws when no args provided', async () => {
    await expect(
      executeActionCommand.parseInput({ args: [], modifiers: {} }, mockEvaluator, {} as any)
    ).rejects.toThrow('requires an action name');
  });
});
