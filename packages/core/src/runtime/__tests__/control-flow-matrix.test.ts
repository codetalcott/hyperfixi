/**
 * The control-flow matrix — Arc 4a step 1 (`docs-internal/ENGINE_MIGRATION_PLAN.md`).
 *
 * `{halt, exit, break, continue, return <v>}` × `{top-level, inside if,
 * inside repeat, inside tell, inside def, handler with catch, handler with
 * finally}`: what runs before the signal, what runs after it inside the
 * same block, what runs after the enclosing construct, and whether the
 * handler's promise rejects. Each cell pins TODAY'S observable behaviour —
 * which is the spec Arc 4a's `Completion` must preserve; where it disagrees
 * with upstream is a separate decision, filed not fixed.
 *
 * The recorder is a global function `mark(x)` the handler bodies call, so a
 * cell reads as the sequence of marks in order, plus `rejected:<message>`
 * when the listener rejected.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Runtime } from '../runtime';
import { parse } from '../../parser/parser';
import type { ExecutionContext } from '../../types/core';

const SIGNALS: Record<string, string> = {
  halt: 'halt',
  exit: 'exit',
  break: 'break',
  continue: 'continue',
  return: 'return "v"',
};

/** Handler bodies per context; `SIG` is the signal command. `def` needs a preamble. */
const CONTEXTS: Record<string, { preamble?: string; body: string; closes?: boolean }> = {
  'top-level': { body: `call mark("a") then SIG then call mark("b")` },
  'inside if': {
    body: `call mark("a") then if true then SIG then call mark("b") end then call mark("c")`,
  },
  'inside repeat': {
    body: `call mark("a") then repeat 2 times call mark("i") then SIG then call mark("b") end then call mark("c")`,
  },
  'inside tell': {
    body: `call mark("a") then tell #cf-out call mark("t") then SIG then call mark("b") end then call mark("c")`,
  },
  'inside def': {
    preamble: `def cfFn() call mark("f") then SIG then call mark("b") end`,
    body: `call mark("a") then call cfFn() then call mark("c")`,
  },
  // These two carry their own `end` (the catch/finally clauses close the handler).
  'with catch': {
    body: `call mark("a") then SIG then call mark("b") catch e call mark("catch")`,
    closes: true,
  },
  'with finally': {
    body: `call mark("a") then SIG then call mark("b") finally call mark("fin")`,
    closes: true,
  },
};

describe('control-flow matrix (Arc 4a step 1)', () => {
  let runtime: Runtime;
  let context: ExecutionContext;
  let element: HTMLElement;
  let out: HTMLElement;
  let marks: string[];

  const run = async (src: string): Promise<void> => {
    const result = parse(src);
    expect(result.success, `${src}: ${JSON.stringify(result.errors)}`).toBe(true);
    await runtime.execute(result.node!, context);
  };

  const listenerFor = async (src: string): Promise<(e: Event) => Promise<void>> => {
    const added: Array<(e: Event) => Promise<void>> = [];
    element.addEventListener = vi.fn((_type: string, fn: unknown) => {
      added.push(fn as (e: Event) => Promise<void>);
    }) as unknown as typeof element.addEventListener;
    await run(src);
    expect(added).toHaveLength(1);
    return added[0];
  };

  beforeEach(() => {
    runtime = new Runtime();
    element = document.createElement('div');
    out = document.createElement('div');
    out.id = 'cf-out';
    document.body.appendChild(element);
    document.body.appendChild(out);
    marks = [];
    const globals = new Map<string, unknown>();
    globals.set('mark', (x: string) => {
      marks.push(x);
    });
    context = {
      me: element,
      it: null,
      you: null,
      result: null,
      locals: new Map(),
      globals,
      variables: new Map(),
      events: new Map(),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    element.remove();
    out.remove();
    vi.restoreAllMocks();
  });

  const observed: Record<string, Record<string, string>> = {};

  for (const [ctxName, { preamble, body, closes }] of Object.entries(CONTEXTS)) {
    for (const [sigName, sig] of Object.entries(SIGNALS)) {
      it(`${sigName} — ${ctxName}`, async () => {
        if (preamble) await run(preamble.replace('SIG', sig));
        const listener = await listenerFor(
          `on click ${body.replace('SIG', sig)}${closes ? ' end' : ' end'}`
        );
        let rejected = '';
        try {
          await listener(new Event('click'));
        } catch (e) {
          rejected = `rejected:${e instanceof Error ? e.message : String(e)}`;
        }
        const cell = [...marks, ...(rejected ? [rejected] : [])].join(' ');
        (observed[sigName] ??= {})[ctxName] = cell;
        expect(cell).toBe(EXPECTED[sigName]?.[ctxName] ?? `<record: ${cell}>`);
      });
    }
  }

  it('prints the observed matrix (record mode)', () => {
    if (process.env.CF_MATRIX_OUT)
      writeFileSync(process.env.CF_MATRIX_OUT, JSON.stringify(observed, null, 2));
  });
});

/**
 * Filled from the first recorded run (2026-09-03); every cell is a pin.
 *
 * What the matrix says about today, filed in the plan (Arc 4a) — not fixed here:
 *  - `return` outside a `def` is a NO-OP: the handler keeps running (`a b`).
 *  - a signal inside `tell` used to escape as a rejection wrapped in
 *    "Command execution failed in tell block" — fixed on this branch: `tell`
 *    passes control-flow errors through, so the column matches top-level.
 *  - a signal inside a called `def` used to reject the handler with `null`
 *    (`installFunction` threw `asControlFlowError(signal)`, which is null for a
 *    signal object) — fixed on this branch; the `def` column now matches top-level.
 *  - `catch` never sees a signal (right); `finally` always runs (right);
 *    `break`/`continue` outside a loop reject the handler.
 */
const EXPECTED: Record<string, Record<string, string>> = {
  halt: {
    'top-level': 'a',
    'inside if': 'a',
    'inside repeat': 'a i',
    'inside tell': 'a t',
    'inside def': 'a f',
    'with catch': 'a',
    'with finally': 'a fin',
  },
  exit: {
    'top-level': 'a',
    'inside if': 'a',
    'inside repeat': 'a i',
    'inside tell': 'a t',
    'inside def': 'a f',
    'with catch': 'a',
    'with finally': 'a fin',
  },
  break: {
    'top-level': 'a rejected:BREAK_EXECUTION',
    'inside if': 'a rejected:BREAK_EXECUTION',
    'inside repeat': 'a i c',
    'inside tell': 'a t rejected:BREAK_EXECUTION',
    'inside def': 'a f rejected:BREAK_EXECUTION',
    'with catch': 'a rejected:BREAK_EXECUTION',
    'with finally': 'a fin rejected:BREAK_EXECUTION',
  },
  continue: {
    'top-level': 'a rejected:CONTINUE_EXECUTION',
    'inside if': 'a rejected:CONTINUE_EXECUTION',
    'inside repeat': 'a i i c',
    'inside tell': 'a t rejected:CONTINUE_EXECUTION',
    'inside def': 'a f rejected:CONTINUE_EXECUTION',
    'with catch': 'a rejected:CONTINUE_EXECUTION',
    'with finally': 'a fin rejected:CONTINUE_EXECUTION',
  },
  return: {
    'top-level': 'a b',
    'inside if': 'a b c',
    'inside repeat': 'a i b i b c',
    'inside tell': 'a t b c',
    'inside def': 'a f c',
    'with catch': 'a b',
    'with finally': 'a b fin',
  },
};
